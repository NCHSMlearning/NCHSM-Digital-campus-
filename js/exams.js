// js/exams.js - FINAL WORKING VERSION WITH TYPE FIXES
(function() {
    'use strict';
    
    console.log('📚 Exams Module - Type Fixed Version');
    
    // UTILITY FUNCTIONS
    const Utils = {
        getUserId() {
            // Try multiple sources
            const sources = [
                window.db?.currentUserId,
                window.currentUserId,
                window.userId,
                window.user?.id,
                window.auth?.user?.id,
                window.db?.currentUserProfile?.user_id,
                window.db?.currentUserProfile?.id
            ];
            
            for (const source of sources) {
                if (source) {
                    console.log('✅ Found user ID:', source);
                    return String(source);
                }
            }
            
            return null;
        },
        
        getProfile() {
            let profile = {};
            
            // Primary source
            if (window.db?.currentUserProfile) {
                profile = window.db.currentUserProfile;
            } else if (window.currentUserProfile) {
                profile = window.currentUserProfile;
            } else if (window.userProfile) {
                profile = window.userProfile;
            }
            
            console.log('📋 Profile raw data:', {
                program: profile.program,
                intake_year: profile.intake_year,
                block: profile.block
            });
            
            return profile;
        },
        
        // CRITICAL FIX: Ensure intake_year is a valid number
        extractProfileFields(profile) {
            // Get program - ensure it's a non-empty string
            let program = String(profile.program || profile.department || '').trim();
            
            // Get intake_year - ensure it's a valid number
            let intakeYear = profile.intake_year || profile.intakeYear || profile.year || '';
            intakeYear = String(intakeYear).trim();
            
            // Validate intake_year is a number
            if (intakeYear && !/^\d+$/.test(intakeYear)) {
                console.warn('⚠️ Invalid intake_year format, extracting numbers only:', intakeYear);
                intakeYear = intakeYear.replace(/\D/g, '');
            }
            
            // Get block
            let block = String(profile.block || profile.term || profile.semester || '').trim();
            
            console.log('✨ Processed profile:', { program, intakeYear, block });
            
            return {
                program: program,
                intake_year: intakeYear, // This should be a string of numbers like "2025"
                block: block,
                department: String(profile.department || profile.program || ''),
                // Include all original data
                ...profile
            };
        },
        
        getSupabase() {
            return window.db?.supabase || null;
        },
        
        showToast(message, type = 'info') {
            if (window.AppUtils?.showToast) {
                window.AppUtils.showToast(message, type);
            }
        }
    };
    
    class ExamsManager {
        constructor() {
            console.log('🎓 Exams Manager Initializing...');
            
            this.userId = null;
            this.userProfile = null;
            this.exams = [];
            this.currentFilter = 'all';
            
            // Cache DOM elements
            this.elements = this.cacheElements();
            
            // Initialize
            this.init();
        }
        
        cacheElements() {
            return {
                currentTable: document.getElementById('current-assessments-table'),
                completedTable: document.getElementById('completed-assessments-table'),
                currentEmpty: document.getElementById('current-empty'),
                completedEmpty: document.getElementById('completed-empty')
            };
        }
        
        async init() {
            console.log('🔄 Initializing exams manager...');
            
            // 1. Load user data
            await this.loadUserData();
            
            // 2. Load exams if data is valid
            if (this.validateUserData()) {
                await this.loadExams();
            } else {
                this.showDataError();
            }
        }
        
        async loadUserData() {
            console.log('👤 Loading user data...');
            
            // Get user ID
            this.userId = Utils.getUserId();
            
            // Get profile
            const rawProfile = Utils.getProfile();
            this.userProfile = Utils.extractProfileFields(rawProfile);
            
            console.log('📊 User data loaded:', {
                userId: this.userId,
                program: this.userProfile.program,
                intake_year: this.userProfile.intake_year,
                block: this.userProfile.block
            });
        }
        
        validateUserData() {
            // Check if we have valid data
            const hasUserId = !!this.userId;
            const hasProgram = !!this.userProfile.program && this.userProfile.program.trim().length > 0;
            const hasIntakeYear = !!this.userProfile.intake_year && /^\d+$/.test(this.userProfile.intake_year);
            
            console.log('✅ Validation:', {
                hasUserId,
                hasProgram,
                hasIntakeYear,
                program: this.userProfile.program,
                intake_year: this.userProfile.intake_year
            });
            
            return hasUserId && hasProgram && hasIntakeYear;
        }
        
        showDataError() {
            let message = 'Profile data incomplete: ';
            if (!this.userId) message += 'User ID missing. ';
            if (!this.userProfile.program || this.userProfile.program.trim().length === 0) message += 'Program missing. ';
            if (!this.userProfile.intake_year || !/^\d+$/.test(this.userProfile.intake_year)) message += 'Intake year invalid. ';
            
            console.error('❌', message);
            this.showError(message.trim());
        }
        
        async loadExams() {
            console.log('📥 Loading assessments...');
            
            this.showLoading();
            
            try {
                const supabase = Utils.getSupabase();
                if (!supabase) {
                    throw new Error('Database connection unavailable');
                }
                
                const { program, intake_year, block } = this.userProfile;
                
                console.log('🔍 Querying exams with:', {
                    program,
                    intake_year,
                    block,
                    userId: this.userId
                });
                
                // FIXED: Build query safely
                let query = supabase
                    .from('exams_with_courses')
                    .select('*');
                
                // Add program filter
                if (program && program.trim()) {
                    query = query.or(`program_type.eq.${program.trim()},program_type.eq.General`);
                } else {
                    query = query.or('program_type.eq.General');
                }
                
                // Add block filter
                if (block && block.trim()) {
                    query = query.or(`block_term.eq.${block.trim()},block_term.is.null,block_term.eq.General`);
                } else {
                    query = query.or('block_term.is.null,block_term.eq.General');
                }
                
                // Add intake year filter - MUST be a valid number
                if (intake_year && /^\d+$/.test(intake_year)) {
                    query = query.eq('intake_year', parseInt(intake_year, 10));
                } else {
                    console.warn('⚠️ Skipping intake_year filter - invalid value:', intake_year);
                }
                
                // Order by date
                query = query.order('exam_date', { ascending: true });
                
                // Execute query
                const { data: exams, error: examsError } = await query;
                
                if (examsError) {
                    console.error('❌ Exams query error:', examsError);
                    throw examsError;
                }
                
                console.log(`✅ Found ${exams?.length || 0} exams`);
                
                // Fetch grades
                const { data: grades, error: gradesError } = await supabase
                    .from('exam_grades')
                    .select('*')
                    .eq('student_id', this.userId)
                    .eq('question_id', '00000000-0000-0000-0000-000000000000')
                    .order('graded_at', { ascending: false });
                
                if (gradesError) {
                    console.error('❌ Grades query error:', gradesError);
                    throw gradesError;
                }
                
                console.log(`✅ Found ${grades?.length || 0} grades`);
                
                // Process and display
                this.processExams(exams || [], grades || []);
                
            } catch (error) {
                console.error('❌ Failed to load exams:', error);
                
                let errorMessage = 'Error loading assessments';
                if (error.message) {
                    errorMessage += ': ' + error.message;
                }
                if (error.code === '22P02') {
                    errorMessage = 'Database error: Invalid intake year format. Please check your profile.';
                }
                
                this.showError(errorMessage);
                Utils.showToast('Failed to load assessments', 'error');
            }
        }
        
        processExams(exams, grades) {
            // Process each exam
            const processedExams = exams.map(exam => {
                const grade = grades.find(g => {
                    if (!g || !g.exam_id) return false;
                    return String(g.exam_id) === String(exam.id);
                });
                
                // Calculate score
                let score = null;
                if (grade) {
                    // Try total_score first
                    if (grade.total_score !== null && grade.total_score !== undefined) {
                        score = parseFloat(grade.total_score);
                    } else {
                        // Calculate based on exam type
                        const examType = exam.exam_type || '';
                        if (examType.includes('CAT_1') && grade.cat_1_score !== null) {
                            score = (parseFloat(grade.cat_1_score) / 30) * 100;
                        } else if (examType.includes('CAT_2') && grade.cat_2_score !== null) {
                            score = (parseFloat(grade.cat_2_score) / 30) * 100;
                        }
                    }
                }
                
                // Determine grade category
                let gradeText = '--';
                let gradeClass = '';
                if (score !== null) {
                    if (score >= 85) {
                        gradeText = 'Distinction';
                        gradeClass = 'distinction';
                    } else if (score >= 70) {
                        gradeText = 'Credit';
                        gradeClass = 'credit';
                    } else if (score >= 60) {
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
                    score,
                    isCompleted: !!grade,
                    passed: score !== null && score >= 60,
                    gradeText,
                    gradeClass,
                    dateGraded: grade?.graded_at,
                    cat1Score: grade?.cat_1_score,
                    cat2Score: grade?.cat_2_score,
                    examScore: grade?.exam_score
                };
            });
            
            this.exams = processedExams;
            this.displayResults();
            
            console.log('✅ Processed', processedExams.length, 'exams');
            Utils.showToast('Assessments loaded successfully', 'success');
        }
        
        displayResults() {
            const current = this.exams.filter(e => !e.isCompleted);
            const completed = this.exams.filter(e => e.isCompleted);
            
            console.log(`📊 Displaying: ${current.length} current, ${completed.length} completed`);
            
            // Display tables
            this.displayTable(this.elements.currentTable, current, false);
            this.displayTable(this.elements.completedTable, completed, true);
            
            // Show/hide empty states
            this.toggleEmptyState('current', current.length === 0);
            this.toggleEmptyState('completed', completed.length === 0);
        }
        
        displayTable(tableElement, exams, isCompleted) {
            if (!tableElement) return;
            
            if (exams.length === 0) {
                tableElement.innerHTML = '';
                return;
            }
            
            let html = '';
            const colspan = isCompleted ? 11 : 10;
            
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
                
                const typeBadge = exam.exam_type?.includes('CAT') ? 'cat' : 'exam';
                const typeText = exam.exam_type?.includes('CAT') ? 'CAT' : 'Exam';
                
                const scoreDisplay = exam.score !== null ? `${exam.score.toFixed(1)}%` : '--';
                
                let statusClass = 'pending';
                let statusText = 'Pending';
                let statusIcon = 'fa-clock';
                
                if (isCompleted) {
                    statusClass = exam.passed ? exam.gradeClass : 'failed';
                    statusText = exam.passed ? exam.gradeText : 'Failed';
                    statusIcon = exam.passed ? 'fa-check-circle' : 'fa-times-circle';
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
            const element = section === 'current' ? this.elements.currentEmpty : this.elements.completedEmpty;
            if (element) {
                element.style.display = show ? 'block' : 'none';
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
            
            if (this.elements.currentTable) {
                this.elements.currentTable.innerHTML = loadingHTML(10);
            }
            if (this.elements.completedTable) {
                this.elements.completedTable.innerHTML = loadingHTML(11);
            }
        }
        
        showError(message) {
            const errorHTML = (colspan) => `
                <tr class="error">
                    <td colspan="${colspan}">
                        <div class="error-content">
                            <i class="fas fa-exclamation-circle"></i>
                            <p>${message}</p>
                            <button onclick="window.examsManager?.loadExams()" class="btn btn-sm btn-primary">
                                <i class="fas fa-redo"></i> Retry
                            </button>
                        </div>
                    </td>
                </tr>`;
            
            if (this.elements.currentTable) {
                this.elements.currentTable.innerHTML = errorHTML(10);
            }
            if (this.elements.completedTable) {
                this.elements.completedTable.innerHTML = errorHTML(11);
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
    
    // Initialize
    window.examsManager = new ExamsManager();
    
    // Global functions for backward compatibility
    window.loadExams = () => window.examsManager?.refresh();
    window.refreshAssessments = () => window.examsManager?.refresh();
    
    console.log('✅ Exams Manager Ready');
})();
