// js/nurseiq.js - FIXED with horizontal navigation in main panel
class NurseIQModule {
    constructor() {
        this.userId = null;
        
        // NurseIQ elements
        this.studentQuestionBankSearch = null;
        this.nurseiqSearchBtn = null;
        this.clearSearchBtn = null;
        this.loadCourseCatalogBtn = null;
        this.studentQuestionBankLoading = null;
        this.studentQuestionBankContent = null;
        
        // Test state variables
        this.currentTestQuestions = [];
        this.currentQuestionIndex = 0;
        this.userTestAnswers = {};
        this.currentCourseForTest = null;
        this.currentCourseQuestions = [];
        this.showAnswersMode = true;
        
        // Track initialization
        this.initialized = false;
    }
    
    // Initialize elements
    async initializeElements() {
        console.log('🔍 Initializing NurseIQ elements...');
        
        // Wait for elements
        await this.waitForElement('#loadCourseCatalogBtn');
        
        // Cache DOM elements
        this.studentQuestionBankSearch = document.getElementById('studentQuestionBankSearch');
        this.nurseiqSearchBtn = document.getElementById('nurseiqSearchBtn');
        this.clearSearchBtn = document.getElementById('clearSearchBtn');
        this.loadCourseCatalogBtn = document.getElementById('loadCourseCatalogBtn');
        this.studentQuestionBankLoading = document.getElementById('studentQuestionBankLoading');
        this.studentQuestionBankContent = document.getElementById('studentQuestionBankContent');
        
        console.log('📝 Elements found:', {
            loadCourseCatalogBtn: !!this.loadCourseCatalogBtn,
            searchInput: !!this.studentQuestionBankSearch,
            contentArea: !!this.studentQuestionBankContent
        });
        
        // Setup search
        if (this.studentQuestionBankSearch) {
            let searchTimeout;
            this.studentQuestionBankSearch.addEventListener('input', () => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    this.loadQuestionBankCards();
                }, 300);
            });
            
            this.studentQuestionBankSearch.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.loadQuestionBankCards();
                }
            });
        }
        
        // Setup button events
        if (this.nurseiqSearchBtn) {
            this.nurseiqSearchBtn.addEventListener('click', () => {
                this.loadQuestionBankCards();
            });
        }
        
        if (this.clearSearchBtn) {
            this.clearSearchBtn.addEventListener('click', () => {
                this.clearQuestionBankSearch();
            });
        }
        
        if (this.loadCourseCatalogBtn) {
            this.loadCourseCatalogBtn.addEventListener('click', () => {
                this.loadQuestionBankCards();
            });
        }
        
        // Tab click handler
        const nurseiqTab = document.querySelector('[data-tab="nurseiq"]');
        if (nurseiqTab) {
            nurseiqTab.addEventListener('click', () => {
                if (!this.initialized) {
                    this.loadQuestionBankCards();
                }
            });
        }
        
        console.log('✅ NurseIQ elements initialized');
    }
    
    // Wait for element
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
            
            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
            
            setTimeout(() => {
                observer.disconnect();
                console.warn(`⚠️ Timeout waiting for: ${selector}`);
                resolve(null);
            }, timeout);
        });
    }
    
    // Get Supabase client
    getSupabaseClient() {
        return window.supabaseClient || getSupabaseClient();
    }
    
    // Initialize
    async initialize() {
        console.log('🚀 Initializing NurseIQ Module...');
        
        try {
            this.userId = getCurrentUserId();
            await this.initializeElements();
            await this.loadQuestionBankCards();
            this.initialized = true;
            console.log('✅ NurseIQ Module initialized');
        } catch (error) {
            console.error('❌ Failed to initialize:', error);
        }
    }
    
    // Load question bank
    async loadQuestionBankCards() {
        try {
            console.log('📚 Loading question bank...');
            this.showLoading();
            
            const supabase = this.getSupabaseClient();
            if (!supabase) throw new Error('No database connection');
            
            const { data: questions, error } = await supabase
                .from('medical_assessments')
                .select(`
                    *,
                    courses (
                        id,
                        course_name,
                        unit_code,
                        color,
                        description
                    )
                `)
                .eq('is_active', true)
                .eq('is_published', true);
            
            if (error) throw error;
            
            console.log(`✅ Fetched ${questions?.length || 0} questions`);
            
            // Group by course
            const coursesMap = {};
            questions.forEach(question => {
                const courseId = question.course_id || 'general';
                const courseName = question.courses?.course_name || 'General Nursing';
                const unitCode = question.courses?.unit_code || 'KRCHN';
                
                if (!coursesMap[courseId]) {
                    coursesMap[courseId] = {
                        id: courseId,
                        name: courseName,
                        unit_code: unitCode,
                        color: question.courses?.color || '#4f46e5',
                        description: question.courses?.description || '',
                        questions: [],
                        stats: {
                            total: 0,
                            active: 0,
                            hard: 0,
                            medium: 0,
                            easy: 0,
                            lastUpdated: null
                        }
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
    
    // Display question bank cards
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
            const now = new Date();
            const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
            
            if (diffDays === 0) return 'Today';
            if (diffDays === 1) return 'Yesterday';
            if (diffDays < 7) return `${diffDays} days ago`;
            if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        }
        
        let html = `
            <div class="question-bank-container">
                <!-- Debug info -->
                <div class="debug-info" style="background: #f3f4f6; padding: 10px; border-radius: 6px; margin-bottom: 20px; border-left: 4px solid #3b82f6;">
                    <p style="margin: 0; font-size: 14px; color: #6b7280;">
                        <strong>Status:</strong> Loaded ${filteredCourses.length} courses with ${overallStats.totalQuestions} questions
                        ${searchTerm ? ` | Searching: "${searchTerm}"` : ''}
                    </p>
                </div>
                
                <!-- Header Stats -->
                <div class="stats-header">
                    <div class="stats-title">
                        <h2><i class="fas fa-database"></i> Question Bank</h2>
                        <p>Organized by courses with detailed statistics</p>
                    </div>
                    <div class="stats-filter">
                        <i class="fas fa-filter"></i> Showing ${filteredCourses.length} of ${courses.length} courses
                    </div>
                </div>
                
                <!-- Overall Stats Cards -->
                <div class="overall-stats">
                    <div class="stat-card">
                        <div class="stat-number" style="color: #4f46e5;">${overallStats.totalCourses}</div>
                        <div class="stat-label">Total Courses</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number" style="color: #10b981;">${overallStats.totalQuestions}</div>
                        <div class="stat-label">Total Questions</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number" style="color: #0ea5e9;">${overallStats.activeQuestions}</div>
                        <div class="stat-label">Active Questions</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number" style="color: #f59e0b;">${overallStats.activeRate}</div>
                        <div class="stat-label">Active Rate</div>
                    </div>
                </div>
        `;
        
        if (filteredCourses.length === 0) {
            html += `
                <div class="empty-state">
                    <i class="fas fa-search"></i>
                    <h3>No Courses Found</h3>
                    <p>No courses match your search "${searchTerm}". Try a different search term.</p>
                    <button onclick="window.clearQuestionBankSearch()" class="btn-primary" style="margin-top: 20px;">
                        <i class="fas fa-times"></i> Clear Search
                    </button>
                </div>
            `;
        } else {
            html += `<div class="courses-grid">`;
            
            filteredCourses.forEach(course => {
                const courseColor = course.color || '#4f46e5';
                const lastUpdated = formatDate(course.stats.lastUpdated);
                
                html += `
                    <div class="course-card">
                        <div class="course-header" style="background: linear-gradient(135deg, ${courseColor}20, ${courseColor}10); border-bottom: 1px solid ${courseColor}20;">
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
                            <div class="active-badge">
                                <i class="fas fa-check-circle"></i> Active Questions
                            </div>
                        </div>
                        
                        <div class="course-stats">
                            <div class="stats-grid">
                                <div class="stat-item">
                                    <div class="stat-value" style="color: #4f46e5;">${course.stats.active}</div>
                                    <div class="stat-label">ACTIVE</div>
                                </div>
                                <div class="stat-item">
                                    <div class="stat-value" style="color: #ef4444;">${course.stats.hard}</div>
                                    <div class="stat-label">HARD</div>
                                </div>
                                <div class="stat-item">
                                    <div class="stat-value" style="color: #f59e0b;">${course.stats.medium}</div>
                                    <div class="stat-label">MEDIUM</div>
                                </div>
                                <div class="stat-item">
                                    <div class="stat-date-label">UPDATED</div>
                                    <div class="stat-date" style="color: #4f46e5;">${lastUpdated}</div>
                                </div>
                            </div>
                            
                            <button class="start-test-btn" 
                                    onclick="window.startCourseTest('${course.id}', '${course.name.replace(/'/g, "\\'")}')" 
                                    style="background: ${courseColor}; margin-top: 15px; width: 100%; padding: 12px; border: none; border-radius: 8px; color: white; font-weight: 600; cursor: pointer; transition: all 0.3s ease;">
                                <i class="fas fa-play-circle"></i> START PRACTICE TEST
                            </button>
                            
                            <div class="quick-stats">
                                <div class="quick-stat">
                                    <div class="quick-value" style="color: #10b981;">${course.stats.easy}</div>
                                    <div class="quick-label">Easy</div>
                                </div>
                                <div class="quick-stat">
                                    <div class="quick-value" style="color: #f59e0b;">${course.stats.medium}</div>
                                    <div class="quick-label">Medium</div>
                                </div>
                                <div class="quick-stat">
                                    <div class="quick-value" style="color: #ef4444;">${course.stats.hard}</div>
                                    <div class="quick-label">Hard</div>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            });
            
            html += `</div>`;
        }
        
        html += `
                <div class="question-bank-footer">
                    <div class="info-message">
                        <i class="fas fa-info-circle"></i>
                        <span>Click START PRACTICE TEST to begin interactive Q&A with immediate feedback</span>
                    </div>
                </div>
            </div>
        `;
        
        this.studentQuestionBankContent.innerHTML = html;
        console.log('✅ Question bank displayed');
    }
    
    // Start course test
    async startCourseTest(courseId, courseName) {
        try {
            console.log(`Starting test for course: ${courseName}`);
            this.showLoading();
            
            const { data: questions, error } = await this.getSupabaseClient()
                .from('medical_assessments')
                .select(`
                    *,
                    courses (
                        id,
                        course_name,
                        unit_code,
                        color
                    )
                `)
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
            this.currentQuestionIndex = 0;
            this.userTestAnswers = {};
            
            this.displayInteractiveQuestions(courseName, questions);
            
        } catch (error) {
            console.error('Error starting test:', error);
            this.showNotification('Failed to start test. Please try again.', 'error');
            this.loadQuestionBankCards();
        } finally {
            this.hideLoading();
        }
    }
    
    // Display interactive questions - FIXED with horizontal navigation in main panel
    displayInteractiveQuestions(courseName, questions) {
        if (!this.studentQuestionBankContent) return;
        
        const courseColor = questions[0]?.courses?.color || '#4f46e5';
        
        let html = `
            <div class="interactive-questions-container">
                <!-- Top Header Bar -->
                <div class="questions-header-bar" style="background: ${courseColor};">
                    <div class="header-content">
                        <button onclick="window.loadQuestionBankCards()" class="header-back-btn">
                            <i class="fas fa-arrow-left"></i> Back to Courses
                        </button>
                        
                        <div class="header-course-info">
                            <h2 class="course-name">${courseName}</h2>
                            <p class="practice-mode">Interactive Q&A Practice Mode</p>
                        </div>
                    </div>
                </div>
                
                <!-- Main Content -->
                <div class="questions-main-container">
                    <!-- Question Panel -->
                    <div class="question-panel">
                        <!-- Question Header -->
                        <div class="question-header">
                            <div class="question-meta">
                                <span class="question-number-badge" style="background: ${courseColor};">
                                    Q${this.currentQuestionIndex + 1}
                                </span>
                                <span class="question-type">Multiple Choice</span>
                                <div class="difficulty-container">
                                    <span class="difficulty-label">Difficulty:</span>
                                    <span class="difficulty-badge-large" id="difficultyBadge">MEDIUM</span>
                                </div>
                            </div>
                        </div>
                        
                        <!-- HORIZONTAL QUESTION NAVIGATOR - IN MAIN PANEL -->
                        <div class="horizontal-navigator-main">
                            <div class="nav-controls">
                                <button onclick="window.prevQuestion()" class="nav-arrow-btn" id="prevArrowBtn" ${this.currentQuestionIndex === 0 ? 'disabled' : ''}>
                                    <i class="fas fa-chevron-left"></i>
                                </button>
                                
                                <div class="horizontal-dots-container" id="horizontalDots">
                                    ${this.generateHorizontalDots(questions.length)}
                                </div>
                                
                                <button onclick="window.nextQuestion()" class="nav-arrow-btn" id="nextArrowBtn" ${this.currentQuestionIndex === questions.length - 1 ? 'disabled' : ''}>
                                    <i class="fas fa-chevron-right"></i>
                                </button>
                            </div>
                            
                            <div class="nav-info">
                                <span class="current-question">Question <strong id="currentQNum">${this.currentQuestionIndex + 1}</strong> of <strong>${questions.length}</strong></span>
                            </div>
                        </div>
                        
                        <!-- Question Text -->
                        <div class="question-card">
                            <div class="question-text" id="questionText">
                                Loading question...
                            </div>
                        </div>
                        
                        <!-- Answer Options -->
                        <div class="options-panel">
                            <h3 class="options-title"><i class="fas fa-list-ol"></i> Select Your Answer:</h3>
                            <div id="optionsContainer" class="options-container-improved">
                                <!-- Options loaded here -->
                            </div>
                        </div>
                        
                        <!-- Action Buttons -->
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
                        
                        <!-- Answer & Explanation -->
                        <div id="answerRevealSection" class="answer-reveal-section" style="display: none;">
                            <div class="answer-header">
                                <h3><i class="fas fa-check-double"></i> Answer & Explanation</h3>
                            </div>
                            
                            <div class="correct-answer-box">
                                <div class="correct-answer-label">
                                    <i class="fas fa-check-circle"></i> Correct Answer:
                                </div>
                                <div class="correct-answer-text" id="correctAnswerText">
                                    Loading...
                                </div>
                            </div>
                            
                            <div class="explanation-box">
                                <div class="explanation-label">
                                    <i class="fas fa-info-circle"></i> Explanation:
                                </div>
                                <div class="explanation-content">
                                    <div class="explanation-text" id="explanationText">
                                        Select an option and click "Check Answer" to see the explanation.
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Stats Panel on Right -->
                    <div class="stats-panel">
                        <!-- Progress Stats Card -->
                        <div class="progress-stats-card">
                            <h3 class="stats-title">
                                <i class="fas fa-chart-bar"></i> Your Progress
                            </h3>
                            
                            <div class="progress-stats-grid">
                                <div class="progress-stat-item">
                                    <div class="stat-icon answered-icon">
                                        <i class="fas fa-check-circle"></i>
                                    </div>
                                    <div class="stat-details">
                                        <div class="stat-value" id="answeredCountStat">0</div>
                                        <div class="stat-label">Answered</div>
                                    </div>
                                </div>
                                
                                <div class="progress-stat-item">
                                    <div class="stat-icon correct-icon">
                                        <i class="fas fa-check-double"></i>
                                    </div>
                                    <div class="stat-details">
                                        <div class="stat-value" id="correctCountStat">0</div>
                                        <div class="stat-label">Correct</div>
                                    </div>
                                </div>
                                
                                <div class="progress-stat-item">
                                    <div class="stat-icon marked-icon">
                                        <i class="fas fa-flag"></i>
                                    </div>
                                    <div class="stat-details">
                                        <div class="stat-value" id="markedCountStat">0</div>
                                        <div class="stat-label">Marked</div>
                                    </div>
                                </div>
                                
                                <div class="progress-stat-item">
                                    <div class="stat-icon accuracy-icon">
                                        <i class="fas fa-percentage"></i>
                                    </div>
                                    <div class="stat-details">
                                        <div class="stat-value" id="accuracyStat">0%</div>
                                        <div class="stat-label">Accuracy</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Study Tips -->
                        <div class="tips-card">
                            <h3 class="tips-title">
                                <i class="fas fa-graduation-cap"></i> Study Tips
                            </h3>
                            <ul class="tips-list">
                                <li><i class="fas fa-check"></i> Read each question carefully</li>
                                <li><i class="fas fa-check"></i> Review explanations thoroughly</li>
                                <li><i class="fas fa-check"></i> Mark difficult questions</li>
                                <li><i class="fas fa-check"></i> Aim for 80%+ accuracy</li>
                            </ul>
                        </div>
                    </div>
                </div>
                
                <!-- Bottom Navigation -->
                <div class="bottom-navigation-bar">
                    <div class="nav-left">
                        <button onclick="window.prevQuestion()" id="prevBtn" class="nav-btn prev-nav-btn">
                            <i class="fas fa-arrow-left"></i> Previous
                        </button>
                    </div>
                    
                    <div class="nav-center">
                        <div class="progress-indicator">
                            <div class="progress-bar">
                                <div class="progress-fill" id="progressFill" style="width: 0%;"></div>
                            </div>
                            <div class="progress-text">
                                <span id="progressPercent">0%</span> complete
                            </div>
                        </div>
                    </div>
                    
                    <div class="nav-right">
                        <button onclick="window.nextQuestion()" id="nextBtn" class="nav-btn next-nav-btn">
                            Next <i class="fas fa-arrow-right"></i>
                        </button>
                        <button onclick="window.finishPractice()" class="nav-btn finish-btn">
                            <i class="fas fa-flag-checkered"></i> Finish
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        this.studentQuestionBankContent.innerHTML = html;
        
        setTimeout(() => {
            this.loadCurrentInteractiveQuestion();
            this.updateProgressStats();
            this.updateProgressBar();
            this.updateHorizontalDots();
        }, 100);
    }
    
    // Load current question
    loadCurrentInteractiveQuestion() {
        const question = this.currentCourseQuestions[this.currentQuestionIndex];
        if (!question) return;
        
        // Update question text
        const questionText = document.getElementById('questionText');
        if (questionText) {
            questionText.innerHTML = question.question_text || 'Question text not available';
        }
        
        // Update difficulty - ALWAYS SHOW "MEDIUM" IN CAPS
        const difficultyBadge = document.getElementById('difficultyBadge');
        if (difficultyBadge) {
            difficultyBadge.textContent = 'MEDIUM';
            difficultyBadge.className = 'difficulty-badge-large';
            difficultyBadge.style.backgroundColor = '#F59E0B'; // Orange for medium
        }
        
        // Load answer options
        this.loadAnswerOptionsImproved(question);
        
        // Update counters
        this.updateProgressStats();
        this.updateCurrentQuestionNumber();
        
        // Update navigation
        this.updateNavigationButtons();
        this.updateMarkButton();
        this.updateHorizontalDots();
        
        // Hide answer section
        const answerRevealSection = document.getElementById('answerRevealSection');
        if (answerRevealSection) {
            answerRevealSection.style.display = 'none';
        }
        
        // Reset selection if not answered
        const userAnswer = this.userTestAnswers[this.currentQuestionIndex];
        if (!userAnswer?.answered) {
            this.resetOptionSelection();
        }
        
        // Show previous answer if exists
        if (userAnswer?.answered) {
            this.showUserAnswer(userAnswer);
        }
    }
    
    // Load answer options with better display
    loadAnswerOptionsImproved(question) {
        const optionsContainer = document.getElementById('optionsContainer');
        if (!optionsContainer) return;
        
        let options = [];
        try {
            if (question.options) {
                if (Array.isArray(question.options)) {
                    options = question.options;
                } else if (typeof question.options === 'string') {
                    options = JSON.parse(question.options);
                }
            }
        } catch (e) {
            console.error('Error parsing options:', e);
            options = [];
        }
        
        if (options.length === 0) {
            options = ['Option A', 'Option B', 'Option C', 'Option D'];
        }
        
        // Get correct answer
        let correctAnswer = '';
        try {
            if (question.correct_answer) {
                if (Array.isArray(question.correct_answer)) {
                    correctAnswer = question.correct_answer[0];
                } else if (typeof question.correct_answer === 'string') {
                    correctAnswer = question.correct_answer;
                }
            }
        } catch (e) {
            console.error('Error parsing correct answer:', e);
        }
        
        let optionsHtml = '';
        const optionLabels = ['A', 'B', 'C', 'D', 'E', 'F'];
        
        options.forEach((option, index) => {
            if (index >= optionLabels.length) return;
            
            const optionId = `option-${this.currentQuestionIndex}-${index}`;
            const optionLetter = optionLabels[index];
            const isCorrectAnswer = option === correctAnswer;
            
            optionsHtml += `
                <div class="option-item-improved" data-option-index="${index}" data-is-correct="${isCorrectAnswer}">
                    <div class="option-radio-improved">
                        <input type="radio" 
                               id="${optionId}" 
                               name="question-${this.currentQuestionIndex}" 
                               value="${option}"
                               class="option-input-hidden"
                               ${this.userTestAnswers[this.currentQuestionIndex]?.selectedOption === option ? 'checked' : ''}>
                        <label for="${optionId}" class="option-label-improved">
                            <span class="option-letter-circle">${optionLetter}</span>
                            <span class="option-text-improved">${option}</span>
                        </label>
                    </div>
                </div>
            `;
        });
        
        optionsContainer.innerHTML = optionsHtml;
        
        // Add click handlers
        optionsContainer.querySelectorAll('.option-item-improved').forEach(item => {
            item.addEventListener('click', () => {
                this.selectOptionImproved(item);
            });
        });
        
        // Store correct answer
        if (question.id) {
            this.userTestAnswers[this.currentQuestionIndex] = {
                ...this.userTestAnswers[this.currentQuestionIndex],
                questionId: question.id,
                correctAnswer: correctAnswer
            };
        }
    }
    
    // Select option with better display
    selectOptionImproved(optionItem) {
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
    
    // Reset option selection
    resetOptionSelection() {
        const optionsContainer = document.getElementById('optionsContainer');
        if (!optionsContainer) return;
        
        optionsContainer.querySelectorAll('.option-item-improved').forEach(item => {
            item.classList.remove('selected-improved');
            item.classList.remove('correct-improved');
            item.classList.remove('incorrect-improved');
        });
        
        if (!this.userTestAnswers[this.currentQuestionIndex]?.answered) {
            delete this.userTestAnswers[this.currentQuestionIndex];
        }
    }
    
    // Show user's answer
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
                        
                        // Highlight correct answer
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
        
        if (userAnswer.answered) {
            this.showAnswerRevealSection();
        }
    }
    
    // Check answer
    checkAnswer() {
        const userAnswer = this.userTestAnswers[this.currentQuestionIndex];
        if (!userAnswer || !userAnswer.selectedOption) {
            this.showNotification('Please select an answer first!', 'warning');
            return;
        }
        
        const isCorrect = userAnswer.selectedOption === userAnswer.correctAnswer;
        userAnswer.answered = true;
        userAnswer.correct = isCorrect;
        
        this.showUserAnswer(userAnswer);
        this.updateProgressStats();
        this.showAnswerRevealSection();
        this.showFeedbackNotification(isCorrect);
        
        if (isCorrect && this.currentQuestionIndex < this.currentCourseQuestions.length - 1) {
            setTimeout(() => {
                this.nextQuestion();
            }, 2000);
        }
    }
    
    // Show answer reveal
    showAnswerRevealSection() {
        const answerRevealSection = document.getElementById('answerRevealSection');
        if (!answerRevealSection) return;
        
        const question = this.currentCourseQuestions[this.currentQuestionIndex];
        if (!question) return;
        
        let correctAnswer = '';
        try {
            if (question.correct_answer) {
                if (Array.isArray(question.correct_answer)) {
                    correctAnswer = question.correct_answer[0];
                } else if (typeof question.correct_answer === 'string') {
                    correctAnswer = question.correct_answer;
                }
            }
        } catch (e) {
            console.error('Error parsing correct answer:', e);
        }
        
        const correctAnswerText = document.getElementById('correctAnswerText');
        if (correctAnswerText) {
            correctAnswerText.textContent = correctAnswer || 'Correct answer not available';
        }
        
        const explanationText = document.getElementById('explanationText');
        if (explanationText) {
            explanationText.innerHTML = question.explanation || 
                '<div class="no-explanation">No detailed explanation available. Please review the course material.</div>';
        }
        
        answerRevealSection.style.display = 'block';
    }
    
    // Show feedback
    showFeedbackNotification(isCorrect) {
        const notification = document.createElement('div');
        notification.className = `feedback-notification ${isCorrect ? 'success' : 'error'}`;
        notification.innerHTML = `
            <i class="fas fa-${isCorrect ? 'check-circle' : 'times-circle'}"></i>
            <span>${isCorrect ? 'Correct! Well done!' : 'Incorrect. Review the explanation.'}</span>
        `;
        
        document.querySelector('.questions-main-container')?.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.add('fade-out');
            setTimeout(() => notification.remove(), 500);
        }, 3000);
    }
    
    // Show notification
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <i class="fas fa-${type === 'error' ? 'exclamation-circle' : 
                               type === 'warning' ? 'exclamation-triangle' : 
                               type === 'success' ? 'check-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        `;
        
        document.querySelector('.questions-main-container')?.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.add('fade-out');
            setTimeout(() => notification.remove(), 500);
        }, 3000);
    }
    
    // Reset question
    resetQuestion() {
        const userAnswer = this.userTestAnswers[this.currentQuestionIndex];
        if (userAnswer?.answered) {
            delete this.userTestAnswers[this.currentQuestionIndex];
        }
        
        this.loadCurrentInteractiveQuestion();
        this.updateProgressStats();
    }
    
    // Show answer
    showAnswer() {
        const question = this.currentCourseQuestions[this.currentQuestionIndex];
        if (!question) return;
        
        let correctAnswer = '';
        try {
            if (question.correct_answer) {
                if (Array.isArray(question.correct_answer)) {
                    correctAnswer = question.correct_answer[0];
                } else if (typeof question.correct_answer === 'string') {
                    correctAnswer = question.correct_answer;
                }
            }
        } catch (e) {
            console.error('Error parsing correct answer:', e);
        }
        
        const optionsContainer = document.getElementById('optionsContainer');
        if (optionsContainer) {
            optionsContainer.querySelectorAll('.option-item-improved').forEach(item => {
                const optionText = item.querySelector('.option-text-improved')?.textContent || '';
                if (optionText === correctAnswer) {
                    item.classList.add('correct-improved');
                }
            });
        }
        
        this.showAnswerRevealSection();
        
        this.userTestAnswers[this.currentQuestionIndex] = {
            ...this.userTestAnswers[this.currentQuestionIndex],
            viewed: true
        };
    }
    
    // Mark for review
    markForReview() {
        const currentIndex = this.currentQuestionIndex;
        const isMarked = this.userTestAnswers[currentIndex]?.marked || false;
        
        this.userTestAnswers[currentIndex] = {
            ...this.userTestAnswers[currentIndex],
            marked: !isMarked
        };
        
        this.updateMarkButton();
        this.updateProgressStats();
        this.updateHorizontalDots();
        
        const action = !isMarked ? 'marked for review' : 'unmarked';
        this.showNotification(`Question ${currentIndex + 1} ${action}`, 'info');
    }
    
    // Update mark button
    updateMarkButton() {
        const markBtn = document.getElementById('markBtn');
        const markBtnText = document.getElementById('markBtnText');
        if (!markBtn || !markBtnText) return;
        
        const isMarked = this.userTestAnswers[this.currentQuestionIndex]?.marked || false;
        
        if (isMarked) {
            markBtn.classList.add('marked');
            markBtnText.textContent = 'Unmark Review';
            markBtn.style.backgroundColor = '#F59E0B';
        } else {
            markBtn.classList.remove('marked');
            markBtnText.textContent = 'Mark for Review';
            markBtn.style.backgroundColor = '';
        }
    }
    
    // Previous question
    prevQuestion() {
        if (this.currentQuestionIndex > 0) {
            this.currentQuestionIndex--;
            this.loadCurrentInteractiveQuestion();
            this.updateProgressBar();
            this.updateHorizontalDots();
        }
    }
    
    // Next question
    nextQuestion() {
        if (this.currentQuestionIndex < this.currentCourseQuestions.length - 1) {
            this.currentQuestionIndex++;
            this.loadCurrentInteractiveQuestion();
            this.updateProgressBar();
            this.updateHorizontalDots();
        }
    }
    
    // Go to question
    goToQuestion(index) {
        if (index >= 0 && index < this.currentCourseQuestions.length) {
            this.currentQuestionIndex = index;
            this.loadCurrentInteractiveQuestion();
            this.updateProgressBar();
            this.updateHorizontalDots();
        }
    }
    
    // Jump to question
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
    
    // Finish practice
    finishPractice() {
        const answeredCount = Object.values(this.userTestAnswers).filter(a => a.answered).length;
        const correctCount = Object.values(this.userTestAnswers).filter(a => a.answered && a.correct).length;
        const accuracy = answeredCount > 0 ? Math.round((correctCount / answeredCount) * 100) : 0;
        
        const confirmFinish = confirm(`Finish practice session?\n\nAnswered: ${answeredCount}/${this.currentCourseQuestions.length}\nCorrect: ${correctCount}\nAccuracy: ${accuracy}%\n\nReturn to question bank?`);
        
        if (confirmFinish) {
            this.loadQuestionBankCards();
        }
    }
    
    // Generate horizontal dots - FIXED to show ...34567... format
    generateHorizontalDots(totalQuestions) {
        let dotsHtml = '';
        const current = this.currentQuestionIndex + 1;
        const maxVisible = 5; // Show 5 numbers max
        
        if (totalQuestions <= maxVisible) {
            // Show all numbers if total is small
            for (let i = 1; i <= totalQuestions; i++) {
                const dotClass = this.getDotClass(i);
                dotsHtml += `<span class="${dotClass}" onclick="window.goToQuestion(${i-1})">${i}</span>`;
            }
        } else {
            // Show ...34567... format
            let start = Math.max(2, current - 1);
            let end = Math.min(totalQuestions - 1, current + 1);
            
            // Adjust to show exactly maxVisible numbers
            if (end - start + 1 < maxVisible) {
                if (start === 2) {
                    end = Math.min(totalQuestions - 1, start + maxVisible - 1);
                } else if (end === totalQuestions - 1) {
                    start = Math.max(2, end - maxVisible + 1);
                }
            }
            
            // First number
            const firstClass = this.getDotClass(1);
            dotsHtml += `<span class="${firstClass}" onclick="window.goToQuestion(0)">1</span>`;
            
            // Ellipsis if needed
            if (start > 2) {
                dotsHtml += '<span class="dot-ellipsis">...</span>';
            }
            
            // Middle numbers (e.g., 3,4,5,6,7)
            for (let i = start; i <= end; i++) {
                const dotClass = this.getDotClass(i);
                dotsHtml += `<span class="${dotClass}" onclick="window.goToQuestion(${i-1})">${i}</span>`;
            }
            
            // Ellipsis if needed
            if (end < totalQuestions - 1) {
                dotsHtml += '<span class="dot-ellipsis">...</span>';
            }
            
            // Last number
            const lastClass = this.getDotClass(totalQuestions);
            dotsHtml += `<span class="${lastClass}" onclick="window.goToQuestion(${totalQuestions-1})">${totalQuestions}</span>`;
        }
        
        return dotsHtml;
    }
    
    // Get dot class for styling
    getDotClass(questionNumber) {
        const index = questionNumber - 1;
        let dotClass = 'horizontal-dot';
        
        if (questionNumber === this.currentQuestionIndex + 1) {
            dotClass += ' dot-active';
        }
        
        const userAnswer = this.userTestAnswers[index];
        if (userAnswer) {
            if (userAnswer.answered) {
                dotClass += userAnswer.correct ? ' dot-correct' : ' dot-incorrect';
            } else if (userAnswer.marked) {
                dotClass += ' dot-marked';
            }
        }
        
        return dotClass;
    }
    
    // Update horizontal dots
    updateHorizontalDots() {
        const horizontalDots = document.getElementById('horizontalDots');
        if (!horizontalDots) return;
        
        const totalQuestions = this.currentCourseQuestions.length;
        horizontalDots.innerHTML = this.generateHorizontalDots(totalQuestions);
        
        // Update current question number
        this.updateCurrentQuestionNumber();
        
        // Update arrow buttons
        this.updateArrowButtons();
    }
    
    // Update current question number display
    updateCurrentQuestionNumber() {
        const currentQNum = document.getElementById('currentQNum');
        if (currentQNum) {
            currentQNum.textContent = this.currentQuestionIndex + 1;
        }
    }
    
    // Update arrow buttons
    updateArrowButtons() {
        const prevArrowBtn = document.getElementById('prevArrowBtn');
        const nextArrowBtn = document.getElementById('nextArrowBtn');
        
        const isFirst = this.currentQuestionIndex === 0;
        const isLast = this.currentQuestionIndex === this.currentCourseQuestions.length - 1;
        
        if (prevArrowBtn) {
            prevArrowBtn.disabled = isFirst;
            prevArrowBtn.style.opacity = isFirst ? '0.5' : '1';
        }
        if (nextArrowBtn) {
            nextArrowBtn.disabled = isLast;
            nextArrowBtn.style.opacity = isLast ? '0.5' : '1';
        }
    }
    
    // Update progress stats
    updateProgressStats() {
        const totalQuestions = this.currentCourseQuestions.length;
        const answeredCount = Object.values(this.userTestAnswers).filter(a => a.answered).length;
        const correctCount = Object.values(this.userTestAnswers).filter(a => a.answered && a.correct).length;
        const markedCount = Object.values(this.userTestAnswers).filter(a => a.marked).length;
        
        // Calculate accuracy
        const accuracy = answeredCount > 0 ? Math.round((correctCount / answeredCount) * 100) : 0;
        
        // Update stats in sidebar
        const answeredCountStat = document.getElementById('answeredCountStat');
        const correctCountStat = document.getElementById('correctCountStat');
        const markedCountStat = document.getElementById('markedCountStat');
        const accuracyStat = document.getElementById('accuracyStat');
        
        if (answeredCountStat) answeredCountStat.textContent = answeredCount;
        if (correctCountStat) correctCountStat.textContent = correctCount;
        if (markedCountStat) markedCountStat.textContent = markedCount;
        if (accuracyStat) {
            accuracyStat.textContent = `${accuracy}%`;
            accuracyStat.style.color = accuracy >= 80 ? '#10B981' : 
                                      accuracy >= 60 ? '#F59E0B' : '#EF4444';
        }
        
        // Update bottom navigation buttons
        this.updateNavigationButtons();
    }
    
    // Update navigation buttons
    updateNavigationButtons() {
        const prevBtn = document.getElementById('prevBtn');
        const nextBtn = document.getElementById('nextBtn');
        
        const isFirst = this.currentQuestionIndex === 0;
        const isLast = this.currentQuestionIndex === this.currentCourseQuestions.length - 1;
        
        if (prevBtn) {
            prevBtn.disabled = isFirst;
            prevBtn.style.opacity = isFirst ? '0.5' : '1';
        }
        if (nextBtn) {
            nextBtn.disabled = isLast;
            nextBtn.style.opacity = isLast ? '0.5' : '1';
        }
    }
    
    // Update progress bar
    updateProgressBar() {
        const progressFill = document.getElementById('progressFill');
        const progressPercent = document.getElementById('progressPercent');
        
        if (!progressFill || !progressPercent) return;
        
        const totalQuestions = this.currentCourseQuestions.length;
        const progress = Math.round(((this.currentQuestionIndex + 1) / totalQuestions) * 100);
        
        progressFill.style.width = `${progress}%`;
        progressPercent.textContent = `${progress}%`;
    }
    
    // Clear search
    clearQuestionBankSearch() {
        if (this.studentQuestionBankSearch) {
            this.studentQuestionBankSearch.value = '';
            this.loadQuestionBankCards();
        }
    }
    
    // Show loading
    showLoading() {
        if (this.studentQuestionBankLoading) {
            this.studentQuestionBankLoading.style.display = 'block';
        }
        if (this.studentQuestionBankContent) {
            this.studentQuestionBankContent.innerHTML = `
                <div class="loading-container">
                    <div class="loading-spinner"></div>
                    <div class="loading-text">Loading question bank...</div>
                </div>
            `;
        }
    }
    
    // Hide loading
    hideLoading() {
        if (this.studentQuestionBankLoading) {
            this.studentQuestionBankLoading.style.display = 'none';
        }
    }
    
    // Show error
    showError(message) {
        if (this.studentQuestionBankContent) {
            this.studentQuestionBankContent.innerHTML = `
                <div class="error-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>Failed to Load Question Bank</h3>
                    <p>${message}</p>
                    <div style="margin-top: 20px;">
                        <button onclick="window.loadQuestionBankCards()" class="btn-primary" style="margin-right: 10px;">
                            <i class="fas fa-redo"></i> Try Again
                        </button>
                        <button onclick="window.clearQuestionBankSearch()" class="btn-secondary">
                            <i class="fas fa-times"></i> Clear Search
                        </button>
                    </div>
                </div>
            `;
        }
    }
}

// Global functions
window.NurseIQModule = NurseIQModule;
window.nurseiqModule = null;

window.initNurseIQ = async function() {
    console.log('🚀 Starting NurseIQ...');
    
    if (document.readyState === 'loading') {
        await new Promise(resolve => {
            document.addEventListener('DOMContentLoaded', resolve);
        });
    }
    
    window.nurseiqModule = new NurseIQModule();
    await window.nurseiqModule.initialize();
    return window.nurseiqModule;
};

// Auto-initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
            window.initNurseIQ().catch(console.error);
        }, 1000);
    });
} else {
    setTimeout(() => {
        window.initNurseIQ().catch(console.error);
    }, 1000);
}

// Global helper functions
window.loadQuestionBankCards = function() {
    if (window.nurseiqModule) {
        window.nurseiqModule.loadQuestionBankCards();
    } else {
        window.initNurseIQ().then(() => {
            window.nurseiqModule.loadQuestionBankCards();
        }).catch(console.error);
    }
};

window.clearQuestionBankSearch = function() {
    if (window.nurseiqModule) {
        window.nurseiqModule.clearQuestionBankSearch();
    }
};

window.startCourseTest = function(courseId, courseName) {
    if (window.nurseiqModule) {
        window.nurseiqModule.startCourseTest(courseId, courseName);
    }
};

window.prevQuestion = function() {
    if (window.nurseiqModule) {
        window.nurseiqModule.prevQuestion();
    }
};

window.nextQuestion = function() {
    if (window.nurseiqModule) {
        window.nurseiqModule.nextQuestion();
    }
};

window.goToQuestion = function(index) {
    if (window.nurseiqModule) {
        window.nurseiqModule.goToQuestion(index);
    }
};

window.checkAnswer = function() {
    if (window.nurseiqModule) {
        window.nurseiqModule.checkAnswer();
    }
};

window.resetQuestion = function() {
    if (window.nurseiqModule) {
        window.nurseiqModule.resetQuestion();
    }
};

window.showAnswer = function() {
    if (window.nurseiqModule) {
        window.nurseiqModule.showAnswer();
    }
};

window.markForReview = function() {
    if (window.nurseiqModule) {
        window.nurseiqModule.markForReview();
    }
};

window.finishPractice = function() {
    if (window.nurseiqModule) {
        window.nurseiqModule.finishPractice();
    }
};

// Add CSS for horizontal navigation and improved display
const horizontalNavStyles = document.createElement('style');
horizontalNavStyles.textContent = `
    /* Horizontal Navigator in Main Panel */
    .horizontal-navigator-main {
        background: white;
        border-radius: 12px;
        padding: 15px;
        margin: 20px 0;
        box-shadow: 0 2px 8px rgba(0,0,0,0.08);
        border: 1px solid #e5e7eb;
    }
    
    .nav-controls {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
        margin-bottom: 10px;
    }
    
    .nav-arrow-btn {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        border: 2px solid #3b82f6;
        background: white;
        color: #3b82f6;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.3s ease;
        flex-shrink: 0;
    }
    
    .nav-arrow-btn:hover:not(:disabled) {
        background: #3b82f6;
        color: white;
        transform: scale(1.1);
    }
    
    .nav-arrow-btn:disabled {
        border-color: #d1d5db;
        color: #d1d5db;
        cursor: not-allowed;
    }
    
    .horizontal-dots-container {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        flex-wrap: wrap;
        min-height: 40px;
    }
    
    .horizontal-dot {
        width: 36px;
        height: 36px;
        border-radius: 50%;
        background: #f3f4f6;
        border: 2px solid #e5e7eb;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #6b7280;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s ease;
        flex-shrink: 0;
    }
    
    .horizontal-dot:hover {
        background: #e5e7eb;
        transform: translateY(-2px);
    }
    
    .dot-active {
        background: #3b82f6 !important;
        border-color: #3b82f6 !important;
        color: white !important;
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
        transform: scale(1.1);
    }
    
    .dot-correct {
        background: #10b981 !important;
        border-color: #10b981 !important;
        color: white !important;
    }
    
    .dot-incorrect {
        background: #ef4444 !important;
        border-color: #ef4444 !important;
        color: white !important;
    }
    
    .dot-marked {
        background: #f59e0b !important;
        border-color: #f59e0b !important;
        color: white !important;
    }
    
    .dot-ellipsis {
        color: #9ca3af;
        font-weight: bold;
        padding: 0 5px;
        user-select: none;
    }
    
    .nav-info {
        text-align: center;
        padding-top: 10px;
        border-top: 1px solid #e5e7eb;
        color: #6b7280;
        font-size: 14px;
    }
    
    .current-question {
        font-weight: 500;
    }
    
    .current-question strong {
        color: #3b82f6;
    }
    
    /* Difficulty Badge - Large MEDIUM */
    .difficulty-container {
        display: flex;
        align-items: center;
        gap: 8px;
    }
    
    .difficulty-label {
        color: #6b7280;
        font-size: 14px;
        font-weight: 500;
    }
    
    .difficulty-badge-large {
        padding: 6px 16px;
        border-radius: 20px;
        font-size: 14px;
        font-weight: 700;
        color: white;
        text-transform: uppercase;
        background: #F59E0B; /* Orange for MEDIUM */
        letter-spacing: 0.5px;
    }
    
    /* Progress Stats in Sidebar */
    .progress-stats-card {
        background: white;
        border-radius: 12px;
        padding: 20px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.08);
        border: 1px solid #e5e7eb;
        margin-bottom: 20px;
    }
    
    .progress-stats-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 15px;
        margin-top: 15px;
    }
    
    .progress-stat-item {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px;
        background: #f9fafb;
        border-radius: 8px;
        border: 1px solid #e5e7eb;
    }
    
    .stat-icon {
        width: 36px;
        height: 36px;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-size: 16px;
    }
    
    .answered-icon { background: #3b82f6; }
    .correct-icon { background: #10b981; }
    .marked-icon { background: #f59e0b; }
    .accuracy-icon { background: #8b5cf6; }
    
    .stat-details {
        flex: 1;
    }
    
    .stat-value {
        font-size: 20px;
        font-weight: 700;
        color: #1f2937;
        line-height: 1;
    }
    
    .stat-label {
        font-size: 12px;
        color: #6b7280;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        margin-top: 2px;
    }
    
    /* Question Header */
    .question-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
    }
    
    .question-meta {
        display: flex;
        align-items: center;
        gap: 15px;
    }
    
    .question-number-badge {
        padding: 8px 16px;
        border-radius: 20px;
        font-weight: 700;
        color: white;
        font-size: 14px;
    }
    
    .question-type {
        color: #6b7280;
        font-size: 14px;
        background: #f3f4f6;
        padding: 6px 12px;
        border-radius: 6px;
    }
    
    /* Responsive */
    @media (max-width: 768px) {
        .horizontal-dots-container {
            gap: 6px;
        }
        
        .horizontal-dot {
            width: 32px;
            height: 32px;
            font-size: 14px;
        }
        
        .progress-stats-grid {
            grid-template-columns: 1fr;
        }
        
        .question-header {
            flex-direction: column;
            gap: 15px;
            align-items: flex-start;
        }
    }
`;
document.head.appendChild(horizontalNavStyles);

console.log('✅ NurseIQ module loaded with horizontal navigation');
