// ============================================================
// LECTURER MARKS MODULE - COMPLETE WITH LOADING SCREEN
// SYNCED WITH ADMIN SETTINGS
// TERMINOLOGY: "Unit" instead of "Subject"
// STRICT UNIT ASSIGNMENT FILTERING
// PERMANENT SUPABASE STORAGE
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
    
    // Reset steps
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
    
    // Make all previous steps complete
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
// NOTIFICATION FUNCTIONS - FIXED (NO RECURSION)
// ============================================================

function showNotification(message, type) {
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

function showLoading(message) {
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
// GET LECTURER ASSIGNED UNITS - FIXED FOR YOUR TABLE STRUCTURE
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
// LOAD LECTURER BY EMAIL - HELPER FUNCTION
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
// DETECT LECTURER PROGRAM - WITH LOADING
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
            if (blockName) blockName.textContent = staff?.block || 'Block 2';
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
// LOAD BLOCKS - ONLY SHOW BLOCKS WITH ASSIGNED UNITS
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
// LOAD UNITS - STRICT FILTERING (ONLY ASSIGNED UNITS)
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
// LOAD MARKS ENTRY - WITH LOADING SCREEN (FIXED)
// SHOWS ALL ENROLLED STUDENTS FROM student_marks
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
    
    // Show loading screen
    showLoadingScreen(`Loading marks for ${unit}...`, 'Loading Marks');
    updateLoadingProgress(10, 1, 'Checking assignment...');
    
    // ✅ Check if lecturer is assigned to this unit
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
        // Step 1: Load column settings
        updateLoadingProgress(20, 1, 'Loading column settings...');
        await loadAdminColumnSettings(block, unit);
        
        // ✅ Step 2: Load marks from student_marks (SOURCE OF TRUTH)
        updateLoadingProgress(40, 2, 'Loading student marks...');
        const { data: marks, error } = await sb
            .from('student_marks')
            .select('*')
            .eq('block', block)
            .eq('subject_name', unit)
            .eq('academic_year', year);
        
        if (error) throw error;
        
        console.log(`📊 Found ${marks?.length || 0} enrolled students in student_marks`);
        
        // ✅ If no students enrolled, show empty state
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
        
        // ✅ Step 3: Get student names from profile (for display only)
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
        
        // ✅ Step 4: Build marks data - SHOW ALL STUDENTS (even with 0 scores)
        updateLoadingProgress(80, 4, 'Processing marks data...');
        
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
                assessmentType: m.assessment_type || me_currentAssessmentType || 'full',
                id: m.id || null,
                approval_status: m.approval_status || 'draft'
            };
        });
        
        console.log(`📊 Displaying ${fullMarks.length} enrolled students (including those with 0 marks)`);
        
        me_currentMarks = fullMarks;
        
        // Step 5: Render
        updateLoadingProgress(95, 4, 'Rendering marks table...');
        renderMarksEntryTable(fullMarks, unit, me_currentAssessmentType);
        updateMarksEntryStats(fullMarks, me_currentAssessmentType);
        checkMarksApprovalStatus(fullMarks);
        
        updateAssessmentTypeDisplay(me_currentAssessmentType);
        const visibleColumns = getVisibleColumns();
        updateVisibleColumnsInfo(visibleColumns);
        
        // Complete
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
                <button onclick="withdrawMarksFromApproval()" style="background: #d97706; padding: 8px 16px; border: none; border-radius: 6px; color: white; cursor: pointer; font-weight: 600;">
                    <i class="fas fa-undo"></i> Withdraw
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
            <button onclick="withdrawMarksFromApproval()" style="background: #d97706; padding: 10px 24px; border: none; border-radius: 8px; color: white; cursor: pointer; font-weight: 600; font-size: 14px;">
                <i class="fas fa-undo"></i> ⏪ Withdraw
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

function getMarksEntryGrade(score) {
    if (score >= 75) return { grade: 'A', rating: 'Distinction', points: 4.0, color: '#065f46' };
    else if (score >= 65) return { grade: 'B', rating: 'Credit', points: 3.0, color: '#1e40af' };
    else if (score >= 60) return { grade: 'C', rating: 'Pass', points: 2.0, color: '#92400e' };
    else return { grade: 'D', rating: 'Fail', points: 0.0, color: '#991b1b' };
}

// ============================================================
// UPDATE MARKS ENTRY STATS - SHOW ALL ENROLLED STUDENTS
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
    
    // ✅ At risk: students with total < 60 (only those with scores)
    const atRisk = marks.filter(m => {
        const total = calculateMarksEntryTotal(m.cat1, m.cat2, m.exam, assessmentType);
        return total > 0 && total < 60;
    });
    
    const totalEl = document.getElementById('me_total_students');
    const subjectsEl = document.getElementById('me_total_subjects');
    const passEl = document.getElementById('me_pass_rate');
    const avgEl = document.getElementById('me_class_avg');
    const atRiskEl = document.getElementById('me_at_risk');
    
    if (totalEl) totalEl.textContent = totalEnrolled;
    if (subjectsEl) subjectsEl.textContent = marks.length > 0 ? 1 : 0;
    if (passEl) passEl.textContent = totalEnrolled > 0 ? Math.round((passing.length / totalEnrolled) * 100) + '%' : '0%';
    if (avgEl) avgEl.textContent = Math.round(avg) + '%';
    if (atRiskEl) atRiskEl.textContent = atRisk.length;
}
// ============================================================
// SAVE MARKS ENTRY - WITH AUTO PROMPT FOR SUBMISSION
// ============================================================

async function saveMarksEntry() {
    const program = me_currentProgram;
    const block = me_currentBlock;
    const unit = me_currentUnit;
    const year = me_currentYear;
    const assessmentType = me_currentAssessmentType || 'full';
    
    // Validate required fields
    if (!block || !unit) {
        showNotification('❌ Please select a block and unit first', 'error');
        return;
    }
    
    // Verify lecturer is assigned to this unit
    const isAssigned = me_assignedUnits.some(u => 
        u.subject_name === unit || u.subject_code === unit
    );
    
    if (!isAssigned) {
        showNotification('⛔ You are not assigned to this unit!', 'error');
        return;
    }
    
    // Collect marks from table
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
    
    // Count how many students have scores
    const studentsWithScores = marksData.filter(m => m.cat1 > 0 || m.cat2 > 0 || m.exam > 0);
    const studentsWithoutScores = marksData.filter(m => m.cat1 === 0 && m.cat2 === 0 && m.exam === 0);
    
    // Check if any marks are approved (to show warning)
    let hasApprovedMarks = false;
    const { data: checkExisting } = await sb
        .from('student_marks')
        .select('approval_status')
        .eq('block', block)
        .eq('subject_name', unit)
        .eq('academic_year', year)
        .in('admission_number', marksData.map(m => m.admission));
    
    if (checkExisting) {
        hasApprovedMarks = checkExisting.some(m => m.approval_status === 'approved');
    }
    
    // Confirm before saving
    let confirmMessage = `💾 Save marks for ${marksData.length} students in "${unit}"?`;
    if (studentsWithScores.length === 0) {
        confirmMessage = `⚠️ No scores entered yet. Save empty marks for ${marksData.length} students?`;
    }
    if (hasApprovedMarks) {
        confirmMessage += `\n\n⚠️ Some marks are APPROVED. Editing them will be logged.`;
    }
    
    if (!confirm(confirmMessage)) {
        return;
    }
    
    // ============================================================
    // SHOW LOADING SCREEN WITH PERCENTAGE
    // ============================================================
    showLoadingScreen(`Saving ${marksData.length} marks...`, '💾 Saving Marks');
    updateLoadingProgress(5, 1, 'Preparing data...');
    
    let saved = 0;
    let updated = 0;
    let errors = 0;
    let approvedEdited = 0;
    let resetToDraft = 0;
    const errorDetails = [];
    const approvedEdits = [];
    let processed = 0;
    const totalStudents = marksData.length;
    
    try {
        // Bulk fetch existing marks
        updateLoadingProgress(10, 1, 'Fetching existing marks...');
        
        const admissions = marksData.map(m => m.admission);
        const { data: existingMarks, error: fetchError } = await sb
            .from('student_marks')
            .select('id, admission_number, approval_status, cat1_score, cat2_score, exam_score, final_score')
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
            
            let newApprovalStatus = existing?.approval_status || 'draft';
            let isApprovedEdit = false;
            
            if (existing) {
                const oldCat1 = parseFloat(existing.cat1_score) || 0;
                const oldCat2 = parseFloat(existing.cat2_score) || 0;
                const oldExam = parseFloat(existing.exam_score) || 0;
                const oldTotal = parseFloat(existing.final_score) || 0;
                
                const hasChanges = (
                    Math.abs(oldCat1 - mark.cat1) > 0.01 ||
                    Math.abs(oldCat2 - mark.cat2) > 0.01 ||
                    Math.abs(oldExam - mark.exam) > 0.01
                );
                
                if (hasChanges && existing.approval_status === 'approved') {
                    newApprovalStatus = 'approved';
                    isApprovedEdit = true;
                    approvedEdited++;
                    
                    approvedEdits.push({
                        admission: mark.admission,
                        name: mark.name,
                        old_cat1: oldCat1,
                        old_cat2: oldCat2,
                        old_exam: oldExam,
                        old_total: oldTotal,
                        new_cat1: mark.cat1,
                        new_cat2: mark.cat2,
                        new_exam: mark.exam,
                        new_total: total
                    });
                    
                    console.log(`✏️ Approved mark edited: ${mark.admission}`);
                }
                
                if (hasChanges && !isApprovedEdit) {
                    if (existing.approval_status === 'pending' || existing.approval_status === 'rejected') {
                        newApprovalStatus = 'draft';
                        resetToDraft++;
                        console.log(`🔄 Reset ${mark.admission} to draft`);
                    } else if (existing.approval_status === 'draft') {
                        newApprovalStatus = 'draft';
                    }
                }
                
                updates.push({
                    id: existing.id,
                    data: {
                        student_name: mark.name || 'Unknown',
                        assessment_type: assessmentType,
                        cat1_score: mark.cat1 || null,
                        cat2_score: mark.cat2 || null,
                        exam_score: mark.exam || null,
                        final_score: total || null,
                        grade: gradeInfo.grade || null,
                        approval_status: newApprovalStatus,
                        updated_at: new Date().toISOString()
                    }
                });
                
            } else {
                inserts.push({
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
                    approval_status: 'draft',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                });
            }
        }
        
        // Execute bulk operations
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
                await Promise.all(promises);
                updated += batch.length;
                
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
        
        // Log approved edits
        if (approvedEdits.length > 0) {
            updateLoadingProgress(95, 4, 'Logging edits...');
            
            try {
                const { error: tableError } = await sb
                    .from('approved_edit_logs')
                    .select('id')
                    .limit(1);
                
                if (!tableError) {
                    const batchSize = 20;
                    for (let i = 0; i < approvedEdits.length; i += batchSize) {
                        const batch = approvedEdits.slice(i, i + batchSize);
                        const logs = batch.map(edit => ({
                            block: block,
                            unit: unit,
                            academic_year: year,
                            admission: edit.admission,
                            student_name: edit.name,
                            lecturer_id: me_currentLecturer?.profile?.id || null,
                            lecturer_name: me_currentLecturer?.profile?.full_name || 'Unknown',
                            old_cat1: edit.old_cat1,
                            old_cat2: edit.old_cat2,
                            old_exam: edit.old_exam,
                            old_total: edit.old_total,
                            new_cat1: edit.new_cat1,
                            new_cat2: edit.new_cat2,
                            new_exam: edit.new_exam,
                            new_total: edit.new_total,
                            edited_at: new Date().toISOString()
                        }));
                        
                        await sb
                            .from('approved_edit_logs')
                            .insert(logs);
                    }
                    console.log(`📝 Logged ${approvedEdits.length} approved mark edits`);
                }
            } catch (logError) {
                console.warn('⚠️ Could not log approved edits:', logError.message);
            }
        }
        
        // Complete
        updateLoadingProgress(100, 4, '✅ Complete!');
        await new Promise(resolve => setTimeout(resolve, 500));
        hideLoadingScreen();
        
        // ============================================================
        // SHOW RESULTS
        // ============================================================
        let message = '';
        let hasDraftMarks = false;
        
        if (saved > 0 && updated > 0 && errors === 0) {
            message = `✅ Saved ${saved} new and updated ${updated} marks successfully!`;
            showNotification(message, 'success');
        } else if (saved > 0 || updated > 0) {
            message = `✅ ${saved > 0 ? saved + ' new saved, ' : ''}${updated > 0 ? updated + ' updated' : ''}`;
            if (errors > 0) message += `, ${errors} errors`;
            if (approvedEdited > 0) message += `, ${approvedEdited} approved (edited)`;
            if (resetToDraft > 0) message += `, ${resetToDraft} reset to draft`;
            showNotification(message, (errors > 0) ? 'warning' : 'success');
        } else if (errors > 0) {
            message = `❌ Failed to save ${errors} marks. Check console for details.`;
            showNotification(message, 'error');
        }
        
        // Show warnings
        if (approvedEdited > 0) {
            showNotification(`✏️ ${approvedEdited} approved marks were edited. Admin has been notified.`, 'warning');
        }
        
        if (resetToDraft > 0) {
            showNotification(`🔄 ${resetToDraft} marks were reset to DRAFT due to changes. Re-submit for approval.`, 'warning');
        }
        
        // ============================================================
        // ⭐ ASK TO SUBMIT FOR APPROVAL ⭐
        // ============================================================
        
        // Check if there are any draft marks to submit
        if (saved > 0 || updated > 0) {
            // Check if there are draft marks
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
                
                // Only ask if there are students with scores
                if (studentsWithScoresCount > 0) {
                    const submitMessage = `📤 ${draftCount} marks are ready for approval.\n\nWould you like to submit them for admin approval now?`;
                    
                    if (confirm(submitMessage)) {
                        // ✅ User wants to submit
                        showLoadingScreen(`Submitting ${draftCount} marks...`, '📤 Submitting for Approval');
                        updateLoadingProgress(10, 1, 'Preparing submission...');
                        
                        try {
                            // Get IDs of draft/rejected marks
                            const { data: submitMarks } = await sb
                                .from('student_marks')
                                .select('id')
                                .eq('block', block)
                                .eq('subject_name', unit)
                                .eq('academic_year', year)
                                .in('approval_status', ['draft', 'rejected']);
                            
                            if (submitMarks && submitMarks.length > 0) {
                                const ids = submitMarks.map(m => m.id);
                                const batchSize = 50;
                                let submitted = 0;
                                let submitErrors = 0;
                                
                                for (let i = 0; i < ids.length; i += batchSize) {
                                    const batch = ids.slice(i, i + batchSize);
                                    const progress = 20 + (i / ids.length) * 70;
                                    updateLoadingProgress(progress, 2, `Submitting ${Math.min(i + batch.length, ids.length)}/${ids.length} marks...`);
                                    
                                    const { error: submitError } = await sb
                                        .from('student_marks')
                                        .update({
                                            approval_status: 'pending',
                                            submitted_at: new Date().toISOString(),
                                            submitted_by: me_currentLecturer?.profile?.id || null
                                        })
                                        .in('id', batch);
                                    
                                    if (submitError) {
                                        submitErrors += batch.length;
                                        console.error('Submit error:', submitError);
                                    } else {
                                        submitted += batch.length;
                                    }
                                }
                                
                                // Log the submission
                                if (submitted > 0) {
                                    updateLoadingProgress(95, 3, 'Logging submission...');
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
                                
                                if (submitErrors > 0 && submitted > 0) {
                                    showNotification(`⚠️ ${submitted} marks submitted, ${submitErrors} errors`, 'warning');
                                } else if (submitted > 0) {
                                    showNotification(`✅ ${submitted} marks submitted for approval!`, 'success');
                                } else {
                                    showNotification('❌ Failed to submit marks', 'error');
                                }
                            }
                        } catch (submitError) {
                            hideLoadingScreen();
                            showNotification('❌ Error submitting: ' + submitError.message, 'error');
                            console.error('Submit error:', submitError);
                        }
                    } else {
                        // User declined submission
                        showNotification('💾 Marks saved as DRAFT. Submit later using the "Submit" button.', 'info');
                    }
                }
            }
        }
        
        // Reload marks
        setTimeout(() => loadMarksEntry(), 500);
        
    } catch (error) {
        hideLoadingScreen();
        showNotification('❌ Error saving marks: ' + error.message, 'error');
        console.error('Save error:', error);
    }
}

// ============================================================
// SUBMIT MARKS FOR APPROVAL - WITH LOADING SCREEN
// ============================================================

async function submitMarksForApproval() {
    const block = me_currentBlock;
    const unit = me_currentUnit;
    const year = me_currentYear;
    
    if (!block || !unit) {
        showNotification('Please load marks first', 'warning');
        return;
    }
    
    // Show loading screen
    showLoadingScreen('Checking marks...', '📤 Submit for Approval');
    updateLoadingProgress(10, 1, 'Checking marks status...');
    
    try {
        // Get marks for this unit
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
        
        // Check if any marks have scores
        const hasScores = marks.some(m => m.final_score !== null && m.final_score > 0);
        if (!hasScores) {
            hideLoadingScreen();
            showNotification('⚠️ Please enter marks before submitting for approval', 'warning');
            return;
        }
        
        // Count marks by status
        const draftMarks = marks.filter(m => m.approval_status === 'draft' || m.approval_status === 'rejected');
        const pendingMarks = marks.filter(m => m.approval_status === 'pending');
        const approvedMarks = marks.filter(m => m.approval_status === 'approved');
        
        updateLoadingProgress(30, 2, `Found ${draftMarks.length} marks ready for submission...`);
        
        // Check if there are any draft/rejected marks to submit
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
        
        // Show summary before submission
        const summary = [
            `📊 ${draftMarks.length} marks ready for submission`,
            approvedMarks.length > 0 ? `✅ ${approvedMarks.length} already approved (will not be resubmitted)` : null,
            pendingMarks.length > 0 ? `⏳ ${pendingMarks.length} already pending` : null
        ].filter(Boolean).join('\n');
        
        hideLoadingScreen();
        
        if (!confirm(`📤 Submit for approval?\n\n${summary}\n\nContinue?`)) {
            return;
        }
        
        // Show loading for submission
        showLoadingScreen(`Submitting ${draftMarks.length} marks...`, '📤 Submitting for Approval');
        updateLoadingProgress(40, 2, 'Preparing submission...');
        
        // Get the IDs of marks to submit
        const markIds = draftMarks.map(m => m.id);
        
        // Update in batches
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
        
        // Log the submission
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
        
        // Complete
        updateLoadingProgress(100, 4, '✅ Complete!');
        await new Promise(resolve => setTimeout(resolve, 500));
        hideLoadingScreen();
        
        // Show results
        if (errors > 0 && submitted > 0) {
            showNotification(`⚠️ ${submitted} marks submitted, ${errors} errors`, 'warning');
        } else if (submitted > 0) {
            showNotification(`✅ ${submitted} marks submitted for approval!`, 'success');
        } else {
            showNotification('❌ Failed to submit marks', 'error');
        }
        
        // Refresh
        setTimeout(() => loadMarksEntry(), 500);
        
    } catch (error) {
        hideLoadingScreen();
        showNotification('❌ Error submitting for approval: ' + error.message, 'error');
        console.error('Submit error:', error);
    }
}

// ============================================================
// WITHDRAW MARKS FROM APPROVAL - WITH LOADING SCREEN
// ============================================================

async function withdrawMarksFromApproval() {
    const block = me_currentBlock;
    const unit = me_currentUnit;
    const year = me_currentYear;
    
    if (!block || !unit) {
        showNotification('Please load marks first', 'warning');
        return;
    }
    
    showLoadingScreen('Checking pending marks...', '⏪ Withdraw from Approval');
    updateLoadingProgress(20, 1, 'Checking pending marks...');
    
    try {
        // Get pending marks
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
        
        // Show list of students
        const studentList = pendingMarks.map(m => `  • ${m.student_name} (${m.admission_number})`).join('\n');
        
        if (!confirm(`⏪ Withdraw ${pendingMarks.length} pending marks from approval?\n\nStudents:\n${studentList}\n\nThey will go back to DRAFT status.`)) {
            return;
        }
        
        showLoadingScreen(`Withdrawing ${pendingMarks.length} marks...`, '⏪ Withdrawing');
        updateLoadingProgress(30, 2, 'Processing withdrawal...');
        
        // Withdraw in batches
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
        
        // Complete
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
// LECTURER MARKS CLASS
// ============================================================

const LecturerMarks = {
    students: [],
    marks: [],
    nckMarks: [],
    
    async init() {
        console.log('📊 Initializing Lecturer Marks...');
        showLoadingScreen('Starting lecturer marks module...', 'NCHSM Lecturer Portal');
        updateLoadingProgress(5, 1, 'Initializing...');
        
        try {
            await this.loadMarksManagement();
            this.setupEventListeners();
            await detectLecturerProgram();
            console.log('✅ Lecturer Marks initialized');
            hideLoadingScreen();
        } catch (error) {
            console.error('❌ Error initializing:', error);
            hideLoadingScreen();
            showNotification('Error initializing: ' + error.message, 'error');
        }
    },
    
    async loadMarksManagement() {
        const blockSelect = document.getElementById('lecBlockSelect');
        if (!blockSelect) return;
        
        await this.loadStudents();
        await this.loadUnits();
        await this.loadInternalMarks();
        await this.loadNCKMarks();
        this.updateStats();
    },
    
    async loadStudents() {
        try {
            const profile = me_currentLecturer?.profile;
            const program = profile?.program || profile?.department;
            
            if (!program) {
                console.warn('No program found');
                return;
            }
            
            const { data, error } = await sb
                .from('consolidated_user_profiles_table')
                .select('*')
                .eq('role', 'student')
                .eq('program', program)
                .order('full_name', { ascending: true });
            
            if (error) throw error;
            
            this.students = data || [];
            const totalEl = document.getElementById('lecTotalStudents');
            if (totalEl) totalEl.textContent = this.students.length;
            
        } catch (error) {
            console.error('Failed to load students:', error);
        }
    },
    
    async loadUnits() {
        const block = document.getElementById('lecBlockSelect')?.value;
        const unitSelect = document.getElementById('lecSubjectSelect');
        if (!unitSelect) return;
        
        if (!block) {
            unitSelect.innerHTML = '<option value="">-- Select Block First --</option>';
            return;
        }
        
        try {
            const { data, error } = await sb
                .from('units_catalog')
                .select('*')
                .eq('block', block)
                .eq('status', 'active')
                .order('unit_name', { ascending: true });
            
            if (error) throw error;
            
            if (!data || !data.length) {
                unitSelect.innerHTML = '<option value="">No units found</option>';
                return;
            }
            
            const lecturerId = me_currentLecturer?.staff?.id || me_currentLecturer?.profile?.id;
            let assignedUnitNames = [];
            
            if (lecturerId) {
                const { data: assignments, error: assignError } = await sb
                    .from('lecturer_subject_assignments')
                    .select('subject_name')
                    .eq('lecturer_id', String(lecturerId))
                    .eq('block', block);
                
                if (!assignError && assignments) {
                    assignedUnitNames = assignments.map(a => a.subject_name);
                }
            }
            
            if (me_currentLecturer?.staff?.assigned_units) {
                const staffUnits = me_currentLecturer.staff.assigned_units || [];
                if (Array.isArray(staffUnits)) {
                    staffUnits.forEach(u => {
                        if (!assignedUnitNames.includes(u)) {
                            assignedUnitNames.push(u);
                        }
                    });
                }
            }
            
            let filteredUnits = data;
            if (assignedUnitNames.length > 0) {
                filteredUnits = data.filter(u => 
                    assignedUnitNames.includes(u.unit_name) ||
                    assignedUnitNames.includes(u.unit_code)
                );
                console.log(`📊 Showing ${filteredUnits.length} assigned units out of ${data.length} total`);
            }
            
            unitSelect.innerHTML = '<option value="">-- Select Unit --</option>';
            filteredUnits.forEach(u => {
                const option = document.createElement('option');
                option.value = u.unit_name;
                option.dataset.assessment = u.assessment_type || 'full';
                option.dataset.code = u.unit_code || '';
                const isAssigned = assignedUnitNames.includes(u.unit_name) || 
                                  assignedUnitNames.includes(u.unit_code);
                option.textContent = `${u.unit_code || ''} - ${u.unit_name}${isAssigned ? ' 📌' : ''}`;
                unitSelect.appendChild(option);
            });
            
            if (filteredUnits.length === 0) {
                unitSelect.innerHTML = '<option value="">-- No units assigned to you --</option>';
                showNotification('📚 No units assigned to you in this block', 'warning');
            }
            
            const countEl = document.getElementById('lecturerUnitCount');
            if (countEl) countEl.textContent = filteredUnits.length;
            
        } catch (error) {
            console.error('Error loading units:', error);
            unitSelect.innerHTML = '<option value="">Error loading units</option>';
        }
    },
    
    async loadInternalMarks() {
        const block = document.getElementById('lecBlockSelect')?.value;
        const unit = document.getElementById('lecSubjectSelect')?.value;
        const container = document.getElementById('lecInternalContainer');
        if (!container) return;
        
        if (!block || !unit) {
            container.innerHTML = '<div class="text-center" style="padding:40px;">Select a block and unit</div>';
            return;
        }
        
        container.innerHTML = '<div class="text-center" style="padding:40px;"><div class="loading-spinner"></div><p>Loading marks...</p></div>';
        
        try {
            await this.loadAdminColumnSettings(block, unit);
            
            const students = this.students.filter(s => s.block === block);
            
            if (!students.length) {
                container.innerHTML = '<div class="text-center" style="padding:40px;">No students found in this block</div>';
                return;
            }
            
            const { data: existing, error } = await sb
                .from('student_marks')
                .select('*')
                .eq('block', block)
                .eq('subject_name', unit);
            
            if (error) throw error;
            
            const marksMap = {};
            existing?.forEach(m => { marksMap[m.admission_number] = m; });
            
            const assessmentType = me_currentAssessmentType || 'full';
            const visibleColumns = this.getVisibleColumns();
            
            let html = `<div class="table-responsive"><table class="data-table" style="width:100%;border-collapse:collapse;">
                <thead><tr style="background:#4C1D95;color:white;">
                    <th style="padding:10px;" ${visibleColumns.sno === false ? 'style="display:none;"' : ''}>#</th>
                    <th style="padding:10px;" ${visibleColumns.admission === false ? 'style="display:none;"' : ''}>Admission</th>
                    <th style="padding:10px;" ${visibleColumns.name === false ? 'style="display:none;"' : ''}>Student Name</th>
                    ${visibleColumns.cat1 !== false ? '<th style="padding:10px;">CAT1 (0-30)</th>' : ''}
                    ${visibleColumns.cat2 !== false ? '<th style="padding:10px;">CAT2 (0-30)</th>' : ''}
                    ${visibleColumns.exam !== false ? '<th style="padding:10px;">Exam (0-70)</th>' : ''}
                    ${visibleColumns.total !== false ? '<th style="padding:10px;">Total</th>' : ''}
                    ${visibleColumns.grade !== false ? '<th style="padding:10px;">Grade</th>' : ''}
                    ${visibleColumns.rating !== false ? '<th style="padding:10px;">Status</th>' : ''}
                    ${visibleColumns.approval !== false ? '<th style="padding:10px;">Approval</th>' : ''}
                </tr></thead><tbody>`;
            
            for (let i = 0; i < students.length; i++) {
                const s = students[i];
                const m = marksMap[s.student_id] || {};
                const cat1 = m.cat1_score !== undefined && m.cat1_score !== null ? m.cat1_score : '';
                const cat2 = m.cat2_score !== undefined && m.cat2_score !== null ? m.cat2_score : '';
                const exam = m.exam_score !== undefined && m.exam_score !== null ? m.exam_score : '';
                const approvalStatus = m.approval_status || 'draft';
                
                let total = 0, grade = '-', status = 'PENDING', color = '#f59e0b';
                if (cat1 !== '' || cat2 !== '' || exam !== '') {
                    const ncat1 = Math.min(parseFloat(cat1) || 0, 30);
                    const ncat2 = Math.min(parseFloat(cat2) || 0, 30);
                    const nexam = Math.min(parseFloat(exam) || 0, 70);
                    
                    if (assessmentType === 'full') {
                        total = Math.round((((ncat1 + ncat2) / 60 * 30) + nexam) * 10) / 10;
                    } else if (assessmentType === 'single_cat') {
                        total = Math.round((ncat1 + nexam) * 10) / 10;
                    } else {
                        total = Math.round((((ncat1 + ncat2) / 60 * 30) + nexam) * 10) / 10;
                    }
                    
                    const gradeInfo = getMarksEntryGrade(total);
                    grade = gradeInfo.grade;
                    status = total >= 60 ? 'PASS' : (total > 0 ? 'FAIL' : 'PENDING');
                    color = status === 'PASS' ? '#10b981' : (status === 'FAIL' ? '#ef4444' : '#f59e0b');
                }
                
                const approvalBadge = {
                    'pending': '<span style="background:#fef3c7;color:#92400e;padding:2px 10px;border-radius:12px;font-size:11px;">⏳ Pending</span>',
                    'approved': '<span style="background:#d1fae5;color:#065f46;padding:2px 10px;border-radius:12px;font-size:11px;">✅ Approved</span>',
                    'rejected': '<span style="background:#fee2e2;color:#991b1b;padding:2px 10px;border-radius:12px;font-size:11px;">❌ Rejected</span>',
                    'draft': '<span style="background:#e5e7eb;color:#6b7280;padding:2px 10px;border-radius:12px;font-size:11px;">📝 Draft</span>'
                }[approvalStatus] || '<span style="background:#e5e7eb;color:#6b7280;padding:2px 10px;border-radius:12px;font-size:11px;">📝 Draft</span>';
                
                html += `<tr>
                    <td ${visibleColumns.sno === false ? 'style="display:none;"' : ''}>${i + 1}</td>
                    <td ${visibleColumns.admission === false ? 'style="display:none;"' : ''}>${s.student_id || 'N/A'}</td>
                    <td ${visibleColumns.name === false ? 'style="display:none;"' : ''}><strong>${s.full_name || 'N/A'}</strong></td>
                    ${visibleColumns.cat1 !== false ? `<td><input type="number" class="internal-cat1" data-student="${s.student_id}" value="${cat1}" min="0" max="30" step="0.5" style="width:65px;padding:5px;border-radius:4px;border:1px solid #e2e8f0;"></td>` : ''}
                    ${visibleColumns.cat2 !== false ? `<td><input type="number" class="internal-cat2" data-student="${s.student_id}" value="${cat2}" min="0" max="30" step="0.5" style="width:65px;padding:5px;border-radius:4px;border:1px solid #e2e8f0;"></td>` : ''}
                    ${visibleColumns.exam !== false ? `<td><input type="number" class="internal-exam" data-student="${s.student_id}" value="${exam}" min="0" max="70" step="0.5" style="width:65px;padding:5px;border-radius:4px;border:1px solid #e2e8f0;"></td>` : ''}
                    ${visibleColumns.total !== false ? `<td id="lecTotal_${s.student_id}" style="font-weight:bold;color:${color};">${total || '-'}</td>` : ''}
                    ${visibleColumns.grade !== false ? `<td id="lecGrade_${s.student_id}" style="font-weight:bold;color:${color};">${grade}</td>` : ''}
                    ${visibleColumns.rating !== false ? `<td id="lecStatus_${s.student_id}" style="color:${color};">${status}</td>` : ''}
                    ${visibleColumns.approval !== false ? `<td>${approvalBadge}</td>` : ''}
                </tr>`;
            }
            
            html += `</tbody></table></div>
                <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-top:20px;">
                    <div style="display:flex;gap:10px;flex-wrap:wrap;">
                        <button class="btn btn-action" id="saveInternalMarksBtn" style="background:#059669;padding:8px 20px;border:none;border-radius:6px;color:white;cursor:pointer;font-weight:600;">
                            <i class="fas fa-save"></i> Save All Marks
                        </button>
                        <button class="btn btn-action" id="fillDownInternalBtn" style="background:#3b82f6;padding:8px 20px;border:none;border-radius:6px;color:white;cursor:pointer;font-weight:600;">
                            <i class="fas fa-arrow-down"></i> Fill Down
                        </button>
                        <button class="btn btn-action" id="submitForApprovalBtn" style="background:#4C1D95;padding:8px 20px;border:none;border-radius:6px;color:white;cursor:pointer;font-weight:600;">
                            <i class="fas fa-paper-plane"></i> Submit for Approval
                        </button>
                    </div>
                    <div style="font-size:13px;color:#64748b;">
                        <i class="fas fa-info-circle"></i> Total: ${students.length} students
                        <span style="margin-left:12px;background:#f3f4f6;padding:2px 12px;border-radius:12px;font-size:11px;">
                            📋 ${assessmentType.replace('_', ' ').toUpperCase()}
                        </span>
                    </div>
                </div>`;
            
            container.innerHTML = html;
            
            this.updateAssessmentTypeDisplay(assessmentType);
            this.updateVisibleColumnsInfo(visibleColumns);
            
            document.querySelectorAll('.internal-cat1, .internal-cat2, .internal-exam').forEach(input => {
                input.addEventListener('change', function() {
                    const studentId = this.dataset.student;
                    LecturerMarks.updateInternalTotal(studentId);
                });
                input.addEventListener('input', function() {
                    const studentId = this.dataset.student;
                    LecturerMarks.updateInternalTotal(studentId);
                });
            });
            
            document.getElementById('saveInternalMarksBtn')?.addEventListener('click', () => this.saveInternalMarks());
            document.getElementById('fillDownInternalBtn')?.addEventListener('click', () => this.fillDownInternal());
            document.getElementById('submitForApprovalBtn')?.addEventListener('click', () => submitMarksForApproval());
            
        } catch (error) {
            console.error('Error loading marks:', error);
            container.innerHTML = `<div class="alert alert-danger" style="padding:20px;background:#fee2e2;border-radius:8px;color:#991b1b;">Error: ${error.message}</div>`;
        }
    },
    
    async loadAdminColumnSettings(block, unit) {
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
                const visibleColumns = this.getVisibleColumns();
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
    },
    
    getVisibleColumns() {
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
    },
    
    updateAssessmentTypeDisplay(type) {
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
    },
    
    updateVisibleColumnsInfo(visibleColumns) {
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
    },
    
    updateInternalTotal(studentId) {
        const cat1 = parseFloat(document.querySelector(`.internal-cat1[data-student="${studentId}"]`)?.value) || 0;
        const cat2 = parseFloat(document.querySelector(`.internal-cat2[data-student="${studentId}"]`)?.value) || 0;
        const exam = parseFloat(document.querySelector(`.internal-exam[data-student="${studentId}"]`)?.value) || 0;
        
        const assessmentType = me_currentAssessmentType || 'full';
        
        let total = 0;
        if (assessmentType === 'full') {
            total = Math.round(((Math.min(cat1,30) + Math.min(cat2,30)) / 60 * 30 + Math.min(exam,70)) * 10) / 10;
        } else if (assessmentType === 'single_cat') {
            total = Math.round((Math.min(cat1,30) + Math.min(exam,70)) * 10) / 10;
        } else {
            total = Math.round(((Math.min(cat1,30) + Math.min(cat2,30)) / 60 * 30 + Math.min(exam,70)) * 10) / 10;
        }
        
        const gradeInfo = getMarksEntryGrade(total);
        const status = total >= 60 ? 'PASS' : (total > 0 ? 'FAIL' : 'PENDING');
        const color = status === 'PASS' ? '#10b981' : (status === 'FAIL' ? '#ef4444' : '#f59e0b');
        
        const totalSpan = document.getElementById(`lecTotal_${studentId}`);
        const gradeSpan = document.getElementById(`lecGrade_${studentId}`);
        const statusSpan = document.getElementById(`lecStatus_${studentId}`);
        
        if (totalSpan) { totalSpan.innerHTML = total || '-'; totalSpan.style.color = color; }
        if (gradeSpan) { gradeSpan.innerHTML = total > 0 ? gradeInfo.grade : '-'; gradeSpan.style.color = color; }
        if (statusSpan) { statusSpan.innerHTML = status; statusSpan.style.color = color; }
    },
    
    fillDownInternal() {
        const cat1s = document.querySelectorAll('.internal-cat1');
        if (!cat1s.length) return;
        
        const v1 = cat1s[0].value;
        const v2 = document.querySelector('.internal-cat2')?.value || '';
        const v3 = document.querySelector('.internal-exam')?.value || '';
        
        cat1s.forEach((input, i) => {
            if (i === 0) return;
            const sId = input.dataset.student;
            const cat1Input = document.querySelector(`.internal-cat1[data-student="${sId}"]`);
            const cat2Input = document.querySelector(`.internal-cat2[data-student="${sId}"]`);
            const examInput = document.querySelector(`.internal-exam[data-student="${sId}"]`);
            
            if (cat1Input) cat1Input.value = v1;
            if (cat2Input) cat2Input.value = v2;
            if (examInput) examInput.value = v3;
            this.updateInternalTotal(sId);
        });
        
        showNotification('Values filled down!', 'success');
    },
    
    async saveInternalMarks() {
        const block = document.getElementById('lecBlockSelect').value;
        const unit = document.getElementById('lecSubjectSelect').value;
        const year = document.getElementById('me_year_select')?.value || '2025';
        
        if (!block || !unit) {
            showNotification('Select block and unit', 'error');
            return;
        }
        
        const inputs = document.querySelectorAll('.internal-cat1');
        if (!inputs.length) {
            showNotification('No data to save', 'error');
            return;
        }
        
        showLoading('Saving marks...');
        let saved = 0;
        let errors = 0;
        
        for (const input of inputs) {
            const sId = input.dataset.student;
            const cat1 = parseFloat(document.querySelector(`.internal-cat1[data-student="${sId}"]`)?.value) || 0;
            const cat2 = parseFloat(document.querySelector(`.internal-cat2[data-student="${sId}"]`)?.value) || 0;
            const exam = parseFloat(document.querySelector(`.internal-exam[data-student="${sId}"]`)?.value) || 0;
            
            const student = this.students.find(s => s.student_id === sId);
            const studentName = student?.full_name || 'Unknown Student';
            
            const assessmentType = me_currentAssessmentType || 'full';
            let finalTotal = 0;
            if (assessmentType === 'full') {
                finalTotal = Math.round(((Math.min(cat1,30) + Math.min(cat2,30)) / 60 * 30 + Math.min(exam,70)) * 10) / 10;
            } else if (assessmentType === 'single_cat') {
                finalTotal = Math.round((Math.min(cat1,30) + Math.min(exam,70)) * 10) / 10;
            } else {
                finalTotal = Math.round(((Math.min(cat1,30) + Math.min(cat2,30)) / 60 * 30 + Math.min(exam,70)) * 10) / 10;
            }
            
            const gradeInfo = getMarksEntryGrade(finalTotal);
            
            const { data: existing } = await sb
                .from('student_marks')
                .select('id')
                .eq('admission_number', sId)
                .eq('subject_name', unit)
                .eq('block', block)
                .eq('academic_year', year)
                .maybeSingle();
            
            try {
                const markData = {
                    admission_number: sId,
                    student_name: studentName,
                    block: block,
                    subject_name: unit,
                    assessment_type: assessmentType,
                    cat1_score: cat1 || null,
                    cat2_score: cat2 || null,
                    exam_score: exam || null,
                    final_score: finalTotal || null,
                    grade: gradeInfo.grade || null,
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
                    console.error('Error saving for', sId, ':', result.error);
                } else {
                    saved++;
                }
            } catch (err) {
                errors++;
                console.error('Error saving for', sId, ':', err);
            }
        }
        
        hideLoading();
        showNotification(`✅ Saved ${saved} marks${errors > 0 ? `, ${errors} errors` : ''}`, errors > 0 ? 'warning' : 'success');
        await this.loadInternalMarks();
    },
    
    async loadNCKMarks() {
        const block = document.getElementById('lecNckBlock')?.value;
        const sheet = document.getElementById('lecNckSheet')?.value;
        const container = document.getElementById('lecNckContainer');
        if (!container) return;
        
        if (!block) {
            container.innerHTML = '<div class="text-center" style="padding:40px;">Select a block</div>';
            return;
        }
        
        container.innerHTML = '<div class="text-center" style="padding:40px;"><div class="loading-spinner"></div><p>Loading NCK marks...</p></div>';
        
        try {
            const students = this.students.filter(s => s.block === block);
            
            if (!students.length) {
                container.innerHTML = '<div class="text-center" style="padding:40px;">No students found</div>';
                return;
            }
            
            const { data: existing, error } = await sb
                .from('nck_marks')
                .select('*')
                .eq('block', block)
                .eq('subject_name', sheet || 'XY FORMS');
            
            if (error) throw error;
            
            const marksMap = {};
            existing?.forEach(m => { marksMap[m.admission_number] = m; });
            
            let html = `<div class="table-responsive"><table class="data-table" style="width:100%;border-collapse:collapse;">
                <thead><tr style="background:#4C1D95;color:white;">
                    <th style="padding:10px;">#</th>
                    <th style="padding:10px;">Student Name</th>
                    <th style="padding:10px;">Admission</th>
                    <th style="padding:10px;">Score (%)</th>
                    <th style="padding:10px;">Grade</th>
                    <th style="padding:10px;">Status</th>
                    <th style="padding:10px;">Graded By</th>
                    <th style="padding:10px;">Actions</th>
                </tr></thead><tbody>`;
            
            for (let i = 0; i < students.length; i++) {
                const s = students[i];
                const m = marksMap[s.student_id] || {};
                const score = m.final_score !== undefined && m.final_score !== null ? m.final_score : '';
                const gradeInfo = score !== '' ? getMarksEntryGrade(parseFloat(score)) : { grade: '-', color: '#94a3b8' };
                const status = score !== '' ? (parseFloat(score) >= 60 ? 'PASS' : (parseFloat(score) > 0 ? 'FAIL' : 'PENDING')) : 'PENDING';
                const color = status === 'PASS' ? '#10b981' : (status === 'FAIL' ? '#ef4444' : '#f59e0b');
                
                html += `<tr>
                    <td>${i + 1}</td>
                    <td><strong>${s.full_name || 'N/A'}</strong></td>
                    <td>${s.student_id || 'N/A'}</td>
                    <td><input type="number" class="nck-score" data-index="${i}" value="${score}" min="0" max="100" step="0.5" style="width:70px;padding:5px;border-radius:4px;border:1px solid #e2e8f0;"></td>
                    <td id="nckGrade_${i}" style="font-weight:bold;color:${color};">${gradeInfo.grade}</td>
                    <td id="nckStatus_${i}" style="color:${color};">${status}</td>
                    <td><input type="text" class="nck-graded" data-index="${i}" value="${m.graded_by || ''}" placeholder="Lecturer" style="width:120px;padding:5px;border-radius:4px;border:1px solid #e2e8f0;"></td>
                    <td><button class="btn btn-action save-nck" data-index="${i}" data-student="${s.student_id}" style="background:#059669;padding:4px 12px;border:none;border-radius:4px;color:white;cursor:pointer;font-size:12px;"><i class="fas fa-save"></i> Save</button></td>
                </tr>`;
            }
            
            html += `</tbody></table></div>
                <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-top:20px;">
                    <div style="display:flex;gap:10px;flex-wrap:wrap;">
                        <button class="btn btn-action" id="saveAllNckMarksBtn" style="background:#059669;padding:8px 20px;border:none;border-radius:6px;color:white;cursor:pointer;font-weight:600;">
                            <i class="fas fa-save"></i> Save All NCK Marks
                        </button>
                        <button class="btn btn-action" id="fillDownNckBtn" style="background:#3b82f6;padding:8px 20px;border:none;border-radius:6px;color:white;cursor:pointer;font-weight:600;">
                            <i class="fas fa-arrow-down"></i> Fill Down
                        </button>
                    </div>
                </div>`;
            
            container.innerHTML = html;
            
            document.querySelectorAll('.nck-score').forEach(input => {
                input.addEventListener('change', function() {
                    const idx = parseInt(this.dataset.index);
                    LecturerMarks.updateNCKTotal(idx);
                });
                input.addEventListener('input', function() {
                    const idx = parseInt(this.dataset.index);
                    LecturerMarks.updateNCKTotal(idx);
                });
            });
            
            document.querySelectorAll('.save-nck').forEach(btn => {
                btn.addEventListener('click', function() {
                    const idx = parseInt(this.dataset.index);
                    const studentId = this.dataset.student;
                    LecturerMarks.saveSingleNCK(idx, studentId);
                });
            });
            
            document.getElementById('saveAllNckMarksBtn')?.addEventListener('click', () => this.saveAllNCK());
            document.getElementById('fillDownNckBtn')?.addEventListener('click', () => this.fillDownNCK());
            
        } catch (error) {
            container.innerHTML = `<div class="alert alert-danger" style="padding:20px;background:#fee2e2;border-radius:8px;color:#991b1b;">Error: ${error.message}</div>`;
        }
    },
    
    updateNCKTotal(idx) {
        const score = parseFloat(document.querySelector(`.nck-score[data-index="${idx}"]`)?.value) || 0;
        const gradeInfo = getMarksEntryGrade(score);
        const status = score >= 60 ? 'PASS' : (score > 0 ? 'FAIL' : 'PENDING');
        const color = status === 'PASS' ? '#10b981' : (status === 'FAIL' ? '#ef4444' : '#f59e0b');
        
        const gradeEl = document.getElementById(`nckGrade_${idx}`);
        const statusEl = document.getElementById(`nckStatus_${idx}`);
        
        if (gradeEl) { gradeEl.innerHTML = score > 0 ? gradeInfo.grade : '-'; gradeEl.style.color = color; }
        if (statusEl) { statusEl.innerHTML = status; statusEl.style.color = color; }
    },
    
    fillDownNCK() {
        const inputs = document.querySelectorAll('.nck-score');
        if (!inputs.length) return;
        
        const val = inputs[0].value;
        inputs.forEach((input, i) => {
            if (i > 0) {
                input.value = val;
                this.updateNCKTotal(i);
            }
        });
        showNotification('Values filled down!', 'success');
    },
    
    async saveSingleNCK(idx, studentId) {
        const block = document.getElementById('lecNckBlock').value;
        const sheet = document.getElementById('lecNckSheet').value;
        const score = parseFloat(document.querySelector(`.nck-score[data-index="${idx}"]`)?.value) || 0;
        const gradedBy = document.querySelector(`.nck-graded[data-index="${idx}"]`)?.value;
        const student = this.students.find(s => s.student_id === studentId);
        
        const gradeInfo = getMarksEntryGrade(score);
        
        try {
            const { data: existing } = await sb
                .from('nck_marks')
                .select('id')
                .eq('admission_number', studentId)
                .eq('subject_name', sheet)
                .eq('block', block)
                .maybeSingle();
            
            const markData = {
                admission_number: studentId,
                student_name: student?.full_name || '',
                block: block,
                subject_name: sheet || 'XY FORMS',
                final_score: score || null,
                grade: gradeInfo.grade || null,
                status: score >= 60 ? 'passed' : (score > 0 ? 'failed' : 'pending'),
                graded_by: gradedBy || me_currentLecturer?.profile?.full_name || 'Lecturer',
                updated_at: new Date().toISOString()
            };
            
            let result;
            if (existing) {
                result = await sb
                    .from('nck_marks')
                    .update(markData)
                    .eq('id', existing.id);
            } else {
                markData.created_at = new Date().toISOString();
                result = await sb
                    .from('nck_marks')
                    .insert([markData]);
            }
            
            if (result.error) throw new Error(result.error.message);
            
            showNotification('✅ Saved!', 'success');
            await this.loadNCKMarks();
            
        } catch (error) {
            showNotification('Error: ' + error.message, 'error');
        }
    },
    
    async saveAllNCK() {
        const inputs = document.querySelectorAll('.nck-score');
        if (!inputs.length) {
            showNotification('No data to save', 'error');
            return;
        }
        
        showLoading('Saving all NCK marks...');
        let saved = 0;
        let errors = 0;
        
        for (let i = 0; i < inputs.length; i++) {
            const student = this.students[i];
            if (!student) continue;
            
            const score = parseFloat(document.querySelector(`.nck-score[data-index="${i}"]`)?.value) || 0;
            const gradedBy = document.querySelector(`.nck-graded[data-index="${i}"]`)?.value;
            const gradeInfo = getMarksEntryGrade(score);
            
            try {
                const { data: existing } = await sb
                    .from('nck_marks')
                    .select('id')
                    .eq('admission_number', student.student_id)
                    .eq('subject_name', document.getElementById('lecNckSheet').value)
                    .eq('block', document.getElementById('lecNckBlock').value)
                    .maybeSingle();
                
                const markData = {
                    admission_number: student.student_id,
                    student_name: student.full_name,
                    block: document.getElementById('lecNckBlock').value,
                    subject_name: document.getElementById('lecNckSheet').value,
                    final_score: score || null,
                    grade: gradeInfo.grade || null,
                    status: score >= 60 ? 'passed' : (score > 0 ? 'failed' : 'pending'),
                    graded_by: gradedBy || me_currentLecturer?.profile?.full_name || 'Lecturer',
                    updated_at: new Date().toISOString()
                };
                
                let result;
                if (existing) {
                    result = await sb
                        .from('nck_marks')
                        .update(markData)
                        .eq('id', existing.id);
                } else {
                    markData.created_at = new Date().toISOString();
                    result = await sb
                        .from('nck_marks')
                        .insert([markData]);
                }
                
                if (result.error) {
                    errors++;
                    console.error('Error saving NCK for', student.student_id, ':', result.error);
                } else {
                    saved++;
                }
            } catch (err) {
                errors++;
                console.error('Error saving NCK for', student.student_id, ':', err);
            }
        }
        
        hideLoading();
        showNotification(`✅ Saved ${saved} NCK records${errors > 0 ? `, ${errors} errors` : ''}`, errors > 0 ? 'warning' : 'success');
        await this.loadNCKMarks();
    },
    
    updateStats() {
        const totalMarks = this.marks.length || 0;
        const totalNck = this.nckMarks.length || 0;
        const avgScore = this.calculateAverageScore();
        
        const totalInternal = document.getElementById('lecTotalInternal');
        const totalNckEl = document.getElementById('lecTotalNck');
        const avgEl = document.getElementById('lecAvgScore');
        
        if (totalInternal) totalInternal.textContent = totalMarks;
        if (totalNckEl) totalNckEl.textContent = totalNck;
        if (avgEl) avgEl.textContent = avgScore + '%';
    },
    
    calculateAverageScore() {
        const allScores = [];
        document.querySelectorAll('.internal-exam').forEach(input => {
            const val = parseFloat(input.value);
            if (!isNaN(val) && val > 0) allScores.push(val);
        });
        
        if (!allScores.length) return 0;
        const avg = allScores.reduce((a, b) => a + b, 0) / allScores.length;
        return Math.round(avg);
    },
    
    setupEventListeners() {
        document.getElementById('lecBlockSelect')?.addEventListener('change', () => {
            this.loadUnits();
            this.loadInternalMarks();
        });
        
        document.getElementById('lecSubjectSelect')?.addEventListener('change', () => {
            this.loadInternalMarks();
        });
        
        document.getElementById('lecNckBlock')?.addEventListener('change', () => {
            this.loadNCKMarks();
        });
        
        document.getElementById('lecNckSheet')?.addEventListener('change', () => {
            this.loadNCKMarks();
        });
        
        document.getElementById('lecTabInternal')?.addEventListener('click', () => {
            switchLecturerMarksTab('internal');
        });
        
        document.getElementById('lecTabNck')?.addEventListener('click', () => {
            switchLecturerMarksTab('nck');
        });
        
        document.getElementById('lecTabAnalytics')?.addEventListener('click', () => {
            switchLecturerMarksTab('analytics');
        });
    },
    
    async refresh() {
        await this.loadMarksManagement();
        showNotification('Marks refreshed!', 'success');
    }
};

// ============================================================
// SWITCH LECTURER MARKS TAB
// ============================================================

function switchLecturerMarksTab(tab) {
    document.querySelectorAll('.marks-tab').forEach(el => {
        el.style.display = 'none';
    });
    
    document.querySelectorAll('.tabs-nav .tab-btn').forEach(el => {
        el.classList.remove('active');
    });
    
    if (tab === 'internal') {
        document.getElementById('lecInternalTab').style.display = 'block';
        document.getElementById('lecTabInternal').classList.add('active');
        LecturerMarks.loadInternalMarks();
    } else if (tab === 'nck') {
        document.getElementById('lecNckTab').style.display = 'block';
        document.getElementById('lecTabNck').classList.add('active');
        LecturerMarks.loadNCKMarks();
    } else if (tab === 'analytics') {
        document.getElementById('lecAnalyticsTab').style.display = 'block';
        document.getElementById('lecTabAnalytics').classList.add('active');
        LecturerMarks.updateStats();
    }
}

// ============================================================
// GLOBAL EXPOSURE
// ============================================================

window.LecturerMarks = LecturerMarks;
window.detectLecturerProgram = detectLecturerProgram;
window.loadLecturerByEmail = loadLecturerByEmail;
window.getLecturerAssignedUnits = getLecturerAssignedUnits;
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
window.switchLecturerMarksTab = switchLecturerMarksTab;
window.checkMarksApprovalStatus = checkMarksApprovalStatus;
window.showNotification = showNotification;
window.showLoading = showLoading;
window.hideLoading = hideLoading;
window.downloadCSV = downloadCSV;
window.showLoadingScreen = showLoadingScreen;
window.updateLoadingProgress = updateLoadingProgress;
window.updateLoadingStep = updateLoadingStep;
window.hideLoadingScreen = hideLoadingScreen;

// ============================================================
// INITIALIZATION - WITH LOADING SCREEN
// ============================================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Initializing Lecturer Marks Module...');
    
    // Show loading screen
    showLoadingScreen('Starting lecturer module...', 'NCHSM Lecturer Portal');
    updateLoadingProgress(5, 1, 'Detecting user session...');
    
    setTimeout(async function() {
        try {
            // Step 1: Detect program
            updateLoadingProgress(15, 1, 'Detecting lecturer program...');
            await detectLecturerProgram();
            
            // Step 2: Load blocks
            updateLoadingProgress(35, 2, 'Loading available blocks...');
            await loadMEBlocks();
            
            // Step 3: Load units
            updateLoadingProgress(55, 3, 'Loading assigned units...');
            await loadMEUnits();
            
            // Step 4: Load marks
            updateLoadingProgress(75, 4, 'Loading marks data...');
            
            const blockSelect = document.getElementById('me_block_select');
            const unitSelect = document.getElementById('me_subject_select');
            
            if (blockSelect && blockSelect.value && unitSelect && unitSelect.value) {
                await loadMarksEntry();
            } else {
                // Show placeholder
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
            
            // Complete
            updateLoadingProgress(100, 4, '✅ Ready!');
            await new Promise(resolve => setTimeout(resolve, 500));
            hideLoadingScreen();
            
            console.log('✅ Lecturer Marks Module initialized!');
            console.log('📊 Program:', me_currentProgram);
            console.log('📚 Assigned Units:', me_assignedUnits.length);
            
        } catch (error) {
            console.error('❌ Error initializing:', error);
            updateLoadingStep(4, '❌ Error loading module');
            setTimeout(hideLoadingScreen, 2000);
            showNotification('Error initializing module: ' + error.message, 'error');
        }
    }, 800);
});

console.log('✅ Lecturer Marks module loaded successfully!');
console.log('✅ Synced with admin column settings');
console.log('✅ Assessment type auto-detected from admin');
console.log('✅ Terminology: Units instead of Subjects');
console.log('✅ Strict unit assignment filtering enabled!');
console.log('🔒 Lecturers only see assigned units');
console.log('💾 Marks are permanently saved to Supabase!');
console.log('🔄 Loading screen integrated!');
