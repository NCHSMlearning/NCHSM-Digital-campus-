// js/nurseiq.js - COMPLETE ENHANCED VERSION WITH DASHBOARD INTEGRATION
class NurseIQModule {
    constructor() {
        this.userId = null;
        this.studentQuestionBankSearch = null;
        this.nurseiqSearchBtn = null;
        this.clearSearchBtn = null;
        this.loadCourseCatalogBtn = null;
        this.studentQuestionBankLoading = null;
        this.studentQuestionBankContent = null;
        this.currentTestQuestions = [];
        this.currentQuestionIndex = 0;
        this.userTestAnswers = {};
        this.currentCourseForTest = null;
        this.currentCourseQuestions = [];
        this.showAnswersMode = true;
        this.initialized = false;
        this.storageKey = 'nurseiq_user_progress';
        this.lastCourseProgressKey = 'nurseiq_last_course';
        this.currentSessionAnswers = {};
        this.progressVersion = '2.0'; // Updated version for dashboard integration
        this.dashboardMetricsKey = 'nurseiq_dashboard_metrics';
    }
    
    async initializeElements() {
        console.log('🔍 Initializing NurseIQ...');
        await this.waitForElement('#loadCourseCatalogBtn');
        
        this.studentQuestionBankSearch = document.getElementById('studentQuestionBankSearch');
        this.nurseiqSearchBtn = document.getElementById('nurseiqSearchBtn');
        this.clearSearchBtn = document.getElementById('clearSearchBtn');
        this.loadCourseCatalogBtn = document.getElementById('loadCourseCatalogBtn');
        this.studentQuestionBankLoading = document.getElementById('studentQuestionBankLoading');
        this.studentQuestionBankContent = document.getElementById('studentQuestionBankContent');
        
        if (this.studentQuestionBankSearch) {
            let searchTimeout;
            this.studentQuestionBankSearch.addEventListener('input', () => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => this.loadQuestionBankCards(), 300);
            });
            this.studentQuestionBankSearch.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.loadQuestionBankCards();
            });
        }
        
        if (this.nurseiqSearchBtn) {
            this.nurseiqSearchBtn.addEventListener('click', () => this.loadQuestionBankCards());
        }
        if (this.clearSearchBtn) {
            this.clearSearchBtn.addEventListener('click', () => this.clearQuestionBankSearch());
        }
        if (this.loadCourseCatalogBtn) {
            this.loadCourseCatalogBtn.addEventListener('click', () => this.loadQuestionBankCards());
        }
        
        const nurseiqTab = document.querySelector('[data-tab="nurseiq"]');
        if (nurseiqTab) {
            nurseiqTab.addEventListener('click', () => {
                if (!this.initialized) this.loadQuestionBankCards();
            });
        }
        
        console.log('✅ NurseIQ elements initialized');
    }
    
    waitForElement(selector, timeout = 5000) {
        return new Promise((resolve) => {
            const element = document.querySelector(selector);
            if (element) {
                resolve(element);
                return;
            }
            const observer = new MutationObserver(() => {
                const element = document.querySelector(selector);
                if (element) {
                    observer.disconnect();
                    resolve(element);
                }
            });
            observer.observe(document.body, { childList: true, subtree: true });
            setTimeout(() => {
                observer.disconnect();
                resolve(null);
            }, timeout);
        });
    }
    
    getSupabaseClient() {
        return window.supabaseClient || getSupabaseClient();
    }
    
    async initialize() {
        console.log('🚀 Initializing NurseIQ Module...');
        try {
            this.userId = getCurrentUserId();
            await this.initializeElements();
            await this.loadUserProgress();
            await this.loadQuestionBankCards();
            this.initialized = true;
            
            // 🔥 NEW: Update dashboard on initialization
            this.updateDashboardMetrics();
            
            console.log('✅ NurseIQ Module initialized');
        } catch (error) {
            console.error('❌ Failed to initialize:', error);
        }
    }
    
    // FEATURE 1: Save/Load User Progress
    async loadUserProgress() {
        try {
            // Load from localStorage first
            const savedProgress = localStorage.getItem(this.storageKey);
            if (savedProgress) {
                const parsed = JSON.parse(savedProgress);
                // Check if it's the new format with question IDs
                if (parsed.version === this.progressVersion && parsed.answers) {
                    this.userTestAnswers = parsed.answers;
                } else {
                    // Old format - convert
                    this.userTestAnswers = parsed;
                }
                console.log('📊 Loaded saved progress:', Object.keys(this.userTestAnswers).length, 'answered questions');
            }
            
            // Try to load from database if user is logged in
            if (this.userId) {
                const supabase = this.getSupabaseClient();
                if (supabase) {
                    const { data, error } = await supabase
                        .from('user_progress')
                        .select('progress_data')
                        .eq('user_id', this.userId)
                        .single();
                    
                    if (!error && data && data.progress_data) {
                        this.userTestAnswers = { ...this.userTestAnswers, ...data.progress_data };
                        console.log('📊 Loaded progress from database');
                    }
                }
            }
        } catch (error) {
            console.warn('Could not load user progress:', error);
        }
    }
    
    saveUserProgress() {
        try {
            // Save to localStorage with versioning
            const progressData = {
                version: this.progressVersion,
                answers: this.userTestAnswers,
                lastSaved: new Date().toISOString()
            };
            localStorage.setItem(this.storageKey, JSON.stringify(progressData));
            
            // Save last course progress for resuming
            if (this.currentCourseForTest) {
                const lastProgress = {
                    courseId: this.currentCourseForTest.id,
                    courseName: this.currentCourseForTest.name,
                    currentIndex: this.currentQuestionIndex,
                    totalQuestions: this.currentCourseQuestions.length,
                    timestamp: new Date().toISOString()
                };
                localStorage.setItem(this.lastCourseProgressKey, JSON.stringify(lastProgress));
            }
            
            // Save to database if user is logged in
            if (this.userId) {
                this.saveProgressToDatabase();
            }
            
            // 🔥 NEW: Update dashboard metrics whenever progress is saved
            this.updateDashboardMetrics();
            
            console.log('💾 Progress saved and dashboard updated');
        } catch (error) {
            console.warn('Could not save progress:', error);
        }
    }
    
    async saveProgressToDatabase() {
        try {
            const supabase = this.getSupabaseClient();
            if (!supabase) return;
            
            const { error } = await supabase
                .from('user_progress')
                .upsert({
                    user_id: this.userId,
                    progress_data: this.userTestAnswers,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'user_id' });
            
            if (error) throw error;
        } catch (error) {
            console.error('Database save error:', error);
        }
    }
    
    // 🔥 NEW: Dashboard Integration Methods
    
    getNurseIQDashboardMetrics() {
        try {
            // Calculate comprehensive metrics from user progress
            let totalAnswered = 0;
            let totalCorrect = 0;
            let totalQuestionsAttempted = 0;
            let recentActivity = 0; // Last 7 days activity
            const courses = {};
            
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            
            // Process all answered questions
            Object.values(this.userTestAnswers).forEach(answer => {
                if (answer.answered) {
                    totalAnswered++;
                    if (answer.correct) totalCorrect++;
                    
                    // Count recent activity
                    if (answer.timestamp) {
                        const answerDate = new Date(answer.timestamp);
                        if (answerDate >= sevenDaysAgo) {
                            recentActivity++;
                        }
                    }
                    
                    // Track by course
                    if (answer.courseId) {
                        if (!courses[answer.courseId]) {
                            courses[answer.courseId] = {
                                answered: 0,
                                correct: 0,
                                name: answer.courseName || 'Unknown Course'
                            };
                        }
                        courses[answer.courseId].answered++;
                        if (answer.correct) courses[answer.courseId].correct++;
                    }
                }
            });
            
            // Calculate stats
            const accuracy = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0;
            const targetQuestions = 100; // Target for progress bar
            const progress = Math.min(Math.round((totalAnswered / targetQuestions) * 100), 100);
            
            // Calculate study streak
            const streak = this.calculateStudyStreak();
            
            // Get most active course
            let mostActiveCourse = { name: 'None', answered: 0 };
            Object.entries(courses).forEach(([courseId, courseData]) => {
                if (courseData.answered > mostActiveCourse.answered) {
                    mostActiveCourse = {
                        name: courseData.name,
                        answered: courseData.answered,
                        accuracy: courseData.answered > 0 ? Math.round((courseData.correct / courseData.answered) * 100) : 0
                    };
                }
            });
            
            const metrics = {
                totalAnswered,
                totalCorrect,
                accuracy,
                progress,
                recentActivity,
                streak,
                totalCourses: Object.keys(courses).length,
                mostActiveCourse: mostActiveCourse.name !== 'None' ? mostActiveCourse : null,
                lastUpdated: new Date().toISOString()
            };
            
            // Cache for dashboard
            localStorage.setItem(this.dashboardMetricsKey, JSON.stringify(metrics));
            
            return metrics;
        } catch (error) {
            console.error('Error calculating NurseIQ metrics:', error);
            return this.getDefaultDashboardMetrics();
        }
    }
    
    calculateStudyStreak() {
        try {
            // Get all timestamps from answered questions
            const timestamps = [];
            Object.values(this.userTestAnswers).forEach(answer => {
                if (answer.answered && answer.timestamp) {
                    timestamps.push(new Date(answer.timestamp));
                }
            });
            
            if (timestamps.length === 0) return 0;
            
            // Sort dates in descending order
            timestamps.sort((a, b) => b - a);
            
            // Remove duplicate dates (same day)
            const uniqueDates = [];
            timestamps.forEach(date => {
                const dateStr = date.toDateString();
                if (!uniqueDates.includes(dateStr)) {
                    uniqueDates.push(dateStr);
                }
            });
            
            // Calculate streak
            let streak = 0;
            const today = new Date();
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            
            let currentDate = today;
            
            // Check if there was activity today or yesterday
            const todayStr = today.toDateString();
            const yesterdayStr = yesterday.toDateString();
            
            // Start counting from the most recent activity day
            let startDate = null;
            if (uniqueDates.includes(todayStr)) {
                startDate = today;
                streak = 1;
            } else if (uniqueDates.includes(yesterdayStr)) {
                startDate = yesterday;
                streak = 1;
            } else {
                return 0; // No recent activity
            }
            
            // Count consecutive days
            for (let i = 1; i < uniqueDates.length; i++) {
                const checkDate = new Date(startDate);
                checkDate.setDate(checkDate.getDate() - i);
                const checkDateStr = checkDate.toDateString();
                
                if (uniqueDates.includes(checkDateStr)) {
                    streak++;
                } else {
                    break; // Streak broken
                }
            }
            
            return streak;
        } catch (error) {
            console.error('Error calculating streak:', error);
            return 0;
        }
    }
    
    getDefaultDashboardMetrics() {
        return {
            totalAnswered: 0,
            totalCorrect: 0,
            accuracy: 0,
            progress: 0,
            recentActivity: 0,
            streak: 0,
            totalCourses: 0,
            mostActiveCourse: null,
            lastUpdated: new Date().toISOString()
        };
    }
    
    updateDashboardMetrics() {
        try {
            const metrics = this.getNurseIQDashboardMetrics();
            
            // Save to localStorage for dashboard access
            localStorage.setItem(this.dashboardMetricsKey, JSON.stringify(metrics));
            
            // Also dispatch event for dashboard to update in real-time
            this.dispatchDashboardUpdateEvent(metrics);
            
            console.log('📊 Dashboard metrics updated:', metrics);
        } catch (error) {
            console.error('Error updating dashboard metrics:', error);
        }
    }
    
    dispatchDashboardUpdateEvent(metrics) {
        const event = new CustomEvent('nurseiqMetricsUpdated', {
            detail: {
                progress: metrics.progress,
                accuracy: metrics.accuracy,
                totalQuestions: metrics.totalAnswered,
                recentActivity: metrics.recentActivity,
                streak: metrics.streak,
                lastUpdated: metrics.lastUpdated
            }
        });
        document.dispatchEvent(event);
    }
    
    // For dashboard module to get metrics
    static getDashboardMetrics() {
        try {
            const savedMetrics = localStorage.getItem('nurseiq_dashboard_metrics');
            if (savedMetrics) {
                return JSON.parse(savedMetrics);
            }
        } catch (error) {
            console.error('Error getting dashboard metrics:', error);
        }
        return {
            totalAnswered: 0,
            totalCorrect: 0,
            accuracy: 0,
            progress: 0,
            recentActivity: 0,
            streak: 0,
            lastUpdated: new Date().toISOString()
        };
    }
    
    // Rest of your existing methods continue below...
    getLastCourseProgress() {
        try {
            const lastProgress = localStorage.getItem(this.lastCourseProgressKey);
            return lastProgress ? JSON.parse(lastProgress) : null;
        } catch (error) {
            return null;
        }
    }
    
    getCourseUserStats(courseId, questions) {
        const courseQuestions = questions.filter(q => q.course_id === courseId);
        let answered = 0;
        let correct = 0;
        let lastAttempt = null;
        
        // Count answers by question ID
        courseQuestions.forEach(question => {
            const questionAnswer = this.userTestAnswers[question.id];
            if (questionAnswer && questionAnswer.answered) {
                answered++;
                if (questionAnswer.correct) correct++;
                if (questionAnswer.timestamp && (!lastAttempt || new Date(questionAnswer.timestamp) > new Date(lastAttempt))) {
                    lastAttempt = questionAnswer.timestamp;
                }
            }
        });
        
        // Calculate stats
        const accuracy = answered > 0 ? Math.round((correct / answered) * 100) : 0;
        const completion = answered > 0 ? Math.round((answered / courseQuestions.length) * 100) : 0;
        
        // Calculate difficulty stats
        const difficultyStats = {
            easy: 0,
            medium: 0,
            hard: 0
        };
        
        courseQuestions.forEach(question => {
            const difficulty = question.difficulty?.toLowerCase() || 'medium';
            if (difficulty === 'easy') difficultyStats.easy++;
            else if (difficulty === 'hard') difficultyStats.hard++;
            else difficultyStats.medium++;
        });
        
        return {
            answered,
            correct,
            accuracy,
            completion,
            lastAttempt,
            total: courseQuestions.length,
            difficulty: difficultyStats
        };
    }
    
    async loadQuestionBankCards() {
        try {
            console.log('📚 Loading question bank...');
            this.showLoading();
            const supabase = this.getSupabaseClient();
            if (!supabase) throw new Error('No database connection');
            
            const { data: questions, error } = await supabase
                .from('medical_assessments')
                .select(`*, courses (id, course_name, unit_code, color, description)`)
                .eq('is_active', true)
                .eq('is_published', true);
            
            if (error) throw error;
            console.log(`✅ Fetched ${questions?.length || 0} questions`);
            
            const coursesMap = {};
            questions.forEach(question => {
                const courseId = question.course_id || 'general';
                const courseName = question.courses?.course_name || 'General Nursing';
                const unitCode = question.courses?.unit_code || 'KRCHN';
                const courseColor = question.courses?.color || '#4f46e5';
                
                if (!coursesMap[courseId]) {
                    coursesMap[courseId] = {
                        id: courseId,
                        name: courseName,
                        unit_code: unitCode,
                        color: courseColor,
                        description: question.courses?.description || '',
                        questions: [],
                        stats: { total: 0, active: 0, hard: 0, medium: 0, easy: 0, lastUpdated: null },
                        userStats: null
                    };
                }
                
                coursesMap[courseId].questions.push(question);
                coursesMap[courseId].stats.total++;
                coursesMap[courseId].stats.active++;
                
                if (question.difficulty === 'hard') coursesMap[courseId].stats.hard++;
                else if (question.difficulty === 'medium') coursesMap[courseId].stats.medium++;
                else if (question.difficulty === 'easy') coursesMap[courseId].stats.easy++;
                
                if (question.updated_at) {
                    const updatedDate = new Date(question.updated_at);
                    if (!coursesMap[courseId].stats.lastUpdated || updatedDate > coursesMap[courseId].stats.lastUpdated) {
                        coursesMap[courseId].stats.lastUpdated = updatedDate;
                    }
                }
            });
            
            // Calculate user stats for each course
            Object.keys(coursesMap).forEach(courseId => {
                coursesMap[courseId].userStats = this.getCourseUserStats(courseId, coursesMap[courseId].questions);
            });
            
            const coursesArray = Object.values(coursesMap);
            const overallStats = {
                totalCourses: coursesArray.length,
                totalQuestions: questions.length,
                activeQuestions: questions.length,
                activeRate: '100%'
            };
            
            this.displayQuestionBankCards(coursesArray, overallStats);
            
        } catch (error) {
            console.error('❌ Error loading question bank:', error);
            this.showError(`Failed to load: ${error.message || 'Please try again'}`);
        } finally {
            this.hideLoading();
        }
    }
    
    displayQuestionBankCards(courses, overallStats) {
        if (!this.studentQuestionBankContent) return;
        
        const searchTerm = this.studentQuestionBankSearch?.value?.toLowerCase() || '';
        let filteredCourses = courses;
        
        if (searchTerm) {
            filteredCourses = courses.filter(course => 
                course.name.toLowerCase().includes(searchTerm) ||
                course.unit_code.toLowerCase().includes(searchTerm) ||
                course.description.toLowerCase().includes(searchTerm)
            );
        }
        
        function formatDate(date) {
            if (!date) return 'Never';
            if (typeof date === 'string') date = new Date(date);
            const now = new Date();
            const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
            if (diffDays === 0) return 'Today';
            if (diffDays === 1) return 'Yesterday';
            if (diffDays < 7) return `${diffDays} days ago`;
            if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        }
        
        let html = `<div class="question-bank-container">`;
        
        // Check for last course progress
        const lastProgress = this.getLastCourseProgress();
        if (lastProgress) {
            const lastCourse = courses.find(c => c.id === lastProgress.courseId);
            if (lastCourse) {
                const userStats = lastCourse.userStats;
                html += `
                    <div class="resume-card">
                        <div class="resume-header">
                            <i class="fas fa-history"></i>
                            <h3>Continue Where You Left Off</h3>
                        </div>
                        <div class="resume-content">
                            <div class="resume-course">
                                <span class="resume-course-name">${lastCourse.name}</span>
                                <span class="resume-progress">
                                    <i class="fas fa-chart-line"></i> 
                                    Question ${lastProgress.currentIndex + 1} of ${lastProgress.totalQuestions}
                                </span>
                                <div class="resume-stats">
                                    <span class="resume-stat"><i class="fas fa-check-circle"></i> ${userStats.answered}/${userStats.total} answered</span>
                                    <span class="resume-stat"><i class="fas fa-trophy"></i> ${userStats.accuracy}% accuracy</span>
                                </div>
                            </div>
                            <div class="resume-actions">
                                <button onclick="window.startCourseTest('${lastCourse.id}', '${lastCourse.name.replace(/'/g, "\\'")}', ${lastProgress.currentIndex})" 
                                        class="resume-btn btn-primary">
                                    <i class="fas fa-play"></i> Resume Practice
                                </button>
                                <button onclick="window.startCourseTest('${lastCourse.id}', '${lastCourse.name.replace(/'/g, "\\'")}', 0)" 
                                        class="resume-btn btn-secondary">
                                    <i class="fas fa-redo"></i> Start Over
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            }
        }
        
        if (filteredCourses.length === 0) {
            html += `
                <div class="empty-state">
                    <i class="fas fa-search"></i>
                    <h3>No Courses Found</h3>
                    <p>No courses match your search "${searchTerm}". Try a different search term.</p>
                    <button onclick="window.clearQuestionBankSearch()" class="btn btn-primary mt-2">
                        <i class="fas fa-times"></i> Clear Search
                    </button>
                </div>
            `;
        } else {
            html += `<div class="courses-grid">`;
            
            filteredCourses.forEach(course => {
                const courseColor = course.color || '#4f46e5';
                const lastUpdated = formatDate(course.stats.lastUpdated);
                const userStats = course.userStats;
                const hasProgress = userStats.answered > 0;
                
                html += `
                    <div class="course-card">
                        <div class="course-header" style="border-color: ${courseColor}20;">
                            <div class="course-title">
                                <div>
                                    <h3>${course.name}</h3>
                                    <div class="course-subtitle">
                                        <span class="unit-code" style="background: ${courseColor}30; color: ${courseColor};">
                                            ${course.unit_code}
                                        </span>
                                        <span class="question-count">
                                            <i class="fas fa-question-circle"></i> ${course.stats.total} questions
                                        </span>
                                    </div>
                                </div>
                                <div class="course-icon" style="background: ${courseColor};">
                                    <i class="fas fa-book-medical"></i>
                                </div>
                            </div>
                            ${hasProgress ? `
                                <div class="progress-badge" style="background: linear-gradient(135deg, ${courseColor}, ${this.adjustColor(courseColor, -20)});">
                                    <i class="fas fa-chart-line"></i> ${userStats.completion}% Complete
                                </div>
                            ` : `
                                <div class="active-badge">
                                    <i class="fas fa-check-circle"></i> Active Questions
                                </div>
                            `}
                        </div>
                        
                        <div class="course-stats">
                            ${hasProgress ? `
                                <div class="user-progress-section">
                                    <div class="progress-title"><i class="fas fa-chart-bar"></i> Your Progress</div>
                                    <div class="progress-grid">
                                        <div class="progress-item">
                                            <div class="progress-value" style="color: ${courseColor};">${userStats.answered}/${userStats.total}</div>
                                            <div class="progress-label">Answered</div>
                                        </div>
                                        <div class="progress-item">
                                            <div class="progress-value" style="color: #10b981;">${userStats.correct}</div>
                                            <div class="progress-label">Correct</div>
                                        </div>
                                        <div class="progress-item">
                                            <div class="progress-value" style="color: #f59e0b;">${userStats.accuracy}%</div>
                                            <div class="progress-label">Accuracy</div>
                                        </div>
                                        <div class="progress-item">
                                            <div class="progress-value" style="color: #8b5cf6;">${userStats.completion}%</div>
                                            <div class="progress-label">Complete</div>
                                        </div>
                                    </div>
                                </div>
                            ` : ''}
                            
                            <div class="stats-grid">
                                <div class="stat-item">
                                    <div class="stat-value text-primary">${course.stats.total}</div>
                                    <div class="stat-label">TOTAL</div>
                                </div>
                                <div class="stat-item">
                                    <div class="stat-value text-danger">${course.stats.hard}</div>
                                    <div class="stat-label">HARD</div>
                                </div>
                                <div class="stat-item">
                                    <div class="stat-value text-warning">${course.stats.medium}</div>
                                    <div class="stat-label">MEDIUM</div>
                                </div>
                                <div class="stat-item">
                                    <div class="stat-date-label">UPDATED</div>
                                    <div class="stat-date text-primary">${lastUpdated}</div>
                                </div>
                            </div>
                            
                            <button class="start-test-btn" 
                                    onclick="window.startCourseTest('${course.id}', '${course.name.replace(/'/g, "\\'")}', ${hasProgress ? -1 : 0})" 
                                    style="background: linear-gradient(135deg, ${courseColor}, ${this.adjustColor(courseColor, -20)});">
                                <i class="fas fa-play-circle"></i> ${hasProgress ? 'CONTINUE PRACTICE' : 'START PRACTICE TEST'}
                            </button>
                            
                            <div class="quick-stats">
                                <div class="quick-stat">
                                    <div class="quick-value text-success">${course.stats.easy}</div>
                                    <div class="quick-label">Easy</div>
                                </div>
                                <div class="quick-stat">
                                    <div class="quick-value text-warning">${course.stats.medium}</div>
                                    <div class="quick-label">Medium</div>
                                </div>
                                <div class="quick-stat">
                                    <div class="quick-value text-danger">${course.stats.hard}</div>
                                    <div class="quick-label">Hard</div>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            });
            
            html += `</div>`;
        }
        
        html += `</div>`;
        this.studentQuestionBankContent.innerHTML = html;
        console.log('✅ Question bank displayed');
    }
    
    adjustColor(color, amount) {
        let usePound = false;
        if (color[0] === "#") {
            color = color.slice(1);
            usePound = true;
        }
        const num = parseInt(color, 16);
        let r = (num >> 16) + amount;
        if (r > 255) r = 255;
        else if (r < 0) r = 0;
        let b = ((num >> 8) & 0x00FF) + amount;
        if (b > 255) b = 255;
        else if (b < 0) b = 0;
        let g = (num & 0x0000FF) + amount;
        if (g > 255) g = 255;
        else if (g < 0) g = 0;
        return (usePound ? "#" : "") + (g | (b << 8) | (r << 16)).toString(16).padStart(6, '0');
    }
    
    async startCourseTest(courseId, courseName, startIndex = 0) {
        try {
            console.log(`Starting test for course: ${courseName}`);
            this.showLoading();
            
            const { data: questions, error } = await this.getSupabaseClient()
                .from('medical_assessments')
                .select(`*, courses (id, course_name, unit_code, color)`)
                .eq('course_id', courseId)
                .eq('is_active', true)
                .eq('is_published', true)
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            
            console.log(`Fetched ${questions?.length || 0} questions`);
            
            if (!questions || questions.length === 0) {
                this.showNotification('No questions available for this course yet.', 'warning');
                this.loadQuestionBankCards();
                return;
            }
            
            this.currentCourseForTest = { id: courseId, name: courseName };
            this.currentCourseQuestions = questions;
            this.currentSessionAnswers = {};
            
            // Determine starting index
            let actualStartIndex = 0;
            if (startIndex === -1) {
                // Find first unanswered question
                let firstUnanswered = 0;
                for (let i = 0; i < questions.length; i++) {
                    const question = questions[i];
                    const hasAnswered = this.userTestAnswers[question.id]?.answered;
                    if (!hasAnswered) {
                        firstUnanswered = i;
                        break;
                    }
                }
                actualStartIndex = firstUnanswered;
            } else if (startIndex >= 0 && startIndex < questions.length) {
                actualStartIndex = startIndex;
            }
            
            this.currentQuestionIndex = actualStartIndex;
            
            this.displayInteractiveQuestions(courseName, questions);
            
        } catch (error) {
            console.error('Error starting test:', error);
            this.showNotification('Failed to start test. Please try again.', 'error');
            this.loadQuestionBankCards();
        } finally {
            this.hideLoading();
        }
    }
    
    displayInteractiveQuestions(courseName, questions) {
        if (!this.studentQuestionBankContent) return;
        
        const courseColor = questions[0]?.courses?.color || '#4f46e5';
        const userStats = this.getCourseUserStats(this.currentCourseForTest.id, questions);
        
        let html = `
            <div class="interactive-questions-container">
                <div class="questions-header-bar">
                    <div class="header-content">
                        <button onclick="window.loadQuestionBankCards()" class="header-back-btn">
                            <i class="fas fa-arrow-left"></i> Back to Courses
                        </button>
                        
                        <div class="header-course-info">
                            <h2 class="course-name">${courseName}</h2>
                            <p class="practice-mode">Interactive Q&A Practice Mode</p>
                        </div>
                        
                        <div class="header-progress-stats">
                            <div class="progress-stat-top">
                                <div class="progress-label-top">Question</div>
                                <div class="progress-value-top">
                                    <span id="currentQuestionCountTop">${this.currentQuestionIndex + 1}</span>/<span id="totalQuestionsTop">${questions.length}</span>
                                </div>
                            </div>
                            <div class="progress-stat-top">
                                <div class="progress-label-top">Answered</div>
                                <div class="progress-value-top" id="answeredCountTop">${userStats.answered}</div>
                            </div>
                            <div class="progress-stat-top">
                                <div class="progress-label-top">Correct</div>
                                <div class="progress-value-top" id="correctCountTop">${userStats.correct}</div>
                            </div>
                            <div class="progress-stat-top">
                                <div class="progress-label-top">Accuracy</div>
                                <div class="progress-value-top" id="accuracyTop">${userStats.accuracy}%</div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="questions-main-container">
                    <div class="question-panel">
                        <div class="question-header">
                            <div class="question-meta">
                                <span class="question-number-badge">Q${this.currentQuestionIndex + 1}</span>
                                <span class="question-type">Multiple Choice</span>
                                <span class="difficulty-badge difficulty-medium" id="difficultyBadge">Medium</span>
                            </div>
                            
                            <div class="mini-navigation">
                                <button onclick="window.prevQuestion()" class="mini-nav-btn" id="miniPrevBtn" ${this.currentQuestionIndex === 0 ? 'disabled' : ''}>
                                    <i class="fas fa-chevron-left"></i>
                                </button>
                                <div class="mini-dots" id="miniDotsContainer">
                                    ${this.generateMiniDots(questions.length)}
                                </div>
                                <button onclick="window.nextQuestion()" class="mini-nav-btn" id="miniNextBtn" ${this.currentQuestionIndex === questions.length - 1 ? 'disabled' : ''}>
                                    <i class="fas fa-chevron-right"></i>
                                </button>
                            </div>
                        </div>
                        
                        <div class="question-card">
                            <div class="question-text" id="questionText">Loading question...</div>
                        </div>
                        
                        <div class="options-panel">
                            <h3 class="options-title"><i class="fas fa-list-ol"></i> Select Your Answer:</h3>
                            <div id="optionsContainer" class="options-container-improved"></div>
                        </div>
                        
                        <div class="action-buttons-panel">
                            <div class="button-group-left">
                                <button onclick="window.checkAnswer()" id="checkAnswerBtn" class="action-btn primary-action-btn">
                                    <i class="fas fa-check-circle"></i> Check Answer
                                </button>
                                <button onclick="window.resetQuestion()" id="resetBtn" class="action-btn secondary-action-btn">
                                    <i class="fas fa-redo"></i> Reset
                                </button>
                            </div>
                            
                            <div class="button-group-right">
                                <button onclick="window.showAnswer()" id="showAnswerBtn" class="action-btn info-action-btn">
                                    <i class="fas fa-lightbulb"></i> Show Answer
                                </button>
                                <button onclick="window.markForReview()" id="markBtn" class="action-btn warning-action-btn">
                                    <i class="fas fa-flag"></i> <span id="markBtnText">Mark for Review</span>
                                </button>
                            </div>
                        </div>
                        
                        <div class="compact-navigation">
                            <button onclick="window.prevQuestion()" id="prevBtn" class="compact-nav-btn compact-nav-prev">
                                <i class="fas fa-chevron-left"></i> Previous
                            </button>
                            
                            <div class="compact-progress">
                                <div class="compact-progress-bar">
                                    <div class="compact-progress-fill" id="progressFill" style="width: ${Math.round(((this.currentQuestionIndex + 1) / questions.length) * 100)}%;"></div>
                                </div>
                                <span class="compact-progress-text" id="progressPercent">${Math.round(((this.currentQuestionIndex + 1) / questions.length) * 100)}%</span>
                            </div>
                            
                            <button onclick="window.nextQuestion()" id="nextBtn" class="compact-nav-btn compact-nav-next">
                                Next <i class="fas fa-chevron-right"></i>
                            </button>
                            
                            <button onclick="window.finishPractice()" class="compact-nav-btn compact-nav-finish">
                                <i class="fas fa-flag-checkered"></i> Finish
                            </button>
                        </div>
                        
                        <!-- FEATURE 1: Answer & Explanation Section - Now persistent -->
                        <div id="answerRevealSection" class="answer-reveal-section" style="display: none;">
                            <div class="answer-header">
                                <h3><i class="fas fa-check-double"></i> Answer & Explanation</h3>
                                <button onclick="window.hideAnswer()" class="hide-answer-btn">
                                    <i class="fas fa-times"></i> Hide
                                </button>
                            </div>
                            
                            <div class="correct-answer-box">
                                <div class="correct-answer-label">
                                    <i class="fas fa-check-circle"></i> Correct Answer:
                                </div>
                                <div class="correct-answer-text" id="correctAnswerText">Loading...</div>
                            </div>
                            
                            <div class="explanation-box">
                                <div class="explanation-label">
                                    <i class="fas fa-info-circle"></i> Explanation:
                                </div>
                                <div class="explanation-content">
                                    <div class="explanation-text" id="explanationText">Select an option and click "Check Answer" to see the explanation.</div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="stats-panel">
                        <div class="horizontal-nav-card">
                            <h3 class="nav-title"><i class="fas fa-list-ol"></i> Questions Navigator</h3>
                            <div class="horizontal-question-grid" id="questionGridContainer"></div>
                            <div class="grid-controls">
                                <button onclick="window.scrollQuestions('left')" class="grid-scroll-btn">
                                    <i class="fas fa-chevron-left"></i>
                                </button>
                                <button onclick="window.jumpToQuestion()" class="grid-jump-btn">
                                    Jump to Question
                                </button>
                                <button onclick="window.scrollQuestions('right')" class="grid-scroll-btn">
                                    <i class="fas fa-chevron-right"></i>
                                </button>
                            </div>
                        </div>
                        
                        <div class="course-overview-card">
                            <h3 class="overview-title"><i class="fas fa-chart-bar"></i> Course Progress</h3>
                            <div class="overview-stats">
                                <div class="overview-stat">
                                    <div class="overview-value">${userStats.completion}%</div>
                                    <div class="overview-label">Completion</div>
                                </div>
                                <div class="overview-stat">
                                    <div class="overview-value">${userStats.accuracy}%</div>
                                    <div class="overview-label">Accuracy</div>
                                </div>
                                <div class="overview-stat">
                                    <div class="overview-value">${userStats.answered}</div>
                                    <div class="overview-label">Answered</div>
                                </div>
                                <div class="overview-stat">
                                    <div class="overview-value">${questions.length}</div>
                                    <div class="overview-label">Total</div>
                                </div>
                            </div>
                            <div class="progress-bar-container">
                                <div class="progress-bar" style="width: ${userStats.completion}%; background: ${courseColor};"></div>
                            </div>
                        </div>
                        
                        <div class="tips-card">
                            <h3 class="tips-title"><i class="fas fa-graduation-cap"></i> Study Tips</h3>
                            <ul class="tips-list">
                                <li><i class="fas fa-check"></i> Read each question carefully</li>
                                <li><i class="fas fa-check"></i> Review explanations thoroughly</li>
                                <li><i class="fas fa-check"></i> Mark difficult questions</li>
                                <li><i class="fas fa-check"></i> Aim for 80%+ accuracy</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        this.studentQuestionBankContent.innerHTML = html;
        
        setTimeout(() => {
            this.loadCurrentInteractiveQuestion();
            this.updateQuestionGrid();
            this.updateProgressBar();
            this.updateMiniDots();
            this.updateTopProgressStats();
            this.updateNavigationButtons();
        }, 100);
    }
    
    loadCurrentInteractiveQuestion() {
        const question = this.currentCourseQuestions[this.currentQuestionIndex];
        if (!question) return;
        
        const questionText = document.getElementById('questionText');
        if (questionText) {
            questionText.innerHTML = question.question_text || 'Question text not available';
        }
        
        const difficultyBadge = document.getElementById('difficultyBadge');
        if (difficultyBadge) {
            difficultyBadge.textContent = question.difficulty?.toUpperCase() || 'MEDIUM';
            difficultyBadge.classList.remove('difficulty-easy', 'difficulty-medium', 'difficulty-hard');
            if (question.difficulty === 'easy') {
                difficultyBadge.classList.add('difficulty-easy');
            } else if (question.difficulty === 'hard') {
                difficultyBadge.classList.add('difficulty-hard');
            } else {
                difficultyBadge.classList.add('difficulty-medium');
            }
        }
        
        this.loadAnswerOptions(question);
        this.updateCounters();
        this.updateTopProgressStats();
        this.updateNavigationButtons();
        this.updateMarkButton();
        
        // FEATURE 1: Check if we should show answer section from saved answer
        const savedAnswer = this.userTestAnswers[question.id];
        const answerRevealSection = document.getElementById('answerRevealSection');
        
        if (savedAnswer?.answered) {
            // Load saved answer for display
            this.userTestAnswers[this.currentQuestionIndex] = {
                ...savedAnswer,
                selectedOption: savedAnswer.selectedOption,
                selectedOptionIndex: savedAnswer.selectedOptionIndex,
                answered: true,
                correct: savedAnswer.correct
            };
            this.showUserAnswer(this.userTestAnswers[this.currentQuestionIndex]);
            this.showAnswerRevealSection();
        } else {
            if (answerRevealSection) answerRevealSection.style.display = 'none';
            this.resetOptionSelection();
        }
        
        this.highlightCurrentQuestionInGrid();
    }
    
    loadAnswerOptions(question) {
        const optionsContainer = document.getElementById('optionsContainer');
        if (!optionsContainer) return;
        
        let options = [];
        if (question.option_a && question.option_a.trim() !== '') options.push(question.option_a);
        if (question.option_b && question.option_b.trim() !== '') options.push(question.option_b);
        if (question.option_c && question.option_c.trim() !== '') options.push(question.option_c);
        if (question.option_d && question.option_d.trim() !== '') options.push(question.option_d);
        
        if (options.length === 0) options = ['Option A', 'Option B', 'Option C', 'Option D'];
        
        const correctAnswer = question.correct_answer || '';
        const optionLabels = ['A', 'B', 'C', 'D'];
        let optionsHtml = '';
        
        options.forEach((option, index) => {
            if (index >= optionLabels.length) return;
            const optionId = `option-${this.currentQuestionIndex}-${index}`;
            const optionLetter = optionLabels[index];
            const isCorrectAnswer = option === correctAnswer;
            
            optionsHtml += `
                <div class="option-item-improved" data-option-index="${index}" data-is-correct="${isCorrectAnswer}">
                    <div class="option-radio-improved">
                        <input type="radio" id="${optionId}" name="question-${this.currentQuestionIndex}" value="${option}" class="option-input-hidden">
                        <label for="${optionId}" class="option-label-improved">
                            <span class="option-letter-circle">${optionLetter}</span>
                            <span class="option-text-improved">${option}</span>
                        </label>
                    </div>
                </div>
            `;
        });
        
        optionsContainer.innerHTML = optionsHtml;
        
        optionsContainer.querySelectorAll('.option-item-improved').forEach(item => {
            item.addEventListener('click', () => this.selectOption(item));
        });
        
        // Check for saved answer
        const savedAnswer = this.userTestAnswers[question.id];
        if (savedAnswer?.answered) {
            // Find and select the saved option
            optionsContainer.querySelectorAll('.option-item-improved').forEach(item => {
                const optionText = item.querySelector('.option-text-improved')?.textContent || '';
                if (optionText === savedAnswer.selectedOption) {
                    this.selectOption(item);
                }
            });
        }
    }
    
    selectOption(optionItem) {
        this.resetOptionSelection();
        const radioInput = optionItem.querySelector('.option-input-hidden');
        if (radioInput) {
            radioInput.checked = true;
            optionItem.classList.add('selected-improved');
            const optionIndex = optionItem.dataset.optionIndex;
            const optionText = optionItem.querySelector('.option-text-improved')?.textContent || '';
            this.userTestAnswers[this.currentQuestionIndex] = {
                ...this.userTestAnswers[this.currentQuestionIndex],
                selectedOption: optionText,
                selectedOptionIndex: parseInt(optionIndex),
                answered: false
            };
        }
    }
    
    resetOptionSelection() {
        const optionsContainer = document.getElementById('optionsContainer');
        if (!optionsContainer) return;
        optionsContainer.querySelectorAll('.option-item-improved').forEach(item => {
            item.classList.remove('selected-improved', 'correct-improved', 'incorrect-improved');
        });
        // Only clear current session answer if not saved
        const question = this.currentCourseQuestions[this.currentQuestionIndex];
        const savedAnswer = this.userTestAnswers[question.id];
        if (!savedAnswer?.answered) {
            delete this.userTestAnswers[this.currentQuestionIndex];
        }
    }
    
    showUserAnswer(userAnswer) {
        const optionsContainer = document.getElementById('optionsContainer');
        if (!optionsContainer) return;
        
        optionsContainer.querySelectorAll('.option-item-improved').forEach(item => {
            const optionText = item.querySelector('.option-text-improved')?.textContent || '';
            if (optionText === userAnswer.selectedOption) {
                item.classList.add('selected-improved');
                const radioInput = item.querySelector('.option-input-hidden');
                if (radioInput) radioInput.checked = true;
                if (userAnswer.answered) {
                    if (userAnswer.correct) {
                        item.classList.add('correct-improved');
                    } else {
                        item.classList.add('incorrect-improved');
                        // Show correct answer
                        optionsContainer.querySelectorAll('.option-item-improved').forEach(correctItem => {
                            const correctOptionText = correctItem.querySelector('.option-text-improved')?.textContent || '';
                            if (correctOptionText === userAnswer.correctAnswer) {
                                correctItem.classList.add('correct-improved');
                            }
                        });
                    }
                }
            }
        });
    }
    
    checkAnswer() {
        const userAnswer = this.userTestAnswers[this.currentQuestionIndex];
        if (!userAnswer || !userAnswer.selectedOption) {
            this.showNotification('Please select an answer first!', 'warning');
            return;
        }
        
        const question = this.currentCourseQuestions[this.currentQuestionIndex];
        const correctAnswer = question.correct_answer || '';
        const isCorrect = userAnswer.selectedOption === correctAnswer;
        
        // Update current session
        userAnswer.answered = true;
        userAnswer.correct = isCorrect;
        userAnswer.timestamp = new Date().toISOString();
        userAnswer.correctAnswer = correctAnswer;
        userAnswer.courseId = question.course_id;
        userAnswer.courseName = this.currentCourseForTest.name;
        userAnswer.questionText = question.question_text;
        userAnswer.difficulty = question.difficulty;
        
        // Save to permanent storage by question ID
        this.userTestAnswers[question.id] = {
            selectedOption: userAnswer.selectedOption,
            selectedOptionIndex: userAnswer.selectedOptionIndex,
            answered: true,
            correct: isCorrect,
            correctAnswer: correctAnswer,
            timestamp: userAnswer.timestamp,
            questionText: question.question_text,
            courseId: question.course_id,
            courseName: this.currentCourseForTest.name,
            difficulty: question.difficulty
        };
        
        this.showUserAnswer(userAnswer);
        this.updateCounters();
        this.updateTopProgressStats();
        this.showAnswerRevealSection();
        this.updateQuestionGrid();
        this.showFeedbackNotification(isCorrect);
        this.saveUserProgress(); // This now also updates dashboard
        
        if (isCorrect && this.currentQuestionIndex < this.currentCourseQuestions.length - 1) {
            setTimeout(() => this.nextQuestion(), 2000);
        }
    }
    
    showAnswerRevealSection() {
        const answerRevealSection = document.getElementById('answerRevealSection');
        if (!answerRevealSection) return;
        const question = this.currentCourseQuestions[this.currentQuestionIndex];
        if (!question) return;
        const correctAnswer = question.correct_answer || 'Correct answer not available';
        const correctAnswerText = document.getElementById('correctAnswerText');
        if (correctAnswerText) correctAnswerText.textContent = correctAnswer;
        const explanationText = document.getElementById('explanationText');
        if (explanationText) {
            explanationText.innerHTML = question.explanation || '<div class="no-explanation">No detailed explanation available.</div>';
        }
        answerRevealSection.style.display = 'block';
        
        // Save that user has seen the explanation
        this.userTestAnswers[this.currentQuestionIndex] = {
            ...this.userTestAnswers[this.currentQuestionIndex],
            viewed: true
        };
    }
    
    hideAnswer() {
        const answerRevealSection = document.getElementById('answerRevealSection');
        if (answerRevealSection) answerRevealSection.style.display = 'none';
    }
    
    showFeedbackNotification(isCorrect) {
        const notification = document.createElement('div');
        notification.className = `feedback-notification ${isCorrect ? 'success' : 'error'}`;
        notification.innerHTML = `<i class="fas fa-${isCorrect ? 'check-circle' : 'times-circle'}"></i>
                                <span>${isCorrect ? 'Correct! Well done!' : 'Incorrect. Review the explanation.'}</span>`;
        document.querySelector('.questions-main-container')?.appendChild(notification);
        setTimeout(() => {
            notification.classList.add('fade-out');
            setTimeout(() => notification.remove(), 500);
        }, 3000);
    }
    
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `toast toast-${type}`;
        notification.innerHTML = `<i class="fas fa-${type === 'error' ? 'exclamation-circle' : type === 'warning' ? 'exclamation-triangle' : type === 'success' ? 'check-circle' : 'info-circle'}"></i>
                                <span>${message}</span>`;
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 3000);
    }
    
    resetQuestion() {
        const question = this.currentCourseQuestions[this.currentQuestionIndex];
        const savedAnswer = this.userTestAnswers[question.id];
        
        if (savedAnswer?.answered) {
            // Remove from permanent storage
            delete this.userTestAnswers[question.id];
        }
        
        delete this.userTestAnswers[this.currentQuestionIndex];
        this.saveUserProgress(); // This will update dashboard
        
        this.loadCurrentInteractiveQuestion();
        this.updateQuestionGrid();
        this.updateTopProgressStats();
    }
    
    showAnswer() {
        const question = this.currentCourseQuestions[this.currentQuestionIndex];
        if (!question) return;
        const correctAnswer = question.correct_answer || '';
        const optionsContainer = document.getElementById('optionsContainer');
        if (optionsContainer) {
            optionsContainer.querySelectorAll('.option-item-improved').forEach(item => {
                const optionText = item.querySelector('.option-text-improved')?.textContent || '';
                if (optionText === correctAnswer) item.classList.add('correct-improved');
            });
        }
        this.showAnswerRevealSection();
        this.userTestAnswers[this.currentQuestionIndex] = {
            ...this.userTestAnswers[this.currentQuestionIndex],
            viewed: true
        };
    }
    
    markForReview() {
        const currentIndex = this.currentQuestionIndex;
        const question = this.currentCourseQuestions[currentIndex];
        const isMarked = this.userTestAnswers[question.id]?.marked || 
                        this.userTestAnswers[currentIndex]?.marked || 
                        false;
        
        // Save mark status by question ID
        if (question.id) {
            this.userTestAnswers[question.id] = {
                ...this.userTestAnswers[question.id],
                marked: !isMarked,
                timestamp: new Date().toISOString()
            };
        }
        
        this.updateMarkButton();
        this.updateQuestionGrid();
        this.updateMiniDots();
        this.updateTopProgressStats();
        const action = !isMarked ? 'marked for review' : 'unmarked';
        this.showNotification(`Question ${currentIndex + 1} ${action}`, 'info');
        this.saveUserProgress();
    }
    
    updateMarkButton() {
        const markBtn = document.getElementById('markBtn');
        const markBtnText = document.getElementById('markBtnText');
        if (!markBtn || !markBtnText) return;
        
        const question = this.currentCourseQuestions[this.currentQuestionIndex];
        const isMarked = this.userTestAnswers[question.id]?.marked || 
                        this.userTestAnswers[this.currentQuestionIndex]?.marked || 
                        false;
        
        if (isMarked) {
            markBtn.classList.add('marked');
            markBtnText.textContent = 'Unmark Review';
        } else {
            markBtn.classList.remove('marked');
            markBtnText.textContent = 'Mark for Review';
        }
    }
    
    prevQuestion() {
        if (this.currentQuestionIndex > 0) {
            this.currentQuestionIndex--;
            this.loadCurrentInteractiveQuestion();
            this.updateProgressBar();
            this.updateMiniDots();
            this.updateTopProgressStats();
            this.updateNavigationButtons();
        }
    }
    
    nextQuestion() {
        if (this.currentQuestionIndex < this.currentCourseQuestions.length - 1) {
            this.currentQuestionIndex++;
            this.loadCurrentInteractiveQuestion();
            this.updateProgressBar();
            this.updateMiniDots();
            this.updateTopProgressStats();
            this.updateNavigationButtons();
        }
    }
    
    goToQuestion(index) {
        if (index >= 0 && index < this.currentCourseQuestions.length) {
            this.currentQuestionIndex = index;
            this.loadCurrentInteractiveQuestion();
            this.updateProgressBar();
            this.updateMiniDots();
            this.updateTopProgressStats();
            this.updateNavigationButtons();
        }
    }
    
    jumpToQuestion() {
        const inputValue = prompt(`Enter question number (1-${this.currentCourseQuestions.length}):`);
        if (!inputValue) return;
        const questionNum = parseInt(inputValue);
        if (isNaN(questionNum) || questionNum < 1 || questionNum > this.currentCourseQuestions.length) {
            this.showNotification(`Please enter a number between 1 and ${this.currentCourseQuestions.length}`, 'warning');
            return;
        }
        this.goToQuestion(questionNum - 1);
    }
    
    finishPractice() {
        const userStats = this.getCourseUserStats(this.currentCourseForTest.id, this.currentCourseQuestions);
        const answeredCount = userStats.answered;
        const correctCount = userStats.correct;
        const accuracy = userStats.accuracy;
        
        const confirmFinish = confirm(`Finish practice session?\n\nAnswered: ${answeredCount}/${this.currentCourseQuestions.length}\nCorrect: ${correctCount}\nAccuracy: ${accuracy}%\n\nReturn to question bank?`);
        if (confirmFinish) {
            this.saveUserProgress();
            this.loadQuestionBankCards();
        }
    }
    
    scrollQuestions(direction) {
        const gridContainer = document.getElementById('questionGridContainer');
        if (!gridContainer) return;
        const scrollAmount = 300;
        const currentScroll = gridContainer.scrollLeft;
        if (direction === 'left') gridContainer.scrollLeft = currentScroll - scrollAmount;
        else gridContainer.scrollLeft = currentScroll + scrollAmount;
    }
    
    updateCounters() {
        const userStats = this.getCourseUserStats(this.currentCourseForTest.id, this.currentCourseQuestions);
        const answeredCount = userStats.answered;
        const correctCount = userStats.correct;
        const accuracy = userStats.accuracy;
        
        const currentQuestionCountEl = document.getElementById('currentQuestionCountTop');
        const totalQuestionsEl = document.getElementById('totalQuestionsTop');
        const answeredCountEl = document.getElementById('answeredCountTop');
        const correctCountEl = document.getElementById('correctCountTop');
        const accuracyEl = document.getElementById('accuracyTop');
        
        if (currentQuestionCountEl) currentQuestionCountEl.textContent = this.currentQuestionIndex + 1;
        if (totalQuestionsEl) totalQuestionsEl.textContent = this.currentCourseQuestions.length;
        if (answeredCountEl) answeredCountEl.textContent = answeredCount;
        if (correctCountEl) correctCountEl.textContent = correctCount;
        if (accuracyEl) accuracyEl.textContent = `${accuracy}%`;
    }
    
    updateTopProgressStats() {
        this.updateCounters();
    }
    
    updateNavigationButtons() {
        const prevBtn = document.getElementById('prevBtn');
        const nextBtn = document.getElementById('nextBtn');
        const miniPrevBtn = document.getElementById('miniPrevBtn');
        const miniNextBtn = document.getElementById('miniNextBtn');
        
        const isFirst = this.currentQuestionIndex === 0;
        const isLast = this.currentQuestionIndex === this.currentCourseQuestions.length - 1;
        
        [prevBtn, nextBtn, miniPrevBtn, miniNextBtn].forEach(btn => {
            if (btn) {
                btn.disabled = (btn === prevBtn || btn === miniPrevBtn) ? isFirst : isLast;
                btn.classList.toggle('disabled', btn.disabled);
            }
        });
    }
    
    updateProgressBar() {
        const progressFill = document.getElementById('progressFill');
        const progressPercent = document.getElementById('progressPercent');
        if (!progressFill || !progressPercent) return;
        const totalQuestions = this.currentCourseQuestions.length;
        const progress = Math.round(((this.currentQuestionIndex + 1) / totalQuestions) * 100);
        progressFill.style.width = `${progress}%`;
        progressPercent.textContent = `${progress}%`;
    }
    
    updateQuestionGrid() {
        const questionGridContainer = document.getElementById('questionGridContainer');
        if (!questionGridContainer) return;
        const totalQuestions = this.currentCourseQuestions.length;
        let gridHtml = '';
        
        for (let i = 0; i < totalQuestions; i++) {
            const question = this.currentCourseQuestions[i];
            let questionClass = 'grid-question-number';
            if (i === this.currentQuestionIndex) questionClass += ' grid-current';
            
            // Check saved answers by question ID first
            const savedAnswer = this.userTestAnswers[question.id];
            if (savedAnswer) {
                if (savedAnswer.answered) {
                    questionClass += savedAnswer.correct ? ' grid-correct' : ' grid-incorrect';
                } else if (savedAnswer.marked) {
                    questionClass += ' grid-marked';
                } else if (savedAnswer.viewed) {
                    questionClass += ' grid-viewed';
                }
            } else {
                // Check current session answers
                const sessionAnswer = this.userTestAnswers[i];
                if (sessionAnswer) {
                    if (sessionAnswer.answered) {
                        questionClass += sessionAnswer.correct ? ' grid-correct' : ' grid-incorrect';
                    } else if (sessionAnswer.marked) {
                        questionClass += ' grid-marked';
                    } else if (sessionAnswer.viewed) {
                        questionClass += ' grid-viewed';
                    }
                }
            }
            
            const marked = savedAnswer?.marked || this.userTestAnswers[i]?.marked;
            gridHtml += `<div class="${questionClass}" onclick="window.goToQuestion(${i})" title="Question ${i + 1}">
                        ${i + 1}${marked ? '<i class="fas fa-flag grid-flag"></i>' : ''}</div>`;
        }
        
        questionGridContainer.innerHTML = gridHtml;
        this.scrollToCurrentQuestion();
    }
    
    scrollToCurrentQuestion() {
        const questionGridContainer = document.getElementById('questionGridContainer');
        if (!questionGridContainer) return;
        const currentQuestionElement = questionGridContainer.querySelector('.grid-current');
        if (currentQuestionElement) {
            const containerWidth = questionGridContainer.clientWidth;
            const elementOffset = currentQuestionElement.offsetLeft;
            const elementWidth = currentQuestionElement.offsetWidth;
            questionGridContainer.scrollLeft = elementOffset - (containerWidth / 2) + (elementWidth / 2);
        }
    }
    
    highlightCurrentQuestionInGrid() {
        const questionGridContainer = document.getElementById('questionGridContainer');
        if (!questionGridContainer) return;
        questionGridContainer.querySelectorAll('.grid-question-number').forEach(el => {
            el.classList.remove('grid-current');
        });
        const currentQuestionElement = questionGridContainer.querySelector(`[onclick*="goToQuestion(${this.currentQuestionIndex})"]`);
        if (currentQuestionElement) currentQuestionElement.classList.add('grid-current');
    }
    
    updateMiniDots() {
        const miniDotsContainer = document.getElementById('miniDotsContainer');
        if (!miniDotsContainer) return;
        const totalQuestions = this.currentCourseQuestions.length;
        miniDotsContainer.innerHTML = this.generateMiniDots(totalQuestions);
    }
    
    generateMiniDots(totalQuestions) {
        let dotsHtml = '';
        const maxDots = 5;
        let start = Math.max(0, this.currentQuestionIndex - 2);
        let end = Math.min(totalQuestions - 1, start + maxDots - 1);
        if (end - start < maxDots - 1) start = Math.max(0, end - maxDots + 1);
        
        if (start > 0) dotsHtml += '<span class="mini-dot-ellipsis">...</span>';
        
        for (let i = start; i <= end; i++) {
            let dotClass = 'mini-dot';
            if (i === this.currentQuestionIndex) dotClass += ' mini-dot-active';
            
            const question = this.currentCourseQuestions[i];
            const savedAnswer = this.userTestAnswers[question.id];
            
            if (savedAnswer) {
                if (savedAnswer.answered) {
                    dotClass += savedAnswer.correct ? ' mini-dot-correct' : ' mini-dot-incorrect';
                } else if (savedAnswer.marked) {
                    dotClass += ' mini-dot-marked';
                }
            } else {
                const sessionAnswer = this.userTestAnswers[i];
                if (sessionAnswer) {
                    if (sessionAnswer.answered) {
                        dotClass += sessionAnswer.correct ? ' mini-dot-correct' : ' mini-dot-incorrect';
                    } else if (sessionAnswer.marked) {
                        dotClass += ' mini-dot-marked';
                    }
                }
            }
            
            dotsHtml += `<span class="${dotClass}" onclick="window.goToQuestion(${i})">${i + 1}</span>`;
        }
        
        if (end < totalQuestions - 1) dotsHtml += '<span class="mini-dot-ellipsis">...</span>';
        return dotsHtml;
    }
    
    clearQuestionBankSearch() {
        if (this.studentQuestionBankSearch) {
            this.studentQuestionBankSearch.value = '';
            this.loadQuestionBankCards();
        }
    }
    
    showLoading() {
        if (this.studentQuestionBankLoading) this.studentQuestionBankLoading.style.display = 'block';
        if (this.studentQuestionBankContent) {
            this.studentQuestionBankContent.innerHTML = `
                <div class="loading-content">
                    <div class="spinner-container">
                        <div class="spinner"></div>
                        <div class="spinner-ring"></div>
                    </div>
                    <div class="loading-text">Loading question bank...</div>
                </div>
            `;
        }
    }
    
    hideLoading() {
        if (this.studentQuestionBankLoading) this.studentQuestionBankLoading.style.display = 'none';
    }
    
    showError(message) {
        if (this.studentQuestionBankContent) {
            this.studentQuestionBankContent.innerHTML = `
                <div class="error-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>Failed to Load Question Bank</h3>
                    <p>${message}</p>
                    <div class="mt-2">
                        <button onclick="window.loadQuestionBankCards()" class="btn btn-primary mr-2">
                            <i class="fas fa-redo"></i> Try Again
                        </button>
                        <button onclick="window.clearQuestionBankSearch()" class="btn btn-secondary">
                            <i class="fas fa-times"></i> Clear Search
                        </button>
                    </div>
                </div>
            `;
        }
    }
    
    // Helper method to clear all progress (for testing)
    clearAllProgress() {
        if (confirm('Are you sure you want to clear all your progress? This cannot be undone.')) {
            localStorage.removeItem(this.storageKey);
            localStorage.removeItem(this.lastCourseProgressKey);
            localStorage.removeItem(this.dashboardMetricsKey);
            this.userTestAnswers = {};
            this.showNotification('All progress cleared', 'success');
            this.updateDashboardMetrics(); // Update dashboard to show cleared state
            this.loadQuestionBankCards();
        }
    }
}

// Global functions
window.NurseIQModule = NurseIQModule;
window.nurseiqModule = null;

window.initNurseIQ = async function() {
    console.log('🚀 Starting NurseIQ...');
    if (document.readyState === 'loading') {
        await new Promise(resolve => document.addEventListener('DOMContentLoaded', resolve));
    }
    window.nurseiqModule = new NurseIQModule();
    await window.nurseiqModule.initialize();
    return window.nurseiqModule;
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => window.initNurseIQ().catch(console.error), 1000);
    });
} else {
    setTimeout(() => window.initNurseIQ().catch(console.error), 1000);
}

// Global helper functions
window.loadQuestionBankCards = function() {
    if (window.nurseiqModule) window.nurseiqModule.loadQuestionBankCards();
    else window.initNurseIQ().then(() => window.nurseiqModule.loadQuestionBankCards()).catch(console.error);
};

window.clearQuestionBankSearch = function() { 
    if (window.nurseiqModule) window.nurseiqModule.clearQuestionBankSearch(); 
};

window.startCourseTest = function(courseId, courseName, startIndex = 0) { 
    if (window.nurseiqModule) window.nurseiqModule.startCourseTest(courseId, courseName, startIndex); 
};

window.prevQuestion = function() { 
    if (window.nurseiqModule) window.nurseiqModule.prevQuestion(); 
};

window.nextQuestion = function() { 
    if (window.nurseiqModule) window.nurseiqModule.nextQuestion(); 
};

window.goToQuestion = function(index) { 
    if (window.nurseiqModule) window.nurseiqModule.goToQuestion(index); 
};

window.jumpToQuestion = function() { 
    if (window.nurseiqModule) window.nurseiqModule.jumpToQuestion(); 
};

window.checkAnswer = function() { 
    if (window.nurseiqModule) window.nurseiqModule.checkAnswer(); 
};

window.resetQuestion = function() { 
    if (window.nurseiqModule) window.nurseiqModule.resetQuestion(); 
};

window.showAnswer = function() { 
    if (window.nurseiqModule) window.nurseiqModule.showAnswer(); 
};

window.hideAnswer = function() { 
    if (window.nurseiqModule) window.nurseiqModule.hideAnswer(); 
};

window.markForReview = function() { 
    if (window.nurseiqModule) window.nurseiqModule.markForReview(); 
};

window.finishPractice = function() { 
    if (window.nurseiqModule) window.nurseiqModule.finishPractice(); 
};

window.scrollQuestions = function(direction) { 
    if (window.nurseiqModule) window.nurseiqModule.scrollQuestions(direction); 
};

window.clearAllProgress = function() { 
    if (window.nurseiqModule) window.nurseiqModule.clearAllProgress(); 
};

// 🔥 NEW: Dashboard integration helper
window.getNurseIQDashboardMetrics = function() {
    if (window.nurseiqModule) {
        return window.nurseiqModule.getNurseIQDashboardMetrics();
    }
    return NurseIQModule.getDashboardMetrics();
};

console.log('✅ NurseIQ module loaded (Complete Enhanced Version with Dashboard Integration)');
