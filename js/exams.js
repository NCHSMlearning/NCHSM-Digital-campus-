// js/exams.js - PROFESSIONAL VERSION
(function() {
    'use strict';
    
    console.log('📚 Exams Module - Professional Version');
    
    // UTILITY FUNCTIONS
    const Utils = {
        // Get user ID from all possible sources
        getUserId() {
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
            
            console.warn('⚠️ No user ID found, checking localStorage...');
            const storedId = localStorage.getItem('userId') || 
                            localStorage.getItem('user_id') ||
                            localStorage.getItem('currentUserId');
            
            return storedId ? String(storedId) : null;
        },
        
        // Get profile from all possible sources
        getProfile() {
            let profile = {};
            
            // Check all possible profile locations
            const profileSources = [
                window.db?.currentUserProfile,
                window.currentUserProfile,
                window.userProfile,
                window.user?.profile,
                window.auth?.user
            ];
            
            for (const source of profileSources) {
                if (source && typeof source === 'object') {
                    console.log('✅ Found profile in source');
                    profile = { ...profile, ...source };
                    break;
                }
            }
            
            // Try localStorage as fallback
            if (!profile.program || !profile.intake_year) {
                try {
                    const stored = localStorage.getItem('userProfile');
                    if (stored) {
                        const storedProfile = JSON.parse(stored);
                        profile = { ...profile, ...storedProfile };
                    }
                } catch (e) {
                    console.log('No valid profile in localStorage');
                }
            }
            
            console.log('📋 Profile data found:', {
                program: profile.program,
                intake_year: profile.intake_year,
                block: profile.block
            });
            
            return profile;
        },
        
        // Extract and validate profile fields
        extractProfileFields(profile) {
            return {
                program: this.ensureString(profile.program || profile.department || profile.program_type),
                intake_year: this.ensureString(profile.intake_year || profile.intakeYear || profile.year),
                block: this.ensureString(profile.block || profile.term || profile.semester),
                department: this.ensureString(profile.department || profile.program),
                // Include all original data
                ...profile
            };
        },
        
        ensureString(value) {
            if (value === null || value === undefined) return '';
            return String(value).trim();
        },
        
        getSupabase() {
            return window.db?.supabase || null;
        },
        
        showToast(message, type = 'info') {
            if (window.AppUtils?.showToast) {
                window.AppUtils.showToast(message, type);
            } else {
                console.log(`[${type.toUpperCase()}] ${message}`);
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
                completedEmpty: document.getElementById('completed-empty'),
                currentCount: document.getElementById('current-count'),
                completedCount: document.getElementById('completed-count'),
                averageScore: document.getElementById('completed-average'),
                
                // Header stats
                currentHeader: document.getElementById('current-assessments-count'),
                completedHeader: document.getElementById('completed-assessments-count'),
                overallAverage: document.getElementById('overall-average'),
                
                // Performance summary
                bestScore: document.getElementById('best-score'),
                lowestScore: document.getElementById('lowest-score'),
                passRate: document.getElementById('pass-rate'),
                distinctionCount: document.getElementById('distinction-count'),
                creditCount: document.getElementById('credit-count'),
                passCount: document.getElementById('pass-count'),
                failCount: document.getElementById('fail-count')
            };
        }
        
        async init() {
            console.log('🔄 Initializing exams manager...');
            
            // 1. Load user data
            await this.loadUserData();
            
            // 2. Setup event listeners
            this.setupEventListeners();
            
            // 3. Load exams
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
                intakeYear: this.userProfile.intake_year,
                block: this.userProfile.block
            });
            
            // Save to localStorage for future use
            this.saveUserData();
        }
        
        saveUserData() {
            try {
                if (this.userId) {
                    localStorage.setItem('exams_userId', this.userId);
                }
                if (this.userProfile.program || this.userProfile.intake_year) {
                    localStorage.setItem('exams_userProfile', JSON.stringify({
                        program: this.userProfile.program,
                        intake_year: this.userProfile.intake_year,
                        block: this.userProfile.block,
                        timestamp: new Date().toISOString()
                    }));
                }
            } catch (e) {
                console.warn('Could not save user data to localStorage');
            }
        }
        
        validateUserData() {
            const isValid = this.userId && 
                          this.userProfile.program && 
                          this.userProfile.intake_year;
            
            console.log('✅ User data validation:', {
                isValid,
                hasUserId: !!this.userId,
                hasProgram: !!this.userProfile.program,
                hasIntakeYear: !!this.userProfile.intake_year
            });
            
            return isValid;
        }
        
        showDataError() {
            const message = !this.userId ? 'User not logged in' :
                          !this.userProfile.program ? 'Program not set in profile' :
                          !this.userProfile.intake_year ? 'Intake year not set in profile' :
                          'Profile data incomplete';
            
            console.error('❌ Profile error:', message);
            
            this.showError(message);
            Utils.showToast('Please complete your profile to view assessments', 'warning');
        }
        
        async loadExams() {
            console.log('📥 Loading assessments...');
            
            this.showLoading();
            
            try {
                const supabase = Utils.getSupabase();
                if (!supabase) throw new Error('Database connection unavailable');
                
                const { program, intake_year, block } = this.userProfile;
                
                console.log('🔍 Querying for:', { program, intake_year, block, userId: this.userId });
                
                // Fetch exams
                const { data: exams, error: examsError } = await supabase
                    .from('exams_with_courses')
                    .select('*')
                    .or(`program_type.eq.${program},program_type.eq.General`)
                    .or(`block_term.eq.${block},block_term.is.null,block_term.eq.General`)
                    .eq('intake_year', intake_year)
                    .order('exam_date', { ascending: true });
                
                if (examsError) throw examsError;
                
                // Fetch grades
                const { data: grades, error: gradesError } = await supabase
                    .from('exam_grades')
                    .select('*')
                    .eq('student_id', this.userId)
                    .eq('question_id', '00000000-0000-0000-0000-000000000000')
                    .order('graded_at', { ascending: false });
                
                if (gradesError) throw gradesError;
                
                console.log(`📊 Found ${exams?.length || 0} exams, ${grades?.length || 0} grades`);
                
                // Process data
                this.processExams(exams || [], grades || []);
                
            } catch (error) {
                console.error('❌ Failed to load exams:', error);
                this.showError(`Error loading assessments: ${error.message}`);
                Utils.showToast('Failed to load assessments', 'error');
            }
        }
        
        processExams(exams, grades) {
            this.exams = exams.map(exam => {
                const grade = grades.find(g => String(g.exam_id) === String(exam.id));
                
                // Calculate score
                const score = this.calculateScore(exam, grade);
                
                // Determine status
                const isCompleted = !!grade;
                const hasScore = score !== null;
                const passed = hasScore && score >= 60;
                
                // Get grade classification
                const gradeInfo = this.calculateGrade(score);
                
                return {
                    ...exam,
                    grade,
                    score,
                    isCompleted,
                    passed,
                    gradeText: gradeInfo.grade,
                    gradeClass: gradeInfo.class,
                    dateGraded: grade?.graded_at,
                    cat1Score: grade?.cat_1_score,
                    cat2Score: grade?.cat_2_score,
                    examScore: grade?.exam_score
                };
            });
            
            // Display results
            this.displayResults();
            this.updateStatistics();
            
            console.log('✅ Assessments processed successfully');
            Utils.showToast('Assessments loaded', 'success');
        }
        
        calculateScore(exam, grade) {
            if (!grade) return null;
            
            const examType = exam.exam_type || '';
            
            // Use total_score if available
            if (grade.total_score !== null && grade.total_score !== undefined) {
                return Number(grade.total_score);
            }
            
            // Calculate based on exam type
            if (examType.includes('CAT_1') && grade.cat_1_score !== null) {
                return (grade.cat_1_score / 30) * 100;
            }
            
            if (examType.includes('CAT_2') && grade.cat_2_score !== null) {
                return (grade.cat_2_score / 30) * 100;
            }
            
            // For exams, calculate from all scores
            if ((examType.includes('EXAM') || examType.includes('Final')) &&
                grade.cat_1_score !== null && grade.cat_2_score !== null && grade.exam_score !== null) {
                const totalMarks = grade.cat_1_score + grade.cat_2_score + grade.exam_score;
                return (totalMarks / 100) * 100;
            }
            
            return null;
        }
        
        calculateGrade(score) {
            if (score === null) return { grade: '--', class: '' };
            
            if (score >= 85) return { grade: 'Distinction', class: 'distinction' };
            if (score >= 70) return { grade: 'Credit', class: 'credit' };
            if (score >= 60) return { grade: 'Pass', class: 'pass' };
            return { grade: 'Fail', class: 'fail' };
        }
        
        displayResults() {
            const current = this.exams.filter(e => !e.isCompleted);
            const completed = this.exams.filter(e => e.isCompleted);
            
            // Display current assessments
            this.displayTable(this.elements.currentTable, current, false);
            this.toggleEmptyState('current', current.length === 0);
            
            // Display completed assessments
            this.displayTable(this.elements.completedTable, completed, true);
            this.toggleEmptyState('completed', completed.length === 0);
            
            // Update counts
            this.updateCounts(current.length, completed.length);
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
                
                const typeBadge = exam.exam_type?.includes('CAT') ? 'cat' : 'exam';
                const typeText = exam.exam_type?.includes('CAT') ? 'CAT' : 'Exam';
                
                const scoreDisplay = exam.score !== null ? `${exam.score.toFixed(1)}%` : '--';
                
                const statusClass = isCompleted 
                    ? (exam.passed ? exam.gradeClass : 'failed')
                    : 'pending';
                
                const statusText = isCompleted 
                    ? (exam.passed ? exam.gradeText : 'Failed')
                    : 'Pending';
                
                const statusIcon = isCompleted 
                    ? (exam.passed ? 'fa-check-circle' : 'fa-times-circle')
                    : 'fa-clock';
                
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
        
        updateCounts(current, completed) {
            // Update section counts
            if (this.elements.currentCount) {
                this.elements.currentCount.textContent = `${current} pending`;
            }
            if (this.elements.completedCount) {
                this.elements.completedCount.textContent = `${completed} graded`;
            }
            
            // Update header counts
            if (this.elements.currentHeader) {
                this.elements.currentHeader.textContent = current;
            }
            if (this.elements.completedHeader) {
                this.elements.completedHeader.textContent = completed;
            }
        }
        
        updateStatistics() {
            const completed = this.exams.filter(e => e.isCompleted && e.score !== null);
            
            if (completed.length === 0) {
                // Reset all stats
                this.resetStatistics();
                return;
            }
            
            // Calculate average
            const totalScore = completed.reduce((sum, exam) => sum + exam.score, 0);
            const averageScore = totalScore / completed.length;
            
            // Update average displays
            if (this.elements.averageScore) {
                this.elements.averageScore.textContent = `Average: ${averageScore.toFixed(1)}%`;
            }
            if (this.elements.overallAverage) {
                this.elements.overallAverage.textContent = `${averageScore.toFixed(1)}%`;
            }
            
            // Calculate best and worst scores
            const scores = completed.map(e => e.score);
            const bestScore = Math.max(...scores);
            const worstScore = Math.min(...scores);
            
            if (this.elements.bestScore) this.elements.bestScore.textContent = `${bestScore.toFixed(1)}%`;
            if (this.elements.lowestScore) this.elements.lowestScore.textContent = `${worstScore.toFixed(1)}%`;
            
            // Calculate pass rate
            const passed = completed.filter(e => e.passed).length;
            const passRate = (passed / completed.length) * 100;
            if (this.elements.passRate) this.elements.passRate.textContent = `${passRate.toFixed(0)}%`;
            
            // Calculate grade distribution
            const gradeCounts = {
                distinction: completed.filter(e => e.score >= 85).length,
                credit: completed.filter(e => e.score >= 70 && e.score < 85).length,
                pass: completed.filter(e => e.score >= 60 && e.score < 70).length,
                fail: completed.filter(e => e.score < 60).length
            };
            
            if (this.elements.distinctionCount) this.elements.distinctionCount.textContent = gradeCounts.distinction;
            if (this.elements.creditCount) this.elements.creditCount.textContent = gradeCounts.credit;
            if (this.elements.passCount) this.elements.passCount.textContent = gradeCounts.pass;
            if (this.elements.failCount) this.elements.failCount.textContent = gradeCounts.fail;
        }
        
        resetStatistics() {
            const elements = [
                this.elements.averageScore,
                this.elements.overallAverage,
                this.elements.bestScore,
                this.elements.lowestScore,
                this.elements.passRate,
                this.elements.distinctionCount,
                this.elements.creditCount,
                this.elements.passCount,
                this.elements.failCount
            ];
            
            elements.forEach(el => {
                if (el) el.textContent = '--';
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
        
        setupEventListeners() {
            // Refresh button
            const refreshBtn = document.getElementById('refresh-assessments');
            if (refreshBtn) {
                refreshBtn.addEventListener('click', () => this.loadExams());
            }
            
            // Filter buttons
            const filterButtons = {
                'view-all-assessments': 'all',
                'view-current-only': 'current',
                'view-completed-only': 'completed'
            };
            
            Object.entries(filterButtons).forEach(([id, filter]) => {
                const button = document.getElementById(id);
                if (button) {
                    button.addEventListener('click', () => this.applyFilter(filter));
                }
            });
        }
        
        applyFilter(filter) {
            this.currentFilter = filter;
            
            // Update button states
            document.querySelectorAll('.quick-actions .action-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            
            const activeButton = document.getElementById(
                filter === 'current' ? 'view-current-only' :
                filter === 'completed' ? 'view-completed-only' :
                'view-all-assessments'
            );
            
            if (activeButton) {
                activeButton.classList.add('active');
            }
            
            // Show/hide sections
            const currentSection = document.querySelector('.current-section');
            const completedSection = document.querySelector('.completed-section');
            
            if (currentSection && completedSection) {
                switch(filter) {
                    case 'current':
                        currentSection.style.display = 'block';
                        completedSection.style.display = 'none';
                        break;
                    case 'completed':
                        currentSection.style.display = 'none';
                        completedSection.style.display = 'block';
                        break;
                    default:
                        currentSection.style.display = 'block';
                        completedSection.style.display = 'block';
                }
            }
            
            // Re-display results with filter
            this.displayResults();
        }
        
        escapeHtml(str) {
            if (!str) return '';
            const div = document.createElement('div');
            div.textContent = str;
            return div.innerHTML;
        }
        
        // Public methods
        refresh() {
            this.loadExams();
        }
    }
    
    // Initialize and expose
    window.examsManager = new ExamsManager();
    
    // Global functions for backward compatibility
    window.loadExams = () => window.examsManager?.refresh();
    window.refreshAssessments = () => window.examsManager?.refresh();
    
    console.log('✅ Exams Manager Ready');
})();
