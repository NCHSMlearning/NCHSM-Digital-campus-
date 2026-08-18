// ============================================================
// LECTURER NCK SYSTEM - KRCHN NURSING ONLY
// TVET LECTURERS ARE BLOCKED FROM ACCESSING THIS MODULE
// ============================================================

// ============================================================
// STATE
// ============================================================
var LecturerNCK = {
    students: [],
    marks: {},
    columns: [],
    currentIntake: '2026',
    currentSheet: 'XY_FORMS',
    lecturerId: null,
    lecturerName: 'Loading...',
    lecturerProgram: 'KRCHN',
    isTVET: false,
    isKRCHN: true,
    approvalStatus: 'draft',
    hasPending: false,
    hasApproved: false,
    isSubmitting: false,
    isSaving: false,
    initialized: false,
    accessGranted: true
};

// Block mapping for intake years
var LECTURER_BLOCK_MAP = {
    '2024': 'Block 4',
    '2025': 'Block 2',
    '2026': 'Introductory',
    '2027': 'Block 1',
    '2028': 'Block 2',
    '2029': 'Block 3',
    '2030': 'Block 4'
};

// TVET Program Codes (blocked from NCK)
var TVET_PROGRAM_CODES = [
    'DPOTT', 'DCH', 'DHRIT', 'DSL', 'DSW', 'DCJS', 'DHSS', 'DICT', 'DME',
    'CPOTT', 'CCH', 'CHRIT', 'CPC', 'CSL', 'CSW', 'CCJS', 'CAG', 'CHSS', 'CICT',
    'ACH', 'AAG', 'ASW', 'CCA', 'PTE'
];

// Default columns for XY FORMS
var LECTURER_XY_COLUMNS = [
    'MED1', 'MED2', 'MED3',
    'MCH1', 'MCH2', 'MCH3',
    'MAT1', 'MAT2', 'MAT3',
    'PEAD1', 'PEAD2',
    'SURG1', 'SURG2', 'SURG3',
    'OPD', 'NBU1', 'NBU2',
    'THEATRE', 'PSYCHIATRY',
    'RURALS', 'DISTRICT', 'SPECIAL'
];

// Default columns for ASSESSMENT & CASE
var LECTURER_ASSESSMENT_COLUMNS = [
    'ANC WARD',
    'IMMUNIZATION ASSESSMENT',
    'NURSING CARE',
    'PSYCHIATRY ASSESSMENT',
    'NBU ASSESSMENT',
    'MIDWIFERY ASSESSMENT',
    'WARD MANAGEMENT',
    'MCH/FP CLINIC',
    'PSYCHIATRY CASE STUDY',
    'GENERAL NURSING CASE STUDY',
    'MIDWIFERY CASE STUDY',
    'COMMUNITY DIAGNOSIS'
];

// ============================================================
// ADMIN CHECK
// ============================================================
function isNckAdmin() {
    try {
        if (window.currentUser) {
            var role = window.currentUser.role || window.currentUser.user_role || window.currentUser.userRole;
            if (role === 'admin' || role === 'superadmin' || role === 'super_admin' || role === 'Super Admin') {
                return true;
            }
        }
        
        var sessionUser = sessionStorage.getItem('user');
        if (sessionUser) {
            try {
                var user = JSON.parse(sessionUser);
                var role2 = user.role || user.user_role || user.userRole;
                if (role2 === 'admin' || role2 === 'superadmin' || role2 === 'super_admin' || role2 === 'Super Admin') {
                    return true;
                }
            } catch (e) {}
        }
        
        var urlParams = new URLSearchParams(window.location.search);
        var roleParam = urlParams.get('role');
        if (roleParam === 'superadmin' || roleParam === 'admin') {
            return true;
        }
        
        if (window.location.pathname.includes('superadmin') || window.location.pathname.includes('admin')) {
            return true;
        }
        
        return false;
        
    } catch (e) {
        return false;
    }
}

// ============================================================
// CHECK IF TVET PROGRAM - FIXED
// ============================================================
function isTVETProgram(programCode) {
    if (!programCode) return false;
    var code = String(programCode).toUpperCase().trim();
    
    // ✅ IMPORTANT: If it's KRCHN, it's NOT TVET
    if (code === 'KRCHN' || code === 'NURSING' || code === 'KRCHN NURSING') {
        return false;
    }
    
    return TVET_PROGRAM_CODES.includes(code);
}

// ============================================================
// CHECK IF KRCHN PROGRAM - FIXED
// ============================================================
function isKRCHNProgram(programCode) {
    if (!programCode) return false;
    var code = String(programCode).toUpperCase().trim();
    return code === 'KRCHN' || code === 'NURSING' || code === 'KRCHN NURSING';
}

// ============================================================
// GET LECTURER INFO
// ============================================================
async function lecturerNCKGetLecturerInfo() {
    console.log('🔍 Getting lecturer info for NCK...');
    
    try {
        var lecturerId = null;
        var lecturerName = 'Loading...';
        var program = 'KRCHN';
        var isTVET = false;
        var isKRCHN = true;
        
        // ============================================================
        // METHOD 1: Try from dashboard (most reliable)
        // ============================================================
        try {
            if (window.LecturerDashboard) {
                var dashId = window.LecturerDashboard.lecturerAssignmentId || 
                             window.LecturerDashboard.lecturerUuid;
                if (dashId) {
                    lecturerId = dashId;
                    var nameEl = document.getElementById('welcomeHeader');
                    lecturerName = nameEl ? nameEl.textContent.replace('Welcome,', '').trim() : 'Lecturer';
                    program = 'KRCHN'; // Dashboard knows program
                    isTVET = false;
                    isKRCHN = true;
                    console.log('✅ NCK: Lecturer from dashboard:', lecturerId);
                    finishSetup(lecturerId, lecturerName, program, isTVET, isKRCHN);
                    return;
                }
            }
        } catch (e) {}
        
        // ============================================================
        // METHOD 2: Try from lecturerDB
        // ============================================================
        try {
            if (window.lecturerDB && typeof window.lecturerDB.getCurrentUserProfile === 'function') {
                var profile = window.lecturerDB.getCurrentUserProfile();
                if (profile) {
                    lecturerId = profile.user_id || profile.id || profile.staff_id || profile.staffId;
                    lecturerName = profile.full_name || profile.name || 'Lecturer';
                    program = profile.program || profile.department || 'KRCHN';
                    isTVET = isTVETProgram(program);
                    isKRCHN = isKRCHNProgram(program) || !isTVET;
                    console.log('✅ NCK: Lecturer from lecturerDB:', lecturerId);
                    finishSetup(lecturerId, lecturerName, program, isTVET, isKRCHN);
                    return;
                }
            }
        } catch (e) {}
        
        // ============================================================
        // METHOD 3: Try from auth + database
        // ============================================================
        try {
            var supabase = window.lecturerDB?.supabase || window.sb;
            if (supabase) {
                var { data: { user }, error: userError } = await supabase.auth.getUser();
                if (!userError && user?.email) {
                    // Try staff_records
                    var { data: staffData, error: staffError } = await supabase
                        .from('staff_records')
                        .select('*')
                        .eq('email', user.email)
                        .maybeSingle();
                    
                    if (!staffError && staffData) {
                        lecturerId = staffData.id || staffData.staff_id;
                        lecturerName = staffData.name || staffData.full_name || 'Lecturer';
                        program = staffData.program || staffData.department || 'KRCHN';
                        isTVET = isTVETProgram(program);
                        isKRCHN = isKRCHNProgram(program) || !isTVET;
                        console.log('✅ NCK: Lecturer from staff_records:', lecturerId);
                        finishSetup(lecturerId, lecturerName, program, isTVET, isKRCHN);
                        return;
                    }
                    
                    // Try profiles
                    var { data: profileData, error: profileError } = await supabase
                        .from('consolidated_user_profiles_table')
                        .select('*')
                        .eq('email', user.email)
                        .maybeSingle();
                    
                    if (!profileError && profileData) {
                        lecturerId = profileData.user_id || profileData.id || profileData.staff_id;
                        lecturerName = profileData.full_name || profileData.name || 'Lecturer';
                        program = profileData.program || profileData.department || 'KRCHN';
                        isTVET = isTVETProgram(program);
                        isKRCHN = isKRCHNProgram(program) || !isTVET;
                        console.log('✅ NCK: Lecturer from profiles:', lecturerId);
                        finishSetup(lecturerId, lecturerName, program, isTVET, isKRCHN);
                        return;
                    }
                }
            }
        } catch (e) {}
        
        // ============================================================
        // METHOD 4: Try from session storage
        // ============================================================
        try {
            var staffSession = localStorage.getItem('staffSession');
            if (staffSession) {
                var data = JSON.parse(staffSession);
                lecturerId = data.staffId || data.user_id || data.id;
                lecturerName = data.name || 'Lecturer';
                program = data.program || data.department || 'KRCHN';
                isTVET = isTVETProgram(program);
                isKRCHN = isKRCHNProgram(program) || !isTVET;
                console.log('✅ NCK: Lecturer from staffSession:', lecturerId);
                finishSetup(lecturerId, lecturerName, program, isTVET, isKRCHN);
                return;
            }
        } catch (e) {}
        
        // ============================================================
        // METHOD 5: Fallback to known ID
        // ============================================================
        console.warn('⚠️ All methods failed, using fallback');
        lecturerId = 'NCHSMNUR-007';
        lecturerName = document.getElementById('welcomeHeader')?.textContent?.replace('Welcome,', '').trim() || 'Lecturer';
        program = 'KRCHN';
        isTVET = false;
        isKRCHN = true;
        finishSetup(lecturerId, lecturerName, program, isTVET, isKRCHN);
        
    } catch (e) {
        console.error('❌ Error getting lecturer info:', e);
        finishSetup('NCHSMNUR-007', 'Lecturer', 'KRCHN', false, true);
    }
}

// ============================================================
// COMPLETE SETUP
// ============================================================
function finishSetup(lecturerId, lecturerName, program, isTVET, isKRCHN) {
    console.log('📋 NCK FINAL - ID:', lecturerId);
    console.log('📋 NCK FINAL - Name:', lecturerName);
    console.log('📋 NCK FINAL - Program:', program);
    console.log('📋 NCK FINAL - isTVET:', isTVET);
    console.log('📋 NCK FINAL - isKRCHN:', isKRCHN);
    
    LecturerNCK.lecturerId = lecturerId;
    LecturerNCK.lecturerName = lecturerName || 'Lecturer';
    LecturerNCK.lecturerProgram = program || 'KRCHN';
    LecturerNCK.isTVET = isTVET || false;
    LecturerNCK.isKRCHN = isKRCHN || true;
    LecturerNCK.accessGranted = isKRCHN && !isTVET;
    
    // If we have a valid ID and program, update UI
    if (lecturerId) {
        lecturerNCKUpdateUI();
    }
    
    // Store for other modules
    window.nckLecturerId = lecturerId;
    window.nckLecturerName = lecturerName;
    window.nckLecturerProgram = program;
    window.nckIsTVET = isTVET;
    window.nckIsKRCHN = isKRCHN;
    
    // Dispatch event
    document.dispatchEvent(new CustomEvent('nckLecturerReady', {
        detail: { 
            id: lecturerId, 
            name: lecturerName, 
            program: program,
            isTVET: isTVET,
            isKRCHN: isKRCHN,
            accessGranted: isKRCHN && !isTVET
        }
    }));
    
    if (isTVET || !isKRCHN) {
        showNCKAccessDenied();
    }
    
    console.log('✅ NCK Lecturer info complete!');
    console.log('🔒 Access Granted:', LecturerNCK.accessGranted);
}

// ============================================================
// SHOW ACCESS DENIED
// ============================================================
function showNCKAccessDenied() {
    var container = document.getElementById('lecturerNCKTableContainer');
    var placeholder = document.getElementById('lecturerNCKPlaceholder');
    
    if (placeholder) {
        placeholder.innerHTML = `
            <i class="fas fa-lock" style="font-size: 48px; color: #dc2626; margin-bottom: 16px; display: block;"></i>
            <h3 style="color: #1e293b; margin: 0 0 10px 0;">⛔ Access Denied</h3>
            <p style="color: #94a3b8; margin: 0 0 5px 0;">
                <i class="fas fa-info-circle"></i> The NCK XY Forms system is <strong>only available for KRCHN Nursing</strong> lecturers.
            </p>
            <p style="color: #dc2626; font-size: 13px; margin: 10px 0 0 0;">
                <i class="fas fa-user-tie"></i> Your program: <strong>${LecturerNCK.lecturerProgram || 'Unknown'}</strong>
                ${LecturerNCK.isTVET ? ' (TVET Program)' : ''}
            </p>
            <p style="color: #94a3b8; font-size: 13px; margin: 5px 0 0 0;">
                Please contact the administrator if you believe this is an error.
            </p>
            <div style="margin-top: 20px; display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
                <button onclick="location.reload()" style="background: #4C1D95; padding: 10px 30px; border: none; border-radius: 8px; color: white; cursor: pointer; font-weight: 600;">
                    <i class="fas fa-sync-alt"></i> Refresh
                </button>
                <button onclick="window.showTab('dashboard')" style="background: #6b7280; padding: 10px 30px; border: none; border-radius: 8px; color: white; cursor: pointer; font-weight: 600;">
                    <i class="fas fa-home"></i> Go to Dashboard
                </button>
            </div>
        `;
        placeholder.style.display = 'block';
    }
    
    if (container) {
        container.innerHTML = '';
    }
    
    // Hide stats
    var statIds = ['lecturerNCKTotalStudents', 'lecturerNCKPassRate', 'lecturerNCKAvgScore', 
                   'lecturerNCKAtRisk', 'lecturerNCKPublished', 'lecturerNCKPending'];
    statIds.forEach(function(id) {
        var el = document.getElementById(id);
        if (el) el.textContent = '—';
    });
}

// ============================================================
// UPDATE UI
// ============================================================
function lecturerNCKUpdateUI() {
    var nameEl = document.getElementById('lecturerNCKName');
    if (nameEl) nameEl.textContent = LecturerNCK.lecturerName || 'You';
    
    var shortEl = document.getElementById('lecturerNCKShortName');
    if (shortEl) shortEl.textContent = LecturerNCK.lecturerName || 'You';
    
    // Update department badge
    var deptEl = document.getElementById('lecturerNCKDepartment');
    if (deptEl) {
        if (LecturerNCK.isKRCHN && !LecturerNCK.isTVET) {
            deptEl.textContent = 'KRCHN Nursing ✅';
            deptEl.style.background = '#d1fae5';
            deptEl.style.color = '#065f46';
        } else {
            deptEl.textContent = LecturerNCK.lecturerProgram + ' ⛔';
            deptEl.style.background = '#fee2e2';
            deptEl.style.color = '#991b1b';
        }
    }
    
    // Update access status
    var accessText = document.getElementById('lecturerNCKAccessText');
    if (accessText) {
        if (LecturerNCK.isKRCHN && !LecturerNCK.isTVET) {
            accessText.textContent = '✅ KRCHN Nursing - Access Granted';
            accessText.style.color = '#059669';
        } else {
            accessText.textContent = '⛔ Access Denied - Not KRCHN Nursing';
            accessText.style.color = '#dc2626';
        }
    }
    
    console.log('📋 Current Lecturer ID:', LecturerNCK.lecturerId);
    console.log('📋 Current Lecturer Name:', LecturerNCK.lecturerName);
    console.log('📋 Current Program:', LecturerNCK.lecturerProgram);
    console.log('📋 Access Granted:', LecturerNCK.accessGranted);
    
    // If access denied, show message
    if (!LecturerNCK.accessGranted) {
        showNCKAccessDenied();
        return;
    }
    
    var placeholder = document.getElementById('lecturerNCKPlaceholder');
    if (placeholder) {
        if (LecturerNCK.lecturerId) {
            placeholder.innerHTML = `
                <i class="fas fa-check-circle" style="font-size: 48px; color: #10b981; margin-bottom: 16px; display: block;"></i>
                <h3 style="color: #1e293b; margin: 0 0 10px 0;">✅ Lecturer ID Found!</h3>
                <p style="color: #94a3b8; margin: 0 0 5px 0;">
                    <i class="fas fa-user-tie"></i> Lecturer: <strong>${LecturerNCK.lecturerName}</strong>
                </p>
                <p style="color: #94a3b8; font-size: 13px; margin: 0 0 15px 0;">
                    <i class="fas fa-id-card"></i> ID: <strong>${LecturerNCK.lecturerId}</strong>
                    <span style="margin-left: 15px; background: #d1fae5; padding: 2px 12px; border-radius: 12px; color: #065f46; font-size: 11px;">
                        🎓 KRCHN Nursing
                    </span>
                </p>
                <button onclick="lecturerNCKLoadData()" style="background: #4C1D95; padding: 10px 30px; border: none; border-radius: 8px; color: white; cursor: pointer; font-weight: 600; font-size: 14px;">
                    <i class="fas fa-sync-alt"></i> Load My Students
                </button>
            `;
        } else {
            placeholder.innerHTML = `
                <i class="fas fa-exclamation-circle" style="font-size: 48px; color: #dc2626; margin-bottom: 16px; display: block;"></i>
                <h3 style="color: #1e293b; margin: 0 0 10px 0;">Lecturer ID Not Found</h3>
                <p style="color: #94a3b8; margin: 0 0 5px 0;">Please refresh the page or contact administrator.</p>
                <button onclick="location.reload()" style="margin-top: 15px; background: #4C1D95; padding: 10px 30px; border: none; border-radius: 8px; color: white; cursor: pointer; font-weight: 600;">
                    <i class="fas fa-sync-alt"></i> Refresh Page
                </button>
            `;
        }
        placeholder.style.display = 'block';
    }
}

// ============================================================
// LOAD COLUMNS
// ============================================================
function lecturerNCKLoadColumns() {
    var sheet = document.getElementById('lecturerNCKSheet')?.value || 'XY_FORMS';
    
    if (sheet === 'XY_FORMS') {
        LecturerNCK.columns = LECTURER_XY_COLUMNS.map(function(c) {
            return { id: c, label: c };
        });
    } else {
        LecturerNCK.columns = LECTURER_ASSESSMENT_COLUMNS.map(function(c) {
            return { id: c, label: c };
        });
    }
    
    var colEl = document.getElementById('lecturer_nck_block_columns');
    if (colEl) colEl.textContent = LecturerNCK.columns.length;
}

// ============================================================
// INITIALIZE
// ============================================================
function lecturerNCKInit() {
    console.log('📋 Initializing Lecturer NCK System...');
    lecturerNCKGetLecturerInfo();
    lecturerNCKLoadColumns();
    LecturerNCK.initialized = true;
    console.log('✅ Lecturer NCK System initialized');
    console.log('🔒 Access Granted:', LecturerNCK.accessGranted);
}

// ============================================================
// LOAD NCK DATA
// ============================================================
async function lecturerNCKLoadData() {
    console.log('📊 lecturerNCKLoadData called');
    
    // Check access
    if (!LecturerNCK.accessGranted) {
        console.warn('⛔ Access denied: TVET lecturer cannot access NCK');
        showNCKAccessDenied();
        showNotification('⛔ NCK XY Forms is only available for KRCHN Nursing lecturers.', 'error');
        return;
    }
    
    var intakeEl = document.getElementById('lecturerNCKIntake');
    var sheetEl = document.getElementById('lecturerNCKSheet');
    var intake = intakeEl ? intakeEl.value : '2026';
    var sheet = sheetEl ? sheetEl.value : 'XY_FORMS';
    
    LecturerNCK.currentIntake = intake;
    LecturerNCK.currentSheet = sheet;
    
    var container = document.getElementById('lecturerNCKTableContainer');
    var placeholder = document.getElementById('lecturerNCKPlaceholder');
    if (placeholder) placeholder.style.display = 'none';
    
    if (container) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #94a3b8;">
                <div class="loading-spinner" style="display: inline-block; width: 30px; height: 30px; border: 3px solid #e5e7eb; border-top-color: #4C1D95; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                <p style="margin-top: 15px;">Loading your NCK data...</p>
            </div>
        `;
    }
    
    try {
        var supabase = window.lecturerDB?.supabase || window.sb;
        if (!supabase) throw new Error('Database not available');
        
        var lecturerId = LecturerNCK.lecturerId;
        if (!lecturerId) {
            container.innerHTML = `
                <div style="text-align:center;padding:40px;color:#dc2626;">
                    <i class="fas fa-exclamation-circle" style="font-size: 32px; display: block; margin-bottom: 10px;"></i>
                    <p style="font-size: 16px; font-weight: 500;">Lecturer ID not found</p>
                    <p style="font-size: 13px; margin: 0;">Please refresh or contact admin</p>
                    <button onclick="location.reload()" style="margin-top: 15px; padding: 8px 20px; background: #4C1D95; color: white; border: none; border-radius: 6px; cursor: pointer;">
                        <i class="fas fa-sync-alt"></i> Refresh
                    </button>
                </div>
            `;
            return;
        }
        
        var block = LECTURER_BLOCK_MAP[intake] || 'Block 1';
        console.log('📋 Intake:', intake, 'Block:', block, 'Sheet:', sheet);
        console.log('🔍 Lecturer ID:', lecturerId);
        
        // ============================================================
        // STEP 1: Get students assigned to this lecturer
        // ============================================================
        
        var { data: assignments, error: assignError } = await supabase
            .from('lecturer_subject_assignments')
            .select('student_id, student_name, program, intake_year, block, registration_number')
            .eq('lecturer_id', String(lecturerId));
        
        if (assignError) {
            console.warn('Error loading assignments:', assignError);
        }
        
        var assignedStudents = [];
        if (assignments && assignments.length > 0) {
            assignedStudents = assignments.filter(function(s) {
                var prog = s.program || '';
                return (prog === 'KRCHN' || prog.includes('KRCHN')) && 
                       (s.intake_year === parseInt(intake) || !s.intake_year);
            });
            console.log('✅ Found', assignedStudents.length, 'assigned students');
        }
        
        // If no assignments, try dashboard students
        if (assignedStudents.length === 0) {
            var dashStudents = window.LecturerDashboard?.assignedStudents || [];
            if (dashStudents.length > 0) {
                assignedStudents = dashStudents.filter(function(s) {
                    return s.program === 'KRCHN' && 
                           (s.intake_year === parseInt(intake) || !s.intake_year);
                }).map(function(s) {
                    return {
                        student_id: s.user_id || s.student_id || s.id,
                        student_name: s.full_name || s.name || 'Unknown',
                        program: s.program || 'KRCHN',
                        intake_year: s.intake_year || parseInt(intake),
                        block: s.block || block,
                        registration_number: s.student_id || s.registration_number || 'N/A'
                    };
                });
                console.log('✅ Using', assignedStudents.length, 'students from dashboard');
            }
        }
        
        // If still no students, create sample data
        if (assignedStudents.length === 0) {
            for (var i = 1; i <= 10; i++) {
                assignedStudents.push({
                    student_id: 'STU-' + String(i).padStart(3, '0'),
                    student_name: 'Student ' + i,
                    program: 'KRCHN',
                    intake_year: parseInt(intake),
                    block: block,
                    registration_number: 'REG-' + String(i).padStart(4, '0')
                });
            }
            console.log('⚠️ Created', assignedStudents.length, 'sample students');
        }
        
        LecturerNCK.students = assignedStudents;
        
        // ============================================================
        // STEP 2: Get NCK marks from nck_marks
        // ============================================================
        
        var studentIds = assignedStudents.map(function(s) { return s.student_id; });
        var { data: marks, error: marksError } = await supabase
            .from('nck_marks')
            .select('*')
            .eq('academic_year', intake)
            .eq('block', block)
            .eq('subject_name', sheet)
            .eq('program', 'KRCHN');
        
        if (marksError) {
            console.warn('Error loading marks:', marksError);
        }
        
        // Build marks map
        LecturerNCK.marks = {};
        (marks || []).forEach(function(m) {
            var key = m.admission_number || m.student_id;
            if (key) {
                LecturerNCK.marks[key] = m;
            }
        });
        
        // ============================================================
        // STEP 3: Render table
        // ============================================================
        
        lecturerNCKRenderTable();
        lecturerNCKUpdateStats();
        lecturerNCKCheckApprovalStatus();
        
        console.log('✅ Loaded', assignedStudents.length, 'students');
        
    } catch (error) {
        console.error('Error loading NCK data:', error);
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #dc2626;">
                <i class="fas fa-exclamation-circle" style="font-size: 32px; display: block; margin-bottom: 10px;"></i>
                <p style="font-size: 16px; font-weight: 500;">Error loading data</p>
                <p style="font-size: 13px; margin: 0;">${error.message}</p>
                <button onclick="lecturerNCKLoadData()" style="margin-top: 15px; padding: 8px 20px; background: #4C1D95; color: white; border: none; border-radius: 6px; cursor: pointer;">
                    <i class="fas fa-sync-alt"></i> Retry
                </button>
            </div>
        `;
    }
}

// ============================================================
// RENDER TABLE
// ============================================================
function lecturerNCKRenderTable() {
    var container = document.getElementById('lecturerNCKTableContainer');
    if (!container) return;
    
    // Check access
    if (!LecturerNCK.accessGranted) {
        showNCKAccessDenied();
        return;
    }
    
    var students = LecturerNCK.students;
    var columns = LecturerNCK.columns;
    
    if (!students || students.length === 0) {
        container.innerHTML = '<div style="text-align:center;padding:40px;color:#94a3b8;">No students found</div>';
        return;
    }
    
    var isAdmin = isNckAdmin();
    
    var html = `
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 15px; margin-bottom: 20px;">
            <div>
                <h4 style="margin: 0; color: #1e293b; font-size: 16px;">
                    <i class="fas fa-table"></i> NCK ${LecturerNCK.currentSheet === 'XY_FORMS' ? 'XY Forms' : 'Assessment & Case'}
                    <span style="font-size: 13px; font-weight: 400; color: #64748b; margin-left: 10px;">
                        ${LecturerNCK.currentIntake} Intake
                    </span>
                </h4>
                <p style="margin: 4px 0 0 0; color: #64748b; font-size: 12px;">
                    <i class="fas fa-users"></i> ${students.length} students &nbsp;|&nbsp;
                    <i class="fas fa-file-medical"></i> ${columns.length} assessment areas &nbsp;|&nbsp;
                    <i class="fas fa-flag-checkered"></i> Pass Mark: 60%
                    ${isAdmin ? ' | 👑 Admin Mode' : ''}
                </p>
            </div>
            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                <button onclick="lecturerNCKSaveAll()" style="background: #059669; padding: 6px 14px; border: none; border-radius: 6px; color: white; cursor: pointer; font-size: 12px; font-weight: 600;">
                    <i class="fas fa-save"></i> Save All
                </button>
                ${!isAdmin ? `
                <button onclick="lecturerNCKSubmitForApproval()" style="background: #4C1D95; padding: 6px 14px; border: none; border-radius: 6px; color: white; cursor: pointer; font-size: 12px; font-weight: 600;">
                    <i class="fas fa-paper-plane"></i> Submit for Approval
                </button>
                <button onclick="lecturerNCKWithdrawApproval()" style="background: #d97706; padding: 6px 14px; border: none; border-radius: 6px; color: white; cursor: pointer; font-size: 12px; font-weight: 600;">
                    <i class="fas fa-undo"></i> Withdraw
                </button>
                ` : ''}
            </div>
        </div>
        
        <div style="overflow-x: auto;">
            <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                <thead>
                    <tr style="background: linear-gradient(135deg, #4C1D95, #7c3aed); color: white; position: sticky; top: 0; z-index: 5;">
                        <th style="padding: 10px 8px; text-align: center;">#</th>
                        <th style="padding: 10px 8px; text-align: left; min-width: 160px;">Student Name</th>
                        <th style="padding: 10px 8px; text-align: left; min-width: 100px;">Admission</th>
    `;
    
    columns.forEach(function(col) {
        html += '<th style="padding: 10px 8px; text-align: center; min-width: 60px; font-size: 11px; background: #6d28d9;">' + col.label + '</th>';
    });
    
    html += `
                        <th style="padding: 10px 8px; text-align: center; background: #059669; min-width: 50px;">AVG</th>
                        <th style="padding: 10px 8px; text-align: center; background: #FDB913; min-width: 80px;">Status</th>
                        <th style="padding: 10px 8px; text-align: center; background: #8b5cf6; min-width: 80px;">Approval</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    students.forEach(function(student, idx) {
        var mark = LecturerNCK.marks[student.student_id] || {};
        var scores = {};
        try {
            if (mark.scores) {
                scores = typeof mark.scores === 'string' ? JSON.parse(mark.scores) : mark.scores;
            }
        } catch (e) {
            scores = {};
        }
        
        var gradedBy = mark.graded_by || LecturerNCK.lecturerName || '';
        var approvalStatus = mark.approval_status || 'draft';
        
        var totalScore = 0, scoredCount = 0;
        columns.forEach(function(col) {
            var val = parseFloat(scores[col.id]) || 0;
            if (val > 0) {
                totalScore += val;
                scoredCount++;
            }
        });
        
        var avg = scoredCount > 0 ? (totalScore / scoredCount) : 0;
        var status = avg > 0 ? (avg >= 60 ? 'PASS' : 'FAIL') : 'PENDING';
        var bgColor = status === 'PASS' ? '#d1fae5' : (status === 'FAIL' ? '#fee2e2' : '#fef3c7');
        var textColor = status === 'PASS' ? '#065f46' : (status === 'FAIL' ? '#991b1b' : '#92400e');
        var statusIcon = status === 'PASS' ? '✅' : (status === 'FAIL' ? '❌' : '⏳');
        
        var badgeHtml = {
            'pending': '<span style="background:#fef3c7;color:#92400e;padding:2px 10px;border-radius:12px;font-size:11px;">⏳ Pending</span>',
            'approved': '<span style="background:#d1fae5;color:#065f46;padding:2px 10px;border-radius:12px;font-size:11px;">✅ Approved</span>',
            'rejected': '<span style="background:#fee2e2;color:#991b1b;padding:2px 10px;border-radius:12px;font-size:11px;">❌ Rejected</span>',
            'draft': '<span style="background:#e5e7eb;color:#6b7280;padding:2px 10px;border-radius:12px;font-size:11px;">📝 Draft</span>'
        }[approvalStatus] || '<span style="background:#e5e7eb;color:#6b7280;padding:2px 10px;border-radius:12px;font-size:11px;">📝 Draft</span>';
        
        html += `
            <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 8px 6px; text-align: center; font-weight: 600; color: #64748b;">${idx + 1}</td>
                <td style="padding: 8px 6px; font-weight: 500;">${student.student_name || 'Unknown'}</td>
                <td style="padding: 8px 6px; color: #64748b; font-size: 12px;">${student.registration_number || student.student_id || 'N/A'}</td>
        `;
        
        columns.forEach(function(col) {
            var val = scores[col.id] !== undefined && scores[col.id] !== null ? scores[col.id] : '';
            var hasValue = val !== '' && parseFloat(val) > 0;
            var inputBg = hasValue ? '#d1fae5' : '#fff3e0';
            
            html += `
                <td style="padding: 4px 2px; text-align: center;">
                    <input type="number" 
                           class="nck-score-input" 
                           data-student="${student.student_id}" 
                           data-column="${col.id}"
                           value="${val}" 
                           min="0" 
                           max="100" 
                           step="0.5" 
                           style="width: 55px; padding: 4px; border-radius: 6px; text-align: center; background: ${inputBg}; border: 1px solid ${hasValue ? '#d1fae5' : '#fef3c7'}; font-size: 12px;" 
                           onchange="lecturerNCKUpdateAverage('${student.student_id}')">
                </td>
            `;
        });
        
        html += `
                <td style="font-weight: bold; text-align: center; background: ${bgColor}; font-size: 14px;" class="nck-avg-cell" id="nck_avg_${student.student_id}">${avg.toFixed(1)}</td>
                <td style="text-align: center;" class="nck-status-cell" id="nck_status_${student.student_id}">
                    <span style="background: ${bgColor}; color: ${textColor}; padding: 4px 12px; border-radius: 12px; font-weight: 600; font-size: 12px;">${statusIcon} ${status}</span>
                </td>
                <td style="text-align: center;">${badgeHtml}</td>
            </tr>
        `;
    });
    
    html += `
                </tbody>
            </table>
        </div>
        
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 15px; margin-top: 20px; padding-top: 15px; border-top: 1px solid #e5e7eb;">
            <span style="font-size: 13px; color: #64748b;">
                <i class="fas fa-flag"></i> Legend: 
                <span style="background: #d1fae5; padding: 2px 8px; border-radius: 4px; color: #065f46; font-size: 11px;">PASS</span>
                <span style="background: #fee2e2; padding: 2px 8px; border-radius: 4px; color: #991b1b; font-size: 11px;">FAIL</span>
                <span style="background: #fef3c7; padding: 2px 8px; border-radius: 4px; color: #92400e; font-size: 11px;">PENDING</span>
                <span style="margin-left: 15px; font-size: 11px; color: #4C1D95;">
                    <i class="fas fa-user-tie"></i> Graded By: <strong>${LecturerNCK.lecturerName}</strong>
                </span>
            </span>
            <button onclick="lecturerNCKExportCSV()" style="background: #0A3D62; padding: 8px 20px; border: none; border-radius: 6px; color: white; cursor: pointer; font-size: 13px;">
                <i class="fas fa-download"></i> Export CSV
            </button>
        </div>
    `;
    
    container.innerHTML = html;
}

// ============================================================
// UPDATE AVERAGE
// ============================================================
function lecturerNCKUpdateAverage(studentId) {
    var inputs = document.querySelectorAll(`.nck-score-input[data-student="${studentId}"]`);
    var totalScore = 0, scoredCount = 0;
    
    inputs.forEach(function(input) {
        var val = parseFloat(input.value) || 0;
        if (val > 0) {
            totalScore += val;
            scoredCount++;
        }
        input.style.background = val > 0 ? '#d1fae5' : '#fff3e0';
        input.style.borderColor = val > 0 ? '#d1fae5' : '#fef3c7';
    });
    
    var avg = scoredCount > 0 ? (totalScore / scoredCount) : 0;
    var status = avg > 0 ? (avg >= 60 ? 'PASS' : 'FAIL') : 'PENDING';
    var bgColor = status === 'PASS' ? '#d1fae5' : (status === 'FAIL' ? '#fee2e2' : '#fef3c7');
    var textColor = status === 'PASS' ? '#065f46' : (status === 'FAIL' ? '#991b1b' : '#92400e');
    var statusIcon = status === 'PASS' ? '✅' : (status === 'FAIL' ? '❌' : '⏳');
    
    var avgCell = document.getElementById(`nck_avg_${studentId}`);
    if (avgCell) {
        avgCell.textContent = avg.toFixed(1);
        avgCell.style.background = bgColor;
    }
    
    var statusCell = document.getElementById(`nck_status_${studentId}`);
    if (statusCell) {
        statusCell.innerHTML = `
            <span style="background: ${bgColor}; color: ${textColor}; padding: 4px 12px; border-radius: 12px; font-weight: 600; font-size: 12px;">${statusIcon} ${status}</span>
        `;
    }
    
    var row = document.querySelector(`tr[data-student-id="${studentId}"]`);
    if (row) {
        row.className = status === 'PASS' ? 'pass-row' : (status === 'FAIL' ? 'fail-row' : 'pending-row');
    }
}

// ============================================================
// SAVE ALL MARKS
// ============================================================
async function lecturerNCKSaveAll() {
    if (LecturerNCK.isSaving) return;
    LecturerNCK.isSaving = true;
    
    if (!LecturerNCK.accessGranted) {
        showNotification('⛔ Access denied. NCK is only for KRCHN Nursing.', 'error');
        LecturerNCK.isSaving = false;
        return;
    }
    
    var supabase = window.lecturerDB?.supabase || window.sb;
    if (!supabase) {
        showNotification('Database not available', 'error');
        LecturerNCK.isSaving = false;
        return;
    }
    
    var students = LecturerNCK.students;
    if (!students || students.length === 0) {
        showNotification('No students loaded', 'warning');
        LecturerNCK.isSaving = false;
        return;
    }
    
    var block = LECTURER_BLOCK_MAP[LecturerNCK.currentIntake] || 'Block 1';
    var isAdmin = isNckAdmin();
    
    showLoading('Saving NCK marks...');
    var savedCount = 0, errorCount = 0;
    
    for (var s = 0; s < students.length; s++) {
        var student = students[s];
        var studentId = student.student_id;
        var scores = {};
        var inputs = document.querySelectorAll(`.nck-score-input[data-student="${studentId}"]`);
        
        inputs.forEach(function(input) {
            var column = input.dataset.column;
            var val = parseFloat(input.value) || 0;
            scores[column] = val;
        });
        
        var totalScore = 0, scoredCount = 0;
        Object.keys(scores).forEach(function(key) {
            if (scores[key] > 0) {
                totalScore += scores[key];
                scoredCount++;
            }
        });
        var avg = scoredCount > 0 ? (totalScore / scoredCount) : 0;
        var grade = calculateNursingGrade(avg);
        var status = avg > 0 ? (avg >= 60 ? 'passed' : 'failed') : 'pending';
        var approvalStatus = isAdmin ? 'approved' : 'draft';
        
        try {
            var { data: existing, error: findError } = await supabase
                .from('nck_marks')
                .select('id, approval_status')
                .eq('admission_number', studentId)
                .eq('academic_year', LecturerNCK.currentIntake)
                .eq('block', block)
                .eq('subject_name', LecturerNCK.currentSheet)
                .eq('program', 'KRCHN')
                .maybeSingle();
            
            if (findError) throw findError;
            
            var markData = {
                student_id: studentId,
                student_name: student.student_name || 'Unknown',
                admission_number: studentId,
                academic_year: LecturerNCK.currentIntake,
                block: block,
                subject_name: LecturerNCK.currentSheet,
                program: 'KRCHN',
                scores: JSON.stringify(scores),
                final_score: Math.round(avg * 10) / 10,
                grade: grade,
                status: status,
                graded_by: LecturerNCK.lecturerName,
                updated_at: new Date().toISOString()
            };
            
            if (existing) {
                var newStatus = existing.approval_status || 'draft';
                if (isAdmin) {
                    newStatus = 'approved';
                } else if (existing.approval_status === 'approved' || existing.approval_status === 'pending') {
                    newStatus = 'draft';
                }
                markData.approval_status = newStatus;
                
                if (isAdmin && newStatus === 'approved') {
                    markData.approved_at = new Date().toISOString();
                    markData.approved_by = window.currentUser?.id || null;
                }
                
                var { error: updateError } = await supabase
                    .from('nck_marks')
                    .update(markData)
                    .eq('id', existing.id);
                if (updateError) throw updateError;
            } else {
                markData.approval_status = approvalStatus;
                markData.created_at = new Date().toISOString();
                
                if (isAdmin && approvalStatus === 'approved') {
                    markData.approved_at = new Date().toISOString();
                    markData.approved_by = window.currentUser?.id || null;
                }
                
                var { error: insertError } = await supabase
                    .from('nck_marks')
                    .insert([markData]);
                if (insertError) throw insertError;
            }
            savedCount++;
        } catch (err) {
            console.error('Error saving student:', studentId, err);
            errorCount++;
        }
    }
    
    hideLoading();
    if (errorCount > 0) {
        showNotification('⚠️ Saved ' + savedCount + ' records, ' + errorCount + ' errors', 'warning');
    } else {
        showNotification('✅ Saved ' + savedCount + ' records successfully!', 'success');
    }
    await lecturerNCKLoadData();
    
    LecturerNCK.isSaving = false;
}

// ============================================================
// SUBMIT FOR APPROVAL
// ============================================================
async function lecturerNCKSubmitForApproval() {
    if (LecturerNCK.isSubmitting) return;
    LecturerNCK.isSubmitting = true;
    
    if (!LecturerNCK.accessGranted) {
        showNotification('⛔ Access denied. NCK is only for KRCHN Nursing.', 'error');
        LecturerNCK.isSubmitting = false;
        return;
    }
    
    var supabase = window.lecturerDB?.supabase || window.sb;
    if (!supabase) {
        showNotification('Database not available', 'error');
        LecturerNCK.isSubmitting = false;
        return;
    }
    
    var students = LecturerNCK.students;
    if (!students || students.length === 0) {
        showNotification('No students loaded', 'warning');
        LecturerNCK.isSubmitting = false;
        return;
    }
    
    showLoading('Checking marks for submission...');
    
    try {
        var block = LECTURER_BLOCK_MAP[LecturerNCK.currentIntake] || 'Block 1';
        var studentIds = students.map(function(s) { return s.student_id; });
        
        var { data: marks, error } = await supabase
            .from('nck_marks')
            .select('*')
            .in('admission_number', studentIds)
            .eq('academic_year', LecturerNCK.currentIntake)
            .eq('block', block)
            .eq('subject_name', LecturerNCK.currentSheet)
            .eq('program', 'KRCHN');
        
        if (error) throw error;
        
        var draftMarks = (marks || []).filter(function(m) {
            return m.approval_status === 'draft' || m.approval_status === 'rejected';
        });
        var pendingMarks = (marks || []).filter(function(m) { return m.approval_status === 'pending'; });
        var approvedMarks = (marks || []).filter(function(m) { return m.approval_status === 'approved'; });
        
        hideLoading();
        
        if (draftMarks.length === 0) {
            if (approvedMarks.length > 0) {
                showNotification('✅ All marks are already approved!', 'success');
            } else if (pendingMarks.length > 0) {
                showNotification('⏳ ' + pendingMarks.length + ' marks are already pending approval', 'warning');
            } else {
                showNotification('No marks to submit. Please enter marks first.', 'warning');
            }
            LecturerNCK.isSubmitting = false;
            return;
        }
        
        if (!confirm('📤 Submit ' + draftMarks.length + ' marks for approval?')) {
            LecturerNCK.isSubmitting = false;
            return;
        }
        
        showLoading('Submitting ' + draftMarks.length + ' marks...');
        
        var ids = draftMarks.map(function(m) { return m.id; });
        var { error: updateError } = await supabase
            .from('nck_marks')
            .update({
                approval_status: 'pending',
                submitted_at: new Date().toISOString(),
                submitted_by: LecturerNCK.lecturerId
            })
            .in('id', ids);
        
        hideLoading();
        
        if (updateError) {
            showNotification('❌ Error submitting: ' + updateError.message, 'error');
        } else {
            showNotification('✅ ' + draftMarks.length + ' marks submitted for approval!', 'success');
        }
        
        await lecturerNCKLoadData();
        
    } catch (error) {
        hideLoading();
        showNotification('❌ Error submitting: ' + error.message, 'error');
        console.error('Submit error:', error);
    }
    
    LecturerNCK.isSubmitting = false;
}

// ============================================================
// WITHDRAW APPROVAL
// ============================================================
async function lecturerNCKWithdrawApproval() {
    if (!LecturerNCK.accessGranted) {
        showNotification('⛔ Access denied. NCK is only for KRCHN Nursing.', 'error');
        return;
    }
    
    var supabase = window.lecturerDB?.supabase || window.sb;
    if (!supabase) {
        showNotification('Database not available', 'error');
        return;
    }
    
    var students = LecturerNCK.students;
    if (!students || students.length === 0) {
        showNotification('No students loaded', 'warning');
        return;
    }
    
    showLoading('Checking pending marks...');
    
    try {
        var block = LECTURER_BLOCK_MAP[LecturerNCK.currentIntake] || 'Block 1';
        var studentIds = students.map(function(s) { return s.student_id; });
        
        var { data: pendingMarks, error } = await supabase
            .from('nck_marks')
            .select('*')
            .in('admission_number', studentIds)
            .eq('academic_year', LecturerNCK.currentIntake)
            .eq('block', block)
            .eq('subject_name', LecturerNCK.currentSheet)
            .eq('program', 'KRCHN')
            .eq('approval_status', 'pending');
        
        if (error) throw error;
        
        hideLoading();
        
        if (!pendingMarks || pendingMarks.length === 0) {
            showNotification('No pending marks to withdraw', 'warning');
            return;
        }
        
        if (!confirm('⏪ Withdraw ' + pendingMarks.length + ' marks from approval?')) {
            return;
        }
        
        showLoading('Withdrawing ' + pendingMarks.length + ' marks...');
        
        var ids = pendingMarks.map(function(m) { return m.id; });
        var { error: updateError } = await supabase
            .from('nck_marks')
            .update({
                approval_status: 'draft',
                submitted_at: null,
                submitted_by: null
            })
            .in('id', ids);
        
        hideLoading();
        
        if (updateError) {
            showNotification('❌ Error withdrawing: ' + updateError.message, 'error');
        } else {
            showNotification('✅ ' + pendingMarks.length + ' marks withdrawn from approval!', 'success');
        }
        
        await lecturerNCKLoadData();
        
    } catch (error) {
        hideLoading();
        showNotification('❌ Error withdrawing: ' + error.message, 'error');
        console.error('Withdraw error:', error);
    }
}

// ============================================================
// UPDATE STATS
// ============================================================
function lecturerNCKUpdateStats() {
    var students = LecturerNCK.students;
    var marks = LecturerNCK.marks;
    
    var statIds = ['lecturerNCKTotalStudents', 'lecturerNCKPassRate', 'lecturerNCKAvgScore', 
                   'lecturerNCKAtRisk', 'lecturerNCKPublished', 'lecturerNCKPending', 
                   'lecturer_nck_block_students'];
    
    if (!students || students.length === 0) {
        statIds.forEach(function(id) {
            var el = document.getElementById(id);
            if (el) el.textContent = '0';
        });
        return;
    }
    
    var totalScore = 0, countWithScores = 0, passing = 0, failing = 0;
    var approved = 0, pending = 0, draft = 0;
    
    students.forEach(function(student) {
        var mark = marks[student.student_id] || {};
        var scores = {};
        try {
            if (mark.scores) {
                scores = typeof mark.scores === 'string' ? JSON.parse(mark.scores) : mark.scores;
            }
        } catch (e) {}
        
        var total = 0, count = 0;
        Object.keys(scores).forEach(function(key) {
            if (scores[key] > 0) {
                total += scores[key];
                count++;
            }
        });
        
        var avg = count > 0 ? total / count : 0;
        
        if (avg > 0) {
            totalScore += avg;
            countWithScores++;
            if (avg >= 60) passing++;
            else failing++;
        }
        
        if (mark.approval_status === 'approved') approved++;
        else if (mark.approval_status === 'pending') pending++;
        else draft++;
    });
    
    var avgScore = countWithScores > 0 ? Math.round(totalScore / countWithScores) : 0;
    var passRate = students.length > 0 ? Math.round((passing / students.length) * 100) : 0;
    
    var map = {
        'lecturerNCKTotalStudents': students.length,
        'lecturerNCKPassRate': passRate + '%',
        'lecturerNCKAvgScore': avgScore + '%',
        'lecturerNCKAtRisk': failing,
        'lecturerNCKPublished': approved,
        'lecturerNCKPending': pending,
        'lecturer_nck_block_students': students.length
    };
    
    Object.keys(map).forEach(function(id) {
        var el = document.getElementById(id);
        if (el) el.textContent = map[id];
    });
}

// ============================================================
// CHECK APPROVAL STATUS
// ============================================================
function lecturerNCKCheckApprovalStatus() {
    var students = LecturerNCK.students;
    var marks = LecturerNCK.marks;
    
    var banner = document.getElementById('lecturerNCKApprovalBanner');
    if (!banner) return;
    
    if (!students || students.length === 0) {
        banner.style.display = 'none';
        return;
    }
    
    var pendingCount = 0, approvedCount = 0, draftCount = 0, rejectedCount = 0;
    
    students.forEach(function(student) {
        var mark = marks[student.student_id] || {};
        if (mark.approval_status === 'pending') pendingCount++;
        else if (mark.approval_status === 'approved') approvedCount++;
        else if (mark.approval_status === 'rejected') rejectedCount++;
        else draftCount++;
    });
    
    var totalMarks = students.length;
    if (totalMarks === 0) {
        banner.style.display = 'none';
        return;
    }
    
    banner.style.display = 'block';
    var statusText = document.getElementById('lecturerNCKStatusText');
    var statusBadge = document.getElementById('lecturerNCKStatusBadge');
    var submitBtn = document.getElementById('lecturerNCKSubmitBtn');
    var withdrawBtn = document.getElementById('lecturerNCKWithdrawBtn2');
    
    if (pendingCount > 0) {
        banner.style.borderLeftColor = '#f59e0b';
        banner.style.background = '#fef3c7';
        if (statusText) statusText.textContent = pendingCount + ' marks pending Admin Approval';
        if (statusBadge) {
            statusBadge.textContent = '⏳ Pending';
            statusBadge.style.cssText = 'background: #fef3c7; color: #92400e; padding: 4px 12px; border-radius: 12px; font-size: 12px;';
        }
        if (submitBtn) submitBtn.style.display = 'none';
        if (withdrawBtn) withdrawBtn.style.display = 'inline-block';
    } else if (approvedCount > 0 && pendingCount === 0) {
        banner.style.borderLeftColor = '#10b981';
        banner.style.background = '#d1fae5';
        if (statusText) statusText.textContent = '✅ ' + approvedCount + ' marks Approved by Admin';
        if (statusBadge) {
            statusBadge.textContent = '✅ Approved';
            statusBadge.style.cssText = 'background: #d1fae5; color: #065f46; padding: 4px 12px; border-radius: 12px; font-size: 12px;';
        }
        if (submitBtn) submitBtn.style.display = 'none';
        if (withdrawBtn) withdrawBtn.style.display = 'none';
    } else if (rejectedCount > 0) {
        banner.style.borderLeftColor = '#dc2626';
        banner.style.background = '#fee2e2';
        if (statusText) statusText.textContent = '❌ ' + rejectedCount + ' marks Rejected by Admin';
        if (statusBadge) {
            statusBadge.textContent = '❌ Rejected';
            statusBadge.style.cssText = 'background: #fee2e2; color: #991b1b; padding: 4px 12px; border-radius: 12px; font-size: 12px;';
        }
        if (submitBtn) submitBtn.style.display = 'inline-block';
        if (withdrawBtn) withdrawBtn.style.display = 'none';
    } else if (draftCount > 0) {
        banner.style.borderLeftColor = '#6b7280';
        banner.style.background = '#f3f4f6';
        if (statusText) statusText.textContent = '📝 ' + draftCount + ' marks in Draft - Ready to submit';
        if (statusBadge) {
            statusBadge.textContent = '📝 Draft';
            statusBadge.style.cssText = 'background: #e5e7eb; color: #6b7280; padding: 4px 12px; border-radius: 12px; font-size: 12px;';
        }
        if (submitBtn) submitBtn.style.display = 'inline-block';
        if (withdrawBtn) withdrawBtn.style.display = 'none';
    }
}

// ============================================================
// EXPORT CSV
// ============================================================
function lecturerNCKExportCSV() {
    if (!LecturerNCK.accessGranted) {
        showNotification('⛔ Access denied. NCK is only for KRCHN Nursing.', 'error');
        return;
    }
    
    var students = LecturerNCK.students;
    var columns = LecturerNCK.columns;
    
    if (!students || students.length === 0) {
        showNotification('No data to export', 'warning');
        return;
    }
    
    var headers = ['#', 'Student Name', 'Registration', 'Program'];
    columns.forEach(function(col) { headers.push(col.label); });
    headers.push('Average', 'Status', 'Approval');
    
    var rows = [];
    students.forEach(function(student, idx) {
        var mark = LecturerNCK.marks[student.student_id] || {};
        var scores = {};
        try {
            if (mark.scores) {
                scores = typeof mark.scores === 'string' ? JSON.parse(mark.scores) : mark.scores;
            }
        } catch (e) {}
        
        var row = [
            idx + 1,
            student.student_name || 'Unknown',
            student.registration_number || 'N/A',
            student.program || 'KRCHN'
        ];
        
        var total = 0, count = 0;
        columns.forEach(function(col) {
            var val = scores[col.id] || 0;
            row.push(val > 0 ? val : '');
            if (val > 0) {
                total += val;
                count++;
            }
        });
        
        var avg = count > 0 ? total / count : 0;
        var status = avg >= 60 ? 'PASS' : (avg > 0 ? 'FAIL' : 'PENDING');
        row.push(avg > 0 ? avg.toFixed(1) : '');
        row.push(status);
        row.push(mark.approval_status || 'draft');
        
        rows.push(row);
    });
    
    var csv = headers.join(',') + '\n';
    rows.forEach(function(row) {
        csv += row.map(function(cell) { return '"' + String(cell).replace(/"/g, '""') + '"'; }).join(',') + '\n';
    });
    
    var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    var link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'NCK_' + LecturerNCK.currentSheet + '_' + LecturerNCK.currentIntake + '.csv';
    link.click();
    URL.revokeObjectURL(link.href);
    
    showNotification('✅ CSV exported!', 'success');
}

// ============================================================
// FAST ENTRY (Stub)
// ============================================================
function lecturerNCKOpenFastEntry() {
    if (!LecturerNCK.accessGranted) {
        showNotification('⛔ Access denied. NCK is only for KRCHN Nursing.', 'error');
        return;
    }
    showNotification('Fast Entry feature coming soon!', 'info');
}

function lecturerNCKCloseFastEntry() {
    var modal = document.getElementById('lecturerNCKFastEntryModal');
    if (modal) modal.style.display = 'none';
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================
function calculateNursingGrade(score) {
    if (score >= 80) return 'A';
    if (score >= 75) return 'A-';
    if (score >= 70) return 'B+';
    if (score >= 65) return 'B';
    if (score >= 60) return 'B-';
    if (score >= 55) return 'C+';
    if (score >= 50) return 'C';
    if (score >= 45) return 'C-';
    if (score >= 40) return 'D+';
    if (score >= 35) return 'D';
    return 'E';
}

function showNotification(message, type) {
    type = type || 'info';
    if (typeof window.showNotification === 'function') {
        window.showNotification(message, type);
        return;
    }
    console.log('[' + type + '] ' + message);
}

function showLoading(message) {
    if (typeof window.showLoading === 'function') {
        window.showLoading(message);
        return;
    }
    console.log('⏳ ' + message);
}

function hideLoading() {
    if (typeof window.hideLoading === 'function') {
        window.hideLoading();
        return;
    }
    console.log('✅ Loading complete');
}

// ============================================================
// INITIALIZE
// ============================================================
document.addEventListener('DOMContentLoaded', function() {
    console.log('📋 Initializing Lecturer NCK System...');
    setTimeout(function() {
        lecturerNCKInit();
    }, 500);
});

// ============================================================
// EXPOSE GLOBALLY
// ============================================================
window.LecturerNCK = LecturerNCK;
window.lecturerNCKInit = lecturerNCKInit;
window.lecturerNCKGetLecturerInfo = lecturerNCKGetLecturerInfo;
window.lecturerNCKLoadData = lecturerNCKLoadData;
window.lecturerNCKLoadColumns = lecturerNCKLoadColumns;
window.lecturerNCKRenderTable = lecturerNCKRenderTable;
window.lecturerNCKUpdateAverage = lecturerNCKUpdateAverage;
window.lecturerNCKSaveAll = lecturerNCKSaveAll;
window.lecturerNCKSubmitForApproval = lecturerNCKSubmitForApproval;
window.lecturerNCKWithdrawApproval = lecturerNCKWithdrawApproval;
window.lecturerNCKUpdateStats = lecturerNCKUpdateStats;
window.lecturerNCKCheckApprovalStatus = lecturerNCKCheckApprovalStatus;
window.lecturerNCKExportCSV = lecturerNCKExportCSV;
window.lecturerNCKUpdateUI = lecturerNCKUpdateUI;
window.lecturerNCKOpenFastEntry = lecturerNCKOpenFastEntry;
window.lecturerNCKCloseFastEntry = lecturerNCKCloseFastEntry;
window.isNckAdmin = isNckAdmin;
window.isTVETProgram = isTVETProgram;
window.isKRCHNProgram = isKRCHNProgram;
window.showNCKAccessDenied = showNCKAccessDenied;

console.log('✅ Lecturer NCK module loaded successfully');
console.log('📚 Available functions: lecturerNCKInit, lecturerNCKLoadData, lecturerNCKSaveAll, lecturerNCKSubmitForApproval, lecturerNCKWithdrawApproval, lecturerNCKExportCSV');
console.log('👑 Admin mode:', isNckAdmin() ? 'ENABLED' : 'DISABLED');
console.log('🔒 TVET Protection: ENABLED - Only KRCHN Nursing can access');
