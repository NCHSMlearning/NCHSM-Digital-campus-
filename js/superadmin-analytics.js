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
    termChart: null
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
    
    // Show loading
    window.showAnalyticsLoading(true);
    
    try {
        // Get all approved students
        let studentQuery = window.sb
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
        
        if (block !== 'all') {
            studentQuery = studentQuery.eq('block', block);
        }
        
        if (year) {
            studentQuery = studentQuery.eq('intake_year', year);
        }
        
        const { data: students, error: studentError } = await studentQuery;
        
        if (studentError) throw studentError;
        
        // Get marks for these students
        const studentIds = students?.map(s => s.student_id) || [];
        let marksQuery = window.sb
            .from('student_marks')
            .select('*')
            .eq('academic_year', year)
            .in('admission_number', studentIds.length > 0 ? studentIds : ['none']);
        
        if (block !== 'all') {
            marksQuery = marksQuery.eq('block', block);
        }
        
        const { data: marks, error: marksError } = await marksQuery;
        
        if (marksError) throw marksError;
        
        // Calculate statistics
        const totalStudents = students?.length || 0;
        const totalSubjects = [...new Set(marks?.map(m => m.subject_name) || [])].length;
        
        // Calculate pass rate and average
        let totalScore = 0;
        let scoredCount = 0;
        let passedCount = 0;
        let atRiskCount = 0;
        
        marks?.forEach(m => {
            const score = m.final_score || 0;
            if (score > 0) {
                totalScore += score;
                scoredCount++;
                if (score >= 60) passedCount++;
                if (score < 60) atRiskCount++;
            }
        });
        
        const avgScore = scoredCount > 0 ? Math.round((totalScore / scoredCount) * 10) / 10 : 0;
        const passRate = scoredCount > 0 ? Math.round((passedCount / scoredCount) * 100) : 0;
        
        // Update stats cards
        window.updateAnalyticsStats(totalStudents, passRate, avgScore, totalSubjects, atRiskCount);
        
        // Update program badge
        window.updateAnalyticsProgramBadge(program);
        
        // Update student count in table header
        document.getElementById('analytics_student_count').textContent = totalStudents;
        document.getElementById('analytics_program_display').textContent = window.getProgramDisplayName(program) || 'All Programs';
        document.getElementById('analytics_block_year_display').textContent = `${year} - ${block === 'all' ? 'All Blocks' : block}`;
        
        // Render charts based on metric
        window.renderAnalyticsCharts(marks, students, program, block, year, metric);
        
        // Render tables
        window.renderAnalyticsSubjectTable(marks);
        window.renderAnalyticsStudentTable(students, marks);
        window.renderAnalyticsBlockTable(students, marks, block);
        window.renderAnalyticsProgramTable(students, marks);
        window.renderAnalyticsTrendsTable(students, marks);
        window.renderAnalyticsExamDetails(marks, students, program, block, year);
        
        // Show dynamic content, hide placeholder
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
// SHOW ANALYTICS LOADING
// ============================================================

window.showAnalyticsLoading = function(isLoading) {
    const placeholder = document.getElementById('analyticsPlaceholder');
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
        document.getElementById('analyticsDynamicContent').style.display = 'none';
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
// UPDATE ANALYTICS STATS
// ============================================================

window.updateAnalyticsStats = function(totalStudents, passRate, avgScore, totalSubjects, atRiskCount) {
    document.getElementById('analytics_total_students').textContent = totalStudents;
    document.getElementById('analytics_pass_rate').textContent = passRate + '%';
    document.getElementById('analytics_avg_score').textContent = avgScore + '%';
    document.getElementById('analytics_active_subjects').textContent = totalSubjects;
    document.getElementById('analytics_at_risk').textContent = atRiskCount;
};

// ============================================================
// UPDATE ANALYTICS PROGRAM BADGE
// ============================================================

window.updateAnalyticsProgramBadge = function(program) {
    const programLabel = document.getElementById('analytics_program_label');
    if (programLabel) {
        if (program === 'all') {
            programLabel.textContent = 'All Programs';
        } else if (program === 'TVET') {
            programLabel.textContent = 'TVET Programs';
        } else {
            programLabel.textContent = window.getProgramDisplayName(program) || program;
        }
    }
};

// ============================================================
// GET PROGRAM DISPLAY NAME
// ============================================================

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
// RENDER ANALYTICS CHARTS
// ============================================================

window.renderAnalyticsCharts = function(marks, students, program, block, year, metric) {
    window.renderGradeDistributionChart(marks);
    window.renderSubjectPerformanceChart(marks);
    window.renderBlockPerformanceChart(marks, students);
    window.renderProgramComparisonChart(marks, students);
};

// ============================================================
// RENDER GRADE DISTRIBUTION CHART
// ============================================================

window.renderGradeDistributionChart = function(marks) {
    const canvas = document.getElementById('analyticsGradeChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    // Destroy existing chart
    if (window.analyticsChartInstances.gradeChart) {
        window.analyticsChartInstances.gradeChart.destroy();
        window.analyticsChartInstances.gradeChart = null;
    }
    
    // Calculate grade distribution
    const grades = {
        'A': 0, 'B': 0, 'C': 0, 'D': 0, 'F': 0
    };
    
    marks?.forEach(m => {
        const score = m.final_score || 0;
        if (score > 0) {
            if (score >= 80) grades.A++;
            else if (score >= 65) grades.B++;
            else if (score >= 60) grades.C++;
            else if (score >= 40) grades.D++;
            else grades.F++;
        }
    });
    
    const labels = ['A (80-100)', 'B (65-79)', 'C (60-64)', 'D (40-59)', 'F (<40)'];
    const data = [grades.A, grades.B, grades.C, grades.D, grades.F];
    const colors = ['#10b981', '#3b82f6', '#f59e0b', '#f97316', '#ef4444'];
    
    window.analyticsChartInstances.gradeChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: colors,
                borderWidth: 2,
                borderColor: '#ffffff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { padding: 10, usePointStyle: true }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = total > 0 ? ((context.parsed / total) * 100).toFixed(1) : 0;
                            return `${context.label}: ${context.parsed} (${percentage}%)`;
                        }
                    }
                }
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
    
    // Group by subject
    const subjectData = {};
    marks?.forEach(m => {
        const subject = m.subject_name || 'Unknown';
        const score = m.final_score || 0;
        if (!subjectData[subject]) {
            subjectData[subject] = { total: 0, count: 0, pass: 0 };
        }
        if (score > 0) {
            subjectData[subject].total += score;
            subjectData[subject].count++;
            if (score >= 60) subjectData[subject].pass++;
        }
    });
    
    const sortedSubjects = Object.keys(subjectData).sort();
    const labels = sortedSubjects.map(s => s.length > 15 ? s.substring(0, 15) + '...' : s);
    const avgScores = sortedSubjects.map(s => {
        const data = subjectData[s];
        return data.count > 0 ? Math.round(data.total / data.count) : 0;
    });
    const passRates = sortedSubjects.map(s => {
        const data = subjectData[s];
        return data.count > 0 ? Math.round((data.pass / data.count) * 100) : 0;
    });
    
    window.analyticsChartInstances.subjectChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Average Score (%)',
                    data: avgScores,
                    backgroundColor: 'rgba(99, 102, 241, 0.7)',
                    borderColor: '#6366f1',
                    borderWidth: 1,
                    borderRadius: 4
                },
                {
                    label: 'Pass Rate (%)',
                    data: passRates,
                    backgroundColor: 'rgba(16, 185, 129, 0.7)',
                    borderColor: '#10b981',
                    borderWidth: 1,
                    borderRadius: 4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { padding: 10, usePointStyle: true }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    ticks: { callback: function(value) { return value + '%'; } }
                }
            }
        }
    });
};

// ============================================================
// RENDER BLOCK PERFORMANCE CHART
// ============================================================

window.renderBlockPerformanceChart = function(marks, students) {
    const canvas = document.getElementById('analyticsBlockChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    if (window.analyticsChartInstances.blockChart) {
        window.analyticsChartInstances.blockChart.destroy();
        window.analyticsChartInstances.blockChart = null;
    }
    
    // Group by block
    const blockData = {};
    const blockOrder = ['Introductory', 'Block 1', 'Block 2', 'Block 3', 'Block 4', 'Block 5', 'Final'];
    
    // Initialize all blocks
    blockOrder.forEach(b => {
        blockData[b] = { total: 0, count: 0, pass: 0, students: 0 };
    });
    
    // Count students per block
    students?.forEach(s => {
        const block = s.block || 'Unknown';
        if (blockData[block]) {
            blockData[block].students++;
        } else {
            blockData[block] = { total: 0, count: 0, pass: 0, students: 1 };
        }
    });
    
    // Add marks
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
    const avgScores = labels.map(b => {
        const data = blockData[b];
        return data.count > 0 ? Math.round(data.total / data.count) : 0;
    });
    const passRates = labels.map(b => {
        const data = blockData[b];
        return data.count > 0 ? Math.round((data.pass / data.count) * 100) : 0;
    });
    const studentCounts = labels.map(b => blockData[b].students);
    
    window.analyticsChartInstances.blockChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Avg Score (%)',
                    data: avgScores,
                    backgroundColor: 'rgba(245, 158, 11, 0.7)',
                    borderColor: '#f59e0b',
                    borderWidth: 1,
                    borderRadius: 4
                },
                {
                    label: 'Pass Rate (%)',
                    data: passRates,
                    backgroundColor: 'rgba(16, 185, 129, 0.7)',
                    borderColor: '#10b981',
                    borderWidth: 1,
                    borderRadius: 4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { padding: 10, usePointStyle: true }
                },
                tooltip: {
                    callbacks: {
                        afterBody: function(context) {
                            const index = context[0].dataIndex;
                            return `Students: ${studentCounts[index] || 0}`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    ticks: { callback: function(value) { return value + '%'; } }
                }
            }
        }
    });
};

// ============================================================
// RENDER PROGRAM COMPARISON CHART
// ============================================================

window.renderProgramComparisonChart = function(marks, students) {
    const canvas = document.getElementById('analyticsProgramChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    if (window.analyticsChartInstances.programChart) {
        window.analyticsChartInstances.programChart.destroy();
        window.analyticsChartInstances.programChart = null;
    }
    
    // Group by program
    const programData = {};
    
    students?.forEach(s => {
        const program = s.program || 'Unknown';
        if (!programData[program]) {
            programData[program] = { total: 0, count: 0, pass: 0, students: 0 };
        }
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
    
    // Get top 8 programs by student count
    const sortedPrograms = Object.keys(programData)
        .sort((a, b) => programData[b].students - programData[a].students)
        .slice(0, 8);
    
    const labels = sortedPrograms.map(p => window.getProgramDisplayName(p) || p);
    const avgScores = sortedPrograms.map(p => {
        const data = programData[p];
        return data.count > 0 ? Math.round(data.total / data.count) : 0;
    });
    const passRates = sortedPrograms.map(p => {
        const data = programData[p];
        return data.count > 0 ? Math.round((data.pass / data.count) * 100) : 0;
    });
    
    window.analyticsChartInstances.programChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Avg Score (%)',
                    data: avgScores,
                    backgroundColor: 'rgba(139, 92, 246, 0.7)',
                    borderColor: '#8b5cf6',
                    borderWidth: 1,
                    borderRadius: 4
                },
                {
                    label: 'Pass Rate (%)',
                    data: passRates,
                    backgroundColor: 'rgba(16, 185, 129, 0.7)',
                    borderColor: '#10b981',
                    borderWidth: 1,
                    borderRadius: 4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { padding: 10, usePointStyle: true }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    ticks: { callback: function(value) { return value + '%'; } }
                }
            }
        }
    });
};

// ============================================================
// RENDER ANALYTICS SUBJECT TABLE
// ============================================================

window.renderAnalyticsSubjectTable = function(marks) {
    const tbody = document.getElementById('analytics_subject_table_body');
    if (!tbody) return;
    
    // Group by subject
    const subjectData = {};
    marks?.forEach(m => {
        const subject = m.subject_name || 'Unknown';
        const score = m.final_score || 0;
        if (!subjectData[subject]) {
            subjectData[subject] = { total: 0, count: 0, pass: 0 };
        }
        if (score > 0) {
            subjectData[subject].total += score;
            subjectData[subject].count++;
            if (score >= 60) subjectData[subject].pass++;
        }
    });
    
    const sorted = Object.keys(subjectData).sort((a, b) => {
        const aCount = subjectData[a].count;
        const bCount = subjectData[b].count;
        return bCount - aCount;
    });
    
    if (sorted.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="padding: 40px; text-align: center; color: #94a3b8;">No subject data available</td></tr>';
        return;
    }
    
    let html = '';
    sorted.forEach(subject => {
        const data = subjectData[subject];
        const avg = data.count > 0 ? Math.round((data.total / data.count) * 10) / 10 : 0;
        const passRate = data.count > 0 ? Math.round((data.pass / data.count) * 100) : 0;
        const grade = avg >= 80 ? 'A' : avg >= 65 ? 'B' : avg >= 60 ? 'C' : avg >= 40 ? 'D' : 'F';
        const status = avg >= 60 ? '✅ Passing' : (avg > 0 ? '⚠️ At Risk' : '⏳ No Data');
        const statusColor = avg >= 60 ? '#10b981' : (avg > 0 ? '#f59e0b' : '#94a3b8');
        
        html += `
            <tr style="border-bottom: 1px solid #e5e7eb;">
                <td style="padding: 10px 12px; font-weight: 500;">${window.escapeHtml(subject)}</td>
                <td style="padding: 10px 12px; text-align: center;">${data.count}</td>
                <td style="padding: 10px 12px; text-align: center; font-weight: 600;">${avg}%</td>
                <td style="padding: 10px 12px; text-align: center; font-weight: 600;">${passRate}%</td>
                <td style="padding: 10px 12px; text-align: center; font-weight: 700; color: ${statusColor};">${grade}</td>
                <td style="padding: 10px 12px; text-align: center; color: ${statusColor};">${status}</td>
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
        tbody.innerHTML = '<tr><td colspan="7" style="padding: 40px; text-align: center; color: #94a3b8;">No student data available</td></tr>';
        return;
    }
    
    // Calculate average per student
    const studentMarks = {};
    marks?.forEach(m => {
        const admission = m.admission_number;
        if (!studentMarks[admission]) {
            studentMarks[admission] = { total: 0, count: 0 };
        }
        const score = m.final_score || 0;
        if (score > 0) {
            studentMarks[admission].total += score;
            studentMarks[admission].count++;
        }
    });
    
    let html = '';
    students.forEach(student => {
        const marksData = studentMarks[student.student_id] || { total: 0, count: 0 };
        const avg = marksData.count > 0 ? Math.round((marksData.total / marksData.count) * 10) / 10 : 0;
        const grade = avg >= 80 ? 'A' : avg >= 65 ? 'B' : avg >= 60 ? 'C' : avg >= 40 ? 'D' : 'F';
        const status = avg >= 60 ? '✅ Passing' : (avg > 0 ? '⚠️ At Risk' : '⏳ No Data');
        const statusColor = avg >= 60 ? '#10b981' : (avg > 0 ? '#f59e0b' : '#94a3b8');
        
        html += `
            <tr style="border-bottom: 1px solid #e5e7eb;">
                <td style="padding: 10px 12px; font-weight: 500;">${window.escapeHtml(student.full_name || 'Unknown')}</td>
                <td style="padding: 10px 12px; text-align: center;">${window.escapeHtml(student.student_id || 'N/A')}</td>
                <td style="padding: 10px 12px; text-align: center;">${window.escapeHtml(student.program || 'N/A')}</td>
                <td style="padding: 10px 12px; text-align: center;">${window.escapeHtml(student.block || 'N/A')}</td>
                <td style="padding: 10px 12px; text-align: center; font-weight: 600;">${avg}%</td>
                <td style="padding: 10px 12px; text-align: center; font-weight: 700; color: ${statusColor};">${grade}</td>
                <td style="padding: 10px 12px; text-align: center; color: ${statusColor};">${status}</td>
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
    
    // Group by block
    const blockData = {};
    const blockOrder = ['Introductory', 'Block 1', 'Block 2', 'Block 3', 'Block 4', 'Block 5', 'Final'];
    
    blockOrder.forEach(b => {
        blockData[b] = { total: 0, count: 0, pass: 0, students: 0, topStudent: null, topScore: 0, atRisk: 0 };
    });
    
    // Count students per block
    students?.forEach(s => {
        const block = s.block || 'Unknown';
        if (!blockData[block]) {
            blockData[block] = { total: 0, count: 0, pass: 0, students: 0, topStudent: null, topScore: 0, atRisk: 0 };
        }
        blockData[block].students++;
    });
    
    // Add marks
    marks?.forEach(m => {
        const block = m.block || 'Unknown';
        const score = m.final_score || 0;
        if (blockData[block] && score > 0) {
            blockData[block].total += score;
            blockData[block].count++;
            if (score >= 60) blockData[block].pass++;
            else blockData[block].atRisk++;
            
            // Track top performer
            if (score > blockData[block].topScore) {
                blockData[block].topScore = score;
                blockData[block].topStudent = m.student_name || 'Unknown';
            }
        }
    });
    
    const sortedBlocks = Object.keys(blockData).filter(b => blockData[b].students > 0);
    
    if (sortedBlocks.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="padding: 40px; text-align: center; color: #94a3b8;">No block data available</td></tr>';
        return;
    }
    
    let html = '';
    sortedBlocks.forEach(block => {
        const data = blockData[block];
        const avg = data.count > 0 ? Math.round((data.total / data.count) * 10) / 10 : 0;
        const passRate = data.count > 0 ? Math.round((data.pass / data.count) * 100) : 0;
        const topStudent = data.topStudent || 'N/A';
        const atRisk = data.atRisk || 0;
        
        html += `
            <tr style="border-bottom: 1px solid #e5e7eb;">
                <td style="padding: 10px 12px; font-weight: 600;">${window.escapeHtml(block)}</td>
                <td style="padding: 10px 12px; text-align: center;">${data.students}</td>
                <td style="padding: 10px 12px; text-align: center; font-weight: 600;">${avg}%</td>
                <td style="padding: 10px 12px; text-align: center; font-weight: 600;">${passRate}%</td>
                <td style="padding: 10px 12px; text-align: center;">${window.escapeHtml(topStudent)}</td>
                <td style="padding: 10px 12px; text-align: center; color: ${atRisk > 0 ? '#dc2626' : '#10b981'};">${atRisk}</td>
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
    
    // Group by program
    const programData = {};
    
    students?.forEach(s => {
        const program = s.program || 'Unknown';
        if (!programData[program]) {
            programData[program] = { total: 0, count: 0, pass: 0, students: 0 };
        }
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
    
    const sortedPrograms = Object.keys(programData).sort((a, b) => programData[b].students - programData[a].students);
    
    if (sortedPrograms.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="padding: 40px; text-align: center; color: #94a3b8;">No program data available</td></tr>';
        return;
    }
    
    let html = '';
    sortedPrograms.forEach(program => {
        const data = programData[program];
        const avg = data.count > 0 ? Math.round((data.total / data.count) * 10) / 10 : 0;
        const passRate = data.count > 0 ? Math.round((data.pass / data.count) * 100) : 0;
        const programType = program === 'KRCHN' ? 'KRCHN' : 'TVET';
        const level = program.startsWith('D') ? 'Diploma' : 
                     program.startsWith('C') ? 'Certificate' : 
                     program.startsWith('A') ? 'Artisan' : 'Other';
        const performanceColor = avg >= 60 ? '#10b981' : (avg > 0 ? '#f59e0b' : '#94a3b8');
        
        html += `
            <tr style="border-bottom: 1px solid #e5e7eb;">
                <td style="padding: 10px 12px; font-weight: 500;">${window.escapeHtml(window.getProgramDisplayName(program))}</td>
                <td style="padding: 10px 12px; text-align: center;"><span style="background: ${programType === 'KRCHN' ? '#dbeafe' : '#fef3c7'}; padding: 2px 10px; border-radius: 12px; font-size: 11px;">${programType}</span></td>
                <td style="padding: 10px 12px; text-align: center;">${level}</td>
                <td style="padding: 10px 12px; text-align: center;">${data.students}</td>
                <td style="padding: 10px 12px; text-align: center; font-weight: 600; color: ${performanceColor};">${avg}%</td>
                <td style="padding: 10px 12px; text-align: center; font-weight: 600; color: ${performanceColor};">${passRate}%</td>
                <td style="padding: 10px 12px; text-align: center;">
                    <div style="height: 6px; background: #e5e7eb; border-radius: 4px; overflow: hidden; max-width: 100px; margin: 0 auto;">
                        <div style="width: ${passRate}%; height: 100%; background: ${performanceColor}; border-radius: 4px;"></div>
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
    
    // Group by year
    const yearData = {};
    
    students?.forEach(s => {
        const year = s.intake_year || 'Unknown';
        if (!yearData[year]) {
            yearData[year] = { total: 0, count: 0, pass: 0, students: 0 };
        }
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
        tbody.innerHTML = '<tr><td colspan="6" style="padding: 40px; text-align: center; color: #94a3b8;">No trend data available</td></tr>';
        return;
    }
    
    let previousAvg = null;
    let html = '';
    
    sortedYears.forEach(year => {
        const data = yearData[year];
        const avg = data.count > 0 ? Math.round((data.total / data.count) * 10) / 10 : 0;
        const passRate = data.count > 0 ? Math.round((data.pass / data.count) * 100) : 0;
        
        let change = 'N/A';
        let trend = '➡️';
        let trendColor = '#94a3b8';
        
        if (previousAvg !== null && previousAvg > 0) {
            const diff = avg - previousAvg;
            change = (diff > 0 ? '+' : '') + diff.toFixed(1) + '%';
            if (diff > 0) {
                trend = '📈';
                trendColor = '#10b981';
            } else if (diff < 0) {
                trend = '📉';
                trendColor = '#dc2626';
            } else {
                trend = '➡️';
                trendColor = '#f59e0b';
            }
        }
        
        previousAvg = avg;
        
        html += `
            <tr style="border-bottom: 1px solid #e5e7eb;">
                <td style="padding: 10px 12px; font-weight: 600;">${window.escapeHtml(year)}</td>
                <td style="padding: 10px 12px; text-align: center;">${data.students}</td>
                <td style="padding: 10px 12px; text-align: center; font-weight: 600;">${avg}%</td>
                <td style="padding: 10px 12px; text-align: center; font-weight: 600;">${passRate}%</td>
                <td style="padding: 10px 12px; text-align: center; color: ${trendColor}; font-weight: 600;">${change}</td>
                <td style="padding: 10px 12px; text-align: center; font-size: 20px; color: ${trendColor};">${trend}</td>
            </tr>
        `;
    });
    
    tbody.innerHTML = html;
};

// ============================================================
// RENDER ANALYTICS EXAM DETAILS
// ============================================================

window.renderAnalyticsExamDetails = function(marks, students, program, block, year) {
    const tbody = document.getElementById('analytics_exam_details_body');
    if (!tbody) return;
    
    if (!marks || marks.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="padding: 40px; text-align: center; color: #94a3b8;">No exam data available</td></tr>';
        return;
    }
    
    let html = '';
    marks.forEach((m, index) => {
        const total = m.final_score || 0;
        const status = total >= 60 ? '✅ Pass' : (total > 0 ? '❌ Fail' : '⏳ Pending');
        const statusColor = total >= 60 ? '#10b981' : (total > 0 ? '#dc2626' : '#f59e0b');
        
        html += `
            <tr style="border-bottom: 1px solid #e5e7eb;">
                <td style="padding: 10px 12px;">${window.escapeHtml(m.subject_name || 'N/A')}</td>
                <td style="padding: 10px 12px;">${window.escapeHtml(m.student_name || 'Unknown')}</td>
                <td style="padding: 10px 12px; text-align: center;">${window.escapeHtml(m.block || 'N/A')}</td>
                <td style="padding: 10px 12px; text-align: center;">${window.escapeHtml(m.admission_number || 'N/A')}</td>
                <td style="padding: 10px 12px; text-align: center;">${m.cat1_score || '-'}</td>
                <td style="padding: 10px 12px; text-align: center;">${m.cat2_score || '-'}</td>
                <td style="padding: 10px 12px; text-align: center;">${m.exam_score || '-'}</td>
                <td style="padding: 10px 12px; text-align: center; font-weight: 700; color: ${statusColor};">${total || '-'}</td>
                <td style="padding: 10px 12px; text-align: center; font-weight: 700; color: ${statusColor};">${m.grade || '-'}</td>
                <td style="padding: 10px 12px; text-align: center; color: ${statusColor};">${status}</td>
            </tr>
        `;
    });
    
    tbody.innerHTML = html;
};

// ============================================================
// REFRESH ANALYTICS DATA
// ============================================================

window.refreshAnalytics = function() {
    console.log('🔄 Refreshing analytics...');
    window.loadAnalyticsData();
    if (typeof window.showNotification === 'function') {
        window.showNotification('🔄 Analytics refreshed!', 'success');
    }
};

// ============================================================
// EXPORT ANALYTICS REPORT
// ============================================================

window.exportAnalyticsReport = function() {
    console.log('📤 Exporting analytics report...');
    
    // Get stats
    const totalStudents = document.getElementById('analytics_total_students')?.textContent || '0';
    const passRate = document.getElementById('analytics_pass_rate')?.textContent || '0%';
    const avgScore = document.getElementById('analytics_avg_score')?.textContent || '0%';
    const atRisk = document.getElementById('analytics_at_risk')?.textContent || '0';
    
    // Build report
    const report = `
========================================
📊 NCHSM ANALYTICS REPORT
========================================
Date: ${new Date().toLocaleString()}
----------------------------------------
📈 Summary Statistics:
----------------------------------------
Total Students: ${totalStudents}
Pass Rate: ${passRate}
Average Score: ${avgScore}
At Risk Students: ${atRisk}
----------------------------------------
Program: ${document.getElementById('analytics_program_label')?.textContent || 'All'}
Year: ${document.getElementById('analytics_year_select')?.value || '2025'}
Block: ${document.getElementById('analytics_block_select')?.value || 'All'}
========================================
    `;
    
    // Download as text file
    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics_report_${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    
    if (typeof window.showNotification === 'function') {
        window.showNotification('📊 Report exported successfully!', 'success');
    }
};

// ============================================================
// FILTER ANALYTICS BY PROGRAM
// ============================================================

window.filterAnalytics = function(program) {
    console.log('🔍 Filtering analytics by:', program);
    const select = document.getElementById('analytics_program_select');
    if (select) {
        select.value = program;
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
// ESCAPE HTML HELPER
// ============================================================

window.escapeHtml = function(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
};

// ============================================================
// EXPOSE FUNCTIONS TO GLOBAL SCOPE
// ============================================================

window.loadAnalyticsData = window.loadAnalyticsData;
window.refreshAnalytics = window.refreshAnalytics;
window.exportAnalyticsReport = window.exportAnalyticsReport;
window.filterAnalytics = window.filterAnalytics;
window.updateAnalyticsMetric = window.updateAnalyticsMetric;
window.getProgramDisplayName = window.getProgramDisplayName;
window.escapeHtml = window.escapeHtml;

console.log('✅ Super Admin Analytics Module Loaded Successfully!');
console.log('📊 Available functions:');
console.log('   - loadAnalyticsData()');
console.log('   - refreshAnalytics()');
console.log('   - exportAnalyticsReport()');
console.log('   - filterAnalytics(program)');
console.log('   - updateAnalyticsMetric()');
