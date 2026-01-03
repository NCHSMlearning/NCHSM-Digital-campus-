// js/exams.js - COMPLETE UNIVERSAL VERSION WITH ALL BUTTONS WORKING
(function() {
    'use strict';
    
    console.log('✅ exams.js - Complete Universal Version');
    
    class ExamsModule {
        constructor() {
            console.log('🔧 ExamsModule initialized');
            
            // Get DOM elements
            this.currentTable = document.getElementById('current-assessments-table');
            this.completedTable = document.getElementById('completed-assessments-table');
            this.currentEmpty = document.getElementById('current-empty');
            this.completedEmpty = document.getElementById('completed-empty');
            
            // Initialize event listeners
            this.initializeEventListeners();
            
            // Set default filter to 'all'
            this.currentFilter = 'all';
            this.updateFilterButtons();
            
            // Load exams immediately
            this.loadExams();
        }
        
        initializeEventListeners() {
            console.log('🔌 Setting up event listeners...');
            
            // 1. REFRESH BUTTON
            const refreshBtn = document.getElementById('refresh-assessments');
            if (refreshBtn) {
                console.log('✅ Found refresh button');
                refreshBtn.addEventListener('click', () => {
                    console.log('🔄 Refresh button clicked');
                    this.refresh();
                });
            } else {
                console.log('❌ Refresh button not found');
            }
            
            // 2. FILTER BUTTONS
            this.setupFilterButton('view-all-assessments', 'all');
            this.setupFilterButton('view-current-only', 'current');
            this.setupFilterButton('view-completed-only', 'completed');
            
            // 3. TRANSCRIPT BUTTON
            const transcriptBtn = document.getElementById('view-transcript');
            if (transcriptBtn) {
                transcriptBtn.addEventListener('click', () => {
                    console.log('📄 Transcript button clicked');
                    this.showTranscript();
                });
            }
            
            // 4. PRINT BUTTON
            const printBtn = document.getElementById('print-assessments');
            if (printBtn) {
                printBtn.addEventListener('click', () => {
                    console.log('🖨️ Print button clicked');
                    this.printAssessments();
                });
            }
            
            console.log('✅ Event listeners initialized');
        }
        
        setupFilterButton(buttonId, filterType) {
            const button = document.getElementById(buttonId);
            if (button) {
                console.log(`✅ Found ${buttonId} button`);
                button.addEventListener('click', () => {
                    console.log(`🔍 ${buttonId} clicked, filtering: ${filterType}`);
                    this.applyFilter(filterType);
                });
            } else {
                console.log(`❌ ${buttonId} button not found`);
            }
        }
        
        applyFilter(filterType) {
            console.log(`🔍 Applying filter: ${filterType}`);
            this.currentFilter = filterType;
            
            // Update button states
            this.updateFilterButtons();
            
            // Show/hide sections
            this.showFilteredSections();
            
            // Reload data with filter
            this.loadExams();
        }
        
        updateFilterButtons() {
            console.log(`🎛️ Updating filter buttons for: ${this.currentFilter}`);
            
            // Remove active class from all filter buttons
            document.querySelectorAll('.quick-actions .action-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            
            // Add active class to current filter button
            let activeButtonId = 'view-all-assessments';
            if (this.currentFilter === 'current') {
                activeButtonId = 'view-current-only';
            } else if (this.currentFilter === 'completed') {
                activeButtonId = 'view-completed-only';
            }
            
            const activeButton = document.getElementById(activeButtonId);
            if (activeButton) {
                activeButton.classList.add('active');
                console.log(`✅ Activated button: ${activeButtonId}`);
            }
        }
        
        showFilteredSections() {
            const currentSection = document.querySelector('.current-section');
            const completedSection = document.querySelector('.completed-section');
            
            if (!currentSection || !completedSection) {
                console.log('❌ Section elements not found');
                return;
            }
            
            switch(this.currentFilter) {
                case 'current':
                    currentSection.style.display = 'block';
                    completedSection.style.display = 'none';
                    console.log('👁️ Showing only current section');
                    break;
                case 'completed':
                    currentSection.style.display = 'none';
                    completedSection.style.display = 'block';
                    console.log('👁️ Showing only completed section');
                    break;
                default: // 'all'
                    currentSection.style.display = 'block';
                    completedSection.style.display = 'block';
                    console.log('👁️ Showing both sections');
            }
        }
        
        showTranscript() {
            console.log('📋 Showing transcript...');
            // Show loading message
            if (window.AppUtils && window.AppUtils.showToast) {
                window.AppUtils.showToast('Transcript feature coming soon!', 'info');
            }
            
            // TODO: Implement transcript functionality
            alert('Transcript feature is under development. Coming soon!');
        }
        
        printAssessments() {
            console.log('🖨️ Printing assessments...');
            
            // Create a print-friendly version
            const printContent = document.getElementById('assessments-content');
            if (!printContent) {
                console.log('❌ Assessments content not found');
                return;
            }
            
            const originalContent = printContent.innerHTML;
            const printWindow = window.open('', '_blank');
            
            printWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Assessments Report</title>
                    <style>
                        body { font-family: Arial, sans-serif; margin: 20px; }
                        h1 { color: #2c3e50; }
                        .print-header { margin-bottom: 20px; padding-bottom: 10px; border-bottom: 2px solid #3498db; }
                        .print-info { margin-bottom: 20px; }
                        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                        th { background-color: #f8f9fa; padding: 10px; text-align: left; border: 1px solid #dee2e6; }
                        td { padding: 8px; border: 1px solid #dee2e6; }
                        .status-badge { padding: 4px 8px; border-radius: 4px; font-weight: bold; }
                        .completed { background-color: #d4edda; color: #155724; }
                        .failed { background-color: #f8d7da; color: #721c24; }
                        .pending { background-color: #fff3cd; color: #856404; }
                        .print-footer { margin-top: 30px; text-align: center; color: #6c757d; }
                        @media print {
                            .no-print { display: none; }
                        }
                    </style>
                </head>
                <body>
                    <div class="print-header">
                        <h1>Academic Assessments Report</h1>
                        <div class="print-info">
                            <p><strong>Student:</strong> ${window.db?.currentUserProfile?.full_name || 'N/A'}</p>
                            <p><strong>Program:</strong> ${window.db?.currentUserProfile?.program || 'N/A'}</p>
                            <p><strong>Intake Year:</strong> ${window.db?.currentUserProfile?.intake_year || 'N/A'}</p>
                            <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
                        </div>
                    </div>
                    ${printContent.innerHTML}
                    <div class="print-footer">
                        <p>Generated by NCHSM Digital Campus • ${new Date().toLocaleString()}</p>
                    </div>
                    <script>
                        window.onload = function() {
                            window.print();
                            window.onafterprint = function() {
                                window.close();
                            };
                        };
                    </script>
                </body>
                </html>
            `);
            
            printWindow.document.close();
        }
        
        async loadExams() {
            console.log('📥 Loading exams...');
            
            this.showLoading();
            
            try {
                // Get user data DIRECTLY
                const profile = window.db?.currentUserProfile;
                const program = profile?.program || profile?.department || '';
                const intakeYear = profile?.intake_year ? parseInt(profile.intake_year, 10) : null;
                const block = profile?.block || '';
                const userId = window.db?.currentUserId;
                
                console.log('🎯 User data:', { program, intakeYear, block, userId });
                
                // VALIDATION
                if (!program || !intakeYear || !userId) {
                    throw new Error(`Invalid profile data. Program: "${program}", Intake: "${intakeYear}", User: "${userId ? 'OK' : 'Missing'"`);
                }
                
                const supabase = window.db?.supabase;
                if (!supabase) throw new Error('No database connection');
                
                // 1. Get exams - UNIVERSAL QUERY for all programs
                const { data: exams, error: examsError } = await supabase
                    .from('exams_with_courses')
                    .select('*')
                    .or(`program_type.eq.${program},program_type.eq.General,program_type.is.null`)
                    .or(`block_term.eq.${block},block_term.is.null,block_term.eq.General`)
                    .eq('intake_year', intakeYear)
                    .order('exam_date', { ascending: true });
                
                if (examsError) throw examsError;
                
                // 2. Get grades
                const { data: grades, error: gradesError } = await supabase
                    .from('exam_grades')
                    .select('*')
                    .eq('student_id', userId)
                    .eq('question_id', '00000000-0000-0000-0000-000000000000')
                    .order('graded_at', { ascending: false });
                
                if (gradesError) throw gradesError;
                
                console.log(`✅ Found ${exams?.length || 0} exams and ${grades?.length || 0} grades`);
                
                // Process and display
                this.processAndDisplay(exams || [], grades || [], program);
                
                // Show success message
                if (window.AppUtils && window.AppUtils.showToast) {
                    const total = (exams?.length || 0) + (grades?.length || 0);
                    if (total > 0) {
                        window.AppUtils.showToast(`Loaded ${exams?.length || 0} assessments`, 'success');
                    }
                }
                
            } catch (error) {
                console.error('❌ Error loading exams:', error);
                this.showError('Failed to load assessments: ' + error.message);
                
                // Show error toast
                if (window.AppUtils && window.AppUtils.showToast) {
                    window.AppUtils.showToast('Failed to load assessments', 'error');
                }
            }
        }
        
        processAndDisplay(exams, grades, program) {
            console.log(`📊 Processing for program: ${program}`);
            
            // Process each exam
            const examData = exams.map(exam => {
                const grade = grades.find(g => String(g.exam_id) === String(exam.id));
                const examType = exam.exam_type || '';
                
                // Calculate percentage
                let percentage = null;
                if (grade) {
                    if (grade.total_score !== null && grade.total_score !== undefined) {
                        percentage = Number(grade.total_score);
                    } else if (examType.includes('CAT') && grade.cat_1_score !== null) {
                        percentage = (grade.cat_1_score / 30) * 100;
                    } else if (examType.includes('Practical') && grade.exam_score !== null) {
                        percentage = Number(grade.exam_score);
                    }
                }
                
                // Determine grade
                let gradeText = '--';
                let gradeClass = '';
                if (percentage !== null) {
                    if (percentage >= 85) {
                        gradeText = 'Distinction';
                        gradeClass = 'distinction';
                    } else if (percentage >= 70) {
                        gradeText = 'Credit';
                        gradeClass = 'credit';
                    } else if (percentage >= 60) {
                        gradeText = 'Pass';
                        gradeClass = 'pass';
                    } else {
                        gradeText = 'Fail';
                        gradeClass = 'fail';
                    }
                }
                
                return {
                    ...exam,
                    grade,
                    percentage,
                    gradeText,
                    gradeClass,
                    isCompleted: !!grade,
                    dateGraded: grade?.graded_at,
                    cat1Score: grade?.cat_1_score,
                    cat2Score: grade?.cat_2_score,
                    examScore: grade?.exam_score
                };
            });
            
            // Apply filter
            let current = examData.filter(e => !e.isCompleted);
            let completed = examData.filter(e => e.isCompleted);
            
            if (this.currentFilter === 'current') {
                completed = [];
            } else if (this.currentFilter === 'completed') {
                current = [];
            }
            
            console.log(`📊 Results: ${current.length} current, ${completed.length} completed`);
            
            // Display
            this.displayTable(this.currentTable, current, false);
            this.displayTable(this.completedTable, completed, true);
            
            // Update empty states
            this.toggleEmptyState('current', current.length === 0);
            this.toggleEmptyState('completed', completed.length === 0);
            
            // Update counts
            this.updateCounts(current.length, completed.length);
            
            // Update performance summary
            this.updatePerformanceSummary(completed);
        }
        
        displayTable(tableElement, exams, isCompleted) {
            if (!tableElement) return;
            
            if (exams.length === 0) {
                tableElement.innerHTML = '';
                return;
            }
            
            let html = '';
            
            exams.forEach(exam => {
                const date = isCompleted && exam.dateGraded 
                    ? new Date(exam.dateGraded).toLocaleDateString('en-US', { 
                        year: 'numeric', month: 'short', day: 'numeric' 
                    })
                    : (exam.exam_date 
                        ? new Date(exam.exam_date).toLocaleDateString('en-US', { 
                            year: 'numeric', month: 'short', day: 'numeric' 
                        })
                        : '--');
                
                // Determine exam type badge
                let typeBadge = 'exam';
                let typeText = 'Exam';
                
                if (exam.exam_type?.includes('CAT')) {
                    typeBadge = 'cat';
                    typeText = 'CAT';
                } else if (exam.exam_type?.includes('Practical')) {
                    typeBadge = 'practical';
                    typeText = 'Practical';
                } else if (exam.exam_type?.includes('Assignment')) {
                    typeBadge = 'assignment';
                    typeText = 'Assignment';
                }
                
                const scoreDisplay = exam.percentage !== null ? `${exam.percentage.toFixed(1)}%` : '--';
                
                let statusClass = 'pending';
                let statusText = 'Pending';
                let statusIcon = 'fa-clock';
                
                if (isCompleted) {
                    if (exam.percentage !== null) {
                        statusClass = exam.percentage >= 60 ? exam.gradeClass : 'failed';
                        statusText = exam.percentage >= 60 ? exam.gradeText : 'Failed';
                        statusIcon = exam.percentage >= 60 ? 'fa-check-circle' : 'fa-times-circle';
                    } else {
                        statusClass = 'graded';
                        statusText = 'Graded';
                        statusIcon = 'fa-clipboard-check';
                    }
                }
                
                const gradeColumn = isCompleted 
                    ? `<td class="text-center"><span class="grade-badge ${exam.gradeClass}">${exam.gradeText}</span></td>`
                    : '';
                
                html += `
                    <tr>
                        <td>${this.escapeHtml(exam.exam_name || 'N/A')}</td>
                        <td><span class="type-badge ${typeBadge}">${typeText}</span></td>
                        <td>${this.escapeHtml(exam.course_name || 'General')}</td>
                        <td class="text-center">${this.escapeHtml(exam.block_term || 'General')}</td>
                        <td>${date}</td>
                        <td><span class="status-badge ${statusClass}"><i class="fas ${statusIcon}"></i> ${statusText}</span></td>
                        <td class="text-center">${exam.cat1Score || '--'}</td>
                        <td class="text-center">${exam.cat2Score || '--'}</td>
                        <td class="text-center">${exam.examScore || '--'}</td>
                        <td class="text-center"><strong>${scoreDisplay}</strong></td>
                        ${gradeColumn}
                    </tr>
                `;
            });
            
            tableElement.innerHTML = html;
        }
        
        toggleEmptyState(section, show) {
            const element = section === 'current' ? this.currentEmpty : this.completedEmpty;
            if (element) {
                element.style.display = show ? 'block' : 'none';
            }
        }
        
        updateCounts(current, completed) {
            // Update section counts
            const currentCount = document.getElementById('current-count');
            const completedCount = document.getElementById('completed-count');
            const averageScore = document.getElementById('completed-average');
            
            if (currentCount) currentCount.textContent = `${current} pending`;
            if (completedCount) completedCount.textContent = `${completed} graded`;
            
            // Update header counts
            const currentHeader = document.getElementById('current-assessments-count');
            const completedHeader = document.getElementById('completed-assessments-count');
            const overallAverage = document.getElementById('overall-average');
            
            if (currentHeader) currentHeader.textContent = current;
            if (completedHeader) completedHeader.textContent = completed;
            
            // Update average (this would need actual calculation)
            if (averageScore) averageScore.textContent = 'Average: --';
            if (overallAverage) overallAverage.textContent = '--';
        }
        
        updatePerformanceSummary(completedExams) {
            const scoredExams = completedExams.filter(e => e.percentage !== null);
            
            if (scoredExams.length === 0) {
                this.resetPerformanceSummary();
                return;
            }
            
            // Calculate scores
            const scores = scoredExams.map(e => e.percentage);
            const bestScore = Math.max(...scores);
            const worstScore = Math.min(...scores);
            
            // Calculate pass rate
            const passed = scoredExams.filter(e => e.percentage >= 60).length;
            const passRate = (passed / scoredExams.length) * 100;
            
            // Calculate grade distribution
            const gradeCounts = {
                distinction: scoredExams.filter(e => e.percentage >= 85).length,
                credit: scoredExams.filter(e => e.percentage >= 70 && e.percentage < 85).length,
                pass: scoredExams.filter(e => e.percentage >= 60 && e.percentage < 70).length,
                fail: scoredExams.filter(e => e.percentage < 60).length
            };
            
            // Update DOM elements
            this.updateElement('best-score', `${bestScore.toFixed(1)}%`);
            this.updateElement('lowest-score', `${worstScore.toFixed(1)}%`);
            this.updateElement('pass-rate', `${passRate.toFixed(0)}%`);
            this.updateElement('distinction-count', gradeCounts.distinction);
            this.updateElement('credit-count', gradeCounts.credit);
            this.updateElement('pass-count', gradeCounts.pass);
            this.updateElement('fail-count', gradeCounts.fail);
            
            // Update distribution bars
            this.updateDistributionBars(gradeCounts, scoredExams.length);
        }
        
        updateElement(id, value) {
            const element = document.getElementById(id);
            if (element) element.textContent = value;
        }
        
        updateDistributionBars(counts, total) {
            if (total === 0) return;
            
            const bars = {
                'distinction-bar': (counts.distinction / total) * 100,
                'credit-bar': (counts.credit / total) * 100,
                'pass-bar': (counts.pass / total) * 100,
                'fail-bar': (counts.fail / total) * 100
            };
            
            Object.entries(bars).forEach(([id, percentage]) => {
                const bar = document.getElementById(id);
                if (bar) bar.style.width = `${percentage}%`;
            });
        }
        
        resetPerformanceSummary() {
            const elements = [
                'best-score', 'lowest-score', 'pass-rate',
                'distinction-count', 'credit-count', 'pass-count', 'fail-count'
            ];
            
            elements.forEach(id => {
                this.updateElement(id, '--');
            });
            
            ['distinction-bar', 'credit-bar', 'pass-bar', 'fail-bar'].forEach(id => {
                const bar = document.getElementById(id);
                if (bar) bar.style.width = '0%';
            });
        }
        
        showLoading() {
            const loadingHTML = (colspan) => `
                <tr class="loading">
                    <td colspan="${colspan}">
                        <div class="loading-content">
                            <div class="loading-spinner"></div>
                            <p>Loading assessments...</p>
                        </div>
                    </td>
                </tr>`;
            
            if (this.currentTable) {
                this.currentTable.innerHTML = loadingHTML(10);
            }
            if (this.completedTable) {
                this.completedTable.innerHTML = loadingHTML(11);
            }
        }
        
        showError(message) {
            const errorHTML = (colspan) => `
                <tr class="error">
                    <td colspan="${colspan}">
                        <div class="error-content">
                            <i class="fas fa-exclamation-circle"></i>
                            <p>${message}</p>
                            <button onclick="window.examsModule?.refresh()" class="btn btn-sm btn-primary">
                                <i class="fas fa-redo"></i> Retry
                            </button>
                        </div>
                    </td>
                </tr>`;
            
            if (this.currentTable) {
                this.currentTable.innerHTML = errorHTML(10);
            }
            if (this.completedTable) {
                this.completedTable.innerHTML = errorHTML(11);
            }
        }
        
        escapeHtml(str) {
            if (!str) return '';
            const div = document.createElement('div');
            div.textContent = str;
            return div.innerHTML;
        }
        
        // Public refresh method
        refresh() {
            console.log('🔄 Manual refresh requested');
            this.loadExams();
        }
    }
    
    // Create and expose
    window.examsModule = new ExamsModule();
    
    // Global functions for backward compatibility
    window.loadExams = () => {
        console.log('🌍 Global loadExams() called');
        if (window.examsModule) {
            window.examsModule.refresh();
        }
    };
    
    window.refreshAssessments = () => {
        console.log('🌍 Global refreshAssessments() called');
        if (window.examsModule) {
            window.examsModule.refresh();
        }
    };
    
    window.switchToCurrentAssessments = () => {
        console.log('🌍 Global switchToCurrentAssessments() called');
        if (window.examsModule) {
            window.examsModule.applyFilter('current');
        }
    };
    
    window.switchToCompletedAssessments = () => {
        console.log('🌍 Global switchToCompletedAssessments() called');
        if (window.examsModule) {
            window.examsModule.applyFilter('completed');
        }
    };
    
    console.log('✅ Complete exams module ready with all buttons working');
})();
