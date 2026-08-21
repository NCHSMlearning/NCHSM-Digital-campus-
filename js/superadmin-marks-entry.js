// ============================================================
// STATE
// ============================================================
const getSupabase = () => window.sb || window.supabase || null;
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
// LOADING SCREEN FUNCTIONS - ADD THIS HERE
// ============================================================

function showLoadingScreen(message, title = 'Loading...') {
    let overlay = document.getElementById('loadingOverlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'loadingOverlay';
        overlay.style.cssText = `
            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.5); z-index: 99999;
            display: none; justify-content: center; align-items: center;
            flex-direction: column; gap: 16px;
        `;
        overlay.innerHTML = `
            <div style="background: white; padding: 30px 40px; border-radius: 16px; text-align: center; min-width: 200px;">
                <div style="width: 40px; height: 40px; border: 4px solid #e2e8f0; border-top-color: #4C1D95; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto;"></div>
                <p id="loadingMessage" style="color: #1e293b; font-weight: 600; margin-top: 12px;">Loading...</p>
                <div style="margin-top: 10px; background: #e5e7eb; border-radius: 8px; height: 6px; overflow: hidden; width: 100%;">
                    <div id="loadingProgress" style="height: 100%; background: linear-gradient(90deg, #4C1D95, #7c3aed); width: 0%; transition: width 0.3s ease; border-radius: 8px;"></div>
                </div>
                <div style="display: flex; justify-content: space-between; margin-top: 8px; font-size: 11px; color: #94a3b8;">
                    <span id="step1Text">Initializing...</span>
                    <span id="step2Text">Loading data...</span>
                    <span id="step3Text">Processing...</span>
                    <span id="step4Text">Rendering...</span>
                </div>
                <style>
                    @keyframes spin {
                        to { transform: rotate(360deg); }
                    }
                </style>
            </div>
        `;
        document.body.appendChild(overlay);
    }
    
    overlay.style.display = 'flex';
    const msgEl = document.getElementById('loadingMessage');
    if (msgEl) msgEl.textContent = message || 'Loading...';
    
    const progressEl = document.getElementById('loadingProgress');
    if (progressEl) progressEl.style.width = '0%';
    
    resetLoadingSteps();
    console.log(`⏳ Loading: ${message}`);
}

function updateLoadingProgress(percent, step = null, stepText = null) {
    const progressEl = document.getElementById('loadingProgress');
    if (progressEl) {
        progressEl.style.width = Math.min(percent, 100) + '%';
    }
    
    if (step && stepText) {
        updateLoadingStep(step, stepText);
    }
}

function updateLoadingStep(step, text) {
    const stepMap = {
        1: { el: 'step1Text' },
        2: { el: 'step2Text' },
        3: { el: 'step3Text' },
        4: { el: 'step4Text' }
    };
    
    const s = stepMap[step];
    if (!s) return;
    
    const textEl = document.getElementById(s.el);
    if (textEl) {
        textEl.textContent = text;
        textEl.style.color = '#1e293b';
        textEl.style.fontWeight = '600';
    }
    
    for (let i = 1; i < step; i++) {
        const prev = stepMap[i];
        if (prev) {
            const prevEl = document.getElementById(prev.el);
            if (prevEl) {
                prevEl.style.color = '#059669';
                prevEl.style.fontWeight = '600';
            }
        }
    }
}

function resetLoadingSteps() {
    const steps = ['step1Text', 'step2Text', 'step3Text', 'step4Text'];
    const texts = ['Initializing...', 'Loading data...', 'Processing...', 'Rendering...'];
    steps.forEach((id, index) => {
        const el = document.getElementById(id);
        if (el) {
            el.textContent = texts[index] || '...';
            el.style.color = index === 0 ? '#1e293b' : '#94a3b8';
            el.style.fontWeight = index === 0 ? '600' : '400';
        }
    });
}

function hideLoadingScreen() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.style.display = 'none';
    }
    console.log('✅ Loading complete');
}

function showLoading(message) {
    showLoadingScreen(message, 'Loading...');
}

function hideLoading() {
    hideLoadingScreen();
}

// ============================================================
// RETAKE/SUPPLEMENTARY STATE - THIS COMES AFTER
// ============================================================

let me_retakeData = {};
let me_currentRetakeStudent = null;
let me_currentRetakeUnit = null;
const MAX_RETAKES = 2;

// ============================================================
// PROGRAM TYPE DETECTION
// ============================================================

function isTVETProgram() {
    const program = me_currentProgram || document.getElementById('me_program_select')?.value || '';
    return program !== 'KRCHN' && program !== 'nursing' && program !== 'Nursing' && program !== '';
}

function isNursingProgram() {
    const program = me_currentProgram || document.getElementById('me_program_select')?.value || '';
    return program === 'KRCHN' || program === 'nursing' || program === 'Nursing';
}

function getExamMax() {
    return isNursingProgram() ? 70 : 100;
}

function getTotalMax() {
    return isNursingProgram() ? 130 : 160;
}

function getPassingThreshold() {
    return isNursingProgram() ? 60 : 50;
}

function getProgramTypeLabel() {
    return isNursingProgram() ? '📕 NURSING' : '📘 TVET';
}

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
// DETECT VISIBLE COLUMNS
// ============================================================

function detectVisibleColumns() {
    console.log('🔍 Detecting visible columns...');
    
    const table = document.querySelector('#me_marks_table');
    if (!table) {
        console.warn('⚠️ Table not found, using defaults');
        return { hasCat1: true, hasCat2: true, hasExam: true };
    }
    
    const headers = table.querySelectorAll('thead th');
    let hasCat1 = false;
    let hasCat2 = false;
    let hasExam = false;
    
    const savedColumns = me_columnSettings.columns || [];
    const savedCat1 = savedColumns.find(c => c.id === 'cat1');
    const savedCat2 = savedColumns.find(c => c.id === 'cat2');
    const savedExam = savedColumns.find(c => c.id === 'exam');
    
    if (savedCat1 !== undefined) {
        hasCat1 = savedCat1.visible !== false;
        console.log(`📋 Saved CAT1: ${hasCat1 ? 'visible' : 'hidden'}`);
    }
    if (savedCat2 !== undefined) {
        hasCat2 = savedCat2.visible !== false;
        console.log(`📋 Saved CAT2: ${hasCat2 ? 'visible' : 'hidden'}`);
    }
    if (savedExam !== undefined) {
        hasExam = savedExam.visible !== false;
        console.log(`📋 Saved Exam: ${hasExam ? 'visible' : 'hidden'}`);
    }
    
    if (savedCat1 === undefined || savedCat2 === undefined || savedExam === undefined) {
        headers.forEach((th, index) => {
            const text = th.textContent.toLowerCase().trim();
            const computedDisplay = window.getComputedStyle(th).display;
            const inlineDisplay = th.style.display;
            const isVisible = inlineDisplay !== 'none' && computedDisplay !== 'none';
            
            if (savedCat1 === undefined && (text.includes('cat1') || text.includes('cat 1'))) {
                hasCat1 = isVisible;
            }
            if (savedCat2 === undefined && (text.includes('cat2') || text.includes('cat 2'))) {
                hasCat2 = isVisible;
            }
            if (savedExam === undefined && text.includes('exam')) {
                hasExam = isVisible;
            }
        });
    }
    
    if (savedCat1 === undefined && !hasCat1) hasCat1 = true;
    if (savedCat2 === undefined && !hasCat2) hasCat2 = true;
    if (savedExam === undefined && !hasExam) hasExam = true;
    
    const result = { hasCat1, hasCat2, hasExam };
    console.log('📊 Final detection result:', result);
    
    return result;
}

// ============================================================
// GET AUTO ASSESSMENT TYPE
// ============================================================

function getAutoAssessmentType() {
    const visible = detectVisibleColumns();
    console.log('📊 Visible columns for assessment:', visible);
    
    if (visible.hasExam && !visible.hasCat1 && !visible.hasCat2) {
        console.log('📋 → exam_only');
        return 'exam_only';
    }
    
    if (visible.hasCat1 && !visible.hasCat2 && !visible.hasExam) {
        console.log('📋 → cat_only (CAT1 only)');
        return 'cat_only';
    }
    
    if (!visible.hasCat1 && visible.hasCat2 && !visible.hasExam) {
        console.log('📋 → cat_only (CAT2 only)');
        return 'cat_only';
    }
    
    if (visible.hasCat1 && visible.hasCat2 && !visible.hasExam) {
        console.log('📋 → cats_only');
        return 'cats_only';
    }
    
    if (visible.hasCat1 && !visible.hasCat2 && visible.hasExam) {
        console.log('📋 → single_cat (CAT1 + Exam)');
        return 'single_cat';
    }
    
    if (!visible.hasCat1 && visible.hasCat2 && visible.hasExam) {
        console.log('📋 → single_cat (CAT2 + Exam)');
        return 'single_cat';
    }
    
    console.log('📋 → full (default)');
    return 'full';
}

// ============================================================
// GET ASSESSMENT TYPE LABEL
// ============================================================

function getAssessmentTypeLabel(type) {
    const isTVET = isTVETProgram();
    
    const labels = {
        'full': isTVET ? 'Full (CAT1+CAT2+Exam) - 160 total' : 'Full (CAT1+CAT2+Exam) - 130 total',
        'single_cat': isTVET ? 'Single CAT (CAT+Exam) - 130 total' : 'Single CAT (CAT+Exam) - out of 100',
        'exam_only': isTVET ? 'Exam Only - out of 100' : 'Exam Only - out of 70',
        'cats_only': 'CAT1+CAT2 Only - out of 60',
        'cat_only': 'CAT Only - out of 30'
    };
    return labels[type] || type;
}

// ============================================================
// UPDATE ASSESSMENT TYPE DISPLAY
// ============================================================

function updateAssessmentTypeDisplay() {
    const autoType = getAutoAssessmentType();
    const label = getAssessmentTypeLabel(autoType);
    
    const labelEl = document.getElementById('autoAssessmentTypeLabel');
    if (labelEl) {
        labelEl.textContent = label;
    }
    
    const assessmentSelect = document.getElementById('me_assessment_type');
    if (assessmentSelect) {
        assessmentSelect.value = autoType;
    }
    
    me_currentAssessmentType = autoType;
}

// ============================================================
// ✅ NURSING CALCULATION - ORIGINAL WORKING FORMULA
// ============================================================

// ============================================================
// ✅ NURSING CALCULATION - FIXED FOR exam_only
// ============================================================

function calculateNursingTotal(cat1, cat2, exam, type) {
    let total = 0;
    
    // Clamp values
    const c1 = Math.min(Math.max(cat1 || 0, 0), 30);
    const c2 = Math.min(Math.max(cat2 || 0, 0), 30);
    let e = Math.min(Math.max(exam || 0, 0), 100); // ✅ FIX: Allow up to 100 for exam_only
    
    switch(type) {
        case 'full':
            // CAT1+CAT2 = 60% of total, Exam = 40% of total
            // Exam should be out of 70 for full assessment
            e = Math.min(e, 70); // Clamp to 70 for full mode
            total = Math.round(((c1 + c2) / 60 * 30 + e) * 10) / 10;
            break;
            
        case 'single_cat':
            // CAT + Exam (both out of 100)
            total = Math.round((c1 + e) * 10) / 10;
            break;
            
        case 'exam_only':
            // ✅ FIX: Exam is out of 100 (percentage-based)
            total = Math.round(e * 10) / 10;
            break;
            
        case 'cats_only':
            // CAT1 + CAT2 only (out of 100)
            total = Math.round(((c1 + c2) / 60) * 100 * 10) / 10;
            break;
            
        case 'cat_only':
            // CAT1 only (out of 100)
            total = Math.round((c1 / 30) * 100 * 10) / 10;
            break;
            
        default:
            e = Math.min(e, 70); // Clamp to 70 for default full mode
            total = Math.round(((c1 + c2) / 60 * 30 + e) * 10) / 10;
    }
    
    return Math.min(total, 100);
}

// ============================================================
// ✅ TVET CALCULATION - FIXED (Total 160)
// ============================================================

function calculateTVETTotal(cat1, cat2, exam, type) {
    let total = 0;
    
    // Clamp values
    const c1 = Math.min(Math.max(cat1 || 0, 0), 30);
    const c2 = Math.min(Math.max(cat2 || 0, 0), 30);
    const e = Math.min(Math.max(exam || 0, 0), 100);  // ✅ Exam max is 100 for TVET!
    
    switch(type) {
        case 'full':
            // ✅ TVET: CAT1+CAT2+Exam = 160 total
            // Convert to percentage: (sum / 160) * 100
            total = ((c1 + c2 + e) / 160) * 100;
            break;
            
        case 'single_cat':
            // ✅ TVET: CAT+Exam = 130 total (30 + 100)
            total = ((c1 + e) / 130) * 100;
            break;
            
        case 'exam_only':
            // ✅ Exam only - out of 100
            total = e;
            break;
            
        case 'cats_only':
            // ✅ CAT1+CAT2 only = 60 total
            total = ((c1 + c2) / 60) * 100;
            break;
            
        case 'cat_only':
            // ✅ CAT only = 30 total
            total = (c1 / 30) * 100;
            break;
            
        default:
            // ✅ Default: full mode
            total = ((c1 + c2 + e) / 160) * 100;
    }
    
    // Round to 1 decimal place and cap at 100
    return Math.min(Math.round(total * 10) / 10, 100);
}
// ============================================================
// ✅ UNIFIED CALCULATION - Nursing + TVET
// ============================================================

function calculateMarksEntryTotal(cat1, cat2, exam, type) {
    if (isTVETProgram()) {
        return calculateTVETTotal(cat1, cat2, exam, type);
    } else {
        return calculateNursingTotal(cat1, cat2, exam, type);
    }
}

// ============================================================
// ✅ NURSING GRADING - ORIGINAL WORKING FORMULA
// ============================================================

function getNursingGrade(score) {
    if (score >= 75) {
        return { 
            grade: 'A', 
            rating: 'Distinction', 
            points: 4.0, 
            color: '#065f46', 
            bgColor: '#d1fae5' 
        };
    } else if (score >= 65) {
        return { 
            grade: 'B', 
            rating: 'Credit', 
            points: 3.0, 
            color: '#1e40af', 
            bgColor: '#dbeafe' 
        };
    } else if (score >= 60) {
        return { 
            grade: 'C', 
            rating: 'Pass', 
            points: 2.0, 
            color: '#92400e', 
            bgColor: '#fef3c7' 
        };
    } else {
        return { 
            grade: 'D', 
            rating: 'Fail', 
            points: 0.0, 
            color: '#991b1b', 
            bgColor: '#fee2e2' 
        };
    }
}

// ============================================================
// ✅ TVET COMPETENCY-BASED GRADING - FIXED
// ============================================================

function getTVETGrade(score) {
    if (score === null || score === undefined || score === 0) {
        return { 
            grade: 'E', 
            rating: 'NOT YET COMPETENT',  // ✅ TVET rating
            points: 0.0,
            color: '#991b1b', 
            bgColor: '#fee2e2' 
        };
    }
    
    if (score >= 80 && score <= 100) {
        return { 
            grade: 'A', 
            rating: 'MASTERY',  // ✅ TVET rating - NOT "Distinction"!
            points: 4.0,
            color: '#065f46', 
            bgColor: '#d1fae5' 
        };
    } else if (score >= 65 && score <= 79) {
        return { 
            grade: 'B', 
            rating: 'PROFICIENT',  // ✅ TVET rating - NOT "Credit"!
            points: 3.0,
            color: '#1e40af', 
            bgColor: '#dbeafe' 
        };
    } else if (score >= 50 && score <= 64) {
        return { 
            grade: 'C', 
            rating: 'COMPETENT',  // ✅ TVET rating - NOT "Pass"!
            points: 2.0,
            color: '#92400e', 
            bgColor: '#fef3c7' 
        };
    } else if (score >= 0 && score <= 49) {
        return { 
            grade: 'E', 
            rating: 'NOT YET COMPETENT',  // ✅ TVET rating
            points: 0.0,
            color: '#991b1b', 
            bgColor: '#fee2e2' 
        };
    }
    
    return { 
        grade: 'E', 
        rating: 'NOT YET COMPETENT', 
        points: 0.0,
        color: '#94a3b8', 
        bgColor: '#f1f5f9' 
    };
}

// ============================================================
// ✅ NURSING GRADING - ORIGINAL (Unchanged)
// ============================================================

function getNursingGrade(score) {
    if (score >= 75) {
        return { 
            grade: 'A', 
            rating: 'Distinction', 
            points: 4.0, 
            color: '#065f46', 
            bgColor: '#d1fae5' 
        };
    } else if (score >= 65) {
        return { 
            grade: 'B', 
            rating: 'Credit', 
            points: 3.0, 
            color: '#1e40af', 
            bgColor: '#dbeafe' 
        };
    } else if (score >= 60) {
        return { 
            grade: 'C', 
            rating: 'Pass', 
            points: 2.0, 
            color: '#92400e', 
            bgColor: '#fef3c7' 
        };
    } else {
        return { 
            grade: 'D', 
            rating: 'Fail', 
            points: 0.0, 
            color: '#991b1b', 
            bgColor: '#fee2e2' 
        };
    }
}
function getMarksEntryGrade(score) {
    // ✅ Check if TVET or Nursing
    if (isTVETProgram()) {
        return getTVETGrade(score);  // ✅ This should be called
    } else {
        return getNursingGrade(score);
    }
}

// ============================================================
// ✅ ADD TVET GRADE HELPER FUNCTIONS
// ============================================================

function calculateTVETGrade(score) {
    if (score === null || score === undefined || score === 0) return 'E';
    if (score >= 80) return 'A';
    if (score >= 65) return 'B';
    if (score >= 50) return 'C';
    return 'E';  // ✅ FIXED: E instead of FAIL
}

function calculateTVETPoints(grade) {
    if (!grade) return 0;
    var points = {
        'A': 4.0,
        'B': 3.0,
        'C': 2.0,
        'E': 0.0   // ✅ FIXED: E gets 0 points
    };
    return points[grade] || 0;
}

function getTVETStatus(score) {
    if (score === null || score === undefined || score === 0) return 'NOT YET COMPETENT';
    if (score >= 80) return 'MASTERY';
    if (score >= 65) return 'PROFICIENT';
    if (score >= 50) return 'COMPETENT';
    return 'NOT YET COMPETENT';
}

function getTVETComment(score) {
    if (score === null || score === undefined || score === 0) return 'FAIL';
    if (score >= 80) return 'EXCELLENT';
    if (score >= 65) return 'GOOD';
    if (score >= 50) return 'SATISFACTORY';
    return 'FAIL';
}

// ============================================================
// ✅ CORRECT CALCULATE GRADE FUNCTION
// ============================================================

function calculateGrade(score, program) {
    if (score === null || score === undefined || score === 0) {
        // ✅ TVET gets E, Nursing gets D
        return isTVETProgram() ? 'E' : 'D';
    }
    
    if (isTVETProgram()) {
        // ✅ TVET Grading
        if (score >= 80) return 'A';
        if (score >= 65) return 'B';
        if (score >= 50) return 'C';
        return 'E';  // ✅ FIXED: E for TVET below 50%
    } else {
        // ✅ Nursing Grading
        if (score >= 75) return 'A';
        if (score >= 65) return 'B';
        if (score >= 60) return 'C';
        return 'D';
    }
}
// ============================================================
// ✅ RETAKE/SUPPLEMENTARY FUNCTIONS
// ============================================================

async function loadRetakeData(block, unit, year) {
    try {
        const { data, error } = await sb
            .from('student_retakes')
            .select('*')
            .eq('block', block)
            .eq('subject_name', unit)
            .eq('academic_year', year)
            .order('attempt_number', { ascending: true });
        
        if (error) throw error;
        
        const retakeMap = {};
        data?.forEach(retake => {
            const key = retake.admission_number;
            if (!retakeMap[key]) retakeMap[key] = [];
            retakeMap[key].push(retake);
        });
        
        me_retakeData = retakeMap;
        console.log(`📊 Loaded retake data for ${Object.keys(retakeMap).length} students`);
        return retakeMap;
        
    } catch (error) {
        console.error('Error loading retake data:', error);
        return {};
    }
}

// ============================================================
// RECORD RETAKE EXAM - WITH AUTO-UNPUBLISH
// ============================================================

async function recordRetakeExam(admission, studentName, unit, block, program, year, examScore, remarks) {
    // Get current retake count
    const existingRetakes = me_retakeData[admission] || [];
    const attemptNumber = existingRetakes.length + 1;
    
    if (attemptNumber > MAX_RETAKES) {
        showNotification(`⚠️ Maximum retakes (${MAX_RETAKES}) reached for this student`, 'error');
        return false;
    }
    
    // Calculate total and grade
    const cat1 = 0; // Retake only uses exam score
    const cat2 = 0;
    const assessmentType = 'exam_only';
    const total = calculateMarksEntryTotal(cat1, cat2, examScore, assessmentType);
    const gradeInfo = getMarksEntryGrade(total);
    const isPassing = total >= getPassingThreshold();
    
    const retakeData = {
        admission_number: admission,
        student_name: studentName,
        block: block,
        subject_name: unit,
        program: program,
        academic_year: year,
        attempt_number: attemptNumber,
        exam_score: examScore,
        total_score: total,
        grade: gradeInfo.grade,
        status: isPassing ? 'PASS' : 'FAIL',
        remarks: remarks || `Retake attempt #${attemptNumber}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    };
    
    try {
        // Insert retake record
        const { error } = await sb
            .from('student_retakes')
            .insert(retakeData);
        
        if (error) throw error;
        
        // ✅ STEP 1: Check if marks were published
        const { data: existingMark, error: fetchError } = await sb
            .from('student_marks')
            .select('published, approval_status')
            .eq('admission_number', admission)
            .eq('subject_name', unit)
            .eq('block', block)
            .eq('academic_year', year)
            .maybeSingle();
        
        if (fetchError) {
            console.warn('Could not fetch existing mark status:', fetchError);
        }
        
        // ✅ STEP 2: Build update data
        const updateData = {
            retake_count: attemptNumber,
            retake_score: examScore,
            retake_grade: gradeInfo.grade,
            retake_status: isPassing ? 'PASS' : 'FAIL',
            retake_date: new Date().toISOString(),
            final_grade: isPassing ? gradeInfo.grade : null,
            final_status: isPassing ? 'PASS' : 'FAIL',
            updated_at: new Date().toISOString()
        };
        
        // ✅ STEP 3: If marks were published, UNPUBLISH them
        if (existingMark && existingMark.published === true) {
            updateData.published = false;
            updateData.published_at = null;
            updateData.published_by = null;
            updateData.unpublished_at = new Date().toISOString();
            updateData.unpublished_reason = 'Retake recorded - needs re-publishing';
            
            // If approval_status was 'approved', reset to 'draft' for review
            if (existingMark.approval_status === 'approved') {
                updateData.approval_status = 'draft';
            }
            
            console.log(`🔓 Unpublished marks for ${studentName} (${admission}) - retake recorded, needs re-publishing`);
        }
        
        // ✅ STEP 4: Update student_marks
        const { error: updateError } = await sb
            .from('student_marks')
            .update(updateData)
            .eq('admission_number', admission)
            .eq('subject_name', unit)
            .eq('block', block)
            .eq('academic_year', year);
        
        if (updateError) {
            console.warn('Could not update student_marks with retake info:', updateError);
        }
        
        // ✅ STEP 5: Log the action
        try {
            const logData = {
                block: block,
                subject: unit,
                academic_year: year,
                action: existingMark && existingMark.published === true ? 'retake_unpublished' : 'retake_recorded',
                action_by: window.currentUser?.id || null,
                action_by_name: window.currentUser?.full_name || window.currentUser?.name || 'System',
                admission: admission,
                student_name: studentName,
                retake_attempt: attemptNumber,
                retake_score: examScore,
                created_at: new Date().toISOString()
            };
            
            if (existingMark && existingMark.published === true) {
                logData.reason = `Retake recorded (attempt #${attemptNumber}) - marks auto-unpublished for re-review`;
            } else {
                logData.reason = `Retake recorded (attempt #${attemptNumber})`;
            }
            
            await sb
                .from('mark_approval_logs')
                .insert(logData);
        } catch (logError) {
            console.warn('Could not save approval log:', logError);
        }
        
        // ✅ STEP 6: Refresh retake data
        await loadRetakeData(block, unit, year);
        
        // ✅ STEP 7: Show notification
        let message = `✅ Retake recorded for ${studentName} (Attempt #${attemptNumber})`;
        if (existingMark && existingMark.published === true) {
            message += ' 🔓 Marks auto-unpublished - please review and re-publish';
        }
        showNotification(message, 'success');
        
        return true;
        
    } catch (error) {
        console.error('Error recording retake:', error);
        showNotification('❌ Error recording retake: ' + error.message, 'error');
        return false;
    }
}
function getRetakeBadge(retakeCount, isPassing) {
    if (retakeCount === 0) return '';
    
    const color = isPassing ? '#059669' : '#dc2626';
    const icon = isPassing ? '✅' : '❌';
    const text = isPassing ? 'Passed' : 'Failed';
    
    return `<span style="display: inline-block; margin-left: 6px; background: ${color}; color: white; font-size: 9px; padding: 2px 10px; border-radius: 10px; font-weight: 700;">
        ⭐ R${retakeCount} ${icon}
    </span>`;
}

function getRetakeHistoryDisplay(retakes) {
    if (!retakes || retakes.length === 0) return 'First attempt';
    
    let html = '<div style="font-size: 11px; line-height: 1.4;">';
    retakes.forEach((r, i) => {
        const isPass = r.status === 'PASS';
        html += `<div style="display: flex; align-items: center; gap: 4px; ${i > 0 ? 'margin-top: 2px;' : ''}">`;
        html += `<span style="color: #94a3b8;">#${r.attempt_number}:</span>`;
        html += `<span style="font-weight: 600; color: ${isPass ? '#059669' : '#dc2626'};">${r.exam_score}%</span>`;
        html += `<span style="color: ${isPass ? '#059669' : '#dc2626'};">${isPass ? '✅' : '❌'}</span>`;
        html += `</div>`;
    });
    html += '</div>';
    return html;
}

// ============================================================
// OPEN RETAKE MODAL
// ============================================================

function openRetakeModal(admission, name, unit, block) {
    const modal = document.getElementById('retakeModal');
    if (!modal) {
        // Create modal if it doesn't exist
        createRetakeModal();
        setTimeout(() => openRetakeModal(admission, name, unit, block), 100);
        return;
    }
    
    const retakes = me_retakeData[admission] || [];
    const attemptNumber = retakes.length + 1;
    
    document.getElementById('retake_student_name').textContent = name;
    document.getElementById('retake_admission').textContent = admission;
    document.getElementById('retake_unit').textContent = unit;
    document.getElementById('retake_block').textContent = block.replace(/_/g, ' ');
    document.getElementById('retake_attempt').textContent = attemptNumber;
    document.getElementById('retake_max_attempts').textContent = MAX_RETAKES;
    
    // Show attempt history
    const historyContainer = document.getElementById('retake_history');
    if (historyContainer) {
        if (retakes.length > 0) {
            let historyHtml = '<div style="margin-top: 10px; padding: 10px; background: #f8fafc; border-radius: 6px;">';
            historyHtml += '<p style="font-weight: 600; margin: 0 0 8px 0; font-size: 13px; color: #475569;">📋 Attempt History:</p>';
            retakes.forEach((r, i) => {
                const isPass = r.status === 'PASS';
                historyHtml += `<div style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid #e5e7eb; font-size: 12px;">
                    <span>Attempt #${r.attempt_number}</span>
                    <span style="font-weight: 600; color: ${isPass ? '#059669' : '#dc2626'};">${r.exam_score}%</span>
                    <span style="color: ${isPass ? '#059669' : '#dc2626'};">${r.status}</span>
                    <span style="color: #94a3b8; font-size: 10px;">${new Date(r.created_at).toLocaleDateString()}</span>
                </div>`;
            });
            historyHtml += '</div>';
            historyContainer.innerHTML = historyHtml;
            historyContainer.style.display = 'block';
        } else {
            historyContainer.style.display = 'none';
        }
    }
    
    // Store current retake info
    me_currentRetakeStudent = { admission, name };
    me_currentRetakeUnit = unit;
    
    // Clear previous input
    document.getElementById('retake_score').value = '';
    document.getElementById('retake_remarks').value = '';
    
    modal.style.display = 'flex';
}

function closeRetakeModal() {
    document.getElementById('retakeModal').style.display = 'none';
}

// ============================================================
// SAVE RETAKE EXAM - ENHANCED WITH AUTO-UNPUBLISH FEEDBACK
// ============================================================

async function saveRetakeExam() {
    const scoreInput = document.getElementById('retake_score');
    const remarksInput = document.getElementById('retake_remarks');
    
    const examScore = parseFloat(scoreInput?.value);
    const remarks = remarksInput?.value || '';
    
    // ✅ Validate score
    if (isNaN(examScore) || examScore < 0 || examScore > 100) {
        showNotification('⚠️ Please enter a valid score between 0 and 100', 'warning');
        return;
    }
    
    // ✅ Validate student selected
    if (!me_currentRetakeStudent) {
        showNotification('⚠️ No student selected', 'error');
        return;
    }
    
    // ✅ Confirm before saving
    const studentName = me_currentRetakeStudent.name;
    const confirmMsg = `⚠️ Record retake for ${studentName}?\n\n` +
        `Score: ${examScore}%\n` +
        `Unit: ${me_currentRetakeUnit}\n` +
        `Block: ${me_currentBlock}\n\n` +
        `This will update the student's marks.`;
    
    if (!confirm(confirmMsg)) {
        return;
    }
    
    // ✅ Show loading
    if (typeof showLoading === 'function') {
        showLoading(`Recording retake for ${studentName}...`);
    }
    
    try {
        const { admission, name } = me_currentRetakeStudent;
        const unit = me_currentRetakeUnit;
        const block = me_currentBlock;
        const program = me_currentProgram;
        const year = me_currentYear;
        
        // ✅ Check if marks were published before recording retake
        let wasPublished = false;
        try {
            const { data: existingMark } = await sb
                .from('student_marks')
                .select('published')
                .eq('admission_number', admission)
                .eq('subject_name', unit)
                .eq('block', block)
                .eq('academic_year', year)
                .maybeSingle();
            
            wasPublished = existingMark?.published === true;
        } catch (e) {
            console.warn('Could not check publish status:', e);
        }
        
        // ✅ Record the retake
        const success = await recordRetakeExam(admission, name, unit, block, program, year, examScore, remarks);
        
        // ✅ Hide loading
        if (typeof hideLoading === 'function') {
            hideLoading();
        }
        
        if (success) {
            // ✅ Close modal
            closeRetakeModal();
            
            // ✅ Show success message with auto-unpublish warning if applicable
            if (wasPublished) {
                showNotification(
                    `✅ Retake recorded for ${name} (${examScore}%) 🔓 Marks were auto-unpublished. Please review and re-publish.`,
                    'warning'
                );
            } else {
                showNotification(
                    `✅ Retake recorded for ${name} (${examScore}%)`,
                    'success'
                );
            }
            
            // ✅ Refresh the marks table
            setTimeout(() => {
                loadMarksEntry();
            }, 500);
        }
        
    } catch (error) {
        // ✅ Hide loading on error
        if (typeof hideLoading === 'function') {
            hideLoading();
        }
        console.error('❌ Error saving retake:', error);
        showNotification('❌ Error saving retake: ' + error.message, 'error');
    }
}

function createRetakeModal() {
    const modalHTML = `
    <div id="retakeModal" style="display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 100000; align-items: center; justify-content: center;">
        <div style="background: white; border-radius: 16px; max-width: 500px; width: 90%; max-height: 90vh; overflow-y: auto; padding: 30px; box-shadow: 0 20px 60px rgba(0,0,0,0.3);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h3 style="margin: 0; color: #1e293b;">
                    <i class="fas fa-sync-alt" style="color: #f59e0b;"></i> Supplementary/Retake Exam
                </h3>
                <button onclick="closeRetakeModal()" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #94a3b8;">&times;</button>
            </div>
            
            <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #f59e0b;">
                <p style="margin: 0 0 4px 0;"><strong>Student:</strong> <span id="retake_student_name"></span></p>
                <p style="margin: 0 0 4px 0;"><strong>Admission:</strong> <span id="retake_admission"></span></p>
                <p style="margin: 0 0 4px 0;"><strong>Unit:</strong> <span id="retake_unit"></span></p>
                <p style="margin: 0 0 4px 0;"><strong>Block:</strong> <span id="retake_block"></span></p>
                <p style="margin: 0;"><strong>Attempt:</strong> #<span id="retake_attempt"></span> of <span id="retake_max_attempts"></span></p>
            </div>
            
            <div id="retake_history" style="display: none;"></div>
            
            <div style="margin-bottom: 15px;">
                <label style="font-weight: 600; display: block; margin-bottom: 5px;">Exam Score (%)</label>
                <input type="number" id="retake_score" min="0" max="100" step="0.5" 
                       style="width: 100%; padding: 10px; border-radius: 6px; border: 1px solid #e2e8f0; font-size: 14px;" 
                       placeholder="Enter score (0-100)">
            </div>
            
            <div style="margin-bottom: 20px;">
                <label style="font-weight: 600; display: block; margin-bottom: 5px;">Remarks (Optional)</label>
                <input type="text" id="retake_remarks" 
                       style="width: 100%; padding: 10px; border-radius: 6px; border: 1px solid #e2e8f0; font-size: 14px;" 
                       placeholder="e.g., Improvement shown, Second attempt">
            </div>
            
            <div style="display: flex; gap: 10px; justify-content: flex-end;">
                <button onclick="closeRetakeModal()" style="padding: 10px 24px; background: #6b7280; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">
                    Cancel
                </button>
                <button onclick="saveRetakeExam()" style="padding: 10px 24px; background: #f59e0b; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">
                    <i class="fas fa-save"></i> Save Retake
                </button>
            </div>
        </div>
    </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

// ============================================================
// RECALCULATE ALL TOTALS
// ============================================================

function recalculateAllTotals() {
    const assessmentType = me_currentAssessmentType;
    const rows = document.querySelectorAll('#me_marks_container table tbody tr');
    
    rows.forEach((row, index) => {
        const cat1Input = document.getElementById(`me_cat1_${index}`);
        const cat2Input = document.getElementById(`me_cat2_${index}`);
        const examInput = document.getElementById(`me_exam_${index}`);
        
        const cat1 = parseFloat(cat1Input?.value) || 0;
        const cat2 = parseFloat(cat2Input?.value) || 0;
        const exam = parseFloat(examInput?.value) || 0;
        
        const total = calculateMarksEntryTotal(cat1, cat2, exam, assessmentType);
        const gradeInfo = getMarksEntryGrade(total);
        const passingThreshold = getPassingThreshold();
        const isPassing = total >= passingThreshold;
        
        const totalEl = document.getElementById(`me_total_${index}`);
        if (totalEl) {
            totalEl.textContent = total > 0 ? total : '--';
            totalEl.style.color = isPassing ? '#065f46' : (total > 0 ? '#991b1b' : '#f59e0b');
        }
        
        const gradeEl = document.getElementById(`me_grade_${index}`);
        if (gradeEl) {
            gradeEl.textContent = total > 0 ? gradeInfo.grade : '--';
            gradeEl.style.color = gradeInfo.color;
        }
        
        const pointsEl = document.getElementById(`me_points_${index}`);
        if (pointsEl) {
            pointsEl.textContent = total > 0 ? gradeInfo.points.toFixed(1) : '--';
            pointsEl.style.color = gradeInfo.color;
        }
        
        const ratingEl = document.getElementById(`me_rating_${index}`);
        if (ratingEl) {
            if (total > 0) {
                ratingEl.innerHTML = `<span style="background: ${isPassing ? '#d1fae5' : '#fee2e2'}; padding: 3px 12px; border-radius: 12px; color: ${isPassing ? '#065f46' : '#991b1b'}; font-weight: 600; display: inline-block;">${gradeInfo.rating}</span>`;
            } else {
                ratingEl.innerHTML = '<span style="color: #94a3b8;">PENDING</span>';
            }
        }
        
        if (me_currentMarks && me_currentMarks[index]) {
            me_currentMarks[index].cat1 = cat1;
            me_currentMarks[index].cat2 = cat2;
            me_currentMarks[index].exam = exam;
            me_currentMarks[index].assessmentType = assessmentType;
        }
    });
    
    updateMarksEntryStats(me_currentMarks, assessmentType);
    updateAssessmentTypeDisplay();
    
    console.log(`✅ Recalculated all totals with assessment type: ${assessmentType}`);
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
}

// ============================================================
// LOAD UNITS - FIXED
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
    
    me_currentProgram = program;  // ✅ ADD THIS LINE
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
}
// ============================================================
// LOAD MARKS ENTRY - FIXED
// ============================================================

async function loadMarksEntry() {
    const program = document.getElementById('me_program_select')?.value;
    const block = document.getElementById('me_block_select')?.value;
    const unit = document.getElementById('me_subject_select')?.value;
    const year = document.getElementById('me_year_select')?.value;
    const unitSelect = document.getElementById('me_subject_select');
    const selectedOption = unitSelect.options[unitSelect.selectedIndex];
    const assessmentType = selectedOption?.dataset?.assessment || 'full';
    const unitCode = selectedOption?.dataset?.code || '';
    
    const dynamicContent = document.getElementById('marksEntryDynamicContent');
    const placeholder = document.getElementById('marksEntryPlaceholder');
    const container = document.getElementById('me_marks_container');
    
    if (!program || !block || !unit) {
        if (dynamicContent) dynamicContent.style.display = 'none';
        if (placeholder) placeholder.style.display = 'block';
        if (container) {
            container.innerHTML = `
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
    
    if (container) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px;">
                <div class="loading-spinner"></div>
                <p style="color: #6b7280; margin-top: 10px;">Loading marks for ${unitCode || unit}...</p>
            </div>
        `;
    }
    
    try {
        await loadRetakeData(block, unit, year);
        
        const { data: marks, error: marksError } = await sb
            .from('student_marks')
            .select('*')
            .eq('block', block)
            .eq('subject_name', unit)
            .eq('academic_year', year);
        
        if (marksError) throw marksError;
        
        console.log(`📊 Found ${marks?.length || 0} enrolled students for ${unit}`);
        
        if (!marks || marks.length === 0) {
            if (container) {
                container.innerHTML = `
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
            updateMarksEntryStats([], assessmentType);
            return;
        }
        
        const admissions = marks.map(m => m.admission_number);
        const { data: students, error: studentError } = await sb
            .from('consolidated_user_profiles_table')
            .select('student_id, full_name, block, intake_year, program')
            .eq('role', 'student')
            .in('student_id', admissions);
        
        if (studentError) {
            console.warn('⚠️ Could not fetch student names:', studentError);
        }
        
        const studentMap = {};
        students?.forEach(s => {
            studentMap[s.student_id] = s.full_name || 'Unknown';
        });
        
        const fullMarks = marks.map(m => {
            const admission = m.admission_number || '';
            const retakes = me_retakeData[admission] || [];
            const hasRetake = retakes.length > 0;
            const lastRetake = retakes[retakes.length - 1];
            
            return {
                admission: admission,
                name: studentMap[admission] || m.student_name || 'Unknown',
                program: program,
                cat1: m.cat1_score || 0,
                cat2: m.cat2_score || 0,
                exam: m.exam_score || 0,
                final: m.final_score || 0,
                grade: m.grade || '',
                gradedBy: m.graded_by || '',
                assessmentType: m.assessment_type || assessmentType,
                id: m.id || null,
                approval_status: m.approval_status || 'draft',
                published: m.published || false,
                hasRetake: hasRetake,
                retakeCount: retakes.length,
                retakeScore: lastRetake?.exam_score || null,
                retakeGrade: lastRetake?.grade || null,
                retakeStatus: lastRetake?.status || null,
                retakeHistory: retakes
            };
        });
        
        console.log(`📊 Displaying ${fullMarks.length} enrolled students`);
        
        me_currentMarks = fullMarks;
        
        // ✅ CHANGE THIS LINE - PASS THE PROGRAM
        renderMarksEntryTable(fullMarks, unitCode, assessmentType, program);
        
        updateMarksEntryStats(fullMarks, assessmentType);
        
        await loadUnitColumnSettings();
        updateAssessmentTypeDisplay();
        
    } catch (error) {
        console.error('Error loading marks:', error);
        if (container) {
            container.innerHTML = `
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
// RENDER MARKS ENTRY TABLE - FULLY FIXED
// ============================================================

function renderMarksEntryTable(marks, unitCode, assessmentType, program) {
    const container = document.getElementById('me_marks_container');
    if (!container) return;
    
    // ✅ Use passed program, fallback to me_currentProgram or select element
    let currentProgram = program || me_currentProgram || '';
    if (!currentProgram) {
        const select = document.getElementById('me_program_select');
        currentProgram = select?.value || '';
    }
    
    const isTVET = currentProgram !== 'KRCHN' && currentProgram !== 'nursing' && currentProgram !== 'Nursing';
    const examMaxDisplay = isTVET ? 100 : 70;  // ✅ TVET = 100, Nursing = 70
    const passingThreshold = isTVET ? 50 : 60;  // ✅ TVET = 50, Nursing = 60
    const programLabel = isTVET ? '📘 TVET' : '📕 NURSING';
    const isAdmin = isUserAdmin();
    
    const showCat1 = assessmentType !== 'exam_only';
    const showCat2 = assessmentType === 'full' || assessmentType === 'cats_only';
    const showExam = assessmentType !== 'cats_only' && assessmentType !== 'cat_only';
    
    let html = `
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; margin-bottom: 16px;">
            <div>
                <h3 style="margin: 0; color: #0f172a;">${unitCode || me_currentUnit}</h3>
                <span style="font-size: 12px; color: #64748b;">${currentProgram} | ${me_currentBlock?.replace(/_/g, ' ') || ''} | ${me_currentYear}</span>
                <span style="font-size: 12px; color: #64748b; margin-left: 12px; background: #e0f2fe; padding: 2px 12px; border-radius: 40px;">${programLabel}</span>
                <span style="font-size: 12px; color: #64748b; margin-left: 12px; background: #e0f2fe; padding: 2px 12px; border-radius: 40px;">👥 ${marks.length} students</span>
                <span style="font-size: 12px; color: #f59e0b; margin-left: 12px; background: #fef3c7; padding: 2px 12px; border-radius: 40px;">⭐ Retakes: ${marks.filter(m => m.hasRetake).length}</span>
                ${isAdmin ? `<span style="font-size: 12px; color: #8b5cf6; margin-left: 12px; background: #ede9fe; padding: 2px 12px; border-radius: 40px;">👑 Admin Mode</span>` : ''}
            </div>
            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                <button onclick="openMarksStudentManager()" class="btn-action" style="background: #4C1D95; padding: 8px 16px; border: none; border-radius: 6px; color: white; cursor: pointer; font-weight: 600;">
                    <i class="fas fa-users"></i> Manage Students
                </button>
                <button onclick="saveMarksEntry()" class="btn-action" style="background: #059669; padding: 8px 16px; border: none; border-radius: 6px; color: white; cursor: pointer; font-weight: 600;">
                    <i class="fas fa-save"></i> Save All
                </button>
                <button onclick="exportMarksEntry()" class="btn-action" style="background: #4C1D95; padding: 8px 16px; border: none; border-radius: 6px; color: white; cursor: pointer; font-weight: 600;">
                    <i class="fas fa-file-export"></i> Export CSV
                </button>
                <button onclick="loadMarksEntry()" class="btn-action" style="background: #6b7280; padding: 8px 16px; border: none; border-radius: 6px; color: white; cursor: pointer; font-weight: 600;">
                    <i class="fas fa-sync-alt"></i> Refresh
                </button>
                ${isAdmin ? `
                <button onclick="resetUnitColumns()" class="btn-action" style="background: #6b7280; padding: 8px 16px; border: none; border-radius: 6px; color: white; cursor: pointer; font-weight: 600;">
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
                        ${showCat1 ? `<th style="padding: 10px 8px; text-align: center;">CAT1 (0-30)</th>` : ''}
                        ${showCat2 ? `<th style="padding: 10px 8px; text-align: center;">CAT2 (0-30)</th>` : ''}
                        ${showExam ? `<th style="padding: 10px 8px; text-align: center;">Exam (0-${examMaxDisplay})</th>` : ''}
                        <th style="padding: 10px 8px; text-align: center;">Total (%)</th>
                        <th style="padding: 10px 8px; text-align: center;">Grade</th>
                        <th style="padding: 10px 8px; text-align: center;">Points</th>
                        <th style="padding: 10px 8px; text-align: center;">Rating</th>
                        <th style="padding: 10px 8px; text-align: center;">Retake</th>
                        ${isAdmin ? '<th style="padding: 10px 8px; text-align: center;">Approval</th>' : ''}
                    </tr>
                </thead>
                <tbody>`;
    
    marks.forEach((m, i) => {
        const cat1 = parseFloat(m.cat1) || 0;
        const cat2 = parseFloat(m.cat2) || 0;
        const exam = parseFloat(m.exam) || 0;
        const total = calculateMarksEntryTotal(cat1, cat2, exam, assessmentType);
        const gradeInfo = getMarksEntryGrade(total);
        const isPassing = total >= passingThreshold;
        const displayTotal = total > 0 ? total : '--';
        const displayGrade = total > 0 ? gradeInfo.grade : '--';
        const displayPoints = total > 0 ? gradeInfo.points.toFixed(1) : '--';
        
        const retakeHistory = m.retakeHistory || [];
        const hasRetake = m.hasRetake || false;
        const retakeCount = m.retakeCount || 0;
        const retakeScore = m.retakeScore;
        const retakeStatus = m.retakeStatus;
        const isRetakePassing = retakeStatus === 'PASS';
        
        const needsRetake = total > 0 && !isPassing && retakeCount < MAX_RETAKES;
        const maxRetakesReached = total > 0 && !isPassing && retakeCount >= MAX_RETAKES;
        
        let rowStyle = '';
        if (hasRetake && isRetakePassing) {
            rowStyle = 'background: linear-gradient(90deg, #f0fdf4, #dcfce7); border-left: 4px solid #059669;';
        } else if (hasRetake && !isRetakePassing) {
            rowStyle = 'background: linear-gradient(90deg, #fef2f2, #fee2e2); border-left: 4px solid #dc2626;';
        } else if (needsRetake) {
            rowStyle = 'background: linear-gradient(90deg, #fffbeb, #fef3c7); border-left: 4px solid #f59e0b;';
        } else if (maxRetakesReached) {
            rowStyle = 'background: linear-gradient(90deg, #fef2f2, #fee2e2); border-left: 4px solid #dc2626;';
        }
        
        const approvalBadge = {
            'pending': '<span style="background:#fef3c7;color:#92400e;padding:2px 8px;border-radius:12px;font-size:10px;">⏳ Pending</span>',
            'approved': '<span style="background:#d1fae5;color:#065f46;padding:2px 8px;border-radius:12px;font-size:10px;">✅ Approved</span>',
            'rejected': '<span style="background:#fee2e2;color:#991b1b;padding:2px 8px;border-radius:12px;font-size:10px;">❌ Rejected</span>',
            'draft': '<span style="background:#e5e7eb;color:#6b7280;padding:2px 8px;border-radius:12px;font-size:10px;">📝 Draft</span>'
        }[m.approval_status] || '<span style="background:#e5e7eb;color:#6b7280;padding:2px 8px;border-radius:12px;font-size:10px;">📝 Draft</span>';
        
        // ✅ RETAKE ACTIONS - FULLY FIXED (No duplicate condition)
        let retakeActionsHtml = '';

        if (isPassing) {
            retakeActionsHtml = `
                <span style="color: #059669; font-size: 11px; font-weight: 600;">✅ Passed</span>
            `;
        } else if (hasRetake) {
            retakeActionsHtml = `
                <div style="font-size: 10px; margin-bottom: 4px;">
                    <span style="color: #dc2626; font-weight: 600;">
                        ❌ Failed (${retakeCount} attempt${retakeCount > 1 ? 's' : ''})
                    </span>
                    ${retakeScore !== null && retakeScore !== undefined ? `
                        <span style="display: block; font-size: 9px; color: #64748b;">Score: ${retakeScore}%</span>
                    ` : ''}
                </div>
                <button onclick="openRetakeModal('${m.admission}', '${m.name}', '${me_currentUnit}', '${me_currentBlock}')" 
                        style="background: #3b82f6; color: white; border: none; padding: 3px 10px; border-radius: 4px; cursor: pointer; font-size: 9px; font-weight: 600; width: 100%; margin-top: 2px;">
                    <i class="fas fa-edit"></i> Edit Retake
                </button>
            `;
            
            if (retakeCount < MAX_RETAKES) {
                retakeActionsHtml += `
                    <button onclick="openRetakeModal('${m.admission}', '${m.name}', '${me_currentUnit}', '${me_currentBlock}')" 
                            style="background: #f59e0b; color: white; border: none; padding: 3px 10px; border-radius: 4px; cursor: pointer; font-size: 9px; font-weight: 600; width: 100%; margin-top: 2px;">
                        <i class="fas fa-sync-alt"></i> Add Retake
                    </button>
                `;
            } else {
                retakeActionsHtml += `
                    <span style="color: #dc2626; font-size: 8px; font-weight: 600; display: block; text-align: center; margin-top: 2px;">
                        ⛔ Max retakes reached
                    </span>
                `;
            }
        } else {
            retakeActionsHtml = `
                <button onclick="openRetakeModal('${m.admission}', '${m.name}', '${me_currentUnit}', '${me_currentBlock}')" 
                        style="background: #f59e0b; color: white; border: none; padding: 3px 10px; border-radius: 4px; cursor: pointer; font-size: 9px; font-weight: 600; width: 100%; margin-top: 2px;">
                    <i class="fas fa-sync-alt"></i> Add Retake
                </button>
            `;
        }

        // ✅ NO duplicate condition here - retakeActionsHtml is already correct!

        html += `<tr style="${rowStyle}">
            <td style="padding: 8px 6px; text-align: center; font-size: 12px; color: #94a3b8;">${i + 1}</td>
            <td style="padding: 8px 8px; font-weight: 500; font-size: 12px;">${m.admission || 'N/A'}</td>
            <td style="padding: 8px 8px;">
                <strong>${m.name || 'Unknown'}</strong>
                ${hasRetake ? `
                    <span style="display: inline-block; margin-left: 6px; background: #f59e0b; color: white; font-size: 9px; padding: 2px 10px; border-radius: 10px; font-weight: 700;">
                        ⭐ R${retakeCount}
                    </span>
                ` : ''}
                ${retakeScore !== null && retakeScore !== undefined ? `
                    <span style="display: inline-block; margin-left: 4px; font-size: 10px; color: ${isRetakePassing ? '#059669' : '#dc2626'};">
                        (Retake: ${retakeScore}%)
                    </span>
                ` : ''}
                ${retakeHistory.length > 0 ? `
                    <span style="display: block; font-size: 10px; color: #94a3b8; margin-top: 2px;">
                        <i class="fas fa-history"></i> ${retakeHistory.length} attempt(s)
                    </span>
                ` : ''}
            </td>
            ${showCat1 ? `<td style="padding: 8px; text-align: center;">
                <input type="number" id="me_cat1_${i}" value="${cat1}" min="0" max="30" step="0.5" style="width: 60px; padding: 6px; border-radius: 6px; border: 1px solid #e2e8f0; text-align: center;" onchange="updateMarksEntryRow(${i})">
            </td>` : ''}
            ${showCat2 ? `<td style="padding: 8px; text-align: center;">
                <input type="number" id="me_cat2_${i}" value="${cat2}" min="0" max="30" step="0.5" style="width: 60px; padding: 6px; border-radius: 6px; border: 1px solid #e2e8f0; text-align: center;" onchange="updateMarksEntryRow(${i})">
            </td>` : ''}
            ${showExam ? `<td style="padding: 8px; text-align: center;">
                <input type="number" id="me_exam_${i}" value="${exam}" min="0" max="${examMaxDisplay}" step="0.5" style="width: 60px; padding: 6px; border-radius: 6px; border: 1px solid #e2e8f0; text-align: center;" onchange="updateMarksEntryRow(${i})">
                <span style="font-size: 9px; color: #94a3b8; display: block;">Max: ${examMaxDisplay}</span>
            </td>` : ''}
            <td id="me_total_${i}" style="padding: 8px 6px; text-align: center; font-weight: bold; ${isPassing ? 'color: #065f46;' : (total > 0 ? 'color: #991b1b;' : 'color: #f59e0b;')}">${displayTotal}</td>
            <td id="me_grade_${i}" style="padding: 8px 6px; text-align: center; font-weight: bold; font-size: 16px; color: ${gradeInfo.color};">${displayGrade}</td>
            <td id="me_points_${i}" style="padding: 8px 6px; text-align: center; font-weight: bold; font-size: 15px; color: ${gradeInfo.color};">${displayPoints}</td>
            <td id="me_rating_${i}" style="padding: 8px 6px; text-align: center; font-size: 12px;">
                ${total > 0 ? `<span style="background: ${isPassing ? '#d1fae5' : '#fee2e2'}; padding: 3px 12px; border-radius: 12px; color: ${isPassing ? '#065f46' : '#991b1b'}; font-weight: 600; display: inline-block;">${gradeInfo.rating}</span>` : '<span style="color: #94a3b8;">PENDING</span>'}
            </td>
            <td style="padding: 8px 6px; text-align: center;">
                ${retakeActionsHtml}
            </td>
            ${isAdmin ? `<td style="padding: 8px 6px; text-align: center; font-size: 11px;">${approvalBadge}</td>` : ''}
        </tr>`;
    });
    
    html += `
                </tbody>
            </table>
        </div>
        
        ${marks.filter(m => m.hasRetake).length > 0 ? `
        <div style="margin-top: 16px; padding: 12px 16px; background: #fffbeb; border-radius: 8px; border: 1px solid #f59e0b;">
            <p style="margin: 0; font-size: 13px; color: #92400e;">
                <i class="fas fa-star" style="color: #f59e0b;"></i>
                <strong>Retake Summary:</strong> 
                ${marks.filter(m => m.hasRetake && m.retakeStatus === 'PASS').length} students passed after retake, 
                ${marks.filter(m => m.hasRetake && m.retakeStatus === 'FAIL').length} still failing after retake
                <span style="display: inline-block; margin-left: 12px; background: #fef3c7; padding: 2px 12px; border-radius: 12px; font-size: 11px;">
                    ⭐ Total retakes: ${marks.reduce((sum, m) => sum + (m.retakeCount || 0), 0)}
                </span>
                <span style="display: inline-block; margin-left: 12px; font-size: 10px; color: #3b82f6;">
                    <i class="fas fa-edit"></i> Click "Edit Retake" to modify retake scores
                </span>
            </p>
        </div>
        ` : ''}
        
        <div style="text-align: center; margin-top: 16px;">
            <button onclick="saveMarksEntry()" class="btn-action" style="background: #059669; padding: 10px 24px; border: none; border-radius: 8px; color: white; cursor: pointer; font-weight: 600; font-size: 14px;">
                <i class="fas fa-save"></i> 💾 Save All Marks (Auto-Approved)
            </button>
            ${marks.filter(m => m.hasRetake).length > 0 ? `
            <span style="display: inline-block; margin-left: 12px; font-size: 11px; color: #3b82f6;">
                <i class="fas fa-edit"></i> Click Edit Retake to modify retake scores
            </span>
            ` : ''}
        </div>
    `;
    
    container.innerHTML = html;
    
    if (!document.getElementById('retakeModal')) {
        createRetakeModal();
    }
}
       // ============================================================
// ✅ RETAKE ACTIONS - FIXED (No duplicate conditions)
// ============================================================

let retakeActionsHtml = '';

// ✅ Check if student PASSED
if (isPassing) {
    retakeActionsHtml = `
        <span style="color: #059669; font-size: 11px; font-weight: 600;">✅ Passed</span>
    `;
} 
// ✅ Student has retake but still failing
else if (hasRetake) {
    retakeActionsHtml = `
        <div style="font-size: 10px; margin-bottom: 4px;">
            <span style="color: #dc2626; font-weight: 600;">
                ❌ Failed (${retakeCount} attempt${retakeCount > 1 ? 's' : ''})
            </span>
            ${retakeScore !== null && retakeScore !== undefined ? `
                <span style="display: block; font-size: 9px; color: #64748b;">Score: ${retakeScore}%</span>
            ` : ''}
        </div>
        <button onclick="openRetakeModal('${m.admission}', '${m.name}', '${me_currentUnit}', '${me_currentBlock}')" 
                style="background: #3b82f6; color: white; border: none; padding: 3px 10px; border-radius: 4px; cursor: pointer; font-size: 9px; font-weight: 600; width: 100%; margin-top: 2px;">
            <i class="fas fa-edit"></i> Edit Retake
        </button>
    `;
    
    if (retakeCount < MAX_RETAKES) {
        retakeActionsHtml += `
            <button onclick="openRetakeModal('${m.admission}', '${m.name}', '${me_currentUnit}', '${me_currentBlock}')" 
                    style="background: #f59e0b; color: white; border: none; padding: 3px 10px; border-radius: 4px; cursor: pointer; font-size: 9px; font-weight: 600; width: 100%; margin-top: 2px;">
                <i class="fas fa-sync-alt"></i> Add Retake
            </button>
        `;
    } else {
        retakeActionsHtml += `
            <span style="color: #dc2626; font-size: 8px; font-weight: 600; display: block; text-align: center; margin-top: 2px;">
                ⛔ Max retakes reached
            </span>
        `;
    }
} 
// ✅ Student FAILED and NO retake yet
else {
    retakeActionsHtml = `
        <button onclick="openRetakeModal('${m.admission}', '${m.name}', '${me_currentUnit}', '${me_currentBlock}')" 
                style="background: #f59e0b; color: white; border: none; padding: 3px 10px; border-radius: 4px; cursor: pointer; font-size: 9px; font-weight: 600; width: 100%; margin-top: 2px;">
            <i class="fas fa-sync-alt"></i> Add Retake
        </button>
    `;
}

// ✅ THEN build the row (NO duplicate condition after)
html += `<tr style="${rowStyle}">
    <td style="padding: 8px 6px; text-align: center; font-size: 12px; color: #94a3b8;">${i + 1}</td>
    <td style="padding: 8px 8px; font-weight: 500; font-size: 12px;">${m.admission || 'N/A'}</td>
    <td style="padding: 8px 8px;">
        <strong>${m.name || 'Unknown'}</strong>
        ${hasRetake ? `
            <span style="display: inline-block; margin-left: 6px; background: #f59e0b; color: white; font-size: 9px; padding: 2px 10px; border-radius: 10px; font-weight: 700;">
                ⭐ R${retakeCount}
            </span>
        ` : ''}
        ${retakeScore !== null && retakeScore !== undefined ? `
            <span style="display: inline-block; margin-left: 4px; font-size: 10px; color: ${isRetakePassing ? '#059669' : '#dc2626'};">
                (Retake: ${retakeScore}%)
            </span>
        ` : ''}
        ${retakeHistory.length > 0 ? `
            <span style="display: block; font-size: 10px; color: #94a3b8; margin-top: 2px;">
                <i class="fas fa-history"></i> ${retakeHistory.length} attempt(s)
            </span>
        ` : ''}
    </td>
    ${showCat1 ? `<td style="padding: 8px; text-align: center;">
        <input type="number" id="me_cat1_${i}" value="${cat1}" min="0" max="30" step="0.5" style="width: 60px; padding: 6px; border-radius: 6px; border: 1px solid #e2e8f0; text-align: center;" onchange="updateMarksEntryRow(${i})">
    </td>` : ''}
    ${showCat2 ? `<td style="padding: 8px; text-align: center;">
        <input type="number" id="me_cat2_${i}" value="${cat2}" min="0" max="30" step="0.5" style="width: 60px; padding: 6px; border-radius: 6px; border: 1px solid #e2e8f0; text-align: center;" onchange="updateMarksEntryRow(${i})">
    </td>` : ''}
    ${showExam ? `<td style="padding: 8px; text-align: center;">
        <input type="number" id="me_exam_${i}" value="${exam}" min="0" max="${examMaxDisplay}" step="0.5" style="width: 60px; padding: 6px; border-radius: 6px; border: 1px solid #e2e8f0; text-align: center;" onchange="updateMarksEntryRow(${i})">
        <span style="font-size: 9px; color: #94a3b8; display: block;">Max: ${examMaxDisplay}</span>
    </td>` : ''}
    <td id="me_total_${i}" style="padding: 8px 6px; text-align: center; font-weight: bold; ${isPassing ? 'color: #065f46;' : (total > 0 ? 'color: #991b1b;' : 'color: #f59e0b;')}">${displayTotal}</td>
    <td id="me_grade_${i}" style="padding: 8px 6px; text-align: center; font-weight: bold; font-size: 16px; color: ${gradeInfo.color};">${displayGrade}</td>
    <td id="me_points_${i}" style="padding: 8px 6px; text-align: center; font-weight: bold; font-size: 15px; color: ${gradeInfo.color};">${displayPoints}</td>
    <td id="me_rating_${i}" style="padding: 8px 6px; text-align: center; font-size: 12px;">
        ${total > 0 ? `<span style="background: ${isPassing ? '#d1fae5' : '#fee2e2'}; padding: 3px 12px; border-radius: 12px; color: ${isPassing ? '#065f46' : '#991b1b'}; font-weight: 600; display: inline-block;">${gradeInfo.rating}</span>` : '<span style="color: #94a3b8;">PENDING</span>'}
    </td>
    <td style="padding: 8px 6px; text-align: center;">
        ${retakeActionsHtml}
    </td>
    ${isAdmin ? `<td style="padding: 8px 6px; text-align: center; font-size: 11px;">${approvalBadge}</td>` : ''}
</tr>`;

// ============================================================
// UPDATE MARKS ROW
// ============================================================

function updateMarksEntryRow(index) {
    const cat1 = parseFloat(document.getElementById(`me_cat1_${index}`)?.value) || 0;
    const cat2 = parseFloat(document.getElementById(`me_cat2_${index}`)?.value) || 0;
    const exam = parseFloat(document.getElementById(`me_exam_${index}`)?.value) || 0;
    const assessmentType = me_currentAssessmentType;
    const passingThreshold = getPassingThreshold();
    
    const total = calculateMarksEntryTotal(cat1, cat2, exam, assessmentType);
    const gradeInfo = getMarksEntryGrade(total);
    const isPassing = total >= passingThreshold;
    
    const totalEl = document.getElementById(`me_total_${index}`);
    if (totalEl) {
        totalEl.textContent = total > 0 ? total : '--';
        totalEl.style.color = isPassing ? '#065f46' : (total > 0 ? '#991b1b' : '#f59e0b');
    }
    
    const gradeEl = document.getElementById(`me_grade_${index}`);
    if (gradeEl) {
        gradeEl.textContent = total > 0 ? gradeInfo.grade : '--';
        gradeEl.style.color = gradeInfo.color;
    }
    
    const pointsEl = document.getElementById(`me_points_${index}`);
    if (pointsEl) {
        pointsEl.textContent = total > 0 ? gradeInfo.points.toFixed(1) : '--';
        pointsEl.style.color = gradeInfo.color;
    }
    
    const ratingEl = document.getElementById(`me_rating_${index}`);
    if (ratingEl) {
        if (total > 0) {
            ratingEl.innerHTML = `<span style="background: ${isPassing ? '#d1fae5' : '#fee2e2'}; padding: 3px 12px; border-radius: 12px; color: ${isPassing ? '#065f46' : '#991b1b'}; font-weight: 600; display: inline-block;">${gradeInfo.rating}</span>`;
        } else {
            ratingEl.innerHTML = '<span style="color: #94a3b8;">PENDING</span>';
        }
    }
    
    if (me_currentMarks && me_currentMarks[index]) {
        me_currentMarks[index].cat1 = cat1;
        me_currentMarks[index].cat2 = cat2;
        me_currentMarks[index].exam = exam;
    }
}

// ============================================================
// UPDATE STATS
// ============================================================

function updateMarksEntryStats(marks, assessmentType) {
    const isTVET = isTVETProgram();
    const passingThreshold = getPassingThreshold();
    const programLabel = getProgramTypeLabel();
    
    const totalEnrolled = marks.length;
    const withScores = marks.filter(m => m.cat1 > 0 || m.cat2 > 0 || m.exam > 0);
    const passing = marks.filter(m => {
        const total = calculateMarksEntryTotal(m.cat1, m.cat2, m.exam, assessmentType);
        return total >= passingThreshold;
    });
    
    const avg = withScores.length > 0 ? 
        withScores.reduce((sum, m) => sum + calculateMarksEntryTotal(m.cat1, m.cat2, m.exam, assessmentType), 0) / withScores.length : 0;
    
    // Count retakes
    const withRetakes = marks.filter(m => m.hasRetake);
    const retakePassed = marks.filter(m => m.hasRetake && m.retakeStatus === 'PASS');
    const retakeFailed = marks.filter(m => m.hasRetake && m.retakeStatus === 'FAIL');
    
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
        const total = calculateMarksEntryTotal(m.cat1, m.cat2, m.exam, assessmentType);
        return total > 0 && total < passingThreshold;
    });
    if (atRiskEl) atRiskEl.textContent = atRisk.length;
    
    if (publishedEl && marks) {
        const publishedCount = marks.filter(m => m.published === true).length;
        publishedEl.textContent = publishedCount;
    }
}

// ============================================================
// SAVE MARKS - WITH AUTO-APPROVE
// ============================================================

async function saveMarksEntry() {
    console.log('💾 Saving marks with auto-approve...');
    
    const block = me_currentBlock;
    const unit = me_currentUnit;
    const year = me_currentYear;
    const assessmentType = me_currentAssessmentType || 'full';
    
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
            
            const total = calculateMarksEntryTotal(cat1, cat2, exam, assessmentType);
            const gradeInfo = getMarksEntryGrade(total);
            
            marksData.push({
                admission_number: admission,
                student_name: name || 'Unknown',
                block: block,
                subject_name: unit,
                assessment_type: assessmentType,
                cat1_score: cat1,
                cat2_score: cat2,
                exam_score: exam,
                final_score: total,
                grade: gradeInfo.grade,
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
// EXPORT MARKS TO CSV WITH RETAKE DATA
// ============================================================

function exportMarksEntry() {
    const marks = me_currentMarks;
    if (!marks || marks.length === 0) {
        if (typeof showNotification === 'function') showNotification('No data to export', 'warning');
        return;
    }
    
    const assessmentType = me_currentAssessmentType;
    const headers = ['Admission', 'Name', 'CAT1', 'CAT2', 'Exam', 'Total', 'Grade', 'Points', 'Rating', 
                     'Has Retake', 'Retake Count', 'Retake Score', 'Retake Grade', 'Retake Status'];
    const rows = marks.map(m => {
        const cat1 = m.cat1 || 0;
        const cat2 = m.cat2 || 0;
        const exam = m.exam || 0;
        const total = calculateMarksEntryTotal(cat1, cat2, exam, assessmentType);
        const gradeInfo = getMarksEntryGrade(total);
        return [
            m.admission || '',
            m.name || '',
            cat1,
            cat2,
            exam,
            total > 0 ? total : '',
            total > 0 ? gradeInfo.grade : '',
            total > 0 ? gradeInfo.points : '',
            total > 0 ? gradeInfo.rating : '',
            m.hasRetake ? 'Yes' : 'No',
            m.retakeCount || 0,
            m.retakeScore || '',
            m.retakeGrade || '',
            m.retakeStatus || ''
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
// REFRESH MARKS DATA
// ============================================================

function refreshMarksData() {
    loadMarksEntry();
    if (typeof showNotification === 'function') {
        showNotification('🔄 Data refreshed!', 'success');
    }
}

// ============================================================
// COLUMN MANAGEMENT - ADMIN ONLY
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
    
    const defaultColumns = [
        { id: 'sno', label: '#', required: true },
        { id: 'admission', label: 'Admission', required: true },
        { id: 'name', label: 'Name', required: true },
        { id: 'cat1', label: 'CAT1 (0-30)', required: false },
        { id: 'cat2', label: 'CAT2 (0-30)', required: false },
        { id: 'exam', label: 'Exam', required: false },
        { id: 'total', label: 'Total', required: false },
        { id: 'grade', label: 'Grade', required: false },
        { id: 'points', label: 'Points', required: false },
        { id: 'rating', label: 'Rating', required: false },
        { id: 'retake', label: 'Retake', required: false },
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
        
    } catch (error) {
        console.error('❌ Error saving column:', error);
        if (typeof showNotification === 'function') {
            showNotification('❌ Error saving column: ' + error.message, 'error');
        }
    }
}

window.saveUnitColumnSetting = saveUnitColumnSetting;

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
        else if (text.includes('grade')) columnIndexMap['grade'] = index;
        else if (text.includes('points')) columnIndexMap['points'] = index;
        else if (text.includes('rating')) columnIndexMap['rating'] = index;
        else if (text.includes('retake')) columnIndexMap['retake'] = index;
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
        else if (text.includes('grade')) colId = 'grade';
        else if (text.includes('points')) colId = 'points';
        else if (text.includes('rating')) colId = 'rating';
        else if (text.includes('retake')) colId = 'retake';
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
    
    const autoAssessmentType = getAutoAssessmentType();
    if (autoAssessmentType !== me_currentAssessmentType) {
        me_currentAssessmentType = autoAssessmentType;
        const assessmentSelect = document.getElementById('me_assessment_type');
        if (assessmentSelect) assessmentSelect.value = autoAssessmentType;
        recalculateAllTotals();
    } else {
        updateAssessmentTypeDisplay();
    }
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
// LECTURER UNIT ASSIGNMENT MANAGEMENT
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
        const { data: lecturers, error: lecturerError } = await sb
            .from('staff_records')
            .select('*')
            .eq('program', program)
            .in('status', ['active', 'approved'])
            .order('first_name', { ascending: true });
        
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
            const isAssigned = !!assignedMap[lecturer.id];
            const fullName = lecturer.other_names ? `${lecturer.first_name} ${lecturer.other_names}` : lecturer.first_name;
            const departmentDisplay = lecturer.department || (lecturer.program === 'KRCHN' ? 'Nursing' : 'TVET Department');
            const programDisplay = lecturer.program || 'KRCHN';
            
            html += `
                <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; background: ${isAssigned ? '#d1fae5' : '#f8fafc'}; border-radius: 8px; border: 1px solid ${isAssigned ? '#10b981' : '#e2e8f0'};">
                    <div>
                        <strong style="font-size: 13px; color: #1e293b;">${fullName}</strong>
                        <span style="font-size: 11px; color: #64748b; display: block;">${lecturer.email || ''}</span>
                        <span style="font-size: 10px; color: #94a3b8;">
                            <span style="background: ${programDisplay === 'KRCHN' ? '#dbeafe' : '#fef3c7'}; padding: 2px 8px; border-radius: 4px;">
                                ${programDisplay}
                            </span>
                            - ${departmentDisplay}
                        </span>
                    </div>
                    <div style="display: flex; gap: 8px; align-items: center;">
                        ${isAssigned ? `
                            <span style="background: #10b981; color: white; padding: 2px 10px; border-radius: 12px; font-size: 10px; font-weight: 600;">
                                <i class="fas fa-check"></i> Assigned
                            </span>
                            <button onclick="removeLecturerAssignment('${lecturer.id}', '${unit}', '${block}')" style="background: #dc2626; color: white; border: none; border-radius: 4px; padding: 4px 10px; cursor: pointer; font-size: 11px;">
                                <i class="fas fa-times"></i> Remove
                            </button>
                        ` : `
                            <button onclick="assignLecturerToUnit('${lecturer.id}', '${fullName}', '${unit}', '${block}')" style="background: #4C1D95; color: white; border: none; border-radius: 4px; padding: 4px 12px; cursor: pointer; font-size: 11px;">
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

window.assignLecturerToUnit = assignLecturerToUnit;

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
            .from('staff_records')
            .select('first_name, other_names')
            .eq('id', lecturerId)
            .maybeSingle();
        if (lecturer) {
            lecturerName = lecturer.other_names ? `${lecturer.first_name} ${lecturer.other_names}` : lecturer.first_name;
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

window.removeLecturerAssignment = removeLecturerAssignment;

async function showLecturerAssignmentModal() {
    const block = document.getElementById('me_block_select')?.value;
    const program = document.getElementById('me_program_select')?.value;
    const year = document.getElementById('me_year_select')?.value || '2025';
    const unitSelect = document.getElementById('me_subject_select');
    const currentUnit = unitSelect?.value;
    
    if (!block || !program) {
        if (typeof showNotification === 'function') {
            showNotification('Please select a program and block first', 'warning');
        }
        return;
    }
    
    document.getElementById('me_assign_block').value = block.replace(/_/g, ' ');
    document.getElementById('me_assign_year').value = year;
    document.getElementById('me_assign_program').value = program === 'KRCHN' ? '🎓 KRCHN Nursing' : '🔧 TVET';
    
    const lecturerSelect = document.getElementById('me_lecturer_select');
    if (lecturerSelect) {
        lecturerSelect.innerHTML = '<option value="">Loading lecturers...</option>';
        
        try {
            const { data: lecturers, error } = await sb
                .from('staff_records')
                .select('*')
                .eq('program', program)
                .in('status', ['active', 'approved'])
                .order('first_name', { ascending: true });
            
            if (error) throw error;
            
            if (lecturerSelect) {
                if (!lecturers || lecturers.length === 0) {
                    lecturerSelect.innerHTML = '<option value="">No lecturers found for this program</option>';
                } else {
                    lecturerSelect.innerHTML = '<option value="">-- Select Lecturer --</option>';
                    lecturers.forEach(l => {
                        const option = document.createElement('option');
                        option.value = l.id;
                        const fullName = l.other_names ? `${l.first_name} ${l.other_names}` : l.first_name;
                        option.textContent = `${fullName} (${l.email || 'no email'})`;
                        lecturerSelect.appendChild(option);
                    });
                }
            }
            
        } catch (error) {
            console.error('Error loading lecturers:', error);
            if (lecturerSelect) {
                lecturerSelect.innerHTML = '<option value="">Error loading lecturers</option>';
            }
            if (typeof showNotification === 'function') {
                showNotification('Error loading lecturers: ' + error.message, 'error');
            }
        }
    }
    
    const assignUnitSelect = document.getElementById('me_assign_subject_select');
    if (assignUnitSelect) {
        assignUnitSelect.innerHTML = '<option value="">Loading units...</option>';
        try {
            const { data: units, error } = await sb
                .from('units_catalog')
                .select('unit_name, unit_code')
                .eq('program', program)
                .eq('block', block)
                .eq('status', 'active')
                .order('unit_name', { ascending: true });
            
            if (error) throw error;
            
            assignUnitSelect.innerHTML = '<option value="">-- Select Unit --</option>';
            units?.forEach(u => {
                const option = document.createElement('option');
                option.value = u.unit_name;
                option.textContent = `${u.unit_code || ''} - ${u.unit_name}`;
                if (u.unit_name === currentUnit) {
                    option.selected = true;
                }
                assignUnitSelect.appendChild(option);
            });
            
        } catch (error) {
            console.error('Error loading units:', error);
            assignUnitSelect.innerHTML = '<option value="">Error loading units</option>';
        }
    }
    
    document.getElementById('lecturerAssignmentModal').style.display = 'flex';
}

window.showLecturerAssignmentModal = showLecturerAssignmentModal;

function closeLecturerAssignmentModal() {
    document.getElementById('lecturerAssignmentModal').style.display = 'none';
}

window.closeLecturerAssignmentModal = closeLecturerAssignmentModal;

async function saveLecturerAssignment() {
    const lecturerId = document.getElementById('me_lecturer_select')?.value;
    const unit = document.getElementById('me_assign_subject_select')?.value;
    const block = document.getElementById('me_block_select')?.value;
    const program = document.getElementById('me_program_select')?.value;
    const year = document.getElementById('me_year_select')?.value || '2025';
    
    if (!lecturerId) {
        if (typeof showNotification === 'function') {
            showNotification('Please select a lecturer', 'warning');
        }
        return;
    }
    
    if (!unit) {
        if (typeof showNotification === 'function') {
            showNotification('Please select a unit', 'warning');
        }
        return;
    }
    
    const lecturerSelect = document.getElementById('me_lecturer_select');
    const lecturerName = lecturerSelect?.options[lecturerSelect.selectedIndex]?.text?.split(' (')[0] || 'Lecturer';
    
    await assignLecturerToUnit(lecturerId, lecturerName, unit, block);
    closeLecturerAssignmentModal();
}

window.saveLecturerAssignment = saveLecturerAssignment;

// ============================================================
// ASSIGNMENT HISTORY
// ============================================================

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
                        <th style="padding: 10px 12px; text-align: left;">Department</th>
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
                .from('staff_records')
                .select('*')
                .eq('id', a.lecturer_id)
                .maybeSingle();
            
            const email = lecturer?.email || a.lecturer_email || 'N/A';
            const department = a.department || lecturer?.department || (lecturer?.program === 'KRCHN' ? 'Nursing' : 'TVET Department');
            const programDisplay = a.program || lecturer?.program || 'KRCHN';
            const assignedDate = a.created_at ? new Date(a.created_at).toLocaleDateString() : 'N/A';
            
            html += `
                <tr style="border-bottom: 1px solid #e5e7eb; ${i % 2 === 0 ? 'background: #f8fafc;' : ''}">
                    <td style="padding: 10px 12px;">${i + 1}</td>
                    <td style="padding: 10px 12px; font-weight: 600;">${escapeHtml(fullName)}</td>
                    <td style="padding: 10px 12px;">${escapeHtml(email)}</td>
                    <td style="padding: 10px 12px;">
                        <span style="background: ${department === 'Nursing' ? '#dbeafe' : '#fef3c7'}; padding: 2px 10px; border-radius: 12px; font-size: 11px;">
                            ${escapeHtml(department)}
                        </span>
                    </td>
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

window.loadAssignmentHistory = loadAssignmentHistory;

function refreshAssignmentHistory() {
    loadAssignmentHistory();
    if (typeof showNotification === 'function') {
        showNotification('🔄 Assignment history refreshed!', 'success');
    }
}

window.refreshAssignmentHistory = refreshAssignmentHistory;

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

window.clearAllAssignments = clearAllAssignments;

// ============================================================
// STUDENT MANAGER FUNCTIONS
// ============================================================

async function openMarksStudentManager() {
    const unit = document.getElementById('me_subject_select')?.value;
    const block = document.getElementById('me_block_select')?.value;
    const program = document.getElementById('me_program_select')?.value;
    const year = document.getElementById('me_year_select')?.value || '2025';
    
    if (!unit || !block) {
        showNotification('Please select a unit and block first', 'warning');
        return;
    }
    
    // Create modal if it doesn't exist
    if (!document.getElementById('studentManagerModal')) {
        createStudentManagerModal();
    }
    
    const modal = document.getElementById('studentManagerModal');
    modal.style.display = 'flex';
    
    // Show loading
    document.getElementById('studentManagerBody').innerHTML = `
        <div style="text-align: center; padding: 40px;">
            <div class="loading-spinner"></div>
            <p style="color: #64748b; margin-top: 10px;">Loading students...</p>
        </div>
    `;
    
    try {
        // ✅ Use sb directly (or window.sb)
        if (!window.sb) throw new Error('Database not available');
        const { data: allStudents, error: studentError } = await window.sb
    .from('consolidated_user_profiles_table')
    .select('student_id, full_name, block, intake_year, program, status')
    .eq('role', 'student')
    .eq('program', program)
    // ✅ REMOVED: .eq('status', 'active')  ← THIS WAS HIDING 100+ STUDENTS!
    .order('full_name', { ascending: true });
        
        if (studentError) throw studentError;
        
        // Get already enrolled students
        const { data: enrolled, error: enrolledError } = await window.sb
            .from('student_marks')
            .select('admission_number')
            .eq('block', block)
            .eq('subject_name', unit)
            .eq('academic_year', year);
        
        if (enrolledError) throw enrolledError;
        
        const enrolledSet = new Set(enrolled.map(e => e.admission_number));
        
        // Split into enrolled and available (ALL students)
        const enrolledStudents = allStudents.filter(s => enrolledSet.has(s.student_id));
        const availableStudents = allStudents.filter(s => !enrolledSet.has(s.student_id));
        
        // Store for later
        me_studentManagerData = {
            allStudents: allStudents,
            enrolledStudents: enrolledStudents,
            availableStudents: availableStudents,
            enrolledMap: enrolledSet,
            block: block,
            unit: unit,
            program: program,
            year: year
        };
        
        // Show warning about different blocks
        let blockWarning = '';
        const studentsWithDifferentBlock = availableStudents.filter(s => s.block !== block);
        if (studentsWithDifferentBlock.length > 0) {
            blockWarning = `
                <div style="margin-bottom: 12px; padding: 10px 14px; background: #fffbeb; border: 1px solid #f59e0b; border-radius: 6px;">
                    <span style="color: #92400e; font-size: 13px;">
                        <i class="fas fa-info-circle"></i> 
                        <strong>${studentsWithDifferentBlock.length}</strong> students are from different blocks. 
                        <span style="color: #3b82f6; font-weight: 600;">Super Admin can add them anyway.</span>
                    </span>
                </div>
            `;
        }
        
        // Render the student manager
        renderStudentManager(blockWarning);
        
    } catch (error) {
        console.error('Error loading student manager:', error);
        document.getElementById('studentManagerBody').innerHTML = `
            <div style="text-align: center; padding: 40px; color: #dc2626;">
                <i class="fas fa-exclamation-triangle" style="font-size: 36px; display: block; margin-bottom: 12px;"></i>
                <p>Error loading students: ${error.message}</p>
                <button onclick="openMarksStudentManager()" style="margin-top: 12px; padding: 8px 20px; background: #4C1D95; color: white; border: none; border-radius: 6px; cursor: pointer;">
                    <i class="fas fa-sync-alt"></i> Retry
                </button>
            </div>
        `;
    }
}
// ============================================================
// ADD SELECTED STUDENTS TO UNIT - SUPER ADMIN (NO BLOCK CHECK)
// ============================================================

async function addSelectedStudentsToUnit() {
    const selectedCheckboxes = document.querySelectorAll('#availableStudentsList input:checked');
    
    if (selectedCheckboxes.length === 0) {
        showNotification('Please select at least one student to add', 'warning');
        return;
    }
    
    const unit = me_currentUnit || document.getElementById('me_subject_select')?.value;
    const block = me_currentBlock || document.getElementById('me_block_select')?.value;
    const year = me_currentYear || document.getElementById('me_year_select')?.value || '2025';
    const program = me_currentProgram || document.getElementById('me_program_select')?.value;
    
    if (!unit || !block) {
        showNotification('Please select a unit and block first', 'warning');
        return;
    }
    
    // Check for block mismatches but allow adding
    let differentBlockCount = 0;
    let differentBlockNames = [];
    
    selectedCheckboxes.forEach(cb => {
        const studentBlock = cb.dataset.block || '';
        const studentName = cb.dataset.name || 'Unknown';
        if (studentBlock && studentBlock !== block) {
            differentBlockCount++;
            differentBlockNames.push(studentName);
        }
    });
    
    let confirmMessage = `⚠️ Add ${selectedCheckboxes.length} student(s) to "${unit}"?`;
    if (differentBlockCount > 0) {
        confirmMessage += `\n\n⚠️ ${differentBlockCount} student(s) are from different blocks:\n${differentBlockNames.map(n => `  • ${n}`).join('\n')}\n\n✅ They will be added anyway (Super Admin override).`;
    }
    
    if (!confirm(confirmMessage)) {
        return;
    }
    
    showLoadingScreen(`Adding ${selectedCheckboxes.length} students...`, 'Adding Students');
    updateLoadingProgress(10, 1, 'Processing...');
    
    try {
        // ✅ Use window.sb directly
        if (!window.sb) throw new Error('Database not available');
        
        let addedCount = 0;
        let skippedCount = 0;
        
        updateLoadingProgress(30, 1, 'Checking existing records...');
        
        for (const checkbox of selectedCheckboxes) {
            const admission = checkbox.value;
            const studentName = checkbox.dataset.name || 'Unknown';
            const studentBlock = checkbox.dataset.block || block;
            
            // Check if already enrolled
            const { data: existing, error: checkError } = await window.sb
                .from('student_marks')
                .select('id')
                .eq('admission_number', admission)
                .eq('block', block)
                .eq('subject_name', unit)
                .eq('academic_year', year);
            
            if (checkError) {
                console.error('Error checking existing:', checkError);
                continue;
            }
            
            if (existing && existing.length > 0) {
                skippedCount++;
                continue;
            }
            
            // Insert with unit block (store original block for reference)
           const { error: insertError } = await window.sb
    .from('student_marks')
    .insert({
        admission_number: admission,
        student_name: studentName,
        block: block,
        subject_name: unit,
        academic_year: year,
        // ✅ REMOVED: program: program,
        cat1_score: 0,
        cat2_score: 0,
        exam_score: 0,
        final_score: 0,
        grade: '',
        assessment_type: 'full',
        approval_status: 'draft',
        published: false
    });
            
            if (insertError) {
                console.error('Error adding student:', insertError);
            } else {
                addedCount++;
            }
        }
        
        hideLoadingScreen();
        
        let message = `✅ Added ${addedCount} student(s) to "${unit}"`;
        if (skippedCount > 0) message += ` (${skippedCount} already existed)`;
        if (differentBlockCount > 0) message += `\n⚠️ ${differentBlockCount} student(s) were from different blocks`;
        
        showNotification(message, 'success');
        
        // Refresh
        loadMarksEntry();
        closeStudentManager();
        
    } catch (error) {
        hideLoadingScreen();
        console.error('Error adding students:', error);
        showNotification('Error adding students: ' + error.message, 'error');
    }
}
// ============================================================
// RENDER STUDENT MANAGER - SUPER ADMIN VIEW
// ============================================================

function renderStudentManager(blockWarning = '') {
    const { allStudents, enrolledStudents, availableStudents, block, unit, program, year } = me_studentManagerData;
    
    const body = document.getElementById('studentManagerBody');
    if (!body) return;
    
    const totalEnrolled = enrolledStudents?.length || 0;
    const totalAvailable = availableStudents?.length || 0;
    const totalStudents = allStudents?.length || 0;
    const differentBlockCount = availableStudents?.filter(s => s.block !== block).length || 0;
    
    // ✅ Get unique intake years from available students
    const intakeYears = [...new Set(availableStudents.map(s => s.intake_year).filter(y => y))].sort();
    
    body.innerHTML = `
        <div style="padding: 16px;">
            <!-- SUPER ADMIN INFO -->
            <div style="margin-bottom: 16px; padding: 12px 16px; background: #ede9fe; border-radius: 8px; border-left: 4px solid #7c3aed;">
                <span style="color: #4C1D95; font-weight: 600;">
                    <i class="fas fa-crown"></i> Super Admin Mode
                </span>
                <span style="color: #6b7280; font-size: 13px; margin-left: 8px;">
                    You can add <strong>any student</strong> to this unit, regardless of their block.
                </span>
            </div>
            
            ${blockWarning || ''}
            
            <!-- Stats -->
            <div style="display: flex; gap: 16px; margin-bottom: 16px; flex-wrap: wrap;">
                <div style="background: #e0f2fe; padding: 8px 16px; border-radius: 6px;">
                    <strong>📚 Unit:</strong> ${escapeHtml(unit)}
                </div>
                <div style="background: #e0f2fe; padding: 8px 16px; border-radius: 6px;">
                    <strong>📦 Block:</strong> ${escapeHtml(block.replace(/_/g, ' '))}
                </div>
                <div style="background: #d1fae5; padding: 8px 16px; border-radius: 6px;">
                    <strong>✅ Enrolled:</strong> ${totalEnrolled}
                </div>
                <div style="background: #fef3c7; padding: 8px 16px; border-radius: 6px;">
                    <strong>📋 Available:</strong> ${totalAvailable}
                </div>
                ${differentBlockCount > 0 ? `
                <div style="background: #fce4ec; padding: 8px 16px; border-radius: 6px;">
                    <strong>⚠️ Different Block:</strong> ${differentBlockCount}
                </div>
                ` : ''}
            </div>
            
            <!-- ============================================================ -->
            <!-- ENROLLED STUDENTS SECTION -->
            <!-- ============================================================ -->
            <div style="margin-top: 16px; border: 1px solid #d1fae5; border-radius: 8px; overflow: hidden;">
                <div style="background: #d1fae5; padding: 10px 16px; border-bottom: 1px solid #d1fae5; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
                    <span style="font-weight: 600; color: #065f46;">
                        <i class="fas fa-user-check"></i> Enrolled Students (${totalEnrolled})
                    </span>
                    ${totalEnrolled > 0 ? `
                    <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                        <button onclick="selectAllEnrolledStudents()" style="background: none; border: none; color: #065f46; cursor: pointer; font-size: 12px; font-weight: 500;">
                            <i class="fas fa-check-square"></i> Select All
                        </button>
                        <button onclick="deselectAllEnrolledStudents()" style="background: none; border: none; color: #64748b; cursor: pointer; font-size: 12px;">
                            <i class="fas fa-square"></i> Deselect All
                        </button>
                        <button onclick="dropSelectedEnrolledStudents()" id="dropEnrolledBtn" style="display: none; background: #dc2626; color: white; border: none; padding: 4px 14px; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: 500;">
                            <i class="fas fa-user-minus"></i> Drop Selected (<span id="dropEnrolledCount">0</span>)
                        </button>
                    </div>
                    ` : ''}
                </div>
                <div id="enrolledStudentsList" style="max-height: 300px; overflow-y: auto; padding: 8px; background: #f8fafc;">
                    ${enrolledStudents.length === 0 ? `
                        <div style="text-align: center; padding: 30px; color: #94a3b8;">
                            <i class="fas fa-users" style="font-size: 30px; display: block; margin-bottom: 8px;"></i>
                            <p>No students enrolled in this unit yet.</p>
                        </div>
                    ` : `
                        ${enrolledStudents.map((s, index) => {
                            const admission = s.admission_number || s.student_id || 'N/A';
                            const name = s.student_name || s.full_name || 'Unknown';
                            const studentBlock = s.block || 'N/A';
                            const blockMatch = studentBlock === block;
                            const intakeYear = s.intake_year || s.academic_year || 'N/A';
                            return `
                                <div class="enrolled-student-item" data-admission="${admission}" 
                                     style="display: flex; align-items: center; padding: 8px 12px; border-bottom: 1px solid #e5e7eb; ${index % 2 === 0 ? 'background: #ffffff;' : 'background: #f8fafc;'}">
                                    <input type="checkbox" class="enrolled-checkbox" data-admission="${admission}" 
                                           style="margin-right: 12px; width: 15px; height: 15px; cursor: pointer;" 
                                           onchange="updateEnrolledSelectedCount()">
                                    <span style="flex: 1;">
                                        <strong>${escapeHtml(name)}</strong>
                                        <span style="font-size: 11px; color: #94a3b8; margin-left: 8px;">${escapeHtml(admission)}</span>
                                    </span>
                                    <span style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                                        <span style="font-size: 10px; background: #e0e7ff; padding: 2px 8px; border-radius: 10px; color: #3730a3;">
                                            📅 ${escapeHtml(intakeYear)}
                                        </span>
                                        <span style="font-size: 11px; background: ${blockMatch ? '#e0f2fe' : '#fef3c7'}; padding: 2px 10px; border-radius: 12px;">
                                            ${escapeHtml(studentBlock)}
                                        </span>
                                        ${!blockMatch ? `<span style="font-size: 10px; color: #f59e0b; font-weight: 600;">⚠️</span>` : ''}
                                        ${s.cat1_score > 0 || s.cat2_score > 0 || s.exam_score > 0 ? 
                                            `<span style="font-size: 10px; color: #3b82f6;">📝 Has marks</span>` : 
                                            `<span style="font-size: 10px; color: #94a3b8;">No marks</span>`}
                                        <button onclick="dropSingleEnrolledStudent('${admission}')" 
                                                style="background: #dc2626; color: white; border: none; padding: 3px 12px; border-radius: 4px; cursor: pointer; font-size: 11px;">
                                            <i class="fas fa-user-minus"></i> Drop
                                        </button>
                                    </span>
                                </div>
                            `;
                        }).join('')}
                    `}
                </div>
                ${enrolledStudents.length > 0 ? `
                <div style="background: #f1f5f9; padding: 6px 16px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; font-size: 12px; color: #64748b;">
                    <span><span id="enrolledSelectedCount">0</span> selected</span>
                    <button onclick="clearAllEnrolledStudents()" style="background: #dc2626; color: white; border: none; padding: 4px 14px; border-radius: 4px; cursor: pointer; font-size: 11px;">
                        <i class="fas fa-trash"></i> Remove All
                    </button>
                </div>
                ` : ''}
            </div>
            
            <!-- ============================================================ -->
            <!-- AVAILABLE STUDENTS SECTION -->
            <!-- ============================================================ -->
            <div style="margin-top: 16px; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
                <div style="background: #f8fafc; padding: 10px 16px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
                    <span style="font-weight: 600;">📋 Available Students (${totalAvailable})</span>
                    <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                        <button onclick="selectAllAvailableStudents()" style="background: none; border: none; color: #4C1D95; cursor: pointer; font-size: 12px; font-weight: 500;">
                            <i class="fas fa-check-square"></i> Select All
                        </button>
                        <button onclick="deselectAllAvailableStudents()" style="background: none; border: none; color: #64748b; cursor: pointer; font-size: 12px;">
                            <i class="fas fa-square"></i> Deselect All
                        </button>
                        <button onclick="selectDifferentBlockStudents()" style="background: none; border: none; color: #f59e0b; cursor: pointer; font-size: 12px;">
                            <i class="fas fa-exclamation-triangle"></i> Different Block
                        </button>
                        <button onclick="selectSameIntakeYear()" style="background: none; border: none; color: #4C1D95; cursor: pointer; font-size: 12px;">
                            <i class="fas fa-calendar"></i> Same Year
                        </button>
                    </div>
                </div>
                
                <!-- ✅ YEAR FILTER DROPDOWN -->
                <div style="padding: 8px 16px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
                    <span style="font-size: 12px; color: #64748b; font-weight: 500;">
                        <i class="fas fa-filter"></i> Filter by Intake Year:
                    </span>
                    <select id="intakeYearFilter" onchange="filterAvailableStudentsByYear()" style="padding: 5px 12px; border-radius: 6px; border: 1px solid #e2e8f0; font-size: 12px; background: white;">
                        <option value="all">📅 All Years</option>
                        ${intakeYears.map(y => `<option value="${y}">📅 ${escapeHtml(y)}</option>`).join('')}
                    </select>
                    <span style="font-size: 11px; color: #94a3b8; margin-left: 4px;">
                        Showing <span id="filteredAvailableCount">${totalAvailable}</span> students
                    </span>
                    <button onclick="resetYearFilter()" style="background: #e2e8f0; border: none; padding: 3px 12px; border-radius: 4px; cursor: pointer; font-size: 11px; color: #475569;">
                        Reset
                    </button>
                </div>
                
                <div id="availableStudentsList" style="max-height: 300px; overflow-y: auto; padding: 8px;">
                    ${availableStudents.length === 0 ? `
                        <div style="text-align: center; padding: 30px; color: #94a3b8;">
                            <i class="fas fa-users" style="font-size: 30px; display: block; margin-bottom: 8px;"></i>
                            <p>All students are already enrolled in this unit.</p>
                        </div>
                    ` : `
                        ${availableStudents.map(s => {
                            const blockMatch = s.block === block;
                            const intakeYear = s.intake_year || 'N/A';
                            return `
                                <div class="student-item" data-name="${(s.full_name || '').toLowerCase()}" data-admission="${s.student_id}" data-year="${intakeYear}"
                                     style="display: flex; align-items: center; padding: 8px 12px; border-bottom: 1px solid #f1f5f9; ${!blockMatch ? 'background: #fffbeb; border-left: 3px solid #f59e0b;' : ''}">
                                    <input type="checkbox" id="student_${s.student_id}" value="${s.student_id}" 
                                           data-name="${s.full_name || 'Unknown'}" data-block="${s.block || ''}" data-year="${intakeYear}"
                                           style="margin-right: 12px; width: 15px; height: 15px; cursor: pointer;">
                                    <label for="student_${s.student_id}" style="cursor: pointer; flex: 1; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 4px;">
                                        <span>
                                            <strong>${escapeHtml(s.full_name || 'Unknown')}</strong>
                                            <span style="font-size: 11px; color: #94a3b8; margin-left: 8px;">${escapeHtml(s.student_id || '')}</span>
                                        </span>
                                        <span style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                                            <span style="font-size: 10px; background: #e0e7ff; padding: 2px 8px; border-radius: 10px; color: #3730a3;">
                                                📅 ${escapeHtml(intakeYear)}
                                            </span>
                                            <span style="font-size: 11px; background: ${s.block === block ? '#e0f2fe' : '#fef3c7'}; padding: 2px 10px; border-radius: 12px;">
                                                ${escapeHtml(s.block || 'N/A')}
                                            </span>
                                            ${!blockMatch ? `<span style="font-size: 10px; color: #f59e0b; font-weight: 600;">⚠️ Different block</span>` : ''}
                                        </span>
                                    </label>
                                </div>
                            `;
                        }).join('')}
                    `}
                </div>
            </div>
            
            <!-- Selected Count -->
            <div style="margin-top: 12px; padding: 8px 12px; background: #f1f5f9; border-radius: 6px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
                <span style="font-size: 13px; color: #475569;">
                    <span id="selectedStudentCount">0</span> students selected to add
                </span>
                <span style="font-size: 12px; color: #94a3b8;">
                    ${differentBlockCount > 0 ? `⚠️ ${differentBlockCount} students from different blocks` : 'All students match the current block'}
                </span>
            </div>
            
            <!-- Actions -->
            <div style="margin-top: 16px; display: flex; gap: 12px; justify-content: flex-end; flex-wrap: wrap;">
                <button onclick="closeStudentManager()" style="padding: 10px 24px; background: #e2e8f0; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">
                    Close
                </button>
                <button onclick="addSelectedStudentsToUnit()" id="addStudentsBtn" style="padding: 10px 24px; background: #4C1D95; border: none; border-radius: 6px; color: white; cursor: pointer; font-weight: 600;">
                    <i class="fas fa-user-plus"></i> Add Selected Students
                </button>
            </div>
        </div>
    `;
    
    updateSelectedCount();
    updateEnrolledSelectedCount();
}

// ============================================================
// ENROLLED STUDENT SELECTION FUNCTIONS
// ============================================================

function updateEnrolledSelectedCount() {
    const checkboxes = document.querySelectorAll('.enrolled-checkbox:checked');
    const count = checkboxes.length;
    
    const countEl = document.getElementById('enrolledSelectedCount');
    if (countEl) countEl.textContent = count;
    
    const dropBtn = document.getElementById('dropEnrolledBtn');
    const dropCount = document.getElementById('dropEnrolledCount');
    
    if (dropBtn) {
        dropBtn.style.display = count > 0 ? 'inline-block' : 'none';
    }
    if (dropCount) dropCount.textContent = count;
}

function selectAllEnrolledStudents() {
    document.querySelectorAll('.enrolled-checkbox').forEach(cb => {
        cb.checked = true;
    });
    updateEnrolledSelectedCount();
}

function deselectAllEnrolledStudents() {
    document.querySelectorAll('.enrolled-checkbox').forEach(cb => {
        cb.checked = false;
    });
    updateEnrolledSelectedCount();
}

async function dropSelectedEnrolledStudents() {
    const checkboxes = document.querySelectorAll('.enrolled-checkbox:checked');
    const selected = Array.from(checkboxes).map(cb => cb.dataset.admission);
    
    if (selected.length === 0) {
        showNotification('No students selected', 'warning');
        return;
    }
    
    const unit = me_currentUnit || document.getElementById('me_subject_select')?.value;
    const block = me_currentBlock || document.getElementById('me_block_select')?.value;
    const year = me_currentYear || document.getElementById('me_year_select')?.value || '2025';
    
    if (!unit || !block) {
        showNotification('Please select a unit and block first', 'warning');
        return;
    }
    
    if (!confirm(`⚠️ Remove ${selected.length} selected student(s) from "${unit}"?\n\nTheir marks will be permanently deleted.`)) {
        return;
    }
    
    showLoadingScreen(`Removing ${selected.length} students...`, 'Removing Students');
    updateLoadingProgress(10, 1, 'Processing...');
    
    try {
        if (!window.sb) throw new Error('Database not available');
        
        let removed = 0;
        let errors = 0;
        
        updateLoadingProgress(30, 1, 'Removing records...');
        
        for (const admission of selected) {
            const { error } = await window.sb
                .from('student_marks')
                .delete()
                .eq('admission_number', admission)
                .eq('block', block)
                .eq('subject_name', unit)
                .eq('academic_year', year);
            
            if (error) {
                console.error('❌ Error removing:', admission, error);
                errors++;
            } else {
                removed++;
            }
        }
        
        hideLoadingScreen();
        
        if (errors > 0) {
            showNotification(`⚠️ Removed ${removed} students, ${errors} errors`, 'warning');
        } else {
            showNotification(`✅ ${removed} students removed from "${unit}"`, 'success');
        }
        
        // Refresh the student manager
        openMarksStudentManager();
        loadMarksEntry();
        
    } catch (error) {
        hideLoadingScreen();
        console.error('❌ Error removing students:', error);
        showNotification('❌ Error: ' + error.message, 'error');
    }
}

async function dropSingleEnrolledStudent(admission) {
    const unit = me_currentUnit || document.getElementById('me_subject_select')?.value;
    const block = me_currentBlock || document.getElementById('me_block_select')?.value;
    const year = me_currentYear || document.getElementById('me_year_select')?.value || '2025';
    
    if (!unit || !block) {
        showNotification('Please select a unit and block first', 'warning');
        return;
    }
    
    // Get student name
    let studentName = 'this student';
    try {
        const { data: student } = await window.sb
            .from('consolidated_user_profiles_table')
            .select('full_name')
            .eq('student_id', admission)
            .single();
        if (student) studentName = student.full_name;
    } catch (e) {}
    
    if (!confirm(`⚠️ Remove "${studentName}" from "${unit}"?\n\nTheir marks will be permanently deleted.`)) {
        return;
    }
    
    showLoadingScreen(`Removing ${studentName}...`, 'Removing Student');
    updateLoadingProgress(10, 1, 'Processing...');
    
    try {
        if (!window.sb) throw new Error('Database not available');
        
        const { error } = await window.sb
            .from('student_marks')
            .delete()
            .eq('admission_number', admission)
            .eq('block', block)
            .eq('subject_name', unit)
            .eq('academic_year', year);
        
        if (error) throw error;
        
        hideLoadingScreen();
        showNotification(`✅ ${studentName} removed from "${unit}"`, 'success');
        
        // Refresh
        openMarksStudentManager();
        loadMarksEntry();
        
    } catch (error) {
        hideLoadingScreen();
        console.error('❌ Error removing student:', error);
        showNotification('❌ Error: ' + error.message, 'error');
    }
}

async function clearAllEnrolledStudents() {
    const unit = me_currentUnit || document.getElementById('me_subject_select')?.value;
    const block = me_currentBlock || document.getElementById('me_block_select')?.value;
    const year = me_currentYear || document.getElementById('me_year_select')?.value || '2025';
    
    if (!unit || !block) {
        showNotification('Please select a unit and block first', 'warning');
        return;
    }
    
    if (!confirm(`⚠️ Remove ALL students from "${unit}"?\n\nThis will delete ALL marks for this unit.`)) {
        return;
    }
    
    showLoadingScreen('Removing all students...', 'Clearing Unit');
    updateLoadingProgress(10, 1, 'Processing...');
    
    try {
        if (!window.sb) throw new Error('Database not available');
        
        const { error } = await window.sb
            .from('student_marks')
            .delete()
            .eq('block', block)
            .eq('subject_name', unit)
            .eq('academic_year', year);
        
        if (error) throw error;
        
        hideLoadingScreen();
        showNotification(`✅ All students removed from "${unit}"`, 'success');
        
        // Refresh
        openMarksStudentManager();
        loadMarksEntry();
        
    } catch (error) {
        hideLoadingScreen();
        console.error('❌ Error clearing students:', error);
        showNotification('❌ Error: ' + error.message, 'error');
    }
}
// ============================================================
// INTAKE YEAR FILTER FUNCTIONS
// ============================================================

function filterAvailableStudentsByYear() {
    const selectedYear = document.getElementById('intakeYearFilter')?.value || 'all';
    const items = document.querySelectorAll('#availableStudentsList .student-item');
    let visibleCount = 0;
    
    items.forEach(item => {
        const year = item.dataset.year || 'N/A';
        if (selectedYear === 'all' || year === selectedYear) {
            item.style.display = 'flex';
            visibleCount++;
        } else {
            item.style.display = 'none';
        }
    });
    
    const countEl = document.getElementById('filteredAvailableCount');
    if (countEl) countEl.textContent = visibleCount;
}

function resetYearFilter() {
    const filter = document.getElementById('intakeYearFilter');
    if (filter) filter.value = 'all';
    filterAvailableStudentsByYear();
}

function selectSameIntakeYear() {
    // Get the current selected year from filter
    const selectedYear = document.getElementById('intakeYearFilter')?.value || 'all';
    
    if (selectedYear === 'all') {
        showNotification('Please select a specific year from the filter dropdown first', 'info');
        return;
    }
    
    const items = document.querySelectorAll('#availableStudentsList .student-item');
    items.forEach(item => {
        const year = item.dataset.year || 'N/A';
        const checkbox = item.querySelector('input[type="checkbox"]');
        if (checkbox) {
            checkbox.checked = (year === selectedYear);
        }
    });
    
    updateSelectedCount();
    showNotification(`✅ Selected all students from ${selectedYear}`, 'success');
}
// ============================================================
// STUDENT MANAGER HELPER FUNCTIONS
// ============================================================

function createStudentManagerModal() {
    // Check if modal already exists
    if (document.getElementById('studentManagerModal')) return;
    
    const modalHTML = `
    <div id="studentManagerModal" style="display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 99999; align-items: center; justify-content: center; overflow-y: auto;">
        <div style="background: white; border-radius: 16px; max-width: 800px; width: 95%; max-height: 90vh; overflow-y: auto; padding: 20px; box-shadow: 0 20px 60px rgba(0,0,0,0.3);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                <h3 style="margin: 0; color: #1e293b;">
                    <i class="fas fa-users" style="color: #4C1D95;"></i> Manage Students
                </h3>
                <button onclick="closeStudentManager()" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #94a3b8;">&times;</button>
            </div>
            <div id="studentManagerBody"></div>
        </div>
    </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function closeStudentManager() {
    const modal = document.getElementById('studentManagerModal');
    if (modal) modal.style.display = 'none';
}

function selectAllAvailableStudents() {
    document.querySelectorAll('#availableStudentsList input[type="checkbox"]').forEach(cb => {
        cb.checked = true;
    });
    updateSelectedCount();
}

function deselectAllAvailableStudents() {
    document.querySelectorAll('#availableStudentsList input[type="checkbox"]').forEach(cb => {
        cb.checked = false;
    });
    updateSelectedCount();
}

function selectDifferentBlockStudents() {
    const block = me_currentBlock || document.getElementById('me_block_select')?.value;
    document.querySelectorAll('#availableStudentsList input[type="checkbox"]').forEach(cb => {
        const studentBlock = cb.dataset.block || '';
        if (studentBlock && studentBlock !== block) {
            cb.checked = true;
        }
    });
    updateSelectedCount();
}

function filterStudentManagerList() {
    const searchTerm = document.getElementById('studentSearchInput')?.value?.toLowerCase() || '';
    const items = document.querySelectorAll('#availableStudentsList .student-item');
    
    items.forEach(item => {
        const name = item.dataset.name || '';
        const admission = item.dataset.admission || '';
        const match = name.includes(searchTerm) || admission.includes(searchTerm);
        item.style.display = match ? 'flex' : 'none';
    });
}

function updateSelectedCount() {
    const count = document.querySelectorAll('#availableStudentsList input[type="checkbox"]:checked').length;
    const el = document.getElementById('selectedStudentCount');
    if (el) el.textContent = count;
}
// ============================================================
// LOAD MARKS STUDENT MANAGER DATA
// ============================================================

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

window.loadMarksStudentManagerData = loadMarksStudentManagerData;

// ============================================================
// RENDER STUDENT MANAGER
// ============================================================

function renderMarksStudentManager() {
    const container = document.getElementById('marksStudentManagerBody');
    if (!container) return;
    
    const { allStudents, enrolledStudents, availableStudents, block, unit, program, year } = me_studentManagerData;
    
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
                        <th style="padding: 8px; text-align: center;">Total</th>
                        <th style="padding: 8px; text-align: center;">Grade</th>
                        <th style="padding: 8px; text-align: center;">Actions</th>
                    </tr>
                </thead>
                <tbody>
        `;
    
    if (!enrolledStudents || enrolledStudents.length === 0) {
        html += `
            <tr>
                <td colspan="12" style="padding: 30px; text-align: center; color: #94a3b8;">
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
            const total = s.final_score || 0;
            const grade = s.grade || '-';
            const hasMarks = cat1 > 0 || cat2 > 0 || exam > 0;
            const isPassing = total >= getPassingThreshold();
            
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
                    <td style="padding: 8px; text-align: center; font-weight: bold; color: ${isPassing ? '#065f46' : (hasMarks ? '#991b1b' : '#94a3b8')};">${hasMarks ? total : '-'}</td>
                    <td style="padding: 8px; text-align: center; font-weight: bold; color: ${isPassing ? '#065f46' : (hasMarks ? '#991b1b' : '#94a3b8')};">${hasMarks ? grade : '-'}</td>
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

window.renderMarksStudentManager = renderMarksStudentManager;

// ============================================================
// ADD STUDENT TO MARKS UNIT
// ============================================================

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

window.addStudentToMarksUnit = addStudentToMarksUnit;

// ============================================================
// ADD ALL AVAILABLE STUDENTS
// ============================================================

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

window.addAllAvailableStudentsToMarksUnit = addAllAvailableStudentsToMarksUnit;

// ============================================================
// RELOAD STUDENT MANAGER
// ============================================================

async function reloadMarksStudentManager() {
    const { block, unit, program, year } = me_studentManagerData;
    await loadMarksStudentManagerData(block, unit, program, year);
}

window.reloadMarksStudentManager = reloadMarksStudentManager;

// ============================================================
// TOGGLE ALL STUDENTS
// ============================================================

function toggleAllStudents() {
    const selectAll = document.getElementById('selectAllStudents');
    const checkboxes = document.querySelectorAll('.student-checkbox');
    const isChecked = selectAll?.checked || false;
    checkboxes.forEach(cb => cb.checked = isChecked);
    updateSelectedCount();
}

window.toggleAllStudents = toggleAllStudents;

function toggleAllStudentsCheckbox() {
    const selectAll = document.getElementById('selectAllCheckbox');
    const checkboxes = document.querySelectorAll('.student-checkbox');
    const isChecked = selectAll?.checked || false;
    checkboxes.forEach(cb => cb.checked = isChecked);
    updateSelectedCount();
}

window.toggleAllStudentsCheckbox = toggleAllStudentsCheckbox;

// ============================================================
// UPDATE SELECTED COUNT
// ============================================================

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

window.updateSelectedCount = updateSelectedCount;

// ============================================================
// DROP SELECTED STUDENTS
// ============================================================

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

window.dropSelectedStudents = dropSelectedStudents;

// ============================================================
// REMOVE SINGLE STUDENT
// ============================================================

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

window.removeStudentFromMarksUnit = removeStudentFromMarksUnit;

// ============================================================
// CLEAR ALL STUDENTS
// ============================================================

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

window.clearAllStudentsFromMarksUnit = clearAllStudentsFromMarksUnit;

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

window.escapeHtml = escapeHtml;

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
// PUBLISH FUNCTIONS
// ============================================================

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

window.publishCurrentUnitMarks = publishCurrentUnitMarks;

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

window.openStudentPublishModal = openStudentPublishModal;

function closeStudentPublishModal() {
    document.getElementById('studentPublishModal').style.display = 'none';
}

window.closeStudentPublishModal = closeStudentPublishModal;

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

window.loadStudentPublishList = loadStudentPublishList;

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
        const total = mark.final || mark.final_score || 0;
        const grade = mark.grade || '-';
        const isPublished = mark.published === true;
        const isPassing = total >= getPassingThreshold();
        const isSelected = sp_selected.has(admission);
        const gradeInfo = getMarksEntryGrade(total);
        const gradeColor = gradeInfo.color;
        const hasRetake = mark.hasRetake || false;
        const retakeStatus = mark.retakeStatus || '';
        
        html += `
            <tr style="border-bottom: 1px solid #e5e7eb; ${index % 2 === 0 ? 'background: #f8fafc;' : ''}">
                <td style="padding: 8px 12px; text-align: center;">
                    <input type="checkbox" class="sp-student-checkbox" data-admission="${admission}" 
                           ${isSelected ? 'checked' : ''} ${isPublished ? 'disabled' : ''}
                           onchange="toggleStudentSelection('${admission}', this.checked)" 
                           style="width: 16px; height: 16px; cursor: ${isPublished ? 'not-allowed' : 'pointer'};">
                </td>
                <td style="padding: 8px 12px; font-weight: 500;">
                    ${escapeHtml(name)}
                    ${hasRetake ? `<span style="display: inline-block; margin-left: 4px; background: #f59e0b; color: white; font-size: 8px; padding: 1px 8px; border-radius: 10px; font-weight: 700;">⭐ R</span>` : ''}
                </td>
                <td style="padding: 8px 12px; font-size: 12px; color: #64748b;">${escapeHtml(admission)}</td>
                <td style="padding: 8px 12px; text-align: center; font-weight: 600; color: ${isPassing ? '#10b981' : '#dc2626'};">${total}</td>
                <td style="padding: 8px 12px; text-align: center;">
                    <span style="background: ${gradeColor}; color: white; padding: 2px 10px; border-radius: 12px; font-weight: 700; font-size: 12px;">${escapeHtml(grade)}</span>
                </td>
                <td style="padding: 8px 12px; text-align: center;">
                    <span style="color: ${isPassing ? '#10b981' : '#dc2626'}; font-weight: 600; font-size: 12px;">
                        ${isPassing ? '✅ Pass' : '❌ Fail'}
                    </span>
                    ${retakeStatus ? `<br><span style="font-size: 9px; color: ${retakeStatus === 'PASS' ? '#059669' : '#dc2626'};">Retake: ${retakeStatus}</span>` : ''}
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

window.renderStudentPublishList = renderStudentPublishList;

function toggleStudentSelection(admission, checked) {
    if (checked) {
        sp_selected.add(admission);
    } else {
        sp_selected.delete(admission);
    }
    updateStudentPublishStats();
}

window.toggleStudentSelection = toggleStudentSelection;

function selectAllStudents() {
    const checkboxes = document.querySelectorAll('.sp-student-checkbox:not([disabled])');
    checkboxes.forEach(cb => {
        cb.checked = true;
        sp_selected.add(cb.dataset.admission);
    });
    updateStudentPublishStats();
}

window.selectAllStudents = selectAllStudents;

function deselectAllStudents() {
    const checkboxes = document.querySelectorAll('.sp-student-checkbox');
    checkboxes.forEach(cb => {
        cb.checked = false;
        sp_selected.delete(cb.dataset.admission);
    });
    updateStudentPublishStats();
}

window.deselectAllStudents = deselectAllStudents;

function selectPassingStudents() {
    const marks = sp_students;
    marks.forEach(m => {
        const total = m.final || m.final_score || 0;
        const admission = m.admission || m.admission_number || '';
        if (total >= getPassingThreshold() && !m.published) {
            sp_selected.add(admission);
        }
    });
    renderStudentPublishList(sp_students);
    updateStudentPublishStats();
}

window.selectPassingStudents = selectPassingStudents;

function selectFailingStudents() {
    const marks = sp_students;
    marks.forEach(m => {
        const total = m.final || m.final_score || 0;
        const admission = m.admission || m.admission_number || '';
        if (total > 0 && total < getPassingThreshold() && !m.published) {
            sp_selected.add(admission);
        }
    });
    renderStudentPublishList(sp_students);
    updateStudentPublishStats();
}

window.selectFailingStudents = selectFailingStudents;

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

window.toggleAllStudentCheckboxes = toggleAllStudentCheckboxes;

function filterStudentPublishList() {
    renderStudentPublishList(sp_students);
}

window.filterStudentPublishList = filterStudentPublishList;

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

window.updateStudentPublishStats = updateStudentPublishStats;

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

window.publishSelectedStudents = publishSelectedStudents;

// ============================================================
// GLOBAL REGISTRATION
// ============================================================

// Program detection
window.isTVETProgram = isTVETProgram;
window.isNursingProgram = isNursingProgram;
window.getExamMax = getExamMax;
window.getTotalMax = getTotalMax;
window.getPassingThreshold = getPassingThreshold;
window.getProgramTypeLabel = getProgramTypeLabel;

// Calculations
window.calculateNursingTotal = calculateNursingTotal;
window.calculateTVETTotal = calculateTVETTotal;
window.calculateMarksEntryTotal = calculateMarksEntryTotal;

// Grading
window.getNursingGrade = getNursingGrade;
window.getTVETGrade = getTVETGrade;
window.getMarksEntryGrade = getMarksEntryGrade;

// Retake functions
window.loadRetakeData = loadRetakeData;
window.recordRetakeExam = recordRetakeExam;
window.openRetakeModal = openRetakeModal;
window.closeRetakeModal = closeRetakeModal;
window.saveRetakeExam = saveRetakeExam;
window.createRetakeModal = createRetakeModal;

// Main functions
window.loadMEBlocks = loadMEBlocks;
window.loadMEUnits = loadMEUnits;
window.loadMarksEntry = loadMarksEntry;
window.renderMarksEntryTable = renderMarksEntryTable;
window.updateMarksEntryRow = updateMarksEntryRow;
window.saveMarksEntry = saveMarksEntry;
window.exportMarksEntry = exportMarksEntry;
window.refreshMarksData = refreshMarksData;
window.updateMarksEntryStats = updateMarksEntryStats;
window.downloadCSV = downloadCSV;
window.recalculateAllTotals = recalculateAllTotals;

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
window.showLecturerAssignmentModal = showLecturerAssignmentModal;
window.closeLecturerAssignmentModal = closeLecturerAssignmentModal;
window.saveLecturerAssignment = saveLecturerAssignment;

// Assignment history
window.loadAssignmentHistory = loadAssignmentHistory;
window.refreshAssignmentHistory = refreshAssignmentHistory;
window.clearAllAssignments = clearAllAssignments;

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

// Auto-detect functions
window.detectVisibleColumns = detectVisibleColumns;
window.getAutoAssessmentType = getAutoAssessmentType;
window.updateAssessmentTypeDisplay = updateAssessmentTypeDisplay;

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

// Utility
window.escapeHtml = escapeHtml;

console.log('✅ Marks Entry System Fully Loaded!');
console.log('📋 Features:');
console.log('   - ✅ Nursing calculation (CAT1+CAT2=60%, Exam=40%)');
console.log('   - ✅ TVET calculation (CAT1+CAT2+Exam=160 total)');
console.log('   - ✅ Nursing grading (A,B,C,D with points)');
console.log('   - ✅ TVET competency grading (A,B,C,E with points)');
console.log('   - ✅ Auto-assessment type detection');
console.log('   - ✅ Column management (Admin only)');
console.log('   - ✅ Lecturer assignment management');
console.log('   - ✅ Assignment history');
console.log('   - ✅ Student management with select all');
console.log('   - ✅ Auto-approve on save for Admin');
console.log('   - ✅ Export to CSV');
console.log('   - ✅ Publish marks (all or selected students)');
console.log('   - ✅ ⭐ RETAKE/SUPPLEMENTARY EXAM SUPPORT');
console.log('   - ✅ Retake history tracking');
console.log('   - ✅ Retake attempt limits (max 2)');
console.log('   - ✅ Visual retake indicators on report cards');
