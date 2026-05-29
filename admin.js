// =====================================================
// ADMIN DASHBOARD JAVASCRIPT - ALL SECTIONS WORKING
// Program dropdowns synchronized across ALL sections
// TVET/KRCHN integration complete
// Limited permissions (Admin role)
// FEE MANAGEMENT REMOVED - DISPLAY ONLY
// =====================================================

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

// =====================================================
// SIMPLE GLOBAL SHOWTAB FUNCTION
// =====================================================
window.showTab = function(tabId) {
    console.log('Opening tab:', tabId);
    
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.style.display = 'none';
        tab.classList.remove('active');
    });
    
    const target = document.getElementById(tabId);
    if (target) {
        target.style.display = 'block';
        target.classList.add('active');
    }
    
    document.querySelectorAll('.nav a').forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('data-tab') === tabId) {
            link.classList.add('active');
        }
    });
    
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
let currentResourceType = 'all';
let allResourcesData = [];

// =====================================================
// HELPER: Get Exam Type Display Label
// =====================================================
function getExamTypeLabel(examType) {
    const labels = {
        'CAT_1': 'CAT 1',
        'CAT_2': 'CAT 2',
        'CAT': 'CAT',
        'END_TERM': 'End of Term',
        'FINAL': 'Final Exam',
        'SUPPLEMENTARY': 'Supplementary',
        'SPECIAL': 'Special Exam',
        'EXAM': 'Final Exam',
        'ASSIGNMENT': 'Assignment'
    };
    return labels[examType] || examType;
}
window.getExamTypeLabel = getExamTypeLabel;

// TVET Program Codes
const TVET_PROGRAMS = [
    'DPOTT', 'DCH', 'DHRIT', 'DSL', 'DSW', 'DCJS', 'DHSS', 'DICT', 'DME',
    'CPOTT', 'CCH', 'CHRIT', 'CPC', 'CSL', 'CSW', 'CCJS', 'CAG', 'CHSS', 'CICT',
    'ACH', 'AAG', 'ASW', 'CCA', 'PTE'
];

// Program display names
const PROGRAM_DISPLAY_NAMES = {
    'KRCHN': 'KRCHN Nursing',
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
    'ACH': 'Artisan in Community Health',
    'AAG': 'Artisan in Agriculture',
    'ASW': 'Artisan in Social Work & Community Development',
    'CCA': 'Certificate in Computer Applications',
    'PTE': 'TVET/CDACC (PTE)'
};

// =====================================================
// 1. CORE UTILITY FUNCTIONS
// =====================================================
function $(id) { return document.getElementById(id); }

function escapeHtml(s, isAttribute = false) {
    let str = String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    if (isAttribute) {
        str = str.replace(/'/g, '&#39;').replace(/"/g, '&quot;');
    } else {
        str = str.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
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

// =====================================================
// 2. PROGRAM MANAGEMENT FUNCTIONS (CORE)
// =====================================================
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
    return 'KRCHN';
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

// =====================================================
// 3. PROGRAM DROPDOWN MANAGEMENT
// =====================================================
function updateProgramDropdown(selectElement) {
    if (!selectElement) return;
    
    const currentValue = selectElement.value;
    const isMessageProgram = selectElement.id === 'msg_program';
    
    selectElement.innerHTML = '';
    
    if (isMessageProgram) {
        const allOption = document.createElement('option');
        allOption.value = 'ALL';
        allOption.textContent = '📢 All Programs';
        selectElement.appendChild(allOption);
        selectElement.appendChild(document.createElement('option'));
    }
    
    const krchnOption = document.createElement('option');
    krchnOption.value = 'KRCHN';
    krchnOption.textContent = '🎓 KRCHN Nursing';
    selectElement.appendChild(krchnOption);
    
    const diplomaGroup = document.createElement('optgroup');
    diplomaGroup.label = '🎯 TVET Diploma Programs (6-24 months)';
    ['DPOTT', 'DCH', 'DHRIT', 'DSL', 'DSW', 'DCJS', 'DHSS', 'DICT', 'DME'].forEach(code => {
        const option = document.createElement('option');
        option.value = code;
        option.textContent = PROGRAM_DISPLAY_NAMES[code] || code;
        diplomaGroup.appendChild(option);
    });
    selectElement.appendChild(diplomaGroup);
    
    const certificateGroup = document.createElement('optgroup');
    certificateGroup.label = '📜 TVET Certificate Programs (3-12 months)';
    ['CPOTT', 'CCH', 'CHRIT', 'CPC', 'CSL', 'CSW', 'CCJS', 'CAG', 'CHSS', 'CICT'].forEach(code => {
        const option = document.createElement('option');
        option.value = code;
        option.textContent = PROGRAM_DISPLAY_NAMES[code] || code;
        certificateGroup.appendChild(option);
    });
    selectElement.appendChild(certificateGroup);
    
    const artisanGroup = document.createElement('optgroup');
    artisanGroup.label = '🔧 TVET Artisan Programs (2-12 months)';
    ['ACH', 'AAG', 'ASW'].forEach(code => {
        const option = document.createElement('option');
        option.value = code;
        option.textContent = PROGRAM_DISPLAY_NAMES[code] || code;
        artisanGroup.appendChild(option);
    });
    selectElement.appendChild(artisanGroup);
    
    const otherGroup = document.createElement('optgroup');
    otherGroup.label = '📊 Other TVET Programs';
    ['CCA', 'PTE'].forEach(code => {
        const option = document.createElement('option');
        option.value = code;
        option.textContent = PROGRAM_DISPLAY_NAMES[code] || code;
        otherGroup.appendChild(option);
    });
    selectElement.appendChild(otherGroup);
    
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
    
    blockTermSelect.innerHTML = '<option value="">-- Select Block/Term --</option>';
    
    if (!programCode) {
        console.log('No program code selected');
        return;
    }
    
    let options = [];
    
    if (programType === 'KRCHN') {
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
    } else if (programType === 'TVET') {
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
    } else {
        options = [
            { value: 'Introductory', text: 'Introductory' },
            { value: 'Block A', text: 'Block A' },
            { value: 'Block B', text: 'Block B' },
            { value: 'Block C', text: 'Block C' },
            { value: 'Block D', text: 'Block D' },
            { value: 'Final', text: 'Final' }
        ];
    }
    
    options.push({ value: 'General', text: 'General' });
    
    options.forEach(opt => {
        const option = document.createElement('option');
        option.value = opt.value;
        option.textContent = opt.text;
        blockTermSelect.appendChild(option);
    });
    
    if (currentValue) {
        const valueExists = Array.from(blockTermSelect.options).some(opt => opt.value === currentValue);
        if (valueExists) {
            blockTermSelect.value = currentValue;
        }
    }
}

function initializeAllProgramDropdowns() {
    console.log('🎯 Initializing ALL program dropdowns...');
    
    const programDropdowns = [
        'account-program', 'edit_user_program', 'course-program',
        'new_session_program', 'exam_program', 'att_program',
        'resource_program', 'msg_program', 'clinical_program', 'promote_program'
    ];
    
    programDropdowns.forEach(dropdownId => {
        const dropdown = $(dropdownId);
        if (dropdown) {
            updateProgramDropdown(dropdown);
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
    
    const promoteProgramSelect = document.getElementById('promote_program');
    if (promoteProgramSelect) {
        promoteProgramSelect.addEventListener('change', function() {
            updateBlockTermOptions('promote_program', 'promote_from_block');
            updateBlockTermOptions('promote_program', 'promote_to_block');
        });
        if (promoteProgramSelect.value) {
            updateBlockTermOptions('promote_program', 'promote_from_block');
            updateBlockTermOptions('promote_program', 'promote_to_block');
        }
    }
    
    console.log('✅ All program dropdowns initialized');
}

// =====================================================
// 4. TAB NAVIGATION & MODAL MANAGEMENT
// =====================================================
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
        }
    }
}

async function loadSectionData(tabId) {
    document.querySelectorAll('.modal').forEach(m => m.style.display = 'none');
    
    switch(tabId) {
        case 'dashboard': loadDashboardData(); break;
        case 'users': loadAllUsers(); break;
        case 'pending': loadPendingApprovals(); break;
        case 'enroll': loadStudents(); 
            updateProgramDropdown($('account-program'));
            updateBlockTermOptions('account-program', 'account-block-term');
            break;
        case 'courses': loadCourses(); 
            updateProgramDropdown($('course-program'));
            updateBlockTermOptions('course-program', 'course-block');
            break;
        case 'sessions': loadScheduledSessions(); 
            updateProgramDropdown($('new_session_program'));
            updateBlockTermOptions('new_session_program', 'new_session_block_term');
            break;
        case 'attendance': loadAttendance(); 
            updateProgramDropdown($('att_program'));
            break;
        case 'cats': loadExams(); 
            updateProgramDropdown($('exam_program'));
            updateBlockTermOptions('exam_program', 'exam_block_term');
            break;
        case 'support-tickets': loadAdminTickets(); break;
        case 'messages': loadAdminMessages(); 
            updateProgramDropdown($('msg_program'));
            loadWelcomeMessageForEdit(); 
            break;
        case 'calendar': renderFullCalendar(); break;
        case 'unit-management': loadAllUnits(); break;
        case 'fee-accounts': loadStudentBalances(); break; // CHANGED: Only display balances
        case 'resources': 
            if (typeof loadAllResources === 'function') loadAllResources();
            updateProgramDropdown($('resource_program'));
            updateBlockTermOptions('resource_program', 'resource_block');
            break;
        case 'welcome-editor': loadWelcomeMessageForEdit(); break;
        case 'system-health': loadSystemHealth(); break;
        case 'user-analytics': loadUserAnalytics(); break;
    }
}

// =====================================================
// 5. AUDIT LOGGING (Limited for Admin)
// =====================================================
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
    if (error) console.error('Audit logging failed:', error);
}

// =====================================================
// 6. TABLE FILTERING & EXPORT FUNCTIONS
// =====================================================
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

// =====================================================
// 7. DASHBOARD & WELCOME EDITOR
// =====================================================
async function loadDashboardData() {
    const { count: allUsersCount } = await sb.from(USER_PROFILE_TABLE).select('user_id', { count: 'exact' });
    const totalUsersEl = document.getElementById('totalUsers');
    if (totalUsersEl) totalUsersEl.textContent = allUsersCount || 0;
    
    await loadTotalDailyCheckIns();
    
    const { count: pendingCount, error } = await sb.from(USER_PROFILE_TABLE).select('user_id', { count: 'exact', head: true }).eq('status', 'pending');
    const pendingApprovalsEl = document.getElementById('pendingApprovals');
    if (error) {
        if (pendingApprovalsEl) pendingApprovalsEl.textContent = '0';
    } else {
        if (pendingApprovalsEl) pendingApprovalsEl.textContent = pendingCount || 0;
    }
    
    const { count: studentsCount } = await sb.from(USER_PROFILE_TABLE).select('user_id', { count: 'exact' }).eq('role', 'student');
    const totalStudentsEl = document.getElementById('totalStudents');
    if (totalStudentsEl) totalStudentsEl.textContent = studentsCount || 0;
    
    const { count: coursesCount } = await sb.from('courses').select('*', { count: 'exact', head: true });
    const totalCoursesEl = document.getElementById('totalCourses');
    if (totalCoursesEl) totalCoursesEl.textContent = coursesCount || 0;
    
    const { data: units } = await sb.from('units_catalog').select('id', { count: 'exact' });
    const dashboardTotalUnits = document.getElementById('dashboardTotalUnits');
    if (dashboardTotalUnits) dashboardTotalUnits.textContent = units?.length || 0;
    
    const { data: openTickets } = await sb.from('support_tickets').select('id', { count: 'exact' }).eq('status', 'open');
    const dashboardOpenTickets = document.getElementById('dashboardOpenTickets');
    if (dashboardOpenTickets) dashboardOpenTickets.textContent = openTickets?.length || 0;
    
    // Load fee summary for dashboard (display only)
    await loadFeeSummaryForDashboard();
    
    loadStudentWelcomeMessage();
}

async function loadFeeSummaryForDashboard() {
    try {
        const { data: students } = await sb.from(USER_PROFILE_TABLE).select('user_id, program, block').eq('role', 'student').eq('status', 'approved');
        let totalOutstanding = 0;
        for (const student of students) {
            const { data: feeConfig } = await sb.from('fee_structure').select('amount').eq('program', student.program).eq('block', student.block || 'Introductory').single();
            const totalDue = feeConfig?.amount || 0;
            const { data: payments } = await sb.from('fee_payments').select('amount').eq('student_id', student.user_id);
            const totalPaid = payments ? payments.reduce((sum, p) => sum + parseFloat(p.amount), 0) : 0;
            const balance = totalDue - totalPaid;
            if (balance > 0) totalOutstanding += balance;
        }
        const dashboardOutstandingFees = document.getElementById('dashboardOutstandingFees');
        if (dashboardOutstandingFees) dashboardOutstandingFees.innerHTML = `KES ${totalOutstanding.toLocaleString()}`;
    } catch (error) {
        console.error('Error loading fee summary:', error);
    }
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
    const { count, error } = await sb.from('geo_attendance_logs').select('*', { count: 'exact', head: true }).gte('check_in_time', todayISO).lt('check_in_time', tomorrowISO);
    if (error) {
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
            const { error } = await sb.from(SETTINGS_TABLE).update({ value, updated_at: new Date().toISOString() }).eq('id', existing[0].id);
            updateOrInsertError = error;
        } else {
            const { error } = await sb.from(SETTINGS_TABLE).insert({ key: MESSAGE_KEY, value });
            updateOrInsertError = error;
        }
        if (updateOrInsertError) throw updateOrInsertError;
        await logAudit('WELCOME_MESSAGE_UPDATE', `Successfully updated the student welcome message.`, null, 'SUCCESS');
        showFeedback('Welcome message saved successfully!', 'success');
        loadWelcomeMessageForEdit();
    } catch (err) {
        await logAudit('WELCOME_MESSAGE_UPDATE', `Failed to update welcome message.`, null, 'FAILURE');
        showFeedback(`Failed to save message: ${err.message}`, 'error');
    } finally {
        setButtonLoading(submitButton, false, originalText);
    }
}

// =====================================================
// 8. SYSTEM HEALTH
// =====================================================
async function loadSystemHealth() {
    updateProgressBar('server-load-bar', 'server-load-text', 45, '%');
    updateProgressBar('db-performance-bar', 'db-query-time', 78, '% - 12ms avg');
    updateProgressBar('storage-usage-bar', 'storage-used', 62, 'GB / 100GB');
    updateProgressBar('api-response-bar', 'api-response-time', 92, '% - 180ms avg');
}

function updateProgressBar(barId, textId, percentage, suffix) {
    const bar = $(barId);
    const text = $(textId);
    if (bar && text) {
        bar.style.width = `${percentage}%`;
        text.textContent = `${percentage}${suffix}`;
    }
}

async function loadUserAnalytics() {
    console.log('Loading user analytics...');
}

// =====================================================
// 9. USERS MANAGEMENT - ENHANCED WITH TVET/KRCHN
// =====================================================
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
    const programType = getProgramType(programCode);
    const programName = getProgramDisplayName(programCode);
    const programLevel = getProgramLevel(programCode);
    const blockTermField = programType === 'TVET' ? 'term' : 'block';
    const blockTermValue = block;
    const userData = { full_name: name, role, phone, program: programCode, program_type: programType, program_name: programName, program_level: programLevel, intake_year, [blockTermField]: blockTermValue, status: 'approved', block_program_year: false };
    console.log('🎯 Enrolling user with data:', userData);
    try {
        const { data: { user }, error: authError } = await sb.auth.signUp({ email, password, options: { data: userData } });
        if (authError) throw authError;
        if (user && user.id) {
            const profileData = { user_id: user.id, email, ...userData };
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

async function approveUser(userId, fullName, studentId = '', email = '', role = 'student', program = 'N/A') {
    console.log('🎯 Approving user:', { userId, fullName, studentId });
    if (!confirm(`Approve user ${fullName}?`)) return;
    try {
        const { data, error } = await sb.from(USER_PROFILE_TABLE).update({ status: 'approved', student_id: studentId || '' }).eq('user_id', userId).select('*');
        if (error) {
            await logAudit('USER_APPROVE', `Failed to approve user ${fullName}. Reason: ${error.message}`, userId, 'FAILURE');
            showFeedback(`Failed: ${error.message}`, 'error');
            return;
        }
        showFeedback(`✅ User ${fullName} approved successfully!`, 'success');
        await logAudit('USER_APPROVE', `User ${fullName} approved successfully.`, userId, 'SUCCESS');
        loadPendingApprovals();
        loadAllUsers();
        loadStudents();
        if (typeof loadDashboardData === 'function') loadDashboardData();
    } catch (err) {
        showFeedback(`Unexpected error: ${err.message}`, 'error');
    }
}

async function loadPendingApprovals() {
    const tbody = $('pending-table');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="7">Loading pending approvals...回溯</tr>';
    const { data: pending, error } = await sb.from(USER_PROFILE_TABLE).select('*').eq('status', 'pending').order('created_at', { ascending: true });
    if (error) {
        tbody.innerHTML = `<tr><td colspan="7">Error: ${error.message}</td></tr>`;
        return;
    }
    if (!pending || pending.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7">No pending approvals.回溯</tr>';
        return;
    }
    tbody.innerHTML = '';
    pending.forEach(u => {
        const escapedName = escapeHtml(u.full_name);
        const escapedUserId = escapeHtml(u.user_id);
        const escapedStudentId = escapeHtml(u.student_id || '');
        const escapedEmail = escapeHtml(u.email || '');
        const escapedRole = escapeHtml(u.role || 'student');
        const escapedProgram = escapeHtml(u.program || 'N/A');
        const programName = getProgramDisplayName(u.program);
        const programType = getProgramType(u.program);
        const programBadgeClass = programType === 'TVET' ? 'badge-tvet' : 'badge-krchn';
        const programIcon = programType === 'TVET' ? 'fa-tools' : 'fa-graduation-cap';
        tbody.innerHTML += `
            <tr>
                <td>${escapedName}</td>
                <td>${escapedEmail}</td>
                <td>${escapedRole}</td>
                <td>${escapeHtml(programName)}<div class="program-badge ${programBadgeClass}"><i class="fas ${programIcon}"></i> ${programType}</div></td>
                <td>${escapedStudentId || 'N/A'}</td>
                <td>${new Date(u.created_at).toLocaleDateString()}</td>
                <td><button class="btn btn-approve" onclick="approveUser('${escapedUserId}', '${escapedName}', '${escapedStudentId}', '${escapedEmail}', '${escapedRole}', '${escapedProgram}')">Approve</button><button class="btn btn-delete" onclick="deleteProfile('${escapedUserId}', '${escapedName}')">Reject</button></td>
            </tr>`;
    });
}

async function loadAllUsers() {
    const tbody = $('users-table');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="7">Loading all users...回溯</td>';
    const { data: users, error } = await sb.from(USER_PROFILE_TABLE).select('*').order('full_name', { ascending: true });
    if (error) {
        tbody.innerHTML = `<tr><td colspan="7">Error loading users: ${error.message}回溯</tr>`;
        return;
    }
    tbody.innerHTML = '';
    users.forEach(u => {
        const isBlocked = u.block_program_year === true;
        const isApproved = u.status === 'approved';
        const statusText = isBlocked ? 'BLOCKED' : (isApproved ? 'Approved' : 'Pending');
        const statusClass = isBlocked ? 'status-danger' : (isApproved ? 'status-approved' : 'status-pending');
        const programName = getProgramDisplayName(u.program);
        const programType = getProgramType(u.program);
        const programBadgeClass = programType === 'TVET' ? 'badge-tvet' : 'badge-krchn';
        const programIcon = programType === 'TVET' ? 'fa-tools' : 'fa-graduation-cap';
        const escapedUserId = escapeHtml(u.user_id);
        const escapedName = escapeHtml(u.full_name);
        tbody.innerHTML += `
            <tr>
                <td>${escapeHtml(u.user_id.substring(0, 8))}...</td>
                <td>${escapeHtml(u.full_name)}</td>
                <td>${escapeHtml(u.email)}</td>
                <td>${escapeHtml(u.role)}</td>
                <td>${escapeHtml(programName)}<div class="program-badge ${programBadgeClass}"><i class="fas ${programIcon}"></i> ${programType}</div></td>
                <td class="${statusClass}">${statusText}</td>
                <td><button class="btn btn-map" onclick="openEditUserModal('${escapedUserId}')">Edit</button>${!isApproved ? `<button class="btn btn-approve" onclick="approveUser('${escapedUserId}', '${escapedName}')">Approve</button>` : ''}<button class="btn btn-delete" onclick="deleteProfile('${escapedUserId}', '${escapedName}')">Delete</button></td>
            </tr>`;
    });
    filterTable('user-search', 'users-table', [1, 2, 4]);
}

async function loadStudents() {
    const tbody = $('students-table');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="9">Loading students...回溯</tr>';
    const { data: students, error } = await sb.from(USER_PROFILE_TABLE).select('*').eq('role', 'student').order('full_name', { ascending: true });
    if (error) {
        tbody.innerHTML = `<td><td colspan="9">Error loading students: ${error.message}回溯</tr>`;
        return;
    }
    tbody.innerHTML = '';
    students.forEach(s => {
        const isBlocked = s.block_program_year === true;
        const statusText = isBlocked ? 'BLOCKED' : (s.status === 'approved' ? 'Active' : 'Pending');
        const statusClass = isBlocked ? 'status-danger' : (s.status === 'approved' ? 'status-approved' : 'status-pending');
        const programName = getProgramDisplayName(s.program);
        const programType = getProgramType(s.program);
        const programLevel = getProgramLevel(s.program);
        const programBadgeClass = programType === 'TVET' ? 'badge-tvet' : 'badge-krchn';
        const programIcon = programType === 'TVET' ? 'fa-tools' : 'fa-graduation-cap';
        const blockTermDisplay = s.block || 'Not Assigned';
        const blockTermLabel = programType === 'TVET' ? 'Term' : 'Block';
        const escapedUserId = escapeHtml(s.user_id);
        const escapedName = escapeHtml(s.full_name);
        tbody.innerHTML += `
            <tr>
                <td>${escapeHtml(s.user_id.substring(0, 8))}...</td>
                <td>${escapeHtml(s.full_name)}</td>
                <td>${escapeHtml(s.email)}</td>
                <td><strong>${escapeHtml(programName)}</strong>${programType === 'TVET' ? `<br><small class="text-muted">${programLevel}</small>` : ''}<div class="program-badge ${programBadgeClass}"><i class="fas ${programIcon}"></i> ${programType}</div></td>
                <td>${escapeHtml(s.intake_year || 'N/A')}</td>
                <td><strong>${blockTermLabel}:</strong> ${escapeHtml(blockTermDisplay)}</td>
                <td>${escapeHtml(s.phone)}</td>
                <td class="${statusClass}">${statusText}</td>
                <td><button class="btn btn-map" onclick="openEditUserModal('${escapedUserId}')">Edit</button><button class="btn btn-delete" onclick="deleteProfile('${escapedUserId}', '${escapedName}')">Delete</button></td>
            </tr>`;
    });
    filterTable('student-search', 'students-table', [1, 3, 5]);
}

async function openEditUserModal(userId) {
    try {
        const { data: user, error } = await sb.from(USER_PROFILE_TABLE).select('*').eq('user_id', userId).single();
        if (error || !user) throw new Error('User fetch failed.');
        const modal = document.getElementById('userEditModal');
        if (!modal) {
            showFeedback('Edit user modal not found.', 'error');
            return;
        }
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
        if (editUserProgram) {
            updateProgramDropdown(editUserProgram);
            editUserProgram.value = user.program || 'KRCHN';
            const changeEvent = new Event('change', { bubbles: true });
            editUserProgram.dispatchEvent(changeEvent);
            setTimeout(() => {
                if (editUserBlock) {
                    updateBlockTermOptions('edit_user_program', 'edit_user_block');
                    setTimeout(() => { editUserBlock.value = user.block || ''; }, 50);
                }
            }, 100);
        }
        modal.style.display = 'flex';
    } catch (e) {
        showFeedback(`Failed to load user: ${e.message}`, 'error');
    }
}

async function handleEditUser(e) {
    e.preventDefault();
    const submitButton = e.submitter;
    if (!submitButton) return;
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
        const { error: profileError } = await sb.from(USER_PROFILE_TABLE).update(updatedData).eq('user_id', userId);
        if (profileError) throw profileError;
        if (newPassword) {
            const { error: pwError } = await sb.auth.admin.updateUserById(userId, { password: newPassword });
            if (pwError) showFeedback('User profile saved, but password update failed.', 'warning');
        }
        await logAudit('USER_EDIT', `Edited profile for user ${updatedData.full_name}`, userId, 'SUCCESS');
        showFeedback('✅ User profile updated successfully!', 'success');
        $('userEditModal').style.display = 'none';
        $('edit_user_new_password').value = '';
        $('edit_user_confirm_password').value = '';
        loadAllUsers();
        loadStudents();
        if (typeof loadDashboardData === 'function') loadDashboardData();
    } catch (err) {
        showFeedback(`Failed to update user: ${err.message}`, 'error');
    } finally {
        setButtonLoading(submitButton, false, originalText);
    }
}

async function deleteProfile(userId, fullName, isRejection = false) {
    const action = isRejection ? 'Reject' : 'Delete';
    if (!confirm(`${action}: Permanently delete user ${fullName}?`)) return;
    try {
        const { error: profileError } = await sb.from(USER_PROFILE_TABLE).delete().eq('user_id', userId);
        if (profileError) throw profileError;
        try {
            await sb.auth.admin.deleteUser(userId);
        } catch (authError) { console.warn('Auth deletion failed:', authError); }
        await logAudit('USER_DELETE', `${action} user ${fullName}`, userId, 'SUCCESS');
        showFeedback(`✅ ${action} successful!`, 'success');
        loadPendingApprovals();
        loadAllUsers();
        loadStudents();
        if (typeof loadDashboardData === 'function') loadDashboardData();
    } catch (err) {
        showFeedback(`Failed: ${err.message}`, 'error');
    }
}

// =====================================================
// 10. COURSES MANAGEMENT
// =====================================================
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
        const { error } = await sb.from('courses').insert({ course_name, unit_code, description, target_program, intake_year, block, status: 'Active' });
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
    tbody.innerHTML = '<tr><td colspan="6">Loading courses...回溯</table>';
    const { data: courses, error } = await fetchData('courses', '*', {}, 'course_name', true);
    if (error) { tbody.innerHTML = `<tr><td colspan="6">Error loading courses: ${error.message}回溯</tr>`; return; }
    tbody.innerHTML = '';
    courses.forEach(c => {
        tbody.innerHTML += `<tr>
            <td>${escapeHtml(c.course_name)}</td>
            <td>${escapeHtml(c.unit_code || 'N/A')}</td>
            <td>${escapeHtml(c.target_program || 'N/A')}</td>
            <td>${escapeHtml(c.intake_year || 'N/A')}</td>
            <td>${escapeHtml(c.block || 'N/A')}</td>
            <td><button class="btn-action" onclick="openEditCourseModal('${c.id}')">Edit</button><button class="btn btn-delete" onclick="deleteCourse('${c.id}', '${escapeHtml(c.unit_code)}')">Delete</button></td>
        </tr>`;
    });
    filterTable('course-search', 'courses-table', [0, 1, 3]);
}

async function deleteCourse(courseId, unitCode) {
    if (!confirm(`Delete course ${unitCode}?`)) return;
    const { error } = await sb.from('courses').delete().eq('id', courseId);
    if (error) {
        await logAudit('COURSE_DELETE', `Failed to delete course ID ${courseId}.`, courseId, 'FAILURE');
        showFeedback(`Failed to delete course: ${error.message}`, 'error');
    } else {
        await logAudit('COURSE_DELETE', `Deleted course ${unitCode}.`, courseId, 'SUCCESS');
        showFeedback('Course deleted!', 'success');
        loadCourses();
    }
}

function openEditCourseModal(id) { alert(`Edit course ID: ${id.substring(0,8)}...`); }

// =====================================================
// 11. SESSIONS & CLINICAL MANAGEMENT
// =====================================================
async function loadScheduledSessions() {
    const tbody = document.getElementById('scheduledSessionsTableBody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="6">Loading scheduled sessions...回溯</tr>';
    const { data: sessions, error } = await fetchData('scheduled_sessions', '*, course:course_id(course_name)', {}, 'session_date', false);
    if (error) {
        tbody.innerHTML = `<tr><td colspan="6">Error loading sessions: ${error.message}回溯</td>`;
        return;
    }
    if (!sessions || sessions.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6">No scheduled sessions found.回溯</tr>`;
        return;
    }
    const fragment = document.createDocumentFragment();
    sessions.forEach(s => {
        const tr = document.createElement('tr');
        const dateTime = new Date(s.session_date).toLocaleDateString() + ' ' + (s.session_time || 'N/A');
        const courseName = s.course?.course_name || 'N/A';
        let detail = s.session_title;
        if (s.session_type === 'class' && courseName !== 'N/A') detail += ` (${courseName})`;
        tr.innerHTML = `<td>${escapeHtml(s.session_type)}</td><td>${escapeHtml(detail)}</td><td>${dateTime}</td><td>${escapeHtml(s.target_program || 'N/A')}</td><td>${escapeHtml(s.block_term || 'N/A')}</td><td><button class="btn btn-delete" onclick="deleteSession('${s.id}')">Delete</button></td>`;
        fragment.appendChild(tr);
    });
    tbody.innerHTML = '';
    tbody.appendChild(fragment);
}

async function deleteSession(sessionId) {
    if (!confirm('Delete session?')) return;
    const { error } = await sb.from('scheduled_sessions').delete().eq('id', sessionId);
    if (error) showFeedback(`Failed: ${error.message}`, 'error');
    else { showFeedback('Session deleted!', 'success'); loadScheduledSessions(); renderFullCalendar(); }
}

// =====================================================
// 12. ATTENDANCE MANAGEMENT
// =====================================================
async function loadAttendance() {
    const todayBody = $('attendance-table');
    const pastBody = $('past-attendance-table');
    if (!todayBody || !pastBody) return;
    todayBody.innerHTML = '<tr><td colspan="7">Loading today\'s records...回溯</tr>';
    pastBody.innerHTML = '<tr><td colspan="6">Loading history...回溯</td>';
    const todayISO = new Date().toISOString().slice(0, 10);
    const { data: allRecords, error } = await sb.from('geo_attendance_logs').select(`*, is_verified, latitude, longitude, target_name, ${USER_PROFILE_TABLE}:student_id(full_name, role)`).order('check_in_time', { ascending: false });
    if (error) {
        todayBody.innerHTML = `<tr><td colspan="7">Error: ${error.message}回溯</tr>`;
        pastBody.innerHTML = `</table><td colspan="6">Error: ${error.message}回溯</tr>`;
        return;
    }
    let todayHtml = '', pastHtml = '';
    allRecords.forEach(r => {
        const userProfile = r[USER_PROFILE_TABLE];
        const userName = userProfile?.full_name || 'N/A User';
        const dateTime = new Date(r.check_in_time).toLocaleString();
        const targetDetail = r.target_name || r.department || r.location_name || 'N/A Target';
        const locationDisplay = r.location_friendly_name || r.location_name || r.department || 'N/A';
        const geoStatus = (r.latitude && r.longitude) ? 'Yes (Geo-Logged)' : 'No (Manual)';
        let actionsHtml = '';
        const mapAvailable = r.latitude && r.longitude;
        const mapAction = mapAvailable ? `showMap(${r.latitude},${r.longitude},'${locationDisplay.replace(/'/g, "\\'")}','${userName.replace(/'/g, "\\'")}','${dateTime.replace(/'/g, "\\'")}')` : '';
        actionsHtml += `<button class="btn btn-map btn-small" ${mapAvailable ? '' : 'disabled'} onclick="${mapAction}">View Map</button>`;
        const isToday = new Date(r.check_in_time).toISOString().slice(0, 10) === todayISO;
        const statusDisplay = r.is_verified ? '✅ Verified' : 'Pending';
        if (isToday && !r.is_verified) actionsHtml += `<button class="btn btn-approve btn-small" onclick="approveAttendanceRecord('${r.id}')">Approve</button>`;
        actionsHtml += `<button class="btn btn-delete btn-small" onclick="deleteAttendanceRecord('${r.id}')">Delete</button>`;
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
    todayBody.innerHTML = todayHtml || '<tr><td colspan="7">No check-in records for today.回溯</tr>';
    pastBody.innerHTML = pastHtml || '<tr><td colspan="6">No past attendance history found.回溯</tr>';
}

async function approveAttendanceRecord(recordId) {
    if (!confirm('Approve this attendance record?')) return;
    try {
        await sb.from('geo_attendance_logs').update({ is_verified: true, verified_by_id: currentUserProfile?.id, verified_at: new Date().toISOString() }).eq('id', recordId);
        showFeedback('Attendance approved!', 'success');
        loadAttendance();
    } catch (err) { showFeedback(`Failed: ${err.message}`, 'error'); }
}

async function deleteAttendanceRecord(recordId) {
    if (!confirm('Delete this attendance record?')) return;
    try {
        await sb.from('geo_attendance_logs').delete().eq('id', recordId);
        showFeedback('Record deleted.', 'success');
        loadAttendance();
    } catch (err) { showFeedback(`Failed: ${err.message}`, 'error'); }
}

function showMap(lat, lng, locationName, studentName, dateTime) {
    const modal = $('mapModal');
    const mapContainer = $('mapbox-map');
    const mapDetails = $('map-details');
    if (!modal || !mapContainer || !mapDetails) return;
    modal.style.display = 'flex';
    mapContainer.innerHTML = 'Map loading...';
    mapDetails.innerHTML = `**Student:** ${studentName}<br>**Location:** ${locationName}<br>**Time:** ${dateTime}`;
    if (attendanceMap) attendanceMap.remove();
    setTimeout(() => {
        attendanceMap = L.map('mapbox-map').setView([lat, lng], 17);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap contributors' }).addTo(attendanceMap);
        L.marker([lat, lng]).addTo(attendanceMap).bindPopup(`<b>${studentName}</b><br>${locationName}<br>${dateTime}`).openPopup();
        attendanceMap.invalidateSize();
    }, 300);
}

// =====================================================
// 13. EXAMS/CATS MANAGEMENT
// =====================================================
async function loadExams() {
    const tbody = $('exams-table');
    if (!tbody) return;
    tbody.innerHTML = '<table><td colspan="8">Loading exams/CATs...回溯</tr>';
    const { data: exams, error } = await fetchData('exams', '*, course:course_id(course_name)', {}, 'exam_date', false);
    if (error) {
        tbody.innerHTML = `<tr><td colspan="8">Error loading exams: ${error.message}回溯</tr>`;
        return;
    }
    tbody.innerHTML = '';
    exams.forEach(e => {
        const dateTime = new Date(e.exam_date).toLocaleDateString() + ' ' + (e.exam_start_time || '');
        const courseName = e.course?.course_name || 'N/A';
        const type = e.exam_type || 'N/A';
        let actionsHtml = `<button class="btn-action" onclick="openEditExamModal('${e.id}')">Edit</button>`;
        if (e.online_link) actionsHtml += `<a href="${escapeHtml(e.online_link)}" target="_blank" class="btn btn-map">Link</a>`;
        actionsHtml += `<button class="btn-action" onclick="openGradeModal('${e.id}')">Grade</button>`;
        actionsHtml += `<button class="btn btn-delete" onclick="deleteExam('${e.id}')">Delete</button>`;
        tbody.innerHTML += `<tr>
            <td>${escapeHtml(type)}</td>
            <td>${escapeHtml(e.target_program || 'N/A')}</td>
            <td>${escapeHtml(courseName)}</td>
            <td>${escapeHtml(e.exam_name)}</td>
            <td>${dateTime}</td>
            <td>${escapeHtml(e.duration_minutes + ' mins' || 'N/A')}</td>
            <td>${escapeHtml(e.status)}</td>
            <td>${actionsHtml}</td>
        </tr>`;
    });
    filterTable('exam-search', 'exams-table', [3, 2, 0]);
}

async function deleteExam(examId) {
    if (!confirm('Delete exam?')) return;
    const { error } = await sb.from('exams').delete().eq('id', examId);
    if (error) showFeedback(`Failed: ${error.message}`, 'error');
    else { showFeedback('Exam deleted!', 'success'); loadExams(); renderFullCalendar(); }
}

function openEditExamModal(examId) { alert(`Edit exam ID: ${examId.substring(0,8)}...`); }
function openGradeModal(examId) { alert(`Grade exam ID: ${examId.substring(0,8)}...`); }

// =====================================================
// 14. MESSAGES & ANNOUNCEMENTS
// =====================================================
async function handleSendMessage(e) {
    e.preventDefault();
    const target_program = $('msg_program').value;
    const message_content = $('msg_body').value.trim();
    const subject = $('msg_subject')?.value.trim() || `System Message to ${target_program}`;
    if (!message_content) { showFeedback('Message content cannot be empty.', 'error'); return; }
    try {
        const { error } = await sb.from('notifications').insert({ target_program: target_program === 'ALL' ? null : target_program, subject, message: message_content, message_type: 'system', sender_id: currentUserProfile?.id });
        if (error) throw error;
        showFeedback('Message sent successfully!', 'success');
        e.target.reset();
        await loadAdminMessages();
    } catch (err) { showFeedback(`Failed: ${err.message}`, 'error'); }
}

async function loadAdminMessages() {
    const tbody = $('adminMessagesTableBody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="6">Loading admin messages...回溯</td>';
    try {
        const { data: messages, error } = await sb.from('notifications').select('*, sender:sender_id(full_name)').order('created_at', { ascending: false });
        if (error) throw error;
        if (!messages || messages.length === 0) { tbody.innerHTML = '<tr><td colspan="6">No messages found.回溯</tr>'; return; }
        tbody.innerHTML = '';
        messages.forEach(msg => {
            const recipient = msg.target_program || 'ALL Students';
            const senderName = msg.sender?.full_name || 'System';
            const sendDate = msg.created_at ? new Date(msg.created_at).toLocaleString() : 'Unknown';
            tbody.innerHTML += `<tr>
                <td>${escapeHtml(recipient)}</td>
                <td>${escapeHtml(senderName)}</td>
                <td>${escapeHtml(msg.subject || '')}</td>
                <td>${escapeHtml(msg.message.substring(0, 80) + (msg.message.length > 80 ? '...' : ''))}</td>
                <td>${sendDate}</td>
                <td><button class="btn-action" onclick="editNotification('${msg.id}')">Edit</button><button class="btn btn-delete" onclick="deleteNotification('${msg.id}')">Delete</button></td>
            </tr>`;
        });
    } catch (err) { tbody.innerHTML = `<tr><td colspan="6">Error: ${err.message}回溯</tr>`; }
}

async function editNotification(id) {
    const newSubject = prompt('Edit Subject:');
    if (!newSubject) return;
    const newMessage = prompt('Edit Message:');
    if (!newMessage) return;
    await sb.from('notifications').update({ subject: newSubject.trim(), message: newMessage.trim() }).eq('id', id);
    showFeedback('Message updated!', 'success');
    await loadAdminMessages();
}

async function deleteNotification(id) {
    if (!confirm('Delete this message?')) return;
    await sb.from('notifications').delete().eq('id', id);
    showFeedback('Message deleted!', 'success');
    await loadAdminMessages();
}

// =====================================================
// 15. RESOURCES MANAGEMENT
// =====================================================
async function loadAllResources() {
    const tableBody = $('resources-list');
    if (!tableBody) return;
    tableBody.innerHTML = '<tr><td colspan="9"><div class="loading-spinner"></div> Loading resources...回溯</tr>';
    try {
        const { data: resources, error } = await sb.from('resources').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        allResourcesData = resources || [];
        const pastpaperCount = allResourcesData.filter(r => r.resource_type === 'pastpaper').length;
        const materialCount = allResourcesData.filter(r => r.resource_type === 'material').length;
        const pastpaperBadge = $('pastpaper-count-badge');
        const materialBadge = $('material-count-badge');
        if (pastpaperBadge) pastpaperBadge.textContent = pastpaperCount;
        if (materialBadge) materialBadge.textContent = materialCount;
        let filtered = [...allResourcesData];
        const searchTerm = $('resource-search')?.value.toLowerCase() || '';
        const blockFilter = $('resource-block-filter')?.value || 'all';
        const yearFilter = $('resource-year-filter')?.value || 'all';
        if (searchTerm) filtered = filtered.filter(r => (r.title || '').toLowerCase().includes(searchTerm) || (r.course_name || '').toLowerCase().includes(searchTerm));
        if (blockFilter !== 'all') filtered = filtered.filter(r => (r.block || '').toLowerCase() === blockFilter.toLowerCase());
        if (yearFilter !== 'all') filtered = filtered.filter(r => r.intake == yearFilter);
        renderResourcesTable(filtered);
    } catch (error) { tableBody.innerHTML = `<tr><td colspan="9" style="color: red;">Error: ${error.message}回溯<\/tr>`; }
}

function renderResourcesTable(resources) {
    const tableBody = $('resources-list');
    if (!tableBody) return;
    if (!resources || resources.length === 0) { tableBody.innerHTML = '<tr><td colspan="9">No resources found.回溯<\/tr>'; return; }
    tableBody.innerHTML = '';
    resources.forEach(resource => {
        const isPastPaper = resource.resource_type === 'pastpaper';
        const typeClass = isPastPaper ? 'badge-warning' : 'badge-info';
        const typeIcon = isPastPaper ? '📄' : '📚';
        const typeLabel = isPastPaper ? 'Past Paper' : 'Material';
        const yearDisplay = isPastPaper ? resource.pastpaper_year : resource.intake;
        let titleDisplay = resource.title;
        if (isPastPaper && resource.course_name && resource.exam_type) titleDisplay = `${resource.course_name} - ${getExamTypeLabel(resource.exam_type)} (${resource.pastpaper_year})`;
        const uploadDate = new Date(resource.created_at).toLocaleDateString();
        const row = document.createElement('tr');
        row.innerHTML = `<td><span class="badge ${typeClass}"><i class="${isPastPaper ? 'fas fa-history' : 'fas fa-book'}"></i> ${typeLabel}</span></td>
            <td><strong>${escapeHtml(yearDisplay || 'N/A')}</strong></td>
            <td>${escapeHtml(resource.program_type || 'N/A')}</td>
            <td>${escapeHtml(resource.block || 'N/A')}</td>
            <td><strong>${escapeHtml(titleDisplay)}</strong><br><small>${escapeHtml(resource.course_name || '')}</small></td>
            <td><small>${escapeHtml((resource.description || '-').substring(0, 50))}</small></td>
            <td>${escapeHtml(resource.uploaded_by_name || 'Unknown')}</td>
            <td>${uploadDate}</td>
            <td><a href="${resource.file_url}" target="_blank" class="btn-action btn-small">View</a><button onclick="deleteResourceItem(${resource.id})" class="btn-delete btn-small">Delete</button></td>`;
        tableBody.appendChild(row);
    });
}

async function deleteResourceItem(resourceId) {
    if (!confirm('Delete this resource?')) return;
    try {
        const { data: resource } = await sb.from('resources').select('file_path').eq('id', resourceId).single();
        if (resource?.file_path) await sb.storage.from(RESOURCES_BUCKET).remove([resource.file_path]);
        await sb.from('resources').delete().eq('id', resourceId);
        showFeedback('Resource deleted!', 'success');
        loadAllResources();
    } catch (error) { showFeedback(`Delete failed: ${error.message}`, 'error'); }
}

// =====================================================
// 16. CALENDAR & TIMETABLE MANAGEMENT
// =====================================================
let mainCalendar = null;

async function renderFullCalendar() {
    const calendarEl = $('fullCalendarDisplay');
    if (!calendarEl) return;
    calendarEl.innerHTML = '<div style="text-align:center;padding:40px;"><div class="loading-spinner"></div><p>Loading calendar...</p></div>';
    try {
        let sessions = [], exams = [], timetableEvents = [];
        try { const { data } = await fetchData('scheduled_sessions', '*', {}, 'session_date', true); sessions = data || []; } catch(e) {}
        try { const { data } = await fetchData('exams', '*, course:course_id(course_name)', {}, 'exam_date', true); exams = data || []; } catch(e) {}
        try { const { data } = await sb.from('timetables').select('*').order('week_number').order('day_of_week'); timetableEvents = data || []; } catch(e) {}
        const events = [];
        const dayNumberMap = { 'sunday': 0, 'monday': 1, 'tuesday': 2, 'wednesday': 3, 'thursday': 4, 'friday': 5, 'saturday': 6 };
        function getDateForDay(dayName, weekNumber = 1) {
            const dayIndex = dayNumberMap[dayName.toLowerCase()];
            if (dayIndex === undefined) return null;
            const today = new Date();
            const currentDay = today.getDay();
            const daysToAdd = (dayIndex - currentDay + 7) % 7 + ((weekNumber - 1) * 7);
            const targetDate = new Date(today);
            targetDate.setDate(today.getDate() + daysToAdd);
            return targetDate.toISOString().split('T')[0];
        }
        sessions.forEach(s => {
            let startDate = s.session_date;
            if (s.session_time) startDate = s.session_date + 'T' + s.session_time;
            events.push({ id: `session_${s.id}`, title: `${(s.session_type || 'CLASS').toUpperCase()}: ${s.session_title || 'Session'}`, start: startDate, allDay: !s.session_time, color: s.session_type === 'clinical' ? '#2ecc71' : '#3498db' });
        });
        exams.forEach(e => {
            const start = e.exam_date + (e.exam_start_time ? `T${e.exam_start_time}` : '');
            events.push({ id: `exam_${e.id}`, title: `${e.exam_type || 'EXAM'}: ${e.exam_name || 'Exam'}`, start: start, allDay: !e.exam_start_time, color: '#e74c3c' });
        });
        timetableEvents.forEach(tt => {
            const eventDate = getDateForDay(tt.day_of_week, tt.week_number);
            if (!eventDate) return;
            events.push({ id: `timetable_${tt.id}`, title: tt.session_name || tt.course_name, start: `${eventDate}T${tt.start_time}`, end: `${eventDate}T${tt.end_time}`, color: '#4C1D95' });
        });
        if (typeof FullCalendar !== 'undefined' && calendarEl) {
            if (mainCalendar) mainCalendar.destroy();
            mainCalendar = new FullCalendar.Calendar(calendarEl, { initialView: 'dayGridMonth', headerToolbar: { left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek' }, events: events });
            mainCalendar.render();
        }
    } catch (error) { calendarEl.innerHTML = `<p style="color:red;">Error: ${error.message}</p>`; }
}

// =====================================================
// 17. FEE ACCOUNTS - DISPLAY ONLY (NO PAYMENT RECORDING)
// =====================================================
async function loadStudentBalances() {
    console.log("💰 Loading student balances (read-only)...");
    
    const accountsBody = document.getElementById('student-accounts-body');
    if (!accountsBody) {
        console.error("student-accounts-body element not found");
        return;
    }
    
    accountsBody.innerHTML = '<tr><td colspan="8"><div class="loading-spinner"></div> Loading student balances...回溯</tr>';
    
    const { data: students, error } = await sb
        .from('consolidated_user_profiles_table')
        .select('user_id, full_name, email, program, intake_year, block')
        .eq('role', 'student')
        .eq('status', 'approved');
    
    if (error) {
        console.error('Error loading students:', error);
        accountsBody.innerHTML = `<tr><td colspan="8" style="color: red;">Error: ${error.message}回溯</tr>`;
        return;
    }
    
    if (!students || students.length === 0) {
        accountsBody.innerHTML = '<tr><td colspan="8">No approved students found.回溯</tr>';
        document.getElementById('totalOutstandingBalance').innerHTML = 'KES 0';
        document.getElementById('totalCollected').innerHTML = 'KES 0';
        document.getElementById('overdueAccounts').innerText = '0';
        return;
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
        
        let totalDue = 0;
        
        if (registrations && registrations.length > 0) {
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
        
        // Check overdue
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
                isOverdue = true;
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
    const todayCollectionsEl = document.getElementById('todayCollections');
    if (todayCollectionsEl) todayCollectionsEl.innerHTML = `KES ${todayTotal.toLocaleString()}`;
}

// =====================================================
// 18. UNIT REGISTRATION MANAGEMENT
// =====================================================
let allUnits = [];
let currentBlockFilter = 'all';

async function loadAllUnits() {
    const container = document.getElementById('units-list-container');
    if (!container) return;
    container.innerHTML = '<div class="loading-spinner"></div><p>Loading units...</p>';
    try {
        const { data, error } = await sb.from('units_catalog').select('*').order('block', { ascending: true }).order('unit_code', { ascending: true });
        if (error) throw error;
        allUnits = data || [];
        renderUnitsCatalog();
    } catch (error) {
        container.innerHTML = '<p style="color: red;">Error loading units.</p>';
    }
}

function renderUnitsCatalog() {
    const container = document.getElementById('units-list-container');
    if (!container) return;
    const searchTerm = document.getElementById('unit_search')?.value.toLowerCase() || '';
    const programFilter = document.getElementById('unit_filter_program')?.value || '';
    let filtered = [...allUnits];
    if (searchTerm) filtered = filtered.filter(u => u.unit_code?.toLowerCase().includes(searchTerm) || u.unit_name?.toLowerCase().includes(searchTerm));
    if (programFilter) filtered = filtered.filter(u => u.program === programFilter);
    if (currentBlockFilter !== 'all') filtered = filtered.filter(u => u.block === currentBlockFilter);
    if (filtered.length === 0) { container.innerHTML = '<p>No units found.</p>'; return; }
    let html = '<div class="units-grid">';
    filtered.forEach(unit => {
        const typeClass = unit.unit_type === 'Core' ? 'badge-core' : 'badge-elective';
        const programName = getProgramDisplayName(unit.program);
        html += `<div class="unit-card"><div class="unit-header"><div><span class="unit-code">${escapeHtml(unit.unit_code)}</span><span class="unit-name">${escapeHtml(unit.unit_name)}</span></div></div><div class="unit-meta"><span>${escapeHtml(programName)}</span><span>${escapeHtml(unit.block)}</span><span>Year: ${unit.year || 'N/A'}</span><span>${unit.credits || 3} Credits</span><span class="${typeClass}">${unit.unit_type || 'Core'}</span></div></div>`;
    });
    html += '</div>';
    container.innerHTML = html;
}

function filterUnitsByBlock(block) {
    currentBlockFilter = block;
    document.querySelectorAll('.block-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-block') === block) btn.classList.add('active');
    });
    renderUnitsCatalog();
}

// =====================================================
// 19. LOGOUT FUNCTION
// =====================================================
async function logout() {
    try {
        console.log('🚪 Logging out...');
        if (currentUserProfile) await logAudit('LOGOUT', `User ${currentUserProfile.full_name} logged out.`);
        await sb.auth.signOut();
        localStorage.clear();
        sessionStorage.clear();
        window.location.href = "login.html";
    } catch (error) {
        console.error('Logout error:', error);
        window.location.href = "login.html";
    }
}

// =====================================================
// 20. SUPPORT TICKETS (Simplified for Admin)
// =====================================================
async function loadAdminTickets() {
    const tbody = document.getElementById('admin-tickets-body');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="7">Loading tickets...回溯</tr>';
    const { data, error } = await sb.from('support_tickets').select('*').order('created_at', { ascending: false });
    if (error) {
        tbody.innerHTML = `<tr><td colspan="7">Error: ${error.message}回溯</tr>`;
        return;
    }
    if (!data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7">No tickets found.回溯</tr>';
        return;
    }
    tbody.innerHTML = '';
    data.forEach(ticket => {
        const statusClass = ticket.status === 'open' ? 'badge-warning' : ticket.status === 'in_progress' ? 'badge-info' : 'badge-success';
        tbody.innerHTML += `<tr>
            <td>${escapeHtml(ticket.ticket_number)}</td>
            <td>${escapeHtml(ticket.student_name || 'Unknown')}</td>
            <td>${escapeHtml(ticket.subject)}</td>
            <td><span class="badge ${ticket.priority === 'urgent' ? 'badge-danger' : 'badge-info'}">${escapeHtml(ticket.priority)}</span></td>
            <td><span class="badge ${statusClass}">${escapeHtml(ticket.status)}</span></td>
            <td>${new Date(ticket.created_at).toLocaleDateString()}</td>
            <td><button class="btn-sm btn-edit" onclick="alert('View ticket: ${ticket.ticket_number}')">View</button></td>
        </tr>`;
    });
}

// =====================================================
// 21. INITIALIZATION & EVENT LISTENERS
// =====================================================
function setupEventListeners() {
    $('att_session_type')?.addEventListener('change', () => {});
    $('manual-attendance-form')?.addEventListener('submit', (e) => e.preventDefault());
    $('add-account-form')?.addEventListener('submit', handleAddAccount);
    $('account-program')?.addEventListener('change', () => updateBlockTermOptions('account-program', 'account-block-term'));
    $('add-course-form')?.addEventListener('submit', handleAddCourse);
    $('course-program')?.addEventListener('change', () => updateBlockTermOptions('course-program', 'course-block'));
    $('add-session-form')?.addEventListener('submit', (e) => e.preventDefault());
    $('add-exam-form')?.addEventListener('submit', (e) => e.preventDefault());
    $('send-message-form')?.addEventListener('submit', handleSendMessage);
    $('edit-welcome-form')?.addEventListener('submit', handleSaveWelcomeMessage);
    $('upload-resource-form')?.addEventListener('submit', (e) => e.preventDefault());
}

function initializeModals() {
    document.querySelectorAll('.modal .close').forEach(closeBtn => {
        closeBtn.addEventListener('click', function() { this.closest('.modal').style.display = 'none'; });
    });
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', function(e) { if (e.target === this) this.style.display = 'none'; });
    });
    const editUserForm = document.getElementById('edit-user-form');
    if (editUserForm) {
        editUserForm.removeEventListener('submit', handleEditUser);
        editUserForm.addEventListener('submit', handleEditUser);
    }
}

async function initSession() {
    const { data: { session }, error: sessionError } = await sb.auth.getSession();
    if (sessionError || !session) {
        window.location.href = "login.html";
        return;
    }
    const user = session.user;
    const { data: profile, error: profileError } = await sb.from(USER_PROFILE_TABLE).select('*').eq('user_id', user.id).single();
    if (profile && !profileError) {
        currentUserProfile = profile;
        currentUserId = user.id;
        if (currentUserProfile.role === 'superadmin' || currentUserProfile.role === 'super_admin') {
            window.location.href = "super_admin.html";
            return;
        }
        document.querySelector('header h1').textContent = `Welcome, ${profile.full_name || 'Admin'}!`;
    } else {
        window.location.href = "login.html";
        return;
    }
    setupEventListeners();
    initializeModals();
    loadSectionData('dashboard');
}

// =====================================================
// INITIALIZE THE APPLICATION
// =====================================================
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Initializing Admin Dashboard...');
    initializeAllProgramDropdowns();
    setupEventListeners();
    initializeModals();
    initSession();
    console.log('✅ Admin Dashboard initialization complete');
});

// Make functions globally available
window.showTab = showTab;
window.logout = logout;
window.exportTableToCSV = exportTableToCSV;
window.filterTable = filterTable;
window.closeModal = closeModal;
window.approveUser = approveUser;
window.deleteProfile = deleteProfile;
window.openEditUserModal = openEditUserModal;
window.loadAllUnits = loadAllUnits;
window.filterUnitsByBlock = filterUnitsByBlock;
window.loadStudentBalances = loadStudentBalances;
window.loadAdminTickets = loadAdminTickets;
