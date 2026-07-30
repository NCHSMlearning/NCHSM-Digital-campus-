// ============================================================
// PUBLISHED MARKS - SUPER ADMIN (TVET & KRCHN Nursing)
// FULLY INTEGRATED with Marks Entry System
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
        return true; // Super Admin by default
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
            
            // Apply program filter if set
            if (PUBLISHED_STATE.currentProgramFilter !== 'all') {
                if (PUBLISHED_STATE.currentProgramFilter === 'KRCHN') {
                    query = query.eq('program', 'KRCHN');
                } else if (PUBLISHED_STATE.currentProgramFilter === 'TVET') {
                    // TVET includes all non-KRCHN programs
                    query = query.neq('program', 'KRCHN');
                }
            }
            
            // Apply other filters from UI
            const programFilter = document.getElementById('pm_program_filter')?.value;
            if (programFilter && programFilter !== 'all' && PUBLISHED_STATE.currentProgramFilter === 'all') {
                query = query.eq('program', programFilter);
            }
            
            const blockFilter = document.getElementById('pm_block_filter')?.value;
            if (blockFilter && blockFilter !== 'all') {
                query = query.eq('block', blockFilter);
            }
            
            const yearFilter = document.getElementById('pm_year_filter')?.value;
            if (yearFilter && yearFilter !== 'all') {
                query = query.eq('academic_year', yearFilter);
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
        
        if (typeof window.hideLoading === 'function') window.hideLoading();
        PUBLISHED_STATE.isLoading = false;
        
        if (marks.length === 0 && typeof window.showNotification === 'function') {
            window.showNotification('No marks found', 'info');
        } else if (marks.length > 0 && typeof window.showNotification === 'function') {
            window.showNotification(`✅ Loaded ${marks.length} marks`, 'success');
        }
        
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
        if (typeof window.showNotification === 'function') {
            window.showNotification('❌ Error loading marks: ' + error.message, 'error');
        }
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
// FILTER BY PROGRAM TYPE
// ============================================================

function filterPublishedByProgram(programType) {
    console.log('📊 Filtering by program:', programType);
    
    // Update button styles
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
    
    // Update label
    const labels = {
        'all': 'All Programs',
        'KRCHN': '🎓 KRCHN Nursing',
        'TVET': '🔧 TVET Programs'
    };
    const labelEl = document.getElementById('pm_current_filter_label');
    if (labelEl) labelEl.textContent = labels[programType] || 'All Programs';
    
    // Set filter and reload
    PUBLISHED_STATE.currentProgramFilter = programType;
    
    // Update program filter dropdown
    const programFilter = document.getElementById('pm_program_filter');
    if (programFilter) {
        programFilter.value = programType === 'all' ? 'all' : programType;
    }
    
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
        
        // Separate KRCHN blocks and TVET terms
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
// RENDER PUBLISHED MARKS TABLE
// ============================================================

function renderPublishedMarks() {
    const container = document.getElementById('publishedMarksContainer');
    if (!container) return;
    
    const marks = PUBLISHED_STATE.filtered;
    
    // Apply status filter
    const statusFilter = document.getElementById('pm_status_filter')?.value || 'all';
    let displayMarks = marks;
    if (statusFilter === 'published') {
        displayMarks = marks.filter(m => m.published === true);
    } else if (statusFilter === 'draft') {
        displayMarks = marks.filter(m => m.published !== true);
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
    
    const publishedCount = marks.filter(m => m.published === true).length;
    const totalCount = displayMarks.length;
    const isAdmin = isUserAdmin();
    
    let html = `
        <div style="margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; padding: 0 4px;">
            <div style="display: flex; gap: 15px; flex-wrap: wrap; font-size: 12px; color: #64748b;">
                <span><i class="fas fa-list"></i> <strong>${totalCount}</strong> shown</span>
                <span><i class="fas fa-check-circle" style="color: #10b981;"></i> <strong>${publishedCount}</strong> published</span>
                <span><i class="fas fa-file-alt" style="color: #f59e0b;"></i> <strong>${marks.length - publishedCount}</strong> draft</span>
                <span><i class="fas fa-tag" style="color: #8b5cf6;"></i> <span id="pm_display_program_count">${displayMarks.filter(m => m.program === 'KRCHN').length} KRCHN, ${displayMarks.filter(m => m.program !== 'KRCHN').length} TVET</span></span>
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
                        <th style="padding: 8px 12px; text-align: center;">Block/Term</th>
                        <th style="padding: 8px 12px; text-align: center;">Program</th>
                        <th style="padding: 8px 12px; text-align: center;">Status</th>
                        <th style="padding: 8px 12px; text-align: center;">Published</th>
                        ${isAdmin ? `<th style="padding: 8px 12px; text-align: center;">Action</th>` : ''}
                    </tr>
                </thead>
                <tbody>
    `;
    
    displayMarks.forEach((mark, index) => {
        const isPublished = mark.published === true;
        const statusColor = isPublished ? '#10b981' : '#94a3b8';
        const statusText = isPublished ? '✅ Published' : '📝 Draft';
        const passStatus = mark.final_score >= 60;
        const scoreColor = passStatus ? '#10b981' : '#dc2626';
        const gradeColor = getGradeColor(mark.grade);
        const admissionDisplay = mark.admission_number || '-';
        const studentName = mark.student_name || 'Unknown';
        const subjectName = mark.subject_name || 'N/A';
        const blockDisplay = mark.block || '-';
        const programDisplay = mark.program || 'N/A';
        const programType = getProgramType(mark.program);
        const programIcon = programType === 'KRCHN' ? '🎓' : '🔧';
        const score = mark.final_score || 0;
        const grade = mark.grade || '-';
        
        html += `
            <tr style="border-bottom: 1px solid #f1f5f9; transition: background 0.2s;" 
                onmouseover="this.style.background='#f8fafc'" 
                onmouseout="this.style.background='transparent'">
                <td style="padding: 8px 12px; text-align: center; color: #94a3b8;">${index + 1}</td>
                <td style="padding: 8px 12px; font-weight: 500;">${escapeHtml(studentName)}</td>
                <td style="padding: 8px 12px; font-size: 12px; color: #64748b;">${escapeHtml(admissionDisplay)}</td>
                <td style="padding: 8px 12px;"><strong>${escapeHtml(subjectName)}</strong></td>
                <td style="padding: 8px 12px; text-align: center; font-weight: 600; color: ${scoreColor};">${score}%</td>
                <td style="padding: 8px 12px; text-align: center;">
                    <span style="background: ${gradeColor}; color: white; padding: 2px 10px; border-radius: 12px; font-weight: 700; font-size: 12px;">${escapeHtml(grade)}</span>
                </td>
                <td style="padding: 8px 12px; text-align: center;">${escapeHtml(blockDisplay)}</td>
                <td style="padding: 8px 12px; text-align: center;">
                    <span style="background: ${programType === 'KRCHN' ? '#dbeafe' : '#fef3c7'}; padding: 2px 10px; border-radius: 12px; font-size: 11px;">
                        ${programIcon} ${escapeHtml(programDisplay)}
                    </span>
                </td>
                <td style="padding: 8px 12px; text-align: center;">
                    <span style="color: ${passStatus ? '#10b981' : '#dc2626'}; font-weight: 600; font-size: 12px;">
                        ${passStatus ? '✅ Pass' : '❌ Fail'}
                    </span>
                </td>
                <td style="padding: 8px 12px; text-align: center;">
                    <span style="color: ${statusColor}; font-weight: 600; font-size: 12px;">${statusText}</span>
                    ${isPublished ? `<br><span style="font-size: 10px; color: #94a3b8;">${mark.published_at ? new Date(mark.published_at).toLocaleDateString() : ''}</span>` : ''}
                </td>
                ${isAdmin ? `
                <td style="padding: 8px 12px; text-align: center; white-space: nowrap;">
                    ${isPublished ? `
                        <button onclick="unpublishSingleStudentMarks('${escapeHtml(admissionDisplay)}', '${escapeHtml(subjectName)}')" 
                                style="background: #dc2626; color: white; border: none; padding: 4px 12px; border-radius: 4px; cursor: pointer; font-size: 11px; transition: all 0.2s;"
                                onmouseover="this.style.background='#b91c1c'"
                                onmouseout="this.style.background='#dc2626'">
                            <i class="fas fa-lock"></i> Unpublish
                        </button>
                    ` : `
                        <button onclick="publishSingleStudentMarks('${escapeHtml(admissionDisplay)}', '${escapeHtml(subjectName)}')" 
                                style="background: #10b981; color: white; border: none; padding: 4px 12px; border-radius: 4px; cursor: pointer; font-size: 11px; transition: all 0.2s;"
                                onmouseover="this.style.background='#059669'"
                                onmouseout="this.style.background='#10b981'">
                            <i class="fas fa-share-alt"></i> Publish
                        </button>
                    `}
                </td>
                ` : ''}
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
// UPDATE STATS
// ============================================================

function updateStats(marks) {
    const total = marks.length;
    const passed = marks.filter(m => m.final_score >= 60).length;
    const failed = marks.filter(m => m.final_score > 0 && m.final_score < 60).length;
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
    
    // Show summary section if there are marks
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
    const yearFilter = document.getElementById('pm_year_filter')?.value || 'all';
    const searchTerm = document.getElementById('pm_search')?.value?.toLowerCase() || '';
    
    let filtered = [...PUBLISHED_STATE.marks];
    
    // Apply program type filter (from quick buttons)
    if (PUBLISHED_STATE.currentProgramFilter === 'KRCHN') {
        filtered = filtered.filter(m => m.program === 'KRCHN');
    } else if (PUBLISHED_STATE.currentProgramFilter === 'TVET') {
        filtered = filtered.filter(m => m.program !== 'KRCHN');
    }
    
    // Apply subject filter
    if (subjectFilter !== 'all') filtered = filtered.filter(m => m.subject_name === subjectFilter);
    
    // Apply program filter (from dropdown)
    if (programFilter !== 'all' && PUBLISHED_STATE.currentProgramFilter === 'all') {
        filtered = filtered.filter(m => m.program === programFilter);
    }
    
    if (blockFilter !== 'all') filtered = filtered.filter(m => m.block === blockFilter);
    if (yearFilter !== 'all') filtered = filtered.filter(m => m.academic_year === yearFilter);
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
}

// ============================================================
// PUBLISH SINGLE STUDENT MARKS
// ============================================================

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
// UNPUBLISH SINGLE STUDENT MARKS
// ============================================================

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
        
        // Trigger preview update
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
    
    const headers = ['Student Name', 'Admission Number', 'Subject/Unit', 'Block/Term', 'Program', 'Year', 'Score', 'Grade', 'Points', 'Status', 'Published'];
    const rows = marks.map(mark => [
        `"${(mark.student_name || '').replace(/"/g, '""')}"`,
        `"${(mark.admission_number || '').replace(/"/g, '""')}"`,
        `"${(mark.subject_name || '').replace(/"/g, '""')}"`,
        `"${(mark.block || '').replace(/"/g, '""')}"`,
        `"${(mark.program || '').replace(/"/g, '""')}"`,
        `"${(mark.academic_year || '').replace(/"/g, '""')}"`,
        mark.final_score || 0,
        mark.grade || '-',
        mark.points || 0,
        mark.final_score >= 60 ? 'Pass' : 'Fail',
        mark.published ? 'Yes' : 'No'
    ]);
    
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
        const passStatus = mark.final_score >= 60;
        const programType = getProgramType(mark.program);
        const programIcon = programType === 'KRCHN' ? '🎓' : '🔧';
        tableRows += `
            <tr>
                <td style="padding: 6px 10px; border: 1px solid #ddd; text-align: center;">${index + 1}</td>
                <td style="padding: 6px 10px; border: 1px solid #ddd;">${mark.student_name || 'Unknown'}</td>
                <td style="padding: 6px 10px; border: 1px solid #ddd;">${mark.admission_number || '-'}</td>
                <td style="padding: 6px 10px; border: 1px solid #ddd;">${mark.subject_name || 'N/A'}</td>
                <td style="padding: 6px 10px; border: 1px solid #ddd; text-align: center;">${mark.final_score || 0}%</td>
                <td style="padding: 6px 10px; border: 1px solid #ddd; text-align: center;">${mark.grade || '-'}</td>
                <td style="padding: 6px 10px; border: 1px solid #ddd; text-align: center;">${mark.block || '-'}</td>
                <td style="padding: 6px 10px; border: 1px solid #ddd; text-align: center;">${programIcon} ${mark.program || 'N/A'}</td>
                <td style="padding: 6px 10px; border: 1px solid #ddd; text-align: center;">${passStatus ? 'Pass' : 'Fail'}</td>
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
                table { width: 100%; border-collapse: collapse; font-size: 12px; }
                th { background: #0A3D62; color: white; padding: 8px 10px; border: 1px solid #0A3D62; text-align: left; }
                td { padding: 6px 10px; border: 1px solid #ddd; }
                .footer { margin-top: 20px; text-align: center; font-size: 11px; color: #888; }
                .print-date { text-align: right; color: #666; font-size: 11px; margin-bottom: 10px; }
            </style>
        </head>
        <body>
            <h1>📊 Published Marks Report</h1>
            <div class="print-date">Generated: ${new Date().toLocaleString()}</div>
            <div class="header-info">
                <p><strong>Total Marks:</strong> ${marks.length} | <strong>Published:</strong> ${marks.filter(m => m.published).length}</p>
                <p><strong>KRCHN:</strong> ${marks.filter(m => m.program === 'KRCHN').length} | <strong>TVET:</strong> ${marks.filter(m => m.program !== 'KRCHN').length}</p>
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
                        <th>Status</th>
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
    const filterSelectors = ['pm_subject_filter', 'pm_program_filter', 'pm_block_filter', 'pm_status_filter', 'pm_year_filter'];
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
    
    // Set up program type filter buttons
    const filterButtons = ['pm_filter_all', 'pm_filter_krchn', 'pm_filter_tvet'];
    filterButtons.forEach(id => {
        const btn = document.getElementById(id);
        if (btn) {
            btn.removeEventListener('click', () => {});
            // The onclick attribute handles this
        }
    });
    
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
    publishSingle: publishSingleStudentMarks,
    unpublishSingle: unpublishSingleStudentMarks,
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
window.loadPublishedMarks = loadPublishedMarks;
window.filterPublishedByProgram = filterPublishedByProgram;
window.updatePublishProgramOptions = updatePublishProgramOptions;
window.updatePublishPreview = updatePublishPreview;
window.populatePublishUnits = populatePublishUnits;

console.log('✅ Published Marks module loaded successfully!');
console.log('📊 Features:');
console.log('   - ✅ TVET & KRCHN Nursing support');
console.log('   - ✅ Quick filter by program type');
console.log('   - ✅ Individual publish/unpublish');
console.log('   - ✅ Bulk publish with program filter');
console.log('   - ✅ Publish/Unpublish all filtered');
console.log('   - ✅ Export to CSV');
console.log('   - ✅ Print functionality');
console.log('   - ✅ Program type counts');
console.log('   - ✅ Block/Term dual support');
console.log('   - ✅ Production ready - NO DEMO DATA');
