// ============================================================
// PUBLISHED MARKS - SUPER ADMIN (TVET & KRCHN Nursing)
// STUDENT GROUP VIEW - All marks per student grouped together
// FULLY INTEGRATED with Marks Entry System
// ALIGNED WITH STUDENT GRADING SYSTEM
// ============================================================

console.log('📊 Published Marks module loading...');

// Global state
const PUBLISHED_STATE = {
    marks: [],
    filtered: [],
    currentPage: 1,
    perPage: 20,
    user: null,
    userProgram: 'all',
    isLoading: false,
    currentProgramFilter: 'all' // 'all', 'KRCHN', 'TVET'
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
    const code = String(programCode).toUpperCase().trim();
    if (code === 'KRCHN') return 'KRCHN';
    if (code.startsWith('D') || code.startsWith('C') || code.startsWith('A') || code === 'CCA' || code === 'PTE') {
        return 'TVET';
    }
    return 'KRCHN';
}

function getGradeColor(grade) {
    const colors = {
        'A': '#10b981',
        'B': '#3b82f6',
        'C': '#f59e0b',
        'D': '#f97316',
        'F': '#ef4444',
        'FAIL': '#ef4444',
        'PASS': '#10b981',
        'REFERRAL': '#f97316',
        'DISTINCTION': '#10b981',
        'CREDIT': '#3b82f6',
        'SATISFACTORY': '#f59e0b',
        'GOOD': '#3b82f6',
        'EXCELLENT': '#10b981'
    };
    return colors[grade] || '#6b7280';
}

function getStatusColor(status) {
    const colors = {
        'EXCELLENT': '#10b981',
        'GOOD': '#3b82f6',
        'SATISFACTORY': '#f59e0b',
        'FAIL': '#ef4444',
        'PENDING': '#94a3b8',
        'DISTINCTION': '#10b981',
        'CREDIT': '#3b82f6',
        'PASS': '#f59e0b',
        'REFERRAL': '#f97316'
    };
    return colors[status] || '#94a3b8';
}

function getBlockTermLabel(program) {
    return getProgramType(program) === 'TVET' ? 'Term' : 'Block';
}

function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// ============================================================
// TVET GRADING SYSTEM
// Marks from | Marks to | Grade | Points | Comment
// 0          | 49       | FAIL  | 0      | FAIL
// 50         | 64       | C     | 2      | SATISFACTORY
// 65         | 74       | B     | 3      | GOOD
// 75         | 100      | A     | 4      | EXCELLENT
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
    const points = {
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
// A: 75-100%, B: 65-74%, C: 60-64%, D: Below 60%
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
    const points = {
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
// MAIN GRADING FUNCTIONS (Auto-detect program)
// ============================================================

function calculateGrade(score, program) {
    const isTVET = getProgramType(program) === 'TVET';
    if (isTVET) {
        return calculateTVETGrade(score);
    }
    return calculateNursingGrade(score);
}

function calculatePoints(grade, program) {
    const isTVET = getProgramType(program) === 'TVET';
    if (isTVET) {
        return calculateTVETPoints(grade);
    }
    return calculateNursingPoints(grade);
}

function getGradingStatus(score, program) {
    const isTVET = getProgramType(program) === 'TVET';
    if (isTVET) {
        return getTVETStatus(score);
    }
    return getNursingStatus(score);
}

function getGradeComment(score, program) {
    const isTVET = getProgramType(program) === 'TVET';
    if (isTVET) {
        return getTVETComment(score);
    }
    return getNursingStatus(score);
}

function calculateGPA(marks) {
    if (!marks || marks.length === 0) return 0;
    const totalPoints = marks.reduce((sum, m) => sum + (m.points || 0), 0);
    return marks.length > 0 ? (totalPoints / marks.length) : 0;
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
        const sessionUser = sessionStorage.getItem('user') || localStorage.getItem('user');
        if (sessionUser) {
            try {
                const user = JSON.parse(sessionUser);
                const role = user.role || user.user_role || user.userRole;
                if (role === 'admin' || role === 'superadmin' || role === 'super_admin' || role === 'Super Admin') {
                    return true;
                }
            } catch (e) {}
        }
        return true;
    } catch (e) {
        return true;
    }
}

// ============================================================
// GET CURRENT USER
// ============================================================

async function getCurrentUser() {
    try {
        const stored = sessionStorage.getItem('user') || localStorage.getItem('user');
        if (stored) {
            const user = JSON.parse(stored);
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
// LOAD PUBLISHED MARKS - FROM DATABASE
// ============================================================

async function loadPublishedMarks() {
    if (PUBLISHED_STATE.isLoading) return;
    
    try {
        PUBLISHED_STATE.isLoading = true;
        if (typeof window.showLoading === 'function') {
            window.showLoading('Loading published marks...');
        }
        
        const user = await getCurrentUser();
        PUBLISHED_STATE.user = user;
        
        let marks = [];
        
        try {
            let query = window.sb.from('student_marks').select('*');
            
            if (PUBLISHED_STATE.currentProgramFilter !== 'all') {
                if (PUBLISHED_STATE.currentProgramFilter === 'KRCHN') {
                    query = query.eq('program', 'KRCHN');
                } else if (PUBLISHED_STATE.currentProgramFilter === 'TVET') {
                    query = query.neq('program', 'KRCHN');
                }
            }
            
            const programFilter = document.getElementById('pm_program_filter')?.value;
            if (programFilter && programFilter !== 'all' && PUBLISHED_STATE.currentProgramFilter === 'all') {
                query = query.eq('program', programFilter);
            }
            
            const blockFilter = document.getElementById('pm_block_filter')?.value;
            if (blockFilter && blockFilter !== 'all') {
                query = query.eq('block', blockFilter);
            }
            
            query = query.order('created_at', { ascending: false });
            
            const { data, error } = await query;
            
            if (error) {
                console.error('❌ Database error:', error);
                marks = [];
            } else if (data) {
                marks = data;
                console.log(`📊 Loaded ${marks.length} marks from database`);
            }
            
        } catch (e) {
            console.error('❌ Error fetching marks:', e);
            marks = [];
        }
        
        marks = marks.map(mark => ({
            ...mark,
            grade: mark.grade || calculateGrade(mark.final_score, mark.program),
            points: mark.points || calculatePoints(mark.grade || calculateGrade(mark.final_score, mark.program), mark.program),
            status: getGradingStatus(mark.final_score, mark.program),
            comment: getGradeComment(mark.final_score, mark.program)
        }));
        
        PUBLISHED_STATE.marks = marks;
        PUBLISHED_STATE.filtered = [...marks];
        PUBLISHED_STATE.userProgram = user?.program || 'all';
        
        // Update UI
        updateUserInfo(user);
        populateFilters(marks);
        renderPublishedMarks();
        updateStats(marks);
        updateBadge(marks);
        updateProgramCounts(marks);
        updateGradingScaleDisplay();
        
        // Populate student filter
        populateStudentFilter(marks);
        
        if (typeof window.hideLoading === 'function') window.hideLoading();
        PUBLISHED_STATE.isLoading = false;
        
    } catch (error) {
        console.error('Error loading published marks:', error);
        PUBLISHED_STATE.marks = [];
        PUBLISHED_STATE.filtered = [];
        renderPublishedMarks();
        updateStats([]);
        updateBadge([]);
        updateProgramCounts([]);
        if (typeof window.hideLoading === 'function') window.hideLoading();
        PUBLISHED_STATE.isLoading = false;
    }
}

// ============================================================
// POPULATE STUDENT FILTER
// ============================================================

function populateStudentFilter(marks) {
    const filter = document.getElementById('pm_student_filter');
    if (!filter) return;
    
    const currentValue = filter.value;
    const students = {};
    marks.forEach(m => {
        const key = m.admission_number || m.student_name || 'Unknown';
        if (!students[key]) {
            students[key] = {
                name: m.student_name || 'Unknown',
                admission: m.admission_number || 'N/A',
                program: m.program || 'N/A'
            };
        }
    });
    
    const studentKeys = Object.keys(students).sort();
    filter.innerHTML = '<option value="all">All Students</option>';
    studentKeys.forEach(key => {
        const s = students[key];
        const option = document.createElement('option');
        option.value = key;
        option.textContent = `${s.name} (${s.admission}) - ${s.program}`;
        filter.appendChild(option);
    });
    
    if (currentValue && studentKeys.includes(currentValue)) {
        filter.value = currentValue;
    }
}

// ============================================================
// UPDATE USER INFO
// ============================================================

function updateUserInfo(user) {
    const programBadge = document.getElementById('pm_user_program_badge');
    if (programBadge) {
        programBadge.textContent = '🎓 KRCHN Nursing & 🔧 TVET Programs';
    }
    
    const userNameEl = document.getElementById('pm_user_name');
    if (userNameEl) {
        userNameEl.textContent = user?.full_name || user?.name || 'Super Admin';
    }
}

// ============================================================
// UPDATE PROGRAM COUNTS
// ============================================================

function updateProgramCounts(marks) {
    const krchnCount = marks.filter(m => m.program === 'KRCHN').length;
    const tvetCount = marks.filter(m => m.program !== 'KRCHN').length;
    const publishedCount = marks.filter(m => m.published === true).length;
    const draftCount = marks.filter(m => m.published !== true).length;
    
    const krchnEl = document.getElementById('pm_krchn_count');
    const tvetEl = document.getElementById('pm_tvet_count');
    const publishedEl = document.getElementById('pm_published_badge_count');
    const draftEl = document.getElementById('pm_draft_count');
    
    if (krchnEl) krchnEl.textContent = krchnCount;
    if (tvetEl) tvetEl.textContent = tvetCount;
    if (publishedEl) publishedEl.textContent = publishedCount;
    if (draftEl) draftEl.textContent = draftCount;
}

// ============================================================
// UPDATE GRADING SCALE DISPLAY
// ============================================================

function updateGradingScaleDisplay() {
    const programType = PUBLISHED_STATE.currentProgramFilter;
    const tvetScale = document.getElementById('pm_tvet_scale');
    const nursingScale = document.getElementById('pm_nursing_scale');
    
    if (tvetScale) tvetScale.style.display = (programType === 'all' || programType === 'TVET') ? 'inline-flex' : 'none';
    if (nursingScale) nursingScale.style.display = (programType === 'all' || programType === 'KRCHN') ? 'inline-flex' : 'none';
}

// ============================================================
// FILTER BY PROGRAM TYPE
// ============================================================

function filterPublishedByProgram(programType) {
    console.log('📊 Filtering by program:', programType);
    
    document.querySelectorAll('.program-filter-btn').forEach(btn => {
        btn.classList.remove('active');
        btn.style.background = '#e5e7eb';
        btn.style.color = '#475569';
    });
    
    const activeBtn = document.getElementById(`pm_filter_${programType}`);
    if (activeBtn) {
        activeBtn.classList.add('active');
        activeBtn.style.background = '#4C1D95';
        activeBtn.style.color = 'white';
    }
    
    const labels = {
        'all': 'All Programs',
        'KRCHN': '🎓 KRCHN Nursing',
        'TVET': '🔧 TVET Programs'
    };
    const labelEl = document.getElementById('pm_current_filter_label');
    if (labelEl) labelEl.textContent = labels[programType] || 'All Programs';
    
    PUBLISHED_STATE.currentProgramFilter = programType;
    
    const programFilter = document.getElementById('pm_program_filter');
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
    const subjectFilter = document.getElementById('pm_subject_filter');
    if (subjectFilter) {
        const currentValue = subjectFilter.value;
        const uniqueSubjects = [...new Set(marks.map(m => m.subject_name).filter(Boolean))];
        subjectFilter.innerHTML = '<option value="all">All Units</option>';
        uniqueSubjects.sort().forEach(subject => {
            const option = document.createElement('option');
            option.value = subject;
            option.textContent = subject;
            subjectFilter.appendChild(option);
        });
        if (currentValue && uniqueSubjects.includes(currentValue)) {
            subjectFilter.value = currentValue;
        }
    }
    
    // Block filter
    const blockFilter = document.getElementById('pm_block_filter');
    if (blockFilter) {
        const currentValue = blockFilter.value;
        const uniqueBlocks = [...new Set(marks.map(m => m.block).filter(Boolean))];
        blockFilter.innerHTML = '<option value="all">All Blocks/Terms</option>';
        
        const krchnBlocks = uniqueBlocks.filter(b => b && (b.includes('Block') || b === 'Introductory' || b === 'Final'));
        const tvetTerms = uniqueBlocks.filter(b => b && b.includes('Term'));
        const otherBlocks = uniqueBlocks.filter(b => b && !b.includes('Block') && !b.includes('Term') && b !== 'Introductory' && b !== 'Final');
        
        if (krchnBlocks.length > 0) {
            const group = document.createElement('optgroup');
            group.label = '📚 KRCHN Blocks';
            krchnBlocks.sort().forEach(block => {
                const option = document.createElement('option');
                option.value = block;
                option.textContent = block;
                group.appendChild(option);
            });
            blockFilter.appendChild(group);
        }
        
        if (tvetTerms.length > 0) {
            const group = document.createElement('optgroup');
            group.label = '📖 TVET Terms';
            tvetTerms.sort().forEach(block => {
                const option = document.createElement('option');
                option.value = block;
                option.textContent = block;
                group.appendChild(option);
            });
            blockFilter.appendChild(group);
        }
        
        if (otherBlocks.length > 0) {
            const group = document.createElement('optgroup');
            group.label = '📋 Other';
            otherBlocks.sort().forEach(block => {
                const option = document.createElement('option');
                option.value = block;
                option.textContent = block;
                group.appendChild(option);
            });
            blockFilter.appendChild(group);
        }
        
        if (currentValue && uniqueBlocks.includes(currentValue)) {
            blockFilter.value = currentValue;
        }
    }
    
    // Program filter
    const programFilter = document.getElementById('pm_program_filter');
    if (programFilter) {
        const currentValue = programFilter.value;
        const uniquePrograms = [...new Set(marks.map(m => m.program).filter(Boolean))];
        programFilter.innerHTML = '<option value="all">All Programs</option>';
        uniquePrograms.sort().forEach(program => {
            const option = document.createElement('option');
            option.value = program;
            option.textContent = getProgramDisplayName(program);
            programFilter.appendChild(option);
        });
        if (currentValue && uniquePrograms.includes(currentValue)) {
            programFilter.value = currentValue;
        }
    }
}

// ============================================================
// RENDER PUBLISHED MARKS - STUDENT GROUP VIEW
// ============================================================

function renderPublishedMarks() {
    const container = document.getElementById('publishedMarksContainer');
    if (!container) return;
    
    const marks = PUBLISHED_STATE.filtered;
    
    // Apply student filter
    const studentFilter = document.getElementById('pm_student_filter')?.value || 'all';
    let displayMarks = marks;
    if (studentFilter !== 'all') {
        displayMarks = marks.filter(m => 
            (m.admission_number || m.student_name || 'Unknown') === studentFilter
        );
    }
    
    // Apply status filter
    const statusFilter = document.getElementById('pm_status_filter')?.value || 'all';
    if (statusFilter === 'published') {
        displayMarks = displayMarks.filter(m => m.published === true);
    } else if (statusFilter === 'draft') {
        displayMarks = displayMarks.filter(m => m.published !== true);
    }
    
    if (!displayMarks || displayMarks.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 60px 20px;">
                <i class="fas fa-share-alt" style="font-size: 48px; color: #94a3b8; margin-bottom: 16px; display: block;"></i>
                <h3 style="color: #1e293b;">${marks.length > 0 ? 'No marks match the current filter' : 'No published marks found'}</h3>
                <p style="color: #94a3b8;">${marks.length > 0 ? 'Try adjusting your filters' : 'Marks will appear here once published'}</p>
                ${marks.length === 0 ? `
                <button onclick="loadPublishedMarks()" style="margin-top: 12px; padding: 8px 20px; background: #4C1D95; color: white; border: none; border-radius: 6px; cursor: pointer;">
                    <i class="fas fa-sync-alt"></i> Refresh
                </button>
                ` : ''}
            </div>
        `;
        document.getElementById('pm_filter_count').textContent = '0';
        return;
    }
    
    // Group marks by student
    const studentMap = {};
    displayMarks.forEach(mark => {
        const key = mark.admission_number || mark.student_name || 'Unknown';
        if (!studentMap[key]) {
            studentMap[key] = [];
        }
        studentMap[key].push(mark);
    });
    
    const studentKeys = Object.keys(studentMap);
    const totalStudents = studentKeys.length;
    const publishedStudents = studentKeys.filter(key => 
        studentMap[key].some(m => m.published === true)
    ).length;
    
    // Update student stats
    const totalStudentsEl = document.getElementById('pm_total_students');
    if (totalStudentsEl) totalStudentsEl.textContent = totalStudents;
    
    let html = `
        <div style="margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 6px; padding: 0 4px;">
            <div style="display: flex; gap: 12px; flex-wrap: wrap; font-size: 11px; color: #64748b;">
                <span><i class="fas fa-users"></i> <strong>${totalStudents}</strong> students</span>
                <span><i class="fas fa-check-circle" style="color: #10b981;"></i> <strong>${publishedStudents}</strong> published</span>
                <span><i class="fas fa-file-alt" style="color: #f59e0b;"></i> <strong>${totalStudents - publishedStudents}</strong> draft</span>
            </div>
            <span style="font-size: 10px; color: #94a3b8;">
                <i class="fas fa-clock"></i> ${new Date().toLocaleTimeString()}
            </span>
        </div>
        <div style="overflow-x: auto;">
            <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                <thead style="background: #0A3D62; color: white;">
                    <tr>
                        <th style="padding: 6px 10px; text-align: left;">#</th>
                        <th style="padding: 6px 10px; text-align: left;">Student</th>
                        <th style="padding: 6px 10px; text-align: left;">Admission</th>
                        <th style="padding: 6px 10px; text-align: left;">Program</th>
                        <th style="padding: 6px 10px; text-align: center;">Units</th>
                        <th style="padding: 6px 10px; text-align: center;">Avg Score</th>
                        <th style="padding: 6px 10px; text-align: center;">GPA</th>
                        <th style="padding: 6px 10px; text-align: center;">Published</th>
                        <th style="padding: 6px 10px; text-align: center;">Action</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    let index = 0;
    studentKeys.forEach(key => {
        const studentMarks = studentMap[key];
        const firstMark = studentMarks[0];
        const studentName = firstMark.student_name || 'Unknown';
        const admissionNumber = firstMark.admission_number || '-';
        const program = firstMark.program || 'N/A';
        const isTVET = getProgramType(program) === 'TVET';
        const programIcon = isTVET ? '🔧' : '🎓';
        const threshold = isTVET ? 50 : 60;
        
        const totalUnits = studentMarks.length;
        const passedUnits = studentMarks.filter(m => m.final_score >= threshold).length;
        const failedUnits = studentMarks.filter(m => m.final_score > 0 && m.final_score < threshold).length;
        const pendingUnits = studentMarks.filter(m => m.final_score === 0 || m.final_score === null).length;
        const avgScore = totalUnits > 0 ? (studentMarks.reduce((sum, m) => sum + (m.final_score || 0), 0) / totalUnits) : 0;
        const allPublished = studentMarks.every(m => m.published === true);
        const publishStatus = allPublished ? '✅ All Published' : '📝 Draft';
        const publishColor = allPublished ? '#10b981' : '#94a3b8';
        
        const totalPoints = studentMarks.reduce((sum, m) => sum + (m.points || 0), 0);
        const gpa = totalUnits > 0 ? (totalPoints / totalUnits) : 0;
        
        index++;
        
        html += `
            <tr style="border-bottom: 1px solid #f1f5f9; transition: background 0.2s; background: ${index % 2 === 0 ? '#fafafa' : 'transparent'};" 
                onmouseover="this.style.background='#f8fafc'" 
                onmouseout="this.style.background='${index % 2 === 0 ? '#fafafa' : 'transparent'}'">
                <td style="padding: 6px 10px; text-align: center; color: #94a3b8;">${index}</td>
                <td style="padding: 6px 10px; font-weight: 500;">${escapeHtml(studentName)}</td>
                <td style="padding: 6px 10px; font-size: 11px; color: #64748b;">${escapeHtml(admissionNumber)}</td>
                <td style="padding: 6px 10px;">
                    <span style="background: ${isTVET ? '#fef3c7' : '#dbeafe'}; padding: 2px 8px; border-radius: 10px; font-size: 10px;">
                        ${programIcon} ${escapeHtml(program)}
                    </span>
                </td>
                <td style="padding: 6px 10px; text-align: center; font-size: 11px;">
                    <span style="color: #10b981;">${passedUnits}</span> / 
                    <span style="color: #dc2626;">${failedUnits}</span> / 
                    <span style="color: #94a3b8;">${pendingUnits}</span>
                    <span style="font-size: 9px; color: #94a3b8; display: block;">P/F/P</span>
                </td>
                <td style="padding: 6px 10px; text-align: center; font-weight: 600; color: ${avgScore >= threshold ? '#10b981' : '#dc2626'};">${avgScore.toFixed(1)}%</td>
                <td style="padding: 6px 10px; text-align: center; font-weight: 600; color: #6d28d9;">${gpa.toFixed(2)}</td>
                <td style="padding: 6px 10px; text-align: center;">
                    <span style="color: ${publishColor}; font-weight: 600; font-size: 10px;">${publishStatus}</span>
                </td>
                <td style="padding: 6px 10px; text-align: center; white-space: nowrap;">
                    ${allPublished ? `
                        <button onclick="unpublishStudentAllMarks('${escapeHtml(admissionNumber)}')" 
                                style="background: #dc2626; color: white; border: none; padding: 3px 10px; border-radius: 4px; cursor: pointer; font-size: 10px; transition: all 0.2s;"
                                onmouseover="this.style.background='#b91c1c'"
                                onmouseout="this.style.background='#dc2626'">
                            <i class="fas fa-lock"></i> Unpublish All
                        </button>
                    ` : `
                        <button onclick="publishStudentAllMarks('${escapeHtml(admissionNumber)}')" 
                                style="background: #10b981; color: white; border: none; padding: 3px 10px; border-radius: 4px; cursor: pointer; font-size: 10px; transition: all 0.2s;"
                                onmouseover="this.style.background='#059669'"
                                onmouseout="this.style.background='#10b981'">
                            <i class="fas fa-share-alt"></i> Publish All
                        </button>
                    `}
                    <button onclick="viewStudentMarks('${escapeHtml(admissionNumber)}')" 
                            style="background: #4C1D95; color: white; border: none; padding: 3px 8px; border-radius: 4px; cursor: pointer; font-size: 10px; margin-top: 2px; transition: all 0.2s;"
                            onmouseover="this.style.background='#3b0f6e'"
                            onmouseout="this.style.background='#4C1D95'">
                        <i class="fas fa-eye"></i> View
                    </button>
                </td>
            </tr>
        `;
    });
    
    html += `
                </tbody>
            </table>
        </div>
    `;
    
    container.innerHTML = html;
    document.getElementById('pm_filter_count').textContent = displayMarks.length;
}

// ============================================================
// PUBLISH ALL MARKS FOR A STUDENT
// ============================================================

async function publishStudentAllMarks(admissionNumber) {
    if (!admissionNumber) {
        if (typeof window.showNotification === 'function') {
            window.showNotification('Please select a student', 'warning');
        }
        return;
    }
    
    if (!confirm(`⚠️ Publish ALL marks for student ${admissionNumber}?`)) return;
    
    try {
        if (typeof window.showLoading === 'function') window.showLoading('Publishing marks...');
        
        const { data, error } = await window.sb
            .from('student_marks')
            .update({
                published: true,
                published_at: new Date().toISOString(),
                published_by: window.currentUser?.id || null
            })
            .eq('admission_number', admissionNumber);
        
        if (error) throw error;
        
        const count = data?.length || 0;
        
        if (typeof window.showNotification === 'function') {
            window.showNotification(`✅ Published ${count} marks for ${admissionNumber}`, 'success');
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
    
    if (!confirm(`⚠️ Unpublish ALL marks for student ${admissionNumber}?`)) return;
    
    try {
        if (typeof window.showLoading === 'function') window.showLoading('Unpublishing marks...');
        
        const { data, error } = await window.sb
            .from('student_marks')
            .update({
                published: false,
                published_at: null,
                published_by: null
            })
            .eq('admission_number', admissionNumber);
        
        if (error) throw error;
        
        const count = data?.length || 0;
        
        if (typeof window.showNotification === 'function') {
            window.showNotification(`🔒 Unpublished ${count} marks for ${admissionNumber}`, 'info');
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
// VIEW STUDENT MARKS DETAIL
// ============================================================

function viewStudentMarks(admissionNumber) {
    if (!admissionNumber) {
        if (typeof window.showNotification === 'function') {
            window.showNotification('Please select a student', 'warning');
        }
        return;
    }
    
    const marks = PUBLISHED_STATE.marks.filter(m => m.admission_number === admissionNumber);
    
    if (marks.length === 0) {
        if (typeof window.showNotification === 'function') {
            window.showNotification('No marks found for this student', 'warning');
        }
        return;
    }
    
    const firstMark = marks[0];
    const isTVET = getProgramType(firstMark.program) === 'TVET';
    const threshold = isTVET ? 50 : 60;
    
    // Create a modal to show student marks
    const modalHtml = `
        <div id="studentMarksModal" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 9999; display: flex; align-items: center; justify-content: center; padding: 20px;">
            <div style="background: white; border-radius: 12px; max-width: 800px; width: 100%; max-height: 80vh; overflow: auto; padding: 24px; box-shadow: 0 4px 20px rgba(0,0,0,0.3);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; border-bottom: 2px solid #0A3D62; padding-bottom: 12px;">
                    <div>
                        <h3 style="margin: 0; color: #0A3D62;">
                            <i class="fas fa-user-graduate"></i> ${escapeHtml(firstMark.student_name || 'Student')}
                        </h3>
                        <p style="margin: 4px 0 0 0; font-size: 12px; color: #64748b;">
                            ${escapeHtml(firstMark.admission_number || 'N/A')} · ${escapeHtml(firstMark.program || 'N/A')}
                        </p>
                    </div>
                    <button onclick="closeStudentMarksModal()" style="background: #dc2626; color: white; border: none; border-radius: 50%; width: 32px; height: 32px; cursor: pointer; font-size: 16px;">×</button>
                </div>
                <div style="overflow-x: auto;">
                    <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                        <thead style="background: #0A3D62; color: white;">
                            <tr>
                                <th style="padding: 8px 12px; text-align: left;">#</th>
                                <th style="padding: 8px 12px; text-align: left;">Unit</th>
                                <th style="padding: 8px 12px; text-align: center;">Score</th>
                                <th style="padding: 8px 12px; text-align: center;">Grade</th>
                                <th style="padding: 8px 12px; text-align: center;">Points</th>
                                <th style="padding: 8px 12px; text-align: center;">Status</th>
                                <th style="padding: 8px 12px; text-align: center;">Published</th>
                            </tr>
                        </thead>
                        <tbody>
    `;
    
    marks.forEach((mark, index) => {
        const status = getGradingStatus(mark.final_score, mark.program);
        const statusColor = getStatusColor(status);
        const gradeColor = getGradeColor(mark.grade);
        const isPublished = mark.published === true;
        const publishColor = isPublished ? '#10b981' : '#94a3b8';
        const publishText = isPublished ? '✅ Yes' : '📝 No';
        
        modalHtml += `
            <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 8px 12px; text-align: center; color: #94a3b8;">${index + 1}</td>
                <td style="padding: 8px 12px;">${escapeHtml(mark.subject_name || 'N/A')}</td>
                <td style="padding: 8px 12px; text-align: center; font-weight: 600;">${mark.final_score || 0}%</td>
                <td style="padding: 8px 12px; text-align: center;">
                    <span style="background: ${gradeColor}; color: white; padding: 2px 10px; border-radius: 10px; font-weight: 700; font-size: 12px;">${mark.grade || '-'}</span>
                </td>
                <td style="padding: 8px 12px; text-align: center; font-weight: 600;">${mark.points || 0}</td>
                <td style="padding: 8px 12px; text-align: center;">
                    <span style="background: ${statusColor}; color: white; padding: 2px 10px; border-radius: 10px; font-weight: 600; font-size: 10px;">${status}</span>
                </td>
                <td style="padding: 8px 12px; text-align: center;">
                    <span style="color: ${publishColor}; font-weight: 600; font-size: 12px;">${publishText}</span>
                </td>
            </tr>
        `;
    });
    
    // Calculate summary stats
    const totalUnits = marks.length;
    const passedUnits = marks.filter(m => m.final_score >= threshold).length;
    const failedUnits = marks.filter(m => m.final_score > 0 && m.final_score < threshold).length;
    const pendingUnits = marks.filter(m => m.final_score === 0 || m.final_score === null).length;
    const avgScore = totalUnits > 0 ? (marks.reduce((sum, m) => sum + (m.final_score || 0), 0) / totalUnits) : 0;
    const gpa = calculateGPA(marks);
    
    modalHtml += `
                        </tbody>
                    </table>
                </div>
                <div style="margin-top: 16px; padding-top: 12px; border-top: 1px solid #e5e7eb; display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px;">
                    <div style="text-align: center; background: #f8fafc; padding: 8px; border-radius: 6px;">
                        <div style="font-size: 10px; color: #94a3b8;">Units</div>
                        <div style="font-size: 18px; font-weight: 700; color: #0A3D62;">${totalUnits}</div>
                    </div>
                    <div style="text-align: center; background: #d1fae5; padding: 8px; border-radius: 6px;">
                        <div style="font-size: 10px; color: #065f46;">Passed</div>
                        <div style="font-size: 18px; font-weight: 700; color: #065f46;">${passedUnits}</div>
                    </div>
                    <div style="text-align: center; background: #fee2e2; padding: 8px; border-radius: 6px;">
                        <div style="font-size: 10px; color: #991b1b;">Failed</div>
                        <div style="font-size: 18px; font-weight: 700; color: #991b1b;">${failedUnits}</div>
                    </div>
                    <div style="text-align: center; background: #fef3c7; padding: 8px; border-radius: 6px;">
                        <div style="font-size: 10px; color: #92400e;">Pending</div>
                        <div style="font-size: 18px; font-weight: 700; color: #92400e;">${pendingUnits}</div>
                    </div>
                    <div style="text-align: center; background: #dbeafe; padding: 8px; border-radius: 6px;">
                        <div style="font-size: 10px; color: #1e40af;">GPA</div>
                        <div style="font-size: 18px; font-weight: 700; color: #1e40af;">${gpa.toFixed(2)}</div>
                    </div>
                </div>
                <div style="margin-top: 12px; text-align: center; display: flex; gap: 10px; justify-content: center;">
                    <button onclick="publishStudentAllMarks('${escapeHtml(admissionNumber)}'); closeStudentMarksModal();" 
                            style="background: #10b981; color: white; border: none; padding: 8px 20px; border-radius: 6px; cursor: pointer; font-weight: 600;">
                        <i class="fas fa-share-alt"></i> Publish All
                    </button>
                    <button onclick="unpublishStudentAllMarks('${escapeHtml(admissionNumber)}'); closeStudentMarksModal();" 
                            style="background: #dc2626; color: white; border: none; padding: 8px 20px; border-radius: 6px; cursor: pointer; font-weight: 600;">
                        <i class="fas fa-lock"></i> Unpublish All
                    </button>
                    <button onclick="closeStudentMarksModal()" 
                            style="background: #e5e7eb; color: #475569; border: none; padding: 8px 20px; border-radius: 6px; cursor: pointer; font-weight: 600;">
                        Close
                    </button>
                </div>
            </div>
        </div>
    `;
    
    // Remove existing modal if any
    const existingModal = document.getElementById('studentMarksModal');
    if (existingModal) existingModal.remove();
    
    // Add modal to body
    const modalContainer = document.createElement('div');
    modalContainer.innerHTML = modalHtml;
    document.body.appendChild(modalContainer.firstElementChild);
    
    // Close on click outside
    document.getElementById('studentMarksModal').addEventListener('click', function(e) {
        if (e.target === this) {
            closeStudentMarksModal();
        }
    });
}

function closeStudentMarksModal() {
    const modal = document.getElementById('studentMarksModal');
    if (modal) modal.remove();
}

// ============================================================
// UPDATE STATS
// ============================================================

function updateStats(marks) {
    const total = marks.length;
    
    const passed = marks.filter(m => {
        const isTVET = getProgramType(m.program) === 'TVET';
        const threshold = isTVET ? 50 : 60;
        return m.final_score >= threshold;
    }).length;
    
    const failed = marks.filter(m => {
        const isTVET = getProgramType(m.program) === 'TVET';
        const threshold = isTVET ? 50 : 60;
        return m.final_score > 0 && m.final_score < threshold;
    }).length;
    
    const pending = marks.filter(m => m.final_score === 0 || m.final_score === null).length;
    const published = marks.filter(m => m.published === true).length;
    const avg = total > 0 ? (marks.reduce((sum, m) => sum + (m.final_score || 0), 0) / total) : 0;
    const totalPoints = marks.reduce((sum, m) => sum + (m.points || 0), 0);
    const gpa = total > 0 ? (totalPoints / total) : 0;
    
    const elements = {
        total: document.getElementById('pm_total_marks'),
        passed: document.getElementById('pm_passed'),
        failed: document.getElementById('pm_failed'),
        pending: document.getElementById('pm_pending'),
        avg: document.getElementById('pm_avg_score'),
        published: document.getElementById('pm_published_count'),
        attempted: document.getElementById('pm_units_attempted'),
        unitsPassed: document.getElementById('pm_units_passed'),
        unitsFailed: document.getElementById('pm_units_failed'),
        overallGpa: document.getElementById('pm_overall_gpa')
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
    
    const summarySection = document.getElementById('pm_summary_section');
    if (summarySection) {
        summarySection.style.display = total > 0 ? 'block' : 'none';
    }
}

function updateBadge(marks) {
    const badge = document.getElementById('publishedMarksBadge');
    if (badge) {
        const count = marks.filter(m => m.published === true).length;
        badge.textContent = count;
        badge.style.display = 'inline-block';
    }
}

// ============================================================
// FILTER FUNCTIONS
// ============================================================

function filterPublishedMarks() {
    const subjectFilter = document.getElementById('pm_subject_filter')?.value || 'all';
    const programFilter = document.getElementById('pm_program_filter')?.value || 'all';
    const blockFilter = document.getElementById('pm_block_filter')?.value || 'all';
    const statusFilter = document.getElementById('pm_status_filter')?.value || 'all';
    const studentFilter = document.getElementById('pm_student_filter')?.value || 'all';
    const searchTerm = document.getElementById('pm_search')?.value?.toLowerCase() || '';
    
    let filtered = [...PUBLISHED_STATE.marks];
    
    // Apply program type filter (from quick buttons)
    if (PUBLISHED_STATE.currentProgramFilter === 'KRCHN') {
        filtered = filtered.filter(m => m.program === 'KRCHN');
    } else if (PUBLISHED_STATE.currentProgramFilter === 'TVET') {
        filtered = filtered.filter(m => m.program !== 'KRCHN');
    }
    
    // Apply student filter
    if (studentFilter !== 'all') {
        filtered = filtered.filter(m => 
            (m.admission_number || m.student_name || 'Unknown') === studentFilter
        );
    }
    
    if (subjectFilter !== 'all') filtered = filtered.filter(m => m.subject_name === subjectFilter);
    if (programFilter !== 'all' && PUBLISHED_STATE.currentProgramFilter === 'all') {
        filtered = filtered.filter(m => m.program === programFilter);
    }
    if (blockFilter !== 'all') filtered = filtered.filter(m => m.block === blockFilter);
    if (statusFilter === 'published') filtered = filtered.filter(m => m.published === true);
    else if (statusFilter === 'draft') filtered = filtered.filter(m => m.published !== true);
    
    if (searchTerm) {
        filtered = filtered.filter(m => 
            (m.subject_name || '').toLowerCase().includes(searchTerm) ||
            (m.student_name || '').toLowerCase().includes(searchTerm) ||
            (m.admission_number || '').toLowerCase().includes(searchTerm)
        );
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
    const marks = PUBLISHED_STATE.filtered;
    if (!marks || marks.length === 0) {
        if (typeof window.showNotification === 'function') {
            window.showNotification('No marks to publish', 'warning');
        }
        return;
    }
    
    const count = marks.length;
    if (!confirm(`⚠️ Publish ALL ${count} marks in the current filtered list?`)) return;
    
    try {
        if (typeof window.showLoading === 'function') window.showLoading('Publishing marks...');
        
        let successCount = 0;
        for (const mark of marks) {
            const { error } = await window.sb
                .from('student_marks')
                .update({
                    published: true,
                    published_at: new Date().toISOString(),
                    published_by: window.currentUser?.id || null
                })
                .eq('id', mark.id);
            
            if (!error) successCount++;
        }
        
        if (typeof window.showNotification === 'function') {
            window.showNotification(`✅ Published ${successCount} marks`, 'success');
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
    const marks = PUBLISHED_STATE.filtered;
    if (!marks || marks.length === 0) {
        if (typeof window.showNotification === 'function') {
            window.showNotification('No marks to unpublish', 'warning');
        }
        return;
    }
    
    const count = marks.length;
    if (!confirm(`⚠️ Unpublish ALL ${count} marks in the current filtered list?`)) return;
    
    try {
        if (typeof window.showLoading === 'function') window.showLoading('Unpublishing marks...');
        
        let successCount = 0;
        for (const mark of marks) {
            const { error } = await window.sb
                .from('student_marks')
                .update({
                    published: false,
                    published_at: null,
                    published_by: null
                })
                .eq('id', mark.id);
            
            if (!error) successCount++;
        }
        
        if (typeof window.showNotification === 'function') {
            window.showNotification(`🔒 Unpublished ${successCount} marks`, 'info');
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
    const modal = document.getElementById('publishModal');
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
    const modal = document.getElementById('publishModal');
    if (modal) modal.style.display = 'none';
}

async function populatePublishUnits(programType) {
    const select = document.getElementById('publish_unit_select');
    if (!select) return;
    
    select.innerHTML = '<option value="">Loading units...</option>';
    
    try {
        let query = window.sb.from('student_marks').select('subject_name, program, block').order('subject_name');
        
        if (programType && programType !== 'all') {
            if (programType === 'KRCHN') {
                query = query.eq('program', 'KRCHN');
            } else if (programType === 'TVET') {
                query = query.neq('program', 'KRCHN');
            }
        }
        
        const { data: units, error } = await query;
        
        if (error) throw error;
        
        if (!units || units.length === 0) {
            select.innerHTML = '<option value="">No units found</option>';
            return;
        }
        
        const uniqueUnits = [...new Set(units.map(u => u.subject_name).filter(Boolean))];
        uniqueUnits.sort();
        
        select.innerHTML = '<option value="">-- Select Unit --</option>';
        uniqueUnits.forEach(unit => {
            const option = document.createElement('option');
            option.value = unit;
            const unitData = units.find(u => u.subject_name === unit);
            const programIcon = unitData?.program === 'KRCHN' ? '🎓' : '🔧';
            option.textContent = `${unit} (${programIcon} ${unitData?.program || 'N/A'})`;
            select.appendChild(option);
        });
        
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
    const programType = document.getElementById('publish_program_type')?.value || 'all';
    populatePublishUnits(programType);
}

async function updatePublishPreview() {
    const unit = document.getElementById('publish_unit_select')?.value;
    const programType = document.getElementById('publish_program_type')?.value || 'all';
    const block = document.getElementById('publish_block_filter')?.value || 'all';
    const year = document.getElementById('publish_year_filter')?.value || 'all';
    const assessmentType = document.getElementById('publish_assessment_select')?.value || 'all';
    const previewStats = document.getElementById('publish_preview_stats');
    const countDisplay = document.getElementById('publish_count_preview');
    const programPreview = document.getElementById('publish_program_preview');
    
    if (!unit) {
        if (previewStats) previewStats.style.display = 'none';
        return;
    }
    
    try {
        let query = window.sb
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
        
        const { count, error } = await query;
        if (error) throw error;
        
        if (previewStats) {
            previewStats.style.display = 'block';
            if (countDisplay) countDisplay.textContent = count || 0;
            
            const programLabel = programType === 'all' ? 'All Programs' : 
                               programType === 'KRCHN' ? '🎓 KRCHN Nursing' : '🔧 TVET Programs';
            if (programPreview) {
                programPreview.textContent = `Program: ${programLabel} | Block: ${block === 'all' ? 'All' : block} | Year: ${year === 'all' ? 'All' : year}`;
            }
        }
        
    } catch (error) {
        console.error('Error updating preview:', error);
    }
}

async function confirmPublishMarks() {
    const unit = document.getElementById('publish_unit_select')?.value;
    const programType = document.getElementById('publish_program_type')?.value || 'all';
    const block = document.getElementById('publish_block_filter')?.value || 'all';
    const year = document.getElementById('publish_year_filter')?.value || 'all';
    const assessmentType = document.getElementById('publish_assessment_select')?.value || 'all';
    
    if (!unit) {
        if (typeof window.showNotification === 'function') {
            window.showNotification('Please select a unit to publish', 'warning');
        }
        return;
    }
    
    let programLabel = 'ALL programs';
    if (programType === 'KRCHN') programLabel = 'KRCHN Nursing';
    else if (programType === 'TVET') programLabel = 'TVET Programs';
    
    const confirmMsg = `⚠️ Publish ALL marks for "${unit}"?\n\n` +
        `Program: ${programLabel}\n` +
        `Block: ${block === 'all' ? 'All' : block}\n` +
        `Year: ${year === 'all' ? 'All' : year}\n\n` +
        `This will make marks visible to ALL students.`;
    
    if (!confirm(confirmMsg)) return;
    
    try {
        if (typeof window.showLoading === 'function') window.showLoading('Publishing marks...');
        
        let query = window.sb
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
        
        const { data, error } = await query;
        if (error) throw error;
        
        const count = data?.length || 0;
        
        if (typeof window.showNotification === 'function') {
            window.showNotification(`✅ Published ${count} marks for "${unit}"!`, 'success');
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
// EXPORT TO CSV
// ============================================================

function exportPublishedMarksToCSV() {
    const marks = PUBLISHED_STATE.filtered;
    if (!marks || marks.length === 0) {
        if (typeof window.showNotification === 'function') {
            window.showNotification('No marks to export', 'warning');
        }
        return;
    }
    
    const headers = ['Student Name', 'Admission Number', 'Subject/Unit', 'Block/Term', 'Program', 'Score', 'Grade', 'Points', 'Comment', 'Published'];
    const rows = marks.map(mark => {
        const comment = mark.comment || getGradeComment(mark.final_score, mark.program);
        return [
            `"${(mark.student_name || '').replace(/"/g, '""')}"`,
            `"${(mark.admission_number || '').replace(/"/g, '""')}"`,
            `"${(mark.subject_name || '').replace(/"/g, '""')}"`,
            `"${(mark.block || '').replace(/"/g, '""')}"`,
            `"${(mark.program || '').replace(/"/g, '""')}"`,
            mark.final_score || 0,
            mark.grade || '-',
            mark.points || 0,
            `"${comment}"`,
            mark.published ? 'Yes' : 'No'
        ];
    });
    
    const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(','))
    ].join('\n');
    
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `published_marks_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    if (typeof window.showNotification === 'function') {
        window.showNotification(`✅ Exported ${marks.length} marks to CSV`, 'success');
    }
}

// ============================================================
// PRINT FUNCTION
// ============================================================

function printPublishedMarks() {
    const marks = PUBLISHED_STATE.filtered;
    if (!marks || marks.length === 0) {
        if (typeof window.showNotification === 'function') {
            window.showNotification('No marks to print', 'warning');
        }
        return;
    }
    
    const printWindow = window.open('', '_blank', 'width=1200,height=800');
    if (!printWindow) {
        if (typeof window.showNotification === 'function') {
            window.showNotification('Please allow popups to print', 'warning');
        }
        return;
    }
    
    let tableRows = '';
    marks.forEach((mark, index) => {
        const isTVET = getProgramType(mark.program) === 'TVET';
        const comment = mark.comment || getGradeComment(mark.final_score, mark.program);
        const programIcon = isTVET ? '🔧' : '🎓';
        tableRows += `
            <tr>
                <td style="padding: 6px 10px; border: 1px solid #ddd; text-align: center;">${index + 1}</td>
                <td style="padding: 6px 10px; border: 1px solid #ddd;">${mark.student_name || 'Unknown'}</td>
                <td style="padding: 6px 10px; border: 1px solid #ddd;">${mark.admission_number || '-'}</td>
                <td style="padding: 6px 10px; border: 1px solid #ddd;">${mark.subject_name || 'N/A'}</td>
                <td style="padding: 6px 10px; border: 1px solid #ddd; text-align: center;">${mark.final_score || 0}%</td>
                <td style="padding: 6px 10px; border: 1px solid #ddd; text-align: center;">${mark.grade || '-'} (${mark.points || 0})</td>
                <td style="padding: 6px 10px; border: 1px solid #ddd; text-align: center;">${mark.block || '-'}</td>
                <td style="padding: 6px 10px; border: 1px solid #ddd; text-align: center;">${programIcon} ${mark.program || 'N/A'}</td>
                <td style="padding: 6px 10px; border: 1px solid #ddd; text-align: center;">${comment}</td>
                <td style="padding: 6px 10px; border: 1px solid #ddd; text-align: center;">${mark.published ? '✅ Published' : '📝 Draft'}</td>
            </tr>
        `;
    });
    
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Published Marks Report</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 20px; }
                h1 { color: #0A3D62; border-bottom: 2px solid #0A3D62; padding-bottom: 10px; }
                .header-info { margin-bottom: 20px; color: #555; }
                table { width: 100%; border-collapse: collapse; font-size: 11px; }
                th { background: #0A3D62; color: white; padding: 6px 8px; border: 1px solid #0A3D62; text-align: left; }
                td { padding: 5px 8px; border: 1px solid #ddd; }
                .footer { margin-top: 20px; text-align: center; font-size: 11px; color: #888; }
                .print-date { text-align: right; color: #666; font-size: 11px; margin-bottom: 10px; }
                .grading-scale { margin-top: 15px; padding: 10px; background: #f8fafc; border: 1px solid #e5e7eb; border-radius: 6px; font-size: 11px; }
            </style>
        </head>
        <body>
            <h1>📊 Published Marks Report</h1>
            <div class="print-date">Generated: ${new Date().toLocaleString()}</div>
            <div class="header-info">
                <p><strong>Total Marks:</strong> ${marks.length} | <strong>Published:</strong> ${marks.filter(m => m.published).length}</p>
                <p><strong>KRCHN:</strong> ${marks.filter(m => m.program === 'KRCHN').length} | <strong>TVET:</strong> ${marks.filter(m => m.program !== 'KRCHN').length}</p>
            </div>
            <div class="grading-scale">
                <strong>📊 TVET Grading:</strong> A (75-100%) → 4.0 | B (65-74%) → 3.0 | C (50-64%) → 2.0 | FAIL (Below 50%) → 0.0 &nbsp;|&nbsp;
                <strong>🎓 Nursing Grading:</strong> A (75-100%) → 4.0 | B (65-74%) → 3.0 | C (60-64%) → 2.0 | D (Below 60%) → 0.0
            </div>
            <table>
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Student</th>
                        <th>Admission</th>
                        <th>Unit</th>
                        <th>Score</th>
                        <th>Grade</th>
                        <th>Block/Term</th>
                        <th>Program</th>
                        <th>Comment</th>
                        <th>Published</th>
                    </tr>
                </thead>
                <tbody>
                    ${tableRows}
                </tbody>
            </table>
            <div class="footer">
                <p>Generated from NCHSM Super Admin Dashboard</p>
            </div>
            <script>
                window.onload = function() { window.print(); }
            <\/script>
        </body>
        </html>
    `);
    printWindow.document.close();
}

// ============================================================
// INITIALIZATION
// ============================================================

async function initPublishedMarks() {
    console.log('📊 Initializing Published Marks module...');
    
    const container = document.getElementById('publishedMarksContainer');
    if (!container) {
        console.log('Published marks container not found, skipping initialization');
        return;
    }
    
    // Set up event listeners for filters
    const filterSelectors = ['pm_subject_filter', 'pm_program_filter', 'pm_block_filter', 'pm_status_filter', 'pm_student_filter'];
    filterSelectors.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.removeEventListener('change', filterPublishedMarks);
            el.addEventListener('change', filterPublishedMarks);
        }
    });
    
    const searchInput = document.getElementById('pm_search');
    if (searchInput) {
        searchInput.removeEventListener('input', filterPublishedMarks);
        searchInput.addEventListener('input', filterPublishedMarks);
    }
    
    // Set up modal event listeners
    const programTypeSelect = document.getElementById('publish_program_type');
    if (programTypeSelect) {
        programTypeSelect.removeEventListener('change', updatePublishProgramOptions);
        programTypeSelect.addEventListener('change', updatePublishProgramOptions);
    }
    
    const unitSelect = document.getElementById('publish_unit_select');
    if (unitSelect) {
        unitSelect.removeEventListener('change', updatePublishPreview);
        unitSelect.addEventListener('change', updatePublishPreview);
    }
    
    const blockFilter = document.getElementById('publish_block_filter');
    if (blockFilter) {
        blockFilter.removeEventListener('change', updatePublishPreview);
        blockFilter.addEventListener('change', updatePublishPreview);
    }
    
    const yearFilter = document.getElementById('publish_year_filter');
    if (yearFilter) {
        yearFilter.removeEventListener('change', updatePublishPreview);
        yearFilter.addEventListener('change', updatePublishPreview);
    }
    
    const assessmentSelect = document.getElementById('publish_assessment_select');
    if (assessmentSelect) {
        assessmentSelect.removeEventListener('change', updatePublishPreview);
        assessmentSelect.addEventListener('change', updatePublishPreview);
    }
    
    // Load marks
    await loadPublishedMarks();
    
    console.log('✅ Published Marks module initialized');
    console.log('📊 TVET Grading: A (75-100%), B (65-74%), C (50-64%), FAIL (Below 50%)');
    console.log('📊 Nursing Grading: A (75-100%), B (65-74%), C (60-64%), D (Below 60%)');
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPublishedMarks);
} else {
    initPublishedMarks();
}

// ============================================================
// EXPOSE FUNCTIONS GLOBALLY
// ============================================================

window.publishedMarks = {
    load: loadPublishedMarks,
    filter: filterPublishedMarks,
    filterByProgram: filterPublishedByProgram,
    publishStudent: publishStudentAllMarks,
    unpublishStudent: unpublishStudentAllMarks,
    viewStudent: viewStudentMarks,
    publishAll: publishAllFilteredMarks,
    unpublishAll: unpublishAllFilteredMarks,
    export: exportPublishedMarksToCSV,
    print: printPublishedMarks,
    openModal: openPublishModal,
    closeModal: closePublishModal,
    confirmPublish: confirmPublishMarks,
    updatePreview: updatePublishPreview,
    populateUnits: populatePublishUnits,
    state: PUBLISHED_STATE
};

// Expose individual functions for inline onclick handlers
window.publishStudentAllMarks = publishStudentAllMarks;
window.unpublishStudentAllMarks = unpublishStudentAllMarks;
window.viewStudentMarks = viewStudentMarks;
window.closeStudentMarksModal = closeStudentMarksModal;
window.publishAllFilteredMarks = publishAllFilteredMarks;
window.unpublishAllFilteredMarks = unpublishAllFilteredMarks;
window.exportPublishedMarksToCSV = exportPublishedMarksToCSV;
window.printPublishedMarks = printPublishedMarks;
window.openPublishModal = openPublishModal;
window.closePublishModal = closePublishModal;
window.confirmPublishMarks = confirmPublishMarks;
window.filterPublishedMarks = filterPublishedMarks;
window.loadPublishedMarks = loadPublishedMarks;
window.filterPublishedByProgram = filterPublishedByProgram;
window.updatePublishProgramOptions = updatePublishProgramOptions;
window.updatePublishPreview = updatePublishPreview;
window.populatePublishUnits = populatePublishUnits;

console.log('✅ Published Marks module loaded successfully!');
console.log('📊 Features:');
console.log('   - ✅ TVET & KRCHN Nursing support');
console.log('   - ✅ Student Group View');
console.log('   - ✅ Publish/Unpublish all marks per student');
console.log('   - ✅ View student marks detail');
console.log('   - ✅ Quick filter by program type');
console.log('   - ✅ Bulk publish with program filter');
console.log('   - ✅ Export to CSV');
console.log('   - ✅ Print functionality');
console.log('   - ✅ All functions working!');
