// js/exams.js - FINAL WORKING VERSION (Matches HTML exactly)
(function() {
    'use strict';
    
    console.log('✅ exams.js - Final Working Version');
    
    class ExamsModule {
        constructor() {
            console.log('🔧 ExamsModule initialized');
            
            // Store exam data
            this.allExams = [];
            this.currentExams = [];
            this.completedExams = [];
            this.currentFilter = 'all';
            
            // Cache DOM elements
            this.cacheElements();
            
            // Initialize
            this.initializeEventListeners();
            this.updateFilterButtons();
            this.loadExams();
        }
        
        cacheElements() {
            // Tables
            this.currentTable = document.getElementById('current-assessments-table');
            this.completedTable = document.getElementById('completed-assessments-table');
            
            // Empty states
            this.currentEmpty = document.getElementById('current-empty');
            this.completedEmpty = document.getElementById('completed-empty');
            
            // Count elements
            this.currentCount = document.getElementById('current-count');
            this.completedCount = document.getElementById('completed-count');
            this.completedAverage = document.getElementById('completed-average');
            
            // Header stats
            this.currentHeaderCount = document.getElementById('current-assessments-count');
            this.completedHeaderCount = document.getElementById('completed-assessments-count');
            this.overallAverage = document.getElementById('overall-average');
            
            // Performance summary elements
            this.bestScore = document.getElementById('best-score');
            this.lowestScore = document.getElementById('lowest-score');
            this.passRate = document.getElementById('pass-rate');
            this.distinctionCount = document.getElementById('distinction-count');
            this.creditCount = document.getElementById('credit-count');
            this.passCount = document.getElementById('pass-count');
            this.failCount = document.getElementById('fail-count');
            
            // Distribution bars
            this.distinctionBar = document.getElementById('distinction-bar');
            this.creditBar = document.getElementById('credit-bar');
            this.passBar = document.getElementById('pass-bar');
            this.failBar = document.getElementById('fail-bar');
            
            // Timeline elements
            this.firstAssessmentDate = document.getElementById('first-assessment-date');
            this.latestAssessmentDate = document.getElementById('latest-assessment-date');
            this.totalSubmitted = document.getElementById('total-submitted');
            
            console.log('✅ Cached all DOM elements');
        }
        
        initializeEventListeners() {
            console.log('🔌 Setting up event listeners...');
            
            // 1. Filter buttons
            const filterButtons = [
                { id: 'view-all-assessments', filter: 'all' },
                { id: 'view-current-only', filter: 'current' },
                { id: 'view-completed-only', filter: 'completed' }
            ];
            
            filterButtons.forEach(({ id, filter }) => {
                const button = document.getElementById(id);
                if (button) {
                    button.addEventListener('click', (e) => {
                        e.preventDefault();
                        console.log(`🔍 ${id} clicked, filter: ${filter}`);
                        this.applyFilter(filter);
                    });
                }
            });
            
            // 2. Refresh button
            const refreshBtn = document.getElementById('refresh-assessments');
            if (refreshBtn) {
                refreshBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    console.log('🔄 Refresh button clicked');
                    this.loadExams();
                });
            }
            
            // 3. Transcript button
            const transcriptBtn = document.getElementById('view-transcript');
            if (transcriptBtn) {
                transcriptBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    console.log('📋 Transcript button clicked');
                    this.showTranscriptModal();
                });
            }
            
            console.log('✅ All event listeners initialized');
        }
        
        applyFilter(filterType) {
            console.log(`🔍 Applying filter: ${filterType}`);
            this.currentFilter = filterType;
            
            // Update button states
            this.updateFilterButtons();
            
            // Show/hide sections
            this.showFilteredSections();
            
            // Apply filter to data and display
            this.applyDataFilter();
        }
        
        updateFilterButtons() {
            // Get all filter buttons
            const buttons = {
                'all': document.getElementById('view-all-assessments'),
                'current': document.getElementById('view-current-only'),
                'completed': document.getElementById('view-completed-only')
            };
            
            // Remove active class from all
            Object.values(buttons).forEach(button => {
                if (button) button.classList.remove('active');
            });
            
            // Add active class to current filter button
            const currentButton = buttons[this.currentFilter];
            if (currentButton) {
                currentButton.classList.add('active');
            }
        }
        
        showFilteredSections() {
            const currentSection = document.querySelector('.current-section');
            const completedSection = document.querySelector('.completed-section');
            
            if (!currentSection || !completedSection) return;
            
            switch(this.currentFilter) {
                case 'current':
                    currentSection.style.display = 'block';
                    completedSection.style.display = 'none';
                    break;
                case 'completed':
                    currentSection.style.display = 'none';
                    completedSection.style.display = 'block';
                    break;
                default: // 'all'
                    currentSection.style.display = 'block';
                    completedSection.style.display = 'block';
            }
        }
        
        applyDataFilter() {
            // Filter the data based on current filter
            this.currentExams = this.allExams.filter(exam => !exam.isCompleted);
            this.completedExams = this.allExams.filter(exam => exam.isCompleted);
            
            // Apply additional filter if needed
            if (this.currentFilter === 'current') {
                this.completedExams = [];
            } else if (this.currentFilter === 'completed') {
                this.currentExams = [];
            }
            
            // Display the filtered data
            this.displayTables();
        }
        
        async loadExams() {
            console.log('📥 Loading exams...');
            
            // Show loading state
            this.showLoading();
            
            try {
                // Check for required data
                if (!window.db?.currentUserProfile) {
                    throw new Error('User profile not available. Please log in again.');
                }
                
                if (!window.db?.supabase) {
                    throw new Error('Database connection not available.');
                }
                
                const userProfile = window.db.currentUserProfile;
                const program = userProfile.program || 'KRCHN';
                const intakeYear = userProfile.intake_year || 2025;
                const block = userProfile.block || 'A';
                const userId = window.db.currentUserId;
                
                console.log('🎯 Loading exams for:', { program, intakeYear, block });
                
                const supabase = window.db.supabase;
                
                // 1. Fetch exams
                const { data: exams, error: examsError } = await supabase
                    .from('exams_with_courses')
                    .select('*')
                    .eq('intake_year', intakeYear)
                    .or(`program_type.eq.${program},program_type.eq.General`)
                    .or(`block_term.eq.${block},block_term.is.null,block_term.eq.General`)
                    .order('exam_date', { ascending: true });
                
                if (examsError) throw examsError;
                
                // 2. Fetch grades for this student
                const { data: grades, error: gradesError } = await supabase
                    .from('exam_grades')
                    .select('*')
                    .eq('student_id', userId)
                    .order('graded_at', { ascending: false });
                
                if (gradesError) throw gradesError;
                
                console.log(`📊 Found ${exams?.length || 0} exams and ${grades?.length || 0} grades`);
                
                // 3. Process and combine data
                this.processExamsData(exams || [], grades || []);
                
                // 4. Apply current filter and display
                this.applyDataFilter();
                
                // 5. Show success message
                if (window.AppUtils?.showToast) {
                    window.AppUtils.showToast('Assessments loaded successfully', 'success');
                }
                
            } catch (error) {
                console.error('❌ Error loading exams:', error);
                this.showError(error.message);
                
                if (window.AppUtils?.showToast) {
                    window.AppUtils.showToast('Failed to load assessments: ' + error.message, 'error');
                }
            }
        }
        
        processExamsData(exams, grades) {
            this.allExams = exams.map(exam => {
                // Find grade for this exam
                const grade = grades.find(g => String(g.exam_id) === String(exam.id));
                
                // Calculate total percentage
                let totalPercentage = null;
                if (grade) {
                    if (grade.total_score !== null && grade.total_score !== undefined) {
                        totalPercentage = Number(grade.total_score);
                    } else if (grade.cat_1_score !== null && grade.cat_2_score !== null && grade.exam_score !== null) {
                        // Calculate weighted total: CAT1 (15%) + CAT2 (15%) + Final (70%)
                        totalPercentage = (grade.cat_1_score * 0.15) + (grade.cat_2_score * 0.15) + (grade.exam_score * 0.7);
                    }
                }
                
                // Determine grade text and class
                let gradeText = '--';
                let gradeClass = '';
                if (totalPercentage !== null) {
                    if (totalPercentage >= 85) {
                        gradeText = 'Distinction';
                        gradeClass = 'distinction';
                    } else if (totalPercentage >= 75) {
                        gradeText = 'Credit';
                        gradeClass = 'credit';
                    } else if (totalPercentage >= 60) {
                        gradeText = 'Pass';
                        gradeClass = 'pass';
                    } else {
                        gradeText = 'Fail';
                        gradeClass = 'fail';
                    }
                }
                
                // Format dates
                const examDate = exam.exam_date ? new Date(exam.exam_date) : null;
                const gradedDate = grade?.graded_at ? new Date(grade.graded_at) : null;
                
                return {
                    ...exam,
                    grade,
                    totalPercentage,
                    gradeText,
                    gradeClass,
                    isCompleted: !!grade,
                    examDate,
                    gradedDate,
                    cat1Score: grade?.cat_1_score || '--',
                    cat2Score: grade?.cat_2_score || '--',
                    finalScore: grade?.exam_score || '--',
                    formattedExamDate: examDate ? examDate.toLocaleDateString('en-US', { 
                        year: 'numeric', month: 'short', day: 'numeric' 
                    }) : '--',
                    formattedGradedDate: gradedDate ? gradedDate.toLocaleDateString('en-US', { 
                        year: 'numeric', month: 'short', day: 'numeric' 
                    }) : '--'
                };
            });
            
            console.log(`✅ Processed ${this.allExams.length} exams`);
        }
        
        displayTables() {
            // Display current assessments
            this.displayCurrentTable();
            
            // Display completed assessments
            this.displayCompletedTable();
            
            // Update counts
            this.updateCounts();
            
            // Update empty states
            this.updateEmptyStates();
            
            // Update performance summary for completed exams
            this.updatePerformanceSummary();
        }
        
        displayCurrentTable() {
            if (!this.currentTable) return;
            
            if (this.currentExams.length === 0) {
                this.currentTable.innerHTML = '';
                return;
            }
            
            const html = this.currentExams.map(exam => `
                <tr>
                    <td>${this.escapeHtml(exam.exam_name || 'N/A')}</td>
                    <td>
                        <span class="type-badge ${exam.exam_type?.includes('CAT') ? 'cat' : 'exam'}">
                            ${exam.exam_type?.includes('CAT') ? 'CAT' : 'Exam'}
                        </span>
                    </td>
                    <td>${this.escapeHtml(exam.course_name || 'General')}</td>
                    <td class="text-center">${this.escapeHtml(exam.block_term || 'General')}</td>
                    <td>${exam.formattedExamDate}</td>
                    <td>
                        <span class="status-badge pending">
                            <i class="fas fa-clock"></i> Pending
                        </span>
                    </td>
                    <td class="text-center">--</td>
                    <td class="text-center">--</td>
                    <td class="text-center">--</td>
                    <td class="text-center"><strong>--</strong></td>
                </tr>
            `).join('');
            
            this.currentTable.innerHTML = html;
        }
        
        displayCompletedTable() {
            if (!this.completedTable) return;
            
            if (this.completedExams.length === 0) {
                this.completedTable.innerHTML = '';
                return;
            }
            
            const html = this.completedExams.map(exam => {
                const totalDisplay = exam.totalPercentage !== null 
                    ? `${exam.totalPercentage.toFixed(1)}%` 
                    : '--';
                
                return `
                    <tr>
                        <td>${this.escapeHtml(exam.exam_name || 'N/A')}</td>
                        <td>
                            <span class="type-badge ${exam.exam_type?.includes('CAT') ? 'cat' : 'exam'}">
                                ${exam.exam_type?.includes('CAT') ? 'CAT' : 'Exam'}
                            </span>
                        </td>
                        <td>${this.escapeHtml(exam.course_name || 'General')}</td>
                        <td class="text-center">${this.escapeHtml(exam.block_term || 'General')}</td>
                        <td>${exam.formattedGradedDate}</td>
                        <td>
                            <span class="status-badge ${exam.gradeClass}">
                                <i class="fas ${exam.gradeClass === 'fail' ? 'fa-times-circle' : 'fa-check-circle'}"></i> 
                                ${exam.gradeText}
                            </span>
                        </td>
                        <td class="text-center">${exam.cat1Score}</td>
                        <td class="text-center">${exam.cat2Score}</td>
                        <td class="text-center">${exam.finalScore}</td>
                        <td class="text-center"><strong>${totalDisplay}</strong></td>
                        <td class="text-center">
                            <span class="grade-badge ${exam.gradeClass}">${exam.gradeText}</span>
                        </td>
                    </tr>
                `;
            }).join('');
            
            this.completedTable.innerHTML = html;
        }
        
        updateCounts() {
            // Update section counts
            if (this.currentCount) {
                this.currentCount.textContent = `${this.currentExams.length} pending`;
            }
            
            if (this.completedCount) {
                this.completedCount.textContent = `${this.completedExams.length} graded`;
            }
            
            // Update header counts
            if (this.currentHeaderCount) {
                this.currentHeaderCount.textContent = this.currentExams.length;
            }
            
            if (this.completedHeaderCount) {
                this.completedHeaderCount.textContent = this.completedExams.length;
            }
            
            // Calculate and update average
            const scoredExams = this.completedExams.filter(exam => exam.totalPercentage !== null);
            if (scoredExams.length > 0) {
                const total = scoredExams.reduce((sum, exam) => sum + exam.totalPercentage, 0);
                const average = total / scoredExams.length;
                
                if (this.completedAverage) {
                    this.completedAverage.textContent = `Average: ${average.toFixed(1)}%`;
                }
                
                if (this.overallAverage) {
                    this.overallAverage.textContent = `${average.toFixed(1)}%`;
                }
            } else {
                if (this.completedAverage) {
                    this.completedAverage.textContent = 'Average: --';
                }
                if (this.overallAverage) {
                    this.overallAverage.textContent = '--';
                }
            }
        }
        
        updateEmptyStates() {
            if (this.currentEmpty) {
                this.currentEmpty.style.display = this.currentExams.length === 0 ? 'block' : 'none';
            }
            
            if (this.completedEmpty) {
                this.completedEmpty.style.display = this.completedExams.length === 0 ? 'block' : 'none';
            }
        }
        
        updatePerformanceSummary() {
            const scoredExams = this.completedExams.filter(exam => exam.totalPercentage !== null);
            
            if (scoredExams.length === 0) {
                this.resetPerformanceSummary();
                return;
            }
            
            // Calculate performance metrics
            const scores = scoredExams.map(exam => exam.totalPercentage);
            const bestScore = Math.max(...scores);
            const worstScore = Math.min(...scores);
            const passed = scoredExams.filter(exam => exam.totalPercentage >= 60).length;
            const passRate = (passed / scoredExams.length) * 100;
            
            // Calculate grade distribution based on your grading scale
            const gradeCounts = {
                distinction: scoredExams.filter(exam => exam.totalPercentage >= 85).length,
                credit: scoredExams.filter(exam => exam.totalPercentage >= 75 && exam.totalPercentage < 85).length,
                pass: scoredExams.filter(exam => exam.totalPercentage >= 60 && exam.totalPercentage < 75).length,
                fail: scoredExams.filter(exam => exam.totalPercentage < 60).length
            };
            
            // Update performance overview
            if (this.bestScore) this.bestScore.textContent = `${bestScore.toFixed(1)}%`;
            if (this.lowestScore) this.lowestScore.textContent = `${worstScore.toFixed(1)}%`;
            if (this.passRate) this.passRate.textContent = `${passRate.toFixed(0)}%`;
            
            // Update grade distribution
            if (this.distinctionCount) this.distinctionCount.textContent = gradeCounts.distinction;
            if (this.creditCount) this.creditCount.textContent = gradeCounts.credit;
            if (this.passCount) this.passCount.textContent = gradeCounts.pass;
            if (this.failCount) this.failCount.textContent = gradeCounts.fail;
            
            // Update distribution bars
            this.updateDistributionBars(gradeCounts, scoredExams.length);
            
            // Update timeline
            this.updateTimeline(scoredExams);
        }
        
        updateDistributionBars(counts, total) {
            if (total === 0) return;
            
            const updateBar = (barElement, percentage) => {
                if (barElement) {
                    barElement.style.width = `${percentage}%`;
                }
            };
            
            updateBar(this.distinctionBar, (counts.distinction / total) * 100);
            updateBar(this.creditBar, (counts.credit / total) * 100);
            updateBar(this.passBar, (counts.pass / total) * 100);
            updateBar(this.failBar, (counts.fail / total) * 100);
        }
        
        updateTimeline(scoredExams) {
            if (scoredExams.length === 0) return;
            
            // Sort by date
            const sortedExams = [...scoredExams].sort((a, b) => {
                const dateA = a.gradedDate || a.examDate || new Date(0);
                const dateB = b.gradedDate || b.examDate || new Date(0);
                return dateA - dateB;
            });
            
            const firstExam = sortedExams[0];
            const latestExam = sortedExams[sortedExams.length - 1];
            
            if (this.firstAssessmentDate && firstExam.gradedDate) {
                this.firstAssessmentDate.textContent = firstExam.formattedGradedDate;
            }
            
            if (this.latestAssessmentDate && latestExam.gradedDate) {
                this.latestAssessmentDate.textContent = latestExam.formattedGradedDate;
            }
            
            if (this.totalSubmitted) {
                this.totalSubmitted.textContent = scoredExams.length;
            }
        }
        
        resetPerformanceSummary() {
            const resetElement = (element, value = '--') => {
                if (element) element.textContent = value;
            };
            
            resetElement(this.bestScore);
            resetElement(this.lowestScore);
            resetElement(this.passRate);
            resetElement(this.distinctionCount, '0');
            resetElement(this.creditCount, '0');
            resetElement(this.passCount, '0');
            resetElement(this.failCount, '0');
            resetElement(this.firstAssessmentDate);
            resetElement(this.latestAssessmentDate);
            resetElement(this.totalSubmitted, '0');
            
            // Reset bars
            const resetBar = (bar) => {
                if (bar) bar.style.width = '0%';
            };
            
            resetBar(this.distinctionBar);
            resetBar(this.creditBar);
            resetBar(this.passBar);
            resetBar(this.failBar);
        }
        
        showTranscriptModal() {
            // Create transcript modal
            const modal = document.createElement('div');
            modal.id = 'transcript-modal';
            modal.className = 'modal-overlay';
            modal.innerHTML = `
                <div class="modal-content">
                    <div class="modal-header">
                        <h3><i class="fas fa-file-pdf"></i> Academic Transcript</h3>
                        <button class="close-modal-btn" onclick="this.closest('.modal-overlay').remove()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body">
                        <div class="transcript-info">
                            <p><strong>Student:</strong> ${window.db?.currentUserProfile?.full_name || 'N/A'}</p>
                            <p><strong>Student ID:</strong> ${window.db?.currentUserProfile?.student_id || 'N/A'}</p>
                            <p><strong>Program:</strong> ${window.db?.currentUserProfile?.program || 'N/A'}</p>
                            <p><strong>Intake Year:</strong> ${window.db?.currentUserProfile?.intake_year || 'N/A'}</p>
                        </div>
                        <div class="transcript-message">
                            <i class="fas fa-info-circle" style="color: #4C1D95; font-size: 2rem; margin-bottom: 15px;"></i>
                            <h4>Transcript Generation</h4>
                            <p>Official transcripts can be requested from the administration office.</p>
                            <p>This feature will be available soon for online transcript generation.</p>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-primary" onclick="window.open('#', '_blank')">
                            <i class="fas fa-download"></i> Download Sample
                        </button>
                        <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">
                            Close
                        </button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            
            // Add modal styles if not present
            if (!document.getElementById('transcript-modal-styles')) {
                const styles = `
                    .modal-overlay {
                        position: fixed;
                        top: 0;
                        left: 0;
                        right: 0;
                        bottom: 0;
                        background: rgba(0,0,0,0.7);
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        z-index: 2000;
                        padding: 20px;
                    }
                    
                    .modal-content {
                        background: white;
                        border-radius: 12px;
                        width: 100%;
                        max-width: 500px;
                        overflow: hidden;
                    }
                    
                    .modal-header {
                        background: #4C1D95;
                        color: white;
                        padding: 20px;
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                    }
                    
                    .modal-header h3 {
                        margin: 0;
                        font-size: 1.2rem;
                    }
                    
                    .close-modal-btn {
                        background: transparent;
                        border: none;
                        color: white;
                        font-size: 1.5rem;
                        cursor: pointer;
                    }
                    
                    .modal-body {
                        padding: 20px;
                    }
                    
                    .transcript-info {
                        background: #f8fafc;
                        padding: 15px;
                        border-radius: 8px;
                        margin-bottom: 20px;
                    }
                    
                    .transcript-message {
                        text-align: center;
                        padding: 20px;
                    }
                    
                    .modal-footer {
                        padding: 20px;
                        border-top: 1px solid #e2e8f0;
                        display: flex;
                        gap: 10px;
                        justify-content: flex-end;
                    }
                    
                    .btn {
                        padding: 10px 20px;
                        border-radius: 6px;
                        border: none;
                        cursor: pointer;
                        font-weight: 600;
                    }
                    
                    .btn-primary {
                        background: #4C1D95;
                        color: white;
                    }
                    
                    .btn-secondary {
                        background: #e2e8f0;
                        color: #4a5568;
                    }
                `;
                
                const styleElement = document.createElement('style');
                styleElement.id = 'transcript-modal-styles';
                styleElement.textContent = styles;
                document.head.appendChild(styleElement);
            }
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
                            <button onclick="window.examsModule.loadExams()" class="btn btn-sm btn-primary">
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
        
        // Public methods
        refresh() {
            console.log('🔄 Manual refresh requested');
            this.loadExams();
        }
    }
    
    // Create global instance
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
    
    window.switchToAllAssessments = () => {
        console.log('🌍 Global switchToAllAssessments() called');
        if (window.examsModule) {
            window.examsModule.applyFilter('all');
        }
    };
    
    console.log('✅ Exams module ready with all buttons working!');
})();
