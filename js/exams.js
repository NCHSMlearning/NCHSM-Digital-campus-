// js/exams.js - COMPLETE UPDATED VERSION with KRCHN & TVET filtering
(function() {
    'use strict';
    
    console.log('✅ exams.js - Updated Version with KRCHN & TVET Support');
    
    class ExamsModule {
        constructor() {
            console.log('🔧 ExamsModule initialized');
            
            // Store exam data
            this.allExams = [];
            this.currentExams = [];
            this.completedExams = [];
            this.currentFilter = 'all';
            
            // Get user profile
            this.userProfile = window.db?.currentUserProfile || {};
            this.program = this.userProfile.program || 'KRCHN';
            this.intakeYear = this.userProfile.intake_year || 2025;
            this.block = this.userProfile.block || 'A';
            this.term = this.userProfile.term || 'Term 1'; // For TVET programs
            this.userId = window.db?.currentUserId;
            
            // Check if TVET program
            this.isTVET = this.isTVETProgram(this.program);
            console.log(`🎓 Program: ${this.program}, TVET: ${this.isTVET}, Block: ${this.block}, Term: ${this.term}`);
            
            // Cache DOM elements
            this.cacheElements();
            
            // Initialize
            this.initializeEventListeners();
            this.updateFilterButtons();
            this.loadExams();
        }
        
        isTVETProgram(program) {
            // TVET programs include TVET, TVET Nursing, and other TVET variants
            const tvetPrograms = ['TVET', 'TVET NURSING', 'TVET NURSING(A)', 'TVET NURSING(B)', 
                                'CRAFT CERTIFICATE', 'ARTISAN', 'DIPLOMA IN TVET'];
            return tvetPrograms.some(tvet => program?.toUpperCase().includes(tvet));
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
                const term = userProfile.term || 'Term 1';
                const userId = window.db.currentUserId;
                
                console.log('🎯 Loading exams for:', { program, intakeYear, block, term });
                
                const supabase = window.db.supabase;
                
                // Build query based on program type
                let query = supabase
                    .from('exams_with_courses')
                    .select('*')
                    .eq('intake_year', intakeYear)
                    .order('exam_date', { ascending: true });
                
                if (this.isTVET) {
                    // TVET filtering: match program AND (term OR General)
                    query = query
                        .eq('program_type', program)
                        .or(`block_term.eq.${term},block_term.eq.General,block_term.is.null`);
                } else {
                    // KRCHN filtering: match program OR General, AND block OR General
                    query = query
                        .or(`program_type.eq.${program},program_type.eq.General`)
                        .or(`block_term.eq.${block},block_term.is.null,block_term.eq.General`);
                }
                
                // 1. Fetch exams
                const { data: exams, error: examsError } = await query;
                
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
                
                // Check if exam is completed
                let isCompleted = false;
                let totalPercentage = null;
                let gradeText = '--';
                let gradeClass = '';
                let catScore = null; // For CAT exams
                
                if (grade) {
                    // For CAT exams: check if CAT score exists
                    if (exam.exam_type?.includes('CAT')) {
                        // CAT exams should have cat_1_score or cat_2_score
                        const hasCatScore = grade.cat_1_score !== null || grade.cat_2_score !== null;
                        
                        if (hasCatScore) {
                            isCompleted = true;
                            
                            // Determine which CAT score to use
                            if (exam.exam_type?.includes('CAT I') && grade.cat_1_score !== null) {
                                catScore = Number(grade.cat_1_score);
                            } else if (exam.exam_type?.includes('CAT II') && grade.cat_2_score !== null) {
                                catScore = Number(grade.cat_2_score);
                            } else {
                                // Fallback: use whichever CAT score is available
                                catScore = grade.cat_1_score !== null ? 
                                    Number(grade.cat_1_score) : Number(grade.cat_2_score);
                            }
                            
                            // CATs are graded out of 30 marks
                            totalPercentage = (catScore / 30) * 100;
                            
                            // Determine grade based on CAT percentage
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
                    } 
                    // For Final exams: check all scores
                    else {
                        // Check if all required scores are present
                        const hasAllScores = grade.cat_1_score !== null && 
                                            grade.cat_2_score !== null && 
                                            grade.exam_score !== null;
                        
                        if (hasAllScores) {
                            isCompleted = true;
                            
                            // Calculate weighted total: CAT1 (15%) + CAT2 (15%) + Final (70%)
                            const cat1Weighted = (Number(grade.cat_1_score) * 0.15);
                            const cat2Weighted = (Number(grade.cat_2_score) * 0.15);
                            const finalWeighted = (Number(grade.exam_score) * 0.7);
                            totalPercentage = cat1Weighted + cat2Weighted + finalWeighted;
                            
                            // Determine grade
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
                    }
                }
                
                // Format dates
                const examDate = exam.exam_date ? new Date(exam.exam_date) : null;
                const gradedDate = grade?.graded_at ? new Date(grade.graded_at) : null;
                
                return {
                    ...exam,
                    grade,
                    totalPercentage,
                    catScore, // Store CAT score separately
                    gradeText,
                    gradeClass,
                    isCompleted,
                    examDate,
                    gradedDate,
                    // For display - show actual scores
                    cat1Score: grade?.cat_1_score !== null && grade?.cat_1_score !== undefined ? 
                        `${grade.cat_1_score}%` : '--',
                    cat2Score: grade?.cat_2_score !== null && grade?.cat_2_score !== undefined ? 
                        `${grade.cat_2_score}%` : '--',
                    finalScore: grade?.exam_score !== null && grade?.exam_score !== undefined ? 
                        `${grade.exam_score}%` : '--',
                    formattedExamDate: examDate ? examDate.toLocaleDateString('en-US', { 
                        year: 'numeric', month: 'short', day: 'numeric' 
                    }) : '--',
                    formattedGradedDate: gradedDate ? gradedDate.toLocaleDateString('en-US', { 
                        year: 'numeric', month: 'short', day: 'numeric' 
                    }) : '--'
                };
            });
            
            console.log(`✅ Processed ${this.allExams.length} exams`);
            console.log(`📊 Completed exams: ${this.allExams.filter(exam => exam.isCompleted).length}`);
            console.log(`📊 CAT exams: ${this.allExams.filter(exam => exam.exam_type?.includes('CAT')).length}`);
            
            // Log each exam for debugging
            this.allExams.forEach((exam, index) => {
                if (exam.isCompleted) {
                    console.log(`✅ Completed Exam ${index + 1}:`, {
                        name: exam.exam_name,
                        type: exam.exam_type,
                        totalPercentage: exam.totalPercentage,
                        grade: exam.gradeText
                    });
                }
            });
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
                    <td class="text-center">${this.isTVET ? exam.block_term || this.term : exam.block_term || 'General'}</td>
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
                    <td class="text-center">--</td>
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
                // Determine what to display in Total column
                let totalDisplay = '--';
                if (exam.totalPercentage !== null) {
                    if (exam.exam_type?.includes('CAT')) {
                        // For CATs, show the CAT score out of 30 and percentage
                        totalDisplay = `${exam.catScore}/30 (${exam.totalPercentage.toFixed(1)}%)`;
                    } else {
                        // For final exams, show percentage
                        totalDisplay = `${exam.totalPercentage.toFixed(1)}%`;
                    }
                }
                
                return `
                    <tr>
                        <td>${this.escapeHtml(exam.exam_name || 'N/A')}</td>
                        <td>
                            <span class="type-badge ${exam.exam_type?.includes('CAT') ? 'cat' : 'exam'}">
                                ${exam.exam_type?.includes('CAT') ? 'CAT' : 'Exam'}
                            </span>
                        </td>
                        <td>${this.escapeHtml(exam.course_name || 'General')}</td>
                        <td class="text-center">${this.isTVET ? exam.block_term || this.term : exam.block_term || 'General'}</td>
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
            // Filter only completed (graded) exams
            const gradedExams = this.allExams.filter(exam => exam.isCompleted && exam.totalPercentage !== null);
            
            // Group by month/assessment period
            const examsByMonth = this.groupExamsByMonth(gradedExams);
            
            // Create transcript modal
            const modal = document.createElement('div');
            modal.id = 'transcript-modal';
            modal.className = 'modal-overlay';
            modal.innerHTML = `
                <div class="modal-content" style="max-width: 900px;">
                    <div class="modal-header">
                        <h3><i class="fas fa-scroll"></i> Academic Transcript</h3>
                        <button class="close-modal-btn" onclick="this.closest('.modal-overlay').remove()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body">
                        <!-- Student Information -->
                        <div class="transcript-info">
                            <h4>Student Information</h4>
                            <div class="info-grid">
                                <div><strong>Student:</strong> ${window.db?.currentUserProfile?.full_name || 'N/A'}</div>
                                <div><strong>Student ID:</strong> ${window.db?.currentUserProfile?.student_id || 'N/A'}</div>
                                <div><strong>Program:</strong> ${window.db?.currentUserProfile?.program || 'N/A'}</div>
                                <div><strong>${this.isTVET ? 'Term' : 'Block'}:</strong> ${this.isTVET ? this.term : this.block}</div>
                                <div><strong>Intake Year:</strong> ${window.db?.currentUserProfile?.intake_year || 'N/A'}</div>
                            </div>
                        </div>
                        
                        <!-- Month/Assessment Filter -->
                        <div class="transcript-controls">
                            <h4>Filter by Assessment Period</h4>
                            <div class="filter-options">
                                <button class="filter-btn active" data-month="all">All Assessments</button>
                                ${Object.keys(examsByMonth).map(month => `
                                    <button class="filter-btn" data-month="${month}">${month}</button>
                                `).join('')}
                            </div>
                        </div>
                        
                        <!-- Graded Units Table -->
                        <div class="transcript-table-section">
                            <h4>Graded Assessment Units</h4>
                            ${gradedExams.length === 0 ? 
                                `<div class="empty-state">
                                    <i class="fas fa-clipboard-list" style="font-size: 3rem; color: #cbd5e1; margin-bottom: 15px;"></i>
                                    <h5>No Graded Assessments Yet</h5>
                                    <p>Your graded assessments will appear here once they are marked.</p>
                                </div>` : 
                                `<div class="table-responsive">
                                    <table class="transcript-table">
                                        <thead>
                                            <tr>
                                                <th>Assessment</th>
                                                <th>Course</th>
                                                <th>Type</th>
                                                <th>${this.isTVET ? 'Term' : 'Block'}</th>
                                                <th>Assessment Date</th>
                                                <th>Graded Date</th>
                                                <th>CAT 1</th>
                                                <th>CAT 2</th>
                                                <th>Final</th>
                                                <th>Total</th>
                                                <th>Grade</th>
                                            </tr>
                                        </thead>
                                        <tbody id="transcript-exams-list">
                                            ${gradedExams.map(exam => `
                                                <tr data-month="${this.getMonthKey(exam.gradedDate || exam.examDate)}">
                                                    <td>${this.escapeHtml(exam.exam_name || 'N/A')}</td>
                                                    <td>${this.escapeHtml(exam.course_name || 'General')}</td>
                                                    <td><span class="type-badge ${exam.exam_type?.includes('CAT') ? 'cat' : 'exam'}">
                                                        ${exam.exam_type?.includes('CAT') ? 'CAT' : 'Exam'}
                                                    </span></td>
                                                    <td class="text-center">${this.isTVET ? exam.block_term || this.term : exam.block_term || 'General'}</td>
                                                    <td>${exam.formattedExamDate}</td>
                                                    <td>${exam.formattedGradedDate}</td>
                                                    <td class="text-center">${exam.cat1Score}</td>
                                                    <td class="text-center">${exam.cat2Score}</td>
                                                    <td class="text-center">${exam.finalScore}</td>
                                                    <td class="text-center">
                                                        ${exam.exam_type?.includes('CAT') ? 
                                                            `<strong>${exam.catScore}/30<br><small>(${exam.totalPercentage?.toFixed(1)}%)</small></strong>` : 
                                                            `<strong>${exam.totalPercentage?.toFixed(1)}%</strong>`
                                                        }
                                                    </td>
                                                    <td class="text-center">
                                                        <span class="grade-badge ${exam.gradeClass}">${exam.gradeText}</span>
                                                    </td>
                                                </tr>
                                            `).join('')}
                                        </tbody>
                                    </table>
                                </div>`
                            }
                        </div>
                        
                        <!-- Summary Statistics -->
                        ${gradedExams.length > 0 ? `
                            <div class="transcript-summary">
                                <h4>Summary Statistics</h4>
                                <div class="summary-grid">
                                    <div class="summary-item">
                                        <div class="summary-label">Total Graded</div>
                                        <div class="summary-value">${gradedExams.length}</div>
                                    </div>
                                    <div class="summary-item">
                                        <div class="summary-label">Overall Average</div>
                                        <div class="summary-value">
                                            ${(gradedExams.reduce((sum, exam) => sum + exam.totalPercentage, 0) / gradedExams.length).toFixed(1)}%
                                        </div>
                                    </div>
                                    <div class="summary-item">
                                        <div class="summary-label">Highest Grade</div>
                                        <div class="summary-value distinction">
                                            ${Math.max(...gradedExams.map(e => e.totalPercentage)).toFixed(1)}%
                                        </div>
                                    </div>
                                    <div class="summary-item">
                                        <div class="summary-label">Pass Rate</div>
                                        <div class="summary-value">
                                            ${((gradedExams.filter(e => e.totalPercentage >= 60).length / gradedExams.length) * 100).toFixed(0)}%
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ` : ''}
                    </div>
                    <!-- REMOVED DOWNLOAD BUTTON AS REQUESTED -->
                    <div class="modal-footer">
                        <div class="footer-info">
                            <i class="fas fa-info-circle"></i>
                            <span>This is your official academic record. For certified copies, contact the administration office.</span>
                        </div>
                        <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">
                            <i class="fas fa-times"></i> Close Transcript
                        </button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            
            // Add event listeners for month filtering
            setTimeout(() => {
                const filterButtons = modal.querySelectorAll('.filter-btn');
                const examRows = modal.querySelectorAll('#transcript-exams-list tr');
                
                filterButtons.forEach(btn => {
                    btn.addEventListener('click', () => {
                        // Update active button
                        filterButtons.forEach(b => b.classList.remove('active'));
                        btn.classList.add('active');
                        
                        const month = btn.dataset.month;
                        
                        // Show/hide rows based on month filter
                        examRows.forEach(row => {
                            if (month === 'all' || row.dataset.month === month) {
                                row.style.display = '';
                            } else {
                                row.style.display = 'none';
                            }
                        });
                    });
                });
            }, 100);
            
            // Add transcript-specific styles
            this.addTranscriptStyles();
        }
        
        groupExamsByMonth(exams) {
            const groups = {};
            
            exams.forEach(exam => {
                const date = exam.gradedDate || exam.examDate;
                if (!date) return;
                
                const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                const monthName = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
                
                if (!groups[monthKey]) {
                    groups[monthKey] = {
                        name: monthName,
                        exams: []
                    };
                }
                
                groups[monthKey].exams.push(exam);
            });
            
            return groups;
        }
        
        getMonthKey(date) {
            if (!date) return 'unknown';
            return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        }
        
        addTranscriptStyles() {
            if (document.getElementById('transcript-styles')) return;
            
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
                    max-height: 90vh;
                    overflow-y: auto;
                }
                
                .modal-header {
                    background: #4C1D95;
                    color: white;
                    padding: 20px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    position: sticky;
                    top: 0;
                    z-index: 10;
                }
                
                .modal-header h3 {
                    margin: 0;
                    font-size: 1.3rem;
                }
                
                .close-modal-btn {
                    background: transparent;
                    border: none;
                    color: white;
                    font-size: 1.5rem;
                    cursor: pointer;
                }
                
                .modal-body {
                    padding: 25px;
                }
                
                .transcript-info {
                    background: #f8fafc;
                    padding: 20px;
                    border-radius: 10px;
                    margin-bottom: 25px;
                    border: 1px solid #e2e8f0;
                }
                
                .transcript-info h4 {
                    margin-top: 0;
                    margin-bottom: 15px;
                    color: #4C1D95;
                }
                
                .info-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                    gap: 15px;
                }
                
                .transcript-controls {
                    margin-bottom: 25px;
                }
                
                .transcript-controls h4 {
                    margin-top: 0;
                    margin-bottom: 15px;
                    color: #4C1D95;
                }
                
                .filter-options {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 10px;
                }
                
                .filter-btn {
                    padding: 8px 16px;
                    background: #e2e8f0;
                    border: none;
                    border-radius: 20px;
                    cursor: pointer;
                    font-size: 0.9rem;
                    transition: all 0.2s;
                }
                
                .filter-btn:hover {
                    background: #cbd5e1;
                }
                
                .filter-btn.active {
                    background: #4C1D95;
                    color: white;
                }
                
                .transcript-table-section {
                    margin-bottom: 25px;
                }
                
                .transcript-table-section h4 {
                    margin-top: 0;
                    margin-bottom: 15px;
                    color: #4C1D95;
                }
                
                .transcript-table {
                    width: 100%;
                    border-collapse: collapse;
                }
                
                .transcript-table th {
                    background: #f1f5f9;
                    padding: 12px 15px;
                    text-align: left;
                    border-bottom: 2px solid #e2e8f0;
                    font-weight: 600;
                    color: #475569;
                }
                
                .transcript-table td {
                    padding: 12px 15px;
                    border-bottom: 1px solid #e2e8f0;
                }
                
                .transcript-table tr:hover {
                    background: #f8fafc;
                }
                
                .empty-state {
                    text-align: center;
                    padding: 40px 20px;
                    color: #64748b;
                }
                
                .empty-state h5 {
                    margin: 10px 0;
                    color: #475569;
                }
                
                .transcript-summary {
                    background: #f0f9ff;
                    padding: 20px;
                    border-radius: 10px;
                    border: 1px solid #bae6fd;
                }
                
                .transcript-summary h4 {
                    margin-top: 0;
                    margin-bottom: 20px;
                    color: #0369a1;
                }
                
                .summary-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
                    gap: 20px;
                }
                
                .summary-item {
                    text-align: center;
                }
                
                .summary-label {
                    font-size: 0.9rem;
                    color: #64748b;
                    margin-bottom: 5px;
                }
                
                .summary-value {
                    font-size: 1.5rem;
                    font-weight: 600;
                    color: #1e293b;
                }
                
                .summary-value.distinction {
                    color: #10b981;
                }
                
                .modal-footer {
                    padding: 20px;
                    border-top: 1px solid #e2e8f0;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    position: sticky;
                    bottom: 0;
                    background: white;
                }
                
                .footer-info {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    color: #64748b;
                    font-size: 0.9rem;
                }
                
                .footer-info i {
                    color: #4C1D95;
                }
                
                .btn {
                    padding: 10px 20px;
                    border-radius: 6px;
                    border: none;
                    cursor: pointer;
                    font-weight: 600;
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                }
                
                .btn-secondary {
                    background: #e2e8f0;
                    color: #475569;
                }
                
                .btn-secondary:hover {
                    background: #cbd5e1;
                }
                
                .table-responsive {
                    overflow-x: auto;
                }
                
                .text-center {
                    text-align: center;
                }
                
                .type-badge {
                    padding: 4px 10px;
                    border-radius: 12px;
                    font-size: 0.8rem;
                    font-weight: 600;
                }
                
                .type-badge.cat {
                    background: #fef3c7;
                    color: #92400e;
                }
                
                .type-badge.exam {
                    background: #dbeafe;
                    color: #1e40af;
                }
                
                .grade-badge {
                    padding: 4px 12px;
                    border-radius: 15px;
                    font-size: 0.85rem;
                    font-weight: 600;
                    display: inline-block;
                }
                
                .grade-badge.distinction {
                    background: #d1fae5;
                    color: #065f46;
                }
                
                .grade-badge.credit {
                    background: #dbeafe;
                    color: #1e40af;
                }
                
                .grade-badge.pass {
                    background: #fef3c7;
                    color: #92400e;
                }
                
                .grade-badge.fail {
                    background: #fee2e2;
                    color: #991b1b;
                }
            `;
            
            const styleElement = document.createElement('style');
            styleElement.id = 'transcript-styles';
            styleElement.textContent = styles;
            document.head.appendChild(styleElement);
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
                this.currentTable.innerHTML = loadingHTML(11);
            }
            if (this.completedTable) {
                this.completedTable.innerHTML = loadingHTML(12);
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
                this.currentTable.innerHTML = errorHTML(11);
            }
            if (this.completedTable) {
                this.completedTable.innerHTML = errorHTML(12);
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
        
        // Debug method
        debugGrading() {
            console.log('🔍 DEBUG: Current grading state');
            console.log('All exams:', this.allExams.length);
            console.log('Completed exams:', this.completedExams.length);
            
            // Check for CAT exams
            const catExams = this.allExams.filter(exam => exam.exam_type?.includes('CAT'));
            console.log('CAT exams:', catExams.length);
            
            catExams.forEach((exam, index) => {
                console.log(`CAT ${index + 1}:`, {
                    name: exam.exam_name,
                    hasGrade: !!exam.grade,
                    isCompleted: exam.isCompleted,
                    cat1Score: exam.cat1Score,
                    cat2Score: exam.cat2Score,
                    catScore: exam.catScore,
                    totalPercentage: exam.totalPercentage
                });
            });
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
    
    console.log('✅ Exams module ready with KRCHN & TVET support!');
})();
