// js/nurseiq.js - COMPLETE FIXED VERSION
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
    
    // Display interactive questions - FIXED VERSION
    displayInteractiveQuestions(courseName, questions) {
        if (!this.studentQuestionBankContent) return;
        
        const courseColor = questions[0]?.courses?.color || '#4f46e5';
        
        let html = `
            <div class="interactive-questions-container">
                <!-- Top Header Bar with Progress -->
                <div class="questions-header-bar" style="background: ${courseColor};">
                    <div class="header-content">
                        <button onclick="window.loadQuestionBankCards()" class="header-back-btn">
                            <i class="fas fa-arrow-left"></i> Back to Courses
                        </button>
                        
                        <div class="header-course-info">
                            <h2 class="course-name">${courseName}</h2>
                            <p class="practice-mode">Interactive Q&A Practice Mode</p>
                        </div>
                        
                        <!-- Progress Stats at Top -->
                        <div class="header-progress-stats">
                            <div class="progress-stat-top">
                                <div class="progress-label-top">Question</div>
                                <div class="progress-value-top">
                                    <span id="currentQuestionCountTop">1</span>/<span id="totalQuestionsTop">${questions.length}</span>
                                </div>
                            </div>
                            <div class="progress-stat-top">
                                <div class="progress-label-top">Answered</div>
                                <div class="progress-value-top" id="answeredCountTop">0</div>
                            </div>
                            <div class="progress-stat-top">
                                <div class="progress-label-top">Correct</div>
                                <div class="progress-value-top" id="correctCountTop">0</div>
                            </div>
                            <div class="progress-stat-top">
                                <div class="progress-label-top">Accuracy</div>
                                <div class="progress-value-top" id="accuracyTop">0%</div>
                            </div>
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
                                <span class="difficulty-badge" id="difficultyBadge">Medium</span>
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
                        
                        <!-- Question Text -->
                        <div class="question-card">
                            <div class="question-text" id="questionText">
                                Loading question...
                            </div>
                        </div>
                        
                        <!-- Answer Options - IMPROVED -->
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
                        <!-- Question Navigator -->
                        <div class="horizontal-nav-card">
                            <h3 class="nav-title">
                                <i class="fas fa-list-ol"></i> Questions Navigator
                            </h3>
                            
                            <div class="horizontal-question-grid" id="questionGridContainer">
                                <!-- Question numbers loaded here -->
                            </div>
                            
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
                        
                        <!-- Progress Summary -->
                        <div class="progress-summary-card">
                            <h3 class="stats-title">
                                <i class="fas fa-chart-line"></i> Detailed Progress
                            </h3>
                            
                            <div class="progress-details">
                                <div class="progress-detail-item">
                                    <span class="detail-label">Total Questions:</span>
                                    <span class="detail-value">${questions.length}</span>
                                </div>
                                <div class="progress-detail-item">
                                    <span class="detail-label">Marked for Review:</span>
                                    <span class="detail-value" id="markedCountDetail">0</span>
                                </div>
                                <div class="progress-detail-item">
                                    <span class="detail-label">Completion:</span>
                                    <span class="detail-value" id="completionPercent">0%</span>
                                </div>
                            </div>
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
            this.updateQuestionGrid();
            this.updateProgressBar();
            this.updateMiniDots();
            this.updateTopProgressStats(); // Added
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
        
        // Update difficulty
        const difficultyBadge = document.getElementById('difficultyBadge');
        if (difficultyBadge) {
            difficultyBadge.textContent = question.difficulty?.toUpperCase() || 'MEDIUM';
            difficultyBadge.className = 'difficulty-badge';
            difficultyBadge.classList.add(`difficulty-${question.difficulty || 'medium'}`);
            
            const colors = {
                easy: '#10B981',
                medium: '#F59E0B',
                hard: '#EF4444'
            };
            difficultyBadge.style.backgroundColor = colors[question.difficulty] || colors.medium;
        }
        
        // Load answer options with better display
        this.loadAnswerOptionsImproved(question);
        
        // Update counters
        this.updateCounters();
        this.updateTopProgressStats(); // Added
        
        // Update navigation
        this.updateNavigationButtons();
        this.updateMarkButton();
        
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
        
        // Highlight in grid
        this.highlightCurrentQuestionInGrid();
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
        this.updateCounters();
        this.updateTopProgressStats(); // Added
        this.showAnswerRevealSection();
        this.updateQuestionGrid();
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
        this.updateQuestionGrid();
        this.updateTopProgressStats(); // Added
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
        this.updateQuestionGrid();
        this.updateMiniDots();
        this.updateTopProgressStats(); // Added
        
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
            this.updateMiniDots();
            this.updateTopProgressStats(); // Added
        }
    }
    
    // Next question
    nextQuestion() {
        if (this.currentQuestionIndex < this.currentCourseQuestions.length - 1) {
            this.currentQuestionIndex++;
            this.loadCurrentInteractiveQuestion();
            this.updateProgressBar();
            this.updateMiniDots();
            this.updateTopProgressStats(); // Added
        }
    }
    
    // Go to question
    goToQuestion(index) {
        if (index >= 0 && index < this.currentCourseQuestions.length) {
            this.currentQuestionIndex = index;
            this.loadCurrentInteractiveQuestion();
            this.updateProgressBar();
            this.updateMiniDots();
            this.updateTopProgressStats(); // Added
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
    
    // Scroll questions
    scrollQuestions(direction) {
        const gridContainer = document.getElementById('questionGridContainer');
        if (!gridContainer) return;
        
        const scrollAmount = 300;
        const currentScroll = gridContainer.scrollLeft;
        
        if (direction === 'left') {
            gridContainer.scrollLeft = currentScroll - scrollAmount;
        } else {
            gridContainer.scrollLeft = currentScroll + scrollAmount;
        }
    }
    
    // Update counters
    updateCounters() {
        const totalQuestions = this.currentCourseQuestions.length;
        const answeredCount = Object.values(this.userTestAnswers).filter(a => a.answered).length;
        const correctCount = Object.values(this.userTestAnswers).filter(a => a.answered && a.correct).length;
        const incorrectCount = Object.values(this.userTestAnswers).filter(a => a.answered && !a.correct).length;
        const markedCount = Object.values(this.userTestAnswers).filter(a => a.marked).length;
        
        // Update top counters
        const currentQuestionCountEl = document.getElementById('currentQuestionCountTop');
        const totalQuestionsEl = document.getElementById('totalQuestionsTop');
        const answeredCountEl = document.getElementById('answeredCountTop');
        const correctCountEl = document.getElementById('correctCountTop');
        const accuracyEl = document.getElementById('accuracyTop');
        const markedCountDetailEl = document.getElementById('markedCountDetail');
        const completionPercentEl = document.getElementById('completionPercent');
        
        if (currentQuestionCountEl) currentQuestionCountEl.textContent = this.currentQuestionIndex + 1;
        if (totalQuestionsEl) totalQuestionsEl.textContent = totalQuestions;
        if (answeredCountEl) answeredCountEl.textContent = answeredCount;
        if (correctCountEl) correctCountEl.textContent = correctCount;
        if (markedCountDetailEl) markedCountDetailEl.textContent = markedCount;
        
        // Calculate accuracy
        const accuracy = answeredCount > 0 ? Math.round((correctCount / answeredCount) * 100) : 0;
        if (accuracyEl) {
            accuracyEl.textContent = `${accuracy}%`;
            accuracyEl.style.color = accuracy >= 80 ? '#10B981' : 
                                    accuracy >= 60 ? '#F59E0B' : '#EF4444';
        }
        
        // Calculate completion
        const completion = Math.round((answeredCount / totalQuestions) * 100);
        if (completionPercentEl) {
            completionPercentEl.textContent = `${completion}%`;
            completionPercentEl.style.color = completion >= 80 ? '#10B981' : 
                                            completion >= 50 ? '#F59E0B' : '#EF4444';
        }
    }
    
    // Update top progress stats
    updateTopProgressStats() {
        this.updateCounters();
    }
    
    // Update navigation buttons
    updateNavigationButtons() {
        const prevBtn = document.getElementById('prevBtn');
        const nextBtn = document.getElementById('nextBtn');
        const miniPrevBtn = document.getElementById('miniPrevBtn');
        const miniNextBtn = document.getElementById('miniNextBtn');
        
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
        if (miniPrevBtn) {
            miniPrevBtn.disabled = isFirst;
            miniPrevBtn.style.opacity = isFirst ? '0.5' : '1';
        }
        if (miniNextBtn) {
            miniNextBtn.disabled = isLast;
            miniNextBtn.style.opacity = isLast ? '0.5' : '1';
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
    
    // Update question grid
    updateQuestionGrid() {
        const questionGridContainer = document.getElementById('questionGridContainer');
        if (!questionGridContainer) return;
        
        const totalQuestions = this.currentCourseQuestions.length;
        let gridHtml = '';
        
        for (let i = 0; i < totalQuestions; i++) {
            let questionClass = 'grid-question-number';
            
            if (i === this.currentQuestionIndex) {
                questionClass += ' grid-current';
            }
            
            const userAnswer = this.userTestAnswers[i];
            if (userAnswer) {
                if (userAnswer.answered) {
                    questionClass += userAnswer.correct ? ' grid-correct' : ' grid-incorrect';
                } else if (userAnswer.marked) {
                    questionClass += ' grid-marked';
                } else if (userAnswer.viewed) {
                    questionClass += ' grid-viewed';
                }
            }
            
            gridHtml += `
                <div class="${questionClass}" onclick="window.goToQuestion(${i})" 
                     title="Question ${i + 1}${userAnswer?.answered ? ` - ${userAnswer.correct ? 'Correct' : 'Incorrect'}` : ''}">
                    ${i + 1}
                    ${userAnswer?.marked ? '<i class="fas fa-flag grid-flag"></i>' : ''}
                </div>
            `;
        }
        
        questionGridContainer.innerHTML = gridHtml;
        this.scrollToCurrentQuestion();
    }
    
    // Scroll to current question
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
    
    // Highlight current question
    highlightCurrentQuestionInGrid() {
        const questionGridContainer = document.getElementById('questionGridContainer');
        if (!questionGridContainer) return;
        
        questionGridContainer.querySelectorAll('.grid-question-number').forEach(el => {
            el.classList.remove('grid-current');
        });
        
        const currentQuestionElement = questionGridContainer.querySelector(`[onclick*="goToQuestion(${this.currentQuestionIndex})"]`);
        if (currentQuestionElement) {
            currentQuestionElement.classList.add('grid-current');
        }
    }
    
    // Update mini dots
    updateMiniDots() {
        const miniDotsContainer = document.getElementById('miniDotsContainer');
        if (!miniDotsContainer) return;
        
        const totalQuestions = this.currentCourseQuestions.length;
        miniDotsContainer.innerHTML = this.generateMiniDots(totalQuestions);
    }
    
    // Generate mini dots
    generateMiniDots(totalQuestions) {
        let dotsHtml = '';
        const maxDots = 5;
        
        let start = Math.max(0, this.currentQuestionIndex - 2);
        let end = Math.min(totalQuestions - 1, start + maxDots - 1);
        
        if (end - start < maxDots - 1) {
            start = Math.max(0, end - maxDots + 1);
        }
        
        if (start > 0) {
            dotsHtml += '<span class="mini-dot-ellipsis">...</span>';
        }
        
        for (let i = start; i <= end; i++) {
            let dotClass = 'mini-dot';
            if (i === this.currentQuestionIndex) {
                dotClass += ' mini-dot-active';
            }
            if (this.userTestAnswers[i]?.answered) {
                dotClass += this.userTestAnswers[i]?.correct ? ' mini-dot-correct' : ' mini-dot-incorrect';
            } else if (this.userTestAnswers[i]?.marked) {
                dotClass += ' mini-dot-marked';
            }
            
            dotsHtml += `<span class="${dotClass}" onclick="window.goToQuestion(${i})">${i + 1}</span>`;
        }
        
        if (end < totalQuestions - 1) {
            dotsHtml += '<span class="mini-dot-ellipsis">...</span>';
        }
        
        return dotsHtml;
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

window.jumpToQuestion = function() {
    if (window.nurseiqModule) {
        window.nurseiqModule.jumpToQuestion();
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

window.scrollQuestions = function(direction) {
    if (window.nurseiqModule) {
        window.nurseiqModule.scrollQuestions(direction);
    }
};

// Add improved CSS
const improvedStyles = document.createElement('style');
improvedStyles.textContent = `
    /* Progress at Top */
    .header-progress-stats {
        display: flex;
        gap: 20px;
        align-items: center;
    }
    
    .progress-stat-top {
        text-align: center;
        min-width: 80px;
    }
    
    .progress-label-top {
        font-size: 12px;
        color: rgba(255, 255, 255, 0.8);
        font-weight: 500;
        margin-bottom: 4px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }
    
    .progress-value-top {
        font-size: 20px;
        font-weight: 700;
        color: white;
        background: rgba(255, 255, 255, 0.15);
        padding: 6px 12px;
        border-radius: 8px;
        min-width: 60px;
        display: inline-block;
    }
    
    /* Improved Options Display */
    .options-container-improved {
        display: flex;
        flex-direction: column;
        gap: 12px;
        margin-top: 20px;
    }
    
    .option-item-improved {
        background: white;
        border: 2px solid #e5e7eb;
        border-radius: 12px;
        padding: 16px;
        cursor: pointer;
        transition: all 0.3s ease;
        position: relative;
        overflow: hidden;
    }
    
    .option-item-improved:hover {
        border-color: #3b82f6;
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
    }
    
    .option-item-improved.selected-improved {
        border-color: #3b82f6;
        background: #eff6ff;
        box-shadow: 0 4px 12px rgba(59, 130, 246, 0.2);
    }
    
    .option-item-improved.correct-improved {
        border-color: #10b981;
        background: #d1fae5;
        box-shadow: 0 4px 12px rgba(16, 185, 129, 0.2);
    }
    
    .option-item-improved.incorrect-improved {
        border-color: #ef4444;
        background: #fee2e2;
        box-shadow: 0 4px 12px rgba(239, 68, 68, 0.2);
    }
    
    .option-radio-improved {
        display: flex;
        align-items: center;
        gap: 15px;
    }
    
    .option-input-hidden {
        display: none;
    }
    
    .option-label-improved {
        display: flex;
        align-items: center;
        gap: 15px;
        width: 100%;
        cursor: pointer;
    }
    
    .option-letter-circle {
        width: 36px;
        height: 36px;
        border-radius: 50%;
        background: #f3f4f6;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 700;
        color: #4b5563;
        flex-shrink: 0;
        transition: all 0.3s ease;
    }
    
    .option-item-improved.selected-improved .option-letter-circle {
        background: #3b82f6;
        color: white;
    }
    
    .option-item-improved.correct-improved .option-letter-circle {
        background: #10b981;
        color: white;
    }
    
    .option-item-improved.incorrect-improved .option-letter-circle {
        background: #ef4444;
        color: white;
    }
    
    .option-text-improved {
        flex: 1;
        font-size: 16px;
        line-height: 1.5;
        color: #374151;
    }
    
    /* Improved Action Buttons */
    .action-buttons-panel {
        display: flex;
        justify-content: space-between;
        margin-top: 30px;
        padding-top: 20px;
        border-top: 1px solid #e5e7eb;
    }
    
    .button-group-left, .button-group-right {
        display: flex;
        gap: 12px;
    }
    
    .action-btn {
        padding: 12px 24px;
        border-radius: 8px;
        border: none;
        font-weight: 600;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 8px;
        transition: all 0.3s ease;
        font-size: 14px;
    }
    
    .primary-action-btn {
        background: #3b82f6;
        color: white;
    }
    
    .primary-action-btn:hover {
        background: #2563eb;
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
    }
    
    .secondary-action-btn {
        background: #6b7280;
        color: white;
    }
    
    .secondary-action-btn:hover {
        background: #4b5563;
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(107, 114, 128, 0.3);
    }
    
    .info-action-btn {
        background: #0ea5e9;
        color: white;
    }
    
    .info-action-btn:hover {
        background: #0284c7;
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(14, 165, 233, 0.3);
    }
    
    .warning-action-btn {
        background: #f59e0b;
        color: white;
    }
    
    .warning-action-btn:hover {
        background: #d97706;
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3);
    }
    
    /* Question Card */
    .question-card {
        background: white;
        border-radius: 12px;
        padding: 24px;
        margin: 20px 0;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
        border: 1px solid #e5e7eb;
    }
    
    .question-text {
        font-size: 18px;
        line-height: 1.6;
        color: #1f2937;
    }
    
    /* Difficulty badges */
    .difficulty-badge {
        padding: 4px 12px;
        border-radius: 20px;
        font-size: 12px;
        font-weight: 700;
        color: white;
        text-transform: uppercase;
    }
    
    /* Navigation */
    .bottom-navigation-bar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 15px 20px;
        background: white;
        border-top: 1px solid #e5e7eb;
        position: sticky;
        bottom: 0;
        z-index: 100;
    }
    
    .nav-btn {
        padding: 10px 20px;
        border-radius: 8px;
        border: none;
        font-weight: 600;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 8px;
        transition: all 0.3s ease;
    }
    
    .prev-nav-btn, .next-nav-btn {
        background: #f3f4f6;
        color: #4b5563;
    }
    
    .prev-nav-btn:hover:not(:disabled), .next-nav-btn:hover:not(:disabled) {
        background: #e5e7eb;
        transform: translateY(-2px);
    }
    
    .finish-btn {
        background: #10b981;
        color: white;
    }
    
    .finish-btn:hover {
        background: #059669;
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
    }
    
    .progress-indicator {
        width: 300px;
    }
    
    .progress-bar {
        height: 8px;
        background: #e5e7eb;
        border-radius: 4px;
        overflow: hidden;
        margin-bottom: 8px;
    }
    
    .progress-fill {
        height: 100%;
        background: #3b82f6;
        transition: width 0.3s ease;
    }
    
    /* Responsive */
    @media (max-width: 768px) {
        .header-progress-stats {
            display: none;
        }
        
        .action-buttons-panel {
            flex-direction: column;
            gap: 12px;
        }
        
        .button-group-left, .button-group-right {
            width: 100%;
            justify-content: space-between;
        }
        
        .progress-indicator {
            width: 200px;
        }
    }
`;
document.head.appendChild(improvedStyles);

console.log('✅ NurseIQ module loaded with improved display');
