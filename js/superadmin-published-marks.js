// ============================================================
// PUBLISHED MARKS - STUDENT VIEW (TVET & Nursing Compatible)
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

/**
 * Get program display name - supports all TVET and Nursing programs
 */
function getProgramDisplayName(programCode) {
    const programMap = {
        // KRCHN
        'KRCHN': 'KRCHN Nursing',
        
        // TVET Diplomas
        'DPOTT': 'Diploma in Perioperative Theatre Technology',
        'DCH': 'Diploma in Community Health',
        'DHRIT': 'Diploma in Health Records and IT',
        'DSL': 'Diploma in Science Lab',
        'DSW': 'Diploma in Social Work & Community Development',
        'DCJS': 'Diploma in Criminal Justice',
        'DHSS': 'Diploma in Health Support Services',
        'DICT': 'Diploma in ICT',
        'DME': 'Diploma in Medical Engineering',
        
        // TVET Certificates
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
        
        // TVET Artisan
        'ACH': 'Artisan in Community Health',
        'AAG': 'Artisan in Agriculture',
        'ASW': 'Artisan in Social Work & Community Development',
        
        // Other TVET
        'CCA': 'Certificate in Computer Applications',
        'PTE': 'TVET/CDACC (PTE)'
    };
    return programMap[programCode] || programCode || 'Unknown Program';
}

/**
 * Get grade color
 */
function getGradeColor(grade) {
    const colors = {
        'A': '#10b981',
        'A-': '#34d399',
        'B+': '#f59e0b',
        'B': '#fbbf24',
        'B-': '#fcd34d',
        'C+': '#f97316',
        'C': '#fb923c',
        'C-': '#fca5a5',
        'D': '#ef4444',
        'D+': '#dc2626',
        'F': '#991b1b',
        'FAIL': '#991b1b',
        'PASS': '#10b981'
    };
    return colors[grade] || '#6b7280';
}

/**
 * Get demo marks based on program type (TVET or Nursing)
 */
function getDemoMarksForProgram(program) {
    // KRCHN Nursing demo data
    if (program === 'KRCHN') {
        return [
            { id: 1, unit_code: 'NURS101', unit_name: 'Fundamentals of Nursing', program: 'KRCHN', block: 'Introductory', year: '2025', cat1: 18, cat2: 19, exam: 55, total: 92, grade: 'A', points: 4.0, status: 'Pass', published_date: '2025-01-15' },
            { id: 2, unit_code: 'NURS102', unit_name: 'Anatomy and Physiology', program: 'KRCHN', block: 'Introductory', year: '2025', cat1: 15, cat2: 16, exam: 48, total: 79, grade: 'B+', points: 3.5, status: 'Pass', published_date: '2025-01-15' },
            { id: 3, unit_code: 'NURS103', unit_name: 'Pharmacology', program: 'KRCHN', block: 'Block 1', year: '2025', cat1: 12, cat2: 14, exam: 40, total: 66, grade: 'B', points: 3.0, status: 'Pass', published_date: '2025-03-20' },
            { id: 4, unit_code: 'NURS104', unit_name: 'Medical-Surgical Nursing', program: 'KRCHN', block: 'Block 1', year: '2025', cat1: 10, cat2: 12, exam: 35, total: 57, grade: 'D', points: 0.0, status: 'Fail', published_date: '2025-03-20' },
            { id: 5, unit_code: 'NURS105', unit_name: 'Community Health Nursing', program: 'KRCHN', block: 'Block 2', year: '2025', cat1: 16, cat2: 17, exam: 50, total: 83, grade: 'A-', points: 3.7, status: 'Pass', published_date: '2025-05-10' },
            { id: 6, unit_code: 'NURS106', unit_name: 'Mental Health Nursing', program: 'KRCHN', block: 'Block 2', year: '2025', cat1: 14, cat2: 15, exam: 42, total: 71, grade: 'B+', points: 3.5, status: 'Pass', published_date: '2025-05-10' }
        ];
    }
    
    // TVET Demo Data
    if (program === 'DPOTT' || program.startsWith('D') || program.startsWith('C') || program.startsWith('A')) {
        return [
            { id: 101, unit_code: 'POTT101', unit_name: 'Introduction to Perioperative Nursing', program: 'DPOTT', block: 'Introductory', year: '2025', cat1: 16, cat2: 18, exam: 45, total: 79, grade: 'B+', points: 3.5, status: 'Pass', published_date: '2025-01-15' },
            { id: 102, unit_code: 'POTT102', unit_name: 'Surgical Instrumentation', program: 'DPOTT', block: 'Introductory', year: '2025', cat1: 14, cat2: 15, exam: 40, total: 69, grade: 'B', points: 3.0, status: 'Pass', published_date: '2025-01-15' },
            { id: 103, unit_code: 'POTT103', unit_name: 'Sterilization Techniques', program: 'DPOTT', block: 'Block 1', year: '2025', cat1: 11, cat2: 13, exam: 32, total: 56, grade: 'D', points: 0.0, status: 'Fail', published_date: '2025-03-20' },
            { id: 104, unit_code: 'POTT104', unit_name: 'Patient Positioning & Safety', program: 'DPOTT', block: 'Block 1', year: '2025', cat1: 17, cat2: 16, exam: 48, total: 81, grade: 'A-', points: 3.7, status: 'Pass', published_date: '2025-03-20' },
            { id: 105, unit_code: 'POTT105', unit_name: 'Operating Room Management', program: 'DPOTT', block: 'Block 2', year: '2025', cat1: 13, cat2: 15, exam: 38, total: 66, grade: 'B', points: 3.0, status: 'Pass', published_date: '2025-05-10' }
        ];
    }
    
    // DCH - Diploma in Community Health
    if (program === 'DCH') {
        return [
            { id: 201, unit_code: 'DCH101', unit_name: 'Community Health Concepts', program: 'DCH', block: 'Introductory', year: '2025', cat1: 17, cat2: 18, exam: 52, total: 87, grade: 'A-', points: 3.7, status: 'Pass', published_date: '2025-01-15' },
            { id: 202, unit_code: 'DCH102', unit_name: 'Public Health Epidemiology', program: 'DCH', block: 'Introductory', year: '2025', cat1: 14, cat2: 15, exam: 40, total: 69, grade: 'B', points: 3.0, status: 'Pass', published_date: '2025-01-15' }
        ];
    }
    
    // DHRIT - Diploma in Health Records and IT
    if (program === 'DHRIT') {
        return [
            { id: 301, unit_code: 'HRIT101', unit_name: 'Health Records Management', program: 'DHRIT', block: 'Introductory', year: '2025', cat1: 16, cat2: 17, exam: 48, total: 81, grade: 'A-', points: 3.7, status: 'Pass', published_date: '2025-01-15' },
            { id: 302, unit_code: 'HRIT102', unit_name: 'Medical Terminology', program: 'DHRIT', block: 'Introductory', year: '2025', cat1: 13, cat2: 14, exam: 38, total: 65, grade: 'B', points: 3.0, status: 'Pass', published_date: '2025-01-15' }
        ];
    }
    
    // Default demo data (mixed/general)
    return [
        { id: 501, unit_code: 'GEN101', unit_name: 'General Studies', program: 'GENERAL', block: 'Introductory', year: '2025', cat1: 15, cat2: 16, exam: 42, total: 73, grade: 'B', points: 3.0, status: 'Pass', published_date: '2025-01-15' },
        { id: 502, unit_code: 'GEN102', unit_name: 'Communication Skills', program: 'GENERAL', block: 'Introductory', year: '2025', cat1: 12, cat2: 14, exam: 35, total: 61, grade: 'C+', points: 2.5, status: 'Pass', published_date: '2025-01-15' }
    ];
}

/**
 * Fetch published marks from database
 */
async function fetchPublishedMarksFromDB(studentId) {
    try {
        // Try Supabase first
        if (window.sb) {
            const { data, error } = await window.sb
                .from('student_marks')
                .select('*')
                .eq('student_id', studentId)
                .eq('published', true)
                .order('published_date', { ascending: false });
            
            if (!error && data && data.length > 0) {
                return data;
            }
        }
        
        // Try localStorage
        const storageKey = `published_marks_${studentId}`;
        const stored = localStorage.getItem(storageKey);
        if (stored) {
            const parsed = JSON.parse(stored);
            if (parsed && parsed.length > 0) {
                return parsed;
            }
        }
        
        return [];
    } catch (e) {
        console.warn('Error fetching marks from DB:', e);
        return [];
    }
}

/**
 * Save published marks to localStorage
 */
function savePublishedMarksToLocal(studentId, marks) {
    try {
        const storageKey = `published_marks_${studentId}`;
        localStorage.setItem(storageKey, JSON.stringify(marks));
    } catch (e) {
        // Ignore storage errors
    }
}

/**
 * Get current user (fallback if global function not available)
 */
function getCurrentUserFallback() {
    try {
        // Try sessionStorage
        const user = JSON.parse(sessionStorage.getItem('user') || 'null');
        if (user) return user;
        
        // Try localStorage
        const localUser = JSON.parse(localStorage.getItem('user') || 'null');
        if (localUser) return localUser;
        
        return null;
    } catch (e) {
        return null;
    }
}

/**
 * Load published marks for the current student
 * Automatically detects program type (TVET or Nursing)
 */
async function loadPublishedMarks() {
    if (PUBLISHED_STATE.isLoading) return;
    
    try {
        PUBLISHED_STATE.isLoading = true;
        if (typeof window.showLoading === 'function') {
            window.showLoading('Loading your published marks...');
        }
        
        // Get current user
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
        
        // Update header with user info
        const programBadge = document.getElementById('pm_user_program_badge');
        if (programBadge) {
            const programName = getProgramDisplayName(PUBLISHED_STATE.userProgram);
            const icon = PUBLISHED_STATE.userProgram === 'KRCHN' ? '🎓' : '🔧';
            programBadge.textContent = `${icon} ${programName}`;
        }
        
        const userNameEl = document.getElementById('pm_user_name');
        if (userNameEl) {
            userNameEl.textContent = user.name || user.full_name || user.email || 'Student';
        }
        
        // Try to fetch from database
        let marks = await fetchPublishedMarksFromDB(user.id || user.user_id);
        
        if (marks && marks.length > 0) {
            PUBLISHED_STATE.marks = marks;
        } else {
            // Use demo data based on program
            PUBLISHED_STATE.marks = getDemoMarksForProgram(PUBLISHED_STATE.userProgram);
            // Store as fallback
            savePublishedMarksToLocal(user.id || user.user_id, PUBLISHED_STATE.marks);
        }
        
        PUBLISHED_STATE.filtered = [...PUBLISHED_STATE.marks];
        
        // Update UI
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
        // Fallback: use demo data
        try {
            PUBLISHED_STATE.marks = getDemoMarksForProgram(PUBLISHED_STATE.userProgram || 'KRCHN');
            PUBLISHED_STATE.filtered = [...PUBLISHED_STATE.marks];
            renderPublishedMarks();
            updatePublishedStats();
            updatePublishedBadge();
        } catch (e) {
            console.error('Fallback error:', e);
        }
        if (typeof window.hideLoading === 'function') window.hideLoading();
        PUBLISHED_STATE.isLoading = false;
    }
}

/**
 * Render the published marks table
 */
function renderPublishedMarks() {
    const container = document.getElementById('publishedMarksContainer');
    if (!container) {
        console.warn('Published marks container not found');
        return;
    }
    
    const marks = PUBLISHED_STATE.filtered;
    
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
    
    let html = `
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <thead style="background: #0A3D62; color: white;">
                <tr>
                    <th style="padding: 12px 16px; text-align: left;">Unit Code</th>
                    <th style="padding: 12px 16px; text-align: left;">Unit Name</th>
                    <th style="padding: 12px 16px; text-align: center;">Program</th>
                    <th style="padding: 12px 16px; text-align: center;">Block</th>
                    <th style="padding: 12px 16px; text-align: center;">Year</th>
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
        const programDisplay = getProgramDisplayName(mark.program);
        const pubDate = mark.published_date || mark.publishedDate || '-';
        
        html += `
            <tr style="${index % 2 === 0 ? 'background: #f8fafc;' : ''} border-bottom: 1px solid #e5e7eb;">
                <td style="padding: 12px 16px; font-weight: 600; color: #0A3D62;">${escapeHtml(mark.unit_code || mark.unitCode || '-')}</td>
                <td style="padding: 12px 16px;">${escapeHtml(mark.unit_name || mark.unitName || '-')}</td>
                <td style="padding: 12px 16px; text-align: center; font-size: 11px;">${escapeHtml(programDisplay)}</td>
                <td style="padding: 12px 16px; text-align: center;">${escapeHtml(mark.block || '-')}</td>
                <td style="padding: 12px 16px; text-align: center;">${escapeHtml(mark.year || '-')}</td>
                <td style="padding: 12px 16px; text-align: center;">${mark.cat1 || mark.CAT1 || '-'}</td>
                <td style="padding: 12px 16px; text-align: center;">${mark.cat2 || mark.CAT2 || '-'}</td>
                <td style="padding: 12px 16px; text-align: center;">${mark.exam || '-'}</td>
                <td style="padding: 12px 16px; text-align: center; font-weight: 700;">${mark.total || 0}</td>
                <td style="padding: 12px 16px; text-align: center;">
                    <span style="background: ${gradeColor}; color: white; padding: 2px 10px; border-radius: 12px; font-weight: 700;">${mark.grade || '-'}</span>
                </td>
                <td style="padding: 12px 16px; text-align: center;">${mark.points || mark.Points || 0.0}</td>
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
        <div style="padding: 12px 16px; background: #f8fafc; border-top: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; font-size: 13px; color: #94a3b8;">
            <span><i class="fas fa-list"></i> Showing ${marks.length} published mark(s)</span>
            <span><i class="fas fa-calendar"></i> Last updated: ${new Date().toLocaleDateString()}</span>
        </div>
    `;
    
    container.innerHTML = html;
    
    // Show summary section
    const summarySection = document.getElementById('pm_summary_section');
    if (summarySection) summarySection.style.display = 'block';
    const filterCount = document.getElementById('pm_filter_count');
    if (filterCount) filterCount.textContent = marks.length;
}

/**
 * Update statistics cards
 */
function updatePublishedStats() {
    const marks = PUBLISHED_STATE.marks;
    const total = marks.length;
    const passed = marks.filter(m => m.status === 'Pass' || m.status === 'PASS').length;
    const failed = marks.filter(m => m.status === 'Fail' || m.status === 'FAIL').length;
    const avg = total > 0 ? (marks.reduce((sum, m) => sum + (m.total || 0), 0) / total) : 0;
    
    // Calculate GPA
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

/**
 * Update the badge count
 */
function updatePublishedBadge() {
    const badge = document.getElementById('publishedMarksBadge');
    if (badge) {
        const count = PUBLISHED_STATE.marks.length;
        badge.textContent = count;
        badge.style.display = count > 0 ? 'inline-block' : 'inline-block';
        if (count === 0) {
            badge.textContent = '0';
        }
    }
}

/**
 * Filter published marks
 */
function filterPublishedMarks() {
    const programFilter = document.getElementById('pm_program_filter')?.value || 'all';
    const blockFilter = document.getElementById('pm_block_filter')?.value || 'all';
    const yearFilter = document.getElementById('pm_year_filter')?.value || 'all';
    const searchTerm = document.getElementById('pm_search')?.value?.toLowerCase() || '';
    
    let filtered = [...PUBLISHED_STATE.marks];
    
    if (programFilter !== 'all') {
        filtered = filtered.filter(m => m.program === programFilter);
    }
    
    if (blockFilter !== 'all') {
        filtered = filtered.filter(m => m.block === blockFilter);
    }
    
    if (yearFilter !== 'all') {
        filtered = filtered.filter(m => m.year === yearFilter);
    }
    
    if (searchTerm) {
        filtered = filtered.filter(m => 
            (m.unit_code || '').toLowerCase().includes(searchTerm) ||
            (m.unit_name || '').toLowerCase().includes(searchTerm)
        );
    }
    
    PUBLISHED_STATE.filtered = filtered;
    renderPublishedMarks();
    const filterCount = document.getElementById('pm_filter_count');
    if (filterCount) filterCount.textContent = filtered.length;
}

/**
 * Export published marks to CSV
 */
function exportPublishedMarksToCSV() {
    const marks = PUBLISHED_STATE.filtered;
    if (!marks || marks.length === 0) {
        if (typeof window.showNotification === 'function') {
            window.showNotification('No marks to export', 'warning');
        }
        return;
    }
    
    const headers = ['Unit Code', 'Unit Name', 'Program', 'Block', 'Year', 'CAT 1', 'CAT 2', 'Exam', 'Total', 'Grade', 'Points', 'Status', 'Published Date'];
    const rows = marks.map(m => [
        m.unit_code || m.unitCode || '',
        m.unit_name || m.unitName || '',
        getProgramDisplayName(m.program),
        m.block || '',
        m.year || '',
        m.cat1 || m.CAT1 || '',
        m.cat2 || m.CAT2 || '',
        m.exam || '',
        m.total || 0,
        m.grade || '',
        m.points || 0.0,
        m.status || '',
        m.published_date || m.publishedDate || ''
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

/**
 * Escape HTML helper (if not already defined globally)
 */
function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// ============================================================
// EXPOSE FUNCTIONS TO GLOBAL SCOPE
// ============================================================

window.loadPublishedMarks = loadPublishedMarks;
window.filterPublishedMarks = filterPublishedMarks;
window.exportPublishedMarksToCSV = exportPublishedMarksToCSV;
window.getProgramDisplayName = getProgramDisplayName;
window.getGradeColor = getGradeColor;
window.PUBLISHED_STATE = PUBLISHED_STATE;
window.escapeHtml = escapeHtml;

// Make sure getCurrentUser is available
if (typeof window.getCurrentUser === 'undefined') {
    window.getCurrentUser = getCurrentUserFallback;
}

console.log('✅ Published Marks module loaded successfully!');
console.log('📊 Available functions: loadPublishedMarks, filterPublishedMarks, exportPublishedMarksToCSV');
