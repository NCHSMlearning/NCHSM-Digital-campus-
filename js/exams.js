// js/exams.js - UNIVERSAL VERSION FOR ALL PROGRAMS (KRCHN & TVET)
(function() {
    'use strict';
    
    console.log('✅ exams.js - Universal Version for KRCHN & TVET');
    
    class ExamsModule {
        constructor() {
            console.log('🔧 ExamsModule initialized');
            
            // Get DOM elements
            this.currentTable = document.getElementById('current-assessments-table');
            this.completedTable = document.getElementById('completed-assessments-table');
            this.currentEmpty = document.getElementById('current-empty');
            this.completedEmpty = document.getElementById('completed-empty');
            
            // Load exams immediately
            this.loadExams();
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
                    // FIXED: This works for ANY program name (KRCHN, TVET, etc.)
                    .or(`program_type.eq.${program},program_type.eq.General,program_type.is.null`)
                    // FIXED: Handle block properly
                    .or(`block_term.eq.${block},block_term.is.null,block_term.eq.General`)
                    .eq('intake_year', intakeYear)
                    .order('exam_date', { ascending: true });
                
                if (examsError) throw examsError;
                
                // 2. Get grades - UNIVERSAL for all students
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
                
            } catch (error) {
                console.error('❌ Error loading exams:', error);
                this.showError('Failed to load assessments: ' + error.message);
            }
        }
        
        processAndDisplay(exams, grades, program) {
            console.log(`📊 Processing for program: ${program}`);
            
            // Process each exam
            const examData = exams.map(exam => {
                const grade = grades.find(g => String(g.exam_id) === String(exam.id));
                const examType = exam.exam_type || '';
                
                // Calculate percentage - UNIVERSAL for all exam types
                let percentage = null;
                if (grade) {
                    // Try total_score first (works for all)
                    if (grade.total_score !== null && grade.total_score !== undefined) {
                        percentage = Number(grade.total_score);
                    } 
                    // CAT exams (both KRCHN and TVET)
                    else if (examType.includes('CAT') && grade.cat_1_score !== null) {
                        percentage = (grade.cat_1_score / 30) * 100;
                    }
                    // Practical/Assignment exams (common in TVET)
                    else if (examType.includes('Practical') && grade.exam_score !== null) {
                        percentage = Number(grade.exam_score);
                    }
                    // Final exams
                    else if (examType.includes('EXAM') || examType.includes('Final')) {
                        if (grade.cat_1_score !== null && grade.cat_2_score !== null && grade.exam_score !== null) {
                            const totalMarks = grade.cat_1_score + grade.cat_2_score + grade.exam_score;
                            percentage = (totalMarks / 100) * 100;
                        }
                    }
                }
                
                // Determine grade - UNIVERSAL grading system
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
                    examScore: grade?.exam_score,
                    // Add program info for debugging
                    studentProgram: program
                };
            });
            
            // Split into current and completed
            const current = examData.filter(e => !e.isCompleted);
            const completed = examData.filter(e => e.isCompleted);
            
            console.log(`📊 Results for ${program}: ${current.length} current, ${completed.length} completed`);
            
            // Display
            this.displayTable(this.currentTable, current, false, program);
            this.displayTable(this.completedTable, completed, true, program);
            
            // Update empty states
            this.toggleEmptyState('current', current.length === 0);
            this.toggleEmptyState('completed', completed.length === 0);
            
            // Update counts
            this.updateCounts(current.length, completed.length, program);
            
            // Update performance summary
            this.updatePerformanceSummary(completed, program);
        }
        
        displayTable(tableElement, exams, isCompleted, program) {
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
                
                // Determine exam type badge - UNIVERSAL
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
        
        updateCounts(current, completed, program) {
            console.log(`📊 ${program}: ${current} current, ${completed} completed`);
            
            // Update section counts
            const currentCount = document.getElementById('current-count');
            const completedCount = document.getElementById('completed-count');
            
            if (currentCount) currentCount.textContent = `${current} pending`;
            if (completedCount) completedCount.textContent = `${completed} graded`;
            
            // Update header counts
            const currentHeader = document.getElementById('current-assessments-count');
            const completedHeader = document.getElementById('completed-assessments-count');
            
            if (currentHeader) currentHeader.textContent = current;
            if (completedHeader) completedHeader.textContent = completed;
        }
        
        updatePerformanceSummary(completedExams, program) {
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
            
            console.log(`📈 ${program} Performance: Best ${bestScore.toFixed(1)}%, Pass Rate ${passRate.toFixed(0)}%`);
            
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
                            <button onclick="window.examsModule?.loadExams()" class="btn btn-sm btn-primary">
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
            this.loadExams();
        }
    }
    
    // Create and expose
    window.examsModule = new ExamsModule();
    
    // Global functions for backward compatibility
    window.loadExams = () => window.examsModule?.refresh();
    window.refreshAssessments = () => window.examsModule?.refresh();
    
    console.log('✅ Universal exams module ready for KRCHN & TVET');
})();
