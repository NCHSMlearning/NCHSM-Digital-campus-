// ============================================================
// TVET & NURSING GRADING SYSTEM - COMPLETE FIXED VERSION
// WITH CORRECT NURSING FULL ASSESSMENT (MAX: 100)
// ============================================================

// ============================================================
// GRADING CONFIGURATION
// ============================================================

const GRADING_CONFIG = {
    // ✅ TVET Programs - Competency-Based Grading with Points
    TVET: {
        CAT1_MAX: 30,
        CAT2_MAX: 30,
        EXAM_MAX: 100,
        TOTAL_MAX: 160,
        DISPLAY_NAME: 'TVET (CAT1 30 + CAT2 30 + Exam 100 = 160 → %)',
        PASS_MARK: 50,
        GRADE_TYPE: 'competency',
        GRADE_MAPPING: [
            { min: 80, max: 100, grade: 'A', points: 4, status: 'MASTERY', comment: 'MASTERY - Excellent performance', color: '#065f46', bgColor: '#d1fae5', icon: '⭐' },
            { min: 65, max: 79, grade: 'B', points: 3, status: 'PROFICIENT', comment: 'PROFICIENT - Good performance', color: '#1e40af', bgColor: '#dbeafe', icon: '🌟' },
            { min: 50, max: 64, grade: 'C', points: 2, status: 'COMPETENT', comment: 'COMPETENT - Satisfactory performance', color: '#92400e', bgColor: '#fef3c7', icon: '✅' },
            { min: 0, max: 49, grade: 'E', points: 0, status: 'NOT YET COMPETENT', comment: 'NOT YET COMPETENT - Needs improvement', color: '#991b1b', bgColor: '#fee2e2', icon: '❌' }
        ],
        FORMULA: 'percentage = (cat1 + cat2 + exam) / 160 * 100'
    },
    
    // ✅ Nursing (KRCHN) - Academic Grading
    NURSING: {
        CAT1_MAX: 30,
        CAT2_MAX: 30,
        EXAM_MAX: 70,
        TOTAL_MAX: 100,
        DISPLAY_NAME: 'Nursing (CAT1 30 + CAT2 30 + Exam 70 = 100 → %)',
        PASS_MARK: 60,
        GRADE_TYPE: 'academic',
        GRADE_MAPPING: [
            { min: 75, max: 100, grade: 'A', points: 4.0, status: 'Distinction', comment: 'Distinction - Excellent performance', color: '#065f46', bgColor: '#d1fae5', icon: '🎓' },
            { min: 65, max: 74, grade: 'B', points: 3.0, status: 'Credit', comment: 'Credit - Good performance', color: '#1e40af', bgColor: '#dbeafe', icon: '📚' },
            { min: 60, max: 64, grade: 'C', points: 2.0, status: 'Pass', comment: 'Pass - Satisfactory performance', color: '#92400e', bgColor: '#fef3c7', icon: '✅' },
            { min: 0, max: 59, grade: 'D', points: 0.0, status: 'Fail', comment: 'Fail - Needs improvement', color: '#991b1b', bgColor: '#fee2e2', icon: '❌' }
        ],
        FORMULA: 'percentage = (cat1 + cat2 + exam) / 100 * 100'
    }
};

// ============================================================
// PROGRAM CODES
// ============================================================

const TVET_PROGRAMS = [
    'DPOTT', 'DCH', 'DHRIT', 'DSL', 'DSW', 'DCJS', 'DHSS', 'DICT', 'DME',
    'CPOTT', 'CCH', 'CHRIT', 'CPC', 'CSL', 'CSW', 'CCJS', 'CAG', 'CHSS', 'CICT',
    'ACH', 'AAG', 'ASW', 'CCA', 'PTE'
];

const NURSING_PROGRAMS = ['KRCHN'];

// ============================================================
// DETECT PROGRAM TYPE
// ============================================================

function getProgramType(programCode) {
    if (!programCode) return 'TVET';
    if (programCode === 'KRCHN') return 'NURSING';
    return 'TVET';
}

function getGradingConfig(programCode) {
    if (programCode === 'KRCHN') {
        return GRADING_CONFIG.NURSING;
    }
    return GRADING_CONFIG.TVET;
}

// ============================================================
// DYNAMIC COLUMN DETECTION
// ============================================================

function detectVisibleColumns() {
    console.log('🔍 Detecting visible columns...');
    
    // ✅ FIRST: Check column settings (most reliable)
    const savedColumns = me_columnSettings.columns || [];
    const cat1Setting = savedColumns.find(c => c.id === 'cat1');
    const cat2Setting = savedColumns.find(c => c.id === 'cat2');
    const examSetting = savedColumns.find(c => c.id === 'exam');
    
    let hasCat1 = cat1Setting !== undefined ? cat1Setting.visible !== false : true;
    let hasCat2 = cat2Setting !== undefined ? cat2Setting.visible !== false : true;
    let hasExam = examSetting !== undefined ? examSetting.visible !== false : true;
    
    console.log('📊 From settings:', { hasCat1, hasCat2, hasExam });
    
    // ✅ SECOND: Check the actual table (override if columns are hidden via CSS)
    const table = document.querySelector('#me_marks_table');
    if (table) {
        const headers = table.querySelectorAll('thead th');
        headers.forEach((th) => {
            const text = th.textContent.toLowerCase().trim();
            const isVisible = th.style.display !== 'none';
            
            // Override with actual visibility from the table
            if ((text.includes('cat1') || text.includes('cat 1'))) {
                hasCat1 = isVisible;
            }
            if ((text.includes('cat2') || text.includes('cat 2'))) {
                hasCat2 = isVisible;
            }
            if (text.includes('exam')) {
                hasExam = isVisible;
            }
        });
    }
    
    // ✅ THIRD: Check input fields as fallback
    if (!hasCat1 && !hasCat2 && !hasExam) {
        const table = document.querySelector('#me_marks_table');
        if (table) {
            const inputs = table.querySelectorAll('input[type="number"]');
            inputs.forEach(input => {
                const id = input.id || '';
                if (id.includes('cat1')) hasCat1 = true;
                if (id.includes('cat2')) hasCat2 = true;
                if (id.includes('exam')) hasExam = true;
            });
        }
    }
    
    // ✅ FINAL: Use defaults if nothing detected
    if (!hasCat1 && !hasCat2 && !hasExam) {
        console.warn('⚠️ No columns detected, using defaults');
        hasCat1 = true;
        hasCat2 = true;
        hasExam = true;
    }
    
    console.log('📊 Final detection:', { hasCat1, hasCat2, hasExam });
    return { hasCat1, hasCat2, hasExam };
}

function getAssessmentTypeFromColumns() {
    const visible = detectVisibleColumns();
    console.log('📊 Visible columns for assessment:', visible);
    
    // ✅ Check FULL first (all three visible)
    if (visible.hasCat1 && visible.hasCat2 && visible.hasExam) {
        return 'full';
    }
    
    // ✅ Check Single CAT (CAT1 + Exam, CAT2 hidden)
    if (visible.hasCat1 && !visible.hasCat2 && visible.hasExam) {
        return 'single_cat';
    }
    
    // ✅ Check Single CAT (CAT2 + Exam, CAT1 hidden)
    if (!visible.hasCat1 && visible.hasCat2 && visible.hasExam) {
        return 'single_cat';
    }
    
    // ✅ Check CATs Only (CAT1 + CAT2, Exam hidden)
    if (visible.hasCat1 && visible.hasCat2 && !visible.hasExam) {
        return 'cats_only';
    }
    
    // ✅ Check Exam Only
    if (visible.hasExam && !visible.hasCat1 && !visible.hasCat2) {
        return 'exam_only';
    }
    
    // ✅ Check CAT1 Only
    if (visible.hasCat1 && !visible.hasCat2 && !visible.hasExam) {
        return 'cat1_only';
    }
    
    // ✅ Check CAT2 Only
    if (!visible.hasCat1 && visible.hasCat2 && !visible.hasExam) {
        return 'cat2_only';
    }
    
    // ✅ Default to full
    return 'full';
}

function getMaxPossible(programCode, assessmentType) {
    const isNursing = programCode === 'KRCHN';
    const config = getGradingConfig(programCode);
    
    console.log(`📊 Getting max for: ${programCode}, ${assessmentType}`);
    
    if (isNursing) {
        switch(assessmentType) {
            case 'full': return 100;      // 30 + 30 + 70 = 100
            case 'single_cat': return 100; // 30 + 70 = 100
            case 'exam_only': return 70;
            case 'cats_only': return 60;   // 30 + 30 = 60
            case 'cat1_only': return 30;
            case 'cat2_only': return 30;
            default: return 100;
        }
    } else {
        // TVET
        switch(assessmentType) {
            case 'full': return config.TOTAL_MAX; // 160
            case 'single_cat': return 130;        // 30 + 100 = 130
            case 'exam_only': return 100;
            case 'cats_only': return 60;
            case 'cat1_only': return 30;
            case 'cat2_only': return 30;
            default: return config.TOTAL_MAX;
        }
    }
}

function getAssessmentTypeLabel(assessmentType) {
    const labels = {
        'full': 'Full (CAT1 + CAT2 + Exam)',
        'single_cat': 'Single CAT (CAT + Exam)',
        'exam_only': 'Exam Only',
        'cats_only': 'CAT1 + CAT2 Only',
        'cat1_only': 'CAT1 Only',
        'cat2_only': 'CAT2 Only'
    };
    return labels[assessmentType] || assessmentType;
}

// ============================================================
// GRADE FUNCTIONS
// ============================================================

function getTVETGrade(percentage, config) {
    const grades = config.GRADE_MAPPING;
    const sortedGrades = [...grades].sort((a, b) => b.min - a.min);
    for (let g of sortedGrades) {
        if (percentage >= g.min) {
            return g;
        }
    }
    return grades[grades.length - 1];
}

function getTVETGradeColor(grade, programCode) {
    const config = getGradingConfig(programCode);
    const gradeInfo = config.GRADE_MAPPING.find(g => g.grade === grade);
    return gradeInfo ? gradeInfo.color : '#6b7280';
}

function getTVETGradeBgColor(grade, programCode) {
    const config = getGradingConfig(programCode);
    const gradeInfo = config.GRADE_MAPPING.find(g => g.grade === grade);
    return gradeInfo ? gradeInfo.bgColor : '#f3f4f6';
}

// ============================================================
// ✅ CORE CALCULATION - FIXED
// ============================================================

function calculateTVETMarks(cat1, cat2, exam, programCode) {
    const isNursing = programCode === 'KRCHN';
    const config = isNursing ? GRADING_CONFIG.NURSING : GRADING_CONFIG.TVET;
    
    const c1 = parseFloat(cat1) || 0;
    const c2 = parseFloat(cat2) || 0;
    const ex = parseFloat(exam) || 0;
    
    const clampedCat1 = Math.min(Math.max(c1, 0), config.CAT1_MAX);
    const clampedCat2 = Math.min(Math.max(c2, 0), config.CAT2_MAX);
    const examMax = isNursing ? 70 : config.EXAM_MAX;
    const clampedExam = Math.min(Math.max(ex, 0), examMax);
    
    // ✅ Get assessment type from visible columns
    const assessmentType = getAssessmentTypeFromColumns();
    window.me_currentAssessmentType = assessmentType;
    
    // ✅ Calculate based on assessment type
    let rawTotal = 0;
    let maxPossible = 0;
    let percentage = 0;
    
    if (isNursing) {
        switch(assessmentType) {
            case 'full':
                // CAT1 (15%) + CAT2 (15%) + Exam (70%)
                const cat1W = (clampedCat1 / config.CAT1_MAX) * 15;
                const cat2W = (clampedCat2 / config.CAT2_MAX) * 15;
                const examW = (clampedExam / 70) * 70;
                percentage = cat1W + cat2W + examW;
                rawTotal = clampedCat1 + clampedCat2 + clampedExam;
                maxPossible = 100;
                break;
                
            case 'single_cat':
                // ✅ CAT1 (15%) + Exam (85%) - when CAT2 is hidden
                const cat1WSingle = (clampedCat1 / config.CAT1_MAX) * 15;
                const examWSingle = (clampedExam / 70) * 85;
                percentage = cat1WSingle + examWSingle;
                rawTotal = clampedCat1 + clampedExam;
                maxPossible = 100;
                break;
                
            case 'exam_only':
                rawTotal = clampedExam;
                maxPossible = 70;
                percentage = (rawTotal / maxPossible) * 100;
                break;
                
            case 'cats_only':
                // CAT1 (50%) + CAT2 (50%)
                const cat1WCats = (clampedCat1 / config.CAT1_MAX) * 50;
                const cat2WCats = (clampedCat2 / config.CAT2_MAX) * 50;
                percentage = cat1WCats + cat2WCats;
                rawTotal = clampedCat1 + clampedCat2;
                maxPossible = 60;
                break;
                
            case 'cat1_only':
                rawTotal = clampedCat1;
                maxPossible = 30;
                percentage = (rawTotal / maxPossible) * 100;
                break;
                
            case 'cat2_only':
                rawTotal = clampedCat2;
                maxPossible = 30;
                percentage = (rawTotal / maxPossible) * 100;
                break;
                
            default:
                // Fallback to full assessment
                const cat1WDef = (clampedCat1 / config.CAT1_MAX) * 15;
                const cat2WDef = (clampedCat2 / config.CAT2_MAX) * 15;
                const examWDef = (clampedExam / 70) * 70;
                percentage = cat1WDef + cat2WDef + examWDef;
                rawTotal = clampedCat1 + clampedCat2 + clampedExam;
                maxPossible = 100;
        }
    } else {
        // TVET - unchanged
        if (assessmentType === 'full') maxPossible = config.TOTAL_MAX;
        else if (assessmentType === 'single_cat') maxPossible = 130;
        else if (assessmentType === 'exam_only') maxPossible = 100;
        else if (assessmentType === 'cats_only') maxPossible = 60;
        else if (assessmentType === 'cat1_only') maxPossible = 30;
        else if (assessmentType === 'cat2_only') maxPossible = 30;
        else maxPossible = config.TOTAL_MAX;
        
        rawTotal = clampedCat1 + clampedCat2 + clampedExam;
        percentage = maxPossible > 0 ? (rawTotal / maxPossible) * 100 : 0;
    }
    
    // Cap at 100% and round
    percentage = Math.min(Math.round(percentage * 100) / 100, 100);
    
    const gradeInfo = getTVETGrade(percentage, config);
    
    return {
        cat1: clampedCat1,
        cat2: clampedCat2,
        exam: clampedExam,
        total: rawTotal,
        maxTotal: maxPossible,
        percentage: percentage,
        grade: gradeInfo.grade,
        points: gradeInfo.points,
        status: gradeInfo.status,
        comment: gradeInfo.comment,
        isPassing: percentage >= config.PASS_MARK,
        programType: isNursing ? 'NURSING' : 'TVET',
        config: config,
        gradeType: config.GRADE_TYPE,
        gradeInfo: gradeInfo,
        assessmentType: assessmentType,
        display: {
            cat1: `${clampedCat1}/${config.CAT1_MAX}`,
            cat2: `${clampedCat2}/${config.CAT2_MAX}`,
            exam: `${clampedExam}/${examMax}`,
            total: `${rawTotal}/${maxPossible}`,
            percentage: `${percentage}%`
        }
    };
}

function getMarksEntryGrade(score, programCode) {
    const config = getGradingConfig(programCode);
    const gradeInfo = getTVETGrade(score, config);
    return {
        grade: gradeInfo.grade,
        rating: gradeInfo.status,
        points: gradeInfo.points,
        color: gradeInfo.color,
        bgColor: gradeInfo.bgColor,
        comment: gradeInfo.comment,
        icon: gradeInfo.icon || '',
        isPassing: score >= config.PASS_MARK,
        gradeType: config.GRADE_TYPE
    };
}

function calculateMarksEntryTotal(cat1, cat2, exam, assessmentType, programCode) {
    const isNursing = programCode === 'KRCHN';
    const config = getGradingConfig(programCode);
    
    let total = 0;
    let cat1Val = Math.min(Math.max(parseFloat(cat1) || 0, 0), config.CAT1_MAX);
    let cat2Val = Math.min(Math.max(parseFloat(cat2) || 0, 0), config.CAT2_MAX);
    const examMax = isNursing ? 70 : config.EXAM_MAX;
    let examVal = Math.min(Math.max(parseFloat(exam) || 0, 0), examMax);
    
    const visible = detectVisibleColumns();
    if (visible.hasCat1) total += cat1Val;
    if (visible.hasCat2) total += cat2Val;
    if (visible.hasExam) total += examVal;
    
    const maxPossible = getMaxPossible(programCode, assessmentType);
    
    let percentage;
    if (maxPossible > 0) {
        percentage = (total / maxPossible) * 100;
    } else {
        percentage = 0;
    }
    
    return Math.round(Math.min(percentage, 100) * 10) / 10;
}

// ============================================================
// EXPORT ALL MARKS DATA
// ============================================================

function exportAllMarksData() {
    console.log('📊 Exporting all marks data...');
    
    const marks = window.me_currentMarks || [];
    if (!marks || marks.length === 0) {
        if (typeof showNotification === 'function') {
            showNotification('No data to export', 'warning');
        } else {
            alert('No data to export');
        }
        return;
    }
    
    const program = window.me_currentProgram || 'KRCHN';
    const config = getGradingConfig(program);
    const isCompetency = config.GRADE_TYPE === 'competency';
    
    const headers = ['Admission', 'Name', 'CAT1', 'CAT2', 'Exam', 'Total', 'Max', 'Percentage', 'Grade', 'Points', 'Status'];
    const rows = marks.map(m => {
        const result = calculateTVETMarks(m.cat1 || 0, m.cat2 || 0, m.exam || 0, program);
        return [
            m.admission || '',
            m.name || '',
            result.cat1,
            result.cat2,
            result.exam,
            result.total,
            result.maxTotal,
            result.percentage > 0 ? result.percentage : '',
            result.percentage > 0 ? result.grade : '',
            result.percentage > 0 ? result.points : '',
            result.percentage > 0 ? (isCompetency ? (result.isPassing ? 'COMPETENT' : 'NOT YET COMPETENT') : result.status) : ''
        ];
    });
    
    let csv = headers.join(',') + '\n';
    rows.forEach(row => {
        csv += row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',') + '\n';
    });
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `marks_${window.me_currentUnit || 'all'}_${window.me_currentBlock || 'all'}_${window.me_currentYear || '2025'}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    if (typeof showNotification === 'function') {
        showNotification('✅ All marks exported successfully!', 'success');
    } else {
        console.log('✅ All marks exported successfully!');
    }
}

// ============================================================
// STATE VARIABLES
// ============================================================

let me_currentMarks = [];
let me_currentBlock = '';
let me_currentUnit = '';
let me_currentYear = '2025';
let me_currentProgram = '';
let me_currentAssessmentType = 'full';
let me_columnSettings = {};
let me_currentAssignments = [];
let me_studentManagerData = {
    allStudents: [],
    enrolledStudents: [],
    availableStudents: [],
    enrolledMap: {}
};

// ============================================================
// CHECK IF USER IS ADMIN
// ============================================================

function isUserAdmin() {
    try {
        if (window.currentUser) {
            const role = window.currentUser.role || window.currentUser.user_role || window.currentUser.userRole;
            if (role === 'admin' || role === 'superadmin' || role === 'super_admin' || role === 'Super Admin') {
                return true;
            }
        }
        const sessionUser = sessionStorage.getItem('user');
        if (sessionUser) {
            try {
                const user = JSON.parse(sessionUser);
                const role = user.role || user.user_role || user.userRole;
                if (role === 'admin' || role === 'superadmin' || role === 'super_admin' || role === 'Super Admin') {
                    return true;
                }
            } catch (e) {}
        }
        const urlParams = new URLSearchParams(window.location.search);
        const roleParam = urlParams.get('role');
        if (roleParam === 'superadmin' || roleParam === 'admin') {
            return true;
        }
        if (window.location.pathname.includes('superadmin') || window.location.pathname.includes('admin')) {
            return true;
        }
        return true;
    } catch (e) {
        return true;
    }
}

// ============================================================
// SELECTED PROGRAM DISPLAY
// ============================================================

function updateSelectedProgramDisplay() {
    const select = document.getElementById('me_program_select');
    const selectedOption = select?.options[select?.selectedIndex];
    const programValue = select?.value || '';
    const programText = selectedOption?.text || 'None selected';
    
    const nameEl = document.getElementById('selectedProgramName');
    if (nameEl) {
        let displayText = programText.replace(/[^\w\s\-\(\)\.]/g, '').trim();
        if (!displayText || displayText === 'Select Program' || displayText === '-- Select Program --') {
            displayText = 'None selected';
        }
        nameEl.textContent = displayText;
        nameEl.style.color = programValue ? '#1e293b' : '#94a3b8';
    }
    
    const typeEl = document.getElementById('selectedProgramType');
    if (typeEl) {
        if (programValue === 'KRCHN') {
            typeEl.innerHTML = '<i class="fas fa-graduation-cap"></i> Nursing (Academic)';
            typeEl.style.background = '#dbeafe';
            typeEl.style.color = '#1e40af';
            typeEl.style.border = '1px solid #93c5fd';
        } else if (programValue && programValue !== '') {
            typeEl.innerHTML = '<i class="fas fa-tools"></i> TVET (Competency-Based)';
            typeEl.style.background = '#d1fae5';
            typeEl.style.color = '#065f46';
            typeEl.style.border = '1px solid #86efac';
        } else {
            typeEl.innerHTML = '<i class="fas fa-info-circle"></i> None Selected';
            typeEl.style.background = '#f3f4f6';
            typeEl.style.color = '#6b7280';
            typeEl.style.border = '1px solid #e5e7eb';
        }
    }
}

// ============================================================
// LOAD BLOCKS
// ============================================================

async function loadMEBlocks() {
    const program = document.getElementById('me_program_select')?.value;
    const blockSelect = document.getElementById('me_block_select');
    const unitSelect = document.getElementById('me_subject_select');
    const year = document.getElementById('me_year_select')?.value;
    
    if (!program) {
        blockSelect.innerHTML = '<option value="">-- Select Program First --</option>';
        unitSelect.innerHTML = '<option value="">-- Select Unit --</option>';
        return;
    }
    
    me_currentProgram = program;
    me_currentYear = year;
    
    blockSelect.innerHTML = '<option value="">Loading blocks...</option>';
    
    try {
        const { data, error } = await sb
            .from('units_catalog')
            .select('block')
            .eq('program', program)
            .eq('status', 'active')
            .order('block', { ascending: true });
        
        if (error) throw error;
        
        const blocks = [...new Set(data.map(d => d.block))];
        
        blockSelect.innerHTML = '<option value="">-- Select Block --</option>';
        blocks.forEach(block => {
            const option = document.createElement('option');
            option.value = block;
            option.textContent = block.replace(/_/g, ' ');
            blockSelect.appendChild(option);
        });
        
        if (blocks.length === 0) {
            blockSelect.innerHTML = '<option value="">No blocks found</option>';
        }
        
        unitSelect.innerHTML = '<option value="">-- Select Unit --</option>';
        
    } catch (error) {
        console.error('Error loading blocks:', error);
        blockSelect.innerHTML = '<option value="">Error loading blocks</option>';
        if (typeof showNotification === 'function') {
            showNotification('Error loading blocks: ' + error.message, 'error');
        }
    }
    
    updateSelectedProgramDisplay();
}

// ============================================================
// LOAD UNITS
// ============================================================

async function loadMEUnits() {
    const program = document.getElementById('me_program_select')?.value;
    const block = document.getElementById('me_block_select')?.value;
    const unitSelect = document.getElementById('me_subject_select');
    const year = document.getElementById('me_year_select')?.value;
    
    if (!program || !block) {
        unitSelect.innerHTML = '<option value="">-- Select Block First --</option>';
        return;
    }
    
    me_currentBlock = block;
    
    unitSelect.innerHTML = '<option value="">Loading units...</option>';
    
    try {
        const { data, error } = await sb
            .from('units_catalog')
            .select('unit_code, unit_name, assessment_type')
            .eq('program', program)
            .eq('block', block)
            .eq('status', 'active')
            .order('unit_name', { ascending: true });
        
        if (error) throw error;
        
        unitSelect.innerHTML = '<option value="">-- Select Unit --</option>';
        data.forEach(unit => {
            const option = document.createElement('option');
            option.value = unit.unit_name;
            option.dataset.assessment = unit.assessment_type || 'full';
            option.dataset.code = unit.unit_code || '';
            option.textContent = `${unit.unit_code || ''} - ${unit.unit_name}`;
            unitSelect.appendChild(option);
        });
        
        if (data.length === 0) {
            unitSelect.innerHTML = '<option value="">No units found for this block</option>';
        }
        
        const assessmentSelect = document.getElementById('me_assessment_type');
        if (assessmentSelect && data.length > 0) {
            const firstUnit = data[0];
            assessmentSelect.value = firstUnit.assessment_type || 'full';
            assessmentSelect.disabled = true;
        }
        
        await loadLecturerAssignments();
        
    } catch (error) {
        console.error('Error loading units:', error);
        unitSelect.innerHTML = '<option value="">Error loading units</option>';
        if (typeof showNotification === 'function') {
            showNotification('Error loading units: ' + error.message, 'error');
        }
    }
    
    updateSelectedProgramDisplay();
}

// ============================================================
// LOAD MARKS ENTRY
// ============================================================

async function loadMarksEntry() {
    console.log('📊 loadMarksEntry() called');
    
    try {
        const program = document.getElementById('me_program_select')?.value;
        const block = document.getElementById('me_block_select')?.value;
        const unit = document.getElementById('me_subject_select')?.value;
        const year = document.getElementById('me_year_select')?.value;
        const unitSelect = document.getElementById('me_subject_select');
        const selectedOption = unitSelect?.options[unitSelect.selectedIndex];
        const assessmentType = selectedOption?.dataset?.assessment || 'full';
        const unitCode = selectedOption?.dataset?.code || '';
        
        console.log('📊 Selected:', { program, block, unit, year, assessmentType, unitCode });
        
        const dynamicContent = document.getElementById('marksEntryDynamicContent');
        const placeholder = document.getElementById('marksEntryPlaceholder');
        const marksContainer = document.getElementById('me_marks_container');
        
        if (!program || !block || !unit) {
            console.log('⚠️ Missing selections - showing placeholder');
            if (dynamicContent) dynamicContent.style.display = 'none';
            if (placeholder) placeholder.style.display = 'block';
            if (marksContainer) {
                marksContainer.innerHTML = `
                    <div style="text-align: center; padding: 60px 20px;">
                        <i class="fas fa-pen-alt" style="font-size: 48px; color: #94a3b8; margin-bottom: 16px; display: block;"></i>
                        <h3 style="color: #1e293b;">Select Program, Block and Unit</h3>
                        <p style="color: #94a3b8;">Choose from the dropdowns above to load marks</p>
                    </div>
                `;
            }
            return;
        }
        
        if (dynamicContent) dynamicContent.style.display = 'block';
        if (placeholder) placeholder.style.display = 'none';
        
        me_currentProgram = program;
        me_currentBlock = block;
        me_currentUnit = unit;
        me_currentYear = year;
        me_currentAssessmentType = assessmentType;
        
        const config = getGradingConfig(program);
        const isNursing = program === 'KRCHN';
        const programType = isNursing ? 'NURSING' : 'TVET';
        
        console.log(`📊 Program: ${program} (${programType}) - ${config.DISPLAY_NAME}`);
        
        if (marksContainer) {
            marksContainer.innerHTML = `
                <div style="text-align: center; padding: 40px;">
                    <div class="loading-spinner"></div>
                    <p style="color: #6b7280; margin-top: 10px;">
                        Loading marks for ${unitCode || unit}...
                        <br><small style="color: #94a3b8;">${isNursing ? '🎓 Nursing' : '🔧 TVET'} | ${config.DISPLAY_NAME}</small>
                    </p>
                </div>
            `;
        }
        
        const { data: marks, error: marksError } = await sb
            .from('student_marks')
            .select('*')
            .eq('block', block)
            .eq('subject_name', unit)
            .eq('academic_year', year);
        
        if (marksError) throw marksError;
        
        console.log(`📊 Found ${marks?.length || 0} students`);
        
        if (!marks || marks.length === 0) {
            if (marksContainer) {
                marksContainer.innerHTML = `
                    <div style="text-align: center; padding: 60px 20px;">
                        <i class="fas fa-users" style="font-size: 48px; color: #94a3b8; margin-bottom: 16px; display: block;"></i>
                        <h3 style="color: #1e293b;">No students enrolled in this unit</h3>
                        <p style="color: #94a3b8;">Use "Manage Students" to add students to this unit</p>
                        <button onclick="openMarksStudentManager()" class="btn-action" style="margin-top: 12px; padding: 8px 20px; background: #4C1D95; color: white; border: none; border-radius: 6px; cursor: pointer;">
                            <i class="fas fa-users"></i> Manage Students
                        </button>
                    </div>
                `;
            }
            updateMarksEntryStats([], assessmentType, program);
            return;
        }
        
        const admissions = marks.map(m => m.admission_number).filter(Boolean);
        console.log(`📊 Admissions to fetch: ${admissions.length}`);
        
        let studentMap = {};
        if (admissions.length > 0) {
            try {
                const { data: students, error: studentError } = await sb
                    .from('consolidated_user_profiles_table')
                    .select('student_id, full_name')
                    .eq('role', 'student')
                    .in('student_id', admissions);
                
                if (!studentError && students) {
                    students.forEach(s => {
                        if (s.student_id) {
                            studentMap[s.student_id] = s.full_name || 'Unknown';
                        }
                    });
                }
            } catch (e) {
                console.warn('⚠️ Could not fetch student names:', e);
            }
        }
        
        const fullMarks = marks.map(m => {
            const result = calculateTVETMarks(
                m.cat1_score || 0, 
                m.cat2_score || 0, 
                m.exam_score || 0, 
                program
            );
            return {
                admission: m.admission_number || '',
                name: studentMap[m.admission_number] || m.student_name || 'Unknown',
                program: program,
                programType: programType,
                cat1: m.cat1_score || 0,
                cat2: m.cat2_score || 0,
                exam: m.exam_score || 0,
                total: result.total,
                maxTotal: result.maxTotal,
                percentage: result.percentage,
                grade: result.grade,
                points: result.points,
                status: result.status,
                comment: result.comment,
                isPassing: result.isPassing,
                final: result.percentage,
                final_score: result.percentage,
                assessmentType: result.assessmentType || assessmentType,
                visibleColumns: result.visibleColumns,
                id: m.id || null,
                approval_status: m.approval_status || 'draft',
                published: m.published || false,
                gradeIcon: result.gradeInfo?.icon || ''
            };
        });
        
        console.log(`📊 Displaying ${fullMarks.length} students`);
        me_currentMarks = fullMarks;
        
        const currentAssessmentType = getAssessmentTypeFromColumns();
        const maxTotal = getMaxPossible(program, currentAssessmentType);
        const visible = detectVisibleColumns();
        
        renderMarksEntryTable(fullMarks, unitCode, currentAssessmentType, program);
        updateMarksEntryStats(fullMarks, currentAssessmentType, program);
        
        await loadUnitColumnSettings();
        updateAssessmentTypeDisplay(currentAssessmentType, maxTotal, visible);
        showGradingSystemInfo(program);
        updateGradingDisplay(program);
        updateSelectedProgramDisplay();
        
        console.log('✅ Marks loaded successfully!');
        
    } catch (error) {
        console.error('❌ Error loading marks:', error);
        const marksContainer = document.getElementById('me_marks_container');
        if (marksContainer) {
            marksContainer.innerHTML = `
                <div style="text-align: center; padding: 40px;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 48px; color: #f59e0b; margin-bottom: 16px; display: block;"></i>
                    <h4 style="color: #991b1b;">Error loading marks</h4>
                    <p style="color: #64748b;">${error.message}</p>
                    <button onclick="loadMarksEntry()" class="btn-action" style="margin-top: 12px; padding: 8px 20px; background: #4C1D95; color: white; border: none; border-radius: 6px; cursor: pointer;">
                        <i class="fas fa-sync-alt"></i> Retry
                    </button>
                </div>
            `;
        }
        if (typeof showNotification === 'function') {
            showNotification('Error loading marks: ' + error.message, 'error');
        }
    }
}

// ============================================================
// SHOW GRADING SYSTEM INFO
// ============================================================

function showGradingSystemInfo(program) {
    const config = getGradingConfig(program);
    const isNursing = program === 'KRCHN';
    
    let container = document.getElementById('gradingSystemInfo');
    if (!container) {
        container = document.createElement('div');
        container.id = 'gradingSystemInfo';
        const marksContainer = document.getElementById('me_marks_container');
        if (marksContainer) {
            marksContainer.parentNode.insertBefore(container, marksContainer);
        }
    }
    
    const icon = isNursing ? '🎓' : '🔧';
    const typeLabel = isNursing ? 'Nursing (KRCHN)' : 'TVET';
    const gradeType = config.GRADE_TYPE === 'competency' ? 'Competency-Based' : 'Academic';
    
    let gradeLegend = '';
    config.GRADE_MAPPING.forEach(g => {
        gradeLegend += `
            <span style="background:${g.bgColor};color:${g.color};padding:2px 10px;border-radius:4px;font-weight:600;font-size:11px;border:1px solid ${g.color};">
                ${g.icon || ''} ${g.grade} (${g.min}-${g.max}%) = ${g.points}pts
            </span>
        `;
    });
    
    container.innerHTML = `
        <div style="background:${isNursing ? '#eff6ff' : '#f0fdf4'};padding:12px 16px;border-radius:8px;border:1px solid ${isNursing ? '#93c5fd' : '#86efac'};margin-bottom:16px;">
            <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
                <span style="font-weight:700;color:#1e293b;">${icon} ${typeLabel}</span>
                <span style="font-size:12px;color:#475569;background:white;padding:2px 10px;border-radius:12px;">${gradeType}</span>
                <span style="font-size:12px;color:#475569;">Pass: ≥${config.PASS_MARK}%</span>
                <span style="font-size:11px;color:#6b7280;background:white;padding:2px 10px;border-radius:12px;">${config.FORMULA}</span>
            </div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px;padding-top:8px;border-top:1px solid ${isNursing ? '#dbeafe' : '#d1fae5'};">
                ${gradeLegend}
            </div>
        </div>
    `;
}

function updateGradingDisplay(program) {
    console.log('📊 Updating grading display for:', program);
    
    const config = getGradingConfig(program);
    const isNursing = program === 'KRCHN';
    
    const gradingTypeEl = document.getElementById('currentGradingType');
    const gradingTypeLabel = document.getElementById('currentGradingTypeLabel');
    
    if (gradingTypeEl && gradingTypeLabel) {
        gradingTypeEl.style.display = 'inline-block';
        if (isNursing) {
            gradingTypeLabel.textContent = '🎓 Nursing (Academic)';
            gradingTypeEl.style.background = '#dbeafe';
            gradingTypeEl.style.color = '#1e40af';
        } else {
            gradingTypeLabel.textContent = '🔧 TVET (Competency-Based)';
            gradingTypeEl.style.background = '#d1fae5';
            gradingTypeEl.style.color = '#065f46';
        }
    }
}

// ============================================================
// RENDER MARKS ENTRY TABLE - COMPLETE FIXED VERSION
// ============================================================

function renderMarksEntryTable(marks, unitCode, assessmentType, program) {
    const container = document.getElementById('me_marks_container');
    if (!container) return;
    
    const config = getGradingConfig(program);
    const isNursing = program === 'KRCHN';
    const isCompetency = config.GRADE_TYPE === 'competency';
    
    // ✅ Get visible columns from settings
    const savedColumns = me_columnSettings.columns || [];
    const cat1Setting = savedColumns.find(c => c.id === 'cat1');
    const cat2Setting = savedColumns.find(c => c.id === 'cat2');
    const examSetting = savedColumns.find(c => c.id === 'exam');
    
    const showCat1 = cat1Setting !== undefined ? cat1Setting.visible !== false : true;
    const showCat2 = cat2Setting !== undefined ? cat2Setting.visible !== false : true;
    const showExam = examSetting !== undefined ? examSetting.visible !== false : true;
    
    // ✅ Determine correct assessment type
    let actualAssessmentType = 'full';
    if (showCat1 && showCat2 && showExam) {
        actualAssessmentType = 'full';
    } else if (showCat1 && showExam) {
        actualAssessmentType = 'single_cat';
    } else if (showCat2 && showExam) {
        actualAssessmentType = 'single_cat';
    } else if (showCat1 && showCat2) {
        actualAssessmentType = 'cats_only';
    } else if (showExam) {
        actualAssessmentType = 'exam_only';
    } else if (showCat1) {
        actualAssessmentType = 'cat1_only';
    } else if (showCat2) {
        actualAssessmentType = 'cat2_only';
    }
    
    // ✅ Update the global assessment type
    me_currentAssessmentType = actualAssessmentType;
    
    const maxTotal = getMaxPossible(program, actualAssessmentType);
    const examMax = isNursing ? 70 : config.EXAM_MAX;
    
    const withScores = marks.filter(m => m.cat1 > 0 || m.cat2 > 0 || m.exam > 0);
    const passing = marks.filter(m => m.isPassing);
    
    let html = `
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; margin-bottom: 16px;">
            <div>
                <h3 style="margin: 0; color: #0f172a;">${unitCode || me_currentUnit}</h3>
                <span style="font-size: 12px; color: #64748b;">${me_currentProgram} | ${me_currentBlock.replace('_', ' ')} | ${me_currentYear}</span>
                <span style="font-size: 12px; color: #64748b; margin-left: 12px; background: #e0f2fe; padding: 2px 12px; border-radius: 40px;">👥 ${marks.length} students</span>
                <span style="font-size: 12px; color: #059669; margin-left: 12px; background: #d1fae5; padding: 2px 12px; border-radius: 40px;">📊 ${withScores.length} with scores</span>
                <span style="font-size: 12px; color: #10b981; margin-left: 12px; background: #d1fae5; padding: 2px 12px; border-radius: 40px;">✅ ${passing.length} passing</span>
                <span style="font-size: 12px; color: #6b7280; margin-left: 12px; background: #f3f4f6; padding: 2px 12px; border-radius: 40px;">
                    📋 ${isCompetency ? 'TVET Competency' : 'Nursing Academic'}
                </span>
                <span style="font-size: 11px; color: #475569; margin-left: 12px; background: #fef3c7; padding: 2px 12px; border-radius: 40px;">
                    Max: ${maxTotal}
                </span>
                <span style="font-size: 11px; color: #1e40af; margin-left: 12px; background: #dbeafe; padding: 2px 12px; border-radius: 40px;">
                    ${getAssessmentTypeLabel(actualAssessmentType)}
                </span>
            </div>
            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                <button onclick="recalculateAllTotals()" style="background: #4C1D95; padding: 8px 16px; border: none; border-radius: 6px; color: white; cursor: pointer; font-weight: 600; font-size: 12px;">
                    <i class="fas fa-calculator"></i> Recalculate
                </button>
                <button onclick="refreshMarksData()" style="background: #6b7280; padding: 8px 16px; border: none; border-radius: 6px; color: white; cursor: pointer; font-weight: 600; font-size: 12px;">
                    <i class="fas fa-sync-alt"></i> Refresh
                </button>
                <button onclick="openMarksStudentManager()" style="background: #4C1D95; padding: 8px 16px; border: none; border-radius: 6px; color: white; cursor: pointer; font-weight: 600; font-size: 12px;">
                    <i class="fas fa-users"></i> Manage Students
                </button>
                <button onclick="saveMarksEntry()" style="background: #059669; padding: 8px 16px; border: none; border-radius: 6px; color: white; cursor: pointer; font-weight: 600; font-size: 12px;">
                    <i class="fas fa-save"></i> Save All
                </button>
                <button onclick="exportMarksEntry()" style="background: #4C1D95; padding: 8px 16px; border: none; border-radius: 6px; color: white; cursor: pointer; font-weight: 600; font-size: 12px;">
                    <i class="fas fa-file-export"></i> Export CSV
                </button>
                ${isUserAdmin() ? `
                <button onclick="resetUnitColumns()" style="background: #6b7280; padding: 8px 16px; border: none; border-radius: 6px; color: white; cursor: pointer; font-weight: 600; font-size: 12px;">
                    <i class="fas fa-undo"></i> Reset Columns
                </button>
                ` : ''}
            </div>
        </div>
        
        <div style="overflow-x: auto;">
            <table id="me_marks_table" style="width: 100%; border-collapse: collapse; font-size: 13px;">
                <thead>
                    <tr style="background: linear-gradient(135deg, #667eea, #764ba2); color: white;">
                        <th style="padding: 10px 6px; text-align: center; width: 35px;">#</th>
                        <th style="padding: 10px 8px; text-align: left;">Admission</th>
                        <th style="padding: 10px 8px; text-align: left;">Name</th>
                        ${showCat1 ? `<th style="padding: 10px 8px; text-align: center;">CAT1 (0-${config.CAT1_MAX})</th>` : ''}
                        ${showCat2 ? `<th style="padding: 10px 8px; text-align: center;">CAT2 (0-${config.CAT2_MAX})</th>` : ''}
                        ${showExam ? `<th style="padding: 10px 8px; text-align: center;">Exam (0-${examMax})</th>` : ''}
                        <th style="padding: 10px 8px; text-align: center;">Total (100)</th>
                        <th style="padding: 10px 8px; text-align: center;">Grade</th>
                        <th style="padding: 10px 8px; text-align: center;">Points</th>
                        <th style="padding: 10px 8px; text-align: center;">Status</th>
                        ${isUserAdmin() ? '<th style="padding: 10px 8px; text-align: center;">Approval</th>' : ''}
                    </tr>
                </thead>
                <tbody>`;
    
    marks.forEach((m, i) => {
        const cat1 = parseFloat(m.cat1) || 0;
        const cat2 = parseFloat(m.cat2) || 0;
        const exam = parseFloat(m.exam) || 0;
        
        // ✅ Use the actual assessment type for calculation
        const result = calculateTVETMarks(cat1, cat2, exam, program);
        const percentage = result.percentage;
        const gradeInfo = getTVETGrade(percentage, config);
        const isPassing = percentage >= config.PASS_MARK;
        
        // ✅ Show final percentage in Total column
        const displayTotal = result.percentage > 0 ? `${result.percentage}%` : '--';
        const displayGrade = result.percentage > 0 ? result.grade : '--';
        const displayPoints = result.percentage > 0 ? result.points : '--';
        
        const approvalBadge = {
            'pending': '<span style="background:#fef3c7;color:#92400e;padding:2px 8px;border-radius:12px;font-size:10px;">⏳ Pending</span>',
            'approved': '<span style="background:#d1fae5;color:#065f46;padding:2px 8px;border-radius:12px;font-size:10px;">✅ Approved</span>',
            'rejected': '<span style="background:#fee2e2;color:#991b1b;padding:2px 8px;border-radius:12px;font-size:10px;">❌ Rejected</span>',
            'draft': '<span style="background:#e5e7eb;color:#6b7280;padding:2px 8px;border-radius:12px;font-size:10px;">📝 Draft</span>'
        }[m.approval_status] || '<span style="background:#e5e7eb;color:#6b7280;padding:2px 8px;border-radius:12px;font-size:10px;">📝 Draft</span>';
        
        let statusBadge;
        if (isCompetency) {
            statusBadge = isPassing 
                ? `<span style="background:#d1fae5;color:#065f46;padding:3px 10px;border-radius:12px;font-weight:600;font-size:11px;">✅ COMPETENT</span>`
                : `<span style="background:#fee2e2;color:#991b1b;padding:3px 10px;border-radius:12px;font-weight:600;font-size:11px;">❌ NOT YET COMPETENT</span>`;
        } else {
            statusBadge = result.percentage > 0
                ? `<span style="background:${gradeInfo.bgColor};color:${gradeInfo.color};padding:3px 10px;border-radius:12px;font-weight:600;font-size:11px;">${gradeInfo.icon || ''} ${gradeInfo.status}</span>`
                : '<span style="color:#94a3b8;">PENDING</span>';
        }
        
        html += `<tr style="border-bottom: 1px solid #e5e7eb; ${i % 2 === 0 ? 'background: #f8fafc;' : ''}">
            <td style="padding: 8px 6px; text-align: center; font-size: 12px; color: #94a3b8;">${i + 1}</td>
            <td style="padding: 8px 8px; font-weight: 500; font-size: 12px;">${m.admission || 'N/A'}</td>
            <td style="padding: 8px 8px;"><strong>${m.name || 'Unknown'}</strong></td>
            ${showCat1 ? `<td style="padding: 8px; text-align: center;">
                <input type="number" id="me_cat1_${i}" value="${cat1}" min="0" max="${config.CAT1_MAX}" step="0.5" style="width: 60px; padding: 6px; border-radius: 6px; border: 1px solid #e2e8f0; text-align: center;" onchange="updateMarksEntryRow(${i})">
            </td>` : ''}
            ${showCat2 ? `<td style="padding: 8px; text-align: center;">
                <input type="number" id="me_cat2_${i}" value="${cat2}" min="0" max="${config.CAT2_MAX}" step="0.5" style="width: 60px; padding: 6px; border-radius: 6px; border: 1px solid #e2e8f0; text-align: center;" onchange="updateMarksEntryRow(${i})">
            </td>` : ''}
            ${showExam ? `<td style="padding: 8px; text-align: center;">
                <input type="number" id="me_exam_${i}" value="${exam}" min="0" max="${examMax}" step="0.5" style="width: 60px; padding: 6px; border-radius: 6px; border: 1px solid #e2e8f0; text-align: center;" onchange="updateMarksEntryRow(${i})">
            </td>` : ''}
            <td id="me_total_${i}" style="padding: 8px 6px; text-align: center; font-weight: bold; ${isPassing ? 'color: #065f46;' : (result.percentage > 0 ? 'color: #991b1b;' : 'color: #f59e0b;')}">${displayTotal}</td>
            <td id="me_grade_${i}" style="padding: 8px 6px; text-align: center; font-weight: bold; font-size: 16px; color: ${gradeInfo.color || '#6b7280'};">${displayGrade}</td>
            <td id="me_points_${i}" style="padding: 8px 6px; text-align: center; font-weight: bold; font-size: 15px; color: ${gradeInfo.color || '#6b7280'};">${displayPoints}</td>
            <td id="me_status_${i}" style="padding: 8px 6px; text-align: center; font-size: 12px;">${statusBadge}</td>
            ${isUserAdmin() ? `<td style="padding: 8px 6px; text-align: center; font-size: 11px;">${approvalBadge}</td>` : ''}
        </tr>`;
    });
    
    html += `
                </tbody>
            </table>
        </div>
        <div style="text-align: center; margin-top: 16px;">
            <button onclick="recalculateAllTotals()" style="background: #4C1D95; padding: 10px 24px; border: none; border-radius: 8px; color: white; cursor: pointer; font-weight: 600; font-size: 14px;">
                <i class="fas fa-calculator"></i> 🔄 Recalculate All
            </button>
            <button onclick="refreshMarksData()" style="background: #6b7280; padding: 10px 24px; border: none; border-radius: 8px; color: white; cursor: pointer; font-weight: 600; font-size: 14px; margin-left: 10px;">
                <i class="fas fa-sync-alt"></i> 🔄 Refresh Data
            </button>
            <button onclick="saveMarksEntry()" style="background: #059669; padding: 10px 24px; border: none; border-radius: 8px; color: white; cursor: pointer; font-weight: 600; font-size: 14px; margin-left: 10px;">
                <i class="fas fa-save"></i> 💾 Save All Marks
            </button>
        </div>
    `;
    
    container.innerHTML = html;
    
    // ✅ Update assessment type display
    updateAssessmentTypeDisplay(actualAssessmentType, maxTotal, { hasCat1: showCat1, hasCat2: showCat2, hasExam: showExam });
}

// ============================================================
// UPDATE MARKS ENTRY ROW
// ============================================================

function updateMarksEntryRow(index) {
    const program = me_currentProgram;
    const config = getGradingConfig(program);
    
    const cat1 = parseFloat(document.getElementById(`me_cat1_${index}`)?.value) || 0;
    const cat2 = parseFloat(document.getElementById(`me_cat2_${index}`)?.value) || 0;
    const exam = parseFloat(document.getElementById(`me_exam_${index}`)?.value) || 0;
    
    const result = calculateTVETMarks(cat1, cat2, exam, program);
    const isPassing = result.isPassing;
    const gradeInfo = getTVETGrade(result.percentage, config);
    const isCompetency = config.GRADE_TYPE === 'competency';
    
    // ✅ Show final percentage in Total column
    const totalEl = document.getElementById(`me_total_${index}`);
    if (totalEl) {
        totalEl.textContent = result.percentage > 0 ? `${result.percentage}%` : '--';
        totalEl.style.color = isPassing ? '#065f46' : (result.percentage > 0 ? '#991b1b' : '#f59e0b');
    }
    
    const percentageEl = document.getElementById(`me_percentage_${index}`);
    if (percentageEl) {
        percentageEl.textContent = result.percentage > 0 ? `${result.percentage}%` : '--';
        percentageEl.style.color = isPassing ? '#065f46' : (result.percentage > 0 ? '#991b1b' : '#f59e0b');
    }
    
    const gradeEl = document.getElementById(`me_grade_${index}`);
    if (gradeEl) {
        gradeEl.textContent = result.percentage > 0 ? result.grade : '--';
        gradeEl.style.color = gradeInfo.color || '#6b7280';
    }
    
    const pointsEl = document.getElementById(`me_points_${index}`);
    if (pointsEl) {
        pointsEl.textContent = result.percentage > 0 ? result.points : '--';
        pointsEl.style.color = gradeInfo.color || '#6b7280';
    }
    
    const statusEl = document.getElementById(`me_status_${index}`);
    if (statusEl) {
        if (result.percentage > 0) {
            if (isCompetency) {
                statusEl.innerHTML = isPassing 
                    ? `<span style="background:#d1fae5;color:#065f46;padding:3px 10px;border-radius:12px;font-weight:600;font-size:11px;">✅ COMPETENT</span>`
                    : `<span style="background:#fee2e2;color:#991b1b;padding:3px 10px;border-radius:12px;font-weight:600;font-size:11px;">❌ NOT YET COMPETENT</span>`;
            } else {
                statusEl.innerHTML = `<span style="background:${gradeInfo.bgColor};color:${gradeInfo.color};padding:3px 10px;border-radius:12px;font-weight:600;font-size:11px;">${gradeInfo.icon || ''} ${gradeInfo.status}</span>`;
            }
        } else {
            statusEl.innerHTML = '<span style="color:#94a3b8;">PENDING</span>';
        }
    }
    
    if (me_currentMarks && me_currentMarks[index]) {
        me_currentMarks[index].cat1 = cat1;
        me_currentMarks[index].cat2 = cat2;
        me_currentMarks[index].exam = exam;
        me_currentMarks[index].percentage = result.percentage;
        me_currentMarks[index].total = result.total;
        me_currentMarks[index].maxTotal = result.maxTotal;
        me_currentMarks[index].grade = result.grade;
        me_currentMarks[index].points = result.points;
        me_currentMarks[index].status = result.status;
        me_currentMarks[index].isPassing = isPassing;
        me_currentMarks[index].assessmentType = result.assessmentType;
        me_currentMarks[index].visibleColumns = result.visibleColumns;
    }
}

// ============================================================
// UPDATE MARKS ENTRY STATS
// ============================================================

function updateMarksEntryStats(marks, assessmentType, program) {
    const config = getGradingConfig(program);
    const totalEnrolled = marks.length;
    const withScores = marks.filter(m => m.cat1 > 0 || m.cat2 > 0 || m.exam > 0);
    const passing = marks.filter(m => m.isPassing);
    
    const avg = withScores.length > 0 ? 
        withScores.reduce((sum, m) => sum + (m.percentage || 0), 0) / withScores.length : 0;
    
    const totalEl = document.getElementById('me_total_students');
    const subjectsEl = document.getElementById('me_total_subjects');
    const passEl = document.getElementById('me_pass_rate');
    const avgEl = document.getElementById('me_class_avg');
    const atRiskEl = document.getElementById('me_at_risk');
    const publishedEl = document.getElementById('me_published_count');
    
    if (totalEl) totalEl.textContent = totalEnrolled;
    if (subjectsEl) subjectsEl.textContent = marks.length > 0 ? 1 : 0;
    if (passEl) passEl.textContent = totalEnrolled > 0 ? Math.round((passing.length / totalEnrolled) * 100) + '%' : '0%';
    if (avgEl) avgEl.textContent = Math.round(avg) + '%';
    
    const atRisk = marks.filter(m => {
        const pct = m.percentage || 0;
        return pct > 0 && pct < config.PASS_MARK;
    });
    if (atRiskEl) atRiskEl.textContent = atRisk.length;
    
    if (publishedEl && marks) {
        const publishedCount = marks.filter(m => m.published === true).length;
        publishedEl.textContent = publishedCount;
    }
}

// ============================================================
// RECALCULATE ALL TOTALS
// ============================================================

function recalculateAllTotals() {
    console.log('🔄 Recalculating all totals...');
    const program = me_currentProgram;
    const rows = document.querySelectorAll('#me_marks_container table tbody tr');
    
    if (!rows || rows.length === 0) {
        console.warn('⚠️ No rows to recalculate');
        return;
    }
    
    const assessmentType = getAssessmentTypeFromColumns();
    const maxTotal = getMaxPossible(program, assessmentType);
    const visible = detectVisibleColumns();
    
    console.log(`📊 Recalculating with: ${assessmentType}, Max: ${maxTotal}`);
    
    rows.forEach((row, index) => {
        updateMarksEntryRow(index);
    });
    
    if (me_currentMarks) {
        updateMarksEntryStats(me_currentMarks, assessmentType, program);
    }
    
    const label = getAssessmentTypeLabel(assessmentType);
    if (typeof showNotification === 'function') {
        showNotification(`📊 Switched to: ${label} (Max: ${maxTotal})`, 'info');
    }
    
    console.log('✅ Recalculation complete!');
}

// ============================================================
// ASSESSMENT TYPE DISPLAY
// ============================================================

function updateAssessmentTypeDisplay(assessmentType, maxTotal, visibleColumns) {
    const label = getAssessmentTypeLabel(assessmentType);
    const typeEl = document.getElementById('currentAssessmentType');
    const maxEl = document.getElementById('currentMaxTotal');
    const columnsEl = document.getElementById('visibleColumnsInfo');
    
    if (typeEl) {
        typeEl.textContent = label;
        typeEl.style.background = '#e0f2fe';
        typeEl.style.padding = '2px 12px';
        typeEl.style.borderRadius = '12px';
        typeEl.style.fontSize = '12px';
    }
    
    if (maxEl && maxTotal) {
        maxEl.textContent = `Max: ${maxTotal}`;
    }
    
    if (columnsEl && visibleColumns) {
        const parts = [];
        if (visibleColumns.hasCat1) parts.push('CAT1');
        if (visibleColumns.hasCat2) parts.push('CAT2');
        if (visibleColumns.hasExam) parts.push('Exam');
        columnsEl.textContent = `📊 ${parts.join(' + ')}`;
    }
}

// ============================================================
// SAVE MARKS ENTRY
// ============================================================

async function saveMarksEntry() {
    console.log('💾 Saving marks with auto-approve...');
    
    const block = me_currentBlock;
    const unit = me_currentUnit;
    const year = me_currentYear;
    const assessmentType = me_currentAssessmentType || 'full';
    const program = me_currentProgram;
    
    if (!block || !unit) {
        showNotification('Please select a block and unit first', 'warning');
        return;
    }
    
    const marksData = [];
    const rows = document.querySelectorAll('#me_marks_container table tbody tr');
    
    if (rows.length === 0) {
        showNotification('No students found to save', 'warning');
        return;
    }
    
    rows.forEach((row, index) => {
        const cat1Input = document.getElementById(`me_cat1_${index}`);
        const cat2Input = document.getElementById(`me_cat2_${index}`);
        const examInput = document.getElementById(`me_exam_${index}`);
        
        const cells = row.querySelectorAll('td');
        const admission = cells[1]?.textContent?.trim() || '';
        const name = cells[2]?.textContent?.trim() || '';
        
        if (admission) {
            const cat1 = parseFloat(cat1Input?.value) || 0;
            const cat2 = parseFloat(cat2Input?.value) || 0;
            const exam = parseFloat(examInput?.value) || 0;
            
            const result = calculateTVETMarks(cat1, cat2, exam, program);
            
            marksData.push({
                admission_number: admission,
                student_name: name || 'Unknown',
                block: block,
                subject_name: unit,
                assessment_type: assessmentType,
                cat1_score: cat1,
                cat2_score: cat2,
                exam_score: exam,
                final_score: result.percentage,
                grade: result.grade,
                points: result.points,
                academic_year: year,
                approval_status: 'approved',
                approved_at: new Date().toISOString(),
                approved_by: window.currentUser?.id || null,
                updated_at: new Date().toISOString()
            });
        }
    });
    
    if (marksData.length === 0) {
        showNotification('No marks to save', 'warning');
        return;
    }
    
    console.log(`📋 Saving ${marksData.length} marks with auto-approve...`);
    showLoading(`Saving ${marksData.length} marks...`);
    
    try {
        let saved = 0;
        let errors = 0;
        
        for (const mark of marksData) {
            try {
                const { data: existing, error: fetchError } = await sb
                    .from('student_marks')
                    .select('id')
                    .eq('admission_number', mark.admission_number)
                    .eq('subject_name', mark.subject_name)
                    .eq('block', mark.block)
                    .eq('academic_year', mark.academic_year)
                    .maybeSingle();
                
                if (fetchError) {
                    console.error('❌ Fetch error:', fetchError);
                    errors++;
                    continue;
                }
                
                const updateData = {
                    student_name: mark.student_name,
                    assessment_type: mark.assessment_type,
                    cat1_score: mark.cat1_score,
                    cat2_score: mark.cat2_score,
                    exam_score: mark.exam_score,
                    final_score: mark.final_score,
                    grade: mark.grade,
                    points: mark.points,
                    approval_status: 'approved',
                    approved_at: new Date().toISOString(),
                    approved_by: window.currentUser?.id || null,
                    updated_at: new Date().toISOString()
                };
                
                if (existing) {
                    const { error: updateError } = await sb
                        .from('student_marks')
                        .update(updateData)
                        .eq('id', existing.id);
                    
                    if (updateError) {
                        console.error('❌ Update error:', updateError);
                        errors++;
                        continue;
                    }
                } else {
                    const { error: insertError } = await sb
                        .from('student_marks')
                        .insert({
                            admission_number: mark.admission_number,
                            student_name: mark.student_name,
                            block: mark.block,
                            subject_name: mark.subject_name,
                            assessment_type: mark.assessment_type,
                            cat1_score: mark.cat1_score,
                            cat2_score: mark.cat2_score,
                            exam_score: mark.exam_score,
                            final_score: mark.final_score,
                            grade: mark.grade,
                            points: mark.points,
                            academic_year: mark.academic_year,
                            approval_status: 'approved',
                            approved_at: new Date().toISOString(),
                            approved_by: window.currentUser?.id || null,
                            created_at: new Date().toISOString(),
                            updated_at: new Date().toISOString()
                        });
                    
                    if (insertError) {
                        console.error('❌ Insert error:', insertError);
                        errors++;
                        continue;
                    }
                }
                saved++;
            } catch (err) {
                console.error('❌ Error:', err);
                errors++;
            }
        }
        
        hideLoading();
        
        if (errors > 0) {
            showNotification(`⚠️ Saved ${saved} marks with ${errors} errors`, 'warning');
        } else {
            showNotification(`✅ ${saved} marks saved and auto-approved!`, 'success');
        }
        
        setTimeout(() => loadMarksEntry(), 500);
        
    } catch (error) {
        hideLoading();
        console.error('❌ Error saving marks:', error);
        showNotification('❌ Error saving marks: ' + error.message, 'error');
    }
}

// ============================================================
// EXPORT MARKS TO CSV
// ============================================================

function exportMarksEntry() {
    const marks = me_currentMarks;
    const program = me_currentProgram;
    const config = getGradingConfig(program);
    const isCompetency = config.GRADE_TYPE === 'competency';
    
    if (!marks || marks.length === 0) {
        if (typeof showNotification === 'function') showNotification('No data to export', 'warning');
        return;
    }
    
    const headers = ['Admission', 'Name', 'CAT1', 'CAT2', 'Exam', 'Total', 'Max', 'Percentage', 'Grade', 'Points', 'Status'];
    const rows = marks.map(m => {
        const result = calculateTVETMarks(m.cat1 || 0, m.cat2 || 0, m.exam || 0, program);
        return [
            m.admission || '',
            m.name || '',
            result.cat1,
            result.cat2,
            result.exam,
            result.total,
            result.maxTotal,
            result.percentage > 0 ? result.percentage : '',
            result.percentage > 0 ? result.grade : '',
            result.percentage > 0 ? result.points : '',
            result.percentage > 0 ? (isCompetency ? (result.isPassing ? 'COMPETENT' : 'NOT YET COMPETENT') : result.status) : ''
        ];
    });
    
    let csv = headers.join(',') + '\n';
    rows.forEach(row => {
        csv += row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',') + '\n';
    });
    
    downloadCSV(csv, `marks_${me_currentUnit}_${me_currentBlock}_${me_currentYear}.csv`);
    if (typeof showNotification === 'function') showNotification('✅ Marks exported!', 'success');
}

function downloadCSV(csv, filename) {
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
}

// ============================================================
// REFRESH FUNCTIONS
// ============================================================

function refreshMarksData() {
    loadMarksEntry();
    if (typeof showNotification === 'function') {
        showNotification('🔄 Data refreshed!', 'success');
    }
}

function refreshAssignmentHistory() {
    loadAssignmentHistory();
    if (typeof showNotification === 'function') {
        showNotification('🔄 Assignment history refreshed!', 'success');
    }
}

// ============================================================
// COLUMN MANAGEMENT
// ============================================================

async function loadUnitColumnSettings() {
    console.log('📋 Loading column settings...');
    
    const unit = me_currentUnit;
    const block = me_currentBlock;
    const year = me_currentYear;
    
    const unitNameEl = document.getElementById('me_column_subject_name');
    if (unitNameEl) {
        unitNameEl.textContent = unit || 'Current Unit';
    }
    
    const container = document.getElementById('me_column_settings');
    if (!container) return;
    
    if (!isUserAdmin()) {
        container.innerHTML = `
            <div style="color: #94a3b8; font-size: 13px; grid-column: 1 / -1; text-align: center; padding: 20px;">
                <i class="fas fa-lock"></i> Column settings are managed by the Administrator
            </div>
        `;
        return;
    }
    
    if (!unit || !block) {
        container.innerHTML = `
            <div style="color: #94a3b8; font-size: 13px; grid-column: 1 / -1; text-align: center; padding: 20px;">
                <i class="fas fa-info-circle"></i> Select a unit to manage columns
            </div>
        `;
        return;
    }
    
    try {
        const { data, error } = await sb
            .from('column_settings')
            .select('*')
            .eq('block', block)
            .eq('subject', unit)
            .eq('year', year)
            .maybeSingle();
        
        if (error) throw error;
        
        me_columnSettings = data || { columns: [] };
        renderUnitColumns();
        applyColumnVisibility();
        
    } catch (error) {
        console.error('Error loading column settings:', error);
        container.innerHTML = `
            <div style="color: #ef4444; font-size: 13px; grid-column: 1 / -1; text-align: center; padding: 20px;">
                <i class="fas fa-exclamation-circle"></i> Error loading columns: ${error.message}
            </div>
        `;
        if (typeof showNotification === 'function') {
            showNotification('Error loading column settings: ' + error.message, 'error');
        }
    }
}

function renderUnitColumns() {
    const container = document.getElementById('me_column_settings');
    if (!container) return;
    
    if (!isUserAdmin()) {
        container.innerHTML = `
            <div style="color: #94a3b8; font-size: 13px; grid-column: 1 / -1; text-align: center; padding: 20px;">
                <i class="fas fa-lock"></i> Column settings are managed by the Administrator
            </div>
        `;
        return;
    }
    
    const config = getGradingConfig(me_currentProgram);
    const isNursing = me_currentProgram === 'KRCHN';
    const examMax = isNursing ? 70 : config.EXAM_MAX;
    
    const defaultColumns = [
        { id: 'sno', label: '#', required: true },
        { id: 'admission', label: 'Admission', required: true },
        { id: 'name', label: 'Name', required: true },
        { id: 'cat1', label: `CAT1 (0-${config.CAT1_MAX})`, required: false },
        { id: 'cat2', label: `CAT2 (0-${config.CAT2_MAX})`, required: false },
        { id: 'exam', label: `Exam (0-${examMax})`, required: false },
        { id: 'total', label: 'Total', required: false },
        { id: 'percentage', label: '%', required: false },
        { id: 'grade', label: 'Grade', required: false },
        { id: 'points', label: 'Points', required: false },
        { id: 'status', label: 'Status', required: false },
        { id: 'approval', label: 'Approval', required: false }
    ];
    
    const savedColumns = me_columnSettings.columns || [];
    
    container.innerHTML = `
        <div style="grid-column: 1 / -1; margin-bottom: 8px; display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
            <span style="font-size: 12px; color: #6b7280;">
                <i class="fas fa-globe"></i> These settings apply to ALL users
            </span>
            <span style="background: #4C1D95; color: white; padding: 2px 10px; border-radius: 12px; font-size: 10px; font-weight: 600;">
                <i class="fas fa-shield-alt"></i> ADMIN
            </span>
        </div>
        ${defaultColumns.map(col => {
            const saved = savedColumns.find(c => c.id === col.id);
            const isChecked = saved !== undefined ? saved.visible : col.required;
            const isDisabled = col.required ? 'disabled' : '';
            
            return `
                <div style="display: flex; align-items: center; gap: 8px; padding: 8px 12px; background: #f8fafc; border-radius: 6px; border: 1px solid #e2e8f0; ${col.required ? 'opacity: 0.7;' : ''}">
                    <input type="checkbox" id="me_col_${col.id}" ${isChecked ? 'checked' : ''} ${isDisabled} 
                           style="width: 16px; height: 16px; cursor: ${col.required ? 'not-allowed' : 'pointer'};"
                           onchange="saveUnitColumnSetting('${col.id}', this.checked)">
                    <label for="me_col_${col.id}" style="font-size: 13px; cursor: ${col.required ? 'default' : 'pointer'};">
                        ${col.label}
                        ${col.required ? ' <span style="color: #94a3b8; font-size: 11px;">(required)</span>' : ''}
                    </label>
                </div>
            `;
        }).join('')}
        <div style="grid-column: 1 / -1; margin-top: 8px; display: flex; gap: 10px; flex-wrap: wrap;">
            <button onclick="resetUnitColumns()" style="padding: 6px 16px; background: #6b7280; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 12px;">
                <i class="fas fa-undo"></i> Reset for This Unit
            </button>
        </div>
    `;
}

async function saveUnitColumnSetting(columnId, visible) {
    const unit = me_currentUnit;
    const block = me_currentBlock;
    const year = me_currentYear || '2025';
    
    if (!unit || !block) {
        if (typeof showNotification === 'function') {
            showNotification('No unit selected', 'warning');
        }
        return;
    }
    
    if (!isUserAdmin()) {
        if (typeof showNotification === 'function') {
            showNotification('Only administrators can change column settings', 'error');
        }
        return;
    }
    
    try {
        let columns = me_columnSettings.columns || [];
        const colIndex = columns.findIndex(c => c.id === columnId);
        if (colIndex !== -1) {
            columns[colIndex].visible = visible;
        } else {
            columns.push({ id: columnId, visible: visible });
        }
        
        const { data: existing } = await sb
            .from('column_settings')
            .select('id')
            .eq('block', block)
            .eq('subject', unit)
            .eq('year', year)
            .maybeSingle();
        
        let error;
        if (existing) {
            const { error: updateError } = await sb
                .from('column_settings')
                .update({ columns, updated_at: new Date().toISOString() })
                .eq('id', existing.id);
            error = updateError;
        } else {
            const { error: insertError } = await sb
                .from('column_settings')
                .insert({ block, subject: unit, year, columns, updated_at: new Date().toISOString() });
            error = insertError;
        }
        
        if (error) throw error;
        
        me_columnSettings = { columns };
        if (typeof showNotification === 'function') {
            showNotification(`✅ Column "${columnId}" ${visible ? 'shown' : 'hidden'}`, 'success');
        }
        applyColumnVisibility();
        
        setTimeout(() => {
            recalculateAllTotals();
        }, 100);
        
    } catch (error) {
        console.error('❌ Error saving column:', error);
        if (typeof showNotification === 'function') {
            showNotification('❌ Error saving column: ' + error.message, 'error');
        }
    }
}

function applyColumnVisibility() {
    console.log('📋 Applying column visibility...');
    
    const table = document.querySelector('#me_marks_container table');
    if (!table) {
        console.warn('⚠️ Table not found');
        return;
    }
    
    const savedColumns = me_columnSettings.columns || [];
    
    const headers = table.querySelectorAll('thead th');
    const rows = table.querySelectorAll('tbody tr');
    
    const columnIndexMap = {};
    headers.forEach((th, index) => {
        const text = th.textContent.toLowerCase().trim();
        if (text.includes('cat1') || text.includes('cat 1')) columnIndexMap['cat1'] = index;
        else if (text.includes('cat2') || text.includes('cat 2')) columnIndexMap['cat2'] = index;
        else if (text.includes('exam')) columnIndexMap['exam'] = index;
        else if (text.includes('total')) columnIndexMap['total'] = index;
        else if (text.includes('%')) columnIndexMap['percentage'] = index;
        else if (text.includes('grade')) columnIndexMap['grade'] = index;
        else if (text.includes('points')) columnIndexMap['points'] = index;
        else if (text.includes('status')) columnIndexMap['status'] = index;
        else if (text.includes('#')) columnIndexMap['sno'] = index;
        else if (text.includes('admission')) columnIndexMap['admission'] = index;
        else if (text.includes('name')) columnIndexMap['name'] = index;
        else if (text.includes('approval')) columnIndexMap['approval'] = index;
    });
    
    headers.forEach((th) => {
        const text = th.textContent.toLowerCase().trim();
        let colId = null;
        if (text.includes('cat1') || text.includes('cat 1')) colId = 'cat1';
        else if (text.includes('cat2') || text.includes('cat 2')) colId = 'cat2';
        else if (text.includes('exam')) colId = 'exam';
        else if (text.includes('total')) colId = 'total';
        else if (text.includes('%')) colId = 'percentage';
        else if (text.includes('grade')) colId = 'grade';
        else if (text.includes('points')) colId = 'points';
        else if (text.includes('status')) colId = 'status';
        else if (text.includes('#')) colId = 'sno';
        else if (text.includes('admission')) colId = 'admission';
        else if (text.includes('name')) colId = 'name';
        else if (text.includes('approval')) colId = 'approval';
        
        if (colId) {
            const isRequired = ['sno', 'admission', 'name'].includes(colId);
            const setting = savedColumns.find(c => c.id === colId);
            const visible = isRequired ? true : (setting !== undefined ? setting.visible : true);
            th.style.display = visible ? '' : 'none';
        }
    });
    
    rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        cells.forEach((td, index) => {
            let colId = null;
            for (const [id, idx] of Object.entries(columnIndexMap)) {
                if (idx === index) { colId = id; break; }
            }
            if (colId) {
                const isRequired = ['sno', 'admission', 'name'].includes(colId);
                const setting = savedColumns.find(c => c.id === colId);
                const visible = isRequired ? true : (setting !== undefined ? setting.visible : true);
                td.style.display = visible ? '' : 'none';
            }
        });
    });
}

async function resetUnitColumns() {
    const unit = me_currentUnit;
    const block = me_currentBlock;
    const year = me_currentYear;
    
    if (!unit || !block) {
        if (typeof showNotification === 'function') {
            showNotification('No unit selected', 'warning');
        }
        return;
    }
    
    if (!isUserAdmin()) {
        if (typeof showNotification === 'function') {
            showNotification('Only administrators can reset column settings', 'error');
        }
        return;
    }
    
    if (!confirm(`Reset columns for "${unit}" to default settings?`)) return;
    
    try {
        const { error } = await sb
            .from('column_settings')
            .delete()
            .eq('block', block)
            .eq('subject', unit)
            .eq('year', year);
        
        if (error) throw error;
        
        me_columnSettings = { columns: [] };
        renderUnitColumns();
        if (typeof showNotification === 'function') {
            showNotification(`✅ Columns reset to default for ${unit}`, 'success');
        }
        loadMarksEntry();
        
    } catch (error) {
        console.error('Error resetting columns:', error);
        if (typeof showNotification === 'function') {
            showNotification('❌ Error resetting columns: ' + error.message, 'error');
        }
    }
}

// ============================================================
// LECTURER ASSIGNMENT FUNCTIONS - FIXED
// ============================================================

async function loadLecturerAssignments() {
    console.log('📋 Loading lecturer unit assignments...');
    const block = document.getElementById('me_block_select')?.value;
    const unit = document.getElementById('me_subject_select')?.value;
    const program = document.getElementById('me_program_select')?.value;
    const year = document.getElementById('me_year_select')?.value || '2025';
    const container = document.getElementById('me_lecturer_assignments');
    
    if (!block || !unit) {
        if (container) {
            container.innerHTML = `
                <div style="color: #94a3b8; font-size: 13px; grid-column: 1 / -1; text-align: center; padding: 20px;">
                    <i class="fas fa-info-circle"></i> Select a unit to view lecturer assignments
                </div>
            `;
        }
        return;
    }
    
    if (container) {
        container.innerHTML = '<div style="color: #94a3b8; font-size: 13px; grid-column: 1 / -1; text-align: center; padding: 20px;">Loading assignments...</div>';
    }
    
    try {
        // ✅ FIX: Use consolidated_user_profiles_table with correct columns
        const { data: lecturers, error: lecturerError } = await sb
            .from('consolidated_user_profiles_table')
            .select('user_id, email, full_name, phone, role, program, status, staff_id')
            .eq('role', 'lecturer')
            .in('status', ['active', 'approved'])
            .order('full_name', { ascending: true });
        
        if (lecturerError) throw lecturerError;
        
        const { data: assignments, error: assignError } = await sb
            .from('lecturer_subject_assignments')
            .select('*')
            .eq('block', block)
            .eq('subject_name', unit)
            .eq('program', program)
            .eq('academic_year', year);
        
        if (assignError) throw assignError;
        
        me_currentAssignments = assignments || [];
        const assignedMap = {};
        assignments?.forEach(a => { assignedMap[a.lecturer_id] = a; });
        
        if (!lecturers || lecturers.length === 0) {
            container.innerHTML = `
                <div style="color: #94a3b8; font-size: 13px; grid-column: 1 / -1; text-align: center; padding: 20px;">
                    <i class="fas fa-info-circle"></i> No lecturers found for this program
                </div>
            `;
            return;
        }
        
        let html = '';
        lecturers.forEach(lecturer => {
            const lecturerId = lecturer.user_id || lecturer.staff_id || lecturer.id;
            const isAssigned = !!assignedMap[lecturerId];
            const fullName = lecturer.full_name || 'Unknown';
            
            html += `
                <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; background: ${isAssigned ? '#d1fae5' : '#f8fafc'}; border-radius: 8px; border: 1px solid ${isAssigned ? '#10b981' : '#e2e8f0'};">
                    <div>
                        <strong style="font-size: 13px; color: #1e293b;">${escapeHtml(fullName)}</strong>
                        <span style="font-size: 11px; color: #64748b; display: block;">${lecturer.email || ''}</span>
                        <span style="font-size: 10px; color: #94a3b8;">
                            <span style="background: ${program === 'KRCHN' ? '#dbeafe' : '#fef3c7'}; padding: 2px 8px; border-radius: 4px;">
                                ${program || 'KRCHN'}
                            </span>
                        </span>
                    </div>
                    <div style="display: flex; gap: 8px; align-items: center;">
                        ${isAssigned ? `
                            <span style="background: #10b981; color: white; padding: 2px 10px; border-radius: 12px; font-size: 10px; font-weight: 600;">
                                <i class="fas fa-check"></i> Assigned
                            </span>
                            <button onclick="removeLecturerAssignment('${lecturerId}', '${unit}', '${block}')" style="background: #dc2626; color: white; border: none; border-radius: 4px; padding: 4px 10px; cursor: pointer; font-size: 11px;">
                                <i class="fas fa-times"></i> Remove
                            </button>
                        ` : `
                            <button onclick="assignLecturerToUnit('${lecturerId}', '${fullName}', '${unit}', '${block}')" style="background: #4C1D95; color: white; border: none; border-radius: 4px; padding: 4px 12px; cursor: pointer; font-size: 11px;">
                                <i class="fas fa-user-plus"></i> Assign
                            </button>
                        `}
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = html;
        await loadAssignmentHistory();
        
    } catch (error) {
        console.error('Error loading assignments:', error);
        container.innerHTML = `
            <div style="color: #ef4444; font-size: 13px; grid-column: 1 / -1; text-align: center; padding: 20px;">
                <i class="fas fa-exclamation-circle"></i> Error loading assignments: ${error.message}
            </div>
        `;
    }
}

async function assignLecturerToUnit(lecturerId, lecturerName, unit, block) {
    const program = document.getElementById('me_program_select')?.value;
    const year = document.getElementById('me_year_select')?.value || '2025';
    
    if (!lecturerId || !unit || !block) {
        if (typeof showNotification === 'function') {
            showNotification('Missing required information', 'error');
        }
        return;
    }
    
    try {
        const { error } = await sb
            .from('lecturer_subject_assignments')
            .insert({
                lecturer_id: lecturerId,
                lecturer_name: lecturerName,
                program: program,
                block: block,
                subject_name: unit,
                academic_year: year,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            });
        
        if (error) throw error;
        
        if (typeof showNotification === 'function') {
            showNotification(`✅ ${lecturerName} assigned to "${unit}"`, 'success');
        }
        await loadLecturerAssignments();
        
    } catch (error) {
        console.error('Error assigning lecturer:', error);
        if (typeof showNotification === 'function') {
            showNotification('❌ Error assigning lecturer: ' + error.message, 'error');
        }
    }
}

async function removeLecturerAssignment(lecturerId, unit, block) {
    const program = document.getElementById('me_program_select')?.value;
    const year = document.getElementById('me_year_select')?.value || '2025';
    
    if (!lecturerId || !unit || !block) {
        if (typeof showNotification === 'function') {
            showNotification('Missing required information', 'error');
        }
        return;
    }
    
    let lecturerName = 'this lecturer';
    try {
        const { data: lecturer } = await sb
            .from('consolidated_user_profiles_table')
            .select('full_name')
            .eq('user_id', lecturerId)
            .maybeSingle();
        if (lecturer) {
            lecturerName = lecturer.full_name || 'this lecturer';
        }
    } catch (e) {}
    
    if (!confirm(`⚠️ Remove "${lecturerName}" from "${unit}"?\n\nThis will remove their access to enter marks for this unit.`)) {
        return;
    }
    
    if (typeof showLoading === 'function') showLoading('Removing assignment...');
    
    try {
        const { error } = await sb
            .from('lecturer_subject_assignments')
            .delete()
            .eq('lecturer_id', lecturerId)
            .eq('subject_name', unit)
            .eq('block', block)
            .eq('program', program)
            .eq('academic_year', year);
        
        if (error) throw error;
        
        if (typeof hideLoading === 'function') hideLoading();
        if (typeof showNotification === 'function') {
            showNotification(`✅ "${lecturerName}" removed from "${unit}"`, 'success');
        }
        await loadLecturerAssignments();
        await loadAssignmentHistory();
        
    } catch (error) {
        if (typeof hideLoading === 'function') hideLoading();
        console.error('Error removing assignment:', error);
        if (typeof showNotification === 'function') {
            showNotification('❌ Error removing assignment: ' + error.message, 'error');
        }
    }
}

async function loadAssignmentHistory() {
    console.log('📋 Loading assignment history...');
    const block = document.getElementById('me_block_select')?.value;
    const unit = document.getElementById('me_subject_select')?.value;
    const program = document.getElementById('me_program_select')?.value;
    const year = document.getElementById('me_year_select')?.value || '2025';
    const container = document.getElementById('me_assignment_history');
    
    if (!block || !unit) {
        if (container) {
            container.innerHTML = `
                <div style="text-align: center; padding: 30px; color: #94a3b8; font-size: 13px;">
                    <i class="fas fa-info-circle"></i> Select a unit to view assignment history
                </div>
            `;
        }
        return;
    }
    
    if (container) {
        container.innerHTML = `
            <div style="text-align: center; padding: 20px; color: #94a3b8; font-size: 13px;">
                <div class="loading-spinner"></div>
                Loading assignment history...
            </div>
        `;
    }
    
    try {
        const { data: assignments, error } = await sb
            .from('lecturer_subject_assignments')
            .select('*')
            .eq('block', block)
            .eq('subject_name', unit)
            .eq('program', program)
            .eq('academic_year', year)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        if (!assignments || assignments.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 30px; color: #94a3b8; font-size: 13px;">
                    <i class="fas fa-info-circle"></i> No lecturers assigned to this unit yet
                </div>
            `;
            return;
        }
        
        let html = `
            <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                <thead>
                    <tr style="background: linear-gradient(135deg, #4C1D95, #7c3aed); color: white;">
                        <th style="padding: 10px 12px; text-align: left;">#</th>
                        <th style="padding: 10px 12px; text-align: left;">Lecturer Name</th>
                        <th style="padding: 10px 12px; text-align: left;">Email</th>
                        <th style="padding: 10px 12px; text-align: left;">Program</th>
                        <th style="padding: 10px 12px; text-align: left;">Block</th>
                        <th style="padding: 10px 12px; text-align: left;">Assigned Date</th>
                        <th style="padding: 10px 12px; text-align: center;">Actions</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        for (let i = 0; i < assignments.length; i++) {
            const a = assignments[i];
            const fullName = a.lecturer_name || 'Unknown';
            
            const { data: lecturer } = await sb
                .from('consolidated_user_profiles_table')
                .select('full_name, email')
                .eq('user_id', a.lecturer_id)
                .maybeSingle();
            
            const email = lecturer?.email || a.lecturer_email || 'N/A';
            const programDisplay = a.program || lecturer?.program || 'KRCHN';
            const assignedDate = a.created_at ? new Date(a.created_at).toLocaleDateString() : 'N/A';
            
            html += `
                <tr style="border-bottom: 1px solid #e5e7eb; ${i % 2 === 0 ? 'background: #f8fafc;' : ''}">
                    <td style="padding: 10px 12px;">${i + 1}</td>
                    <td style="padding: 10px 12px; font-weight: 600;">${escapeHtml(fullName)}</td>
                    <td style="padding: 10px 12px;">${escapeHtml(email)}</td>
                    <td style="padding: 10px 12px;">
                        <span style="background: ${programDisplay === 'KRCHN' ? '#d1fae5' : '#fef3c7'}; padding: 2px 10px; border-radius: 12px; font-size: 11px;">
                            ${escapeHtml(programDisplay)}
                        </span>
                    </td>
                    <td style="padding: 10px 12px;">${escapeHtml(block.replace(/_/g, ' '))}</td>
                    <td style="padding: 10px 12px; font-size: 12px; color: #64748b;">${assignedDate}</td>
                    <td style="padding: 10px 12px; text-align: center;">
                        <button onclick="removeLecturerAssignment('${a.lecturer_id}', '${a.subject_name}', '${a.block}')" 
                                style="background: #dc2626; color: white; border: none; border-radius: 4px; padding: 4px 12px; cursor: pointer; font-size: 11px;">
                            <i class="fas fa-times"></i> Drop
                        </button>
                    </td>
                </tr>
            `;
        }
        
        html += `
                </tbody>
            </table>
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 0; margin-top: 10px; font-size: 12px; color: #64748b;">
                <span>📊 Total: ${assignments.length} lecturer(s) assigned</span>
                <span>🔄 Last updated: ${new Date().toLocaleString()}</span>
            </div>
        `;
        
        container.innerHTML = html;
        
    } catch (error) {
        console.error('Error loading assignment history:', error);
        container.innerHTML = `
            <div style="text-align: center; padding: 30px; color: #ef4444; font-size: 13px;">
                <i class="fas fa-exclamation-circle"></i> Error loading assignment history: ${error.message}
            </div>
        `;
    }
}

async function clearAllAssignments() {
    const block = document.getElementById('me_block_select')?.value;
    const unit = document.getElementById('me_subject_select')?.value;
    const program = document.getElementById('me_program_select')?.value;
    const year = document.getElementById('me_year_select')?.value || '2025';
    
    if (!block || !unit) {
        if (typeof showNotification === 'function') {
            showNotification('Please select a unit first', 'warning');
        }
        return;
    }
    
    if (!confirm(`⚠️ Remove ALL lecturers from "${unit}"?\n\nThis will remove all assignments for this unit.`)) {
        return;
    }
    
    if (typeof showLoading === 'function') showLoading('Removing all assignments...');
    
    try {
        const { error } = await sb
            .from('lecturer_subject_assignments')
            .delete()
            .eq('block', block)
            .eq('subject_name', unit)
            .eq('program', program)
            .eq('academic_year', year);
        
        if (error) throw error;
        
        if (typeof hideLoading === 'function') hideLoading();
        if (typeof showNotification === 'function') {
            showNotification(`✅ All assignments removed from "${unit}"`, 'success');
        }
        await loadLecturerAssignments();
        await loadAssignmentHistory();
        
    } catch (error) {
        if (typeof hideLoading === 'function') hideLoading();
        console.error('Error clearing assignments:', error);
        if (typeof showNotification === 'function') {
            showNotification('❌ Error clearing assignments: ' + error.message, 'error');
        }
    }
}

// ============================================================
// STUDENT PUBLISH MODAL FUNCTIONS
// ============================================================

let sp_students = [];
let sp_selected = new Set();

function openStudentPublishModal() {
    const modal = document.getElementById('studentPublishModal');
    if (!modal) {
        if (typeof showNotification === 'function') {
            showNotification('Modal not found', 'error');
        }
        return;
    }
    
    document.getElementById('sp_unit_display').textContent = `Unit: ${me_currentUnit || 'Not selected'}`;
    document.getElementById('sp_block_display').textContent = `Block: ${me_currentBlock || 'Not selected'}`;
    
    loadStudentPublishList();
    modal.style.display = 'flex';
}

function closeStudentPublishModal() {
    document.getElementById('studentPublishModal').style.display = 'none';
}

function loadStudentPublishList() {
    const container = document.getElementById('sp_student_list');
    if (!container) return;
    
    const marks = me_currentMarks || [];
    sp_students = marks;
    sp_selected = new Set();
    
    if (marks.length === 0) {
        container.innerHTML = `
            <tr><td colspan="7" style="padding: 40px; text-align: center; color: #94a3b8;">
                <i class="fas fa-users" style="font-size: 24px; display: block; margin-bottom: 8px;"></i>
                No students found for this unit
            </td></tr>
        `;
        updateStudentPublishStats();
        return;
    }
    
    renderStudentPublishList(marks);
    updateStudentPublishStats();
}

function renderStudentPublishList(marks) {
    const container = document.getElementById('sp_student_list');
    if (!container) return;
    
    const searchTerm = document.getElementById('sp_search')?.value?.toLowerCase() || '';
    
    let filteredMarks = marks;
    if (searchTerm) {
        filteredMarks = marks.filter(m => 
            (m.name || m.student_name || '').toLowerCase().includes(searchTerm) ||
            (m.admission || m.admission_number || '').toLowerCase().includes(searchTerm)
        );
    }
    
    let html = '';
    filteredMarks.forEach((mark, index) => {
        const admission = mark.admission || mark.admission_number || 'N/A';
        const name = mark.name || mark.student_name || 'Unknown';
        const score = mark.percentage || mark.final || mark.final_score || 0;
        const grade = mark.grade || '-';
        const isPublished = mark.published === true;
        const isPassing = score >= 50;
        const isSelected = sp_selected.has(admission);
        const gradeColor = getTVETGradeColor(grade, me_currentProgram);
        
        html += `
            <tr style="border-bottom: 1px solid #e5e7eb; ${index % 2 === 0 ? 'background: #f8fafc;' : ''}">
                <td style="padding: 8px 12px; text-align: center;">
                    <input type="checkbox" class="sp-student-checkbox" data-admission="${admission}" 
                           ${isSelected ? 'checked' : ''} ${isPublished ? 'disabled' : ''}
                           onchange="toggleStudentSelection('${admission}', this.checked)" 
                           style="width: 16px; height: 16px; cursor: ${isPublished ? 'not-allowed' : 'pointer'};">
                </td>
                <td style="padding: 8px 12px; font-weight: 500;">${escapeHtml(name)}</td>
                <td style="padding: 8px 12px; font-size: 12px; color: #64748b;">${escapeHtml(admission)}</td>
                <td style="padding: 8px 12px; text-align: center; font-weight: 600; color: ${isPassing ? '#10b981' : '#dc2626'};">${score}%</td>
                <td style="padding: 8px 12px; text-align: center;">
                    <span style="background: ${gradeColor || '#6b7280'}; color: white; padding: 2px 10px; border-radius: 12px; font-weight: 700; font-size: 12px;">${escapeHtml(grade)}</span>
                </td>
                <td style="padding: 8px 12px; text-align: center;">
                    <span style="color: ${isPassing ? '#10b981' : '#dc2626'}; font-weight: 600; font-size: 12px;">
                        ${isPassing ? '✅ COMPETENT' : '❌ NOT YET COMPETENT'}
                    </span>
                </td>
                <td style="padding: 8px 12px; text-align: center;">
                    <span style="color: ${isPublished ? '#10b981' : '#94a3b8'}; font-weight: 600; font-size: 12px;">
                        ${isPublished ? '✅ Published' : '📝 Draft'}
                    </span>
                    ${isPublished ? `<br><span style="font-size: 10px; color: #94a3b8;">Already published</span>` : ''}
                </td>
            </tr>
        `;
    });
    
    container.innerHTML = html;
    updateStudentPublishStats();
}

function toggleStudentSelection(admission, checked) {
    if (checked) {
        sp_selected.add(admission);
    } else {
        sp_selected.delete(admission);
    }
    updateStudentPublishStats();
}

function selectAllStudents() {
    const checkboxes = document.querySelectorAll('.sp-student-checkbox:not([disabled])');
    checkboxes.forEach(cb => {
        cb.checked = true;
        sp_selected.add(cb.dataset.admission);
    });
    updateStudentPublishStats();
}

function deselectAllStudents() {
    const checkboxes = document.querySelectorAll('.sp-student-checkbox');
    checkboxes.forEach(cb => {
        cb.checked = false;
        sp_selected.delete(cb.dataset.admission);
    });
    updateStudentPublishStats();
}

function selectPassingStudents() {
    const marks = sp_students;
    const config = getGradingConfig(me_currentProgram);
    marks.forEach(m => {
        const score = m.percentage || m.final || m.final_score || 0;
        const admission = m.admission || m.admission_number || '';
        if (score >= config.PASS_MARK && !m.published) {
            sp_selected.add(admission);
        }
    });
    renderStudentPublishList(sp_students);
    updateStudentPublishStats();
}

function selectFailingStudents() {
    const marks = sp_students;
    const config = getGradingConfig(me_currentProgram);
    marks.forEach(m => {
        const score = m.percentage || m.final || m.final_score || 0;
        const admission = m.admission || m.admission_number || '';
        if (score > 0 && score < config.PASS_MARK && !m.published) {
            sp_selected.add(admission);
        }
    });
    renderStudentPublishList(sp_students);
    updateStudentPublishStats();
}

function toggleAllStudentCheckboxes() {
    const selectAll = document.getElementById('sp_select_all');
    const checkboxes = document.querySelectorAll('.sp-student-checkbox:not([disabled])');
    const isChecked = selectAll?.checked || false;
    
    checkboxes.forEach(cb => {
        cb.checked = isChecked;
        if (isChecked) {
            sp_selected.add(cb.dataset.admission);
        } else {
            sp_selected.delete(cb.dataset.admission);
        }
    });
    updateStudentPublishStats();
}

function filterStudentPublishList() {
    renderStudentPublishList(sp_students);
}

function updateStudentPublishStats() {
    const total = sp_students.length;
    const alreadyPublished = sp_students.filter(m => m.published === true).length;
    const selectedCount = sp_selected.size;
    const toPublish = selectedCount;
    
    document.getElementById('sp_total_count').textContent = total;
    document.getElementById('sp_selected_count').textContent = selectedCount;
    document.getElementById('sp_already_published').textContent = alreadyPublished;
    document.getElementById('sp_to_publish').textContent = toPublish;
    document.getElementById('sp_publish_summary').textContent = `${toPublish} students selected for publishing`;
    document.getElementById('sp_publish_btn_count').textContent = toPublish;
    
    const publishBtn = document.getElementById('sp_publish_btn');
    if (publishBtn) {
        publishBtn.disabled = toPublish === 0;
        publishBtn.style.opacity = toPublish === 0 ? '0.5' : '1';
        publishBtn.style.cursor = toPublish === 0 ? 'not-allowed' : 'pointer';
    }
}

async function publishSelectedStudents() {
    const selectedAdmissions = Array.from(sp_selected);
    
    if (selectedAdmissions.length === 0) {
        if (typeof showNotification === 'function') {
            showNotification('No students selected to publish', 'warning');
        }
        return;
    }
    
    const unit = me_currentUnit;
    const block = me_currentBlock;
    const program = me_currentProgram;
    const year = me_currentYear;
    
    if (!unit || !block) {
        if (typeof showNotification === 'function') {
            showNotification('Please select a unit first', 'warning');
        }
        return;
    }
    
    const confirmMsg = `⚠️ Publish marks for ${selectedAdmissions.length} selected students?\n\n` +
        `Unit: ${unit}\n` +
        `Block: ${block}\n` +
        `Program: ${program === 'KRCHN' ? '🎓 KRCHN Nursing' : '🔧 TVET Programs'}\n` +
        `Year: ${year}\n\n` +
        `Only selected students will see their marks.`;
    
    if (!confirm(confirmMsg)) return;
    
    if (typeof showLoading === 'function') {
        showLoading(`Publishing ${selectedAdmissions.length} students...`);
    }
    
    try {
        let successCount = 0;
        let errorCount = 0;
        
        for (const admission of selectedAdmissions) {
            try {
                const { error } = await sb
                    .from('student_marks')
                    .update({
                        published: true,
                        published_at: new Date().toISOString(),
                        published_by: window.currentUser?.id || null
                    })
                    .eq('admission_number', admission)
                    .eq('subject_name', unit)
                    .eq('block', block)
                    .eq('academic_year', year);
                
                if (error) {
                    console.error(`❌ Error publishing ${admission}:`, error);
                    errorCount++;
                } else {
                    successCount++;
                }
            } catch (err) {
                console.error(`❌ Error publishing ${admission}:`, err);
                errorCount++;
            }
        }
        
        if (typeof hideLoading === 'function') hideLoading();
        closeStudentPublishModal();
        
        if (typeof showNotification === 'function') {
            if (errorCount === 0) {
                showNotification(`✅ Published ${successCount} students successfully!`, 'success');
            } else {
                showNotification(`⚠️ Published ${successCount} students, ${errorCount} errors`, 'warning');
            }
        }
        
        loadMarksEntry();
        
        if (typeof window.loadPublishedMarks === 'function') {
            setTimeout(window.loadPublishedMarks, 500);
        }
        
    } catch (error) {
        if (typeof hideLoading === 'function') hideLoading();
        console.error('Error publishing selected students:', error);
        if (typeof showNotification === 'function') {
            showNotification('❌ Error publishing students: ' + error.message, 'error');
        }
    }
}

async function publishCurrentUnitMarks() {
    const unit = me_currentUnit;
    const block = me_currentBlock;
    const program = me_currentProgram;
    const year = me_currentYear;
    const assessmentType = me_currentAssessmentType || 'full';
    
    if (!unit || !block) {
        if (typeof showNotification === 'function') {
            showNotification('Please select a unit first', 'warning');
        }
        return;
    }
    
    const totalMarks = me_currentMarks?.length || 0;
    if (totalMarks === 0) {
        if (typeof showNotification === 'function') {
            showNotification('No marks found for this unit', 'warning');
        }
        return;
    }
    
    const programLabel = program === 'KRCHN' ? '🎓 KRCHN Nursing' : '🔧 TVET Programs';
    const confirmMsg = `⚠️ Publish ALL marks for "${unit}"?\n\n` +
        `Program: ${programLabel}\n` +
        `Block: ${block}\n` +
        `Year: ${year}\n` +
        `Students: ${totalMarks}\n\n` +
        `This will make marks visible to ALL students in this unit.`;
    
    if (!confirm(confirmMsg)) return;
    
    if (typeof showLoading === 'function') {
        showLoading(`Publishing ${totalMarks} marks...`);
    }
    
    try {
        let query = sb
            .from('student_marks')
            .update({
                published: true,
                published_at: new Date().toISOString(),
                published_by: window.currentUser?.id || null
            })
            .eq('subject_name', unit)
            .eq('block', block)
            .eq('academic_year', year);
        
        if (program) {
            query = query.eq('program', program);
        }
        
        if (assessmentType && assessmentType !== 'full') {
            query = query.eq('assessment_type', assessmentType);
        }
        
        const { data, error } = await query;
        
        if (error) throw error;
        
        const count = data?.length || 0;
        
        if (typeof hideLoading === 'function') hideLoading();
        
        if (typeof showNotification === 'function') {
            showNotification(`✅ Published ${count} marks for "${unit}"!`, 'success');
        }
        
        loadMarksEntry();
        
        if (typeof window.loadPublishedMarks === 'function') {
            setTimeout(window.loadPublishedMarks, 500);
        }
        
    } catch (error) {
        if (typeof hideLoading === 'function') hideLoading();
        console.error('Error publishing marks:', error);
        if (typeof showNotification === 'function') {
            showNotification('❌ Error publishing marks: ' + error.message, 'error');
        }
    }
}

// ============================================================
// STUDENT MANAGER FUNCTIONS
// ============================================================

async function openMarksStudentManager() {
    const block = document.getElementById('me_block_select')?.value;
    const unit = document.getElementById('me_subject_select')?.value;
    const program = document.getElementById('me_program_select')?.value;
    const year = document.getElementById('me_year_select')?.value || '2025';
    
    if (!block || !unit) {
        showNotification('Please select a block and unit first', 'warning');
        return;
    }
    
    const modal = document.getElementById('marksStudentManagerModal');
    if (!modal) {
        console.error('❌ marksStudentManagerModal not found');
        showNotification('Modal not found. Please check the HTML.', 'error');
        return;
    }
    
    modal.style.display = 'flex';
    
    const container = document.getElementById('marksStudentManagerBody');
    if (container) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px;">
                <div class="spinner" style="width: 40px; height: 40px; border: 4px solid #e2e8f0; border-top-color: #4C1D95; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto;"></div>
                <p style="color: #6b7280; margin-top: 10px;">Loading student data...</p>
            </div>
            <style>
                @keyframes spin { to { transform: rotate(360deg); } }
            </style>
        `;
    }
    
    await loadMarksStudentManagerData(block, unit, program, year);
}

async function loadMarksStudentManagerData(block, unit, program, year) {
    const container = document.getElementById('marksStudentManagerBody');
    if (!container) return;
    
    console.log('📊 Loading student manager data...');
    
    try {
        const { data: enrolledStudents, error: enrolledError } = await sb
            .from('student_marks')
            .select('*')
            .eq('block', block)
            .eq('subject_name', unit)
            .eq('academic_year', year);
        
        if (enrolledError) throw enrolledError;
        
        const enrolledMap = {};
        enrolledStudents?.forEach(s => {
            if (s.admission_number) {
                enrolledMap[s.admission_number] = true;
            }
        });
        
        let query = sb
            .from('consolidated_user_profiles_table')
            .select('student_id, full_name, email, program, block, admission_number, status')
            .eq('role', 'student');
        
        if (program) query = query.eq('program', program);
        if (block) query = query.eq('block', block);
        
        const { data: profileStudents, error: profileError } = await query;
        if (profileError) throw profileError;
        
        const { data: allMarksStudents, error: marksError } = await sb
            .from('student_marks')
            .select('admission_number, student_name')
            .eq('block', block)
            .eq('academic_year', year);
        
        if (marksError) throw marksError;
        
        const allStudentsMap = {};
        
        profileStudents?.forEach(s => {
            if (s.student_id) {
                allStudentsMap[s.student_id] = {
                    student_id: s.student_id,
                    full_name: s.full_name || 'Unknown',
                    email: s.email || '',
                    program: s.program || program,
                    block: s.block || block,
                    admission_number: s.admission_number || s.student_id,
                    status: s.status || 'active',
                    source: 'profile'
                };
            }
        });
        
        allMarksStudents?.forEach(s => {
            if (s.admission_number && !allStudentsMap[s.admission_number]) {
                allStudentsMap[s.admission_number] = {
                    student_id: s.admission_number,
                    full_name: s.student_name || 'Unknown',
                    email: '',
                    program: program,
                    block: block,
                    admission_number: s.admission_number,
                    status: 'active',
                    source: 'marks'
                };
            }
        });
        
        const allStudents = Object.values(allStudentsMap);
        const availableStudents = allStudents.filter(s => {
            return !enrolledMap[s.student_id] && !enrolledMap[s.admission_number];
        });
        
        me_studentManagerData = {
            allStudents: allStudents,
            enrolledStudents: enrolledStudents || [],
            availableStudents: availableStudents,
            enrolledMap: enrolledMap,
            block: block,
            unit: unit,
            program: program,
            year: year
        };
        
        renderMarksStudentManager();
        
    } catch (error) {
        console.error('❌ Error loading marks student data:', error);
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #ef4444;">
                <i class="fas fa-exclamation-circle" style="font-size: 48px; display: block; margin-bottom: 10px;"></i>
                Error: ${error.message}
            </div>
        `;
    }
}

function renderMarksStudentManager() {
    const container = document.getElementById('marksStudentManagerBody');
    if (!container) return;
    
    const { allStudents, enrolledStudents, availableStudents, block, unit, program, year } = me_studentManagerData;
    const config = getGradingConfig(program);
    
    const totalEnrolled = enrolledStudents?.length || 0;
    const totalAvailable = availableStudents?.length || 0;
    const totalStudents = allStudents?.length || 0;
    
    let studentOptions = '<option value="">-- Select Student to Add --</option>';
    
    if (availableStudents && availableStudents.length > 0) {
        availableStudents.forEach(s => {
            const displayName = s.full_name || 'Unknown';
            const displayId = s.student_id || s.admission_number || 'N/A';
            studentOptions += `<option value="${s.student_id || s.admission_number}">${displayName} (${displayId})</option>`;
        });
    } else {
        studentOptions = '<option value="">No available students</option>';
    }
    
    let html = `
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 15px; margin-bottom: 20px;">
            <div>
                <h4 style="margin: 0; color: #1e293b;">${escapeHtml(unit)}</h4>
                <p style="margin: 4px 0 0 0; color: #64748b; font-size: 13px;">
                    ${escapeHtml(program)} | ${escapeHtml(block)} | ${escapeHtml(year)}
                    <span style="margin-left: 10px; background: ${config.GRADE_TYPE === 'competency' ? '#d1fae5' : '#dbeafe'}; padding: 2px 10px; border-radius: 12px; font-size: 11px;">
                        ${config.GRADE_TYPE === 'competency' ? 'TVET Competency' : 'Nursing Academic'}
                    </span>
                </p>
            </div>
            <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                <span style="background: #dbeafe; color: #1e40af; padding: 4px 12px; border-radius: 20px; font-size: 12px;">
                    📚 ${totalEnrolled} Enrolled
                </span>
                <span style="background: #f3f4f6; color: #6b7280; padding: 4px 12px; border-radius: 20px; font-size: 12px;">
                    👥 ${totalAvailable} Available
                </span>
                <span style="background: #e5e7eb; color: #475569; padding: 4px 12px; border-radius: 20px; font-size: 12px;">
                    📊 ${totalStudents} Total
                </span>
            </div>
        </div>
        
        <div style="background: #f0fdf4; padding: 15px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #86efac;">
            <div style="display: flex; gap: 10px; flex-wrap: wrap; align-items: center;">
                <select id="studentToAddMarks" style="flex: 1; min-width: 200px; padding: 8px 12px; border-radius: 6px; border: 1px solid #ddd; font-size: 13px;">
                    ${studentOptions}
                </select>
                <button onclick="addStudentToMarksUnit()" style="background: #10b981; color: white; border: none; padding: 8px 20px; border-radius: 6px; cursor: pointer; font-weight: 500;">
                    <i class="fas fa-plus"></i> Add Student
                </button>
                ${totalAvailable > 0 ? `
                <button onclick="addAllAvailableStudentsToMarksUnit()" style="background: #059669; color: white; border: none; padding: 8px 20px; border-radius: 6px; cursor: pointer; font-weight: 500;">
                    <i class="fas fa-users"></i> Add All (${totalAvailable})
                </button>
                ` : ''}
            </div>
            ${totalAvailable === 0 && totalStudents > 0 ? `
            <div style="margin-top: 10px; padding: 8px 12px; background: #fef3c7; border-radius: 6px; color: #92400e; font-size: 12px;">
                <i class="fas fa-info-circle"></i> All available students are already enrolled in this unit.
            </div>
            ` : ''}
            ${totalStudents === 0 ? `
            <div style="margin-top: 10px; padding: 8px 12px; background: #fee2e2; border-radius: 6px; color: #991b1b; font-size: 12px;">
                <i class="fas fa-exclamation-circle"></i> No students found. Please check the program and block selection.
            </div>
            ` : ''}
        </div>
        
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; margin-bottom: 15px; padding: 10px 14px; background: #f1f5f9; border-radius: 8px;">
            <div style="display: flex; align-items: center; gap: 12px;">
                <label style="display: flex; align-items: center; gap: 6px; cursor: pointer; font-size: 13px; font-weight: 500;">
                    <input type="checkbox" id="selectAllStudents" onchange="toggleAllStudents()" style="width: 16px; height: 16px; cursor: pointer;">
                    Select All
                </label>
                <span style="font-size: 12px; color: #64748b;">
                    <span id="selectedStudentCount">0</span> selected
                </span>
            </div>
            <div style="display: flex; gap: 8px;">
                <button onclick="dropSelectedStudents()" id="dropSelectedBtn" style="display: none; background: #dc2626; color: white; border: none; padding: 6px 16px; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 500;">
                    <i class="fas fa-user-minus"></i> Drop Selected (<span id="dropSelectedCount">0</span>)
                </button>
            </div>
        </div>
        
        <div style="overflow-x: auto; max-height: 400px; overflow-y: auto;">
            <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                <thead style="position: sticky; top: 0; z-index: 10;">
                    <tr style="background: #1e293b; color: white;">
                        <th style="padding: 8px; text-align: center; width: 35px;">
                            <input type="checkbox" id="selectAllCheckbox" onchange="toggleAllStudentsCheckbox()" style="width: 14px; height: 14px; cursor: pointer;">
                        </th>
                        <th style="padding: 8px; text-align: center;">#</th>
                        <th style="padding: 8px; text-align: left;">Student Name</th>
                        <th style="padding: 8px; text-align: left;">Admission</th>
                        <th style="padding: 8px; text-align: left;">Program</th>
                        <th style="padding: 8px; text-align: left;">Block</th>
                        <th style="padding: 8px; text-align: center;">CAT1</th>
                        <th style="padding: 8px; text-align: center;">CAT2</th>
                        <th style="padding: 8px; text-align: center;">Exam</th>
                        <th style="padding: 8px; text-align: center;">%</th>
                        <th style="padding: 8px; text-align: center;">Grade</th>
                        <th style="padding: 8px; text-align: center;">Points</th>
                        <th style="padding: 8px; text-align: center;">Actions</th>
                    </tr>
                </thead>
                <tbody>
        `;
    
    if (!enrolledStudents || enrolledStudents.length === 0) {
        html += `
            <tr>
                <td colspan="13" style="padding: 30px; text-align: center; color: #94a3b8;">
                    <i class="fas fa-users" style="font-size: 24px; display: block; margin-bottom: 8px;"></i>
                    No students enrolled in this unit yet
                </td>
            </tr>
        `;
    } else {
        enrolledStudents.forEach((s, i) => {
            const admission = s.admission_number || 'N/A';
            const name = s.student_name || 'Unknown';
            const cat1 = s.cat1_score || 0;
            const cat2 = s.cat2_score || 0;
            const exam = s.exam_score || 0;
            
            const result = calculateTVETMarks(cat1, cat2, exam, program);
            const percentage = result.percentage;
            const grade = result.grade;
            const points = result.points;
            const isPassing = result.isPassing;
            const hasMarks = cat1 > 0 || cat2 > 0 || exam > 0;
            
            html += `
                <tr style="border-bottom: 1px solid #e5e7eb; ${i % 2 === 0 ? 'background: #f8fafc;' : ''}">
                    <td style="padding: 8px; text-align: center;">
                        <input type="checkbox" class="student-checkbox" data-admission="${admission}" onchange="updateSelectedCount()" style="width: 14px; height: 14px; cursor: pointer;">
                    </td>
                    <td style="padding: 8px; text-align: center;">${i + 1}</td>
                    <td style="padding: 8px; font-weight: 500;">${escapeHtml(name)}</td>
                    <td style="padding: 8px;">${escapeHtml(admission)}</td>
                    <td style="padding: 8px;">${escapeHtml(program)}</td>
                    <td style="padding: 8px;">${escapeHtml(block)}</td>
                    <td style="padding: 8px; text-align: center;">${cat1 || '-'}</td>
                    <td style="padding: 8px; text-align: center;">${cat2 || '-'}</td>
                    <td style="padding: 8px; text-align: center;">${exam || '-'}</td>
                    <td style="padding: 8px; text-align: center; font-weight: bold; color: ${isPassing ? '#065f46' : (hasMarks ? '#991b1b' : '#94a3b8')};">${hasMarks ? percentage + '%' : '-'}</td>
                    <td style="padding: 8px; text-align: center; font-weight: bold; color: ${isPassing ? '#065f46' : (hasMarks ? '#991b1b' : '#94a3b8')};">${hasMarks ? grade : '-'}</td>
                    <td style="padding: 8px; text-align: center; font-weight: bold;">${hasMarks ? points : '-'}</td>
                    <td style="padding: 8px; text-align: center;">
                        <button onclick="removeStudentFromMarksUnit('${admission}')" 
                                style="background: #dc2626; color: white; border: none; padding: 4px 12px; border-radius: 4px; cursor: pointer; font-size: 11px;">
                            <i class="fas fa-user-minus"></i> Drop
                        </button>
                    </td>
                </tr>
            `;
        });
    }
    
    html += `
                </tbody>
            </table>
        </div>
        
        ${enrolledStudents && enrolledStudents.length > 0 ? `
        <div style="display: flex; gap: 10px; margin-top: 15px; padding-top: 15px; border-top: 1px solid #e5e7eb; flex-wrap: wrap;">
            <button onclick="dropSelectedStudents()" id="dropSelectedBtnBottom" style="display: none; background: #dc2626; color: white; border: none; padding: 8px 20px; border-radius: 6px; cursor: pointer; font-weight: 500;">
                <i class="fas fa-user-minus"></i> Drop Selected (<span id="dropSelectedCountBottom">0</span>)
            </button>
            <button onclick="clearAllStudentsFromMarksUnit()" style="background: #dc2626; color: white; border: none; padding: 8px 20px; border-radius: 6px; cursor: pointer; font-weight: 500;">
                <i class="fas fa-trash"></i> Remove All Students
            </button>
            <button onclick="reloadMarksStudentManager()" style="background: #6b7280; color: white; border: none; padding: 8px 20px; border-radius: 6px; cursor: pointer; font-weight: 500;">
                <i class="fas fa-sync-alt"></i> Refresh
            </button>
        </div>
        ` : ''}
    `;
    
    container.innerHTML = html;
}

async function addStudentToMarksUnit() {
    const select = document.getElementById('studentToAddMarks');
    const studentId = select?.value;
    
    if (!studentId) {
        showNotification('Please select a student to add', 'warning');
        return;
    }
    
    const { block, unit, program, year } = me_studentManagerData;
    
    if (!block || !unit) {
        showNotification('Please select a block and unit first', 'warning');
        return;
    }
    
    const student = me_studentManagerData.availableStudents.find(s => 
        s.student_id === studentId || s.admission_number === studentId
    );
    
    if (!student) {
        showNotification('Student not found in available list', 'error');
        return;
    }
    
    const studentName = student.full_name || 'Unknown';
    const studentAdmission = student.student_id || student.admission_number || studentId;
    
    if (!confirm(`Add ${studentName} to "${unit}"?`)) return;
    
    try {
        const markData = {
            admission_number: studentAdmission,
            student_name: studentName,
            block: block,
            subject_name: unit,
            assessment_type: 'full',
            cat1_score: 0,
            cat2_score: 0,
            exam_score: 0,
            final_score: 0,
            grade: null,
            points: null,
            academic_year: year,
            approval_status: 'draft',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        
        const { error } = await sb
            .from('student_marks')
            .insert(markData);
        
        if (error) throw error;
        
        showNotification(`✅ ${studentName} added to "${unit}"!`, 'success');
        await reloadMarksStudentManager();
        loadMarksEntry();
        
    } catch (error) {
        console.error('❌ Error adding student:', error);
        showNotification('❌ Error: ' + error.message, 'error');
    }
}

async function addAllAvailableStudentsToMarksUnit() {
    const { availableStudents, block, unit, program, year } = me_studentManagerData;
    
    if (availableStudents.length === 0) {
        showNotification('No available students to add', 'info');
        return;
    }
    
    if (!confirm(`Add ${availableStudents.length} students to "${unit}"?`)) return;
    
    try {
        const inserts = availableStudents.map(s => ({
            admission_number: s.student_id || s.admission_number,
            student_name: s.full_name || 'Unknown',
            block: block,
            subject_name: unit,
            assessment_type: 'full',
            cat1_score: 0,
            cat2_score: 0,
            exam_score: 0,
            final_score: 0,
            grade: null,
            points: null,
            academic_year: year,
            approval_status: 'draft',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        }));
        
        const { error } = await sb
            .from('student_marks')
            .insert(inserts);
        
        if (error) throw error;
        
        showNotification(`✅ ${availableStudents.length} students added to "${unit}"!`, 'success');
        await reloadMarksStudentManager();
        loadMarksEntry();
        
    } catch (error) {
        console.error('❌ Error adding students:', error);
        showNotification('❌ Error: ' + error.message, 'error');
    }
}

async function reloadMarksStudentManager() {
    const { block, unit, program, year } = me_studentManagerData;
    await loadMarksStudentManagerData(block, unit, program, year);
}

async function removeStudentFromMarksUnit(admission) {
    const { block, unit, year } = me_studentManagerData;
    
    if (!block || !unit) {
        showNotification('Please select a block and unit first', 'warning');
        return;
    }
    
    let studentName = 'this student';
    try {
        const { data: student } = await sb
            .from('consolidated_user_profiles_table')
            .select('full_name')
            .eq('student_id', admission)
            .single();
        if (student) studentName = student.full_name;
    } catch (e) {}
    
    if (!confirm(`⚠️ Remove "${studentName}" from "${unit}"?\n\nTheir marks will be permanently deleted.`)) return;
    
    if (typeof showLoading === 'function') showLoading('Removing student...');
    
    try {
        const { error } = await sb
            .from('student_marks')
            .delete()
            .eq('admission_number', admission)
            .eq('block', block)
            .eq('subject_name', unit)
            .eq('academic_year', year);
        
        if (error) throw error;
        
        if (typeof hideLoading === 'function') hideLoading();
        showNotification(`✅ ${studentName} removed from "${unit}"`, 'success');
        await reloadMarksStudentManager();
        loadMarksEntry();
        
    } catch (error) {
        if (typeof hideLoading === 'function') hideLoading();
        console.error('❌ Error removing student:', error);
        showNotification('❌ Error: ' + error.message, 'error');
    }
}

async function clearAllStudentsFromMarksUnit() {
    const { block, unit, year } = me_studentManagerData;
    
    if (!block || !unit) {
        showNotification('Please select a block and unit first', 'warning');
        return;
    }
    
    if (!confirm(`⚠️ Remove ALL students from "${unit}"?\n\nThis will delete ALL marks for this unit.`)) return;
    
    if (typeof showLoading === 'function') showLoading('Removing all students...');
    
    try {
        const { error } = await sb
            .from('student_marks')
            .delete()
            .eq('block', block)
            .eq('subject_name', unit)
            .eq('academic_year', year);
        
        if (error) throw error;
        
        if (typeof hideLoading === 'function') hideLoading();
        showNotification(`✅ All students removed from "${unit}"`, 'success');
        await reloadMarksStudentManager();
        loadMarksEntry();
        
    } catch (error) {
        if (typeof hideLoading === 'function') hideLoading();
        console.error('❌ Error clearing students:', error);
        showNotification('❌ Error: ' + error.message, 'error');
    }
}

async function dropSelectedStudents() {
    const checkboxes = document.querySelectorAll('.student-checkbox:checked');
    const selected = Array.from(checkboxes).map(cb => cb.dataset.admission);
    
    if (selected.length === 0) {
        showNotification('No students selected', 'warning');
        return;
    }
    
    if (!confirm(`⚠️ Remove ${selected.length} selected students from "${me_studentManagerData.unit}"?\n\nTheir marks will be permanently deleted.`)) return;
    
    if (typeof showLoading === 'function') showLoading(`Removing ${selected.length} students...`);
    
    try {
        let removed = 0;
        let errors = 0;
        
        for (const admission of selected) {
            const { error } = await sb
                .from('student_marks')
                .delete()
                .eq('admission_number', admission)
                .eq('block', me_studentManagerData.block)
                .eq('subject_name', me_studentManagerData.unit)
                .eq('academic_year', me_studentManagerData.year);
            
            if (error) {
                console.error('❌ Error removing:', admission, error);
                errors++;
            } else {
                removed++;
            }
        }
        
        if (typeof hideLoading === 'function') hideLoading();
        
        if (errors > 0) {
            showNotification(`⚠️ Removed ${removed} students, ${errors} errors`, 'warning');
        } else {
            showNotification(`✅ ${removed} students removed from "${me_studentManagerData.unit}"`, 'success');
        }
        
        await reloadMarksStudentManager();
        loadMarksEntry();
        
    } catch (error) {
        if (typeof hideLoading === 'function') hideLoading();
        console.error('❌ Error removing students:', error);
        showNotification('❌ Error: ' + error.message, 'error');
    }
}

function toggleAllStudents() {
    const selectAll = document.getElementById('selectAllStudents');
    const checkboxes = document.querySelectorAll('.student-checkbox');
    const isChecked = selectAll?.checked || false;
    checkboxes.forEach(cb => cb.checked = isChecked);
    updateSelectedCount();
}

function toggleAllStudentsCheckbox() {
    const selectAll = document.getElementById('selectAllCheckbox');
    const checkboxes = document.querySelectorAll('.student-checkbox');
    const isChecked = selectAll?.checked || false;
    checkboxes.forEach(cb => cb.checked = isChecked);
    updateSelectedCount();
}

function updateSelectedCount() {
    const checkboxes = document.querySelectorAll('.student-checkbox:checked');
    const count = checkboxes.length;
    
    document.getElementById('selectedStudentCount').textContent = count;
    document.getElementById('dropSelectedCount').textContent = count;
    document.getElementById('dropSelectedCountBottom').textContent = count;
    
    const dropBtn = document.getElementById('dropSelectedBtn');
    const dropBtnBottom = document.getElementById('dropSelectedBtnBottom');
    
    if (dropBtn) dropBtn.style.display = count > 0 ? 'inline-block' : 'none';
    if (dropBtnBottom) dropBtnBottom.style.display = count > 0 ? 'inline-block' : 'none';
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
// NOTIFICATION FUNCTIONS
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
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            const msg = document.getElementById('loadingMessage');
            if (msg) msg.textContent = message;
            overlay.style.display = 'flex';
        }
    };
}

if (typeof hideLoading === 'undefined') {
    window.hideLoading = function() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) overlay.style.display = 'none';
    };
}

// ============================================================
// GLOBAL REGISTRATION
// ============================================================

// Grading functions
window.GRADING_CONFIG = GRADING_CONFIG;
window.getProgramType = getProgramType;
window.getGradingConfig = getGradingConfig;
window.calculateTVETMarks = calculateTVETMarks;
window.getTVETGrade = getTVETGrade;
window.getMarksEntryGrade = getMarksEntryGrade;
window.calculateMarksEntryTotal = calculateMarksEntryTotal;
window.getTVETGradeColor = getTVETGradeColor;
window.getTVETGradeBgColor = getTVETGradeBgColor;

// Dynamic column functions
window.detectVisibleColumns = detectVisibleColumns;
window.getAssessmentTypeFromColumns = getAssessmentTypeFromColumns;
window.getMaxPossible = getMaxPossible;
window.getAssessmentTypeLabel = getAssessmentTypeLabel;

// Main functions
window.loadMEBlocks = loadMEBlocks;
window.loadMEUnits = loadMEUnits;
window.loadMarksEntry = loadMarksEntry;
window.renderMarksEntryTable = renderMarksEntryTable;
window.updateMarksEntryRow = updateMarksEntryRow;
window.updateMarksEntryStats = updateMarksEntryStats;
window.saveMarksEntry = saveMarksEntry;
window.exportMarksEntry = exportMarksEntry;
window.exportAllMarksData = exportAllMarksData;
window.downloadCSV = downloadCSV;
window.refreshMarksData = refreshMarksData;
window.showGradingSystemInfo = showGradingSystemInfo;
window.recalculateAllTotals = recalculateAllTotals;
window.updateGradingDisplay = updateGradingDisplay;
window.updateSelectedProgramDisplay = updateSelectedProgramDisplay;
window.updateAssessmentTypeDisplay = updateAssessmentTypeDisplay;

// Column management
window.loadUnitColumnSettings = loadUnitColumnSettings;
window.renderUnitColumns = renderUnitColumns;
window.saveUnitColumnSetting = saveUnitColumnSetting;
window.applyColumnVisibility = applyColumnVisibility;
window.resetUnitColumns = resetUnitColumns;
window.isUserAdmin = isUserAdmin;

// Lecturer assignment
window.loadLecturerAssignments = loadLecturerAssignments;
window.assignLecturerToUnit = assignLecturerToUnit;
window.removeLecturerAssignment = removeLecturerAssignment;
window.loadAssignmentHistory = loadAssignmentHistory;
window.refreshAssignmentHistory = refreshAssignmentHistory;
window.clearAllAssignments = clearAllAssignments;

// Publish functions
window.publishCurrentUnitMarks = publishCurrentUnitMarks;
window.openStudentPublishModal = openStudentPublishModal;
window.closeStudentPublishModal = closeStudentPublishModal;
window.loadStudentPublishList = loadStudentPublishList;
window.renderStudentPublishList = renderStudentPublishList;
window.toggleStudentSelection = toggleStudentSelection;
window.selectAllStudents = selectAllStudents;
window.deselectAllStudents = deselectAllStudents;
window.selectPassingStudents = selectPassingStudents;
window.selectFailingStudents = selectFailingStudents;
window.toggleAllStudentCheckboxes = toggleAllStudentCheckboxes;
window.filterStudentPublishList = filterStudentPublishList;
window.updateStudentPublishStats = updateStudentPublishStats;
window.publishSelectedStudents = publishSelectedStudents;

// Student management
window.openMarksStudentManager = openMarksStudentManager;
window.loadMarksStudentManagerData = loadMarksStudentManagerData;
window.reloadMarksStudentManager = reloadMarksStudentManager;
window.renderMarksStudentManager = renderMarksStudentManager;
window.addStudentToMarksUnit = addStudentToMarksUnit;
window.addAllAvailableStudentsToMarksUnit = addAllAvailableStudentsToMarksUnit;
window.removeStudentFromMarksUnit = removeStudentFromMarksUnit;
window.clearAllStudentsFromMarksUnit = clearAllStudentsFromMarksUnit;
window.dropSelectedStudents = dropSelectedStudents;
window.toggleAllStudents = toggleAllStudents;
window.toggleAllStudentsCheckbox = toggleAllStudentsCheckbox;
window.updateSelectedCount = updateSelectedCount;

// Utility
window.escapeHtml = escapeHtml;

console.log('✅ TVET & Nursing Marks Entry System FULLY LOADED with Dynamic Column Support!');
console.log('📊 When you add/drop columns, calculations automatically update!');
console.log('📋 TVET: E(0-49%) → C(50-64%) → B(65-79%) → A(80-100%) | Points: E=0, C=2, B=3, A=4');
console.log('📋 Nursing: D(0-59%) → C(60-64%) → B(65-74%) → A(75-100%) | Points: D=0.0, C=2.0, B=3.0, A=4.0');
console.log('📊 Assessment Types: Full, Single CAT, Exam Only, CATs Only, CAT1 Only, CAT2 Only');

// Initialize selected program display on page load
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(function() {
        updateSelectedProgramDisplay();
        const program = document.getElementById('me_program_select')?.value;
        if (program) {
            updateGradingDisplay(program);
        }
    }, 300);
});

// ============================================================
// FORCE OVERRIDE
// ============================================================

console.log('🔧 Force overriding getProgramType from script.js...');

window.NURSING_PROGRAMS = ['KRCHN'];

window.getProgramType = function(programCode) {
    if (!programCode) return 'TVET';
    if (window.NURSING_PROGRAMS && window.NURSING_PROGRAMS.includes(programCode)) {
        return 'NURSING';
    }
    return 'TVET';
};

window.getGradingConfig = function(programCode) {
    if (programCode === 'KRCHN') {
        return window.GRADING_CONFIG.NURSING;
    }
    return window.GRADING_CONFIG.TVET;
};

console.log('🧪 getProgramType("KRCHN"):', window.getProgramType('KRCHN'));
console.log('🧪 getGradingConfig("KRCHN").EXAM_MAX:', window.getGradingConfig('KRCHN').EXAM_MAX);

console.log('✅ Marks Entry functions forcefully registered!');
