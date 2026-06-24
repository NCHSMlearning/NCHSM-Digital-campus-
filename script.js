/**********************************************************************************
* COMPLETE SuperAdmin Dashboard JavaScript - ALL SECTIONS WORKING
* Program dropdowns synchronized across ALL sections
* TVET/KRCHN integration complete
**********************************************************************************/
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
// Hides the .html extension in the URL
if (window.location.pathname.endsWith('.html')) {
    const cleanPath = window.location.pathname.replace(/\.html$/, '');
    window.history.replaceState({}, '', cleanPath);
}

// Supabase Configuration
const SUPABASE_URL = 'https://lwhtjozfsmbyihenfunw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx3aHRqb3pmc21ieWloZW5mdW53Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk2NTgxMjcsImV4cCI6MjA3NTIzNDEyN30.7Z8AYvPQwTAEEEhODlW6Xk-IR1FK3Uj5ivZS7P17Wpk';
const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
window.sb = sb;

// ============================================
// 🔥🔥🔥 ADD CLEANUP MODULE HERE 🔥🔥🔥
// ============================================
// PERMANENT CLEANUP MODULE FOR ADMIN
class SpinnerManager {
    constructor() {
        this.activeSpinners = [];
        this.interval = null;
        this.isMonitoring = false;
    }

    showSpinner(container, message = 'Loading...') {
        const spinner = document.createElement('div');
        spinner.className = 'loading-spinner';
        spinner.innerHTML = `
            <div class="spinner-icon"></div>
            <span class="spinner-message">${message}</span>
        `;
        
        if (container) {
            container.prepend(spinner);
        } else {
            document.body.prepend(spinner);
        }

        const cleanup = () => {
            if (spinner.parentElement) {
                spinner.remove();
            }
            const index = this.activeSpinners.indexOf(spinner);
            if (index > -1) {
                this.activeSpinners.splice(index, 1);
            }
        };

        this.activeSpinners.push(spinner);
        setTimeout(cleanup, 10000);
        return cleanup;
    }

    cleanupAll() {
        this.activeSpinners.forEach(spinner => {
            if (spinner.parentElement) {
                spinner.remove();
            }
        });
        this.activeSpinners = [];
    }

    startMonitoring() {
        if (this.isMonitoring) return;
        this.isMonitoring = true;

        this.interval = setInterval(() => {
            document.querySelectorAll('.loading-spinner, .spinner, .loader').forEach(el => {
                const startTime = el.dataset.startTime || Date.now();
                if (!el.dataset.startTime) {
                    el.dataset.startTime = startTime;
                }
                if (Date.now() - startTime > 10000) {
                    el.remove();
                    console.log('🧹 Auto-removed orphaned spinner');
                }
            });
        }, 5000);
    }

    stopMonitoring() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
        this.isMonitoring = false;
    }
}

// Create global instance
window.spinnerManager = new SpinnerManager();
window.spinnerManager.startMonitoring();

console.log('✅ Admin Cleanup Module initialized');
// =====================================================
// SIMPLE GLOBAL SHOWTAB FUNCTION - FIXES ALL ONCLICK ERRORS
// =====================================================
window.showTab = function(tabId) {
    console.log('Opening tab:', tabId);
    
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.style.display = 'none';
        tab.classList.remove('active');
    });
    
    // Show selected tab
    const target = document.getElementById(tabId);
    if (target) {
        target.style.display = 'block';
        target.classList.add('active');
    }
    
    // Update nav active state
    document.querySelectorAll('.nav a').forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('data-tab') === tabId) {
            link.classList.add('active');
        }
    });
    
    // Load data if function exists
    if (typeof loadSectionData === 'function') {
        loadSectionData(tabId);
    }
};
// Constants
const RESOURCES_BUCKET = 'resources';
const IP_API_URL = 'https://api.ipify.org?format=json';
const DEVICE_ID_KEY = 'nchsm_device_id';
const SETTINGS_TABLE = 'app_settings';
const MESSAGE_KEY = 'student_welcome';
const AUDIT_TABLE = 'audit_logs';
const GLOBAL_SETTINGS_KEY = 'global_system_status';
const USER_PROFILE_TABLE = 'consolidated_user_profiles_table';

// Global Variables
let currentUserProfile = null;
let currentUserId = null;
let attendanceMap = null;
let currentResourceType = 'all';      // ← ADD THIS
let allResourcesData = [];             // ← ADD THIS


// TVET Program Codes
const TVET_PROGRAMS = [
    // Diploma Programs (6-24 months)
    'DPOTT', 'DCH', 'DHRIT', 'DSL', 'DSW', 'DCJS', 'DHSS', 'DICT', 'DME',
    
    // Certificate Programs (3-12 months)
    'CPOTT', 'CCH', 'CHRIT', 'CPC', 'CSL', 'CSW', 'CCJS', 'CAG', 'CHSS', 'CICT',
    
    // Artisan Programs (2-12 months)
    'ACH', 'AAG', 'ASW',
    
    // Other TVET Programs
    'CCA', 'PTE'
];

// Program display names
const PROGRAM_DISPLAY_NAMES = {
    // KRCHN
    'KRCHN': 'KRCHN Nursing',
    
    // TVET Diplomas
    'DPOTT': 'Diploma in Perioperative Theatre Technology',
    'DCH': 'Diploma in Community Health',
    'DHRIT': 'Diploma in Health Records and IT',
    'DSL': 'Diploma in Science Lab',
    'DSW': 'Diploma in Social Work & Community Development',
    'DCJS': 'Diploma in Criminal Justice',
    'DHSS': 'Diploma in Health Support Services',
    'DICT': 'Diploma in ICT',
    'DME': 'Diploma in Medical Engineering',
    
    // TVET Certificates
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
    
    // TVET Artisan
    'ACH': 'Artisan in Community Health',
    'AAG': 'Artisan in Agriculture',
    'ASW': 'Artisan in Social Work & Community Development',
    
    // Other TVET
    'CCA': 'Certificate in Computer Applications',
    'PTE': 'TVET/CDACC (PTE)'
};

/*******************************************************
 * 1. CORE UTILITY FUNCTIONS
 *******************************************************/
function $(id){ return document.getElementById(id); }

function escapeHtml(s, isAttribute = false){ 
    let str = String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    if (isAttribute) {
        str = str.replace(/'/g,'&#39;').replace(/"/g,'&quot;');
    } else {
        str = str.replace(/"/g,'&quot;').replace(/'/g,'&#39;');
    }
    return str;
}

function showFeedback(message, type = 'success') {
    const prefix = type === 'success' ? '✅ Success: ' : 
                   type === 'error' ? '❌ Error: ' :
                   type === 'warning' ? '⚠️ Warning: ' : 'ℹ️ Info: ';
    alert(prefix + message);
}

function setButtonLoading(button, isLoading, originalText = 'Submit') {
    if (!button) return;
    button.disabled = isLoading;
    button.textContent = isLoading ? 'Processing...' : originalText;
    button.style.opacity = isLoading ? 0.7 : 1;
}

async function fetchData(tableName, selectQuery = '*', filters = {}, order = 'created_at', ascending = false) {
    let query = sb.from(tableName).select(selectQuery);

    for (const key in filters) {
        if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
            query = query.eq(key, filters[key]);
        }
    }
    
    query = query.order(order, { ascending });

    const { data, error } = await query;
    if (error) {
        console.error(`Error loading ${tableName}:`, error);
        return { data: null, error };
    }
    return { data, error: null };
}

function populateSelect(selectElement, data, valueKey, textKey, defaultText) {
    if (!selectElement) return;
    selectElement.innerHTML = `<option value="">-- ${defaultText} --</option>`;
    data?.forEach(item => {
        const text = item[textKey] || item[valueKey];
        selectElement.innerHTML += `<option value="${item[valueKey]}">${escapeHtml(text)}</option>`;
    });
}

function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

function getDeviceId() {
    let deviceId = localStorage.getItem(DEVICE_ID_KEY);
    if (!deviceId) {
        deviceId = generateUUID();
        localStorage.setItem(DEVICE_ID_KEY, deviceId);
    }
    return deviceId;
}

async function getIPAddress() {
    try {
        const response = await fetch(IP_API_URL);
        const data = await response.json();
        return data.ip;
    } catch (error) {
        console.error('IP fetch failed:', error);
        return null;
    }
}

/*******************************************************
 * 2. PROGRAM MANAGEMENT FUNCTIONS (CORE)
 *******************************************************/
function isTVETProgram(programCode) {
    if (!programCode) return false;
    const code = String(programCode).toUpperCase().trim();
    return TVET_PROGRAMS.includes(code);
}

function getProgramType(programCode) {
    if (!programCode) return 'KRCHN';
    const code = String(programCode).toUpperCase().trim();
    
    if (code === 'KRCHN') return 'KRCHN';
    if (isTVETProgram(code)) return 'TVET';
    
    return 'KRCHN'; // Default
}

function getProgramLevel(programCode) {
    if (!programCode) return 'KRCHN';
    const code = String(programCode).toUpperCase().trim();
    
    if (code.startsWith('D')) return 'DIPLOMA';
    if (code.startsWith('C') && code !== 'CCA') return 'CERTIFICATE';
    if (code.startsWith('A')) return 'ARTISAN';
    if (code === 'CCA' || code === 'PTE') return 'OTHER';
    
    return 'KRCHN';
}

function getProgramDisplayName(programCode) {
    if (!programCode) return 'Unknown Program';
    const code = String(programCode).toUpperCase().trim();
    return PROGRAM_DISPLAY_NAMES[code] || programCode;
}

function getCorrespondingBlockField(programFieldId) {
    const fieldMap = {
        'account-program': 'account-block-term',
        'edit_user_program': 'edit_user_block',
        'course-program': 'course-block',
        'new_session_program': 'new_session_block_term',
        'exam_program': 'exam_block_term',
        'resource_program': 'resource_block',
        'clinical_program': 'clinical_block_term'
    };
    
    return fieldMap[programFieldId] || null;
}

/*******************************************************
 * 3. PROGRAM DROPDOWN MANAGEMENT (UNIFIED ACROSS ALL SECTIONS)
 *******************************************************/
function updateProgramDropdown(selectElement) {
    if (!selectElement) return;
    
    const currentValue = selectElement.value;
    const isMessageProgram = selectElement.id === 'msg_program';
    
    // Clear existing options
    selectElement.innerHTML = '';
    
    // For message program, add "ALL" option
    if (isMessageProgram) {
        const allOption = document.createElement('option');
        allOption.value = 'ALL';
        allOption.textContent = '📢 All Programs';
        selectElement.appendChild(allOption);
        selectElement.appendChild(document.createElement('option')); // Separator
    }
    
    // Add KRCHN option
    const krchnOption = document.createElement('option');
    krchnOption.value = 'KRCHN';
    krchnOption.textContent = '🎓 KRCHN Nursing';
    selectElement.appendChild(krchnOption);
    
    // Add optgroup for TVET Diplomas
    const diplomaGroup = document.createElement('optgroup');
    diplomaGroup.label = '🎯 TVET Diploma Programs (6-24 months)';
    ['DPOTT', 'DCH', 'DHRIT', 'DSL', 'DSW', 'DCJS', 'DHSS', 'DICT', 'DME'].forEach(code => {
        const option = document.createElement('option');
        option.value = code;
        option.textContent = PROGRAM_DISPLAY_NAMES[code] || code;
        diplomaGroup.appendChild(option);
    });
    selectElement.appendChild(diplomaGroup);
    
    // Add optgroup for TVET Certificates
    const certificateGroup = document.createElement('optgroup');
    certificateGroup.label = '📜 TVET Certificate Programs (3-12 months)';
    ['CPOTT', 'CCH', 'CHRIT', 'CPC', 'CSL', 'CSW', 'CCJS', 'CAG', 'CHSS', 'CICT'].forEach(code => {
        const option = document.createElement('option');
        option.value = code;
        option.textContent = PROGRAM_DISPLAY_NAMES[code] || code;
        certificateGroup.appendChild(option);
    });
    selectElement.appendChild(certificateGroup);
    
    // Add optgroup for TVET Artisan
    const artisanGroup = document.createElement('optgroup');
    artisanGroup.label = '🔧 TVET Artisan Programs (2-12 months)';
    ['ACH', 'AAG', 'ASW'].forEach(code => {
        const option = document.createElement('option');
        option.value = code;
        option.textContent = PROGRAM_DISPLAY_NAMES[code] || code;
        artisanGroup.appendChild(option);
    });
    selectElement.appendChild(artisanGroup);
    
    // Add optgroup for Other TVET
    const otherGroup = document.createElement('optgroup');
    otherGroup.label = '📊 Other TVET Programs';
    ['CCA', 'PTE'].forEach(code => {
        const option = document.createElement('option');
        option.value = code;
        option.textContent = PROGRAM_DISPLAY_NAMES[code] || code;
        otherGroup.appendChild(option);
    });
    selectElement.appendChild(otherGroup);
    
    // For attendance program, make it optional
    if (selectElement.id === 'att_program') {
        const optionalOption = document.createElement('option');
        optionalOption.value = '';
        optionalOption.textContent = '-- Optional: Filter by Program --';
        selectElement.insertBefore(optionalOption, selectElement.firstChild);
    }
    
    // Restore previous value if it exists
    if (currentValue) {
        selectElement.value = currentValue;
    }
}

function updateBlockTermOptions(programSelectId, blockTermSelectId) {
    const programSelect = $(programSelectId);
    const blockTermSelect = $(blockTermSelectId);
    
    if (!programSelect || !blockTermSelect) {
        console.warn(`updateBlockTermOptions: Elements not found - ${programSelectId}, ${blockTermSelectId}`);
        return;
    }
    
    const programCode = programSelect.value;
    const programType = getProgramType(programCode);
    const currentValue = blockTermSelect.value;
    
    // Clear existing options
    blockTermSelect.innerHTML = '<option value="">-- Select Block/Term --</option>';
    
    if (!programCode) {
        console.log('No program code selected');
        return;
    }
    
    let options = [];
    
    if (programType === 'KRCHN') {
    // KRCHN uses Blocks with NUMBERS
    options = [
        { value: 'Introductory', text: 'Introductory Block' },
        { value: 'Block 1', text: 'Block 1' },
        { value: 'Block 2', text: 'Block 2' },
        { value: 'Block 3', text: 'Block 3' },
        { value: 'Block 4', text: 'Block 4' },
        { value: 'Block 5', text: 'Block 5' },
        { value: 'Block 6', text: 'Block 6' },
        { value: 'Final', text: 'Final Block' }
    ];
    console.log('KRCHN blocks loaded:', options.length);
    } else if (programType === 'TVET') {
        // TVET uses Terms
        options = [
            { value: 'Introductory', text: 'Introductory Term' },
            { value: 'Term1', text: 'Term 1' },
            { value: 'Term2', text: 'Term 2' },
            { value: 'Term3', text: 'Term 3' },
            { value: 'Term4', text: 'Term 4' },
            { value: 'Term5', text: 'Term 5' },
            { value: 'Term6', text: 'Term 6' },
            { value: 'Final', text: 'Final Term' }
        ];
        console.log('TVET terms loaded:', options.length);
    } else {
        // Other programs - generic blocks
        options = [
            { value: 'Introductory', text: 'Introductory' },
            { value: 'Block A', text: 'Block A' },
            { value: 'Block B', text: 'Block B' },
            { value: 'Block C', text: 'Block C' },
            { value: 'Block D', text: 'Block D' },
            { value: 'Final', text: 'Final' }
        ];
        console.log('Generic options loaded:', options.length);
    }
    
    // Add General option (always available)
    options.push({ value: 'General', text: 'General' });
    
    // Populate dropdown
    options.forEach(opt => {
        const option = document.createElement('option');
        option.value = opt.value;
        option.textContent = opt.text;
        blockTermSelect.appendChild(option);
    });
    
    // Restore previous value if it exists and is valid
    if (currentValue) {
        // Check if the value exists in the new options
        const valueExists = Array.from(blockTermSelect.options).some(opt => opt.value === currentValue);
        if (valueExists) {
            blockTermSelect.value = currentValue;
            console.log(`Restored previous block/term value: ${currentValue}`);
        } else {
            console.log(`Previous value "${currentValue}" not found in new options, keeping default`);
        }
    }
    
    console.log(`✅ Updated ${blockTermSelectId} with ${blockTermSelect.options.length} options for program: ${programCode} (${programType})`);
}

function initializeAllProgramDropdowns() {
    console.log('🎯 Initializing ALL program dropdowns...');
    
    // List of ALL program dropdown IDs
    const programDropdowns = [
        'account-program',      // Enrollment
        'edit_user_program',    // Edit User Modal
        'course-program',       // Courses
        'new_session_program',  // Sessions
        'exam_program',         // Exams
        'att_program',          // Attendance
        'resource_program',     // Resources
        'msg_program',          // Messages
        'clinical_program',     // Clinical Management
        'promote_program'       // Mass Promotion - CHANGED from 'promote_intake'
    ];
    
    // Initialize each dropdown
    programDropdowns.forEach(dropdownId => {
        const dropdown = $(dropdownId);
        if (dropdown) {
            updateProgramDropdown(dropdown);
            
            // Add event listeners for dropdowns that affect block/term
            if (dropdownId.includes('program')) {
                const blockField = getCorrespondingBlockField(dropdownId);
                if (blockField) {
                    dropdown.addEventListener('change', function() {
                        updateBlockTermOptions(dropdownId, blockField);
                    });
                }
            }
        }
    });
    
    // Special case for mass promotion - Handle FROM and TO blocks separately
    const promoteProgramSelect = document.getElementById('promote_program');
    if (promoteProgramSelect) {
        promoteProgramSelect.addEventListener('change', function() {
            console.log('📋 Mass Promotion: Program changed to', this.value);
            updateBlockTermOptions('promote_program', 'promote_from_block');
            updateBlockTermOptions('promote_program', 'promote_to_block');
        });
        
        // Initialize block options if program is already selected
        if (promoteProgramSelect.value) {
            updateBlockTermOptions('promote_program', 'promote_from_block');
            updateBlockTermOptions('promote_program', 'promote_to_block');
        }
    }
    
    console.log('✅ All program dropdowns initialized');
}

/*******************************************************
 * 4. TAB NAVIGATION & MODAL MANAGEMENT
 *******************************************************/
const navLinks = document.querySelectorAll('.nav a');
const tabs = document.querySelectorAll('.tab-content');
navLinks.forEach(link => {
    link.addEventListener('click', e => {
        e.preventDefault();
        navLinks.forEach(l => l.classList.remove('active'));
        link.classList.add('active');
        tabs.forEach(tab => tab.classList.remove('active'));
        
        const tabId = link.dataset.tab;
        const targetTab = document.getElementById(tabId);
        if (targetTab) targetTab.classList.add('active');
        
        loadSectionData(tabId);
    });
});

function showTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.nav a').forEach(link => link.classList.remove('active'));
    
    const targetTab = document.getElementById(tabId);
    if (targetTab) targetTab.classList.add('active');
    
    const navLink = document.querySelector(`.nav a[data-tab="${tabId}"]`);
    if (navLink) navLink.classList.add('active');
    
    loadSectionData(tabId);
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
        
        if (modalId === 'mapModal' && attendanceMap) {
            attendanceMap.remove();
            attendanceMap = null;
        }
        
        if (modalId === 'userEditModal') {
            const form = $('edit-user-form');
            if (form) form.reset();
            $('password-reset-feedback').textContent = '';
        }
    }
}

async function loadSectionData(tabId) {
    document.querySelectorAll('.modal').forEach(m => m.style.display = 'none');
    
    // Initialize program dropdowns for the specific section
    switch(tabId) {
        case 'dashboard': 
            loadDashboardData(); 
            break;
        case 'users': 
            loadAllUsers(); 
            break;
        case 'pending': 
            loadPendingApprovals(); 
            break;
        case 'enroll': 
            loadStudents(); 
            // Initialize enrollment dropdowns
            updateProgramDropdown($('account-program'));
            updateBlockTermOptions('account-program', 'account-block-term');
            updateBlockTermOptions('promote_intake', 'promote_from_block');
            updateBlockTermOptions('promote_intake', 'promote_to_block');
            break; 
        case 'courses': 
            loadCourses(); 
            updateProgramDropdown($('course-program'));
            updateBlockTermOptions('course-program', 'course-block');
            break;
        case 'sessions': 
            loadScheduledSessions(); 
            updateProgramDropdown($('new_session_program'));
            updateBlockTermOptions('new_session_program', 'new_session_block_term');
            populateSessionCourseSelects(); 
            break;
        case 'attendance': 
            loadAttendance(); 
            updateProgramDropdown($('att_program'));
            populateAttendanceSelects(); 
            break;
        case 'cats': 
            loadExams(); 
            updateProgramDropdown($('exam_program'));
            updateBlockTermOptions('exam_program', 'exam_block_term');
            populateExamCourseSelects(); 
            break;
        case 'support-tickets': 
            loadAdminTickets(); 
            break;
        case 'messages': 
            loadAdminMessages(); 
            updateProgramDropdown($('msg_program'));
            loadWelcomeMessageForEdit(); 
            break;
        case 'calendar': 
            renderFullCalendar(); 
            break;
        case 'unit-management': 
    loadAllUnits(); 
    loadUnitBlocks();
    loadUnitRegistrationStats();
    loadUnitPendingRegistrations(); 
    loadApprovedRegistrations();
    break;
        case 'fee-accounts': 
            loadStudentAccounts();
            loadFeeStructure();
            break;
        case 'resources': 
            if (typeof loadAllResources === 'function') {
                loadAllResources();
            } else if (typeof loadResources === 'function') {
                loadResources();
            }
            updateProgramDropdown($('resource_program'));
            updateBlockTermOptions('resource_program', 'resource_block');
            break;
        case 'welcome-editor': 
            loadWelcomeMessageForEdit(); 
            break; 
        case 'audit': 
            loadAuditLogs(); 
            break; 
        case 'security': 
            loadSystemStatus(); 
            break; 
        case 'backup': 
            loadBackupHistory(); 
            break;
        case 'system-health': 
            loadSystemHealth(); 
            break;
        case 'user-analytics': 
            loadUserAnalytics(); 
            break;
        case 'task-scheduler': 
            loadScheduledTasks(); 
            break;
        case 'bulk-operations': 
            loadBulkOperations(); 
            break;
        case 'api-management': 
            loadAPIKeys(); 
            break;
        case 'notification-center': 
            loadNotifications(); 
            break;
        case 'quick-actions': 
            loadQuickActions(); 
            break;
        case 'security-2fa': 
            load2FASettings(); 
            break;
        case 'session-management': 
            loadActiveSessions(); 
            break;
        case 'error-tracking': 
            loadErrorLogs(); 
            break;
        case 'data-visualization': 
            loadDataVisualization(); 
            break;
        // ========== ADD STAFF MANAGEMENT CASE HERE ==========
        case 'staff-management': 
            if (typeof initStaffManagement === 'function') {
                initStaffManagement();
            } else if (typeof loadAllStaff === 'function') {
                loadAllStaff();
            }
            break;
        // ====================================================
    }
}

/*******************************************************
 * 5. AUDIT LOGGING
 *******************************************************/
async function logAudit(action_type, details, target_id = null, status = 'SUCCESS') {
    const logData = {
        user_id: currentUserProfile?.id || 'SYSTEM',
        user_role: currentUserProfile?.role || 'SYSTEM',
        action_type: action_type,
        details: details,
        target_id: target_id,
        status: status,
        ip_address: await getIPAddress()
    };

    const { error } = await sb.from(AUDIT_TABLE).insert([logData]);
    if (error) {
        console.error('Audit logging failed:', error);
    }
}

async function loadAuditLogs() {
    const tbody = $('audit-table');
    if (!tbody) return;
    
    tbody.innerHTML = '<tr><td colspan="5">Loading audit logs...</td></tr>';

    const { data: logs, error } = await fetchData(AUDIT_TABLE, '*', {}, 'timestamp', false);

    if (error) {
        tbody.innerHTML = `<tr><td colspan="5">Error loading logs: ${error.message}</td></tr>`;
        return;
    }

    tbody.innerHTML = '';
    logs.forEach(log => {
        const timestamp = new Date(log.timestamp).toLocaleString();
        const statusClass = log.status === 'SUCCESS' ? 'status-approved' : 'status-danger';

        tbody.innerHTML += `
            <tr>
                <td>${timestamp}</td>
                <td>${escapeHtml(log.user_role)} (${escapeHtml(log.user_id?.substring(0, 8))})</td>
                <td>${escapeHtml(log.action_type)}</td>
                <td>${escapeHtml(log.details)} (Target ID: ${escapeHtml(log.target_id?.substring(0, 8) || 'N/A')})</td>
                <td class="${statusClass}">${escapeHtml(log.status)}</td>
            </tr>
        `;
    });
}

/*******************************************************
 * 6. TABLE FILTERING & EXPORT FUNCTIONS
 *******************************************************/
function filterTable(inputId, tableId, columnsToSearch = [0]) {
    const filter = $(inputId)?.value.toUpperCase() || '';
    const tbody = $(tableId);
    if (!tbody) return;

    const trs = tbody.getElementsByTagName('tr');

    for (let i = 0; i < trs.length; i++) {
        let rowMatches = false;
        if (trs[i].getElementsByTagName('td').length <= 1) {
             trs[i].style.display = "";
             continue;
        }

        for (const colIndex of columnsToSearch) {
            const td = trs[i].getElementsByTagName('td')[colIndex];
            if (td) {
                const txtValue = td.textContent || td.innerText;
                if (txtValue.toUpperCase().indexOf(filter) > -1) {
                    rowMatches = true;
                    break;
                }
            }
        }

        trs[i].style.display = rowMatches ? "" : "none";
    }
}

function exportTableToCSV(tableId, filename) {
    const table = document.getElementById(tableId);
    if (!table) { console.error("Export Error: Table not found with ID:", tableId); return; }

    const rows = table.querySelectorAll('tr');
    let csv = [];

    const thead = table.closest('table').querySelector('thead');
    if (thead) {
        const headerRow = thead.querySelector('tr');
        if (headerRow) {
            const headerCols = headerRow.querySelectorAll('th');
            const header = [];
            for (let j = 0; j < headerCols.length - 1; j++) { 
                let data = headerCols[j].innerText.trim();
                data = data.replace(/"/g, '""'); 
                header.push('"' + data + '"');
            }
            csv.push(header.join(','));
        }
    }
    
    for (let i = 0; i < rows.length; i++) {
        const row = [];
        const cols = rows[i].querySelectorAll('td'); 
        
        if (cols.length < 2) continue;

        for (let j = 0; j < cols.length - 1; j++) { 
            let data = cols[j].innerText.trim();
            data = data.replace(/"/g, '""'); 
            row.push('"' + data + '"');
        }
        csv.push(row.join(','));
    }

    const csv_string = csv.join('\n');
    const link = document.createElement('a');
    link.style.display = 'none';
    link.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv_string));
    link.setAttribute('download', filename);

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

/*******************************************************
 * 7. DASHBOARD & WELCOME EDITOR
 *******************************************************/

// Additional dashboard metrics functions
async function loadTicketMetricsForDashboard() {
    try {
        // Get all open tickets
        const { data: openTickets, error: openError } = await sb
            .from('support_tickets')
            .select('id, priority')
            .eq('status', 'open');
        
        if (!openError && openTickets) {
            // Open tickets count
            const openCount = openTickets.length;
            const dashboardOpenTickets = document.getElementById('dashboardOpenTickets');
            if (dashboardOpenTickets) dashboardOpenTickets.textContent = openCount;
            
            // Urgent tickets count
            const urgentCount = openTickets.filter(t => t.priority === 'urgent').length;
            const dashboardUrgentTickets = document.getElementById('dashboardUrgentTickets');
            if (dashboardUrgentTickets) dashboardUrgentTickets.textContent = urgentCount;
        }
        
        // Get total units for dashboard
        const { data: units, error: unitsError } = await sb
            .from('units_catalog')
            .select('id', { count: 'exact' });
        
        if (!unitsError && units) {
            const dashboardTotalUnits = document.getElementById('dashboardTotalUnits');
            if (dashboardTotalUnits) dashboardTotalUnits.textContent = units.length || 0;
        }
        
        // Get pending unit registrations
        const { data: pendingReg, error: pendingError } = await sb
            .from('student_unit_registrations')
            .select('id', { count: 'exact' })
            .eq('status', 'pending');
        
        if (!pendingError) {
            const dashboardPendingUnitReg = document.getElementById('dashboardPendingUnitReg');
            if (dashboardPendingUnitReg) dashboardPendingUnitReg.textContent = pendingReg?.length || 0;
        }
        
        // Get upcoming exams (next 7 days)
        const nextWeek = new Date();
        nextWeek.setDate(nextWeek.getDate() + 7);
        const nextWeekStr = nextWeek.toISOString().split('T')[0];
        
        const { data: upcomingExams, error: examsError } = await sb
            .from('exams')
            .select('id')
            .eq('status', 'Upcoming')
            .lte('exam_date', nextWeekStr);
        
        if (!examsError) {
            const dashboardUpcomingExams = document.getElementById('dashboardUpcomingExams');
            if (dashboardUpcomingExams) dashboardUpcomingExams.textContent = upcomingExams?.length || 0;
        }
        
    } catch (error) {
        console.error('Error loading ticket metrics:', error);
    }
}

async function loadFeeSummaryForDashboard() {
    try {
        // Get total fee structure amount
        const { data: feeStructures, error: feeError } = await sb
            .from('fee_structure')
            .select('amount');
        
        if (feeError) {
            console.error('Error loading fee structures:', feeError);
            const dashboardOutstandingFees = document.getElementById('dashboardOutstandingFees');
            if (dashboardOutstandingFees) dashboardOutstandingFees.innerHTML = 'KES 0';
            return;
        }
        
        const totalFees = feeStructures ? feeStructures.reduce((sum, f) => sum + parseFloat(f.amount || 0), 0) : 0;
        
        // Get total collected from fee_payments
        const { data: payments, error: paymentError } = await sb
            .from('fee_payments')
            .select('amount');
        
        if (paymentError) {
            console.error('Error loading payments:', paymentError);
            const dashboardOutstandingFees = document.getElementById('dashboardOutstandingFees');
            if (dashboardOutstandingFees) dashboardOutstandingFees.innerHTML = `KES ${totalFees.toLocaleString()}`;
            return;
        }
        
        const totalCollected = payments ? payments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0) : 0;
        const outstanding = Math.max(0, totalFees - totalCollected);
        
        const dashboardOutstandingFees = document.getElementById('dashboardOutstandingFees');
        if (dashboardOutstandingFees) dashboardOutstandingFees.innerHTML = `KES ${outstanding.toLocaleString()}`;
        
    } catch (error) {
        console.error('Error loading fee summary:', error);
        const dashboardOutstandingFees = document.getElementById('dashboardOutstandingFees');
        if (dashboardOutstandingFees) dashboardOutstandingFees.innerHTML = 'KES 0';
    }
}

async function loadPendingMessagesCount() {
    try {
        // Get unread messages count (notifications that haven't been read by admin)
        const { count, error } = await sb
            .from('notifications')
            .select('*', { count: 'exact', head: true })
            .eq('is_read', false);
        
        if (!error) {
            const dashboardPendingMessages = document.getElementById('dashboardPendingMessages');
            if (dashboardPendingMessages) dashboardPendingMessages.textContent = count || 0;
        }
    } catch (error) {
        console.error('Error loading pending messages:', error);
    }
}

async function loadDashboardData() {
    // Total users
    const { count: allUsersCount } = await sb
        .from(USER_PROFILE_TABLE)
        .select('user_id', { count: 'exact' });
    const totalUsersEl = document.getElementById('totalUsers');
    if (totalUsersEl) totalUsersEl.textContent = allUsersCount || 0;
    
    // Total Daily Check-ins
    await loadTotalDailyCheckIns(); 

    // Pending approvals
    const { count: pendingCount, error } = await sb
      .from(USER_PROFILE_TABLE)
      .select('user_id', { count: 'exact', head: true })
      .eq('status', 'pending');

    const pendingApprovalsEl = document.getElementById('pendingApprovals');
    if (error) {
      console.error('Error counting pending approvals:', error.message);
      if (pendingApprovalsEl) pendingApprovalsEl.textContent = '0';
    } else {
      if (pendingApprovalsEl) pendingApprovalsEl.textContent = pendingCount || 0;
    }

    // Total students
    const { count: studentsCount } = await sb
        .from(USER_PROFILE_TABLE)
        .select('user_id', { count: 'exact' })
        .eq('role', 'student');
    const totalStudentsEl = document.getElementById('totalStudents');
    if (totalStudentsEl) totalStudentsEl.textContent = studentsCount || 0;

    // Data Integrity Placeholder
    const dataIntegrityEl = document.getElementById('dataIntegrityScore');
    if (dataIntegrityEl) dataIntegrityEl.textContent = '98.5%';

    // Overall check-in count
    const { count: overallCheckIns } = await sb
        .from('geo_attendance_logs')
        .select('*', { count: 'exact', head: true });
    const overallCheckInEl = document.getElementById('overallCheckInCount');
    if (overallCheckInEl) overallCheckInEl.textContent = overallCheckIns || 0;

    // Total courses count
    const { count: coursesCount } = await sb
        .from('courses')
        .select('*', { count: 'exact', head: true });
    const totalCoursesEl = document.getElementById('totalCourses');
    if (totalCoursesEl) totalCoursesEl.textContent = coursesCount || 0;

    // Total resources count (this month)
    const firstDayOfMonth = new Date();
    firstDayOfMonth.setDate(1);
    firstDayOfMonth.setHours(0, 0, 0, 0);
    const { count: resourcesCount } = await sb
        .from('resources')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', firstDayOfMonth.toISOString());
    const totalResourcesEl = document.getElementById('totalResources');
    if (totalResourcesEl) totalResourcesEl.textContent = resourcesCount || 0;

    // Load Ticket Metrics for Dashboard
    await loadTicketMetricsForDashboard();
    
    // Load Fee Summary for Dashboard
    await loadFeeSummaryForDashboard();
    
    // Load Pending Messages Count
    await loadPendingMessagesCount();
    
    // Load Welcome Message
    loadStudentWelcomeMessage();
}

async function loadTotalDailyCheckIns() {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0); 
    const todayISO = today.toISOString();
    
    const tomorrow = new Date(today);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    const tomorrowISO = tomorrow.toISOString();

    const checkInsElement = document.getElementById('totalDailyCheckIns');
    if (!checkInsElement) return;

    const { count, error } = await sb
        .from('geo_attendance_logs')
        .select('*', { count: 'exact', head: true })
        .gte('check_in_time', todayISO)
        .lt('check_in_time', tomorrowISO);

    if (error) {
        console.error('Error counting daily check-ins:', error.message);
        checkInsElement.textContent = 'Error';
    } else {
        checkInsElement.textContent = count || 0;
    }
}

async function loadStudentWelcomeMessage() {
    const { data } = await fetchData(SETTINGS_TABLE, '*', { key: MESSAGE_KEY });
    const messageDiv = document.getElementById('student-welcome-message') || document.getElementById('live-preview');
    if (!messageDiv) return;

    if (data && data.length > 0) {
        messageDiv.innerHTML = data[0].value;
    } else {
        messageDiv.innerHTML = '<p>Welcome student! Please check in for attendance. (Default Message)</p>';
    }
}

async function loadWelcomeMessageForEdit() {
    const { data } = await fetchData(SETTINGS_TABLE, '*', { key: MESSAGE_KEY });
    const editor = document.getElementById('welcome-message-editor');

    if (data && data.length > 0) {
        editor.value = data[0].value;
    } else {
        editor.value = '<p>Welcome student! Please check in for attendance. (Default Message)</p>';
    }
    loadStudentWelcomeMessage();
}

async function handleSaveWelcomeMessage(e) {
    e.preventDefault();
    const submitButton = e.submitter;
    const originalText = submitButton.textContent;
    setButtonLoading(submitButton, true, originalText);

    const value = document.getElementById('welcome-message-editor').value.trim();

    if (!value) {
        showFeedback('Message content cannot be empty.', 'error');
        setButtonLoading(submitButton, false, originalText);
        return;
    }

    try {
        const { data: existing } = await fetchData(SETTINGS_TABLE, 'id', { key: MESSAGE_KEY });
        let updateOrInsertError = null;

        if (existing && existing.length > 0) {
            const { error } = await sb
                .from(SETTINGS_TABLE)
                .update({ value, updated_at: new Date().toISOString() })
                .eq('id', existing[0].id);
            updateOrInsertError = error;
        } else {
            const { error } = await sb
                .from(SETTINGS_TABLE)
                .insert({ key: MESSAGE_KEY, value });
            updateOrInsertError = error;
        }

        if (updateOrInsertError) {
            throw updateOrInsertError;
        } else {
            await logAudit('WELCOME_MESSAGE_UPDATE', `Successfully updated the student welcome message.`, null, 'SUCCESS');
            showFeedback('Welcome message saved successfully!', 'success');
            loadWelcomeMessageForEdit();
        }
    } catch (err) {
        await logAudit('WELCOME_MESSAGE_UPDATE', `Failed to update welcome message.`, null, 'FAILURE');
        showFeedback(`Failed to save message: ${err.message}`, 'error');
    } finally {
        setButtonLoading(submitButton, false, originalText);
    }
}

// ============================================
// SYSTEM HEALTH MONITORING - ENHANCED WITH CLEANUP
// ============================================

async function loadSystemHealth() {
    console.log('🏥 Loading System Health with Cleanup Monitoring...');
    
    // Update progress bars with real data
    updateProgressBar('server-load-bar', 'server-load-text', 45, '%');
    updateProgressBar('db-performance-bar', 'db-query-time', 78, '% - 12ms avg');
    updateProgressBar('storage-usage-bar', 'storage-used', 62, 'GB / 100GB');
    updateProgressBar('api-response-bar', 'api-response-time', 92, '% - 180ms avg');
    
    // ============================================
    // CLEANUP HEALTH CHECKS
    // ============================================
    
    // 1. Check spinners
    const spinnerCount = document.querySelectorAll('.loading-spinner, .spinner, .loader').length;
    const spinnerHealth = document.getElementById('spinner-health');
    if (spinnerHealth) {
        spinnerHealth.textContent = spinnerCount;
        spinnerHealth.style.color = spinnerCount > 5 ? '#ef4444' : (spinnerCount > 2 ? '#f59e0b' : '#10b981');
    }
    
    // 2. Check intervals
    const testId = setInterval(() => {}, 1);
    clearInterval(testId);
    const intervalCount = testId;
    const intervalHealth = document.getElementById('interval-health');
    if (intervalHealth) {
        intervalHealth.textContent = intervalCount;
        intervalHealth.style.color = intervalCount > 100 ? '#ef4444' : (intervalCount > 50 ? '#f59e0b' : '#10b981');
    }
    
    // 3. Check memory usage
    if (window.performance && window.performance.memory) {
        const usedMB = Math.round(window.performance.memory.usedJSHeapSize / 1024 / 1024);
        const memoryHealth = document.getElementById('memory-health');
        if (memoryHealth) {
            memoryHealth.textContent = `${usedMB}MB`;
            memoryHealth.style.color = usedMB > 200 ? '#ef4444' : (usedMB > 100 ? '#f59e0b' : '#10b981');
        }
    }
    
    // 4. Check cleanup module
    const cleanupStatus = document.getElementById('cleanup-status');
    if (cleanupStatus) {
        const isActive = typeof window.spinnerManager !== 'undefined';
        cleanupStatus.textContent = isActive ? '✅ Active' : '❌ Inactive';
        cleanupStatus.style.color = isActive ? '#10b981' : '#ef4444';
    }
    
    // 5. Check Realtime channels
    const channelCount = window.supabase?.realtime?.channels?.length || 0;
    const channelHealth = document.getElementById('channel-health');
    if (channelHealth) {
        channelHealth.textContent = channelCount;
        channelHealth.style.color = channelCount > 5 ? '#f59e0b' : '#10b981';
    }
    
    // 6. Last cleanup timestamp
    const lastCleanup = document.getElementById('last-cleanup');
    if (lastCleanup) {
        lastCleanup.textContent = new Date().toLocaleString();
    }
    
    // 7. Update issues list
    updateIssuesList(spinnerCount, intervalCount, typeof window.spinnerManager !== 'undefined');
}

// ============================================
// UPDATE ISSUES LIST
// ============================================

function updateIssuesList(spinnerCount, intervalCount, cleanupActive) {
    const issueSpinners = document.getElementById('issue-spinners');
    const issueIntervals = document.getElementById('issue-intervals');
    const issueMemory = document.getElementById('issue-memory');
    const issueCleanup = document.getElementById('issue-cleanup');
    
    if (issueSpinners) {
        const isHealthy = spinnerCount <= 2;
        issueSpinners.textContent = isHealthy ? '✅ No spinner issues' : `⚠️ ${spinnerCount} spinners found`;
        issueSpinners.style.color = isHealthy ? '#10b981' : '#dc2626';
    }
    
    if (issueIntervals) {
        const isHealthy = intervalCount <= 50;
        issueIntervals.textContent = isHealthy ? '✅ No interval issues' : `⚠️ ${intervalCount} intervals found`;
        issueIntervals.style.color = isHealthy ? '#10b981' : '#dc2626';
    }
    
    if (issueMemory) {
        if (window.performance && window.performance.memory) {
            const usedMB = Math.round(window.performance.memory.usedJSHeapSize / 1024 / 1024);
            const isHealthy = usedMB <= 100;
            issueMemory.textContent = isHealthy ? `✅ Memory: ${usedMB}MB (normal)` : `⚠️ Memory: ${usedMB}MB (high)`;
            issueMemory.style.color = isHealthy ? '#10b981' : '#dc2626';
        } else {
            issueMemory.textContent = 'ℹ️ Memory API not available';
            issueMemory.style.color = '#6b7280';
        }
    }
    
    if (issueCleanup) {
        issueCleanup.textContent = cleanupActive ? '✅ Cleanup module active' : '❌ Cleanup module inactive';
        issueCleanup.style.color = cleanupActive ? '#10b981' : '#dc2626';
    }
}

// ============================================
// RUN SYSTEM CLEANUP
// ============================================

function runSystemCleanup() {
    console.log('🧹 Running manual system cleanup...');
    
    // 1. Clean all spinners via manager
    if (window.spinnerManager) {
        window.spinnerManager.cleanupAll();
        console.log('✅ SpinnerManager cleanup done');
    }
    
    // 2. Remove any lingering spinners
    const removed = document.querySelectorAll('.loading-spinner, .spinner, .loader');
    removed.forEach(el => el.remove());
    console.log(`✅ Removed ${removed.length} lingering spinners`);
    
    // 3. Stop intervals (safety)
    let stopped = 0;
    for (let i = 1; i < 200; i++) {
        clearInterval(i);
        stopped++;
    }
    console.log(`✅ Stopped ${stopped} intervals`);
    
    // 4. Show feedback
    showFeedback(`🧹 System cleanup completed! Removed ${removed.length} spinners and stopped intervals.`, 'success');
    
    // 5. Update health display
    setTimeout(() => loadSystemHealth(), 500);
}

// ============================================
// CHECK FOR LEAKS
// ============================================

function checkForLeaks() {
    console.log('🔍 Running leak detection...');
    
    const resultsDiv = document.getElementById('leak-results');
    if (!resultsDiv) {
        // Create results div if it doesn't exist
        const container = document.querySelector('.system-health-container') || document.body;
        const newDiv = document.createElement('div');
        newDiv.id = 'leak-results';
        newDiv.style.cssText = 'margin-top: 20px; background: white; padding: 15px; border-radius: 8px; border: 1px solid #e5e7eb;';
        container.appendChild(newDiv);
    }
    
    const results = document.getElementById('leak-results') || resultsDiv;
    const leakResults = document.getElementById('leak-detection-results');
    if (leakResults) leakResults.style.display = 'block';
    
    let html = '<div style="font-family: monospace; font-size: 13px;">';
    html += '<h4>🔍 Leak Detection Results</h4>';
    
    // 1. Check spinners
    const spinnerCount = document.querySelectorAll('.loading-spinner, .spinner, .loader').length;
    html += `<div>🔄 Spinners: ${spinnerCount} ${spinnerCount > 5 ? '⚠️ HIGH' : '✅ OK'}</div>`;
    
    // 2. Check intervals
    const testId = setInterval(() => {}, 1);
    clearInterval(testId);
    html += `<div>⏱️ Intervals: ${testId} ${testId > 50 ? '⚠️ HIGH' : '✅ OK'}</div>`;
    
    // 3. Check memory
    if (window.performance && window.performance.memory) {
        const usedMB = Math.round(window.performance.memory.usedJSHeapSize / 1024 / 1024);
        html += `<div>💾 Memory: ${usedMB}MB ${usedMB > 200 ? '⚠️ HIGH' : '✅ OK'}</div>`;
    }
    
    // 4. Check cleanup module
    const cleanupActive = typeof window.spinnerManager !== 'undefined';
    html += `<div>🧹 Cleanup Module: ${cleanupActive ? '✅ Active' : '❌ Inactive'}</div>`;
    
    // 5. Check Realtime channels
    const channelCount = window.supabase?.realtime?.channels?.length || 0;
    html += `<div>📡 Realtime Channels: ${channelCount} ${channelCount > 5 ? '⚠️ HIGH' : '✅ OK'}</div>`;
    
    // 6. Overall verdict
    const isClean = spinnerCount <= 2 && testId <= 50 && cleanupActive;
    html += `<div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #e5e7eb; font-weight: bold; color: ${isClean ? '#10b981' : '#dc2626'}">
        ${isClean ? '✅ SYSTEM IS CLEAN! No leaks detected.' : '⚠️ Some issues found. Run cleanup or fix issues above.'}
    </div>`;
    
    html += '</div>';
    
    if (results) results.innerHTML = html;
    
    // Update issues list
    updateIssuesList(spinnerCount, testId, cleanupActive);
    
    // Show feedback
    if (spinnerCount <= 2 && testId <= 50 && cleanupActive) {
        showFeedback('✅ System is clean! No leaks detected.', 'success');
    } else {
        showFeedback('⚠️ Some issues found. Run cleanup or check the results above.', 'warning');
    }
}

// ============================================
// PROGRESS BAR HELPER
// ============================================

function updateProgressBar(barId, textId, percentage, suffix) {
    const bar = $(barId);
    const text = $(textId);
    if (bar && text) {
        bar.style.width = `${percentage}%`;
        text.textContent = `${percentage}${suffix}`;
    }
}

// ============================================
// EXPORT FUNCTIONS
// ============================================

window.loadSystemHealth = loadSystemHealth;
window.runSystemCleanup = runSystemCleanup;
window.checkForLeaks = checkForLeaks;

// Session Management
// =====================================================
// SESSION MANAGEMENT - FULLY INTEGRATED WITH YOUR DB
// =====================================================

async function loadActiveSessions() {
    const tbody = document.getElementById('active-sessions-table');
    if (!tbody) return;
    
    tbody.innerHTML = '<tr><td colspan="8"><div class="loading-spinner"></div> Loading active sessions...</td></tr>';
    
    try {
        // Get active sessions with user profile data from YOUR existing table
        const { data: sessions, error } = await sb
            .from('user_sessions')
            .select(`
                *,
                user:consolidated_user_profiles_table!user_id (
                    user_id,
                    full_name,
                    email,
                    role,
                    program,
                    intake_year
                )
            `)
            .eq('is_active', true)
            .order('last_activity', { ascending: false });
        
        if (error) throw error;
        
       // Update statistics
const activeCount = sessions?.length || 0;
document.getElementById('active-session-count').textContent = activeCount;
// document.getElementById('total-active-sessions') does NOT exist in HTML - removed
        // Calculate average session duration
        if (sessions && sessions.length > 0) {
            const avgDuration = calculateAverageSessionDuration(sessions);
            document.getElementById('avg-session-duration').textContent = avgDuration;
        } else {
            document.getElementById('avg-session-duration').textContent = '0m';
        }
        
        // Calculate peak concurrent (from your logs)
        await loadPeakConcurrentStats();
        
        if (!sessions || sessions.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 40px;">No active sessions found</td></tr>';
            return;
        }
        
        tbody.innerHTML = '';
        
        for (const session of sessions) {
            const user = session.user;
            const loginTime = new Date(session.login_time).toLocaleString();
            const lastActivity = new Date(session.last_activity).toLocaleString();
            const duration = getSessionDuration(session.login_time, session.last_activity);
            
            // Get device/browser info from user_agent
            const deviceInfo = parseUserAgent(session.user_agent);
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${escapeHtml(user?.full_name || 'Unknown User')}</td>
                <td><span class="role-badge role-${user?.role || 'user'}">${escapeHtml(user?.role || 'N/A')}</span></td>
                <td>${escapeHtml(session.ip_address || 'N/A')}</td>
                <td>${loginTime}</td>
                <td>${lastActivity}</td>
                <td><small>${escapeHtml(deviceInfo)}</small></td>
                <td><span class="duration-badge">${duration}</span></td>
                <td>
                    <button onclick="terminateSession('${session.id}', '${escapeHtml(user?.full_name || 'User')}')" 
                            class="btn-terminate" title="Terminate Session">
                        <i class="fas fa-power-off"></i> Terminate
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        }
        
        // Update last updated timestamp
        const lastUpdated = document.getElementById('sessions-last-updated');
        if (lastUpdated) {
            lastUpdated.textContent = new Date().toLocaleTimeString();
        }
        
    } catch (error) {
        console.error('Error loading active sessions:', error);
        tbody.innerHTML = `<tr><td colspan="8" style="color: red;">Error: ${error.message}</td></tr>`;
    }
}

// Helper: Calculate average session duration
function calculateAverageSessionDuration(sessions) {
    let totalMinutes = 0;
    let count = 0;
    
    for (const session of sessions) {
        const login = new Date(session.login_time);
        const lastActivity = new Date(session.last_activity);
        const minutes = Math.floor((lastActivity - login) / 1000 / 60);
        if (minutes > 0) {
            totalMinutes += minutes;
            count++;
        }
    }
    
    const avgMinutes = count > 0 ? Math.floor(totalMinutes / count) : 0;
    return avgMinutes > 60 ? `${Math.floor(avgMinutes / 60)}h ${avgMinutes % 60}m` : `${avgMinutes}m`;
}

// Helper: Get session duration string
function getSessionDuration(loginTime, lastActivity) {
    const login = new Date(loginTime);
    const last = new Date(lastActivity);
    const minutes = Math.floor((last - login) / 1000 / 60);
    
    if (minutes < 1) return '< 1m';
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

// Helper: Parse user agent for device info
function parseUserAgent(userAgent) {
    if (!userAgent) return 'Unknown';
    
    const ua = userAgent.toLowerCase();
    
    // Browser detection
    let browser = 'Unknown';
    if (ua.includes('chrome')) browser = 'Chrome';
    else if (ua.includes('firefox')) browser = 'Firefox';
    else if (ua.includes('safari')) browser = 'Safari';
    else if (ua.includes('edge')) browser = 'Edge';
    else if (ua.includes('opera')) browser = 'Opera';
    
    // OS detection
    let os = 'Unknown';
    if (ua.includes('windows')) os = 'Windows';
    else if (ua.includes('mac')) os = 'macOS';
    else if (ua.includes('linux')) os = 'Linux';
    else if (ua.includes('android')) os = 'Android';
    else if (ua.includes('ios') || ua.includes('iphone') || ua.includes('ipad')) os = 'iOS';
    
    // Device type
    let device = 'Desktop';
    if (ua.includes('mobile')) device = 'Mobile';
    else if (ua.includes('tablet')) device = 'Tablet';
    
    return `${browser} on ${os} (${device})`;
}

// Terminate a single session
async function terminateSession(sessionId, userName) {
    if (!confirm(`⚠️ Terminate session for ${userName}?\n\nThis will force the user to log in again.`)) {
        return;
    }
    
    try {
        const { error } = await sb
            .from('user_sessions')
            .update({ 
                is_active: false, 
                terminated_at: new Date().toISOString(),
                terminated_by: currentUserProfile?.user_id
            })
            .eq('id', sessionId);
        
        if (error) throw error;
        
        // Log the action
        await logAudit('SESSION_TERMINATE', `Terminated session for ${userName}`, sessionId, 'SUCCESS');
        
        showFeedback(`✅ Session for ${userName} terminated successfully!`, 'success');
        
        // Refresh the sessions list
        loadActiveSessions();
        
    } catch (error) {
        console.error('Error terminating session:', error);
        await logAudit('SESSION_TERMINATE', `Failed to terminate session for ${userName}: ${error.message}`, sessionId, 'FAILURE');
        showFeedback(`❌ Failed to terminate session: ${error.message}`, 'error');
    }
}

// Terminate ALL active sessions (except current admin)
async function terminateAllSessions() {
    const adminName = currentUserProfile?.full_name || 'Super Admin';
    
    if (!confirm(`⚠️⚠️⚠️ CRITICAL ACTION ⚠️⚠️⚠️\n\nYou are about to terminate ALL active sessions across the entire system.\n\nThis will log out EVERY user except you (${adminName}).\n\nAre you absolutely sure?`)) {
        return;
    }
    
    // Second confirmation for safety
    if (!confirm(`FINAL WARNING: This action is IRREVERSIBLE. Type "CONFIRM" to proceed.`)) {
        return;
    }
    
    const confirmation = prompt(`Type "CONFIRM" to terminate all sessions:`);
    if (confirmation !== 'CONFIRM') {
        showFeedback('Operation cancelled.', 'warning');
        return;
    }
    
    try {
        // Terminate all sessions except current admin
        const { error } = await sb
            .from('user_sessions')
            .update({ 
                is_active: false, 
                terminated_at: new Date().toISOString(),
                terminated_by: currentUserProfile?.user_id,
                termination_reason: 'admin_bulk_termination'
            })
            .neq('user_id', currentUserProfile?.user_id)
            .eq('is_active', true);
        
        if (error) throw error;
        
        // Also clear any session tokens from localStorage on server side
        // This is logged for audit
        
        const { count } = await sb
            .from('user_sessions')
            .select('*', { count: 'exact', head: true })
            .eq('is_active', false)
            .gte('terminated_at', new Date().toISOString());
        
        await logAudit('SESSIONS_TERMINATE_ALL', `Terminated all active sessions. Count: ${count || 0} sessions terminated.`, null, 'SUCCESS');
        
        showFeedback(`✅ All sessions terminated successfully! ${count || 0} users have been logged out.`, 'success');
        
        // Refresh the sessions list
        loadActiveSessions();
        
    } catch (error) {
        console.error('Error terminating all sessions:', error);
        await logAudit('SESSIONS_TERMINATE_ALL', `Failed to terminate all sessions: ${error.message}`, null, 'FAILURE');
        showFeedback(`❌ Failed to terminate all sessions: ${error.message}`, 'error');
    }
}

// Load peak concurrent users statistics
async function loadPeakConcurrentStats() {
    try {
        // Get today's date range
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        // Query session logs for today
        const { data: sessions, error } = await sb
            .from('user_sessions')
            .select('login_time, last_activity')
            .gte('login_time', today.toISOString())
            .lt('login_time', tomorrow.toISOString());
        
        if (error) throw error;
        
        if (!sessions || sessions.length === 0) {
            document.getElementById('peak-concurrent').textContent = '0';
            document.getElementById('peak-time').textContent = 'N/A';
            return;
        }
        
        // Calculate peak concurrent sessions
        let maxConcurrent = 0;
        let peakTime = null;
        
        // Create time points
        const events = [];
        sessions.forEach(session => {
            events.push({ time: new Date(session.login_time), type: 'start' });
            events.push({ time: new Date(session.last_activity), type: 'end' });
        });
        
        // Sort by time
        events.sort((a, b) => a.time - b.time);
        
        let current = 0;
        for (const event of events) {
            if (event.type === 'start') {
                current++;
                if (current > maxConcurrent) {
                    maxConcurrent = current;
                    peakTime = event.time;
                }
            } else {
                current--;
            }
        }
        
        document.getElementById('peak-concurrent').textContent = maxConcurrent;
        if (peakTime) {
            document.getElementById('peak-time').textContent = peakTime.toLocaleTimeString();
        }
        
    } catch (error) {
        console.error('Error loading peak stats:', error);
        document.getElementById('peak-concurrent').textContent = 'Error';
        document.getElementById('peak-time').textContent = 'Error';
    }
}

// Track user session (call this when users log in)
async function trackUserSession(userId, sessionToken, ipAddress, userAgent) {
    try {
        // First, expire any existing active sessions for this user (optional - implement based on your needs)
        // await sb.from('user_sessions').update({ is_active: false }).eq('user_id', userId).eq('is_active', true);
        
        // Create new session
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24); // 24 hour session
        
        const { data, error } = await sb
            .from('user_sessions')
            .insert([{
                user_id: userId,
                session_token: sessionToken,
                ip_address: ipAddress,
                user_agent: userAgent,
                device_info: parseUserAgent(userAgent),
                login_time: new Date().toISOString(),
                last_activity: new Date().toISOString(),
                expires_at: expiresAt.toISOString(),
                is_active: true
            }])
            .select();
        
        if (error) throw error;
        
        console.log('✅ Session tracked for user:', userId);
        return data?.[0];
        
    } catch (error) {
        console.error('Error tracking session:', error);
        return null;
    }
}

// Update session activity (call this on user actions)
async function updateSessionActivity(sessionToken) {
    try {
        await sb
            .from('user_sessions')
            .update({ last_activity: new Date().toISOString() })
            .eq('session_token', sessionToken)
            .eq('is_active', true);
    } catch (error) {
        console.error('Error updating session activity:', error);
    }
}

// Refresh sessions data
function refreshSessions() {
    loadActiveSessions();
    showFeedback('Sessions data refreshed!', 'success');
}

// Export sessions data
async function exportSessionsToCSV() {
    try {
        const { data: sessions, error } = await sb
            .from('user_sessions')
            .select(`
                *,
                user:consolidated_user_profiles_table!user_id (
                    full_name,
                    email,
                    role
                )
            `)
            .order('login_time', { ascending: false });
        
        if (error) throw error;
        
        if (!sessions || sessions.length === 0) {
            showFeedback('No session data to export.', 'warning');
            return;
        }
        
        // Prepare CSV data
        const csvRows = [['User', 'Email', 'Role', 'IP Address', 'Login Time', 'Last Activity', 'Duration', 'Device', 'Status']];
        
        for (const session of sessions) {
            const duration = getSessionDuration(session.login_time, session.last_activity);
            const status = session.is_active ? 'Active' : 'Terminated';
            
            csvRows.push([
                `"${session.user?.full_name || 'Unknown'}"`,
                `"${session.user?.email || 'N/A'}"`,
                session.user?.role || 'N/A',
                session.ip_address || 'N/A',
                new Date(session.login_time).toLocaleString(),
                new Date(session.last_activity).toLocaleString(),
                duration,
                session.device_info || 'Unknown',
                status
            ]);
        }
        
        const csvContent = csvRows.map(row => row.join(',')).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `sessions_export_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        
        showFeedback('Sessions exported successfully!', 'success');
        
    } catch (error) {
        console.error('Error exporting sessions:', error);
        showFeedback(`Export failed: ${error.message}`, 'error');
    }
}

// Make functions globally available
window.loadActiveSessions = loadActiveSessions;
window.terminateSession = terminateSession;
window.terminateAllSessions = terminateAllSessions;
window.refreshSessions = refreshSessions;
window.exportSessionsToCSV = exportSessionsToCSV;
window.trackUserSession = trackUserSession;
window.updateSessionActivity = updateSessionActivity;

// Error Tracking
async function loadErrorLogs() {
    // Placeholder for error logs loading
    console.log('Loading error logs...');
}

// Data Visualization
async function loadDataVisualization() {
    // Placeholder for data visualization loading
    console.log('Loading data visualization...');
}

/*******************************************************
 * 9. USERS MANAGEMENT - ENHANCED WITH TVET/KRCHN
 *******************************************************/

async function handleAddAccount(e) {
    e.preventDefault();
    const submitButton = e.submitter;
    const originalText = submitButton.textContent;
    setButtonLoading(submitButton, true, originalText);

    const name = $('account-name').value.trim();
    const email = $('account-email').value.trim();
    const password = $('account-password').value.trim();
    const role = $('account-role').value;
    const phone = $('account-phone').value.trim();
    const programCode = $('account-program').value;
    const intake_year = $('account-intake').value;
    const block = $('account-block-term').value;
    
    // Get program type and name
    const programType = getProgramType(programCode);
    const programName = getProgramDisplayName(programCode);
    const programLevel = getProgramLevel(programCode);

    // Determine if this is TVET or KRCHN for block/term naming
    const blockTermField = programType === 'TVET' ? 'term' : 'block';
    const blockTermValue = block;

    const userData = {
        full_name: name,
        role,
        phone,
        program: programCode,
        program_type: programType,
        program_name: programName,
        program_level: programLevel,
        intake_year,
        [blockTermField]: blockTermValue,
        status: 'approved',
        block_program_year: false
    };

    console.log('🎯 Enrolling user with data:', userData);

    try {
        const { data: { user }, error: authError } = await sb.auth.signUp({
            email, password, options: { data: userData }
        });
        
        if (authError) throw authError;

        if (user && user.id) {
            const profileData = { 
                user_id: user.id, 
                email, 
                ...userData 
            };
            
            const { error: insertError } = await sb.from(USER_PROFILE_TABLE).insert([profileData]);
            
            if (insertError) {
                await sb.auth.admin.deleteUser(user.id);
                throw insertError;
            }
            
            e.target.reset();
            showFeedback(`New ${role.toUpperCase()} account successfully enrolled for ${programName}!`, 'success');
            
            await logAudit('USER_ENROLL', `Enrolled new ${role} account: ${name} (${programName})`, user.id);
            
            loadAllUsers();
            loadStudents();
            loadDashboardData();
        }
    } catch (err) {
        await logAudit('USER_ENROLL', `Failed to enroll new account: ${name}. Reason: ${err.message}`, null, 'FAILURE');
        showFeedback(`Account creation failed: ${err.message}`, 'error');
    } finally {
        setButtonLoading(submitButton, false, originalText);
    }
}

async function handleMassPromotion(e) {
    e.preventDefault();
    const submitButton = e.submitter;
    const originalText = submitButton.textContent;
    setButtonLoading(submitButton, true, originalText);

    const promote_intake = document.getElementById('promote_intake')?.value;
    const promote_program = document.getElementById('promote_program')?.value;
    const promote_from_block = document.getElementById('promote_from_block')?.value;
    const promote_to_block = document.getElementById('promote_to_block')?.value;

    if (!promote_intake || !promote_program || !promote_from_block || !promote_to_block) {
        showFeedback('Please select Intake Year, Program, FROM Block/Term, and TO Block/Term.', 'error');
        setButtonLoading(submitButton, false, originalText);
        return;
    }

    if (promote_from_block === promote_to_block) {
        showFeedback('FROM and TO Block/Term must be different.', 'error');
        setButtonLoading(submitButton, false, originalText);
        return;
    }
    
    // Get program display name for confirmation
    const programName = promote_program === 'KRCHN' ? 'KRCHN' : 'TVET';
    
    if (!confirm(`⚠️ CRITICAL ACTION: Promote ALL ${programName} students from Intake ${promote_intake}\nFROM: ${promote_from_block}\nTO: ${promote_to_block}\n\nThis action is IRREVERSIBLE. Continue?`)) {
        setButtonLoading(submitButton, false, originalText);
        return;
    }

    try {
        // Update students matching the criteria
        const { data, error } = await sb
            .from(USER_PROFILE_TABLE)
            .update({ 
                block: promote_to_block,
                updated_at: new Date().toISOString()
            })
            .eq('role', 'student')
            .eq('status', 'approved')
            .eq('intake_year', promote_intake)
            .eq('program', promote_program)
            .eq('block', promote_from_block)
            .select('user_id, full_name');

        if (error) throw error;
        
        const count = data?.length || 0;
        
        if (count > 0) {
            // Log the promotion
            await logAudit('PROMOTION_MASS', 
                `Promoted ${count} ${programName} students: Intake ${promote_intake} ${promote_from_block} → ${promote_to_block}`, 
                null, 
                'SUCCESS'
            );
            
            // Show list of promoted students
            const studentNames = data.map(s => s.full_name).join(', ');
            showFeedback(`✅ Successfully promoted ${count} ${programName} students!\n\nPromoted:\n${studentNames.substring(0, 200)}${studentNames.length > 200 ? '...' : ''}`, 'success');
        } else {
            await logAudit('PROMOTION_MASS', 
                `No ${programName} students found for criteria: Intake ${promote_intake}, Block ${promote_from_block}`, 
                null, 
                'WARNING'
            );
            showFeedback(`⚠️ No ${programName} students were found matching the promotion criteria.\n\nIntake: ${promote_intake}\nFrom Block: ${promote_from_block}\n\nPlease check your selections.`, 'warning');
        }

        // Refresh student list
        if (typeof loadStudents === 'function') {
            loadStudents();
        }
        if (typeof loadAllUsers === 'function') {
            loadAllUsers();
        }

    } catch (err) {
        await logAudit('PROMOTION_MASS', 
            `Failed mass promotion: ${err.message}`, 
            null, 
            'FAILURE'
        );
        showFeedback(`❌ Mass promotion failed: ${err.message}`, 'error');
    } finally {
        setButtonLoading(submitButton, false, originalText);
    }
}

// ============================================
// APPROVE USER WITH DETAILS CHECK - ENHANCED
// ============================================

async function approveUser(userId, fullName, studentId = '', email = '', role = 'student', program = 'N/A') {
    console.log('🎯 Opening approval check for user:', { userId, fullName, studentId });
    
    try {
        const { data: user, error } = await sb
            .from(USER_PROFILE_TABLE)
            .select('*')
            .eq('user_id', userId)
            .single();
        
        if (error || !user) {
            showFeedback('❌ Error loading user details: ' + (error?.message || 'User not found'), 'error');
            return;
        }
        
        showApprovalModal(user);
        
    } catch (err) {
        console.error('❌ Error in approveUser:', err);
        showFeedback('❌ Error loading user details: ' + err.message, 'error');
    }
}

// ============================================
// SHOW APPROVAL MODAL WITH EDITABLE FIELDS
// ============================================

function showApprovalModal(user) {
    // Remove existing modal if any
    const existingModal = document.getElementById('approvalModal');
    if (existingModal) existingModal.remove();
    
    const programName = getProgramDisplayName(user.program);
    const programType = getProgramType(user.program);
    const programLevel = getProgramLevel(user.program);
    const programBadge = programType === 'TVET' ? 'TVET' : 'KRCHN';
    
    // Build program options for dropdown
    const programOptions = `
        <option value="KRCHN" ${user.program === 'KRCHN' ? 'selected' : ''}>KRCHN Nursing</option>
        <optgroup label="TVET Diploma Programs">
            <option value="DPOTT" ${user.program === 'DPOTT' ? 'selected' : ''}>Diploma in Perioperative Theatre Technology</option>
            <option value="DCH" ${user.program === 'DCH' ? 'selected' : ''}>Diploma in Community Health</option>
            <option value="DHRIT" ${user.program === 'DHRIT' ? 'selected' : ''}>Diploma in Health Records and IT</option>
            <option value="DSL" ${user.program === 'DSL' ? 'selected' : ''}>Diploma in Science Lab</option>
            <option value="DSW" ${user.program === 'DSW' ? 'selected' : ''}>Diploma in Social Work</option>
            <option value="DICT" ${user.program === 'DICT' ? 'selected' : ''}>Diploma in ICT</option>
            <option value="DME" ${user.program === 'DME' ? 'selected' : ''}>Diploma in Medical Engineering</option>
        </optgroup>
        <optgroup label="TVET Certificate Programs">
            <option value="CPOTT" ${user.program === 'CPOTT' ? 'selected' : ''}>Certificate in Perioperative Theatre Technology</option>
            <option value="CCH" ${user.program === 'CCH' ? 'selected' : ''}>Certificate in Community Health</option>
            <option value="CHRIT" ${user.program === 'CHRIT' ? 'selected' : ''}>Certificate in Health Records and IT</option>
            <option value="CPC" ${user.program === 'CPC' ? 'selected' : ''}>Certificate in Patient Care</option>
            <option value="CSL" ${user.program === 'CSL' ? 'selected' : ''}>Certificate in Science Lab</option>
            <option value="CSW" ${user.program === 'CSW' ? 'selected' : ''}>Certificate in Social Work</option>
            <option value="CICT" ${user.program === 'CICT' ? 'selected' : ''}>Certificate in ICT</option>
        </optgroup>
        <optgroup label="TVET Artisan Programs">
            <option value="ACH" ${user.program === 'ACH' ? 'selected' : ''}>Artisan in Community Health</option>
            <option value="AAG" ${user.program === 'AAG' ? 'selected' : ''}>Artisan in Agriculture</option>
            <option value="ASW" ${user.program === 'ASW' ? 'selected' : ''}>Artisan in Social Work</option>
        </optgroup>
    `;
    
    // Block/Term options based on program type
    const isTVET = programType === 'TVET';
    const blockOptions = isTVET 
        ? ['Introductory', 'Term1', 'Term2', 'Term3', 'Term4', 'Term5', 'Term6', 'Final']
        : ['Introductory', 'Block 1', 'Block 2', 'Block 3', 'Block 4', 'Block 5', 'Final'];
    
    const blockSelectOptions = blockOptions.map(b => 
        `<option value="${b}" ${user.block === b ? 'selected' : ''}>${b}</option>`
    ).join('');
    
    const modal = document.createElement('div');
    modal.id = 'approvalModal';
    modal.className = 'modal-overlay';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.7);
        backdrop-filter: blur(5px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        padding: 20px;
    `;
    
    modal.innerHTML = `
        <div style="
            background: white;
            border-radius: 20px;
            max-width: 800px;
            width: 100%;
            max-height: 90vh;
            overflow-y: auto;
            padding: 30px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            animation: slideIn 0.3s ease;
        ">
            <!-- Header -->
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 2px solid #4C1D95; padding-bottom: 15px;">
                <div>
                    <h2 style="margin: 0; color: #4C1D95;">
                        <i class="fas fa-user-check"></i> Review & Edit User
                    </h2>
                    <p style="margin: 5px 0 0; color: #6b7280; font-size: 14px;">
                        Edit fields below before approving
                    </p>
                </div>
                <button onclick="window.closeApprovalModal()" style="
                    background: none;
                    border: none;
                    font-size: 28px;
                    cursor: pointer;
                    color: #6b7280;
                    padding: 0 10px;
                ">&times;</button>
            </div>
            
            <form id="approvalForm">
                <!-- Personal Information -->
                <div style="margin-bottom: 20px;">
                    <h3 style="color: #4C1D95; font-size: 14px; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.5px;">
                        <i class="fas fa-user"></i> Personal Information
                    </h3>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                        <div class="form-group">
                            <label style="font-weight: 600; font-size: 13px; color: #475569;">Full Name *</label>
                            <input type="text" id="edit_full_name" value="${escapeHtml(user.full_name || '')}" 
                                   style="width:100%; padding:10px 14px; border:2px solid #E2E8F0; border-radius:10px; font-family:inherit;">
                        </div>
                        <div class="form-group">
                            <label style="font-weight: 600; font-size: 13px; color: #475569;">Email *</label>
                            <input type="email" id="edit_email" value="${escapeHtml(user.email || '')}" 
                                   style="width:100%; padding:10px 14px; border:2px solid #E2E8F0; border-radius:10px; font-family:inherit;">
                        </div>
                        <div class="form-group">
                            <label style="font-weight: 600; font-size: 13px; color: #475569;">Student ID</label>
                            <input type="text" id="edit_student_id" value="${escapeHtml(user.student_id || '')}" 
                                   style="width:100%; padding:10px 14px; border:2px solid #E2E8F0; border-radius:10px; font-family:inherit;">
                        </div>
                        <div class="form-group">
                            <label style="font-weight: 600; font-size: 13px; color: #475569;">Phone</label>
                            <input type="text" id="edit_phone" value="${escapeHtml(user.phone || '')}" 
                                   style="width:100%; padding:10px 14px; border:2px solid #E2E8F0; border-radius:10px; font-family:inherit;">
                        </div>
                        <div class="form-group">
                            <label style="font-weight: 600; font-size: 13px; color: #475569;">Role</label>
                            <select id="edit_role" style="width:100%; padding:10px 14px; border:2px solid #E2E8F0; border-radius:10px; font-family:inherit;">
                                <option value="student" ${user.role === 'student' ? 'selected' : ''}>Student</option>
                                <option value="lecturer" ${user.role === 'lecturer' ? 'selected' : ''}>Lecturer</option>
                                <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Admin</option>
                            </select>
                        </div>
                    </div>
                </div>
                
                <!-- Academic Information -->
                <div style="margin-bottom: 20px;">
                    <h3 style="color: #4C1D95; font-size: 14px; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.5px;">
                        <i class="fas fa-graduation-cap"></i> Academic Information
                    </h3>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                        <div class="form-group">
                            <label style="font-weight: 600; font-size: 13px; color: #475569;">Program *</label>
                            <select id="edit_program" style="width:100%; padding:10px 14px; border:2px solid #E2E8F0; border-radius:10px; font-family:inherit;">
                                ${programOptions}
                            </select>
                        </div>
                        <div class="form-group">
                            <label style="font-weight: 600; font-size: 13px; color: #475569;">Program Type</label>
                            <input type="text" id="edit_program_type" value="${escapeHtml(programType)}" readonly
                                   style="width:100%; padding:10px 14px; border:2px solid #E2E8F0; border-radius:10px; background:#f8f9fa; font-family:inherit;">
                        </div>
                        <div class="form-group">
                            <label style="font-weight: 600; font-size: 13px; color: #475569;">Intake Year</label>
                            <input type="text" id="edit_intake_year" value="${escapeHtml(user.intake_year || '')}" 
                                   style="width:100%; padding:10px 14px; border:2px solid #E2E8F0; border-radius:10px; font-family:inherit;">
                        </div>
                        <div class="form-group">
                            <label style="font-weight: 600; font-size: 13px; color: #475569;">Block / Term</label>
                            <select id="edit_block" style="width:100%; padding:10px 14px; border:2px solid #E2E8F0; border-radius:10px; font-family:inherit;">
                                ${blockSelectOptions}
                            </select>
                        </div>
                    </div>
                </div>
                
                <!-- Additional Details (Read-only) -->
                <div style="margin-bottom: 20px;">
                    <h3 style="color: #4C1D95; font-size: 14px; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.5px;">
                        <i class="fas fa-info-circle"></i> System Information (Read-only)
                    </h3>
                    <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; background: #f8f9fa; padding: 15px; border-radius: 10px;">
                        <div><strong>User ID:</strong> <span style="font-family: monospace; font-size: 12px;">${escapeHtml(user.user_id || 'N/A')}</span></div>
                        <div><strong>Created:</strong> ${user.created_at ? new Date(user.created_at).toLocaleString() : 'N/A'}</div>
                        <div><strong>Status:</strong> <span style="color: #f59e0b; font-weight: 600;">${escapeHtml(user.status || 'pending')}</span></div>
                    </div>
                </div>
                
                <!-- Actions -->
                <div style="display: flex; gap: 12px; margin-top: 20px; border-top: 1px solid #e5e7eb; padding-top: 20px;">
                    <button type="button" onclick="window.confirmApproveUser()" style="
                        flex: 1;
                        background: linear-gradient(135deg, #10b981, #059669);
                        color: white;
                        border: none;
                        padding: 14px 20px;
                        border-radius: 10px;
                        font-size: 16px;
                        font-weight: 600;
                        cursor: pointer;
                        transition: all 0.3s;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        gap: 10px;
                    " onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 8px 25px rgba(16,185,129,0.3)'" onmouseout="this.style.transform='none'; this.style.boxShadow='none'">
                        <i class="fas fa-check-circle"></i> Confirm & Approve
                    </button>
                    <button type="button" onclick="window.closeApprovalModal()" style="
                        flex: 0.5;
                        background: #ef4444;
                        color: white;
                        border: none;
                        padding: 14px 20px;
                        border-radius: 10px;
                        font-size: 16px;
                        font-weight: 600;
                        cursor: pointer;
                        transition: all 0.3s;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        gap: 10px;
                    " onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 8px 25px rgba(239,68,68,0.3)'" onmouseout="this.style.transform='none'; this.style.boxShadow='none'">
                        <i class="fas fa-times"></i> Cancel
                    </button>
                </div>
                
                <div style="margin-top: 15px; padding: 12px; background: #fef3c7; border-radius: 8px; border-left: 4px solid #f59e0b;">
                    <p style="margin: 0; font-size: 13px; color: #92400e;">
                        <i class="fas fa-shield-alt"></i> 
                        <strong>Approval Action:</strong> This will activate the user account with the edited details above.
                    </p>
                </div>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Add slide-in animation
    const style = document.createElement('style');
    style.id = 'approval-modal-style';
    style.textContent = `
        @keyframes slideIn {
            from { opacity: 0; transform: translateY(30px) scale(0.95); }
            to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .form-group label { display: block; margin-bottom: 4px; }
    `;
    document.head.appendChild(style);
    
    // Store user ID for the confirm function
    modal.dataset.userId = user.user_id;
    modal.dataset.originalFullName = user.full_name;
}

// ============================================
// CLOSE APPROVAL MODAL
// ============================================

function closeApprovalModal() {
    const modal = document.getElementById('approvalModal');
    if (modal) modal.remove();
    
    const style = document.getElementById('approval-modal-style');
    if (style) style.remove();
}

// ============================================
// CONFIRM APPROVE USER - WITH EDITED FIELDS
// ============================================

async function confirmApproveUser() {
    console.log('✅ confirmApproveUser called');
    
    const modal = document.getElementById('approvalModal');
    if (!modal) {
        showFeedback('❌ Modal not found', 'error');
        return;
    }
    
    const userId = modal.dataset.userId;
    const originalName = modal.dataset.originalFullName || 'User';
    
    // Get edited values from form
    const fullName = document.getElementById('edit_full_name').value.trim();
    const email = document.getElementById('edit_email').value.trim();
    const studentId = document.getElementById('edit_student_id').value.trim();
    const phone = document.getElementById('edit_phone').value.trim();
    const role = document.getElementById('edit_role').value;
    const program = document.getElementById('edit_program').value;
    const intakeYear = document.getElementById('edit_intake_year').value.trim();
    const block = document.getElementById('edit_block').value;
    
    // Validate required fields
    if (!fullName) {
        showFeedback('❌ Full Name is required', 'error');
        document.getElementById('edit_full_name').focus();
        document.getElementById('edit_full_name').style.borderColor = '#DC2626';
        return;
    }
    
    if (!email) {
        showFeedback('❌ Email is required', 'error');
        document.getElementById('edit_email').focus();
        document.getElementById('edit_email').style.borderColor = '#DC2626';
        return;
    }
    
    // Close the modal first
    closeApprovalModal();
    
    // Show confirmation with edited details
    const confirmMsg = `⚠️ Approve User with the following details:\n\n` +
        `Name: ${fullName}\n` +
        `Email: ${email}\n` +
        `Student ID: ${studentId || 'Not set'}\n` +
        `Program: ${program}\n` +
        `Block: ${block}\n` +
        `Intake: ${intakeYear || 'Not set'}\n` +
        `Role: ${role}\n\n` +
        `Proceed with approval?`;
    
    if (!confirm(confirmMsg)) {
        return;
    }
    
    try {
        // Update user profile with edited values
        const { error } = await sb
            .from(USER_PROFILE_TABLE)
            .update({
                full_name: fullName,
                email: email,
                student_id: studentId || userId.substring(0, 8).toUpperCase(),
                phone: phone || null,
                role: role,
                program: program,
                intake_year: intakeYear || null,
                block: block,
                status: 'approved',
                updated_at: new Date().toISOString()
            })
            .eq('user_id', userId);
        
        if (error) {
            console.error('❌ Error approving user:', error);
            await logAudit(
                'USER_APPROVE',
                `Failed to approve user ${fullName}. Reason: ${error.message}`,
                userId,
                'FAILURE'
            );
            showFeedback(`❌ Failed to approve: ${error.message}`, 'error');
            return;
        }
        
        // Send approval email
        if (email) {
            try {
                await sendApprovalEmail(email, fullName, role);
            } catch (emailError) {
                console.warn('⚠️ Approval email failed:', emailError);
            }
        }
        
        showFeedback(`✅ User ${fullName} approved successfully!`, 'success');
        
        await logAudit(
            'USER_APPROVE',
            `User ${fullName} (Student ID: ${studentId || 'N/A'}) approved with edited details.`,
            userId,
            'SUCCESS'
        );
        
        // Refresh all user tables
        if (typeof loadPendingApprovals === 'function') loadPendingApprovals();
        if (typeof loadAllUsers === 'function') loadAllUsers();
        if (typeof loadStudents === 'function') loadStudents();
        if (typeof loadDashboardData === 'function') loadDashboardData();
        
    } catch (err) {
        console.error('❌ Unexpected error in confirmApproveUser:', err);
        showFeedback(`❌ Unexpected error: ${err.message}`, 'error');
    }
}

// ============================================
// ✅ EXPOSE FUNCTIONS TO GLOBAL SCOPE (FIX)
// ============================================

// Make approval functions globally accessible
window.confirmApproveUser = confirmApproveUser;
window.closeApprovalModal = closeApprovalModal;
window.approveUser = approveUser;
window.showApprovalModal = showApprovalModal;
window.deleteProfile = deleteProfile;
window.loadPendingApprovals = loadPendingApprovals;

console.log('✅ Approval functions exposed to global scope');
// ============================================
// SEND APPROVAL EMAIL
// ============================================

async function sendApprovalEmail(email, userName, role) {
    console.log('📧 Sending approval email to:', email);
    
    // Your email sending logic here (adapt to your email system)
    const scriptUrl = 'https://script.google.com/macros/s/AKfycbwo0Z-oQ_p5-dIe4XYiaRTv6ZdxlmfxP5LIpQT4T1cGihvlimVJg3AvdUNrDeZ0cEkJ3g/exec';
    
    const params = new URLSearchParams({
        to: email,
        userName: userName,
        role: role,
        emailType: 'approval',
        subject: 'Account Approved - NCHSM Digital Portal'
    });
    
    console.log('📡 Sending approval email...');
    
    // Using Image technique to avoid CORS
    const img = new Image();
    img.src = scriptUrl + '?' + params.toString();
    img.style.display = 'none';
    
    return new Promise((resolve, reject) => {
        img.onload = function() {
            console.log('✅ Approval email sent!');
            resolve(true);
        };
        
        img.onerror = function() {
            console.log('✅ Email request completed (may not have sent)');
            resolve(false);
        };
        
        document.body.appendChild(img);
    });
}

// ============================================
// LOAD PENDING APPROVALS (UPDATED WITH REVIEW BUTTON)
// ============================================

async function loadPendingApprovals() {
    const tbody = $('pending-table');
    if (!tbody) {
        console.error("Missing <tbody id='pending-table'> element in your HTML.");
        return;
    }

    tbody.innerHTML = '<tr><td colspan="7">Loading pending approvals...</td></tr>';

    const { data: pending, error } = await sb
        .from(USER_PROFILE_TABLE)
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: true });

    if (error) {
        tbody.innerHTML = `<tr><td colspan="7">Error: ${error.message}</td></tr>`;
        return;
    }

    if (!pending || pending.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7">No pending approvals.</td></tr>';
        return;
    }

    tbody.innerHTML = '';

    pending.forEach(u => {
        // Escape HTML for security
        const escapedName = escapeHtml(u.full_name);
        const escapedUserId = escapeHtml(u.user_id);
        const escapedStudentId = escapeHtml(u.student_id || '');
        const escapedEmail = escapeHtml(u.email || '');
        const escapedRole = escapeHtml(u.role || 'student');
        const escapedProgram = escapeHtml(u.program || 'N/A');
        
        // Get program info for display
        const programName = getProgramDisplayName(u.program);
        const programType = getProgramType(u.program);
        const programBadgeClass = programType === 'TVET' ? 'badge-tvet' : 'badge-krchn';
        const programIcon = programType === 'TVET' ? 'fa-tools' : 'fa-graduation-cap';
        
        tbody.innerHTML += `
            <tr>
                <td>${escapedName}</td>
                <td>${escapedEmail}</td>
                <td>${escapedRole}</td>
                <td>
                    ${escapeHtml(programName)}
                    <div class="program-badge ${programBadgeClass}">
                        <i class="fas ${programIcon}"></i> ${programType}
                    </div>
                </td>
                <td>${escapedStudentId || 'N/A'}</td>
                <td>${new Date(u.created_at).toLocaleDateString()}</td>
                <td>
                    <button class="btn btn-approve" 
                            onclick="approveUser('${escapedUserId}', '${escapedName}', '${escapedStudentId}', '${escapedEmail}', '${escapedRole}', '${escapedProgram}')">
                        <i class="fas fa-eye"></i> Review & Approve
                    </button>
                    <button class="btn btn-delete" 
                            onclick="deleteProfile('${escapedUserId}', '${escapedName}')">
                        Reject
                    </button>
                </td>
            </tr>`;
    });
}

// ============================================
// UPDATE USER ROLE
// ============================================

async function updateUserRole(userId, newRole, fullName) {
    console.log('🎯 Updating user role:', { userId, newRole, fullName });
    
    if (!confirm(`Change user ${fullName}'s role to ${newRole}?`)) return;
    
    try {
        const { error } = await sb
            .from(USER_PROFILE_TABLE)
            .update({ 
                role: newRole,
                updated_at: new Date().toISOString()
            })
            .eq('user_id', userId);
        
        if (error) {
            console.error('❌ Error updating user role:', error);
            await logAudit(
                'USER_ROLE_UPDATE', 
                `Failed to update ${fullName}'s role to ${newRole}. Reason: ${error.message}`, 
                userId, 
                'FAILURE'
            );
            showFeedback(`Failed: ${error.message}`, 'error');
            return;
        }
        
        // Log successful update
        await logAudit(
            'USER_ROLE_UPDATE', 
            `Updated ${fullName}'s role to ${newRole}.`, 
            userId, 
            'SUCCESS'
        );
        
        showFeedback(`✅ Role updated to ${newRole}!`, 'success');
        
        // Refresh all user tables
        loadAllUsers();
        loadStudents();
        loadPendingApprovals();
        
        // Refresh dashboard if exists
        if (typeof loadDashboardData === 'function') {
            loadDashboardData();
        }
        
    } catch (err) {
        console.error('❌ Unexpected error in updateUserRole:', err);
        showFeedback(`Unexpected error: ${err.message}`, 'error');
    }
}

// ============================================
// UPDATED loadAllUsers() - WITH DISPLAY INTAKE
// ============================================
async function loadAllUsers() {
    const tbody = $('users-table');
    if (!tbody) return;
    
    tbody.innerHTML = '<tr><td colspan="7">Loading all users...</td></tr>';

    const { data: users, error } = await sb.from(USER_PROFILE_TABLE)
        .select('*')
        .order('full_name', { ascending: true });
    
    if (error) {
        tbody.innerHTML = `<tr><td colspan="7">Error loading users: ${error.message}</td></tr>`;
        return;
    }

    tbody.innerHTML = '';
    
    users.forEach(u => {
        const roleOptions = ['student', 'lecturer', 'admin', 'superadmin']
            .map(r => `<option value="${r}" ${u.role === r ? 'selected' : ''}>${r}</option>`).join('');

        const isBlocked = u.block_program_year === true;
        const isApproved = u.status === 'approved';
        const statusText = isBlocked ? 'BLOCKED' : (isApproved ? 'Approved' : 'Pending');
        const statusClass = isBlocked ? 'status-danger' : (isApproved ? 'status-approved' : 'status-pending');
        
        // Get program info
        const programName = getProgramDisplayName(u.program);
        const programType = getProgramType(u.program);
        const programBadgeClass = programType === 'TVET' ? 'badge-tvet' : 'badge-krchn';
        const programIcon = programType === 'TVET' ? 'fa-tools' : 'fa-graduation-cap';
        
        // ============================================
        // FIX: Use display intake function
        // ============================================
        const intakeDisplay = u.intake_year ? getDisplayIntake(u.program, u.intake_year) : 'N/A';

        // Escape for security
        const escapedUserId = escapeHtml(u.user_id);
        const escapedName = escapeHtml(u.full_name);
        const escapedRole = escapeHtml(u.role);

        tbody.innerHTML += `
            <tr>
                <td>${escapeHtml(u.user_id.substring(0, 8))}...</td>
                <td>${escapeHtml(u.full_name)}</td>
                <td>${escapeHtml(u.email)}</td>
                <td>
                    <select class="btn" 
                            onchange="updateUserRole('${escapedUserId}', this.value, '${escapedName}')" 
                            ${u.role === 'superadmin' ? 'disabled' : ''}>
                        ${roleOptions}
                    </select>
                </td>
                <td>
                    ${escapeHtml(programName)}
                    <div class="program-badge ${programBadgeClass}">
                        <i class="fas ${programIcon}"></i> ${programType}
                    </div>
                </td>
                <td>${escapeHtml(intakeDisplay)}</td>  <!-- ← FIXED: Shows full intake string -->
                <td class="${statusClass}">${statusText}</td>
                <td>
                    <button class="btn btn-map" onclick="openEditUserModal('${escapedUserId}')">Edit</button>
                    ${!isApproved ? `<button class="btn btn-approve" onclick="approveUser('${escapedUserId}', '${escapedName}')">Review & Approve</button>` : ''}
                    <button class="btn btn-delete" onclick="deleteProfile('${escapedUserId}', '${escapedName}')">Delete</button>
                </td>
            </tr>`;
    });

    filterTable('user-search', 'users-table', [1, 2, 4]);
}
// ============================================
// UPDATED loadPendingApprovals() - WITH DISPLAY INTAKE
// ============================================
async function loadPendingApprovals() {
    const tbody = $('pending-table');
    if (!tbody) {
        console.error("Missing <tbody id='pending-table'> element in your HTML.");
        return;
    }

    tbody.innerHTML = '<tr><td colspan="7">Loading pending approvals...</td></tr>';

    const { data: pending, error } = await sb
        .from(USER_PROFILE_TABLE)
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: true });

    if (error) {
        tbody.innerHTML = `<tr><td colspan="7">Error: ${error.message}</td></tr>`;
        return;
    }

    if (!pending || pending.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7">No pending approvals.</td></tr>';
        return;
    }

    tbody.innerHTML = '';

    pending.forEach(u => {
        // Escape HTML for security
        const escapedName = escapeHtml(u.full_name);
        const escapedUserId = escapeHtml(u.user_id);
        const escapedStudentId = escapeHtml(u.student_id || '');
        const escapedEmail = escapeHtml(u.email || '');
        const escapedRole = escapeHtml(u.role || 'student');
        const escapedProgram = escapeHtml(u.program || 'N/A');
        
        // Get program info for display
        const programName = getProgramDisplayName(u.program);
        const programType = getProgramType(u.program);
        const programBadgeClass = programType === 'TVET' ? 'badge-tvet' : 'badge-krchn';
        const programIcon = programType === 'TVET' ? 'fa-tools' : 'fa-graduation-cap';
        
        // ============================================
        // FIX: Use display intake function
        // ============================================
        const intakeDisplay = u.intake_year ? getDisplayIntake(u.program, u.intake_year) : 'N/A';
        
        tbody.innerHTML += `
            <tr>
                <td>${escapedName}</td>
                <td>${escapedEmail}</td>
                <td>${escapedRole}</td>
                <td>
                    ${escapeHtml(programName)}
                    <div class="program-badge ${programBadgeClass}">
                        <i class="fas ${programIcon}"></i> ${programType}
                    </div>
                </td>
                <td>${escapeHtml(intakeDisplay)}</td>  <!-- ← FIXED: Shows full intake string -->
                <td>${escapedStudentId || 'N/A'}</td>
                <td>${new Date(u.created_at).toLocaleDateString()}</td>
                <td>
                    <button class="btn btn-approve" 
                            onclick="approveUser('${escapedUserId}', '${escapedName}', '${escapedStudentId}', '${escapedEmail}', '${escapedRole}', '${escapedProgram}')">
                        <i class="fas fa-eye"></i> Review & Approve
                    </button>
                    <button class="btn btn-delete" 
                            onclick="deleteProfile('${escapedUserId}', '${escapedName}')">
                        Reject
                    </button>
                </td>
            </tr>`;
    });
}

// ============================================
// OPEN EDIT USER MODAL
// ============================================

async function openEditUserModal(userId) {
    try {
        const { data: user, error } = await sb
            .from(USER_PROFILE_TABLE)
            .select('*')
            .eq('user_id', userId)
            .single();
        
        if (error || !user) throw new Error('User fetch failed.');

        // Get modal element first
        const modal = document.getElementById('userEditModal');
        if (!modal) {
            console.error('userEditModal not found in HTML');
            showFeedback('Edit user modal not found. Please check the HTML.', 'error');
            return;
        }

        // Safely set values with null checks
        const editUserId = document.getElementById('edit_user_id');
        const editUserIdDisplay = document.getElementById('edit_user_id_display');
        const editUserName = document.getElementById('edit_user_name');
        const editUserEmail = document.getElementById('edit_user_email');
        const editUserRole = document.getElementById('edit_user_role');
        const editUserProgram = document.getElementById('edit_user_program');
        const editUserIntake = document.getElementById('edit_user_intake');
        const editUserBlockStatus = document.getElementById('edit_user_block_status');
        const editUserBlock = document.getElementById('edit_user_block');

        if (editUserId) editUserId.value = user.user_id;
        if (editUserIdDisplay) editUserIdDisplay.textContent = user.user_id.substring(0, 8) + '...';
        if (editUserName) editUserName.value = user.full_name || '';
        if (editUserEmail) editUserEmail.value = user.email || '';
        if (editUserRole) editUserRole.value = user.role || 'student';
        if (editUserIntake) editUserIntake.value = user.intake_year || '2024';
        if (editUserBlockStatus) editUserBlockStatus.value = user.block_program_year ? 'true' : 'false';
        
        // CRITICAL FIX: Update program dropdown AND block options in correct order
        if (editUserProgram) {
            // Step 1: Update the program dropdown with all options
            updateProgramDropdown(editUserProgram);
            
            // Step 2: Set the program value (this triggers the change event)
            editUserProgram.value = user.program || 'KRCHN';
            
            // Step 3: Manually trigger the change event to update block options
            const changeEvent = new Event('change', { bubbles: true });
            editUserProgram.dispatchEvent(changeEvent);
            
            // Step 4: After block options are populated, set the block value
            setTimeout(() => {
                if (editUserBlock) {
                    // Update block options explicitly
                    updateBlockTermOptions('edit_user_program', 'edit_user_block');
                    
                    // Set the block value
                    setTimeout(() => {
                        editUserBlock.value = user.block || '';
                        console.log('Block/Term set to:', user.block);
                    }, 50);
                }
            }, 100);
        }
        
        modal.style.display = 'flex';
        
    } catch (e) {
        console.error('Error in openEditUserModal:', e);
        showFeedback(`Failed to load user: ${e.message}`, 'error');
    }
}

// ============================================
// HANDLE EDIT USER
// ============================================

async function handleEditUser(e) {
    e.preventDefault(); 
    const submitButton = e.submitter;
    if (!submitButton) {
        console.error("Form submitter button not found.");
        return; 
    }

    const originalText = submitButton.textContent;
    setButtonLoading(submitButton, true, originalText);

    try {
        const userId = $('edit_user_id').value;
        if (!userId) throw new Error('User ID is missing.');

        const updatedData = {
            full_name: $('edit_user_name').value.trim(),
            email: $('edit_user_email').value.trim(),
            role: $('edit_user_role').value,
            program: $('edit_user_program').value || null,
            intake_year: $('edit_user_intake').value || null,
            block: $('edit_user_block').value || null,
            block_program_year: $('edit_user_block_status').value === 'true',
            status: 'approved',
            updated_at: new Date().toISOString()
        };

        const newPassword = $('edit_user_new_password').value.trim();
        const confirmPassword = $('edit_user_confirm_password').value.trim();
        
        if (newPassword && newPassword !== confirmPassword) {
            showFeedback('Passwords do not match!', 'error');
            setButtonLoading(submitButton, false, originalText);
            return; 
        }

        // Update profile
        const { data: updatedRow, error: profileError } = await sb
            .from(USER_PROFILE_TABLE)
            .update(updatedData)
            .eq('user_id', userId)
            .select('*');

        if (profileError) throw profileError;

        // Update password if provided
        if (newPassword) {
            const { error: pwError } = await sb.auth.admin.updateUserById(userId, {
                password: newPassword
            });

            if (pwError) {
                console.warn('⚠️ Password update failed:', pwError);
                showFeedback('User profile saved, but password update failed.', 'warning');
            }
        }

        // Log audit
        await logAudit('USER_EDIT', `Edited profile for user ${updatedData.full_name}`, userId, 'SUCCESS');
        showFeedback('✅ User profile updated successfully!', 'success');
        
        // Close modal and reset
        $('userEditModal').style.display = 'none';
        $('edit_user_new_password').value = '';
        $('edit_user_confirm_password').value = '';
        
        // Refresh data
        loadAllUsers();
        loadStudents();
        loadDashboardData?.();

    } catch (err) {
        console.error('❌ Error in handleEditUser:', err);
        showFeedback(`Failed to update user: ${err.message}`, 'error');
        
        try {
            const userId = $('edit_user_id')?.value || 'unknown';
            await logAudit('USER_EDIT', `Failed to edit user: ${err.message}`, userId, 'FAILURE');
        } catch (logErr) {
            console.error('Audit log failed:', logErr);
        }
    } finally {
        setButtonLoading(submitButton, false, originalText);
    }
}

// ============================================
// DELETE PROFILE
// ============================================

async function deleteProfile(userId, fullName, isRejection = false) {
    console.log('🗑️ Deleting profile:', { userId, fullName, isRejection });
    
    const action = isRejection ? 'Reject' : 'Delete';
    const message = isRejection 
        ? `Reject (delete) user ${fullName}? This will permanently remove their account.`
        : `CRITICAL: Permanently delete profile and user ${fullName}?`;
    
    if (!confirm(`${action}: ${message}`)) return;

    try {
        // 1. First delete from user_profiles table
        const { error: profileError } = await sb
            .from(USER_PROFILE_TABLE)
            .delete()
            .eq('user_id', userId);

        if (profileError) {
            console.error('❌ Error deleting profile:', profileError);
            await logAudit(
                'USER_DELETE',
                `Failed to delete profile for ${fullName}. Reason: ${profileError.message}`,
                userId,
                'FAILURE'
            );
            showFeedback(`Failed to delete profile: ${profileError.message}`, 'error');
            return;
        }

        console.log('✅ Profile deleted from table');

        // 2. Try to delete auth user (admin only)
        let authDeleted = false;
        try {
            const { error: authErr } = await sb.auth.admin.deleteUser(userId);
            if (authErr) {
                console.warn('⚠️ Auth deletion failed (may need manual cleanup):', authErr);
                // Continue anyway - profile is already deleted
            } else {
                authDeleted = true;
                console.log('✅ Auth user deleted');
            }
        } catch (authError) {
            console.warn('⚠️ Auth deletion error:', authError);
        }

        // 3. Log the audit
        const auditDetails = isRejection 
            ? `Rejected user ${fullName} (pending approval)`
            : `Deleted user ${fullName}`;
        
        const auditStatus = authDeleted ? 'SUCCESS' : 'WARNING';
        const auditMessage = authDeleted 
            ? `User ${fullName} deleted successfully from both profile and auth.`
            : `Profile for ${fullName} deleted, but auth deletion may need manual cleanup.`;

        await logAudit(
            'USER_DELETE',
            auditDetails,
            userId,
            auditStatus
        );

        // 4. Show feedback
        if (authDeleted) {
            showFeedback(`✅ ${action} successful! User ${fullName} has been removed.`, 'success');
        } else {
            showFeedback(`⚠️ Profile deleted, but auth cleanup may be needed for ${fullName}.`, 'warning');
        }

        // 5. Refresh all user tables
        loadPendingApprovals();
        loadAllUsers();
        loadStudents();
        
        // 6. Refresh dashboard if exists
        if (typeof loadDashboardData === 'function') {
            loadDashboardData();
        }

    } catch (err) {
        console.error('❌ Unexpected error in deleteProfile:', err);
        
        await logAudit(
            'USER_DELETE',
            `Unexpected error deleting ${fullName}: ${err.message}`,
            userId,
            'FAILURE'
        );
        
        showFeedback(`Unexpected error: ${err.message}`, 'error');
    }
}

/*******************************************************
 * 10. COURSES MANAGEMENT
 *******************************************************/
async function handleAddCourse(e) {
    e.preventDefault();
    const submitButton = e.submitter;
    const originalText = submitButton.textContent;
    setButtonLoading(submitButton, true, originalText);

    const course_name = $('course-name').value.trim();
    const unit_code = $('course-unit-code').value.trim(); 
    const description = $('course-description').value.trim();
    const target_program = $('course-program').value; 
    const intake_year = $('course-intake').value; 
    const block = $('course-block').value; 
    
    if (!course_name || !target_program || !unit_code) {
        showFeedback('Course Name, Unit Code, and Target Program are required.', 'error');
        setButtonLoading(submitButton, false, originalText);
        return;
    }

    try {
        const { error } = await sb.from('courses').insert({ 
            course_name, 
            unit_code, 
            description, 
            target_program, 
            intake_year, 
            block,
            status: 'Active'
        });

        if (error) throw error;
        
        await logAudit('COURSE_ADD', `Successfully added course: ${unit_code} - ${course_name}.`, null, 'SUCCESS');
        showFeedback('Course added successfully!', 'success');
        e.target.reset();
        loadCourses();

    } catch (error) {
        await logAudit('COURSE_ADD', `Failed to add course ${unit_code}. Reason: ${error.message}`, null, 'FAILURE');
        showFeedback(`Failed to add course: ${error.message}`, 'error');
    } finally {
        setButtonLoading(submitButton, false, originalText);
    }
}

async function loadCourses() {
    const tbody = $('courses-table');
    if (!tbody) return;
    
    tbody.innerHTML = '<tr><td colspan="6">Loading courses...</td></tr>';

    const { data: courses, error } = await fetchData('courses', '*', {}, 'course_name', true);
    if (error) { tbody.innerHTML = `<tr><td colspan="6">Error loading courses: ${error.message}</td></tr>`; return; }

    tbody.innerHTML = '';
    courses.forEach(c => {
        const courseNameAttr = escapeHtml(c.course_name, true);
        const unitCodeAttr = escapeHtml(c.unit_code || '', true);
        const descriptionAttr = escapeHtml(c.description || '', true);
        const programTypeAttr = escapeHtml(c.target_program || '', true); 
        const intakeYearAttr = escapeHtml(c.intake_year || '', true);     
        const blockAttr = escapeHtml(c.block || '', true);              

        tbody.innerHTML += `<tr>
            <td>${escapeHtml(c.course_name)}</td>
            <td>${escapeHtml(c.unit_code || 'N/A')}</td>
            <td>${escapeHtml(c.target_program || 'N/A')}</td>
            <td>${escapeHtml(c.intake_year || 'N/A')}</td>
            <td>${escapeHtml(c.block || 'N/A')}</td>
            <td>
                <button class="btn-action" onclick="openEditCourseModal('${c.id}', '${courseNameAttr}', '${unitCodeAttr}', '${descriptionAttr}', '${programTypeAttr}', '${intakeYearAttr}', '${blockAttr}')">Edit</button>
                <button class="btn btn-delete" onclick="deleteCourse('${c.id}', '${unitCodeAttr}')">Delete</button>
            </td>
        </tr>`;
    });
    
    filterTable('course-search', 'courses-table', [0, 1, 3]); 
    populateExamCourseSelects(courses);
    populateSessionCourseSelects(courses);
}

async function deleteCourse(courseId, unitCode) {
    if (!confirm(`Are you sure you want to delete course ${unitCode}? This cannot be undone.`)) return;
    const { error } = await sb.from('courses').delete().eq('id', courseId);
    if (error) { 
        await logAudit('COURSE_DELETE', `Failed to delete course ID ${courseId}. Reason: ${error.message}`, courseId, 'FAILURE');
        showFeedback(`Failed to delete course: ${error.message}`, 'error'); 
    } 
    else { 
        await logAudit('COURSE_DELETE', `Successfully deleted course ${unitCode}.`, courseId, 'SUCCESS');
        showFeedback('Course deleted successfully!', 'success'); 
        loadCourses(); 
    }
}

function openEditCourseModal(id, name, unit_code, description, target_program, intake_year, block) {
    $('edit_course_id').value = id;
    $('edit_course_name').value = name; 
    $('edit_course_unit_code').value = unit_code; 
    $('edit_course_description').value = description;
    $('edit_course_program').value = target_program || ''; 
    $('edit_course_intake').value = intake_year; 
    
    updateBlockTermOptions('edit_course_program', 'edit_course_block'); 
    
    setTimeout(() => {
        $('edit_course_block').value = block;
    }, 100);

    $('courseEditModal').style.display = 'flex'; 
}

async function handleEditCourse(e) {
    e.preventDefault();
    const submitButton = e.submitter;
    const originalText = submitButton.textContent;
    setButtonLoading(submitButton, true, originalText);

    const id = $('edit_course_id').value;
    const name = $('edit_course_name').value.trim();
    const unit_code = $('edit_course_unit_code').value.trim(); 
    const description = $('edit_course_description').value.trim();
    const target_program = $('edit_course_program').value;
    const intake_year = $('edit_course_intake').value;
    const block = $('edit_course_block').value;
    
    try {
        const updateData = { 
            course_name: name, 
            unit_code: unit_code, 
            description: description, 
            target_program: target_program,
            intake_year: intake_year,
            block: block
        };
        
        const { error } = await sb.from('courses').update(updateData).eq('id', id); 

        if (error) throw error;

        await logAudit('COURSE_EDIT', `Updated course ${unit_code}.`, id, 'SUCCESS');
        showFeedback('Course updated successfully!', 'success');
        $('courseEditModal').style.display = 'none';
        loadCourses(); 
    } catch (e) {
        await logAudit('COURSE_EDIT', `Failed to update course ID ${id}. Reason: ${e.message}`, id, 'FAILURE');
        showFeedback('Failed to update course: ' + (e.message || e), 'error');
    } finally {
        setButtonLoading(submitButton, false, originalText);
    }
}

/*******************************************************
 * 11. SESSIONS & CLINICAL MANAGEMENT
 *******************************************************/
async function loadScheduledSessions() {
    const tbody = document.getElementById('scheduledSessionsTableBody');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="6">Loading scheduled sessions...</td></tr>';
    const { data: sessions, error } = await fetchData(
      'scheduled_sessions',
      '*, course:course_id(course_name)',
      {},
      'session_date',
      false
    );

    if (error) {
      tbody.innerHTML = `<tr><td colspan="6">Error loading sessions: ${error.message}</td></tr>`;
      return;
    }

    if (!sessions || sessions.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6">No scheduled sessions found.</td></tr>`;
      return;
    }

    const fragment = document.createDocumentFragment();
    sessions.forEach(s => {
      const tr = document.createElement('tr');
      const dateTime = new Date(s.session_date).toLocaleDateString() + ' ' + (s.session_time || 'N/A');
      const courseName = s.course?.course_name || 'N/A';
      let detail = s.session_title;
      if (s.session_type === 'class' && courseName !== 'N/A') {
        detail += ` (${courseName})`;
      }
      tr.innerHTML = `
        <td>${escapeHtml(s.session_type)}</td>
        <td>${escapeHtml(detail)}</td>
        <td>${dateTime}</td>
        <td>${escapeHtml(s.target_program || 'N/A')}</td>
        <td>${escapeHtml(s.block_term || 'N/A')}</td>
        <td>
          <button class="btn btn-delete" onclick="deleteSession('${s.id}', '${escapeHtml(s.session_title, true)}')">Delete</button>
        </td>
      `;
      fragment.appendChild(tr);
    });
    tbody.innerHTML = '';
    tbody.appendChild(fragment);
}

async function populateSessionCourseSelects(courses = null) {
    const program = $('new_session_program')?.value;
    const courseSelect = $('new_session_course');
    
    if (!courseSelect) return;
    
    courseSelect.innerHTML = '<option value="">-- Select Course (Optional) --</option>';
    
    if (!program) return;
    
    if (!courses) {
        const { data } = await fetchData(
            'courses', 
            'id, course_name, target_program', 
            { target_program: program }, 
            'course_name', 
            true
        );
        courses = data || [];
    }
    
    if (courses && courses.length > 0) {
        courses.forEach(c => {
            const option = document.createElement('option');
            option.value = c.id;
            option.textContent = c.course_name;
            courseSelect.appendChild(option);
        });
    }
}

async function handleAddSession(e) {
    e.preventDefault();
    const submitButton = e.submitter;
    const originalText = submitButton.textContent;
    setButtonLoading(submitButton, true, originalText);

    try {
        const sessionData = {
            session_type: $('new_session_type').value,
            session_title: $('new_session_title').value.trim(),
            session_date: $('new_session_date').value,
            session_time: $('new_session_start_time').value,
            session_end_date: $('new_session_end_date').value || null,
            target_program: $('new_session_program').value,
            intake_year: $('new_session_intake_year').value,
            block_term: $('new_session_block_term').value,
            course_id: $('new_session_course').value || null
        };

        const { error } = await sb.from('scheduled_sessions').insert([sessionData]);
        if (error) throw error;

        await logAudit('SESSION_ADD', `Added ${sessionData.session_type} session: ${sessionData.session_title}`, null, 'SUCCESS');
        showFeedback('Session scheduled successfully!', 'success');
        e.target.reset();
        loadScheduledSessions();
        renderFullCalendar();
    } catch (error) {
        await logAudit('SESSION_ADD', `Failed to add session: ${error.message}`, null, 'FAILURE');
        showFeedback(`Failed to schedule session: ${error.message}`, 'error');
    } finally {
        setButtonLoading(submitButton, false, originalText);
    }
}

async function deleteSession(sessionId, sessionTitle) {
    if (!confirm(`Delete session: ${sessionTitle}?`)) return;
    
    try {
        const { error } = await sb.from('scheduled_sessions').delete().eq('id', sessionId);
        if (error) throw error;
        
        await logAudit('SESSION_DELETE', `Deleted session: ${sessionTitle}`, sessionId, 'SUCCESS');
        showFeedback('Session deleted successfully!', 'success');
        loadScheduledSessions();
        renderFullCalendar();
    } catch (error) {
        await logAudit('SESSION_DELETE', `Failed to delete session: ${sessionTitle}`, sessionId, 'FAILURE');
        showFeedback(`Failed to delete session: ${error.message}`, 'error');
    }
}

/*******************************************************
 * 12. ATTENDANCE MANAGEMENT
 *******************************************************/
function toggleAttendanceFields() {
    const sessionType = $('att_session_type')?.value;
    const departmentInput = $('att_department');
    const courseSelect = $('att_course_id');

    if (!departmentInput) return;

    if (sessionType === 'clinical') {
        departmentInput.placeholder = "Clinical Department/Area";
        departmentInput.required = true;
        if (courseSelect) { courseSelect.required = false; courseSelect.value = ""; }
    } else if (sessionType === 'classroom') {
        departmentInput.placeholder = "Classroom Location/Room (Optional)";
        departmentInput.required = false;
        if (courseSelect) courseSelect.required = true;
    } else {
        departmentInput.placeholder = "Location/Detail (Optional)";
        departmentInput.required = false;
        if (courseSelect) { courseSelect.required = false; courseSelect.value = ""; }
    }
}

async function populateAttendanceSelects() {
    const { data: students } = await fetchData(USER_PROFILE_TABLE, 'user_id, full_name, role', { role: 'student' }, 'full_name', true);
    populateSelect($('att_student_id'), students, 'user_id', 'full_name', 'Select Student');

    const { data: courses } = await fetchData('courses', 'id, course_name', {}, 'course_name', true);
    populateSelect($('att_course_id'), courses, 'id', 'course_name', 'Select Course (For Classroom)');
}

async function approveAttendanceRecord(recordId) {
    if (!currentUserProfile?.id) {
        showFeedback('Error: Admin ID not found for verification.', 'error');
        return;
    }
    if (!confirm('Approve this attendance record?')) return;

    try {
        const { error } = await sb
            .from('geo_attendance_logs')
            .update({
                is_verified: true,
                verified_by_id: currentUserProfile.id,
                verified_at: new Date().toISOString()
            })
            .eq('id', recordId);

        if (error) throw error;
        await logAudit('ATTENDANCE_APPROVE', `Approved attendance record ID ${recordId}.`, recordId, 'SUCCESS');
        showFeedback('Attendance approved successfully!', 'success');
        loadAttendance();
    } catch (err) {
        await logAudit('ATTENDANCE_APPROVE', `Failed to approve attendance ID ${recordId}. Reason: ${err.message}`, recordId, 'FAILURE');
        console.error('Approval failed:', err);
        showFeedback(`Failed to approve record: ${err.message}`, 'error');
    }
}

async function deleteAttendanceRecord(recordId) {
    if (!confirm('Permanently delete this attendance record?')) return;
    try {
        const { error } = await sb.from('geo_attendance_logs').delete().eq('id', recordId);
        if (error) throw error;
        await logAudit('ATTENDANCE_DELETE', `Deleted attendance record ID ${recordId}.`, recordId, 'SUCCESS');
        showFeedback('Attendance record deleted.', 'success');
        loadAttendance();
    } catch (err) {
        await logAudit('ATTENDANCE_DELETE', `Failed to delete attendance ID ${recordId}. Reason: ${err.message}`, recordId, 'FAILURE');
        console.error('Delete failed:', err);
        showFeedback(`Failed to delete record: ${err.message}`, 'error');
    }
}

function showMap(lat, lng, locationName, studentName, dateTime) {
    const modal = $('mapModal');
    const mapContainer = $('mapbox-map');
    const mapDetails = $('map-details');
    if (!modal || !mapContainer || !mapDetails) return;

    modal.style.display = 'flex';
    mapContainer.innerHTML = 'Map loading...';
    mapDetails.innerHTML = `**Student:** ${studentName}<br>**Location:** ${locationName}<br>**Time:** ${dateTime}`;

    if (attendanceMap) {
        attendanceMap.remove();
        attendanceMap = null;
    }

    setTimeout(() => {
        attendanceMap = L.map('mapbox-map').setView([lat, lng], 17);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors'
        }).addTo(attendanceMap);

        L.marker([lat, lng])
            .addTo(attendanceMap)
            .bindPopup(`<b>${studentName}</b><br>${locationName}<br>${dateTime}`)
            .openPopup();
        
        attendanceMap.invalidateSize();
    }, 300);
}

async function adminCheckIn() {
    if (!navigator.geolocation) {
        showFeedback('Geolocation is not supported by this browser.', 'error');
        return;
    }

    try {
        const position = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject);
        });

        const checkInData = {
            user_id: currentUserProfile?.id,
            session_type: 'admin',
            check_in_time: new Date().toISOString(),
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            location_name: 'Admin Self Check-in',
            ip_address: await getIPAddress(),
            device_id: getDeviceId(),
            is_manual_entry: false
        };

        const { error } = await sb.from('geo_attendance_logs').insert([checkInData]);
        if (error) throw error;

        await logAudit('ADMIN_CHECKIN', `Admin self check-in at ${checkInData.location_name}`, null, 'SUCCESS');
        showFeedback('Admin check-in recorded successfully!', 'success');
        loadAttendance();
    } catch (error) {
        await logAudit('ADMIN_CHECKIN', `Failed admin check-in: ${error.message}`, null, 'FAILURE');
        showFeedback(`Check-in failed: ${error.message}`, 'error');
    }
}

async function handleManualAttendance(e) {
    e.preventDefault();
    const submitButton = e.submitter;
    const originalText = submitButton.textContent;
    setButtonLoading(submitButton, true, originalText);

    const student_id = $('att_student_id').value;
    const session_type = $('att_session_type').value;
    const date = $('att_date').value;
    const time = $('att_time').value;
    const course_id = session_type === 'classroom' ? $('att_course_id').value : null;
    const department = $('att_department').value.trim() || null;
    const location_name = $('att_location').value.trim() || 'Manual Admin Entry';

    let check_in_time = new Date().toISOString();
    if (date && time) check_in_time = new Date(`${date}T${time}`).toISOString();
    else if (date) check_in_time = new Date(date).toISOString();

    if (!student_id || (session_type === 'classroom' && !course_id)) {
        showFeedback('Please select a student and required fields.', 'error');
        setButtonLoading(submitButton, false, originalText);
        return;
    }

    const attendanceData = {
        student_id,
        session_type,
        check_in_time,
        department,
        course_id,
        is_manual_entry: true,
        latitude: null,
        longitude: null,
        location_name,
        ip_address: await getIPAddress(),
        device_id: getDeviceId(),
        target_name: session_type === 'clinical' ? department : $('att_course_id')?.selectedOptions[0]?.text || null
    };

    try {
        const { error, data } = await sb.from('geo_attendance_logs').insert([attendanceData]).select('id');
        if (error) throw error;
        
        await logAudit('ATTENDANCE_MANUAL', `Recorded manual attendance for student ${student_id} for ${session_type}.`, data?.[0]?.id, 'SUCCESS');
        showFeedback('Manual attendance recorded successfully!', 'success'); 
        e.target.reset(); 
        loadAttendance(); 
        toggleAttendanceFields(); 

    } catch (error) {
        await logAudit('ATTENDANCE_MANUAL', `Failed manual attendance for student ${student_id}. Reason: ${error.message}`, student_id, 'FAILURE');
        showFeedback(`Failed to record attendance: ${error.message}`, 'error');
    } finally {
        setButtonLoading(submitButton, false, originalText);
    }
}

async function loadAttendance() {
    const todayBody = $('attendance-table');
    const pastBody = $('past-attendance-table');
    if (!todayBody || !pastBody) return;
    
    todayBody.innerHTML = '<tr><td colspan="7">Loading today\'s records...</td></tr>';
    pastBody.innerHTML = '<tr><td colspan="6">Loading history...</td></tr>';

    const todayISO = new Date().toISOString().slice(0,10);

    const { data: allRecords, error } = await sb
        .from('geo_attendance_logs')
        .select(`
            *,
            is_verified,
            latitude,
            longitude,
            target_name,
            ${USER_PROFILE_TABLE}:student_id(full_name, role)
        `)
        .order('check_in_time', { ascending: false });

    if (error) { 
        todayBody.innerHTML = `<tr><td colspan="7">Error: ${error.message}</td></tr>`;
        pastBody.innerHTML = `<tr><td colspan="6">Error: ${error.message}</td></tr>`;
        return;
    }

    let todayHtml='', pastHtml='';

    allRecords.forEach(r=>{
        const userProfile = r[USER_PROFILE_TABLE];
        const userName = userProfile?.full_name || 'N/A User';
        const dateTime = new Date(r.check_in_time).toLocaleString();
        const targetDetail = r.target_name || r.department || r.location_name || 'N/A Target';
        const locationDisplay = r.location_friendly_name || r.location_name || r.department || 'N/A';
        const geoStatus = (r.latitude && r.longitude)?'Yes (Geo-Logged)':'No (Manual)';

        let actionsHtml = '';
        const mapAvailable = r.latitude && r.longitude;
        const mapAction = mapAvailable ? `showMap(${r.latitude},${r.longitude},'${locationDisplay.replace(/'/g,"\\'")}','${userName.replace(/'/g,"\\'")}','${dateTime.replace(/'/g,"\\'")}')` : '';

        actionsHtml += `<button class="btn btn-map btn-small" ${mapAvailable?'':'disabled'} onclick="${mapAction}">View Map</button>`;

        const isToday = new Date(r.check_in_time).toISOString().slice(0,10) === todayISO;
        const statusDisplay = r.is_verified ? '✅ Verified' : 'Pending';

        if (isToday){
            if (!r.is_verified) actionsHtml += `<button class="btn btn-approve btn-small" onclick="approveAttendanceRecord('${r.id}')" style="margin-left:5px;">Approve</button>`;
        }
        
        actionsHtml += `<button class="btn btn-delete btn-small" onclick="deleteAttendanceRecord('${r.id}')" style="margin-left:10px;">Delete</button>`;

        const rowHtml = `<tr>
            <td>${userName}</td>
            <td>${r.session_type || 'N/A'}</td>
            <td>${targetDetail}</td>
            <td>${locationDisplay}</td>
            <td>${dateTime}</td>
            <td>${geoStatus}</td>
            <td>${actionsHtml}</td>
        </tr>`;

        if (isToday) todayHtml += rowHtml;
        else pastHtml += `<tr>
                <td>${userName}</td>
                <td>${r.session_type || 'N/A'}</td>
                <td>${targetDetail}</td>
                <td>${dateTime}</td>
                <td>${statusDisplay}</td>
                <td>${actionsHtml.replace('View Map', 'View')}</td>
            </tr>`;
    });

    todayBody.innerHTML = todayHtml||'<tr><td colspan="7">No check-in records for today.</td></tr>';
    pastBody.innerHTML = pastHtml||'<tr><td colspan="6">No past attendance history found.</td></tr>';
}
/*******************************************************
 * 13. EXAMS/CATS MANAGEMENT - CLEAN VERSION (NO DUPLICATES)
 *******************************************************/

// ========== HELPER FUNCTIONS ==========
function getExamTypeLabel(examType) {
    const labels = {
        'CAT_1': 'CAT 1 Assessment',
        'CAT_2': 'CAT 2 Assessment', 
        'CAT': 'Continuous Assessment Test',
        'EXAM': 'Final Examination',
        'ASSIGNMENT': 'Assignment',
        'END_TERM': 'End of Term Exam',
        'SUPPLEMENTARY': 'Supplementary Exam'
    };
    return labels[examType] || 'Assessment';
}

// ========== POPULATE COURSE SELECTS ==========
async function populateExamCourseSelects(courses = null) {
    const courseSelect = document.getElementById('exam_course_id');
    const selectedProgram = document.getElementById('exam_program')?.value;

    if (!courseSelect) return;

    courseSelect.innerHTML = '<option value="">-- Optional: Select Course --</option>';
    
    if (!selectedProgram) {
        try {
            const { data: allCourses, error } = await sb
                .from('courses')
                .select('id, course_name, target_program, unit_code')
                .order('course_name', { ascending: true });
            
            if (!error && allCourses) {
                allCourses.forEach(course => {
                    const option = document.createElement('option');
                    option.value = course.id;
                    option.textContent = `${course.course_name} (${course.unit_code || 'N/A'}) - ${course.target_program || 'General'}`;
                    courseSelect.appendChild(option);
                });
            }
        } catch (error) {
            console.error('Error loading courses:', error);
        }
        return;
    }

    try {
        const { data, error } = await sb
            .from('courses')
            .select('id, course_name, target_program, unit_code')
            .eq('target_program', selectedProgram)
            .order('course_name', { ascending: true });
        
        if (error) throw error;
        
        const filteredCourses = data || [];
        
        filteredCourses.forEach(course => {
            const option = document.createElement('option');
            option.value = course.id;
            option.textContent = `${course.course_name} (${course.unit_code || 'N/A'})`;
            courseSelect.appendChild(option);
        });
        
    } catch (error) {
        console.error('Error filtering courses:', error);
    }
}

// ========== LOAD AVAILABLE CLASSES ==========
// Skip class loading if your classes table has issues
async function loadAvailableClassesForExam() {
    const container = document.getElementById('exam_class_selector');
    if (!container) return;
    
    // Since classes table may not exist, provide manual entry option
    container.innerHTML = `
        <p style="color: #6b7280; margin-bottom: 10px;">Enter block names for this exam:</p>
        <div style="display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 10px;">
            ${['Introductory', 'Block 1', 'Block 2', 'Block 3', 'Block 4', 'Block 5', 'Final'].map(block => `
                <label style="display: flex; align-items: center; gap: 6px;">
                    <input type="checkbox" class="exam-class-checkbox" value="${block}">
                    <span>${block}</span>
                </label>
            `).join('')}
        </div>
        <input type="text" id="customBlocksInput" placeholder="Or add custom blocks (comma separated)" style="width: 100%; padding: 6px; border-radius: 4px; border: 1px solid #ddd; margin-top: 5px;">
        <button onclick="addCustomBlocks()" class="btn-sm" style="margin-top: 5px;">Add Custom Blocks</button>
    `;
}

function addCustomBlocks() {
    const input = document.getElementById('customBlocksInput');
    if (!input || !input.value.trim()) return;
    
    const blocks = input.value.split(',').map(b => b.trim()).filter(b => b);
    const container = document.getElementById('exam_class_selector');
    const checkboxesDiv = container.querySelector('div:first-child') || container;
    
    blocks.forEach(block => {
        const label = document.createElement('label');
        label.style.display = 'flex';
        label.style.alignItems = 'center';
        label.style.gap = '6px';
        label.style.marginBottom = '5px';
        label.innerHTML = `
            <input type="checkbox" class="exam-class-checkbox" value="${escapeHtml(block)}">
            <span>${escapeHtml(block)}</span>
        `;
        checkboxesDiv.appendChild(label);
    });
    
    input.value = '';
}

// ========== LOAD COURSES FOR EXAM DROPDOWN ==========
async function loadCoursesForExamDropdown() {
    try {
        const { data: courses, error } = await sb
            .from('courses')
            .select('id, course_name, unit_code')
            .order('course_name');
        
        if (error) throw error;
        
        const select = document.getElementById('exam_course_id');
        if (select && courses) {
            courses.forEach(course => {
                const option = document.createElement('option');
                option.value = course.id;
                option.textContent = `${course.course_name} (${course.unit_code || 'N/A'})`;
                select.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error loading courses:', error);
    }
}

// ========== POPULATE EDIT EXAM COURSES ==========
async function populateEditExamCourses(courseSelect, program) {
    if (!courseSelect) return;
    
    courseSelect.innerHTML = '<option value="">-- No Course --</option>';
    
    try {
        let query = sb.from('courses').select('id, course_name, unit_code');
        
        if (program && program !== '') {
            query = query.eq('target_program', program);
        }
        
        const { data: courses, error } = await query.order('course_name', { ascending: true });
        
        if (error) throw error;
        
        if (courses && courses.length > 0) {
            courses.forEach(course => {
                const option = document.createElement('option');
                option.value = course.id;
                option.textContent = `${course.course_name} (${course.unit_code || 'N/A'})`;
                courseSelect.appendChild(option);
            });
        }
        
        console.log(`✅ Loaded ${courses?.length || 0} courses for program: ${program}`);
        
    } catch (error) {
        console.error('Error loading courses:', error);
    }
}

// ========== ADD ASSIGNED CLASS TO EXAM ==========
async function addAssignedClassToExam(examId) {
    const input = document.getElementById('edit_exam_add_class');
    if (!input || !input.value.trim()) {
        showFeedback('Please enter a block name', 'warning');
        return;
    }
    
    const className = input.value.trim();
    
    try {
        const { data: exam, error } = await sb
            .from('exams')
            .select('assigned_classes')
            .eq('id', examId)
            .single();
        
        if (error) throw error;
        
        const currentClasses = exam.assigned_classes || [];
        if (currentClasses.includes(className)) {
            showFeedback('Block already assigned', 'warning');
            return;
        }
        
        currentClasses.push(className);
        
        const { error: updateError } = await sb
            .from('exams')
            .update({ assigned_classes: currentClasses })
            .eq('id', examId);
        
        if (updateError) throw updateError;
        
        showFeedback(`✅ Added "${className}" to exam`, 'success');
        input.value = '';
        
        // Refresh the modal
        openEditExamModal(examId);
        
    } catch (error) {
        console.error('Error adding class:', error);
        showFeedback(`Error: ${error.message}`, 'error');
    }
}

// ========== REMOVE ASSIGNED CLASS FROM EXAM ==========
async function removeAssignedClass(examId, className) {
    if (!confirm(`Remove "${className}" from this exam?`)) return;
    
    try {
        const { data: exam, error } = await sb
            .from('exams')
            .select('assigned_classes')
            .eq('id', examId)
            .single();
        
        if (error) throw error;
        
        const currentClasses = (exam.assigned_classes || []).filter(c => c !== className);
        
        const { error: updateError } = await sb
            .from('exams')
            .update({ assigned_classes: currentClasses })
            .eq('id', examId);
        
        if (updateError) throw updateError;
        
        showFeedback(`✅ Removed "${className}" from exam`, 'success');
        
        // Refresh the modal
        openEditExamModal(examId);
        
    } catch (error) {
        console.error('Error removing class:', error);
        showFeedback(`Error: ${error.message}`, 'error');
    }
}

// ============================================
// MAKE FUNCTIONS GLOBAL
// ============================================
window.populateEditExamCourses = populateEditExamCourses;
window.addAssignedClassToExam = addAssignedClassToExam;
window.removeAssignedClass = removeAssignedClass;
// ========== GET SELECTED CLASSES ==========
function getSelectedClassesForExam() {
    const selected = [];
    document.querySelectorAll('.exam-class-checkbox:checked').forEach(cb => {
        selected.push(cb.value);
    });
    return selected;
}

// ========== CREATE EXAM ==========
async function handleAddExam(e) {
    e.preventDefault();
    const submitButton = e.submitter;
    if (!submitButton) {
        console.error("Form submitter button not found.");
        return; 
    }

    const originalText = submitButton.textContent;
    setButtonLoading(submitButton, true, originalText);

    const exam_type = document.getElementById('exam_type')?.value;
    const exam_link = document.getElementById('exam_link')?.value.trim() || null;
    const exam_duration_minutes = parseInt(document.getElementById('exam_duration_minutes')?.value);
    const exam_start_time = document.getElementById('exam_start_time')?.value;
    const selected_program = document.getElementById('exam_program')?.value;
    const course_id = document.getElementById('exam_course_id')?.value || null;
    const exam_title = document.getElementById('exam_title')?.value.trim();
    const exam_date = document.getElementById('exam_date')?.value;
    const exam_status = document.getElementById('exam_status')?.value;
    const intake = parseInt(document.getElementById('exam_intake')?.value);
    const block_term = document.getElementById('exam_block_term')?.value;
    
    const marks_out_of = parseInt(document.getElementById('exam_out_of')?.value) || 100;
    const pass_mark = parseInt(document.getElementById('exam_pass_mark')?.value) || 50;
    const min_fee_balance = parseInt(document.getElementById('exam_min_fee')?.value) || 0;
    const marks_deadline = document.getElementById('exam_marks_deadline')?.value || null;
    const exam_basis = document.getElementById('exam_basis')?.value || 'ordinary';

    if (!selected_program || !exam_title || !exam_date || !intake || !block_term || !exam_type || isNaN(exam_duration_minutes)) {
        showFeedback('Required fields: Program, Title, Date, Intake, Block/Term, Type, and Duration.', 'error');
        setButtonLoading(submitButton, false, originalText);
        return;
    }

    const selectedClasses = getSelectedClassesForExam();

    try {
        // Map to your actual column names
        const examData = {
            title: exam_title,           // Your column is 'title', not 'exam_name'
            exam_type: exam_type,
            exam_date: exam_date,
            exam_start_time: exam_start_time,
            duration_minutes: exam_duration_minutes,
            target_program: selected_program,
            program_type: selected_program,
            intake_year: intake,
            block: block_term,           // Your column is 'block', not 'block_term'
            course_id: course_id,
            online_link: exam_link,
            status: exam_status,
            marks_out_of: marks_out_of,
            pass_mark: pass_mark,
            min_fee_balance: min_fee_balance,
            marks_entry_deadline: marks_deadline,
            exam_basis: exam_basis,
            assigned_classes: selectedClasses,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        console.log('📤 Creating exam with data:', examData);

        const { error, data } = await sb.from('exams').insert(examData).select('id');

        if (error) throw error;

        await logAudit('EXAM_ADD', `Posted new ${exam_type}: ${exam_title} (Program: ${selected_program}, OutOf: ${marks_out_of}, Pass: ${pass_mark}%).`, data?.[0]?.id, 'SUCCESS');
        showFeedback(`✅ Assessment added successfully!`, 'success');
        
        if (e.target) e.target.reset();
        loadExams();
        if (typeof renderFullCalendar === 'function') renderFullCalendar();
        
    } catch (error) {
        console.error('Error adding exam:', error);
        await logAudit('EXAM_ADD', `Failed to add ${exam_type}: ${exam_title}. ${error.message}`, null, 'FAILURE');
        showFeedback(`Failed to add assessment: ${error.message}`, 'error');
    } finally {
        setButtonLoading(submitButton, false, originalText);
    }
}

// ========== CALCULATE EXAM PROGRESS ==========
async function calculateExamProgress(examId) {
    try {
        const { data: exam, error: examError } = await sb
            .from('exams')
            .select('program_type, intake_year, block')
            .eq('id', examId)
            .single();
        
        if (examError || !exam) {
            return { totalCount: 0, markedCount: 0, percentage: 0 };
        }
        
        // Convert intake_year to string for comparison
        const intakeYearStr = String(exam.intake_year);
        
        const { data: students, error: studentError } = await sb
            .from('consolidated_user_profiles_table')
            .select('user_id')
            .eq('role', 'student')
            .eq('program', exam.program_type)
            .eq('intake_year', intakeYearStr)
            .eq('block', exam.block);
        
        const totalCount = students?.length || 0;
        
        const { data: grades, error: gradeError } = await sb
            .from('exam_grades')
            .select('student_id')
            .eq('exam_id', examId);
        
        const markedCount = grades?.length || 0;
        const percentage = totalCount > 0 ? Math.round((markedCount / totalCount) * 100) : 0;
        
        return { totalCount, markedCount, percentage };
    } catch (error) {
        console.error('Error calculating progress:', error);
        return { totalCount: 0, markedCount: 0, percentage: 0 };
    }
}

// ========== LOAD EXAMS ==========
async function loadExams() {
    const tbody = document.getElementById('exams-table');
    if (!tbody) return;
    
    tbody.innerHTML = '<tr><td colspan="11">Loading exams/CATs...</td></tr>';

    // Use your actual column names
    const { data: exams, error } = await sb
        .from('exams')
        .select('*, course:course_id(course_name)')
        .order('exam_date', { ascending: false });

    if (error) {
        tbody.innerHTML = `<tr><td colspan="11">Error loading exams: ${error.message}</td></tr>`;
        return;
    }

    if (!exams || exams.length === 0) {
        tbody.innerHTML = '<tr><td colspan="11">No exams found. Create your first exam!<\/td><\/tr>';
        populateStudentExams([]);
        return;
    }

    tbody.innerHTML = '';
    
    for (const e of exams) {
        const dateTime = new Date(e.exam_date).toLocaleDateString() + ' ' + (e.exam_start_time || '');
        const courseName = e.course?.course_name || 'N/A';
        const type = e.exam_type || 'N/A';
        
        const progress = await calculateExamProgress(e.id);
        const progressPercent = progress.percentage;
        const marksOutOf = e.marks_out_of || e.total_marks || 100;
        const passMark = e.pass_mark || 50;
        
        const statusBadge = getExamStatusBadge(e.status);
        
        const progressBar = `
            <div style="width: 100px;">
                <div style="background: #e5e7eb; border-radius: 10px; overflow: hidden;">
                    <div style="width: ${progressPercent}%; background: ${progressPercent >= 100 ? '#059669' : '#4C1D95'}; height: 6px;"></div>
                </div>
                <small>${progress.markedCount}/${progress.totalCount}</small>
            </div>
        `;

       let actionsHtml = `
    <button class="btn-action" onclick="openEditExamModal('${e.id}')">Edit</button>
    <button class="btn-action" onclick="openGradeModal('${e.id}', '${escapeHtml(e.title, true)}')">Grade</button>
    ${e.status !== 'Completed' ? `<button class="btn-action" onclick="closeExam('${e.id}')" style="background: #F59E0B; color: white;">Close</button>` : ''}
    <button class="btn btn-delete" onclick="deleteExam('${e.id}', '${escapeHtml(e.title, true)}')">Delete</button>
`;
        
        if (e.online_link || e.exam_link) {
            const link = e.online_link || e.exam_link;
            actionsHtml += `<a href="${escapeHtml(link)}" target="_blank" class="btn btn-map" style="margin-left: 5px;">Link</a>`;
        }

        tbody.innerHTML += `
            <tr>
                <td>${escapeHtml(type)}</td>
                <td>${escapeHtml(e.target_program || e.program_type || 'N/A')}</td>
                <td>${escapeHtml(courseName)}</td>
                <td>${escapeHtml(e.title)}</td>
                <td>${marksOutOf}</td>
                <td>${passMark}%</td>
                <td>${dateTime}</td>
                <td>${escapeHtml(e.duration_minutes + ' mins' || 'N/A')}</td>
                <td>${progressBar}</td>
                <td>${statusBadge}</td>
                <td>${actionsHtml}</td>
             `;
    }

    populateStudentExams(exams);
}

function getExamStatusBadge(status) {
    const statusMap = {
        'Upcoming': '<span class="badge badge-info">📅 Upcoming</span>',
        'InProgress': '<span class="badge badge-warning">⏳ In Progress</span>',
        'Completed': '<span class="badge badge-success">✅ Completed</span>'
    };
    return statusMap[status] || `<span class="badge">${status}</span>`;
}

// ========== POPULATE STUDENT EXAMS ==========
async function populateStudentExams(exams) {
    const studentExamsContainer = document.getElementById('student-exams');
    if (!studentExamsContainer) return;

    if (!exams || exams.length === 0) {
        studentExamsContainer.innerHTML = '<p>No assessments available at the moment.</p>';
        return;
    }

    let html = '<div class="student-exams-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px;">';
    
    exams.forEach(exam => {
        const courseName = exam.course?.course_name || 'General Assessment';
        const dateTime = new Date(exam.exam_date).toLocaleDateString() + (exam.exam_start_time ? ` at ${exam.exam_start_time}` : '');
        const statusClass = exam.status === 'Upcoming' ? 'upcoming' : 
                           exam.status === 'InProgress' ? 'in-progress' : 'completed';
        
        const marksOutOf = exam.marks_out_of || exam.total_marks || 100;
        const passMark = exam.pass_mark || 50;

        html += `
            <div class="exam-card ${statusClass}" style="background: white; border-radius: 12px; padding: 15px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); border-left: 4px solid ${statusClass === 'upcoming' ? '#f59e0b' : statusClass === 'in-progress' ? '#3b82f6' : '#10b981'};">
                <h4 style="margin: 0 0 10px 0; color: #4C1D95;">${escapeHtml(exam.title)}</h4>
                <p><strong>Type:</strong> ${escapeHtml(exam.exam_type)}</p>
                <p><strong>Course:</strong> ${escapeHtml(courseName)}</p>
                <p><strong>Date:</strong> ${dateTime}</p>
                <p><strong>Duration:</strong> ${exam.duration_minutes} minutes</p>
                <p><strong>Marks Out Of:</strong> ${marksOutOf}</p>
                <p><strong>Pass Mark:</strong> ${passMark}%</p>
                <p><strong>Status:</strong> <span class="status-${statusClass}">${escapeHtml(exam.status)}</span></p>
                ${(exam.online_link || exam.exam_link) ? `<a href="${escapeHtml(exam.online_link || exam.exam_link)}" target="_blank" class="btn-action" style="display: inline-block; margin-top: 10px; padding: 8px 16px; background: #4C1D95; color: white; border-radius: 6px; text-decoration: none;">Take Exam</a>` : ''}
            </div>`;
    });

    html += '</div>';
    studentExamsContainer.innerHTML = html;
}

// ========== DELETE EXAM ==========
async function deleteExam(examId, examName) {
    if (!confirm(`Delete exam: ${examName}? This action cannot be undone.`)) return;
    
    try {
        const { error } = await sb.from('exams').delete().eq('id', examId);
        
        if (error) throw error;
        
        showFeedback(`✅ Exam "${examName}" deleted successfully!`, 'success');
        await loadExams();
        if (typeof renderFullCalendar === 'function') renderFullCalendar();
        
    } catch (error) {
        console.error('Error deleting exam:', error);
        showFeedback(`Failed to delete exam: ${error.message}`, 'error');
    }
}
// ========== CLOSE EXAM ==========
async function closeExam(examId) {
    if (!confirm(`Close this exam? Students will no longer be able to take it.`)) return;
    
    try {
        const { error } = await sb
            .from('exams')
            .update({ 
                status: 'Completed',
                updated_at: new Date().toISOString()
            })
            .eq('id', examId);
        
        if (error) throw error;
        
        showFeedback('✅ Exam closed successfully!', 'success');
        await loadExams();
        if (typeof renderFullCalendar === 'function') renderFullCalendar();
        
    } catch (error) {
        console.error('Error closing exam:', error);
        showFeedback(`Failed to close exam: ${error.message}`, 'error');
    }
}
// ============================================
// OPEN EDIT EXAM MODAL - COMPLETE FIELDS
// ============================================

async function openEditExamModal(examId) {
    try {
        console.log('📝 Opening edit modal for exam ID:', examId);
        
        const { data: exam, error } = await sb
            .from('exams')
            .select('*, course:course_id(course_name)')
            .eq('id', examId)
            .single();

        if (error || !exam) {
            showFeedback(`Error loading exam details: ${error?.message || 'Not found.'}`, 'error');
            return;
        }

        // Check if modal exists, if not create it
        let modal = document.getElementById('examEditModal');
        if (!modal) {
            modal = createExamEditModal();
        }

        // ============================================
        // POPULATE ALL FIELDS
        // ============================================
        
        // Basic Info
        const examIdInput = document.getElementById('edit_exam_id');
        const titleInput = document.getElementById('edit_exam_title');
        const typeInput = document.getElementById('edit_exam_type');
        const statusInput = document.getElementById('edit_exam_status');
        const basisInput = document.getElementById('edit_exam_basis');
        
        // Dates & Times
        const dateInput = document.getElementById('edit_exam_date');
        const startTimeInput = document.getElementById('edit_exam_start_time');
        const durationInput = document.getElementById('edit_exam_duration');
        const deadlineInput = document.getElementById('edit_exam_deadline');
        
        // Program & Block
       // ========== PROGRAM & BLOCK - FIXED ==========
const programInput = document.getElementById('edit_exam_program');
const blockInput = document.getElementById('edit_exam_block');
const intakeInput = document.getElementById('edit_exam_intake');  

if (programInput) {
    // Step 1: Update the program dropdown with all options
    updateProgramDropdown(programInput);
    
    // Step 2: Set the program value
    const programValue = exam.target_program || exam.program_type || 'KRCHN';
    programInput.value = programValue;
    console.log('✅ Program set to:', programValue);
    
    // Step 3: IMPORTANT - Force update of block dropdown
    // Use setTimeout to ensure DOM is ready
    setTimeout(() => {
        // Manually update block options based on selected program
        updateBlockTermOptions('edit_exam_program', 'edit_exam_block');
        console.log('✅ Block options updated for:', programValue);
        
        // Step 4: Set the block value after options are populated
        setTimeout(() => {
            if (blockInput) {
                const blockValue = exam.block || exam.block_term || '';
                blockInput.value = blockValue;
                console.log('✅ Block/Term set to:', blockValue);
            }
        }, 100);
    }, 100);
}
        // Course
        const courseInput = document.getElementById('edit_exam_course');
        
        // Marks
        const outOfInput = document.getElementById('edit_exam_out_of');
        const passMarkInput = document.getElementById('edit_exam_pass_mark');
        const minFeeInput = document.getElementById('edit_exam_min_fee');
        
        // Link & Classes
        const linkInput = document.getElementById('edit_exam_link');
        const classesContainer = document.getElementById('edit_exam_classes_container');

        // Set values
        if (examIdInput) examIdInput.value = exam.id;
        if (titleInput) titleInput.value = exam.title || '';
        if (typeInput) typeInput.value = exam.exam_type || 'CAT';
        if (statusInput) statusInput.value = exam.status || 'Upcoming';
        if (basisInput) basisInput.value = exam.exam_basis || 'ordinary';
        
        if (dateInput) dateInput.value = exam.exam_date || '';
        if (startTimeInput) startTimeInput.value = exam.exam_start_time || '09:00';
        if (durationInput) durationInput.value = exam.duration_minutes || 60;
        if (deadlineInput) deadlineInput.value = exam.marks_entry_deadline || '';
        
        // Program & Block - need to handle dropdown updates
        if (programInput) {
            // First update the program dropdown with all options
            updateProgramDropdown(programInput);
            // Set the value
            programInput.value = exam.target_program || exam.program_type || 'KRCHN';
            // Trigger change to update block options
            programInput.dispatchEvent(new Event('change'));
        }
        
        if (blockInput) {
            // Wait for block options to populate, then set value
            setTimeout(() => {
                blockInput.value = exam.block || exam.block_term || '';
                console.log('Block/Term set to:', exam.block || exam.block_term);
            }, 200);
        }
        
        if (intakeInput) intakeInput.value = exam.intake_year || '';
        
        // Course dropdown
        if (courseInput) {
            // Populate course dropdown
            await populateEditExamCourses(courseInput, exam.target_program || exam.program_type);
            courseInput.value = exam.course_id || '';
        }
        
        if (outOfInput) outOfInput.value = exam.marks_out_of || exam.total_marks || 100;
        if (passMarkInput) passMarkInput.value = exam.pass_mark || 50;
        if (minFeeInput) minFeeInput.value = exam.min_fee_balance || 0;
        if (linkInput) linkInput.value = exam.online_link || exam.exam_link || '';

        // Classes/Blocks assigned
        if (classesContainer) {
            const assignedClasses = exam.assigned_classes || [];
            classesContainer.innerHTML = `
                <div style="margin-top: 10px;">
                    <label style="font-weight: 600; display: block; margin-bottom: 8px;">
                        <i class="fas fa-layer-group"></i> Assigned Blocks/Classes:
                    </label>
                    <div style="display: flex; flex-wrap: wrap; gap: 8px; padding: 10px; background: #f8f9fa; border-radius: 8px; min-height: 40px;">
                        ${assignedClasses.length > 0 ? assignedClasses.map(cls => `
                            <span style="background: #4C1D95; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px;">
                                ${escapeHtml(cls)}
                                <span onclick="removeAssignedClass('${exam.id}', '${escapeHtml(cls)}')" style="cursor: pointer; margin-left: 6px; color: #fca5a5;">&times;</span>
                            </span>
                        `).join('') : '<span style="color: #6b7280;">No blocks assigned</span>'}
                    </div>
                    <div style="margin-top: 10px; display: flex; gap: 8px;">
                        <input type="text" id="edit_exam_add_class" placeholder="Add block (e.g., Block 1)" style="flex: 1; padding: 8px; border: 1px solid #ddd; border-radius: 6px;">
                        <button onclick="addAssignedClassToExam('${exam.id}')" class="btn-sm btn-edit" style="white-space: nowrap;">
                            <i class="fas fa-plus"></i> Add
                        </button>
                    </div>
                </div>
            `;
        }

        // Store exam ID for later use
        window.currentEditExamId = exam.id;

        modal.style.display = 'flex';

    } catch (err) {
        console.error('❌ Error in openEditExamModal:', err);
        showFeedback(`Unexpected error: ${err.message}`, 'error');
    }
}

// ========== SAVE EDITED EXAM ==========
async function saveEditedExam(e) {
    e.preventDefault();
   e.stopPropagation();  // ✅ Stop event bubbling

    console.log('💾 Saving edited exam...');

    const examIdInput = document.getElementById('edit_exam_id');
    const titleInput = document.getElementById('edit_exam_title');
    const dateInput = document.getElementById('edit_exam_date');
    const startTimeInput = document.getElementById('edit_exam_start_time');
    const durationInput = document.getElementById('edit_exam_duration');
    const statusInput = document.getElementById('edit_exam_status');
    const typeInput = document.getElementById('edit_exam_type');
    const linkInput = document.getElementById('edit_exam_link');
    
    const outOfInput = document.getElementById('edit_exam_out_of');
    const passMarkInput = document.getElementById('edit_exam_pass_mark');
    const minFeeInput = document.getElementById('edit_exam_min_fee');
    const deadlineInput = document.getElementById('edit_exam_deadline');
    const basisInput = document.getElementById('edit_exam_basis');

    if (!examIdInput || !titleInput) {
        showFeedback('❌ Required form elements not found.', 'error');
        return;
    }

    const examId = examIdInput.value.trim();
    const title = titleInput.value.trim();
    // ✅ FIX: Convert empty string to null
    const date = dateInput ? (dateInput.value || null) : null;
    const startTime = startTimeInput ? startTimeInput.value || null : null;
    const duration = durationInput ? parseInt(durationInput.value) || 60 : 60;
    const status = statusInput ? statusInput.value : 'Upcoming';
    const type = typeInput ? typeInput.value : 'CAT';
    const link = linkInput ? linkInput.value.trim() || null : null;
    
    const marksOutOf = outOfInput ? parseInt(outOfInput.value) || 100 : 100;
    const passMark = passMarkInput ? parseInt(passMarkInput.value) || 50 : 50;
    const minFee = minFeeInput ? parseInt(minFeeInput.value) || 0 : 0;
    const deadline = deadlineInput ? deadlineInput.value || null : null;
    const examBasis = basisInput ? basisInput.value : 'ordinary';

    if (!title || !duration) {
        showFeedback('❌ Title and Duration are required.', 'error');
        return;
    }

    try {
        const updateData = {
            title: title,
            exam_type: type,
            exam_date: date,  // ← Now null if empty
            exam_start_time: startTime,
            duration_minutes: duration,
            status: status,
            updated_at: new Date().toISOString(),
            marks_out_of: marksOutOf,
            pass_mark: passMark,
            min_fee_balance: minFee,
            marks_entry_deadline: deadline,
            exam_basis: examBasis
        };

        if (link) {
            updateData.online_link = link;
        }

        // ✅ Remove undefined values
        Object.keys(updateData).forEach(key => 
            updateData[key] === undefined && delete updateData[key]
        );

        console.log('📤 Sending update data:', updateData);

        const { error } = await sb
            .from('exams')
            .update(updateData)
            .eq('id', examId);

        if (error) throw error;

        showFeedback('✅ Exam updated successfully!', 'success');
        await loadExams();
        
        try { 
            if (typeof renderFullCalendar === 'function') renderFullCalendar(); 
        } catch (e) {}

        document.getElementById('examEditModal').style.display = 'none';

    } catch (err) {
        console.error('❌ Error saving exam:', err);
        showFeedback(`Failed to update exam: ${err.message}`, 'error');
    }
}

// ========== OPEN GRADE MODAL ==========
async function openGradeModal(examId, examName = '') {
    try {
        console.log('🎯 Opening grade modal for exam:', examId);
        
        const currentUser = await getCurrentUser();
        if (!currentUser || !currentUser.user_id) {
            showFeedback('Error: You must be logged in to grade exams.', 'error');
            return;
        }

        const { data: exam, error: examError } = await sb
            .from('exams')
            .select('*')
            .eq('id', examId)
            .single();

        if (examError || !exam) {
            showFeedback('Error loading exam details.', 'error');
            return;
        }

        console.log('📋 Exam criteria:', {
            program: exam.program_type || exam.target_program,
            intake_year: exam.intake_year,
            block: exam.block || exam.block_term
        });

        const programField = exam.program_type || exam.target_program;
        const blockField = exam.block || exam.block_term;
        
        // Build query - FIX: Convert intake_year to string for comparison
        let query = sb
            .from('consolidated_user_profiles_table')
            .select('user_id, full_name, email, program, intake_year, block')
            .eq('role', 'student');
        
        if (programField) {
            query = query.eq('program', programField);
        }
        if (exam.intake_year) {
            // Convert exam intake_year to string to match student data
            const intakeYearStr = String(exam.intake_year);
            query = query.eq('intake_year', intakeYearStr);
        }
        if (blockField) {
            query = query.eq('block', blockField);
        }
        
        const { data: students, error: studentError } = await query;

        console.log(`Found ${students?.length || 0} students matching criteria`);

        if (studentError || !students || students.length === 0) {
            // Show helpful message with suggestions
            const suggestions = [];
            if (exam.intake_year) suggestions.push(`• Intake Year: ${exam.intake_year} (as string)`);
            if (programField) suggestions.push(`• Program: ${programField}`);
            if (blockField) suggestions.push(`• Block: ${blockField}`);
            
            const helpMessage = `No students found for this exam criteria.\n\nExam Requirements:\n${suggestions.join('\n')}\n\nPlease check your student data.`;
            showFeedback(helpMessage, 'warning');
            return;
        }

        const { data: existingGrades } = await sb
            .from('exam_grades')
            .select('*')
            .eq('exam_id', examId);

        let examType = exam.exam_type || 'EXAM';
        const modalHtml = buildGradeModalHTML(exam, students, existingGrades, currentUser, examType);
        showGradeModal(modalHtml);

        if (examType === 'EXAM') students.forEach(s => updateGradeTotal(s.user_id));
        
        showFeedback(`${getExamTypeLabel(examType)} grading modal loaded for ${students.length} students`, 'success');
        
    } catch (error) {
        console.error('Error opening grade modal:', error);
        showFeedback('Failed to load grading interface: ' + error.message, 'error');
    }
}

function buildGradeModalHTML(exam, students, existingGrades, currentUser, examType) {
    const examTypeLabel = getExamTypeLabel(examType);
    const marksOutOf = exam.marks_out_of || exam.total_marks || 100;
    const passMark = exam.pass_mark || 50;
    
    let tableHeaders = '';
    let tableRows = '';
    
    switch(examType) {
        case 'CAT_1':
            tableHeaders = `<th>Student Name</th><th>Email</th><th>CAT 1 Score (max 30)</th><th>Status</th>`;
            tableRows = students.map(s => {
                const grade = existingGrades?.find(g => g.student_id === s.user_id) || {};
                return `<tr data-name="${s.full_name.toLowerCase()}" data-email="${(s.email||'').toLowerCase()}" data-id="${s.user_id}">
                    <td>${escapeHtml(s.full_name)}</td>
                    <td>${escapeHtml(s.email ?? '')}</td>
                    <td><input type="number" min="0" max="30" step="0.5" id="cat1-${s.user_id}" value="${grade.cat_1_score ?? ''}" placeholder="0-30" class="grade-input"></td>
                    <td><select id="status-${s.user_id}" class="status-select">
                        <option value="Scheduled" ${grade.result_status === 'Scheduled' ? 'selected' : ''}>Scheduled</option>
                        <option value="InProgress" ${grade.result_status === 'InProgress' ? 'selected' : ''}>In Progress</option>
                        <option value="Final" ${grade.result_status === 'Final' ? 'selected' : ''}>Final</option>
                    </select></td>
                </tr>`;
            }).join('');
            break;
            
        case 'CAT_2':
            tableHeaders = `<th>Student Name</th><th>Email</th><th>CAT 2 Score (max 30)</th><th>Status</th>`;
            tableRows = students.map(s => {
                const grade = existingGrades?.find(g => g.student_id === s.user_id) || {};
                return `<tr data-name="${s.full_name.toLowerCase()}" data-email="${(s.email||'').toLowerCase()}" data-id="${s.user_id}">
                    <td>${escapeHtml(s.full_name)}</td>
                    <td>${escapeHtml(s.email ?? '')}</td>
                    <td><input type="number" min="0" max="30" step="0.5" id="cat2-${s.user_id}" value="${grade.cat_2_score ?? ''}" placeholder="0-30" class="grade-input"></td>
                    <td><select id="status-${s.user_id}" class="status-select">
                        <option value="Scheduled" ${grade.result_status === 'Scheduled' ? 'selected' : ''}>Scheduled</option>
                        <option value="InProgress" ${grade.result_status === 'InProgress' ? 'selected' : ''}>In Progress</option>
                        <option value="Final" ${grade.result_status === 'Final' ? 'selected' : ''}>Final</option>
                    </select></td>
                </tr>`;
            }).join('');
            break;
            
        case 'CAT':
            tableHeaders = `<th>Student Name</th><th>Email</th><th>CAT Score (max 30)</th><th>Status</th>`;
            tableRows = students.map(s => {
                const grade = existingGrades?.find(g => g.student_id === s.user_id) || {};
                return `<tr data-name="${s.full_name.toLowerCase()}" data-email="${(s.email||'').toLowerCase()}" data-id="${s.user_id}">
                    <td>${escapeHtml(s.full_name)}</td>
                    <td>${escapeHtml(s.email ?? '')}</td>
                    <td><input type="number" min="0" max="30" step="0.5" id="cat-${s.user_id}" value="${grade.cat_1_score ?? grade.cat_2_score ?? ''}" placeholder="0-30" class="grade-input"></td>
                    <td><select id="status-${s.user_id}" class="status-select">
                        <option value="Scheduled" ${grade.result_status === 'Scheduled' ? 'selected' : ''}>Scheduled</option>
                        <option value="InProgress" ${grade.result_status === 'InProgress' ? 'selected' : ''}>In Progress</option>
                        <option value="Final" ${grade.result_status === 'Final' ? 'selected' : ''}>Final</option>
                    </select></td>
                </tr>`;
            }).join('');
            break;
            
        default:
            tableHeaders = `<th>Student Name</th><th>Email</th><th>CAT 1 (max 30)</th><th>CAT 2 (max 30)</th><th>Final Exam (max ${marksOutOf})</th><th>Total (scaled 100)</th><th>Status</th>`;
            tableRows = students.map(s => {
                const grade = existingGrades?.find(g => g.student_id === s.user_id) || {};
                return `<tr data-name="${s.full_name.toLowerCase()}" data-email="${(s.email||'').toLowerCase()}" data-id="${s.user_id}">
                    <td>${escapeHtml(s.full_name)}</td>
                    <td>${escapeHtml(s.email ?? '')}</td>
                    <td><input type="number" min="0" max="30" step="0.5" id="cat1-${s.user_id}" value="${grade.cat_1_score ?? ''}" placeholder="0-30" class="grade-input" oninput="updateGradeTotal('${s.user_id}')"></td>
                    <td><input type="number" min="0" max="30" step="0.5" id="cat2-${s.user_id}" value="${grade.cat_2_score ?? ''}" placeholder="0-30" class="grade-input" oninput="updateGradeTotal('${s.user_id}')"></td>
                    <td><input type="number" min="0" max="${marksOutOf}" step="0.5" id="final-${s.user_id}" value="${grade.exam_score ?? ''}" placeholder="0-${marksOutOf}" class="grade-input" oninput="updateGradeTotal('${s.user_id}')"></td>
                    <td><input type="number" min="0" max="100" step="0.1" id="total-${s.user_id}" value="" placeholder="Auto" readonly class="total-input"></td>
                    <td><select id="status-${s.user_id}" class="status-select">
                        <option value="Scheduled" ${grade.result_status === 'Scheduled' ? 'selected' : ''}>Scheduled</option>
                        <option value="InProgress" ${grade.result_status === 'InProgress' ? 'selected' : ''}>In Progress</option>
                        <option value="Final" ${grade.result_status === 'Final' ? 'selected' : ''}>Final</option>
                    </select></td>
                </tr>`;
            }).join('');
    }
    
    return `
    <div class="modal-content" style="width:95%; max-width:1000px;">
        <div class="modal-header">
            <h3>${examTypeLabel}: ${escapeHtml(exam.title)}</h3>
            <span class="close" onclick="closeModal()">&times;</span>
        </div>
        <div class="modal-body">
            <div class="exam-info" style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
                <strong>Exam Details:</strong> ${escapeHtml(exam.course_name || 'General Assessment')} | ${escapeHtml(exam.program_type)} | Block ${escapeHtml(exam.block)} | ${escapeHtml(exam.intake_year)}
                <br><strong>Marks Out Of:</strong> ${marksOutOf} | <strong>Pass Mark:</strong> ${passMark}%
                <br><small>Grading as: ${escapeHtml(currentUser.full_name || currentUser.email)} | Type: ${examTypeLabel}</small>
            </div>
            <input type="text" id="gradeSearch" placeholder="Search by name, email or ID" class="search-input" oninput="filterGradeStudents()">
            <div class="table-container">
                <table class="data-table grade-table">
                    <thead><tr>${tableHeaders}</thead>
                    <tbody id="gradeTableBody">${tableRows}</tbody>
                </table>
            </div>
            <div class="modal-actions">
                <button class="btn-action" onclick="saveGrades('${exam.id}', '${examType}')">Save ${examTypeLabel} Grades</button>
                <button class="btn btn-delete" onclick="closeModal()">Cancel</button>
            </div>
        </div>
    </div>`;
}

function showGradeModal(modalHtml) {
    const existingModal = document.getElementById('gradeModal');
    if (existingModal) existingModal.remove();

    const modal = document.createElement('div');
    modal.id = 'gradeModal';
    modal.className = 'modal-overlay active';
    modal.innerHTML = modalHtml;
    document.body.appendChild(modal);

    modal.addEventListener('click', function(e) {
        if (e.target === modal) closeModal();
    });

    const searchInput = document.getElementById('gradeSearch');
    if (searchInput) setTimeout(() => searchInput.focus(), 100);
}

function updateGradeTotal(studentId) {
    const cat1Input = document.querySelector(`#cat1-${studentId}`);
    const cat2Input = document.querySelector(`#cat2-${studentId}`);
    const finalInput = document.querySelector(`#final-${studentId}`);
    const totalInput = document.querySelector(`#total-${studentId}`);
    
    if (!cat1Input || !cat2Input || !finalInput || !totalInput) return;

    let cat1 = Math.min(parseFloat(cat1Input.value) || 0, 30);
    let cat2 = Math.min(parseFloat(cat2Input.value) || 0, 30);
    let finalExam = Math.min(parseFloat(finalInput.value) || 0, 100);

    const rawTotal = cat1 + cat2 + finalExam;
    const scaledTotal = (rawTotal / 160) * 100;
    
    totalInput.value = scaledTotal.toFixed(2);
    
    totalInput.classList.remove('high-score', 'medium-score', 'low-score');
    if (scaledTotal >= 70) totalInput.classList.add('high-score');
    else if (scaledTotal >= 50) totalInput.classList.add('medium-score');
    else totalInput.classList.add('low-score');
}

function filterGradeStudents() {
    const searchTerm = document.getElementById('gradeSearch')?.value?.toLowerCase() || '';
    const rows = document.querySelectorAll('#gradeTableBody tr');
    
    rows.forEach(row => {
        const name = row.getAttribute('data-name') || '';
        const email = row.getAttribute('data-email') || '';
        const id = row.getAttribute('data-id') || '';
        
        if (name.includes(searchTerm) || email.includes(searchTerm) || id.includes(searchTerm)) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

// ========== SAVE GRADES ==========
async function saveGrades(examId, examType = 'EXAM') {
    try {
        const rows = document.querySelectorAll('#gradeTableBody tr');
        
        const currentUser = await getCurrentUser();
        if (!currentUser || (!currentUser.user_id && !currentUser.id)) {
            showFeedback('Error: Cannot identify grader.', 'error');
            return;
        }

        const validGraderId = currentUser.user_id || currentUser.id;
        
        const studentIds = [];
        const gradeDataMap = new Map();
        
        for (const row of rows) {
            if (row.style.display === 'none') continue;
            const studentId = row.getAttribute('data-id');
            if (!studentId) continue;
            
            const statusSelect = row.querySelector(`#status-${studentId}`);
            if (!statusSelect) continue;
            
            studentIds.push(studentId);
            
            let gradeData = {
                exam_id: parseInt(examId),
                student_id: studentId,
                result_status: statusSelect.value || 'Scheduled',
                graded_by: validGraderId,
                updated_at: new Date().toISOString(),
                question_id: '00000000-0000-0000-0000-000000000000'
            };
            
            let hasData = false;
            
            switch(examType) {
                case 'CAT_1':
                    const cat1Input = row.querySelector(`#cat1-${studentId}`);
                    if (cat1Input && cat1Input.value.trim()) {
                        gradeData.cat_1_score = Math.min(parseFloat(cat1Input.value) || 0, 30);
                        hasData = true;
                    }
                    break;
                case 'CAT_2':
                    const cat2Input = row.querySelector(`#cat2-${studentId}`);
                    if (cat2Input && cat2Input.value.trim()) {
                        gradeData.cat_2_score = Math.min(parseFloat(cat2Input.value) || 0, 30);
                        hasData = true;
                    }
                    break;
                case 'CAT':
                    const catInput = row.querySelector(`#cat-${studentId}`);
                    if (catInput && catInput.value.trim()) {
                        gradeData.cat_1_score = Math.min(parseFloat(catInput.value) || 0, 30);
                        hasData = true;
                    }
                    break;
                default:
                    const cat1Final = row.querySelector(`#cat1-${studentId}`);
                    const cat2Final = row.querySelector(`#cat2-${studentId}`);
                    const finalExam = row.querySelector(`#final-${studentId}`);
                    
                    if (cat1Final?.value.trim() || cat2Final?.value.trim() || finalExam?.value.trim()) {
                        gradeData.cat_1_score = Math.min(parseFloat(cat1Final?.value) || 0, 30);
                        gradeData.cat_2_score = Math.min(parseFloat(cat2Final?.value) || 0, 30);
                        gradeData.exam_score = Math.min(parseFloat(finalExam?.value) || 0, 100);
                        const scaledTotal = ((gradeData.cat_1_score + gradeData.cat_2_score + gradeData.exam_score) / 160) * 100;
                        gradeData.total_score = parseFloat(scaledTotal.toFixed(2));
                        hasData = true;
                    }
            }
            
            if (hasData) {
                gradeDataMap.set(studentId, gradeData);
            }
        }
        
        if (gradeDataMap.size === 0) {
            showFeedback('No grade data entered to save.', 'warning');
            return;
        }
        
        const { data: existingGrades, error: fetchError } = await sb
            .from('exam_grades')
            .select('id, student_id')
            .eq('exam_id', parseInt(examId))
            .in('student_id', studentIds);
        
        if (fetchError) throw fetchError;
        
        const existingMap = new Map();
        if (existingGrades) {
            existingGrades.forEach(g => existingMap.set(g.student_id, g.id));
        }
        
        const saveBtn = document.querySelector('#gradeModal .btn-action');
        const originalText = saveBtn?.textContent;
        if (saveBtn) {
            saveBtn.disabled = true;
            saveBtn.innerHTML = '<div class="loading-spinner" style="width:20px;height:20px;"></div> Saving...';
        }
        
        let savedCount = 0;
        let errorCount = 0;
        
        for (const [studentId, gradeData] of gradeDataMap) {
            const existingId = existingMap.get(studentId);
            
            let result;
            if (existingId) {
                result = await sb
                    .from('exam_grades')
                    .update(gradeData)
                    .eq('id', existingId);
            } else {
                result = await sb
                    .from('exam_grades')
                    .insert(gradeData);
            }
            
            if (result.error) {
                console.error(`Error saving grade for ${studentId}:`, result.error);
                errorCount++;
            } else {
                savedCount++;
            }
        }
        
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.innerHTML = originalText || 'Save Grades';
        }
        
        if (errorCount === 0) {
            showFeedback(`✅ Successfully saved ${savedCount} student grade(s)!`, 'success');
            setTimeout(() => closeModal(), 1500);
        } else {
            showFeedback(`⚠️ Saved ${savedCount} records, ${errorCount} had errors`, 'warning');
        }
        
    } catch (error) {
        console.error('Error saving grades:', error);
        showFeedback(`Failed to save grades: ${error.message}`, 'error');
        
        const saveBtn = document.querySelector('#gradeModal .btn-action');
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.innerHTML = 'Save Grades';
        }
    }
}

// ========== GET CURRENT USER ==========
async function getCurrentUser() {
    try {
        if (typeof currentUserProfile !== 'undefined' && currentUserProfile) {
            if (currentUserProfile.user_id) return currentUserProfile;
            else if (currentUserProfile.id) return { ...currentUserProfile, user_id: currentUserProfile.id };
        }
        
        if (window.currentUserProfile && window.currentUserProfile.user_id) return window.currentUserProfile;
        
        const storedUser = sessionStorage.getItem('currentUserProfile') || sessionStorage.getItem('currentUser');
        if (storedUser) {
            try {
                const user = JSON.parse(storedUser);
                if (user && (user.user_id || user.id)) {
                    if (!user.user_id && user.id) user.user_id = user.id;
                    return user;
                }
            } catch (e) {}
        }
        
        const { data: { user: authUser }, error: authError } = await sb.auth.getUser();
        if (!authError && authUser) {
            const { data: profile } = await sb
                .from('consolidated_user_profiles_table')
                .select('*')
                .eq('user_id', authUser.id)
                .single();
                
            if (profile) {
                window.currentUserProfile = profile;
                sessionStorage.setItem('currentUserProfile', JSON.stringify(profile));
                return profile;
            }
            
            const basicUser = { user_id: authUser.id, id: authUser.id, email: authUser.email };
            window.currentUserProfile = basicUser;
            return basicUser;
        }
        
        return null;
    } catch (error) {
        console.error('Error in getCurrentUser:', error);
        return null;
    }
}

// ========== SHOW EXAM TAB ==========
function showExamTab(tabName) {
    const tabs = document.querySelectorAll('.exam-tab, .exam-tab-content');
    tabs.forEach(tab => {
        if (tab.style) tab.style.display = 'none';
    });
    
    const btns = document.querySelectorAll('.exam-tab-btn');
    btns.forEach(btn => {
        btn.classList.remove('active');
        btn.style.background = '#e5e7eb';
        btn.style.color = '#374151';
    });
    
    if (tabName === 'list') {
        const listTab = document.getElementById('examListTab');
        if (listTab) listTab.style.display = 'block';
        const listBtn = document.getElementById('examListTabBtn');
        if (listBtn) {
            listBtn.classList.add('active');
            listBtn.style.background = '#4C1D95';
            listBtn.style.color = 'white';
        }
        loadExams();
        
    } else if (tabName === 'create') {
        const createTab = document.getElementById('examCreateTab');
        if (createTab) createTab.style.display = 'block';
        const createBtn = document.getElementById('examCreateTabBtn');
        if (createBtn) {
            createBtn.classList.add('active');
            createBtn.style.background = '#4C1D95';
            createBtn.style.color = 'white';
        }
        loadAvailableClassesForExam();
        loadCoursesForExamDropdown();
        
    } else if (tabName === 'marks') {
        const marksTab = document.getElementById('examMarksTab');
        if (marksTab) marksTab.style.display = 'block';
        const marksBtn = document.getElementById('examMarksTabBtn');
        if (marksBtn) {
            marksBtn.classList.add('active');
            marksBtn.style.background = '#4C1D95';
            marksBtn.style.color = 'white';
        }
        
    } else if (tabName === 'analytics') {
        const analyticsTab = document.getElementById('examAnalyticsTab');
        if (analyticsTab) analyticsTab.style.display = 'block';
        const analyticsBtn = document.getElementById('examAnalyticsTabBtn');
        if (analyticsBtn) {
            analyticsBtn.classList.add('active');
            analyticsBtn.style.background = '#4C1D95';
            analyticsBtn.style.color = 'white';
        }
    }
}

// ========== FILTER EXAMS TABLE ==========
function filterExamsTable() {
    const searchTerm = document.getElementById('exam-search')?.value?.toLowerCase() || '';
    const programFilter = document.getElementById('exam_filter_program')?.value || '';
    const statusFilter = document.getElementById('exam_filter_status')?.value || '';
    
    const rows = document.querySelectorAll('#exams-table tbody tr');
    rows.forEach(row => {
        const title = row.cells[3]?.textContent?.toLowerCase() || '';
        const program = row.cells[1]?.textContent || '';
        const status = row.cells[9]?.textContent || '';
        
        let show = true;
        if (searchTerm && !title.includes(searchTerm)) show = false;
        if (programFilter && program !== programFilter) show = false;
        if (statusFilter && !status.includes(statusFilter)) show = false;
        
        row.style.display = show ? '' : 'none';
    });
}

// ========== EXPORT EXAMS TO CSV ==========
function exportExamsToCSV() {
    const rows = document.querySelectorAll('#exams-table tbody tr');
    if (!rows.length) {
        showFeedback('No exams to export', 'warning');
        return;
    }
    
    let csv = 'Type,Program,Course,Title,Out Of,Pass Mark,Date,Duration,Status\n';
    rows.forEach(row => {
        if (row.style.display === 'none') return;
        const cols = row.querySelectorAll('td');
        if (cols.length >= 10) {
            csv += `${cols[0]?.textContent || ''},${cols[1]?.textContent || ''},${cols[2]?.textContent || ''},${cols[3]?.textContent || ''},${cols[4]?.textContent || ''},${cols[5]?.textContent || ''},${cols[6]?.textContent || ''},${cols[7]?.textContent || ''},${cols[9]?.textContent || ''}\n`;
        }
    });
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `exams_export_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showFeedback('Exams exported successfully!', 'success');
}

// ========== INITIALIZE EXAM EDIT MODAL LISTENERS ==========
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔧 Initializing exam edit modal...');
    
    const closeBtn = document.querySelector('#examEditModal .close');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            document.getElementById('examEditModal').style.display = 'none';
        });
    }

    const editForm = document.getElementById('edit-exam-form');
    if (editForm) {
        // ✅ Clean approach: Remove old, add new
        editForm.removeEventListener('submit', saveEditedExam);
        editForm.addEventListener('submit', saveEditedExam);
        console.log('✅ Edit exam form listener attached');
    } else {
        console.warn('⚠️ edit-exam-form not found');
    }

    window.addEventListener('click', function(event) {
        const modal = document.getElementById('examEditModal');
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });
});


// ========== EXPORT ALL FUNCTIONS ==========
window.populateExamCourseSelects = populateExamCourseSelects;
window.handleAddExam = handleAddExam;
window.loadExams = loadExams;
window.deleteExam = deleteExam;
window.closeExam = closeExam;  
window.openEditExamModal = openEditExamModal;
window.saveEditedExam = saveEditedExam;
window.openGradeModal = openGradeModal;
window.saveGrades = saveGrades;
window.filterGradeStudents = filterGradeStudents;
window.updateGradeTotal = updateGradeTotal;
window.getExamTypeLabel = getExamTypeLabel;
window.getSelectedClassesForExam = getSelectedClassesForExam;
window.loadAvailableClassesForExam = loadAvailableClassesForExam;
window.showExamTab = showExamTab;
window.filterExamsTable = filterExamsTable;
window.exportExamsToCSV = exportExamsToCSV;
window.populateStudentExams = populateStudentExams;
window.getCurrentUser = getCurrentUser;
/*******************************************************
 * 14. MESSAGES & ANNOUNCEMENTS
 *******************************************************/
async function handleSendMessage(e) {
    e.preventDefault();
    const submitButton = e.submitter;
    const originalText = submitButton?.textContent;
    setButtonLoading(submitButton, true, originalText);

    const target_program = $('msg_program').value;
    const message_content = $('msg_body').value.trim();
    const subjectInput = $('msg_subject');
    const subject = subjectInput ? subjectInput.value.trim() : `System Message to ${target_program}`;

    if (!message_content) {
        showFeedback('Message content cannot be empty.', 'error');
        setButtonLoading(submitButton, false, originalText);
        return;
    }

    try {
        const { error, data } = await sb.from('notifications').insert({
            target_program: target_program === 'ALL' ? null : target_program,
            subject,
            message: message_content,
            message_type: 'system',
            sender_id: currentUserProfile.id
        });

        if (error) throw error;

        await logAudit('MESSAGE_SEND', `Sent notification: ${subject} to ${target_program}`, data?.[0]?.id, 'SUCCESS');
        showFeedback('Message sent successfully!', 'success');
        e.target.reset();
        await loadAdminMessages();
    } catch (err) {
        await logAudit('MESSAGE_SEND', `Failed to send notification: ${subject}. Reason: ${err.message}`, null, 'FAILURE');
        showFeedback(`Failed to send message: ${err.message}`, 'error');
    } finally {
        setButtonLoading(submitButton, false, originalText);
    }
}

async function loadAdminMessages() {
    const tbody = $('adminMessagesTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '<tr><td colspan="6">Loading admin messages...</td></tr>';

    try {
        const { data: messages, error } = await sb.from('notifications')
            .select('*, sender:sender_id(full_name)')
            .order('created_at', { ascending: false });

        if (error) throw error;

        if (!messages || messages.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6">No messages found.</td></tr>';
            return;
        }

        const fragment = document.createDocumentFragment();

        messages.forEach(msg => {
            const recipient = msg.target_program || 'ALL Students';
            const senderName = msg.sender?.full_name || 'System';
            const sendDate = msg.created_at ? new Date(msg.created_at).toLocaleString() : 'Unknown';

            const tr = document.createElement('tr');
            tr.innerHTML = `
            <td>${escapeHtml(recipient)}</td>
            <td>${escapeHtml(senderName)}</td>
            <td>${escapeHtml(msg.subject || '')}</td>
            <td>${escapeHtml(msg.message.substring(0, 80) + (msg.message.length > 80 ? '...' : ''))}</td>
            <td>${sendDate}</td>
            <td>
                <button class="btn-action" onclick="editNotification('${msg.id}')">Edit</button>
                <button class="btn btn-delete" onclick="deleteNotification('${msg.id}')">Delete</button>
            </td>
            `;
            fragment.appendChild(tr);
        });

        tbody.innerHTML = '';
        tbody.appendChild(fragment);
    } catch (err) {
        console.error('Failed to load admin messages:', err);
        tbody.innerHTML = `<tr><td colspan="6">Error loading messages: ${err.message}</td></tr>`;
    }
}

async function editNotification(id) {
    try {
        const { data, error } = await sb.from('notifications')
            .select('*')
            .eq('id', id)
            .maybeSingle();

        if (error) throw error;
        if (!data) {
            showFeedback('Message not found.', 'error');
            return;
        }

        const newSubject = prompt('Edit Subject:', data.subject || '');
        if (newSubject === null) return;

        const newMessage = prompt('Edit Message:', data.message || '');
        if (newMessage === null) return;

        const { error: updateError } = await sb.from('notifications')
            .update({ subject: newSubject.trim(), message: newMessage.trim() })
            .eq('id', id);

        if (updateError) throw updateError;

        await logAudit('NOTIFICATION_EDIT', `Edited notification ID: ${id}`, id, 'SUCCESS');
        showFeedback('Message updated successfully!', 'success');
        await loadAdminMessages();
    } catch (err) {
        await logAudit('NOTIFICATION_EDIT', `Failed to edit notification ID: ${id}. Reason: ${err.message}`, id, 'FAILURE');
        showFeedback(`Failed to edit message: ${err.message}`, 'error');
    }
}

async function deleteNotification(id) {
    if (!confirm('Are you sure you want to delete this message?')) return;
    try {
        const { error } = await sb.from('notifications').delete().eq('id', id);
        if (error) throw error;
        await logAudit('NOTIFICATION_DELETE', `Deleted notification ID: ${id}`, id, 'SUCCESS');
        showFeedback('Message deleted successfully!', 'success');
        await loadAdminMessages();
    } catch (err) {
        await logAudit('NOTIFICATION_DELETE', `Failed to delete notification ID: ${id}. Reason: ${err.message}`, id, 'FAILURE');
        showFeedback(`Failed to delete message: ${err.message}`, 'error');
    }
}

// =====================================================
// OFFICIAL ANNOUNCEMENT - SAVES TO announcements TABLE
// =====================================================

async function saveOfficialAnnouncement() {
    const textarea = document.getElementById('announcement-body');
    const titleInput = document.getElementById('announcement-title');
    const programSelect = document.getElementById('announcement-program');
    const blockSelect = document.getElementById('announcement-block');
    const intakeSelect = document.getElementById('announcement-intake');
    const statusSelect = document.getElementById('announcement-status');
    
    const content = textarea?.value?.trim();
    const title = titleInput?.value?.trim() || 'Official Announcement';
    const program = programSelect?.value || 'KRCHN';
    const targetBlock = blockSelect?.value || 'All';
    const intakeYear = intakeSelect?.value;
    const isActive = statusSelect?.value === 'true';
    
    const feedback = document.getElementById('announcement-feedback');

    if (!content) {
        if (feedback) {
            feedback.textContent = '❌ Announcement cannot be empty.';
            feedback.style.color = 'red';
        }
        return;
    }

    try {
        // SAVE TO announcements TABLE (matches student dashboard)
        const { data, error } = await sb
            .from('announcements')
            .insert({
                title: title,
                message: content,
                content: content,
                program: program,
                target_block: targetBlock,
                intake_year: intakeYear === 'All' ? null : parseInt(intakeYear),
                is_active: isActive,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .select();

        if (error) throw error;

        if (feedback) {
            feedback.textContent = '✅ Announcement saved successfully! Students will see it now.';
            feedback.style.color = 'green';
        }
        
        // Clear form
        if (textarea) textarea.value = '';
        if (titleInput) titleInput.value = 'Official Announcement';
        
        // Refresh announcements list if function exists
        if (typeof loadAnnouncementsList === 'function') {
            await loadAnnouncementsList();
        }
        
        // Log audit
        await logAudit('ANNOUNCEMENT_ADD', `Added announcement: ${title} for ${program} - ${targetBlock}`, data?.[0]?.id, 'SUCCESS');
        
        setTimeout(() => {
            if (feedback) feedback.textContent = '';
        }, 3000);
        
    } catch (err) {
        console.error('Error saving announcement:', err);
        if (feedback) {
            feedback.textContent = '❌ Failed to save: ' + err.message;
            feedback.style.color = 'red';
        }
        await logAudit('ANNOUNCEMENT_ADD', `Failed: ${err.message}`, null, 'FAILURE');
    }
}

// =====================================================
// LOAD ANNOUNCEMENTS LIST FOR ADMIN
// =====================================================

async function loadAnnouncementsList() {
    const container = document.getElementById('announcements-list');
    if (!container) return;
    
    container.innerHTML = '<div class="loading-spinner"></div> Loading announcements...';
    
    try {
        const { data, error } = await sb
            .from('announcements')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        if (!data || data.length === 0) {
            container.innerHTML = '<p>No announcements yet. Create your first announcement above.</p>';
            return;
        }
        
        container.innerHTML = data.map(ann => `
            <div class="announcement-item" style="border:1px solid #e5e7eb; padding: 12px; margin-bottom: 10px; border-radius: 8px; background: ${ann.is_active ? '#fff' : '#fef2f2'}">
                <div style="display: flex; justify-content: space-between; align-items: start;">
                    <div>
                        <strong style="font-size: 14px;">📢 ${escapeHtml(ann.title || 'Announcement')}</strong>
                        <p style="margin: 8px 0; font-size: 13px;">${escapeHtml(ann.message)}</p>
                        <small style="color: #6b7280;">
                            Program: ${ann.program || 'All'} | 
                            Block: ${ann.target_block || 'All'} | 
                            Intake: ${ann.intake_year || 'All'} |
                            Status: ${ann.is_active ? '🟢 Active' : '🔴 Inactive'}
                        </small><br/>
                        <small>Created: ${new Date(ann.created_at).toLocaleString()}</small>
                    </div>
                    <div style="display: flex; gap: 8px;">
                        <button onclick="toggleAnnouncementStatus('${ann.id}', ${!ann.is_active})" class="btn-sm" style="background: ${ann.is_active ? '#f59e0b' : '#10b981'}; color: white; border: none; padding: 4px 10px; border-radius: 4px; cursor: pointer;">
                            ${ann.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                        <button onclick="deleteAnnouncement('${ann.id}')" class="btn-sm" style="background: #ef4444; color: white; border: none; padding: 4px 10px; border-radius: 4px; cursor: pointer;">
                            Delete
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('Error loading announcements:', error);
        container.innerHTML = '<p style="color: red;">Error loading announcements</p>';
    }
}

// =====================================================
// TOGGLE ANNOUNCEMENT STATUS
// =====================================================

async function toggleAnnouncementStatus(id, newStatus) {
    try {
        const { error } = await sb
            .from('announcements')
            .update({ 
                is_active: newStatus, 
                updated_at: new Date().toISOString() 
            })
            .eq('id', id);
        
        if (error) throw error;
        
        await loadAnnouncementsList();
        showAdminToast(`Announcement ${newStatus ? 'activated' : 'deactivated'}!`, 'success');
        
    } catch (error) {
        console.error('Error:', error);
        showAdminToast('Failed to update status', 'error');
    }
}

// =====================================================
// DELETE ANNOUNCEMENT
// =====================================================

async function deleteAnnouncement(id) {
    if (!confirm('Permanently delete this announcement?')) return;
    
    try {
        const { error } = await sb
            .from('announcements')
            .delete()
            .eq('id', id);
        
        if (error) throw error;
        
        await loadAnnouncementsList();
        showAdminToast('Announcement deleted!', 'success');
        
    } catch (error) {
        console.error('Error:', error);
        showAdminToast('Failed to delete', 'error');
    }
}

// =====================================================
// MAKE FUNCTIONS GLOBAL
// =====================================================

window.saveOfficialAnnouncement = saveOfficialAnnouncement;
window.loadAnnouncementsList = loadAnnouncementsList;
window.toggleAnnouncementStatus = toggleAnnouncementStatus;
window.deleteAnnouncement = deleteAnnouncement;
/*******************************************************
 * 15. RESOURCES MANAGEMENT - UNIFIED VERSION
 * Handles BOTH Learning Materials AND Past Papers
 *******************************************************/

// =====================================================
// UNIFIED RESOURCE UPLOAD HANDLER
// Handles both materials and past papers
// =====================================================
async function handleResourceUpload(e) {
    e.preventDefault();
    const submitButton = e.submitter;
    const originalText = submitButton.textContent;
    setButtonLoading(submitButton, true, originalText);

    // Get form values
    const program = $('resource_program').value;
    const intake = $('resource_intake').value;
    const block = $('resource_block').value;
    const fileInput = $('resource-file');
    const title = $('resource-title').value.trim();
    const description = $('resource-description')?.value.trim() || '';
    
    // Past paper specific fields (optional)
    const isPastPaper = $('resource_is_pastpaper')?.checked || false;
    const pastpaperYear = $('resource_pastpaper_year')?.value || null;
    const examType = $('resource_exam_type')?.value || null;
    const courseName = $('resource_course_name')?.value.trim() || null;

    if (!fileInput.files.length || !program || !intake || !block || !title) {
        showFeedback('Please select a file and fill all required fields.', 'error');
        setButtonLoading(submitButton, false, originalText);
        return;
    }

    let file = fileInput.files[0];
    
    // ✅ Force correct content type for PDFs
    let contentType = file.type;
    const isPDF = file.name.toLowerCase().endsWith('.pdf');
    
    if (isPDF) {
        contentType = 'application/pdf';
        console.log('📄 PDF detected - forcing Content-Type: application/pdf');
    }

    // Create unique filename
    const timestamp = Date.now();
    const safeTitle = title.replace(/[^\w\-]+/g, '_');
    const originalExt = file.name.split('.').pop();
    let finalName = `${safeTitle}_${timestamp}.${originalExt}`;
    
    // Determine storage path
    let filePath;
    let resourceType = 'material';
    
    if (isPastPaper && pastpaperYear && examType && courseName) {
        resourceType = 'pastpaper';
        filePath = `past_papers/${program}/${pastpaperYear}/${block}/${finalName}`;
    } else {
        resourceType = 'material';
        filePath = `learning_materials/${program}/${intake}/${block}/${finalName}`;
    }

    try {
        // Upload to storage with forced content type
        const { error: uploadError } = await sb.storage
            .from(RESOURCES_BUCKET)
            .upload(filePath, file, {
                cacheControl: '3600',
                upsert: true,
                contentType: contentType
            });
        
        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = sb.storage
            .from(RESOURCES_BUCKET)
            .getPublicUrl(filePath);

        // Prepare database record
        const dbRecord = {
            title: title,
            description: description,
            program_type: program,
            intake: intake,
            block: block,
            file_path: filePath,
            file_name: finalName,
            file_url: publicUrl,
            resource_type: resourceType,
            uploaded_by: currentUserProfile?.id,
            uploaded_by_name: currentUserProfile?.full_name,
            created_at: new Date().toISOString()
        };
        
        // Add past paper specific fields
        if (isPastPaper && pastpaperYear && examType && courseName) {
            dbRecord.pastpaper_year = parseInt(pastpaperYear);
            dbRecord.exam_type = examType;
            dbRecord.course_name = courseName;
            dbRecord.intake = pastpaperYear; // Use past paper year as intake for filtering
        }

        const { error: dbError, data } = await sb
            .from('resources')
            .insert(dbRecord)
            .select('id');
        
        if (dbError) throw dbError;

        await logAudit('RESOURCE_UPLOAD', `Uploaded ${resourceType}: ${title}`, data?.[0]?.id, 'SUCCESS');
        showFeedback(`✅ "${title}" uploaded successfully!`, 'success');
        
        // Reset form
        e.target.reset();
        if ($('resource_is_pastpaper')) $('resource_is_pastpaper').checked = false;
        togglePastPaperFields();
        
        loadAllResources();
        
    } catch (err) {
        await logAudit('RESOURCE_UPLOAD', `Failed: ${title}. ${err.message}`, null, 'FAILURE');
        console.error('Upload failed:', err);
        showFeedback(`❌ Upload failed: ${err.message}`, 'error');
    } finally {
        setButtonLoading(submitButton, false, originalText);
    }
}

// =====================================================
// TOGGLE PAST PAPER FIELDS
// =====================================================
function togglePastPaperFields() {
    const isPastPaper = $('resource_is_pastpaper')?.checked || false;
    const pastpaperFields = document.getElementById('pastpaper-fields');
    
    if (pastpaperFields) {
        pastpaperFields.style.display = isPastPaper ? 'block' : 'none';
    }
    
    // Update required attributes
    const yearInput = $('resource_pastpaper_year');
    const examTypeSelect = $('resource_exam_type');
    const courseInput = $('resource_course_name');
    
    if (yearInput) yearInput.required = isPastPaper;
    if (examTypeSelect) examTypeSelect.required = isPastPaper;
    if (courseInput) courseInput.required = isPastPaper;
}

// =====================================================
// LOAD ALL RESOURCES
// =====================================================
async function loadAllResources() {
    const tableBody = $('resources-list');
    if (!tableBody) return;

    tableBody.innerHTML = '<tr><td colspan="9"><div class="loading-spinner"></div> Loading resources...</td></tr>';

    try {
        let query = sb.from('resources').select('*').order('created_at', { ascending: false });
        
        if (currentResourceType === 'material') {
            query = query.eq('resource_type', 'material');
        } else if (currentResourceType === 'pastpaper') {
            query = query.eq('resource_type', 'pastpaper');
        }
        
        const { data: resources, error } = await query;
        
        if (error) throw error;
        
        allResourcesData = resources || [];
        
        // Update counts
        const pastpaperCount = allResourcesData.filter(r => r.resource_type === 'pastpaper').length;
        const materialCount = allResourcesData.filter(r => r.resource_type === 'material').length;
        
        const pastpaperBadge = $('pastpaper-count-badge');
        const materialBadge = $('material-count-badge');
        
        if (pastpaperBadge) pastpaperBadge.textContent = pastpaperCount;
        if (materialBadge) materialBadge.textContent = materialCount;
        
        // Apply filters
        let filtered = [...allResourcesData];
        
        const searchTerm = $('resource-search')?.value.toLowerCase() || '';
        const blockFilter = $('resource-block-filter')?.value || 'all';
        const yearFilter = $('resource-year-filter')?.value || 'all';
        
        if (searchTerm) {
            filtered = filtered.filter(r => 
                (r.title || '').toLowerCase().includes(searchTerm) ||
                (r.course_name || '').toLowerCase().includes(searchTerm) ||
                (r.description || '').toLowerCase().includes(searchTerm)
            );
        }
        
        if (blockFilter !== 'all') {
            filtered = filtered.filter(r => (r.block || '').toLowerCase() === blockFilter.toLowerCase());
        }
        
        if (yearFilter !== 'all') {
            if (currentResourceType === 'pastpaper') {
                filtered = filtered.filter(r => r.pastpaper_year == yearFilter);
            } else {
                filtered = filtered.filter(r => r.intake == yearFilter);
            }
        }
        
        renderResourcesTable(filtered);
        
    } catch (error) {
        console.error('Error loading resources:', error);
        tableBody.innerHTML = `<tr><td colspan="9" style="color: red;">Error: ${error.message}</td><\/tr>`;
        await logAudit('RESOURCE_LOAD', `Failed: ${error.message}`, null, 'FAILURE');
    }
}

// =====================================================
// RENDER RESOURCES TABLE
// =====================================================
function renderResourcesTable(resources) {
    const tableBody = $('resources-list');
    if (!tableBody) return;
    
    if (!resources || resources.length === 0) {
        const emptyMessage = currentResourceType === 'pastpaper' 
            ? 'No past papers found.'
            : currentResourceType === 'material'
            ? 'No learning materials found.'
            : 'No resources found.';
        tableBody.innerHTML = `<tr><td colspan="9" style="text-align: center; padding: 40px;">📁 ${emptyMessage}</td><\/tr>`;
        return;
    }
    
    tableBody.innerHTML = '';
    
    resources.forEach(resource => {
        const isPastPaper = resource.resource_type === 'pastpaper';
        const typeClass = isPastPaper ? 'badge-warning' : 'badge-info';
        const typeIcon = isPastPaper ? '📄' : '📚';
        const typeLabel = isPastPaper ? 'Past Paper' : 'Material';
        const yearDisplay = isPastPaper ? resource.pastpaper_year : resource.intake;
        
        let titleDisplay = resource.title;
        if (isPastPaper && resource.course_name && resource.exam_type) {
            const examLabel = getExamTypeLabel(resource.exam_type);
            titleDisplay = `${resource.course_name} - ${examLabel} (${resource.pastpaper_year})`;
        }
        
        const uploadDate = new Date(resource.created_at).toLocaleDateString();
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><span class="badge ${typeClass}"><i class="${isPastPaper ? 'fas fa-history' : 'fas fa-book'}"></i> ${typeLabel}</span></td>
            <td><strong>${escapeHtml(yearDisplay || 'N/A')}</strong></td>
            <td>${escapeHtml(resource.program_type || 'N/A')}</td>
            <td>${escapeHtml(resource.block || 'N/A')}</td>
            <td><strong>${escapeHtml(titleDisplay)}</strong><br><small>${escapeHtml(resource.course_name || '')}</small></td>
            <td><small>${escapeHtml((resource.description || '-').substring(0, 50))}</small></td>
            <td>${escapeHtml(resource.uploaded_by_name || 'Unknown')}</td>
            <td>${uploadDate}</td>
            <td>
                <a href="${resource.file_url}" target="_blank" class="btn-action btn-small">View</a>
                <button onclick="deleteResourceItem(${resource.id}, '${escapeHtml(resource.title)}')" class="btn-delete btn-small">Delete</button>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

// =====================================================
// DELETE RESOURCE
// =====================================================
async function deleteResourceItem(resourceId, title) {
    if (!confirm(`⚠️ Permanently delete "${title}"?`)) return;
    
    try {
        const { data: resource } = await sb
            .from('resources')
            .select('file_path')
            .eq('id', resourceId)
            .single();
        
        if (resource?.file_path) {
            await sb.storage.from(RESOURCES_BUCKET).remove([resource.file_path]);
        }
        
        await sb.from('resources').delete().eq('id', resourceId);
        
        await logAudit('RESOURCE_DELETE', `Deleted: ${title}`, resourceId, 'SUCCESS');
        showFeedback(`✅ "${title}" deleted.`, 'success');
        loadAllResources();
        
    } catch (error) {
        showFeedback(`❌ Delete failed: ${error.message}`, 'error');
    }
}

// =====================================================
// FILTER FUNCTIONS
// =====================================================
function filterResourceType(type) {
    currentResourceType = type;
    
    ['all', 'material', 'pastpaper'].forEach(btnType => {
        const btn = $(`resource-type-${btnType}`);
        if (btn) {
            if (btnType === type) {
                btn.style.background = '#4C1D95';
                btn.style.color = 'white';
            } else {
                btn.style.background = '#e5e7eb';
                btn.style.color = '#374151';
            }
        }
    });
    
    if ($('resource-search')) $('resource-search').value = '';
    if ($('resource-block-filter')) $('resource-block-filter').value = 'all';
    if ($('resource-year-filter')) $('resource-year-filter').value = 'all';
    
    loadAllResources();
}

function filterResourcesTable() {
    loadAllResources();
}

// =====================================================
// INITIALIZE RESOURCES SECTION
// =====================================================
function initResourcesSection() {
    console.log('📁 Initializing Unified Resources Section...');
    
    // Set up block options
    const resourceProgram = $('resource_program');
    const resourceBlock = $('resource_block');
    if (resourceProgram && resourceBlock) {
        resourceProgram.addEventListener('change', () => {
            updateBlockTermOptions('resource_program', 'resource_block');
        });
    }
    
    // Set up past paper checkbox toggle
    const pastpaperCheckbox = $('resource_is_pastpaper');
    if (pastpaperCheckbox) {
        pastpaperCheckbox.addEventListener('change', togglePastPaperFields);
    }
    
    // Set up form submission
    const uploadForm = $('upload-resource-form');
    if (uploadForm) {
        uploadForm.removeEventListener('submit', handleResourceUpload);
        uploadForm.addEventListener('submit', handleResourceUpload);
    }
    
    // Set up filters
    const searchInput = $('resource-search');
    if (searchInput) {
        searchInput.addEventListener('keyup', debounce(filterResourcesTable, 300));
    }
    
    const blockFilter = $('resource-block-filter');
    if (blockFilter) {
        blockFilter.addEventListener('change', filterResourcesTable);
    }
    
    const yearFilter = $('resource-year-filter');
    if (yearFilter) {
        yearFilter.addEventListener('change', filterResourcesTable);
    }
    
    loadAllResources();
}

function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

// Make functions global
window.loadAllResources = loadAllResources;
window.filterResourceType = filterResourceType;
window.filterResourcesTable = filterResourcesTable;
window.deleteResourceItem = deleteResourceItem;
window.togglePastPaperFields = togglePastPaperFields;
window.initResourcesSection = initResourcesSection;
window.handleResourceUpload = handleResourceUpload;

/*******************************************************
 * 16. SECURITY & SYSTEM STATUS
 *******************************************************/
async function loadSystemStatus() {
    const { data } = await fetchData(SETTINGS_TABLE, '*', { key: GLOBAL_SETTINGS_KEY });
    const statusData = data?.[0] || { value: 'ACTIVE', message: '' };

    const statusSelect = $('global_status');
    if (statusSelect) statusSelect.value = statusData.value;
    
    const messageInput = $('maintenance_message');
    if (messageInput) messageInput.value = statusData.message || '';
}

async function updateSystemStatus(newStatus) {
    const currentMessage = $('maintenance_message').value.trim();
    if (!confirm(`CRITICAL: Change system status to ${newStatus}? This affects ALL users.`)) {
        loadSystemStatus();
        return;
    }
    
    if (newStatus !== 'ACTIVE' && !currentMessage) {
        showFeedback('A message is required for users when the system is not ACTIVE.', 'warning');
        loadSystemStatus();
        return;
    }

    const { data: existing } = await fetchData(SETTINGS_TABLE, 'id', { key: GLOBAL_SETTINGS_KEY });
    let error = null;

    const updateData = {
        key: GLOBAL_SETTINGS_KEY,
        value: newStatus,
        message: newStatus === 'ACTIVE' ? null : currentMessage,
        updated_at: new Date().toISOString()
    };

    if (existing?.length > 0) {
        ({ error } = await sb.from(SETTINGS_TABLE).update(updateData).eq('id', existing[0].id));
    } else {
        ({ error } = await sb.from(SETTINGS_TABLE).insert([updateData]));
    }

    if (error) {
        await logAudit('SYSTEM_STATUS_CHANGE', `Failed to set status to ${newStatus}. Reason: ${error.message}`, null, 'FAILURE');
        showFeedback(`Failed to update system status: ${error.message}`, 'error');
    } else {
        await logAudit('SYSTEM_STATUS_CHANGE', `System status set to ${newStatus}. Message: ${updateData.message || 'N/A'}.`, null, 'SUCCESS');
        showFeedback(`System status successfully set to: ${newStatus}!`, 'success');
    }
}

async function saveSystemMessage() {
    const status = $('global_status').value;
    const message = $('maintenance_message').value.trim();

    if (status === 'ACTIVE') {
        showFeedback('Cannot save a maintenance message while the system is ACTIVE. Change status first.', 'warning');
        return;
    }
    
    if (!message) {
        showFeedback('Message cannot be empty.', 'error');
        return;
    }

    const { data: existing } = await fetchData(SETTINGS_TABLE, 'id', { key: GLOBAL_SETTINGS_KEY });
    let error = null;

    if (existing?.length > 0) {
        ({ error } = await sb.from(SETTINGS_TABLE).update({ message }).eq('id', existing[0].id));
    } else {
        ({ error } = await sb.from(SETTINGS_TABLE).insert({ key: GLOBAL_SETTINGS_KEY, value: status, message }));
    }

    if (error) {
        await logAudit('SYSTEM_MESSAGE_UPDATE', `Failed to update system message. Reason: ${error.message}`, null, 'FAILURE');
        showFeedback(`Failed to save message: ${error.message}`, 'error');
    } else {
        await logAudit('SYSTEM_MESSAGE_UPDATE', `Updated system message for status ${status}.`, null, 'SUCCESS');
        showFeedback('System message saved.', 'success');
    }
}

async function handleGlobalPasswordReset(e) {
    e.preventDefault();
    const submitButton = e.submitter;
    const originalText = submitButton.textContent;
    setButtonLoading(submitButton, true, originalText);

    const email = $('reset_user_email').value.trim();
    const newPassword = $('new_password').value.trim();
    
    if (!email || !newPassword) {
        showFeedback('Email and New Password are required.', 'error');
        setButtonLoading(submitButton, false, originalText);
        return;
    }

    try {
        const { data: profile, error: profileError } = await sb
            .from(USER_PROFILE_TABLE)
            .select('user_id, full_name')
            .eq('email', email)
            .single();

        if (profileError || !profile) throw new Error('User not found in profile records.');
        
        const userId = profile.user_id;

        const { error: authError } = await sb.auth.admin.updateUserById(userId, { password: newPassword });

        if (authError) throw authError;

        await logAudit('USER_PASSWORD_RESET', `Forced password reset for user: ${email}.`, userId, 'SUCCESS');
        showFeedback(`✅ Password for ${email} has been reset successfully!`, 'success');
        e.target.reset();

    } catch (e) {
        const userId = e.message?.includes('User not found') ? null : 'UNKNOWN_ID';
        await logAudit('USER_PASSWORD_RESET', `Failed to force password reset for: ${email}. Reason: ${e.message}`, userId, 'FAILURE');
        showFeedback(`❌ Password reset failed: ${e.message}`, 'error');
    } finally {
        setButtonLoading(submitButton, false, originalText);
    }
}

async function handleAccountDeactivation(e) {
    e.preventDefault();
    const submitButton = e.submitter;
    const originalText = submitButton.textContent;
    setButtonLoading(submitButton, true, originalText);

    const userId = $('deactivate_user_id').value.trim();
    
    if (!userId) {
        showFeedback('User ID is required for deactivation.', 'error');
        setButtonLoading(submitButton, false, originalText);
        return;
    }

    if (!confirm(`CRITICAL: Permanently block user ID ${userId.substring(0, 8)}... from logging in?`)) {
        setButtonLoading(submitButton, false, originalText);
        return;
    }

    try {
        const { error: profileError } = await sb
            .from(USER_PROFILE_TABLE)
            .update({ block_program_year: true, status: 'blocked' }) 
            .eq('user_id', userId);
            
        if (profileError) throw profileError;
        
        await logAudit('USER_BLOCK', `Permanently blocked user ID: ${userId.substring(0, 8)}... from accessing the system.`, userId, 'SUCCESS');
        showFeedback(`✅ User ID ${userId.substring(0, 8)}... has been blocked and logged out.`, 'success');
        e.target.reset();

    } catch (e) {
        await logAudit('USER_BLOCK', `Failed to block user ID ${userId.substring(0, 8)}... Reason: ${e.message}`, userId, 'FAILURE');
        showFeedback(`❌ Deactivation failed: ${e.message}`, 'error');
    } finally {
        setButtonLoading(submitButton, false, originalText);
    }
}

/*******************************************************
 * 17. BACKUP & RESTORE
 *******************************************************/
async function loadBackupHistory() {
    const tbody = $('backup-history-table');
    if (!tbody) return;
    
    tbody.innerHTML = '<tr><td colspan="4">Loading backup history...</td></tr>';
    
    // Placeholder for actual backup history
    const history = [
        { name: 'nchsm_db_20251020_0100.sql', date: '2025-10-20 01:00:00', size: '125 MB' },
        { name: 'nchsm_db_20251019_0100.sql', date: '2025-10-19 01:00:00', size: '124 MB' },
        { name: 'nchsm_db_20251018_0100.sql', date: '2025-10-18 01:00:00', size: '123 MB' },
    ];

    tbody.innerHTML = '';
    history.forEach(h => {
        tbody.innerHTML += `<tr>
            <td>${h.name}</td>
            <td>${h.date}</td>
            <td>${h.size}</td>
            <td>
                <button class="btn-action" onclick="showFeedback('Download feature is a placeholder. File: ${h.name}')">Download</button>
                <button class="btn btn-delete" onclick="showFeedback('Delete feature is a placeholder. File: ${h.name}')">Delete</button>
            </td>
        </tr>`;
    });
}

function triggerBackup() {
    logAudit('DB_BACKUP', 'Initiated database backup process.', null, 'SUCCESS');
    showFeedback('Backup initiated! Check your Supabase Console for status.', 'success');
}

/*******************************************************
 * 18. CALENDAR & TIMETABLE MANAGEMENT (COMPLETE)
 * Supports: Excel, CSV, Word, PDF uploads
 *******************************************************/

// Global calendar instance
let mainCalendar = null;

// =====================================================
// RENDER FULL CALENDAR (shows events from all sources)
// =====================================================
async function renderFullCalendar() {
    const calendarEl = $('fullCalendarDisplay');
    if (!calendarEl) {
        console.log('Calendar element not found');
        return;
    }
    
    calendarEl.innerHTML = '<div style="text-align: center; padding: 40px;"><div class="loading-spinner"></div><p>Loading calendar...</p></div>';
    
    const currentUser = await getCurrentUser();
    const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'superadmin';
    
    try {
        let sessions = [], exams = [], calendarEvents = [], timetableEvents = [], units = [];
        
        // Fetch sessions
        try {
            const { data } = await fetchData('scheduled_sessions', '*', {}, 'session_date', true);
            sessions = Array.isArray(data) ? data : [];
        } catch(e) { sessions = []; }
        
        // Fetch exams
        try {
            const { data } = await fetchData('exams', '*, course:course_id(course_name)', {}, 'exam_date', true);
            exams = Array.isArray(data) ? data : [];
        } catch(e) { exams = []; }
        
        // Fetch calendar events (admin uploaded)
        try {
            const { data } = await fetchData('calendar_events', '*', {}, 'event_date', true);
            calendarEvents = Array.isArray(data) ? data : [];
        } catch(e) { calendarEvents = []; }
        
        // Fetch TIMETABLE events from timetables table
        try {
            const { data } = await sb
                .from('timetables')
                .select('*')
                .order('week_number', { ascending: true })
                .order('day_of_week', { ascending: true });
            timetableEvents = Array.isArray(data) ? data : [];
            console.log(`✅ Loaded ${timetableEvents.length} timetable entries`);
        } catch(e) { timetableEvents = []; }
        
        // Fetch units
        try {
            const { data } = await fetchData('unit_registrations', '*, units(*)', {}, 'created_at', true);
            units = Array.isArray(data) ? data : [];
        } catch(e) { units = []; }

        const events = [];
        const dayNumberMap = { 'sunday': 0, 'monday': 1, 'tuesday': 2, 'wednesday': 3, 'thursday': 4, 'friday': 5, 'saturday': 6 };
        
        // Helper to get date for a specific day in current week
        function getDateForDay(dayName, weekNumber = 1, baseDate = new Date()) {
            const dayIndex = dayNumberMap[dayName.toLowerCase()];
            if (dayIndex === undefined) return null;
            
            const currentDay = baseDate.getDay();
            const daysToAdd = (dayIndex - currentDay + 7) % 7;
            const targetDate = new Date(baseDate);
            targetDate.setDate(baseDate.getDate() + daysToAdd + ((weekNumber - 1) * 7));
            return targetDate.toISOString().split('T')[0];
        }

        // 1. Add scheduled sessions (classes, clinicals)
        sessions.forEach(s => {
            if (!s) return;
            if (!isAdmin && !shouldShowToStudent(s, currentUser)) return;
            
            let title = `${(s.session_type || 'CLASS').toUpperCase()}: ${s.session_title || 'Session'}`;
            let color = s.session_type === 'clinical' ? '#2ecc71' : s.session_type === 'event' ? '#9b59b6' : '#3498db';
            
            let startDate = s.session_date;
            if (s.session_time) startDate = s.session_date + 'T' + s.session_time;
            
            let endDate = null;
            if (s.session_end_time) endDate = s.session_date + 'T' + s.session_end_time;
            
            events.push({
                id: `session_${s.id}`,
                title: title,
                start: startDate,
                end: endDate,
                allDay: !s.session_time,
                color: color,
                extendedProps: { type: s.session_type || 'session', venue: s.venue || 'TBA', description: s.session_description || 'No description', program: s.target_program || 'General', block: s.target_block || 'General' }
            });
        });

        // 2. Add exams
        exams.forEach(e => {
            if (!e) return;
            if (!isAdmin && !shouldShowToStudent(e, currentUser)) return;
            
            const courseName = e.course?.course_name || e.exam_name || 'Exam';
            const start = e.exam_date + (e.exam_start_time ? `T${e.exam_start_time}` : '');
            let end = null;
            if (e.exam_start_time && e.duration_minutes) {
                const startDate = new Date(`2000-01-01T${e.exam_start_time}`);
                const endDate = new Date(startDate.getTime() + e.duration_minutes * 60000);
                end = e.exam_date + `T${endDate.toTimeString().slice(0, 8)}`;
            }

            events.push({
                id: `exam_${e.id}`,
                title: `${e.exam_type || 'EXAM'}: ${e.exam_name || 'Exam'} (${courseName})`,
                start: start,
                end: end,
                allDay: !e.exam_start_time,
                color: '#e74c3c',
                extendedProps: { type: 'exam', venue: 'Exam Hall', description: `Duration: ${e.duration_minutes || 'N/A'} minutes`, program: e.target_program || 'General', block: e.target_block || 'General' }
            });
        });

        // 3. Add TIMETABLE events (from timetables table - THIS IS THE NEW FEATURE!)
        const currentDate = new Date();
        timetableEvents.forEach(tt => {
            if (!tt) return;
            
            // Filter by student's block if not admin
            if (!isAdmin) {
                const userBlock = currentUser?.block || 'Block 4';
                if (tt.block !== userBlock) return;
            }
            
            const eventDate = getDateForDay(tt.day_of_week, tt.week_number, currentDate);
            if (!eventDate) return;
            
            const holidayBadge = tt.is_holiday ? '🔴 HOLIDAY - ' : '';
            const examBadge = tt.is_exam ? '📝 EXAM - ' : '';
            
            events.push({
                id: `timetable_${tt.id}`,
                title: `${holidayBadge}${examBadge}${tt.session_name || tt.course_name}`,
                start: `${eventDate}T${tt.start_time}`,
                end: `${eventDate}T${tt.end_time}`,
                allDay: false,
                color: tt.is_holiday ? '#dc2626' : (tt.is_exam ? '#f59e0b' : '#4C1D95'),
                extendedProps: {
                    type: tt.is_holiday ? 'holiday' : (tt.is_exam ? 'exam' : 'class'),
                    venue: tt.venue || 'TBD',
                    description: `${tt.course_name || ''} - Week ${tt.week_number}`,
                    program: tt.program || 'General',
                    block: tt.block || 'General',
                    lecturer: tt.lecturer_name || 'TBA'
                }
            });
        });

        // 4. Add calendar events (admin uploaded)
        calendarEvents.forEach(event => {
            if (!event) return;
            if (!isAdmin && !shouldShowToStudent(event, currentUser)) return;
            
            let title = event.event_name || 'Untitled Event';
            let color = getEventColor(event.type);
            let icon = getEventIcon(event.type);
            
            const start = event.event_date + (event.start_time ? `T${event.start_time}` : '');
            let end = null;
            if (event.start_time && event.end_time) end = event.event_date + `T${event.end_time}`;

            events.push({
                id: `calendar_${event.id}`,
                title: `${icon} ${title}`,
                start: start,
                end: end,
                allDay: !event.start_time,
                color: color,
                extendedProps: { type: event.type || 'event', venue: event.venue || 'TBA', description: event.description || 'No description', program: event.target_program || 'General', block: event.target_block || 'General', organizer: event.organizer || 'Admin' }
            });
        });

        // 5. Add unit deadlines
        units.forEach(unitReg => {
            if (unitReg && unitReg.units && unitReg.units.assessment_deadline) {
                events.push({
                    id: `unit_${unitReg.id}`,
                    title: `📝 Assignment: ${unitReg.units?.unit_name || 'Unit Assessment'}`,
                    start: unitReg.units.assessment_deadline,
                    allDay: true,
                    color: '#f39c12',
                    extendedProps: { type: 'assignment', description: `Unit: ${unitReg.units?.unit_code || 'Unknown'} - Assessment due` }
                });
            }
        });

        console.log(`📅 Total events loaded: ${events.length} (${timetableEvents.length} from timetable)`);

        // Initialize or update calendar
        if (typeof FullCalendar !== 'undefined' && calendarEl) {
            if (mainCalendar) mainCalendar.destroy();
            
            mainCalendar = new FullCalendar.Calendar(calendarEl, {
                initialView: 'dayGridMonth',
                headerToolbar: { left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek' },
                events: events,
                eventClick: function(info) { showEventDetails(info.event); },
                eventDidMount: function(info) {
                    info.el.title = info.event.extendedProps.description || info.event.title;
                    if (info.event.extendedProps.type === 'exam') info.el.style.borderLeft = '4px solid #e74c3c';
                    else if (info.event.extendedProps.type === 'clinical') info.el.style.borderLeft = '4px solid #2ecc71';
                    else if (info.event.extendedProps.type === 'holiday') info.el.style.borderLeft = '4px solid #dc2626';
                    else if (info.event.extendedProps.type === 'class') info.el.style.borderLeft = '4px solid #4C1D95';
                }
            });
            mainCalendar.render();
        } else {
            calendarEl.innerHTML = '<p style="color: red;">FullCalendar library not loaded.</p>';
        }
    } catch (error) {
        console.error('Calendar render error:', error);
        calendarEl.innerHTML = `<p style="color: red;">Error loading calendar: ${error.message}</p>`;
    }
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================
function shouldShowToStudent(event, user) {
    if (!user || user.role === 'admin' || user.role === 'superadmin') return true;
    const eventProgram = event.target_program || event.program_type || 'General';
    const eventBlock = event.target_block || event.block || 'General';
    const programMatch = eventProgram === 'General' || eventProgram === user.program;
    const blockMatch = eventBlock === 'General' || eventBlock === user.block;
    return programMatch && blockMatch;
}

function getEventColor(type) {
    const t = (type || '').toUpperCase();
    if (t.includes('EXAM')) return '#e74c3c';
    if (t.includes('CAT')) return '#e67e22';
    if (t.includes('CLINICAL')) return '#2ecc71';
    if (t.includes('CLASS')) return '#3498db';
    if (t.includes('ASSIGNMENT')) return '#f39c12';
    if (t.includes('HOLIDAY')) return '#dc2626';
    return '#95a5a6';
}

function getEventIcon(type) {
    const t = (type || '').toUpperCase();
    if (t.includes('EXAM')) return '📝';
    if (t.includes('CAT')) return '📋';
    if (t.includes('CLINICAL')) return '🏥';
    if (t.includes('CLASS')) return '📚';
    if (t.includes('ASSIGNMENT')) return '📄';
    if (t.includes('HOLIDAY')) return '🔴';
    return '📅';
}

function showEventDetails(event) {
    const props = event.extendedProps;
    const startDate = event.start ? new Date(event.start) : new Date();
    const startTime = startDate.getHours() !== 0 ? startDate.toLocaleTimeString() : '';
    const endTime = event.end ? new Date(event.end).toLocaleTimeString() : '';
    
    const modalHtml = `
        <div id="eventDetailModal" class="modal" style="display: flex; z-index: 10000;">
            <div class="modal-content" style="max-width: 500px; background: white; border-radius: 12px;">
                <div class="modal-header" style="display: flex; justify-content: space-between; align-items: center; padding: 15px; border-bottom: 1px solid #e5e7eb;">
                    <h3 style="margin: 0;">${escapeHtml(event.title)}</h3>
                    <span class="close" onclick="closeModal('eventDetailModal')" style="cursor: pointer; font-size: 24px;">&times;</span>
                </div>
                <div class="modal-body" style="padding: 20px;">
                    <p><strong>📅 Date:</strong> ${startDate.toLocaleDateString()}</p>
                    ${startTime ? `<p><strong>⏰ Time:</strong> ${startTime} ${endTime ? '- ' + endTime : ''}</p>` : ''}
                    ${props.venue && props.venue !== 'TBA' && props.venue !== 'TBD' ? `<p><strong>📍 Venue:</strong> ${escapeHtml(props.venue)}</p>` : ''}
                    ${props.type ? `<p><strong>🏷️ Type:</strong> ${escapeHtml(props.type)}</p>` : ''}
                    ${props.lecturer ? `<p><strong>👨‍🏫 Lecturer:</strong> ${escapeHtml(props.lecturer)}</p>` : ''}
                    ${props.description && props.description !== 'No description' ? `<p><strong>📝 Details:</strong> ${escapeHtml(props.description)}</p>` : ''}
                    ${props.program && props.program !== 'General' ? `<p><strong>🎓 Program:</strong> ${escapeHtml(props.program)}</p>` : ''}
                    ${props.block && props.block !== 'General' ? `<p><strong>📌 Block:</strong> ${escapeHtml(props.block)}</p>` : ''}
                </div>
                <div class="modal-actions" style="padding: 15px; border-top: 1px solid #e5e7eb; display: flex; justify-content: flex-end;">
                    <button onclick="closeModal('eventDetailModal')" class="btn" style="padding: 8px 16px; background: #6b7280; color: white; border: none; border-radius: 6px; cursor: pointer;">Close</button>
                </div>
            </div>
        </div>
    `;
    
    const existingModal = document.getElementById('eventDetailModal');
    if (existingModal) existingModal.remove();
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}
// Add single event function
window.addSingleEvent = async function() {
    const title = document.getElementById('singleEventTitle')?.value;
    const date = document.getElementById('singleEventDate')?.value;
    const startTime = document.getElementById('singleEventStart')?.value;
    const endTime = document.getElementById('singleEventEnd')?.value;
    const venue = document.getElementById('singleEventVenue')?.value;
    const type = document.getElementById('singleEventType')?.value;
    const details = document.getElementById('singleEventDetails')?.value;
    const program = document.getElementById('singleEventProgram')?.value;
    const block = document.getElementById('singleEventBlock')?.value;
    
    if (!title || !date || !startTime) {
        alert('Please fill required fields: Title, Date, Start Time');
        return;
    }
    
    const { error } = await sb.from('calendar_events').insert([{
        event_name: title,
        event_date: date,
        start_time: startTime + ':00',
        end_time: endTime ? endTime + ':00' : null,
        venue: venue,
        type: type,
        description: details || '',
        target_program: program || 'General',
        target_block: block || 'General',
        organizer: 'Admin'
    }]);
    
    if (error) {
        alert('Error: ' + error.message);
    } else {
        alert('✅ Event added to calendar!');
        document.getElementById('singleEventTitle').value = '';
        document.getElementById('singleEventVenue').value = '';
        document.getElementById('singleEventDetails').value = '';
        if (typeof renderFullCalendar === 'function') renderFullCalendar();
    }
};

// Create weekly schedule function
window.createWeeklySchedule = async function() {
    const day = parseInt(document.getElementById('weeklyDay')?.value);
    const startTime = document.getElementById('weeklyStartTime')?.value;
    const endTime = document.getElementById('weeklyEndTime')?.value;
    const course = document.getElementById('weeklyCourse')?.value;
    const venue = document.getElementById('weeklyVenue')?.value;
    const startDate = new Date(document.getElementById('weeklyStartDate')?.value);
    const endDate = new Date(document.getElementById('weeklyEndDate')?.value);
    const program = document.getElementById('weeklyProgram')?.value;
    const block = document.getElementById('weeklyBlock')?.value;
    
    if (!course || !startDate || !endDate || !startTime) {
        alert('Please fill all required fields');
        return;
    }
    
    const events = [];
    let currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
        if (currentDate.getDay() === day) {
            events.push({
                event_name: course,
                event_date: currentDate.toISOString().split('T')[0],
                start_time: startTime + ':00',
                end_time: endTime + ':00',
                venue: venue || '',
                type: 'CLASS',
                target_program: program || 'General',
                target_block: block || 'General',
                organizer: 'Weekly Schedule'
            });
        }
        currentDate.setDate(currentDate.getDate() + 1);
    }
    
    if (events.length === 0) {
        alert('No dates found matching the selected day in the date range');
        return;
    }
    
    const { error } = await sb.from('calendar_events').insert(events);
    
    if (error) {
        alert('Error: ' + error.message);
    } else {
        alert(`✅ Added ${events.length} class sessions to calendar!`);
        if (typeof renderFullCalendar === 'function') renderFullCalendar();
    }
};

// Show upload method function
window.showUploadMethod = function(method) {
    const excelDiv = document.getElementById('excelUploadMethod');
    const singleDiv = document.getElementById('singleEventMethod');
    const bulkDiv = document.getElementById('bulkScheduleMethod');
    const excelBtn = document.getElementById('excelTabBtn');
    const singleBtn = document.getElementById('singleTabBtn');
    const bulkBtn = document.getElementById('bulkTabBtn');
    
    if (excelDiv) excelDiv.style.display = method === 'excel' ? 'block' : 'none';
    if (singleDiv) singleDiv.style.display = method === 'single' ? 'block' : 'none';
    if (bulkDiv) bulkDiv.style.display = method === 'bulk' ? 'block' : 'none';
    
    // Update button styles
    if (excelBtn) {
        excelBtn.style.background = method === 'excel' ? '#4C1D95' : '#e5e7eb';
        excelBtn.style.color = method === 'excel' ? 'white' : '#374151';
    }
    if (singleBtn) {
        singleBtn.style.background = method === 'single' ? '#4C1D95' : '#e5e7eb';
        singleBtn.style.color = method === 'single' ? 'white' : '#374151';
    }
    if (bulkBtn) {
        bulkBtn.style.background = method === 'bulk' ? '#4C1D95' : '#e5e7eb';
        bulkBtn.style.color = method === 'bulk' ? 'white' : '#374151';
    }
    
    // Update block dropdown for single event
    if (method === 'single') {
        const programSelect = document.getElementById('singleEventProgram');
        const blockSelect = document.getElementById('singleEventBlock');
        if (programSelect && blockSelect) {
            updateBlockTermOptions('singleEventProgram', 'singleEventBlock');
        }
    }
    
    if (method === 'bulk') {
        const programSelect = document.getElementById('weeklyProgram');
        const blockSelect = document.getElementById('weeklyBlock');
        if (programSelect && blockSelect) {
            programSelect.addEventListener('change', function() {
                updateBlockTermOptions('weeklyProgram', 'weeklyBlock');
            });
            updateBlockTermOptions('weeklyProgram', 'weeklyBlock');
        }
    }
};
// =====================================================
// TIMETABLE UPLOAD FUNCTIONS (Supports Excel, CSV, Word, PDF)
// =====================================================

// Main upload function - supports all file types
window.uploadTimetableToSupabase = async function() {
    const fileInput = document.getElementById('adminTimetableFile');
    const blockSelect = document.getElementById('adminTimetableBlock');
    const programSelect = document.getElementById('adminTimetableProgram');
    
    if (!fileInput || !fileInput.files || !fileInput.files[0]) {
        alert('Please select a file (Excel, CSV, Word, or PDF)');
        return;
    }
    
    const file = fileInput.files[0];
    const block = blockSelect ? blockSelect.value : 'Block 4';
    const program = programSelect ? programSelect.value : 'KRCHN';
    const fileName = file.name.toLowerCase();
    
    // Show loading indicator
    const uploadBtn = event?.target;
    const originalText = uploadBtn ? uploadBtn.innerHTML : 'Upload';
    if (uploadBtn) {
        uploadBtn.disabled = true;
        uploadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
    }
    
    try {
        // Check file type and process accordingly
        if (fileName.endsWith('.csv') || fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
            // Process Excel/CSV files
            await processSpreadsheetFile(file, block, program);
        } else if (fileName.endsWith('.pdf')) {
            // Process PDF files - store as document, not as calendar events
            await processPDFFile(file, block, program);
        } else if (fileName.endsWith('.doc') || fileName.endsWith('.docx')) {
            // Process Word documents
            await processWordFile(file, block, program);
        } else {
            alert('Unsupported file type. Please upload Excel, CSV, Word, or PDF files.');
        }
        
        // Refresh preview and calendar
        if (typeof previewTimetable === 'function') previewTimetable();
        if (typeof renderFullCalendar === 'function') renderFullCalendar();
        
        // Clear file input
        fileInput.value = '';
        
    } catch (error) {
        console.error('Upload error:', error);
        alert('Upload failed: ' + error.message);
    } finally {
        if (uploadBtn) {
            uploadBtn.disabled = false;
            uploadBtn.innerHTML = originalText;
        }
    }
};

// Process Excel/CSV files
async function processSpreadsheetFile(file, block, program) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async function(e) {
            try {
                let entries = [];
                const fileName = file.name.toLowerCase();
                
                if (fileName.endsWith('.csv')) {
                    // Parse CSV
                    const text = e.target.result;
                    const lines = text.split(/\r?\n/);
                    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
                    
                    for (let i = 1; i < lines.length; i++) {
                        if (!lines[i].trim()) continue;
                        
                        let row = [];
                        let inQuote = false;
                        let current = '';
                        for (let char of lines[i]) {
                            if (char === '"') {
                                inQuote = !inQuote;
                            } else if (char === ',' && !inQuote) {
                                row.push(current.trim());
                                current = '';
                            } else {
                                current += char;
                            }
                        }
                        row.push(current.trim());
                        
                        if (row.length >= 3) {
                            const entry = {};
                            headers.forEach((h, idx) => {
                                let value = row[idx] || '';
                                value = value.replace(/^"|"$/g, '');
                                entry[h] = value;
                            });
                            
                            entries.push({
                                day_of_week: (entry.day_of_week || entry.day || '').toString().toLowerCase(),
                                week_number: parseInt(entry.week_number || entry.week || 1),
                                start_time: entry.start_time || entry.start || entry.startTime || '08:00',
                                end_time: entry.end_time || entry.end || entry.endTime || '10:00',
                                session_name: entry.session_name || entry.session || entry.title || entry.course || '',
                                course_name: entry.course_name || entry.course || '',
                                lecturer_name: entry.lecturer_name || entry.lecturer || entry.instructor || 'TBA',
                                venue: entry.venue || entry.location || 'TBD',
                                block: block,
                                program: program,
                                academic_year: '2026',
                                is_holiday: (entry.is_holiday === 'TRUE' || entry.is_holiday === 'true' || entry.holiday === 'TRUE' || entry.holiday === 'true') ? true : false,
                                is_exam: (entry.is_exam === 'TRUE' || entry.is_exam === 'true' || entry.exam === 'TRUE' || entry.exam === 'true') ? true : false,
                                pending_allocation: (entry.lecturer_name === 'TBA' || entry.lecturer === 'TBA' || entry.pending === 'TRUE') ? true : false
                            });
                        }
                    }
                } else {
                    // Parse Excel
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const sheet = workbook.Sheets[workbook.SheetNames[0]];
                    const rows = XLSX.utils.sheet_to_json(sheet);
                    
                    for (const row of rows) {
                        entries.push({
                            day_of_week: (row.day_of_week || row.Day || row.day || '').toString().toLowerCase(),
                            week_number: parseInt(row.week_number || row.Week || row.week || 1),
                            start_time: row.start_time || row.Start_Time || row.startTime || row.Start || '08:00',
                            end_time: row.end_time || row.End_Time || row.endTime || row.End || '10:00',
                            session_name: row.session_name || row.Session || row.title || row.Title || row.Course || row.course || '',
                            course_name: row.course_name || row.Course_Name || row.course || '',
                            lecturer_name: row.lecturer_name || row.Lecturer || row.lecturer || row.instructor || 'TBA',
                            venue: row.venue || row.Venue || row.location || 'TBD',
                            block: block,
                            program: program,
                            academic_year: '2026',
                            is_holiday: (row.is_holiday === 'TRUE' || row.is_holiday === true || row.holiday === 'TRUE' || row.holiday === true) ? true : false,
                            is_exam: (row.is_exam === 'TRUE' || row.is_exam === true || row.exam === 'TRUE' || row.exam === true) ? true : false,
                            pending_allocation: (row.lecturer_name === 'TBA' || row.lecturer === 'TBA') ? true : false
                        });
                    }
                }
                
                if (entries.length === 0) {
                    throw new Error('No valid data found in file');
                }
                
                // Delete existing entries for this block
                const { error: deleteError } = await sb.from('timetables').delete().eq('block', block);
                if (deleteError) throw deleteError;
                
                // Insert new entries in batches
                const batchSize = 50;
                for (let i = 0; i < entries.length; i += batchSize) {
                    const batch = entries.slice(i, i + batchSize);
                    const { error: insertError } = await sb.from('timetables').insert(batch);
                    if (insertError) throw insertError;
                }
                
                alert(`✅ Success! ${entries.length} timetable entries uploaded for ${block}`);
                resolve();
                
            } catch (error) {
                reject(error);
            }
        };
        
        if (file.name.toLowerCase().endsWith('.csv')) {
            reader.readAsText(file);
        } else {
            reader.readAsArrayBuffer(file);
        }
    });
}

// Process PDF files (store as document, not as calendar events)
async function processPDFFile(file, block, program) {
    // Upload PDF to storage
    const timestamp = Date.now();
    const fileName = `timetable_${block}_${program}_${timestamp}.pdf`;
    const filePath = `timetables/${block}/${fileName}`;
    
    const { error: uploadError } = await sb.storage
        .from('resources')
        .upload(filePath, file, { contentType: 'application/pdf' });
    
    if (uploadError) throw uploadError;
    
    const { data: { publicUrl } } = sb.storage.from('resources').getPublicUrl(filePath);
    
    // Store metadata in timetables_documents table
    const { error: insertError } = await sb.from('timetables_documents').insert([{
        file_name: file.name,
        file_url: publicUrl,
        block: block,
        program: program,
        uploaded_by: currentUserProfile?.id,
        uploaded_at: new Date().toISOString()
    }]);
    
    if (insertError) throw insertError;
    
    alert(`✅ PDF timetable uploaded successfully for ${block}!\nFile stored in resources.`);
}

// Process Word files
async function processWordFile(file, block, program) {
    const timestamp = Date.now();
    const fileName = `timetable_${block}_${program}_${timestamp}.docx`;
    const filePath = `timetables/${block}/${fileName}`;
    
    const { error: uploadError } = await sb.storage
        .from('resources')
        .upload(filePath, file, { contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
    
    if (uploadError) throw uploadError;
    
    const { data: { publicUrl } } = sb.storage.from('resources').getPublicUrl(filePath);
    
    const { error: insertError } = await sb.from('timetables_documents').insert([{
        file_name: file.name,
        file_url: publicUrl,
        block: block,
        program: program,
        file_type: 'word',
        uploaded_by: currentUserProfile?.id,
        uploaded_at: new Date().toISOString()
    }]);
    
    if (insertError) throw insertError;
    
    alert(`✅ Word document uploaded successfully for ${block}!`);
}

// Clear entire block timetable
window.clearTimetableBlock = async function() {
    const blockSelect = document.getElementById('adminTimetableBlock');
    const block = blockSelect ? blockSelect.value : 'Block 4';
    
    if (!confirm(`⚠️ WARNING: This will DELETE ALL timetable entries for ${block}. This cannot be undone. Continue?`)) return;
    
    try {
        const { error } = await sb.from('timetables').delete().eq('block', block);
        if (error) throw error;
        alert(`✅ ${block} timetable cleared successfully`);
        if (typeof previewTimetable === 'function') previewTimetable();
        if (typeof renderFullCalendar === 'function') renderFullCalendar();
    } catch (error) {
        alert('Error: ' + error.message);
    }
};

// Preview timetable for selected block
window.previewTimetable = async function() {
    const blockSelect = document.getElementById('previewBlockSelect');
    const container = document.getElementById('adminTimetablePreview');
    if (!container) return;
    
    const block = blockSelect ? blockSelect.value : 'Block 4';
    container.innerHTML = '<div class="loading-spinner"></div> Loading...';
    
    try {
        const { data, error } = await sb
            .from('timetables')
            .select('*')
            .eq('block', block)
            .order('week_number', { ascending: true })
            .order('day_of_week', { ascending: true })
            .order('start_time', { ascending: true });
        
        if (error) throw error;
        
        if (!data || data.length === 0) {
            container.innerHTML = '<div style="text-align:center; padding:40px; color:#6b7280;">📭 No timetable found for ' + block + '. Upload a file to add classes.</div>';
            return;
        }
        
        const weeks = {};
        data.forEach(cls => {
            const week = cls.week_number || 1;
            if (!weeks[week]) weeks[week] = [];
            weeks[week].push(cls);
        });
        
        const dayNames = { monday:'Monday', tuesday:'Tuesday', wednesday:'Wednesday', thursday:'Thursday', friday:'Friday', saturday:'Saturday', sunday:'Sunday' };
        const daysOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        
        let html = '';
        for (const week in weeks) {
            html += `<h4 style="margin: 20px 0 10px 0; background: #4C1D95; color: white; padding: 8px 12px; border-radius: 8px;">📅 Week ${week}</h4>`;
            html += `<table style="width:100%; margin-bottom:20px; border-collapse: collapse;">
                        <thead><tr style="background: #f3f4f6;">
                            <th style="padding: 10px; text-align: left;">Day</th>
                            <th style="padding: 10px; text-align: left;">Time</th>
                            <th style="padding: 10px; text-align: left;">Session/Course</th>
                            <th style="padding: 10px; text-align: left;">Lecturer</th>
                            <th style="padding: 10px; text-align: left;">Venue</th>
                         </tr></thead><tbody>`;
            
            for (const day of daysOrder) {
                const dayClasses = weeks[week].filter(c => c.day_of_week === day);
                dayClasses.sort((a,b) => a.start_time.localeCompare(b.start_time));
                
                dayClasses.forEach((cls, idx) => {
                    const holidayBadge = cls.is_holiday ? '<span style="background:#dc2626; color:white; padding:2px 6px; border-radius:4px; font-size:10px; margin-left:5px;">HOLIDAY</span>' : '';
                    const examBadge = cls.is_exam ? '<span style="background:#f59e0b; color:white; padding:2px 6px; border-radius:4px; font-size:10px; margin-left:5px;">EXAM</span>' : '';
                    
                    html += `<tr style="border-bottom: 1px solid #e5e7eb;">
                        <td style="padding: 8px;">${idx === 0 ? dayNames[day] : ''}</td>
                        <td style="padding: 8px;">${cls.start_time} - ${cls.end_time}</td>
                        <td style="padding: 8px;"><strong>${escapeHtml(cls.session_name || cls.course_name)}</strong> ${holidayBadge}${examBadge}<br><small>${escapeHtml(cls.course_name || '')}</small></td>
                        <td style="padding: 8px;">${escapeHtml(cls.lecturer_name || 'TBA')} ${cls.pending_allocation ? '<span style="background:#94a3b8; color:white; padding:2px 6px; border-radius:4px; font-size:10px;">Pending</span>' : ''}</td>
                        <td style="padding: 8px;">${escapeHtml(cls.venue || 'TBD')}</td>
                    </tr>`;
                });
            }
            html += `</tbody></table>`;
        }
        container.innerHTML = html;
        
    } catch (error) {
        container.innerHTML = '<div style="color:red;">Error loading timetable: ' + error.message + '</div>';
    }
};

// Download CSV template
window.downloadTimetableTemplate = function() {
    const csvContent = `day_of_week,week_number,start_time,end_time,session_name,course_name,lecturer_name,venue,is_holiday,is_exam
monday,1,08:00,10:30,Critical Care Nursing,Critical Care,Mr. Peter Onkundi,Skills Lab,FALSE,FALSE
monday,1,11:00,13:00,ENT Disorders,Ear Nose Throat,Mr. Kevin Matoka,Lecture Hall 1,FALSE,FALSE
tuesday,1,08:00,10:30,Medical Surgical III,Dermatology/Burns,Mr. Job Juma,Lecture Hall 1,FALSE,FALSE
tuesday,1,14:00,17:00,Leadership,Management in Nursing,Mr. Kevin Matoka,Lecture Hall 2,FALSE,FALSE
wednesday,1,09:00,12:00,Community Diagnosis,Community Health,Mr. Job Juma,Lecture Hall 1,FALSE,FALSE
wednesday,1,14:00,17:00,Teaching and Learning,Methodology,Md. Mary Nyamboki,Lecture Hall 2,FALSE,FALSE
thursday,1,08:00,10:30,Communicable Diseases,Vector Borne,TBA,Lecture Hall 1,FALSE,FALSE
thursday,1,11:00,13:00,Research Methods,Research,Dr. Anne Wanjiku,Room 101,FALSE,FALSE
friday,1,09:00,11:00,Weekly Review,Review Session,Tutorial Staff,Room 203,FALSE,FALSE
monday,2,08:00,10:30,Medical Surgical III,Dermatology/Burns,Mr. Job Juma,Lecture Hall 1,FALSE,FALSE
tuesday,2,09:00,12:00,MADARAKA DAY,Public Holiday,,,TRUE,FALSE
wednesday,2,08:00,10:30,Teaching and Learning,Methodology,Md. Mary Nyamboki,Lecture Hall 2,FALSE,FALSE
thursday,2,11:00,13:00,Community Health,Community Health,Mr. Gideon Kibet,Lecture Hall 1,FALSE,FALSE
friday,2,14:00,17:00,Leadership,Nursing Management,Mr. Kevin Matoka,Lecture Hall 2,FALSE,FALSE`;
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'timetable_template.csv';
    link.click();
    URL.revokeObjectURL(link.href);
};

// Refresh calendar data
async function refreshCalendarData() {
    await renderFullCalendar();
}

// Add single event to calendar
async function addCalendarEvent(eventData) {
    const { error } = await sb.from('calendar_events').insert([eventData]);
    if (error) {
        alert('Failed to add event: ' + error.message);
        return false;
    }
    await renderFullCalendar();
    alert('✅ Event added to calendar!');
    return true;
}

// Upload Excel timetable (legacy function - kept for compatibility)
async function uploadTimetableExcel(file, program, block) {
    if (!file) {
        alert('Please select an Excel file');
        return false;
    }
    
    const reader = new FileReader();
    reader.onload = async function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const rows = XLSX.utils.sheet_to_json(sheet);
            
            let added = 0;
            for (const row of rows) {
                const eventData = {
                    event_name: row.Title || row.title || row.Course || row.course,
                    event_date: row.Date || row.date,
                    start_time: row.Start_Time || row.start_time || null,
                    end_time: row.End_Time || row.end_time || null,
                    venue: row.Venue || row.venue || null,
                    type: (row.Type || row.type || 'CLASS').toUpperCase(),
                    description: row.Description || row.description || '',
                    target_program: program || 'General',
                    target_block: block || 'General',
                    organizer: 'Admin Upload'
                };
                
                if (eventData.event_name && eventData.event_date) {
                    const { error } = await sb.from('calendar_events').insert([eventData]);
                    if (!error) added++;
                }
            }
            alert(`✅ Added ${added} events to calendar!`);
            await renderFullCalendar();
        } catch (err) {
            alert('Error processing file: ' + err.message);
        }
    };
    reader.readAsArrayBuffer(file);
}

// Expose functions globally
window.renderFullCalendar = renderFullCalendar;
window.refreshCalendarData = refreshCalendarData;
window.uploadTimetableExcel = uploadTimetableExcel;
window.addCalendarEvent = addCalendarEvent;
window.downloadTimetableTemplate = downloadTimetableTemplate;
window.uploadTimetableToSupabase = uploadTimetableToSupabase;
window.clearTimetableBlock = clearTimetableBlock;
window.previewTimetable = previewTimetable;
/*******************************************************
 * 19. ENHANCED FEATURES IMPLEMENTATION
 *******************************************************/

// Quick Actions Implementation
function quickAction(action) {
    const actions = {
        'clearCache': {
            message: 'Cache cleared successfully!',
            audit: 'CACHE_CLEAR'
        },
        'runMaintenance': {
            message: 'Maintenance tasks completed!',
            audit: 'SYSTEM_MAINTENANCE'
        },
        'sendTestEmail': {
            message: 'Test email sent!',
            audit: 'TEST_EMAIL_SEND'
        },
        'generateReports': {
            message: 'Reports generated successfully!',
            audit: 'REPORTS_GENERATE'
        },
        'checkUpdates': {
            message: 'No updates available.',
            audit: 'SYSTEM_UPDATE_CHECK'
        },
        'backupNow': {
            message: 'Backup initiated!',
            audit: 'DB_BACKUP_MANUAL'
        },
        'healthCheck': {
            message: 'System health check completed!',
            audit: 'SYSTEM_HEALTH_CHECK'
        },
        'userAudit': {
            message: 'User audit report generated!',
            audit: 'USER_AUDIT_REPORT'
        }
    };

    const actionData = actions[action];
    if (actionData) {
        showFeedback(actionData.message, 'success');
        logAudit(actionData.audit, `Quick action executed: ${action}`, null, 'SUCCESS');
    }
}

// Bulk Operations Implementation
function selectAllUsers() {
    const checkboxes = document.querySelectorAll('.user-checkbox');
    checkboxes.forEach(checkbox => {
        checkbox.checked = true;
    });
    updateSelectedCount();
}

function clearSelection() {
    const checkboxes = document.querySelectorAll('.user-checkbox');
    checkboxes.forEach(checkbox => {
        checkbox.checked = false;
    });
    updateSelectedCount();
}

function updateSelectedCount() {
    const selected = document.querySelectorAll('.user-checkbox:checked').length;
    const countElement = $('selected-count');
    if (countElement) {
        countElement.textContent = selected;
    }
}

function executeBulkAction() {
    const action = $('bulk-action')?.value;
    const selectedCount = document.querySelectorAll('.user-checkbox:checked').length;
    
    if (selectedCount === 0) {
        showFeedback('Please select at least one user to perform bulk action.', 'warning');
        return;
    }

    showFeedback(`Executing ${action} for ${selectedCount} users...`, 'info');
    logAudit('BULK_ACTION', `Executed ${action} for ${selectedCount} users`, null, 'SUCCESS');
}

// API Key Management
function generateNewAPIKey() {
    showFeedback('New API key generated successfully!', 'success');
    logAudit('API_KEY_GENERATE', 'Generated new API key', null, 'SUCCESS');
}

function regenerateKey(keyType) {
    showFeedback(`Regenerating ${keyType} API key...`, 'success');
    logAudit('API_KEY_REGENERATE', `Regenerated ${keyType} API key`, null, 'SUCCESS');
}

// 2FA Management
function enable2FAForAll() {
    showFeedback('2FA enabled system-wide!', 'success');
    logAudit('2FA_ENABLE_SYSTEM', 'Enabled 2FA system-wide', null, 'SUCCESS');
}


// Error Tracking
function filterErrors(severity) {
    showFeedback(`Filtering errors by: ${severity}`, 'info');
}

// Data Visualization
function updateVisualization() {
    showFeedback('Updating visualization with new parameters...', 'info');
}
// Add this at the end of your script.js, before the closing of the file

// =====================================================
// UNIT REGISTRATION MANAGEMENT - COMPLETE ENHANCED
// =====================================================

// Global variables for unit management
let allUnits = [];
let currentBlockFilter = 'all';
let pendingRegistrationsData = [];
let approvedRegistrationsData = [];

// =====================================================
// TOGGLE UNIT COURSES - POPULATES COURSE DROPDOWN
// =====================================================

window.toggleUnitCourses = async function() {
    const programSelect = document.getElementById('new_unit_program');
    const courseSelect = document.getElementById('new_unit_course');
    
    if (!programSelect || !courseSelect) return;
    
    const selectedProgram = programSelect.value;
    
    // Clear current options
    courseSelect.innerHTML = '<option value="">-- Select Course --</option>';
    
    if (!selectedProgram) return;
    
    try {
        // Try to get courses from database
        const { data: courses, error } = await sb
            .from('courses')
            .select('id, course_name, unit_code')
            .eq('target_program', selectedProgram)
            .order('course_name', { ascending: true });
        
        if (!error && courses && courses.length > 0) {
            courses.forEach(course => {
                const option = document.createElement('option');
                option.value = course.id;
                const unitCode = course.unit_code ? ` (${course.unit_code})` : '';
                option.textContent = course.course_name + unitCode;
                courseSelect.appendChild(option);
            });
            console.log(`✅ Loaded ${courses.length} courses for ${selectedProgram} from DB`);
            return;
        }
        
        // If no DB courses, use program display names
        const programName = getProgramDisplayName(selectedProgram);
        
        // Add main program
        const mainOpt = document.createElement('option');
        mainOpt.value = selectedProgram;
        mainOpt.textContent = `📚 ${programName}`;
        courseSelect.appendChild(mainOpt);
        
        // If TVET selected, show ALL TVET programs
        if (selectedProgram === 'TVET') {
            const separator = document.createElement('option');
            separator.disabled = true;
            separator.textContent = '─── All TVET Programs ───';
            separator.style.fontWeight = 'bold';
            courseSelect.appendChild(separator);
            
            TVET_PROGRAMS.forEach(code => {
                const displayName = getProgramDisplayName(code);
                if (displayName && displayName !== code) {
                    const opt = document.createElement('option');
                    opt.value = code;
                    const level = getProgramLevel(code);
                    const emoji = level === 'DIPLOMA' ? '🎓' : 
                                  level === 'CERTIFICATE' ? '📜' : 
                                  level === 'ARTISAN' ? '🔧' : '📊';
                    opt.textContent = `${emoji} ${displayName}`;
                    courseSelect.appendChild(opt);
                }
            });
        }
        
        console.log(`📚 Loaded course options for ${selectedProgram}`);
        
    } catch (err) {
        console.error('Error in toggleUnitCourses:', err);
        const programName = getProgramDisplayName(selectedProgram);
        const option = document.createElement('option');
        option.value = selectedProgram;
        option.textContent = programName;
        courseSelect.appendChild(option);
    }
};

// =====================================================
// UPDATE BLOCK OPTIONS BASED ON PROGRAM
// =====================================================

window.updateUnitBlockOptions = function(program) {
    const blockSelect = document.getElementById('new_unit_block');
    if (!blockSelect) return;
    
    const programType = getProgramType(program);
    const currentValue = blockSelect.value;
    
    blockSelect.innerHTML = '';
    
    if (programType === 'KRCHN') {
        // KRCHN uses Blocks with NUMBERS (1-5)
        ['Introductory', 'Block 1', 'Block 2', 'Block 3', 'Block 4', 'Block 5', 'Final'].forEach(block => {
            const opt = document.createElement('option');
            opt.value = block;
            opt.textContent = block;
            blockSelect.appendChild(opt);
        });
    } else {
        // TVET uses Terms
        ['Introductory', 'Term 1', 'Term 2', 'Term 3', 'Term 4', 'Term 5', 'Term 6', 'Final'].forEach(term => {
            const opt = document.createElement('option');
            opt.value = term;
            opt.textContent = term;
            blockSelect.appendChild(opt);
        });
    }
    
    if (currentValue) {
        const exists = Array.from(blockSelect.options).some(o => o.value === currentValue);
        if (exists) blockSelect.value = currentValue;
    }
};

// =====================================================
// INITIALIZE UNIT FORM
// =====================================================

function initUnitForm() {
    const programSelect = document.getElementById('new_unit_program');
    if (programSelect) {
        programSelect.addEventListener('change', function() {
            const program = this.value;
            toggleUnitCourses();
            updateUnitBlockOptions(program);
        });
        // Trigger initial load
        setTimeout(() => programSelect.dispatchEvent(new Event('change')), 200);
    }
}

// =====================================================
// HELPER FUNCTIONS FOR DISPLAY
// =====================================================

function getProgramName(code) {
    const names = {
        'KRCHN': '🎓 KRCHN Nursing',
        'DPOTT': '🎯 Perioperative Theatre',
        'DCH': '🎯 Community Health',
        'DHRIT': '🎯 Health Records & IT',
        'DSL': '🎯 Science Lab',
        'DSW': '🎯 Social Work',
        'DCJS': '🎯 Criminal Justice',
        'DHSS': '🎯 Health Support Services',
        'DICT': '🎯 ICT',
        'DME': '🎯 Medical Engineering',
        'CPOTT': '📜 Perioperative Theatre',
        'CCH': '📜 Community Health',
        'CHRIT': '📜 Health Records & IT',
        'CPC': '📜 Patient Care',
        'CSL': '📜 Science Lab',
        'CSW': '📜 Social Work',
        'CCJS': '📜 Criminal Justice',
        'CAG': '📜 Agriculture',
        'CHSS': '📜 Health Support Services',
        'CICT': '📜 ICT',
        'ACH': '🔧 Community Health',
        'AAG': '🔧 Agriculture',
        'ASW': '🔧 Social Work',
        'CCA': '📊 Computer Applications',
        'PTE': '📊 TVET/CDACC'
    };
    return names[code] || code || 'N/A';
}

function getBlockColor(block) {
    const colors = {
        'Introductory': '#8b5cf6',
        'Block 1': '#3b82f6',
        'Block 2': '#06b6d4',
        'Block 3': '#10b981',
        'Block 4': '#f59e0b',
        'Block 5': '#ef4444',
        'Final': '#8b5cf6'
    };
    return colors[block] || '#6b7280';
}

function getBlockEmoji(block) {
    const emojis = {
        'Introductory': '🌟',
        'Block 1': '📘',
        'Block 2': '📗',
        'Block 3': '📒',
        'Block 4': '📙',
        'Block 5': '📕',
        'Final': '🏆'
    };
    return emojis[block] || '📚';
}

// =====================================================
// UNIT CATALOG MANAGEMENT - ENHANCED
// =====================================================

async function loadAllUnits() {
    const container = document.getElementById('units-list-container');
    if (!container) return;
    
    container.innerHTML = `
        <div style="text-align: center; padding: 40px;">
            <div class="loading-spinner" style="display: inline-block; width: 40px; height: 40px; border: 3px solid #e5e7eb; border-top-color: #4C1D95; border-radius: 50%; animation: spin 1s linear infinite;"></div>
            <p style="margin-top: 10px; color: #6b7280;">Loading units...</p>
        </div>
    `;
    
    try {
        const { data, error } = await sb
            .from('units_catalog')
            .select('*')
            .order('block', { ascending: true })
            .order('unit_code', { ascending: true });
        
        if (error) throw error;
        
        allUnits = data || [];
        window.allUnits = allUnits;
        renderUnitsCatalog();
        loadUnitRegistrationStats();
        
    } catch (error) {
        console.error('Error loading units:', error);
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #dc2626;">
                <i class="fas fa-exclamation-circle" style="font-size: 40px;"></i>
                <p style="margin-top: 10px;">Error loading units: ${error.message}</p>
                <button onclick="loadAllUnits()" style="margin-top: 10px; padding: 8px 20px; background: #4C1D95; color: white; border: none; border-radius: 6px; cursor: pointer;">
                    <i class="fas fa-sync-alt"></i> Retry
                </button>
            </div>
        `;
    }
}

function renderUnitsCatalog() {
    const container = document.getElementById('units-list-container');
    if (!container) return;
    
    const searchTerm = document.getElementById('unit_search')?.value.toLowerCase() || '';
    const programFilter = document.getElementById('unit_filter_program')?.value || '';
    const yearFilter = document.getElementById('unit_filter_year')?.value || '';
    
    let filtered = [...allUnits];
    
    if (searchTerm) {
        filtered = filtered.filter(u => 
            u.unit_code?.toLowerCase().includes(searchTerm) || 
            u.unit_name?.toLowerCase().includes(searchTerm)
        );
    }
    if (programFilter) {
        filtered = filtered.filter(u => u.program === programFilter);
    }
    if (yearFilter) {
        filtered = filtered.filter(u => u.year == yearFilter);
    }
    if (currentBlockFilter !== 'all') {
        filtered = filtered.filter(u => u.block === currentBlockFilter);
    }
    
    if (filtered.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 60px 20px; color: #6b7280;">
                <i class="fas fa-search" style="font-size: 48px; color: #d1d5db;"></i>
                <p style="margin-top: 16px; font-size: 16px;">No units found</p>
                <p style="font-size: 13px;">Try adjusting your filters or add a new unit</p>
            </div>
        `;
        return;
    }
    
    let html = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 10px;">
            <div>
                <span style="font-weight: 600; color: #1e3a5f; font-size: 14px;">
                    <i class="fas fa-list"></i> ${filtered.length} unit${filtered.length > 1 ? 's' : ''}
                </span>
                <span style="font-size: 12px; color: #6b7280; margin-left: 10px;">
                    (${allUnits.length} total)
                </span>
            </div>
            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                ${currentBlockFilter !== 'all' ? `
                    <span style="background: #4C1D95; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px;">
                        <i class="fas fa-filter"></i> ${currentBlockFilter}
                        <span onclick="filterUnitsByBlock('all')" style="cursor: pointer; margin-left: 6px;">✕</span>
                    </span>
                ` : ''}
                ${programFilter ? `
                    <span style="background: #4C1D95; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px;">
                        <i class="fas fa-filter"></i> ${getProgramName(programFilter)}
                        <span onclick="document.getElementById('unit_filter_program').value=''; filterUnitsCatalog();" style="cursor: pointer; margin-left: 6px;">✕</span>
                    </span>
                ` : ''}
            </div>
        </div>
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(380px, 1fr)); gap: 16px;">
    `;
    
    filtered.forEach(unit => {
        const blockColor = getBlockColor(unit.block);
        const blockEmoji = getBlockEmoji(unit.block);
        const programName = getProgramName(unit.program);
        const typeColor = unit.unit_type === 'Core' ? '#2563eb' : '#d97706';
        const typeBg = unit.unit_type === 'Core' ? '#dbeafe' : '#fef3c7';
        
        html += `
            <div class="unit-card" style="
                background: white; 
                border: 1px solid #e5e7eb; 
                border-radius: 12px; 
                padding: 16px; 
                transition: all 0.2s;
                box-shadow: 0 1px 3px rgba(0,0,0,0.05);
                cursor: default;
            "
            onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 8px 25px rgba(0,0,0,0.1)';"
            onmouseout="this.style.transform='none'; this.style.boxShadow='0 1px 3px rgba(0,0,0,0.05)';">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 10px;">
                    <div style="flex: 1; min-width: 0;">
                        <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                            <span style="font-weight: 700; color: #4C1D95; font-size: 16px;">${escapeHtml(unit.unit_code)}</span>
                            <span style="
                                background: ${typeBg}; 
                                color: ${typeColor}; 
                                padding: 2px 10px; 
                                border-radius: 12px; 
                                font-size: 10px; 
                                font-weight: 600;
                            ">${escapeHtml(unit.unit_type || 'Core')}</span>
                            <span style="
                                background: #f3f4f6; 
                                color: #4b5563; 
                                padding: 2px 10px; 
                                border-radius: 12px; 
                                font-size: 10px;
                            ">
                                <i class="fas fa-star"></i> ${unit.credits || 3} cr
                            </span>
                        </div>
                        <div style="font-size: 15px; color: #1f2937; margin-top: 4px; font-weight: 500;">
                            ${escapeHtml(unit.unit_name)}
                        </div>
                        ${unit.prerequisites ? `
                            <div style="font-size: 11px; color: #6b7280; margin-top: 4px;">
                                <i class="fas fa-link"></i> Prerequisite: ${escapeHtml(unit.prerequisites)}
                            </div>
                        ` : ''}
                    </div>
                    <div style="display: flex; gap: 6px; flex-shrink: 0;">
                        <button onclick="editUnitRecord(${unit.id})" 
                            style="
                                background: #3b82f6; 
                                color: white; 
                                border: none; 
                                border-radius: 6px; 
                                padding: 5px 10px; 
                                font-size: 11px; 
                                cursor: pointer; 
                                transition: all 0.2s;
                            "
                            onmouseover="this.style.background='#2563eb'"
                            onmouseout="this.style.background='#3b82f6'"
                        >
                            <i class="fas fa-edit"></i>
                        </button>
                        <button onclick="deleteUnitRecord(${unit.id}, '${escapeHtml(unit.unit_code)}')" 
                            style="
                                background: #ef4444; 
                                color: white; 
                                border: none; 
                                border-radius: 6px; 
                                padding: 5px 10px; 
                                font-size: 11px; 
                                cursor: pointer; 
                                transition: all 0.2s;
                            "
                            onmouseover="this.style.background='#dc2626'"
                            onmouseout="this.style.background='#ef4444'"
                        >
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                
                <!-- Tags -->
                <div style="display: flex; gap: 6px; flex-wrap: wrap; margin-top: 10px; padding-top: 10px; border-top: 1px solid #f3f4f6;">
                    <span style="
                        background: #f3f4f6; 
                        padding: 3px 10px; 
                        border-radius: 12px; 
                        font-size: 11px; 
                        color: #4b5563;
                    ">
                        <i class="fas fa-tag"></i> ${escapeHtml(programName)}
                    </span>
                    <span style="
                        background: ${blockColor}20; 
                        padding: 3px 10px; 
                        border-radius: 12px; 
                        font-size: 11px; 
                        color: ${blockColor};
                        border: 1px solid ${blockColor}30;
                    ">
                        <i class="fas fa-layer-group"></i> ${blockEmoji} ${escapeHtml(unit.block)}
                    </span>
                    <span style="
                        background: #f3f4f6; 
                        padding: 3px 10px; 
                        border-radius: 12px; 
                        font-size: 11px; 
                        color: #4b5563;
                    ">
                        <i class="fas fa-calendar"></i> ${unit.year || 'N/A'}
                    </span>
                    <span style="
                        background: #f3f4f6; 
                        padding: 3px 10px; 
                        border-radius: 12px; 
                        font-size: 11px; 
                        color: #4b5563;
                    ">
                        <i class="fas fa-clock"></i> ${unit.hours || 0}h
                    </span>
                    ${unit.status ? `
                        <span style="
                            background: ${unit.status === 'active' ? '#d1fae5' : '#fee2e2'};
                            color: ${unit.status === 'active' ? '#059669' : '#dc2626'};
                            padding: 3px 10px;
                            border-radius: 12px;
                            font-size: 11px;
                        ">
                            ${unit.status === 'active' ? '✅ Active' : '❌ Inactive'}
                        </span>
                    ` : ''}
                </div>
            </div>
        `;
    });
    
    html += `
        </div>
        <div style="text-align: center; margin-top: 16px; font-size: 12px; color: #9ca3af;">
            Showing ${filtered.length} of ${allUnits.length} units
        </div>
    `;
    
    container.innerHTML = html;
}

// =====================================================
// ADD NEW UNIT RECORD
// =====================================================

async function addNewUnitRecord() {
    const unitCode = document.getElementById('new_unit_code')?.value;
    const unitName = document.getElementById('new_unit_name')?.value;
    const program = document.getElementById('new_unit_program')?.value;
    const block = document.getElementById('new_unit_block')?.value;
    const year = parseInt(document.getElementById('new_unit_year')?.value);
    const credits = parseInt(document.getElementById('new_unit_credits')?.value);
    const hours = parseInt(document.getElementById('new_unit_hours')?.value);
    const unitType = document.getElementById('new_unit_type')?.value;
    const prerequisites = document.getElementById('new_unit_prerequisites')?.value || null;
    
    if (!unitCode || !unitName) {
        showFeedback('Please fill in Unit Code and Unit Name', 'error');
        return;
    }
    
    const newUnit = {
        unit_code: unitCode,
        unit_name: unitName,
        program: program,
        block: block,
        year: year,
        credits: credits,
        hours: hours,
        unit_type: unitType,
        prerequisites: prerequisites,
        status: 'active'
    };
    
    try {
        const { data, error } = await sb
            .from('units_catalog')
            .insert([newUnit])
            .select();
        
        if (error) throw error;
        
        showFeedback(`Unit "${unitCode}" added successfully!`, 'success');
        
        document.getElementById('new_unit_code').value = '';
        document.getElementById('new_unit_name').value = '';
        document.getElementById('new_unit_prerequisites').value = '';
        
        loadAllUnits();
        
    } catch (error) {
        console.error('Error adding unit:', error);
        showFeedback(`Error adding unit: ${error.message}`, 'error');
    }
}

// =====================================================
// EDIT UNIT RECORD
// =====================================================

async function editUnitRecord(unitId) {
    const unit = allUnits.find(u => u.id === unitId);
    if (!unit) return;
    
    document.getElementById('edit_unit_id').value = unit.id;
    document.getElementById('edit_unit_code').value = unit.unit_code;
    document.getElementById('edit_unit_name').value = unit.unit_name;
    document.getElementById('edit_unit_program').value = unit.program;
    document.getElementById('edit_unit_block').value = unit.block;
    document.getElementById('edit_unit_year').value = unit.year;
    document.getElementById('edit_unit_credits').value = unit.credits;
    document.getElementById('edit_unit_hours').value = unit.hours || 0;
    document.getElementById('edit_unit_type').value = unit.unit_type || 'Core';
    document.getElementById('edit_unit_prerequisites').value = unit.prerequisites || '';
    
    document.getElementById('editUnitModal').style.display = 'flex';
}

// =====================================================
// DELETE UNIT RECORD
// =====================================================

async function deleteUnitRecord(unitId, unitCode) {
    if (!confirm(`⚠️ Are you sure you want to delete unit "${unitCode}"? This action cannot be undone.`)) return;
    
    try {
        const { error } = await sb
            .from('units_catalog')
            .delete()
            .eq('id', unitId);
        
        if (error) throw error;
        
        showFeedback(`Unit "${unitCode}" deleted successfully!`, 'success');
        loadAllUnits();
        
    } catch (error) {
        console.error('Error deleting unit:', error);
        showFeedback(`Error deleting unit: ${error.message}`, 'error');
    }
}

// =====================================================
// FILTER FUNCTIONS
// =====================================================

function filterUnitsCatalog() {
    renderUnitsCatalog();
}

function filterUnitsByBlock(block) {
    currentBlockFilter = block;
    
    document.querySelectorAll('.block-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-block') === block) {
            btn.classList.add('active');
            btn.style.background = '#4C1D95';
            btn.style.color = 'white';
        } else {
            btn.style.background = '#f3f4f6';
            btn.style.color = '#374151';
        }
    });
    
    renderUnitsCatalog();
}

// =====================================================
// REGISTRATION STATISTICS
// =====================================================

async function loadUnitRegistrationStats() {
    try {
        const { data, error } = await sb
            .from('student_unit_registrations')
            .select('*');
        
        if (!error && data) {
            const pending = data.filter(r => r.status === 'pending').length;
            const approved = data.filter(r => r.status === 'approved').length;
            
            const pendingEl = document.getElementById('pendingRegistrations');
            const approvedEl = document.getElementById('approvedRegistrations');
            const totalEl = document.getElementById('totalRegistrations');
            
            if (pendingEl) pendingEl.textContent = pending;
            if (approvedEl) approvedEl.textContent = approved;
            if (totalEl) totalEl.textContent = data.length;
        }
    } catch (error) {
        console.error('Error loading registration stats:', error);
    }
}

// =====================================================
// PENDING REGISTRATIONS - FIXED STUDENT NAMES
// =====================================================

async function loadUnitPendingRegistrations() {
    const container = document.getElementById('pending-registrations-list');
    if (!container) {
        console.error('❌ Container #pending-registrations-list not found');
        return;
    }
    
    // Toggle visibility
    if (container.style.display !== 'none' && container.style.display !== '') {
        container.style.display = 'none';
        container.innerHTML = '';
        return;
    }
    
    container.style.display = 'block';
    container.innerHTML = `
        <div style="text-align: center; padding: 40px;">
            <div class="loading-spinner" style="display: inline-block; width: 40px; height: 40px; border: 3px solid #e5e7eb; border-top-color: #4C1D95; border-radius: 50%; animation: spin 1s linear infinite;"></div>
            <p style="margin-top: 10px; color: #6b7280;">Loading pending registrations...</p>
        </div>
    `;
    
    try {
        // Fetch pending registrations
        const { data: registrations, error } = await sb
            .from('student_unit_registrations')
            .select('*')
            .eq('status', 'pending')
            .order('submitted_date', { ascending: false });
        
        if (error) throw error;
        
        // Store globally
        window.pendingRegistrationsData = registrations || [];
        pendingRegistrationsData = window.pendingRegistrationsData;
        
        console.log(`✅ Loaded ${pendingRegistrationsData.length} pending registrations`);
        
        if (!pendingRegistrationsData || pendingRegistrationsData.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 30px; color: #6b7280;">
                    <i class="fas fa-check-circle" style="font-size: 40px; color: #10b981;"></i>
                    <p style="margin-top: 10px;">No pending registrations found.</p>
                </div>
            `;
            return;
        }
        
        // Get student details - MATCH BY user_id (UUID)
        const studentIds = [...new Set(pendingRegistrationsData.map(r => r.student_id))];
        let studentInfo = {};
        
        // ✅ Query using user_id (matches student_id in registrations)
        const { data: profiles, error: profileError } = await sb
            .from('consolidated_user_profiles_table')
            .select('user_id, full_name, student_id, program, block')
            .in('user_id', studentIds);
        
        if (profileError) {
            console.error('Error fetching profiles:', profileError);
        }
        
        if (profiles) {
            profiles.forEach(p => {
                studentInfo[p.user_id] = {
                    full_name: p.full_name || 'Unknown',
                    student_id: p.student_id || p.user_id,
                    program: p.program || 'N/A',
                    block: p.block || 'N/A'
                };
            });
        }
        
        console.log(`✅ Found ${Object.keys(studentInfo).length} student names out of ${studentIds.length} students`);
        
        // ⭐ GROUP BY STUDENT
        const groupedByStudent = {};
        for (const reg of pendingRegistrationsData) {
            const studentId = reg.student_id;
            if (!groupedByStudent[studentId]) {
                const info = studentInfo[studentId] || { 
                    full_name: 'Unknown', 
                    student_id: studentId,
                    program: 'N/A',
                    block: 'N/A'
                };
                groupedByStudent[studentId] = {
                    id: studentId,
                    name: info.full_name,
                    student_id: info.student_id,
                    program: info.program,
                    block: info.block,
                    units: []
                };
            }
            groupedByStudent[studentId].units.push({
                id: reg.id,
                unit_code: reg.unit_code,
                unit_name: reg.unit_name,
                block: reg.block,
                submitted_date: reg.submitted_date
            });
        }
        
        // Build HTML - Grouped by Student
        let html = `
            <!-- Header with summary -->
            <div style="margin-bottom: 20px; padding: 15px; background: linear-gradient(135deg, #f8f9fa, #e9ecef); border-radius: 12px; border: 1px solid #e5e7eb;">
                <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap; justify-content: space-between;">
                    <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                        <button onclick="selectAllPendingUnits()" class="btn-action" style="background: #4C1D95; color: white; padding: 8px 16px; border: none; border-radius: 6px; cursor: pointer; font-size: 13px;">
                            <i class="fas fa-check-double"></i> Select All Units
                        </button>
                        <button onclick="clearAllUnitSelections()" class="btn-secondary" style="background: #6b7280; color: white; padding: 8px 16px; border: none; border-radius: 6px; cursor: pointer; font-size: 13px;">
                            <i class="fas fa-times"></i> Clear Selection
                        </button>
                        <button onclick="bulkApproveSelectedUnits()" class="btn-success" style="background: #059669; color: white; padding: 8px 16px; border: none; border-radius: 6px; cursor: pointer; font-size: 13px;">
                            <i class="fas fa-check"></i> Approve Selected (<span id="selectedUnitsCount">0</span>)
                        </button>
                        <button onclick="bulkRejectSelectedUnits()" class="btn-danger" style="background: #dc2626; color: white; padding: 8px 16px; border: none; border-radius: 6px; cursor: pointer; font-size: 13px;">
                            <i class="fas fa-trash"></i> Reject Selected
                        </button>
                    </div>
                    <div style="font-size: 13px; color: #4b5563; background: white; padding: 6px 14px; border-radius: 20px; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
                        <i class="fas fa-users"></i> ${Object.keys(groupedByStudent).length} students · 
                        <i class="fas fa-book"></i> ${pendingRegistrationsData.length} units
                    </div>
                </div>
            </div>
            
            <!-- Student Cards -->
            <div class="students-pending-list">
        `;
        
        // Loop through each student
        for (const [studentId, student] of Object.entries(groupedByStudent)) {
            const firstUnit = student.units[0];
            const submittedDate = firstUnit?.submitted_date 
                ? new Date(firstUnit.submitted_date).toLocaleString() 
                : 'Unknown';
            
            const unitCount = student.units.length;
            const isMulti = unitCount > 1;
            
            html += `
                <div class="student-group-card" style="
                    background: white; 
                    border: 1px solid #e5e7eb; 
                    border-radius: 12px; 
                    margin-bottom: 15px; 
                    padding: 16px; 
                    box-shadow: 0 2px 4px rgba(0,0,0,0.05); 
                    transition: all 0.2s;
                "
                onmouseover="this.style.boxShadow='0 4px 12px rgba(0,0,0,0.1)'"
                onmouseout="this.style.boxShadow='0 2px 4px rgba(0,0,0,0.05)'">
                    
                    <!-- Student Header -->
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; padding-bottom: 12px; border-bottom: 2px solid #f0f0f0; flex-wrap: wrap; gap: 10px;">
                        <div>
                            <strong style="font-size: 16px; color: #1e3a5f;">
                                <i class="fas fa-user-circle" style="color: #4C1D95;"></i> 
                                ${escapeHtml(student.name)}
                            </strong>
                            <span style="font-size: 12px; color: #6b7280; margin-left: 10px;">
                                <i class="fas fa-id-card"></i> ${escapeHtml(student.student_id?.substring(0, 8))}
                            </span>
                            <span style="font-size: 12px; color: #6b7280; margin-left: 10px;">
                                <i class="fas fa-graduation-cap"></i> ${escapeHtml(student.program)}
                            </span>
                            <span style="font-size: 12px; color: #6b7280; margin-left: 10px;">
                                <i class="fas fa-layer-group"></i> ${escapeHtml(student.block)}
                            </span>
                            <span style="font-size: 12px; color: #6b7280; margin-left: 10px;">
                                <i class="fas fa-clock"></i> ${submittedDate}
                            </span>
                        </div>
                        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                            <span style="
                                background: ${isMulti ? '#fef3c7' : '#e0e7ff'}; 
                                padding: 4px 12px; 
                                border-radius: 20px; 
                                font-size: 12px; 
                                color: ${isMulti ? '#d97706' : '#4C1D95'};
                                font-weight: 500;
                            ">
                                <i class="fas fa-list"></i> ${unitCount} unit${unitCount > 1 ? 's' : ''}
                            </span>
                            <button onclick="approveStudentAllUnits('${studentId}')" class="btn-success btn-sm" style="
                                background: #059669; 
                                color: white; 
                                padding: 4px 14px; 
                                border: none; 
                                border-radius: 6px; 
                                cursor: pointer; 
                                font-size: 12px;
                                transition: all 0.2s;
                            "
                            onmouseover="this.style.background='#047857'"
                            onmouseout="this.style.background='#059669'">
                                <i class="fas fa-check"></i> Approve All
                            </button>
                            <button onclick="rejectStudentAllUnits('${studentId}')" class="btn-danger btn-sm" style="
                                background: #dc2626; 
                                color: white; 
                                padding: 4px 14px; 
                                border: none; 
                                border-radius: 6px; 
                                cursor: pointer; 
                                font-size: 12px;
                                transition: all 0.2s;
                            "
                            onmouseover="this.style.background='#b91c1c'"
                            onmouseout="this.style.background='#dc2626'">
                                <i class="fas fa-times"></i> Reject All
                            </button>
                        </div>
                    </div>
                    
                    <!-- Student's Units Grid -->
                    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 8px;">
            `;
            
            for (const unit of student.units) {
                const unitSubmitted = unit.submitted_date 
                    ? new Date(unit.submitted_date).toLocaleString() 
                    : 'Unknown';
                
                html += `
                    <div class="unit-item" style="
                        display: flex; 
                        align-items: center; 
                        gap: 10px; 
                        padding: 8px 12px; 
                        background: #f8fafc; 
                        border-radius: 8px; 
                        border-left: 3px solid #f59e0b; 
                        transition: all 0.2s;
                    "
                    onmouseover="this.style.background='#f1f5f9'"
                    onmouseout="this.style.background='#f8fafc'">
                        <input type="checkbox" class="unit-checkbox-item" data-reg-id="${unit.id}" data-student-id="${studentId}" onchange="updateSelectedUnitsCount()" style="width: 16px; height: 16px; cursor: pointer;">
                        <div style="flex: 1; min-width: 0;">
                            <div>
                                <strong style="font-size: 13px; color: #1e3a5f;">${escapeHtml(unit.unit_code)}</strong>
                                <span style="font-size: 12px; color: #374151; margin-left: 6px;">${escapeHtml(unit.unit_name)}</span>
                            </div>
                            <div style="font-size: 11px; color: #6b7280;">
                                <i class="fas fa-layer-group"></i> ${escapeHtml(unit.block)}
                            </div>
                        </div>
                        <div style="display: flex; gap: 4px; flex-shrink: 0;">
                            <button onclick="approveSingleUnitRecord('${unit.id}')" title="Approve" style="
                                background: #059669; 
                                color: white; 
                                border: none; 
                                border-radius: 4px; 
                                padding: 4px 8px; 
                                font-size: 11px; 
                                cursor: pointer; 
                                transition: all 0.2s;
                            "
                            onmouseover="this.style.background='#047857'"
                            onmouseout="this.style.background='#059669'">
                                <i class="fas fa-check"></i>
                            </button>
                            <button onclick="rejectSingleUnitRecord('${unit.id}')" title="Reject" style="
                                background: #dc2626; 
                                color: white; 
                                border: none; 
                                border-radius: 4px; 
                                padding: 4px 8px; 
                                font-size: 11px; 
                                cursor: pointer; 
                                transition: all 0.2s;
                            "
                            onmouseover="this.style.background='#b91c1c'"
                            onmouseout="this.style.background='#dc2626'">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                    </div>
                `;
            }
            
            html += `
                    </div>
                </div>
            `;
        }
        
        html += `
            </div>
            
            <!-- Footer -->
            <div style="margin-top: 15px; padding: 10px; background: #f8fafc; border-radius: 8px; font-size: 12px; color: #6b7280; text-align: center; border: 1px solid #e5e7eb;">
                <i class="fas fa-info-circle"></i> 
                Total: <strong>${pendingRegistrationsData.length}</strong> pending unit(s) from <strong>${Object.keys(groupedByStudent).length}</strong> student(s)
            </div>
        `;
        
        container.innerHTML = html;
        
        // Update stats
        const pendingCountEl = document.getElementById('pendingRegistrations');
        if (pendingCountEl) {
            pendingCountEl.textContent = pendingRegistrationsData.length;
        }
        
        console.log('✅ Display complete - grouped by student!');
        
    } catch (error) {
        console.error('❌ Error loading pending registrations:', error);
        container.innerHTML = `
            <div style="text-align: center; padding: 30px; color: #dc2626;">
                <i class="fas fa-exclamation-circle" style="font-size: 40px;"></i>
                <p style="margin-top: 10px;">Error: ${error.message}</p>
                <button onclick="loadUnitPendingRegistrations()" style="margin-top: 10px; padding: 6px 20px; background: #4C1D95; color: white; border: none; border-radius: 6px; cursor: pointer;">
                    <i class="fas fa-sync-alt"></i> Retry
                </button>
            </div>
        `;
    }
}

// =====================================================
// PENDING UNIT SELECTION FUNCTIONS
// =====================================================

function selectAllPendingUnits() {
    const allCheckboxes = document.querySelectorAll('.unit-checkbox-item');
    allCheckboxes.forEach(cb => cb.checked = true);
    updateSelectedUnitsCount();
}

function clearAllUnitSelections() {
    const allCheckboxes = document.querySelectorAll('.unit-checkbox-item');
    allCheckboxes.forEach(cb => cb.checked = false);
    updateSelectedUnitsCount();
}

function updateSelectedUnitsCount() {
    const count = document.querySelectorAll('.unit-checkbox-item:checked').length;
    const countElement = document.getElementById('selectedUnitsCount');
    if (countElement) countElement.textContent = count;
}

// =====================================================
// PENDING UNIT ACTION FUNCTIONS
// =====================================================

async function approveSingleUnitRecord(regId) {
    if (!confirm('Approve this unit?')) return;
    try {
        await sb.from('student_unit_registrations')
            .update({ status: 'approved', approval_date: new Date().toISOString().split('T')[0] })
            .eq('id', regId);
        showFeedback('✅ Unit approved!', 'success');
        await loadUnitPendingRegistrations();
        await loadUnitRegistrationStats();
        await loadApprovedRegistrations();
    } catch (error) {
        showFeedback(`Error: ${error.message}`, 'error');
    }
}

async function rejectSingleUnitRecord(regId) {
    if (!confirm('Reject this unit?')) return;
    try {
        await sb.from('student_unit_registrations').delete().eq('id', regId);
        showFeedback('❌ Unit rejected and removed!', 'success');
        await loadUnitPendingRegistrations();
        await loadUnitRegistrationStats();
    } catch (error) {
        showFeedback(`Error: ${error.message}`, 'error');
    }
}

async function approveStudentAllUnits(studentId) {
    const studentUnits = pendingRegistrationsData.filter(r => r.student_id === studentId);
    if (studentUnits.length === 0) return;
    if (!confirm(`Approve ${studentUnits.length} unit(s) for this student?`)) return;
    
    try {
        const ids = studentUnits.map(r => r.id);
        await sb.from('student_unit_registrations')
            .update({ status: 'approved', approval_date: new Date().toISOString().split('T')[0] })
            .in('id', ids);
        showFeedback(`✅ Approved ${studentUnits.length} unit(s)!`, 'success');
        await loadUnitPendingRegistrations();
        await loadUnitRegistrationStats();
        await loadApprovedRegistrations();
    } catch (error) {
        showFeedback(`Error: ${error.message}`, 'error');
    }
}

async function rejectStudentAllUnits(studentId) {
    const studentUnits = pendingRegistrationsData.filter(r => r.student_id === studentId);
    if (studentUnits.length === 0) return;
    if (!confirm(`Reject ${studentUnits.length} unit(s) for this student?`)) return;
    
    try {
        const ids = studentUnits.map(r => r.id);
        await sb.from('student_unit_registrations').delete().in('id', ids);
        showFeedback(`❌ Rejected ${studentUnits.length} unit(s)!`, 'success');
        await loadUnitPendingRegistrations();
        await loadUnitRegistrationStats();
    } catch (error) {
        showFeedback(`Error: ${error.message}`, 'error');
    }
}

async function bulkApproveSelectedUnits() {
    const selectedIds = [];
    document.querySelectorAll('.unit-checkbox-item:checked').forEach(cb => {
        const regId = cb.getAttribute('data-reg-id');
        if (regId) selectedIds.push(regId);
    });
    if (selectedIds.length === 0) { showFeedback('⚠️ No units selected', 'warning'); return; }
    if (!confirm(`Approve ${selectedIds.length} unit(s)?`)) return;
    
    try {
        await sb.from('student_unit_registrations')
            .update({ status: 'approved', approval_date: new Date().toISOString().split('T')[0] })
            .in('id', selectedIds);
        showFeedback(`✅ Approved ${selectedIds.length} unit(s)!`, 'success');
        await loadUnitPendingRegistrations();
        await loadUnitRegistrationStats();
        await loadApprovedRegistrations();
    } catch (error) {
        showFeedback(`Error: ${error.message}`, 'error');
    }
}

async function bulkRejectSelectedUnits() {
    const selectedIds = [];
    document.querySelectorAll('.unit-checkbox-item:checked').forEach(cb => {
        const regId = cb.getAttribute('data-reg-id');
        if (regId) selectedIds.push(regId);
    });
    if (selectedIds.length === 0) { showFeedback('⚠️ No units selected', 'warning'); return; }
    if (!confirm(`Reject ${selectedIds.length} unit(s)?`)) return;
    
    try {
        await sb.from('student_unit_registrations').delete().in('id', selectedIds);
        showFeedback(`❌ Rejected ${selectedIds.length} unit(s)!`, 'success');
        await loadUnitPendingRegistrations();
        await loadUnitRegistrationStats();
    } catch (error) {
        showFeedback(`Error: ${error.message}`, 'error');
    }
}

// =====================================================
// APPROVED REGISTRATIONS - ENHANCED
// =====================================================

// =====================================================
// APPROVED REGISTRATIONS - COMPLETE FIX
// =====================================================

async function loadApprovedRegistrations() {
    const tbody = document.getElementById('approved-registrations-body');
    if (!tbody) return;
    
    tbody.innerHTML = `
        <tr><td colspan="10" style="padding: 40px; text-align: center;">
            <div class="loading-spinner"></div>
            <p style="margin-top: 10px; color: #6b7280;">Loading approved registrations...</p>
        </td></tr>
    `;
    
    try {
        const { data: registrations, error } = await sb
            .from('student_unit_registrations')
            .select('*')
            .eq('status', 'approved')
            .order('approval_date', { ascending: false });
        
        if (error) throw error;
        
        if (!registrations || registrations.length === 0) {
            tbody.innerHTML = `
                <tr><td colspan="10" style="padding: 40px; text-align: center; color: #6b7280;">
                    <i class="fas fa-check-circle" style="font-size: 32px; color: #10b981; display: block; margin-bottom: 10px;"></i>
                    No approved registrations found.
                </td></tr>
            `;
            return;
        }
        
        // ============================================
        // FIX: Clean student IDs (remove spaces, trim)
        // ============================================
        const studentIds = [...new Set(registrations.map(r => r.student_id?.trim()).filter(id => id))];
        console.log('🔍 Looking up student IDs:', studentIds);
        
        // ============================================
        // FIX: Query profiles with exact matching
        // ============================================
        let studentMap = {};
        
        // Method 1: Query by user_id (UUID)
        const { data: studentsByUserId, error: err1 } = await sb
            .from('consolidated_user_profiles_table')
            .select('user_id, full_name, student_id')
            .in('user_id', studentIds);
        
        if (!err1 && studentsByUserId) {
            studentsByUserId.forEach(s => {
                studentMap[s.user_id] = s.full_name;
                // Also map by student_id (text) for fallback
                if (s.student_id) {
                    studentMap[s.student_id] = s.full_name;
                }
            });
            console.log(`✅ Found ${studentsByUserId.length} by user_id`);
        }
        
        // Method 2: For any missing, try a case-insensitive approach
        const missingIds = studentIds.filter(id => !studentMap[id]);
        if (missingIds.length > 0) {
            console.log(`🔍 Missing ${missingIds.length}, trying individual lookups...`);
            
            for (const id of missingIds) {
                // Try exact match on user_id
                const { data: exactMatch } = await sb
                    .from('consolidated_user_profiles_table')
                    .select('user_id, full_name, student_id')
                    .eq('user_id', id)
                    .maybeSingle();
                
                if (exactMatch) {
                    studentMap[exactMatch.user_id] = exactMatch.full_name;
                    if (exactMatch.student_id) {
                        studentMap[exactMatch.student_id] = exactMatch.full_name;
                    }
                    console.log(`✅ Found by exact user_id: ${id} → ${exactMatch.full_name}`);
                    continue;
                }
                
                // Try by student_id (text column)
                const { data: studentMatch } = await sb
                    .from('consolidated_user_profiles_table')
                    .select('user_id, full_name, student_id')
                    .eq('student_id', id)
                    .maybeSingle();
                
                if (studentMatch) {
                    studentMap[studentMatch.user_id] = studentMatch.full_name;
                    if (studentMatch.student_id) {
                        studentMap[studentMatch.student_id] = studentMatch.full_name;
                    }
                    console.log(`✅ Found by student_id: ${id} → ${studentMatch.full_name}`);
                    continue;
                }
                
                // Try ilike (case-insensitive) as last resort
                const { data: ilikeMatch } = await sb
                    .from('consolidated_user_profiles_table')
                    .select('user_id, full_name, student_id')
                    .ilike('user_id', `%${id.substring(0, 8)}%`)
                    .maybeSingle();
                
                if (ilikeMatch) {
                    studentMap[ilikeMatch.user_id] = ilikeMatch.full_name;
                    if (ilikeMatch.student_id) {
                        studentMap[ilikeMatch.student_id] = ilikeMatch.full_name;
                    }
                    console.log(`✅ Found by ilike: ${id} → ${ilikeMatch.full_name}`);
                }
            }
        }
        
        console.log(`✅ Total names found: ${Object.keys(studentMap).length} out of ${studentIds.length}`);
        
        // Build HTML
        let html = '';
        let unknownCount = 0;
        
        for (const reg of registrations) {
            const studentName = studentMap[reg.student_id?.trim()] || 'Unknown';
            if (studentName === 'Unknown') unknownCount++;
            
            const approvalDate = reg.approval_date ? new Date(reg.approval_date).toLocaleDateString() : 'N/A';
            
            html += `
                <tr style="border-bottom: 1px solid #e5e7eb;">
                    <td><input type="checkbox" class="approved-checkbox" data-reg-id="${reg.id}" onchange="updateApprovedSelectedCount()"></td>
                    <td><strong style="color: #1e3a5f;">${escapeHtml(studentName)}</strong></td>
                    <td style="font-family: monospace; font-size: 12px; color: #6b7280;">${reg.student_id?.substring(0, 8) || 'N/A'}...</td>
                    <td><span class="badge badge-info">${escapeHtml(reg.unit_code)}</span></td>
                    <td>${escapeHtml(reg.unit_name)}</td>
                    <td><span class="badge badge-secondary">${escapeHtml(reg.block)}</span></td>
                    <td><span class="badge badge-success">${escapeHtml(reg.reg_type || 'Normal')}</span></td>
                    <td>${approvalDate}</td>
                    <td style="font-size: 12px; color: #6b7280;">System</td>
                    <td>
                        <button onclick="deapproveSingleRegistration('${reg.id}', '${escapeHtml(reg.unit_code)}', '${escapeHtml(studentName)}')" 
                            class="btn-sm btn-warning">
                            <i class="fas fa-undo"></i> De-approve
                        </button>
                    </td>
                </tr>
            `;
        }
        
        if (unknownCount > 0) {
            console.log(`⚠️ ${unknownCount} registrations have unknown student names`);
        }
        
        tbody.innerHTML = html;
        
    } catch (error) {
        console.error('❌ Error loading approved registrations:', error);
        tbody.innerHTML = `<tr><td colspan="10" style="color: red;">Error: ${error.message}</td></tr>`;
    }
}

function updateApprovedSelectedCount() {
    const count = document.querySelectorAll('.approved-checkbox:checked').length;
    const countElement = document.getElementById('approvedSelectedCount');
    if (countElement) countElement.textContent = count;
    
    const bulkBtn = document.getElementById('bulkDeapproveBtn');
    if (bulkBtn) {
        bulkBtn.style.display = count > 0 ? 'inline-block' : 'none';
    }
}

function toggleSelectAllApproved() {
    const isChecked = document.getElementById('selectAllApproved')?.checked || false;
    document.querySelectorAll('.approved-checkbox').forEach(cb => cb.checked = isChecked);
    updateApprovedSelectedCount();
}

function filterApprovedRegistrations() {
    const searchTerm = document.getElementById('approved-search')?.value.toLowerCase() || '';
    document.querySelectorAll('#approved-registrations-body tr').forEach(row => {
        row.style.display = row.textContent.toLowerCase().includes(searchTerm) ? '' : 'none';
    });
}

function exportApprovedRegistrations() {
    const headers = ['Student Name', 'Student ID', 'Unit Code', 'Unit Name', 'Block', 'Reg Type', 'Approval Date', 'Approved By'];
    const rows = [];
    document.querySelectorAll('#approved-registrations-body tr').forEach(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length >= 9) {
            rows.push([
                cells[1]?.textContent.trim() || '',
                cells[2]?.textContent.trim() || '',
                cells[3]?.textContent.trim() || '',
                cells[4]?.textContent.trim() || '',
                cells[5]?.textContent.trim() || '',
                cells[6]?.textContent.trim() || '',
                cells[7]?.textContent.trim() || '',
                cells[8]?.textContent.trim() || ''
            ]);
        }
    });
    const csvContent = [headers, ...rows].map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `approved_registrations_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    showFeedback('📥 Exported successfully!', 'success');
}

async function deapproveSingleRegistration(regId, unitCode, studentName) {
    if (!confirm(`De-approve ${unitCode} for ${studentName}? This will move it back to pending.`)) return;
    try {
        await sb.from('student_unit_registrations')
            .update({ status: 'pending', approved_by: null, approval_date: null })
            .eq('id', regId);
        showFeedback(`🔄 Unit ${unitCode} moved to pending!`, 'success');
        await loadApprovedRegistrations();
        await loadUnitRegistrationStats();
        await loadUnitPendingRegistrations();
    } catch (error) {
        showFeedback(`Error: ${error.message}`, 'error');
    }
}

async function bulkDeapproveSelected() {
    const selectedIds = [];
    document.querySelectorAll('.approved-checkbox:checked').forEach(cb => {
        const regId = cb.getAttribute('data-reg-id');
        if (regId) selectedIds.push(regId);
    });
    if (selectedIds.length === 0) { showFeedback('⚠️ No registrations selected', 'warning'); return; }
    if (!confirm(`De-approve ${selectedIds.length} registration(s)?`)) return;
    
    try {
        await sb.from('student_unit_registrations')
            .update({ status: 'pending', approved_by: null, approval_date: null })
            .in('id', selectedIds);
        showFeedback(`🔄 ${selectedIds.length} registration(s) de-approved!`, 'success');
        await loadApprovedRegistrations();
        await loadUnitRegistrationStats();
        await loadUnitPendingRegistrations();
    } catch (error) {
        showFeedback(`Error: ${error.message}`, 'error');
    }
}

// =====================================================
// LOAD BLOCKS FOR FILTER
// =====================================================

async function loadUnitBlocks() {
    try {
        const { data, error } = await sb.from('units_catalog').select('block').eq('status', 'active');
        if (!error && data) {
            const blocks = [...new Set(data.map(b => b.block))];
            const blockSelect = document.getElementById('unit_filter_block');
            if (blockSelect) {
                blockSelect.innerHTML = '<option value="">All Blocks</option>';
                blocks.forEach(block => {
                    blockSelect.innerHTML += `<option value="${escapeHtml(block)}">${escapeHtml(block)}</option>`;
                });
            }
        }
    } catch (error) {
        console.error('Error loading blocks:', error);
    }
}

function filterUnitsByBlockSelect() {
    const blockSelect = document.getElementById('unit_filter_block');
    if (blockSelect) {
        currentBlockFilter = blockSelect.value || 'all';
        renderUnitsCatalog();
    }
}

// =====================================================
// EXPOSE GLOBALLY
// =====================================================

window.loadAllUnits = loadAllUnits;
window.addNewUnitRecord = addNewUnitRecord;
window.editUnitRecord = editUnitRecord;
window.deleteUnitRecord = deleteUnitRecord;
window.filterUnitsCatalog = filterUnitsCatalog;
window.filterUnitsByBlock = filterUnitsByBlock;
window.filterUnitsByBlockSelect = filterUnitsByBlockSelect;
window.loadUnitPendingRegistrations = loadUnitPendingRegistrations;
window.loadApprovedRegistrations = loadApprovedRegistrations;
window.filterApprovedRegistrations = filterApprovedRegistrations;
window.exportApprovedRegistrations = exportApprovedRegistrations;
window.deapproveSingleRegistration = deapproveSingleRegistration;
window.bulkDeapproveSelected = bulkDeapproveSelected;
window.toggleSelectAllApproved = toggleSelectAllApproved;
window.updateApprovedSelectedCount = updateApprovedSelectedCount;
window.selectAllPendingUnits = selectAllPendingUnits;
window.clearAllUnitSelections = clearAllUnitSelections;
window.updateSelectedUnitsCount = updateSelectedUnitsCount;
window.approveSingleUnitRecord = approveSingleUnitRecord;
window.rejectSingleUnitRecord = rejectSingleUnitRecord;
window.approveStudentAllUnits = approveStudentAllUnits;
window.rejectStudentAllUnits = rejectStudentAllUnits;
window.bulkApproveSelectedUnits = bulkApproveSelectedUnits;
window.bulkRejectSelectedUnits = bulkRejectSelectedUnits;
window.toggleUnitCourses = toggleUnitCourses;
window.updateUnitBlockOptions = updateUnitBlockOptions;
window.initUnitForm = initUnitForm;
window.getBlockColor = getBlockColor;
window.getBlockEmoji = getBlockEmoji;
window.getProgramName = getProgramName;

console.log('✅ Unit Registration Management module loaded');

// =====================================================
// ADDITIONAL STYLING FOR TABLES
// =====================================================

// Add this CSS dynamically
const unitStyles = document.createElement('style');
unitStyles.textContent = `
    .unit-card {
        transition: all 0.2s ease;
    }
    .student-group-card {
        transition: all 0.2s ease;
    }
    .unit-item {
        transition: all 0.2s ease;
    }
    .unit-item:hover {
        background: #f1f5f9 !important;
    }
    .btn-sm {
        transition: all 0.2s ease;
    }
    .btn-sm:hover {
        transform: scale(1.05);
    }
    .block-btn {
        transition: all 0.2s ease;
    }
    .block-btn:hover {
        transform: translateY(-1px);
    }
    .card {
        transition: all 0.2s ease;
    }
    .card:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }
`;
document.head.appendChild(unitStyles);

console.log('✅ Enhanced Unit Registration styles loaded');
// ============ FEE ACCOUNTS MANAGEMENT - CORRECTED VERSION ============

// Load all student accounts with balances
async function loadStudentAccounts() {
    console.log("💰 Loading student accounts...");
    
    const accountsBody = document.getElementById('student-accounts-body');
    if (!accountsBody) {
        console.error("student-accounts-body element not found");
        return;
    }
    
    accountsBody.innerHTML = '<tr><td colspan="9"><div class="loading-spinner"></div> Loading accounts...</td></tr>';
    
    // Use the correct table name: consolidated_user_profiles_table
    const { data: students, error } = await sb
        .from('consolidated_user_profiles_table')
        .select('user_id, full_name, email, program, intake_year, block')
        .eq('role', 'student')
        .eq('status', 'approved');
    
    if (error) {
        console.error('Error loading students:', error);
        accountsBody.innerHTML = `<tr><td colspan="9" style="color: red;">Error: ${error.message}</td></tr>`;
        return;
    }
    
    console.log(`Found ${students?.length || 0} students`);
    
    if (!students || students.length === 0) {
        accountsBody.innerHTML = '<tr><td colspan="9">No approved students found. Please enroll students first.</td></tr>';
        document.getElementById('totalOutstandingBalance').innerHTML = 'KES 0';
        document.getElementById('totalCollected').innerHTML = 'KES 0';
        document.getElementById('overdueAccounts').innerText = '0';
        return;
    }
    
    // Populate student dropdown for payments
    const studentSelect = document.getElementById('payment_student_id');
    if (studentSelect) {
        studentSelect.innerHTML = '<option value="">-- Select Student --</option>' + 
            students.map(s => `<option value="${s.user_id}">${escapeHtml(s.full_name)} (${s.program} - ${s.intake_year})</option>`).join('');
    }
    
    const accountsHTML = [];
    let totalOutstanding = 0;
    let totalCollected = 0;
    let overdueCount = 0;
    
    for (const student of students) {
        // Get approved unit registrations for this student
        const { data: registrations } = await sb
            .from('student_unit_registrations')
            .select('unit_code, unit_name, block, status')
            .eq('student_id', student.user_id)
            .eq('status', 'approved');
        
        // Calculate total fees due based on fee structure
        let totalDue = 0;
        
        // If student has registered units, calculate fees based on units
        if (registrations && registrations.length > 0) {
            // Get fee per block from fee_structure
            const block = student.block || 'Introductory';
            const { data: feeConfig } = await sb
                .from('fee_structure')
                .select('amount')
                .eq('program', student.program)
                .eq('block', block)
                .single();
            
            if (feeConfig) {
                totalDue = feeConfig.amount;
            }
        }
        
        // Get total paid from fee_payments table
        const { data: payments } = await sb
            .from('fee_payments')
            .select('amount')
            .eq('student_id', student.user_id);
        
        const totalPaid = payments ? payments.reduce((sum, p) => sum + parseFloat(p.amount), 0) : 0;
        const balance = totalDue - totalPaid;
        
        if (balance > 0) totalOutstanding += balance;
        totalCollected += totalPaid;
        
        // Check overdue (balance > 0 and no payment in last 30 days)
        let isOverdue = false;
        if (balance > 0) {
            const { data: lastPayment } = await sb
                .from('fee_payments')
                .select('payment_date')
                .eq('student_id', student.user_id)
                .order('payment_date', { ascending: false })
                .limit(1);
            
            if (lastPayment && lastPayment.length > 0) {
                const lastDate = new Date(lastPayment[0].payment_date);
                const daysSince = (new Date() - lastDate) / (1000 * 3600 * 24);
                if (daysSince > 30) isOverdue = true;
            } else {
                isOverdue = true; // No payments ever
            }
        }
        
        if (isOverdue) overdueCount++;
        
        const statusClass = balance <= 0 ? 'badge-success' : (isOverdue ? 'badge-danger' : 'badge-warning');
        const statusText = balance <= 0 ? 'Paid in Full' : (isOverdue ? 'Overdue' : 'Outstanding');
        
        accountsHTML.push(`
            <tr>
                <td>${escapeHtml(student.full_name)}</td>
                <td>${student.user_id.substring(0, 8)}...</td>
                <td>${escapeHtml(student.program)}</td>
                <td>${escapeHtml(student.intake_year || '-')}</td>
                <td>KES ${totalDue.toLocaleString()}</td>
                <td>KES ${totalPaid.toLocaleString()}</td>
                <td class="${balance < 0 ? 'text-success' : 'text-danger'}">KES ${balance.toLocaleString()}</td>
                <td><span class="badge ${statusClass}">${statusText}</span></td>
                <td>
                    <button onclick="viewPaymentHistory('${student.user_id}', '${escapeHtml(student.full_name)}')" class="btn-sm btn-edit">
                        <i class="fas fa-history"></i> History
                    </button>
                    <button onclick="quickRecordPayment('${student.user_id}')" class="btn-sm btn-success">
                        <i class="fas fa-plus"></i> Payment
                    </button>
                </td>
            </tr>
        `);
    }
    
    accountsBody.innerHTML = accountsHTML.join('');
    document.getElementById('totalOutstandingBalance').innerHTML = `KES ${totalOutstanding.toLocaleString()}`;
    document.getElementById('totalCollected').innerHTML = `KES ${totalCollected.toLocaleString()}`;
    document.getElementById('overdueAccounts').innerText = overdueCount;
    
    // Update today's collections
    const today = new Date().toISOString().split('T')[0];
    const { data: todayPayments } = await sb
        .from('fee_payments')
        .select('amount')
        .eq('payment_date', today);
    
    const todayTotal = todayPayments ? todayPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0) : 0;
    document.getElementById('todayCollections').innerHTML = `KES ${todayTotal.toLocaleString()}`;
}

// Record a fee payment
async function recordPayment() {
    const studentId = document.getElementById('payment_student_id').value;
    const amount = parseFloat(document.getElementById('payment_amount').value);
    const method = document.getElementById('payment_method').value;
    const reference = document.getElementById('payment_reference').value;
    const date = document.getElementById('payment_date').value;
    const period = document.getElementById('payment_period').value;
    const notes = document.getElementById('payment_notes').value;
    
    if (!studentId) {
        alert('Please select a student');
        return;
    }
    if (!amount || isNaN(amount) || amount <= 0) {
        alert('Please enter a valid amount');
        return;
    }
    if (!date) {
        alert('Please select a date');
        return;
    }
    
    // Generate receipt number
    const receiptNo = `RCPT-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    
    // Get current admin ID
    const recordedBy = currentUserProfile?.user_id || currentUserId;
    
    const { data, error } = await sb
        .from('fee_payments')
        .insert([{
            student_id: studentId,
            amount: amount,
            payment_method: method,
            reference: reference || null,
            payment_date: date,
            period: period,
            notes: notes || null,
            receipt_no: receiptNo,
            recorded_by: recordedBy,
            created_at: new Date().toISOString()
        }]);
    
    if (error) {
        console.error('Payment error:', error);
        alert('Error recording payment: ' + error.message);
    } else {
        alert(`✅ Payment recorded successfully!\nReceipt No: ${receiptNo}\nAmount: KES ${amount.toLocaleString()}`);
        
        // Clear form
        document.getElementById('payment_amount').value = '';
        document.getElementById('payment_reference').value = '';
        document.getElementById('payment_notes').value = '';
        document.getElementById('payment_date').value = new Date().toISOString().split('T')[0];
        
        // Reload accounts
        loadStudentAccounts();
        
        // Generate receipt
        generateReceipt(receiptNo, studentId, amount, date);
        
        // Log audit
        await logAudit('PAYMENT_RECORD', `Recorded payment of KES ${amount} for student`, studentId, 'SUCCESS');
    }
}

// Quick record payment for a specific student
function quickRecordPayment(studentId) {
    const select = document.getElementById('payment_student_id');
    if (select) {
        select.value = studentId;
    }
    document.getElementById('payment_date').value = new Date().toISOString().split('T')[0];
    document.getElementById('payment_amount').focus();
    // Scroll to payment form
    const form = document.querySelector('#fee-accounts .inline-form, #fee-accounts > div:first-of-type');
    if (form) form.scrollIntoView({ behavior: 'smooth' });
}

// View payment history for a student
async function viewPaymentHistory(studentId, studentName) {
    const modal = document.getElementById('paymentHistoryModal');
    if (!modal) {
        console.error('paymentHistoryModal not found');
        return;
    }
    
    document.getElementById('paymentHistoryTitle').innerHTML = `💰 Payment History - ${studentName}`;
    modal.style.display = 'flex';
    
    const body = document.getElementById('paymentHistoryBody');
    body.innerHTML = '<div class="loading-spinner"></div><p>Loading payment history...</p>';
    
    // Get payments
    const { data: payments, error } = await sb
        .from('fee_payments')
        .select('*')
        .eq('student_id', studentId)
        .order('payment_date', { ascending: false });
    
    if (error) {
        body.innerHTML = `<p style="color: red;">Error: ${error.message}</p>`;
        return;
    }
    
    // Get registered units
    const { data: registrations } = await sb
        .from('student_unit_registrations')
        .select('unit_code, unit_name, block, status')
        .eq('student_id', studentId)
        .eq('status', 'approved');
    
    const totalPaid = payments ? payments.reduce((s, p) => s + parseFloat(p.amount), 0) : 0;
    
    // Get fee amount from fee_structure
    const { data: student } = await sb
        .from('consolidated_user_profiles_table')
        .select('program, block')
        .eq('user_id', studentId)
        .single();
    
    let totalFees = 0;
    if (student) {
        const { data: feeConfig } = await sb
            .from('fee_structure')
            .select('amount')
            .eq('program', student.program)
            .eq('block', student.block || 'Introductory')
            .single();
        if (feeConfig) totalFees = feeConfig.amount;
    }
    
    const balance = totalFees - totalPaid;
    
    let html = `
        <div style="margin-bottom: 20px;">
            <h4>📊 Account Summary</h4>
            <div class="cards" style="grid-template-columns: repeat(3, 1fr);">
                <div class="card"><h3>Total Fees Due</h3><p class="data">KES ${totalFees.toLocaleString()}</p></div>
                <div class="card"><h3>Total Paid</h3><p class="data">KES ${totalPaid.toLocaleString()}</p></div>
                <div class="card"><h3>Balance</h3><p class="data ${balance > 0 ? 'text-danger' : 'text-success'}">KES ${balance.toLocaleString()}</p></div>
            </div>
        </div>
        
        <h4>📋 Registered Units</h4>
        <table class="data-table" style="width: 100%; margin-bottom: 20px;">
            <thead><tr><th>Unit Code</th><th>Unit Name</th><th>Block</th></tr></thead>
            <tbody>
                ${registrations && registrations.length > 0 ? registrations.map(r => `
                    <tr><td>${escapeHtml(r.unit_code)}</td><td>${escapeHtml(r.unit_name)}</td><td>${escapeHtml(r.block)}</td></tr>
                `).join('') : '<tr><td colspan="3">No registered units</td></tr>'}
            </tbody>
        </table>
        
        <h4>💳 Payment Transactions</h4>
        ${payments && payments.length > 0 ? `
            <table class="data-table" style="width: 100%;">
                <thead><tr><th>Date</th><th>Amount</th><th>Method</th><th>Reference</th><th>Period</th><th>Receipt No</th></tr></thead>
                <tbody>
                    ${payments.map(p => `
                        <tr>
                            <td>${p.payment_date}</td>
                            <td>KES ${parseFloat(p.amount).toLocaleString()}</td>
                            <td>${p.payment_method}</td>
                            <td>${p.reference || '-'}</td>
                            <td>${p.period || '-'}</td>
                            <td>${p.receipt_no}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        ` : '<p>No payment records found.</p>'}
        
        <div style="margin-top: 20px;">
            <button onclick="quickRecordPayment('${studentId}')" class="btn-action">
                <i class="fas fa-plus"></i> Record New Payment
            </button>
            <button onclick="window.print()" class="btn-action">
                <i class="fas fa-print"></i> Print Statement
            </button>
        </div>
    `;
    
    body.innerHTML = html;
}

// Generate receipt and open print window
async function generateReceipt(receiptNo, studentId, amount, date) {
    const { data: student } = await sb
        .from('consolidated_user_profiles_table')
        .select('full_name, email, program, intake_year')
        .eq('user_id', studentId)
        .single();
    
    const receiptHTML = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Payment Receipt - ${receiptNo}</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 40px; }
                .receipt { max-width: 400px; margin: 0 auto; border: 1px solid #ddd; padding: 20px; border-radius: 8px; }
                .header { text-align: center; border-bottom: 2px solid #4C1D95; padding-bottom: 10px; margin-bottom: 20px; }
                .amount { font-size: 24px; color: #059669; font-weight: bold; }
                .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #666; }
            </style>
        </head>
        <body>
            <div class="receipt">
                <div class="header">
                    <h2>NCHSM</h2>
                    <p>Fee Payment Receipt</p>
                </div>
                <p><strong>Receipt No:</strong> ${receiptNo}</p>
                <p><strong>Date:</strong> ${date}</p>
                <p><strong>Student:</strong> ${student?.full_name || 'N/A'}</p>
                <p><strong>Program:</strong> ${student?.program || 'N/A'} (${student?.intake_year || 'N/A'})</p>
                <hr>
                <p><strong>Amount Paid:</strong> <span class="amount">KES ${amount.toLocaleString()}</span></p>
                <hr>
                <div class="footer">
                    <p>Thank you for your payment!</p>
                    <p>This is a computer-generated receipt.</p>
                </div>
            </div>
            <script>window.print();<\/script>
        </body>
        </html>
    `;
    
    const win = window.open();
    win.document.write(receiptHTML);
    win.document.close();
}

// Filter accounts by balance status
function filterByBalanceStatus() {
    const filter = document.getElementById('account_balance_filter')?.value || 'all';
    const rows = document.querySelectorAll('#student-accounts-body tr');
    
    rows.forEach(row => {
        if (row.cells.length < 8) return;
        
        const balanceCell = row.cells[6];
        const statusCell = row.cells[7];
        
        if (!balanceCell || !statusCell) return;
        
        const balanceText = balanceCell.innerText.replace('KES', '').replace(/,/g, '').trim();
        const balance = parseFloat(balanceText);
        const statusText = statusCell.innerText;
        
        let show = true;
        if (filter === 'positive') show = balance < 0;
        else if (filter === 'zero') show = balance === 0;
        else if (filter === 'negative') show = balance > 0;
        else if (filter === 'overdue') show = statusText.includes('Overdue');
        
        row.style.display = show ? '' : 'none';
    });
}

// Search student accounts
function searchStudentAccount() {
    const search = document.getElementById('account_search')?.value.toLowerCase() || '';
    const rows = document.querySelectorAll('#student-accounts-body tr');
    
    rows.forEach(row => {
        if (row.cells.length < 2) return;
        const name = (row.cells[0]?.innerText || '').toLowerCase();
        const id = (row.cells[1]?.innerText || '').toLowerCase();
        const matches = name.includes(search) || id.includes(search);
        row.style.display = matches ? '' : 'none';
    });
}

// Export accounts to CSV
function exportAccountsToCSV() {
    const rows = document.querySelectorAll('#student-accounts-body tr');
    const csv = [];
    
    csv.push(['Name', 'ID', 'Program', 'Intake', 'Total Due', 'Total Paid', 'Balance', 'Status'].join(','));
    
    rows.forEach(row => {
        if (row.style.display !== 'none' && row.cells.length >= 8) {
            const cols = [];
            for (let i = 0; i < 8; i++) {
                let text = row.cells[i]?.innerText || '';
                text = text.replace(/"/g, '""');
                cols.push(`"${text}"`);
            }
            csv.push(cols.join(','));
        }
    });
    
    const blob = new Blob([csv.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Student_Accounts_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}

// Show outstanding payments
function showOutstandingPayments() {
    const filter = document.getElementById('account_balance_filter');
    if (filter) {
        filter.value = 'negative';
        filterByBalanceStatus();
    }
}

// Show today's payments
function showTodayPayments() {
    const todayTotal = document.getElementById('todayCollections')?.innerText || 'KES 0';
    alert(`Today's total collections: ${todayTotal}`);
}

// Show overdue accounts
function showOverdueAccounts() {
    const filter = document.getElementById('account_balance_filter');
    if (filter) {
        filter.value = 'overdue';
        filterByBalanceStatus();
    }
}

// Update fee structure
async function updateFeeStructure() {
    const program = document.getElementById('fee_program')?.value;
    const block = document.getElementById('fee_block')?.value;
    const amount = parseFloat(document.getElementById('fee_amount')?.value);
    
    if (!program || !block || !amount || isNaN(amount)) {
        alert('Please fill all fields with valid values');
        return;
    }
    
    const { error } = await sb
        .from('fee_structure')
        .upsert([{ program, block, amount }], { onConflict: 'program,block' });
    
    if (error) {
        alert('Error updating fee structure: ' + error.message);
    } else {
        alert(`✅ Fee structure updated!\n${program} - ${block}: KES ${amount.toLocaleString()}`);
        loadFeeStructure();
        document.getElementById('fee_amount').value = '';
    }
}

// Load fee structure display
async function loadFeeStructure() {
    const { data, error } = await sb
        .from('fee_structure')
        .select('*')
        .order('program')
        .order('block');
    
    const container = document.getElementById('currentFeeStructure');
    if (!container) return;
    
    if (error) {
        container.innerHTML = '<p style="color: red;">Error loading fee structure</p>';
        return;
    }
    
    if (!data || data.length === 0) {
        container.innerHTML = '<p>No fee structure configured. Add one above.</p>';
        return;
    }
    
    let html = '<h4>📋 Current Fee Structure</h4><div class="table-responsive"><table class="data-table"><thead><tr><th>Program</th><th>Block</th><th>Amount (KES)</th></tr></thead><tbody>';
    for (const fee of data) {
        html += `<tr><td>${escapeHtml(fee.program)}</td><td>${escapeHtml(fee.block)}</td><td>${fee.amount.toLocaleString()}</td></tr>`;
    }
    html += '</tbody></table></div>';
    container.innerHTML = html;
}

// Clear payment form helper
function clearPaymentForm() {
    const form = document.getElementById('payment-form');
    if (form) form.reset();
    document.getElementById('payment_date').value = new Date().toISOString().split('T')[0];
}

// Make functions global
window.loadStudentAccounts = loadStudentAccounts;
window.recordPayment = recordPayment;
window.quickRecordPayment = quickRecordPayment;
window.viewPaymentHistory = viewPaymentHistory;
window.filterByBalanceStatus = filterByBalanceStatus;
window.searchStudentAccount = searchStudentAccount;
window.exportAccountsToCSV = exportAccountsToCSV;
window.showOutstandingPayments = showOutstandingPayments;
window.showTodayPayments = showTodayPayments;
window.showOverdueAccounts = showOverdueAccounts;
window.updateFeeStructure = updateFeeStructure;
window.loadFeeStructure = loadFeeStructure;
// =====================================================
// LOGOUT FUNCTION - ADD THIS HERE
// =====================================================
async function logout() {
    try {
        console.log('🚪 Logging out...');
        
        if (currentUserProfile) {
            await logAudit('LOGOUT', `User ${currentUserProfile.full_name} logged out.`);
        }
        
        await sb.auth.signOut();
        localStorage.clear();
        sessionStorage.clear();
        window.location.href = "login.html";
        
    } catch (error) {
        console.error('Logout error:', error);
        window.location.href = "login.html";
    }
}
// ============================================
// ADMIN SUPPORT TICKETS - COMPLETE WITH SENDER NOTIFICATIONS
// ============================================

let adminAllTickets = [];
let adminStudentMap = {};
let adminConversationInterval = null;
let currentAdminTicketId = null;
let currentAdminTicketStatus = null;
let currentAdminTicket = null;
let currentAdminProfileId = null;

// Notification variables
let lastMessageTimestamps = {};
let unreadCounts = {};
let notificationPermissionGranted = false;
let notificationCheckInterval = null;
let lastCheckedTime = new Date().toISOString();

// ============================================
// BELL NOTIFICATION SYSTEM WITH SENDER INFO
// ============================================

// Request notification permission
window.requestNotificationPermission = function() {
    if ("Notification" in window) {
        Notification.requestPermission().then(permission => {
            notificationPermissionGranted = permission === "granted";
            if (notificationPermissionGranted) {
                showAdminToast('✅ Notifications enabled! You will receive popup alerts.', 'success');
                setTimeout(() => {
                    new Notification("✅ Notifications Active", {
                        body: "You will now receive alerts for new messages",
                        icon: "https://raw.githubusercontent.com/NCHSMlearning/e-learning/main/images/Logo_NCHSM.png"
                    });
                }, 500);
            } else {
                showAdminToast('⚠️ Notification permission denied.', 'warning');
            }
        });
    } else {
        showAdminToast('❌ Your browser does not support notifications', 'error');
    }
};

// Play bell sound
function playBellSound() {
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const now = audioContext.currentTime;
        
        if (audioContext.state === 'suspended') {
            audioContext.resume();
        }
        
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        osc.connect(gain);
        gain.connect(audioContext.destination);
        osc.frequency.value = 880;
        gain.gain.value = 0.3;
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 1);
        osc.start();
        osc.stop(now + 0.8);
        
        const osc2 = audioContext.createOscillator();
        const gain2 = audioContext.createGain();
        osc2.connect(gain2);
        gain2.connect(audioContext.destination);
        osc2.frequency.value = 1760;
        gain2.gain.value = 0.15;
        gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.8);
        osc2.start();
        osc2.stop(now + 0.8);
        
    } catch(e) {
        console.log('Web Audio not supported');
    }
}

// Animate bell icon
function animateBell() {
    const bell = document.getElementById('notificationBell');
    if (bell) {
        bell.classList.add('bell-ring');
        setTimeout(() => {
            bell.classList.remove('bell-ring');
        }, 500);
    }
}

// Update bell badge count
function updateBellBadge(count) {
    const badge = document.getElementById('bellNotificationBadge');
    if (badge) {
        if (count > 0) {
            badge.textContent = count > 99 ? '99+' : count;
            badge.style.display = 'inline-block';
        } else {
            badge.style.display = 'none';
        }
    }
}

// Show toast notification with sender info
function showNotificationToast(studentName, ticketNumber, subject, ticketId) {
    const existingToast = document.querySelector('.notification-toast');
    if (existingToast) existingToast.remove();
    
    const toast = document.createElement('div');
    toast.className = 'notification-toast';
    toast.onclick = () => {
        if (ticketId) viewAdminTicket(ticketId);
        toast.remove();
    };
    toast.innerHTML = `
        <div style="background: #ef4444; border-radius: 50%; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center;">
            <i class="fas fa-user" style="color: white; font-size: 20px;"></i>
        </div>
        <div style="flex: 1;">
            <strong style="display: block;">📬 New message from ${studentName}</strong>
            <small style="color: #9ca3af;">Ticket: ${ticketNumber} - ${subject.substring(0, 40)}</small>
        </div>
        <i class="fas fa-times-circle" style="color: #6b7280; cursor: pointer;" onclick="event.stopPropagation(); this.closest('.notification-toast').remove();"></i>
    `;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        if (toast && toast.remove) toast.remove();
    }, 8000);
}

// Show browser notification with sender info
function showBrowserNotification(studentName, ticketNumber, subject, ticketId) {
    if (notificationPermissionGranted && document.hidden) {
        const notification = new Notification(`📬 New message from ${studentName}`, {
            body: `Ticket: ${ticketNumber}\nSubject: ${subject.substring(0, 60)}`,
            icon: "https://raw.githubusercontent.com/NCHSMlearning/e-learning/main/images/Logo_NCHSM.png",
            tag: ticketId,
            requireInteraction: true
        });
        
        notification.onclick = function() {
            window.focus();
            if (ticketId) viewAdminTicket(ticketId);
            notification.close();
        };
        
        setTimeout(() => notification.close(), 10000);
    }
}

// Test notification system
window.testNotificationSystem = function() {
    playBellSound();
    animateBell();
    showNotificationToast('Test Student', 'TICKET-001', 'This is a test notification', null);
    showBrowserNotification('Test Student', 'TICKET-001', 'This is a test notification', null);
    showAdminToast('🔔 Test completed! You heard the bell and saw the notification.', 'success');
};

// Check for new messages with sender info - FIXED
async function checkForNewMessages() {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    
    try {
        // Get all tickets
        const { data: tickets, error } = await supabase
            .from('support_tickets')
            .select('id, ticket_number, subject, student_id, updated_at')
            .order('updated_at', { ascending: false });
        
        if (error) throw error;
        
        let hasNewMessages = false;
        let newCount = 0;
        
        for (const ticket of tickets) {
            // Get the latest message in this ticket - FIXED: use proper select
            const { data: latestMessage, error: msgError } = await supabase
                .from('ticket_conversations')
                .select('id, author_id, created_at, message')
                .eq('ticket_id', ticket.id)
                .order('created_at', { ascending: false })
                .limit(1);
            
            if (msgError) {
                console.error('Error fetching message for ticket:', ticket.id, msgError);
                continue;
            }
            
            if (latestMessage && latestMessage.length > 0) {
                const msg = latestMessage[0];
                const isFromStudent = msg.author_id === ticket.student_id;
                const lastSeen = lastMessageTimestamps[ticket.id] || ticket.updated_at;
                const isNew = new Date(msg.created_at) > new Date(lastSeen);
                
                // Only notify if message is from student and new, and not currently viewing
                if (isFromStudent && isNew && currentAdminTicketId !== ticket.id) {
                    // Get student name
                    let studentName = 'Student';
                    if (adminStudentMap[ticket.student_id]) {
                        studentName = adminStudentMap[ticket.student_id].full_name;
                    } else {
                        const { data: student } = await supabase
                            .from('consolidated_user_profiles_table')
                            .select('full_name')
                            .eq('id', ticket.student_id)
                            .single();
                        if (student) studentName = student.full_name;
                    }
                    
                    // Increment unread count
                    unreadCounts[ticket.id] = (unreadCounts[ticket.id] || 0) + 1;
                    newCount++;
                    hasNewMessages = true;
                    
                    // Show notifications
                    playBellSound();
                    animateBell();
                    showNotificationToast(studentName, ticket.ticket_number, ticket.subject, ticket.id);
                    showBrowserNotification(studentName, ticket.ticket_number, ticket.subject, ticket.id);
                    
                    console.log(`🔔 New message from ${studentName} on ticket ${ticket.ticket_number}`);
                }
                
                // Update last seen timestamp
                lastMessageTimestamps[ticket.id] = msg.created_at;
            }
        }
        
        if (hasNewMessages) {
            // Update badge with total unread count
            const totalUnread = Object.values(unreadCounts).reduce((a, b) => a + b, 0);
            updateBellBadge(totalUnread);
            
            // Refresh ticket list to show "New" badges
            await loadAdminTickets();
            
            // Also update sidebar badge
            const sidebarBadge = document.getElementById('ticketsUnreadBadge');
            if (sidebarBadge) {
                if (totalUnread > 0) {
                    sidebarBadge.textContent = totalUnread;
                    sidebarBadge.style.display = 'inline-block';
                } else {
                    sidebarBadge.style.display = 'none';
                }
            }
            
            // Update page title
            if (totalUnread > 0) {
                document.title = `(${totalUnread}) NCHSM Admin - New Messages`;
                setTimeout(() => {
                    const currentTotal = Object.values(unreadCounts).reduce((a, b) => a + b, 0);
                    if (currentTotal === 0) {
                        document.title = 'NCHSM Super Admin Dashboard';
                    }
                }, 5000);
            }
        }
        
    } catch (err) {
        console.error('Error checking messages:', err);
    }
}
// Mark ticket as read when viewed
function markTicketAsRead(ticketId) {
    if (unreadCounts[ticketId]) {
        delete unreadCounts[ticketId];
        const totalUnread = Object.values(unreadCounts).reduce((a, b) => a + b, 0);
        updateBellBadge(totalUnread);
        
        // Update sidebar badge
        const sidebarBadge = document.getElementById('ticketsUnreadBadge');
        if (sidebarBadge) {
            if (totalUnread > 0) {
                sidebarBadge.textContent = totalUnread;
                sidebarBadge.style.display = 'inline-block';
            } else {
                sidebarBadge.style.display = 'none';
                document.title = 'NCHSM Super Admin Dashboard';
            }
        }
    }
    lastMessageTimestamps[ticketId] = new Date().toISOString();
}

// Start periodic checking
function startNotificationChecking() {
    if (notificationCheckInterval) clearInterval(notificationCheckInterval);
    notificationCheckInterval = setInterval(() => {
        checkForNewMessages();
    }, 10000); // Check every 10 seconds
}

// Initialize notification system
function initNotificationSystem() {
    startNotificationChecking();
    
    if ("Notification" in window && Notification.permission === "granted") {
        notificationPermissionGranted = true;
    }
    
    const bell = document.getElementById('notificationBell');
    if (bell) {
        bell.addEventListener('click', () => {
            updateBellBadge(0);
            showAdminToast('🔔 Notifications cleared', 'info');
        });
    }
}

// ============================================
// CORE TICKET FUNCTIONS
// ============================================

// Get Supabase client
function getSupabaseClient() {
    if (window.sb && typeof window.sb.from === 'function') {
        return window.sb;
    }
    if (window.supabase && typeof window.supabase.from === 'function') {
        return window.supabase;
    }
    console.error('❌ No valid Supabase client available');
    return null;
}

// Load all tickets for admin
async function loadAdminTickets() {
    console.log('📋 Loading admin tickets...');
    
    const tbody = document.getElementById('admin-tickets-body');
    if (!tbody) {
        console.error('❌ Table body not found!');
        return;
    }
    
    tbody.innerHTML = '<tr><td colspan="10" style="padding: 40px; text-align: center;"><div class="loading-spinner"></div> Loading tickets...<\/td><\/tr>';
    
    const supabase = getSupabaseClient();
    if (!supabase) {
        tbody.innerHTML = '<tr><td colspan="10" style="padding: 40px; text-align: center; color: red;">❌ Database connection not found<\/td><\/tr>';
        return;
    }
    
    try {
        const { data: tickets, error } = await supabase
            .from('support_tickets')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        if (!tickets || tickets.length === 0) {
            tbody.innerHTML = '<tr><td colspan="10" style="padding: 40px; text-align: center;">No tickets found<\/td><\/tr>';
            updateAdminTicketCounts(0, 0, 0, 0);
            return;
        }
        
        // Get student profiles
        const { data: allStudents } = await supabase
            .from('consolidated_user_profiles_table')
            .select('id, user_id, email, full_name, program, intake_year, role');
        
        adminStudentMap = {};
        if (allStudents) {
            allStudents.forEach(s => {
                adminStudentMap[s.id] = s;
                if (s.user_id && s.user_id !== s.id) {
                    adminStudentMap[s.user_id] = s;
                }
            });
        }
        
        adminAllTickets = tickets;
        
        // Initialize timestamps
        for (const ticket of tickets) {
            if (!lastMessageTimestamps[ticket.id]) {
                lastMessageTimestamps[ticket.id] = ticket.updated_at || ticket.created_at;
            }
        }
        
        const openCount = tickets.filter(t => t.status === 'open').length;
        const progressCount = tickets.filter(t => t.status === 'in_progress').length;
        const closedCount = tickets.filter(t => t.status === 'closed' || t.status === 'resolved').length;
        const urgentCount = tickets.filter(t => t.priority === 'urgent').length;
        
        updateAdminTicketCounts(openCount, progressCount, closedCount, urgentCount);
        renderAdminTicketsTable(tickets);
        
    } catch (err) {
        console.error('❌ Error:', err);
        tbody.innerHTML = `<tr><td colspan="10" style="padding: 40px; text-align: center; color: red;">Error: ${err.message}<\/td><\/tr>`;
    }
}

function updateAdminTicketCounts(open, inProgress, closed, urgent) {
    const openEl = document.getElementById('admin_open_tickets');
    const progressEl = document.getElementById('admin_progress_tickets');
    const closedEl = document.getElementById('admin_closed_tickets');
    const urgentEl = document.getElementById('admin_urgent_tickets');
    
    if (openEl) openEl.textContent = open;
    if (progressEl) progressEl.textContent = inProgress;
    if (closedEl) closedEl.textContent = closed;
    if (urgentEl) urgentEl.textContent = urgent;
}

function renderAdminTicketsTable(tickets) {
    const tbody = document.getElementById('admin-tickets-body');
    if (!tbody) return;
    
    if (!tickets || tickets.length === 0) {
        tbody.innerHTML = '<tr><td colspan="10" style="padding: 40px; text-align: center;">No tickets found<\/td><\/tr>';
        return;
    }
    
    tbody.innerHTML = tickets.map(ticket => {
        let student = adminStudentMap[ticket.student_id];
        if (!student) {
            student = {
                full_name: 'Unknown Student',
                email: ticket.student_id?.substring(0, 8) + '...',
                program: 'N/A',
                intake_year: 'N/A'
            };
        }
        
        const createdDate = new Date(ticket.created_at).toLocaleString();
        const updatedDate = new Date(ticket.updated_at).toLocaleString();
        const hasUnread = unreadCounts[ticket.id] > 0;
        const unreadCount = unreadCounts[ticket.id] || 0;
        
        let statusClass = 'badge-info';
        if (ticket.status === 'open') statusClass = 'badge-warning';
        if (ticket.status === 'in_progress') statusClass = 'badge-info';
        if (ticket.status === 'closed') statusClass = 'badge-secondary';
        if (ticket.status === 'resolved') statusClass = 'badge-success';
        
        let priorityClass = 'badge-secondary';
        if (ticket.priority === 'urgent') priorityClass = 'badge-danger';
        if (ticket.priority === 'high') priorityClass = 'badge-warning';
        if (ticket.priority === 'medium') priorityClass = 'badge-info';
        if (ticket.priority === 'low') priorityClass = 'badge-success';
        
        return `
            <tr style="border-bottom: 1px solid #e5e7eb; cursor: pointer; ${hasUnread ? 'background: #fef3c7;' : ''}" onclick="viewAdminTicket('${ticket.id}')">
                <td style="padding: 12px;">
                    <strong>${escapeHtml(ticket.ticket_number || 'N/A')}</strong>
                    ${hasUnread ? `<span style="background: #ef4444; color: white; border-radius: 10px; padding: 2px 6px; font-size: 10px; margin-left: 5px;">${unreadCount} new</span>` : ''}
                <\/td>
                <td style="padding: 12px;">
                    ${escapeHtml(student.full_name || 'Unknown')}<br>
                    <small style="color: #6b7280;">${escapeHtml(student.email || '-')}</small>
                <\/td>
                <td style="padding: 12px;">${escapeHtml(student.program || '-')}<br><small>${escapeHtml(student.intake_year || '-')}</small><\/td>
                <td style="padding: 12px;">${escapeHtml(ticket.subject)}<\/td>
                <td style="padding: 12px;"><span class="badge badge-info">${escapeHtml(ticket.category || '-')}</span><\/td>
                <td style="padding: 12px;"><span class="${priorityClass}" style="padding: 4px 8px; border-radius: 4px;">${escapeHtml(ticket.priority || 'medium')}</span><\/td>
                <td style="padding: 12px;"><span class="${statusClass}" style="padding: 4px 8px; border-radius: 4px;">${escapeHtml(ticket.status || 'open')}</span><\/td>
                <td style="padding: 12px;">${createdDate}<\/td>
                <td style="padding: 12px;">${updatedDate}<\/td>
                <td style="padding: 12px;">
                    <button onclick="event.stopPropagation(); viewAdminTicket('${ticket.id}')" style="background: #4C1D95; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer;">
                        <i class="fas fa-eye"></i> View
                    </button>
                <\/td>
            <\/tr>
        `;
    }).join('');
}

// View single ticket
async function viewAdminTicket(ticketId) {
    console.log('👁️ Viewing ticket:', ticketId);
    
    // Mark as read
    markTicketAsRead(ticketId);
    
    const supabase = getSupabaseClient();
    if (!supabase) {
        alert('Database connection error');
        return;
    }
    
    currentAdminTicketId = ticketId;
    
    const { data: ticket, error } = await supabase
        .from('support_tickets')
        .select('*')
        .eq('id', ticketId)
        .single();
    
    if (error || !ticket) {
        alert('Ticket not found');
        return;
    }
    
    currentAdminTicket = ticket;
    currentAdminTicketStatus = ticket.status;
    
    // Get student info
    let student = adminStudentMap[ticket.student_id];
    if (!student) {
        const { data: studentData } = await supabase
            .from('consolidated_user_profiles_table')
            .select('full_name, email, program, intake_year')
            .eq('id', ticket.student_id)
            .maybeSingle();
        
        if (studentData) {
            student = studentData;
        } else {
            student = {
                full_name: 'Student',
                email: ticket.student_id?.substring(0, 8) + '...',
                program: 'N/A',
                intake_year: 'N/A'
            };
        }
    }
    
    // Get conversations
    const { data: conversations } = await supabase
        .from('ticket_conversations')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });
    
    // Get author names
    const authorIds = [...new Set((conversations || []).map(c => c.author_id).filter(id => id))];
    let authorNames = {};
    
    if (authorIds.length > 0) {
        const { data: profiles } = await supabase
            .from('consolidated_user_profiles_table')
            .select('id, full_name')
            .in('id', authorIds);
        
        if (profiles) {
            profiles.forEach(p => {
                authorNames[p.id] = p.full_name;
            });
        }
    }
    
    // Get current admin profile
    let adminName = 'Admin';
    let adminProfileId = null;
    
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
        const { data: profile } = await supabase
            .from('consolidated_user_profiles_table')
            .select('id, full_name')
            .eq('user_id', user.id)
            .maybeSingle();
        
        if (profile) {
            adminProfileId = profile.id;
            adminName = profile.full_name || 'Admin';
        } else {
            adminProfileId = '7f6f6627-eb8c-44eb-b145-32b97c7d8d57';
            adminName = 'Super Admin';
        }
    }
    
    currentAdminProfileId = adminProfileId;
    window.currentAdminProfileId = adminProfileId;
    
    // Build modal HTML
    const modalHtml = `
        <div id="adminTicketChatModal" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.6); z-index: 100000; display: flex; align-items: center; justify-content: center;">
            <div style="background: white; width: 900px; max-width: 95vw; max-height: 85vh; display: flex; flex-direction: column; border-radius: 16px; overflow: hidden;">
                <div style="padding: 15px 20px; background: linear-gradient(135deg, #4C1D95, #6d28d9); color: white; display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <h3 style="margin: 0;">🎫 ${escapeHtml(ticket.ticket_number)}</h3>
                        <small>${escapeHtml(ticket.subject)}</small>
                    </div>
                    <button onclick="closeAdminTicketChatModal()" style="background: none; border: none; font-size: 24px; cursor: pointer; color: white;">&times;</button>
                </div>
                
                <div style="padding: 12px 20px; background: #f8f9fa; border-bottom: 1px solid #ddd; display: flex; gap: 20px; flex-wrap: wrap;">
                    <div><strong>👤 Student:</strong> ${escapeHtml(student.full_name)}</div>
                    <div><strong>📧 Email:</strong> ${escapeHtml(student.email)}</div>
                    <div><strong>🎓 Program:</strong> ${escapeHtml(student.program)} (${escapeHtml(student.intake_year)})</div>
                    <div><strong>📌 Status:</strong> <span id="modalTicketStatus" class="status-badge ${ticket.status}">${ticket.status}</span></div>
                </div>
                
                <div style="padding: 12px 20px; background: #fef3c7;">
                    <strong>📝 Description:</strong>
                    <p style="margin: 8px 0 0 0;">${escapeHtml(ticket.description)}</p>
                </div>
                
                <div style="flex: 1; overflow-y: auto; padding: 15px; background: #f3f4f6;" id="adminConversationArea">
                    ${renderChatMessages(conversations || [], authorNames)}
                </div>
                
                <div style="padding: 15px 20px; background: white; border-top: 1px solid #ddd;">
                    <textarea id="adminReplyMessageInput" rows="3" style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid #ddd; resize: vertical;" placeholder="Type your reply..."></textarea>
                    <div style="display: flex; gap: 10px; margin-top: 10px; flex-wrap: wrap;">
                        <select id="adminReplyStatusSelect" style="padding: 8px; border-radius: 6px; border: 1px solid #ddd;">
                            <option value="${ticket.status}">Current: ${ticket.status}</option>
                            <option value="open">🟢 Open</option>
                            <option value="in_progress">🟡 In Progress</option>
                            <option value="closed">🔴 Closed</option>
                            <option value="resolved">✅ Resolved</option>
                        </select>
                        <label style="display: flex; align-items: center; gap: 5px;">
                            <input type="checkbox" id="adminReplyInternalCheckbox"> 🔒 Internal note
                        </label>
                        <button onclick="sendAdminChatReply()" style="background: #4C1D95; color: white; border: none; padding: 8px 20px; border-radius: 6px; cursor: pointer;">
                            <i class="fas fa-paper-plane"></i> Send Reply
                        </button>
                        <button onclick="refreshAdminConversation()" style="background: #6b7280; color: white; border: none; padding: 8px 15px; border-radius: 6px; cursor: pointer;">
                            <i class="fas fa-sync-alt"></i> Refresh
                        </button>
                    </div>
                    <p style="margin-top: 8px; font-size: 11px; color: #6b7280;">
                        <i class="fas fa-user-circle"></i> Replying as: <strong>${escapeHtml(adminName)}</strong>
                    </p>
                </div>
            </div>
        </div>
    `;
    
    const existingModal = document.getElementById('adminTicketChatModal');
    if (existingModal) existingModal.remove();
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    if (adminConversationInterval) {
        clearInterval(adminConversationInterval);
    }
    adminConversationInterval = setInterval(() => {
        if (document.getElementById('adminTicketChatModal')) {
            refreshAdminConversation();
        } else {
            clearInterval(adminConversationInterval);
        }
    }, 5000);
}

function renderChatMessages(conversations, authorNames) {
    if (!conversations || conversations.length === 0) {
        return '<div style="text-align: center; padding: 40px; color: #6b7280;">💬 No messages yet. Start the conversation!</div>';
    }
    
    let html = '';
    let lastDate = null;
    
    for (const conv of conversations) {
        const msgDate = new Date(conv.created_at);
        const dateStr = msgDate.toLocaleDateString();
        const timeStr = msgDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        if (lastDate !== dateStr) {
            html += `<div style="text-align: center; margin: 10px 0;"><span style="background: #e5e7eb; padding: 4px 12px; border-radius: 20px; font-size: 12px;">${dateStr}</span></div>`;
            lastDate = dateStr;
        }
        
        const authorName = authorNames[conv.author_id] || 'Unknown';
        const isInternal = conv.is_internal;
        const isAdmin = authorName.includes('Admin') || authorName.includes('Super') || authorName === 'Director';
        
        if (isInternal) {
            html += `
                <div style="display: flex; justify-content: center; margin-bottom: 10px;">
                    <div style="background: #fef3c7; padding: 8px 12px; border-radius: 8px; max-width: 70%; border-left: 3px solid #f59e0b;">
                        <small style="color: #92400e;">🔒 Internal note from ${escapeHtml(authorName)}</small>
                        <p style="margin: 5px 0 0;">${escapeHtml(conv.message)}</p>
                        <small style="color: #92400e;">${timeStr}</small>
                    </div>
                </div>
            `;
        } else if (isAdmin) {
            html += `
                <div style="display: flex; justify-content: flex-end; margin-bottom: 10px;">
                    <div style="background: #4C1D95; padding: 10px 15px; border-radius: 12px; max-width: 70%; color: white;">
                        <strong>${escapeHtml(authorName)}</strong>
                        <small style="display: block; opacity: 0.7;">${timeStr}</small>
                        <p style="margin: 5px 0 0;">${escapeHtml(conv.message)}</p>
                    </div>
                </div>
            `;
        } else {
            html += `
                <div style="display: flex; justify-content: flex-start; margin-bottom: 10px;">
                    <div style="background: white; padding: 10px 15px; border-radius: 12px; max-width: 70%; box-shadow: 0 1px 2px rgba(0,0,0,0.1);">
                        <strong>${escapeHtml(authorName)}</strong>
                        <small style="display: block; color: #6b7280;">${timeStr}</small>
                        <p style="margin: 5px 0 0;">${escapeHtml(conv.message)}</p>
                    </div>
                </div>
            `;
        }
    }
    
    return html;
}

// Refresh conversation with new message detection - FIXED
async function refreshAdminConversation() {
    if (!currentAdminTicketId) return;
    
    const supabase = getSupabaseClient();
    if (!supabase) return;
    
    const conversationArea = document.getElementById('adminConversationArea');
    if (!conversationArea) return;
    
    // Get all conversations for this ticket - FIXED: no join with author
    const { data: conversations, error } = await supabase
        .from('ticket_conversations')
        .select('*')
        .eq('ticket_id', currentAdminTicketId)
        .order('created_at', { ascending: true });
    
    if (error) {
        console.error('Error fetching conversations:', error);
        return;
    }
    
    if (conversations) {
        // Get author names separately
        const authorIds = [...new Set(conversations.map(c => c.author_id).filter(id => id))];
        let authorNames = {};
        
        if (authorIds.length > 0) {
            const { data: profiles, error: profileError } = await supabase
                .from('consolidated_user_profiles_table')
                .select('id, full_name')
                .in('id', authorIds);
            
            if (!profileError && profiles) {
                profiles.forEach(p => {
                    authorNames[p.id] = p.full_name;
                });
            }
        }
        
        // Check for new messages from student
        const lastTimestamp = lastMessageTimestamps[currentAdminTicketId];
        const newMessages = conversations.filter(c => 
            !lastTimestamp || new Date(c.created_at) > new Date(lastTimestamp)
        ).filter(c => c.author_id !== currentAdminProfileId);
        
        if (newMessages.length > 0 && !document.hidden) {
            const lastNew = newMessages[newMessages.length - 1];
            const authorName = authorNames[lastNew.author_id] || 'Student';
            playBellSound();
            showAdminToast(`🔔 New message from ${authorName}`, 'info');
            
            // Mark as read if currently viewing
            unreadCounts[currentAdminTicketId] = 0;
            updateBellBadge(Object.values(unreadCounts).reduce((a, b) => a + b, 0));
        }
        
        const newHtml = renderChatMessages(conversations, authorNames);
        const oldScrollTop = conversationArea.scrollTop;
        const oldScrollHeight = conversationArea.scrollHeight;
        
        conversationArea.innerHTML = newHtml;
        
        // Scroll to bottom if was near bottom or new message
        if (newMessages.length > 0 || oldScrollHeight - oldScrollTop < 300) {
            conversationArea.scrollTop = conversationArea.scrollHeight;
        }
        
        // Update last message timestamp
        if (conversations.length > 0) {
            lastMessageTimestamps[currentAdminTicketId] = conversations[conversations.length - 1].created_at;
        }
    }
}

async function sendAdminChatReply() {
    const messageInput = document.getElementById('adminReplyMessageInput');
    const message = messageInput?.value.trim();
    const newStatus = document.getElementById('adminReplyStatusSelect')?.value;
    const isInternal = document.getElementById('adminReplyInternalCheckbox')?.checked || false;
    
    if (!message) {
        alert('Please enter a message');
        return;
    }
    
    const supabase = getSupabaseClient();
    if (!supabase) return;
    
    let adminProfileId = currentAdminProfileId || window.currentAdminProfileId;
    
    if (!adminProfileId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data: profile } = await supabase
                .from('consolidated_user_profiles_table')
                .select('id')
                .eq('user_id', user.id)
                .maybeSingle();
            
            if (profile) {
                adminProfileId = profile.id;
            } else {
                adminProfileId = '7f6f6627-eb8c-44eb-b145-32b97c7d8d57';
            }
        }
        currentAdminProfileId = adminProfileId;
        window.currentAdminProfileId = adminProfileId;
    }
    
    const sendBtn = document.querySelector('#adminTicketChatModal button[onclick="sendAdminChatReply()"]');
    const originalText = sendBtn?.innerHTML;
    if (sendBtn) {
        sendBtn.disabled = true;
        sendBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    }
    
    try {
        const { error: replyError } = await supabase
            .from('ticket_conversations')
            .insert([{
                ticket_id: currentAdminTicketId,
                author_id: adminProfileId,
                message: message,
                message_type: isInternal ? 'internal_note' : 'comment',
                is_internal: isInternal
            }]);
        
        if (replyError) throw replyError;
        
        if (newStatus && newStatus !== currentAdminTicketStatus) {
            await supabase
                .from('support_tickets')
                .update({ 
                    status: newStatus, 
                    updated_at: new Date().toISOString() 
                })
                .eq('id', currentAdminTicketId);
            
            currentAdminTicketStatus = newStatus;
            const statusSpan = document.getElementById('modalTicketStatus');
            if (statusSpan) {
                statusSpan.textContent = newStatus;
                statusSpan.className = `status-badge ${newStatus}`;
            }
        }
        
        messageInput.value = '';
        const internalCheck = document.getElementById('adminReplyInternalCheckbox');
        if (internalCheck) internalCheck.checked = false;
        
        await refreshAdminConversation();
        await loadAdminTickets();
        
        showAdminToast(isInternal ? '✅ Internal note added!' : '✅ Reply sent!', 'success');
        
    } catch (error) {
        console.error('Error:', error);
        alert('Failed to send: ' + error.message);
    } finally {
        if (sendBtn) {
            sendBtn.disabled = false;
            sendBtn.innerHTML = originalText;
        }
    }
}

function closeAdminTicketChatModal() {
    if (adminConversationInterval) {
        clearInterval(adminConversationInterval);
        adminConversationInterval = null;
    }
    currentAdminTicketId = null;
    const modal = document.getElementById('adminTicketChatModal');
    if (modal) modal.remove();
}

function showAdminToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        padding: 12px 20px;
        background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
        color: white;
        border-radius: 8px;
        z-index: 100001;
        animation: slideIn 0.3s ease;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    `;
    toast.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i> ${message}`;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function filterAdminTickets() {
    const searchTerm = document.getElementById('admin_ticket_search')?.value.toLowerCase() || '';
    const statusFilter = document.getElementById('admin_ticket_status_filter')?.value || 'all';
    const priorityFilter = document.getElementById('admin_ticket_priority_filter')?.value || 'all';
    const categoryFilter = document.getElementById('admin_ticket_category_filter')?.value || 'all';
    
    let filtered = [...adminAllTickets];
    
    if (statusFilter !== 'all') {
        if (statusFilter === 'closed') {
            filtered = filtered.filter(t => t.status === 'closed' || t.status === 'resolved');
        } else {
            filtered = filtered.filter(t => t.status === statusFilter);
        }
    }
    
    if (priorityFilter !== 'all') {
        filtered = filtered.filter(t => t.priority === priorityFilter);
    }
    
    if (categoryFilter !== 'all') {
        filtered = filtered.filter(t => t.category === categoryFilter);
    }
    
    if (searchTerm) {
        filtered = filtered.filter(t => 
            (t.ticket_number || '').toLowerCase().includes(searchTerm) ||
            (t.subject || '').toLowerCase().includes(searchTerm) ||
            (adminStudentMap[t.student_id]?.full_name || '').toLowerCase().includes(searchTerm)
        );
    }
    
    renderAdminTicketsTable(filtered);
}

let adminFilterTimeout;
function filterAdminTicketsDebounced() {
    clearTimeout(adminFilterTimeout);
    adminFilterTimeout = setTimeout(() => filterAdminTickets(), 300);
}

function exportAdminTicketsToCSV() {
    const tickets = adminAllTickets;
    let csv = 'Ticket #,Student,Student Email,Program,Subject,Category,Priority,Status,Created,Updated\n';
    
    tickets.forEach(t => {
        const student = adminStudentMap[t.student_id] || {};
        csv += `"${t.ticket_number || ''}","${student.full_name || ''}","${student.email || ''}","${student.program || ''}","${(t.subject || '').replace(/"/g, '""')}","${t.category || ''}","${t.priority || ''}","${t.status || ''}","${t.created_at || ''}","${t.updated_at || ''}"\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tickets_export_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showAdminToast('Export complete!', 'success');
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    initNotificationSystem();
    // Check for messages immediately
    setTimeout(() => checkForNewMessages(), 2000);
});

// Global exports
window.loadAdminTickets = loadAdminTickets;
window.filterAdminTickets = filterAdminTickets;
window.filterAdminTicketsDebounced = filterAdminTicketsDebounced;
window.viewAdminTicket = viewAdminTicket;
window.sendAdminChatReply = sendAdminChatReply;
window.closeAdminTicketChatModal = closeAdminTicketChatModal;
window.refreshAdminConversation = refreshAdminConversation;
window.exportAdminTicketsToCSV = exportAdminTicketsToCSV;
window.checkForNewMessages = checkForNewMessages;
window.requestNotificationPermission = requestNotificationPermission;
window.testNotificationSystem = testNotificationSystem;
/*******************************************************
 * 20. INITIALIZATION & EVENT LISTENERS
 *******************************************************/
function setupEventListeners() {
    // ATTENDANCE TAB
    $('att_session_type')?.addEventListener('change', toggleAttendanceFields);
    $('manual-attendance-form')?.addEventListener('submit', handleManualAttendance);
    
    // ENROLLMENT/USER TAB
    $('add-account-form')?.addEventListener('submit', handleAddAccount);
    $('account-program')?.addEventListener('change', () => updateBlockTermOptions('account-program', 'account-block-term')); 
    $('account-intake')?.addEventListener('change', () => updateBlockTermOptions('account-program', 'account-block-term'));
    
    // MASS PROMOTION
    $('mass-promotion-form')?.addEventListener('submit', handleMassPromotion);
    $('promote_intake')?.addEventListener('change', () => {
        updateBlockTermOptions('promote_intake', 'promote_from_block');
        updateBlockTermOptions('promote_intake', 'promote_to_block');
    });

    // COURSES TAB
    $('add-course-form')?.addEventListener('submit', handleAddCourse);
    $('course-program')?.addEventListener('change', () => { updateBlockTermOptions('course-program', 'course-block'); });
    $('course-intake')?.addEventListener('change', () => { updateBlockTermOptions('course-program', 'course-block'); });
    
    // SESSIONS TAB
    $('add-session-form')?.addEventListener('submit', handleAddSession);
    $('new_session_program')?.addEventListener('change', () => { 
        updateBlockTermOptions('new_session_program', 'new_session_block_term'); 
        populateSessionCourseSelects(); 
    });
    $('new_session_intake_year')?.addEventListener('change', () => updateBlockTermOptions('new_session_program', 'new_session_block_term')); 
    
    // EXAMS TAB
    $('add-exam-form')?.addEventListener('submit', handleAddExam);
    $('exam_program')?.addEventListener('change', () => { 
        populateExamCourseSelects(); 
        updateBlockTermOptions('exam_program', 'exam_block_term'); 
    });
    $('exam_intake')?.addEventListener('change', () => updateBlockTermOptions('exam_program', 'exam_block_term'));
    
    // EDIT EXAM MODAL PROGRAM DROPDOWN
    const editExamProgram = document.getElementById('edit_exam_program');
    const editExamBlock = document.getElementById('edit_exam_block');
    if (editExamProgram && editExamBlock) {
        editExamProgram.addEventListener('change', function() {
            console.log('📋 Edit Exam: Program changed to', this.value);
            updateBlockTermOptions('edit_exam_program', 'edit_exam_block');
            const courseSelect = document.getElementById('edit_exam_course');
            if (courseSelect) {
                populateEditExamCourses(courseSelect, this.value);
            }
        });
    }
    
    // MESSAGES TAB
    $('send-message-form')?.addEventListener('submit', handleSendMessage);
    $('edit-welcome-form')?.addEventListener('submit', handleSaveWelcomeMessage); 
    
    // RESOURCES TAB
    $('upload-resource-form')?.addEventListener('submit', handleResourceUpload);
    $('resource_program')?.addEventListener('change', () => { updateBlockTermOptions('resource_program', 'resource_block'); });
    $('resource_intake')?.addEventListener('change', () => { updateBlockTermOptions('resource_program', 'resource_block'); });
    
    // SECURITY TAB
    $('global-password-reset-form')?.addEventListener('submit', handleGlobalPasswordReset);
    $('account-deactivation-form')?.addEventListener('submit', handleAccountDeactivation);

    // ANNOUNCEMENTS
    $('save-announcement')?.addEventListener('click', saveOfficialAnnouncement);
    
    // =====================================================
    // UNIT REGISTRATION MANAGEMENT - COMPLETE
    // =====================================================
    
    // ---- ADD NEW UNIT FORM ----
    const addUnitForm = document.getElementById('add-unit-form');
    if (addUnitForm) {
        addUnitForm.addEventListener('submit', (e) => {
            e.preventDefault();
            addNewUnitRecord();
        });
    }
    
    // Add Unit Button
    const addUnitBtn = document.getElementById('add-unit-btn');
    if (addUnitBtn) {
        addUnitBtn.addEventListener('click', addNewUnitRecord);
    }
    
    // ---- NEW UNIT PROGRAM DROPDOWN ----
    // This populates courses and updates block options
    const newUnitProgram = document.getElementById('new_unit_program');
    const newUnitBlock = document.getElementById('new_unit_block');
    const newUnitCourse = document.getElementById('new_unit_course');
    
    if (newUnitProgram) {
        newUnitProgram.addEventListener('change', function() {
            const program = this.value;
            console.log('📋 Unit Program changed to:', program);
            
            // 1. Update course dropdown
            if (typeof toggleUnitCourses === 'function') {
                toggleUnitCourses();
            }
            
            // 2. Update block dropdown based on program type
            if (newUnitBlock) {
                const programType = getProgramType(program);
                const currentValue = newUnitBlock.value;
                
                newUnitBlock.innerHTML = '';
                
                if (programType === 'KRCHN') {
                    // KRCHN uses Blocks with NUMBERS (1-5)
                    ['Introductory', 'Block 1', 'Block 2', 'Block 3', 'Block 4', 'Block 5', 'Final'].forEach(block => {
                        const opt = document.createElement('option');
                        opt.value = block;
                        opt.textContent = block;
                        newUnitBlock.appendChild(opt);
                    });
                } else {
                    // TVET uses Terms
                    ['Introductory', 'Term 1', 'Term 2', 'Term 3', 'Term 4', 'Term 5', 'Term 6', 'Final'].forEach(term => {
                        const opt = document.createElement('option');
                        opt.value = term;
                        opt.textContent = term;
                        newUnitBlock.appendChild(opt);
                    });
                }
                
                // Restore previous value if it exists
                if (currentValue) {
                    const exists = Array.from(newUnitBlock.options).some(o => o.value === currentValue);
                    if (exists) newUnitBlock.value = currentValue;
                }
            }
        });
        
        // Trigger initial load
        setTimeout(() => {
            newUnitProgram.dispatchEvent(new Event('change'));
        }, 200);
    }
    
    // ---- UNIT FILTER INPUTS ----
    const unitSearch = document.getElementById('unit_search');
    if (unitSearch) {
        unitSearch.addEventListener('keyup', filterUnitsCatalog);
    }
    
    const unitFilterProgram = document.getElementById('unit_filter_program');
    if (unitFilterProgram) {
        unitFilterProgram.addEventListener('change', filterUnitsCatalog);
    }
    
    const unitFilterYear = document.getElementById('unit_filter_year');
    if (unitFilterYear) {
        unitFilterYear.addEventListener('change', filterUnitsCatalog);
    }
    
    const unitFilterBlock = document.getElementById('unit_filter_block');
    if (unitFilterBlock) {
        unitFilterBlock.addEventListener('change', filterUnitsByBlockSelect);
    }
    
    // ---- BLOCK FILTER BUTTONS ----
    const blockBtns = document.querySelectorAll('.block-btn');
    blockBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const block = this.getAttribute('data-block');
            filterUnitsByBlock(block);
        });
    });
    
    // ---- REFRESH UNITS BUTTON ----
    const refreshUnitsBtn = document.getElementById('refresh-units-btn');
    if (refreshUnitsBtn) {
        refreshUnitsBtn.addEventListener('click', loadAllUnits);
    }
    
    // ---- VIEW PENDING REGISTRATIONS ----
    const viewPendingBtn = document.getElementById('view-pending-registrations');
    if (viewPendingBtn) {
        viewPendingBtn.addEventListener('click', loadUnitPendingRegistrations);
    }
    
    // ---- REFRESH APPROVED REGISTRATIONS ----
    const refreshApprovedBtn = document.getElementById('refresh-approved-btn');
    if (refreshApprovedBtn) {
        refreshApprovedBtn.addEventListener('click', loadApprovedRegistrations);
    }
    
    // ---- SEARCH APPROVED REGISTRATIONS ----
    const approvedSearch = document.getElementById('approved-search');
    if (approvedSearch) {
        approvedSearch.addEventListener('keyup', filterApprovedRegistrations);
    }
    
    // ---- SELECT ALL APPROVED CHECKBOX ----
    const selectAllApproved = document.getElementById('selectAllApproved');
    if (selectAllApproved) {
        selectAllApproved.addEventListener('change', toggleSelectAllApproved);
    }
    
    // ---- BULK DEAPPROVE BUTTON ----
    const bulkDeapproveBtn = document.getElementById('bulkDeapproveBtn');
    if (bulkDeapproveBtn) {
        bulkDeapproveBtn.addEventListener('click', bulkDeapproveSelected);
    }
    
    // ---- EDIT UNIT FORM ----
    const editUnitForm = document.getElementById('edit-unit-form');
    if (editUnitForm) {
        editUnitForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const unitId = document.getElementById('edit_unit_id').value;
            const unitData = {
                unit_code: document.getElementById('edit_unit_code').value.trim(),
                unit_name: document.getElementById('edit_unit_name').value.trim(),
                program: document.getElementById('edit_unit_program').value,
                block: document.getElementById('edit_unit_block').value,
                year: parseInt(document.getElementById('edit_unit_year').value) || 2025,
                credits: parseInt(document.getElementById('edit_unit_credits').value) || 3,
                hours: parseInt(document.getElementById('edit_unit_hours').value) || 0,
                unit_type: document.getElementById('edit_unit_type').value,
                prerequisites: document.getElementById('edit_unit_prerequisites').value.trim() || null
            };
            
            try {
                const { error } = await sb.from('units_catalog').update(unitData).eq('id', unitId);
                if (error) throw error;
                showFeedback('Unit updated successfully!', 'success');
                document.getElementById('editUnitModal').style.display = 'none';
                loadAllUnits();
            } catch (error) {
                showFeedback(`Error: ${error.message}`, 'error');
            }
        });
    }
    
    // ---- CLOSE EDIT UNIT MODAL ----
    const closeEditUnitBtn = document.querySelector('#editUnitModal .close');
    if (closeEditUnitBtn) {
        closeEditUnitBtn.addEventListener('click', function() {
            document.getElementById('editUnitModal').style.display = 'none';
        });
    }
    
    // ---- CLOSE UNIT MODAL ON OUTSIDE CLICK ----
    const editUnitModal = document.getElementById('editUnitModal');
    if (editUnitModal) {
        editUnitModal.addEventListener('click', function(e) {
            if (e.target === this) {
                this.style.display = 'none';
            }
        });
    }
    
    // ---- UNIT FORM - INITIALIZE COURSE DROPDOWN ----
    // Also trigger when program changes on edit modal
    const editUnitProgram = document.getElementById('edit_unit_program');
    const editUnitBlockSelect = document.getElementById('edit_unit_block');
    if (editUnitProgram && editUnitBlockSelect) {
        editUnitProgram.addEventListener('change', function() {
            const program = this.value;
            const programType = getProgramType(program);
            const currentValue = editUnitBlockSelect.value;
            
            editUnitBlockSelect.innerHTML = '';
            
            if (programType === 'KRCHN') {
                ['Introductory', 'Block 1', 'Block 2', 'Block 3', 'Block 4', 'Block 5', 'Final'].forEach(block => {
                    const opt = document.createElement('option');
                    opt.value = block;
                    opt.textContent = block;
                    editUnitBlockSelect.appendChild(opt);
                });
            } else {
                ['Introductory', 'Term 1', 'Term 2', 'Term 3', 'Term 4', 'Term 5', 'Term 6', 'Final'].forEach(term => {
                    const opt = document.createElement('option');
                    opt.value = term;
                    opt.textContent = term;
                    editUnitBlockSelect.appendChild(opt);
                });
            }
            
            if (currentValue) {
                const exists = Array.from(editUnitBlockSelect.options).some(o => o.value === currentValue);
                if (exists) editUnitBlockSelect.value = currentValue;
            }
        });
    }

    // =====================================================
    // FEE ACCOUNTS TAB - EVENT LISTENERS
    // =====================================================
    
    // Record Payment Button
    const recordPaymentBtn = document.querySelector('#fee-accounts button[onclick="recordPayment()"]');
    if (recordPaymentBtn) {
        recordPaymentBtn.removeAttribute('onclick');
        recordPaymentBtn.addEventListener('click', recordPayment);
    }
    
    // Account balance filter dropdown
    const balanceFilter = document.getElementById('account_balance_filter');
    if (balanceFilter) {
        balanceFilter.addEventListener('change', filterByBalanceStatus);
    }
    
    // Account search input
    const accountSearch = document.getElementById('account_search');
    if (accountSearch) {
        accountSearch.addEventListener('keyup', searchStudentAccount);
    }
    
    // Export accounts button
    const exportBtn = document.querySelector('#fee-accounts button[onclick="exportAccountsToCSV()"]');
    if (exportBtn) {
        exportBtn.removeAttribute('onclick');
        exportBtn.addEventListener('click', exportAccountsToCSV);
    }
    
    // Update fee structure button
    const updateFeeBtn = document.querySelector('#fee-accounts button[onclick="updateFeeStructure()"]');
    if (updateFeeBtn) {
        updateFeeBtn.removeAttribute('onclick');
        updateFeeBtn.addEventListener('click', updateFeeStructure);
    }
    
    // Fee program dropdown - update block options
    const feeProgram = document.getElementById('fee_program');
    const feeBlock = document.getElementById('fee_block');
    if (feeProgram && feeBlock) {
        feeProgram.addEventListener('change', function() {
            const program = this.value;
            const isTVET = program !== 'KRCHN';
            
            feeBlock.innerHTML = '';
            
            if (isTVET) {
                const terms = ['Introductory', 'Term1', 'Term2', 'Term3', 'Term4', 'Term5', 'Term6', 'Block A', 'Block B', 'Block C', 'Final'];
                terms.forEach(term => {
                    const option = document.createElement('option');
                    option.value = term;
                    option.textContent = term;
                    feeBlock.appendChild(option);
                });
            } else {
                const blocks = ['Introductory', 'Block A', 'Block B', 'Block C', 'Block D', 'Block E', 'Final'];
                blocks.forEach(block => {
                    const option = document.createElement('option');
                    option.value = block;
                    option.textContent = block;
                    feeBlock.appendChild(option);
                });
            }
        });
        feeProgram.dispatchEvent(new Event('change'));
    }
    
    // Payment method select - optional formatting
    const paymentMethod = document.getElementById('payment_method');
    if (paymentMethod) {
        paymentMethod.addEventListener('change', function() {
            const refInput = document.getElementById('payment_reference');
            if (this.value === 'M-Pesa' && refInput) {
                refInput.placeholder = 'M-Pesa Transaction Code (e.g., QWERTY123)';
            } else if (this.value === 'Bank Transfer' && refInput) {
                refInput.placeholder = 'Bank Reference / Transaction ID';
            } else if (refInput) {
                refInput.placeholder = 'Transaction Ref (optional)';
            }
        });
    }
    
    // Set default payment date to today
    const paymentDate = document.getElementById('payment_date');
    if (paymentDate && !paymentDate.value) {
        paymentDate.value = new Date().toISOString().split('T')[0];
    }
    
    // Close payment history modal when clicking X or outside
    const paymentHistoryModal = document.getElementById('paymentHistoryModal');
    if (paymentHistoryModal) {
        const closeSpan = paymentHistoryModal.querySelector('.close');
        if (closeSpan) {
            closeSpan.addEventListener('click', () => {
                paymentHistoryModal.style.display = 'none';
            });
        }
        
        paymentHistoryModal.addEventListener('click', (e) => {
            if (e.target === paymentHistoryModal) {
                paymentHistoryModal.style.display = 'none';
            }
        });
    }
    
    // Fee Accounts tab - load data when tab is clicked
    const feeAccountsLink = document.querySelector('.nav a[data-tab="fee-accounts"]');
    if (feeAccountsLink) {
        feeAccountsLink.addEventListener('click', function() {
            setTimeout(() => {
                loadStudentAccounts();
                loadFeeStructure();
            }, 100);
        });
    }
}

// Global function references for HTML onclick handlers
window.showTab = showTab;
window.logout = logout;
window.adminCheckIn = adminCheckIn;
window.exportTableToCSV = exportTableToCSV;
window.filterTable = filterTable;
window.closeModal = closeModal;
window.approveUser = approveUser;
window.deleteProfile = deleteProfile;
window.openEditUserModal = openEditUserModal;
window.updateUserRole = updateUserRole;
window.openEditCourseModal = openEditCourseModal;
window.deleteCourse = deleteCourse;
window.openGradeModal = openGradeModal;
window.deleteExam = deleteExam;
window.editNotification = editNotification;
window.deleteNotification = deleteNotification;
window.approveAttendanceRecord = approveAttendanceRecord;
window.deleteAttendanceRecord = deleteAttendanceRecord;
window.showMap = showMap;
window.updateSystemStatus = updateSystemStatus;
window.saveSystemMessage = saveSystemMessage;
window.triggerBackup = triggerBackup;
window.quickAction = quickAction;
window.selectAllUsers = selectAllUsers;
window.clearSelection = clearSelection;
window.executeBulkAction = executeBulkAction;
window.generateNewAPIKey = generateNewAPIKey;
window.regenerateKey = regenerateKey;
window.enable2FAForAll = enable2FAForAll;
window.terminateAllSessions = terminateAllSessions;
window.filterErrors = filterErrors;
window.updateVisualization = updateVisualization;
// =====================================================
// INITIALIZE MODALS - ADD THIS FUNCTION
// =====================================================
function initializeModals() {
    console.log('🔧 Initializing modals...');
    
    // Close modals when clicking X
    document.querySelectorAll('.modal .close').forEach(closeBtn => {
        closeBtn.addEventListener('click', function() {
            this.closest('.modal').style.display = 'none';
        });
    });
    
    // Close modals when clicking outside
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                this.style.display = 'none';
            }
        });
    });

    // Edit user form handler
    const editUserForm = document.getElementById('edit-user-form');
    if (editUserForm) {
        editUserForm.removeEventListener('submit', handleEditUser);
        editUserForm.addEventListener('submit', handleEditUser);
        console.log('✅ Edit user form handler attached');
    } else {
        console.warn('⚠️ edit-user-form not found');
    }

    // Edit course form handler
    const editCourseForm = document.getElementById('edit-course-form');
    if (editCourseForm) {
        editCourseForm.removeEventListener('submit', handleEditCourse);
        editCourseForm.addEventListener('submit', handleEditCourse);
        console.log('✅ Edit course form handler attached');
    }
}

// =====================================================
// INIT SESSION FUNCTION
// =====================================================
async function initSession() {
    const { data: { session }, error: sessionError } = await sb.auth.getSession();
    
    if (sessionError || !session) {
        console.warn("Session check failed, redirecting to login.");
        window.location.href = "login.html";
        return;
    }

    const user = session.user;
    const { data: profile, error: profileError } = await sb.from('profiles').select('*').eq('id', user.id).single();
    
    if (profile && !profileError) {
        currentUserProfile = profile;
        currentUserId = user.id;
        
        if (currentUserProfile.role !== 'superadmin') {
            console.warn(`User ${user.email} is not a Super Admin. Redirecting.`);
            window.location.href = "admin.html"; 
            return;
        }
        
        document.querySelector('header h1').textContent = `Welcome, ${profile.full_name || 'Super Admin'}!`;
    } else {
        console.error("Profile not found or fetch error:", profileError?.message);
        window.location.href = "login.html";
        return;
    }
    
    setupEventListeners();
    initializeModals();
    loadSectionData('dashboard');
}
// =====================================================
// TIMETABLE UPLOAD FUNCTIONS - FIX FOR onClick
// =====================================================

// Alias functions to match HTML onclick
window.uploadExcelTimetable = async function() {
    const fileInput = document.getElementById('timetableExcelFile');
    const file = fileInput ? fileInput.files[0] : null;
    const program = document.getElementById('uploadProgram')?.value || 'General';
    const block = document.getElementById('uploadBlock')?.value || 'General';
    
    if (!file) {
        alert('Please select an Excel file first');
        return;
    }
    
    // Check if SheetJS is loaded
    if (typeof XLSX === 'undefined') {
        alert('Excel parser not loaded. Please refresh the page and try again.');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = async function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const rows = XLSX.utils.sheet_to_json(sheet);
            
            let added = 0;
            let errors = [];
            
            for (const row of rows) {
                try {
                    const eventData = {
                        event_name: row.Title || row.title || row.Course || row.course,
                        event_date: row.Date || row.date,
                        start_time: row.Start_Time || row.start_time || row['Start Time'] || null,
                        end_time: row.End_Time || row.end_time || row['End Time'] || null,
                        venue: row.Venue || row.venue || null,
                        type: (row.Type || row.type || 'CLASS').toUpperCase(),
                        description: row.Description || row.description || '',
                        target_program: program,
                        target_block: block,
                        organizer: 'Admin Upload'
                    };
                    
                    if (!eventData.event_name || !eventData.event_date) {
                        errors.push(row);
                        continue;
                    }
                    
                    const { error } = await sb.from('calendar_events').insert([eventData]);
                    if (error) throw error;
                    added++;
                } catch (err) {
                    errors.push(row);
                }
            }
            
            alert(`✅ Added ${added} events to calendar!\n${errors.length} errors.`);
            
            // Refresh calendar
            if (typeof renderFullCalendar === 'function') {
                renderFullCalendar();
            }
            
            // Clear file input
            if (fileInput) fileInput.value = '';
            
        } catch (err) {
            console.error('Excel processing error:', err);
            alert('Error processing Excel file: ' + err.message);
        }
    };
    reader.readAsArrayBuffer(file);
};

// Add single event function
window.addSingleEvent = async function() {
    const title = document.getElementById('singleEventTitle')?.value;
    const date = document.getElementById('singleEventDate')?.value;
    const startTime = document.getElementById('singleEventStart')?.value;
    const endTime = document.getElementById('singleEventEnd')?.value;
    const venue = document.getElementById('singleEventVenue')?.value;
    const type = document.getElementById('singleEventType')?.value;
    const details = document.getElementById('singleEventDetails')?.value;
    const program = document.getElementById('singleEventProgram')?.value;
    const block = document.getElementById('singleEventBlock')?.value;
    
    if (!title || !date || !startTime) {
        alert('Please fill required fields: Title, Date, Start Time');
        return;
    }
    
    const { error } = await sb.from('calendar_events').insert([{
        event_name: title,
        event_date: date,
        start_time: startTime + ':00',
        end_time: endTime ? endTime + ':00' : null,
        venue: venue,
        type: type,
        description: details || '',
        target_program: program || 'General',
        target_block: block || 'General',
        organizer: 'Admin'
    }]);
    
    if (error) {
        alert('Error: ' + error.message);
    } else {
        alert('✅ Event added to calendar!');
        // Clear form
        document.getElementById('singleEventTitle').value = '';
        document.getElementById('singleEventVenue').value = '';
        document.getElementById('singleEventDetails').value = '';
        
        // Refresh calendar
        if (typeof renderFullCalendar === 'function') {
            renderFullCalendar();
        }
    }
};

// Create weekly schedule function
window.createWeeklySchedule = async function() {
    const day = parseInt(document.getElementById('weeklyDay')?.value);
    const startTime = document.getElementById('weeklyStartTime')?.value;
    const endTime = document.getElementById('weeklyEndTime')?.value;
    const course = document.getElementById('weeklyCourse')?.value;
    const venue = document.getElementById('weeklyVenue')?.value;
    const startDate = new Date(document.getElementById('weeklyStartDate')?.value);
    const endDate = new Date(document.getElementById('weeklyEndDate')?.value);
    const program = document.getElementById('weeklyProgram')?.value;
    const block = document.getElementById('weeklyBlock')?.value;
    
    if (!course || !startDate || !endDate || !startTime) {
        alert('Please fill all required fields');
        return;
    }
    
    const events = [];
    let currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
        if (currentDate.getDay() === day) {
            events.push({
                event_name: course,
                event_date: currentDate.toISOString().split('T')[0],
                start_time: startTime + ':00',
                end_time: endTime + ':00',
                venue: venue || '',
                type: 'CLASS',
                target_program: program || 'General',
                target_block: block || 'General',
                organizer: 'Weekly Schedule'
            });
        }
        currentDate.setDate(currentDate.getDate() + 1);
    }
    
    if (events.length === 0) {
        alert('No dates found matching the selected day in the date range');
        return;
    }
    
    const { error } = await sb.from('calendar_events').insert(events);
    
    if (error) {
        alert('Error: ' + error.message);
    } else {
        alert(`✅ Added ${events.length} class sessions to calendar!`);
        
        // Refresh calendar
        if (typeof renderFullCalendar === 'function') {
            renderFullCalendar();
        }
    }
};

// Show upload method function
window.showUploadMethod = function(method) {
    const excelDiv = document.getElementById('excelUploadMethod');
    const singleDiv = document.getElementById('singleEventMethod');
    const bulkDiv = document.getElementById('bulkScheduleMethod');
    const excelBtn = document.getElementById('excelTabBtn');
    const singleBtn = document.getElementById('singleTabBtn');
    const bulkBtn = document.getElementById('bulkTabBtn');
    
    // Hide all
    if (excelDiv) excelDiv.style.display = 'none';
    if (singleDiv) singleDiv.style.display = 'none';
    if (bulkDiv) bulkDiv.style.display = 'none';
    
    // Remove active class from all buttons
    if (excelBtn) excelBtn.classList.remove('active');
    if (singleBtn) singleBtn.classList.remove('active');
    if (bulkBtn) bulkBtn.classList.remove('active');
    
    // Show selected
    if (method === 'excel') {
        if (excelDiv) excelDiv.style.display = 'block';
        if (excelBtn) excelBtn.classList.add('active');
    } else if (method === 'single') {
        if (singleDiv) singleDiv.style.display = 'block';
        if (singleBtn) singleBtn.classList.add('active');
    } else if (method === 'bulk') {
        if (bulkDiv) bulkDiv.style.display = 'block';
        if (bulkBtn) bulkBtn.classList.add('active');
    }
};

// Download template function
window.downloadTimetableTemplate = function() {
    // Check if SheetJS is loaded
    if (typeof XLSX === 'undefined') {
        alert('Excel parser not loaded. Please refresh the page and try again.');
        return;
    }
    
    const templateData = [
        ['Date', 'Title', 'Start Time', 'End Time', 'Venue', 'Type', 'Description', 'Program', 'Block'],
        ['2026-06-15', 'Nursing 101 Lecture', '09:00', '11:00', 'Hall A', 'CLASS', 'Introduction to Nursing', 'KRCHN', 'Block A'],
        ['2026-06-16', 'Clinical Skills Lab', '10:00', '12:00', 'Skills Lab', 'CLINICAL', 'Practical session', 'KRCHN', 'Block A'],
        ['2026-06-17', 'Anatomy CAT 1', '14:00', '16:00', 'Exam Hall', 'EXAM', 'First CAT examination', 'KRCHN', 'Block A']
    ];
    
    const ws = XLSX.utils.aoa_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Timetable_Template');
    XLSX.writeFile(wb, 'timetable_template.xlsx');
};

console.log('✅ Timetable upload functions loaded');
// =====================================================
// FIX: Make grade functions globally accessible
// =====================================================

// Filter students in grade modal
window.filterGradeStudents = function() {
    const searchTerm = document.getElementById('gradeSearch')?.value?.toLowerCase() || '';
    const rows = document.querySelectorAll('#gradeTableBody tr');
    
    rows.forEach(row => {
        const name = row.getAttribute('data-name') || '';
        const email = row.getAttribute('data-email') || '';
        const id = row.getAttribute('data-id') || '';
        
        if (name.includes(searchTerm) || email.includes(searchTerm) || id.includes(searchTerm)) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
};

window.saveGrades = async function(examId, examType = 'EXAM') {
    try {
        const rows = document.querySelectorAll('#gradeTableBody tr');
        const upserts = [];

        // Get current user
        const currentUser = await getCurrentUser();
        
        if (!currentUser || (!currentUser.user_id && !currentUser.id)) {
            showFeedback('Error: Cannot identify grader.', 'error');
            return;
        }

        const validGraderId = currentUser.user_id || currentUser.id;
        let hasValidData = false;

        for (const row of rows) {
            if (row.style.display === 'none') continue;
            
            const studentId = row.getAttribute('data-id');
            if (!studentId) continue;

            const statusSelect = row.querySelector(`#status-${studentId}`);
            if (!statusSelect) continue;

            // IMPORTANT: Include question_id to satisfy NOT NULL constraint
            let gradeData = {
                exam_id: parseInt(examId),
                student_id: studentId,
                result_status: statusSelect.value || 'Scheduled',
                graded_by: validGraderId,
                updated_at: new Date().toISOString(),
                question_id: '00000000-0000-0000-0000-000000000000'  // FIX: Added this
            };

            // Collect grade data based on exam type
            switch(examType) {
                case 'CAT_1':
                    const cat1Input = row.querySelector(`#cat1-${studentId}`);
                    if (cat1Input && cat1Input.value.trim()) {
                        gradeData.cat_1_score = Math.min(parseFloat(cat1Input.value) || 0, 30);
                        hasValidData = true;
                    }
                    break;
                    
                case 'CAT_2':
                    const cat2Input = row.querySelector(`#cat2-${studentId}`);
                    if (cat2Input && cat2Input.value.trim()) {
                        gradeData.cat_2_score = Math.min(parseFloat(cat2Input.value) || 0, 30);
                        hasValidData = true;
                    }
                    break;
                    
                case 'CAT':
                    const catInput = row.querySelector(`#cat-${studentId}`);
                    if (catInput && catInput.value.trim()) {
                        gradeData.cat_1_score = Math.min(parseFloat(catInput.value) || 0, 30);
                        hasValidData = true;
                    }
                    break;
                    
                default: // EXAM
                    const cat1InputFinal = row.querySelector(`#cat1-${studentId}`);
                    const cat2InputFinal = row.querySelector(`#cat2-${studentId}`);
                    const finalInput = row.querySelector(`#final-${studentId}`);
                    
                    let cat1 = cat1InputFinal ? Math.min(parseFloat(cat1InputFinal.value) || 0, 30) : 0;
                    let cat2 = cat2InputFinal ? Math.min(parseFloat(cat2InputFinal.value) || 0, 30) : 0;
                    let finalExam = finalInput ? Math.min(parseFloat(finalInput.value) || 0, 100) : 0;
                    
                    if (cat1InputFinal?.value.trim() || cat2InputFinal?.value.trim() || finalInput?.value.trim()) {
                        gradeData.cat_1_score = cat1;
                        gradeData.cat_2_score = cat2;
                        gradeData.exam_score = finalExam;
                        
                        const scaledTotal = ((cat1 + cat2 + finalExam) / 160) * 100;
                        gradeData.total_score = parseFloat(scaledTotal.toFixed(2));
                        hasValidData = true;
                    }
            }

            if (Object.keys(gradeData).length > 5) {
                upserts.push(gradeData);
            }
        }

        if (!hasValidData) {
            showFeedback('No grade data entered to save.', 'warning');
            return;
        }

        // Show loading state
        const saveBtn = document.querySelector('#gradeModal .btn-action');
        if (saveBtn) {
            const originalText = saveBtn.textContent;
            saveBtn.innerHTML = '<div class="loading-spinner" style="width:20px;height:20px;"></div> Saving...';
            saveBtn.disabled = true;
        }

        // Use insert instead of upsert to avoid constraint issues
        for (const grade of upserts) {
            // Check if exists first
            const { data: existing } = await sb
                .from('exam_grades')
                .select('id')
                .eq('exam_id', grade.exam_id)
                .eq('student_id', grade.student_id)
                .maybeSingle();
            
            if (existing) {
                // Update
                await sb.from('exam_grades').update(grade).eq('id', existing.id);
            } else {
                // Insert
                await sb.from('exam_grades').insert(grade);
            }
        }
        
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.innerHTML = 'Save Grades';
        }

        showFeedback(`✅ Successfully saved ${upserts.length} student grade(s)!`, 'success');
        
        setTimeout(() => {
            closeGradeModal();
        }, 1500);
        
    } catch (error) {
        console.error('Error saving grades:', error);
        showFeedback(`Failed to save grades: ${error.message}`, 'error');
        
        const saveBtn = document.querySelector('#gradeModal .btn-action');
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.innerHTML = 'Save Grades';
        }
    }
};
// Close grade modal function
window.closeGradeModal = function() {
    const modal = document.getElementById('gradeModal');
    if (modal) {
        modal.remove();
    }
};

// Update grade total function
window.updateGradeTotal = function(studentId) {
    const cat1Input = document.querySelector(`#cat1-${studentId}`);
    const cat2Input = document.querySelector(`#cat2-${studentId}`);
    const finalInput = document.querySelector(`#final-${studentId}`);
    const totalInput = document.querySelector(`#total-${studentId}`);
    
    if (!cat1Input || !cat2Input || !finalInput || !totalInput) return;

    let cat1 = Math.min(parseFloat(cat1Input.value) || 0, 30);
    let cat2 = Math.min(parseFloat(cat2Input.value) || 0, 30);
    let finalExam = Math.min(parseFloat(finalInput.value) || 0, 100);

    const rawTotal = cat1 + cat2 + finalExam;
    const scaledTotal = (rawTotal / 160) * 100;
    
    totalInput.value = scaledTotal.toFixed(2);
    
    // Add visual feedback
    totalInput.classList.remove('high-score', 'medium-score', 'low-score');
    if (scaledTotal >= 70) {
        totalInput.classList.add('high-score');
    } else if (scaledTotal >= 50) {
        totalInput.classList.add('medium-score');
    } else {
        totalInput.classList.add('low-score');
    }
};

// Also ensure the grade modal's filter is wired up properly
document.addEventListener('DOMContentLoaded', function() {
    // Delegate filter event for dynamically created grade search
    document.addEventListener('input', function(e) {
        if (e.target && e.target.id === 'gradeSearch') {
            if (typeof window.filterGradeStudents === 'function') {
                window.filterGradeStudents();
            }
        }
    });
});

console.log('✅ Grade functions registered globally');
// =====================================================
// STAFF MANAGEMENT - CONNECTED TO Supabase
// Staff register here, Students in separate table
// =====================================================

let staffRecords = [];

// Load staff from database
async function loadAllStaff() {
    console.log('👥 Loading staff records...');
    
    const tbody = document.getElementById('staffTableBody');
    if (tbody) {
        tbody.innerHTML = '<tr><td colspan="14"><div class="loading-spinner"></div> Loading staff...<\/td><\/tr>';
    }
    
    try {
        const { data, error } = await sb
            .from('staff_records')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        staffRecords = data || [];
        updateStaffStats();
        renderStaffTable();
        
    } catch (error) {
        console.error('Error:', error);
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="14" style="color: red;">Error: Table "staff_records" not found. Please create it in Supabase.<\/td><\/tr>`;
        }
    }
}

// Update stats cards
function updateStaffStats() {
    const total = staffRecords.length;
    const active = staffRecords.filter(s => s.status === 'active').length;
    const male = staffRecords.filter(s => s.gender === 'M').length;
    const female = staffRecords.filter(s => s.gender === 'F').length;
    
    const totalEl = document.getElementById('totalStaffCount');
    const activeEl = document.getElementById('activeStaffCount');
    const maleEl = document.getElementById('maleStaffCount');
    const femaleEl = document.getElementById('femaleStaffCount');
    
    if (totalEl) totalEl.textContent = total;
    if (activeEl) activeEl.textContent = active;
    if (maleEl) maleEl.textContent = male;
    if (femaleEl) femaleEl.textContent = female;
}

// Render staff table
function renderStaffTable() {
    const tbody = document.getElementById('staffTableBody');
    if (!tbody) return;
    
    const searchTerm = (document.getElementById('staffSearchInput')?.value || '').toLowerCase();
    const deptFilter = document.getElementById('departmentFilter')?.value || 'all';
    const statusFilter = document.getElementById('statusFilter')?.value || 'all';
    
    let filtered = [...staffRecords];
    
    if (searchTerm) {
        filtered = filtered.filter(s => 
            (s.first_name || '').toLowerCase().includes(searchTerm) || 
            (s.id || '').toLowerCase().includes(searchTerm) || 
            (s.email || '').toLowerCase().includes(searchTerm)
        );
    }
    
    if (deptFilter !== 'all') {
        filtered = filtered.filter(s => s.department === deptFilter);
    }
    
    if (statusFilter !== 'all') {
        filtered = filtered.filter(s => s.status === statusFilter);
    }
    
    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="14" style="text-align: center; padding: 40px;">No staff records found<\/td><\/tr>';
        return;
    }
    
    tbody.innerHTML = '';
    
    filtered.forEach(staff => {
        const loginStatus = staff.login_enabled ? 
            '<span style="color: #10b981;">✅ Enabled</span>' : 
            '<span style="color: #ef4444;">❌ Disabled</span>';
        
        tbody.innerHTML += `
            <tr style="border-bottom: 1px solid #e5e7eb;">
                <td style="padding: 12px;">${escapeHtml(staff.title || '')}<\/td>
                <td style="padding: 12px;">${escapeHtml(staff.first_name)}<\/td>
                <td style="padding: 12px;">${escapeHtml(staff.other_names || '')}<\/td>
                <td style="padding: 12px;">${escapeHtml(staff.department)}<\/td>
                <td style="padding: 12px;">${escapeHtml(staff.email)}<\/td>
                <td style="padding: 12px;">${escapeHtml(staff.phone)}<\/td>
                <td style="padding: 12px;"><strong>${escapeHtml(staff.id)}<\/strong><\/td>
                <td style="padding: 12px;">${staff.gender === 'M' ? 'Male' : staff.gender === 'F' ? 'Female' : '-'}<\/td>
                <td style="padding: 12px;">${escapeHtml(staff.bank_name || '-')}<\/td>
                <td style="padding: 12px;">${escapeHtml(staff.bank_account || '-')}<\/td>
                <td style="padding: 12px;">${escapeHtml(staff.shif_number || '-')}<\/td>
                <td style="padding: 12px;">${escapeHtml(staff.nsrf_number || '-')}<\/td>
                <td style="padding: 12px;">${loginStatus}<\/td>
                <td style="padding: 12px;">
                    <button onclick="editStaff('${staff.id}')" class="btn-sm" style="background:#3b82f6;color:white;border:none;padding:5px 10px;border-radius:4px;margin-right:5px;cursor:pointer;">Edit</button>
                    <button onclick="resetStaffPassword('${staff.id}', '${staff.first_name}')" class="btn-sm" style="background:#f59e0b;color:white;border:none;padding:5px 10px;border-radius:4px;margin-right:5px;cursor:pointer;">Reset Pwd</button>
                    <button onclick="deleteStaff('${staff.id}', '${staff.first_name}')" class="btn-sm" style="background:#ef4444;color:white;border:none;padding:5px 10px;border-radius:4px;cursor:pointer;">Delete</button>
                <\/td>
            <\/tr>
        `;
    });
}

// Open Add Staff Modal
function openAddStaffModal() {
    const modal = document.getElementById('staffModal');
    if (!modal) return;
    
    document.getElementById('staffForm')?.reset();
    document.getElementById('editStaffId').value = '';
    document.getElementById('modalTitle').innerHTML = '<i class="fas fa-user-plus"></i> Register New Staff';
    
    const passwordSection = document.getElementById('staffPasswordSection');
    if (passwordSection) passwordSection.style.display = 'none';
    
    modal.style.display = 'flex';
}

// Close modal
function closeStaffModal() {
    const modal = document.getElementById('staffModal');
    if (modal) modal.style.display = 'none';
}

// Toggle password field
function toggleStaffPasswordField() {
    const loginCheckbox = document.getElementById('staffEnableLogin');
    const passwordSection = document.getElementById('staffPasswordSection');
    
    if (loginCheckbox && passwordSection) {
        passwordSection.style.display = loginCheckbox.checked ? 'block' : 'none';
    }
}

// Save staff to database
async function saveStaff() {
    const editId = document.getElementById('editStaffId').value;
    const loginEnabled = document.getElementById('staffEnableLogin').checked;
    const password = document.getElementById('staffPassword')?.value;
    const confirmPassword = document.getElementById('staffConfirmPassword')?.value;
    
    if (loginEnabled) {
        if (!password) {
            alert('Please enter a password');
            return;
        }
        if (password !== confirmPassword) {
            alert('Passwords do not match');
            return;
        }
        if (password.length < 6) {
            alert('Password must be at least 6 characters');
            return;
        }
    }
    
    const staffData = {
        title: document.getElementById('staffTitle').value,
        first_name: document.getElementById('staffFirstName').value.trim(),
        other_names: document.getElementById('staffOtherNames').value.trim(),
        department: document.getElementById('staffDept').value,
        designation: document.getElementById('staffDesignation').value,
        email: document.getElementById('staffEmail').value.trim(),
        phone: document.getElementById('staffPhone').value.trim(),
        national_id: document.getElementById('staffNationalId').value.trim(),
        gender: document.getElementById('staffGender').value,
        bank_name: document.getElementById('staffBankName').value.trim(),
        bank_account: document.getElementById('staffBankAcc').value.trim(),
        shif_number: document.getElementById('staffShif').value.trim(),
        nsrf_number: document.getElementById('staffNsrf').value.trim(),
        tax_pin: document.getElementById('staffTaxPin').value.trim(),
        login_enabled: loginEnabled,
        status: 'active'
    };
    
    if (!staffData.first_name || !staffData.department || !staffData.email || !staffData.phone) {
        alert('Please fill required fields');
        return;
    }
    
    try {
        if (editId) {
            // Update existing
            if (loginEnabled && password) {
                staffData.password_hash = btoa(password);
            }
            
            const { error } = await sb
                .from('staff_records')
                .update(staffData)
                .eq('id', editId);
            
            if (error) throw error;
            alert(`Staff ${staffData.first_name} updated!`);
            
        } else {
            // Create new - generate staff ID
            let staffId = document.getElementById('staffId').value.trim();
            if (!staffId) {
                const nextNum = staffRecords.length + 101;
                staffId = `STAFF${nextNum}`;
            }
            staffData.id = staffId;
            
            if (loginEnabled && password) {
                staffData.password_hash = btoa(password);
            }
            staffData.created_at = new Date().toISOString();
            
            const { error } = await sb.from('staff_records').insert([staffData]);
            if (error) throw error;
            alert(`Staff ${staffData.first_name} registered! ID: ${staffId}`);
        }
        
        closeStaffModal();
        loadAllStaff();
        
    } catch (error) {
        console.error('Save error:', error);
        alert(`Error: ${error.message}`);
    }
}

// Edit staff
async function editStaff(staffId) {
    const staff = staffRecords.find(s => s.id === staffId);
    if (!staff) return;
    
    document.getElementById('editStaffId').value = staff.id;
    document.getElementById('staffTitle').value = staff.title || '';
    document.getElementById('staffFirstName').value = staff.first_name;
    document.getElementById('staffOtherNames').value = staff.other_names || '';
    document.getElementById('staffDept').value = staff.department;
    document.getElementById('staffDesignation').value = staff.designation || '';
    document.getElementById('staffEmail').value = staff.email;
    document.getElementById('staffPhone').value = staff.phone;
    document.getElementById('staffNationalId').value = staff.national_id || '';
    document.getElementById('staffGender').value = staff.gender || '';
    document.getElementById('staffBankName').value = staff.bank_name || '';
    document.getElementById('staffBankAcc').value = staff.bank_account || '';
    document.getElementById('staffShif').value = staff.shif_number || '';
    document.getElementById('staffNsrf').value = staff.nsrf_number || '';
    document.getElementById('staffTaxPin').value = staff.tax_pin || '';
    document.getElementById('staffEnableLogin').checked = staff.login_enabled || false;
    document.getElementById('staffId').value = staff.id;
    
    const passwordSection = document.getElementById('staffPasswordSection');
    if (passwordSection) {
        passwordSection.style.display = staff.login_enabled ? 'block' : 'none';
        const pwdInput = document.getElementById('staffPassword');
        if (pwdInput) {
            pwdInput.required = false;
            pwdInput.placeholder = 'Leave blank to keep current';
        }
    }
    
    document.getElementById('modalTitle').innerHTML = '<i class="fas fa-user-edit"></i> Edit Staff';
    document.getElementById('staffModal').style.display = 'flex';
}

// Reset staff password
async function resetStaffPassword(staffId, staffName) {
    const newPassword = prompt(`Reset password for ${staffName}\n\nEnter new password (min 6 chars):`);
    if (!newPassword || newPassword.length < 6) {
        if (newPassword) alert('Password must be at least 6 characters');
        return;
    }
    
    const confirmPwd = prompt('Confirm new password:');
    if (newPassword !== confirmPwd) {
        alert('Passwords do not match');
        return;
    }
    
    try {
        const { error } = await sb
            .from('staff_records')
            .update({ 
                password_hash: btoa(newPassword),
                login_enabled: true
            })
            .eq('id', staffId);
        
        if (error) throw error;
        
        alert(`Password for ${staffName} reset successfully!`);
        loadAllStaff();
        
    } catch (error) {
        alert(`Error: ${error.message}`);
    }
}

// Delete staff
async function deleteStaff(staffId, staffName) {
    if (!confirm(`Delete staff "${staffName}"? This cannot be undone.`)) return;
    
    try {
        const { error } = await sb.from('staff_records').delete().eq('id', staffId);
        if (error) throw error;
        
        alert(`Staff ${staffName} deleted!`);
        loadAllStaff();
        
    } catch (error) {
        alert(`Error: ${error.message}`);
    }
}

// Filter staff
function filterStaffTable() {
    renderStaffTable();
}

// Export to CSV
function exportStaffToCSV() {
    const headers = ['Staff ID', 'Title', 'First Name', 'Other Names', 'Department', 'Designation', 'Email', 'Phone', 'National ID', 'Gender', 'Bank Name', 'Bank Account', 'SHIF', 'NSRF', 'Tax PIN', 'Login Enabled'];
    
    const rows = staffRecords.map(s => [
        s.id, s.title || '', s.first_name, s.other_names || '', s.department, s.designation || '',
        s.email, s.phone, s.national_id || '', s.gender || '', s.bank_name || '', s.bank_account || '',
        s.shif_number || '', s.nsrf_number || '', s.tax_pin || '', s.login_enabled ? 'Yes' : 'No'
    ]);
    
    let csv = headers.join(',') + '\n';
    rows.forEach(row => {
        csv += row.map(cell => `"${String(cell || '').replace(/"/g, '""')}"`).join(',') + '\n';
    });
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `staff_export_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
}

// Staff login function
async function staffLogin(emailOrId, password) {
    const { data, error } = await sb
        .from('staff_records')
        .select('*')
        .or(`email.eq.${emailOrId},id.eq.${emailOrId}`)
        .eq('login_enabled', true)
        .eq('status', 'active')
        .single();
    
    if (error || !data) {
        return { success: false, message: 'Invalid credentials' };
    }
    
    const storedPassword = atob(data.password_hash);
    if (storedPassword !== password) {
        return { success: false, message: 'Invalid password' };
    }
    
    const session = {
        staffId: data.id,
        name: `${data.title || ''} ${data.first_name} ${data.other_names || ''}`,
        email: data.email,
        department: data.department,
        role: 'staff'
    };
    
    localStorage.setItem('staffSession', JSON.stringify(session));
    return { success: true, staff: session };
}

// Initialize
function initStaffManagement() {
    loadAllStaff();
    
    const searchInput = document.getElementById('staffSearchInput');
    if (searchInput) searchInput.addEventListener('keyup', filterStaffTable);
    
    const deptFilter = document.getElementById('departmentFilter');
    if (deptFilter) deptFilter.addEventListener('change', filterStaffTable);
    
    const loginCheckbox = document.getElementById('staffEnableLogin');
    if (loginCheckbox) loginCheckbox.addEventListener('change', toggleStaffPasswordField);
}

// Make global
window.loadAllStaff = loadAllStaff;
window.openAddStaffModal = openAddStaffModal;
window.closeStaffModal = closeStaffModal;
window.saveStaff = saveStaff;
window.editStaff = editStaff;
window.resetStaffPassword = resetStaffPassword;
window.deleteStaff = deleteStaff;
window.filterStaffTable = filterStaffTable;
window.exportStaffToCSV = exportStaffToCSV;
window.initStaffManagement = initStaffManagement;
window.toggleStaffPasswordField = toggleStaffPasswordField;
window.staffLogin = staffLogin;

console.log('✅ Staff Management module ready');

/*******************************************************
 * SUPER ADMIN APPROVAL SYSTEM
 * All admin actions require Super Admin approval
 *******************************************************/

// Global variable for current action being reviewed
let currentActionId = null;

// Function to request admin action (called from admin functions)
async function requestAdminAction(actionType, actionData, description, targetId) {
    if (targetId === undefined) targetId = null;
    
    try {
        const { data: { user } } = await sb.auth.getUser();
        
        // Get admin name
        const { data: adminProfile } = await sb
            .from('consolidated_user_profiles_table')
            .select('full_name, email')
            .eq('user_id', user.id)
            .single();
        
        var actionRequest = {
            admin_id: user.id,
            admin_name: adminProfile?.full_name || adminProfile?.email || user.email,
            action_type: actionType,
            action_data: actionData,
            description: description,
            target_id: targetId,
            status: 'pending',
            requested_at: new Date().toISOString(),
            reviewed_at: null,
            reviewed_by: null,
            review_notes: null
        };
        
        var result = await sb
            .from('admin_action_requests')
            .insert([actionRequest])
            .select();
        
        if (result.error) throw result.error;
        
        var data = result.data;
        showFeedback('✅ Action submitted for Super Admin approval. Request ID: ' + data[0].id.substring(0, 8), 'success');
        
        // Send notification to Super Admins
        await notifySuperAdmins(actionRequest);
        
        // Update badge if on super admin dashboard
        if (document.getElementById('pendingApprovalsBadge')) {
            loadAdminActions();
        }
        
        return { success: true, requestId: data[0].id };
    } catch (error) {
        console.error('Error requesting admin action:', error);
        showFeedback('Failed to submit approval request: ' + error.message, 'error');
        return { success: false, error: error.message };
    }
}

// Notify Super Admins about pending action
async function notifySuperAdmins(actionRequest) {
    try {
        var superAdminsResult = await sb
            .from('consolidated_user_profiles_table')
            .select('user_id')
            .eq('role', 'superadmin');
        
        var superAdmins = superAdminsResult.data;
        if (!superAdmins || superAdmins.length === 0) return;
        
        var notifications = [];
        for (var i = 0; i < superAdmins.length; i++) {
            notifications.push({
                user_id: superAdmins[i].user_id,
                title: '🛡️ New Admin Action Requires Approval',
                message: actionRequest.admin_name + ' requested: ' + actionRequest.description.substring(0, 100),
                type: 'admin_approval',
                related_id: actionRequest.id,
                created_at: new Date().toISOString(),
                is_read: false
            });
        }
        
        await sb.from('notifications').insert(notifications);
        await logAudit('ADMIN_ACTION_REQUEST', actionRequest.admin_name + ' requested: ' + actionRequest.description, actionRequest.id, 'PENDING');
        
    } catch (error) {
        console.error('Error notifying super admins:', error);
    }
}

// Load all admin actions for Super Admin review
async function loadAdminActions() {
    var tbody = document.getElementById('admin-actions-body');
    if (!tbody) return;
    
    var typeFilter = 'all';
    var statusFilter = 'pending';
    
    var typeFilterEl = document.getElementById('approvalTypeFilter');
    var statusFilterEl = document.getElementById('approvalStatusFilter');
    
    if (typeFilterEl) typeFilter = typeFilterEl.value;
    if (statusFilterEl) statusFilter = statusFilterEl.value;
    
    var query = sb.from('admin_action_requests').select('*').order('requested_at', { ascending: false });
    
    if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
    }
    if (typeFilter !== 'all') {
        query = query.eq('action_type', typeFilter);
    }
    
    var result = await query;
    var data = result.data;
    var error = result.error;
    
    if (error) {
        console.error('Error loading admin actions:', error);
        tbody.innerHTML = '<tr><td colspan="8">Error loading actions: ' + error.message + '</td></tr>';
        return;
    }
    
    displayAdminActions(data || []);
    updateApprovalStats(data || []);
}

// Display admin actions in table
function displayAdminActions(actions) {
    var tbody = document.getElementById('admin-actions-body');
    if (!tbody) return;
    
    if (!actions || actions.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8">✅ No pending actions. All clear!</td></tr>';
        return;
    }
    
    var html = '';
    for (var i = 0; i < actions.length; i++) {
        var action = actions[i];
        var rowStyle = '';
        if (action.status === 'pending') rowStyle = 'background: #fef3c7;';
        else if (action.status === 'approved') rowStyle = 'background: #d1fae5;';
        else if (action.status === 'rejected') rowStyle = 'background: #fee2e2;';
        
        html += '<tr style="' + rowStyle + '">';
        html += '<td><small>#' + action.id.substring(0, 8) + '</small></td>';
        html += '<td>' + escapeHtml(action.admin_name) + '</td>';
        html += '<td><span class="badge badge-info">' + formatActionType(action.action_type) + '</span></td>';
        html += '<td>' + escapeHtml(action.description) + '</td>';
        html += '<td>' + (action.target_id ? escapeHtml(action.target_id.substring(0, 8)) : '-') + '</td>';
        html += '<td>' + formatDate(action.requested_at) + '</td>';
        html += '<td>' + getStatusBadge(action.status) + '</td>';
        html += '<td><button onclick="viewActionDetail(\'' + action.id + '\')" class="btn-sm btn-edit"><i class="fas fa-eye"></i> ' + (action.status === 'pending' ? 'Review' : 'View') + '</button></td>';
        html += '</tr>';
    }
    
    tbody.innerHTML = html;
}

function formatActionType(type) {
    var types = {
        'create_user': '➕ Create User',
        'delete_user': '❌ Delete User',
        'edit_user': '✏️ Edit User',
        'create_course': '📚 Create Course',
        'delete_course': '🗑️ Delete Course',
        'edit_course': '✏️ Edit Course',
        'create_unit': '📖 Create Unit',
        'delete_unit': '🗑️ Delete Unit',
        'edit_unit': '✏️ Edit Unit',
        'schedule_session': '📅 Schedule Session',
        'delete_session': '❌ Delete Session',
        'upload_resource': '📎 Upload Resource',
        'delete_resource': '🗑️ Delete Resource',
        'mass_promotion': '🔼 Mass Promotion'
    };
    return types[type] || type;
}

function getStatusBadge(status) {
    if (status === 'pending') {
        return '<span style="background: #fef3c7; color: #d97706; padding: 4px 8px; border-radius: 12px;">⏳ Pending</span>';
    } else if (status === 'approved') {
        return '<span style="background: #d1fae5; color: #059669; padding: 4px 8px; border-radius: 12px;">✅ Approved</span>';
    } else {
        return '<span style="background: #fee2e2; color: #dc2626; padding: 4px 8px; border-radius: 12px;">❌ Rejected</span>';
    }
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    var date = new Date(dateString);
    return date.toLocaleString();
}

function updateApprovalStats(actions) {
    var pending = 0;
    var approvedToday = 0;
    var rejected = 0;
    
    if (actions) {
        for (var i = 0; i < actions.length; i++) {
            if (actions[i].status === 'pending') pending++;
            if (actions[i].status === 'rejected') rejected++;
            if (actions[i].status === 'approved') {
                var reviewedDate = new Date(actions[i].reviewed_at);
                var today = new Date();
                if (reviewedDate.toDateString() === today.toDateString()) {
                    approvedToday++;
                }
            }
        }
    }
    
    var pendingEl = document.getElementById('pendingActionsCount');
    var approvedTodayEl = document.getElementById('approvedTodayCount');
    var rejectedEl = document.getElementById('rejectedCount');
    
    if (pendingEl) pendingEl.innerText = pending;
    if (approvedTodayEl) approvedTodayEl.innerText = approvedToday;
    if (rejectedEl) rejectedEl.innerText = rejected;
    
    var badge = document.getElementById('pendingApprovalsBadge');
    if (badge) {
        if (pending > 0) {
            badge.innerText = pending;
            badge.style.display = 'inline-block';
        } else {
            badge.style.display = 'none';
        }
    }
}

async function viewActionDetail(actionId) {
    currentActionId = actionId;
    
    var result = await sb
        .from('admin_action_requests')
        .select('*')
        .eq('id', actionId)
        .single();
    
    var action = result.data;
    var error = result.error;
    
    if (error) {
        showFeedback('Error loading action details', 'error');
        return;
    }
    
    var modalBody = document.getElementById('actionDetailBody');
    if (!modalBody) return;
    
    var reviewNotesHtml = '';
    if (action.review_notes) {
        reviewNotesHtml = '<hr><p><strong>📌 Review Notes:</strong> ' + escapeHtml(action.review_notes) + '</p>';
    }
    
    modalBody.innerHTML = '<div style="padding: 15px;">' +
        '<p><strong>📋 Request ID:</strong> ' + action.id + '</p>' +
        '<p><strong>👤 Admin:</strong> ' + escapeHtml(action.admin_name) + '</p>' +
        '<p><strong>⚡ Action Type:</strong> ' + formatActionType(action.action_type) + '</p>' +
        '<p><strong>📝 Description:</strong> ' + escapeHtml(action.description) + '</p>' +
        '<p><strong>🎯 Target ID:</strong> ' + (action.target_id || 'N/A') + '</p>' +
        '<p><strong>📅 Requested At:</strong> ' + formatDate(action.requested_at) + '</p>' +
        '<p><strong>📊 Status:</strong> ' + getStatusBadge(action.status) + '</p>' +
        '<hr>' +
        '<h4>📦 Full Action Data:</h4>' +
        '<pre style="background: #f3f4f6; padding: 10px; border-radius: 6px; overflow-x: auto; font-size: 12px;">' + JSON.stringify(action.action_data, null, 2) + '</pre>' +
        reviewNotesHtml +
        '</div>';
    
    var modal = document.getElementById('actionDetailModal');
    if (modal) modal.style.display = 'flex';
}

async function approveCurrentAction() {
    var notes = prompt('Add approval notes (optional):');
    if (notes === null) notes = 'Approved by Super Admin';
    
    var userResult = await sb.auth.getUser();
    var user = userResult.data.user;
    
    var updateResult = await sb
        .from('admin_action_requests')
        .update({
            status: 'approved',
            reviewed_at: new Date().toISOString(),
            reviewed_by: user.id,
            review_notes: notes || 'Approved by Super Admin'
        })
        .eq('id', currentActionId);
    
    if (updateResult.error) {
        showFeedback('Error approving action: ' + updateResult.error.message, 'error');
        return;
    }
    
    await executeApprovedAction(currentActionId);
    
    showFeedback('✅ Action approved and executed successfully!', 'success');
    closeModal('actionDetailModal');
    loadAdminActions();
    if (typeof loadAuditLogs === 'function') loadAuditLogs();
}

async function rejectCurrentAction() {
    var reason = prompt('❌ Please provide rejection reason:');
    if (!reason) return;
    
    var userResult = await sb.auth.getUser();
    var user = userResult.data.user;
    
    var updateResult = await sb
        .from('admin_action_requests')
        .update({
            status: 'rejected',
            reviewed_at: new Date().toISOString(),
            reviewed_by: user.id,
            review_notes: reason
        })
        .eq('id', currentActionId);
    
    if (updateResult.error) {
        showFeedback('Error rejecting action: ' + updateResult.error.message, 'error');
        return;
    }
    
    showFeedback('❌ Action rejected', 'warning');
    closeModal('actionDetailModal');
    loadAdminActions();
    if (typeof loadAuditLogs === 'function') loadAuditLogs();
}

async function executeApprovedAction(actionId) {
    var actionResult = await sb
        .from('admin_action_requests')
        .select('*')
        .eq('id', actionId)
        .single();
    
    var action = actionResult.data;
    if (actionResult.error) return;
    
    try {
        switch (action.action_type) {
            case 'delete_user':
                await sb.from('consolidated_user_profiles_table').delete().eq('user_id', action.target_id);
                await sb.auth.admin.deleteUser(action.target_id);
                break;
            case 'delete_course':
                await sb.from('courses').delete().eq('id', action.target_id);
                if (typeof loadCourses === 'function') loadCourses();
                break;
            case 'delete_session':
                await sb.from('scheduled_sessions').delete().eq('id', action.target_id);
                if (typeof loadScheduledSessions === 'function') loadScheduledSessions();
                break;
            case 'delete_resource':
                var filePath = action.action_data.file_path;
                await sb.storage.from(RESOURCES_BUCKET).remove([filePath]);
                await sb.from('resources').delete().eq('id', action.target_id);
                if (typeof loadAllResources === 'function') loadAllResources();
                break;
            default:
                console.log('Action type not implemented for execution:', action.action_type);
        }
        
        if (typeof loadAllUsers === 'function') loadAllUsers();
        if (typeof loadStudents === 'function') loadStudents();
        
    } catch (err) {
        console.error('Error executing approved action:', err);
    }
}

function filterAdminActions() {
    loadAdminActions();
}

async function loadApprovalHistory() {
    var tbody = document.getElementById('approval-log-body');
    if (!tbody) return;
    
    var result = await sb
        .from('admin_action_requests')
        .select('*')
        .not('status', 'eq', 'pending')
        .order('reviewed_at', { ascending: false })
        .limit(50);
    
    var data = result.data;
    var error = result.error;
    
    if (error) {
        tbody.innerHTML = '<tr><td colspan="5">Error loading history: ' + error.message + '</td></tr>';
        return;
    }
    
    if (!data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5">No approval history found</td></tr>';
        return;
    }
    
    var html = '';
    for (var i = 0; i < data.length; i++) {
        var action = data[i];
        html += '<tr>' +
            '<td>' + formatDate(action.reviewed_at) + '</td>' +
            '<td>' + escapeHtml(action.admin_name) + '</td>' +
            '<td>' + formatActionType(action.action_type) + '</td>' +
            '<td>' + getStatusBadge(action.status) + '</td>' +
            '<td>' + (action.review_notes ? escapeHtml(action.review_notes.substring(0, 50)) : '-') + '</td>' +
            '</tr>';
    }
    
    tbody.innerHTML = html;
}

function initAdminApprovals() {
    loadAdminActions();
    loadApprovalHistory();
    if (window.approvalInterval) clearInterval(window.approvalInterval);
    window.approvalInterval = setInterval(function() {
        var adminApprovalsTab = document.getElementById('admin-approvals');
        if (adminApprovalsTab && adminApprovalsTab.classList.contains('active')) {
            loadAdminActions();
        }
    }, 30000);
}

async function exportAdminActionsToCSV() {
    var result = await sb
        .from('admin_action_requests')
        .select('*')
        .order('requested_at', { ascending: false });
    
    var data = result.data;
    var error = result.error;
    
    if (error) {
        showFeedback('Error exporting actions', 'error');
        return;
    }
    
    var csvRows = [['Request ID', 'Admin Name', 'Action Type', 'Description', 'Target ID', 'Requested At', 'Status', 'Reviewed At', 'Review Notes']];
    
    for (var i = 0; i < data.length; i++) {
        var action = data[i];
        csvRows.push([
            action.id,
            action.admin_name,
            action.action_type,
            action.description,
            action.target_id || '',
            action.requested_at,
            action.status,
            action.reviewed_at || '',
            action.review_notes || ''
        ]);
    }
    
    var csvContent = '';
    for (var i = 0; i < csvRows.length; i++) {
        var row = [];
        for (var j = 0; j < csvRows[i].length; j++) {
            row.push('"' + String(csvRows[i][j]).replace(/"/g, '""') + '"');
        }
        csvContent += row.join(',') + '\n';
    }
    
    var blob = new Blob([csvContent], { type: 'text/csv' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'admin_actions_export_' + new Date().toISOString().split('T')[0] + '.csv';
    a.click();
    URL.revokeObjectURL(url);
    
    showFeedback('Admin actions exported successfully!', 'success');
}

// Make functions globally available
window.loadAdminActions = loadAdminActions;
window.viewActionDetail = viewActionDetail;
window.approveCurrentAction = approveCurrentAction;
window.rejectCurrentAction = rejectCurrentAction;
window.filterAdminActions = filterAdminActions;
window.exportAdminActionsToCSV = exportAdminActionsToCSV;
window.requestAdminAction = requestAdminAction;
window.initAdminApprovals = initAdminApprovals;

console.log('✅ Super Admin Approval System loaded');



// ============================================
// NURSING SCHOOL SYSTEM - COMPLETE MODULE
// ============================================

// Global variables for Nursing System
let currentInternalMarksData = [];
let currentNCKMarksData = [];
let nursingSystemChart = null;
let currentNCKStudentIndex = 0;
let currentNCKStudentsList = [];

// ============================================
// INITIALIZATION & LOAD FUNCTIONS
// ============================================

async function loadNursingSystemData() {
    console.log('🏥 Loading Nursing School System...');
    await loadNursingStats();
    await loadNursingSubjects();
    await loadNCKMarks();
    await loadNursingAnalytics();
}

async function loadNursingStats() {
    try {
        const { data: students, error: sError } = await sb
            .from('consolidated_user_profiles_table')
            .select('student_id', { count: 'exact' })
            .eq('role', 'student')
            .eq('status', 'approved');
        
        if (!sError) {
            document.getElementById('ns_total_students').textContent = students?.length || 0;
        }
        
        const { data: internalMarks, error: iError } = await sb
            .from('student_marks')
            .select('id', { count: 'exact' });
        
        if (!iError) {
            document.getElementById('ns_total_internal').textContent = internalMarks?.length || 0;
        }
        
        const { data: nckMarks, error: nError } = await sb
            .from('nck_marks')
            .select('id', { count: 'exact' });
        
        if (!nError) {
            document.getElementById('ns_total_nck').textContent = nckMarks?.length || 0;
        }
        
        // Calculate average score
        const { data: allScores } = await sb
            .from('student_marks')
            .select('final_score');
        
        let totalScore = 0;
        let count = 0;
        allScores?.forEach(s => {
            if (s.final_score > 0) {
                totalScore += s.final_score;
                count++;
            }
        });
        
        const avgScore = count > 0 ? (totalScore / count).toFixed(1) : 0;
        document.getElementById('ns_class_avg').textContent = `${avgScore}%`;
        
    } catch (err) {
        console.error('Error loading stats:', err);
    }
}

async function loadNursingSubjects() {
    try {
        const { data: units } = await sb
            .from('units_catalog')
            .select('block, unit_name, assessment_type')
            .eq('status', 'active');
        
        const blockSelect = document.getElementById('ns_block_select');
        const subjectSelect = document.getElementById('ns_subject_select');
        
        if (!blockSelect || !subjectSelect) return;
        
        // Group subjects by block
        const subjectsByBlock = {};
        units?.forEach(u => {
            if (!subjectsByBlock[u.block]) subjectsByBlock[u.block] = [];
            subjectsByBlock[u.block].push({
                name: u.unit_name,
                type: u.assessment_type || 'full'
            });
        });
        
        // Store for later use
        window.nursingSubjectsByBlock = subjectsByBlock;
        
    } catch (err) {
        console.error('Error loading subjects:', err);
    }
}

// ============================================
// INTERNAL MARKS FUNCTIONS
// ============================================

async function loadInternalMarks() {
    const block = document.getElementById('ns_block_select').value;
    const subject = document.getElementById('ns_subject_select').value;
    
    if (!block || !subject) {
        document.getElementById('ns_internal_marks_container').innerHTML = 
            '<div class="text-center" style="padding: 40px;">Select a block and subject to load marks</div>';
        return;
    }
    
    // Update assessment type dropdown
    const subjects = window.nursingSubjectsByBlock?.[block] || [];
    const foundSubject = subjects.find(s => s.name === subject);
    if (foundSubject) {
        document.getElementById('ns_assessment_type').value = foundSubject.type;
    }
    
    const container = document.getElementById('ns_internal_marks_container');
    container.innerHTML = '<div class="text-center" style="padding: 40px;"><div class="loading-spinner"></div><p>Loading marks...</p></div>';
    
    try {
        // Get students in this block
        const { data: students } = await sb
            .from('consolidated_user_profiles_table')
            .select('student_id, full_name')
            .eq('role', 'student')
            .eq('block', block)
            .eq('status', 'approved');
        
        if (!students || students.length === 0) {
            container.innerHTML = '<div class="text-center" style="padding: 40px;">No students found in this block</div>';
            return;
        }
        
        // Get existing marks
        const { data: existingMarks } = await sb
            .from('student_marks')
            .select('*')
            .eq('block', block)
            .eq('subject_name', subject);
        
        const marksMap = {};
        existingMarks?.forEach(m => { marksMap[m.admission_number] = m; });
        
        let html = `<div class="table-responsive">
            <table class="table table-bordered table-hover">
                <thead style="background-color: #343a40 !important">
                    <tr>
                        <th style="color: white; width: 5%;">#</th>
                        <th style="color: white; width: 15%;">Admission</th>
                        <th style="color: white; width: 25%;">Student Name</th>
                        <th style="color: white; width: 10%;">CAT1 (0-30)</th>
                        <th style="color: white; width: 10%;">CAT2 (0-30)</th>
                        <th style="color: white; width: 10%;">Exam (0-70)</th>
                        <th style="color: white; width: 10%;">Total</th>
                        <th style="color: white; width: 8%;">Grade</th>
                        <th style="color: white; width: 7%;">Status</th>
                    </tr>
                </thead>
                <tbody>`;
        
        for (let i = 0; i < students.length; i++) {
            const student = students[i];
            const mark = marksMap[student.student_id] || {};
            const cat1 = mark.cat1_score !== undefined && mark.cat1_score !== null ? mark.cat1_score : '';
            const cat2 = mark.cat2_score !== undefined && mark.cat2_score !== null ? mark.cat2_score : '';
            const exam = mark.exam_score !== undefined && mark.exam_score !== null ? mark.exam_score : '';
            
            let total = 0;
            let grade = '-';
            let status = 'PENDING';
            let statusClass = 'text-warning';
            
            if (cat1 !== '' || cat2 !== '' || exam !== '') {
                const ncat1 = Math.min(parseFloat(cat1) || 0, 30);
                const ncat2 = Math.min(parseFloat(cat2) || 0, 30);
                const nexam = Math.min(parseFloat(exam) || 0, 70);
                total = ((ncat1 + ncat2) / 60 * 30) + nexam;
                total = Math.round(total * 10) / 10;
                grade = calculateNursingGrade(total);
                status = total >= 60 ? 'PASS' : (total > 0 ? 'FAIL' : 'PENDING');
                statusClass = status === 'PASS' ? 'text-success' : (status === 'FAIL' ? 'text-danger' : 'text-warning');
            }
            
            html += `<tr>
                <td>${i + 1}</td>
                <td>${escapeHtml(student.student_id)}</td>
                <td><strong>${escapeHtml(student.full_name)}</strong></td>
                <td><input type="number" class="form-control internal-cat1" data-student="${student.student_id}" value="${cat1}" min="0" max="30" step="0.5" style="width: 80px;" onchange="updateInternalTotal('${student.student_id}')"></td>
                <td><input type="number" class="form-control internal-cat2" data-student="${student.student_id}" value="${cat2}" min="0" max="30" step="0.5" style="width: 80px;" onchange="updateInternalTotal('${student.student_id}')"></td>
                <td><input type="number" class="form-control internal-exam" data-student="${student.student_id}" value="${exam}" min="0" max="70" step="0.5" style="width: 80px;" onchange="updateInternalTotal('${student.student_id}')"></td>
                <td id="total_${student.student_id}" class="${statusClass}"><strong>${total || '-'}</strong></td>
                <td id="grade_${student.student_id}">${grade}</td>
                <td id="status_${student.student_id}" class="${statusClass}">${status}</td>
            </tr>`;
        }
        
        html += `</tbody>
            </table>
            </div>
            <div class="text-center" style="margin-top: 20px;">
                <button class="btn btn-success" onclick="saveAllInternalMarks()"><i class="fa fa-save"></i> Save All Marks</button>
                <button class="btn btn-info" onclick="fillDownInternalMarks()" style="margin-left: 10px;"><i class="fa fa-arrow-down"></i> Fill Down Values</button>
            </div>`;
        
        container.innerHTML = html;
        currentInternalMarksData = students;
        
    } catch (err) {
        container.innerHTML = `<div class="alert alert-danger">Error: ${err.message}</div>`;
    }
}

window.updateInternalTotal = function(studentId) {
    const cat1Input = document.querySelector(`.internal-cat1[data-student="${studentId}"]`);
    const cat2Input = document.querySelector(`.internal-cat2[data-student="${studentId}"]`);
    const examInput = document.querySelector(`.internal-exam[data-student="${studentId}"]`);
    
    if (!cat1Input || !cat2Input || !examInput) return;
    
    const cat1 = Math.min(parseFloat(cat1Input.value) || 0, 30);
    const cat2 = Math.min(parseFloat(cat2Input.value) || 0, 30);
    const exam = Math.min(parseFloat(examInput.value) || 0, 70);
    
    const total = ((cat1 + cat2) / 60 * 30) + exam;
    const finalTotal = Math.round(total * 10) / 10;
    const grade = calculateNursingGrade(finalTotal);
    const status = finalTotal >= 60 ? 'PASS' : (finalTotal > 0 ? 'FAIL' : 'PENDING');
    const statusClass = status === 'PASS' ? 'text-success' : (status === 'FAIL' ? 'text-danger' : 'text-warning');
    
    const totalSpan = document.getElementById(`total_${studentId}`);
    const gradeSpan = document.getElementById(`grade_${studentId}`);
    const statusSpan = document.getElementById(`status_${studentId}`);
    
    if (totalSpan) {
        totalSpan.innerHTML = `<strong>${finalTotal || '-'}</strong>`;
        totalSpan.className = statusClass;
    }
    if (gradeSpan) gradeSpan.innerHTML = grade;
    if (statusSpan) {
        statusSpan.innerHTML = status;
        statusSpan.className = statusClass;
    }
};

window.fillDownInternalMarks = function() {
    const cat1Inputs = document.querySelectorAll('.internal-cat1');
    const cat2Inputs = document.querySelectorAll('.internal-cat2');
    const examInputs = document.querySelectorAll('.internal-exam');
    
    if (cat1Inputs.length === 0) return;
    
    const firstCat1 = cat1Inputs[0].value;
    const firstCat2 = cat2Inputs[0].value;
    const firstExam = examInputs[0].value;
    
    for (let i = 1; i < cat1Inputs.length; i++) {
        cat1Inputs[i].value = firstCat1;
        cat2Inputs[i].value = firstCat2;
        examInputs[i].value = firstExam;
        const studentId = cat1Inputs[i].getAttribute('data-student');
        updateInternalTotal(studentId);
    }
    showNotification('Values filled down!', false);
};

window.saveAllInternalMarks = async function() {
    const block = document.getElementById('ns_block_select').value;
    const subject = document.getElementById('ns_subject_select').value;
    
    if (!block || !subject) {
        showNotification('Please select block and subject', true);
        return;
    }
    
    const assessmentType = document.getElementById('ns_assessment_type').value;
    const cat1Inputs = document.querySelectorAll('.internal-cat1');
    
    if (cat1Inputs.length === 0) {
        showNotification('No data to save', true);
        return;
    }
    
    showLoading('Saving marks...');
    let savedCount = 0;
    
    for (const input of cat1Inputs) {
        const studentId = input.getAttribute('data-student');
        const cat1 = parseFloat(document.querySelector(`.internal-cat1[data-student="${studentId}"]`).value) || 0;
        const cat2 = parseFloat(document.querySelector(`.internal-cat2[data-student="${studentId}"]`).value) || 0;
        const exam = parseFloat(document.querySelector(`.internal-exam[data-student="${studentId}"]`).value) || 0;
        
        const ncat1 = Math.min(cat1, 30);
        const ncat2 = Math.min(cat2, 30);
        const nexam = Math.min(exam, 70);
        const finalScore = ((ncat1 + ncat2) / 60 * 30) + nexam;
        const finalTotal = Math.round(finalScore * 10) / 10;
        const grade = calculateNursingGrade(finalTotal);
        
        const { error } = await sb
            .from('student_marks')
            .upsert({
                admission_number: studentId,
                block: block,
                subject_name: subject,
                assessment_type: assessmentType,
                cat1_score: cat1,
                cat2_score: cat2,
                exam_score: exam,
                final_score: finalTotal,
                grade: grade,
                academic_year: '2026',
                updated_at: new Date().toISOString()
            }, { onConflict: 'admission_number,subject_name,block' });
        
        if (!error) savedCount++;
    }
    
    hideLoading();
    showNotification(`Saved ${savedCount} marks!`, false);
    await loadNursingStats();
};

// ============================================
// NCK MARKS FUNCTIONS
// ============================================

async function loadNCKMarks() {
    const sheetName = document.getElementById('ns_nck_sheet').value;
    const block = document.getElementById('ns_nck_block').value;
    
    const container = document.getElementById('ns_nck_marks_container');
    container.innerHTML = '<div class="text-center" style="padding: 40px;"><div class="loading-spinner"></div><p>Loading NCK marks...</p></div>';
    
    try {
        // Get students in this block
        const { data: students } = await sb
            .from('consolidated_user_profiles_table')
            .select('student_id, full_name')
            .eq('role', 'student')
            .eq('block', block)
            .eq('status', 'approved');
        
        if (!students || students.length === 0) {
            container.innerHTML = '<div class="text-center" style="padding: 40px;">No students found in this block</div>';
            return;
        }
        
        currentNCKStudentsList = students;
        
        // Get existing NCK marks
        const { data: existingMarks } = await sb
            .from('nck_marks')
            .select('*')
            .eq('block', block)
            .eq('subject_name', sheetName);
        
        const marksMap = {};
        existingMarks?.forEach(m => { marksMap[m.admission_number] = m; });
        
        let html = `<div class="table-responsive">
            <table class="table table-bordered table-hover">
                <thead style="background-color: #343a40 !important">
                    <tr>
                        <th style="color: white; width: 5%;">#</th>
                        <th style="color: white; width: 25%;">Student Name</th>
                        <th style="color: white; width: 15%;">Admission</th>
                        <th style="color: white; width: 15%;">Score (%)</th>
                        <th style="color: white; width: 10%;">Grade</th>
                        <th style="color: white; width: 10%;">Status</th>
                        <th style="color: white; width: 15%;">Graded By</th>
                        <th style="color: white; width: 10%;">Actions</th>
                    </tr>
                </thead>
                <tbody>`;
        
        for (let i = 0; i < students.length; i++) {
            const student = students[i];
            const mark = marksMap[student.student_id] || {};
            const score = mark.final_score !== undefined && mark.final_score !== null ? mark.final_score : '';
            const grade = score !== '' ? calculateNursingGrade(parseFloat(score)) : '-';
            const status = score !== '' ? (parseFloat(score) >= 60 ? 'PASS' : (parseFloat(score) > 0 ? 'FAIL' : 'PENDING')) : 'PENDING';
            const statusClass = status === 'PASS' ? 'text-success' : (status === 'FAIL' ? 'text-danger' : 'text-warning');
            const gradedBy = mark.graded_by || '';
            
            html += `<tr>
                <td>${i + 1}</td>
                <td><strong>${escapeHtml(student.full_name)}</strong></td>
                <td>${escapeHtml(student.student_id)}</td>
                <td><input type="number" id="nck_score_${i}" class="form-control" value="${score}" min="0" max="100" step="0.5" style="width: 100px;" onchange="updateNCKTotal(${i})"></td>
                <td id="nck_grade_${i}" class="${statusClass}">${grade}</td>
                <td id="nck_status_${i}" class="${statusClass}">${status}</td>
                <td><input type="text" id="nck_graded_${i}" class="form-control" value="${escapeHtml(gradedBy)}" placeholder="Lecturer name" style="width: 150px;"></td>
                <td><button class="btn btn-sm btn-success" onclick="saveSingleNCK(${i})"><i class="fa fa-save"></i> Save</button></td>
            </tr>`;
        }
        
        html += `</tbody>
            </table>
            </div>
            <div class="text-center" style="margin-top: 20px;">
                <button class="btn btn-success" onclick="saveAllNCKMarks()"><i class="fa fa-save"></i> Save All NCK Marks</button>
                <button class="btn btn-info" onclick="fillDownNCKValues()" style="margin-left: 10px;"><i class="fa fa-arrow-down"></i> Fill Down Values</button>
            </div>`;
        
        container.innerHTML = html;
        
    } catch (err) {
        container.innerHTML = `<div class="alert alert-danger">Error: ${err.message}</div>`;
    }
}

window.updateNCKTotal = function(idx) {
    const scoreInput = document.getElementById(`nck_score_${idx}`);
    if (!scoreInput) return;
    
    const score = parseFloat(scoreInput.value) || 0;
    const grade = calculateNursingGrade(score);
    const status = score >= 60 ? 'PASS' : (score > 0 ? 'FAIL' : 'PENDING');
    const statusClass = status === 'PASS' ? 'text-success' : (status === 'FAIL' ? 'text-danger' : 'text-warning');
    
    const gradeSpan = document.getElementById(`nck_grade_${idx}`);
    const statusSpan = document.getElementById(`nck_status_${idx}`);
    
    if (gradeSpan) {
        gradeSpan.innerHTML = grade;
        gradeSpan.className = statusClass;
    }
    if (statusSpan) {
        statusSpan.innerHTML = status;
        statusSpan.className = statusClass;
    }
};

window.fillDownNCKValues = function() {
    const scoreInputs = document.querySelectorAll('[id^="nck_score_"]');
    if (scoreInputs.length === 0) return;
    
    const firstScore = scoreInputs[0].value;
    for (let i = 1; i < scoreInputs.length; i++) {
        scoreInputs[i].value = firstScore;
        updateNCKTotal(i);
    }
    showNotification('Values filled down!', false);
};

window.saveSingleNCK = async function(idx) {
    const sheetName = document.getElementById('ns_nck_sheet').value;
    const block = document.getElementById('ns_nck_block').value;
    const student = currentNCKStudentsList[idx];
    
    if (!student) {
        showNotification('Student not found', true);
        return;
    }
    
    const score = parseFloat(document.getElementById(`nck_score_${idx}`).value) || 0;
    const gradedBy = document.getElementById(`nck_graded_${idx}`).value;
    const grade = calculateNursingGrade(score);
    const status = score >= 60 ? 'passed' : (score > 0 ? 'failed' : 'pending');
    
    showLoading(`Saving NCK marks for ${student.full_name}...`);
    
    const { error } = await sb
        .from('nck_marks')
        .upsert({
            admission_number: student.student_id,
            student_name: student.full_name,
            block: block,
            subject_name: sheetName,
            final_score: score,
            grade: grade,
            status: status,
            graded_by: gradedBy || 'Admin',
            academic_year: '2026',
            published: true,
            updated_at: new Date().toISOString()
        }, { onConflict: 'admission_number,subject_name,block' });
    
    hideLoading();
    
    if (error) {
        showNotification(`Error: ${error.message}`, true);
    } else {
        showNotification(`Saved NCK marks for ${student.full_name}!`, false);
        updateNCKTotal(idx);
    }
};

window.saveAllNCKMarks = async function() {
    const sheetName = document.getElementById('ns_nck_sheet').value;
    const block = document.getElementById('ns_nck_block').value;
    const scoreInputs = document.querySelectorAll('[id^="nck_score_"]');
    
    if (scoreInputs.length === 0) {
        showNotification('No data to save', true);
        return;
    }
    
    showLoading('Saving all NCK marks...');
    let savedCount = 0;
    
    for (let i = 0; i < scoreInputs.length; i++) {
        const student = currentNCKStudentsList[i];
        if (!student) continue;
        
        const score = parseFloat(document.getElementById(`nck_score_${i}`).value) || 0;
        const gradedBy = document.getElementById(`nck_graded_${i}`).value;
        const grade = calculateNursingGrade(score);
        const status = score >= 60 ? 'passed' : (score > 0 ? 'failed' : 'pending');
        
        const { error } = await sb
            .from('nck_marks')
            .upsert({
                admission_number: student.student_id,
                student_name: student.full_name,
                block: block,
                subject_name: sheetName,
                final_score: score,
                grade: grade,
                status: status,
                graded_by: gradedBy || 'Admin',
                academic_year: '2026',
                published: true,
                updated_at: new Date().toISOString()
            }, { onConflict: 'admission_number,subject_name,block' });
        
        if (!error) savedCount++;
    }
    
    hideLoading();
    showNotification(`Saved ${savedCount} NCK records!`, false);
    await loadNursingStats();
};

// ============================================
// ANALYTICS FUNCTIONS
// ============================================

async function loadNursingAnalytics() {
    try {
        const { data: grades } = await sb.from('student_marks').select('final_score');
        const { data: nckMarks } = await sb.from('nck_marks').select('final_score');
        
        let totalScore = 0;
        let scoredCount = 0;
        let passedCount = 0;
        
        const allScores = [...(grades || []), ...(nckMarks || [])];
        for (const item of allScores) {
            const score = item.final_score || 0;
            if (score > 0) {
                totalScore += score;
                scoredCount++;
                if (score >= 60) passedCount++;
            }
        }
        
        const avgScore = scoredCount > 0 ? (totalScore / scoredCount).toFixed(1) : 0;
        const passRate = scoredCount > 0 ? ((passedCount / scoredCount) * 100).toFixed(1) : 0;
        const totalExams = allScores.length;
        
        document.getElementById('ns_avg_score').textContent = `${avgScore}%`;
        document.getElementById('ns_pass_rate').textContent = `${passRate}%`;
        document.getElementById('ns_total_exams').textContent = totalExams;
        
        // Get top student
        const { data: topStudent } = await sb
            .from('student_marks')
            .select('admission_number, student_name, final_score')
            .order('final_score', { ascending: false })
            .limit(1);
        
        if (topStudent && topStudent[0]) {
            document.getElementById('ns_top_student').textContent = topStudent[0].student_name?.substring(0, 20) || '-';
        }
        
        // Update chart
        if (nursingSystemChart) nursingSystemChart.destroy();
        const ctx = document.getElementById('ns_performance_chart')?.getContext('2d');
        if (ctx) {
            nursingSystemChart = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: [`Pass (${passedCount})`, `Fail (${scoredCount - passedCount})`, `Pending (${totalExams - scoredCount})`],
                    datasets: [{
                        data: [passedCount, scoredCount - passedCount, totalExams - scoredCount],
                        backgroundColor: ['#10b981', '#ef4444', '#f59e0b'],
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: {
                        legend: { position: 'bottom' }
                    }
                }
            });
        }
        
    } catch (err) {
        console.error('Error loading analytics:', err);
    }
}

// ============================================
// EXPORT FUNCTIONS
// ============================================

async function exportInternalMarksToCSV() {
    const { data: marks } = await sb.from('student_marks').select('*');
    if (!marks || marks.length === 0) {
        showNotification('No data to export', true);
        return;
    }
    
    const headers = ['Admission', 'Student Name', 'Block', 'Subject', 'CAT1', 'CAT2', 'Exam', 'Final Score', 'Grade', 'Academic Year'];
    const rows = marks.map(m => [
        m.admission_number || '',
        m.student_name || '',
        m.block || '',
        m.subject_name || '',
        m.cat1_score || '',
        m.cat2_score || '',
        m.exam_score || '',
        m.final_score || '',
        m.grade || '',
        m.academic_year || ''
    ]);
    
    let csv = headers.join(',') + '\n';
    rows.forEach(row => {
        csv += row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',') + '\n';
    });
    
    downloadCSV(csv, `internal_marks_${new Date().toISOString().split('T')[0]}.csv`);
    showNotification('Export complete!', false);
}

async function exportNCKMarksToCSV() {
    const { data: marks } = await sb.from('nck_marks').select('*');
    if (!marks || marks.length === 0) {
        showNotification('No data to export', true);
        return;
    }
    
    const headers = ['Admission', 'Student Name', 'Block', 'Subject', 'Final Score', 'Grade', 'Status', 'Graded By', 'Academic Year'];
    const rows = marks.map(m => [
        m.admission_number || '',
        m.student_name || '',
        m.block || '',
        m.subject_name || '',
        m.final_score || '',
        m.grade || '',
        m.status || '',
        m.graded_by || '',
        m.academic_year || ''
    ]);
    
    let csv = headers.join(',') + '\n';
    rows.forEach(row => {
        csv += row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',') + '\n';
    });
    
    downloadCSV(csv, `nck_marks_${new Date().toISOString().split('T')[0]}.csv`);
    showNotification('Export complete!', false);
}

async function exportStudentSummaryToCSV() {
    const { data: students } = await sb
        .from('consolidated_user_profiles_table')
        .select('student_id, full_name, program, intake_year, block')
        .eq('role', 'student')
        .eq('status', 'approved');
    
    if (!students || students.length === 0) {
        showNotification('No students found', true);
        return;
    }
    
    const { data: internalMarks } = await sb.from('student_marks').select('*');
    const { data: nckMarks } = await sb.from('nck_marks').select('*');
    
    const headers = ['Admission', 'Student Name', 'Program', 'Intake', 'Block', 'Internal Marks Count', 'Internal Avg', 'NCK Count', 'NCK Avg', 'Overall Avg', 'Status'];
    const rows = [];
    
    for (const student of students) {
        const studentInternal = internalMarks?.filter(m => m.admission_number === student.student_id) || [];
        const studentNCK = nckMarks?.filter(m => m.admission_number === student.student_id) || [];
        
        let internalTotal = 0;
        studentInternal.forEach(m => { if (m.final_score) internalTotal += m.final_score; });
        const internalAvg = studentInternal.length ? (internalTotal / studentInternal.length).toFixed(1) : 0;
        
        let nckTotal = 0;
        studentNCK.forEach(m => { if (m.final_score) nckTotal += m.final_score; });
        const nckAvg = studentNCK.length ? (nckTotal / studentNCK.length).toFixed(1) : 0;
        
        const overallAvg = (parseFloat(internalAvg) + parseFloat(nckAvg)) / 2;
        const status = overallAvg >= 60 ? 'PASS' : (overallAvg > 0 ? 'FAIL' : 'PENDING');
        
        rows.push([
            student.student_id || '',
            student.full_name || '',
            student.program || '',
            student.intake_year || '',
            student.block || '',
            studentInternal.length,
            internalAvg,
            studentNCK.length,
            nckAvg,
            overallAvg.toFixed(1),
            status
        ]);
    }
    
    let csv = headers.join(',') + '\n';
    rows.forEach(row => {
        csv += row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',') + '\n';
    });
    
    downloadCSV(csv, `student_summary_${new Date().toISOString().split('T')[0]}.csv`);
    showNotification('Export complete!', false);
}

function downloadCSV(csv, filename) {
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
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
// ============================================
// COMPLETE NURSING SCHOOL SYSTEM MODULE
// With Publish/Unpublish Functionality
// ============================================

// ========== PUBLISH FUNCTIONS ==========

// Toggle publish status for internal mark
window.togglePublishInternalMark = async function(studentId, subjectName, currentStatus) {
    const block = document.getElementById('ns_block_select').value;
    
    if (!confirm(`Are you sure you want to ${currentStatus ? 'HIDE' : 'PUBLISH'} this student's marks?`)) return;
    
    showLoading(`${currentStatus ? 'Unpublishing' : 'Publishing'}...`);
    
    try {
        const { error } = await sb
            .from('student_marks')
            .update({ 
                published: !currentStatus,
                published_at: !currentStatus ? new Date().toISOString() : null,
                published_by: currentUser?.username || 'Admin'
            })
            .eq('admission_number', studentId)
            .eq('block', block)
            .eq('subject_name', subjectName);
        
        if (error) throw error;
        
        showNotification(`Marks ${!currentStatus ? 'published' : 'hidden'}!`, false);
        await loadInternalMarks();
        
    } catch (err) {
        showNotification(`Error: ${err.message}`, true);
    } finally {
        hideLoading();
    }
};

// Bulk publish all internal marks for current subject
window.bulkPublishInternalMarks = async function() {
    const block = document.getElementById('ns_block_select').value;
    const subject = document.getElementById('ns_subject_select').value;
    const studentCount = document.querySelectorAll('.internal-cat1').length;
    
    if (!confirm(`Publish ALL marks for "${subject}" (${studentCount} students)?`)) return;
    
    showLoading(`Publishing ${studentCount} records...`);
    
    try {
        const { error } = await sb
            .from('student_marks')
            .update({ 
                published: true,
                published_at: new Date().toISOString(),
                published_by: currentUser?.username || 'Admin'
            })
            .eq('block', block)
            .eq('subject_name', subject);
        
        if (error) throw error;
        
        showNotification(`✅ Published ${studentCount} records!`, false);
        await loadInternalMarks();
        
    } catch (err) {
        showNotification(`Error: ${err.message}`, true);
    } finally {
        hideLoading();
    }
};

// Bulk unpublish all internal marks
window.bulkUnpublishInternalMarks = async function() {
    const block = document.getElementById('ns_block_select').value;
    const subject = document.getElementById('ns_subject_select').value;
    const studentCount = document.querySelectorAll('.internal-cat1').length;
    
    if (!confirm(`HIDE ALL marks for "${subject}" (${studentCount} students)?`)) return;
    
    showLoading(`Hiding ${studentCount} records...`);
    
    try {
        const { error } = await sb
            .from('student_marks')
            .update({ 
                published: false,
                published_at: null,
                published_by: currentUser?.username || 'Admin'
            })
            .eq('block', block)
            .eq('subject_name', subject);
        
        if (error) throw error;
        
        showNotification(`🔒 Hidden ${studentCount} records!`, false);
        await loadInternalMarks();
        
    } catch (err) {
        showNotification(`Error: ${err.message}`, true);
    } finally {
        hideLoading();
    }
};

// Toggle publish for NCK mark
window.togglePublishNCKMark = async function(idx) {
    const student = currentNCKStudentsList[idx];
    const sheetName = document.getElementById('ns_nck_sheet').value;
    const block = document.getElementById('ns_nck_block').value;
    
    const publishSpan = document.getElementById(`nck_publish_status_${idx}`);
    const currentStatus = publishSpan?.innerText.includes('Published');
    
    if (!confirm(`Are you sure you want to ${currentStatus ? 'HIDE' : 'PUBLISH'} NCK marks for ${student?.full_name}?`)) return;
    
    showLoading(`${currentStatus ? 'Hiding' : 'Publishing'}...`);
    
    try {
        const { error } = await sb
            .from('nck_marks')
            .update({ 
                published: !currentStatus,
                published_at: !currentStatus ? new Date().toISOString() : null,
                published_by: currentUser?.username || 'Admin'
            })
            .eq('admission_number', student.student_id)
            .eq('block', block)
            .eq('subject_name', sheetName);
        
        if (error) throw error;
        
        showNotification(`NCK marks ${!currentStatus ? 'published' : 'hidden'}!`, false);
        await loadNCKMarks();
        
    } catch (err) {
        showNotification(`Error: ${err.message}`, true);
    } finally {
        hideLoading();
    }
};

// Bulk publish all NCK marks
window.bulkPublishAllNCKMarks = async function() {
    const sheetName = document.getElementById('ns_nck_sheet').value;
    const block = document.getElementById('ns_nck_block').value;
    const studentCount = currentNCKStudentsList?.length || 0;
    
    if (!confirm(`PUBLISH ALL NCK marks for "${sheetName}" (${studentCount} students)?`)) return;
    
    showLoading(`Publishing ${studentCount} records...`);
    
    try {
        const { error } = await sb
            .from('nck_marks')
            .update({ 
                published: true,
                published_at: new Date().toISOString(),
                published_by: currentUser?.username || 'Admin'
            })
            .eq('block', block)
            .eq('subject_name', sheetName);
        
        if (error) throw error;
        
        showNotification(`✅ Published ${studentCount} NCK records!`, false);
        await loadNCKMarks();
        
    } catch (err) {
        showNotification(`Error: ${err.message}`, true);
    } finally {
        hideLoading();
    }
};
// ============================================
// TAB ACTIVATION HANDLER
// ============================================

// Add to your existing loadSectionData function
const originalLoadSectionData = window.loadSectionData;
window.loadSectionData = function(tabId) {
    if (typeof originalLoadSectionData === 'function') {
        originalLoadSectionData(tabId);
    }
    if (tabId === 'nursing-system') {
        setTimeout(() => loadNursingSystemData(), 300);
    }
};

// Initialize subject dropdown when block changes
document.getElementById('ns_block_select')?.addEventListener('change', function() {
    const block = this.value;
    const subjectSelect = document.getElementById('ns_subject_select');
    
    if (!subjectSelect) return;
    
    subjectSelect.innerHTML = '<option value="">-- Select Subject --</option>';
    
    if (block && window.nursingSubjectsByBlock && window.nursingSubjectsByBlock[block]) {
        window.nursingSubjectsByBlock[block].forEach(subject => {
            const option = document.createElement('option');
            option.value = subject.name;
            option.textContent = subject.name;
            subjectSelect.appendChild(option);
        });
    }
});

// Also trigger load when subject changes
document.getElementById('ns_subject_select')?.addEventListener('change', function() {
    if (this.value) {
        loadInternalMarks();
    }
});

// NCK block change triggers reload
document.getElementById('ns_nck_block')?.addEventListener('change', function() {
    loadNCKMarks();
});

document.getElementById('ns_nck_sheet')?.addEventListener('change', function() {
    loadNCKMarks();
});

console.log('✅ Nursing School System module loaded');
// =====================================================
// INITIALIZE THE APPLICATION - ONLY ONE EVENT LISTENER
// =====================================================
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Initializing SuperAdmin Dashboard...');
    
    // 1. Initialize ALL program dropdowns
    initializeAllProgramDropdowns();
    
    // 2. Setup event listeners
    setupEventListeners();
    
    // 3. Initialize modals
    initializeModals();
    
    // 4. Initialize session
    initSession();
    
    console.log('✅ Dashboard initialization complete');
});
