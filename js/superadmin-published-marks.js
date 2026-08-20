// ============================================================
// PUBLISHED MARKS - SUPER ADMIN (TVET & KRCHN Nursing)
// WITH RETAKE/SUPPLEMENTARY EXAM SUPPORT - PER UNIT FIXED
// COMPLETE FIXED VERSION - All functions exposed globally
// ============================================================

console.log('📊 Published Marks module loading...');
console.log('⭐ Retake/Supplementary Support: ENABLED (per unit)');

// Global state
const PUBLISHED_STATE = {
    marks: [],
    filtered: [],
    currentPage: 1,
    perPage: 20,
    user: null,
    userProgram: 'all',
    isLoading: false,
    currentProgramFilter: 'all',
    unitProgramCache: {},
    retakeData: [],
    retakeMap: {}
};

// ============================================================
// PROGRAM & UTILITY FUNCTIONS
// ============================================================

function getProgramDisplayName(programCode) {
    const programMap = {
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
    return programMap[programCode] || programCode || 'Unknown Program';
}

function getProgramType(programCode) {
    if (!programCode) return 'KRCHN';
    var code = String(programCode).toUpperCase().trim();
    if (code === 'KRCHN') return 'KRCHN';
    return 'TVET';
}

function getGradeColor(grade) {
    var colors = {
        'A': '#10b981',
        'B': '#3b82f6',
        'C': '#f59e0b',
        'D': '#f97316',
        'F': '#ef4444',
        'FAIL': '#ef4444'
    };
    return colors[grade] || '#6b7280';
}

function getStatusColor(status) {
    var colors = {
        'EXCELLENT': '#10b981',
        'GOOD': '#3b82f6',
        'SATISFACTORY': '#f59e0b',
        'FAIL': '#ef4444',
        'PENDING': '#94a3b8',
        'DISTINCTION': '#10b981',
        'CREDIT': '#3b82f6',
        'PASS': '#f59e0b'
    };
    return colors[status] || '#94a3b8';
}

function escapeHtml(str) {
    if (!str) return '';
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// ============================================================
// TVET GRADING SYSTEM
// ============================================================

function calculateTVETGrade(score) {
    if (score === null || score === undefined || score === 0) return 'FAIL';
    if (score >= 75) return 'A';
    if (score >= 65) return 'B';
    if (score >= 50) return 'C';
    return 'FAIL';
}

function calculateTVETPoints(grade) {
    if (!grade) return 0;
    var points = {
        'A': 4.0,
        'B': 3.0,
        'C': 2.0,
        'FAIL': 0.0
    };
    return points[grade] || 0;
}

function getTVETComment(score) {
    if (score === null || score === undefined || score === 0) return 'FAIL';
    if (score >= 75) return 'EXCELLENT';
    if (score >= 65) return 'GOOD';
    if (score >= 50) return 'SATISFACTORY';
    return 'FAIL';
}

function getTVETStatus(score) {
    if (score === null || score === undefined || score === 0) return 'FAIL';
    if (score >= 75) return 'EXCELLENT';
    if (score >= 65) return 'GOOD';
    if (score >= 50) return 'SATISFACTORY';
    return 'FAIL';
}

// ============================================================
// NURSING GRADING SYSTEM
// ============================================================

function calculateNursingGrade(score) {
    if (score === null || score === undefined || score === 0) return 'D';
    if (score >= 75) return 'A';
    if (score >= 65) return 'B';
    if (score >= 60) return 'C';
    return 'D';
}

function calculateNursingPoints(grade) {
    if (!grade) return 0;
    var points = {
        'A': 4.0,
        'B': 3.0,
        'C': 2.0,
        'D': 0.0
    };
    return points[grade] || 0;
}

function getNursingStatus(score) {
    if (score === null || score === undefined || score === 0) return 'PENDING';
    if (score >= 75) return 'DISTINCTION';
    if (score >= 65) return 'CREDIT';
    if (score >= 60) return 'PASS';
    return 'FAIL';
}

// ============================================================
// MAIN GRADING FUNCTIONS
// ============================================================

function calculateGrade(score, program) {
    var isTVET = getProgramType(program) === 'TVET';
    if (isTVET) {
        return calculateTVETGrade(score);
    }
    return calculateNursingGrade(score);
}

function calculatePoints(grade, program) {
    var isTVET = getProgramType(program) === 'TVET';
    if (isTVET) {
        return calculateTVETPoints(grade);
    }
    return calculateNursingPoints(grade);
}

function getGradingStatus(score, program) {
    var isTVET = getProgramType(program) === 'TVET';
    if (isTVET) {
        return getTVETStatus(score);
    }
    return getNursingStatus(score);
}

function getGradeComment(score, program) {
    var isTVET = getProgramType(program) === 'TVET';
    if (isTVET) {
        return getTVETComment(score);
    }
    return getNursingStatus(score);
}

function calculateGPA(marks) {
    if (!marks || marks.length === 0) return 0;
    var totalPoints = 0;
    for (var i = 0; i < marks.length; i++) {
        totalPoints = totalPoints + (marks[i].points || 0);
    }
    return marks.length > 0 ? (totalPoints / marks.length) : 0;
}

// ============================================================
// LOAD RETAKE DATA
// ============================================================

// ============================================================
// LOAD RETAKE DATA - WITH AUTO-UNPUBLISH CHECK
// ============================================================

async function loadPublishedRetakeData() {
    try {
        const { data, error } = await window.sb
            .from('student_retakes')
            .select('*')
            .order('attempt_number', { ascending: true });
        
        if (error) throw error;
        
        PUBLISHED_STATE.retakeData = data || [];
        
        const retakeMap = {};
        data?.forEach(retake => {
            const key = retake.admission_number;
            if (!retakeMap[key]) retakeMap[key] = [];
            retakeMap[key].push(retake);
        });
        
        PUBLISHED_STATE.retakeMap = retakeMap;
        console.log(`📊 Loaded ${data?.length || 0} retake records for published marks`);
        
        // ✅ Auto-unpublish marks that have retakes but are still published
        await checkAndUnpublishMarksWithRetakes(data || []);
        
        return retakeMap;
        
    } catch (error) {
        console.error('Error loading retake data:', error);
        return {};
    }
}

// ============================================================
// AUTO-UNPUBLISH MARKS WITH RETAKE RECORDS
// ============================================================

async function checkAndUnpublishMarksWithRetakes(retakes) {
    if (!retakes || retakes.length === 0) return;
    
    let unpublishedCount = 0;
    const retakeMap = {};
    
    // Group retakes by student and subject
    retakes.forEach(retake => {
        const key = `${retake.admission_number}_${retake.subject_name}`;
        retakeMap[key] = true;
    });
    
    // Get all marks that are published
    const { data: publishedMarks, error } = await window.sb
        .from('student_marks')
        .select('id, admission_number, subject_name, published')
        .eq('published', true);
    
    if (error) {
        console.warn('Could not fetch published marks:', error);
        return;
    }
    
    if (!publishedMarks || publishedMarks.length === 0) return;
    
    // Check each published mark against retake map
    for (const mark of publishedMarks) {
        const key = `${mark.admission_number}_${mark.subject_name}`;
        if (retakeMap[key]) {
            // ✅ This mark has a retake record but is still published - UNPUBLISH IT
            const { error: updateError } = await window.sb
                .from('student_marks')
                .update({
                    published: false,
                    published_at: null,
                    published_by: null,
                    unpublished_at: new Date().toISOString(),
                    unpublished_reason: 'Retake recorded - auto-unpublished'
                })
                .eq('id', mark.id);
            
            if (!updateError) {
                unpublishedCount++;
                console.log(`🔓 Auto-unpublished ${mark.admission_number} - ${mark.subject_name} (has retake)`);
            }
        }
    }
    
    if (unpublishedCount > 0) {
        console.log(`🔓 Auto-unpublished ${unpublishedCount} marks with retake records`);
        if (typeof window.showNotification === 'function') {
            window.showNotification(`🔓 ${unpublishedCount} marks auto-unpublished (retake recorded)`, 'warning');
        }
    }
}

// ============================================================
// ✅ FIXED: Get retake info per unit
// ============================================================

function getStudentRetakeInfo(admissionNumber, subjectName) {
    var retakes = PUBLISHED_STATE.retakeMap[admissionNumber] || [];
    
    // ✅ Filter retakes by subject_name (unit)
    if (subjectName) {
        retakes = retakes.filter(function(r) {
            return r.subject_name === subjectName;
        });
    }
    
    if (retakes.length === 0) return null;
    
    var lastRetake = retakes[retakes.length - 1];
    return {
        count: retakes.length,
        score: lastRetake?.exam_score || null,
        status: lastRetake?.status || null,
        grade: lastRetake?.grade || null,
        history: retakes
    };
}

// ============================================================
// ✅ FIXED: Get retake badge per unit
// ============================================================

function getRetakeBadgeHtml(admissionNumber, subjectName) {
    var info = getStudentRetakeInfo(admissionNumber, subjectName);
    if (!info) return '';
    
    var isPassing = info.status === 'PASS';
    var color = isPassing ? '#059669' : '#dc2626';
    var icon = isPassing ? '✅' : '❌';
    
    return `<span style="display: inline-block; margin-left: 6px; background: #f59e0b; color: white; font-size: 8px; padding: 1px 8px; border-radius: 10px; font-weight: 700;">
        ⭐ R${info.count}
    </span>
    ${info.score !== null ? `<span style="display: inline-block; margin-left: 4px; font-size: 8px; color: ${color}; font-weight: 600;">${icon} ${info.score}%</span>` : ''}`;
}

// ============================================================
// ✅ FIXED: Get retake history per unit
// ============================================================

function getRetakeHistoryHtml(admissionNumber, subjectName) {
    var info = getStudentRetakeInfo(admissionNumber, subjectName);
    if (!info || info.history.length === 0) return '';
    
    var html = '<div style="font-size: 9px; color: #64748b; margin-top: 2px;">';
    html += '<span style="font-weight: 600;">🔄 Retake History:</span>';
    info.history.forEach(function(r, i) {
        var isPass = r.status === 'PASS';
        html += `<span style="margin-left: 6px; color: ${isPass ? '#059669' : '#dc2626'};">`;
        html += `#${r.attempt_number}: ${r.exam_score}% ${isPass ? '✅' : '❌'}`;
        html += `</span>`;
    });
    html += '</div>';
    return html;
}

// ============================================================
// GET UNIT PROGRAM FROM CATALOG
// ============================================================

async function getUnitProgram(subjectName) {
    if (PUBLISHED_STATE.unitProgramCache[subjectName]) {
        return PUBLISHED_STATE.unitProgramCache[subjectName];
    }
    
    try {
        var result = await window.sb
            .from('units_catalog')
            .select('program')
            .eq('unit_name', subjectName)
            .maybeSingle();
        
        if (!result.error && result.data) {
            PUBLISHED_STATE.unitProgramCache[subjectName] = result.data.program || 'KRCHN';
            return result.data.program || 'KRCHN';
        }
    } catch (e) {
        console.warn('Error fetching unit program:', e);
    }
    
    return 'KRCHN';
}

// ============================================================
// CACHE UNIT PROGRAMS
// ============================================================

async function cacheUnitPrograms(marks) {
    var subjects = [];
    var subjectSet = {};
    
    for (var i = 0; i < marks.length; i++) {
        var m = marks[i];
        if (m.subject_name && !subjectSet[m.subject_name]) {
            subjectSet[m.subject_name] = true;
            subjects.push(m.subject_name);
        }
    }
    
    for (var j = 0; j < subjects.length; j++) {
        if (!PUBLISHED_STATE.unitProgramCache[subjects[j]]) {
            await getUnitProgram(subjects[j]);
        }
    }
}

// ============================================================
// GET CURRENT USER
// ============================================================

async function getCurrentUser() {
    try {
        var stored = sessionStorage.getItem('user') || localStorage.getItem('user');
        if (stored) {
            var user = JSON.parse(stored);
            if (user) return user;
        }
        if (window.currentUser) return window.currentUser;
        if (window.currentUserProfile) return window.currentUserProfile;
        return { id: 'superadmin', name: 'Super Admin', role: 'superadmin', program: 'all' };
    } catch (e) {
        console.error('Error getting user:', e);
        return { id: 'superadmin', name: 'Super Admin', role: 'superadmin', program: 'all' };
    }
}

// ============================================================
// ✅ FIXED: LOAD PUBLISHED MARKS - WITH PER UNIT RETAKE SUPPORT
// ============================================================

async function loadPublishedMarks() {
    if (PUBLISHED_STATE.isLoading) return;
    
    try {
        PUBLISHED_STATE.isLoading = true;
        
        var container = document.getElementById('publishedMarksContainer');
        if (container) {
            container.innerHTML = `
                <div style="text-align: center; padding: 60px 20px;">
                    <div style="display: inline-block; width: 40px; height: 40px; border: 4px solid #e5e7eb; border-top: 4px solid #4C1D95; border-radius: 50%; animation: spin 0.8s linear infinite; margin-bottom: 16px;"></div>
                    <p style="color: #64748b;">Loading published marks...</p>
                </div>
                <style>
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                </style>
            `;
        }
        
        var user = await getCurrentUser();
        PUBLISHED_STATE.user = user;
        
        // ✅ Load retake data first
        await loadPublishedRetakeData();
        
        var marks = [];
        
        try {
            var query = window.sb.from('student_marks').select('*');
            
            var blockFilter = document.getElementById('pm_block_filter')?.value;
            if (blockFilter && blockFilter !== 'all') {
                query = query.eq('block', blockFilter);
            }
            
            var statusFilter = document.getElementById('pm_status_filter')?.value;
            if (statusFilter === 'published') {
                query = query.eq('published', true);
            } else if (statusFilter === 'draft') {
                query = query.eq('published', false);
            }
            
            var yearFilter = document.getElementById('pm_year_filter')?.value;
            if (yearFilter && yearFilter !== 'all') {
                query = query.eq('academic_year', yearFilter);
            }
            
            query = query.order('created_at', { ascending: false });
            
            var result = await query;
            
            if (result.error) {
                console.error('❌ Database error:', result.error);
                marks = [];
            } else if (result.data) {
                marks = result.data;
                console.log('📊 Loaded ' + marks.length + ' marks from database');
            }
            
        } catch (e) {
            console.error('❌ Error fetching marks:', e);
            marks = [];
        }
        
        await cacheUnitPrograms(marks);
        
        var processedMarks = [];
        for (var i = 0; i < marks.length; i++) {
            var mark = marks[i];
            var program = PUBLISHED_STATE.unitProgramCache[mark.subject_name] || 'KRCHN';
            
            // ✅ Get retake info for THIS SPECIFIC UNIT
            var retakeInfo = getStudentRetakeInfo(mark.admission_number, mark.subject_name);
            var hasRetake = retakeInfo !== null && retakeInfo.count > 0;
            
            // ✅ Use retake score if available, otherwise use original
            var finalScore = hasRetake && retakeInfo.score !== null ? retakeInfo.score : mark.final_score;
            var grade = mark.grade || calculateGrade(finalScore, program);
            var points = mark.points || calculatePoints(grade, program);
            var status = getGradingStatus(finalScore, program);
            var comment = getGradeComment(finalScore, program);
            
            processedMarks.push({
                id: mark.id,
                admission_number: mark.admission_number,
                student_name: mark.student_name,
                subject_name: mark.subject_name,
                block: mark.block,
                cat1_score: mark.cat1_score,
                cat2_score: mark.cat2_score,
                exam_score: mark.exam_score,
                final_score: finalScore, // ✅ Use retake score if available
                original_score: mark.final_score, // ✅ Keep original for reference
                grade: grade,
                points: points,
                published: mark.published,
                published_at: mark.published_at,
                academic_year: mark.academic_year,
                created_at: mark.created_at,
                updated_at: mark.updated_at,
                program: program,
                status: status,
                comment: comment,
                // ✅ Retake fields - specific to this unit
                hasRetake: hasRetake,
                retakeCount: retakeInfo?.count || 0,
                retakeScore: retakeInfo?.score || null,
                retakeStatus: retakeInfo?.status || null,
                retakeGrade: retakeInfo?.grade || null,
                retakeHistory: retakeInfo?.history || []
            });
        }
        
        if (PUBLISHED_STATE.currentProgramFilter === 'KRCHN') {
            processedMarks = processedMarks.filter(function(m) { return m.program === 'KRCHN'; });
        } else if (PUBLISHED_STATE.currentProgramFilter === 'TVET') {
            processedMarks = processedMarks.filter(function(m) { return m.program !== 'KRCHN'; });
        }
        
        PUBLISHED_STATE.marks = processedMarks;
        PUBLISHED_STATE.filtered = processedMarks.slice();
        PUBLISHED_STATE.userProgram = user?.program || 'all';
        
        updateUserInfo(user);
        populateFilters(processedMarks);
        renderPublishedMarks();
        updateStats(processedMarks);
        updateBadge(processedMarks);
        updateProgramCounts(processedMarks);
        updateGradingScaleDisplay();
        populateStudentFilter(processedMarks);
        
        PUBLISHED_STATE.isLoading = false;
        
    } catch (error) {
        console.error('Error loading published marks:', error);
        PUBLISHED_STATE.marks = [];
        PUBLISHED_STATE.filtered = [];
        renderPublishedMarks();
        updateStats([]);
        updateBadge([]);
        updateProgramCounts([]);
        PUBLISHED_STATE.isLoading = false;
    }
}

// ============================================================
// POPULATE STUDENT FILTER
// ============================================================

function populateStudentFilter(marks) {
    var filter = document.getElementById('pm_student_filter');
    if (!filter) return;
    
    var currentValue = filter.value;
    var students = {};
    
    for (var i = 0; i < marks.length; i++) {
        var m = marks[i];
        var key = m.admission_number || m.student_name || 'Unknown';
        if (!students[key]) {
            students[key] = {
                name: m.student_name || 'Unknown',
                admission: m.admission_number || 'N/A',
                program: m.program || 'N/A',
                hasRetake: m.hasRetake || false,
                retakeCount: m.retakeCount || 0
            };
        }
    }
    
    var studentKeys = Object.keys(students).sort();
    filter.innerHTML = '<option value="all">All Students</option>';
    
    for (var j = 0; j < studentKeys.length; j++) {
        var key = studentKeys[j];
        var s = students[key];
        var option = document.createElement('option');
        option.value = key;
        var retakeBadge = s.hasRetake ? ' ⭐' : '';
        option.textContent = s.name + ' (' + s.admission + ') - ' + getProgramDisplayName(s.program) + retakeBadge;
        filter.appendChild(option);
    }
    
    if (currentValue && studentKeys.indexOf(currentValue) !== -1) {
        filter.value = currentValue;
    }
}

// ============================================================
// UPDATE USER INFO
// ============================================================

function updateUserInfo(user) {
    var programBadge = document.getElementById('pm_user_program_badge');
    if (programBadge) {
        programBadge.textContent = '🎓 KRCHN Nursing & 🔧 TVET Programs';
    }
    
    var userNameEl = document.getElementById('pm_user_name');
    if (userNameEl) {
        userNameEl.textContent = user?.full_name || user?.name || 'Super Admin';
    }
}

// ============================================================
// UPDATE PROGRAM COUNTS
// ============================================================

function updateProgramCounts(marks) {
    var krchnCount = 0;
    var tvetCount = 0;
    var publishedCount = 0;
    var draftCount = 0;
    var retakeCount = 0;
    
    for (var i = 0; i < marks.length; i++) {
        var m = marks[i];
        if (m.program === 'KRCHN') krchnCount++;
        else tvetCount++;
        if (m.published === true) publishedCount++;
        else draftCount++;
        if (m.hasRetake) retakeCount++;
    }
    
    var krchnEl = document.getElementById('pm_krchn_count');
    var tvetEl = document.getElementById('pm_tvet_count');
    var publishedEl = document.getElementById('pm_published_badge_count');
    var draftEl = document.getElementById('pm_draft_count');
    var retakeEl = document.getElementById('pm_retake_count');
    
    if (krchnEl) krchnEl.textContent = krchnCount;
    if (tvetEl) tvetEl.textContent = tvetCount;
    if (publishedEl) publishedEl.textContent = publishedCount;
    if (draftEl) draftEl.textContent = draftCount;
    if (retakeEl) retakeEl.textContent = retakeCount;
}

// ============================================================
// UPDATE GRADING SCALE DISPLAY
// ============================================================

function updateGradingScaleDisplay() {
    var programType = PUBLISHED_STATE.currentProgramFilter;
    var tvetScale = document.getElementById('pm_tvet_scale');
    var nursingScale = document.getElementById('pm_nursing_scale');
    
    if (tvetScale) tvetScale.style.display = (programType === 'all' || programType === 'TVET') ? 'inline-flex' : 'none';
    if (nursingScale) nursingScale.style.display = (programType === 'all' || programType === 'KRCHN') ? 'inline-flex' : 'none';
}

// ============================================================
// FILTER BY PROGRAM TYPE
// ============================================================

function filterPublishedByProgram(programType) {
    console.log('📊 Filtering by program:', programType);
    
    var btns = document.querySelectorAll('.program-filter-btn');
    for (var i = 0; i < btns.length; i++) {
        var btn = btns[i];
        btn.classList.remove('active');
        btn.style.background = '#e5e7eb';
        btn.style.color = '#475569';
    }
    
    var activeBtn = document.getElementById('pm_filter_' + programType);
    if (activeBtn) {
        activeBtn.classList.add('active');
        activeBtn.style.background = '#4C1D95';
        activeBtn.style.color = 'white';
    }
    
    var labels = {
        'all': 'All Programs',
        'KRCHN': '🎓 KRCHN Nursing',
        'TVET': '🔧 TVET Programs'
    };
    var labelEl = document.getElementById('pm_current_filter_label');
    if (labelEl) labelEl.textContent = labels[programType] || 'All Programs';
    
    PUBLISHED_STATE.currentProgramFilter = programType;
    
    var programFilter = document.getElementById('pm_program_filter');
    if (programFilter) {
        programFilter.value = programType === 'all' ? 'all' : programType;
    }
    
    updateGradingScaleDisplay();
    loadPublishedMarks();
}

// ============================================================
// POPULATE FILTERS
// ============================================================

function populateFilters(marks) {
    // Subject filter
    var subjectFilter = document.getElementById('pm_subject_filter');
    if (subjectFilter) {
        var currentValue = subjectFilter.value;
        var uniqueSubjects = [];
        var subjectSet = {};
        
        for (var i = 0; i < marks.length; i++) {
            var m = marks[i];
            if (m.subject_name && !subjectSet[m.subject_name]) {
                subjectSet[m.subject_name] = true;
                uniqueSubjects.push(m.subject_name);
            }
        }
        
        uniqueSubjects.sort();
        subjectFilter.innerHTML = '<option value="all">All Units</option>';
        
        for (var j = 0; j < uniqueSubjects.length; j++) {
            var subject = uniqueSubjects[j];
            var option = document.createElement('option');
            option.value = subject;
            option.textContent = subject;
            subjectFilter.appendChild(option);
        }
        
        if (currentValue && uniqueSubjects.indexOf(currentValue) !== -1) {
            subjectFilter.value = currentValue;
        }
    }
    
    // Block filter
    var blockFilter = document.getElementById('pm_block_filter');
    if (blockFilter) {
        var currentValue = blockFilter.value;
        var uniqueBlocks = [];
        var blockSet = {};
        
        for (var i = 0; i < marks.length; i++) {
            var m = marks[i];
            if (m.block && !blockSet[m.block]) {
                blockSet[m.block] = true;
                uniqueBlocks.push(m.block);
            }
        }
        
        blockFilter.innerHTML = '<option value="all">All Blocks/Terms</option>';
        
        var krchnBlocks = [];
        var tvetTerms = [];
        var otherBlocks = [];
        
        for (var j = 0; j < uniqueBlocks.length; j++) {
            var b = uniqueBlocks[j];
            if (b && (b.includes('Block') || b === 'Introductory' || b === 'Final')) {
                krchnBlocks.push(b);
            } else if (b && b.includes('Term')) {
                tvetTerms.push(b);
            } else if (b) {
                otherBlocks.push(b);
            }
        }
        
        if (krchnBlocks.length > 0) {
            var group1 = document.createElement('optgroup');
            group1.label = '📚 KRCHN Blocks';
            krchnBlocks.sort();
            for (var k = 0; k < krchnBlocks.length; k++) {
                var block = krchnBlocks[k];
                var opt = document.createElement('option');
                opt.value = block;
                opt.textContent = block;
                group1.appendChild(opt);
            }
            blockFilter.appendChild(group1);
        }
        
        if (tvetTerms.length > 0) {
            var group2 = document.createElement('optgroup');
            group2.label = '📖 TVET Terms';
            tvetTerms.sort();
            for (var k = 0; k < tvetTerms.length; k++) {
                var term = tvetTerms[k];
                var opt = document.createElement('option');
                opt.value = term;
                opt.textContent = term;
                group2.appendChild(opt);
            }
            blockFilter.appendChild(group2);
        }
        
        if (otherBlocks.length > 0) {
            var group3 = document.createElement('optgroup');
            group3.label = '📋 Other';
            otherBlocks.sort();
            for (var k = 0; k < otherBlocks.length; k++) {
                var block = otherBlocks[k];
                var opt = document.createElement('option');
                opt.value = block;
                opt.textContent = block;
                group3.appendChild(opt);
            }
            blockFilter.appendChild(group3);
        }
        
        if (currentValue && uniqueBlocks.indexOf(currentValue) !== -1) {
            blockFilter.value = currentValue;
        }
    }
    
    // Program filter
    var programFilter = document.getElementById('pm_program_filter');
    if (programFilter) {
        var currentValue = programFilter.value;
        var uniquePrograms = [];
        var programSet = {};
        
        for (var i = 0; i < marks.length; i++) {
            var m = marks[i];
            if (m.program && !programSet[m.program]) {
                programSet[m.program] = true;
                uniquePrograms.push(m.program);
            }
        }
        
        programFilter.innerHTML = '<option value="all">All Programs</option>';
        uniquePrograms.sort();
        for (var j = 0; j < uniquePrograms.length; j++) {
            var program = uniquePrograms[j];
            var option = document.createElement('option');
            option.value = program;
            option.textContent = getProgramDisplayName(program);
            programFilter.appendChild(option);
        }
        
        if (currentValue && uniquePrograms.indexOf(currentValue) !== -1) {
            programFilter.value = currentValue;
        }
    }
    
    // Year filter
    var yearFilter = document.getElementById('pm_year_filter');
    if (yearFilter) {
        var currentValue = yearFilter.value;
        var uniqueYears = [];
        var yearSet = {};
        
        for (var i = 0; i < marks.length; i++) {
            var m = marks[i];
            if (m.academic_year && !yearSet[m.academic_year]) {
                yearSet[m.academic_year] = true;
                uniqueYears.push(m.academic_year);
            }
        }
        
        yearFilter.innerHTML = '<option value="all">All Years</option>';
        uniqueYears.sort().reverse();
        for (var j = 0; j < uniqueYears.length; j++) {
            var year = uniqueYears[j];
            var option = document.createElement('option');
            option.value = year;
            option.textContent = year;
            yearFilter.appendChild(option);
        }
        
        if (currentValue && uniqueYears.indexOf(currentValue) !== -1) {
            yearFilter.value = currentValue;
        }
    }
}

// ============================================================
// ✅ FIXED: RENDER PUBLISHED MARKS - PER UNIT RETAKE
// ============================================================

function renderPublishedMarks() {
    var container = document.getElementById('publishedMarksContainer');
    if (!container) return;
    
    var marks = PUBLISHED_STATE.filtered;
    
    var studentFilter = document.getElementById('pm_student_filter')?.value || 'all';
    var displayMarks = marks.slice();
    
    if (studentFilter !== 'all') {
        displayMarks = displayMarks.filter(function(m) {
            return (m.admission_number || m.student_name || 'Unknown') === studentFilter;
        });
    }
    
    var subjectFilter = document.getElementById('pm_subject_filter')?.value || 'all';
    if (subjectFilter !== 'all') {
        displayMarks = displayMarks.filter(function(m) { return m.subject_name === subjectFilter; });
    }
    
    var programFilter = document.getElementById('pm_program_filter')?.value || 'all';
    if (programFilter !== 'all') {
        displayMarks = displayMarks.filter(function(m) { return m.program === programFilter; });
    }
    
    if (!displayMarks || displayMarks.length === 0) {
        var emptyHtml = '<div style="text-align: center; padding: 60px 20px;">';
        emptyHtml += '<i class="fas fa-share-alt" style="font-size: 48px; color: #94a3b8; margin-bottom: 16px; display: block;"></i>';
        emptyHtml += '<h3 style="color: #1e293b;">' + (marks.length > 0 ? 'No marks match the current filter' : 'No published marks found') + '</h3>';
        emptyHtml += '<p style="color: #94a3b8;">' + (marks.length > 0 ? 'Try adjusting your filters' : 'Marks will appear here once published') + '</p>';
        if (marks.length === 0) {
            emptyHtml += '<button onclick="loadPublishedMarks()" style="margin-top: 12px; padding: 8px 20px; background: #4C1D95; color: white; border: none; border-radius: 6px; cursor: pointer;">';
            emptyHtml += '<i class="fas fa-sync-alt"></i> Refresh';
            emptyHtml += '</button>';
        }
        emptyHtml += '</div>';
        container.innerHTML = emptyHtml;
        document.getElementById('pm_filter_count').textContent = '0';
        return;
    }
    
    var studentMap = {};
    for (var i = 0; i < displayMarks.length; i++) {
        var mark = displayMarks[i];
        var key = mark.admission_number || mark.student_name || 'Unknown';
        if (!studentMap[key]) {
            studentMap[key] = [];
        }
        studentMap[key].push(mark);
    }
    
    var studentKeys = Object.keys(studentMap);
    var totalStudents = studentKeys.length;
    
    var totalStudentsEl = document.getElementById('pm_total_students');
    if (totalStudentsEl) totalStudentsEl.textContent = totalStudents;
    
    var html = 
        '<div style="margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 6px; padding: 0 4px;">' +
            '<div style="display: flex; gap: 12px; flex-wrap: wrap; font-size: 11px; color: #64748b;">' +
                '<span><i class="fas fa-users"></i> <strong>' + totalStudents + '</strong> students</span>' +
            '</div>' +
            '<span style="font-size: 10px; color: #94a3b8;">' +
                '<i class="fas fa-clock"></i> ' + new Date().toLocaleTimeString() +
            '</span>' +
        '</div>' +
        '<div style="overflow-x: auto;">' +
            '<table style="width: 100%; border-collapse: collapse; font-size: 12px;">' +
                '<thead style="background: #0A3D62; color: white;">' +
                    '<tr>' +
                        '<th style="padding: 6px 10px; text-align: left;">#</th>' +
                        '<th style="padding: 6px 10px; text-align: left;">Student</th>' +
                        '<th style="padding: 6px 10px; text-align: left;">Admission</th>' +
                        '<th style="padding: 6px 10px; text-align: left;">Program</th>' +
                        '<th style="padding: 6px 10px; text-align: center;">Units</th>' +
                        '<th style="padding: 6px 10px; text-align: center;">Avg Score</th>' +
                        '<th style="padding: 6px 10px; text-align: center;">GPA</th>' +
                        '<th style="padding: 6px 10px; text-align: center;">Published</th>' +
                        '<th style="padding: 6px 10px; text-align: center;">Action</th>' +
                    '</tr>' +
                '</thead>' +
                '<tbody>';
    
    var index = 0;
    for (var s = 0; s < studentKeys.length; s++) {
        var key = studentKeys[s];
        var studentMarks = studentMap[key];
        var firstMark = studentMarks[0];
        var studentName = firstMark.student_name || 'Unknown';
        var admissionNumber = firstMark.admission_number || '-';
        var program = firstMark.program || 'N/A';
        var isTVET = getProgramType(program) === 'TVET';
        var programIcon = isTVET ? '🔧' : '🎓';
        var threshold = isTVET ? 50 : 60;
        
        // ✅ Check if student has ANY retake (for the student-level badge)
        var studentHasRetake = studentMarks.some(function(m) { return m.hasRetake; });
        var studentRetakeBadge = studentHasRetake ? '<span style="display: inline-block; margin-left: 4px; background: #f59e0b; color: white; font-size: 7px; padding: 1px 6px; border-radius: 8px; font-weight: 700;">⭐</span>' : '';
        
        var totalUnits = studentMarks.length;
        var passedUnits = 0;
        var failedUnits = 0;
        var pendingUnits = 0;
        var totalScore = 0;
        var allPublished = true;
        var totalPoints = 0;
        
        for (var m = 0; m < studentMarks.length; m++) {
            var sm = studentMarks[m];
            totalScore = totalScore + (sm.final_score || 0);
            totalPoints = totalPoints + (sm.points || 0);
            if (sm.final_score >= threshold) passedUnits++;
            else if (sm.final_score > 0 && sm.final_score < threshold) failedUnits++;
            else pendingUnits++;
            if (sm.published !== true) allPublished = false;
        }
        
        var avgScore = totalUnits > 0 ? (totalScore / totalUnits) : 0;
        var publishStatus = allPublished ? '✅ All Published' : '📝 Draft';
        var publishColor = allPublished ? '#10b981' : '#94a3b8';
        var gpa = totalUnits > 0 ? (totalPoints / totalUnits) : 0;
        
        index++;
        
        html += 
            '<tr style="border-bottom: 1px solid #f1f5f9; transition: background 0.2s; background: ' + (index % 2 === 0 ? '#fafafa' : 'transparent') + ';" ' +
                'onmouseover="this.style.background=\'#f8fafc\'" ' +
                'onmouseout="this.style.background=\'' + (index % 2 === 0 ? '#fafafa' : 'transparent') + '\'">' +
                '<td style="padding: 6px 10px; text-align: center; color: #94a3b8;">' + index + '</td>' +
                '<td style="padding: 6px 10px; font-weight: 500;">' + escapeHtml(studentName) + studentRetakeBadge + '</td>' +
                '<td style="padding: 6px 10px; font-size: 11px; color: #64748b;">' + escapeHtml(admissionNumber) + '</td>' +
                '<td style="padding: 6px 10px;">' +
                    '<span style="background: ' + (isTVET ? '#fef3c7' : '#dbeafe') + '; padding: 2px 8px; border-radius: 10px; font-size: 10px;">' +
                        programIcon + ' ' + escapeHtml(program) +
                    '</span>' +
                '</td>' +
                '<td style="padding: 6px 10px; text-align: center; font-size: 11px;">' +
                    '<span style="color: #10b981;">' + passedUnits + '</span> / ' +
                    '<span style="color: #dc2626;">' + failedUnits + '</span> / ' +
                    '<span style="color: #94a3b8;">' + pendingUnits + '</span>' +
                    (studentHasRetake ? '<span style="font-size: 7px; color: #f59e0b; display: block;">⭐ Retake unit(s)</span>' : '') +
                    '<span style="font-size: 7px; color: #94a3b8; display: block;">P/F/P</span>' +
                '</td>' +
                '<td style="padding: 6px 10px; text-align: center; font-weight: 600; color: ' + (avgScore >= threshold ? '#10b981' : '#dc2626') + ';">' + avgScore.toFixed(1) + '%</td>' +
                '<td style="padding: 6px 10px; text-align: center; font-weight: 600; color: #6d28d9;">' + gpa.toFixed(2) + '</td>' +
                '<td style="padding: 6px 10px; text-align: center;">' +
                    '<span style="color: ' + publishColor + '; font-weight: 600; font-size: 10px;">' + publishStatus + '</span>' +
                '</td>' +
                '<td style="padding: 6px 10px; text-align: center; white-space: nowrap;">';
        
        if (allPublished) {
            html += '<button onclick="unpublishStudentAllMarks(\'' + escapeHtml(admissionNumber) + '\')" ' +
                'style="background: #dc2626; color: white; border: none; padding: 3px 10px; border-radius: 4px; cursor: pointer; font-size: 10px; transition: all 0.2s;" ' +
                'onmouseover="this.style.background=\'#b91c1c\'" ' +
                'onmouseout="this.style.background=\'#dc2626\'">' +
                '<i class="fas fa-lock"></i> Unpublish All' +
                '</button>';
        } else {
            html += '<button onclick="publishStudentAllMarks(\'' + escapeHtml(admissionNumber) + '\')" ' +
                'style="background: #10b981; color: white; border: none; padding: 3px 10px; border-radius: 4px; cursor: pointer; font-size: 10px; transition: all 0.2s;" ' +
                'onmouseover="this.style.background=\'#059669\'" ' +
                'onmouseout="this.style.background=\'#10b981\'">' +
                '<i class="fas fa-share-alt"></i> Publish All' +
                '</button>';
        }
        
        html +=
                    '<button onclick="viewStudentMarks(\'' + escapeHtml(admissionNumber) + '\')" ' +
                        'style="background: #4C1D95; color: white; border: none; padding: 3px 8px; border-radius: 4px; cursor: pointer; font-size: 10px; margin-top: 2px; transition: all 0.2s;" ' +
                        'onmouseover="this.style.background=\'#3b0f6e\'" ' +
                        'onmouseout="this.style.background=\'#4C1D95\'">' +
                        '<i class="fas fa-eye"></i> View' +
                    '</button>' +
                '</td>' +
            '</tr>';
    }
    
    html += 
                '</tbody>' +
            '</table>' +
        '</div>';
    
    container.innerHTML = html;
    document.getElementById('pm_filter_count').textContent = displayMarks.length;
}

// ============================================================
// ✅ FIXED: VIEW STUDENT MARKS DETAIL - PER UNIT RETAKE
// ============================================================

function viewStudentMarks(admissionNumber) {
    if (!admissionNumber) {
        if (typeof window.showNotification === 'function') {
            window.showNotification('Please select a student', 'warning');
        }
        return;
    }
    
    var marks = PUBLISHED_STATE.marks.filter(function(m) { return m.admission_number === admissionNumber; });
    
    if (marks.length === 0) {
        if (typeof window.showNotification === 'function') {
            window.showNotification('No marks found for this student', 'warning');
        }
        return;
    }
    
    var firstMark = marks[0];
    var isTVET = getProgramType(firstMark.program) === 'TVET';
    var threshold = isTVET ? 50 : 60;
    
    // ✅ Check if student has ANY retake (for the header)
    var studentHasRetake = marks.some(function(m) { return m.hasRetake; });
    var totalStudentRetakes = marks.reduce(function(sum, m) { return sum + (m.retakeCount || 0); }, 0);
    
    var tableRows = '';
    for (var i = 0; i < marks.length; i++) {
        var mark = marks[i];
        var status = getGradingStatus(mark.final_score, mark.program);
        var statusColor = getStatusColor(status);
        var gradeColor = getGradeColor(mark.grade);
        var isPublished = mark.published === true;
        var publishColor = isPublished ? '#10b981' : '#94a3b8';
        var publishText = isPublished ? '✅ Published' : '📝 Draft';
        
        // ✅ Get retake info for THIS SPECIFIC UNIT
        var unitHasRetake = mark.hasRetake || false;
        var retakeBadge = unitHasRetake ? 
            `<span style="display: inline-block; margin-left: 4px; background: #f59e0b; color: white; font-size: 7px; padding: 1px 6px; border-radius: 8px; font-weight: 700;">⭐ R${mark.retakeCount}</span>` : '';
        
        var retakeScoreDisplay = unitHasRetake && mark.retakeScore !== null ?
            `<div style="font-size: 9px; color: ${mark.retakeStatus === 'PASS' ? '#059669' : '#dc2626'}; margin-top: 2px;">
                Retake: ${mark.retakeScore}% ${mark.retakeStatus === 'PASS' ? '✅' : '❌'}
                ${mark.original_score !== null && mark.original_score !== undefined ? `<span style="color: #94a3b8; font-size: 8px;"> (Original: ${mark.original_score}%)</span>` : ''}
            </div>` : '';
        
        var publishButton = isPublished ? 
            '<button onclick="unpublishSingleUnit(\'' + mark.id + '\', \'' + escapeHtml(mark.subject_name) + '\', \'' + escapeHtml(admissionNumber) + '\')" ' +
                'style="background: #dc2626; color: white; border: none; padding: 4px 10px; border-radius: 4px; cursor: pointer; font-size: 10px; transition: all 0.2s; white-space: nowrap;" ' +
                'onmouseover="this.style.background=\'#b91c1c\'" ' +
                'onmouseout="this.style.background=\'#dc2626\'">' +
                '<i class="fas fa-lock"></i> Unpublish' +
            '</button>' :
            '<button onclick="publishSingleUnit(\'' + mark.id + '\', \'' + escapeHtml(mark.subject_name) + '\', \'' + escapeHtml(admissionNumber) + '\')" ' +
                'style="background: #10b981; color: white; border: none; padding: 4px 10px; border-radius: 4px; cursor: pointer; font-size: 10px; transition: all 0.2s; white-space: nowrap;" ' +
                'onmouseover="this.style.background=\'#059669\'" ' +
                'onmouseout="this.style.background=\'#10b981\'">' +
                '<i class="fas fa-share-alt"></i> Publish' +
            '</button>';
        
        tableRows += 
            '<tr style="border-bottom: 1px solid #f1f5f9; ' + (i % 2 === 0 ? 'background: #fafafa;' : '') + (unitHasRetake ? ' border-left: 3px solid #f59e0b;' : '') + '">' +
                '<td style="padding: 8px 12px; text-align: center; color: #94a3b8;">' + (i + 1) + '</td>' +
                '<td style="padding: 8px 12px; font-weight: 500;">' + escapeHtml(mark.subject_name || 'N/A') + retakeBadge + retakeScoreDisplay + '</td>' +
                '<td style="padding: 8px 12px; text-align: center; font-weight: 600; color: ' + (mark.final_score >= threshold ? '#10b981' : '#dc2626') + ';">' + (mark.final_score || 0) + '%</td>' +
                '<td style="padding: 8px 12px; text-align: center;">' +
                    '<span style="background: ' + gradeColor + '; color: white; padding: 2px 10px; border-radius: 10px; font-weight: 700; font-size: 12px;">' + (mark.grade || '-') + '</span>' +
                '</td>' +
                '<td style="padding: 8px 12px; text-align: center; font-weight: 600;">' + (mark.points || 0) + '</td>' +
                '<td style="padding: 8px 12px; text-align: center;">' +
                    '<span style="background: ' + statusColor + '; color: white; padding: 2px 10px; border-radius: 10px; font-weight: 600; font-size: 10px;">' + status + '</span>' +
                '</td>' +
                '<td style="padding: 8px 12px; text-align: center;">' +
                    '<span style="color: ' + publishColor + '; font-weight: 600; font-size: 11px;">' + publishText + '</span>' +
                '</td>' +
                '<td style="padding: 8px 12px; text-align: center;">' + publishButton + '</td>' +
            '</tr>';
    }
    
    var totalUnits = marks.length;
    var passedUnits = 0;
    var failedUnits = 0;
    var pendingUnits = 0;
    for (var j = 0; j < marks.length; j++) {
        var m = marks[j];
        if (m.final_score >= threshold) passedUnits++;
        else if (m.final_score > 0 && m.final_score < threshold) failedUnits++;
        else pendingUnits++;
    }
    var gpa = calculateGPA(marks);
    
    var modalHtml = 
        '<div id="studentMarksModal" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); z-index: 9999; display: flex; align-items: center; justify-content: center; padding: 20px; backdrop-filter: blur(4px);">' +
            '<div style="background: white; border-radius: 16px; max-width: 950px; width: 100%; max-height: 90vh; overflow: auto; padding: 24px; box-shadow: 0 20px 60px rgba(0,0,0,0.3);">' +
                
                '<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; border-bottom: 3px solid #0A3D62; padding-bottom: 12px;">' +
                    '<div>' +
                        '<h3 style="margin: 0; color: #0A3D62; font-size: 20px;">' +
                            '<i class="fas fa-user-graduate"></i> ' + escapeHtml(firstMark.student_name || 'Student') +
                            (studentHasRetake ? '<span style="display: inline-block; margin-left: 8px; background: #f59e0b; color: white; font-size: 10px; padding: 2px 12px; border-radius: 12px; font-weight: 700;">⭐ R' + totalStudentRetakes + '</span>' : '') +
                        '</h3>' +
                        '<p style="margin: 4px 0 0 0; font-size: 13px; color: #64748b;">' +
                            '<i class="fas fa-id-card"></i> ' + escapeHtml(firstMark.admission_number || 'N/A') + ' &nbsp;|&nbsp; ' +
                            '<i class="fas fa-graduation-cap"></i> ' + escapeHtml(firstMark.program || 'N/A') + ' &nbsp;|&nbsp; ' +
                            '<i class="fas fa-layer-group"></i> ' + escapeHtml(firstMark.block || 'N/A') +
                            (studentHasRetake ? ' &nbsp;|&nbsp; ⭐ Retake unit(s): ' + totalStudentRetakes : '') +
                        '</p>' +
                    '</div>' +
                    '<button onclick="closeStudentMarksModal()" style="background: #dc2626; color: white; border: none; border-radius: 50%; width: 36px; height: 36px; cursor: pointer; font-size: 18px; transition: all 0.2s;" ' +
                            'onmouseover="this.style.background=\'#b91c1c\'" ' +
                            'onmouseout="this.style.background=\'#dc2626\'">' +
                        '<i class="fas fa-times"></i>' +
                    '</button>' +
                '</div>' +
                
                '<div style="display: grid; grid-template-columns: repeat(6, 1fr); gap: 10px; margin-bottom: 16px; padding: 12px; background: #f8fafc; border-radius: 8px; border: 1px solid #e5e7eb;">' +
                    '<div style="text-align: center;">' +
                        '<div style="font-size: 10px; color: #94a3b8; text-transform: uppercase;">Total Units</div>' +
                        '<div style="font-size: 20px; font-weight: 700; color: #0A3D62;">' + totalUnits + '</div>' +
                    '</div>' +
                    '<div style="text-align: center;">' +
                        '<div style="font-size: 10px; color: #94a3b8; text-transform: uppercase;">Passed</div>' +
                        '<div style="font-size: 20px; font-weight: 700; color: #10b981;">' + passedUnits + '</div>' +
                    '</div>' +
                    '<div style="text-align: center;">' +
                        '<div style="font-size: 10px; color: #94a3b8; text-transform: uppercase;">Failed</div>' +
                        '<div style="font-size: 20px; font-weight: 700; color: #dc2626;">' + failedUnits + '</div>' +
                    '</div>' +
                    '<div style="text-align: center;">' +
                        '<div style="font-size: 10px; color: #94a3b8; text-transform: uppercase;">Pending</div>' +
                        '<div style="font-size: 20px; font-weight: 700; color: #f59e0b;">' + pendingUnits + '</div>' +
                    '</div>' +
                    '<div style="text-align: center;">' +
                        '<div style="font-size: 10px; color: #94a3b8; text-transform: uppercase;">GPA</div>' +
                        '<div style="font-size: 20px; font-weight: 700; color: #6d28d9;">' + gpa.toFixed(2) + '</div>' +
                    '</div>' +
                    '<div style="text-align: center;">' +
                        '<div style="font-size: 10px; color: #94a3b8; text-transform: uppercase;">⭐ Retake</div>' +
                        '<div style="font-size: 20px; font-weight: 700; color: #f59e0b;">' + totalStudentRetakes + '</div>' +
                    '</div>' +
                '</div>' +
                
                '<div style="overflow-x: auto; margin-bottom: 16px;">' +
                    '<table style="width: 100%; border-collapse: collapse; font-size: 13px;">' +
                        '<thead style="background: #0A3D62; color: white;">' +
                            '<tr>' +
                                '<th style="padding: 10px 12px; text-align: left; width: 40px;">#</th>' +
                                '<th style="padding: 10px 12px; text-align: left;">Subject/Unit</th>' +
                                '<th style="padding: 10px 12px; text-align: center; width: 60px;">Score</th>' +
                                '<th style="padding: 10px 12px; text-align: center; width: 50px;">Grade</th>' +
                                '<th style="padding: 10px 12px; text-align: center; width: 60px;">Points</th>' +
                                '<th style="padding: 10px 12px; text-align: center; width: 80px;">Status</th>' +
                                '<th style="padding: 10px 12px; text-align: center; width: 100px;">Published</th>' +
                                '<th style="padding: 10px 12px; text-align: center; width: 130px;">Action</th>' +
                            '</tr>' +
                        '</thead>' +
                        '<tbody>' + tableRows + '</tbody>' +
                    '</table>' +
                '</div>' +
                
                '<div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; padding-top: 16px; border-top: 1px solid #e5e7eb;">' +
                    '<div style="display: flex; gap: 8px; flex-wrap: wrap;">' +
                        '<button onclick="publishStudentAllMarks(\'' + escapeHtml(admissionNumber) + '\'); closeStudentMarksModal();" ' +
                                'style="background: #10b981; color: white; border: none; padding: 8px 20px; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 13px; transition: all 0.2s;" ' +
                                'onmouseover="this.style.background=\'#059669\'" ' +
                                'onmouseout="this.style.background=\'#10b981\'">' +
                            '<i class="fas fa-check-double"></i> Publish All Units' +
                        '</button>' +
                        '<button onclick="unpublishStudentAllMarks(\'' + escapeHtml(admissionNumber) + '\'); closeStudentMarksModal();" ' +
                                'style="background: #dc2626; color: white; border: none; padding: 8px 20px; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 13px; transition: all 0.2s;" ' +
                                'onmouseover="this.style.background=\'#b91c1c\'" ' +
                                'onmouseout="this.style.background=\'#dc2626\'">' +
                            '<i class="fas fa-lock"></i> Unpublish All Units' +
                        '</button>' +
                    '</div>' +
                    '<button onclick="closeStudentMarksModal()" ' +
                            'style="background: #e5e7eb; color: #475569; border: none; padding: 8px 20px; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 13px; transition: all 0.2s;" ' +
                            'onmouseover="this.style.background=\'#d1d5db\'" ' +
                            'onmouseout="this.style.background=\'#e5e7eb\'">' +
                        '<i class="fas fa-times"></i> Close' +
                    '</button>' +
                '</div>' +
            '</div>' +
        '</div>';
    
    var existingModal = document.getElementById('studentMarksModal');
    if (existingModal) existingModal.remove();
    
    var modalContainer = document.createElement('div');
    modalContainer.innerHTML = modalHtml;
    document.body.appendChild(modalContainer.firstElementChild);
    
    document.getElementById('studentMarksModal').addEventListener('click', function(e) {
        if (e.target === this) {
            closeStudentMarksModal();
        }
    });
}

function closeStudentMarksModal() {
    var modal = document.getElementById('studentMarksModal');
    if (modal) modal.remove();
}

// ============================================================
// PUBLISH SINGLE UNIT
// ============================================================

// ============================================================
// PUBLISH SINGLE UNIT - WITH RETAKE CHECK
// ============================================================

async function publishSingleUnit(markId, subjectName, admissionNumber) {
    if (!markId) {
        if (typeof window.showNotification === 'function') {
            window.showNotification('Invalid mark ID', 'error');
        }
        return;
    }
    
    // ✅ Check if this student has retake for this unit
    const { data: retakeExists } = await window.sb
        .from('student_retakes')
        .select('id, attempt_number, exam_score')
        .eq('admission_number', admissionNumber)
        .eq('subject_name', subjectName)
        .limit(1)
        .maybeSingle();
    
    if (retakeExists) {
        // ✅ Confirm with admin that they want to publish marks that have retake
        const confirmMsg = `⚠️ This student has a retake for "${subjectName}" (Attempt #${retakeExists.attempt_number}, Score: ${retakeExists.exam_score}%).\n\nPublishing will make the retake score visible to the student.\n\nContinue?`;
        if (!confirm(confirmMsg)) {
            return;
        }
    }
    
    if (!confirm('✅ Publish "' + subjectName + '" for student ' + admissionNumber + '?')) return;
    
    try {
        if (typeof window.showLoading === 'function') window.showLoading('Publishing unit...');
        
        var result = await window.sb
            .from('student_marks')
            .update({
                published: true,
                published_at: new Date().toISOString(),
                published_by: window.currentUser?.id || null
            })
            .eq('id', markId)
            .select();
        
        if (result.error) throw result.error;
        
        var publishedMark = result.data && result.data[0];
        
        if (publishedMark) {
            try {
                var studentName = publishedMark.student_name || 'Student';
                var program = publishedMark.program || 'KRCHN';
                var block = publishedMark.block || 'N/A';
                var academicYear = publishedMark.academic_year || '2025/2026';
                
                var profileResult = await window.sb
                    .from('consolidated_user_profiles_table')
                    .select('email')
                    .eq('admission_number', admissionNumber)
                    .or('student_id.eq.' + admissionNumber)
                    .maybeSingle();
                
                if (profileResult.data && profileResult.data.email) {
                    await sendMarksPublishedEmail(
                        profileResult.data.email,
                        studentName,
                        program,
                        block,
                        1,
                        academicYear
                    );
                    console.log('✅ Email notification sent to ' + profileResult.data.email);
                }
            } catch (emailError) {
                console.error('❌ Error sending email:', emailError);
            }
        }
        
        if (typeof window.showNotification === 'function') {
            window.showNotification('✅ Published "' + subjectName + '" successfully!', 'success');
        }
        
        await loadPublishedMarks();
        viewStudentMarks(admissionNumber);
        
    } catch (error) {
        console.error('Error publishing unit:', error);
        if (typeof window.showNotification === 'function') {
            window.showNotification('❌ Error: ' + error.message, 'error');
        }
    } finally {
        if (typeof window.hideLoading === 'function') window.hideLoading();
    }
}
// ============================================================
// UNPUBLISH SINGLE UNIT
// ============================================================

async function unpublishSingleUnit(markId, subjectName, admissionNumber) {
    if (!markId) {
        if (typeof window.showNotification === 'function') {
            window.showNotification('Invalid mark ID', 'error');
        }
        return;
    }
    
    if (!confirm('🔒 Unpublish "' + subjectName + '" for student ' + admissionNumber + '?')) return;
    
    try {
        if (typeof window.showLoading === 'function') window.showLoading('Unpublishing unit...');
        
        var result = await window.sb
            .from('student_marks')
            .update({
                published: false,
                published_at: null,
                published_by: null
            })
            .eq('id', markId);
        
        if (result.error) throw result.error;
        
        if (typeof window.showNotification === 'function') {
            window.showNotification('🔒 Unpublished "' + subjectName + '"', 'info');
        }
        
        await loadPublishedMarks();
        viewStudentMarks(admissionNumber);
        
    } catch (error) {
        console.error('Error unpublishing unit:', error);
        if (typeof window.showNotification === 'function') {
            window.showNotification('❌ Error: ' + error.message, 'error');
        }
    } finally {
        if (typeof window.hideLoading === 'function') window.hideLoading();
    }
}

// ============================================================
// PUBLISH ALL MARKS FOR A STUDENT
// ============================================================

// ============================================================
// PUBLISH ALL MARKS - WITH RETAKE CHECK
// ============================================================

async function publishStudentAllMarks(admissionNumber) {
    if (!admissionNumber) {
        if (typeof window.showNotification === 'function') {
            window.showNotification('Please select a student', 'warning');
        }
        return;
    }
    
    // ✅ Check if student has any retakes
    const { data: retakes, error: retakeError } = await window.sb
        .from('student_retakes')
        .select('subject_name, attempt_number, exam_score')
        .eq('admission_number', admissionNumber);
    
    let retakeMessage = '';
    if (retakes && retakes.length > 0) {
        const retakeList = retakes.map(r => 
            `  • ${r.subject_name} (Attempt #${r.attempt_number}: ${r.exam_score}%)`
        ).join('\n');
        retakeMessage = `\n\n⚠️ STUDENT HAS RETAKE RECORDS:\n${retakeList}\n\nPublishing will make these retake scores visible.`;
    }
    
    if (!confirm('⚠️ Publish ALL marks for student ' + admissionNumber + '?' + retakeMessage)) return;
    
    try {
        if (typeof window.showLoading === 'function') window.showLoading('Publishing marks...');
        
        var result = await window.sb
            .from('student_marks')
            .update({
                published: true,
                published_at: new Date().toISOString(),
                published_by: window.currentUser?.id || null
            })
            .eq('admission_number', admissionNumber)
            .select();
        
        if (result.error) throw result.error;
        
        var count = result.data?.length || 0;
        
        if (result.data && result.data.length > 0) {
            try {
                var firstMark = result.data[0];
                var studentName = firstMark.student_name || 'Student';
                var program = firstMark.program || 'KRCHN';
                var block = firstMark.block || 'N/A';
                var academicYear = firstMark.academic_year || '2025/2026';
                
                var profileResult = await window.sb
                    .from('consolidated_user_profiles_table')
                    .select('email')
                    .eq('admission_number', admissionNumber)
                    .or('student_id.eq.' + admissionNumber)
                    .maybeSingle();
                
                if (profileResult.data && profileResult.data.email) {
                    await sendMarksPublishedEmail(
                        profileResult.data.email,
                        studentName,
                        program,
                        block,
                        count,
                        academicYear
                    );
                    console.log('✅ Email notification sent to ' + profileResult.data.email);
                }
            } catch (emailError) {
                console.error('❌ Error sending email:', emailError);
            }
        }
        
        if (typeof window.showNotification === 'function') {
            const retakeNote = retakes && retakes.length > 0 ? ` (${retakes.length} retake unit${retakes.length > 1 ? 's' : ''})` : '';
            window.showNotification('✅ Published ' + count + ' marks for ' + admissionNumber + retakeNote, 'success');
        }
        
        await loadPublishedMarks();
        
    } catch (error) {
        console.error('Error publishing student marks:', error);
        if (typeof window.showNotification === 'function') {
            window.showNotification('❌ Error: ' + error.message, 'error');
        }
    } finally {
        if (typeof window.hideLoading === 'function') window.hideLoading();
    }
}
// ============================================================
// UNPUBLISH ALL MARKS FOR A STUDENT
// ============================================================

async function unpublishStudentAllMarks(admissionNumber) {
    if (!admissionNumber) {
        if (typeof window.showNotification === 'function') {
            window.showNotification('Please select a student', 'warning');
        }
        return;
    }
    
    if (!confirm('⚠️ Unpublish ALL marks for student ' + admissionNumber + '?')) return;
    
    try {
        if (typeof window.showLoading === 'function') window.showLoading('Unpublishing marks...');
        
        var result = await window.sb
            .from('student_marks')
            .update({
                published: false,
                published_at: null,
                published_by: null
            })
            .eq('admission_number', admissionNumber)
            .select();
        
        if (result.error) throw result.error;
        
        var count = result.data?.length || 0;
        
        if (typeof window.showNotification === 'function') {
            window.showNotification('🔒 Unpublished ' + count + ' marks for ' + admissionNumber, 'info');
        }
        
        await loadPublishedMarks();
        
    } catch (error) {
        console.error('Error unpublishing student marks:', error);
        if (typeof window.showNotification === 'function') {
            window.showNotification('❌ Error: ' + error.message, 'error');
        }
    } finally {
        if (typeof window.hideLoading === 'function') window.hideLoading();
    }
}

// ============================================================
// EMAIL NOTIFICATION FUNCTION
// ============================================================

async function sendMarksPublishedEmail(studentEmail, studentName, program, block, marksCount, academicYear) {
    try {
        if (!studentEmail) {
            console.warn('⚠️ No email address for student:', studentName);
            return { success: false, error: 'No email address' };
        }
        
        console.log('📧 Sending marks published email to:', studentEmail);
        
        var programType = getProgramType(program);
        var programDisplay = getProgramDisplayName(program);
        var blockLabel = programType === 'TVET' ? 'Term' : 'Block';
        
        var htmlContent = 
'<!DOCTYPE html>' +
'<html>' +
'<head>' +
'<meta charset="UTF-8">' +
'<meta name="viewport" content="width=device-width, initial-scale=1.0">' +
'<title>Results Published - NCHSM</title>' +
'<style>' +
'body { font-family: "Segoe UI", Tahoma, sans-serif; margin: 0; padding: 0; background: #f0f4f8; }' +
'.container { max-width: 580px; margin: 0 auto; padding: 20px; }' +
'.card { background: white; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.1); }' +
'.header { background: linear-gradient(135deg, #0A3D62, #1a5276); padding: 30px 35px; text-align: center; color: white; }' +
'.header h1 { margin: 0; font-size: 24px; }' +
'.header p { margin: 4px 0 0; opacity: 0.8; }' +
'.body { padding: 30px 35px; }' +
'.greeting { background: #e8f4f8; border-radius: 12px; padding: 16px; margin-bottom: 20px; border-left: 4px solid #10b981; }' +
'.greeting p { margin: 0; font-size: 16px; color: #0A3D62; }' +
'.details { background: #f8fafc; border-radius: 12px; padding: 16px; margin-bottom: 20px; }' +
'.details h4 { margin: 0 0 12px 0; color: #1e293b; }' +
'.details table { width: 100%; border-collapse: collapse; font-size: 14px; }' +
'.details td { padding: 8px 0; border-bottom: 1px solid #e2e8f0; }' +
'.details .label { color: #64748B; font-weight: 500; }' +
'.details .value { color: #0A3D62; font-weight: 600; text-align: right; }' +
'.details tr:last-child td { border-bottom: none; }' +
'.btn { display: inline-block; background: #0A3D62; color: white; padding: 14px 28px; border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 16px; }' +
'.footer { background: #F8FAFC; padding: 20px; text-align: center; border-top: 1px solid #E2E8F0; font-size: 0.85rem; color: #64748B; }' +
'.help { background: #fef3c7; border-radius: 12px; padding: 16px; border-left: 4px solid #F59E0B; margin-top: 16px; }' +
'.help p { margin: 0; color: #78350F; font-size: 13px; }' +
'.badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 0.8rem; font-weight: 600; }' +
'.badge-success { background: #D1FAE5; color: #065F46; }' +
'@media (max-width: 480px) { .body { padding: 20px; } .header { padding: 20px; } .details td { display: block; text-align: left; } .details .value { text-align: left; margin-top: 2px; } }' +
'</style>' +
'</head>' +
'<body>' +
'<div class="container">' +
'<div class="card">' +
'<div class="header">' +
'<h1>📊 Your Results Are Published!</h1>' +
'<p>Nakuru College of Health Sciences and Management</p>' +
'</div>' +
'<div class="body">' +
'<div class="greeting">' +
'<p>👋 <strong>Dear ' + escapeHtml(studentName || 'Student') + '</strong></p>' +
'<p style="margin: 8px 0 0; color: #1e293b;">' +
'We are pleased to inform you that your academic results have been published.' +
'You can now view your marks in the student portal.' +
'</p>' +
'</div>' +
'<div class="details">' +
'<h4>📋 Results Summary</h4>' +
'<table>' +
'<tr><td class="label">📚 Program</td><td class="value">' + escapeHtml(programDisplay || program || 'N/A') + '</td></tr>' +
'<tr><td class="label">📌 ' + blockLabel + '</td><td class="value">' + escapeHtml(block || 'N/A') + '</td></tr>' +
'<tr><td class="label">📅 Academic Year</td><td class="value">' + escapeHtml(academicYear || '2025/2026') + '</td></tr>' +
'<tr><td class="label">📊 Total Units Published</td><td class="value"><span class="badge badge-success">' + marksCount + '</span></td></tr>' +
'<tr><td class="label">📅 Published Date</td><td class="value">' + new Date().toLocaleDateString('en-KE', {timeZone: 'Africa/Nairobi', weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'}) + '</td></tr>' +
'</table>' +
'</div>' +
'<div style="text-align: center; margin: 20px 0;">' +
'<a href="https://nchsm.co.ke/student.html#academic-reports" class="btn">' +
'📊 View My Results' +
'</a>' +
'</div>' +
'<div class="help">' +
'<h5>💡 Need Help?</h5>' +
'<p>📧 portal.nchsm@gmail.com<br>📞 0790969743 | 0702432987</p>' +
'</div>' +
'</div>' +
'<div class="footer">' +
'<p>📞 +254 790 969 743 &nbsp;|&nbsp; 📧 admin@nchsm.co.ke</p>' +
'<p style="font-size:0.75rem;">© ' + new Date().getFullYear() + ' Nakuru College of Health Sciences and Management</p>' +
'<p style="font-size:0.7rem; color: #94a3b8; margin-top: 8px;">This is an automated message from NCHSM Exam System.</p>' +
'</div>' +
'</div>' +
'</div>' +
'</body>' +
'</html>';

        var response = await fetch('https://lwhtjozfsmbyihenfunw.supabase.co/functions/v1/send-email', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx3aHRqb3pmc21ieWloZW5mdW53Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk2NTgxMjcsImV4cCI6MjA3NTIzNDEyN30.7Z8AYvPQwTAEEEhODlW6Xk-IR1FK3Uj5ivZS7P17Wpk',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                to: studentEmail,
                subject: '📊 Your Results Have Been Published - ' + (academicYear || '2025/2026'),
                html: htmlContent,
                from: 'NCHSM Academic Office <admin@nchsm.co.ke>'
            })
        });

        var data = await response.json();
        
        if (data.success) {
            console.log('✅ Email sent to ' + studentEmail);
            return { success: true, data: data };
        } else {
            console.error('❌ Email failed for ' + studentEmail + ':', data.error);
            return { success: false, error: data.error || 'Email sending failed' };
        }

    } catch (error) {
        console.error('❌ Notification error for ' + studentEmail + ':', error);
        return { success: false, error: error.message };
    }
}

// ============================================================
// UPDATE STATS
// ============================================================

function updateStats(marks) {
    var total = marks.length;
    
    var passed = 0;
    var failed = 0;
    var pending = 0;
    var published = 0;
    var totalScore = 0;
    var totalPoints = 0;
    var retakeCount = 0;
    
    for (var i = 0; i < marks.length; i++) {
        var m = marks[i];
        var isTVET = getProgramType(m.program) === 'TVET';
        var threshold = isTVET ? 50 : 60;
        
        if (m.final_score >= threshold) passed++;
        else if (m.final_score > 0 && m.final_score < threshold) failed++;
        else pending++;
        
        if (m.published === true) published++;
        totalScore = totalScore + (m.final_score || 0);
        totalPoints = totalPoints + (m.points || 0);
        if (m.hasRetake) retakeCount++;
    }
    
    var avg = total > 0 ? (totalScore / total) : 0;
    var gpa = total > 0 ? (totalPoints / total) : 0;
    
    var elements = {
        total: document.getElementById('pm_total_marks'),
        passed: document.getElementById('pm_passed'),
        failed: document.getElementById('pm_failed'),
        pending: document.getElementById('pm_pending'),
        avg: document.getElementById('pm_avg_score'),
        published: document.getElementById('pm_published_count'),
        attempted: document.getElementById('pm_units_attempted'),
        unitsPassed: document.getElementById('pm_units_passed'),
        unitsFailed: document.getElementById('pm_units_failed'),
        overallGpa: document.getElementById('pm_overall_gpa'),
        retakeCount: document.getElementById('pm_retake_count')
    };
    
    if (elements.total) elements.total.textContent = total;
    if (elements.passed) elements.passed.textContent = passed;
    if (elements.failed) elements.failed.textContent = failed;
    if (elements.pending) elements.pending.textContent = pending;
    if (elements.avg) elements.avg.textContent = avg.toFixed(1) + '%';
    if (elements.published) elements.published.textContent = published;
    if (elements.attempted) elements.attempted.textContent = total;
    if (elements.unitsPassed) elements.unitsPassed.textContent = passed;
    if (elements.unitsFailed) elements.unitsFailed.textContent = failed;
    if (elements.overallGpa) elements.overallGpa.textContent = gpa.toFixed(2);
    if (elements.retakeCount) elements.retakeCount.textContent = retakeCount;
    
    var summarySection = document.getElementById('pm_summary_section');
    if (summarySection) {
        summarySection.style.display = total > 0 ? 'block' : 'none';
    }
}

function updateBadge(marks) {
    var badge = document.getElementById('publishedMarksBadge');
    if (badge) {
        var count = 0;
        for (var i = 0; i < marks.length; i++) {
            if (marks[i].published === true) count++;
        }
        badge.textContent = count;
        badge.style.display = 'inline-block';
    }
}

// ============================================================
// FILTER FUNCTIONS
// ============================================================

function filterPublishedMarks() {
    var subjectFilter = document.getElementById('pm_subject_filter')?.value || 'all';
    var programFilter = document.getElementById('pm_program_filter')?.value || 'all';
    var blockFilter = document.getElementById('pm_block_filter')?.value || 'all';
    var statusFilter = document.getElementById('pm_status_filter')?.value || 'all';
    var studentFilter = document.getElementById('pm_student_filter')?.value || 'all';
    var searchTerm = document.getElementById('pm_search')?.value?.toLowerCase() || '';
    
    var filtered = PUBLISHED_STATE.marks.slice();
    
    if (PUBLISHED_STATE.currentProgramFilter === 'KRCHN') {
        filtered = filtered.filter(function(m) { return m.program === 'KRCHN'; });
    } else if (PUBLISHED_STATE.currentProgramFilter === 'TVET') {
        filtered = filtered.filter(function(m) { return m.program !== 'KRCHN'; });
    }
    
    if (studentFilter !== 'all') {
        filtered = filtered.filter(function(m) {
            return (m.admission_number || m.student_name || 'Unknown') === studentFilter;
        });
    }
    
    if (subjectFilter !== 'all') filtered = filtered.filter(function(m) { return m.subject_name === subjectFilter; });
    if (programFilter !== 'all' && PUBLISHED_STATE.currentProgramFilter === 'all') {
        filtered = filtered.filter(function(m) { return m.program === programFilter; });
    }
    if (blockFilter !== 'all') filtered = filtered.filter(function(m) { return m.block === blockFilter; });
    if (statusFilter === 'published') filtered = filtered.filter(function(m) { return m.published === true; });
    else if (statusFilter === 'draft') filtered = filtered.filter(function(m) { return m.published !== true; });
    
    if (searchTerm) {
        filtered = filtered.filter(function(m) {
            return (m.subject_name || '').toLowerCase().includes(searchTerm) ||
                (m.student_name || '').toLowerCase().includes(searchTerm) ||
                (m.admission_number || '').toLowerCase().includes(searchTerm);
        });
    }
    
    PUBLISHED_STATE.filtered = filtered;
    renderPublishedMarks();
    updateProgramCounts(filtered);
    updateGradingScaleDisplay();
}

// ============================================================
// PUBLISH ALL FILTERED MARKS
// ============================================================

async function publishAllFilteredMarks() {
    var marks = PUBLISHED_STATE.filtered;
    if (!marks || marks.length === 0) {
        if (typeof window.showNotification === 'function') {
            window.showNotification('No marks to publish', 'warning');
        }
        return;
    }
    
    var count = marks.length;
    if (!confirm('⚠️ Publish ALL ' + count + ' marks in the current filtered list?')) return;
    
    try {
        if (typeof window.showLoading === 'function') window.showLoading('Publishing marks...');
        
        var successCount = 0;
        var publishedStudents = {};
        
        for (var i = 0; i < marks.length; i++) {
            var mark = marks[i];
            var result = await window.sb
                .from('student_marks')
                .update({
                    published: true,
                    published_at: new Date().toISOString(),
                    published_by: window.currentUser?.id || null
                })
                .eq('id', mark.id);
            
            if (!result.error) {
                successCount++;
                var key = mark.admission_number;
                if (key && !publishedStudents[key]) {
                    publishedStudents[key] = {
                        admission: mark.admission_number,
                        name: mark.student_name || 'Student',
                        program: mark.program || 'KRCHN',
                        block: mark.block || 'N/A',
                        academic_year: mark.academic_year || '2025/2026',
                        marks: []
                    };
                }
                if (key) {
                    publishedStudents[key].marks.push(mark);
                }
            }
        }
        
        var studentKeys = Object.keys(publishedStudents);
        for (var j = 0; j < studentKeys.length; j++) {
            var key = studentKeys[j];
            var student = publishedStudents[key];
            try {
                var profileResult = await window.sb
                    .from('consolidated_user_profiles_table')
                    .select('email')
                    .eq('admission_number', key)
                    .or('student_id.eq.' + key)
                    .maybeSingle();
                
                if (profileResult.data && profileResult.data.email) {
                    await sendMarksPublishedEmail(
                        profileResult.data.email,
                        student.name,
                        student.program,
                        student.block,
                        student.marks.length,
                        student.academic_year
                    );
                    console.log('✅ Email sent to ' + profileResult.data.email);
                }
            } catch (emailError) {
                console.error('❌ Error sending email to student ' + key + ':', emailError);
            }
        }
        
        if (typeof window.showNotification === 'function') {
            window.showNotification('✅ Published ' + successCount + ' marks', 'success');
        }
        
        await loadPublishedMarks();
        
    } catch (error) {
        console.error('Error publishing all marks:', error);
        if (typeof window.showNotification === 'function') {
            window.showNotification('❌ Error: ' + error.message, 'error');
        }
    } finally {
        if (typeof window.hideLoading === 'function') window.hideLoading();
    }
}

// ============================================================
// UNPUBLISH ALL FILTERED MARKS
// ============================================================

async function unpublishAllFilteredMarks() {
    var marks = PUBLISHED_STATE.filtered;
    if (!marks || marks.length === 0) {
        if (typeof window.showNotification === 'function') {
            window.showNotification('No marks to unpublish', 'warning');
        }
        return;
    }
    
    var count = marks.length;
    if (!confirm('⚠️ Unpublish ALL ' + count + ' marks in the current filtered list?')) return;
    
    try {
        if (typeof window.showLoading === 'function') window.showLoading('Unpublishing marks...');
        
        var successCount = 0;
        for (var i = 0; i < marks.length; i++) {
            var mark = marks[i];
            var result = await window.sb
                .from('student_marks')
                .update({
                    published: false,
                    published_at: null,
                    published_by: null
                })
                .eq('id', mark.id);
            
            if (!result.error) successCount++;
        }
        
        if (typeof window.showNotification === 'function') {
            window.showNotification('🔒 Unpublished ' + successCount + ' marks', 'info');
        }
        
        await loadPublishedMarks();
        
    } catch (error) {
        console.error('Error unpublishing all marks:', error);
        if (typeof window.showNotification === 'function') {
            window.showNotification('❌ Error: ' + error.message, 'error');
        }
    } finally {
        if (typeof window.hideLoading === 'function') window.hideLoading();
    }
}

// ============================================================
// BULK PUBLISH MODAL FUNCTIONS
// ============================================================

function openPublishModal() {
    var modal = document.getElementById('publishModal');
    if (!modal) {
        if (typeof window.showNotification === 'function') {
            window.showNotification('Publish modal not found', 'error');
        }
        return;
    }
    populatePublishUnits();
    modal.style.display = 'flex';
}

function closePublishModal() {
    var modal = document.getElementById('publishModal');
    if (modal) modal.style.display = 'none';
}

async function populatePublishUnits(programType) {
    var select = document.getElementById('publish_unit_select');
    if (!select) return;
    
    select.innerHTML = '<option value="">Loading units...</option>';
    
    try {
        var query = window.sb.from('student_marks').select('subject_name, program, block').order('subject_name');
        
        if (programType && programType !== 'all') {
            if (programType === 'KRCHN') {
                query = query.eq('program', 'KRCHN');
            } else if (programType === 'TVET') {
                query = query.neq('program', 'KRCHN');
            }
        }
        
        var result = await query;
        
        if (result.error) throw result.error;
        
        if (!result.data || result.data.length === 0) {
            select.innerHTML = '<option value="">No units found</option>';
            return;
        }
        
        var uniqueUnits = [];
        var unitSet = {};
        for (var i = 0; i < result.data.length; i++) {
            var u = result.data[i];
            if (u.subject_name && !unitSet[u.subject_name]) {
                unitSet[u.subject_name] = true;
                uniqueUnits.push(u.subject_name);
            }
        }
        
        uniqueUnits.sort();
        
        select.innerHTML = '<option value="">-- Select Unit --</option>';
        for (var j = 0; j < uniqueUnits.length; j++) {
            var unit = uniqueUnits[j];
            var option = document.createElement('option');
            option.value = unit;
            var unitData = null;
            for (var k = 0; k < result.data.length; k++) {
                if (result.data[k].subject_name === unit) {
                    unitData = result.data[k];
                    break;
                }
            }
            var programIcon = unitData?.program === 'KRCHN' ? '🎓' : '🔧';
            option.textContent = unit + ' (' + programIcon + ' ' + (unitData?.program || 'N/A') + ')';
            select.appendChild(option);
        }
        
        setTimeout(updatePublishPreview, 100);
        
    } catch (error) {
        console.error('Error populating units:', error);
        select.innerHTML = '<option value="">Error loading units</option>';
        if (typeof window.showNotification === 'function') {
            window.showNotification('Error loading units: ' + error.message, 'error');
        }
    }
}

function updatePublishProgramOptions() {
    var programType = document.getElementById('publish_program_type')?.value || 'all';
    populatePublishUnits(programType);
}

async function updatePublishPreview() {
    var unit = document.getElementById('publish_unit_select')?.value;
    var programType = document.getElementById('publish_program_type')?.value || 'all';
    var block = document.getElementById('publish_block_filter')?.value || 'all';
    var year = document.getElementById('publish_year_filter')?.value || 'all';
    var assessmentType = document.getElementById('publish_assessment_select')?.value || 'all';
    var previewStats = document.getElementById('publish_preview_stats');
    var countDisplay = document.getElementById('publish_count_preview');
    var programPreview = document.getElementById('publish_program_preview');
    
    if (!unit) {
        if (previewStats) previewStats.style.display = 'none';
        return;
    }
    
    try {
        var query = window.sb
            .from('student_marks')
            .select('id', { count: 'exact', head: true })
            .eq('subject_name', unit);
        
        if (programType !== 'all') {
            if (programType === 'KRCHN') {
                query = query.eq('program', 'KRCHN');
            } else if (programType === 'TVET') {
                query = query.neq('program', 'KRCHN');
            }
        }
        if (block !== 'all') query = query.eq('block', block);
        if (year !== 'all') query = query.eq('academic_year', year);
        if (assessmentType !== 'all') query = query.eq('assessment_type', assessmentType);
        
        var result = await query;
        if (result.error) throw result.error;
        
        if (previewStats) {
            previewStats.style.display = 'block';
            if (countDisplay) countDisplay.textContent = result.count || 0;
            
            var programLabel = programType === 'all' ? 'All Programs' : 
                               programType === 'KRCHN' ? '🎓 KRCHN Nursing' : '🔧 TVET Programs';
            if (programPreview) {
                programPreview.textContent = 'Program: ' + programLabel + ' | Block: ' + (block === 'all' ? 'All' : block) + ' | Year: ' + (year === 'all' ? 'All' : year);
            }
        }
        
    } catch (error) {
        console.error('Error updating preview:', error);
    }
}

async function confirmPublishMarks() {
    var unit = document.getElementById('publish_unit_select')?.value;
    var programType = document.getElementById('publish_program_type')?.value || 'all';
    var block = document.getElementById('publish_block_filter')?.value || 'all';
    var year = document.getElementById('publish_year_filter')?.value || 'all';
    var assessmentType = document.getElementById('publish_assessment_select')?.value || 'all';
    
    if (!unit) {
        if (typeof window.showNotification === 'function') {
            window.showNotification('Please select a unit to publish', 'warning');
        }
        return;
    }
    
    var programLabel = 'ALL programs';
    if (programType === 'KRCHN') programLabel = 'KRCHN Nursing';
    else if (programType === 'TVET') programLabel = 'TVET Programs';
    
    var confirmMsg = '⚠️ Publish ALL marks for "' + unit + '"?\n\n' +
        'Program: ' + programLabel + '\n' +
        'Block: ' + (block === 'all' ? 'All' : block) + '\n' +
        'Year: ' + (year === 'all' ? 'All' : year) + '\n\n' +
        'This will make marks visible to ALL students.';
    
    if (!confirm(confirmMsg)) return;
    
    try {
        if (typeof window.showLoading === 'function') window.showLoading('Publishing marks...');
        
        var query = window.sb
            .from('student_marks')
            .update({
                published: true,
                published_at: new Date().toISOString(),
                published_by: window.currentUser?.id || null
            })
            .eq('subject_name', unit);
        
        if (programType !== 'all') {
            if (programType === 'KRCHN') {
                query = query.eq('program', 'KRCHN');
            } else if (programType === 'TVET') {
                query = query.neq('program', 'KRCHN');
            }
        }
        if (block !== 'all') query = query.eq('block', block);
        if (year !== 'all') query = query.eq('academic_year', year);
        if (assessmentType !== 'all') query = query.eq('assessment_type', assessmentType);
        
        var result = await query;
        if (result.error) throw result.error;
        
        var count = result.data?.length || 0;
        
        if (result.data && result.data.length > 0) {
            var studentMap = {};
            for (var i = 0; i < result.data.length; i++) {
                var mark = result.data[i];
                var key = mark.admission_number;
                if (!studentMap[key]) {
                    studentMap[key] = {
                        name: mark.student_name || 'Student',
                        program: mark.program || 'KRCHN',
                        block: mark.block || 'N/A',
                        academic_year: mark.academic_year || '2025/2026',
                        marks: []
                    };
                }
                studentMap[key].marks.push(mark);
            }
            
            var studentKeys = Object.keys(studentMap);
            for (var j = 0; j < studentKeys.length; j++) {
                var key = studentKeys[j];
                var student = studentMap[key];
                try {
                    var profileResult = await window.sb
                        .from('consolidated_user_profiles_table')
                        .select('email')
                        .eq('admission_number', key)
                        .or('student_id.eq.' + key)
                        .maybeSingle();
                    
                    if (profileResult.data && profileResult.data.email) {
                        await sendMarksPublishedEmail(
                            profileResult.data.email,
                            student.name,
                            student.program,
                            student.block,
                            student.marks.length,
                            student.academic_year
                        );
                    }
                } catch (emailError) {
                    console.error('❌ Error sending email to ' + key + ':', emailError);
                }
            }
        }
        
        if (typeof window.showNotification === 'function') {
            window.showNotification('✅ Published ' + count + ' marks for "' + unit + '"!', 'success');
        }
        
        closePublishModal();
        await loadPublishedMarks();
        
    } catch (error) {
        console.error('Error publishing marks:', error);
        if (typeof window.showNotification === 'function') {
            window.showNotification('❌ Error publishing marks: ' + error.message, 'error');
        }
    } finally {
        if (typeof window.hideLoading === 'function') window.hideLoading();
    }
}

// ============================================================
// EXPORT TO CSV WITH RETAKE DATA
// ============================================================

function exportPublishedMarksToCSV() {
    var marks = PUBLISHED_STATE.filtered;
    if (!marks || marks.length === 0) {
        if (typeof window.showNotification === 'function') {
            window.showNotification('No marks to export', 'warning');
        }
        return;
    }
    
    var headers = ['Student Name', 'Admission Number', 'Subject/Unit', 'Block/Term', 'Program', 'Score', 'Grade', 'Points', 'Comment', 'Published', 'Has Retake', 'Retake Count', 'Retake Score'];
    var csvRows = [];
    csvRows.push(headers.join(','));
    
    for (var i = 0; i < marks.length; i++) {
        var mark = marks[i];
        var comment = mark.comment || getGradeComment(mark.final_score, mark.program);
        var row = [
            '"' + (mark.student_name || '').replace(/"/g, '""') + '"',
            '"' + (mark.admission_number || '').replace(/"/g, '""') + '"',
            '"' + (mark.subject_name || '').replace(/"/g, '""') + '"',
            '"' + (mark.block || '').replace(/"/g, '""') + '"',
            '"' + (mark.program || '').replace(/"/g, '""') + '"',
            mark.final_score || 0,
            mark.grade || '-',
            mark.points || 0,
            '"' + comment + '"',
            mark.published ? 'Yes' : 'No',
            mark.hasRetake ? 'Yes' : 'No',
            mark.retakeCount || 0,
            mark.retakeScore || ''
        ];
        csvRows.push(row.join(','));
    }
    
    var csvContent = csvRows.join('\n');
    var blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    var link = document.createElement('a');
    var url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'published_marks_' + new Date().toISOString().slice(0,10) + '.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    if (typeof window.showNotification === 'function') {
        window.showNotification('✅ Exported ' + marks.length + ' marks to CSV', 'success');
    }
}

// ============================================================
// PRINT FUNCTION
// ============================================================

function printPublishedMarks() {
    var marks = PUBLISHED_STATE.filtered;
    if (!marks || marks.length === 0) {
        if (typeof window.showNotification === 'function') {
            window.showNotification('No marks to print', 'warning');
        }
        return;
    }
    
    var printWindow = window.open('', '_blank', 'width=1200,height=800');
    if (!printWindow) {
        if (typeof window.showNotification === 'function') {
            window.showNotification('Please allow popups to print', 'warning');
        }
        return;
    }
    
    var tableRows = '';
    for (var i = 0; i < marks.length; i++) {
        var mark = marks[i];
        var isTVET = getProgramType(mark.program) === 'TVET';
        var threshold = isTVET ? 50 : 60;
        var status = mark.final_score >= threshold ? 'PASS' : 'FAIL';
        var comment = mark.comment || getGradeComment(mark.final_score, mark.program);
        var programIcon = isTVET ? '🔧' : '🎓';
        var retakeBadge = mark.hasRetake ? '⭐ R' + mark.retakeCount : '';
        tableRows += 
            '<tr>' +
                '<td style="padding: 6px 10px; border: 1px solid #ddd; text-align: center;">' + (i + 1) + '</td>' +
                '<td style="padding: 6px 10px; border: 1px solid #ddd;">' + (mark.student_name || 'Unknown') + ' ' + retakeBadge + '</td>' +
                '<td style="padding: 6px 10px; border: 1px solid #ddd;">' + (mark.admission_number || '-') + '</td>' +
                '<td style="padding: 6px 10px; border: 1px solid #ddd;">' + (mark.subject_name || 'N/A') + '</td>' +
                '<td style="padding: 6px 10px; border: 1px solid #ddd; text-align: center;">' + (mark.final_score || 0) + '%</td>' +
                '<td style="padding: 6px 10px; border: 1px solid #ddd; text-align: center;">' + (mark.grade || '-') + ' (' + (mark.points || 0) + ')</td>' +
                '<td style="padding: 6px 10px; border: 1px solid #ddd; text-align: center;">' + (mark.block || '-') + '</td>' +
                '<td style="padding: 6px 10px; border: 1px solid #ddd; text-align: center;">' + programIcon + ' ' + (mark.program || 'N/A') + '</td>' +
                '<td style="padding: 6px 10px; border: 1px solid #ddd; text-align: center;">' + comment + '</td>' +
                '<td style="padding: 6px 10px; border: 1px solid #ddd; text-align: center;">' + status + '</td>' +
                '<td style="padding: 6px 10px; border: 1px solid #ddd; text-align: center;">' + (mark.published ? '✅ Published' : '📝 Draft') + '</td>' +
            '</tr>';
    }
    
    var printHtml = 
'<!DOCTYPE html>' +
'<html>' +
'<head>' +
'<title>Published Marks Report</title>' +
'<style>' +
'body { font-family: Arial, sans-serif; padding: 20px; }' +
'h1 { color: #0A3D62; border-bottom: 2px solid #0A3D62; padding-bottom: 10px; }' +
'.header-info { margin-bottom: 20px; color: #555; }' +
'table { width: 100%; border-collapse: collapse; font-size: 11px; }' +
'th { background: #0A3D62; color: white; padding: 6px 8px; border: 1px solid #0A3D62; text-align: left; }' +
'td { padding: 5px 8px; border: 1px solid #ddd; }' +
'.footer { margin-top: 20px; text-align: center; font-size: 11px; color: #888; }' +
'.print-date { text-align: right; color: #666; font-size: 11px; margin-bottom: 10px; }' +
'.grading-scale { margin-top: 15px; padding: 10px; background: #f8fafc; border: 1px solid #e5e7eb; border-radius: 6px; font-size: 11px; }' +
'</style>' +
'</head>' +
'<body>' +
'<h1>📊 Published Marks Report</h1>' +
'<div class="print-date">Generated: ' + new Date().toLocaleString() + '</div>' +
'<div class="header-info">' +
'<p><strong>Total Marks:</strong> ' + marks.length + ' | <strong>Published:</strong> ' + marks.filter(function(m) { return m.published; }).length + '</p>' +
'<p><strong>KRCHN:</strong> ' + marks.filter(function(m) { return m.program === 'KRCHN'; }).length + ' | <strong>TVET:</strong> ' + marks.filter(function(m) { return m.program !== 'KRCHN'; }).length + '</p>' +
'<p><strong>TVET Min Pass:</strong> 50% | <strong>Nursing Min Pass:</strong> 60%</p>' +
'<p><strong>⭐ Retakes:</strong> ' + marks.filter(function(m) { return m.hasRetake; }).length + '</p>' +
'</div>' +
'<div class="grading-scale">' +
'<strong>📊 TVET Grading:</strong> A (75-100%) → 4.0 | B (65-74%) → 3.0 | C (50-64%) → 2.0 | FAIL (Below 50%) → 0.0 &nbsp;|&nbsp;' +
'<strong>🎓 Nursing Grading:</strong> A (75-100%) → 4.0 | B (65-74%) → 3.0 | C (60-64%) → 2.0 | D (Below 60%) → 0.0' +
'</div>' +
'<table>' +
'<thead>' +
'<tr>' +
'<th>#</th>' +
'<th>Student</th>' +
'<th>Admission</th>' +
'<th>Unit</th>' +
'<th>Score</th>' +
'<th>Grade</th>' +
'<th>Block/Term</th>' +
'<th>Program</th>' +
'<th>Comment</th>' +
'<th>Status</th>' +
'<th>Published</th>' +
'</tr>' +
'</thead>' +
'<tbody>' + tableRows + '</tbody>' +
'</table>' +
'<div class="footer">' +
'<p>Generated from NCHSM Super Admin Dashboard</p>' +
'</div>' +
'<script>' +
'window.onload = function() { window.print(); }' +
'<\/script>' +
'</body>' +
'</html>';
    
    printWindow.document.write(printHtml);
    printWindow.document.close();
}

// ============================================================
// INITIALIZATION
// ============================================================

async function initPublishedMarks() {
    console.log('📊 Initializing Published Marks module with Retake Support...');
    
    var container = document.getElementById('publishedMarksContainer');
    if (!container) {
        console.log('Published marks container not found, skipping initialization');
        return;
    }
    
    var filterSelectors = ['pm_subject_filter', 'pm_program_filter', 'pm_block_filter', 'pm_status_filter', 'pm_student_filter'];
    for (var i = 0; i < filterSelectors.length; i++) {
        var id = filterSelectors[i];
        var el = document.getElementById(id);
        if (el) {
            el.removeEventListener('change', filterPublishedMarks);
            el.addEventListener('change', filterPublishedMarks);
        }
    }
    
    var searchInput = document.getElementById('pm_search');
    if (searchInput) {
        searchInput.removeEventListener('input', filterPublishedMarks);
        searchInput.addEventListener('input', filterPublishedMarks);
    }
    
    var programTypeSelect = document.getElementById('publish_program_type');
    if (programTypeSelect) {
        programTypeSelect.removeEventListener('change', updatePublishProgramOptions);
        programTypeSelect.addEventListener('change', updatePublishProgramOptions);
    }
    
    var unitSelect = document.getElementById('publish_unit_select');
    if (unitSelect) {
        unitSelect.removeEventListener('change', updatePublishPreview);
        unitSelect.addEventListener('change', updatePublishPreview);
    }
    
    var blockFilter = document.getElementById('publish_block_filter');
    if (blockFilter) {
        blockFilter.removeEventListener('change', updatePublishPreview);
        blockFilter.addEventListener('change', updatePublishPreview);
    }
    
    var yearFilter = document.getElementById('publish_year_filter');
    if (yearFilter) {
        yearFilter.removeEventListener('change', updatePublishPreview);
        yearFilter.addEventListener('change', updatePublishPreview);
    }
    
    var assessmentSelect = document.getElementById('publish_assessment_select');
    if (assessmentSelect) {
        assessmentSelect.removeEventListener('change', updatePublishPreview);
        assessmentSelect.addEventListener('change', updatePublishPreview);
    }
    
    // ✅ Add retake count display element if missing
    var retakeCountEl = document.getElementById('pm_retake_count');
    if (!retakeCountEl) {
        var statsEl = document.getElementById('pm_summary_section');
        if (statsEl) {
            var newRetakeEl = document.createElement('div');
            newRetakeEl.className = 'stat-item';
            newRetakeEl.innerHTML = '<span class="stat-label">⭐ Retakes</span><span class="stat-value" id="pm_retake_count">0</span>';
            statsEl.appendChild(newRetakeEl);
        }
    }
    
    await loadPublishedMarks();
    
    console.log('✅ Published Marks module initialized with Retake Support!');
    console.log('📊 TVET Grading: A (75-100%), B (65-74%), C (50-64%), FAIL (Below 50%)');
    console.log('📊 Nursing Grading: A (75-100%), B (65-74%), C (60-64%), D (Below 60%)');
    console.log('⭐ Retake Support: ENABLED (per unit)');
    console.log('📧 Email notifications enabled when publishing marks');
    console.log('📋 Per-unit publish/unpublish available in student view');
}

// ============================================================
// FORCE EXPOSE ALL FUNCTIONS GLOBALLY
// ============================================================

window.loadPublishedMarks = loadPublishedMarks;
window.filterPublishedMarks = filterPublishedMarks;
window.filterPublishedByProgram = filterPublishedByProgram;
window.publishStudentAllMarks = publishStudentAllMarks;
window.unpublishStudentAllMarks = unpublishStudentAllMarks;
window.viewStudentMarks = viewStudentMarks;
window.closeStudentMarksModal = closeStudentMarksModal;
window.publishSingleUnit = publishSingleUnit;
window.unpublishSingleUnit = unpublishSingleUnit;
window.publishAllFilteredMarks = publishAllFilteredMarks;
window.unpublishAllFilteredMarks = unpublishAllFilteredMarks;
window.exportPublishedMarksToCSV = exportPublishedMarksToCSV;
window.printPublishedMarks = printPublishedMarks;
window.openPublishModal = openPublishModal;
window.closePublishModal = closePublishModal;
window.confirmPublishMarks = confirmPublishMarks;
window.updatePublishProgramOptions = updatePublishProgramOptions;
window.updatePublishPreview = updatePublishPreview;
window.populatePublishUnits = populatePublishUnits;
window.sendMarksPublishedEmail = sendMarksPublishedEmail;
window.initPublishedMarks = initPublishedMarks;
window.loadPublishedRetakeData = loadPublishedRetakeData;
window.getStudentRetakeInfo = getStudentRetakeInfo;
window.getRetakeBadgeHtml = getRetakeBadgeHtml;
window.getRetakeHistoryHtml = getRetakeHistoryHtml;

console.log('✅ Published Marks functions exposed globally');
console.log('📊 Available: loadPublishedMarks, filterPublishedMarks, publishStudentAllMarks, etc.');
console.log('⭐ Retake support: PER UNIT - only units with retakes show badges');

// ============================================================
// AUTO-INITIALIZE
// ============================================================

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPublishedMarks);
} else {
    initPublishedMarks();
}

console.log('✅ Published Marks module loaded successfully!');
console.log('📊 Features:');
console.log('   - ✅ TVET & KRCHN Nursing support');
console.log('   - ✅ Student Group View');
console.log('   - ✅ Per-unit publish/unpublish');
console.log('   - ✅ Email notifications');
console.log('   - ✅ Bulk publish/unpublish');
console.log('   - ✅ Export to CSV & Print');
console.log('   - ✅ ⭐ Retake/Supplementary Support (PER UNIT)');
console.log('   - ✅ Retake badges only on retaken units (⭐ R1, ⭐ R2)');
console.log('   - ✅ Retake scores override original scores');
console.log('   - ✅ All functions working!');
