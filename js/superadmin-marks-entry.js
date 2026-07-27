// ============================================================
// MARKS ENTRY SYSTEM - SUPER ADMIN (FULLY FIXED)
// WITH AUTO-APPROVE ON SAVE
// ============================================================

// ============================================================
// STATE
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
// DETECT VISIBLE COLUMNS - FIXED
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
    
    // ✅ Check saved settings FIRST
    const savedColumns = me_columnSettings.columns || [];
    const savedCat1 = savedColumns.find(c => c.id === 'cat1');
    const savedCat2 = savedColumns.find(c => c.id === 'cat2');
    const savedExam = savedColumns.find(c => c.id === 'exam');
    
    // ✅ Use saved settings if they exist
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
    
    // ✅ If not saved, check DOM
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
    
    // ✅ Default to true if still not set
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
    const labels = {
        'full': 'Full (CAT1+CAT2+Exam)',
        'single_cat': 'Single CAT (CAT+Exam)',
        'exam_only': 'Exam Only',
        'cats_only': 'CAT1+CAT2 Only',
        'cat_only': 'CAT Only'
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
        
        const totalEl = document.getElementById(`me_total_${index}`);
        if (totalEl) {
            totalEl.textContent = total > 0 ? total : '--';
            totalEl.style.color = total >= 60 ? '#065f46' : (total > 0 ? '#991b1b' : '#f59e0b');
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
                ratingEl.innerHTML = `<span style="background: ${total >= 60 ? '#d1fae5' : '#fee2e2'}; padding: 3px 12px; border-radius: 12px; color: ${total >= 60 ? '#065f46' : '#991b1b'}; font-weight: 600; display: inline-block;">${gradeInfo.rating}</span>`;
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
        
        // ✅ Load lecturer assignments for this block
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
// LOAD MARKS ENTRY - SHOW ALL ENROLLED STUDENTS (Even with 0 marks)
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
    
    if (!program || !block || !unit) {
        if (dynamicContent) dynamicContent.style.display = 'none';
        if (placeholder) placeholder.style.display = 'block';
        document.getElementById('me_marks_container').innerHTML = `
            <div style="text-align: center; padding: 60px 20px;">
                <i class="fas fa-pen-alt" style="font-size: 48px; color: #94a3b8; margin-bottom: 16px; display: block;"></i>
                <h3 style="color: #1e293b;">Select Program, Block and Unit</h3>
                <p style="color: #94a3b8;">Choose from the dropdowns above to load marks</p>
            </div>
        `;
        return;
    }
    
    if (dynamicContent) dynamicContent.style.display = 'block';
    if (placeholder) placeholder.style.display = 'none';
    
    me_currentProgram = program;
    me_currentBlock = block;
    me_currentUnit = unit;
    me_currentYear = year;
    me_currentAssessmentType = assessmentType;
    
    document.getElementById('me_marks_container').innerHTML = `
        <div style="text-align: center; padding: 40px;">
            <div class="loading-spinner"></div>
            <p style="color: #6b7280; margin-top: 10px;">Loading marks for ${unitCode || unit}...</p>
        </div>
    `;
    
    try {
        // ✅ SOURCE OF TRUTH: Get ALL enrolled students from student_marks
        const { data: marks, error: marksError } = await sb
            .from('student_marks')
            .select('*')
            .eq('block', block)
            .eq('subject_name', unit)
            .eq('academic_year', year);
        
        if (marksError) throw marksError;
        
        console.log(`📊 Found ${marks?.length || 0} enrolled students for ${unit}`);
        
        if (!marks || marks.length === 0) {
            document.getElementById('me_marks_container').innerHTML = `
                <div style="text-align: center; padding: 60px 20px;">
                    <i class="fas fa-users" style="font-size: 48px; color: #94a3b8; margin-bottom: 16px; display: block;"></i>
                    <h3 style="color: #1e293b;">No students enrolled in this unit</h3>
                    <p style="color: #94a3b8;">Use "Manage Students" to add students to this unit</p>
                    <button onclick="openMarksStudentManager()" class="btn-action" style="margin-top: 12px; padding: 8px 20px; background: #4C1D95; color: white; border: none; border-radius: 6px; cursor: pointer;">
                        <i class="fas fa-users"></i> Manage Students
                    </button>
                </div>
            `;
            // ✅ Update stats to 0
            updateMarksEntryStats([], assessmentType);
            return;
        }
        
        // ✅ Get student names from profile (for display)
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
        
        // ✅ Build full marks data - SHOW ALL STUDENTS even with 0 scores
        const fullMarks = marks.map(m => {
            const admission = m.admission_number || '';
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
                approval_status: m.approval_status || 'draft'
            };
        });
        
        console.log(`📊 Displaying ${fullMarks.length} enrolled students (including those with 0 marks)`);
        
        me_currentMarks = fullMarks;
        renderMarksEntryTable(fullMarks, unitCode, assessmentType);
        updateMarksEntryStats(fullMarks, assessmentType);
        
        await loadUnitColumnSettings();
        updateAssessmentTypeDisplay();
        
    } catch (error) {
        console.error('Error loading marks:', error);
        document.getElementById('me_marks_container').innerHTML = `
            <div style="text-align: center; padding: 40px;">
                <i class="fas fa-exclamation-triangle" style="font-size: 48px; color: #f59e0b; margin-bottom: 16px; display: block;"></i>
                <h4 style="color: #991b1b;">Error loading marks</h4>
                <p style="color: #64748b;">${error.message}</p>
                <button onclick="loadMarksEntry()" class="btn-action" style="margin-top: 12px; padding: 8px 20px; background: #4C1D95; color: white; border: none; border-radius: 6px; cursor: pointer;">
                    <i class="fas fa-sync-alt"></i> Retry
                </button>
            </div>
        `;
        if (typeof showNotification === 'function') {
            showNotification('Error loading marks: ' + error.message, 'error');
        }
    }
}

// ============================================================
// RENDER MARKS TABLE - WITH AUTO DETECTION AND MANAGE STUDENTS
// ============================================================

function renderMarksEntryTable(marks, unitCode, assessmentType) {
    const container = document.getElementById('me_marks_container');
    if (!container) return;
    
    const withScores = marks.filter(m => m.cat1 > 0 || m.cat2 > 0 || m.exam > 0);
    const passing = marks.filter(m => {
        const total = calculateMarksEntryTotal(m.cat1, m.cat2, m.exam, assessmentType);
        return total >= 60;
    });
    
    const showCat1 = assessmentType !== 'exam_only';
    const showCat2 = assessmentType === 'full' || assessmentType === 'cats_only';
    const showExam = assessmentType !== 'cats_only' && assessmentType !== 'cat_only';
    const examMax = assessmentType === 'exam_only' ? 100 : 70;
    
    let html = `
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; margin-bottom: 16px;">
            <div>
                <h3 style="margin: 0; color: #0f172a;">${unitCode || me_currentUnit}</h3>
                <span style="font-size: 12px; color: #64748b;">${me_currentProgram} | ${me_currentBlock.replace('_', ' ')} | ${me_currentYear}</span>
                <span style="font-size: 12px; color: #64748b; margin-left: 12px; background: #e0f2fe; padding: 2px 12px; border-radius: 40px;">👥 ${marks.length} students</span>
                <span style="font-size: 12px; color: #059669; margin-left: 12px; background: #d1fae5; padding: 2px 12px; border-radius: 40px;">📊 ${withScores.length} with scores</span>
                <span style="font-size: 12px; color: #10b981; margin-left: 12px; background: #d1fae5; padding: 2px 12px; border-radius: 40px;">✅ ${passing.length} passing</span>
                <span style="font-size: 12px; color: #6b7280; margin-left: 12px; background: #f3f4f6; padding: 2px 12px; border-radius: 40px;">
                    📋 Auto: ${getAssessmentTypeLabel(assessmentType)}
                </span>
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
                ${isUserAdmin() ? `
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
                        ${showExam ? `<th style="padding: 10px 8px; text-align: center;">Exam (0-${examMax})</th>` : ''}
                        <th style="padding: 10px 8px; text-align: center;">Total</th>
                        <th style="padding: 10px 8px; text-align: center;">Grade</th>
                        <th style="padding: 10px 8px; text-align: center;">Points</th>
                        <th style="padding: 10px 8px; text-align: center;">Rating</th>
                        ${isUserAdmin() ? '<th style="padding: 10px 8px; text-align: center;">Approval</th>' : ''}
                    </tr>
                </thead>
                <tbody>`;
    
    marks.forEach((m, i) => {
        const cat1 = parseFloat(m.cat1) || 0;
        const cat2 = parseFloat(m.cat2) || 0;
        const exam = parseFloat(m.exam) || 0;
        const total = calculateMarksEntryTotal(cat1, cat2, exam, assessmentType);
        const gradeInfo = getMarksEntryGrade(total);
        const displayTotal = total > 0 ? total : '--';
        const displayGrade = total > 0 ? gradeInfo.grade : '--';
        const displayPoints = total > 0 ? gradeInfo.points.toFixed(1) : '--';
        
        const approvalBadge = {
            'pending': '<span style="background:#fef3c7;color:#92400e;padding:2px 8px;border-radius:12px;font-size:10px;">⏳ Pending</span>',
            'approved': '<span style="background:#d1fae5;color:#065f46;padding:2px 8px;border-radius:12px;font-size:10px;">✅ Approved</span>',
            'rejected': '<span style="background:#fee2e2;color:#991b1b;padding:2px 8px;border-radius:12px;font-size:10px;">❌ Rejected</span>',
            'draft': '<span style="background:#e5e7eb;color:#6b7280;padding:2px 8px;border-radius:12px;font-size:10px;">📝 Draft</span>'
        }[m.approval_status] || '<span style="background:#e5e7eb;color:#6b7280;padding:2px 8px;border-radius:12px;font-size:10px;">📝 Draft</span>';
        
        html += `<tr>
            <td style="padding: 8px 6px; text-align: center; font-size: 12px; color: #94a3b8;">${i + 1}</td>
            <td style="padding: 8px 8px; font-weight: 500; font-size: 12px;">${m.admission || 'N/A'}</td>
            <td style="padding: 8px 8px;"><strong>${m.name || 'Unknown'}</strong></td>
            ${showCat1 ? `<td style="padding: 8px; text-align: center;">
                <input type="number" id="me_cat1_${i}" value="${cat1}" min="0" max="30" step="0.5" style="width: 60px; padding: 6px; border-radius: 6px; border: 1px solid #e2e8f0; text-align: center;" onchange="updateMarksEntryRow(${i})">
            </td>` : ''}
            ${showCat2 ? `<td style="padding: 8px; text-align: center;">
                <input type="number" id="me_cat2_${i}" value="${cat2}" min="0" max="30" step="0.5" style="width: 60px; padding: 6px; border-radius: 6px; border: 1px solid #e2e8f0; text-align: center;" onchange="updateMarksEntryRow(${i})">
            </td>` : ''}
            ${showExam ? `<td style="padding: 8px; text-align: center;">
                <input type="number" id="me_exam_${i}" value="${exam}" min="0" max="${examMax}" step="0.5" style="width: 60px; padding: 6px; border-radius: 6px; border: 1px solid #e2e8f0; text-align: center;" onchange="updateMarksEntryRow(${i})">
            </td>` : ''}
            <td id="me_total_${i}" style="padding: 8px 6px; text-align: center; font-weight: bold; ${total >= 60 ? 'color: #065f46;' : (total > 0 ? 'color: #991b1b;' : 'color: #f59e0b;')}">${displayTotal}</td>
            <td id="me_grade_${i}" style="padding: 8px 6px; text-align: center; font-weight: bold; font-size: 16px; color: ${gradeInfo.color};">${displayGrade}</td>
            <td id="me_points_${i}" style="padding: 8px 6px; text-align: center; font-weight: bold; font-size: 15px; color: ${gradeInfo.color};">${displayPoints}</td>
            <td id="me_rating_${i}" style="padding: 8px 6px; text-align: center; font-size: 12px;">
                ${total > 0 ? `<span style="background: ${total >= 60 ? '#d1fae5' : '#fee2e2'}; padding: 3px 12px; border-radius: 12px; color: ${total >= 60 ? '#065f46' : '#991b1b'}; font-weight: 600; display: inline-block;">${gradeInfo.rating}</span>` : '<span style="color: #94a3b8;">PENDING</span>'}
            </td>
            ${isUserAdmin() ? `<td style="padding: 8px 6px; text-align: center; font-size: 11px;">${approvalBadge}</td>` : ''}
        </tr>`;
    });
    
    html += `
                </tbody>
            </table>
        </div>
        <div style="text-align: center; margin-top: 16px;">
            <button onclick="saveMarksEntry()" class="btn-action" style="background: #059669; padding: 10px 24px; border: none; border-radius: 8px; color: white; cursor: pointer; font-weight: 600; font-size: 14px;">
                <i class="fas fa-save"></i> 💾 Save All Marks (Auto-Approved)
            </button>
        </div>
    `;
    
    container.innerHTML = html;
}

// ============================================================
// UPDATE MARKS ROW
// ============================================================

function updateMarksEntryRow(index) {
    const cat1 = parseFloat(document.getElementById(`me_cat1_${index}`)?.value) || 0;
    const cat2 = parseFloat(document.getElementById(`me_cat2_${index}`)?.value) || 0;
    const exam = parseFloat(document.getElementById(`me_exam_${index}`)?.value) || 0;
    const assessmentType = me_currentAssessmentType;
    
    const total = calculateMarksEntryTotal(cat1, cat2, exam, assessmentType);
    const gradeInfo = getMarksEntryGrade(total);
    
    const totalEl = document.getElementById(`me_total_${index}`);
    if (totalEl) {
        totalEl.textContent = total > 0 ? total : '--';
        totalEl.style.color = total >= 60 ? '#065f46' : (total > 0 ? '#991b1b' : '#f59e0b');
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
            ratingEl.innerHTML = `<span style="background: ${total >= 60 ? '#d1fae5' : '#fee2e2'}; padding: 3px 12px; border-radius: 12px; color: ${total >= 60 ? '#065f46' : '#991b1b'}; font-weight: 600; display: inline-block;">${gradeInfo.rating}</span>`;
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
// CALCULATE TOTAL - SUPPORTS ALL ASSESSMENT TYPES
// ============================================================

function calculateMarksEntryTotal(cat1, cat2, exam, type) {
    let total = 0;
    
    switch(type) {
        case 'full':
            total = Math.round(((Math.min(cat1,30) + Math.min(cat2,30)) / 60 * 30 + Math.min(exam,70)) * 10) / 10;
            break;
            
        case 'single_cat':
            total = Math.round((Math.min(cat1,30) + Math.min(exam,70)) * 10) / 10;
            break;
            
        case 'exam_only':
            total = Math.round(Math.min(exam,100) * 10) / 10;
            break;
            
        case 'cats_only':
            total = Math.round(((Math.min(cat1,30) + Math.min(cat2,30)) / 60) * 100 * 10) / 10;
            break;
            
        case 'cat_only':
            total = Math.round((Math.min(cat1,30) / 30) * 100 * 10) / 10;
            break;
            
        default:
            total = Math.round(((Math.min(cat1,30) + Math.min(cat2,30)) / 60 * 30 + Math.min(exam,70)) * 10) / 10;
    }
    
    return total;
}

// ============================================================
// GET GRADE INFO
// ============================================================

function getMarksEntryGrade(score) {
    if (score >= 75) return { grade: 'A', rating: 'Distinction', points: 4, color: '#065f46' };
    else if (score >= 65) return { grade: 'B', rating: 'Credit', points: 3, color: '#1e40af' };
    else if (score >= 60) return { grade: 'C', rating: 'Pass', points: 2, color: '#92400e' };
    else return { grade: 'D', rating: 'Fail', points: 0, color: '#991b1b' };
}

// ============================================================
// UPDATE STATS - SHOW ALL ENROLLED STUDENTS
// ============================================================

function updateMarksEntryStats(marks, assessmentType) {
    // ✅ Count ALL enrolled students (including those with 0 marks)
    const totalEnrolled = marks.length;
    
    // ✅ Students with scores (any score > 0)
    const withScores = marks.filter(m => m.cat1 > 0 || m.cat2 > 0 || m.exam > 0);
    
    // ✅ Students passing
    const passing = marks.filter(m => {
        const total = calculateMarksEntryTotal(m.cat1, m.cat2, m.exam, assessmentType);
        return total >= 60;
    });
    
    // ✅ Average score (only students with scores)
    const avg = withScores.length > 0 ? 
        withScores.reduce((sum, m) => sum + calculateMarksEntryTotal(m.cat1, m.cat2, m.exam, assessmentType), 0) / withScores.length : 0;
    
    const totalEl = document.getElementById('me_total_students');
    const subjectsEl = document.getElementById('me_total_subjects');
    const passEl = document.getElementById('me_pass_rate');
    const avgEl = document.getElementById('me_class_avg');
    const atRiskEl = document.getElementById('me_at_risk');
    
    if (totalEl) totalEl.textContent = totalEnrolled;
    if (subjectsEl) subjectsEl.textContent = marks.length > 0 ? 1 : 0;
    if (passEl) passEl.textContent = totalEnrolled > 0 ? Math.round((passing.length / totalEnrolled) * 100) + '%' : '0%';
    if (avgEl) avgEl.textContent = Math.round(avg) + '%';
    
    // ✅ At risk: students with total < 60 (only those with scores)
    const atRisk = marks.filter(m => {
        const total = calculateMarksEntryTotal(m.cat1, m.cat2, m.exam, assessmentType);
        return total > 0 && total < 60;
    });
    if (atRiskEl) atRiskEl.textContent = atRisk.length;
}
// ============================================================
// SAVE MARKS - WITH AUTO-APPROVE FOR ADMIN
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
    
    // Collect all marks data
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
            
            let total = 0;
            if (assessmentType === 'full') {
                total = Math.round(((Math.min(cat1,30) + Math.min(cat2,30)) / 60 * 30 + Math.min(exam,70)) * 10) / 10;
            } else if (assessmentType === 'single_cat') {
                total = Math.round((Math.min(cat1,30) + Math.min(exam,70)) * 10) / 10;
            } else if (assessmentType === 'exam_only') {
                total = Math.round(Math.min(exam,100) * 10) / 10;
            } else {
                total = Math.round(((Math.min(cat1,30) + Math.min(cat2,30)) / 60 * 30 + Math.min(exam,70)) * 10) / 10;
            }
            
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
                // ✅ AUTO-APPROVE for admin
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
        
        // Process each mark individually
        for (const mark of marksData) {
            try {
                // Check if record exists
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
                
                // ✅ Always set to approved for admin
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
                
                let result;
                if (existing) {
                    // ✅ UPDATE with auto-approve
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
                    // ✅ INSERT with auto-approve
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
        
        // ✅ Refresh the table
        setTimeout(() => loadMarksEntry(), 500);
        
    } catch (error) {
        hideLoading();
        console.error('❌ Error saving marks:', error);
        showNotification('❌ Error saving marks: ' + error.message, 'error');
    }
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
// EXPORT MARKS TO CSV
// ============================================================

function exportMarksEntry() {
    const marks = me_currentMarks;
    if (!marks || marks.length === 0) {
        if (typeof showNotification === 'function') showNotification('No data to export', 'warning');
        return;
    }
    
    const assessmentType = me_currentAssessmentType;
    const headers = ['Admission', 'Name', 'CAT1', 'CAT2', 'Exam', 'Total', 'Grade', 'Points', 'Rating'];
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
            total > 0 ? gradeInfo.rating : ''
        ];
    });
    
    let csv = headers.join(',') + '\n';
    rows.forEach(row => {
        csv += row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',') + '\n';
    });
    
    downloadCSV(csv, `marks_${me_currentUnit}_${me_currentBlock}_${me_currentYear}.csv`);
    if (typeof showNotification === 'function') showNotification('✅ Marks exported!', 'success');
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
        { id: 'gradedBy', label: 'Graded By', required: false }
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
        else if (text.includes('graded by')) columnIndexMap['gradedBy'] = index;
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
        else if (text.includes('graded by')) colId = 'gradedBy';
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
            const departmentDisplay = getLecturerDepartment(lecturer);
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
            const department = a.department || lecturer?.department || 'N/A';
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
// GET LECTURER DEPARTMENT
// ============================================================

function getLecturerDepartment(lecturer) {
    if (lecturer.program === 'KRCHN') return 'Nursing';
    else if (lecturer.program === 'TVET') return 'TVET Department';
    else if (lecturer.department) return lecturer.department;
    else return 'General';
}

window.getLecturerDepartment = getLecturerDepartment;
// ============================================================
// STUDENT MANAGER FUNCTIONS - SHOW ALL STUDENTS
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
    
    // Show loading in modal
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

window.openMarksStudentManager = openMarksStudentManager;

// ============================================================
// LOAD MARKS STUDENT MANAGER DATA - SHOW ALL STUDENTS
// ============================================================

async function loadMarksStudentManagerData(block, unit, program, year) {
    const container = document.getElementById('marksStudentManagerBody');
    if (!container) return;
    
    console.log('📊 Loading student manager data...');
    console.log('📊 Block:', block, 'Unit:', unit, 'Program:', program, 'Year:', year);
    
    try {
        // ✅ Get ALL enrolled students from student_marks
        const { data: enrolledStudents, error: enrolledError } = await sb
            .from('student_marks')
            .select('*')
            .eq('block', block)
            .eq('subject_name', unit)
            .eq('academic_year', year);
        
        if (enrolledError) throw enrolledError;
        
        console.log(`📊 Enrolled students found: ${enrolledStudents?.length || 0}`);
        
        // ✅ Build enrolled map from student_marks
        const enrolledMap = {};
        enrolledStudents?.forEach(s => {
            if (s.admission_number) {
                enrolledMap[s.admission_number] = true;
            }
        });
        
        // ✅ Get ALL students from consolidated_user_profiles_table
        let query = sb
            .from('consolidated_user_profiles_table')
            .select('student_id, full_name, email, program, block, admission_number, status')
            .eq('role', 'student');
        
        // Filter by program if provided
        if (program) query = query.eq('program', program);
        // Filter by block if provided
        if (block) query = query.eq('block', block);
        
        const { data: profileStudents, error: profileError } = await query;
        if (profileError) throw profileError;
        
        console.log(`📊 Profile students found: ${profileStudents?.length || 0}`);
        
        // ✅ Get ALL students from student_marks (to include students not in profiles)
        const { data: allMarksStudents, error: marksError } = await sb
            .from('student_marks')
            .select('admission_number, student_name')
            .eq('block', block)
            .eq('academic_year', year);
        
        if (marksError) throw marksError;
        
        console.log(`📊 Marks students found: ${allMarksStudents?.length || 0}`);
        
        // ✅ Combine both sources - use student_id from profiles, admission_number from marks
        const allStudentsMap = {};
        
        // Add students from profiles
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
        
        // Add students from marks (if not already in map)
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
        console.log(`📊 Total unique students: ${allStudents.length}`);
        
        // ✅ Filter available students (not enrolled)
        const availableStudents = allStudents.filter(s => {
            return !enrolledMap[s.student_id] && !enrolledMap[s.admission_number];
        });
        
        console.log(`📊 Available students: ${availableStudents.length}`);
        
        // Store data
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
// RENDER STUDENT MANAGER - SHOW ALL STUDENTS
// ============================================================

function renderMarksStudentManager() {
    const container = document.getElementById('marksStudentManagerBody');
    if (!container) return;
    
    const { allStudents, enrolledStudents, availableStudents, block, unit, program, year } = me_studentManagerData;
    
    const totalEnrolled = enrolledStudents?.length || 0;
    const totalAvailable = availableStudents?.length || 0;
    const totalStudents = allStudents?.length || 0;
    
    console.log('📊 Rendering student manager...');
    console.log('📊 Total students:', totalStudents);
    console.log('📊 Available students:', totalAvailable);
    console.log('📊 Enrolled students:', totalEnrolled);
    
    // Build student dropdown options - SHOW ALL AVAILABLE STUDENTS
    let studentOptions = '<option value="">-- Select Student to Add --</option>';
    
    if (availableStudents && availableStudents.length > 0) {
        availableStudents.forEach(s => {
            const displayName = s.full_name || 'Unknown';
            const displayId = s.student_id || s.admission_number || 'N/A';
            const source = s.source === 'marks' ? '📌' : '';
            studentOptions += `<option value="${s.student_id || s.admission_number}">${displayName} (${displayId}) ${source}</option>`;
        });
        console.log('📊 Student options built:', availableStudents.length);
    } else {
        studentOptions = '<option value="">No available students</option>';
        console.log('📊 No available students found');
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
            const isPassing = total >= 60;
            
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
    
    console.log('📊 Add student - selected ID:', studentId);
    
    if (!studentId) {
        showNotification('Please select a student to add', 'warning');
        return;
    }
    
    const { block, unit, program, year } = me_studentManagerData;
    
    if (!block || !unit) {
        showNotification('Please select a block and unit first', 'warning');
        return;
    }
    
    // Find student in available list
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
        
        console.log('📊 Inserting mark data:', markData);
        
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
// ADD ALL AVAILABLE STUDENTS TO MARKS UNIT
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
        
        console.log('📊 Inserting all students:', inserts.length);
        
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
// REMOVE SINGLE STUDENT FROM MARKS UNIT
// ============================================================

async function removeStudentFromMarksUnit(admission) {
    const { block, unit, year } = me_studentManagerData;
    
    if (!block || !unit) {
        showNotification('Please select a block and unit first', 'warning');
        return;
    }
    
    // Find student name
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
// CLEAR ALL STUDENTS FROM MARKS UNIT
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



console.log('✅ Student Manager Functions Fully Loaded!');
console.log('📋 Student Manager Features:');
console.log('   - ✅ Shows ALL students from profiles and marks tables');
console.log('   - ✅ Add Single Student');
console.log('   - ✅ Add All Students');
console.log('   - ✅ Drop Selected Students');
console.log('   - ✅ Remove Single Student');
console.log('   - ✅ Clear All Students');
// ============================================================
// SHOW/HIDE NOTIFICATION/LOADING FUNCTIONS
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

// Main functions
window.loadMEBlocks = loadMEBlocks;
window.loadMEUnits = loadMEUnits;
window.loadMarksEntry = loadMarksEntry;
window.renderMarksEntryTable = renderMarksEntryTable;
window.updateMarksEntryRow = updateMarksEntryRow;
window.saveMarksEntry = saveMarksEntry;
window.exportMarksEntry = exportMarksEntry;
window.refreshMarksData = refreshMarksData;
window.calculateMarksEntryTotal = calculateMarksEntryTotal;
window.getMarksEntryGrade = getMarksEntryGrade;
window.updateMarksEntryStats = updateMarksEntryStats;
window.downloadCSV = downloadCSV;

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
window.getLecturerDepartment = getLecturerDepartment;

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
window.recalculateAllTotals = recalculateAllTotals;

// Debug
window.escapeHtml = escapeHtml;

console.log('✅ Marks Entry System Fully Loaded!');
console.log('📋 Features:');
console.log('   - ✅ Auto-assessment type detection');
console.log('   - ✅ Column management (Admin only)');
console.log('   - ✅ Lecturer assignment management');
console.log('   - ✅ Assignment history');
console.log('   - ✅ Student management with select all');
console.log('   - ✅ Auto-approve on save for Admin');
console.log('   - ✅ Export to CSV');
console.log('   - ✅ Dynamic content toggle');
