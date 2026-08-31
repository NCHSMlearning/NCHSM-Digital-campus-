// ============================================================
// ENROLLMENT MODULE - Change of Program & Readmission & Session Reporting
// STUDENT DASHBOARD VERSION - FULLY FIXED
// ============================================================

// ============================================================
// STATE
// ============================================================
const ENR_STATE = {
    requests: [],
    history: [],
    reports: [],
    currentStudentId: null,
    currentStudentProgram: null,
    currentStudentName: null,
    currentBlock: null,        // For Nursing
    currentYear: null,         // For TVET
    currentTerm: null,         // For TVET
    programType: null,         // 'Nursing' or 'TVET'
    stats: {
        total: 0,
        pending: 0,
        approved: 0,
        rejected: 0,
        pendingReports: 0
    }
};

// ============================================================
// CONSTANTS
// ============================================================
const NURSING_PROGRAMS = ['KRCHN', 'DCHN'];
const BLOCK_OPTIONS = ['Block 1', 'Block 2', 'Block 3', 'Block 4', 'Block 5', 'Block 6', 'Block 7', 'Block 8'];
const TVET_YEARS = ['Year 1', 'Year 2', 'Year 3'];
const TVET_TERMS = ['Term 1', 'Term 2', 'Term 3'];

// ============================================================
// GET SUPABASE CLIENT
// ============================================================
function getSupabaseClient() {
    if (typeof window.sb !== 'undefined' && window.sb) return window.sb;
    if (typeof window.supabase !== 'undefined' && window.supabase) return window.supabase;
    if (window.db && window.db.supabase) return window.db.supabase;
    return null;
}

// ============================================================
// INITIALIZATION
// ============================================================
function initEnrollment() {
    console.log('📋 Enrollment Module initialized');
    
    const sb = getSupabaseClient();
    if (!sb) {
        console.error('❌ Supabase client not available');
        if (typeof showNotification === 'function') {
            showNotification('Supabase client not available', 'error');
        }
        return;
    }
    
    loadStudentInfo();
    loadEnrollmentRequests();
    loadEnrollmentHistory();
    // Load session reports after a short delay
    setTimeout(() => {
        loadSessionReports();
    }, 500);
    updateEnrollmentStats();
    updateReportBadge();
    setupEnrollmentEventListeners();
}

// ============================================================
// LOAD STUDENT INFO
// ============================================================
async function loadStudentInfo() {
    try {
        // Get current user from session
        let user = null;
        if (window.currentUserProfile) {
            user = window.currentUserProfile;
        } else if (window.db && window.db.currentUserProfile) {
            user = window.db.currentUserProfile;
        } else if (window.currentUser) {
            user = window.currentUser;
        }
        
        if (user) {
            ENR_STATE.currentStudentId = user.student_id || user.id || user.user_id;
            ENR_STATE.currentStudentProgram = user.program || 'N/A';
            ENR_STATE.currentStudentName = user.full_name || user.name || 'Student';
            
            // Get current block/year/term from profile
            ENR_STATE.currentBlock = user.current_block || user.block || null;
            ENR_STATE.currentYear = user.current_year || user.year || null;
            ENR_STATE.currentTerm = user.current_term || user.term || null;
            
            // Detect program type
            ENR_STATE.programType = detectProgramType(ENR_STATE.currentStudentProgram);
            
            // Update UI
            const nameEl = document.getElementById('enrollmentStudentName');
            const idEl = document.getElementById('enrollmentStudentId');
            const programEl = document.getElementById('enrollmentProgram');
            
            if (nameEl) nameEl.textContent = ENR_STATE.currentStudentName;
            if (idEl) idEl.textContent = ENR_STATE.currentStudentId || 'N/A';
            if (programEl) programEl.textContent = ENR_STATE.currentStudentProgram;
            
            // Auto-populate current program in new request form
            const currentDisplay = document.getElementById('enrCurrentProgramDisplay');
            if (currentDisplay) {
                currentDisplay.value = ENR_STATE.currentStudentProgram;
            }
            const previousDisplay = document.getElementById('enrPreviousProgramDisplay');
            if (previousDisplay) {
                previousDisplay.value = ENR_STATE.currentStudentProgram;
            }
            
            // Initialize session reporting if tab exists
            if (document.getElementById('enrSessionReportingTab')) {
                initializeSessionReporting();
            }
            
            console.log('✅ Student info loaded:', {
                name: ENR_STATE.currentStudentName,
                id: ENR_STATE.currentStudentId,
                program: ENR_STATE.currentStudentProgram,
                programType: ENR_STATE.programType,
                block: ENR_STATE.currentBlock,
                year: ENR_STATE.currentYear,
                term: ENR_STATE.currentTerm
            });
        } else {
            console.warn('⚠️ User not found');
            const nameEl = document.getElementById('enrollmentStudentName');
            const idEl = document.getElementById('enrollmentStudentId');
            const programEl = document.getElementById('enrollmentProgram');
            
            if (nameEl) nameEl.textContent = 'Student';
            if (idEl) idEl.textContent = 'N/A';
            if (programEl) programEl.textContent = 'N/A';
        }
    } catch (error) {
        console.error('Error loading student info:', error);
    }
}

// ============================================================
// DETECT PROGRAM TYPE
// ============================================================
function detectProgramType(programCode) {
    if (!programCode) return 'TVET';
    if (NURSING_PROGRAMS.includes(programCode)) {
        return 'Nursing';
    }
    return 'TVET';
}

// ============================================================
// GET PROGRAM DISPLAY NAME
// ============================================================
function getProgramDisplayName(programCode) {
    const map = {
        'KRCHN': 'KRCHN - Kenya Registered Community Health Nursing',
        'DCHN': 'DCHN - Diploma in Community Health Nursing',
        'DPOTT': 'Diploma in Perioperative Theatre Technology',
        'DCH': 'Diploma in Community Health',
        'DHRIT': 'Diploma in Health Records and IT',
        'DSL': 'Diploma in Science Lab',
        'DSW': 'Diploma in Social Work & Community Development',
        'DCJS': 'Diploma in Criminal Justice',
        'DHSS': 'Diploma in Health Support Services',
        'DICT': 'Diploma in ICT',
        'DME': 'Diploma in Medical Engineering',
        'CPOTT': 'Certificate in Perioperative Theatre Technology',
        'CCH': 'Certificate in Community Health',
        'CHRIT': 'Certificate in Health Records and IT',
        'CPC': 'Certificate in Patient Care',
        'CSL': 'Certificate in Science Lab',
        'CSW': 'Certificate in Social Work & Community Development',
        'CCJS': 'Certificate in Criminal Justice',
        'CAG': 'Certificate in Agriculture',
        'CHSS': 'Certificate in Health Support Services',
        'CICT': 'Certificate in ICT',
        'CCG': 'Certificate in Caregiver',
        'COMT': 'Certificate in Orthopedic Trauma Medicine',
        'ACH': 'Artisan in Community Health',
        'AAG': 'Artisan in Agriculture',
        'ASW': 'Artisan in Social Work & Community Development',
        'CCA': 'Certificate in Computer Applications',
        'PTE': 'TVET/CDACC (PTE)'
    };
    return map[programCode] || programCode;
}

// ============================================================
// SESSION REPORTING - INITIALIZATION
// ============================================================
function initializeSessionReporting() {
    const program = ENR_STATE.currentStudentProgram;
    const programType = ENR_STATE.programType || detectProgramType(program);
    const programDisplay = getProgramDisplayName(program);

    console.log('🔄 Initializing Session Reporting for:', programDisplay, 'Type:', programType);

    // Update banner
    const currentProgramEl = document.getElementById('enrReportCurrentProgram');
    const programTypeEl = document.getElementById('enrReportProgramType');
    const autoDetect = document.getElementById('enrReportAutoDetect');

    if (currentProgramEl) currentProgramEl.textContent = programDisplay;
    if (programTypeEl) {
        programTypeEl.textContent = programType;
        programTypeEl.style.background = programType === 'Nursing' ? '#dbeafe' : '#fef3c7';
        programTypeEl.style.color = programType === 'Nursing' ? '#1e40af' : '#92400e';
    }

    // Update session dropdown based on program type
    const sessionSelect = document.getElementById('enrReportSession');
    const sessionLabel = document.getElementById('enrReportSessionLabel');
    const helpText = document.getElementById('enrReportSessionHelpText');
    const instructions = document.getElementById('enrReportInstructions');

    if (!sessionSelect) {
        console.warn('⚠️ enrReportSession not found');
        return;
    }

    sessionSelect.innerHTML = '<option value="">-- Select --</option>';

    if (programType === 'Nursing') {
        // Nursing - Show Blocks
        if (sessionLabel) sessionLabel.textContent = 'Current Block *';
        if (helpText) helpText.textContent = 'Select your current block in the Nursing program';
        if (instructions) instructions.textContent = 'Report your current block in the Nursing program.';

        BLOCK_OPTIONS.forEach(block => {
            const option = document.createElement('option');
            option.value = block;
            option.textContent = block;
            if (block === ENR_STATE.currentBlock) {
                option.selected = true;
            }
            sessionSelect.appendChild(option);
        });

        if (autoDetect) {
            autoDetect.textContent = ENR_STATE.currentBlock ? 
                `✅ Auto-detected: ${ENR_STATE.currentBlock}` : 
                '⚠️ No block assigned yet';
            autoDetect.style.color = ENR_STATE.currentBlock ? '#059669' : '#f59e0b';
        }

    } else {
        // TVET - Show Year + Term
        if (sessionLabel) sessionLabel.textContent = 'Year & Term *';
        if (helpText) helpText.textContent = 'Select your current year and term in the TVET program';
        if (instructions) instructions.textContent = 'Report your current year and term in the TVET program.';

        // Create combined Year + Term options
        TVET_YEARS.forEach(year => {
            TVET_TERMS.forEach(term => {
                const value = `${year} - ${term}`;
                const option = document.createElement('option');
                option.value = value;
                option.textContent = value;
                
                // Auto-select current year/term if matched
                const currentCombined = ENR_STATE.currentYear && ENR_STATE.currentTerm ? 
                    `${ENR_STATE.currentYear} - ${ENR_STATE.currentTerm}` : '';
                if (value === currentCombined) {
                    option.selected = true;
                }
                sessionSelect.appendChild(option);
            });
        });

        if (autoDetect) {
            const currentCombined = ENR_STATE.currentYear && ENR_STATE.currentTerm ? 
                `${ENR_STATE.currentYear} - ${ENR_STATE.currentTerm}` : '';
            autoDetect.textContent = currentCombined ? 
                `✅ Auto-detected: ${currentCombined}` : 
                '⚠️ No year/term assigned yet';
            autoDetect.style.color = currentCombined ? '#059669' : '#f59e0b';
        }
    }
}

// ============================================================
// SUBMIT SESSION REPORT
// ============================================================
async function submitSessionReport() {
    const sb = getSupabaseClient();
    if (!sb) {
        if (typeof showNotification === 'function') {
            showNotification('Supabase client not available', 'error');
        }
        return;
    }

    const year = document.getElementById('enrReportYear').value;
    const session = document.getElementById('enrReportSession').value;
    const status = document.getElementById('enrReportStatus').value;
    const remarks = document.getElementById('enrReportRemarks').value;
    const feedback = document.getElementById('enrReportFeedback');

    if (!year || !session) {
        if (feedback) {
            feedback.style.display = 'block';
            feedback.style.background = '#fee2e2';
            feedback.style.color = '#dc2626';
            feedback.style.border = '1px solid #fecaca';
            feedback.innerHTML = '<i class="fas fa-exclamation-circle"></i> Please select both Year and Session.';
        }
        return;
    }

    // Get current user
    let user = null;
    if (window.currentUserProfile) {
        user = window.currentUserProfile;
    } else if (window.db && window.db.currentUserProfile) {
        user = window.db.currentUserProfile;
    } else if (window.currentUser) {
        user = window.currentUser;
    }

    if (!user) {
        if (feedback) {
            feedback.style.display = 'block';
            feedback.style.background = '#fee2e2';
            feedback.style.color = '#dc2626';
            feedback.innerHTML = '<i class="fas fa-exclamation-circle"></i> Please login first.';
        }
        return;
    }

    const studentId = ENR_STATE.currentStudentId || user.student_id || user.id || user.user_id;
    const studentName = ENR_STATE.currentStudentName || user.full_name || user.name || 'Unknown';
    const program = ENR_STATE.currentStudentProgram || user.program || 'N/A';
    const programType = ENR_STATE.programType || detectProgramType(program);

    console.log('📤 Preparing to submit session report...');
    console.log('   Student ID:', studentId);
    console.log('   Student Name:', studentName);
    console.log('   Program:', program);
    console.log('   Program Type:', programType);
    console.log('   Year:', year);
    console.log('   Session:', session);

    if (typeof showLoading === 'function') showLoading('Submitting session report...');

    try {
        const reportData = {
            student_id: studentId,
            student_name: studentName,
            program: program,
            program_type: programType,
            academic_year: year,
            session: session,
            status: status || 'Continuing',
            remarks: remarks || '',
            approval_status: 'pending',
            submitted_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        console.log('📤 Inserting report data:', reportData);

        const { data, error } = await sb
            .from('session_reports')
            .insert(reportData)
            .select();

        if (error) {
            console.error('❌ Supabase insert error:', error);
            throw error;
        }

        console.log('✅ Report inserted successfully:', data);

        if (typeof hideLoading === 'function') hideLoading();

        if (feedback) {
            feedback.style.display = 'block';
            feedback.style.background = '#d1fae5';
            feedback.style.color = '#065f46';
            feedback.style.border = '1px solid #86efac';
            feedback.innerHTML = `
                <i class="fas fa-check-circle"></i> 
                <strong>Report submitted successfully!</strong><br>
                <span style="font-size: 13px;">Your session report has been submitted. Admin will review and update your profile.</span>
            `;
        }

        if (typeof showNotification === 'function') {
            showNotification('✅ Session report submitted successfully!', 'success');
        }

        // Reset form
        document.getElementById('enrReportForm').reset();

        // Clear feedback after 5 seconds
        setTimeout(() => {
            if (feedback) feedback.style.display = 'none';
        }, 5000);

        // 🔄 Refresh data immediately after submit
        console.log('🔄 Refreshing session reports...');
        await loadSessionReports();
        updateReportBadge();
        initializeSessionReporting();

        console.log('✅ Session reports refreshed!');

    } catch (error) {
        if (typeof hideLoading === 'function') hideLoading();
        console.error('❌ Error submitting session report:', error);

        if (feedback) {
            feedback.style.display = 'block';
            feedback.style.background = '#fee2e2';
            feedback.style.color = '#991b1b';
            feedback.style.border = '1px solid #fecaca';
            
            let errorMessage = error.message || 'Unknown error';
            if (errorMessage.includes('row-level security')) {
                errorMessage = 'Permission denied. Please contact admin to set up RLS policies.';
            }
            
            feedback.innerHTML = `
                <i class="fas fa-exclamation-circle"></i> 
                <strong>Error submitting report:</strong><br>
                <span style="font-size: 13px;">${escapeHtml(errorMessage)}</span>
                <br><br>
                <span style="font-size: 12px; color: #6b7280;">
                    💡 Tip: Make sure you're logged in and the session_reports table has proper RLS policies.
                </span>
            `;
        }

        if (typeof showNotification === 'function') {
            showNotification('❌ Error submitting session report', 'error');
        }
    }
}

// ============================================================
// LOAD SESSION REPORTS
// ============================================================
async function loadSessionReports() {
    const sb = getSupabaseClient();
    if (!sb) {
        console.error('❌ Supabase client not available');
        return;
    }

    try {
        const studentId = ENR_STATE.currentStudentId;
        if (!studentId) {
            console.warn('⚠️ No student ID found');
            const tbody = document.getElementById('enrReportsBody');
            if (tbody) {
                tbody.innerHTML = `
                    <tr><td colspan="5" style="padding: 40px; text-align: center; color: #94a3b8;">
                        <i class="fas fa-exclamation-triangle" style="font-size: 24px; display: block; margin-bottom: 10px;"></i>
                        Please login to view your reports.
                    </td></tr>
                `;
            }
            return;
        }

        console.log('📊 Fetching session reports for student:', studentId);

        const { data, error } = await sb
            .from('session_reports')
            .select('*')
            .eq('student_id', studentId)
            .order('submitted_at', { ascending: false });

        if (error) {
            console.error('❌ Supabase error:', error);
            throw error;
        }

        console.log(`✅ Found ${data?.length || 0} session reports:`, data);

        ENR_STATE.reports = data || [];
        renderSessionReportsTable();
        updateReportBadge();

    } catch (error) {
        console.error('Error loading session reports:', error);
        const tbody = document.getElementById('enrReportsBody');
        if (tbody) {
            tbody.innerHTML = `
                <tr><td colspan="5" style="padding: 30px; text-align: center; color: #dc2626;">
                    <i class="fas fa-exclamation-circle" style="font-size: 20px; display: block; margin-bottom: 8px;"></i>
                    Error loading reports: ${escapeHtml(error.message || 'Unknown error')}
                    <br>
                    <button onclick="loadSessionReports()" style="margin-top: 8px; padding: 6px 16px; background: #4C1D95; color: white; border: none; border-radius: 4px; cursor: pointer;">
                        <i class="fas fa-sync-alt"></i> Retry
                    </button>
                </td></tr>
            `;
        }
        if (typeof showNotification === 'function') {
            showNotification('Error loading session reports', 'error');
        }
    }
}

// ============================================================
// RENDER SESSION REPORTS TABLE
// ============================================================
function renderSessionReportsTable() {
    const tbody = document.getElementById('enrReportsBody');
    if (!tbody) {
        console.warn('⚠️ enrReportsBody not found');
        return;
    }

    const reports = ENR_STATE.reports || [];
    console.log(`📊 Rendering ${reports.length} session reports`);

    if (!reports || reports.length === 0) {
        tbody.innerHTML = `
            <tr><td colspan="5" style="padding: 40px; text-align: center; color: #94a3b8;">
                <i class="fas fa-inbox" style="font-size: 28px; display: block; margin-bottom: 10px; color: #d1d5db;"></i>
                <p style="margin: 0;">No session reports found</p>
                <p style="margin: 4px 0 0 0; font-size: 12px; color: #cbd5e1;">Submit a report using the form above</p>
            </td></tr>
        `;
        return;
    }

    let html = '';
    reports.forEach((r, index) => {
        const statusClass = r.approval_status || 'pending';
        const statusLabel = statusClass.charAt(0).toUpperCase() + statusClass.slice(1);
        const statusColors = {
            pending: { bg: '#fef3c7', color: '#92400e', emoji: '⏳' },
            approved: { bg: '#d1fae5', color: '#065f46', emoji: '✅' },
            rejected: { bg: '#fee2e2', color: '#991b1b', emoji: '❌' }
        };
        const statusStyle = statusColors[statusClass] || statusColors.pending;

        const date = r.submitted_at ? new Date(r.submitted_at).toLocaleDateString() : 'N/A';
        const time = r.submitted_at ? new Date(r.submitted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
        const sessionDisplay = r.session || 'N/A';
        const academicYear = r.academic_year || 'N/A';
        const studentStatus = r.status || 'Continuing';
        const programType = r.program_type || 'TVET';

        html += `
            <tr style="border-bottom: 1px solid #f1f5f9; ${index % 2 === 0 ? 'background: #fafafa;' : ''}">
                <td style="padding: 10px 14px;">
                    <strong style="color: #0A3D62;">${escapeHtml(academicYear)}</strong>
                </td>
                <td style="padding: 10px 14px;">
                    <span style="background: #e0f2fe; padding: 4px 12px; border-radius: 12px; font-weight: 500; font-size: 12px; color: #1e40af;">
                        ${escapeHtml(sessionDisplay)}
                    </span>
                    ${programType === 'Nursing' ? '<span style="font-size: 10px; color: #94a3b8; margin-left: 4px;">(Block)</span>' : '<span style="font-size: 10px; color: #94a3b8; margin-left: 4px;">(Year/Term)</span>'}
                </td>
                <td style="padding: 10px 14px;">
                    <span style="background: #d1fae5; padding: 4px 12px; border-radius: 12px; font-size: 12px; color: #065f46;">
                        ${escapeHtml(studentStatus)}
                    </span>
                </td>
                <td style="padding: 10px 14px; text-align: center; font-size: 12px; color: #64748b;">
                    ${date}<br><span style="font-size: 10px; color: #94a3b8;">${time}</span>
                </td>
                <td style="padding: 10px 14px; text-align: center;">
                    <span style="background: ${statusStyle.bg}; color: ${statusStyle.color}; padding: 4px 14px; border-radius: 20px; font-size: 11px; font-weight: 600; display: inline-block;">
                        ${statusStyle.emoji} ${statusLabel}
                    </span>
                    ${statusClass === 'approved' ? '<br><span style="font-size: 10px; color: #059669;">✅ Profile Updated</span>' : ''}
                    ${statusClass === 'pending' ? '<br><span style="font-size: 10px; color: #f59e0b;">⏳ Awaiting Review</span>' : ''}
                </td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
    console.log('✅ Session reports table rendered');
}

// ============================================================
// UPDATE REPORT BADGE
// ============================================================
function updateReportBadge() {
    const reports = ENR_STATE.reports || [];
    const pending = reports.filter(r => r.approval_status === 'pending').length;
    const total = reports.length;

    console.log(`📊 Report stats: ${total} total, ${pending} pending`);

    const badge = document.getElementById('enrReportBadge');
    if (badge) {
        badge.textContent = pending;
        badge.style.display = 'inline-block';
        badge.style.background = pending > 0 ? '#f59e0b' : '#94a3b8';
        badge.style.color = 'white';
        badge.style.padding = '0 10px';
        badge.style.borderRadius = '20px';
        badge.style.fontSize = '11px';
    }

    const statsCard = document.getElementById('enrPendingReports');
    if (statsCard) {
        statsCard.textContent = pending;
    }

    ENR_STATE.stats.pendingReports = pending;
}

// ============================================================
// ADMIN: APPROVE SESSION REPORT & UPDATE PROFILE
// ============================================================
async function approveSessionReport(reportId) {
    const sb = getSupabaseClient();
    if (!sb) {
        if (typeof showNotification === 'function') {
            showNotification('Supabase client not available', 'error');
        }
        return;
    }

    try {
        // Get the report
        const { data: report, error: fetchError } = await sb
            .from('session_reports')
            .select('*')
            .eq('id', reportId)
            .single();

        if (fetchError) throw fetchError;
        if (!report) throw new Error('Report not found');

        // Update report status
        const { error: updateError } = await sb
            .from('session_reports')
            .update({
                approval_status: 'approved',
                approved_at: new Date().toISOString(),
                approved_by: 'admin'
            })
            .eq('id', reportId);

        if (updateError) throw updateError;

        // NOW UPDATE THE STUDENT'S PROFILE based on program type
        const studentId = report.student_id;
        const programType = report.program_type || detectProgramType(report.program);
        const session = report.session;

        let updateData = {};

        if (programType === 'Nursing') {
            // Update block for Nursing students
            updateData = {
                current_block: session,
                updated_at: new Date().toISOString()
            };
        } else {
            // TVET - Parse Year and Term from session string
            // Format: "Year 1 - Term 1"
            const parts = session.split(' - ');
            if (parts.length === 2) {
                updateData = {
                    current_year: parts[0].trim(),
                    current_term: parts[1].trim(),
                    updated_at: new Date().toISOString()
                };
            } else {
                // Fallback: try to parse differently
                const yearMatch = session.match(/Year\s*(\d+)/i);
                const termMatch = session.match(/Term\s*(\d+)/i);
                if (yearMatch) updateData.current_year = `Year ${yearMatch[1]}`;
                if (termMatch) updateData.current_term = `Term ${termMatch[1]}`;
                updateData.updated_at = new Date().toISOString();
            }
        }

        // Update the student's profile
        const { error: profileError } = await sb
            .from('consolidated_user_profiles_table')
            .update(updateData)
            .eq('student_id', studentId);

        if (profileError) {
            // Try with just 'students' table if consolidated fails
            const { error: altError } = await sb
                .from('students')
                .update(updateData)
                .eq('student_id', studentId);
            
            if (altError) throw altError;
        }

        // Also update in-memory state
        if (programType === 'Nursing') {
            ENR_STATE.currentBlock = session;
        } else {
            const parts = session.split(' - ');
            if (parts.length === 2) {
                ENR_STATE.currentYear = parts[0].trim();
                ENR_STATE.currentTerm = parts[1].trim();
            }
        }

        if (typeof showNotification === 'function') {
            showNotification('✅ Session report approved and student profile updated!', 'success');
        }

        // Refresh data
        await loadSessionReports();
        await loadStudentInfo();
        initializeSessionReporting();
        updateReportBadge();

    } catch (error) {
        console.error('Error approving session report:', error);
        if (typeof showNotification === 'function') {
            showNotification('❌ Error approving report: ' + error.message, 'error');
        }
    }
}

// ============================================================
// ADMIN: REJECT SESSION REPORT
// ============================================================
async function rejectSessionReport(reportId) {
    const sb = getSupabaseClient();
    if (!sb) {
        if (typeof showNotification === 'function') {
            showNotification('Supabase client not available', 'error');
        }
        return;
    }

    try {
        const { error } = await sb
            .from('session_reports')
            .update({
                approval_status: 'rejected',
                approved_at: new Date().toISOString(),
                approved_by: 'admin'
            })
            .eq('id', reportId);

        if (error) throw error;

        if (typeof showNotification === 'function') {
            showNotification('❌ Session report rejected', 'warning');
        }

        await loadSessionReports();
        updateReportBadge();

    } catch (error) {
        console.error('Error rejecting session report:', error);
        if (typeof showNotification === 'function') {
            showNotification('❌ Error rejecting report', 'error');
        }
    }
}

// ============================================================
// LOAD ENROLLMENT REQUESTS
// ============================================================
async function loadEnrollmentRequests() {
    const sb = getSupabaseClient();
    if (!sb) {
        console.error('❌ Supabase client not available');
        return;
    }

    try {
        const studentId = ENR_STATE.currentStudentId;
        if (!studentId) {
            console.warn('⚠️ No student ID found');
            return;
        }

        const search = document.getElementById('enrSearch')?.value?.toLowerCase() || '';
        const status = document.getElementById('enrStatusFilter')?.value || 'all';
        const type = document.getElementById('enrTypeFilter')?.value || 'all';

        let query = sb
            .from('student_requests')
            .select('*')
            .eq('student_id', studentId)
            .order('created_at', { ascending: false });

        if (status !== 'all') {
            query = query.eq('status', status);
        }
        if (type !== 'all') {
            query = query.eq('request_type', type);
        }

        const { data, error } = await query;

        if (error) throw error;

        // Apply search filter
        let filtered = data || [];
        if (search) {
            filtered = filtered.filter(r => 
                (r.requested_program || '').toLowerCase().includes(search) ||
                (r.current_program || '').toLowerCase().includes(search) ||
                (r.previous_program || '').toLowerCase().includes(search)
            );
        }

        ENR_STATE.requests = filtered;
        renderEnrollmentRequestsTable();
        updateEnrollmentStats();
        updateEnrollmentBadges();

    } catch (error) {
        console.error('Error loading enrollment requests:', error);
        const tbody = document.getElementById('enrRequestsBody');
        if (tbody) {
            tbody.innerHTML = `
                <tr><td colspan="5" style="padding: 30px; text-align: center; color: #dc2626;">
                    <i class="fas fa-exclamation-circle" style="font-size: 20px; display: block; margin-bottom: 8px;"></i>
                    Error loading requests: ${escapeHtml(error.message)}
                    <br>
                    <button onclick="loadEnrollmentRequests()" style="margin-top: 8px; padding: 6px 16px; background: #4C1D95; color: white; border: none; border-radius: 4px; cursor: pointer;">
                        <i class="fas fa-sync-alt"></i> Retry
                    </button>
                </td></tr>
            `;
        }
        if (typeof showNotification === 'function') {
            showNotification('Error loading enrollment requests', 'error');
        }
    }
}

// ============================================================
// RENDER ENROLLMENT REQUESTS TABLE
// ============================================================
function renderEnrollmentRequestsTable() {
    const tbody = document.getElementById('enrRequestsBody');
    if (!tbody) return;

    const requests = ENR_STATE.requests;

    if (!requests || requests.length === 0) {
        tbody.innerHTML = `
            <tr><td colspan="5" style="padding: 40px; text-align: center; color: #94a3b8;">
                <i class="fas fa-inbox" style="font-size: 28px; display: block; margin-bottom: 10px; color: #d1d5db;"></i>
                <p style="margin: 0;">No enrollment requests found</p>
                <p style="margin: 4px 0 0 0; font-size: 12px; color: #cbd5e1;">Submit a new request using the "New Request" tab</p>
            </td></tr>
        `;
        return;
    }

    let html = '';
    requests.forEach((r, index) => {
        const requestType = r.request_type === 'change_program' ? 'Change of Program' : 'Readmission';
        const typeIcon = r.request_type === 'change_program' ? 'fa-exchange-alt' : 'fa-undo-alt';
        const typeColor = r.request_type === 'change_program' ? '#4C1D95' : '#059669';

        const statusClass = r.status || 'pending';
        const statusLabel = statusClass.charAt(0).toUpperCase() + statusClass.slice(1);
        const statusColors = {
            pending: { bg: '#fef3c7', color: '#92400e' },
            approved: { bg: '#d1fae5', color: '#065f46' },
            rejected: { bg: '#fee2e2', color: '#991b1b' },
            processing: { bg: '#dbeafe', color: '#1e40af' }
        };
        const statusStyle = statusColors[statusClass] || statusColors.pending;

        const date = r.created_at ? new Date(r.created_at).toLocaleDateString() : 'N/A';
        const time = r.created_at ? new Date(r.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

        const fromProgram = r.current_program || r.previous_program || 'N/A';
        const toProgram = r.requested_program || 'N/A';

        html += `
            <tr style="border-bottom: 1px solid #f1f5f9; ${index % 2 === 0 ? 'background: #fafafa;' : ''}">
                <td style="padding: 10px 14px;">
                    <span style="display: flex; align-items: center; gap: 6px;">
                        <i class="fas ${typeIcon}" style="color: ${typeColor}; font-size: 14px;"></i>
                        <span style="font-weight: 500; font-size: 13px;">${escapeHtml(requestType)}</span>
                    </span>
                </td>
                <td style="padding: 10px 14px; font-size: 13px;">
                    <span style="color: #6b7280;">${escapeHtml(fromProgram)}</span>
                    <i class="fas fa-arrow-right" style="color: #94a3b8; margin: 0 6px; font-size: 11px;"></i>
                    <span style="font-weight: 500; color: #0A3D62;">${escapeHtml(toProgram)}</span>
                </td>
                <td style="padding: 10px 14px; text-align: center; font-size: 12px; color: #64748b;">
                    ${date}<br><span style="font-size: 10px; color: #94a3b8;">${time}</span>
                </td>
                <td style="padding: 10px 14px; text-align: center;">
                    <span style="background: ${statusStyle.bg}; color: ${statusStyle.color}; padding: 4px 14px; border-radius: 20px; font-size: 11px; font-weight: 600; display: inline-block;">
                        ${statusLabel}
                    </span>
                </td>
                <td style="padding: 10px 14px; text-align: center;">
                    <button onclick="viewEnrollmentRequest('${r.id}')" 
                            style="padding: 4px 14px; background: #3b82f6; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 11px; transition: all 0.2s;"
                            onmouseover="this.style.background='#2563eb'; this.style.transform='scale(1.05)'" 
                            onmouseout="this.style.background='#3b82f6'; this.style.transform='scale(1)'">
                        <i class="fas fa-eye"></i> View
                    </button>
                </td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
}

// ============================================================
// VIEW ENROLLMENT REQUEST DETAILS
// ============================================================
async function viewEnrollmentRequest(requestId) {
    const sb = getSupabaseClient();
    if (!sb) {
        if (typeof showNotification === 'function') {
            showNotification('Supabase client not available', 'error');
        }
        return;
    }

    try {
        const { data, error } = await sb
            .from('student_requests')
            .select('*')
            .eq('id', requestId)
            .single();

        if (error) throw error;

        if (!data) {
            if (typeof showNotification === 'function') {
                showNotification('Request not found', 'error');
            }
            return;
        }

        const requestType = data.request_type === 'change_program' ? 'Change of Program' : 'Readmission';
        const fromProgram = data.current_program || data.previous_program || 'N/A';
        const toProgram = data.requested_program || 'N/A';
        const status = data.status || 'pending';
        const statusLabel = status.charAt(0).toUpperCase() + status.slice(1);
        const statusColors = {
            pending: '#f59e0b',
            approved: '#10b981',
            rejected: '#dc2626',
            processing: '#3b82f6'
        };
        const statusColor = statusColors[status] || '#f59e0b';
        const date = data.created_at ? new Date(data.created_at).toLocaleString() : 'N/A';
        const updated = data.updated_at ? new Date(data.updated_at).toLocaleString() : 'N/A';

        // Create modal content
        const modalContent = `
            <div style="max-width: 550px; width: 95%; background: white; border-radius: 16px; padding: 28px; max-height: 90vh; overflow-y: auto; box-shadow: 0 20px 60px rgba(0,0,0,0.3); position: relative;">
                <button onclick="closeEnrollmentModal()" style="position: absolute; top: 12px; right: 16px; background: none; border: none; font-size: 24px; color: #94a3b8; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.color='#dc2626'" onmouseout="this.style.color='#94a3b8'">
                    <i class="fas fa-times"></i>
                </button>

                <h3 style="color: #0A3D62; margin: 0 0 4px 0; font-size: 18px; display: flex; align-items: center; gap: 8px;">
                    <i class="fas fa-file-alt" style="color: #4C1D95;"></i> 
                    ${escapeHtml(requestType)} Request
                </h3>
                <p style="color: #94a3b8; font-size: 13px; margin: 0 0 20px 0;">Request ID: ${escapeHtml(data.id.substring(0, 8))}...</p>

                <div style="display: flex; justify-content: center; margin-bottom: 20px;">
                    <span style="background: ${statusColor}20; color: ${statusColor}; padding: 6px 24px; border-radius: 20px; font-size: 14px; font-weight: 700; border: 1px solid ${statusColor}40;">
                        ${statusLabel}
                    </span>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px; padding: 16px; background: #f8fafc; border-radius: 10px;">
                    <div>
                        <div style="font-size: 10px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px;">From Program</div>
                        <div style="font-size: 15px; font-weight: 600; color: #1e293b; margin-top: 2px;">${escapeHtml(fromProgram)}</div>
                    </div>
                    <div>
                        <div style="font-size: 10px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px;">Requested Program</div>
                        <div style="font-size: 15px; font-weight: 600; color: #4C1D95; margin-top: 2px;">${escapeHtml(toProgram)}</div>
                    </div>
                </div>

                <div style="margin-bottom: 16px;">
                    <div style="font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">Reason / Justification</div>
                    <div style="background: #f1f5f9; padding: 12px 16px; border-radius: 8px; font-size: 14px; color: #334155; line-height: 1.6; margin-top: 4px; border-left: 3px solid #4C1D95;">
                        ${escapeHtml(data.reason || 'No reason provided')}
                    </div>
                </div>

                ${data.documents && data.documents.length > 0 ? `
                <div style="margin-bottom: 16px;">
                    <div style="font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">
                        <i class="fas fa-paperclip"></i> Supporting Documents
                    </div>
                    <div style="margin-top: 4px; display: flex; gap: 6px; flex-wrap: wrap;">
                        ${data.documents.map(doc => `
                            <span style="background: #e5e7eb; padding: 4px 12px; border-radius: 6px; font-size: 12px; color: #1e293b; display: inline-flex; align-items: center; gap: 4px;">
                                <i class="fas fa-file"></i> ${escapeHtml(doc.name || 'Document')}
                            </span>
                        `).join('')}
                    </div>
                </div>
                ` : ''}

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 12px; color: #94a3b8; border-top: 1px solid #e5e7eb; padding-top: 14px;">
                    <div><i class="fas fa-clock"></i> Submitted: ${date}</div>
                    <div><i class="fas fa-edit"></i> Updated: ${updated}</div>
                </div>

                <div style="margin-top: 18px; text-align: center;">
                    <button onclick="closeEnrollmentModal()" style="padding: 10px 40px; background: #4C1D95; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 14px; transition: all 0.2s;" onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(76,29,149,0.3)'" onmouseout="this.style.transform='none'; this.style.boxShadow='none'">
                        <i class="fas fa-times"></i> Close
                    </button>
                </div>
            </div>
        `;

        showEnrollmentModal(modalContent);

    } catch (error) {
        console.error('Error loading request details:', error);
        if (typeof showNotification === 'function') {
            showNotification('Error loading request details', 'error');
        }
    }
}

// ============================================================
// ENROLLMENT MODAL HELPER
// ============================================================
function showEnrollmentModal(content) {
    closeEnrollmentModal();

    const modal = document.createElement('div');
    modal.id = 'enrollmentModal';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.5); backdrop-filter: blur(4px);
        display: flex; align-items: center; justify-content: center;
        z-index: 100000; padding: 20px;
    `;
    modal.innerHTML = content;
    document.body.appendChild(modal);

    modal.addEventListener('click', function(e) {
        if (e.target === this) {
            closeEnrollmentModal();
        }
    });

    document.addEventListener('keydown', function handler(e) {
        if (e.key === 'Escape') {
            closeEnrollmentModal();
            document.removeEventListener('keydown', handler);
        }
    });
}

function closeEnrollmentModal() {
    const modal = document.getElementById('enrollmentModal');
    if (modal) {
        modal.remove();
    }
}

// ============================================================
// LOAD ENROLLMENT HISTORY
// ============================================================
async function loadEnrollmentHistory() {
    const sb = getSupabaseClient();
    if (!sb) {
        console.error('❌ Supabase client not available');
        return;
    }

    try {
        const studentId = ENR_STATE.currentStudentId;
        if (!studentId) {
            console.warn('⚠️ No student ID found');
            return;
        }

        const type = document.getElementById('enrHistoryType')?.value || 'all';
        const status = document.getElementById('enrHistoryStatus')?.value || 'all';

        let query = sb
            .from('student_requests')
            .select('*')
            .eq('student_id', studentId)
            .in('status', ['approved', 'rejected'])
            .order('updated_at', { ascending: false });

        if (type !== 'all') {
            query = query.eq('request_type', type);
        }
        if (status !== 'all') {
            query = query.eq('status', status);
        }

        const { data, error } = await query;

        if (error) throw error;

        ENR_STATE.history = data || [];
        renderEnrollmentHistoryTable();

    } catch (error) {
        console.error('Error loading enrollment history:', error);
        const tbody = document.getElementById('enrHistoryBody');
        if (tbody) {
            tbody.innerHTML = `
                <tr><td colspan="5" style="padding: 30px; text-align: center; color: #dc2626;">
                    <i class="fas fa-exclamation-circle" style="font-size: 20px; display: block; margin-bottom: 8px;"></i>
                    Error loading history: ${escapeHtml(error.message)}
                </td></tr>
            `;
        }
        if (typeof showNotification === 'function') {
            showNotification('Error loading enrollment history', 'error');
        }
    }
}

// ============================================================
// RENDER ENROLLMENT HISTORY TABLE
// ============================================================
function renderEnrollmentHistoryTable() {
    const tbody = document.getElementById('enrHistoryBody');
    if (!tbody) return;

    const history = ENR_STATE.history;

    if (!history || history.length === 0) {
        tbody.innerHTML = `
            <tr><td colspan="5" style="padding: 40px; text-align: center; color: #94a3b8;">
                <i class="fas fa-history" style="font-size: 28px; display: block; margin-bottom: 10px; color: #d1d5db;"></i>
                <p style="margin: 0;">No enrollment history found</p>
                <p style="margin: 4px 0 0 0; font-size: 12px; color: #cbd5e1;">Completed requests will appear here</p>
            </td></tr>
        `;
        return;
    }

    let html = '';
    history.forEach((r, index) => {
        const requestType = r.request_type === 'change_program' ? 'Change of Program' : 'Readmission';
        const typeIcon = r.request_type === 'change_program' ? 'fa-exchange-alt' : 'fa-undo-alt';
        const typeColor = r.request_type === 'change_program' ? '#4C1D95' : '#059669';

        const statusClass = r.status || 'approved';
        const statusLabel = statusClass.charAt(0).toUpperCase() + statusClass.slice(1);
        const statusColors = {
            approved: { bg: '#d1fae5', color: '#065f46' },
            rejected: { bg: '#fee2e2', color: '#991b1b' }
        };
        const statusStyle = statusColors[statusClass] || statusColors.approved;

        const date = r.updated_at ? new Date(r.updated_at).toLocaleDateString() : 'N/A';
        const fromProgram = r.current_program || r.previous_program || 'N/A';
        const toProgram = r.requested_program || 'N/A';
        const approvedBy = r.approved_by || r.updated_by || 'System';

        html += `
            <tr style="border-bottom: 1px solid #f1f5f9; ${index % 2 === 0 ? 'background: #fafafa;' : ''}">
                <td style="padding: 10px 14px;">
                    <span style="display: flex; align-items: center; gap: 6px;">
                        <i class="fas ${typeIcon}" style="color: ${typeColor}; font-size: 14px;"></i>
                        <span style="font-size: 13px;">${escapeHtml(requestType)}</span>
                    </span>
                </td>
                <td style="padding: 10px 14px; font-size: 13px;">
                    <span style="color: #6b7280;">${escapeHtml(fromProgram)}</span>
                    <i class="fas fa-arrow-right" style="color: #94a3b8; margin: 0 6px; font-size: 11px;"></i>
                    <span style="font-weight: 500; color: #0A3D62;">${escapeHtml(toProgram)}</span>
                </td>
                <td style="padding: 10px 14px; text-align: center; font-size: 12px; color: #64748b;">${date}</td>
                <td style="padding: 10px 14px; text-align: center;">
                    <span style="background: ${statusStyle.bg}; color: ${statusStyle.color}; padding: 4px 14px; border-radius: 20px; font-size: 11px; font-weight: 600; display: inline-block;">
                        ${statusLabel}
                    </span>
                </td>
                <td style="padding: 10px 14px; text-align: center; font-size: 12px; color: #64748b;">${escapeHtml(approvedBy)}</td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
}

// ============================================================
// UPDATE ENROLLMENT STATS
// ============================================================
function updateEnrollmentStats() {
    const requests = ENR_STATE.requests;

    const total = requests.length;
    const pending = requests.filter(r => r.status === 'pending').length;
    const approved = requests.filter(r => r.status === 'approved').length;
    const rejected = requests.filter(r => r.status === 'rejected').length;

    // Latest request
    let lastRequest = '--';
    if (requests.length > 0) {
        const latest = requests.reduce((a, b) => 
            new Date(a.created_at) > new Date(b.created_at) ? a : b
        );
        lastRequest = new Date(latest.created_at).toLocaleDateString();
    }

    // Pending reports
    const pendingReports = ENR_STATE.reports.filter(r => r.approval_status === 'pending').length;

    const totalEl = document.getElementById('enrTotalRequests');
    const pendingEl = document.getElementById('enrPendingCount');
    const approvedEl = document.getElementById('enrApprovedCount');
    const rejectedEl = document.getElementById('enrRejectedCount');
    const lastEl = document.getElementById('enrLastRequest');
    const reportsEl = document.getElementById('enrPendingReports');

    if (totalEl) totalEl.textContent = total;
    if (pendingEl) pendingEl.textContent = pending;
    if (approvedEl) approvedEl.textContent = approved;
    if (rejectedEl) rejectedEl.textContent = rejected;
    if (lastEl) lastEl.textContent = lastRequest;
    if (reportsEl) reportsEl.textContent = pendingReports;

    ENR_STATE.stats = { total, pending, approved, rejected, pendingReports };
}

// ============================================================
// UPDATE ENROLLMENT BADGES
// ============================================================
function updateEnrollmentBadges() {
    const pending = ENR_STATE.requests.filter(r => r.status === 'pending').length;
    const badge = document.getElementById('enrPendingBadge');
    if (badge) {
        badge.textContent = pending;
        badge.style.display = pending > 0 ? 'inline-block' : 'inline-block';
        badge.style.background = pending > 0 ? '#f59e0b' : 'rgba(255,255,255,0.2)';
    }
}

// ============================================================
// FILTER ENROLLMENT REQUESTS
// ============================================================
function filterEnrRequests() {
    loadEnrollmentRequests();
}

// ============================================================
// SHOW ENROLLMENT SUB TAB
// ============================================================
function showEnrSubTab(tab) {
    // Hide all tabs
    document.querySelectorAll('.enr-tab-content').forEach(el => el.style.display = 'none');

    // Show selected tab
    const tabMap = {
        'my-requests': 'enrMyRequestsTab',
        'new-request': 'enrNewRequestTab',
        'session-reporting': 'enrSessionReportingTab',
        'history': 'enrHistoryTab'
    };

    const tabId = tabMap[tab];
    if (tabId) {
        const el = document.getElementById(tabId);
        if (el) el.style.display = 'block';
    }

    // Update tab buttons
    document.querySelectorAll('.enr-tab-btn').forEach(btn => {
        btn.style.background = 'transparent';
        btn.style.color = '#334155';
        btn.style.boxShadow = 'none';
    });

    const btnMap = {
        'my-requests': 'enrTabMyRequests',
        'new-request': 'enrTabNewRequest',
        'session-reporting': 'enrTabSessionReporting',
        'history': 'enrTabHistory'
    };

    const btnId = btnMap[tab];
    if (btnId) {
        const btn = document.getElementById(btnId);
        if (btn) {
            btn.style.background = 'linear-gradient(135deg, #4C1D95, #6d28d9)';
            btn.style.color = 'white';
            btn.style.boxShadow = '0 4px 16px rgba(76,29,149,0.25)';
        }
    }

    // Load data based on tab
    if (tab === 'my-requests') {
        loadEnrollmentRequests();
    } else if (tab === 'session-reporting') {
        console.log('🔄 Loading Session Reporting tab...');
        initializeSessionReporting();
        // Force refresh the reports after a short delay
        setTimeout(() => {
            loadSessionReports();
        }, 200);
    } else if (tab === 'history') {
        loadEnrollmentHistory();
    } else if (tab === 'new-request') {
        // Reset form
        const form = document.getElementById('enrRequestForm');
        if (form) form.reset();
        const feedback = document.getElementById('enrFormFeedback');
        if (feedback) feedback.style.display = 'none';
        const error = document.getElementById('enrTypeError');
        if (error) error.style.display = 'none';
        // Reset type selection
        document.querySelectorAll('#enrTypeChangeProgram, #enrTypeReadmission').forEach(btn => {
            btn.style.borderColor = '#e5e7eb';
            btn.style.background = 'white';
        });
        const typeInput = document.getElementById('enrRequestType');
        if (typeInput) typeInput.value = '';
        const currentSection = document.getElementById('enrCurrentProgramSection');
        const previousSection = document.getElementById('enrPreviousProgramSection');
        if (currentSection) currentSection.style.display = 'none';
        if (previousSection) previousSection.style.display = 'none';
    }
}

// ============================================================
// SELECT ENROLLMENT TYPE
// ============================================================
function selectEnrType(type) {
    const typeInput = document.getElementById('enrRequestType');
    if (typeInput) typeInput.value = type;
    
    const error = document.getElementById('enrTypeError');
    if (error) error.style.display = 'none';

    // Update button styles
    document.querySelectorAll('#enrTypeChangeProgram, #enrTypeReadmission').forEach(btn => {
        btn.style.borderColor = '#e5e7eb';
        btn.style.background = 'white';
    });

    const btn = document.getElementById(type === 'change-program' ? 'enrTypeChangeProgram' : 'enrTypeReadmission');
    if (btn) {
        btn.style.borderColor = '#4C1D95';
        btn.style.background = '#f3e8ff';
    }

    // Show/hide sections
    const currentSection = document.getElementById('enrCurrentProgramSection');
    const previousSection = document.getElementById('enrPreviousProgramSection');
    const currentDisplay = document.getElementById('enrCurrentProgramDisplay');
    const previousDisplay = document.getElementById('enrPreviousProgramDisplay');

    if (type === 'change-program') {
        if (currentSection) currentSection.style.display = 'block';
        if (previousSection) previousSection.style.display = 'none';
        if (currentDisplay) currentDisplay.value = ENR_STATE.currentStudentProgram || 'N/A';
    } else {
        if (currentSection) currentSection.style.display = 'none';
        if (previousSection) previousSection.style.display = 'block';
        if (previousDisplay) previousDisplay.value = ENR_STATE.currentStudentProgram || 'N/A';
    }
}

// ============================================================
// SUBMIT ENROLLMENT REQUEST
// ============================================================
async function submitEnrollmentRequest() {
    const sb = getSupabaseClient();
    if (!sb) {
        if (typeof showNotification === 'function') {
            showNotification('Supabase client not available', 'error');
        }
        return;
    }

    const requestType = document.getElementById('enrRequestType')?.value;
    const requestedProgram = document.getElementById('enrRequestedProgram')?.value;
    const reason = document.getElementById('enrReason')?.value?.trim();
    const docsInput = document.getElementById('enrSupportingDocs');

    // Validate
    if (!requestType) {
        const error = document.getElementById('enrTypeError');
        if (error) error.style.display = 'block';
        if (typeof showNotification === 'function') {
            showNotification('Please select a request type', 'warning');
        }
        return;
    }

    if (!requestedProgram) {
        if (typeof showNotification === 'function') {
            showNotification('Please select a requested program', 'warning');
        }
        return;
    }

    if (!reason || reason.length < 10) {
        if (typeof showNotification === 'function') {
            showNotification('Please provide a detailed reason (minimum 10 characters)', 'warning');
        }
        return;
    }

    const studentId = ENR_STATE.currentStudentId;
    const studentName = ENR_STATE.currentStudentName || 'Unknown';
    const currentProgram = ENR_STATE.currentStudentProgram || 'N/A';

    // Check if already has pending request
    const existingPending = ENR_STATE.requests.filter(r => r.status === 'pending');
    if (existingPending.length > 0) {
        if (typeof showNotification === 'function') {
            showNotification('You already have a pending request. Please wait for it to be processed.', 'warning');
        }
        return;
    }

    if (typeof showLoading === 'function') showLoading('Submitting request...');

    try {
        // Handle documents
        let documents = [];
        if (docsInput && docsInput.files && docsInput.files.length > 0) {
            for (const file of docsInput.files) {
                documents.push({
                    name: file.name,
                    size: file.size,
                    type: file.type
                });
            }
        }

        const requestData = {
            student_id: studentId,
            student_name: studentName,
            request_type: requestType,
            current_program: requestType === 'change-program' ? currentProgram : null,
            previous_program: requestType === 'readmission' ? currentProgram : null,
            requested_program: requestedProgram,
            reason: reason,
            status: 'pending',
            documents: documents,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        const { data, error } = await sb
            .from('student_requests')
            .insert(requestData)
            .select();

        if (error) throw error;

        if (typeof hideLoading === 'function') hideLoading();

        // Show success
        const feedback = document.getElementById('enrFormFeedback');
        if (feedback) {
            feedback.style.display = 'block';
            feedback.style.background = '#d1fae5';
            feedback.style.color = '#065f46';
            feedback.style.border = '1px solid #86efac';
            feedback.innerHTML = `
                <i class="fas fa-check-circle"></i> 
                <strong>Request submitted successfully!</strong><br>
                <span style="font-size: 13px;">Your enrollment request has been submitted. You will be notified once it's reviewed.</span>
            `;
        }

        if (typeof showNotification === 'function') {
            showNotification('✅ Enrollment request submitted successfully!', 'success');
        }

        // Reset form
        const form = document.getElementById('enrRequestForm');
        if (form) form.reset();
        if (docsInput) docsInput.value = '';

        // Reset type selection
        document.querySelectorAll('#enrTypeChangeProgram, #enrTypeReadmission').forEach(btn => {
            btn.style.borderColor = '#e5e7eb';
            btn.style.background = 'white';
        });
        const typeInput = document.getElementById('enrRequestType');
        if (typeInput) typeInput.value = '';
        const currentSection = document.getElementById('enrCurrentProgramSection');
        const previousSection = document.getElementById('enrPreviousProgramSection');
        if (currentSection) currentSection.style.display = 'none';
        if (previousSection) previousSection.style.display = 'none';

        // Refresh data
        setTimeout(() => {
            loadEnrollmentRequests();
            loadEnrollmentHistory();
            updateEnrollmentStats();
            updateEnrollmentBadges();
            showEnrSubTab('my-requests');
        }, 1000);

    } catch (error) {
        if (typeof hideLoading === 'function') hideLoading();
        console.error('Error submitting request:', error);

        const feedback = document.getElementById('enrFormFeedback');
        if (feedback) {
            feedback.style.display = 'block';
            feedback.style.background = '#fee2e2';
            feedback.style.color = '#991b1b';
            feedback.style.border = '1px solid #fecaca';
            feedback.innerHTML = `
                <i class="fas fa-exclamation-circle"></i> 
                <strong>Error submitting request:</strong><br>
                <span style="font-size: 13px;">${escapeHtml(error.message)}</span>
            `;
        }

        if (typeof showNotification === 'function') {
            showNotification('❌ Error submitting request: ' + error.message, 'error');
        }
    }
}

// ============================================================
// REFRESH ENROLLMENT
// ============================================================
function refreshEnrollment() {
    console.log('🔄 Refreshing all enrollment data...');
    loadStudentInfo();
    loadEnrollmentRequests();
    loadEnrollmentHistory();
    loadSessionReports();
    updateEnrollmentStats();
    updateEnrollmentBadges();
    updateReportBadge();
    if (typeof showNotification === 'function') {
        showNotification('🔄 Data refreshed!', 'success');
    }
}

// ============================================================
// EXPORT ENROLLMENT REQUESTS TO CSV
// ============================================================
function exportEnrollmentRequests() {
    const requests = ENR_STATE.requests;

    if (!requests || requests.length === 0) {
        if (typeof showNotification === 'function') {
            showNotification('No data to export', 'warning');
        }
        return;
    }

    const headers = ['Request Type', 'From Program', 'To Program', 'Status', 'Date', 'Reason'];
    const rows = requests.map(r => {
        const type = r.request_type === 'change_program' ? 'Change of Program' : 'Readmission';
        const fromProgram = r.current_program || r.previous_program || 'N/A';
        const toProgram = r.requested_program || 'N/A';
        const status = r.status || 'pending';
        const date = r.created_at ? new Date(r.created_at).toLocaleDateString() : 'N/A';
        return [type, fromProgram, toProgram, status, date, r.reason || ''];
    });

    let csv = headers.join(',') + '\n';
    rows.forEach(row => {
        csv += row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',') + '\n';
    });

    downloadCSV(csv, `enrollment_requests_${new Date().toISOString().split('T')[0]}.csv`);
    if (typeof showNotification === 'function') {
        showNotification('✅ Data exported!', 'success');
    }
}

// ============================================================
// DOWNLOAD CSV HELPER
// ============================================================
function downloadCSV(csv, filename) {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

// ============================================================
// ESCAPE HTML HELPER
// ============================================================
function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// ============================================================
// SETUP EVENT LISTENERS
// ============================================================
function setupEnrollmentEventListeners() {
    // Request type button clicks
    document.querySelectorAll('#enrTypeChangeProgram, #enrTypeReadmission').forEach(btn => {
        btn.addEventListener('click', function() {
            const type = this.id === 'enrTypeChangeProgram' ? 'change-program' : 'readmission';
            selectEnrType(type);
        });
    });

    // Reset form feedback on input change
    const form = document.getElementById('enrRequestForm');
    if (form) {
        form.addEventListener('change', function() {
            const feedback = document.getElementById('enrFormFeedback');
            if (feedback) feedback.style.display = 'none';
        });
    }

    // Session report form submission
    const reportForm = document.getElementById('enrReportForm');
    if (reportForm) {
        reportForm.addEventListener('submit', function(e) {
            e.preventDefault();
            submitSessionReport();
        });
    }
}

// ============================================================
// EXPOSE ADMIN FUNCTIONS (for admin panel)
// ============================================================
window.approveSessionReport = approveSessionReport;
window.rejectSessionReport = rejectSessionReport;

// ============================================================
// GLOBAL REGISTRATION
// ============================================================
window.initEnrollment = initEnrollment;
window.loadEnrollmentRequests = loadEnrollmentRequests;
window.loadEnrollmentHistory = loadEnrollmentHistory;
window.loadSessionReports = loadSessionReports;
window.viewEnrollmentRequest = viewEnrollmentRequest;
window.showEnrSubTab = showEnrSubTab;
window.selectEnrType = selectEnrType;
window.submitEnrollmentRequest = submitEnrollmentRequest;
window.submitSessionReport = submitSessionReport;
window.filterEnrRequests = filterEnrRequests;
window.refreshEnrollment = refreshEnrollment;
window.exportEnrollmentRequests = exportEnrollmentRequests;
window.closeEnrollmentModal = closeEnrollmentModal;
window.escapeHtml = escapeHtml;
window.downloadCSV = downloadCSV;
window.initializeSessionReporting = initializeSessionReporting;
window.updateReportBadge = updateReportBadge;

console.log('✅ Enrollment Module Loaded!');
console.log('📋 Features:');
console.log('   - ✅ Change of Program requests');
console.log('   - ✅ Readmission requests');
console.log('   - ✅ Request history with filters');
console.log('   - ✅ Student view only (own requests)');
console.log('   - ✅ Submit new enrollment requests');
console.log('   - ✅ Export to CSV');
console.log('   - ✅ View request details');
console.log('   - ✅ SESSION REPORTING: Auto-detects block (Nursing) or Year/Term (TVET)');
console.log('   - ✅ SESSION REPORTING: Admin approval auto-updates student profile');
console.log('   - ✅ SESSION REPORTING: Reports appear immediately after submission');
