// ============================================================
// PUBLISHED MARKS - STUDENT VIEW (TVET & Nursing Compatible)
// Uses SAME student_marks table as Marks Entry System
// Supports TVET (Terms) & KRCHN (Blocks)
// WITH INDIVIDUAL & BULK PUBLISH FUNCTIONALITY
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
    isLoading: false
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
        'A': '#10b981', 'A-': '#34d399', 'B+': '#f59e0b',
        'B': '#fbbf24', 'B-': '#fcd34d', 'C+': '#f97316',
        'C': '#fb923c', 'C-': '#fca5a5', 'D': '#ef4444',
        'D+': '#dc2626', 'F': '#991b1b', 'FAIL': '#991b1b', 'PASS': '#10b981'
    };
    return colors[grade] || '#6b7280';
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
// GET CURRENT USER - MULTIPLE SOURCES
// ============================================================
async function getCurrentUser() {
    // Try global currentUserProfile first
    if (window.currentUserProfile && window.currentUserProfile.user_id) {
        return window.currentUserProfile;
    }
    
    // Try window.currentUser
    if (window.currentUser && window.currentUser.id) {
        return window.currentUser;
    }
    
    // Try getCurrentUser function
    if (typeof window.getCurrentUser === 'function') {
        const user = window.getCurrentUser();
        if (user) return user;
    }
    
    // Try session storage
    try {
        const stored = sessionStorage.getItem('user') || localStorage.getItem('user');
        if (stored) {
            const user = JSON.parse(stored);
            if (user) return user;
        }
    } catch (e) {}
    
    // Try Supabase session
    if (window.sb) {
        try {
            const { data: { session } } = await window.sb.auth.getSession();
            if (session?.user) {
                const user = session.user;
                // Try to get profile
                const { data: profile } = await window.sb
                    .from('consolidated_user_profiles_table')
                    .select('*')
                    .eq('user_id', user.id)
                    .maybeSingle();
                if (profile) {
                    return { ...user, ...profile };
                }
                return user;
            }
        } catch (e) {}
    }
    
    return null;
}

// ============================================================
// DEMO DATA - FALLBACK
// ============================================================
function getDemoMarksForProgram(program) {
    const isTVET = getProgramType(program) === 'TVET';
    
    if (isTVET) {
        return [
            { id: 101, admission_number: 'TVET/001/2025', student_name: 'Demo Student', subject_name: 'Occupational Health & Safety', program: program, block: 'Term 1', year: '2025', cat1_score: 16, cat2_score: 18, exam_score: 45, final_score: 79, grade: 'B+', points: 3.5, status: 'Pass', published: true, published_at: '2025-01-15', assessment_type: 'full' },
            { id: 102, admission_number: 'TVET/001/2025', student_name: 'Demo Student', subject_name: 'Communication Skills', program: program, block: 'Term 1', year: '2025', cat1_score: 14, cat2_score: 16, exam_score: 40, final_score: 70, grade: 'B', points: 3.0, status: 'Pass', published: true, published_at: '2025-01-15', assessment_type: 'full' },
            { id: 103, admission_number: 'TVET/001/2025', student_name: 'Demo Student', subject_name: 'Mathematics', program: program, block: 'Term 2', year: '2025', cat1_score: 10, cat2_score: 12, exam_score: 30, final_score: 52, grade: 'D', points: 1.0, status: 'Fail', published: false, published_at: null, assessment_type: 'full' }
        ];
    }
    
    return [
        { id: 1, admission_number: 'NCHSM/KRCHN/0139/03/26', student_name: 'Gigen Mochiri', subject_name: 'Fundamentals of Nursing', program: 'KRCHN', block: 'Introductory', year: '2025', cat1_score: 18, cat2_score: 19, exam_score: 55, final_score: 92, grade: 'A', points: 4.0, status: 'Pass', published: true, published_at: '2025-01-15', assessment_type: 'full' },
        { id: 2, admission_number: 'NCHSM/KRCHN/0139/03/26', student_name: 'Gigen Mochiri', subject_name: 'Anatomy and Physiology', program: 'KRCHN', block: 'Introductory', year: '2025', cat1_score: 15, cat2_score: 16, exam_score: 48, final_score: 79, grade: 'B+', points: 3.5, status: 'Pass', published: true, published_at: '2025-01-15', assessment_type: 'full' },
        { id: 3, admission_number: 'NCHSM/KRCHN/0139/03/26', student_name: 'Gigen Mochiri', subject_name: 'Pharmacology', program: 'KRCHN', block: 'Block 1', year: '2025', cat1_score: 12, cat2_score: 14, exam_score: 40, final_score: 66, grade: 'B', points: 3.0, status: 'Pass', published: true, published_at: '2025-03-20', assessment_type: 'full' },
        { id: 4, admission_number: 'NCHSM/KRCHN/0139/03/26', student_name: 'Gigen Mochiri', subject_name: 'Medical-Surgical Nursing', program: 'KRCHN', block: 'Block 1', year: '2025', cat1_score: 10, cat2_score: 12, exam_score: 35, final_score: 57, grade: 'D', points: 1.0, status: 'Fail', published: false, published_at: null, assessment_type: 'full' }
    ];
}

// ============================================================
// POPULATE FILTERS
// ============================================================
function populateSubjectFilter(marks) {
    const filter = document.getElementById('pm_subject_filter');
    if (!filter) return;
    const currentValue = filter.value;
    const uniqueSubjects = [...new Set(marks.map(m => m.subject_name).filter(Boolean))];
    filter.innerHTML = '<option value="all">All Units</option>';
    uniqueSubjects.sort().forEach(subject => {
        const option = document.createElement('option');
        option.value = subject;
        option.textContent = subject;
        filter.appendChild(option);
    });
    if (currentValue) filter.value = currentValue;
}

function populateBlockFilter(marks) {
    const filter = document.getElementById('pm_block_filter');
    if (!filter) return;
    const currentValue = filter.value;
    const uniqueBlocks = [...new Set(marks.map(m => m.block).filter(Boolean))];
    filter.innerHTML = '<option value="all">All Blocks/Terms</option>';
    uniqueBlocks.sort().forEach(block => {
        const option = document.createElement('option');
        option.value = block;
        option.textContent = block;
        filter.appendChild(option);
    });
    if (currentValue) filter.value = currentValue;
}

function populateProgramFilter(marks) {
    const filter = document.getElementById('pm_program_filter');
    if (!filter) return;
    const currentValue = filter.value;
    const uniquePrograms = [...new Set(marks.map(m => m.program).filter(Boolean))];
    filter.innerHTML = '<option value="all">All Programs</option>';
    uniquePrograms.sort().forEach(program => {
        const option = document.createElement('option');
        option.value = program;
        option.textContent = getProgramDisplayName(program);
        filter.appendChild(option);
    });
    if (currentValue) filter.value = currentValue;
}

function populateYearFilter(marks) {
    const filter = document.getElementById('pm_year_filter');
    if (!filter) return;
    const currentValue = filter.value;
    const uniqueYears = [...new Set(marks.map(m => m.year).filter(Boolean))];
    filter.innerHTML = '<option value="all">All Years</option>';
    uniqueYears.sort().reverse().forEach(year => {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        filter.appendChild(option);
    });
    if (currentValue) filter.value = currentValue;
}

// ============================================================
// LOAD PUBLISHED MARKS
// ============================================================
async function loadPublishedMarks() {
    if (PUBLISHED_STATE.isLoading) return;
    
    try {
        PUBLISHED_STATE.isLoading = true;
        if (typeof window.showLoading === 'function') {
            window.showLoading('Loading published marks...');
        }
        
        const user = await getCurrentUser();
        if (!user) {
            console.warn('No user found, using demo data');
            loadDemoPublishedMarks();
            PUBLISHED_STATE.isLoading = false;
            if (typeof window.hideLoading === 'function') window.hideLoading();
            return;
        }
        
        // Get student registration number
        let studentRegNumber = user.student_id || user.admission_number || user.user_id || user.id;
        
        if (!studentRegNumber) {
            console.warn('No student ID found, using demo data');
            loadDemoPublishedMarks();
            PUBLISHED_STATE.isLoading = false;
            if (typeof window.hideLoading === 'function') window.hideLoading();
            return;
        }
        
        PUBLISHED_STATE.user = user;
        PUBLISHED_STATE.userProgram = user.program || 'KRCHN';
        
        // Update header
        const programBadge = document.getElementById('pm_user_program_badge');
        if (programBadge) {
            const programName = getProgramDisplayName(PUBLISHED_STATE.userProgram);
            const icon = getProgramType(PUBLISHED_STATE.userProgram) === 'TVET' ? '🔧' : '🎓';
            programBadge.textContent = `${icon} ${programName}`;
        }
        
        const userNameEl = document.getElementById('pm_user_name');
        if (userNameEl) {
            userNameEl.textContent = user.full_name || user.name || user.email || 'Student';
        }
        
        // Fetch marks
        let marks = [];
        try {
            const result = await window.sb
                .from('student_marks')
                .select('*')
                .eq('admission_number', studentRegNumber)
                .order('created_at', { ascending: false });
            
            if (result.error) {
                console.warn('Error fetching marks:', result.error);
            } else if (result.data) {
                marks = result.data;
            }
        } catch (e) {
            console.warn('Error fetching marks:', e);
        }
        
        if (marks && marks.length > 0) {
            PUBLISHED_STATE.marks = marks;
        } else {
            PUBLISHED_STATE.marks = getDemoMarksForProgram(PUBLISHED_STATE.userProgram);
        }
        
        PUBLISHED_STATE.filtered = [...PUBLISHED_STATE.marks];
        
        populateSubjectFilter(PUBLISHED_STATE.marks);
        populateBlockFilter(PUBLISHED_STATE.marks);
        populateProgramFilter(PUBLISHED_STATE.marks);
        populateYearFilter(PUBLISHED_STATE.marks);
        renderPublishedMarks();
        updatePublishedStats();
        updatePublishedBadge();
        
        if (typeof window.hideLoading === 'function') window.hideLoading();
        PUBLISHED_STATE.isLoading = false;
        
        if (PUBLISHED_STATE.marks.length > 0 && typeof window.showNotification === 'function') {
            window.showNotification(`Loaded ${PUBLISHED_STATE.marks.length} marks`, 'success');
        }
    } catch (error) {
        console.error('Error loading published marks:', error);
        loadDemoPublishedMarks();
        if (typeof window.hideLoading === 'function') window.hideLoading();
        PUBLISHED_STATE.isLoading = false;
    }
}

function loadDemoPublishedMarks() {
    const program = PUBLISHED_STATE.userProgram || 'KRCHN';
    PUBLISHED_STATE.marks = getDemoMarksForProgram(program);
    PUBLISHED_STATE.filtered = [...PUBLISHED_STATE.marks];
    populateSubjectFilter(PUBLISHED_STATE.marks);
    populateBlockFilter(PUBLISHED_STATE.marks);
    populateProgramFilter(PUBLISHED_STATE.marks);
    populateYearFilter(PUBLISHED_STATE.marks);
    renderPublishedMarks();
    updatePublishedStats();
    updatePublishedBadge();
}

// ============================================================
// RENDER PUBLISHED MARKS TABLE
// ============================================================
function renderPublishedMarks() {
    const container = document.getElementById('publishedMarksContainer');
    if (!container) return;
    
    const marks = PUBLISHED_STATE.filtered;
    const programType = getProgramType(PUBLISHED_STATE.userProgram);
    const blockLabel = programType === 'TVET' ? 'Term' : 'Block';
    
    if (!marks || marks.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 60px 20px;">
                <i class="fas fa-share-alt" style="font-size: 48px; color: #94a3b8; margin-bottom: 16px; display: block;"></i>
                <h3 style="color: #1e293b;">No Marks Found</h3>
                <p style="color: #94a3b8;">No marks available. Use the "Bulk Publish" button to publish marks.</p>
            </div>
        `;
        const summarySection = document.getElementById('pm_summary_section');
        if (summarySection) summarySection.style.display = 'none';
        const filterCount = document.getElementById('pm_filter_count');
        if (filterCount) filterCount.textContent = '0';
        return;
    }
    
    // Apply status filter
    const statusFilter = document.getElementById('pm_status_filter')?.value || 'all';
    let displayMarks = marks;
    if (statusFilter === 'published') {
        displayMarks = marks.filter(m => m.published === true);
    } else if (statusFilter === 'draft') {
        displayMarks = marks.filter(m => m.published !== true);
    }
    
    if (displayMarks.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #94a3b8;">
                <i class="fas fa-filter" style="font-size: 32px; display: block; margin-bottom: 10px;"></i>
                <p>No ${statusFilter === 'published' ? 'published' : 'draft'} marks found</p>
            </div>
        `;
        document.getElementById('pm_filter_count').textContent = '0';
        return;
    }
    
    const publishedCount = marks.filter(m => m.published === true).length;
    
    let html = `
        <div style="margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; padding: 0 4px;">
            <div style="display: flex; gap: 15px; flex-wrap: wrap; font-size: 12px; color: #64748b;">
                <span><i class="fas fa-list"></i> <strong>${displayMarks.length}</strong> shown</span>
                <span><i class="fas fa-check-circle" style="color: #10b981;"></i> <strong>${publishedCount}</strong> published</span>
                <span><i class="fas fa-file-alt" style="color: #f59e0b;"></i> <strong>${marks.length - publishedCount}</strong> draft</span>
            </div>
            <span style="font-size: 11px; color: #94a3b8;">
                <i class="fas fa-clock"></i> Updated: ${new Date().toLocaleTimeString()}
            </span>
        </div>
        <div style="overflow-x: auto;">
            <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                <thead style="background: #0A3D62; color: white;">
                    <tr>
                        <th style="padding: 8px 12px; text-align: left;">#</th>
                        <th style="padding: 8px 12px; text-align: left;">Student</th>
                        <th style="padding: 8px 12px; text-align: left;">Admission</th>
                        <th style="padding: 8px 12px; text-align: left;">Unit</th>
                        <th style="padding: 8px 12px; text-align: center;">Score</th>
                        <th style="padding: 8px 12px; text-align: center;">Grade</th>
                        <th style="padding: 8px 12px; text-align: center;">${blockLabel}</th>
                        <th style="padding: 8px 12px; text-align: center;">Status</th>
                        <th style="padding: 8px 12px; text-align: center;">Published</th>
                        <th style="padding: 8px 12px; text-align: center;">Action</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    displayMarks.forEach((mark, index) => {
        const isPublished = mark.published === true;
        const statusColor = isPublished ? '#10b981' : '#94a3b8';
        const statusText = isPublished ? '✅ Published' : '📝 Draft';
        const passStatus = mark.status === 'Pass' || mark.status === 'PASS' || mark.final_score >= 60;
        const scoreColor = passStatus ? '#10b981' : '#dc2626';
        const gradeColor = getGradeColor(mark.grade);
        const admissionDisplay = mark.admission_number || mark.student_id || '-';
        const studentName = mark.student_name || 'Unknown';
        const subjectName = mark.subject_name || 'N/A';
        const blockDisplay = mark.block || '-';
        const score = mark.final_score || 0;
        const grade = mark.grade || '-';
        const safeAdmission = escapeHtml(admissionDisplay);
        const safeSubject = escapeHtml(subjectName);
        
        html += `
            <tr style="border-bottom: 1px solid #f1f5f9; transition: background 0.2s;" 
                onmouseover="this.style.background='#f8fafc'" 
                onmouseout="this.style.background='transparent'">
                <td style="padding: 8px 12px; text-align: center; color: #94a3b8;">${index + 1}</td>
                <td style="padding: 8px 12px; font-weight: 500;">${escapeHtml(studentName)}</td>
                <td style="padding: 8px 12px; font-size: 12px; color: #64748b;">${safeAdmission}</td>
                <td style="padding: 8px 12px;"><strong>${safeSubject}</strong></td>
                <td style="padding: 8px 12px; text-align: center; font-weight: 600; color: ${scoreColor};">${score}%</td>
                <td style="padding: 8px 12px; text-align: center;">
                    <span style="background: ${gradeColor}; color: white; padding: 2px 10px; border-radius: 12px; font-weight: 700; font-size: 12px;">${escapeHtml(grade)}</span>
                </td>
                <td style="padding: 8px 12px; text-align: center;">${escapeHtml(blockDisplay)}</td>
                <td style="padding: 8px 12px; text-align: center;">
                    <span style="color: ${passStatus ? '#10b981' : '#dc2626'}; font-weight: 600; font-size: 12px;">
                        ${passStatus ? '✅ Pass' : '❌ Fail'}
                    </span>
                </td>
                <td style="padding: 8px 12px; text-align: center;">
                    <span style="color: ${statusColor}; font-weight: 600; font-size: 12px;">${statusText}</span>
                </td>
                <td style="padding: 8px 12px; text-align: center; white-space: nowrap;">
                    ${isPublished ? `
                        <button onclick="unpublishSingleStudentMarks('${safeAdmission.replace(/'/g, "\\'")}', '${safeSubject.replace(/'/g, "\\'")}')" 
                                style="background: #dc2626; color: white; border: none; padding: 4px 12px; border-radius: 4px; cursor: pointer; font-size: 11px; transition: all 0.2s;"
                                onmouseover="this.style.background='#b91c1c'"
                                onmouseout="this.style.background='#dc2626'">
                            <i class="fas fa-lock"></i> Unpublish
                        </button>
                    ` : `
                        <button onclick="publishSingleStudentMarks('${safeAdmission.replace(/'/g, "\\'")}', '${safeSubject.replace(/'/g, "\\'")}')" 
                                style="background: #10b981; color: white; border: none; padding: 4px 12px; border-radius: 4px; cursor: pointer; font-size: 11px; transition: all 0.2s;"
                                onmouseover="this.style.background='#059669'"
                                onmouseout="this.style.background='#10b981'">
                            <i class="fas fa-share-alt"></i> Publish
                        </button>
                    `}
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
// UPDATE STATS & BADGE
// ============================================================
function updatePublishedStats() {
    const marks = PUBLISHED_STATE.marks;
    const total = marks.length;
    const passed = marks.filter(m => m.status === 'Pass' || m.status === 'PASS' || m.final_score >= 60).length;
    const failed = marks.filter(m => m.status === 'Fail' || m.status === 'FAIL' || (m.final_score > 0 && m.final_score < 60)).length;
    const published = marks.filter(m => m.published === true).length;
    const avg = total > 0 ? (marks.reduce((sum, m) => sum + (m.final_score || 0), 0) / total) : 0;
    const totalPoints = marks.reduce((sum, m) => sum + (m.points || 0), 0);
    const gpa = total > 0 ? (totalPoints / total) : 0;
    
    const elements = {
        total: document.getElementById('pm_total_marks'),
        passed: document.getElementById('pm_passed'),
        failed: document.getElementById('pm_failed'),
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
    if (elements.avg) elements.avg.textContent = avg.toFixed(1) + '%';
    if (elements.published) elements.published.textContent = published;
    if (elements.attempted) elements.attempted.textContent = total;
    if (elements.unitsPassed) elements.unitsPassed.textContent = passed;
    if (elements.unitsFailed) elements.unitsFailed.textContent = failed;
    if (elements.overallGpa) elements.overallGpa.textContent = gpa.toFixed(2);
}

function updatePublishedBadge() {
    const badge = document.getElementById('publishedMarksBadge');
    if (badge) {
        const count = PUBLISHED_STATE.marks.filter(m => m.published === true).length;
        badge.textContent = count;
        badge.style.display = 'inline-block';
        if (count === 0) badge.textContent = '0';
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
    const yearFilter = document.getElementById('pm_year_filter')?.value || 'all';
    const searchTerm = document.getElementById('pm_search')?.value?.toLowerCase() || '';
    
    let filtered = [...PUBLISHED_STATE.marks];
    
    if (subjectFilter !== 'all') filtered = filtered.filter(m => m.subject_name === subjectFilter);
    if (programFilter !== 'all') filtered = filtered.filter(m => m.program === programFilter);
    if (blockFilter !== 'all') filtered = filtered.filter(m => m.block === blockFilter);
    if (yearFilter !== 'all') filtered = filtered.filter(m => m.year === yearFilter);
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
}

// ============================================================
// INDIVIDUAL STUDENT PUBLISH FUNCTIONS
// ============================================================

/**
 * Publish marks for a single student
 */
async function publishSingleStudentMarks(admissionNumber, subjectName) {
    if (!admissionNumber || !subjectName) {
        if (typeof window.showNotification === 'function') {
            window.showNotification('Please select a student and subject', 'warning');
        }
        return;
    }
    
    if (!confirm(`⚠️ Publish marks for student ${admissionNumber} in "${subjectName}"?`)) return;
    
    try {
        if (typeof window.showLoading === 'function') window.showLoading('Publishing marks...');
        
        const { data, error } = await window.sb
            .from('student_marks')
            .update({
                published: true,
                published_at: new Date().toISOString(),
                published_by: window.currentUser?.id || null
            })
            .eq('admission_number', admissionNumber)
            .eq('subject_name', subjectName);
        
        if (error) throw error;
        
        const count = data?.length || 0;
        
        if (typeof window.showNotification === 'function') {
            window.showNotification(`✅ Published ${count} mark(s) for ${admissionNumber}`, 'success');
        }
        
        // Refresh
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

/**
 * Unpublish marks for a single student
 */
async function unpublishSingleStudentMarks(admissionNumber, subjectName) {
    if (!admissionNumber || !subjectName) {
        if (typeof window.showNotification === 'function') {
            window.showNotification('Please select a student and subject', 'warning');
        }
        return;
    }
    
    if (!confirm(`⚠️ Unpublish marks for student ${admissionNumber} in "${subjectName}"?`)) return;
    
    try {
        if (typeof window.showLoading === 'function') window.showLoading('Unpublishing marks...');
        
        const { data, error } = await window.sb
            .from('student_marks')
            .update({
                published: false,
                published_at: null,
                published_by: null
            })
            .eq('admission_number', admissionNumber)
            .eq('subject_name', subjectName);
        
        if (error) throw error;
        
        const count = data?.length || 0;
        
        if (typeof window.showNotification === 'function') {
            window.showNotification(`🔒 Unpublished ${count} mark(s) for ${admissionNumber}`, 'info');
        }
        
        // Refresh
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

/**
 * Publish all marks in the current filtered list
 */
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

/**
 * Unpublish all marks in the current filtered list
 */
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

async function populatePublishUnits() {
    const select = document.getElementById('publish_unit_select');
    if (!select) return;
    
    select.innerHTML = '<option value="">-- Select Unit --</option>';
    
    try {
        const { data: units, error } = await window.sb
            .from('student_marks')
            .select('subject_name')
            .order('subject_name');
        
        if (error) throw error;
        
        if (!units || units.length === 0) {
            select.innerHTML += '<option value="" disabled>No units with marks found</option>';
            return;
        }
        
        const uniqueUnits = [...new Set(units.map(u => u.subject_name).filter(Boolean))];
        uniqueUnits.sort();
        uniqueUnits.forEach(unit => {
            const option = document.createElement('option');
            option.value = unit;
            option.textContent = unit;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Error populating units:', error);
        select.innerHTML += '<option value="" disabled>Error loading units</option>';
    }
}

async function confirmPublishMarks() {
    const unit = document.getElementById('publish_unit_select')?.value;
    const assessmentType = document.getElementById('publish_assessment_select')?.value || 'all';
    
    if (!unit) {
        if (typeof window.showNotification === 'function') {
            window.showNotification('Please select a unit to publish', 'warning');
        }
        return;
    }
    
    const confirmMsg = `⚠️ Publish ALL marks for "${unit}"?\n\nThis will make marks visible to ALL students in this unit.`;
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
        
        if (assessmentType !== 'all') {
            query = query.eq('assessment_type', assessmentType);
        }
        
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
    
    // Define headers
    const headers = ['Student Name', 'Admission Number', 'Subject/Unit', 'Block/Term', 'Year', 'Score', 'Grade', 'Points', 'Status', 'Published'];
    
    // Build CSV rows
    const rows = marks.map(mark => [
        `"${(mark.student_name || '').replace(/"/g, '""')}"`,
        `"${(mark.admission_number || '').replace(/"/g, '""')}"`,
        `"${(mark.subject_name || '').replace(/"/g, '""')}"`,
        `"${(mark.block || '').replace(/"/g, '""')}"`,
        `"${(mark.year || '').replace(/"/g, '""')}"`,
        mark.final_score || 0,
        mark.grade || '-',
        mark.points || 0,
        mark.status || (mark.final_score >= 60 ? 'Pass' : 'Fail'),
        mark.published ? 'Yes' : 'No'
    ]);
    
    // Combine headers and rows
    const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(','))
    ].join('\n');
    
    // Create download
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
    
    const programName = getProgramDisplayName(PUBLISHED_STATE.userProgram);
    const blockLabel = getProgramType(PUBLISHED_STATE.userProgram) === 'TVET' ? 'Term' : 'Block';
    
    // Create print window
    const printWindow = window.open('', '_blank', 'width=1200,height=800');
    if (!printWindow) {
        if (typeof window.showNotification === 'function') {
            window.showNotification('Please allow popups to print', 'warning');
        }
        return;
    }
    
    let tableRows = '';
    marks.forEach((mark, index) => {
        const passStatus = mark.status === 'Pass' || mark.status === 'PASS' || mark.final_score >= 60;
        tableRows += `
            <tr>
                <td style="padding: 6px 10px; border: 1px solid #ddd; text-align: center;">${index + 1}</td>
                <td style="padding: 6px 10px; border: 1px solid #ddd;">${mark.student_name || 'Unknown'}</td>
                <td style="padding: 6px 10px; border: 1px solid #ddd;">${mark.admission_number || '-'}</td>
                <td style="padding: 6px 10px; border: 1px solid #ddd;">${mark.subject_name || 'N/A'}</td>
                <td style="padding: 6px 10px; border: 1px solid #ddd; text-align: center;">${mark.final_score || 0}%</td>
                <td style="padding: 6px 10px; border: 1px solid #ddd; text-align: center;">${mark.grade || '-'}</td>
                <td style="padding: 6px 10px; border: 1px solid #ddd; text-align: center;">${mark.block || '-'}</td>
                <td style="padding: 6px 10px; border: 1px solid #ddd; text-align: center;">${passStatus ? 'Pass' : 'Fail'}</td>
                <td style="padding: 6px 10px; border: 1px solid #ddd; text-align: center;">${mark.published ? '✅ Published' : '📝 Draft'}</td>
            </tr>
        `;
    });
    
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Published Marks - ${programName}</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 20px; }
                h1 { color: #0A3D62; border-bottom: 2px solid #0A3D62; padding-bottom: 10px; }
                .header-info { margin-bottom: 20px; color: #555; }
                table { width: 100%; border-collapse: collapse; font-size: 12px; }
                th { background: #0A3D62; color: white; padding: 8px 10px; border: 1px solid #0A3D62; text-align: left; }
                td { padding: 6px 10px; border: 1px solid #ddd; }
                .footer { margin-top: 20px; text-align: center; font-size: 11px; color: #888; }
                .status-pass { color: #10b981; font-weight: bold; }
                .status-fail { color: #dc2626; font-weight: bold; }
                .badge { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 10px; font-weight: bold; }
                .badge-published { background: #10b981; color: white; }
                .badge-draft { background: #94a3b8; color: white; }
            </style>
        </head>
        <body>
            <h1>📊 Published Marks Report</h1>
            <div class="header-info">
                <p><strong>Program:</strong> ${programName}</p>
                <p><strong>Student:</strong> ${PUBLISHED_STATE.user?.full_name || PUBLISHED_STATE.user?.name || 'Student'}</p>
                <p><strong>Admission:</strong> ${PUBLISHED_STATE.user?.admission_number || PUBLISHED_STATE.user?.student_id || '-'}</p>
                <p><strong>Total Marks:</strong> ${marks.length} | <strong>Published:</strong> ${marks.filter(m => m.published).length}</p>
                <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
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
                        <th>${blockLabel}</th>
                        <th>Status</th>
                        <th>Published</th>
                    </tr>
                </thead>
                <tbody>
                    ${tableRows}
                </tbody>
            </table>
            <div class="footer">
                <p>Generated from NCHSM Marks Management System</p>
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
    
    // Check if we're on the published marks page
    const container = document.getElementById('publishedMarksContainer');
    if (!container) {
        console.log('Published marks container not found, skipping initialization');
        return;
    }
    
    // Load marks
    await loadPublishedMarks();
    
    // Set up event listeners for filters
    const filterSelectors = ['pm_subject_filter', 'pm_program_filter', 'pm_block_filter', 'pm_status_filter', 'pm_year_filter'];
    filterSelectors.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('change', filterPublishedMarks);
        }
    });
    
    const searchInput = document.getElementById('pm_search');
    if (searchInput) {
        searchInput.addEventListener('input', filterPublishedMarks);
    }
    
    // Set up bulk action buttons
    const publishAllBtn = document.getElementById('pm_publish_all_btn');
    if (publishAllBtn) {
        publishAllBtn.addEventListener('click', publishAllFilteredMarks);
    }
    
    const unpublishAllBtn = document.getElementById('pm_unpublish_all_btn');
    if (unpublishAllBtn) {
        unpublishAllBtn.addEventListener('click', unpublishAllFilteredMarks);
    }
    
    const exportBtn = document.getElementById('pm_export_csv_btn');
    if (exportBtn) {
        exportBtn.addEventListener('click', exportPublishedMarksToCSV);
    }
    
    const printBtn = document.getElementById('pm_print_btn');
    if (printBtn) {
        printBtn.addEventListener('click', printPublishedMarks);
    }
    
    console.log('✅ Published Marks module initialized');
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
    publishSingle: publishSingleStudentMarks,
    unpublishSingle: unpublishSingleStudentMarks,
    publishAll: publishAllFilteredMarks,
    unpublishAll: unpublishAllFilteredMarks,
    export: exportPublishedMarksToCSV,
    print: printPublishedMarks,
    openModal: openPublishModal,
    closeModal: closePublishModal,
    confirmPublish: confirmPublishMarks,
    state: PUBLISHED_STATE
};

// Also expose individual functions for inline onclick handlers
window.publishSingleStudentMarks = publishSingleStudentMarks;
window.unpublishSingleStudentMarks = unpublishSingleStudentMarks;
window.publishAllFilteredMarks = publishAllFilteredMarks;
window.unpublishAllFilteredMarks = unpublishAllFilteredMarks;
window.exportPublishedMarksToCSV = exportPublishedMarksToCSV;
window.printPublishedMarks = printPublishedMarks;
window.openPublishModal = openPublishModal;
window.closePublishModal = closePublishModal;
window.confirmPublishMarks = confirmPublishMarks;
window.filterPublishedMarks = filterPublishedMarks;

console.log('📊 Published Marks module loaded successfully!');
