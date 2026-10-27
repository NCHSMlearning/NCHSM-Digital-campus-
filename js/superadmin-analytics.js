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

// ✅ REMOVE THIS LINE - IT'S CAUSING THE DUPLICATE ERROR
// const supabase = (typeof sb !== 'undefined') ? sb : window.sb;

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

// Canonical analytics score: a passed retake replaces the original score.
// A numeric zero is a real failure; null/blank means pending.
window.getAnalyticsEffectiveScore = function(mark) {
    if (!mark) return null;
    const status = String(mark.retake_status || '').trim().toUpperCase();
    const passedRetake = ['PASS', 'PASSED', 'COMPETENT', 'COMPETENT/PASS'].includes(status);
    if (passedRetake && mark.retake_score !== null && mark.retake_score !== undefined && String(mark.retake_score).trim() !== '') {
        const retake = Number(mark.retake_score);
        if (Number.isFinite(retake)) return retake;
    }
    const raw = mark.final_score ?? mark.final_grade ?? mark.score;
    if (raw === null || raw === undefined || String(raw).trim() === '') return null;
    const score = Number(raw);
    return Number.isFinite(score) ? score : null;
};

window.getAnalyticsStudentIdentifiers = function(record) {
    return [...new Set([record?.admission_number, record?.student_id, record?.student_uuid, record?.id]
        .filter(v => v !== null && v !== undefined && String(v).trim() !== '')
        .map(v => String(v).trim().toLowerCase()))];
};

window.isAnalyticsMarkEligible = function(mark) {
    if (!mark) return false;
    if (mark.published === false || mark.is_published === false) return false;
    const approval = String(mark.approval_status || '').trim().toLowerCase();
    if (approval && !['approved', 'published'].includes(approval)) return false;
    return true;
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
    const intake = document.getElementById('analytics_intake_select')?.value || 'all';
    const block = document.getElementById('analytics_block_select')?.value || 'all';
    const metric = document.getElementById('analytics_metric_select')?.value || 'overview';
    
    window.showAnalyticsLoading(true);
    
const client = window.sb || window.supabase;
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
        // Do not filter profiles by their CURRENT block or intake year.
        // Those fields can change as students progress; historical marks must
        // be selected by the academic year and block recorded on the marks.
        const { data: allStudents, error: studentError } = await studentQuery;
        if (studentError) throw studentError;
        // Intake is separate from academic year. Current block is never used to
        // decide which historical marks belong to a learner.
        const students = (allStudents || []).filter(student => {
            if (intake === 'all') return true;
            const monthRaw = String(student.intake_month || '').trim().toLowerCase();
            const monthAliases = {
                '01': 'january', 'jan': 'january', '1': 'january',
                '02': 'february', 'feb': 'february', '2': 'february',
                '03': 'march', 'mar': 'march', '3': 'march',
                '04': 'april', 'apr': 'april', '4': 'april',
                '05': 'may', '5': 'may',
                '06': 'june', 'jun': 'june', '6': 'june',
                '07': 'july', 'jul': 'july', '7': 'july',
                '08': 'august', 'aug': 'august', '8': 'august',
                '09': 'september', 'sep': 'september', 'sept': 'september', '9': 'september',
                '10': 'october', 'oct': 'october',
                '11': 'november', 'nov': 'november',
                '12': 'december', 'dec': 'december'
            };
            const month = monthAliases[monthRaw] || monthRaw;
            const intakeYearRaw = String(student.intake_year || '').trim();
            const intakeYearMatch = intakeYearRaw.match(/(?:19|20)\\d{2}/);
            const intakeYear = intakeYearMatch ? intakeYearMatch[0] : intakeYearRaw;
            const [wantedYear, wantedMonthCode] = intake.split('-');
            const wantedMonth = monthAliases[wantedMonthCode] || wantedMonthCode;
            return intakeYear === wantedYear && month === wantedMonth;
        });
        console.log(`👥 Found ${students.length} student profiles for programme/intake filters`);

        // 2. GET MARKS by recorded academic year and block.
        // Do not require a match against the student's current profile first:
        // doing so hides valid marks when a student's profile block/intake changes.
        let marksQuery = client
            .from('student_marks')
            .select('*')
            .eq('academic_year', year);

        if (block !== 'all') marksQuery = marksQuery.eq('block', block);
        if (program !== 'all' && program !== 'TVET') marksQuery = marksQuery.eq('program', program);
        if (program === 'TVET') marksQuery = marksQuery.neq('program', 'KRCHN');

        const { data: marks, error: marksError } = await marksQuery;
        if (marksError) throw marksError;
        const eligibleMarks = (marks || []).filter(window.isAnalyticsMarkEligible);
        const cohortIdentifiers = new Set((students || []).flatMap(student =>
            [student.admission_number, student.student_id, student.student_uuid, student.id]
                .filter(Boolean).map(String)
        ));
        console.log(`📊 Found ${marks?.length || 0} marks records before cohort matching for academic year ${year}, block ${block}`);

        // 3. PROCESS DATA
        let filteredMarks = eligibleMarks.filter(mark => intake === 'all' ||
            [mark.admission_number, mark.student_id].filter(Boolean).some(id => cohortIdentifiers.has(String(id)))
        );
        const markIdentifiers = new Set(filteredMarks.flatMap(m => [m.admission_number, m.student_id]).filter(Boolean).map(String));
        const filteredStudents = (students || []).filter(s =>
            [s.admission_number, s.student_id].filter(Boolean).some(id => markIdentifiers.has(String(id)))
        );
        const totalStudents = new Set(filteredMarks.map(m => m.admission_number || m.student_id).filter(Boolean).map(String)).size;
        const filteredStudentIds = new Set(filteredStudents.flatMap(s => [s.admission_number, s.student_id]).filter(Boolean).map(String));
        
        const totalSubjects = [...new Set(filteredMarks?.map(m => m.subject_name) || [])].length;
        
        // 4. CALCULATE STATISTICS
        let totalScore = 0, scoredCount = 0, passedCount = 0, atRiskCount = 0;
        let totalPoints = 0, aCount = 0, bCount = 0, cCount = 0, failCount = 0;
        
        filteredMarks?.forEach(m => {
            const score = window.getAnalyticsEffectiveScore(m);
            if (score !== null) {
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
        // Progression must use all blocks for the selected academic year.
        // The selected block filter is for the other analytics panels only.
        let progressionQuery = client
            .from('student_marks')
            .select('*')
            .eq('academic_year', year);
        if (program !== 'all' && program !== 'TVET') progressionQuery = progressionQuery.eq('program', program);
        if (program === 'TVET') progressionQuery = progressionQuery.neq('program', 'KRCHN');
        const { data: progressionMarks, error: progressionError } = await progressionQuery;
        if (progressionError) throw progressionError;
        const progressionRows = (progressionMarks || []).filter(window.isAnalyticsMarkEligible).filter(mark => intake === 'all' ||
            [mark.admission_number, mark.student_id].filter(Boolean).some(id => cohortIdentifiers.has(String(id)))
        );
        // Learner Progress should be limited to learners in the currently selected
        // analytics class/cohort (programme + intake + academic year/block filters).
        // Keep all-block marks only for calculating each learner's progression trend.
        window.renderProgressionTable(filteredStudents || [], progressionRows);
        
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
        const score = window.getAnalyticsEffectiveScore(m);
        if (score !== null) {
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
        const score = window.getAnalyticsEffectiveScore(m);
        if (!subjectData[subject]) subjectData[subject] = { total: 0, count: 0, pass: 0 };
        if (score !== null) {
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
        const score = window.getAnalyticsEffectiveScore(m);
        if (blockData[block] && score !== null) {
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
        const score = window.getAnalyticsEffectiveScore(m);
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
        const score = window.getAnalyticsEffectiveScore(m);
        if (!subjectData[subject]) subjectData[subject] = { total: 0, count: 0, pass: 0 };
        if (score !== null) {
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
            const score = window.getAnalyticsEffectiveScore(m);
            if (score !== null) {
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
            if (score !== null) {
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
        const score = window.getAnalyticsEffectiveScore(m);
        if (!subjectData[subject]) subjectData[subject] = { total: 0, count: 0 };
        if (score !== null) {
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

    const normalizeIdentifier = value => String(value ?? '').trim().toLowerCase();
    const normalizeBlock = value => {
        const raw = String(value || '').trim().toLowerCase().normalize('NFKC')
            .replace(/[_-]+/g, ' ').replace(/\\s+/g, ' ');
        if (['introductory', 'introduction', 'intro'].includes(raw)) return 'Introductory';
        if (/^(fqe|final qualifying examination|final qualifying exam)$/.test(raw)) return 'FQE';
        const match = raw.match(/^(?:block\\s*)?(\\d+)$/);
        if (match) return 'Block ' + match[1];
        return String(value || '').trim();
    };
    const blockRank = value => {
        if (value === 'Introductory') return 0;
        if (value === 'FQE' || /^final$/i.test(value)) return 100;
        const match = String(value).match(/^Block (\\d+)$/);
        return match ? Number(match[1]) : 50;
    };

    // Index every result row once by its possible learner identifiers. Keeping
    // row indices lets us match admission number/student ID without double-counting
    // the same result when a profile contains both identifiers.
    const records = [];
    const rowsByIdentifier = new Map();
    (marks || []).forEach(mark => {
        if (!mark || !window.isAnalyticsMarkEligible(mark)) return;
        const rawScore = window.getAnalyticsEffectiveScore(mark);
        // Null/blank means no result yet; numeric 0 is a real failing result and
        // must remain in the average denominator.
        if (rawScore === null || rawScore === undefined || String(rawScore).trim() === '') return;
        const score = Number(rawScore);
        if (!Number.isFinite(score) || score < 0 || score > 100) return;
        const block = normalizeBlock(mark.block);
        if (!block) return;
        const recordIndex = records.length;
        records.push({ score, block });
        const identifiers = [...new Set([
            mark.admission_number, mark.student_id, mark.student_uuid, mark.student_id_number
        ].map(normalizeIdentifier).filter(Boolean))];
        identifiers.forEach(identifier => {
            if (!rowsByIdentifier.has(identifier)) rowsByIdentifier.set(identifier, []);
            rowsByIdentifier.get(identifier).push(recordIndex);
        });
    });

    const learners = (students || []).filter(Boolean);
    const learnerData = learners.map(student => {
        const identifiers = [...new Set([
            student.admission_number, student.student_id, student.student_uuid, student.id
        ].map(normalizeIdentifier).filter(Boolean))];
        const recordIndices = new Set();
        identifiers.forEach(identifier => (rowsByIdentifier.get(identifier) || []).forEach(index => recordIndices.add(index)));
        const byBlock = new Map();
        let total = 0;
        let count = 0;
        recordIndices.forEach(index => {
            const record = records[index];
            if (!byBlock.has(record.block)) byBlock.set(record.block, { total: 0, count: 0 });
            const bucket = byBlock.get(record.block);
            bucket.total += record.score;
            bucket.count += 1;
            total += record.score;
            count += 1;
        });
        return { student, byBlock, average: count ? total / count : null, resultCount: count };
    });

    // Include all blocks present in the selected academic year, including Block 5,
    // Block 6 and FQE, rather than silently omitting later progression periods.
    const blockNames = [...new Set(records.map(record => record.block))]
        .sort((a, b) => blockRank(a) - blockRank(b) || a.localeCompare(b));
    const preferred = ['Introductory', 'Block 1', 'Block 2', 'Block 3', 'Block 4', 'Block 5', 'Block 6', 'FQE'];
    const orderedBlocks = [
        ...preferred.filter(block => blockNames.includes(block)),
        ...blockNames.filter(block => !preferred.includes(block))
    ];

    // Keep the header aligned with the dynamic block columns + overall average.
    const table = tbody.closest('table');
    const headerRow = table?.querySelector('thead tr');
    if (headerRow) {
        const nameHeader = headerRow.querySelector('th');
        const nameText = nameHeader?.textContent?.trim() || 'Learner';
        headerRow.innerHTML = '<th style="padding:10px 12px;text-align:left;">' + window.escapeHtml(nameText) + '</th>' +
            orderedBlocks.map(block => '<th style="padding:10px 12px;text-align:center;">' + window.escapeHtml(block) + ' Avg (%)</th>').join('') +
            '<th style="padding:10px 12px;text-align:center;">Overall Average (%)</th>' +
            '<th style="padding:10px 12px;text-align:center;">Trend</th>';
    }

    if (!learnerData.length) {
        const colCount = orderedBlocks.length + 3;
        tbody.innerHTML = '<tr><td colspan="' + colCount + '" style="padding:30px;text-align:center;color:#64748b;">No learners match the selected class filters.</td></tr>';
        return;
    }

    tbody.innerHTML = learnerData.map(({ student, byBlock, average, resultCount }) => {
        const blockAverages = orderedBlocks.map(block => {
            const entry = byBlock.get(block);
            return entry && entry.count ? entry.total / entry.count : null;
        });
        const observed = blockAverages.filter(value => value !== null);
        let trend = '—', trendColor = '#94a3b8';
        if (observed.length >= 2) {
            if (observed[observed.length - 1] > observed[0]) { trend = '↗ Improving'; trendColor = '#059669'; }
            else if (observed[observed.length - 1] < observed[0]) { trend = '↘ Declining'; trendColor = '#dc2626'; }
            else { trend = '→ Stable'; trendColor = '#b45309'; }
        }
        const blockCells = blockAverages.map(value => {
            if (value === null) return '<td style="padding:9px 10px;text-align:center;color:#94a3b8;">—</td>';
            const rounded = Math.round(value * 10) / 10;
            const color = rounded >= 60 ? '#059669' : '#dc2626';
            return '<td style="padding:9px 10px;text-align:center;font-weight:600;color:' + color + ';">' + rounded.toFixed(1) + '</td>';
        }).join('');
        const overall = average === null ? 'No published results' : (Math.round(average * 10) / 10).toFixed(1) + '%';
        const overallColor = average === null ? '#64748b' : average >= 60 ? '#059669' : '#dc2626';
        return '<tr style="border-bottom:1px solid #e5e7eb;">' +
            '<td style="padding:9px 10px;font-weight:500;">' + window.escapeHtml(student.full_name || student.name || student.admission_number || student.student_id || 'Unknown') + '</td>' +
            blockCells +
            '<td title="' + resultCount + ' published/approved result(s)" style="padding:9px 10px;text-align:center;font-weight:700;color:' + overallColor + ';">' + overall + '</td>' +
            '<td style="padding:9px 10px;text-align:center;font-weight:600;color:' + trendColor + ';">' + trend + '</td>' +
            '</tr>';
    }).join('');
};

// ============================================================
// // ============================================================
// RENDER ANALYTICS SUBJECT TABLE
// ============================================================

window.renderAnalyticsSubjectTable = async function(marks, students, program, block) {
    const tbody = document.getElementById('analytics_subject_table_body');
    if (!tbody) return;

    // Resolve display codes/names from the authoritative unit catalog.
    // Keep historical performance grouped by the block stored on the marks.
    const client = window.sb;
    let catalog = [];
    if (client) {
        const { data, error } = await client
            .from('units_catalog')
            .select('unit_code, unit_name, program, block, status')
            .eq('status', 'active');
        if (error) console.warn('Could not load unit catalog for analytics:', error.message);
        else catalog = data || [];
    }

    const normalize = value => String(value || '')
        .normalize('NFKC')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .replace(/[‐‑‒–—]/g, '-');

    const subjects = new Map();
    (marks || []).forEach(m => {
        const subjectName = String(m.subject_name || '').trim();
        const key = [normalize(subjectName), normalize(m.program)].join('|');
        if (!subjects.has(key)) {
            subjects.set(key, {
                rawName: subjectName || 'Unknown unit',
                program: m.program || '',
                block: m.block || '',
                total: 0, scoredCount: 0, passCount: 0, learners: new Set(),
                aCount: 0, bCount: 0, cCount: 0, failCount: 0
            });
        }
        const item = subjects.get(key);
        // Marks may contain multiple assessment rows per learner; count each
        // learner once for the learner figure, while averages use scored rows.
        const learnerKey = m.admission_number || m.student_id || m.student_name;
        if (learnerKey) item.learners.add(String(learnerKey));
        const score = Number(m.final_score);
        if (!Number.isFinite(score) || score <= 0) return;
        item.total += score;
        item.scoredCount++;
        if (score >= 60) item.passCount++;
        if (score >= 75) item.aCount++;
        else if (score >= 65) item.bCount++;
        else if (score >= 60) item.cCount++;
        else item.failCount++;
    });

    const rows = [...subjects.values()].map(item => {
        // Match on normalized name and programme first; prefer a catalog row
        // whose block matches this historical mark group to avoid wrong codes
        // when a similar unit name exists in another block.
        const matches = catalog.filter(unit =>
            normalize(unit.unit_name) === normalize(item.rawName) &&
            (!item.program || !unit.program || normalize(unit.program) === normalize(item.program))
        );
        matches.sort((a, b) =>
            Number(normalize(b.block) === normalize(item.block)) -
            Number(normalize(a.block) === normalize(item.block))
        );
        const unit = matches[0];
        const avg = item.scoredCount ? Math.round(item.total / item.scoredCount * 10) / 10 : 0;
        const gradeInfo = window.getGradeInfo(avg);
        return {
            code: unit?.unit_code || '—',
            name: unit?.unit_name || item.rawName,
            avg,
            learners: item.learners.size,
            scoredCount: item.scoredCount,
            passRate: item.scoredCount ? Math.round(item.passCount / item.scoredCount * 100) : 0,
            grade: gradeInfo.grade,
            points: gradeInfo.points,
            color: gradeInfo.color,
            status: avg >= 60 ? '✅ Passing' : avg > 0 ? '⚠️ At Risk' : '⏳ No Scores',
            statusColor: avg >= 60 ? '#10b981' : avg > 0 ? '#ef4444' : '#94a3b8',
            difficulty: avg >= 75 ? '🟢 Easy' : avg >= 65 ? '🟡 Medium' : avg >= 60 ? '🟠 Moderate' : avg > 0 ? '🔴 Hard' : '—',
            block: item.block
        };
    }).sort((a, b) => b.avg - a.avg || a.name.localeCompare(b.name));

    if (!rows.length) {
        tbody.innerHTML = '<tr><td colspan="8" style="padding:40px;text-align:center;color:#94a3b8;">No unit data available for the selected filters</td></tr>';
        return;
    }

    tbody.innerHTML = rows.map(row => `
        <tr style="border-bottom:1px solid #e2e8f0;">
            <td style="padding:12px;font-weight:600;white-space:nowrap;">${window.escapeHtml(row.code)}</td>
            <td style="padding:12px;min-width:240px;">${window.escapeHtml(row.name)}</td>
            <td style="padding:12px;text-align:center;white-space:nowrap;">${row.learners} / ${row.scoredCount}</td>
            <td style="padding:12px;text-align:center;font-weight:600;">${row.scoredCount ? row.avg + '%' : '—'}</td>
            <td style="padding:12px;text-align:center;">${row.scoredCount ? row.passRate + '%' : '—'}</td>
            <td style="padding:12px;text-align:center;font-weight:700;color:${row.color};">${window.escapeHtml(row.grade)}</td>
            <td style="padding:12px;text-align:center;color:${row.statusColor};white-space:nowrap;">${row.status}</td>
            <td style="padding:12px;text-align:center;white-space:nowrap;">${row.difficulty}</td>
        </tr>
    `).join('');
};

// ============================================================
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
        const score = window.getAnalyticsEffectiveScore(m);
        if (score === null) return;
        window.getAnalyticsStudentIdentifiers(m).forEach(admission => {
            if (!studentMarks[admission]) studentMarks[admission] = { total: 0, count: 0 };
            studentMarks[admission].total += score;
            studentMarks[admission].count++;
        });
    });
    
    let html = '';
    students.forEach(student => {
        const marksData = window.getAnalyticsStudentIdentifiers(student).map(id => studentMarks[id]).find(Boolean) || { total: 0, count: 0 };
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
        const score = window.getAnalyticsEffectiveScore(m);
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
        const score = window.getAnalyticsEffectiveScore(m);
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
        const score = window.getAnalyticsEffectiveScore(m);
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
        const total = (window.getAnalyticsEffectiveScore(m) ?? 0);
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
        const score = window.getAnalyticsEffectiveScore(m);
        if (!subjectData[subject]) subjectData[subject] = { total: 0, count: 0, pass: 0, scores: [] };
        if (score !== null) {
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

window.renderTopStudents = function(students, marks, rankingMode) {
    const container = document.getElementById('analytics_top_students');
    if (!container) return;
    const mode = rankingMode || window._analyticsTopRankingMode || 'gpa';
    window._analyticsTopRankingMode = mode;

    // Build a shared aggregate under every known identifier, while each learner
    // reads only one aggregate. Pending marks are omitted; numeric zero is a failure.
    const studentAverages = {};
    (marks || []).filter(window.isAnalyticsMarkEligible).forEach(mark => {
        const score = window.getAnalyticsEffectiveScore(mark);
        if (score === null) return;
        const points = window.getGradeInfo(score).points;
        window.getAnalyticsStudentIdentifiers(mark).forEach(id => {
            if (!studentAverages[id]) studentAverages[id] = { total: 0, count: 0, scores: [], points: 0 };
            studentAverages[id].total += score;
            studentAverages[id].count += 1;
            studentAverages[id].scores.push(score);
            studentAverages[id].points += points;
        });
    });

    const seenStudents = new Set();
    const studentData = [];
    (students || []).forEach(student => {
        const ids = window.getAnalyticsStudentIdentifiers(student);
        const stableId = ids[0] || String(student.full_name || '');
        if (seenStudents.has(stableId)) return;
        seenStudents.add(stableId);
        const data = ids.map(id => studentAverages[id]).find(Boolean);
        if (!data || data.count === 0) return;
        const avg = Math.round((data.total / data.count) * 10) / 10;
        const avgPoints = Math.round((data.points / data.count) * 100) / 100;
        studentData.push({
            student, avg, avgPoints, count: data.count,
            highest: Math.max(...data.scores), lowest: Math.min(...data.scores)
        });
    });

    const ranked = [...studentData].sort((a, b) =>
        mode === 'average'
            ? b.avg - a.avg || b.avgPoints - a.avgPoints
            : b.avgPoints - a.avgPoints || b.avg - a.avg
    );
    const topStudents = ranked.slice(0, 10);
    const modeLabel = mode === 'average' ? 'Average Marks (%)' : 'Average Grade Points';
    const metricLabel = mode === 'average' ? 'Average' : 'Avg Points';
    if (topStudents.length === 0) {
        container.innerHTML = '<p style="color:#94a3b8;text-align:center;padding:20px;">No eligible published learner marks available</p>';
        return;
    }

    let html = `
      <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:14px;">
        <button type="button" onclick="window.renderTopStudents(window._analyticsStudents || [], window._analyticsMarks || [], 'gpa')"
          aria-pressed="${mode === 'gpa'}"
          style="padding:9px 14px;border-radius:8px;border:1px solid ${mode === 'gpa' ? '#4f46e5' : '#cbd5e1'};background:${mode === 'gpa' ? '#4f46e5' : '#fff'};color:${mode === 'gpa' ? '#fff' : '#334155'};font-weight:600;cursor:pointer;">Rank by Grade Points</button>
        <button type="button" onclick="window.renderTopStudents(window._analyticsStudents || [], window._analyticsMarks || [], 'average')"
          aria-pressed="${mode === 'average'}"
          style="padding:9px 14px;border-radius:8px;border:1px solid ${mode === 'average' ? '#4f46e5' : '#cbd5e1'};background:${mode === 'average' ? '#4f46e5' : '#fff'};color:${mode === 'average' ? '#fff' : '#334155'};font-weight:600;cursor:pointer;">Rank by Average Marks</button>
        <span style="font-size:12px;color:#64748b;">Current ranking: ${modeLabel}</span>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:12px;">`;
    topStudents.forEach((data, index) => {
        const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : String(index + 1);
        const scoreGrade = window.getGradeInfo(data.avg);
        const statusColor = scoreGrade.grade === 'A' ? '#10b981' : scoreGrade.grade === 'B' ? '#3b82f6' : scoreGrade.grade === 'C' ? '#f59e0b' : '#ef4444';
        const bgColor = index === 0 ? '#fef3c7' : index === 1 ? '#f0fdf4' : index === 2 ? '#eff6ff' : '#f8fafc';
        const borderColor = index === 0 ? '#f59e0b' : index === 1 ? '#10b981' : index === 2 ? '#3b82f6' : '#e5e7eb';
        const rankMetric = mode === 'average' ? `${data.avg}%` : data.avgPoints.toFixed(2);
        html += `
          <div style="background:${bgColor};border:2px solid ${borderColor};border-radius:12px;padding:16px;text-align:center;">
            <div style="font-size:28px;margin-bottom:8px;">${medal}</div>
            <div style="font-weight:700;font-size:15px;color:#1e293b;">${window.escapeHtml(data.student.full_name || 'Unknown')}</div>
            <div style="font-size:12px;color:#64748b;">${window.escapeHtml(data.student.admission_number || data.student.student_id || 'N/A')}</div>
            <div style="font-size:12px;color:#64748b;">${window.escapeHtml(data.student.program || 'N/A')}</div>
            <div style="margin-top:10px;display:flex;justify-content:center;gap:15px;flex-wrap:wrap;">
              <div><div style="font-size:11px;color:#94a3b8;">${metricLabel}</div><div style="font-size:20px;font-weight:700;color:${statusColor};">${rankMetric}</div></div>
              <div><div style="font-size:11px;color:#94a3b8;">Average Marks</div><div style="font-size:20px;font-weight:700;color:${statusColor};">${data.avg}%</div></div>
              <div><div style="font-size:11px;color:#94a3b8;">Grade</div><div style="font-size:20px;font-weight:700;color:${statusColor};">${scoreGrade.grade}</div></div>
            </div>
            <div style="font-size:11px;color:#94a3b8;margin-top:5px;">${data.count} marked units • Highest: ${data.highest}% • Lowest: ${data.lowest}%</div>
          </div>`;
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
        const score = window.getAnalyticsEffectiveScore(m);
        if (score === null) return;
        window.getAnalyticsStudentIdentifiers(m).forEach(admission => {
            if (!studentAverages[admission]) studentAverages[admission] = { total: 0, count: 0, scores: [] };
            studentAverages[admission].total += score;
            studentAverages[admission].count++;
            studentAverages[admission].scores.push(score);
        });
    });
    
    const studentData = [];
    students?.forEach(s => {
        const data = window.getAnalyticsStudentIdentifiers(s).map(id => studentAverages[id]).find(Boolean);
        if (data && data.count > 0) {
            const avg = Math.round((data.total / data.count) * 10) / 10;
            if (avg < 60) {
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
        const score = window.getAnalyticsEffectiveScore(m);
        if (blockStats[block]) {
            if (score !== null) {
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
        const identifiers = window.getAnalyticsStudentIdentifiers(s);
        const record = identifiers.map(id => studentData[id]).find(Boolean) || {
            student: s, units: {}, total: 0, count: 0, passed: 0
        };
        identifiers.forEach(id => { studentData[id] = record; });
    });
    
    // 3. Populate marks per student
    marks.forEach(m => {
        const identifiers = window.getAnalyticsStudentIdentifiers(m);
        const unit = m.subject_name ? m.subject_name.trim() : '';
        const score = window.getAnalyticsEffectiveScore(m);
        const record = identifiers.map(id => studentData[id]).find(Boolean);
        if (record && unit && unit !== '' && score !== null && unitSet.has(unit)) {
            const previous = record.units[unit];
            if (previous !== undefined) {
                record.total -= previous;
                record.count--;
                if (previous >= 60) record.passed--;
            }
            record.units[unit] = score;
            record.total += score;
            record.count++;
            if (score >= 60) record.passed++;
        }
    });
    
    // 4. Calculate averages and grades - FIX POINTS
    const consolidatedData = [...new Set(Object.values(studentData))].map(data => {
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
    
    // 8. Build table headers with dynamic unit columns - FIXED HEADER
    const headerRow = document.querySelector('#consolidatedMarksheetTable thead tr');
    if (headerRow) {
        // STEP 1: Clear ALL columns except the first 3 (#, Adm No., Learner Name)
        while (headerRow.children.length > 3) {
            headerRow.removeChild(headerRow.lastChild);
        }
        
        // STEP 2: Add all unit columns (APPEND, not insertBefore)
        units.forEach(unit => {
            const th = document.createElement('th');
            th.style.cssText = 'padding: 4px 6px; text-align: center; background: #0a66c2; color: white; font-size: 9px; min-width: 50px; white-space: nowrap;';
            // Show full unit name with smaller font
            th.innerHTML = `${unit} <span style="font-size: 7px; opacity: 0.7;">(*/100)</span>`;
            th.title = unit;
            headerRow.appendChild(th);
        });
        
        // STEP 3: Add Total, Avg, Grade, Points, Status columns
        const fixedCols = ['Total', 'Avg', 'Grade', 'Points', 'Status'];
        fixedCols.forEach(col => {
            const th = document.createElement('th');
            th.style.cssText = 'padding: 4px 6px; text-align: center; background: #0a66c2; color: white; font-size: 10px; min-width: 50px;';
            th.textContent = col;
            headerRow.appendChild(th);
        });
    }
    
    // 9. Build table rows - FIXED to match headers
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
        
        // Unit scores - these now match the header order
        units.forEach(unit => {
            const score = data.units[unit];
            const displayScore = (score !== undefined && score !== null) ? score : '__';
            const isPass = score !== undefined && score !== null && score >= 60;
            const color = (score !== undefined && score !== null) ? (isPass ? '#10b981' : '#ef4444') : '#94a3b8';
            html += `<td style="padding: 4px 6px; text-align: center; font-weight: 600; color: ${color}; font-size: 12px;">${displayScore}</td>`;
        });
        
        // Total, Avg, Grade, Points, Status - these now match the header order
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
// ============================================================
// EXPORT DETAILED ANALYTICS REPORT (HTML WITH EMBEDDED GRAPHS + TABLES)
// ============================================================
// Exports a standalone report so charts remain visible offline. The HTML can
// be opened in any browser and printed/saved as PDF using the browser's Print
// dialog. Tables are copied from the currently rendered analytics view, so
// they reflect the filters that were active when the report was exported.
window.exportAnalyticsReport = function() {
    console.log('📤 Exporting detailed analytics report...');

    const dynamicRoot = document.getElementById('analyticsDynamicContent');
    if (!dynamicRoot || dynamicRoot.style.display === 'none') {
        alert('Please load analytics first, then export the report.');
        return;
    }

    const safe = value => String(value ?? '').replace(/[&<>"']/g, ch => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[ch]));

    const read = id => document.getElementById(id)?.textContent?.trim() || '—';
    const program = read('analytics_program_label');
    const year = document.getElementById('analytics_year_select')?.value || 'All years';
    const block = document.getElementById('analytics_block_select')?.value || 'All blocks';
    const intake = document.getElementById('analytics_intake_select')?.selectedOptions?.[0]?.textContent?.trim() ||
        document.getElementById('analytics_intake_select')?.value || 'All intakes';
    const metric = document.getElementById('analytics_metric_select')?.selectedOptions?.[0]?.textContent?.trim() ||
        document.getElementById('analytics_metric_select')?.value || 'Overview';
    const generated = new Date();
    const dateStamp = generated.toISOString().slice(0, 10);

    const statItems = [
        ['Total learners', read('analytics_total_students')],
        ['Pass rate', read('analytics_pass_rate')],
        ['Average score', read('analytics_avg_score')],
        ['At-risk results', read('analytics_at_risk')],
        ['Active units/subjects', read('analytics_active_subjects')],
        ['Gender ratio (female : male)', read('analytics_gender_ratio')],
        ['Failing units', read('analytics_failing_units')],
        ['Improvement', read('analytics_improvement')]
    ];
    const statsHtml = statItems.map(([label, value]) =>
        '<div class="stat"><div class="stat-label">' + safe(label) +
        '</div><div class="stat-value">' + safe(value) + '</div></div>'
    ).join('');

    // Embed charts as PNGs; this preserves the actual rendered chart, including
    // labels and legends, without requiring Chart.js in the exported document.
    const chartTitle = canvas => {
        const parent = canvas.closest('.chart-card, .analytics-chart-card, .card, section, .chart-container') || canvas.parentElement;
        const heading = parent?.querySelector('h2,h3,h4,.card-title,.chart-title');
        if (heading?.textContent?.trim()) return heading.textContent.trim();
        const label = canvas.getAttribute('aria-label') || canvas.id || 'Analytics chart';
        return label.replace(/([A-Z])/g, ' $1').replace(/^analytics\s*/i, '').replace(/Chart$/, ' chart').trim();
    };
    const chartHtml = Array.from(dynamicRoot.querySelectorAll('canvas')).map((canvas, index) => {
        try {
            if (!canvas.width || !canvas.height) return '';
            const image = canvas.toDataURL('image/png');
            const title = chartTitle(canvas);
            return '<section class="report-section chart-section"><h2>' + safe(title) +
                '</h2><img class="chart-image" src="' + image + '" alt="' + safe(title) +
                '"></section>';
        } catch (error) {
            console.warn('Could not embed analytics chart:', canvas.id, error);
            return '<section class="report-section"><h2>' + safe(chartTitle(canvas)) +
                '</h2><p class="muted">This chart could not be embedded by the browser.</p></section>';
        }
    }).filter(Boolean).join('');

    // Include all currently rendered analytics tables (not only the first one).
    const tablesHtml = Array.from(dynamicRoot.querySelectorAll('table')).map((table, index) => {
        const parent = table.closest('.card, section, .table-container, .analytics-table-card') || table.parentElement;
        const heading = parent?.querySelector('h2,h3,h4,.card-title,.table-title');
        const title = heading?.textContent?.trim() || table.getAttribute('aria-label') ||
            table.id?.replace(/([A-Z])/g, ' $1').replace(/^analytics\s*/i, '') || ('Detailed data table ' + (index + 1));
        return '<section class="report-section table-section"><h2>' + safe(title) +
            '</h2><div class="table-wrap">' + table.outerHTML + '</div></section>';
    }).join('');

    const gradingScale = `
        <section class="report-section">
          <h2>Grading scale used for this analytics view</h2>
          <table class="report-table grading">
            <thead><tr><th>Score range</th><th>Grade</th><th>Grade points</th><th>Interpretation</th></tr></thead>
            <tbody>
              <tr><td>75–100%</td><td>A</td><td>4</td><td>Distinction</td></tr>
              <tr><td>65–74.99%</td><td>B</td><td>3</td><td>Credit</td></tr>
              <tr><td>60–64.99%</td><td>C</td><td>2</td><td>Pass</td></tr>
              <tr><td>0–59.99%</td><td>Fail</td><td>0</td><td>Fail</td></tr>
            </tbody>
          </table>
          <p class="muted">Blank or unavailable results may be pending and are not the same as a recorded zero. A passed retake replaces the original score where retake data is available.</p>
        </section>`;

    const styles = `
      :root { color-scheme: light; }
      * { box-sizing: border-box; }
      body { margin: 0; background: #f1f5f9; color: #172033; font: 13px/1.5 Arial, Helvetica, sans-serif; }
      .toolbar { position: sticky; top: 0; z-index: 5; padding: 12px 20px; background: #102a43; color: #fff; display:flex; gap:10px; align-items:center; justify-content:space-between; }
      .toolbar button { border:0; border-radius:7px; padding:10px 15px; background:#fff; color:#102a43; font-weight:700; cursor:pointer; }
      .page { max-width: 1180px; margin: 22px auto; padding: 28px; background:#fff; box-shadow:0 5px 24px #0f172a12; }
      header { border-bottom:3px solid #0f766e; padding-bottom:18px; margin-bottom:20px; }
      .eyebrow { color:#0f766e; text-transform:uppercase; letter-spacing:2px; font-size:10px; font-weight:800; }
      h1 { font-size:25px; margin:5px 0; color:#102a43; }
      .subtitle { color:#64748b; margin:3px 0; }
      .meta { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:10px; margin-top:18px; }
      .meta div,.stat { border:1px solid #e2e8f0; border-radius:8px; padding:10px 12px; background:#f8fafc; }
      .meta strong,.stat-label { display:block; font-size:10px; color:#64748b; text-transform:uppercase; letter-spacing:.4px; }
      .meta span,.stat-value { display:block; font-size:13px; font-weight:700; margin-top:3px; overflow-wrap:anywhere; }
      .stats { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:10px; margin:18px 0 24px; }
      .stat-value { font-size:21px; color:#0f766e; }
      .report-section { margin:26px 0; break-inside:avoid; }
      h2 { font-size:16px; color:#102a43; padding-bottom:7px; border-bottom:1px solid #cbd5e1; margin:0 0 12px; }
      .chart-image { display:block; width:100%; max-height:480px; object-fit:contain; margin:0 auto; }
      .table-wrap { width:100%; overflow-x:auto; }
      table { width:100%; border-collapse:collapse; font-size:10px; }
      th { background:#102a43 !important; color:#fff !important; text-align:left; }
      th,td { border:1px solid #dbe3ec; padding:6px 7px; vertical-align:top; }
      tbody tr:nth-child(even) { background:#f8fafc; }
      .muted { color:#64748b; font-size:11px; }
      footer { border-top:1px solid #cbd5e1; margin-top:30px; padding-top:12px; color:#64748b; font-size:10px; display:flex; justify-content:space-between; gap:15px; }
      @media (max-width:700px) { .page{padding:14px;margin:0}.meta,.stats{grid-template-columns:repeat(2,minmax(0,1fr))}.toolbar{position:static} }
      @media print {
        @page { size:A4 landscape; margin:12mm; }
        body { background:#fff; font-size:10px; }
        .toolbar { display:none !important; }
        .page { max-width:none; margin:0; padding:0; box-shadow:none; }
        .report-section { break-inside:avoid; }
        .table-section { break-inside:auto; }
        .table-wrap { overflow:visible; }
        table { font-size:8px; }
        th,td { padding:4px; }
        .chart-image { max-height:155mm; }
        .stats { grid-template-columns:repeat(4,minmax(0,1fr)); }
        * { -webkit-print-color-adjust:exact; print-color-adjust:exact; }
      }
    `;

    const html = '<!doctype html><html lang="en"><head><meta charset="utf-8">' +
        '<meta name="viewport" content="width=device-width,initial-scale=1">' +
        '<title>NCHSM Detailed Marks Analysis Report</title><style>' + styles + '</style></head><body>' +
        '<div class="toolbar"><strong>NCHSM · Detailed Marks Analysis</strong>' +
        '<span><button onclick="window.print()">Print / Save as PDF</button></span></div>' +
        '<main class="page"><header><div class="eyebrow">Academic performance intelligence</div>' +
        '<h1>NAKURU COLLEGE OF HEALTH SCIENCES &amp; MANAGEMENT</h1>' +
        '<p class="subtitle">Detailed Marks Analysis Report</p>' +
        '<p class="subtitle">Generated ' + safe(generated.toLocaleString()) + '</p>' +
        '<div class="meta"><div><strong>Programme</strong><span>' + safe(program) +
        '</span></div><div><strong>Academic year</strong><span>' + safe(year) +
        '</span></div><div><strong>Block / term</strong><span>' + safe(block) +
        '</span></div><div><strong>Intake</strong><span>' + safe(intake) +
        '</span></div><div><strong>Selected metric</strong><span>' + safe(metric) +
        '</span></div><div><strong>Scope</strong><span>Current analytics filters</span></div>' +
        '<div><strong>Report status</strong><span>Generated from displayed analytics</span></div>' +
        '<div><strong>Charts included</strong><span>' + Array.from(dynamicRoot.querySelectorAll('canvas')).length +
        ' chart(s)</span></div></div></header>' +
        '<section class="report-section"><h2>Executive summary and key indicators</h2><div class="stats">' + statsHtml +
        '</div><p>Interpret the results alongside the programme, academic year, block/term and intake filters recorded above. Detailed charts and rendered analytics tables follow.</p></section>' +
        '<section class="report-section"><h2>Performance charts and visual analysis</h2>' +
        (chartHtml || '<p class="muted">No chart canvases were available in the current analytics view.</p>') + '</section>' +
        (tablesHtml || '<section class="report-section"><h2>Detailed tables</h2><p class="muted">No analytics tables were rendered for the current selection.</p></section>') +
        gradingScale +
        '<footer><span>Confidential academic performance report · For authorised institutional use</span><span>Generated ' +
        safe(generated.toLocaleString()) + '</span></footer></main></body></html>';

    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'NCHSM_detailed_marks_analysis_' + dateStamp + '.html';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
};
 
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
