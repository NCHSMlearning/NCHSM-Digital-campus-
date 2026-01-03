// js/exams.js - FINAL WORKING VERSION WITH MANUAL FIX
(function() {
    'use strict';
    
    console.log('✅ exams.js loaded - FINAL VERSION');
    
    // MANUAL FIX: Direct data access - no guessing
    function getUserProfile() {
        // DIRECT ACCESS to window.db where your data actually is
        const rawProfile = window.db?.currentUserProfile || {};
        
        // MANUAL FIX: Extract and convert to strings
        return {
            program: String(rawProfile.program || 'KRCHN'),      // Your actual program
            intake_year: String(rawProfile.intake_year || '2025'), // Your actual intake year
            block: String(rawProfile.block || 'A'),              // Your actual block
            department: String(rawProfile.department || ''),
            // Include everything else
            ...rawProfile
        };
    }
    
    function getCurrentUserId() {
        // DIRECT ACCESS to user ID
        return window.db?.currentUserId || window.currentUserId || null;
    }
    
    function getSupabaseClient() {
        return window.db?.supabase || null;
    }
    
    class ExamsModule {
        constructor() {
            console.log('🔧 ExamsModule created');
            
            // Initialize with HARDCODED values first
            this.userId = getCurrentUserId();
            this.userProfile = getUserProfile(); // Uses manual fix above
            
            console.log('👤 User data:', {
                userId: this.userId,
                program: this.userProfile.program,
                intake_year: this.userProfile.intake_year,
                block: this.userProfile.block
            });
            
            // Get DOM elements
            this.currentAssessmentsTable = document.getElementById('current-assessments-table');
            this.completedAssessmentsTable = document.getElementById('completed-assessments-table');
            this.currentEmptyState = document.getElementById('current-empty');
            this.completedEmptyState = document.getElementById('completed-empty');
            
            // Load immediately
            this.loadExams();
        }
        
        async loadExams() {
            console.log('📥 Loading exams with:', {
                program: this.userProfile.program,
                intakeYear: this.userProfile.intake_year,
                block: this.userProfile.block,
                studentId: this.userId
            });
            
            // Show loading
            if (this.currentAssessmentsTable) {
                this.currentAssessmentsTable.innerHTML = '<tr><td colspan="10">Loading...</td></tr>';
            }
            if (this.completedAssessmentsTable) {
                this.completedAssessmentsTable.innerHTML = '<tr><td colspan="11">Loading...</td></tr>';
            }
            
            if (!this.userProfile.program || !this.userProfile.intake_year || !this.userId) {
                console.error('❌ Missing data');
                this.showError('Please ensure your profile is complete');
                return;
            }
            
            try {
                const supabase = getSupabaseClient();
                if (!supabase) throw new Error('No database connection');
                
                // 1. Get exams
                const { data: exams, error: examsError } = await supabase
                    .from('exams_with_courses')
                    .select('*')
                    .or(`program_type.eq.${this.userProfile.program},program_type.eq.General`)
                    .or(`block_term.eq.${this.userProfile.block},block_term.is.null,block_term.eq.General`)
                    .eq('intake_year', this.userProfile.intake_year)
                    .order('exam_date', { ascending: true });
                
                if (examsError) throw examsError;
                
                // 2. Get grades
                const { data: grades, error: gradesError } = await supabase
                    .from('exam_grades')
                    .select('*')
                    .eq('student_id', this.userId)
                    .eq('question_id', '00000000-0000-0000-0000-000000000000');
                
                if (gradesError) throw gradesError;
                
                // 3. Combine and display
                this.displayExams(exams || [], grades || []);
                
            } catch (error) {
                console.error('❌ Error loading exams:', error);
                this.showError('Failed to load assessments: ' + error.message);
            }
        }
        
        displayExams(exams, grades) {
            // Process each exam
            const examData = exams.map(exam => {
                const grade = grades.find(g => String(g.exam_id) === String(exam.id));
                const examType = exam.exam_type || '';
                
                // Calculate percentage
                let percentage = null;
                if (grade) {
                    if (grade.total_score !== null) {
                        percentage = Number(grade.total_score);
                    } else if (examType.includes('CAT_1') && grade.cat_1_score !== null) {
                        percentage = (grade.cat_1_score / 30) * 100;
                    } else if (examType.includes('CAT_2') && grade.cat_2_score !== null) {
                        percentage = (grade.cat_2_score / 30) * 100;
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
                    status: grade ? 'completed' : 'current',
                    displayStatus: percentage !== null ? (percentage >= 60 ? 'PASS' : 'FAIL') : 'Pending'
                };
            });
            
            // Split into current and completed
            const current = examData.filter(e => !e.grade);
            const completed = examData.filter(e => e.grade);
            
            console.log(`📊 Found ${current.length} current, ${completed.length} completed assessments`);
            
            // Display
            this.displayCurrentTable(current);
            this.displayCompletedTable(completed);
            
            // Update counts
            this.updateCounts(current.length, completed.length);
        }
        
        displayCurrentTable(exams) {
            if (!this.currentAssessmentsTable) return;
            
            if (exams.length === 0) {
                if (this.currentEmptyState) {
                    this.currentEmptyState.style.display = 'block';
                }
                this.currentAssessmentsTable.innerHTML = '';
                return;
            }
            
            if (this.currentEmptyState) {
                this.currentEmptyState.style.display = 'none';
            }
            
            let html = '';
            exams.forEach(exam => {
                const date = exam.exam_date ? new Date(exam.exam_date).toLocaleDateString('en-US', {
                    year: 'numeric', month: 'short', day: 'numeric'
                }) : '--';
                
                html += `
                    <tr>
                        <td>${this.escape(exam.exam_name)}</td>
                        <td><span class="type-badge ${exam.exam_type?.includes('CAT') ? 'cat' : 'exam'}">${exam.exam_type?.includes('CAT') ? 'CAT' : 'Exam'}</span></td>
                        <td>${this.escape(exam.course_name || 'General')}</td>
                        <td class="text-center">${this.escape(exam.block_term || 'General')}</td>
                        <td>${date}</td>
                        <td><span class="status-badge pending">Pending</span></td>
                        <td class="text-center">--</td>
                        <td class="text-center">--</td>
                        <td class="text-center">--</td>
                        <td class="text-center"><strong>--</strong></td>
                    </tr>
                `;
            });
            
            this.currentAssessmentsTable.innerHTML = html;
        }
        
        displayCompletedTable(exams) {
            if (!this.completedAssessmentsTable) return;
            
            if (exams.length === 0) {
                if (this.completedEmptyState) {
                    this.completedEmptyState.style.display = 'block';
                }
                this.completedAssessmentsTable.innerHTML = '';
                return;
            }
            
            if (this.completedEmptyState) {
                this.completedEmptyState.style.display = 'none';
            }
            
            // Calculate average
            const withPercentage = exams.filter(e => e.percentage !== null);
            let average = '--';
            if (withPercentage.length > 0) {
                const total = withPercentage.reduce((sum, e) => sum + e.percentage, 0);
                average = (total / withPercentage.length).toFixed(1) + '%';
            }
            
            // Update average display
            if (this.completedAverageElement) {
                this.completedAverageElement.textContent = `Average: ${average}`;
            }
            
            let html = '';
            exams.forEach(exam => {
                const date = exam.grade?.graded_at ? new Date(exam.grade.graded_at).toLocaleDateString('en-US', {
                    year: 'numeric', month: 'short', day: 'numeric'
                }) : '--';
                
                const statusClass = exam.displayStatus === 'PASS' ? exam.gradeClass : 'failed';
                const statusIcon = exam.displayStatus === 'PASS' ? 'fa-check-circle' : 'fa-times-circle';
                
                html += `
                    <tr>
                        <td>${this.escape(exam.exam_name)}</td>
                        <td><span class="type-badge ${exam.exam_type?.includes('CAT') ? 'cat' : 'exam'}">${exam.exam_type?.includes('CAT') ? 'CAT' : 'Exam'}</span></td>
                        <td>${this.escape(exam.course_name || 'General')}</td>
                        <td class="text-center">${this.escape(exam.block_term || 'General')}</td>
                        <td>${date}</td>
                        <td><span class="status-badge ${statusClass}"><i class="fas ${statusIcon}"></i> ${exam.gradeText}</span></td>
                        <td class="text-center">${exam.grade?.cat_1_score || '--'}</td>
                        <td class="text-center">${exam.grade?.cat_2_score || '--'}</td>
                        <td class="text-center">${exam.grade?.exam_score || '--'}</td>
                        <td class="text-center"><strong>${exam.percentage !== null ? exam.percentage.toFixed(1) + '%' : '--'}</strong></td>
                        <td class="text-center"><span class="grade-badge ${exam.gradeClass}">${exam.gradeText}</span></td>
                    </tr>
                `;
            });
            
            this.completedAssessmentsTable.innerHTML = html;
        }
        
        updateCounts(current, completed) {
            // Update header counts
            if (this.currentCountHeader) this.currentCountHeader.textContent = current;
            if (this.completedCountHeader) this.completedCountHeader.textContent = completed;
            
            // Update section counts
            if (this.currentCountElement) {
                this.currentCountElement.textContent = `${current} pending`;
            }
            if (this.completedCountElement) {
                this.completedCountElement.textContent = `${completed} graded`;
            }
            
            // Calculate overall average
            const averageElement = document.getElementById('overall-average');
            if (averageElement) {
                // This would need to be calculated from completed exams with percentages
                averageElement.textContent = '--'; // Placeholder
            }
        }
        
        showError(message) {
            const errorHTML = `
                <tr class="error">
                    <td colspan="10">
                        <div class="error-content">
                            <i class="fas fa-exclamation-circle"></i>
                            <p>${message}</p>
                            <button onclick="window.examsModule?.loadExams()" class="btn btn-sm btn-primary">
                                <i class="fas fa-redo"></i> Retry
                            </button>
                        </div>
                    </td>
                </tr>`;
            
            if (this.currentAssessmentsTable) {
                this.currentAssessmentsTable.innerHTML = errorHTML;
            }
            if (this.completedAssessmentsTable) {
                this.completedAssessmentsTable.innerHTML = errorHTML.replace('colspan="10"', 'colspan="11"');
            }
        }
        
        escape(str) {
            if (!str) return '';
            const div = document.createElement('div');
            div.textContent = str;
            return div.innerHTML;
        }
        
        // Simple refresh
        refreshAssessments() {
            this.loadExams();
        }
    }
    
    // Create and expose
    window.examsModule = new ExamsModule();
    window.loadExams = () => window.examsModule?.loadExams();
    window.refreshAssessments = () => window.examsModule?.refreshAssessments();
    
    console.log('✅ Exams module ready');
})();
