// ============================================================
// ENSURE SUPABASE CLIENT IS AVAILABLE
// ============================================================
(function ensureSupabaseClient() {
    if (typeof sb !== 'undefined' && sb) {
        window.sb = sb;
        console.log('✅ sb already defined in analytics');
        return;
    }
    
    if (typeof window.sb !== 'undefined' && window.sb) {
        console.log('✅ sb found on window in analytics');
        return;
    }
    
    console.warn('⚠️ sb not available, waiting...');
    
    let attempts = 0;
    const maxAttempts = 30;
    
    const waitForSb = setInterval(() => {
        attempts++;
        
        if (typeof window.sb !== 'undefined' && window.sb) {
            clearInterval(waitForSb);
            console.log('✅ sb became available after', attempts, 'attempts in analytics');
            if (typeof window.loadAnalyticsData === 'function') {
                setTimeout(window.loadAnalyticsData, 200);
            }
            return;
        }
        
        if (attempts >= maxAttempts) {
            clearInterval(waitForSb);
            console.error('❌ sb not available in analytics after', maxAttempts, 'attempts');
            const placeholder = document.getElementById('analyticsPlaceholder');
            if (placeholder) {
                placeholder.innerHTML = `
                    <div style="text-align: center; padding: 40px; color: #dc2626;">
                        <i class="fas fa-exclamation-circle" style="font-size: 48px;"></i>
                        <h3>Database Connection Error</h3>
                        <p>Please refresh the page to reconnect.</p>
                    </div>
                `;
            }
        }
    }, 200);
})();

const supabase = (typeof sb !== 'undefined') ? sb : window.sb;

// ============================================================
// SUPER ADMIN ANALYTICS MODULE - COMPLETE
// ============================================================

console.log('📊 Super Admin Analytics Module Loading...');

// ============================================================
// GLOBAL VARIABLES
// ============================================================

window.analyticsChartInstances = {
    gradeChart: null,
    subjectChart: null,
    blockChart: null,
    programChart: null,
    genderChart: null,
    examTypeChart: null,
    gradeByExamChart: null,
    unitRankingChart: null
};

// ============================================================
// GRADING SYSTEM - NCHSM EXACT CONFIGURATION
// ============================================================

window.getGradeInfo = function(score) {
    // Ensure score is a valid number
    const numScore = parseFloat(score);
    if (isNaN(numScore) || numScore <= 0) {
        return { grade: 'N/A', points: 0, label: 'PENDING', color: '#94a3b8' };
    }
    if (numScore >= 75 && numScore <= 100) {
        return { grade: 'A', points: 4, label: 'DISTINCTION', color: '#10b981' };
    } else if (numScore >= 65 && numScore <= 74.99) {
        return { grade: 'B', points: 3, label: 'CREDIT', color: '#3b82f6' };
    } else if (numScore >= 60 && numScore <= 64.99) {
        return { grade: 'C', points: 2, label: 'PASS', color: '#f59e0b' };
    } else if (numScore > 0 && numScore <= 59.99) {
        return { grade: 'FAIL', points: 0, label: 'FAIL', color: '#ef4444' };
    } else {
        return { grade: 'N/A', points: 0, label: 'PENDING', color: '#94a3b8' };
    }
};

window.calculateGrade = function(score) {
    if (score >= 75) return 'A';
    if (score >= 65) return 'B';
    if (score >= 60) return 'C';
    if (score > 0) return 'FAIL';
    return 'N/A';
};

window.calculateGradePoints = function(grade) {
    const points = { 'A': 4, 'B': 3, 'C': 2, 'FAIL': 0 };
    return points[grade] || 0;
};

window.escapeHtml = function(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
};

window.getProgramDisplayName = function(programCode) {
    const names = {
        'KRCHN': 'KRCHN Nursing',
        'DPOTT': 'Diploma in Perioperative Theatre Technology',
        'DCH': 'Diploma in Community Health',
        'DHRIT': 'Diploma in Health Records and IT',
        'DSL': 'Diploma in Science Lab',
        'DSW': 'Diploma in Social Work',
        'DCJS': 'Diploma in Criminal Justice',
        'DHSS': 'Diploma in Health Support Services',
        'DICT': 'Diploma in ICT',
        'DME': 'Diploma in Medical Engineering',
        'CPOTT': 'Certificate in Perioperative Theatre Technology',
        'CCH': 'Certificate in Community Health',
        'CHRIT': 'Certificate in Health Records and IT',
        'CPC': 'Certificate in Patient Care',
        'CSL': 'Certificate in Science Lab',
        'CSW': 'Certificate in Social Work',
        'CCJS': 'Certificate in Criminal Justice',
        'CAG': 'Certificate in Agriculture',
        'CHSS': 'Certificate in Health Support Services',
        'CICT': 'Certificate in ICT',
        'ACH': 'Artisan in Community Health',
        'AAG': 'Artisan in Agriculture',
        'ASW': 'Artisan in Social Work',
        'CCA': 'Certificate in Computer Applications',
        'PTE': 'TVET/CDACC (PTE)'
    };
    return names[programCode] || programCode;
};

// ============================================================
// SCROLL TO SECTION - SMOOTH SCROLLING
// ============================================================

window.scrollToSection = function(sectionId) {
    const element = document.getElementById(sectionId);
    if (element) {
        const offset = 80;
        const elementPosition = element.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - offset;
        
        window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
        });
    }
};

// ============================================================
// TERMINOLOGY SWITCHER - TVET vs KRCHN
// ============================================================

window.updateTerminology = function() {
    const program = document.getElementById('analytics_program_select')?.value || 'all';
    const isKRCHN = program === 'KRCHN';
    const isTVET = program !== 'all' && program !== 'KRCHN';
    
    let term = 'Block';
    let plural = 'Blocks';
    let periodLabel = 'Block';
    
    if (isKRCHN) {
        term = 'Block';
        plural = 'Blocks';
        periodLabel = 'Block';
    } else if (isTVET) {
        term = 'Term';
        plural = 'Terms';
        periodLabel = 'Term';
    } else {
        term = 'Block';
        plural = 'Blocks';
        periodLabel = 'Block';
    }
    
    const labelMap = {
        'periodLabel': periodLabel + '/Stage',
        'periodChartLabel': periodLabel,
        'periodOverviewLabel': periodLabel,
        'periodTableLabel': periodLabel,
        'periodSummaryLabel': periodLabel,
        'periodTableHeader': periodLabel,
        'examPeriodLabel': periodLabel,
        'progressionPeriodLabel': plural.toLowerCase(),
        'improvementPeriodLabel': periodLabel,
        'improvementPeriodLabel2': periodLabel,
        'terminologyLabel': `Using: ${plural} (${isKRCHN ? 'KRCHN' : isTVET ? 'TVET' : 'All'})`
    };
    
    for (const [id, text] of Object.entries(labelMap)) {
        const el = document.getElementById(id);
        if (el) el.textContent = text;
    }
    
    // Update progression column headers
    const progCols = ['progCol1', 'progCol2', 'progCol3', 'progCol4', 'progCol5'];
    const blockNames = ['Introductory', 'Block 1', 'Block 2', 'Block 3', 'Block 4'];
    const termNames = ['Term 1', 'Term 2', 'Term 3', 'Term 4', 'Term 5'];
    const names = isKRCHN ? blockNames : (isTVET ? termNames : blockNames);
    
    progCols.forEach((id, index) => {
        const el = document.getElementById(id);
        if (el && names[index]) el.textContent = names[index];
    });
    
    // Show/hide dropdown options
    const krchnBlocks = document.getElementById('krchnBlocks');
    const tvetTerms = document.getElementById('tvetTerms');
    if (krchnBlocks) krchnBlocks.style.display = isKRCHN ? '' : 'none';
    if (tvetTerms) tvetTerms.style.display = isTVET ? '' : 'none';
    
    // Auto-select appropriate option
    const blockSelect = document.getElementById('analytics_block_select');
    if (blockSelect) {
        const currentVal = blockSelect.value;
        const blockValues = ['Introductory', 'Block 1', 'Block 2', 'Block 3', 'Block 4', 'Block 5', 'Final'];
        const termValues = ['Term 1', 'Term 2', 'Term 3', 'Term 4', 'Term 5', 'Term 6', 'Final'];
        
        if (isTVET && blockValues.includes(currentVal)) {
            const termMap = {
                'Introductory': 'Term 1',
                'Block 1': 'Term 2',
                'Block 2': 'Term 3',
                'Block 3': 'Term 4',
                'Block 4': 'Term 5',
                'Block 5': 'Term 6',
                'Final': 'Final'
            };
            blockSelect.value = termMap[currentVal] || 'Term 1';
        }
        if (isKRCHN && termValues.includes(currentVal)) {
            const blockMap = {
                'Term 1': 'Introductory',
                'Term 2': 'Block 1',
                'Term 3': 'Block 2',
                'Term 4': 'Block 3',
                'Term 5': 'Block 4',
                'Term 6': 'Block 5',
                'Final': 'Final'
            };
            blockSelect.value = blockMap[currentVal] || 'Introductory';
        }
    }
};

// ============================================================
// SHOW ANALYTICS LOADING
// ============================================================

window.showAnalyticsLoading = function(isLoading) {
    const placeholder = document.getElementById('analyticsPlaceholder');
    const dynamicContent = document.getElementById('analyticsDynamicContent');
    
    if (isLoading) {
        if (placeholder) {
            placeholder.style.display = 'block';
            placeholder.innerHTML = `
                <div style="text-align: center; padding: 60px 20px;">
                    <div class="loading-spinner" style="display: inline-block; width: 50px; height: 50px; border: 4px solid #e5e7eb; border-top-color: #ec4899; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                    <h3 style="color: #1e293b; margin-top: 16px;">Loading Analytics...</h3>
                    <p style="color: #94a3b8;">Please wait while we fetch the data</p>
                </div>
            `;
        }
        if (dynamicContent) dynamicContent.style.display = 'none';
    } else {
        if (placeholder) {
            placeholder.innerHTML = `
                <i class="fas fa-chart-line" style="font-size: 48px; color: #94a3b8; margin-bottom: 16px; display: block;"></i>
                <h3 style="color: #1e293b;">Select filters and click "Load Analytics"</h3>
                <p style="color: #94a3b8;">Choose program, block, and year to view analytics</p>
            `;
        }
    }
};

// ============================================================
// LOAD ANALYTICS DATA - MAIN FUNCTION
// ============================================================

window.loadAnalyticsData = async function() {
    console.log('📊 Loading analytics data...');
    
    const program = document.getElementById('analytics_program_select')?.value || 'all';
    const year = document.getElementById('analytics_year_select')?.value || '2025';
    const block = document.getElementById('analytics_block_select')?.value || 'all';
    const metric = document.getElementById('analytics_metric_select')?.value || 'overview';
    
    window.showAnalyticsLoading(true);
    
    const client = supabase || window.sb;
    if (!client) {
        console.error('❌ Supabase client not available');
        window.showAnalyticsLoading(false);
        return;
    }
    
    try {
        // 1. GET STUDENTS
        let studentQuery = client
            .from('consolidated_user_profiles_table')
            .select('*')
            .eq('role', 'student')
            .eq('status', 'approved');
        
        if (program !== 'all') {
            if (program === 'TVET') {
                studentQuery = studentQuery.neq('program', 'KRCHN');
            } else {
                studentQuery = studentQuery.eq('program', program);
            }
        }
        if (block !== 'all') studentQuery = studentQuery.eq('block', block);
        if (year) studentQuery = studentQuery.eq('intake_year', year);
        
        const { data: students, error: studentError } = await studentQuery;
        if (studentError) throw studentError;
        console.log(`👥 Found ${students?.length || 0} students`);
        
        // 2. GET MARKS
        const studentIds = students?.map(s => s.student_id) || [];
        let marksQuery = client
            .from('student_marks')
            .select('*')
            .eq('academic_year', year)
            .in('admission_number', studentIds.length > 0 ? studentIds : ['none']);
        
        if (block !== 'all') marksQuery = marksQuery.eq('block', block);
        
        const { data: marks, error: marksError } = await marksQuery;
        if (marksError) throw marksError;
        console.log(`📊 Found ${marks?.length || 0} marks records`);
        
        // 3. PROCESS DATA
        let filteredStudents = students || [];
        const totalStudents = filteredStudents.length;
        const filteredStudentIds = filteredStudents.map(s => s.student_id);
        
        let filteredMarks = marks || [];
        if (filteredStudentIds.length > 0) {
            filteredMarks = marks.filter(m => filteredStudentIds.includes(m.admission_number));
        }
        
        const totalSubjects = [...new Set(filteredMarks?.map(m => m.subject_name) || [])].length;
        
        // 4. CALCULATE STATISTICS
        let totalScore = 0, scoredCount = 0, passedCount = 0, atRiskCount = 0;
        let totalPoints = 0, aCount = 0, bCount = 0, cCount = 0, failCount = 0;
        
        filteredMarks?.forEach(m => {
            const score = m.final_score || 0;
            if (score > 0) {
                const gradeInfo = window.getGradeInfo(score);
                totalScore += score;
                scoredCount++;
                totalPoints += gradeInfo.points;
                if (score >= 60) passedCount++;
                else atRiskCount++;
                if (score >= 75) aCount++;
                else if (score >= 65) bCount++;
                else if (score >= 60) cCount++;
                else failCount++;
            }
        });
        
        const avgScore = scoredCount > 0 ? Math.round((totalScore / scoredCount) * 10) / 10 : 0;
        const passRate = scoredCount > 0 ? Math.round((passedCount / scoredCount) * 100) : 0;
        const avgPoints = scoredCount > 0 ? Math.round((totalPoints / scoredCount) * 10) / 10 : 0;
        
        // 5. UPDATE STATS CARDS
        document.getElementById('analytics_total_students').textContent = totalStudents;
        document.getElementById('analytics_pass_rate').textContent = passRate + '%';
        document.getElementById('analytics_avg_score').textContent = avgScore + '%';
        document.getElementById('analytics_active_subjects').textContent = totalSubjects;
        document.getElementById('analytics_at_risk').textContent = atRiskCount;
        document.getElementById('analytics_improvement').textContent = '0%';
        document.getElementById('analytics_failing_units').textContent = '0';
        
        // Calculate gender ratio
        const females = filteredStudents.filter(s => s.gender === 'Female').length;
        const males = filteredStudents.filter(s => s.gender === 'Male').length;
        document.getElementById('analytics_gender_ratio').textContent = `${females} : ${males}`;
        
        // 6. UPDATE PROGRAM BADGE
        const programLabel = document.getElementById('analytics_program_label');
        if (programLabel) {
            if (program === 'all') programLabel.textContent = 'All Programs';
            else if (program === 'TVET') programLabel.textContent = 'TVET Programs';
            else programLabel.textContent = window.getProgramDisplayName(program) || program;
        }
        
        // 7. UPDATE TABLE HEADERS
        document.getElementById('analytics_student_count').textContent = totalStudents;
        document.getElementById('analytics_program_display').textContent = programLabel?.textContent || 'All Programs';
        document.getElementById('analytics_block_year_display').textContent = `${year} - ${block === 'all' ? 'All Blocks' : block}`;
        
        // 8. RENDER CHARTS
        window.renderGradeDistributionChart(filteredMarks);
        window.renderSubjectPerformanceChart(filteredMarks);
        window.renderBlockPerformanceChart(filteredStudents, filteredMarks);
        window.renderProgramComparisonChart(filteredStudents, filteredMarks);
        window.renderUnitRankingChart(filteredMarks);
        window.renderGenderChart(filteredStudents, filteredMarks);
        window.renderExamTypeChart(filteredMarks);
        window.renderGradeByExamChart(filteredMarks);
        
        // 9. RENDER TABLES
        window.renderAnalyticsSubjectTable(filteredMarks, filteredStudents, program, block);
        window.renderAnalyticsStudentTable(filteredStudents, filteredMarks);
        window.renderAnalyticsBlockTable(filteredStudents, filteredMarks, block);
        window.renderAnalyticsProgramTable(filteredStudents, filteredMarks);
        window.renderAnalyticsTrendsTable(filteredStudents, filteredMarks);
        window.renderAnalyticsExamDetails(filteredMarks, filteredStudents);
        
        // 10. RENDER NEW SECTIONS
        window.renderUnitRankings(filteredMarks, filteredStudents, program, block);
        window.renderTopStudents(filteredStudents, filteredMarks);
        window.renderWeakStudents(filteredStudents, filteredMarks);
        window.renderBlockFilterStats(filteredStudents, filteredMarks, block);
        window.renderDifficultyHeatmap(filteredMarks);
        window.renderProgressionTable(filteredStudents, filteredMarks);
        
        // ============================================
        // 11. STORE DATA FOR CONSOLIDATED MARKSHEET
        // ============================================
        window._analyticsStudents = filteredStudents;
        window._analyticsMarks = filteredMarks;
        
        // 12. RENDER CONSOLIDATED MARKSHEET
        if (typeof window.renderConsolidatedMarksheet === 'function') {
            window.renderConsolidatedMarksheet();
        }
        
        // 13. SHOW CONTENT
        document.getElementById('analyticsPlaceholder').style.display = 'none';
        document.getElementById('analyticsDynamicContent').style.display = 'block';
        
        console.log('✅ Analytics loaded successfully');
        
    } catch (error) {
        console.error('❌ Error loading analytics:', error);
        if (typeof window.showNotification === 'function') {
            window.showNotification('Error loading analytics: ' + error.message, 'error');
        }
    } finally {
        window.showAnalyticsLoading(false);
    }
};

// ============================================================
// RENDER GRADE DISTRIBUTION CHART
// ============================================================

window.renderGradeDistributionChart = function(marks) {
    const canvas = document.getElementById('analyticsGradeChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    if (window.analyticsChartInstances.gradeChart) {
        window.analyticsChartInstances.gradeChart.destroy();
        window.analyticsChartInstances.gradeChart = null;
    }
    
    const grades = { 'A': 0, 'B': 0, 'C': 0, 'FAIL': 0 };
    marks?.forEach(m => {
        const score = m.final_score || 0;
        if (score > 0) {
            if (score >= 75) grades.A++;
            else if (score >= 65) grades.B++;
            else if (score >= 60) grades.C++;
            else grades.FAIL++;
        }
    });
    
    window.analyticsChartInstances.gradeChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['A (75-100)', 'B (65-74)', 'C (60-64)', 'FAIL (0-59)'],
            datasets: [{
                data: [grades.A, grades.B, grades.C, grades.FAIL],
                backgroundColor: ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'],
                borderWidth: 2,
                borderColor: '#ffffff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom', labels: { padding: 10, usePointStyle: true } }
            }
        }
    });
};

// ============================================================
// RENDER SUBJECT PERFORMANCE CHART
// ============================================================

window.renderSubjectPerformanceChart = function(marks) {
    const canvas = document.getElementById('analyticsSubjectChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    if (window.analyticsChartInstances.subjectChart) {
        window.analyticsChartInstances.subjectChart.destroy();
        window.analyticsChartInstances.subjectChart = null;
    }
    
    const subjectData = {};
    marks?.forEach(m => {
        const subject = m.subject_name || 'Unknown';
        const score = m.final_score || 0;
        if (!subjectData[subject]) subjectData[subject] = { total: 0, count: 0, pass: 0 };
        if (score > 0) {
            subjectData[subject].total += score;
            subjectData[subject].count++;
            if (score >= 60) subjectData[subject].pass++;
        }
    });
    
    const sorted = Object.keys(subjectData).sort();
    const labels = sorted.map(s => s.length > 15 ? s.substring(0, 15) + '...' : s);
    const avgScores = sorted.map(s => subjectData[s].count > 0 ? Math.round(subjectData[s].total / subjectData[s].count) : 0);
    const passRates = sorted.map(s => subjectData[s].count > 0 ? Math.round((subjectData[s].pass / subjectData[s].count) * 100) : 0);
    
    window.analyticsChartInstances.subjectChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                { label: 'Avg Score (%)', data: avgScores, backgroundColor: 'rgba(99,102,241,0.7)', borderColor: '#6366f1', borderWidth: 1, borderRadius: 4 },
                { label: 'Pass Rate (%)', data: passRates, backgroundColor: 'rgba(16,185,129,0.7)', borderColor: '#10b981', borderWidth: 1, borderRadius: 4 }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom', labels: { padding: 10, usePointStyle: true } } },
            scales: { y: { beginAtZero: true, max: 100, ticks: { callback: v => v + '%' } } }
        }
    });
};

// ============================================================
// RENDER BLOCK PERFORMANCE CHART
// ============================================================

window.renderBlockPerformanceChart = function(students, marks) {
    const canvas = document.getElementById('analyticsBlockChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    if (window.analyticsChartInstances.blockChart) {
        window.analyticsChartInstances.blockChart.destroy();
        window.analyticsChartInstances.blockChart = null;
    }
    
    const blockData = {};
    const blockOrder = ['Introductory', 'Block 1', 'Block 2', 'Block 3', 'Block 4', 'Block 5', 'Final'];
    blockOrder.forEach(b => blockData[b] = { total: 0, count: 0, pass: 0, students: 0 });
    
    students?.forEach(s => {
        const block = s.block || 'Unknown';
        if (blockData[block]) blockData[block].students++;
        else blockData[block] = { total: 0, count: 0, pass: 0, students: 1 };
    });
    
    marks?.forEach(m => {
        const block = m.block || 'Unknown';
        const score = m.final_score || 0;
        if (blockData[block] && score > 0) {
            blockData[block].total += score;
            blockData[block].count++;
            if (score >= 60) blockData[block].pass++;
        }
    });
    
    const labels = Object.keys(blockData).filter(b => blockData[b].students > 0);
    const avgScores = labels.map(b => blockData[b].count > 0 ? Math.round(blockData[b].total / blockData[b].count) : 0);
    const passRates = labels.map(b => blockData[b].count > 0 ? Math.round((blockData[b].pass / blockData[b].count) * 100) : 0);
    
    window.analyticsChartInstances.blockChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                { label: 'Avg Score (%)', data: avgScores, backgroundColor: 'rgba(245,158,11,0.7)', borderColor: '#f59e0b', borderWidth: 1, borderRadius: 4 },
                { label: 'Pass Rate (%)', data: passRates, backgroundColor: 'rgba(16,185,129,0.7)', borderColor: '#10b981', borderWidth: 1, borderRadius: 4 }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom', labels: { padding: 10, usePointStyle: true } } },
            scales: { y: { beginAtZero: true, max: 100, ticks: { callback: v => v + '%' } } }
        }
    });
};

// ============================================================
// RENDER PROGRAM COMPARISON CHART
// ============================================================

window.renderProgramComparisonChart = function(students, marks) {
    const canvas = document.getElementById('analyticsProgramChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    if (window.analyticsChartInstances.programChart) {
        window.analyticsChartInstances.programChart.destroy();
        window.analyticsChartInstances.programChart = null;
    }
    
    const programData = {};
    students?.forEach(s => {
        const program = s.program || 'Unknown';
        if (!programData[program]) programData[program] = { total: 0, count: 0, pass: 0, students: 0 };
        programData[program].students++;
    });
    
    marks?.forEach(m => {
        const program = m.program_type || 'Unknown';
        const score = m.final_score || 0;
        if (programData[program] && score > 0) {
            programData[program].total += score;
            programData[program].count++;
            if (score >= 60) programData[program].pass++;
        }
    });
    
    const sorted = Object.keys(programData).sort((a, b) => programData[b].students - programData[a].students).slice(0, 8);
    const labels = sorted.map(p => window.getProgramDisplayName(p) || p);
    const avgScores = sorted.map(p => programData[p].count > 0 ? Math.round(programData[p].total / programData[p].count) : 0);
    const passRates = sorted.map(p => programData[p].count > 0 ? Math.round((programData[p].pass / programData[p].count) * 100) : 0);
    
    window.analyticsChartInstances.programChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                { label: 'Avg Score (%)', data: avgScores, backgroundColor: 'rgba(139,92,246,0.7)', borderColor: '#8b5cf6', borderWidth: 1, borderRadius: 4 },
                { label: 'Pass Rate (%)', data: passRates, backgroundColor: 'rgba(16,185,129,0.7)', borderColor: '#10b981', borderWidth: 1, borderRadius: 4 }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom', labels: { padding: 10, usePointStyle: true } } },
            scales: { y: { beginAtZero: true, max: 100, ticks: { callback: v => v + '%' } } }
        }
    });
};

// ============================================================
// RENDER UNIT RANKING CHART
// ============================================================

window.renderUnitRankingChart = function(marks) {
    const canvas = document.getElementById('analyticsUnitRankingChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    if (window.analyticsChartInstances.unitRankingChart) {
        window.analyticsChartInstances.unitRankingChart.destroy();
        window.analyticsChartInstances.unitRankingChart = null;
    }
    
    const subjectData = {};
    marks?.forEach(m => {
        const subject = m.subject_name || 'Unknown';
        const score = m.final_score || 0;
        if (!subjectData[subject]) subjectData[subject] = { total: 0, count: 0, pass: 0 };
        if (score > 0) {
            subjectData[subject].total += score;
            subjectData[subject].count++;
            if (score >= 60) subjectData[subject].pass++;
        }
    });
    
    const sorted = Object.keys(subjectData)
        .map(s => ({
            name: s,
            avg: subjectData[s].count > 0 ? Math.round(subjectData[s].total / subjectData[s].count) : 0,
            passRate: subjectData[s].count > 0 ? Math.round((subjectData[s].pass / subjectData[s].count) * 100) : 0
        }))
        .sort((a, b) => b.avg - a.avg)
        .slice(0, 15);
    
    const labels = sorted.map(s => s.name.length > 20 ? s.name.substring(0, 20) + '...' : s.name);
    const avgData = sorted.map(s => s.avg);
    const passData = sorted.map(s => s.passRate);
    const colors = avgData.map(avg => avg >= 80 ? 'rgba(16,185,129,0.8)' : avg >= 65 ? 'rgba(59,130,246,0.8)' : avg >= 60 ? 'rgba(245,158,11,0.8)' : 'rgba(239,68,68,0.8)');
    
    window.analyticsChartInstances.unitRankingChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                { label: 'Average Score (%)', data: avgData, backgroundColor: colors, borderColor: colors.map(c => c.replace('0.8', '1')), borderWidth: 1, borderRadius: 4 },
                { label: 'Pass Rate (%)', data: passData, backgroundColor: 'rgba(139,92,246,0.5)', borderColor: '#8b5cf6', borderWidth: 1, borderRadius: 4 }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: 'y',
            plugins: { legend: { position: 'top', labels: { padding: 10, usePointStyle: true } } },
            scales: { x: { beginAtZero: true, max: 100, ticks: { callback: v => v + '%' } } }
        }
    });
};

// ============================================================
// RENDER GENDER CHART
// ============================================================

window.renderGenderChart = function(students, marks) {
    const canvas = document.getElementById('analyticsGenderChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    if (window.analyticsChartInstances.genderChart) {
        window.analyticsChartInstances.genderChart.destroy();
        window.analyticsChartInstances.genderChart = null;
    }
    
    let maleTotal = 0, maleCount = 0, femaleTotal = 0, femaleCount = 0;
    
    students?.forEach(s => {
        const gender = s.gender || 'Unknown';
        const studentMarks = marks?.filter(m => m.admission_number === s.student_id) || [];
        studentMarks.forEach(m => {
            const score = m.final_score || 0;
            if (score > 0) {
                if (gender === 'Male') { maleTotal += score; maleCount++; }
                else if (gender === 'Female') { femaleTotal += score; femaleCount++; }
            }
        });
    });
    
    const maleAvg = maleCount > 0 ? Math.round(maleTotal / maleCount) : 0;
    const femaleAvg = femaleCount > 0 ? Math.round(femaleTotal / femaleCount) : 0;
    const gap = Math.abs(maleAvg - femaleAvg);
    
    document.getElementById('genderFemaleAvg').textContent = femaleAvg + '%';
    document.getElementById('genderMaleAvg').textContent = maleAvg + '%';
    document.getElementById('genderGap').textContent = gap + '%';
    
    window.analyticsChartInstances.genderChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Female', 'Male'],
            datasets: [{
                label: 'Average Score (%)',
                data: [femaleAvg, maleAvg],
                backgroundColor: ['rgba(236,72,153,0.7)', 'rgba(59,130,246,0.7)'],
                borderColor: ['#ec4899', '#3b82f6'],
                borderWidth: 2,
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true, max: 100, ticks: { callback: v => v + '%' } } }
        }
    });
};

// ============================================================
// RENDER CAT VS EXAM CHART
// ============================================================

window.renderExamTypeChart = function(marks) {
    const canvas = document.getElementById('analyticsExamTypeChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    if (window.analyticsChartInstances.examTypeChart) {
        window.analyticsChartInstances.examTypeChart.destroy();
        window.analyticsChartInstances.examTypeChart = null;
    }
    
    let cat1Total = 0, cat1Count = 0, cat2Total = 0, cat2Count = 0, examTotal = 0, examCount = 0;
    
    marks?.forEach(m => {
        if (m.cat1_score && m.cat1_score > 0) { cat1Total += m.cat1_score; cat1Count++; }
        if (m.cat2_score && m.cat2_score > 0) { cat2Total += m.cat2_score; cat2Count++; }
        if (m.exam_score && m.exam_score > 0) { examTotal += m.exam_score; examCount++; }
    });
    
    const cat1Avg = cat1Count > 0 ? Math.round(cat1Total / cat1Count) : 0;
    const cat2Avg = cat2Count > 0 ? Math.round(cat2Total / cat2Count) : 0;
    const examAvg = examCount > 0 ? Math.round(examTotal / examCount) : 0;
    
    document.getElementById('analytics_cat_avg').textContent = cat1Avg + '%';
    document.getElementById('analytics_exam_avg').textContent = examAvg + '%';
    
    window.analyticsChartInstances.examTypeChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['CAT 1', 'CAT 2', 'Final Exam'],
            datasets: [{
                label: 'Average Score (%)',
                data: [cat1Avg, cat2Avg, examAvg],
                backgroundColor: ['rgba(245,158,11,0.7)', 'rgba(245,158,11,0.5)', 'rgba(139,92,246,0.7)'],
                borderColor: ['#f59e0b', '#f59e0b', '#8b5cf6'],
                borderWidth: 2,
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true, max: 100, ticks: { callback: v => v + '%' } } }
        }
    });
};

// ============================================================
// RENDER GRADE BY EXAM CHART
// ============================================================

window.renderGradeByExamChart = function(marks) {
    const canvas = document.getElementById('analyticsGradeByExamChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    if (window.analyticsChartInstances.gradeByExamChart) {
        window.analyticsChartInstances.gradeByExamChart.destroy();
        window.analyticsChartInstances.gradeByExamChart = null;
    }
    
    const grades = { 'CAT1': { 'A': 0, 'B': 0, 'C': 0, 'FAIL': 0 }, 'CAT2': { 'A': 0, 'B': 0, 'C': 0, 'FAIL': 0 }, 'EXAM': { 'A': 0, 'B': 0, 'C': 0, 'FAIL': 0 } };
    
    marks?.forEach(m => {
        ['cat1_score', 'cat2_score', 'exam_score'].forEach((field, idx) => {
            const score = m[field] || 0;
            const key = ['CAT1', 'CAT2', 'EXAM'][idx];
            if (score > 0) {
                if (score >= 75) grades[key].A++;
                else if (score >= 65) grades[key].B++;
                else if (score >= 60) grades[key].C++;
                else grades[key].FAIL++;
            }
        });
    });
    
    window.analyticsChartInstances.gradeByExamChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['A (75-100)', 'B (65-74)', 'C (60-64)', 'FAIL (0-59)'],
            datasets: [
                { label: 'CAT 1', data: [grades.CAT1.A, grades.CAT1.B, grades.CAT1.C, grades.CAT1.FAIL], backgroundColor: 'rgba(245,158,11,0.7)' },
                { label: 'CAT 2', data: [grades.CAT2.A, grades.CAT2.B, grades.CAT2.C, grades.CAT2.FAIL], backgroundColor: 'rgba(59,130,246,0.7)' },
                { label: 'Exam', data: [grades.EXAM.A, grades.EXAM.B, grades.EXAM.C, grades.EXAM.FAIL], backgroundColor: 'rgba(139,92,246,0.7)' }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom', labels: { padding: 10, usePointStyle: true } } },
            scales: { y: { beginAtZero: true } }
        }
    });
};

// ============================================================
// RENDER DIFFICULTY HEATMAP
// ============================================================

window.renderDifficultyHeatmap = function(marks) {
    const container = document.getElementById('analytics_difficulty_heatmap');
    if (!container) return;
    
    const subjectData = {};
    marks?.forEach(m => {
        const subject = m.subject_name || 'Unknown';
        const score = m.final_score || 0;
        if (!subjectData[subject]) subjectData[subject] = { total: 0, count: 0 };
        if (score > 0) {
            subjectData[subject].total += score;
            subjectData[subject].count++;
        }
    });
    
    const sorted = Object.keys(subjectData)
        .map(s => ({
            name: s,
            avg: subjectData[s].count > 0 ? Math.round(subjectData[s].total / subjectData[s].count) : 0,
            count: subjectData[s].count
        }))
        .sort((a, b) => a.avg - b.avg);
    
    if (sorted.length === 0) {
        container.innerHTML = '<p style="color: #94a3b8; text-align: center; padding: 20px; grid-column: 1 / -1;">No data available</p>';
        return;
    }
    
    let html = '';
    sorted.forEach(item => {
        let color, label;
        if (item.avg >= 75) { color = '#dcfce7'; label = '🟢 Easy'; }
        else if (item.avg >= 65) { color = '#fef3c7'; label = '🟡 Medium'; }
        else if (item.avg >= 60) { color = '#fed7aa'; label = '🟠 Moderate'; }
        else { color = '#fee2e2'; label = '🔴 Hard'; }
        
        const textColor = item.avg >= 75 ? '#166534' : item.avg >= 65 ? '#92400e' : item.avg >= 60 ? '#9a3412' : '#991b1b';
        
        html += `
            <div style="background: ${color}; border-radius: 8px; padding: 12px 16px; text-align: center; border: 1px solid ${textColor}33;">
                <div style="font-weight: 600; font-size: 13px; color: ${textColor};">${window.escapeHtml(item.name)}</div>
                <div style="font-size: 20px; font-weight: 700; color: ${textColor};">${item.avg}%</div>
                <div style="font-size: 11px; color: ${textColor}80;">${item.count} students • ${label}</div>
            </div>
        `;
    });
    
    container.innerHTML = html;
};

// ============================================================
// RENDER PROGRESSION TABLE
// ============================================================

window.renderProgressionTable = function(students, marks) {
    const tbody = document.getElementById('analytics_progression_body');
    if (!tbody) return;
    
    const studentAverages = {};
    marks?.forEach(m => {
        const admission = m.admission_number;
        const block = m.block || 'Unknown';
        const score = m.final_score || 0;
        if (!studentAverages[admission]) studentAverages[admission] = {};
        if (!studentAverages[admission][block]) studentAverages[admission][block] = { total: 0, count: 0 };
        if (score > 0) {
            studentAverages[admission][block].total += score;
            studentAverages[admission][block].count++;
        }
    });
    
    const blockOrder = ['Introductory', 'Block 1', 'Block 2', 'Block 3', 'Block 4'];
    const topStudents = students?.slice(0, 15) || [];
    
    if (topStudents.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="padding:30px;text-align:center;color:#94a3b8;">No progression data available</td></tr>';
        return;
    }
    
    let html = '';
    topStudents.forEach(student => {
        const data = studentAverages[student.student_id] || {};
        const scores = blockOrder.map(block => {
            const bData = data[block];
            return bData && bData.count > 0 ? Math.round(bData.total / bData.count) : '-';
        });
        
        const validScores = scores.filter(s => s !== '-');
        let trend = '➡️', trendColor = '#94a3b8';
        if (validScores.length >= 2) {
            const first = validScores[0];
            const last = validScores[validScores.length - 1];
            if (last > first) { trend = '📈'; trendColor = '#10b981'; }
            else if (last < first) { trend = '📉'; trendColor = '#ef4444'; }
            else { trend = '➡️'; trendColor = '#f59e0b'; }
        }
        
        const avg = validScores.length > 0 ? Math.round(validScores.reduce((a,b) => a + b, 0) / validScores.length) : 0;
        const avgColor = avg >= 60 ? '#10b981' : avg > 0 ? '#ef4444' : '#94a3b8';
        
        html += `
            <tr style="border-bottom: 1px solid #e5e7eb;">
                <td style="padding:10px 12px;font-weight:500;">${window.escapeHtml(student.full_name || 'Unknown')}</td>
                ${scores.map(s => `<td style="padding:10px 12px;text-align:center;font-weight:600;color:${s !== '-' && s >= 60 ? '#10b981' : s !== '-' ? '#ef4444' : '#94a3b8'};">${s}</td>`).join('')}
                <td style="padding:10px 12px;text-align:center;font-size:20px;color:${trendColor};">${trend}</td>
            </tr>
        `;
    });
    
    tbody.innerHTML = html;
};

// ============================================================
// RENDER ANALYTICS SUBJECT TABLE
// ============================================================

window.renderAnalyticsSubjectTable = function(marks, students, program, block) {
    const tbody = document.getElementById('analytics_subject_table_body');
    if (!tbody) return;
    
    const subjectData = {};
    marks?.forEach(m => {
        const subject = m.subject_name || 'Unknown';
        const score = m.final_score || 0;
        if (!subjectData[subject]) subjectData[subject] = { total: 0, count: 0, pass: 0, students: new Set(), aCount: 0, bCount: 0, cCount: 0, failCount: 0 };
        if (score > 0) {
            subjectData[subject].total += score;
            subjectData[subject].count++;
            subjectData[subject].students.add(m.admission_number);
            if (score >= 60) subjectData[subject].pass++;
            if (score >= 75) subjectData[subject].aCount++;
            else if (score >= 65) subjectData[subject].bCount++;
            else if (score >= 60) subjectData[subject].cCount++;
            else subjectData[subject].failCount++;
        }
    });
    
    const sorted = Object.keys(subjectData)
        .map(s => {
            const data = subjectData[s];
            const avg = data.count > 0 ? Math.round((data.total / data.count) * 10) / 10 : 0;
            const gradeInfo = window.getGradeInfo(avg);
            return {
                name: s,
                avg: avg,
                count: data.count,
                passCount: data.pass,
                passRate: data.count > 0 ? Math.round((data.pass / data.count) * 100) : 0,
                uniqueStudents: data.students.size,
                grade: gradeInfo.grade,
                points: gradeInfo.points,
                color: gradeInfo.color,
                aCount: data.aCount, bCount: data.bCount, cCount: data.cCount, failCount: data.failCount
            };
        })
        .sort((a, b) => b.avg - a.avg);
    
    if (sorted.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="padding:40px;text-align:center;color:#94a3b8;">No unit data available</td></tr>';
        return;
    }
    
    let html = '';
    sorted.forEach(s => {
        const status = s.avg >= 60 ? '✅ Passing' : (s.avg > 0 ? '⚠️ At Risk' : '⏳ No Data');
        const statusColor = s.avg >= 60 ? '#10b981' : (s.avg > 0 ? '#ef4444' : '#94a3b8');
        const difficulty = s.avg >= 75 ? '🟢 Easy' : s.avg >= 65 ? '🟡 Medium' : s.avg >= 60 ? '🟠 Moderate' : '🔴 Hard';
        
        html += `
            <tr style="border-bottom:1px solid #e5e7eb;">
                <td style="padding:10px 12px;font-weight:500;">${window.escapeHtml(s.name)}</td>
                <td style="padding:10px 12px;text-align:center;">${s.uniqueStudents} / ${s.count}</td>
                <td style="padding:10px 12px;text-align:center;font-weight:600;">${s.avg}%</td>
                <td style="padding:10px 12px;text-align:center;font-weight:600;">${s.passRate}%</td>
                <td style="padding:10px 12px;text-align:center;font-weight:700;color:${s.color};">${s.grade}</td>
                <td style="padding:10px 12px;text-align:center;font-weight:600;">${s.points}</td>
                <td style="padding:10px 12px;text-align:center;color:${statusColor};">${status}</td>
                <td style="padding:10px 12px;text-align:center;">${difficulty}</td>
            </tr>
        `;
    });
    
    tbody.innerHTML = html;
};

// ============================================================
// RENDER ANALYTICS STUDENT TABLE
// ============================================================

window.renderAnalyticsStudentTable = function(students, marks) {
    const tbody = document.getElementById('analytics_student_table_body');
    if (!tbody) return;
    
    if (!students || students.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="padding:40px;text-align:center;color:#94a3b8;">No learner data available</td></tr>';
        return;
    }
    
    const studentMarks = {};
    marks?.forEach(m => {
        const admission = m.admission_number;
        if (!studentMarks[admission]) studentMarks[admission] = { total: 0, count: 0 };
        const score = m.final_score || 0;
        if (score > 0) { studentMarks[admission].total += score; studentMarks[admission].count++; }
    });
    
    let html = '';
    students.forEach(student => {
        const marksData = studentMarks[student.student_id] || { total: 0, count: 0 };
        const avg = marksData.count > 0 ? Math.round((marksData.total / marksData.count) * 10) / 10 : 0;
        const gradeInfo = window.getGradeInfo(avg);
        const status = avg >= 60 ? '✅ Passing' : (avg > 0 ? '⚠️ At Risk' : '⏳ No Data');
        const statusColor = avg >= 60 ? '#10b981' : (avg > 0 ? '#ef4444' : '#94a3b8');
        const riskLevel = avg >= 60 ? '🟢 Low' : avg >= 50 ? '🟡 Medium' : avg > 0 ? '🔴 High' : '⚪ N/A';
        const riskColor = avg >= 60 ? '#10b981' : avg >= 50 ? '#f59e0b' : avg > 0 ? '#ef4444' : '#94a3b8';
        
        html += `
            <tr style="border-bottom:1px solid #e5e7eb;">
                <td style="padding:10px 12px;font-weight:500;">${window.escapeHtml(student.full_name || 'Unknown')}</td>
                <td style="padding:10px 12px;text-align:center;">${window.escapeHtml(student.student_id || 'N/A')}</td>
                <td style="padding:10px 12px;text-align:center;">${window.escapeHtml(student.program || 'N/A')}</td>
                <td style="padding:10px 12px;text-align:center;">${window.escapeHtml(student.block || 'N/A')}</td>
                <td style="padding:10px 12px;text-align:center;font-weight:600;">${avg}%</td>
                <td style="padding:10px 12px;text-align:center;font-weight:700;color:${gradeInfo.color};">${gradeInfo.grade}</td>
                <td style="padding:10px 12px;text-align:center;color:${statusColor};">${status}</td>
                <td style="padding:10px 12px;text-align:center;color:${riskColor};font-weight:600;">${riskLevel}</td>
            </tr>
        `;
    });
    
    tbody.innerHTML = html;
};

// ============================================================
// RENDER ANALYTICS BLOCK TABLE
// ============================================================

window.renderAnalyticsBlockTable = function(students, marks, selectedBlock) {
    const tbody = document.getElementById('analytics_block_table_body');
    if (!tbody) return;
    
    const blockData = {};
    const blockOrder = ['Introductory', 'Block 1', 'Block 2', 'Block 3', 'Block 4', 'Block 5', 'Final'];
    blockOrder.forEach(b => blockData[b] = { total: 0, count: 0, pass: 0, students: 0, topStudent: null, topScore: 0, atRisk: 0 });
    
    students?.forEach(s => {
        const block = s.block || 'Unknown';
        if (!blockData[block]) blockData[block] = { total: 0, count: 0, pass: 0, students: 0, topStudent: null, topScore: 0, atRisk: 0 };
        blockData[block].students++;
    });
    
    marks?.forEach(m => {
        const block = m.block || 'Unknown';
        const score = m.final_score || 0;
        if (blockData[block] && score > 0) {
            blockData[block].total += score;
            blockData[block].count++;
            if (score >= 60) blockData[block].pass++;
            else blockData[block].atRisk++;
            if (score > blockData[block].topScore) {
                blockData[block].topScore = score;
                blockData[block].topStudent = m.student_name || 'Unknown';
            }
        }
    });
    
    const sortedBlocks = Object.keys(blockData).filter(b => blockData[b].students > 0);
    if (sortedBlocks.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="padding:40px;text-align:center;color:#94a3b8;">No stage data available</td></tr>';
        return;
    }
    
    let html = '';
    sortedBlocks.forEach(block => {
        const data = blockData[block];
        const avg = data.count > 0 ? Math.round((data.total / data.count) * 10) / 10 : 0;
        const passRate = data.count > 0 ? Math.round((data.pass / data.count) * 100) : 0;
        html += `
            <tr style="border-bottom:1px solid #e5e7eb;">
                <td style="padding:10px 12px;font-weight:600;">${window.escapeHtml(block)}</td>
                <td style="padding:10px 12px;text-align:center;">${data.students}</td>
                <td style="padding:10px 12px;text-align:center;font-weight:600;">${avg}%</td>
                <td style="padding:10px 12px;text-align:center;font-weight:600;">${passRate}%</td>
                <td style="padding:10px 12px;text-align:center;">${window.escapeHtml(data.topStudent || 'N/A')}</td>
                <td style="padding:10px 12px;text-align:center;color:${data.atRisk > 0 ? '#dc2626' : '#10b981'};">${data.atRisk}</td>
            </tr>
        `;
    });
    
    tbody.innerHTML = html;
};

// ============================================================
// RENDER ANALYTICS PROGRAM TABLE
// ============================================================

window.renderAnalyticsProgramTable = function(students, marks) {
    const tbody = document.getElementById('analytics_program_table_body');
    if (!tbody) return;
    
    const programData = {};
    students?.forEach(s => {
        const program = s.program || 'Unknown';
        if (!programData[program]) programData[program] = { total: 0, count: 0, pass: 0, students: 0 };
        programData[program].students++;
    });
    
    marks?.forEach(m => {
        const program = m.program_type || 'Unknown';
        const score = m.final_score || 0;
        if (programData[program] && score > 0) {
            programData[program].total += score;
            programData[program].count++;
            if (score >= 60) programData[program].pass++;
        }
    });
    
    const sorted = Object.keys(programData).sort((a, b) => programData[b].students - programData[a].students);
    if (sorted.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="padding:40px;text-align:center;color:#94a3b8;">No programme data available</td></tr>';
        return;
    }
    
    let html = '';
    sorted.forEach(program => {
        const data = programData[program];
        const avg = data.count > 0 ? Math.round((data.total / data.count) * 10) / 10 : 0;
        const passRate = data.count > 0 ? Math.round((data.pass / data.count) * 100) : 0;
        const programType = program === 'KRCHN' ? 'KRCHN' : 'TVET';
        const level = program.startsWith('D') ? 'Diploma' : program.startsWith('C') ? 'Certificate' : program.startsWith('A') ? 'Artisan' : 'Other';
        const perfColor = avg >= 60 ? '#10b981' : (avg > 0 ? '#ef4444' : '#94a3b8');
        
        html += `
            <tr style="border-bottom:1px solid #e5e7eb;">
                <td style="padding:10px 12px;font-weight:500;">${window.escapeHtml(window.getProgramDisplayName(program))}</td>
                <td style="padding:10px 12px;text-align:center;"><span style="background:${programType === 'KRCHN' ? '#dbeafe' : '#fef3c7'};padding:2px 10px;border-radius:12px;font-size:11px;">${programType}</span></td>
                <td style="padding:10px 12px;text-align:center;">${level}</td>
                <td style="padding:10px 12px;text-align:center;">${data.students}</td>
                <td style="padding:10px 12px;text-align:center;font-weight:600;color:${perfColor};">${avg}%</td>
                <td style="padding:10px 12px;text-align:center;font-weight:600;color:${perfColor};">${passRate}%</td>
                <td style="padding:10px 12px;text-align:center;">
                    <div style="height:6px;background:#e5e7eb;border-radius:4px;overflow:hidden;max-width:100px;margin:0 auto;">
                        <div style="width:${passRate}%;height:100%;background:${perfColor};border-radius:4px;"></div>
                    </div>
                </td>
            </tr>
        `;
    });
    
    tbody.innerHTML = html;
};

// ============================================================
// RENDER ANALYTICS TRENDS TABLE
// ============================================================

window.renderAnalyticsTrendsTable = function(students, marks) {
    const tbody = document.getElementById('analytics_trends_table_body');
    if (!tbody) return;
    
    const yearData = {};
    students?.forEach(s => {
        const year = s.intake_year || 'Unknown';
        if (!yearData[year]) yearData[year] = { total: 0, count: 0, pass: 0, students: 0 };
        yearData[year].students++;
    });
    
    marks?.forEach(m => {
        const year = m.academic_year || 'Unknown';
        const score = m.final_score || 0;
        if (yearData[year] && score > 0) {
            yearData[year].total += score;
            yearData[year].count++;
            if (score >= 60) yearData[year].pass++;
        }
    });
    
    const sortedYears = Object.keys(yearData).sort();
    if (sortedYears.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="padding:40px;text-align:center;color:#94a3b8;">No trend data available</td></tr>';
        return;
    }
    
    let previousAvg = null;
    let html = '';
    sortedYears.forEach(year => {
        const data = yearData[year];
        const avg = data.count > 0 ? Math.round((data.total / data.count) * 10) / 10 : 0;
        const passRate = data.count > 0 ? Math.round((data.pass / data.count) * 100) : 0;
        let change = 'N/A', trend = '➡️', trendColor = '#94a3b8';
        if (previousAvg !== null && previousAvg > 0) {
            const diff = avg - previousAvg;
            change = (diff > 0 ? '+' : '') + diff.toFixed(1) + '%';
            if (diff > 0) { trend = '📈'; trendColor = '#10b981'; }
            else if (diff < 0) { trend = '📉'; trendColor = '#ef4444'; }
            else { trend = '➡️'; trendColor = '#f59e0b'; }
        }
        previousAvg = avg;
        html += `
            <tr style="border-bottom:1px solid #e5e7eb;">
                <td style="padding:10px 12px;font-weight:600;">${window.escapeHtml(year)}</td>
                <td style="padding:10px 12px;text-align:center;">${data.students}</td>
                <td style="padding:10px 12px;text-align:center;font-weight:600;">${avg}%</td>
                <td style="padding:10px 12px;text-align:center;font-weight:600;">${passRate}%</td>
                <td style="padding:10px 12px;text-align:center;color:${trendColor};font-weight:600;">${change}</td>
                <td style="padding:10px 12px;text-align:center;font-size:20px;color:${trendColor};">${trend}</td>
            </tr>
        `;
    });
    
    tbody.innerHTML = html;
};

// ============================================================
// RENDER ANALYTICS EXAM DETAILS
// ============================================================

window.renderAnalyticsExamDetails = function(marks, students) {
    const tbody = document.getElementById('analytics_exam_details_body');
    if (!tbody) return;
    
    if (!marks || marks.length === 0) {
        tbody.innerHTML = '<tr><td colspan="10" style="padding:40px;text-align:center;color:#94a3b8;">No assessment data available</td></tr>';
        return;
    }
    
    let html = '';
    marks.slice(0, 20).forEach((m, index) => {
        const total = m.final_score || 0;
        const gradeInfo = window.getGradeInfo(total);
        const status = total >= 60 ? '✅ Pass' : (total > 0 ? '❌ Fail' : '⏳ Pending');
        const statusColor = total >= 60 ? '#10b981' : (total > 0 ? '#ef4444' : '#f59e0b');
        html += `
            <tr style="border-bottom:1px solid #e5e7eb;">
                <td style="padding:10px 12px;">${index + 1}</td>
                <td style="padding:10px 12px;">${window.escapeHtml(m.subject_name || 'N/A')}</td>
                <td style="padding:10px 12px;">${window.escapeHtml(m.student_name || 'Unknown')}</td>
                <td style="padding:10px 12px;text-align:center;">${window.escapeHtml(m.block || 'N/A')}</td>
                <td style="padding:10px 12px;text-align:center;">${m.cat1_score || '-'}</td>
                <td style="padding:10px 12px;text-align:center;">${m.cat2_score || '-'}</td>
                <td style="padding:10px 12px;text-align:center;">${m.exam_score || '-'}</td>
                <td style="padding:10px 12px;text-align:center;font-weight:700;color:${statusColor};">${total || '-'}</td>
                <td style="padding:10px 12px;text-align:center;font-weight:700;color:${gradeInfo.color};">${m.grade || gradeInfo.grade}</td>
                <td style="padding:10px 12px;text-align:center;color:${statusColor};">${status}</td>
            </tr>
        `;
    });
    
    if (marks.length > 20) {
        html += `<tr><td colspan="10" style="padding:10px;text-align:center;color:#94a3b8;">... and ${marks.length - 20} more records</td></tr>`;
    }
    
    tbody.innerHTML = html;
};

// ============================================================
// RENDER UNIT RANKINGS TABLE
// ============================================================

window.renderUnitRankings = function(marks, students, program, block) {
    const container = document.getElementById('analytics_unit_rankings');
    if (!container) return;
    
    const subjectData = {};
    marks?.forEach(m => {
        const subject = m.subject_name || 'Unknown';
        const score = m.final_score || 0;
        if (!subjectData[subject]) subjectData[subject] = { total: 0, count: 0, pass: 0, scores: [] };
        if (score > 0) {
            subjectData[subject].total += score;
            subjectData[subject].count++;
            subjectData[subject].scores.push(score);
            if (score >= 60) subjectData[subject].pass++;
        }
    });
    
    const sorted = Object.keys(subjectData)
        .map(s => ({
            name: s,
            avg: subjectData[s].count > 0 ? Math.round(subjectData[s].total / subjectData[s].count) : 0,
            count: subjectData[s].count,
            pass: subjectData[s].pass,
            passRate: subjectData[s].count > 0 ? Math.round((subjectData[s].pass / subjectData[s].count) * 100) : 0,
            highest: subjectData[s].scores.length > 0 ? Math.max(...subjectData[s].scores) : 0,
            lowest: subjectData[s].scores.length > 0 ? Math.min(...subjectData[s].scores) : 0
        }))
        .sort((a, b) => b.avg - a.avg);
    
    if (sorted.length === 0) {
        container.innerHTML = '<p style="color:#94a3b8;text-align:center;padding:20px;">No unit data available</p>';
        return;
    }
    
    let html = `
        <div style="overflow-x:auto;">
            <table style="width:100%;border-collapse:collapse;font-size:13px;">
                <thead>
                    <tr style="background:linear-gradient(135deg,#4C1D95,#7c3aed);color:white;">
                        <th style="padding:10px 12px;text-align:left;">Rank</th>
                        <th style="padding:10px 12px;text-align:left;">Unit</th>
                        <th style="padding:10px 12px;text-align:center;">Students</th>
                        <th style="padding:10px 12px;text-align:center;">Avg Score</th>
                        <th style="padding:10px 12px;text-align:center;">Pass Rate</th>
                        <th style="padding:10px 12px;text-align:center;">Highest</th>
                        <th style="padding:10px 12px;text-align:center;">Lowest</th>
                        <th style="padding:10px 12px;text-align:center;">Performance</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    sorted.slice(0, 15).forEach((subject, index) => {
        const rank = index + 1;
        const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`;
        const perfColor = subject.avg >= 80 ? '#10b981' : subject.avg >= 65 ? '#3b82f6' : subject.avg >= 60 ? '#f59e0b' : '#ef4444';
        html += `
            <tr style="border-bottom:1px solid #e5e7eb;${index % 2 === 0 ? 'background:#f8fafc;' : ''}">
                <td style="padding:10px 12px;font-weight:700;text-align:center;">${medal}</td>
                <td style="padding:10px 12px;font-weight:500;">${window.escapeHtml(subject.name)}</td>
                <td style="padding:10px 12px;text-align:center;">${subject.count}</td>
                <td style="padding:10px 12px;text-align:center;font-weight:700;color:${perfColor};">${subject.avg}%</td>
                <td style="padding:10px 12px;text-align:center;font-weight:600;">${subject.passRate}%</td>
                <td style="padding:10px 12px;text-align:center;color:#10b981;">${subject.highest}%</td>
                <td style="padding:10px 12px;text-align:center;color:#ef4444;">${subject.lowest}%</td>
                <td style="padding:10px 12px;text-align:center;">
                    <div style="height:6px;background:#e5e7eb;border-radius:4px;overflow:hidden;max-width:100px;margin:0 auto;">
                        <div style="width:${subject.avg}%;height:100%;background:${perfColor};border-radius:4px;"></div>
                    </div>
                </td>
            </tr>
        `;
    });
    
    html += `
                </tbody>
            </table>
        </div>
        <div style="margin-top:10px;font-size:12px;color:#94a3b8;text-align:right;">Showing ${Math.min(sorted.length, 15)} of ${sorted.length} units</div>
    `;
    
    container.innerHTML = html;
};

// ============================================================
// RENDER TOP STUDENTS
// ============================================================

window.renderTopStudents = function(students, marks) {
    const container = document.getElementById('analytics_top_students');
    if (!container) return;
    
    const studentAverages = {};
    marks?.forEach(m => {
        const admission = m.admission_number;
        const score = m.final_score || 0;
        if (!studentAverages[admission]) studentAverages[admission] = { total: 0, count: 0, scores: [], points: 0 };
        if (score > 0) {
            const gradeInfo = window.getGradeInfo(score);
            studentAverages[admission].total += score;
            studentAverages[admission].count++;
            studentAverages[admission].scores.push(score);
            studentAverages[admission].points += gradeInfo.points;
        }
    });
    
    const studentData = [];
    students?.forEach(s => {
        const data = studentAverages[s.student_id];
        if (data && data.count > 0) {
            const avg = Math.round((data.total / data.count) * 10) / 10;
            const avgPoints = Math.round((data.points / data.count) * 10) / 10;
            const gradeInfo = window.getGradeInfo(avg);
            studentData.push({
                student: s,
                avg: avg,
                avgPoints: avgPoints,
                grade: gradeInfo.grade,
                points: gradeInfo.points,
                count: data.count,
                highest: data.scores.length > 0 ? Math.max(...data.scores) : 0,
                lowest: data.scores.length > 0 ? Math.min(...data.scores) : 0
            });
        }
    });
    
    const topStudents = studentData.sort((a, b) => b.avg - a.avg).slice(0, 10);
    if (topStudents.length === 0) {
        container.innerHTML = '<p style="color:#94a3b8;text-align:center;padding:20px;">No learner data available</p>';
        return;
    }
    
    let html = `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:12px;">`;
    topStudents.forEach((data, index) => {
        const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}`;
        const statusColor = data.grade === 'A' ? '#10b981' : data.grade === 'B' ? '#3b82f6' : data.grade === 'C' ? '#f59e0b' : '#ef4444';
        const bgColor = index === 0 ? '#fef3c7' : index === 1 ? '#f0fdf4' : index === 2 ? '#eff6ff' : '#f8fafc';
        const borderColor = index === 0 ? '#f59e0b' : index === 1 ? '#10b981' : index === 2 ? '#3b82f6' : '#e5e7eb';
        html += `
            <div style="background:${bgColor};border:2px solid ${borderColor};border-radius:12px;padding:16px;text-align:center;">
                <div style="font-size:28px;margin-bottom:8px;">${medal}</div>
                <div style="font-weight:700;font-size:15px;color:#1e293b;">${window.escapeHtml(data.student.full_name || 'Unknown')}</div>
                <div style="font-size:12px;color:#64748b;">${window.escapeHtml(data.student.student_id || 'N/A')}</div>
                <div style="font-size:12px;color:#64748b;">${window.escapeHtml(data.student.program || 'N/A')}</div>
                <div style="margin-top:10px;display:flex;justify-content:center;gap:15px;">
                    <div><div style="font-size:11px;color:#94a3b8;">Average</div><div style="font-size:20px;font-weight:700;color:${statusColor};">${data.avg}%</div></div>
                    <div><div style="font-size:11px;color:#94a3b8;">Grade</div><div style="font-size:20px;font-weight:700;color:${statusColor};">${data.grade}</div></div>
                    <div><div style="font-size:11px;color:#94a3b8;">Points</div><div style="font-size:20px;font-weight:700;color:${statusColor};">${data.points}</div></div>
                </div>
                <div style="font-size:11px;color:#94a3b8;margin-top:5px;">${data.count} units • Highest: ${data.highest}% • Lowest: ${data.lowest}%</div>
            </div>
        `;
    });
    html += '</div>';
    container.innerHTML = html;
};

// ============================================================
// RENDER WEAK STUDENTS
// ============================================================

window.renderWeakStudents = function(students, marks) {
    const container = document.getElementById('analytics_weak_students');
    if (!container) return;
    
    const studentAverages = {};
    marks?.forEach(m => {
        const admission = m.admission_number;
        const score = m.final_score || 0;
        if (!studentAverages[admission]) studentAverages[admission] = { total: 0, count: 0, scores: [] };
        if (score > 0) {
            studentAverages[admission].total += score;
            studentAverages[admission].count++;
            studentAverages[admission].scores.push(score);
        }
    });
    
    const studentData = [];
    students?.forEach(s => {
        const data = studentAverages[s.student_id];
        if (data && data.count > 0) {
            const avg = Math.round((data.total / data.count) * 10) / 10;
            if (avg > 0 && avg < 60) {
                studentData.push({
                    student: s,
                    avg: avg,
                    count: data.count,
                    highest: data.scores.length > 0 ? Math.max(...data.scores) : 0,
                    lowest: data.scores.length > 0 ? Math.min(...data.scores) : 0
                });
            }
        }
    });
    
    const weakStudents = studentData.sort((a, b) => a.avg - b.avg);
    if (weakStudents.length === 0) {
        container.innerHTML = `
            <div style="text-align:center;padding:20px;color:#10b981;">
                <i class="fas fa-check-circle" style="font-size:32px;display:block;margin-bottom:10px;"></i>
                🎉 No weak learners! All learners are performing well.
            </div>
        `;
        return;
    }
    
    let html = `
        <div style="overflow-x:auto;">
            <table style="width:100%;border-collapse:collapse;font-size:13px;">
                <thead>
                    <tr style="background:#dc2626;color:white;">
                        <th style="padding:10px 12px;text-align:left;">#</th>
                        <th style="padding:10px 12px;text-align:left;">Learner</th>
                        <th style="padding:10px 12px;text-align:left;">Admission</th>
                        <th style="padding:10px 12px;text-align:left;">Programme</th>
                        <th style="padding:10px 12px;text-align:center;">Avg Score</th>
                        <th style="padding:10px 12px;text-align:center;">Units</th>
                        <th style="padding:10px 12px;text-align:center;">Highest</th>
                        <th style="padding:10px 12px;text-align:center;">Lowest</th>
                        <th style="padding:10px 12px;text-align:center;">Status</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    weakStudents.slice(0, 20).forEach((data, index) => {
        const status = data.avg >= 50 ? '⚠️ At Risk' : '❌ Critical';
        const statusColor = data.avg >= 50 ? '#f59e0b' : '#dc2626';
        html += `
            <tr style="border-bottom:1px solid #e5e7eb;${index % 2 === 0 ? 'background:#fef2f2;' : ''}">
                <td style="padding:10px 12px;text-align:center;">${index + 1}</td>
                <td style="padding:10px 12px;font-weight:500;">${window.escapeHtml(data.student.full_name || 'Unknown')}</td>
                <td style="padding:10px 12px;">${window.escapeHtml(data.student.student_id || 'N/A')}</td>
                <td style="padding:10px 12px;">${window.escapeHtml(data.student.program || 'N/A')}</td>
                <td style="padding:10px 12px;text-align:center;font-weight:700;color:${statusColor};">${data.avg}%</td>
                <td style="padding:10px 12px;text-align:center;">${data.count}</td>
                <td style="padding:10px 12px;text-align:center;color:#10b981;">${data.highest}%</td>
                <td style="padding:10px 12px;text-align:center;color:#dc2626;">${data.lowest}%</td>
                <td style="padding:10px 12px;text-align:center;color:${statusColor};font-weight:600;">${status}</td>
            </tr>
        `;
    });
    
    if (weakStudents.length > 20) {
        html += `<tr><td colspan="9" style="padding:10px;text-align:center;color:#94a3b8;">... and ${weakStudents.length - 20} more learners</td></tr>`;
    }
    
    html += `
                </tbody>
            </table>
        </div>
        <div style="margin-top:10px;font-size:12px;color:#94a3b8;text-align:right;">${weakStudents.length} learners need intervention</div>
    `;
    
    container.innerHTML = html;
};

// ============================================================
// RENDER BLOCK FILTER STATS
// ============================================================

window.renderBlockFilterStats = function(students, marks, selectedBlock) {
    const container = document.getElementById('analytics_block_filter_stats');
    if (!container) return;
    
    const blockStats = {};
    const blockOrder = ['Introductory', 'Block 1', 'Block 2', 'Block 3', 'Block 4', 'Block 5', 'Final'];
    blockOrder.forEach(b => blockStats[b] = { total: 0, avg: 0, pass: 0, fail: 0, pending: 0, totalScore: 0, scoredCount: 0 });
    
    students?.forEach(s => {
        const block = s.block || 'Unknown';
        if (blockStats[block]) blockStats[block].total++;
        else blockStats[block] = { total: 1, avg: 0, pass: 0, fail: 0, pending: 0, totalScore: 0, scoredCount: 0 };
    });
    
    marks?.forEach(m => {
        const block = m.block || 'Unknown';
        const score = m.final_score || 0;
        if (blockStats[block]) {
            if (score > 0) {
                blockStats[block].totalScore += score;
                blockStats[block].scoredCount++;
                if (score >= 60) blockStats[block].pass++;
                else blockStats[block].fail++;
            } else {
                blockStats[block].pending++;
            }
        }
    });
    
    Object.keys(blockStats).forEach(block => {
        const data = blockStats[block];
        data.avg = data.scoredCount > 0 ? Math.round((data.totalScore / data.scoredCount) * 10) / 10 : 0;
    });
    
    const displayBlocks = selectedBlock !== 'all' ? [selectedBlock] : Object.keys(blockStats).filter(b => blockStats[b].total > 0);
    if (displayBlocks.length === 0) {
        container.innerHTML = '<p style="color:#94a3b8;text-align:center;padding:20px;">No stage data available</p>';
        return;
    }
    
    let html = `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;">`;
    displayBlocks.forEach(block => {
        const data = blockStats[block];
        const statusColor = data.avg >= 60 ? '#10b981' : (data.avg > 0 ? '#dc2626' : '#f59e0b');
        const passRate = data.scoredCount > 0 ? Math.round((data.pass / data.scoredCount) * 100) : 0;
        html += `
            <div style="background:${data.avg >= 60 ? '#f0fdf4' : data.avg > 0 ? '#fef2f2' : '#fefce8'};border:2px solid ${statusColor};border-radius:12px;padding:16px;text-align:center;">
                <div style="font-weight:700;font-size:14px;color:#1e293b;">${block}</div>
                <div style="font-size:11px;color:#64748b;">${data.total} learners</div>
                <div style="font-size:24px;font-weight:700;color:${statusColor};margin:8px 0;">${data.avg}%</div>
                <div style="display:flex;justify-content:center;gap:15px;font-size:12px;">
                    <div><span style="color:#10b981;">✅ ${data.pass}</span></div>
                    <div><span style="color:#dc2626;">❌ ${data.fail}</span></div>
                    <div><span style="color:#f59e0b;">⏳ ${data.pending}</span></div>
                </div>
                <div style="font-size:11px;color:#94a3b8;margin-top:5px;">Pass Rate: ${passRate}%</div>
            </div>
        `;
    });
    html += '</div>';
    container.innerHTML = html;
};

// ============================================================
// TABLE SEARCH & FILTER
// ============================================================

window.filterAnalyticsTable = function() {
    const searchTerm = document.getElementById('analytics_table_search')?.value?.toLowerCase() || '';
    const statusFilter = document.getElementById('analytics_table_status_filter')?.value || 'all';
    
    // Filter subject table
    const subjectRows = document.querySelectorAll('#analytics_subject_table_body tr');
    let visibleCount = 0;
    subjectRows.forEach(row => {
        const text = row.textContent.toLowerCase();
        let show = true;
        if (searchTerm && !text.includes(searchTerm)) show = false;
        if (show && statusFilter !== 'all') {
            const statusCell = row.querySelector('td:nth-child(7)');
            if (statusCell) {
                const statusText = statusCell.textContent.toLowerCase();
                if (statusFilter === 'pass' && !statusText.includes('pass')) show = false;
                if (statusFilter === 'fail' && !statusText.includes('risk') && !statusText.includes('fail')) show = false;
            }
        }
        row.style.display = show ? '' : 'none';
        if (show) visibleCount++;
    });
    
    document.getElementById('analytics_table_visible_count').textContent = visibleCount;
    
    // Also filter student table
    const studentRows = document.querySelectorAll('#analytics_student_table_body tr');
    studentRows.forEach(row => {
        const text = row.textContent.toLowerCase();
        let show = true;
        if (searchTerm && !text.includes(searchTerm)) show = false;
        if (show && statusFilter !== 'all') {
            const statusCell = row.querySelector('td:nth-child(7)');
            if (statusCell) {
                const statusText = statusCell.textContent.toLowerCase();
                if (statusFilter === 'pass' && !statusText.includes('pass')) show = false;
                if (statusFilter === 'fail' && !statusText.includes('risk') && !statusText.includes('fail')) show = false;
            }
        }
        row.style.display = show ? '' : 'none';
    });
};

// ============================================================
// CONSOLIDATED MARKSHEET - RENDER (USES "UNITS" TERMINOLOGY)
// ============================================================

window.renderConsolidatedMarksheet = function() {
    const container = document.getElementById('consolidatedMarksheetContainer');
    const loading = document.getElementById('consolidatedLoading');
    const table = document.getElementById('consolidatedMarksheetTable');
    const tbody = document.getElementById('consolidatedMarksheetBody');
    const summary = document.getElementById('consolidatedSummary');
    
    if (!container || !tbody) return;
    
    const students = window._analyticsStudents || [];
    const marks = window._analyticsMarks || [];
    
    if (students.length === 0 || marks.length === 0) {
        loading.style.display = 'block';
        table.style.display = 'none';
        loading.innerHTML = '<p style="color: #94a3b8;">No data available for consolidated marksheet</p>';
        return;
    }
    
    // Get filter values
    const sortBy = document.getElementById('consolidated_sort')?.value || 'avg';
    const limit = document.getElementById('consolidated_limit')?.value || 'all';
    const searchTerm = document.getElementById('consolidated_search')?.value?.toLowerCase() || '';
    
    loading.style.display = 'none';
    table.style.display = 'table';
    
    // 1. Get all unique unit names - FIX DUPLICATES
    const unitSet = new Set();
    marks.forEach(m => {
        const unit = m.subject_name;
        if (unit && unit.trim() !== '') {
            const cleanUnit = unit.trim();
            unitSet.add(cleanUnit);
        }
    });
    const units = [...unitSet].sort();
    console.log('📚 Unique units found:', units.length);
    
    // 2. Build student data with all units
    const studentData = {};
    students.forEach(s => {
        const studentId = s.student_id;
        if (!studentData[studentId]) {
            studentData[studentId] = {
                student: s,
                units: {},
                total: 0,
                count: 0,
                passed: 0
            };
        }
    });
    
    // 3. Populate marks per student
    marks.forEach(m => {
        const studentId = m.admission_number;
        const unit = m.subject_name ? m.subject_name.trim() : '';
        const score = m.final_score || 0;
        
        if (studentData[studentId] && unit && unit !== '') {
            // Only store if unit exists in our unique list
            if (unitSet.has(unit)) {
                studentData[studentId].units[unit] = score;
                if (score > 0) {
                    studentData[studentId].total += score;
                    studentData[studentId].count++;
                    if (score >= 60) studentData[studentId].passed++;
                }
            }
        }
    });
    
    // 4. Calculate averages and grades - FIX POINTS
    const consolidatedData = Object.values(studentData).map(data => {
        const avg = data.count > 0 ? Math.round((data.total / data.count) * 10) / 10 : 0;
        const gradeInfo = window.getGradeInfo(avg);
        
        // Fix: Ensure points are correct even if grade is N/A
        let points = gradeInfo.points;
        if (gradeInfo.grade === 'N/A' && avg > 0) {
            if (avg >= 75) points = 4;
            else if (avg >= 65) points = 3;
            else if (avg >= 60) points = 2;
            else points = 0;
        }
        
        const passRate = data.count > 0 ? Math.round((data.passed / data.count) * 100) : 0;
        
        return {
            ...data,
            avg: avg,
            grade: gradeInfo.grade,
            points: points,
            gradeColor: gradeInfo.color,
            passRate: passRate,
            status: avg >= 60 ? '✅ Pass' : (avg > 0 ? '❌ Fail' : '⏳ Pending'),
            statusColor: avg >= 60 ? '#10b981' : (avg > 0 ? '#ef4444' : '#f59e0b')
        };
    });
    
    // 5. Filter by search term
    let filtered = consolidatedData;
    if (searchTerm) {
        filtered = filtered.filter(d => 
            d.student.full_name?.toLowerCase().includes(searchTerm) ||
            d.student.student_id?.toLowerCase().includes(searchTerm)
        );
    }
    
    // 6. Sort
    filtered.sort((a, b) => {
        if (sortBy === 'name') return (a.student.full_name || '').localeCompare(b.student.full_name || '');
        if (sortBy === 'grade') return b.points - a.points;
        if (sortBy === 'points') return b.points - a.points;
        return b.avg - a.avg;
    });
    
    // 7. Apply limit
    if (limit !== 'all') {
        filtered = filtered.slice(0, parseInt(limit));
    }
    
    // 8. Build table headers with dynamic unit columns - SHOW FULL NAMES
    const headerRow = document.querySelector('#consolidatedMarksheetTable thead tr');
    if (headerRow) {
        // Remove existing dynamic unit columns (keep first 3 columns: #, Adm, Name)
        while (headerRow.children.length > 8) {
            headerRow.removeChild(headerRow.lastChild);
        }
        
        // Insert unit columns after Name column (index 3)
        units.forEach(unit => {
            const th = document.createElement('th');
            th.style.cssText = 'padding: 4px 6px; text-align: center; background: #0a66c2; color: white; font-size: 9px; min-width: 50px; white-space: nowrap;';
            // Show full unit name with smaller font
            th.innerHTML = `${unit} <span style="font-size: 7px; opacity: 0.7;">(*/100)</span>`;
            th.title = unit;
            headerRow.insertBefore(th, headerRow.children[3]);
        });
    }
    
    // 9. Build table rows
    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="20" style="padding: 30px; text-align: center; color: #94a3b8;">No learners match your search</td></tr>';
        summary.style.display = 'none';
        return;
    }
    
    let html = '';
    let totalAvgSum = 0;
    let totalPassed = 0;
    let topPerformer = '-';
    let topScore = 0;
    
    filtered.forEach((data, index) => {
        const student = data.student;
        const avg = data.avg;
        const grade = data.grade;
        const points = data.points;
        const status = data.status;
        const statusColor = data.statusColor;
        
        totalAvgSum += avg;
        if (avg > topScore) {
            topScore = avg;
            topPerformer = student.full_name || 'Unknown';
        }
        if (avg >= 60) totalPassed++;
        
        html += `<tr style="border-bottom: 1px solid #e5e7eb; ${index % 2 === 0 ? 'background: #f8fafc;' : ''}">`;
        html += `<td style="padding: 4px 6px; text-align: center; font-weight: 600; font-size: 11px;">${index + 1}</td>`;
        html += `<td style="padding: 4px 6px; text-align: center; font-size: 11px; font-weight: 500;">${window.escapeHtml(student.student_id || 'N/A')}</td>`;
        html += `<td style="padding: 4px 6px; font-weight: 500; font-size: 12px; white-space: nowrap;">${window.escapeHtml(student.full_name || 'Unknown')}</td>`;
        
        // Unit scores
        units.forEach(unit => {
            const score = data.units[unit];
            const displayScore = (score !== undefined && score !== null && score > 0) ? score : '__';
            const isPass = score !== undefined && score !== null && score >= 60;
            const color = (score !== undefined && score !== null && score > 0) ? (isPass ? '#10b981' : '#ef4444') : '#94a3b8';
            html += `<td style="padding: 4px 6px; text-align: center; font-weight: 600; color: ${color}; font-size: 12px;">${displayScore}</td>`;
        });
        
        // Total, Avg, Grade, Points, Status
        html += `<td style="padding: 4px 6px; text-align: center; font-weight: 600; font-size: 12px;">${data.total}</td>`;
        html += `<td style="padding: 4px 6px; text-align: center; font-weight: 700; color: ${data.gradeColor}; font-size: 12px;">${avg}%</td>`;
        html += `<td style="padding: 4px 6px; text-align: center; font-weight: 700; color: ${data.gradeColor}; font-size: 13px;">${grade}</td>`;
        html += `<td style="padding: 4px 6px; text-align: center; font-weight: 600; font-size: 12px;">${points}</td>`;
        html += `<td style="padding: 4px 6px; text-align: center; color: ${statusColor}; font-weight: 600; font-size: 11px;">${status}</td>`;
        html += `</tr>`;
    });
    
    tbody.innerHTML = html;
    
    // 10. Update summary
    const totalStudents = filtered.length;
    const avgAll = totalStudents > 0 ? Math.round(totalAvgSum / totalStudents) : 0;
    const passRateAll = totalStudents > 0 ? Math.round((totalPassed / totalStudents) * 100) : 0;
    
    document.getElementById('consolidated_total_count').textContent = totalStudents;
    document.getElementById('consolidated_avg_score').textContent = avgAll + '%';
    document.getElementById('consolidated_pass_rate').textContent = passRateAll + '%';
    document.getElementById('consolidated_top_performer').textContent = topPerformer;
    summary.style.display = 'flex';
};
// ============================================================
// CONSOLIDATED MARKSHEET - EXPORT EXCEL
// ============================================================

window.exportConsolidatedMarksheet = function() {
    const table = document.getElementById('consolidatedMarksheetTable');
    if (!table) return;
    
    // Build CSV
    let csv = [];
    const rows = table.querySelectorAll('tr');
    rows.forEach(row => {
        const cells = row.querySelectorAll('th, td');
        const rowData = [];
        cells.forEach(cell => {
            let text = cell.textContent.trim();
            if (text.includes(',') || text.includes('"')) {
                text = '"' + text.replace(/"/g, '""') + '"';
            }
            rowData.push(text);
        });
        csv.push(rowData.join(','));
    });
    
    const csvContent = csv.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `consolidated_marksheet_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
};

// ============================================================
// CONSOLIDATED MARKSHEET - PRINT
// ============================================================

window.printConsolidatedMarksheet = function() {
    const table = document.getElementById('consolidatedMarksheetTable');
    if (!table) return;
    
    const printWindow = window.open('', '_blank', 'width=1200,height=800');
    if (!printWindow) return;
    
    const styles = `
        <style>
            body { font-family: Arial, sans-serif; font-size: 11px; padding: 20px; }
            h2 { text-align: center; color: #1e293b; margin-bottom: 5px; }
            .subtitle { text-align: center; color: #64748b; font-size: 13px; margin-top: 0; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; }
            th { background: #0a66c2; color: white; padding: 6px 8px; text-align: center; font-size: 10px; }
            td { padding: 4px 6px; border-bottom: 1px solid #e5e7eb; text-align: center; }
            tr:nth-child(even) { background: #f8fafc; }
            .summary { margin-top: 15px; display: flex; justify-content: space-around; font-size: 13px; font-weight: 600; }
            .footer { margin-top: 20px; text-align: center; color: #94a3b8; font-size: 11px; border-top: 1px solid #e5e7eb; padding-top: 10px; }
        </style>
    `;
    
    const tableHTML = table.outerHTML;
    const summaryHTML = document.getElementById('consolidatedSummary')?.outerHTML || '';
    const programLabel = document.getElementById('analytics_program_label')?.textContent || 'All Programs';
    const year = document.getElementById('analytics_year_select')?.value || '2025';
    const block = document.getElementById('analytics_block_select')?.value || 'All';
    
    const html = `
        <!DOCTYPE html>
        <html>
        <head><title>Consolidated Marksheet</title>${styles}</head>
        <body>
            <h2>NAKURU COLLEGE OF HEALTH SCIENCES & MANAGEMENT</h2>
            <div class="subtitle">Consolidated Marksheet • ${programLabel} • ${year} • ${block}</div>
            ${tableHTML}
            ${summaryHTML}
            <div class="footer">Generated on ${new Date().toLocaleString()}</div>
        </body>
        </html>
    `;
    
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
};

// ============================================================
// REFRESH ANALYTICS DATA
// ============================================================

window.refreshAnalytics = function() {
    console.log('🔄 Refreshing analytics...');
    window.loadAnalyticsData();
};

// ============================================================
// EXPORT ANALYTICS REPORT
// ============================================================

window.exportAnalyticsReport = function() {
    console.log('📤 Exporting analytics report...');
    
    const totalStudents = document.getElementById('analytics_total_students')?.textContent || '0';
    const passRate = document.getElementById('analytics_pass_rate')?.textContent || '0%';
    const avgScore = document.getElementById('analytics_avg_score')?.textContent || '0%';
    const atRisk = document.getElementById('analytics_at_risk')?.textContent || '0';
    const program = document.getElementById('analytics_program_label')?.textContent || 'All';
    const year = document.getElementById('analytics_year_select')?.value || '2025';
    const block = document.getElementById('analytics_block_select')?.value || 'All';
    
    const report = `
========================================
📊 NCHSM ANALYTICS REPORT
========================================
Date: ${new Date().toLocaleString()}
----------------------------------------
📈 Summary Statistics:
----------------------------------------
Total Learners: ${totalStudents}
Pass Rate: ${passRate}
Average Score: ${avgScore}
At Risk Learners: ${atRisk}
----------------------------------------
Programme: ${program}
Year: ${year}
Block: ${block}
========================================
Grading System:
A (75-100%) → 4.0
B (65-74%) → 3.0
C (60-64%) → 2.0
FAIL (0-59%) → 0.0
========================================
    `;
    
    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics_report_${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
};

// ============================================================
// FILTER ANALYTICS BY PROGRAM
// ============================================================

window.filterAnalytics = function(program) {
    console.log('🔍 Filtering analytics by:', program);
    const select = document.getElementById('analytics_program_select');
    if (select) {
        select.value = program;
        window.updateTerminology();
        window.loadAnalyticsData();
    }
};

// ============================================================
// UPDATE ANALYTICS METRIC
// ============================================================

window.updateAnalyticsMetric = function() {
    console.log('📊 Updating analytics metric...');
    window.loadAnalyticsData();
};

// ============================================================
// EXPOSE FUNCTIONS TO GLOBAL SCOPE
// ============================================================

window.loadAnalyticsData = window.loadAnalyticsData;
window.refreshAnalytics = window.refreshAnalytics;
window.exportAnalyticsReport = window.exportAnalyticsReport;
window.filterAnalytics = window.filterAnalytics;
window.updateAnalyticsMetric = window.updateAnalyticsMetric;
window.filterAnalyticsTable = window.filterAnalyticsTable;
window.updateTerminology = window.updateTerminology;
window.scrollToSection = window.scrollToSection;
window.getProgramDisplayName = window.getProgramDisplayName;
window.getGradeInfo = window.getGradeInfo;
window.calculateGrade = window.calculateGrade;
window.calculateGradePoints = window.calculateGradePoints;
window.escapeHtml = window.escapeHtml;
window.renderConsolidatedMarksheet = window.renderConsolidatedMarksheet;
window.exportConsolidatedMarksheet = window.exportConsolidatedMarksheet;
window.printConsolidatedMarksheet = window.printConsolidatedMarksheet;

console.log('✅ Super Admin Analytics Module Loaded Successfully!');
console.log('📊 Grading System: A(75-100)→4, B(65-74)→3, C(60-64)→2, FAIL(0-59)→0');
console.log('📊 Available functions:');
console.log('   - loadAnalyticsData()');
console.log('   - refreshAnalytics()');
console.log('   - exportAnalyticsReport()');
console.log('   - filterAnalytics(program)');
console.log('   - updateAnalyticsMetric()');
console.log('   - filterAnalyticsTable()');
console.log('   - updateTerminology()');
console.log('   - scrollToSection(sectionId)');
console.log('   - renderConsolidatedMarksheet()');
console.log('   - exportConsolidatedMarksheet()');
console.log('   - printConsolidatedMarksheet()');
