// ============================================================
// LECTURER MARKS MODULE - COMPLETE FIXED VERSION
// NO INFINITE RECURSION
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
let _loadingActive = false;

// ============================================================
// FIXED: SHOW/HIDE FUNCTIONS (NO RECURSION)
// ============================================================

function showNotification(message, type) {
    // Always log
    console.log(`[${type || 'info'}] ${message}`);
    
    // Try LecturerUI once
    try {
        if (window.LecturerUI && typeof window.LecturerUI.showNotification === 'function') {
            window.LecturerUI.showNotification(message, type || 'info');
            return;
        }
    } catch (e) { /* silent */ }
    
    // Simple toast fallback
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

function showLoading(message) {
    // Prevent infinite recursion
    if (_loadingActive) {
        console.log(`⏳ [already loading] ${message}`);
        return;
    }
    
    _loadingActive = true;
    console.log(`⏳ ${message}`);
    
    try {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            const msg = document.getElementById('loadingMessage');
            if (msg) msg.textContent = message;
            overlay.style.display = 'flex';
        }
    } catch (e) { /* silent */ }
}

function hideLoading() {
    _loadingActive = false;
    console.log('✅ Done');
    
    try {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.style.display = 'none';
        }
    } catch (e) { /* silent */ }
}

// EXPOSE - Only if not already defined
if (typeof window.showNotification === 'undefined') {
    window.showNotification = showNotification;
}
if (typeof window.showLoading === 'undefined') {
    window.showLoading = showLoading;
}
if (typeof window.hideLoading === 'undefined') {
    window.hideLoading = hideLoading;
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
    
    try {
        let session = null;
        try {
            session = JSON.parse(localStorage.getItem('lecturerSession') || 
                               sessionStorage.getItem('lecturerSession') || '{}');
        } catch (e) { /* silent */ }
        
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
        
        const { data: profile, error: profileError } = await sb
            .from('consolidated_user_profiles_table')
            .select('*')
            .eq('email', userEmail)
            .maybeSingle();
        
        if (!profileError && profile) {
            me_currentLecturer = { profile, staff: null };
            me_currentProgram = profile.program || 'KRCHN';
            console.log('✅ Lecturer loaded from profile');
            updateLecturerUI(profile);
            return profile;
        }
        
        const { data: staff, error: staffError } = await sb
            .from('staff_records')
            .select('*')
            .eq('email', userEmail)
            .maybeSingle();
        
        if (!staffError && staff) {
            me_currentLecturer = { profile: null, staff };
            me_currentProgram = staff.program || 'KRCHN';
            console.log('✅ Lecturer loaded from staff_records');
            updateLecturerUI(staff);
            return staff;
        }
        
        me_currentProgram = 'KRCHN';
        updateLecturerUI({ program: 'KRCHN', department: 'Nursing' });
        
        return null;
        
    } catch (error) {
        console.error('❌ Error detecting lecturer program:', error);
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
    
    const tvetInfo = document.getElementById('tvetDepartmentInfo');
    const krchnInfo = document.getElementById('krchnDepartmentInfo');
    
    if (isTVET) {
        if (tvetInfo) tvetInfo.style.display = 'block';
        if (krchnInfo) krchnInfo.style.display = 'none';
        const deptName = document.getElementById('tvetDepartmentName');
        if (deptName) deptName.textContent = departmentName;
    } else {
        if (tvetInfo) tvetInfo.style.display = 'none';
        if (krchnInfo) krchnInfo.style.display = 'block';
        const blockName = document.getElementById('krchnBlockName');
        if (blockName) blockName.textContent = data?.block || 'Block 2';
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
        const { data, error } = await sb
            .from('units_catalog')
            .select('block')
            .eq('program', program)
            .eq('status', 'active')
            .order('block', { ascending: true });
        
        if (error) throw error;
        
        const blocks = [...new Set(data.map(d => d.block).filter(Boolean))];
        
        if (blockSelect) {
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
        }
        
        if (unitSelect) {
            unitSelect.innerHTML = '<option value="">-- Select Unit --</option>';
        }
        
        console.log('📊 Loaded blocks:', blocks.length);
        
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
        const { data, error } = await sb
            .from('units_catalog')
            .select('unit_code, unit_name, assessment_type, id')
            .eq('program', program)
            .eq('block', block)
            .eq('status', 'active')
            .order('unit_name', { ascending: true });
        
        if (error) throw error;
        
        const lecturerId = me_currentLecturer?.staff?.id || me_currentLecturer?.profile?.id;
        let assignedUnitNames = [];
        let assignedUnitIds = [];
        
        if (lecturerId) {
            const { data: assignments, error: assignError } = await sb
                .from('lecturer_subject_assignments')
                .select('subject_name, subject_id')
                .eq('lecturer_id', lecturerId)
                .eq('block', block);
            
            if (!assignError && assignments) {
                assignedUnitNames = assignments.map(a => a.subject_name).filter(Boolean);
                assignedUnitIds = assignments.map(a => a.subject_id).filter(Boolean);
            }
        }
        
        let filteredUnits = data || [];
        
        if (assignedUnitNames.length > 0 || assignedUnitIds.length > 0) {
            filteredUnits = data.filter(u => 
                assignedUnitNames.includes(u.unit_name) ||
                assignedUnitIds.includes(u.id) ||
                assignedUnitNames.includes(u.unit_code)
            );
            console.log(`📊 Showing ${filteredUnits.length} assigned units out of ${data.length} total`);
        }
        
        if (unitSelect) {
            unitSelect.innerHTML = '<option value="">-- Select Unit --</option>';
            
            if (filteredUnits.length === 0) {
                unitSelect.innerHTML = '<option value="">-- No units assigned to you --</option>';
                showNotification('📚 No units assigned to you in this block', 'warning');
            } else {
                filteredUnits.forEach(unit => {
                    const option = document.createElement('option');
                    option.value = unit.unit_name;
                    option.dataset.assessment = unit.assessment_type || 'full';
                    option.dataset.code = unit.unit_code || '';
                    option.textContent = `${unit.unit_code || ''} - ${unit.unit_name}`;
                    unitSelect.appendChild(option);
                });
            }
        }
        
        const countEl = document.getElementById('lecturerUnitCount');
        if (countEl) countEl.textContent = filteredUnits.length;
        
        console.log('📊 Loaded units:', filteredUnits.length);
        
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
            
            console.log('📋 Loaded admin settings:', { 
                columns: data?.columns, 
                assessmentType: me_currentAssessmentType 
            });
        }
        
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
// LOAD MARKS ENTRY
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
    
    me_currentProgram = program;
    me_currentBlock = block;
    me_currentUnit = unit;
    me_currentYear = year;
    
    if (container) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px;">
                <div class="spinner" style="width: 40px; height: 40px; border: 4px solid #e2e8f0; border-top-color: #4C1D95; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto;"></div>
                <p style="color: #6b7280; margin-top: 10px;">Loading marks for ${unit}...</p>
            </div>
            <style>
                @keyframes spin { to { transform: rotate(360deg); } }
            </style>
        `;
    }
    
    try {
        await loadAdminColumnSettings(block, unit);
        
        const { data: marks, error } = await sb
            .from('student_marks')
            .select('*')
            .eq('block', block)
            .eq('subject_name', unit)
            .eq('academic_year', year);
        
        if (error) throw error;
        
        const { data: students, error: studentError } = await sb
            .from('consolidated_user_profiles_table')
            .select('student_id, full_name, block, intake_year, program')
            .eq('role', 'student')
            .eq('program', program)
            .eq('block', block);
        
        if (studentError) throw studentError;
        
        console.log('📊 Students found:', students?.length || 0);
        
        const marksMap = {};
        marks?.forEach(m => {
            marksMap[m.admission_number] = m;
        });
        
        const fullMarks = students?.map(s => {
            const studentId = s.student_id || '';
            const existing = marksMap[studentId] || {};
            
            return {
                admission: studentId,
                name: s.full_name || 'Unknown',
                program: s.program || program,
                cat1: existing.cat1_score || '',
                cat2: existing.cat2_score || '',
                exam: existing.exam_score || '',
                final: existing.final_score || '',
                grade: existing.grade || '',
                gradedBy: existing.graded_by || '',
                assessmentType: me_currentAssessmentType || 'full',
                id: existing.id || null,
                approval_status: existing.approval_status || 'draft'
            };
        }) || [];
        
        me_currentMarks = fullMarks;
        renderMarksEntryTable(fullMarks, unit, me_currentAssessmentType);
        updateMarksEntryStats(fullMarks, me_currentAssessmentType);
        checkMarksApprovalStatus(fullMarks);
        
        updateAssessmentTypeDisplay(me_currentAssessmentType);
        const visibleColumns = getVisibleColumns();
        updateVisibleColumnsInfo(visibleColumns);
        
    } catch (error) {
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
// RENDER MARKS ENTRY TABLE
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
    
    const withScores = marks.filter(m => m.cat1 > 0 || m.cat2 > 0 || m.exam > 0);
    const passing = marks.filter(m => {
        const total = calculateMarksEntryTotal(m.cat1, m.cat2, m.exam, assessmentType);
        return total >= 60;
    });
    
    const pendingCount = marks.filter(m => m.approval_status === 'pending').length;
    const approvedCount = marks.filter(m => m.approval_status === 'approved').length;
    
    let html = `
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; margin-bottom: 16px;">
            <div>
                <h3 style="margin: 0; color: #0f172a;">${unit}</h3>
                <span style="font-size: 12px; color: #64748b;">${me_currentProgram} | ${me_currentBlock?.replace('_', ' ') || ''} | ${me_currentYear}</span>
                <span style="font-size: 12px; color: #64748b; margin-left: 12px; background: #e0f2fe; padding: 2px 12px; border-radius: 40px;">👥 ${marks.length} students</span>
                <span style="font-size: 12px; color: #059669; margin-left: 12px; background: #d1fae5; padding: 2px 12px; border-radius: 40px;">📊 ${withScores.length} with scores</span>
                <span style="font-size: 12px; color: #10b981; margin-left: 12px; background: #d1fae5; padding: 2px 12px; border-radius: 40px;">✅ ${passing.length} passing</span>
                ${pendingCount > 0 ? `<span style="font-size: 12px; color: #d97706; margin-left: 12px; background: #fef3c7; padding: 2px 12px; border-radius: 40px;">⏳ ${pendingCount} pending</span>` : ''}
                ${approvedCount > 0 ? `<span style="font-size: 12px; color: #065f46; margin-left: 12px; background: #d1fae5; padding: 2px 12px; border-radius: 40px;">✅ ${approvedCount} approved</span>` : ''}
            </div>
            <div style="font-size: 12px; color: #6b7280; background: #f3f4f6; padding: 4px 14px; border-radius: 20px;">
                <i class="fas fa-robot"></i> Auto: ${assessmentType.replace('_', ' ').toUpperCase()}
            </div>
            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                <button onclick="saveMarksEntry()" style="background: #059669; padding: 8px 16px; border: none; border-radius: 6px; color: white; cursor: pointer; font-weight: 600;">
                    <i class="fas fa-save"></i> Save All
                </button>
                <button onclick="submitMarksForApproval()" style="background: #4C1D95; padding: 8px 16px; border: none; border-radius: 6px; color: white; cursor: pointer; font-weight: 600;">
                    <i class="fas fa-paper-plane"></i> Submit
                </button>
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
        
        const approvalBadge = {
            'pending': '<span style="background:#fef3c7;color:#92400e;padding:2px 10px;border-radius:12px;font-size:11px;">⏳ Pending</span>',
            'approved': '<span style="background:#d1fae5;color:#065f46;padding:2px 10px;border-radius:12px;font-size:11px;">✅ Approved</span>',
            'rejected': '<span style="background:#fee2e2;color:#991b1b;padding:2px 10px;border-radius:12px;font-size:11px;">❌ Rejected</span>',
            'draft': '<span style="background:#e5e7eb;color:#6b7280;padding:2px 10px;border-radius:12px;font-size:11px;">📝 Draft</span>'
        }[m.approval_status] || '<span style="background:#e5e7eb;color:#6b7280;padding:2px 10px;border-radius:12px;font-size:11px;">📝 Draft</span>';
        
        html += `<tr style="${total > 0 ? `background: ${total >= 60 ? '#d1fae5' : '#fee2e2'};` : ''}">
            <td style="padding: 8px 6px; text-align: center; font-size: 12px; color: #94a3b8; ${visibleColumns.sno === false ? 'display:none;' : ''}">${i + 1}</td>
            <td style="padding: 8px 8px; font-weight: 500; font-size: 12px; ${visibleColumns.admission === false ? 'display:none;' : ''}">${m.admission || 'N/A'}</td>
            <td style="padding: 8px 8px; ${visibleColumns.name === false ? 'display:none;' : ''}"><strong>${m.name || 'Unknown'}</strong></td>
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
            ${visibleColumns.total !== false ? `<td id="me_total_${i}" style="padding: 8px 6px; text-align: center; font-weight: bold; ${total >= 60 ? 'color: #065f46;' : (total > 0 ? 'color: #991b1b;' : 'color: #f59e0b;')}">${displayTotal}</td>` : ''}
            ${visibleColumns.grade !== false ? `<td id="me_grade_${i}" style="padding: 8px 6px; text-align: center; font-weight: bold; font-size: 16px; color: ${gradeInfo.color};">${displayGrade}</td>` : ''}
            ${visibleColumns.rating !== false ? `<td id="me_points_${i}" style="padding: 8px 6px; text-align: center; font-weight: bold; font-size: 15px; color: ${gradeInfo.color};">${displayPoints}</td>` : ''}
            ${visibleColumns.approval !== false ? `<td style="padding: 8px 6px; text-align: center;">
                ${total > 0 ? `<span style="background: ${total >= 60 ? '#d1fae5' : '#fee2e2'}; padding: 3px 12px; border-radius: 12px; color: ${total >= 60 ? '#065f46' : '#991b1b'}; font-weight: 600; display: inline-block;">${gradeInfo.rating}</span>` : '<span style="color: #94a3b8;">PENDING</span>'}
                <br><span style="font-size: 10px;">${approvalBadge}</span>
            </td>` : ''}
        </tr>`;
    });
    
    html += `
                </tbody>
            </table>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-top:16px;">
            <button onclick="saveMarksEntry()" style="background: #059669; padding: 10px 24px; border: none; border-radius: 8px; color: white; cursor: pointer; font-weight: 600; font-size: 14px;">
                <i class="fas fa-save"></i> 💾 Save All Marks
            </button>
            <button onclick="submitMarksForApproval()" style="background: #4C1D95; padding: 10px 24px; border: none; border-radius: 8px; color: white; cursor: pointer; font-weight: 600; font-size: 14px;">
                <i class="fas fa-paper-plane"></i> 📤 Submit for Approval
            </button>
            <div style="font-size: 11px; color: #94a3b8;">
                <i class="fas fa-lock"></i> Auto-detected from admin settings
            </div>
        </div>
    `;
    
    container.innerHTML = html;
}

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

function updateMarksEntryRow(index) {
    const cat1 = parseFloat(document.getElementById(`me_cat1_${index}`)?.value) || 0;
    const cat2 = parseFloat(document.getElementById(`me_cat2_${index}`)?.value) || 0;
    const exam = parseFloat(document.getElementById(`me_exam_${index}`)?.value) || 0;
    const assessmentType = me_currentAssessmentType || 'full';
    
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
    
    if (me_currentMarks && me_currentMarks[index]) {
        me_currentMarks[index].cat1 = cat1;
        me_currentMarks[index].cat2 = cat2;
        me_currentMarks[index].exam = exam;
    }
}

function calculateMarksEntryTotal(cat1, cat2, exam, type) {
    let total = 0;
    type = type || 'full';
    
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

function getMarksEntryGrade(score) {
    if (score >= 75) return { grade: 'A', rating: 'Distinction', points: 4.0, color: '#065f46' };
    else if (score >= 65) return { grade: 'B', rating: 'Credit', points: 3.0, color: '#1e40af' };
    else if (score >= 60) return { grade: 'C', rating: 'Pass', points: 2.0, color: '#92400e' };
    else return { grade: 'D', rating: 'Fail', points: 0.0, color: '#991b1b' };
}

function updateMarksEntryStats(marks, assessmentType) {
    const withScores = marks.filter(m => m.cat1 > 0 || m.cat2 > 0 || m.exam > 0);
    const passing = marks.filter(m => {
        const total = calculateMarksEntryTotal(m.cat1, m.cat2, m.exam, assessmentType);
        return total >= 60;
    });
    const avg = withScores.length > 0 ? 
        withScores.reduce((sum, m) => sum + calculateMarksEntryTotal(m.cat1, m.cat2, m.exam, assessmentType), 0) / withScores.length : 0;
    
    const totalEl = document.getElementById('me_total_students');
    const subjectsEl = document.getElementById('me_total_subjects');
    const passEl = document.getElementById('me_pass_rate');
    const avgEl = document.getElementById('me_class_avg');
    
    if (totalEl) totalEl.textContent = marks.length;
    if (subjectsEl) subjectsEl.textContent = marks.length > 0 ? 1 : 0;
    if (passEl) passEl.textContent = marks.length > 0 ? Math.round((passing.length / marks.length) * 100) + '%' : '0%';
    if (avgEl) avgEl.textContent = Math.round(avg) + '%';
}

function checkMarksApprovalStatus(marks) {
    const pendingCount = marks.filter(m => m.approval_status === 'pending').length;
    const approvedCount = marks.filter(m => m.approval_status === 'approved').length;
    const rejectedCount = marks.filter(m => m.approval_status === 'rejected').length;
    
    const banner = document.getElementById('approvalStatusBanner');
    const statusText = document.getElementById('approvalStatusText');
    const statusBadge = document.getElementById('approvalStatusBadge');
    const submitBtn = document.getElementById('submitForApprovalBtn');
    const withdrawBtn = document.getElementById('withdrawApprovalBtn');
    
    if (!banner) return;
    
    if (pendingCount > 0) {
        banner.style.display = 'block';
        banner.style.borderLeftColor = '#f59e0b';
        banner.style.background = '#fef3c7';
        if (statusText) statusText.textContent = 'Pending Admin Approval';
        if (statusBadge) {
            statusBadge.textContent = '⏳ Pending';
            statusBadge.className = 'badge badge-warning';
        }
        if (submitBtn) submitBtn.style.display = 'none';
        if (withdrawBtn) withdrawBtn.style.display = 'inline-block';
        const details = document.getElementById('approvalDetails');
        if (details) details.style.display = 'block';
        const reason = document.getElementById('rejectionReason');
        if (reason) reason.style.display = 'none';
    } else if (approvedCount > 0) {
        banner.style.display = 'block';
        banner.style.borderLeftColor = '#10b981';
        banner.style.background = '#d1fae5';
        if (statusText) statusText.textContent = '✅ Approved by Admin';
        if (statusBadge) {
            statusBadge.textContent = '✅ Approved';
            statusBadge.className = 'badge badge-success';
        }
        if (submitBtn) submitBtn.style.display = 'none';
        if (withdrawBtn) withdrawBtn.style.display = 'none';
        const details = document.getElementById('approvalDetails');
        if (details) details.style.display = 'block';
        const reason = document.getElementById('rejectionReason');
        if (reason) reason.style.display = 'none';
    } else if (rejectedCount > 0) {
        banner.style.display = 'block';
        banner.style.borderLeftColor = '#dc2626';
        banner.style.background = '#fee2e2';
        if (statusText) statusText.textContent = '❌ Rejected by Admin';
        if (statusBadge) {
            statusBadge.textContent = '❌ Rejected';
            statusBadge.className = 'badge badge-danger';
        }
        if (submitBtn) submitBtn.style.display = 'inline-block';
        if (withdrawBtn) withdrawBtn.style.display = 'none';
        const details = document.getElementById('approvalDetails');
        if (details) details.style.display = 'block';
        const reason = document.getElementById('rejectionReason');
        if (reason) reason.style.display = 'block';
    } else {
        banner.style.display = 'none';
        if (submitBtn) submitBtn.style.display = 'inline-block';
        if (withdrawBtn) withdrawBtn.style.display = 'none';
    }
}

// ============================================================
// SAVE MARKS
// ============================================================

async function saveMarksEntry() {
    const program = me_currentProgram;
    const block = me_currentBlock;
    const unit = me_currentUnit;
    const year = me_currentYear;
    const assessmentType = me_currentAssessmentType || 'full';
    
    const marksData = [];
    const rows = document.querySelectorAll('#me_marks_container table tbody tr');
    
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
                    exam: exam,
                    assessmentType: assessmentType
                });
            }
        }
    });
    
    if (marksData.length === 0) {
        showNotification('No marks to save', 'warning');
        return;
    }
    
    showLoading('Saving marks...');
    
    try {
        let saved = 0;
        let errors = 0;
        
        for (const mark of marksData) {
            const { data: existing } = await sb
                .from('student_marks')
                .select('id')
                .eq('admission_number', mark.admission)
                .eq('subject_name', unit)
                .eq('block', block)
                .eq('academic_year', year)
                .maybeSingle();
            
            const total = calculateMarksEntryTotal(mark.cat1, mark.cat2, mark.exam, assessmentType);
            const gradeInfo = getMarksEntryGrade(total);
            
            const markData = {
                admission_number: mark.admission,
                student_name: mark.name || 'Unknown',
                block: block,
                subject_name: unit,
                assessment_type: assessmentType,
                cat1_score: mark.cat1,
                cat2_score: mark.cat2,
                exam_score: mark.exam,
                final_score: total,
                grade: gradeInfo.grade,
                academic_year: year,
                updated_at: new Date().toISOString()
            };
            
            let result;
            if (existing) {
                result = await sb
                    .from('student_marks')
                    .update(markData)
                    .eq('id', existing.id);
            } else {
                markData.created_at = new Date().toISOString();
                result = await sb
                    .from('student_marks')
                    .insert([markData]);
            }
            
            if (result.error) {
                errors++;
                console.error('Error saving mark:', result.error);
            } else {
                saved++;
            }
        }
        
        hideLoading();
        showNotification(`✅ Saved ${saved} marks${errors > 0 ? `, ${errors} errors` : ''}`, errors > 0 ? 'warning' : 'success');
        setTimeout(() => loadMarksEntry(), 500);
        
    } catch (error) {
        hideLoading();
        showNotification('❌ Error saving marks: ' + error.message, 'error');
    }
}

// ============================================================
// SUBMIT FOR APPROVAL
// ============================================================

async function submitMarksForApproval() {
    const block = me_currentBlock;
    const unit = me_currentUnit;
    const year = me_currentYear;
    
    if (!block || !unit) {
        showNotification('Please load marks first', 'warning');
        return;
    }
    
    const { data: existing } = await sb
        .from('student_marks')
        .select('id, approval_status')
        .eq('block', block)
        .eq('subject_name', unit)
        .eq('academic_year', year);
    
    if (!existing || existing.length === 0) {
        showNotification('No marks to submit for approval', 'warning');
        return;
    }
    
    const alreadyPending = existing.filter(m => m.approval_status === 'pending');
    if (alreadyPending.length > 0) {
        showNotification(`${alreadyPending.length} marks already pending approval`, 'warning');
        return;
    }
    
    if (!confirm(`Submit ${existing.length} marks for "${unit}" in ${block.replace('_', ' ')} for admin approval?`)) return;
    
    showLoading('Submitting for approval...');
    
    try {
        const { error } = await sb
            .from('student_marks')
            .update({
                approval_status: 'pending',
                submitted_at: new Date().toISOString(),
                submitted_by: me_currentLecturer?.profile?.id || null
            })
            .eq('block', block)
            .eq('subject_name', unit)
            .eq('academic_year', year);
        
        if (error) throw error;
        
        await sb
            .from('mark_approval_logs')
            .insert({
                mark_id: null,
                action: 'submitted',
                action_by: me_currentLecturer?.profile?.id || null,
                action_by_name: me_currentLecturer?.profile?.full_name || 'Lecturer',
                reason: `Submitted ${existing.length} marks for "${unit}" in ${block}`,
                created_at: new Date().toISOString()
            });
        
        hideLoading();
        showNotification(`✅ ${existing.length} marks submitted for approval!`, 'success');
        await loadMarksEntry();
        
    } catch (error) {
        hideLoading();
        showNotification('❌ Error submitting for approval: ' + error.message, 'error');
    }
}

async function withdrawMarksFromApproval() {
    const block = me_currentBlock;
    const unit = me_currentUnit;
    const year = me_currentYear;
    
    if (!block || !unit) {
        showNotification('Please load marks first', 'warning');
        return;
    }
    
    if (!confirm(`Withdraw "${unit}" marks from admin approval?`)) return;
    
    showLoading('Withdrawing from approval...');
    
    try {
        const { error } = await sb
            .from('student_marks')
            .update({
                approval_status: 'draft',
                submitted_at: null,
                submitted_by: null
            })
            .eq('block', block)
            .eq('subject_name', unit)
            .eq('academic_year', year)
            .eq('approval_status', 'pending');
        
        if (error) throw error;
        
        hideLoading();
        showNotification('✅ Marks withdrawn from approval!', 'success');
        await loadMarksEntry();
        
    } catch (error) {
        hideLoading();
        showNotification('❌ Error withdrawing: ' + error.message, 'error');
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
    const headers = ['Admission', 'Name', 'CAT1', 'CAT2', 'Exam', 'Total', 'Grade', 'Points', 'Rating', 'Approval Status'];
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
// INITIALIZATION
// ============================================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Initializing Lecturer Marks Module...');
    
    setTimeout(async function() {
        try {
            await detectLecturerProgram();
            await loadMEBlocks();
            await loadMEUnits();
            
            const blockSelect = document.getElementById('me_block_select');
            const unitSelect = document.getElementById('me_subject_select');
            
            if (blockSelect && blockSelect.value && unitSelect && unitSelect.value) {
                await loadMarksEntry();
            }
            
            console.log('✅ Lecturer Marks Module initialized!');
            console.log('📊 Program:', me_currentProgram);
        } catch (error) {
            console.error('❌ Error initializing:', error);
        }
    }, 800);
});

// ============================================================
// GLOBAL EXPOSURE
// ============================================================

window.detectLecturerProgram = detectLecturerProgram;
window.loadLecturerByEmail = loadLecturerByEmail;
window.updateLecturerUI = updateLecturerUI;
window.loadMEBlocks = loadMEBlocks;
window.loadMEUnits = loadMEUnits;
window.loadMarksEntry = loadMarksEntry;
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
window.showNotification = showNotification;
window.showLoading = showLoading;
window.hideLoading = hideLoading;
window.downloadCSV = downloadCSV;

console.log('✅ Lecturer Marks module loaded successfully!');
