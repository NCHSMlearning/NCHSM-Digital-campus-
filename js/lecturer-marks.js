// ============================================================
// LECTURER MARKS MODULE - COMPLETE WITH RETAKE/SUPPLEMENTARY SUPPORT
// FIXED: Lecturers save as DRAFT, not APPROVED
// FIXED: Lecturers can edit retake marks
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
let me_approvalStatus = 'draft';
let me_currentLecturer = null;
let me_columnSettings = { columns: [] };
let me_assignedUnits = [];
let _loadingActive = false;

// ============================================================
// RETAKE/SUPPLEMENTARY STATE
// ============================================================

let lecturerRetakeData = {};
let lecturerCurrentRetakeStudent = null;
let lecturerCurrentRetakeUnit = null;
const LECTURER_MAX_RETAKES = 2;

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
        
        return false;
        
    } catch (e) {
        return false;
    }
}

// ============================================================
// LOADING SCREEN FUNCTIONS
// ============================================================

function showLoadingScreen(message, title = 'Loading...') {
    const screen = document.getElementById('loadingScreen');
    const titleEl = document.getElementById('loadingTitle');
    const msgEl = document.getElementById('loadingMessage');
    const progressEl = document.getElementById('loadingProgress');
    
    if (screen) {
        screen.className = 'show';
        screen.style.display = 'flex';
    }
    if (titleEl) titleEl.textContent = title;
    if (msgEl) msgEl.textContent = message || 'Please wait while we load your data';
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
        1: { el: 'step1', icon: 'step1Icon', text: 'step1Text' },
        2: { el: 'step2', icon: 'step2Icon', text: 'step2Text' },
        3: { el: 'step3', icon: 'step3Icon', text: 'step3Text' },
        4: { el: 'step4', icon: 'step4Icon', text: 'step4Text' }
    };
    
    const s = stepMap[step];
    if (!s) return;
    
    const stepEl = document.getElementById(s.el);
    const iconEl = document.getElementById(s.icon);
    const textEl = document.getElementById(s.text);
    
    if (stepEl) {
        stepEl.style.opacity = '1';
        stepEl.style.color = '#1e293b';
    }
    if (iconEl) iconEl.textContent = '✅';
    if (textEl) textEl.textContent = text;
    
    for (let i = 1; i < step; i++) {
        const prev = stepMap[i];
        if (prev) {
            const prevStep = document.getElementById(prev.el);
            if (prevStep) {
                prevStep.style.opacity = '1';
                prevStep.style.color = '#059669';
            }
            const prevIcon = document.getElementById(prev.icon);
            if (prevIcon) prevIcon.textContent = '✅';
        }
    }
}

function resetLoadingSteps() {
    const steps = [
        { el: 'step1', icon: 'step1Icon', text: 'step1Text' },
        { el: 'step2', icon: 'step2Icon', text: 'step2Text' },
        { el: 'step3', icon: 'step3Icon', text: 'step3Text' },
        { el: 'step4', icon: 'step4Icon', text: 'step4Text' }
    ];
    
    steps.forEach((s, index) => {
        const stepEl = document.getElementById(s.el);
        const iconEl = document.getElementById(s.icon);
        const textEl = document.getElementById(s.text);
        
        if (stepEl) {
            stepEl.style.opacity = index === 0 ? '1' : '0.4';
            stepEl.style.color = index === 0 ? '#1e293b' : '#94a3b8';
        }
        if (iconEl) iconEl.textContent = index === 0 ? '⏳' : '⏳';
        if (textEl) {
            const texts = ['Initializing...', 'Loading data...', 'Processing...', 'Rendering...'];
            textEl.textContent = texts[index] || '...';
        }
    });
}

function hideLoadingScreen() {
    const screen = document.getElementById('loadingScreen');
    if (screen) {
        screen.className = 'hide';
        setTimeout(() => {
            screen.style.display = 'none';
        }, 300);
    }
    console.log('✅ Loading complete');
}

// ============================================================
// NOTIFICATION FUNCTIONS
// ============================================================

let _lastNotification = '';
let _notificationTimeout = null;

function showNotification(message, type) {
    const key = message + type;
    if (_lastNotification === key) return;
    _lastNotification = key;
    
    if (_notificationTimeout) clearTimeout(_notificationTimeout);
    _notificationTimeout = setTimeout(() => { _lastNotification = ''; }, 1000);
    
    console.log(`[${type || 'info'}] ${message}`);
    
    try {
        if (window.LecturerUI && typeof window.LecturerUI.showNotification === 'function') {
            window.LecturerUI.showNotification(message, type || 'info');
            return;
        }
    } catch (e) { /* silent */ }
    
    try {
        const toast = document.createElement('div');
        const colors = {
            success: '#059669',
            error: '#dc2626',
            warning: '#f59e0b',
            info: '#3b82f6'
        };
        toast.style.cssText = `
            position: fixed; top: 20px; right: 20px; padding: 12px 20px;
            background: ${colors[type] || '#3b82f6'}; color: white;
            border-radius: 8px; font-weight: 500; z-index: 100000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            max-width: 400px;
            font-family: system-ui, -apple-system, sans-serif;
        `;
        toast.textContent = message;
        document.body.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transition = 'opacity 0.5s';
            setTimeout(() => toast.remove(), 500);
        }, 3000);
    } catch (e) { /* silent */ }
}

// ============================================================
// GRADING FUNCTIONS
// ============================================================

function getMarksEntryGrade(score) {
    if (score >= 75) return { grade: 'A', rating: 'Distinction', points: 4.0, color: '#065f46' };
    else if (score >= 65) return { grade: 'B', rating: 'Credit', points: 3.0, color: '#1e40af' };
    else if (score >= 60) return { grade: 'C', rating: 'Pass', points: 2.0, color: '#92400e' };
    else return { grade: 'D', rating: 'Fail', points: 0.0, color: '#991b1b' };
}

function calculateMarksEntryTotal(cat1, cat2, exam, type) {
    let total = 0;
    if (type === 'full') {
        total = Math.round(((Math.min(cat1,30) + Math.min(cat2,30)) / 60 * 30 + Math.min(exam,70)) * 10) / 10;
    } else if (type === 'single_cat') {
        total = Math.round((Math.min(cat1,30) + Math.min(exam,70)) * 10) / 10;
    } else if (type === 'exam_only') {
        total = Math.round(Math.min(exam,100) * 10) / 10;
    } else if (type === 'cats_only') {
        total = Math.round(((Math.min(cat1,30) + Math.min(cat2,30)) / 60) * 100 * 10) / 10;
    } else if (type === 'cat_only') {
        total = Math.round((Math.min(cat1,30) / 30) * 100 * 10) / 10;
    }
    return total;
}

// ============================================================
// RETAKE/SUPPLEMENTARY FUNCTIONS
// ============================================================

async function loadLecturerRetakeData(block, unit, year) {
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
        
        lecturerRetakeData = retakeMap;
        console.log(`📊 Loaded lecturer retake data for ${Object.keys(retakeMap).length} students`);
        return retakeMap;
        
    } catch (error) {
        console.error('Error loading lecturer retake data:', error);
        return {};
    }
}

// ============================================================
// RECORD LECTURER RETAKE EXAM - WITH AUTO-UNPUBLISH
// ============================================================

async function recordLecturerRetakeExam(admission, studentName, unit, block, program, year, examScore, remarks) {
    const existingRetakes = lecturerRetakeData[admission] || [];
    const attemptNumber = existingRetakes.length + 1;
    
    if (attemptNumber > LECTURER_MAX_RETAKES) {
        showNotification(`⚠️ Maximum retakes (${LECTURER_MAX_RETAKES}) reached for this student`, 'error');
        return false;
    }
    
    const total = Math.min(examScore, 100);
    const gradeInfo = getMarksEntryGrade(total);
    const isPassing = total >= 60;
    
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
        // ✅ Insert retake record
        const { error } = await sb
            .from('student_retakes')
            .insert(retakeData);
        
        if (error) {
            console.error('❌ Error inserting retake:', error);
            showNotification('❌ Error recording retake: ' + error.message, 'error');
            return false;
        }
        
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
                action_by: me_currentLecturer?.profile?.id || null,
                action_by_name: me_currentLecturer?.profile?.full_name || 'Lecturer',
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
        await loadLecturerRetakeData(block, unit, year);
        
        // ✅ STEP 7: Show notification
        let message = `✅ Retake recorded for ${studentName} (Attempt #${attemptNumber})`;
        if (existingMark && existingMark.published === true) {
            message += ' 🔓 Marks auto-unpublished - please review and re-publish';
        }
        showNotification(message, 'success');
        
        return true;
        
    } catch (error) {
        console.error('Error recording lecturer retake:', error);
        showNotification('❌ Error recording retake: ' + error.message, 'error');
        return false;
    }
}

function createLecturerRetakeModal() {
    if (document.getElementById('lecturerRetakeModal')) return;
    
    const modalHTML = `
    <div id="lecturerRetakeModal" style="display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 100000; align-items: center; justify-content: center;">
        <div style="background: white; border-radius: 16px; max-width: 500px; width: 90%; max-height: 90vh; overflow-y: auto; padding: 30px; box-shadow: 0 20px 60px rgba(0,0,0,0.3);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h3 style="margin: 0; color: #1e293b;">
                    <i class="fas fa-sync-alt" style="color: #f59e0b;"></i> Supplementary/Retake Exam
                </h3>
                <button onclick="closeLecturerRetakeModal()" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #94a3b8;">&times;</button>
            </div>
            
            <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #f59e0b;">
                <p style="margin: 0 0 4px 0;"><strong>Student:</strong> <span id="lretake_student_name"></span></p>
                <p style="margin: 0 0 4px 0;"><strong>Admission:</strong> <span id="lretake_admission"></span></p>
                <p style="margin: 0 0 4px 0;"><strong>Unit:</strong> <span id="lretake_unit"></span></p>
                <p style="margin: 0 0 4px 0;"><strong>Block:</strong> <span id="lretake_block"></span></p>
                <p style="margin: 0;"><strong>Attempt:</strong> #<span id="lretake_attempt"></span> of <span id="lretake_max_attempts">2</span></p>
            </div>
            
            <div id="lretake_history" style="display: none; margin-bottom: 15px; padding: 10px; background: #f8fafc; border-radius: 6px;">
                <p style="font-weight: 600; margin: 0 0 8px 0; font-size: 13px; color: #475569;">📋 Attempt History:</p>
                <div id="lretake_history_list"></div>
            </div>
            
            <div style="margin-bottom: 15px;">
                <label style="font-weight: 600; display: block; margin-bottom: 5px;">Exam Score (%)</label>
                <input type="number" id="lretake_score" min="0" max="100" step="0.5" 
                       style="width: 100%; padding: 10px; border-radius: 6px; border: 1px solid #e2e8f0; font-size: 14px;" 
                       placeholder="Enter score (0-100)">
            </div>
            
            <div style="margin-bottom: 20px;">
                <label style="font-weight: 600; display: block; margin-bottom: 5px;">Remarks (Optional)</label>
                <input type="text" id="lretake_remarks" 
                       style="width: 100%; padding: 10px; border-radius: 6px; border: 1px solid #e2e8f0; font-size: 14px;" 
                       placeholder="e.g., Improvement shown, Second attempt">
            </div>
            
            <div style="display: flex; gap: 10px; justify-content: flex-end;">
                <button onclick="closeLecturerRetakeModal()" style="padding: 10px 24px; background: #6b7280; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">
                    Cancel
                </button>
                <button onclick="saveLecturerRetakeExam()" style="padding: 10px 24px; background: #f59e0b; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">
                    <i class="fas fa-save"></i> Save Retake
                </button>
            </div>
        </div>
    </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function openLecturerRetakeModal(admission, name, unit, block) {
    let modal = document.getElementById('lecturerRetakeModal');
    if (!modal) {
        createLecturerRetakeModal();
        modal = document.getElementById('lecturerRetakeModal');
        if (!modal) {
            showNotification('Error opening retake modal', 'error');
            return;
        }
    }
    
    const retakes = lecturerRetakeData[admission] || [];
    const attemptNumber = retakes.length + 1;
    
    document.getElementById('lretake_student_name').textContent = name;
    document.getElementById('lretake_admission').textContent = admission;
    document.getElementById('lretake_unit').textContent = unit;
    document.getElementById('lretake_block').textContent = block.replace(/_/g, ' ');
    document.getElementById('lretake_attempt').textContent = attemptNumber;
    document.getElementById('lretake_max_attempts').textContent = LECTURER_MAX_RETAKES;
    
    const historyContainer = document.getElementById('lretake_history');
    const historyList = document.getElementById('lretake_history_list');
    
    if (historyContainer && historyList) {
        if (retakes.length > 0) {
            let historyHtml = '';
            retakes.forEach((r, i) => {
                const isPass = r.status === 'PASS';
                historyHtml += `<div style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid #e5e7eb; font-size: 12px;">
                    <span>Attempt #${r.attempt_number}</span>
                    <span style="font-weight: 600; color: ${isPass ? '#059669' : '#dc2626'};">${r.exam_score}%</span>
                    <span style="color: ${isPass ? '#059669' : '#dc2626'};">${r.status}</span>
                    <span style="color: #94a3b8; font-size: 10px;">${new Date(r.created_at).toLocaleDateString()}</span>
                </div>`;
            });
            historyList.innerHTML = historyHtml;
            historyContainer.style.display = 'block';
        } else {
            historyContainer.style.display = 'none';
        }
    }
    
    lecturerCurrentRetakeStudent = { admission, name };
    lecturerCurrentRetakeUnit = unit;
    
    document.getElementById('lretake_score').value = '';
    document.getElementById('lretake_remarks').value = '';
    
    modal.style.display = 'flex';
}

function closeLecturerRetakeModal() {
    const modal = document.getElementById('lecturerRetakeModal');
    if (modal) modal.style.display = 'none';
}

// ============================================================
// SAVE LECTURER RETAKE EXAM - ENHANCED WITH AUTO-UNPUBLISH FEEDBACK
// ============================================================

async function saveLecturerRetakeExam() {
    const scoreInput = document.getElementById('lretake_score');
    const remarksInput = document.getElementById('lretake_remarks');
    
    const examScore = parseFloat(scoreInput?.value);
    const remarks = remarksInput?.value || '';
    
    // ✅ Validate score
    if (isNaN(examScore) || examScore < 0 || examScore > 100) {
        showNotification('⚠️ Please enter a valid score between 0 and 100', 'warning');
        return;
    }
    
    // ✅ Validate student selected
    if (!lecturerCurrentRetakeStudent) {
        showNotification('⚠️ No student selected', 'error');
        return;
    }
    
    // ✅ Confirm before saving
    const studentName = lecturerCurrentRetakeStudent.name;
    const confirmMsg = `⚠️ Record retake for ${studentName}?\n\n` +
        `Score: ${examScore}%\n` +
        `Unit: ${lecturerCurrentRetakeUnit}\n` +
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
        const { admission, name } = lecturerCurrentRetakeStudent;
        const unit = lecturerCurrentRetakeUnit;
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
        const success = await recordLecturerRetakeExam(admission, name, unit, block, program, year, examScore, remarks);
        
        // ✅ Hide loading
        if (typeof hideLoading === 'function') {
            hideLoading();
        }
        
        if (success) {
            // ✅ Close modal
            closeLecturerRetakeModal();
            
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
// ============================================================
// GET LECTURER ASSIGNED UNITS
// ============================================================

async function getLecturerAssignedUnits(lecturerId, block = null) {
    console.log('📚 Getting assigned units for lecturer:', lecturerId);
    
    try {
        let query = sb
            .from('lecturer_subject_assignments')
            .select('subject_name, subject_code, block, program, academic_year')
            .eq('lecturer_id', String(lecturerId));
        
        if (block) {
            query = query.eq('block', block);
        }
        
        const { data, error } = await query;
        
        if (error) {
            console.error('Error getting assigned units:', error);
            return [];
        }
        
        console.log('📚 Assigned units found:', data?.length || 0);
        return data || [];
        
    } catch (error) {
        console.error('Error getting assigned units:', error);
        return [];
    }
}

// ============================================================
// LOAD LECTURER BY EMAIL
// ============================================================

async function loadLecturerByEmail(email) {
    console.log('📧 Loading lecturer by email:', email);
    
    try {
        const { data: profile, error: profileError } = await sb
            .from('consolidated_user_profiles_table')
            .select('*')
            .eq('email', email)
            .maybeSingle();
        
        if (!profileError && profile) {
            me_currentLecturer = { profile, staff: null };
            me_currentProgram = profile.program || 'KRCHN';
            console.log('✅ Lecturer loaded from profile:', profile);
            updateLecturerUI(profile);
            me_assignedUnits = await getLecturerAssignedUnits(String(profile.id));
            return profile;
        }
        
        const { data: staff, error: staffError } = await sb
            .from('staff_records')
            .select('*')
            .eq('email', email)
            .maybeSingle();
        
        if (!staffError && staff) {
            me_currentLecturer = { profile: null, staff };
            me_currentProgram = staff.program || 'KRCHN';
            console.log('✅ Lecturer loaded from staff_records:', staff);
            updateLecturerUI(staff);
            me_assignedUnits = await getLecturerAssignedUnits(String(staff.id));
            return staff;
        }
        
        console.error('❌ Lecturer not found for email:', email);
        return null;
        
    } catch (error) {
        console.error('❌ Error loading lecturer:', error);
        return null;
    }
}

// ============================================================
// DETECT LECTURER PROGRAM
// ============================================================

async function detectLecturerProgram() {
    console.log('🔍 Detecting lecturer program...');
    
    updateLoadingProgress(10, 1, 'Checking authentication...');
    
    try {
        let session = null;
        try {
            session = JSON.parse(localStorage.getItem('lecturerSession') || sessionStorage.getItem('lecturerSession') || '{}');
        } catch (e) {
            console.warn('No session found');
        }
        
        const { data: { user }, error: userError } = await sb.auth.getUser();
        if (userError) {
            console.error('❌ Auth error:', userError);
            if (session && session.email) {
                return await loadLecturerByEmail(session.email);
            }
            throw userError;
        }
        
        const userEmail = session?.email || user?.email;
        
        if (!userEmail) {
            console.error('❌ No email found');
            return null;
        }
        
        updateLoadingProgress(25, 1, 'Loading lecturer profile...');
        
        let profile = null;
        let staff = null;
        
        const { data: profileData, error: profileError } = await sb
            .from('consolidated_user_profiles_table')
            .select('*')
            .eq('email', userEmail)
            .maybeSingle();
        
        if (!profileError && profileData) {
            profile = profileData;
            console.log('📋 Found profile:', profileData);
        }
        
        const { data: staffData, error: staffError } = await sb
            .from('staff_records')
            .select('*')
            .eq('email', userEmail)
            .maybeSingle();
        
        if (!staffError && staffData) {
            staff = staffData;
            console.log('📋 Found staff record:', staffData);
        }
        
        let programCode = 'KRCHN';
        let programName = 'KRCHN Nursing';
        let isTVET = false;
        let departmentName = 'Nursing';
        
        if (staff) {
            if (staff.program) {
                programCode = staff.program;
                isTVET = programCode !== 'KRCHN';
                programName = isTVET ? 'TVET' : 'KRCHN Nursing';
            }
            if (staff.department) {
                departmentName = staff.department;
            }
        } else if (profile) {
            if (profile.program) {
                programCode = profile.program;
                isTVET = programCode !== 'KRCHN';
                programName = isTVET ? 'TVET' : 'KRCHN Nursing';
            }
            if (profile.department) {
                departmentName = profile.department;
            }
        }
        
        console.log(`📊 Program detected: ${programCode} - ${programName}`);
        
        updateLoadingProgress(40, 2, 'Loading assigned units...');
        
        const programNameEl = document.getElementById('lecturerProgramName');
        const programTypeEl = document.getElementById('lecturerProgramType');
        const unitCountEl = document.getElementById('lecturerUnitCount');
        const programSelect = document.getElementById('me_program_select');
        
        if (programNameEl) {
            programNameEl.textContent = `${programName} - ${departmentName}`;
        }
        
        if (programTypeEl) {
            programTypeEl.textContent = isTVET ? '🔧 TVET' : '🎓 Nursing';
        }
        
        let assignedCount = 0;
        const lecturerId = staff?.id || profile?.id;
        if (lecturerId) {
            me_assignedUnits = await getLecturerAssignedUnits(String(lecturerId));
            assignedCount = me_assignedUnits.length;
            console.log('📋 Assigned units:', assignedCount);
            console.log('📋 Assigned units details:', me_assignedUnits);
        }
        
        if (unitCountEl) {
            unitCountEl.textContent = assignedCount || '0';
        }
        
        if (programSelect) {
            programSelect.innerHTML = `<option value="${programCode}">${programName} (${programCode})</option>`;
            programSelect.value = programCode;
            programSelect.disabled = false;
        }
        
        me_currentLecturer = { profile, staff };
        me_currentProgram = programCode;
        
        console.log('✅ Lecturer program detection complete');
        return staff || profile;
        
    } catch (error) {
        console.error('❌ Error detecting lecturer program:', error);
        
        const programNameEl = document.getElementById('lecturerProgramName');
        if (programNameEl) {
            programNameEl.textContent = '⚠️ Error loading profile. Please refresh or contact admin.';
        }
        
        showNotification('Error loading lecturer profile: ' + error.message, 'error');
        return null;
    }
}

// ============================================================
// UPDATE LECTURER UI
// ============================================================

function updateLecturerUI(data) {
    const programNameEl = document.getElementById('lecturerProgramName');
    const programTypeEl = document.getElementById('lecturerProgramType');
    const programSelect = document.getElementById('me_program_select');
    
    const isTVET = data?.isTVET || (data?.program && data.program !== 'KRCHN');
    const programCode = data?.program || 'KRCHN';
    const programName = isTVET ? 'TVET' : 'KRCHN Nursing';
    const departmentName = data?.department || (isTVET ? 'TVET Department' : 'School of Nursing');
    
    if (programNameEl) {
        programNameEl.textContent = `${programName} - ${departmentName}`;
    }
    
    if (programTypeEl) {
        programTypeEl.textContent = isTVET ? '🔧 TVET' : '🎓 Nursing';
    }
    
    if (programSelect) {
        programSelect.innerHTML = `<option value="${programCode}">${programName} (${programCode})</option>`;
        programSelect.value = programCode;
        programSelect.disabled = false;
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
        if (blockSelect) blockSelect.innerHTML = '<option value="">-- Select Program First --</option>';
        if (unitSelect) unitSelect.innerHTML = '<option value="">-- Select Unit --</option>';
        return;
    }
    
    me_currentProgram = program;
    me_currentYear = year;
    
    if (blockSelect) {
        blockSelect.innerHTML = '<option value="">Loading blocks...</option>';
    }
    
    try {
        const assignedUnitNames = me_assignedUnits.map(u => u.subject_name).filter(Boolean);
        const assignedUnitCodes = me_assignedUnits.map(u => u.subject_code).filter(Boolean);
        
        console.log('📚 Assigned subject names:', assignedUnitNames);
        console.log('📚 Assigned subject codes:', assignedUnitCodes);
        
        const { data: unitsInBlocks, error: unitsError } = await sb
            .from('units_catalog')
            .select('block, unit_name, unit_code')
            .eq('program', program)
            .eq('status', 'active');
        
        if (unitsError) throw unitsError;
        
        const blocksWithAssignedUnits = new Set();
        unitsInBlocks.forEach(unit => {
            if (assignedUnitNames.includes(unit.unit_name) || 
                assignedUnitCodes.includes(unit.unit_code)) {
                blocksWithAssignedUnits.add(unit.block);
            }
        });
        
        const blocks = [...blocksWithAssignedUnits].filter(Boolean);
        
        if (blockSelect) {
            blockSelect.innerHTML = '<option value="">-- Select Block --</option>';
            
            if (blocks.length === 0) {
                blockSelect.innerHTML = '<option value="">-- No blocks with assigned units --</option>';
                showNotification('📚 You have no units assigned in any block', 'warning');
            } else {
                blocks.forEach(block => {
                    const option = document.createElement('option');
                    option.value = block;
                    option.textContent = block.replace(/_/g, ' ');
                    blockSelect.appendChild(option);
                });
                console.log('📊 Loaded blocks with assigned units:', blocks.length);
            }
        }
        
        if (unitSelect) {
            unitSelect.innerHTML = '<option value="">-- Select Unit --</option>';
        }
        
    } catch (error) {
        console.error('Error loading blocks:', error);
        if (blockSelect) {
            blockSelect.innerHTML = '<option value="">Error loading blocks</option>';
        }
        showNotification('Error loading blocks: ' + error.message, 'error');
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
        if (unitSelect) {
            unitSelect.innerHTML = '<option value="">-- Select Block First --</option>';
        }
        return;
    }
    
    me_currentBlock = block;
    
    if (unitSelect) {
        unitSelect.innerHTML = '<option value="">Loading units...</option>';
    }
    
    try {
        const { data: allUnits, error } = await sb
            .from('units_catalog')
            .select('unit_code, unit_name, assessment_type, id')
            .eq('program', program)
            .eq('block', block)
            .eq('status', 'active')
            .order('unit_name', { ascending: true });
        
        if (error) throw error;
        
        const assignedUnitNames = me_assignedUnits
            .filter(u => u.block === block || !u.block)
            .map(u => u.subject_name)
            .filter(Boolean);
        
        const assignedUnitCodes = me_assignedUnits
            .filter(u => u.block === block || !u.block)
            .map(u => u.subject_code)
            .filter(Boolean);
        
        console.log('📚 Assigned names for block:', assignedUnitNames);
        console.log('📚 Assigned codes for block:', assignedUnitCodes);
        
        const filteredUnits = allUnits.filter(unit => {
            const matchByName = assignedUnitNames.includes(unit.unit_name);
            const matchByCode = assignedUnitCodes.includes(unit.unit_code);
            return matchByName || matchByCode;
        });
        
        console.log(`📊 Filtered: ${filteredUnits.length} assigned units out of ${allUnits.length} total`);
        
        if (unitSelect) {
            unitSelect.innerHTML = '<option value="">-- Select Unit --</option>';
            
            if (filteredUnits.length === 0) {
                unitSelect.innerHTML = '<option value="">-- No units assigned to you in this block --</option>';
                showNotification('📚 You have no assigned units in this block', 'warning');
            } else {
                filteredUnits.forEach(unit => {
                    const option = document.createElement('option');
                    option.value = unit.unit_name;
                    option.dataset.assessment = unit.assessment_type || 'full';
                    option.dataset.code = unit.unit_code || '';
                    option.dataset.id = unit.id;
                    
                    const isAssigned = assignedUnitNames.includes(unit.unit_name) || 
                                      assignedUnitCodes.includes(unit.unit_code);
                    option.textContent = `${unit.unit_code || ''} - ${unit.unit_name}${isAssigned ? ' 📌' : ''}`;
                    unitSelect.appendChild(option);
                });
                
                if (filteredUnits.length === 1) {
                    unitSelect.value = filteredUnits[0].unit_name;
                    setTimeout(() => loadMarksEntry(), 300);
                }
            }
        }
        
        const countEl = document.getElementById('lecturerUnitCount');
        if (countEl) countEl.textContent = filteredUnits.length;
        
        if (filteredUnits.length === 0) {
            const container = document.getElementById('me_marks_container');
            if (container) {
                container.innerHTML = `
                    <div style="text-align: center; padding: 60px 20px;">
                        <i class="fas fa-lock" style="font-size: 48px; color: #f59e0b; margin-bottom: 16px; display: block;"></i>
                        <h3 style="color: #1e293b;">No Units Assigned to You</h3>
                        <p style="color: #94a3b8;">You have not been assigned any units in this block.</p>
                        <p style="color: #94a3b8; font-size: 13px; margin-top: 8px;">Please contact the administrator for unit assignments.</p>
                    </div>
                `;
            }
        }
        
    } catch (error) {
        console.error('Error loading units:', error);
        if (unitSelect) {
            unitSelect.innerHTML = '<option value="">Error loading units</option>';
        }
        showNotification('Error loading units: ' + error.message, 'error');
    }
}

// ============================================================
// LOAD ADMIN COLUMN SETTINGS
// ============================================================

async function loadAdminColumnSettings(block, unit) {
    try {
        const year = document.getElementById('me_year_select')?.value || '2025';
        
        const { data, error } = await sb
            .from('column_settings')
            .select('*')
            .eq('block', block)
            .eq('subject', unit)
            .eq('year', year)
            .maybeSingle();
        
        if (error) throw error;
        
        if (data && data.columns) {
            me_columnSettings = data;
            const visibleColumns = getVisibleColumns();
            if (visibleColumns.cat2 === false && visibleColumns.cat1 !== false) {
                me_currentAssessmentType = 'single_cat';
            } else if (visibleColumns.cat1 === false && visibleColumns.cat2 !== false) {
                me_currentAssessmentType = 'single_cat';
            } else if (visibleColumns.exam === false && visibleColumns.cat1 !== false) {
                me_currentAssessmentType = 'cats_only';
            } else if (visibleColumns.cat1 === false && visibleColumns.cat2 === false && visibleColumns.exam !== false) {
                me_currentAssessmentType = 'exam_only';
            } else {
                me_currentAssessmentType = 'full';
            }
        }
        
        console.log('📋 Loaded admin settings:', { 
            columns: data?.columns, 
            assessmentType: me_currentAssessmentType 
        });
        
    } catch (error) {
        console.error('Error loading admin settings:', error);
    }
}

function getVisibleColumns() {
    const defaultColumns = {
        sno: true,
        admission: true,
        name: true,
        cat1: true,
        cat2: true,
        exam: true,
        total: true,
        grade: true,
        rating: true,
        approval: true
    };
    
    const savedColumns = me_columnSettings.columns || [];
    const result = { ...defaultColumns };
    savedColumns.forEach(col => {
        if (col.id in result) {
            result[col.id] = col.visible;
        }
    });
    
    return result;
}

// ============================================================
// LOAD MARKS ENTRY - WITH RETAKE SUPPORT
// ============================================================

async function loadMarksEntry() {
    const program = document.getElementById('me_program_select')?.value;
    const block = document.getElementById('me_block_select')?.value;
    const unit = document.getElementById('me_subject_select')?.value;
    const year = document.getElementById('me_year_select')?.value;
    const container = document.getElementById('me_marks_container');
    
    if (!program || !block || !unit) {
        if (container) {
            container.innerHTML = `
                <div style="text-align: center; padding: 60px 20px;">
                    <i class="fas fa-pen-alt" style="font-size: 48px; color: #94a3b8; margin-bottom: 16px; display: block;"></i>
                    <h3 style="color: #1e293b;">Select Block and Unit</h3>
                    <p style="color: #94a3b8;">Choose from the dropdowns above to load marks for your assigned units</p>
                </div>
            `;
        }
        return;
    }
    
    showLoadingScreen(`Loading marks for ${unit}...`, 'Loading Marks');
    updateLoadingProgress(10, 1, 'Checking assignment...');
    
    const isAssigned = me_assignedUnits.some(u => 
        u.subject_name === unit || u.subject_code === unit
    );
    
    if (!isAssigned) {
        hideLoadingScreen();
        if (container) {
            container.innerHTML = `
                <div style="text-align: center; padding: 60px 20px;">
                    <i class="fas fa-lock" style="font-size: 48px; color: #dc2626; margin-bottom: 16px; display: block;"></i>
                    <h3 style="color: #1e293b;">Access Denied</h3>
                    <p style="color: #94a3b8;">You are not assigned to this unit.</p>
                    <p style="color: #94a3b8; font-size: 13px; margin-top: 8px;">Please contact the administrator for access.</p>
                </div>
            `;
        }
        showNotification('⛔ You are not assigned to this unit', 'error');
        return;
    }
    
    me_currentProgram = program;
    me_currentBlock = block;
    me_currentUnit = unit;
    me_currentYear = year;
    
    try {
        updateLoadingProgress(20, 1, 'Loading column settings...');
        await loadAdminColumnSettings(block, unit);
        
        updateLoadingProgress(30, 2, 'Loading retake data...');
        await loadLecturerRetakeData(block, unit, year);
        
        updateLoadingProgress(40, 2, 'Loading student marks...');
        const { data: marks, error } = await sb
            .from('student_marks')
            .select('*')
            .eq('block', block)
            .eq('subject_name', unit)
            .eq('academic_year', year);
        
        if (error) throw error;
        
        console.log(`📊 Found ${marks?.length || 0} enrolled students in student_marks`);
        
        if (!marks || marks.length === 0) {
            hideLoadingScreen();
            if (container) {
                container.innerHTML = `
                    <div style="text-align: center; padding: 60px 20px;">
                        <i class="fas fa-users" style="font-size: 48px; color: #94a3b8; margin-bottom: 16px; display: block;"></i>
                        <h3 style="color: #1e293b;">No students enrolled in this unit</h3>
                        <p style="color: #94a3b8;">Please contact the administrator to add students.</p>
                    </div>
                `;
            }
            updateMarksEntryStats([], me_currentAssessmentType);
            return;
        }
        
        updateLoadingProgress(60, 3, 'Loading student details...');
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
        
        updateLoadingProgress(80, 4, 'Processing marks data...');
        
        const fullMarks = marks.map(m => {
            const admission = m.admission_number || '';
            const retakes = lecturerRetakeData[admission] || [];
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
                assessmentType: m.assessment_type || me_currentAssessmentType || 'full',
                id: m.id || null,
                approval_status: m.approval_status || 'draft',
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
        
        updateLoadingProgress(95, 4, 'Rendering marks table...');
        renderMarksEntryTable(fullMarks, unit, me_currentAssessmentType);
        updateMarksEntryStats(fullMarks, me_currentAssessmentType);
        checkMarksApprovalStatus(fullMarks);
        
        updateAssessmentTypeDisplay(me_currentAssessmentType);
        const visibleColumns = getVisibleColumns();
        updateVisibleColumnsInfo(visibleColumns);
        
        updateLoadingProgress(100, 4, '✅ Ready!');
        await new Promise(resolve => setTimeout(resolve, 300));
        hideLoadingScreen();
        
    } catch (error) {
        hideLoadingScreen();
        console.error('Error loading marks:', error);
        if (container) {
            container.innerHTML = `
                <div style="text-align: center; padding: 40px;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 48px; color: #f59e0b; margin-bottom: 16px; display: block;"></i>
                    <h4 style="color: #991b1b;">Error loading marks</h4>
                    <p style="color: #64748b;">${error.message}</p>
                    <button onclick="loadMarksEntry()" style="margin-top: 12px; padding: 8px 20px; background: #4C1D95; color: white; border: none; border-radius: 6px; cursor: pointer;">
                        <i class="fas fa-sync-alt"></i> Retry
                    </button>
                </div>
            `;
        }
        showNotification('Error loading marks: ' + error.message, 'error');
    }
}

// ============================================================
// RENDER MARKS ENTRY TABLE - WITH RETAKE EDIT SUPPORT
// REPLACE the existing renderMarksEntryTable function with this
// ============================================================

function renderMarksEntryTable(marks, unit, assessmentType) {
    const container = document.getElementById('me_marks_container');
    if (!container) return;
    
    if (!marks || marks.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px;">
                <i class="fas fa-users" style="font-size: 48px; color: #94a3b8; margin-bottom: 16px; display: block;"></i>
                <h4 style="color: #1e293b;">No students found</h4>
                <p style="color: #94a3b8;">No students are enrolled in this block</p>
            </div>
        `;
        return;
    }
    
    const visibleColumns = getVisibleColumns();
    const isAdmin = isUserAdmin();
    
    const withScores = marks.filter(m => m.cat1 > 0 || m.cat2 > 0 || m.exam > 0);
    const passing = marks.filter(m => {
        const total = calculateMarksEntryTotal(m.cat1, m.cat2, m.exam, assessmentType);
        return total >= 60;
    });
    
    const pendingCount = marks.filter(m => m.approval_status === 'pending').length;
    const approvedCount = marks.filter(m => m.approval_status === 'approved').length;
    const withRetakes = marks.filter(m => m.hasRetake).length;
    
    let html = `
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; margin-bottom: 16px;">
            <div>
                <h3 style="margin: 0; color: #0f172a;">${unit}</h3>
                <span style="font-size: 12px; color: #64748b;">${me_currentProgram} | ${me_currentBlock?.replace('_', ' ') || ''} | ${me_currentYear}</span>
                <span style="font-size: 12px; color: #64748b; margin-left: 12px; background: #e0f2fe; padding: 2px 12px; border-radius: 40px;">👥 ${marks.length} students</span>
                <span style="font-size: 12px; color: #059669; margin-left: 12px; background: #d1fae5; padding: 2px 12px; border-radius: 40px;">📊 ${withScores.length} with scores</span>
                <span style="font-size: 12px; color: #10b981; margin-left: 12px; background: #d1fae5; padding: 2px 12px; border-radius: 40px;">✅ ${passing.length} passing</span>
                ${withRetakes > 0 ? `<span style="font-size: 12px; color: #f59e0b; margin-left: 12px; background: #fef3c7; padding: 2px 12px; border-radius: 40px;">⭐ ${withRetakes} retakes</span>` : ''}
                ${pendingCount > 0 ? `<span style="font-size: 12px; color: #d97706; margin-left: 12px; background: #fef3c7; padding: 2px 12px; border-radius: 40px;">⏳ ${pendingCount} pending</span>` : ''}
                ${approvedCount > 0 ? `<span style="font-size: 12px; color: #065f46; margin-left: 12px; background: #d1fae5; padding: 2px 12px; border-radius: 40px;">✅ ${approvedCount} approved</span>` : ''}
                ${isAdmin ? `<span style="font-size: 12px; color: #8b5cf6; margin-left: 12px; background: #ede9fe; padding: 2px 12px; border-radius: 40px;">👑 Admin Mode</span>` : ''}
            </div>
            <div style="font-size: 12px; color: #6b7280; background: #f3f4f6; padding: 4px 14px; border-radius: 20px;">
                <i class="fas fa-robot"></i> Auto: ${assessmentType.replace('_', ' ').toUpperCase()}
            </div>
            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                <button onclick="saveMarksEntry()" style="background: #059669; padding: 8px 16px; border: none; border-radius: 6px; color: white; cursor: pointer; font-weight: 600;">
                    <i class="fas fa-save"></i> Save All
                </button>
                ${!isAdmin ? `
                <button onclick="submitMarksForApproval()" style="background: #4C1D95; padding: 8px 16px; border: none; border-radius: 6px; color: white; cursor: pointer; font-weight: 600;">
                    <i class="fas fa-paper-plane"></i> Submit
                </button>
                <button onclick="withdrawMarksFromApproval()" style="background: #d97706; padding: 8px 16px; border: none; border-radius: 6px; color: white; cursor: pointer; font-weight: 600;">
                    <i class="fas fa-undo"></i> Withdraw
                </button>
                ` : ''}
                <button onclick="exportMarksEntry()" style="background: #2563eb; padding: 8px 16px; border: none; border-radius: 6px; color: white; cursor: pointer; font-weight: 600;">
                    <i class="fas fa-file-export"></i> Export
                </button>
                <button onclick="loadMarksEntry()" style="background: #6b7280; padding: 8px 16px; border: none; border-radius: 6px; color: white; cursor: pointer; font-weight: 600;">
                    <i class="fas fa-sync-alt"></i> Refresh
                </button>
            </div>
        </div>
        
        <div style="overflow-x: auto;">
            <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                <thead>
                    <tr style="background: linear-gradient(135deg, #4C1D95, #7c3aed); color: white;">
                        <th style="padding: 10px 6px; text-align: center; width: 35px; ${visibleColumns.sno === false ? 'display:none;' : ''}">#</th>
                        <th style="padding: 10px 8px; text-align: left; ${visibleColumns.admission === false ? 'display:none;' : ''}">Admission</th>
                        <th style="padding: 10px 8px; text-align: left; ${visibleColumns.name === false ? 'display:none;' : ''}">Name</th>
                        ${visibleColumns.cat1 !== false ? '<th style="padding: 10px 8px; text-align: center;">CAT1 (0-30)</th>' : ''}
                        ${assessmentType === 'full' && visibleColumns.cat2 !== false ? '<th style="padding: 10px 8px; text-align: center;">CAT2 (0-30)</th>' : ''}
                        ${visibleColumns.exam !== false ? `<th style="padding: 10px 8px; text-align: center;">Exam (0-${assessmentType === 'exam_only' ? 100 : 70})</th>` : ''}
                        ${visibleColumns.total !== false ? '<th style="padding: 10px 8px; text-align: center;">Total</th>' : ''}
                        ${visibleColumns.grade !== false ? '<th style="padding: 10px 8px; text-align: center;">Grade</th>' : ''}
                        ${visibleColumns.rating !== false ? '<th style="padding: 10px 8px; text-align: center;">Rating</th>' : ''}
                        <th style="padding: 10px 8px; text-align: center;">Retake</th>
                        ${visibleColumns.approval !== false ? '<th style="padding: 10px 8px; text-align: center;">Status</th>' : ''}
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
        const isPassing = total >= 60;
        
        const hasRetake = m.hasRetake || false;
        const retakeCount = m.retakeCount || 0;
        const retakeScore = m.retakeScore;
        const retakeStatus = m.retakeStatus;
        const isRetakePassing = retakeStatus === 'PASS';
        const needsRetake = total > 0 && !isPassing && retakeCount < LECTURER_MAX_RETAKES;
        const maxRetakesReached = total > 0 && !isPassing && retakeCount >= LECTURER_MAX_RETAKES;
        
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
            'pending': '<span style="background:#fef3c7;color:#92400e;padding:2px 10px;border-radius:12px;font-size:11px;">⏳ Pending</span>',
            'approved': '<span style="background:#d1fae5;color:#065f46;padding:2px 10px;border-radius:12px;font-size:11px;">✅ Approved</span>',
            'rejected': '<span style="background:#fee2e2;color:#991b1b;padding:2px 10px;border-radius:12px;font-size:11px;">❌ Rejected</span>',
            'draft': '<span style="background:#e5e7eb;color:#6b7280;padding:2px 10px;border-radius:12px;font-size:11px;">📝 Draft</span>'
        }[m.approval_status] || '<span style="background:#e5e7eb;color:#6b7280;padding:2px 10px;border-radius:12px;font-size:11px;">📝 Draft</span>';
        
        // ✅ Build retake actions - ALWAYS show Edit button if there's a retake
        let retakeActionsHtml = '';
        
        if (hasRetake) {
            // ✅ Show retake status
            retakeActionsHtml += `
                <div style="font-size: 10px; margin-bottom: 4px;">
                    <span style="color: ${isRetakePassing ? '#059669' : '#dc2626'}; font-weight: 600;">
                        ${isRetakePassing ? '✅ Passed' : '❌ Failed'} (${retakeCount} attempt${retakeCount > 1 ? 's' : ''})
                    </span>
                    ${retakeScore !== null && retakeScore !== undefined ? `
                        <span style="display: block; font-size: 9px; color: #64748b;">Score: ${retakeScore}%</span>
                    ` : ''}
                </div>
            `;
            
            // ✅ ALWAYS show Edit button for retakes (even if max attempts reached)
            retakeActionsHtml += `
                <button onclick="openLecturerRetakeModal('${m.admission}', '${m.name}', '${me_currentUnit}', '${me_currentBlock}')" 
                        style="background: #3b82f6; color: white; border: none; padding: 3px 10px; border-radius: 4px; cursor: pointer; font-size: 9px; font-weight: 600; width: 100%; margin-top: 2px;">
                    <i class="fas fa-edit"></i> Edit Retake
                </button>
            `;
        }
        
        // ✅ If student failed and hasn't reached max retakes, show "Retake" button
        if (needsRetake) {
            retakeActionsHtml += `
                <button onclick="openLecturerRetakeModal('${m.admission}', '${m.name}', '${me_currentUnit}', '${me_currentBlock}')" 
                        style="background: #f59e0b; color: white; border: none; padding: 3px 10px; border-radius: 4px; cursor: pointer; font-size: 9px; font-weight: 600; width: 100%; margin-top: 2px;">
                    <i class="fas fa-sync-alt"></i> Add Retake
                </button>
            `;
        }
        
        // ✅ If max retakes reached and failed, show message
        if (maxRetakesReached) {
            retakeActionsHtml += `
                <span style="color: #dc2626; font-size: 8px; font-weight: 600; display: block; text-align: center; margin-top: 2px;">
                    ⛔ Max retakes reached
                </span>
            `;
        }
        
        // ✅ If passed and no retake, show passed message
        if (isPassing && !hasRetake) {
            retakeActionsHtml = `
                <span style="color: #059669; font-size: 11px;">✅ Passed</span>
            `;
        }
        
        html += `<tr style="${rowStyle}">
            <td style="padding: 8px 6px; text-align: center; font-size: 12px; color: #94a3b8; ${visibleColumns.sno === false ? 'display:none;' : ''}">${i + 1}</td>
            <td style="padding: 8px 8px; font-weight: 500; font-size: 12px; ${visibleColumns.admission === false ? 'display:none;' : ''}">${m.admission || 'N/A'}</td>
            <td style="padding: 8px 8px; ${visibleColumns.name === false ? 'display:none;' : ''}">
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
            </td>
            ${visibleColumns.cat1 !== false ? `<td style="padding: 8px; text-align: center;">
                <input type="number" id="me_cat1_${i}" value="${cat1}" min="0" max="30" step="0.5" style="width: 60px; padding: 6px; border-radius: 6px; border: 1px solid #e2e8f0; text-align: center;" onchange="updateMarksEntryRow(${i})">
            </td>` : ''}
            ${assessmentType === 'full' && visibleColumns.cat2 !== false ? `
            <td style="padding: 8px; text-align: center; ${visibleColumns.cat2 === false ? 'display:none;' : ''}">
                <input type="number" id="me_cat2_${i}" value="${cat2}" min="0" max="30" step="0.5" style="width: 60px; padding: 6px; border-radius: 6px; border: 1px solid #e2e8f0; text-align: center;" onchange="updateMarksEntryRow(${i})">
            </td>` : ''}
            ${visibleColumns.exam !== false ? `<td style="padding: 8px; text-align: center;">
                <input type="number" id="me_exam_${i}" value="${exam}" min="0" max="${assessmentType === 'exam_only' ? 100 : 70}" step="0.5" style="width: 60px; padding: 6px; border-radius: 6px; border: 1px solid #e2e8f0; text-align: center;" onchange="updateMarksEntryRow(${i})">
            </td>` : ''}
            ${visibleColumns.total !== false ? `<td id="me_total_${i}" style="padding: 8px 6px; text-align: center; font-weight: bold; ${isPassing ? 'color: #065f46;' : (total > 0 ? 'color: #991b1b;' : 'color: #f59e0b;')}">${displayTotal}</td>` : ''}
            ${visibleColumns.grade !== false ? `<td id="me_grade_${i}" style="padding: 8px 6px; text-align: center; font-weight: bold; font-size: 16px; color: ${gradeInfo.color};">${displayGrade}</td>` : ''}
            ${visibleColumns.rating !== false ? `<td id="me_points_${i}" style="padding: 8px 6px; text-align: center; font-weight: bold; font-size: 15px; color: ${gradeInfo.color};">${displayPoints}</td>` : ''}
            <td style="padding: 8px 6px; text-align: center;">
                ${retakeActionsHtml}
            </td>
            ${visibleColumns.approval !== false ? `<td style="padding: 8px 6px; text-align: center; font-size: 10px;">${approvalBadge}</td>` : ''}
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
        
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-top:16px;">
            <button onclick="saveMarksEntry()" style="background: #059669; padding: 10px 24px; border: none; border-radius: 8px; color: white; cursor: pointer; font-weight: 600; font-size: 14px;">
                <i class="fas fa-save"></i> 💾 Save All Marks
            </button>
            ${!isAdmin ? `
            <button onclick="submitMarksForApproval()" style="background: #4C1D95; padding: 10px 24px; border: none; border-radius: 8px; color: white; cursor: pointer; font-weight: 600; font-size: 14px;">
                <i class="fas fa-paper-plane"></i> 📤 Submit for Approval
            </button>
            <button onclick="withdrawMarksFromApproval()" style="background: #d97706; padding: 10px 24px; border: none; border-radius: 8px; color: white; cursor: pointer; font-weight: 600; font-size: 14px;">
                <i class="fas fa-undo"></i> ⏪ Withdraw
            </button>
            ` : ''}
            <div style="font-size: 11px; color: #94a3b8;">
                <i class="fas fa-lock"></i> Auto-detected from admin settings
                ${isAdmin ? ` | 👑 Admin: Auto-approve enabled` : ` | 📝 Lecturer: Draft mode`}
                ${marks.filter(m => m.hasRetake).length > 0 ? ` | <i class="fas fa-edit" style="color: #3b82f6;"></i> Click Edit Retake to modify` : ''}
            </div>
        </div>
    `;
    
    container.innerHTML = html;
    
    if (!document.getElementById('lecturerRetakeModal')) {
        createLecturerRetakeModal();
    }
}
// ============================================================
// UPDATE MARKS ROW
// ============================================================

function updateMarksEntryRow(index) {
    const cat1 = parseFloat(document.getElementById(`me_cat1_${index}`)?.value) || 0;
    const cat2 = parseFloat(document.getElementById(`me_cat2_${index}`)?.value) || 0;
    const exam = parseFloat(document.getElementById(`me_exam_${index}`)?.value) || 0;
    const assessmentType = me_currentAssessmentType || 'full';
    
    const total = calculateMarksEntryTotal(cat1, cat2, exam, assessmentType);
    const gradeInfo = getMarksEntryGrade(total);
    const isPassing = total >= 60;
    
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
    
    if (me_currentMarks && me_currentMarks[index]) {
        me_currentMarks[index].cat1 = cat1;
        me_currentMarks[index].cat2 = cat2;
        me_currentMarks[index].exam = exam;
    }
}

// ============================================================
// UPDATE MARKS ENTRY STATS
// ============================================================

function updateMarksEntryStats(marks, assessmentType) {
    if (!marks) marks = [];
    if (!assessmentType) assessmentType = me_currentAssessmentType || 'full';
    
    console.log('📊 Updating stats for', marks.length, 'marks');
    
    const totalEnrolled = marks.length;
    const pendingCount = marks.filter(m => m.approval_status === 'pending').length;
    const approvedCount = marks.filter(m => m.approval_status === 'approved').length;
    const draftCount = marks.filter(m => m.approval_status === 'draft' || !m.approval_status).length;
    const rejectedCount = marks.filter(m => m.approval_status === 'rejected').length;
    
    let totalScore = 0;
    let withScores = 0;
    marks.forEach(m => {
        const score = calculateMarksEntryTotal(m.cat1 || 0, m.cat2 || 0, m.exam || 0, assessmentType);
        if (score > 0) {
            totalScore += score;
            withScores++;
        }
    });
    const avg = withScores > 0 ? Math.round(totalScore / withScores) : 0;
    
    const passing = marks.filter(m => {
        const total = calculateMarksEntryTotal(m.cat1 || 0, m.cat2 || 0, m.exam || 0, assessmentType);
        return total >= 60;
    }).length;
    
    const atRisk = marks.filter(m => {
        const total = calculateMarksEntryTotal(m.cat1 || 0, m.cat2 || 0, m.exam || 0, assessmentType);
        return total > 0 && total < 60;
    }).length;
    
    const statsMap = {
        'lecTotalStudents': totalEnrolled,
        'lecPendingApproval': pendingCount,
        'lecApprovedMarks': approvedCount,
        'lecAvgScore': avg + '%',
        'studentsAtRiskCount': atRisk,
        'avgPerformance': avg + '%',
        'totalStudentsCount': totalEnrolled,
        'me_total_students': totalEnrolled,
        'me_total_subjects': marks.length > 0 ? 1 : 0,
        'me_pass_rate': totalEnrolled > 0 ? Math.round((passing / totalEnrolled) * 100) + '%' : '0%',
        'me_class_avg': avg + '%',
        'me_at_risk': atRisk
    };
    
    let updated = 0;
    let notFound = 0;
    for (const [id, value] of Object.entries(statsMap)) {
        const el = document.getElementById(id);
        if (el) {
            el.textContent = value;
            updated++;
        } else {
            notFound++;
        }
    }
    
    if (typeof checkMarksApprovalStatus === 'function') {
        checkMarksApprovalStatus(marks);
    }
    
    window.currentMarks = marks;
    window.currentStats = {
        totalEnrolled,
        pendingCount,
        approvedCount,
        draftCount,
        rejectedCount,
        avg,
        passing,
        atRisk
    };
    
    console.log(`✅ Updated ${updated} stats elements (${notFound} not found)`);
    console.log('📊 Stats:', window.currentStats);
}

// ============================================================
// CHECK MARKS APPROVAL STATUS
// ============================================================

function checkMarksApprovalStatus(marks) {
    console.log('📋 Checking marks approval status...');
    
    if (!marks || marks.length === 0) {
        console.log('📋 No marks to check');
        return;
    }
    
    const pendingCount = marks.filter(m => m.approval_status === 'pending').length;
    const approvedCount = marks.filter(m => m.approval_status === 'approved').length;
    const rejectedCount = marks.filter(m => m.approval_status === 'rejected').length;
    const draftCount = marks.filter(m => m.approval_status === 'draft' || !m.approval_status).length;
    
    console.log(`📊 Approval Status: Draft: ${draftCount}, Pending: ${pendingCount}, Approved: ${approvedCount}, Rejected: ${rejectedCount}`);
    
    const banner = document.getElementById('approvalStatusBanner');
    const statusText = document.getElementById('approvalStatusText');
    const statusBadge = document.getElementById('approvalStatusBadge');
    const submitBtn = document.getElementById('submitForApprovalBtn');
    const withdrawBtn = document.getElementById('withdrawApprovalBtn');
    const details = document.getElementById('approvalDetails');
    const rejectionReason = document.getElementById('rejectionReason');
    
    if (!banner) {
        createApprovalStatusBanner();
        return;
    }
    
    if (marks.length > 0) {
        banner.style.display = 'block';
    } else {
        banner.style.display = 'none';
        return;
    }
    
    if (pendingCount > 0) {
        banner.style.borderLeftColor = '#f59e0b';
        banner.style.background = '#fef3c7';
        if (statusText) statusText.textContent = `${pendingCount} marks pending Admin Approval`;
        if (statusBadge) {
            statusBadge.textContent = '⏳ Pending';
            statusBadge.className = 'badge badge-warning';
            statusBadge.style.cssText = 'background: #fef3c7; color: #92400e; padding: 4px 12px; border-radius: 12px; font-size: 12px;';
        }
        if (submitBtn) submitBtn.style.display = 'none';
        if (withdrawBtn) withdrawBtn.style.display = 'inline-block';
        if (details) details.style.display = 'block';
        if (rejectionReason) rejectionReason.style.display = 'none';
        
    } else if (approvedCount > 0 && pendingCount === 0) {
        banner.style.borderLeftColor = '#10b981';
        banner.style.background = '#d1fae5';
        if (statusText) statusText.textContent = `✅ ${approvedCount} marks Approved by Admin`;
        if (statusBadge) {
            statusBadge.textContent = '✅ Approved';
            statusBadge.className = 'badge badge-success';
            statusBadge.style.cssText = 'background: #d1fae5; color: #065f46; padding: 4px 12px; border-radius: 12px; font-size: 12px;';
        }
        if (submitBtn) submitBtn.style.display = 'none';
        if (withdrawBtn) withdrawBtn.style.display = 'none';
        if (details) details.style.display = 'block';
        if (rejectionReason) rejectionReason.style.display = 'none';
        
    } else if (rejectedCount > 0 && pendingCount === 0 && approvedCount === 0) {
        banner.style.borderLeftColor = '#dc2626';
        banner.style.background = '#fee2e2';
        if (statusText) statusText.textContent = `❌ ${rejectedCount} marks Rejected by Admin`;
        if (statusBadge) {
            statusBadge.textContent = '❌ Rejected';
            statusBadge.className = 'badge badge-danger';
            statusBadge.style.cssText = 'background: #fee2e2; color: #991b1b; padding: 4px 12px; border-radius: 12px; font-size: 12px;';
        }
        if (submitBtn) submitBtn.style.display = 'inline-block';
        if (withdrawBtn) withdrawBtn.style.display = 'none';
        if (details) details.style.display = 'block';
        if (rejectionReason) rejectionReason.style.display = 'block';
        
    } else if (draftCount > 0 && pendingCount === 0 && approvedCount === 0 && rejectedCount === 0) {
        banner.style.borderLeftColor = '#6b7280';
        banner.style.background = '#f3f4f6';
        if (statusText) statusText.textContent = `📝 ${draftCount} marks in Draft - Ready to submit`;
        if (statusBadge) {
            statusBadge.textContent = '📝 Draft';
            statusBadge.className = 'badge badge-secondary';
            statusBadge.style.cssText = 'background: #e5e7eb; color: #6b7280; padding: 4px 12px; border-radius: 12px; font-size: 12px;';
        }
        if (submitBtn) submitBtn.style.display = 'inline-block';
        if (withdrawBtn) withdrawBtn.style.display = 'none';
        if (details) details.style.display = 'none';
        if (rejectionReason) rejectionReason.style.display = 'none';
    } else {
        banner.style.display = 'none';
        if (submitBtn) submitBtn.style.display = 'inline-block';
        if (withdrawBtn) withdrawBtn.style.display = 'none';
    }
}

// ============================================================
// CREATE APPROVAL STATUS BANNER
// ============================================================

function createApprovalStatusBanner() {
    console.log('📋 Creating approval status banner...');
    
    const container = document.querySelector('.marks-system-header') || document.querySelector('#me_marks_container');
    if (!container) return;
    
    const banner = document.createElement('div');
    banner.id = 'approvalStatusBanner';
    banner.style.cssText = `
        display: none; 
        background: #fef3c7; 
        border-radius: 12px; 
        padding: 15px 20px; 
        margin: 20px 0; 
        border-left: 4px solid #f59e0b;
    `;
    
    banner.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
            <div>
                <i class="fas fa-clock" style="color: #d97706;"></i>
                <strong>Approval Status:</strong>
                <span id="approvalStatusText">Checking...</span>
                <span id="approvalStatusBadge" style="background: #fef3c7; color: #92400e; padding: 4px 12px; border-radius: 12px; font-size: 12px; margin-left: 10px;">⏳ Pending</span>
            </div>
            <div style="display: flex; gap: 10px;">
                <button id="submitForApprovalBtn" class="btn btn-action" style="background: #4C1D95; padding: 8px 20px; border: none; border-radius: 6px; color: white; cursor: pointer; font-weight: 600;" onclick="submitMarksForApproval()">
                    <i class="fas fa-paper-plane"></i> Submit for Approval
                </button>
                <button id="withdrawApprovalBtn" class="btn btn-action" style="background: #dc2626; padding: 8px 20px; border: none; border-radius: 6px; color: white; cursor: pointer; font-weight: 600; display: none;" onclick="withdrawMarksFromApproval()">
                    <i class="fas fa-undo"></i> Withdraw
                </button>
            </div>
        </div>
        <div id="approvalDetails" style="margin-top: 10px; font-size: 13px; color: #92400e; display: none;">
            <p><strong>Submitted:</strong> <span id="submittedDate">-</span></p>
            <p><strong>Submitted By:</strong> <span id="submittedBy">-</span></p>
            <p id="rejectionReason" style="color: #dc2626; display: none;"><strong>Rejection Reason:</strong> <span id="rejectionReasonText">-</span></p>
        </div>
    `;
    
    container.parentNode.insertBefore(banner, container);
    console.log('✅ Approval status banner created');
}

// ============================================================
// SAVE MARKS ENTRY - FIXED: Lecturers save as DRAFT
// ============================================================

async function saveMarksEntry() {
    const program = me_currentProgram;
    const block = me_currentBlock;
    const unit = me_currentUnit;
    const year = me_currentYear;
    const assessmentType = me_currentAssessmentType || 'full';
    
    if (!block || !unit) {
        showNotification('❌ Please select a block and unit first', 'error');
        return;
    }
    
    // ✅ Check if user is admin
    const isAdmin = isUserAdmin();
    const isLecturer = !isAdmin;
    
    // ✅ Verify lecturer is assigned to this unit (if lecturer)
    if (isLecturer) {
        const isAssigned = me_assignedUnits.some(u => 
            u.subject_name === unit || u.subject_code === unit
        );
        if (!isAssigned) {
            showNotification('⛔ You are not assigned to this unit!', 'error');
            return;
        }
    }
    
    const marksData = [];
    const rows = document.querySelectorAll('#me_marks_container table tbody tr');
    
    if (!rows || rows.length === 0) {
        showNotification('⚠️ No marks to save', 'warning');
        return;
    }
    
    rows.forEach((row, index) => {
        const cat1Input = document.getElementById(`me_cat1_${index}`);
        const cat2Input = document.getElementById(`me_cat2_${index}`);
        const examInput = document.getElementById(`me_exam_${index}`);
        
        if (cat1Input || cat2Input || examInput) {
            const cells = row.querySelectorAll('td');
            const admission = cells[1]?.textContent?.trim() || '';
            const name = cells[2]?.textContent?.trim() || '';
            const cat1 = parseFloat(cat1Input?.value) || 0;
            const cat2 = parseFloat(cat2Input?.value) || 0;
            const exam = parseFloat(examInput?.value) || 0;
            
            if (admission) {
                marksData.push({
                    admission: admission,
                    name: name,
                    cat1: cat1,
                    cat2: cat2,
                    exam: exam
                });
            }
        }
    });
    
    if (marksData.length === 0) {
        showNotification('⚠️ No marks data to save', 'warning');
        return;
    }
    
    const studentsWithScores = marksData.filter(m => m.cat1 > 0 || m.cat2 > 0 || m.exam > 0);
    
    let confirmMessage = `💾 Save marks for ${marksData.length} students in "${unit}"?`;
    if (studentsWithScores.length === 0) {
        confirmMessage = `⚠️ No scores entered yet. Save empty marks for ${marksData.length} students?`;
    }
    if (!confirm(confirmMessage)) return;
    
    showLoadingScreen(`Saving ${marksData.length} marks...`, '💾 Saving Marks');
    updateLoadingProgress(5, 1, 'Preparing data...');
    
    let saved = 0;
    let updated = 0;
    let errors = 0;
    let resetCount = 0;
    const resetStudents = [];
    let processed = 0;
    const totalStudents = marksData.length;
    
    try {
        updateLoadingProgress(10, 1, 'Fetching existing marks...');
        
        const admissions = marksData.map(m => m.admission);
        const { data: existingMarks, error: fetchError } = await sb
            .from('student_marks')
            .select('id, admission_number, approval_status, cat1_score, cat2_score, exam_score, final_score, retake_score, retake_count, retake_status')
            .eq('block', block)
            .eq('subject_name', unit)
            .eq('academic_year', year)
            .in('admission_number', admissions);
        
        if (fetchError) {
            throw new Error('Error fetching existing marks: ' + fetchError.message);
        }
        
        const existingMap = {};
        existingMarks?.forEach(m => {
            existingMap[m.admission_number] = m;
        });
        
        updateLoadingProgress(20, 2, 'Processing marks...');
        
        const updates = [];
        const inserts = [];
        let processedCount = 0;
        
        for (const mark of marksData) {
            const existing = existingMap[mark.admission] || null;
            processedCount++;
            
            const progress = 20 + (processedCount / totalStudents) * 60;
            updateLoadingProgress(progress, 2, `Processing ${processedCount}/${totalStudents} students...`);
            
            const total = calculateMarksEntryTotal(mark.cat1, mark.cat2, mark.exam, assessmentType);
            const gradeInfo = getMarksEntryGrade(total);
            
            let newApprovalStatus = 'draft'; // Default for lecturers
            let statusChanged = false;
            let resetReason = '';
            
            if (existing) {
                const oldCat1 = parseFloat(existing.cat1_score) || 0;
                const oldCat2 = parseFloat(existing.cat2_score) || 0;
                const oldExam = parseFloat(existing.exam_score) || 0;
                const oldTotal = parseFloat(existing.final_score) || 0;
                
                // ✅ Check for retake changes too
                const oldRetakeScore = parseFloat(existing.retake_score) || 0;
                const oldRetakeCount = existing.retake_count || 0;
                
                // ✅ Check if ANY value changed (including retake)
                const hasChanges = (
                    Math.abs(oldCat1 - mark.cat1) > 0.01 ||
                    Math.abs(oldCat2 - mark.cat2) > 0.01 ||
                    Math.abs(oldExam - mark.exam) > 0.01 ||
                    oldTotal !== total
                );
                
                console.log(`📝 ${mark.admission}: Old status: ${existing.approval_status}, Has changes: ${hasChanges}`);
                
                if (isAdmin) {
                    // ✅ Admin: always approved
                    newApprovalStatus = 'approved';
                    console.log(`👑 Admin saving ${mark.admission} as APPROVED`);
                } else if (hasChanges) {
                    // ✅ Lecturer: reset to draft if ANY change was made
                    if (existing.approval_status === 'approved' || existing.approval_status === 'pending') {
                        newApprovalStatus = 'draft';
                        statusChanged = true;
                        resetReason = `Reset from ${existing.approval_status} to DRAFT (edited)`;
                        resetCount++;
                        resetStudents.push({
                            admission: mark.admission,
                            name: mark.name,
                            old_status: existing.approval_status,
                            new_status: 'draft',
                            reason: 'Marks edited'
                        });
                        console.log(`🔄 Reset ${mark.admission} from ${existing.approval_status} to DRAFT (edited)`);
                    } else {
                        newApprovalStatus = 'draft';
                    }
                } else {
                    // ✅ No changes, keep existing status
                    newApprovalStatus = existing.approval_status;
                }
            } else {
                // ✅ New record: draft for lecturer, approved for admin
                newApprovalStatus = isAdmin ? 'approved' : 'draft';
                console.log(`🆕 New record ${mark.admission}: ${newApprovalStatus}`);
            }
            
            // Build update/insert data
            const markData = {
                student_name: mark.name || 'Unknown',
                assessment_type: assessmentType,
                cat1_score: mark.cat1 || null,
                cat2_score: mark.cat2 || null,
                exam_score: mark.exam || null,
                final_score: total || null,
                grade: gradeInfo.grade || null,
                approval_status: newApprovalStatus,
                updated_at: new Date().toISOString()
            };
            
            // ✅ If admin and approved, set approval details
            if (isAdmin && newApprovalStatus === 'approved') {
                markData.approved_at = new Date().toISOString();
                markData.approved_by = window.currentUser?.id || null;
                console.log(`👑 Admin approved ${mark.admission}`);
            }
            
            if (existing) {
                updates.push({
                    id: existing.id,
                    data: markData,
                    admission: mark.admission,
                    old_status: existing.approval_status,
                    new_status: newApprovalStatus
                });
            } else {
                const insertData = {
                    admission_number: mark.admission,
                    student_name: mark.name || 'Unknown',
                    block: block,
                    subject_name: unit,
                    assessment_type: assessmentType,
                    cat1_score: mark.cat1 || null,
                    cat2_score: mark.cat2 || null,
                    exam_score: mark.exam || null,
                    final_score: total || null,
                    grade: gradeInfo.grade || null,
                    academic_year: year,
                    approval_status: newApprovalStatus,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                };
                
                // ✅ If admin and approved, set approval details
                if (isAdmin && newApprovalStatus === 'approved') {
                    insertData.approved_at = new Date().toISOString();
                    insertData.approved_by = window.currentUser?.id || null;
                }
                
                inserts.push(insertData);
            }
        }
        
        updateLoadingProgress(80, 3, 'Saving to database...');
        
        // Bulk update
        if (updates.length > 0) {
            const batchSize = 50;
            for (let i = 0; i < updates.length; i += batchSize) {
                const batch = updates.slice(i, i + batchSize);
                const promises = batch.map(u => 
                    sb
                        .from('student_marks')
                        .update(u.data)
                        .eq('id', u.id)
                );
                const results = await Promise.all(promises);
                
                results.forEach(result => {
                    if (!result.error) updated++;
                    else errors++;
                });
                
                const progress = 80 + (i + batch.length) / updates.length * 15;
                updateLoadingProgress(progress, 3, `Saving ${Math.min(i + batch.length, updates.length)}/${updates.length} updates...`);
            }
        }
        
        // Bulk insert
        if (inserts.length > 0) {
            const batchSize = 50;
            for (let i = 0; i < inserts.length; i += batchSize) {
                const batch = inserts.slice(i, i + batchSize);
                const { error } = await sb
                    .from('student_marks')
                    .insert(batch);
                
                if (error) {
                    errors += batch.length;
                    console.error('Insert error:', error);
                } else {
                    saved += batch.length;
                }
                
                const progress = 80 + (i + batch.length) / inserts.length * 15;
                updateLoadingProgress(progress, 3, `Inserting ${Math.min(i + batch.length, inserts.length)}/${inserts.length} new...`);
            }
        }
        
        // Log status changes
        if (resetStudents.length > 0) {
            updateLoadingProgress(95, 4, 'Logging status changes...');
            
            try {
                const logs = resetStudents.map(s => ({
                    block: block,
                    subject: unit,
                    academic_year: year,
                    action: 'status_changed',
                    action_by: me_currentLecturer?.profile?.id || null,
                    action_by_name: me_currentLecturer?.profile?.full_name || 'Lecturer',
                    admission: s.admission,
                    student_name: s.name,
                    old_status: s.old_status,
                    new_status: s.new_status,
                    reason: s.reason,
                    created_at: new Date().toISOString()
                }));
                
                const batchSize = 20;
                for (let i = 0; i < logs.length; i += batchSize) {
                    const batch = logs.slice(i, i + batchSize);
                    await sb
                        .from('mark_approval_logs')
                        .insert(batch);
                }
                console.log(`📝 Logged ${resetStudents.length} status changes`);
            } catch (logError) {
                console.warn('⚠️ Could not log status changes:', logError.message);
            }
        }
        
        updateLoadingProgress(100, 4, '✅ Complete!');
        await new Promise(resolve => setTimeout(resolve, 500));
        hideLoadingScreen();
        
        // Show results
        let message = '';
        const parts = [];
        if (saved > 0) parts.push(`${saved} new`);
        if (updated > 0) parts.push(`${updated} updated`);
        if (resetCount > 0) parts.push(`${resetCount} reset to draft`);
        
        if (parts.length > 0 && errors === 0) {
            message = `✅ ${parts.join(', ')} saved successfully!`;
            showNotification(message, 'success');
        } else if (parts.length > 0 && errors > 0) {
            message = `⚠️ ${parts.join(', ')}, ${errors} errors`;
            showNotification(message, 'warning');
        } else if (errors > 0) {
            message = `❌ Failed to save ${errors} marks. Check console for details.`;
            showNotification(message, 'error');
        }
        
        // ✅ If lecturer saved as draft, ask if they want to submit
        if (isLecturer && (saved > 0 || updated > 0 || resetCount > 0)) {
            const { data: draftCheck } = await sb
                .from('student_marks')
                .select('id')
                .eq('block', block)
                .eq('subject_name', unit)
                .eq('academic_year', year)
                .in('approval_status', ['draft', 'rejected']);
            
            if (draftCheck && draftCheck.length > 0) {
                const draftCount = draftCheck.length;
                const studentsWithScoresCount = marksData.filter(m => m.cat1 > 0 || m.cat2 > 0 || m.exam > 0).length;
                
                if (studentsWithScoresCount > 0) {
                    const submitMessage = `📤 ${draftCount} marks are ready for approval.\n\nWould you like to submit them for admin approval now?`;
                    if (confirm(submitMessage)) {
                        await submitMarksForApproval();
                    } else {
                        showNotification('💾 Marks saved as DRAFT. Submit later using the "Submit" button.', 'info');
                    }
                }
            }
        }
        
        // Refresh
        setTimeout(() => loadMarksEntry(), 500);
        
    } catch (error) {
        hideLoadingScreen();
        showNotification('❌ Error saving marks: ' + error.message, 'error');
        console.error('Save error:', error);
    }
}

// ============================================================
// SUBMIT MARKS FOR APPROVAL
// ============================================================

async function submitMarksForApproval() {
    const block = me_currentBlock;
    const unit = me_currentUnit;
    const year = me_currentYear;
    
    if (!block || !unit) {
        showNotification('Please load marks first', 'warning');
        return;
    }
    
    // ✅ Check if user is admin
    const isAdmin = isUserAdmin();
    if (isAdmin) {
        showNotification('👑 Admin: Marks are auto-approved. Use the Save button.', 'info');
        return;
    }
    
    showLoadingScreen('Checking marks...', '📤 Submit for Approval');
    updateLoadingProgress(10, 1, 'Checking marks status...');
    
    try {
        const { data: marks, error } = await sb
            .from('student_marks')
            .select('id, approval_status, final_score, admission_number, student_name')
            .eq('block', block)
            .eq('subject_name', unit)
            .eq('academic_year', year);
        
        if (error) throw error;
        
        if (!marks || marks.length === 0) {
            hideLoadingScreen();
            showNotification('No marks to submit for approval', 'warning');
            return;
        }
        
        const hasScores = marks.some(m => m.final_score !== null && m.final_score > 0);
        if (!hasScores) {
            hideLoadingScreen();
            showNotification('⚠️ Please enter marks before submitting for approval', 'warning');
            return;
        }
        
        const draftMarks = marks.filter(m => m.approval_status === 'draft' || m.approval_status === 'rejected');
        const pendingMarks = marks.filter(m => m.approval_status === 'pending');
        const approvedMarks = marks.filter(m => m.approval_status === 'approved');
        
        updateLoadingProgress(30, 2, `Found ${draftMarks.length} marks ready for submission...`);
        
        if (draftMarks.length === 0) {
            hideLoadingScreen();
            if (approvedMarks.length === marks.length) {
                showNotification('✅ All marks are already approved!', 'success');
            } else if (pendingMarks.length > 0) {
                showNotification(`⏳ ${pendingMarks.length} marks are already pending approval`, 'warning');
            } else {
                showNotification('No draft or rejected marks to submit', 'warning');
            }
            return;
        }
        
        const summary = [
            `📊 ${draftMarks.length} marks ready for submission`,
            approvedMarks.length > 0 ? `✅ ${approvedMarks.length} already approved (will not be resubmitted)` : null,
            pendingMarks.length > 0 ? `⏳ ${pendingMarks.length} already pending` : null
        ].filter(Boolean).join('\n');
        
        hideLoadingScreen();
        
        if (!confirm(`📤 Submit for approval?\n\n${summary}\n\nContinue?`)) {
            return;
        }
        
        showLoadingScreen(`Submitting ${draftMarks.length} marks...`, '📤 Submitting for Approval');
        updateLoadingProgress(40, 2, 'Preparing submission...');
        
        const markIds = draftMarks.map(m => m.id);
        const batchSize = 50;
        let submitted = 0;
        let errors = 0;
        
        for (let i = 0; i < markIds.length; i += batchSize) {
            const batch = markIds.slice(i, i + batchSize);
            
            const progress = 40 + (i / markIds.length) * 50;
            updateLoadingProgress(progress, 3, `Submitting ${Math.min(i + batch.length, markIds.length)}/${markIds.length} marks...`);
            
            const { error: updateError } = await sb
                .from('student_marks')
                .update({
                    approval_status: 'pending',
                    submitted_at: new Date().toISOString(),
                    submitted_by: me_currentLecturer?.profile?.id || null
                })
                .in('id', batch);
            
            if (updateError) {
                errors += batch.length;
                console.error('Error submitting batch:', updateError);
            } else {
                submitted += batch.length;
            }
        }
        
        if (submitted > 0) {
            updateLoadingProgress(95, 4, 'Logging submission...');
            
            try {
                await sb
                    .from('mark_approval_logs')
                    .insert({
                        block: block,
                        subject: unit,
                        academic_year: year,
                        action: 'submitted',
                        action_by: me_currentLecturer?.profile?.id || null,
                        action_by_name: me_currentLecturer?.profile?.full_name || 'Lecturer',
                        marks_count: submitted,
                        reason: `Submitted ${submitted} marks for "${unit}" in ${block}`,
                        created_at: new Date().toISOString()
                    });
            } catch (logError) {
                console.warn('Could not save approval log:', logError);
            }
        }
        
        updateLoadingProgress(100, 4, '✅ Complete!');
        await new Promise(resolve => setTimeout(resolve, 500));
        hideLoadingScreen();
        
        if (errors > 0 && submitted > 0) {
            showNotification(`⚠️ ${submitted} marks submitted, ${errors} errors`, 'warning');
        } else if (submitted > 0) {
            showNotification(`✅ ${submitted} marks submitted for approval!`, 'success');
        } else {
            showNotification('❌ Failed to submit marks', 'error');
        }
        
        setTimeout(() => loadMarksEntry(), 500);
        
    } catch (error) {
        hideLoadingScreen();
        showNotification('❌ Error submitting for approval: ' + error.message, 'error');
        console.error('Submit error:', error);
    }
}

// ============================================================
// WITHDRAW MARKS FROM APPROVAL
// ============================================================

async function withdrawMarksFromApproval() {
    const block = me_currentBlock;
    const unit = me_currentUnit;
    const year = me_currentYear;
    
    if (!block || !unit) {
        showNotification('Please load marks first', 'warning');
        return;
    }
    
    // ✅ Check if user is admin
    const isAdmin = isUserAdmin();
    if (isAdmin) {
        showNotification('👑 Admin: No need to withdraw. Use Save to update marks.', 'info');
        return;
    }
    
    showLoadingScreen('Checking pending marks...', '⏪ Withdraw from Approval');
    updateLoadingProgress(20, 1, 'Checking pending marks...');
    
    try {
        const { data: pendingMarks, error } = await sb
            .from('student_marks')
            .select('id, admission_number, student_name')
            .eq('block', block)
            .eq('subject_name', unit)
            .eq('academic_year', year)
            .eq('approval_status', 'pending');
        
        if (error) throw error;
        
        hideLoadingScreen();
        
        if (!pendingMarks || pendingMarks.length === 0) {
            showNotification('No pending marks to withdraw', 'warning');
            return;
        }
        
        const studentList = pendingMarks.map(m => `  • ${m.student_name} (${m.admission_number})`).join('\n');
        
        if (!confirm(`⏪ Withdraw ${pendingMarks.length} pending marks from approval?\n\nStudents:\n${studentList}\n\nThey will go back to DRAFT status.`)) {
            return;
        }
        
        showLoadingScreen(`Withdrawing ${pendingMarks.length} marks...`, '⏪ Withdrawing');
        updateLoadingProgress(30, 2, 'Processing withdrawal...');
        
        const batchSize = 50;
        const ids = pendingMarks.map(m => m.id);
        let withdrawn = 0;
        let errors = 0;
        
        for (let i = 0; i < ids.length; i += batchSize) {
            const batch = ids.slice(i, i + batchSize);
            
            const progress = 30 + (i / ids.length) * 60;
            updateLoadingProgress(progress, 3, `Withdrawing ${Math.min(i + batch.length, ids.length)}/${ids.length} marks...`);
            
            const { error: updateError } = await sb
                .from('student_marks')
                .update({
                    approval_status: 'draft',
                    submitted_at: null,
                    submitted_by: null
                })
                .in('id', batch);
            
            if (updateError) {
                errors += batch.length;
                console.error('Error withdrawing batch:', updateError);
            } else {
                withdrawn += batch.length;
            }
        }
        
        updateLoadingProgress(100, 4, '✅ Complete!');
        await new Promise(resolve => setTimeout(resolve, 500));
        hideLoadingScreen();
        
        if (errors > 0 && withdrawn > 0) {
            showNotification(`⚠️ ${withdrawn} marks withdrawn, ${errors} errors`, 'warning');
        } else if (withdrawn > 0) {
            showNotification(`✅ ${withdrawn} marks withdrawn from approval!`, 'success');
        } else {
            showNotification('❌ Failed to withdraw marks', 'error');
        }
        
        setTimeout(() => loadMarksEntry(), 500);
        
    } catch (error) {
        hideLoadingScreen();
        showNotification('❌ Error withdrawing: ' + error.message, 'error');
        console.error('Withdraw error:', error);
    }
}

// ============================================================
// EXPORT MARKS
// ============================================================

function exportMarksEntry() {
    const marks = me_currentMarks;
    if (!marks || marks.length === 0) {
        showNotification('No data to export', 'warning');
        return;
    }
    
    const assessmentType = me_currentAssessmentType || 'full';
    const headers = ['Admission', 'Name', 'CAT1', 'CAT2', 'Exam', 'Total', 'Grade', 'Points', 'Rating', 
                     'Has Retake', 'Retake Count', 'Retake Score', 'Retake Grade', 'Retake Status', 'Approval Status'];
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
            m.retakeStatus || '',
            m.approval_status || 'draft'
        ];
    });
    
    let csv = headers.join(',') + '\n';
    rows.forEach(row => {
        csv += row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',') + '\n';
    });
    
    downloadCSV(csv, `marks_${me_currentUnit}_${me_currentBlock}_${me_currentYear}.csv`);
    showNotification('✅ Marks exported!', 'success');
}

function downloadCSV(csv, filename) {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

// ============================================================
// UPDATE DISPLAY FUNCTIONS
// ============================================================

function updateAssessmentTypeDisplay(type) {
    const displayEl = document.getElementById('me_assessment_type_display');
    if (displayEl) {
        const labels = {
            'full': 'Full (CAT1+CAT2+Exam)',
            'single_cat': 'Single CAT (CAT+Exam)',
            'exam_only': 'Exam Only',
            'cats_only': 'CATs Only (No Exam)',
            'cat_only': 'CAT Only'
        };
        displayEl.textContent = labels[type] || type;
    }
}

function updateVisibleColumnsInfo(visibleColumns) {
    const columnsEl = document.getElementById('lecturerVisibleColumns');
    if (!columnsEl) return;
    
    const columnLabels = {
        'sno': '#',
        'admission': 'Admission',
        'name': 'Name',
        'cat1': 'CAT1',
        'cat2': 'CAT2',
        'exam': 'Exam',
        'total': 'Total',
        'grade': 'Grade',
        'points': 'Points',
        'rating': 'Rating',
        'approval': 'Approval'
    };
    
    const visible = Object.keys(columnLabels)
        .filter(key => visibleColumns[key] !== false)
        .map(key => columnLabels[key]);
    
    columnsEl.textContent = visible.length ? visible.join(', ') : 'No columns visible';
}

// ============================================================
// LOAD LECTURER MARKS ENTRY - Wrapper for onclick
// ============================================================

function loadLecturerMarksEntry() {
    console.log('📊 loadLecturerMarksEntry called - loading marks...');
    loadMarksEntry();
}

// ============================================================
// GLOBAL EXPOSURE
// ============================================================

window.detectLecturerProgram = detectLecturerProgram;
window.loadLecturerByEmail = loadLecturerByEmail;
window.getLecturerAssignedUnits = getLecturerAssignedUnits;
window.loadMEBlocks = loadMEBlocks;
window.loadMEUnits = loadMEUnits;
window.loadMarksEntry = loadMarksEntry;
window.loadLecturerMarksEntry = loadLecturerMarksEntry;
window.renderMarksEntryTable = renderMarksEntryTable;
window.updateMarksEntryRow = updateMarksEntryRow;
window.calculateMarksEntryTotal = calculateMarksEntryTotal;
window.getMarksEntryGrade = getMarksEntryGrade;
window.updateMarksEntryStats = updateMarksEntryStats;
window.saveMarksEntry = saveMarksEntry;
window.submitMarksForApproval = submitMarksForApproval;
window.withdrawMarksFromApproval = withdrawMarksFromApproval;
window.exportMarksEntry = exportMarksEntry;
window.checkMarksApprovalStatus = checkMarksApprovalStatus;
window.createApprovalStatusBanner = createApprovalStatusBanner;
window.showNotification = showNotification;
window.downloadCSV = downloadCSV;
window.showLoadingScreen = showLoadingScreen;
window.updateLoadingProgress = updateLoadingProgress;
window.updateLoadingStep = updateLoadingStep;
window.hideLoadingScreen = hideLoadingScreen;

// Retake functions
window.loadLecturerRetakeData = loadLecturerRetakeData;
window.recordLecturerRetakeExam = recordLecturerRetakeExam;
window.createLecturerRetakeModal = createLecturerRetakeModal;
window.openLecturerRetakeModal = openLecturerRetakeModal;
window.closeLecturerRetakeModal = closeLecturerRetakeModal;
window.saveLecturerRetakeExam = saveLecturerRetakeExam;

// Admin check
window.isUserAdmin = isUserAdmin;

// ============================================================
// INITIALIZATION
// ============================================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Initializing Lecturer Marks Module with Retake Support...');
    console.log('👑 Admin mode:', isUserAdmin() ? 'ENABLED' : 'DISABLED');
    
    showLoadingScreen('Starting lecturer module...', 'NCHSM Lecturer Portal');
    updateLoadingProgress(5, 1, 'Detecting user session...');
    
    setTimeout(async function() {
        try {
            updateLoadingProgress(15, 1, 'Detecting lecturer program...');
            await detectLecturerProgram();
            
            updateLoadingProgress(35, 2, 'Loading available blocks...');
            await loadMEBlocks();
            
            updateLoadingProgress(55, 3, 'Loading assigned units...');
            await loadMEUnits();
            
            updateLoadingProgress(75, 4, 'Loading marks data...');
            
            const blockSelect = document.getElementById('me_block_select');
            const unitSelect = document.getElementById('me_subject_select');
            
            if (blockSelect && blockSelect.value && unitSelect && unitSelect.value) {
                await loadMarksEntry();
            } else {
                const container = document.getElementById('me_marks_container');
                if (container) {
                    container.innerHTML = `
                        <div style="text-align: center; padding: 60px 20px;">
                            <i class="fas fa-pen-alt" style="font-size: 48px; color: #94a3b8; margin-bottom: 16px; display: block;"></i>
                            <h3 style="color: #1e293b;">Select Block and Unit</h3>
                            <p style="color: #94a3b8;">Choose from the dropdowns above to load marks</p>
                        </div>
                    `;
                }
            }
            
            createLecturerRetakeModal();
            
            updateLoadingProgress(100, 4, '✅ Ready!');
            await new Promise(resolve => setTimeout(resolve, 500));
            hideLoadingScreen();
            
            console.log('✅ Lecturer Marks Module initialized with Retake Support!');
            console.log('📊 Program:', me_currentProgram);
            console.log('📚 Assigned Units:', me_assignedUnits.length);
            console.log('⭐ Retake Support: Enabled (Max 2 attempts)');
            console.log('👑 Admin Mode:', isUserAdmin() ? 'Yes - Auto-approve enabled' : 'No - Lecturer mode');
            console.log('📝 Lecturer saves as DRAFT, Admin auto-approves');
            
        } catch (error) {
            console.error('❌ Error initializing:', error);
            updateLoadingStep(4, '❌ Error loading module');
            setTimeout(hideLoadingScreen, 2000);
            showNotification('Error initializing module: ' + error.message, 'error');
        }
    }, 800);
});

console.log('✅ Lecturer Marks module loaded successfully!');
console.log('⭐ Retake/Supplementary Exam Support: ENABLED');
console.log('📋 Max Retakes per student: 2');
console.log('📝 Lecturers save as DRAFT → Submit → Admin Approves');
console.log('👑 Admin auto-approves when saving');
console.log('✅ Synced with admin column settings');
console.log('✅ Assessment type auto-detected from admin');
console.log('✅ Strict unit assignment filtering enabled!');
console.log('🔒 Lecturers only see assigned units');
console.log('💾 Marks are permanently saved to Supabase!');
console.log('🔄 Loading screen integrated!');
