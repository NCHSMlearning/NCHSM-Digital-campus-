// ============================================================
// LECTURER NCK SYSTEM - KRCHN NURSING ONLY
// COMPLETE WORKING VERSION - XY FORMS & ASSESSMENT
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
    isSubmitting: false,
    isSaving: false,
    initialized: false,
    accessGranted: true,
    allStudents: [],
    filteredStudents: [],
    email: null
};

// Block mapping
var LECTURER_BLOCK_MAP = {
    '2024': 'Block 4',
    '2025': 'Block 2',
    '2026': 'Introductory',
    '2027': 'Block 1',
    '2028': 'Block 2',
    '2029': 'Block 3',
    '2030': 'Block 4'
};

// ============================================================
// COLUMN DEFINITIONS
// ============================================================
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
// HELPER FUNCTIONS
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
        return false;
    } catch (e) {
        return false;
    }
}

function isKRCHNProgram(programCode) {
    if (!programCode) return false;
    var code = String(programCode).toUpperCase().trim();
    return code === 'KRCHN' || code === 'NURSING' || code === 'KRCHN NURSING';
}

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

function showToast(message, type) {
    type = type || 'info';
    if (typeof window.lecturerUI?.showNotification === 'function') {
        window.lecturerUI.showNotification(message, type);
        return;
    }
    var toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed; bottom: 20px; right: 20px;
        padding: 12px 24px; border-radius: 8px;
        font-weight: 600; z-index: 99999;
        max-width: 400px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        ${type === 'error' ? 'background: #fee2e2; color: #991b1b;' : 
          type === 'success' ? 'background: #d1fae5; color: #065f46;' :
          type === 'warning' ? 'background: #fef3c7; color: #92400e;' :
          'background: #e0e7ff; color: #3730a3;'}
    `;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(function() { toast.remove(); }, 4000);
}

function showLoading(message) {
    // Never call window.showLoading() here: this function is itself exposed
    // globally and doing so causes infinite recursion.
    try {
        if (window.lecturerUI && typeof window.lecturerUI.showLoading === 'function') {
            window.lecturerUI.showLoading(message);
            return;
        }
        if (typeof window.showLoadingOverlay === 'function') {
            window.showLoadingOverlay(message);
            return;
        }
    } catch (e) {}
    console.log('⏳ [NCK] ' + message);
}

function hideLoading() {
    try {
        if (window.lecturerUI && typeof window.lecturerUI.hideLoading === 'function') {
            window.lecturerUI.hideLoading();
            return;
        }
        if (typeof window.hideLoadingOverlay === 'function') {
            window.hideLoadingOverlay();
            return;
        }
    } catch (e) {}
    console.log('✅ [NCK] Loading complete');
}

// ============================================================
// GET LECTURER INFO
// ============================================================
async function lecturerNCKGetLecturerInfo() {
    console.log('🔍 [NCK] Getting lecturer info...');
    
    var lecturerId = null;
    var lecturerName = 'Lecturer';
    var program = 'KRCHN';
    var email = null;
    
    // METHOD 1: Try from sessionStorage
    try {
        var sessionUser = sessionStorage.getItem('user');
        if (sessionUser) {
            var user = JSON.parse(sessionUser);
            lecturerId = user.id || user.user_id || user.staff_id;
            lecturerName = user.full_name || user.name || 'Lecturer';
            program = user.program || user.department || 'KRCHN';
            email = user.email;
            console.log('✅ [NCK] Lecturer from sessionStorage:', lecturerId);
            finishSetup(lecturerId, lecturerName, program, email);
            return;
        }
    } catch (e) {}
    
    // METHOD 2: Try from currentUser
    try {
        if (window.currentUser) {
            var user = window.currentUser;
            lecturerId = user.id || user.user_id || user.staff_id;
            lecturerName = user.full_name || user.name || 'Lecturer';
            program = user.program || user.department || 'KRCHN';
            email = user.email;
            console.log('✅ [NCK] Lecturer from currentUser:', lecturerId);
            finishSetup(lecturerId, lecturerName, program, email);
            return;
        }
    } catch (e) {}
    
    // METHOD 3: Try from lecturerDB
    try {
        if (window.lecturerDB && typeof window.lecturerDB.getCurrentUserProfile === 'function') {
            var profile = window.lecturerDB.getCurrentUserProfile();
            if (profile) {
                lecturerId = profile.user_id || profile.id || profile.staff_id;
                lecturerName = profile.full_name || profile.name || 'Lecturer';
                program = profile.program || profile.department || 'KRCHN';
                email = profile.email;
                console.log('✅ [NCK] Lecturer from lecturerDB:', lecturerId);
                finishSetup(lecturerId, lecturerName, program, email);
                return;
            }
        }
    } catch (e) {}
    
    // METHOD 4: Try from localStorage
    try {
        var staffSession = localStorage.getItem('staffSession');
        if (staffSession) {
            var data = JSON.parse(staffSession);
            lecturerId = data.staffId || data.user_id || data.id;
            lecturerName = data.name || data.full_name || 'Lecturer';
            program = data.program || data.department || 'KRCHN';
            email = data.email;
            console.log('✅ [NCK] Lecturer from staffSession:', lecturerId);
            finishSetup(lecturerId, lecturerName, program, email);
            return;
        }
    } catch (e) {}
    
    // METHOD 5: Try from Supabase
    try {
        var supabase = window.lecturerDB?.supabase || window.sb;
        if (supabase) {
            var { data: { user }, error: userError } = await supabase.auth.getUser();
            if (!userError && user) {
                lecturerId = user.id;
                lecturerName = user.user_metadata?.full_name || user.email || 'Lecturer';
                program = user.user_metadata?.program || 'KRCHN';
                email = user.email;
                console.log('✅ [NCK] Lecturer from Supabase:', lecturerId);
                finishSetup(lecturerId, lecturerName, program, email);
                return;
            }
        }
    } catch (e) {}
    
    // METHOD 6: Use known ID as fallback (from your session)
    console.log('⚠️ [NCK] Using fallback lecturer ID');
    lecturerId = '9f1452e8-9868-4ab4-b208-c50310a84713';
    lecturerName = 'Kevin matoka Tiong\'i';
    program = 'KRCHN';
    email = 'lecturer7798@gmail.com';
    finishSetup(lecturerId, lecturerName, program, email);
}

// ============================================================
// FINISH SETUP
// ============================================================
function finishSetup(lecturerId, lecturerName, program, email) {
    console.log('📋 [NCK] FINAL - ID:', lecturerId);
    console.log('📋 [NCK] FINAL - Name:', lecturerName);
    console.log('📋 [NCK] FINAL - Program:', program);
    
    LecturerNCK.lecturerId = lecturerId;
    LecturerNCK.lecturerName = lecturerName;
    LecturerNCK.lecturerProgram = program;
    LecturerNCK.email = email;
    LecturerNCK.isKRCHN = isKRCHNProgram(program);
    LecturerNCK.isTVET = !LecturerNCK.isKRCHN;
    LecturerNCK.accessGranted = LecturerNCK.isKRCHN;
    
    window.nckLecturerId = lecturerId;
    window.nckLecturerName = lecturerName;
    window.nckLecturerProgram = program;
    window.nckLecturerEmail = email;
    window.nckIsTVET = LecturerNCK.isTVET;
    window.nckIsKRCHN = LecturerNCK.isKRCHN;
    
    lecturerNCKUpdateUI();
    
    if (LecturerNCK.accessGranted && LecturerNCK.lecturerId) {
        console.log('✅ [NCK] Access granted, loading data...');
        setTimeout(function() {
            lecturerNCKLoadData();
        }, 500);
    } else {
        showNCKAccessDenied();
    }
}

// ============================================================
// UPDATE UI
// ============================================================
function lecturerNCKUpdateUI() {
    var nameEl = document.getElementById('lecturerNCKName');
    if (nameEl) nameEl.textContent = LecturerNCK.lecturerName || 'You';
    
    var shortEl = document.getElementById('lecturerNCKShortName');
    if (shortEl) shortEl.textContent = LecturerNCK.lecturerName || 'You';
    
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
    
    var placeholder = document.getElementById('lecturerNCKPlaceholder');
    if (placeholder && LecturerNCK.accessGranted && LecturerNCK.lecturerId) {
        placeholder.innerHTML = `
            <i class="fas fa-check-circle" style="font-size: 48px; color: #10b981; margin-bottom: 16px; display: block;"></i>
            <h3 style="color: #1e293b; margin: 0 0 10px 0;">✅ Lecturer Ready</h3>
            <p style="color: #94a3b8; margin: 0 0 5px 0;">
                <i class="fas fa-user-tie"></i> Lecturer: <strong>${LecturerNCK.lecturerName}</strong>
            </p>
            <p style="color: #94a3b8; font-size: 13px; margin: 0 0 15px 0;">
                <i class="fas fa-id-card"></i> ID: <strong>${LecturerNCK.lecturerId}</strong>
                <span style="margin-left: 15px; background: #d1fae5; padding: 2px 12px; border-radius: 12px; color: #065f46; font-size: 11px;">
                    🎓 KRCHN Nursing
                </span>
            </p>
            <button onclick="window.lecturerNCKLoadData()" style="background: #4C1D95; padding: 10px 30px; border: none; border-radius: 8px; color: white; cursor: pointer; font-weight: 600; font-size: 14px;">
                <i class="fas fa-sync-alt"></i> Load My Students
            </button>
        `;
        placeholder.style.display = 'block';
    }
}

function showNCKAccessDenied() {
    var container = document.getElementById('lecturerNCKTableContainer');
    var placeholder = document.getElementById('lecturerNCKPlaceholder');
    if (placeholder) {
        placeholder.innerHTML = `
            <i class="fas fa-lock" style="font-size: 48px; color: #dc2626; margin-bottom: 16px; display: block;"></i>
            <h3 style="color: #1e293b; margin: 0 0 10px 0;">⛔ Access Denied</h3>
            <p style="color: #94a3b8; margin: 0 0 5px 0;">
                <i class="fas fa-info-circle"></i> The NCK system is <strong>only available for KRCHN Nursing</strong> lecturers.
            </p>
        `;
        placeholder.style.display = 'block';
    }
    if (container) container.innerHTML = '';
}

// ============================================================
// LOAD COLUMNS - FIXED FOR BOTH XY AND ASSESSMENT
// ============================================================
function lecturerNCKLoadColumns() {
    var sheetEl = document.getElementById('lecturerNCKSheet');
    var sheet = sheetEl ? sheetEl.value : 'XY_FORMS';
    
    console.log('📋 [NCK] Loading columns for sheet:', sheet);
    
    var columns = [];
    if (sheet === 'XY_FORMS' || sheet === 'XY FORMS - Clinical Evaluation') {
        columns = LECTURER_XY_COLUMNS;
    } else {
        columns = LECTURER_ASSESSMENT_COLUMNS;
    }
    
    LecturerNCK.columns = columns.map(function(c) {
        return { id: c, label: c };
    });
    LecturerNCK.currentSheet = sheet;
    
    var colEl = document.getElementById('lecturer_nck_block_columns');
    if (colEl) colEl.textContent = columns.length;
    
    console.log('✅ [NCK] Loaded', columns.length, 'columns for', sheet);
    console.log('📊 [NCK] Columns:', columns.join(', '));
}

// ============================================================
// LOAD NCK DATA
// ============================================================
async function lecturerNCKLoadData() {
    console.log('📊 [NCK] Loading data...');
    
    if (!LecturerNCK.accessGranted) {
        showNCKAccessDenied();
        return;
    }
    
    var intakeEl = document.getElementById('lecturerNCKIntake');
    var sheetEl = document.getElementById('lecturerNCKSheet');
    var intake = intakeEl ? intakeEl.value : '2026';
    var sheet = sheetEl ? sheetEl.value : 'XY_FORMS';
    
    LecturerNCK.currentIntake = intake;
    LecturerNCK.currentSheet = sheet;
    
    // Load columns first
    lecturerNCKLoadColumns();
    
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
            await lecturerNCKGetLecturerInfo();
            lecturerId = LecturerNCK.lecturerId;
            if (!lecturerId) {
                throw new Error('Lecturer ID not found. Please refresh or log in again.');
            }
        }
        
        var block = LECTURER_BLOCK_MAP[intake] || 'Block 1';
        console.log('📋 [NCK] Intake:', intake, 'Block:', block, 'Sheet:', sheet);
        console.log('🔍 [NCK] Lecturer ID:', lecturerId);
        
        // Get KRCHN students
        var { data: allStudents, error: studentsError } = await supabase
            .from('consolidated_user_profiles_table')
            .select('id, user_id, student_uuid, student_id, full_name, admission_number, intake_year, program, status')
            .eq('role', 'student')
            .eq('program', 'KRCHN')
            .eq('intake_year', parseInt(intake))
            .eq('status', 'approved');

        if (studentsError) {
            console.error('❌ [NCK] Error loading students:', studentsError);
            throw studentsError;
        }

        allStudents = Array.isArray(allStudents) ? allStudents : [];
        console.log('📚 [NCK] Total KRCHN students for', intake, ':', allStudents.length);

        // Get marks for the selected intake/block/sheet.
        var { data: marks, error: marksError } = await supabase
            .from('nck_marks')
            .select('*')
            .eq('academic_year', intake)
            .eq('block', block)
            .eq('subject_name', sheet)
            .eq('program', 'KRCHN');

        if (marksError) {
            console.error('❌ [NCK] Error loading marks:', marksError);
            throw marksError;
        }

        marks = Array.isArray(marks) ? marks : [];
        console.log('📚 [NCK] Total marks records for', sheet, ':', marks.length);

        // Do not silently drop a student just because admission_number is blank.
        // student_id is also a valid identifier for the marks workflow.
        var krchnStudents = allStudents.filter(function(s) {
            return s && (
                (s.admission_number && String(s.admission_number).trim() !== '') ||
                (s.student_id && String(s.student_id).trim() !== '')
            );
        });

        var withAdmission = krchnStudents.filter(function(s) {
            return s.admission_number && String(s.admission_number).trim() !== '';
        }).length;

        console.log('📚 [NCK] KRCHN students with admission numbers:', withAdmission);
        console.log('📚 [NCK] KRCHN students loaded:', krchnStudents.length);

        // Normalized marks map: supports admission_number and student_id.
        LecturerNCK.marks = {};
        (marks || []).forEach(function(m) {
            var admissionKey = m.admission_number ? String(m.admission_number).trim().toUpperCase() : '';
            var studentKey = m.student_id ? String(m.student_id).trim() : '';

            if (admissionKey) LecturerNCK.marks['adm:' + admissionKey] = m;
            if (studentKey) LecturerNCK.marks['id:' + studentKey] = m;
        });

        LecturerNCK.allStudents = krchnStudents;
        LecturerNCK.students = krchnStudents;
        LecturerNCK.filteredStudents = krchnStudents;
        
        console.log('✅ [NCK] Loaded', LecturerNCK.students.length, 'students');
        
        // Render
        lecturerNCKRenderTable();
        lecturerNCKUpdateStats();
        lecturerNCKCheckApprovalStatus();
        
        var countEl = document.getElementById('lecturer_nck_block_students');
        if (countEl) countEl.textContent = LecturerNCK.students.length;
        if (placeholder) placeholder.style.display = 'none';
        
    } catch (error) {
        console.error('❌ [NCK] Error loading data:', error);
        if (container) {
            container.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #dc2626;">
                    <i class="fas fa-exclamation-circle" style="font-size: 32px; display: block; margin-bottom: 10px;"></i>
                    <p style="font-size: 16px; font-weight: 500;">Error loading data</p>
                    <p style="font-size: 13px; margin: 0;">${error.message}</p>
                    <button onclick="window.lecturerNCKLoadData()" style="margin-top: 15px; padding: 8px 20px; background: #4C1D95; color: white; border: none; border-radius: 6px; cursor: pointer;">
                        <i class="fas fa-sync-alt"></i> Retry
                    </button>
                </div>
            `;
        }
    }
}

// ============================================================
// RENDER TABLE - WITH BOTH XY AND ASSESSMENT COLUMNS
// ============================================================
function lecturerNCKRenderTable() {
    var container = document.getElementById('lecturerNCKTableContainer');
    if (!container) return;
    if (!LecturerNCK.accessGranted) { showNCKAccessDenied(); return; }
    
    var students = LecturerNCK.students || [];
    var columns = LecturerNCK.columns || [];
    
    // If columns are empty, load them
    if (columns.length === 0) {
        lecturerNCKLoadColumns();
        columns = LecturerNCK.columns || [];
    }
    
    if (students.length === 0) {
        container.innerHTML = `
            <div style="text-align:center;padding:40px;color:#94a3b8;">
                <i class="fas fa-users" style="font-size:32px;display:block;margin-bottom:10px;"></i>
                <p style="font-size:16px;font-weight:500;">No students found</p>
                <p style="font-size:13px;margin:0;">No KRCHN students found for ${LecturerNCK.currentIntake} intake</p>
                <button onclick="window.lecturerNCKLoadData()" style="margin-top:15px;padding:8px 20px;background:#4C1D95;color:white;border:none;border-radius:6px;cursor:pointer;">
                    <i class="fas fa-sync-alt"></i> Refresh
                </button>
            </div>
        `;
        return;
    }
    
    var isAdmin = isNckAdmin();
    var sheetLabel = LecturerNCK.currentSheet === 'XY_FORMS' || LecturerNCK.currentSheet === 'XY FORMS - Clinical Evaluation' ? 'XY Forms' : 'Assessment & Case';
    
    var html = `
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 15px; margin-bottom: 20px;">
            <div>
                <h4 style="margin: 0; color: #1e293b; font-size: 16px;">
                    <i class="fas fa-table"></i> NCK ${sheetLabel}
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
                <button onclick="window.lecturerNCKSaveAll()" style="background: #059669; padding: 6px 14px; border: none; border-radius: 6px; color: white; cursor: pointer; font-size: 12px; font-weight: 600;">
                    <i class="fas fa-save"></i> Save All
                </button>
                ${!isAdmin ? `
                <button onclick="window.lecturerNCKSubmitForApproval()" style="background: #4C1D95; padding: 6px 14px; border: none; border-radius: 6px; color: white; cursor: pointer; font-size: 12px; font-weight: 600;">
                    <i class="fas fa-paper-plane"></i> Submit for Approval
                </button>
                <button onclick="window.lecturerNCKWithdrawApproval()" style="background: #d97706; padding: 6px 14px; border: none; border-radius: 6px; color: white; cursor: pointer; font-size: 12px; font-weight: 600;">
                    <i class="fas fa-undo"></i> Withdraw
                </button>
                ` : ''}
                <button onclick="window.lecturerNCKExportCSV()" style="background: #0A3D62; padding: 6px 14px; border: none; border-radius: 6px; color: white; cursor: pointer; font-size: 12px; font-weight: 600;">
                    <i class="fas fa-download"></i> Export
                </button>
                <button onclick="window.lecturerNCKOpenFastEntry()" style="background: #ea580c; padding: 6px 14px; border: none; border-radius: 6px; color: white; cursor: pointer; font-size: 12px; font-weight: 700;">
                    <i class="fas fa-bolt"></i> Fast Entry
                </button>
            </div>
        </div>
        
        <div style="overflow-x: auto;">
            <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                <thead>
                    <tr style="background: linear-gradient(135deg, #4C1D95, #7c3aed); color: white; position: sticky; top: 0; z-index: 5;">
                        <th style="padding: 10px 8px; text-align: center; min-width: 35px;">#</th>
                        <th style="padding: 10px 8px; text-align: left; min-width: 160px;">Student Name</th>
                        <th style="padding: 10px 8px; text-align: left; min-width: 120px;">Admission</th>
    `;
    
    columns.forEach(function(col) {
        html += '<th style="padding: 10px 8px; text-align: center; min-width: 60px; font-size: 11px; background: #6d28d9; border: 1px solid rgba(255,255,255,0.1);">' + col.label + '</th>';
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
        var mark = (student.admission_number && LecturerNCK.marks['adm:' + String(student.admission_number).trim().toUpperCase()]) || (student.student_id && LecturerNCK.marks['id:' + String(student.student_id).trim()]) || {};
        var rowKey = String(student.admission_number || student.student_id || '').replace(/[^a-zA-Z0-9_-]/g, '_');
        var scores = {};
        try {
            if (mark.scores) {
                scores = typeof mark.scores === 'string' ? JSON.parse(mark.scores) : mark.scores;
            }
        } catch (e) {
            scores = {};
        }
        
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
                <td style="padding: 8px 6px; font-weight: 500;">${student.full_name || student.student_name || 'Unknown'}</td>
                <td style="padding: 8px 6px; color: #64748b; font-size: 12px;">${student.admission_number || student.student_id || 'N/A'}</td>
        `;
        
        columns.forEach(function(col) {
            var val = scores[col.id] !== undefined && scores[col.id] !== null ? scores[col.id] : '';
            var hasValue = val !== '' && parseFloat(val) > 0;
            var inputBg = hasValue ? '#d1fae5' : '#fff3e0';
            
            html += `
                <td style="padding: 4px 2px; text-align: center;">
                    <input type="number" 
                           class="nck-score-input" 
                           data-student="${student.admission_number || student.student_id}" 
                           data-column="${col.id}"
                           value="${val}" 
                           min="0" 
                           max="100" 
                           step="0.5" 
                           style="width: 55px; padding: 4px; border-radius: 6px; text-align: center; background: ${inputBg}; border: 1px solid ${hasValue ? '#d1fae5' : '#fef3c7'}; font-size: 12px;" 
                           onchange="window.lecturerNCKUpdateAverage('${student.admission_number || student.student_id}')">
                </td>
            `;
        });
        
        html += `
                <td style="font-weight: bold; text-align: center; background: ${bgColor}; font-size: 14px;" class="nck-avg-cell" id="nck_avg_${rowKey}">${avg.toFixed(1)}</td>
                <td style="text-align: center;" class="nck-status-cell" id="nck_status_${rowKey}">
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
}

// ============================================================
// DATABASE SAVE HELPERS
// ============================================================
function lecturerNCKGetScoresForStudent(student) {
    var scores = {};
    var studentId = String(student.admission_number || student.student_id || '');

    var inputs = Array.prototype.slice.call(document.querySelectorAll('.nck-score-input'))
        .filter(function(input) {
            return String(input.dataset.student || '') === studentId;
        });

    // Prefer the visible table when it exists.
    if (inputs.length > 0) {
        inputs.forEach(function(input) {
            var column = String(input.dataset.column || '');
            if (!column) return;
            var raw = input.value;
            var value = raw === '' ? 0 : parseFloat(raw);
            if (!Number.isFinite(value)) value = 0;
            value = Math.max(0, Math.min(100, value));
            scores[column] = value;
        });
        return scores;
    }

    // Fast Entry can save without relying on a table cell.
    var lookup = student.admission_number
        ? 'adm:' + String(student.admission_number).trim().toUpperCase()
        : 'id:' + String(student.student_id || '').trim();

    var existing = LecturerNCK.marks[lookup] || {};
    try {
        if (existing.scores) {
            scores = typeof existing.scores === 'string'
                ? JSON.parse(existing.scores)
                : Object.assign({}, existing.scores);
        }
    } catch (e) {
        scores = {};
    }

    return scores || {};
}

async function lecturerNCKSaveStudentToDatabase(student, scores, options) {
    options = options || {};

    var supabase = window.lecturerDB?.supabase || window.sb;
    if (!supabase) throw new Error('Database not available');

    var block = LECTURER_BLOCK_MAP[LecturerNCK.currentIntake] || 'Block 1';
    var admissionNumber = student.admission_number
        ? String(student.admission_number).trim()
        : null;
    // IMPORTANT: nck_marks.student_id has a foreign key to
    // consolidated_user_profiles_table.user_id.
    // Therefore ONLY `user_id` may be written to nck_marks.student_id.
    // `student_id` is the admission number (e.g. KRCHN/0048/MAR/24),
    // `student_uuid` is a different UUID, and `id` is the profile row UUID.
    var studentId = null;
    var uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    if (student.user_id && uuidPattern.test(String(student.user_id).trim())) {
        studentId = String(student.user_id).trim();
    }

    // Resolve by admission number when the loaded student object does not
    // contain user_id. This follows the actual nck_marks FK exactly.
    if (!studentId && admissionNumber) {
        var profileLookup = await supabase
            .from('consolidated_user_profiles_table')
            .select('user_id')
            .eq('admission_number', admissionNumber)
            .eq('program', 'KRCHN')
            .limit(1);

        if (profileLookup.error) throw profileLookup.error;

        var profile = profileLookup.data && profileLookup.data[0];
        if (profile && profile.user_id && uuidPattern.test(String(profile.user_id).trim())) {
            studentId = String(profile.user_id).trim();
        }
    }

    if (!studentId) {
        throw new Error(
            'Student user_id not found for ' + (admissionNumber || 'this student') +
            '. nck_marks.student_id must match consolidated_user_profiles_table.user_id.'
        );
    }

    console.log('🔗 [NCK] FK mapping:', admissionNumber, '→ user_id:', studentId);

    var totalScore = 0;
    var scoredCount = 0;

    Object.keys(scores || {}).forEach(function(key) {
        var value = parseFloat(scores[key]);
        if (Number.isFinite(value) && value > 0) {
            totalScore += value;
            scoredCount++;
        }
    });

    var avg = scoredCount > 0 ? totalScore / scoredCount : 0;
    var grade = calculateNursingGrade(avg);
    var status = avg > 0 ? (avg >= 60 ? 'passed' : 'failed') : 'pending';
    var isAdmin = isNckAdmin();

    var existingQuery = supabase
        .from('nck_marks')
        .select('id, approval_status')
        .eq('academic_year', LecturerNCK.currentIntake)
        .eq('block', block)
        .eq('subject_name', LecturerNCK.currentSheet)
        .eq('program', 'KRCHN')
        .limit(1);

    if (admissionNumber) {
        existingQuery = existingQuery.eq('admission_number', admissionNumber);
    } else if (studentId) {
        existingQuery = existingQuery.eq('student_id', studentId);
    } else {
        throw new Error('Student UUID not found for ' + (admissionNumber || student.student_id || 'student') + '. Refresh the NCK list and try again.');
    }

    var { data: existingRows, error: findError } = await existingQuery;
    if (findError) throw findError;

    var existing = Array.isArray(existingRows) && existingRows.length
        ? existingRows[0]
        : null;

    // Keep the COMPLETE nck_marks payload. Do not remove database columns.
    // The SWL/NCK schema contains these fields:
    // id, admission_number, student_id, student_name, subject_name, block,
    // assessment_type, scores, cat1_score, cat2_score, exam_score, final_score,
    // grade, status, graded_by, academic_year, created_at, updated_at,
    // published, published_at, published_by, approval_status, approved_by,
    // approved_at, rejection_reason, submitted_at, submitted_by, program.
    //
    // student_id MUST be consolidated_user_profiles_table.user_id; admission_number remains text.
    var nowISO = new Date().toISOString();

    var markData = {
        student_id: studentId,
        student_name: student.full_name || student.student_name || 'Unknown',
        admission_number: admissionNumber,
        subject_name: LecturerNCK.currentSheet,
        block: block,
        assessment_type: LecturerNCK.currentSheet,
        scores: scores || {},
        cat1_score: null,
        cat2_score: null,
        exam_score: null,
        final_score: Math.round(avg * 10) / 10,
        grade: grade,
        status: status,
        graded_by: LecturerNCK.lecturerName,
        academic_year: LecturerNCK.currentIntake,
        updated_at: nowISO,
        program: 'KRCHN'
    };

    if (existing) {
        // Lecturer edits return a pending/draft record to draft unless admin.
        if (isAdmin) {
            markData.approval_status = 'approved';
            markData.approved_by = LecturerNCK.lecturerId;
            markData.approved_at = nowISO;
        } else if (existing.approval_status === 'approved' || existing.approval_status === 'pending') {
            markData.approval_status = 'draft';
            markData.approved_by = null;
            markData.approved_at = null;
            markData.submitted_by = null;
            markData.submitted_at = null;
            markData.rejection_reason = null;
        } else {
            markData.approval_status = existing.approval_status || 'draft';
        }

        // Preserve publication state unless this is an explicit admin-approved edit.
        markData.published = existing.published === true;
        markData.published_at = existing.published_at || null;
        markData.published_by = existing.published_by || null;

        var { data: updatedRows, error: updateError } = await supabase
            .from('nck_marks')
            .update(markData)
            .eq('id', existing.id)
            .select('*');

        if (updateError) throw updateError;
        existing = updatedRows && updatedRows[0] ? updatedRows[0] : Object.assign({}, existing, markData);
    } else {
        markData.approval_status = isAdmin ? 'approved' : 'draft';
        markData.created_at = nowISO;

        // Complete lifecycle columns for a new record.
        markData.published = false;
        markData.published_at = null;
        markData.published_by = null;
        markData.approved_by = isAdmin ? LecturerNCK.lecturerId : null;
        markData.approved_at = isAdmin ? nowISO : null;
        markData.rejection_reason = null;
        markData.submitted_at = null;
        markData.submitted_by = null;

        var { data: insertedRows, error: insertError } = await supabase
            .from('nck_marks')
            .insert([markData])
            .select('*');

        if (insertError) throw insertError;
        existing = insertedRows && insertedRows[0] ? insertedRows[0] : markData;
    }

    // Update local state immediately so the UI and subsequent Fast Entry
    // operations always use the database version.
    if (existing) {
        if (admissionNumber) {
            LecturerNCK.marks['adm:' + admissionNumber.toUpperCase()] = existing;
        }
        if (studentId) {
            LecturerNCK.marks['id:' + studentId] = existing;
        }
    }

    if (!options.silent) {
        showToast('✅ ' + (student.full_name || 'Student') + ' marks saved to database.', 'success');
    }

    return existing;
}

// ============================================================
// SAVE ALL MARKS
// ============================================================
async function lecturerNCKSaveAll(silent) {
    if (LecturerNCK.isSaving) return false;

    if (!LecturerNCK.accessGranted) {
        showToast('⛔ Access denied.', 'error');
        return false;
    }

    var supabase = window.lecturerDB?.supabase || window.sb;
    if (!supabase) {
        showToast('Database not available', 'error');
        return false;
    }

    var students = LecturerNCK.students || [];
    if (!students.length) {
        showToast('No students loaded', 'warning');
        return false;
    }

    LecturerNCK.isSaving = true;
    showLoading('Saving NCK marks...');

    var savedCount = 0;
    var errorCount = 0;
    var errors = [];

    try {
        for (var s = 0; s < students.length; s++) {
            var student = students[s];

            try {
                var scores = lecturerNCKGetScoresForStudent(student);

                // Do not create empty records unless the user actually has
                // something in the table/local state for this student.
                var hasAnyScore = Object.keys(scores).some(function(key) {
                    return scores[key] !== '' && Number.isFinite(parseFloat(scores[key]));
                });

                var lookup = student.admission_number
                    ? 'adm:' + String(student.admission_number).trim().toUpperCase()
                    : 'id:' + String(student.student_id || '').trim();

                var existingLocal = LecturerNCK.marks[lookup];

                if (!hasAnyScore && !existingLocal) {
                    continue;
                }

                await lecturerNCKSaveStudentToDatabase(student, scores, { silent: true });
                savedCount++;
            } catch (err) {
                errorCount++;
                errors.push((student.full_name || student.admission_number || student.student_id) + ': ' + err.message);
                console.error('❌ [NCK] Error saving student:', student, err);
            }
        }
    } finally {
        hideLoading();
        LecturerNCK.isSaving = false;
    }

    if (errorCount > 0) {
        showToast('⚠️ Saved ' + savedCount + ' records, ' + errorCount + ' errors. Check console.', 'warning');
        console.error('❌ [NCK] Save errors:', errors);
    } else if (savedCount > 0) {
        showToast('✅ Saved ' + savedCount + ' NCK records to database!', 'success');
    } else {
        showToast('⚠️ No marks found to save.', 'warning');
    }

    // Reload only after the operation completes.
    if (savedCount > 0 && !silent) {
        await lecturerNCKLoadData();
    }

    return errorCount === 0;
}

// ============================================================
// SUBMIT FOR APPROVAL
// ============================================================
async function lecturerNCKSubmitForApproval() {
    if (LecturerNCK.isSubmitting) return;

    if (!LecturerNCK.accessGranted) {
        showToast('⛔ Access denied.', 'error');
        return;
    }

    var supabase = window.lecturerDB?.supabase || window.sb;
    if (!supabase) {
        showToast('Database not available', 'error');
        return;
    }

    var students = LecturerNCK.students || [];
    if (!students.length) {
        showToast('No students loaded', 'warning');
        return;
    }

    LecturerNCK.isSubmitting = true;

    try {
        // IMPORTANT: persist everything currently visible before submission.
        var savedOK = await lecturerNCKSaveAll(true);
        if (!savedOK) {
            showToast('❌ Some marks could not be saved. Submission stopped.', 'error');
            return;
        }

        showLoading('Checking saved marks for submission...');

        var block = LECTURER_BLOCK_MAP[LecturerNCK.currentIntake] || 'Block 1';

        // The current intake/block/sheet uniquely identifies this NCK sheet.
        // Do not filter only by admission_number because some valid students
        // may only have student_id.
        var { data: marks, error } = await supabase
            .from('nck_marks')
            .select('*')
            .eq('academic_year', LecturerNCK.currentIntake)
            .eq('block', block)
            .eq('subject_name', LecturerNCK.currentSheet)
            .eq('program', 'KRCHN');

        if (error) throw error;

        var draftMarks = (marks || []).filter(function(m) {
            return m.approval_status === 'draft' || m.approval_status === 'rejected';
        });

        hideLoading();

        if (!draftMarks.length) {
            showToast('No draft marks are available for submission.', 'warning');
            return;
        }

        if (!confirm('📤 Submit ' + draftMarks.length + ' saved marks for approval?')) {
            return;
        }

        showLoading('Submitting ' + draftMarks.length + ' marks...');

        var ids = draftMarks.map(function(m) { return m.id; }).filter(Boolean);

        if (!ids.length) {
            throw new Error('No valid mark IDs found for submission.');
        }

        var { error: updateError } = await supabase
            .from('nck_marks')
            .update({
                approval_status: 'pending',
                submitted_at: new Date().toISOString(),
                submitted_by: LecturerNCK.lecturerId
            })
            .in('id', ids);

        if (updateError) throw updateError;

        hideLoading();
        showToast('✅ ' + ids.length + ' marks submitted for approval!', 'success');

        await lecturerNCKLoadData();

    } catch (error) {
        hideLoading();
        console.error('❌ [NCK] Submit error:', error);
        showToast('❌ Error submitting: ' + error.message, 'error');
    } finally {
        LecturerNCK.isSubmitting = false;
    }
}

// ============================================================
// WITHDRAW APPROVAL
// ============================================================
async function lecturerNCKWithdrawApproval() {
    if (!LecturerNCK.accessGranted) {
        showToast('⛔ Access denied.', 'error');
        return;
    }
    
    var supabase = window.lecturerDB?.supabase || window.sb;
    if (!supabase) {
        showToast('Database not available', 'error');
        return;
    }
    
    var students = LecturerNCK.students;
    if (!students || students.length === 0) {
        showToast('No students loaded', 'warning');
        return;
    }
    
    showLoading('Checking pending marks...');
    
    try {
        var block = LECTURER_BLOCK_MAP[LecturerNCK.currentIntake] || 'Block 1';
        var studentIds = students.map(function(s) { return s.admission_number || s.student_id; });
        
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
            showToast('No pending marks to withdraw', 'warning');
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
            showToast('❌ Error withdrawing: ' + updateError.message, 'error');
        } else {
            showToast('✅ ' + pendingMarks.length + ' marks withdrawn from approval!', 'success');
        }
        
        await lecturerNCKLoadData();
        
    } catch (error) {
        hideLoading();
        showToast('❌ Error withdrawing: ' + error.message, 'error');
    }
}

// ============================================================
// UPDATE STATS
// ============================================================
function lecturerNCKUpdateStats() {
    var students = LecturerNCK.students || [];
    var marks = LecturerNCK.marks || {};
    
    var statIds = ['lecturerNCKTotalStudents', 'lecturerNCKPassRate', 'lecturerNCKAvgScore', 
                   'lecturerNCKAtRisk', 'lecturerNCKPublished', 'lecturerNCKPending', 
                   'lecturer_nck_block_students'];
    
    if (students.length === 0) {
        statIds.forEach(function(id) {
            var el = document.getElementById(id);
            if (el) el.textContent = '0';
        });
        return;
    }
    
    var totalScore = 0, countWithScores = 0, passing = 0, failing = 0;
    var approved = 0, pending = 0, draft = 0;
    
    students.forEach(function(student) {
        var mark = (student.admission_number && marks['adm:' + String(student.admission_number).trim().toUpperCase()]) || (student.student_id && marks['id:' + String(student.student_id).trim()]) || {};
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
    var students = LecturerNCK.students || [];
    var marks = LecturerNCK.marks || {};
    
    var banner = document.getElementById('lecturerNCKApprovalBanner');
    if (!banner) return;
    
    if (students.length === 0) {
        banner.style.display = 'none';
        return;
    }
    
    var pendingCount = 0, approvedCount = 0, draftCount = 0, rejectedCount = 0;
    
    students.forEach(function(student) {
        var mark = (student.admission_number && marks['adm:' + String(student.admission_number).trim().toUpperCase()]) || (student.student_id && marks['id:' + String(student.student_id).trim()]) || {};
        if (mark.approval_status === 'pending') pendingCount++;
        else if (mark.approval_status === 'approved') approvedCount++;
        else if (mark.approval_status === 'rejected') rejectedCount++;
        else draftCount++;
    });
    
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
        showToast('⛔ Access denied.', 'error');
        return;
    }
    
    var students = LecturerNCK.students || [];
    var columns = LecturerNCK.columns || [];
    
    if (students.length === 0) {
        showToast('No data to export', 'warning');
        return;
    }
    
    var headers = ['#', 'Student Name', 'Registration', 'Program'];
    columns.forEach(function(col) { headers.push(col.label); });
    headers.push('Average', 'Status', 'Approval');
    
    var rows = [];
    students.forEach(function(student, idx) {
        var mark = (student.admission_number && LecturerNCK.marks['adm:' + String(student.admission_number).trim().toUpperCase()]) || (student.student_id && LecturerNCK.marks['id:' + String(student.student_id).trim()]) || {};
        var scores = {};
        try {
            if (mark.scores) {
                scores = typeof mark.scores === 'string' ? JSON.parse(mark.scores) : mark.scores;
            }
        } catch (e) {}
        
        var row = [idx + 1, student.full_name || student.student_name || 'Unknown', student.admission_number || 'N/A', student.program || 'KRCHN'];
        
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
    
    showToast('✅ CSV exported!', 'success');
}

// ============================================================
// FAST ENTRY
// ============================================================
function lecturerNCKOpenFastEntry() {
    if (!LecturerNCK.accessGranted) {
        showToast('⛔ Access denied.', 'error');
        return;
    }

    var students = LecturerNCK.students || [];
    var columns = LecturerNCK.columns || [];

    if (!students.length) {
        showToast('Load the NCK students first.', 'warning');
        return;
    }

    if (!columns.length) {
        showToast('No assessment columns are available.', 'warning');
        return;
    }

    var modal = document.getElementById('lecturerNCKFastEntryModal');

    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'lecturerNCKFastEntryModal';
        modal.style.cssText =
            'position:fixed;inset:0;background:rgba(15,23,42,.68);z-index:100000;' +
            'display:flex;align-items:center;justify-content:center;padding:16px;';
        document.body.appendChild(modal);
    }

    modal.innerHTML = `
        <div style="width:min(1050px,100%);max-height:92vh;background:#fff;border-radius:16px;
                    box-shadow:0 25px 60px rgba(0,0,0,.3);overflow:hidden;display:flex;flex-direction:column;">
            <div style="padding:16px 20px;background:linear-gradient(135deg,#4C1D95,#7c3aed);color:#fff;
                        display:flex;align-items:center;justify-content:space-between;gap:12px;">
                <div>
                    <div style="font-size:18px;font-weight:800;">⚡ Fast Marks Entry</div>
                    <div style="font-size:12px;opacity:.9;margin-top:3px;">
                        ${LecturerNCK.currentIntake} Intake ·
                        ${LECTURER_BLOCK_MAP[LecturerNCK.currentIntake] || 'Block 1'} ·
                        ${LecturerNCK.currentSheet}
                    </div>
                </div>
                <button type="button" onclick="window.lecturerNCKCloseFastEntry()"
                        style="border:0;background:rgba(255,255,255,.16);color:#fff;width:36px;height:36px;
                               border-radius:9px;cursor:pointer;font-size:18px;">&times;</button>
            </div>

            <div style="padding:18px 20px;overflow:auto;">
                <div style="display:grid;grid-template-columns:minmax(220px,1fr) minmax(220px,1fr);
                            gap:14px;margin-bottom:16px;">
                    <label style="font-size:12px;font-weight:700;color:#475569;">
                        Student
                        <select id="nckFastStudent"
                                style="display:block;width:100%;margin-top:6px;padding:10px;border:1px solid #cbd5e1;
                                       border-radius:9px;background:#fff;">
                            ${students.map(function(s, i) {
                                var id = s.admission_number || s.student_id || '';
                                return '<option value="' + String(id).replace(/"/g, '&quot;') + '">' +
                                    (i + 1) + '. ' + (s.full_name || 'Unknown') + ' — ' + id + '</option>';
                            }).join('')}
                        </select>
                    </label>

                    <label style="font-size:12px;font-weight:700;color:#475569;">
                        Assessment Area
                        <select id="nckFastColumn"
                                style="display:block;width:100%;margin-top:6px;padding:10px;border:1px solid #cbd5e1;
                                       border-radius:9px;background:#fff;">
                            ${columns.map(function(c) {
                                return '<option value="' + String(c.id).replace(/"/g, '&quot;') + '">' +
                                    c.label + '</option>';
                            }).join('')}
                        </select>
                    </label>
                </div>

                <div id="nckFastStudentInfo"
                     style="padding:12px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;
                            margin-bottom:14px;font-size:12px;color:#475569;"></div>

                <div style="display:flex;align-items:end;gap:12px;flex-wrap:wrap;">
                    <label style="flex:1;min-width:180px;font-size:12px;font-weight:700;color:#475569;">
                        Mark (0–100)
                        <input id="nckFastMark" type="number" min="0" max="100" step="0.5"
                               placeholder="Enter mark"
                               style="display:block;width:100%;margin-top:6px;padding:12px;border:2px solid #cbd5e1;
                                      border-radius:10px;font-size:18px;text-align:center;box-sizing:border-box;">
                    </label>
                    <button type="button" id="nckFastNextBtn"
                            style="padding:12px 20px;border:0;border-radius:10px;
                                   background:#4C1D95;color:#fff;font-weight:700;cursor:pointer;">
                        Save & Next →
                    </button>
                </div>

                <div style="margin-top:16px;padding:12px;border-radius:10px;background:#f1f5f9;
                            color:#475569;font-size:12px;">
                    Enter a mark and press <strong>Save & Next</strong> or <strong>Enter</strong>.
                    The mark is written into the main table immediately. Use <strong>Save All</strong>
                    afterwards to persist all entered marks to Supabase.
                </div>
            </div>
        </div>
    `;

    modal.style.display = 'flex';

    var studentSelect = document.getElementById('nckFastStudent');
    var columnSelect = document.getElementById('nckFastColumn');
    var markInput = document.getElementById('nckFastMark');
    var info = document.getElementById('nckFastStudentInfo');
    var nextBtn = document.getElementById('nckFastNextBtn');

    function selectedStudent() {
        var selected = studentSelect ? studentSelect.value : '';
        return students.find(function(s) {
            return String(s.admission_number || s.student_id || '') === String(selected);
        }) || students[0];
    }

    function updateFastEntryValue() {
        var student = selectedStudent();
        if (!student) return;

        var lookup = student.admission_number
            ? 'adm:' + String(student.admission_number).trim().toUpperCase()
            : 'id:' + String(student.student_id || '').trim();

        var mark = LecturerNCK.marks[lookup] || {};
        var scores = {};

        try {
            scores = mark.scores
                ? (typeof mark.scores === 'string' ? JSON.parse(mark.scores) : mark.scores)
                : {};
        } catch (e) {}

        var column = columnSelect ? columnSelect.value : '';
        if (markInput) {
            markInput.value = scores[column] !== undefined && scores[column] !== null ? scores[column] : '';
            markInput.focus();
            markInput.select();
        }

        if (info) {
            info.innerHTML =
                '<strong>' + (student.full_name || 'Unknown') + '</strong> · ' +
                'Admission: ' + (student.admission_number || 'N/A') + ' · ' +
                'Student ID: ' + (student.student_id || 'N/A');
        }
    }

    async function writeFastValue(student, column, value) {
        var key = student.admission_number || student.student_id || '';
        var input = Array.prototype.slice.call(document.querySelectorAll('.nck-score-input')).find(function(el) {
            return String(el.dataset.student || '') === String(key) &&
                   String(el.dataset.column || '') === String(column);
        });

        // Update the main table when this student/column is visible.
        if (input) {
            input.value = value;
            input.dispatchEvent(new Event('change', { bubbles: true }));
            lecturerNCKUpdateAverage(key);
        }

        // Build the complete score object from the current student state,
        // merge the Fast Entry value, then persist it immediately.
        var scores = lecturerNCKGetScoresForStudent(student);
        scores[column] = value;

        await lecturerNCKSaveStudentToDatabase(student, scores, { silent: true });
        return true;
    }

    if (studentSelect) studentSelect.addEventListener('change', updateFastEntryValue);
    if (columnSelect) columnSelect.addEventListener('change', updateFastEntryValue);

    if (nextBtn) {
        nextBtn.addEventListener('click', async function() {
            var student = selectedStudent();
            var value = markInput ? parseFloat(markInput.value) : NaN;

            if (!Number.isFinite(value) || value < 0 || value > 100) {
                showToast('Enter a valid mark between 0 and 100.', 'warning');
                if (markInput) markInput.focus();
                return;
            }

            var column = columnSelect ? columnSelect.value : '';
            if (!column) {
                showToast('Select an assessment area.', 'warning');
                return;
            }

            nextBtn.disabled = true;
            nextBtn.textContent = 'Saving...';

            try {
                await writeFastValue(student, column, value);
                showToast('✅ Saved to database: ' + (student.full_name || 'Student') +
                          ' — ' + column + ': ' + value, 'success');
            } catch (err) {
                console.error('❌ [NCK] Fast Entry save error:', err);
                showToast('❌ Database save failed: ' + err.message, 'error');
                nextBtn.disabled = false;
                nextBtn.textContent = 'Save & Next →';
                return;
            }

            nextBtn.disabled = false;
            nextBtn.textContent = 'Save & Next →';

            var nextIndex = students.indexOf(student) + 1;
            if (nextIndex < students.length && studentSelect) {
                studentSelect.selectedIndex = nextIndex;
                updateFastEntryValue();
            } else if (markInput) {
                markInput.value = '';
                markInput.focus();
                showToast('All loaded students have been reached.', 'info');
            }
        });
    }

    if (markInput) {
        markInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                if (nextBtn) nextBtn.click();
            }
        });
    }

    updateFastEntryValue();
}

function lecturerNCKCloseFastEntry() {
    var modal = document.getElementById('lecturerNCKFastEntryModal');
    if (modal) modal.style.display = 'none';
}

// ============================================================
// INITIALIZE
// ============================================================
function lecturerNCKInit() {
    console.log('📋 [NCK] Initializing Lecturer NCK System...');
    lecturerNCKGetLecturerInfo();
    lecturerNCKLoadColumns();
    LecturerNCK.initialized = true;
    console.log('✅ [NCK] Lecturer NCK System initialized');
    console.log('🔒 Access Granted:', LecturerNCK.accessGranted);
}

// ============================================================
// AUTO-INIT
// ============================================================
document.addEventListener('DOMContentLoaded', function() {
    console.log('📋 [NCK] DOM ready, initializing...');
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
window.showNCKAccessDenied = showNCKAccessDenied;
window.showToast = showToast;
window.calculateNursingGrade = calculateNursingGrade;

console.log('✅ [NCK] Lecturer NCK module loaded successfully');
console.log('📚 Available functions: lecturerNCKInit, lecturerNCKLoadData, lecturerNCKSaveAll');
console.log('👑 Admin mode:', isNckAdmin() ? 'ENABLED' : 'DISABLED');
console.log('🔒 TVET Protection: ENABLED - Only KRCHN Nursing can access');
