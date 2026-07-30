// ============================================================
// PUBLISHED MARKS - STUDENT VIEW (TVET & Nursing Compatible)
// Uses SAME student_marks table as Marks Entry System
// Supports TVET (Terms) & KRCHN (Blocks)
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
// DEMO DATA
// ============================================================

function getDemoMarksForProgram(program) {
    if (program === 'KRCHN') {
        return [
            { id: 1, admission_number: 'KRCHN/001/2025', student_name: 'Alice Mwangi', subject_name: 'Fundamentals of Nursing', program: 'KRCHN', block: 'Introductory', year: '2025', cat1_score: 18, cat2_score: 19, exam_score: 55, final_score: 92, grade: 'A', points: 4.0, status: 'Pass', published: true, published_date: '2025-01-15', assessment_type: 'full' },
            { id: 2, admission_number: 'KRCHN/002/2025', student_name: 'Brian Ochieng', subject_name: 'Anatomy and Physiology', program: 'KRCHN', block: 'Introductory', year: '2025', cat1_score: 15, cat2_score: 16, exam_score: 48, final_score: 79, grade: 'B+', points: 3.5, status: 'Pass', published: true, published_date: '2025-01-15', assessment_type: 'full' },
            { id: 3, admission_number: 'KRCHN/003/2025', student_name: 'Catherine Njeri', subject_name: 'Pharmacology', program: 'KRCHN', block: 'Block 1', year: '2025', cat1_score: 12, cat2_score: 14, exam_score: 40, final_score: 66, grade: 'B', points: 3.0, status: 'Pass', published: true, published_date: '2025-03-20', assessment_type: 'full' },
            { id: 4, admission_number: 'KRCHN/004/2025', student_name: 'David Kamau', subject_name: 'Medical-Surgical Nursing', program: 'KRCHN', block: 'Block 1', year: '2025', cat1_score: 10, cat2_score: 12, exam_score: 35, final_score: 57, grade: 'D', points: 0.0, status: 'Fail', published: true, published_date: '2025-03-20', assessment_type: 'full' }
        ];
    }
    return [
        { id: 101, admission_number: 'DPOTT/001/2025', student_name: 'Peter Omondi', subject_name: 'Introduction to Perioperative Nursing', program: 'DPOTT', block: 'Term 1', year: '2025', cat1_score: 16, cat2_score: 18, exam_score: 45, final_score: 79, grade: 'B+', points: 3.5, status: 'Pass', published: true, published_date: '2025-01-15', assessment_type: 'full' },
        { id: 102, admission_number: 'DPOTT/002/2025', student_name: 'Mary Akinyi', subject_name: 'Surgical Instrumentation', program: 'DPOTT', block: 'Term 1', year: '2025', cat1_score: 14, cat2_score: 15, exam_score: 40, final_score: 69, grade: 'B', points: 3.0, status: 'Pass', published: true, published_date: '2025-01-15', assessment_type: 'full' },
        { id: 103, admission_number: 'DPOTT/003/2025', student_name: 'James Otieno', subject_name: 'Sterilization Techniques', program: 'DPOTT', block: 'Term 2', year: '2025', cat1_score: 11, cat2_score: 13, exam_score: 32, final_score: 56, grade: 'D', points: 0.0, status: 'Fail', published: true, published_date: '2025-03-20', assessment_type: 'full' }
    ];
}

// ============================================================
// POPULATE FILTERS
// ============================================================

function populateSubjectFilter(subjects) {
    const filter = document.getElementById('pm_subject_filter');
    if (!filter) return;
    const currentValue = filter.value;
    filter.innerHTML = '<option value="all">All Subjects/Units</option>';
    if (subjects && subjects.length > 0) {
        const uniqueSubjects = [...new Set(subjects.map(m => m.subject_name).filter(Boolean))];
        uniqueSubjects.sort();
        uniqueSubjects.forEach(subject => {
            const option = document.createElement('option');
            option.value = subject;
            option.textContent = subject;
            filter.appendChild(option);
        });
    }
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
            window.showLoading('Loading your published marks...');
        }
        
        const user = typeof window.getCurrentUser === 'function' ? window.getCurrentUser() : getCurrentUserFallback();
        if (!user) {
            if (typeof window.showNotification === 'function') {
                window.showNotification('Please log in to view your marks', 'error');
            }
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
            userNameEl.textContent = user.name || user.full_name || user.email || 'Student';
        }
        
        const studentId = user.student_id || user.id;
        
        // Fetch from student_marks table
        let { data: marks, error } = await window.sb
            .from('student_marks')
            .select('*')
            .eq('admission_number', studentId)
            .eq('published', true)
            .order('published_date', { ascending: false });
        
        if ((!marks || marks.length === 0) && user.id) {
            const { data: marksByUserId, error: err2 } = await window.sb
                .from('student_marks')
                .select('*')
                .eq('student_id', user.id)
                .eq('published', true)
                .order('published_date', { ascending: false });
            
            if (!err2 && marksByUserId && marksByUserId.length > 0) {
                marks = marksByUserId;
            }
        }
        
        if (error) {
            console.warn('Error fetching marks:', error);
            loadDemoPublishedMarks();
            return;
        }
        
        if (marks && marks.length > 0) {
            PUBLISHED_STATE.marks = marks;
        } else {
            loadDemoPublishedMarks();
            return;
        }
        
        PUBLISHED_STATE.filtered = [...PUBLISHED_STATE.marks];
        populateSubjectFilter(PUBLISHED_STATE.marks);
        
        renderPublishedMarks();
        updatePublishedStats();
        updatePublishedBadge();
        
        if (typeof window.hideLoading === 'function') window.hideLoading();
        PUBLISHED_STATE.isLoading = false;
        
        if (PUBLISHED_STATE.marks.length > 0 && typeof window.showNotification === 'function') {
            window.showNotification(`Loaded ${PUBLISHED_STATE.marks.length} published marks`, 'success');
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
    renderPublishedMarks();
    updatePublishedStats();
    updatePublishedBadge();
}

function getCurrentUserFallback() {
    try {
        const user = JSON.parse(sessionStorage.getItem('user') || 'null');
        if (user) return user;
        const localUser = JSON.parse(localStorage.getItem('user') || 'null');
        if (localUser) return localUser;
        return null;
    } catch (e) {
        return null;
    }
}

// ============================================================
// RENDER MARKS TABLE
// ============================================================

function renderPublishedMarks() {
    const container = document.getElementById('publishedMarksContainer');
    if (!container) {
        console.warn('Published marks container not found');
        return;
    }
    
    const marks = PUBLISHED_STATE.filtered;
    const programType = getProgramType(PUBLISHED_STATE.userProgram);
    const blockLabel = programType === 'TVET' ? 'Term' : 'Block';
    
    if (!marks || marks.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 60px 20px;">
                <i class="fas fa-share-alt" style="font-size: 48px; color: #94a3b8; margin-bottom: 16px; display: block;"></i>
                <h3 style="color: #1e293b;">No Published Marks</h3>
                <p style="color: #94a3b8;">Your published marks will appear here once they are released.</p>
                <p style="color: #94a3b8; font-size: 13px; margin-top: 8px;">
                    <i class="fas fa-info-circle"></i> Check with your lecturer or academic office for updates.
                </p>
            </div>
        `;
        const summarySection = document.getElementById('pm_summary_section');
        if (summarySection) summarySection.style.display = 'none';
        const filterCount = document.getElementById('pm_filter_count');
        if (filterCount) filterCount.textContent = '0';
        return;
    }
    
    function getAssessmentTypeLabel(type) {
        const labels = {
            'full': '📊 Full (CAT1+CAT2+Exam)',
            'single_cat': '📋 Single CAT (CAT+Exam)',
            'exam_only': '📝 Exam Only',
            'cats_only': '📚 CAT1+CAT2 Only',
            'cat_only': '📄 CAT Only'
        };
        return labels[type] || type || '📊 Full';
    }
    
    let html = `
        <div style="margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; background: #f8fafc; padding: 12px 16px; border-radius: 8px;">
            <div style="display: flex; gap: 15px; flex-wrap: wrap;">
                <span style="font-size: 13px; color: #475569;">
                    <i class="fas fa-list"></i> <strong>${marks.length}</strong> published result(s)
                </span>
                <span style="font-size: 13px; color: #475569;">
                    <i class="fas fa-check-circle" style="color: #10b981;"></i> <span id="pm_pass_count_display">${marks.filter(m => m.status === 'Pass' || m.status === 'PASS').length}</span> passed
                </span>
                <span style="font-size: 13px; color: #475569;">
                    <i class="fas fa-times-circle" style="color: #dc2626;"></i> <span id="pm_fail_count_display">${marks.filter(m => m.status === 'Fail' || m.status === 'FAIL').length}</span> failed
                </span>
            </div>
            <span style="font-size: 12px; color: #94a3b8;">
                <i class="fas fa-calendar"></i> Updated: ${new Date().toLocaleDateString()}
            </span>
        </div>
        <div style="overflow-x: auto;">
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                <thead style="background: #0A3D62; color: white;">
                    <tr>
                        <th style="padding: 12px 16px; text-align: left;">#</th>
                        <th style="padding: 12px 16px; text-align: left;">Subject/Unit</th>
                        <th style="padding: 12px 16px; text-align: center;">${blockLabel}</th>
                        <th style="padding: 12px 16px; text-align: center;">Year</th>
                        <th style="padding: 12px 16px; text-align: center;">Assessment Type</th>
                        <th style="padding: 12px 16px; text-align: center;">CAT 1</th>
                        <th style="padding: 12px 16px; text-align: center;">CAT 2</th>
                        <th style="padding: 12px 16px; text-align: center;">Exam</th>
                        <th style="padding: 12px 16px; text-align: center;">Total</th>
                        <th style="padding: 12px 16px; text-align: center;">Grade</th>
                        <th style="padding: 12px 16px; text-align: center;">Points</th>
                        <th style="padding: 12px 16px; text-align: center;">Status</th>
                        <th style="padding: 12px 16px; text-align: center;">Published</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    marks.forEach((mark, index) => {
        const statusColor = mark.status === 'Pass' || mark.status === 'PASS' ? '#10b981' : '#dc2626';
        const gradeColor = getGradeColor(mark.grade);
        const pubDate = mark.published_date ? new Date(mark.published_date).toLocaleDateString() : '-';
        const assessmentLabel = getAssessmentTypeLabel(mark.assessment_type);
        const blockDisplay = mark.block || '-';
        const cat1 = mark.cat1_score !== undefined && mark.cat1_score !== null ? mark.cat1_score : '-';
        const cat2 = mark.cat2_score !== undefined && mark.cat2_score !== null ? mark.cat2_score : '-';
        const exam = mark.exam_score !== undefined && mark.exam_score !== null ? mark.exam_score : '-';
        const total = mark.final_score !== undefined && mark.final_score !== null ? mark.final_score : '-';
        
        html += `
            <tr style="${index % 2 === 0 ? 'background: #f8fafc;' : ''} border-bottom: 1px solid #e5e7eb;">
                <td style="padding: 12px 16px; text-align: center; font-weight: 600;">${index + 1}</td>
                <td style="padding: 12px 16px;">
                    <div><strong>${escapeHtml(mark.subject_name || 'N/A')}</strong></div>
                    <div style="font-size: 11px; color: #64748b;">${escapeHtml(mark.admission_number || '')}</div>
                </td>
                <td style="padding: 12px 16px; text-align: center;">${escapeHtml(blockDisplay)}</td>
                <td style="padding: 12px 16px; text-align: center;">${escapeHtml(mark.year || '-')}</td>
                <td style="padding: 12px 16px; text-align: center; font-size: 11px;">${assessmentLabel}</td>
                <td style="padding: 12px 16px; text-align: center;">${cat1 !== '-' ? cat1 + '/30' : '-'}</td>
                <td style="padding: 12px 16px; text-align: center;">${cat2 !== '-' ? cat2 + '/30' : '-'}</td>
                <td style="padding: 12px 16px; text-align: center;">${exam !== '-' ? exam + '/70' : '-'}</td>
                <td style="padding: 12px 16px; text-align: center; font-weight: 700; color: ${statusColor};">${total !== '-' ? total + '%' : '-'}</td>
                <td style="padding: 12px 16px; text-align: center;">
                    <span style="background: ${gradeColor}; color: white; padding: 2px 10px; border-radius: 12px; font-weight: 700;">${mark.grade || '-'}</span>
                </td>
                <td style="padding: 12px 16px; text-align: center;">${mark.points || 0.0}</td>
                <td style="padding: 12px 16px; text-align: center;">
                    <span style="background: ${statusColor}; color: white; padding: 2px 12px; border-radius: 12px; font-weight: 600; font-size: 12px;">${mark.status || 'Pending'}</span>
                </td>
                <td style="padding: 12px 16px; text-align: center; font-size: 12px; color: #64748b;">${pubDate}</td>
            </tr>
        `;
    });
    
    html += `
                </tbody>
            </table>
        </div>
        <div style="padding: 12px 16px; background: #f8fafc; border-top: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; font-size: 13px; color: #94a3b8;">
            <span><i class="fas fa-list"></i> Showing ${marks.length} published result(s)</span>
            <span><i class="fas fa-calendar"></i> Last updated: ${new Date().toLocaleString()}</span>
        </div>
    `;
    
    container.innerHTML = html;
    
    const summarySection = document.getElementById('pm_summary_section');
    if (summarySection) summarySection.style.display = 'block';
    const filterCount = document.getElementById('pm_filter_count');
    if (filterCount) filterCount.textContent = marks.length;
    
    const passDisplay = document.getElementById('pm_pass_count_display');
    const failDisplay = document.getElementById('pm_fail_count_display');
    if (passDisplay) passDisplay.textContent = marks.filter(m => m.status === 'Pass' || m.status === 'PASS').length;
    if (failDisplay) failDisplay.textContent = marks.filter(m => m.status === 'Fail' || m.status === 'FAIL').length;
}

// ============================================================
// UPDATE STATS & BADGE
// ============================================================

function updatePublishedStats() {
    const marks = PUBLISHED_STATE.marks;
    const total = marks.length;
    const passed = marks.filter(m => m.status === 'Pass' || m.status === 'PASS').length;
    const failed = marks.filter(m => m.status === 'Fail' || m.status === 'FAIL').length;
    const avg = total > 0 ? (marks.reduce((sum, m) => sum + (m.final_score || 0), 0) / total) : 0;
    const totalPoints = marks.reduce((sum, m) => sum + (m.points || 0), 0);
    const gpa = total > 0 ? (totalPoints / total) : 0;
    
    const elements = {
        total: document.getElementById('pm_total_marks'),
        passed: document.getElementById('pm_passed'),
        failed: document.getElementById('pm_failed'),
        avg: document.getElementById('pm_avg_score'),
        attempted: document.getElementById('pm_units_attempted'),
        unitsPassed: document.getElementById('pm_units_passed'),
        unitsFailed: document.getElementById('pm_units_failed'),
        overallGpa: document.getElementById('pm_overall_gpa')
    };
    
    if (elements.total) elements.total.textContent = total;
    if (elements.passed) elements.passed.textContent = passed;
    if (elements.failed) elements.failed.textContent = failed;
    if (elements.avg) elements.avg.textContent = avg.toFixed(1) + '%';
    if (elements.attempted) elements.attempted.textContent = total;
    if (elements.unitsPassed) elements.unitsPassed.textContent = passed;
    if (elements.unitsFailed) elements.unitsFailed.textContent = failed;
    if (elements.overallGpa) elements.overallGpa.textContent = gpa.toFixed(2);
}

function updatePublishedBadge() {
    const badge = document.getElementById('publishedMarksBadge');
    if (badge) {
        const count = PUBLISHED_STATE.marks.length;
        badge.textContent = count;
        badge.style.display = count > 0 ? 'inline-block' : 'inline-block';
        if (count === 0) badge.textContent = '0';
    }
}

// ============================================================
// FILTER & EXPORT
// ============================================================

function filterPublishedMarks() {
    const subjectFilter = document.getElementById('pm_subject_filter')?.value || 'all';
    const programFilter = document.getElementById('pm_program_filter')?.value || 'all';
    const blockFilter = document.getElementById('pm_block_filter')?.value || 'all';
    const assessmentFilter = document.getElementById('pm_assessment_filter')?.value || 'all';
    const yearFilter = document.getElementById('pm_year_filter')?.value || 'all';
    const searchTerm = document.getElementById('pm_search')?.value?.toLowerCase() || '';
    
    let filtered = [...PUBLISHED_STATE.marks];
    if (subjectFilter !== 'all') filtered = filtered.filter(m => m.subject_name === subjectFilter);
    if (programFilter !== 'all') filtered = filtered.filter(m => m.program === programFilter);
    if (blockFilter !== 'all') filtered = filtered.filter(m => m.block === blockFilter);
    if (assessmentFilter !== 'all') filtered = filtered.filter(m => m.assessment_type === assessmentFilter);
    if (yearFilter !== 'all') filtered = filtered.filter(m => m.year === yearFilter);
    if (searchTerm) {
        filtered = filtered.filter(m => 
            (m.subject_name || '').toLowerCase().includes(searchTerm) ||
            (m.admission_number || '').toLowerCase().includes(searchTerm)
        );
    }
    
    PUBLISHED_STATE.filtered = filtered;
    renderPublishedMarks();
    const filterCount = document.getElementById('pm_filter_count');
    if (filterCount) filterCount.textContent = filtered.length;
}

function exportPublishedMarksToCSV() {
    const marks = PUBLISHED_STATE.filtered;
    if (!marks || marks.length === 0) {
        if (typeof window.showNotification === 'function') {
            window.showNotification('No marks to export', 'warning');
        }
        return;
    }
    
    const programType = getProgramType(PUBLISHED_STATE.userProgram);
    const blockLabel = programType === 'TVET' ? 'Term' : 'Block';
    
    const headers = ['Subject/Unit', 'Admission', blockLabel, 'Year', 'Assessment Type', 'CAT 1', 'CAT 2', 'Exam', 'Total', 'Grade', 'Points', 'Status', 'Published Date'];
    const rows = marks.map(m => [
        m.subject_name || '',
        m.admission_number || '',
        m.block || '',
        m.year || '',
        m.assessment_type || '',
        m.cat1_score || '',
        m.cat2_score || '',
        m.exam_score || '',
        m.final_score || '',
        m.grade || '',
        m.points || 0.0,
        m.status || '',
        m.published_date || ''
    ]);
    
    let csv = headers.join(',') + '\n';
    rows.forEach(row => {
        csv += row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',') + '\n';
    });
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Published_Marks_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    if (typeof window.showNotification === 'function') {
        window.showNotification('Exported published marks successfully', 'success');
    }
}

// ============================================================
// PUBLISH MARKS FUNCTIONS (Admin/Lecturer)
// ============================================================

function openPublishModal() {
    const modal = document.getElementById('publishModal');
    if (!modal) {
        console.warn('Publish modal not found');
        if (typeof window.showNotification === 'function') {
            window.showNotification('Publish modal not found. Please check HTML.', 'error');
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
    
    const confirmMsg = `⚠️ Publish marks for "${unit}"?\n\nThis will make marks visible to ALL students in this unit.`;
    if (!confirm(confirmMsg)) return;
    
    try {
        if (typeof window.showLoading === 'function') window.showLoading('Publishing marks...');
        
        let query = window.sb
            .from('student_marks')
            .update({
                published: true,
                published_date: new Date().toISOString(),
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
            window.showNotification(`✅ ${count} marks published for "${unit}"!`, 'success');
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
// EXPOSE FUNCTIONS TO GLOBAL SCOPE
// ============================================================

window.loadPublishedMarks = loadPublishedMarks;
window.filterPublishedMarks = filterPublishedMarks;
window.exportPublishedMarksToCSV = exportPublishedMarksToCSV;
window.openPublishModal = openPublishModal;
window.closePublishModal = closePublishModal;
window.confirmPublishMarks = confirmPublishMarks;
window.populatePublishUnits = populatePublishUnits;
window.getProgramDisplayName = getProgramDisplayName;
window.getProgramType = getProgramType;
window.getBlockTermLabel = getBlockTermLabel;
window.getGradeColor = getGradeColor;
window.PUBLISHED_STATE = PUBLISHED_STATE;
window.escapeHtml = escapeHtml;

if (typeof window.getCurrentUser === 'undefined') {
    window.getCurrentUser = getCurrentUserFallback;
}

console.log('✅ Published Marks module loaded successfully!');
console.log('📊 Data source: student_marks table (same as Marks Entry)');
console.log('📊 Supports both TVET (Terms) and KRCHN (Blocks)');
console.log('📊 Available functions:');
console.log('   - loadPublishedMarks() - Load marks for student');
console.log('   - filterPublishedMarks() - Filter displayed marks');
console.log('   - exportPublishedMarksToCSV() - Export to CSV');
console.log('   - openPublishModal() - Open publish modal (Admin)');
console.log('   - confirmPublishMarks() - Confirm publish (Admin)');
