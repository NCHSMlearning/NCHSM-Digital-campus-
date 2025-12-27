// js/nurseiq.js - NurseIQ Question Bank Module (Improved)
class NurseIQModule {
    constructor() {
        this.userId = null;
        
        // NurseIQ elements
        this.studentQuestionBankSearch = document.getElementById('studentQuestionBankSearch');
        this.nurseiqSearchBtn = document.getElementById('nurseiqSearchBtn');
        this.clearSearchBtn = document.getElementById('clearSearchBtn');
        this.loadCourseCatalogBtn = document.getElementById('loadCourseCatalogBtn');
        this.studentQuestionBankLoading = document.getElementById('studentQuestionBankLoading');
        this.studentQuestionBankContent = document.getElementById('studentQuestionBankContent');
        
        // Test state variables
        this.currentTestQuestions = [];
        this.currentQuestionIndex = 0;
        this.userTestAnswers = {};
        this.currentCourseForTest = null;
        this.currentCourseQuestions = [];
        this.showAnswersMode = true;
        
        this.initializeElements();
    }
    
    initializeElements() {
        // Setup search functionality
        if (this.studentQuestionBankSearch) {
            let searchTimeout;
            this.studentQuestionBankSearch.addEventListener('input', () => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    this.loadQuestionBankCards();
                }, 300);
            });
        }
        
        // Setup button events
        if (this.nurseiqSearchBtn) {
            this.nurseiqSearchBtn.addEventListener('click', () => this.loadQuestionBankCards());
        }
        
        if (this.clearSearchBtn) {
            this.clearSearchBtn.addEventListener('click', () => this.clearQuestionBankSearch());
        }
        
        if (this.loadCourseCatalogBtn) {
            this.loadCourseCatalogBtn.addEventListener('click', () => this.loadQuestionBankCards());
        }
    }
    
    // Get Supabase client
    getSupabaseClient() {
        return window.supabaseClient || getSupabaseClient();
    }
    
    // Initialize with user ID
    initialize() {
        this.userId = getCurrentUserId();
        
        // Load question bank on initialization
        this.loadQuestionBankCards();
    }
    
    // Load question bank in card format
    async loadQuestionBankCards() {
        try {
            console.log('Loading question bank cards...');
            
            // Show loading
            this.showLoading();
            
            // Fetch ALL questions with course info
            const { data: questions, error } = await this.getSupabaseClient()
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
            
            console.log(`Fetched ${questions?.length || 0} questions from database`);
            
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
                
                // Count by difficulty
                if (question.difficulty === 'hard') coursesMap[courseId].stats.hard++;
                else if (question.difficulty === 'medium') coursesMap[courseId].stats.medium++;
                else if (question.difficulty === 'easy') coursesMap[courseId].stats.easy++;
                
                // Track last updated
                if (question.updated_at) {
                    const updatedDate = new Date(question.updated_at);
                    if (!coursesMap[courseId].stats.lastUpdated || updatedDate > coursesMap[courseId].stats.lastUpdated) {
                        coursesMap[courseId].stats.lastUpdated = updatedDate;
                    }
                }
            });
            
            // Convert to array
            const coursesArray = Object.values(coursesMap);
            
            // Calculate overall stats
            const overallStats = {
                totalCourses: coursesArray.length,
                totalQuestions: questions.length,
                activeQuestions: questions.length,
                activeRate: '100%'
            };
            
            // Display the card view
            this.displayQuestionBankCards(coursesArray, overallStats);
            
        } catch (error) {
            console.error('Error loading question bank:', error);
            this.showError(`Failed to Load Question Bank: ${error.message || 'Please try again'}`);
        } finally {
            this.hideLoading();
        }
    }
    
    // Display question bank cards
    displayQuestionBankCards(courses, overallStats) {
        if (!this.studentQuestionBankContent) return;
        
        const searchTerm = this.studentQuestionBankSearch?.value?.toLowerCase() || '';
        
        // Filter courses if search term exists
        let filteredCourses = courses;
        if (searchTerm) {
            filteredCourses = courses.filter(course => 
                course.name.toLowerCase().includes(searchTerm) ||
                course.unit_code.toLowerCase().includes(searchTerm) ||
                course.description.toLowerCase().includes(searchTerm)
            );
        }
        
        // Format date
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
                
                <!-- Course Cards -->
                <div class="courses-grid">
        `;
        
        filteredCourses.forEach(course => {
            const courseColor = course.color || '#4f46e5';
            const lastUpdated = formatDate(course.stats.lastUpdated);
            
            html += `
                <div class="course-card">
                    <!-- Course Header -->
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
                        
                        <!-- Active Questions Badge -->
                        <div class="active-badge">
                            <i class="fas fa-check-circle"></i> Active Questions
                        </div>
                    </div>
                    
                    <!-- Course Stats -->
                    <div class="course-stats">
                        <!-- Stats Grid -->
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
                        
                        <!-- Start Test Button -->
                        <button class="start-test-btn" 
                                onclick="window.startCourseTest('${course.id}', '${course.name.replace(/'/g, "\\'")}')" 
                                style="background: ${courseColor}; margin-top: 15px; width: 100%; padding: 12px;">
                            <i class="fas fa-play-circle"></i> START PRACTICE TEST
                        </button>
                        
                        <!-- Quick Stats -->
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
        
        // Empty state
        if (filteredCourses.length === 0) {
            html += `
                <div class="empty-state">
                    <i class="fas fa-search"></i>
                    <h3>No Courses Found</h3>
                    <p>No courses match your search. Try a different search term.</p>
                    <button onclick="window.clearQuestionBankSearch()" class="btn-primary">
                        <i class="fas fa-times"></i> Clear Search
                    </button>
                </div>
            `;
        }
        
        html += `
                </div>
                
                <!-- Footer Info -->
                <div class="question-bank-footer">
                    <div class="info-message">
                        <i class="fas fa-info-circle"></i>
                        <span>Click START PRACTICE TEST to begin interactive Q&A with immediate feedback</span>
                    </div>
                </div>
            </div>
        `;
        
        this.studentQuestionBankContent.innerHTML = html;
        
        // Add hover effects
        setTimeout(() => {
            document.querySelectorAll('.course-card').forEach(card => {
                card.addEventListener('mouseenter', function() {
                    this.style.transform = 'translateY(-5px)';
                    this.style.boxShadow = '0 8px 25px rgba(0,0,0,0.12)';
                });
                
                card.addEventListener('mouseleave', function() {
                    this.style.transform = 'translateY(0)';
                    this.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)';
                });
            });
            
            document.querySelectorAll('.start-test-btn').forEach(btn => {
                btn.addEventListener('mouseenter', function() {
                    this.style.transform = 'scale(1.02)';
                    this.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                });
                
                btn.addEventListener('mouseleave', function() {
                    this.style.transform = 'scale(1)';
                    this.style.boxShadow = 'none';
                });
            });
        }, 100);
    }
    
    // Clear search
    clearQuestionBankSearch() {
        if (this.studentQuestionBankSearch) {
            this.studentQuestionBankSearch.value = '';
            this.loadQuestionBankCards();
        }
    }
    
    // Start test from course card
    async startCourseTest(courseId, courseName) {
        try {
            console.log(`Starting test for course: ${courseName} (${courseId})`);
            
            // Show loading
            this.showLoading();
            
            // Fetch ALL questions for this course
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
            
            console.log(`Fetched ${questions?.length || 0} questions for course ${courseName}`);
            
            if (!questions || questions.length === 0) {
                this.showNotification('No questions available for this course yet.', 'warning');
                this.loadQuestionBankCards();
                return;
            }
            
            this.currentCourseForTest = { id: courseId, name: courseName };
            this.currentCourseQuestions = questions;
            this.currentQuestionIndex = 0;
            this.userTestAnswers = {};
            
            // Start the interactive Q&A mode
            this.displayInteractiveQuestions(courseName, questions);
            
        } catch (error) {
            console.error('Error starting course test:', error);
            this.showNotification('Failed to start test. Please try again.', 'error');
            this.loadQuestionBankCards();
        }
    }
    
    // Main interactive questions display function
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
                        
                        <div class="header-stats">
                            <div class="question-counter">
                                <div class="counter-label">Question</div>
                                <div class="counter-numbers">
                                    <span id="currentQuestionCount" class="current-number">1</span>
                                    <span class="total-divider">/</span>
                                    <span id="totalQuestions" class="total-number">${questions.length}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Main Content Container -->
                <div class="questions-main-container">
                    <!-- Left Panel: Question -->
                    <div class="question-panel">
                        <!-- Question Number & Status -->
                        <div class="question-header">
                            <div class="question-meta">
                                <span class="question-number-badge" style="background: ${courseColor};">
                                    Q${this.currentQuestionIndex + 1}
                                </span>
                                <span class="question-type">Multiple Choice</span>
                                <span class="difficulty-badge" id="difficultyBadge">Medium</span>
                            </div>
                            
                            <!-- Mini Navigation -->
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
                        
                        <!-- Answer Options -->
                        <div class="options-panel">
                            <h3 class="options-title">Select Your Answer:</h3>
                            <div id="optionsContainer" class="options-grid">
                                <!-- Options will be loaded here -->
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
                        
                        <!-- Answer & Explanation Section -->
                        <div id="answerRevealSection" class="answer-reveal-section" style="display: none;">
                            <div class="answer-header">
                                <h3><i class="fas fa-check-double"></i> Answer & Explanation</h3>
                            </div>
                            
                            <!-- Correct Answer Display -->
                            <div class="correct-answer-box">
                                <div class="correct-answer-label">
                                    <i class="fas fa-check-circle"></i> Correct Answer:
                                </div>
                                <div class="correct-answer-text" id="correctAnswerText">
                                    Loading...
                                </div>
                            </div>
                            
                            <!-- Detailed Explanation -->
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
                            
                            <!-- Learning Tips -->
                            <div class="learning-tips">
                                <div class="tip-item">
                                    <i class="fas fa-lightbulb"></i>
                                    <span>Study this explanation carefully to understand the concept</span>
                                </div>
                                <div class="tip-item">
                                    <i class="fas fa-book"></i>
                                    <span>Take notes on important points for revision</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Right Panel: Progress & Stats -->
                    <div class="stats-panel">
                        <!-- Progress Summary -->
                        <div class="progress-summary-card">
                            <h3 class="stats-title">
                                <i class="fas fa-chart-line"></i> Your Progress
                            </h3>
                            
                            <div class="progress-stats-grid">
                                <div class="progress-stat">
                                    <div class="progress-circle answered-circle">
                                        <span class="progress-number" id="answeredCount">0</span>
                                    </div>
                                    <div class="progress-label">Answered</div>
                                </div>
                                
                                <div class="progress-stat">
                                    <div class="progress-circle correct-circle">
                                        <span class="progress-number" id="correctCount">0</span>
                                    </div>
                                    <div class="progress-label">Correct</div>
                                </div>
                                
                                <div class="progress-stat">
                                    <div class="progress-circle incorrect-circle">
                                        <span class="progress-number" id="incorrectCount">0</span>
                                    </div>
                                    <div class="progress-label">Incorrect</div>
                                </div>
                                
                                <div class="progress-stat">
                                    <div class="progress-circle marked-circle">
                                        <span class="progress-number" id="markedCount">0</span>
                                    </div>
                                    <div class="progress-label">Marked</div>
                                </div>
                            </div>
                            
                            <div class="accuracy-display">
                                <div class="accuracy-label">Overall Accuracy</div>
                                <div class="accuracy-percent" id="overallAccuracy">0%</div>
                            </div>
                        </div>
                        
                        <!-- Horizontal Question Navigator -->
                        <div class="horizontal-nav-card">
                            <h3 class="nav-title">
                                <i class="fas fa-list-ol"></i> Questions
                            </h3>
                            
                            <div class="horizontal-question-grid" id="questionGridContainer">
                                <!-- Horizontal question numbers will be loaded here -->
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
                    </div>
                </div>
                
                <!-- Bottom Navigation Bar -->
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
        
        // Load first question and initialize
        setTimeout(() => {
            this.loadCurrentInteractiveQuestion();
            this.updateQuestionGrid();
            this.updateProgressBar();
            this.updateMiniDots();
        }, 100);
    }
    
    // Load current question in interactive mode
    loadCurrentInteractiveQuestion() {
        const question = this.currentCourseQuestions[this.currentQuestionIndex];
        if (!question) return;
        
        // Update question text
        const questionText = document.getElementById('questionText');
        if (questionText) {
            questionText.innerHTML = question.question_text || 'Question text not available';
        }
        
        // Update difficulty badge
        const difficultyBadge = document.getElementById('difficultyBadge');
        if (difficultyBadge) {
            difficultyBadge.textContent = question.difficulty?.toUpperCase() || 'MEDIUM';
            difficultyBadge.className = 'difficulty-badge';
            difficultyBadge.classList.add(`difficulty-${question.difficulty || 'medium'}`);
            
            // Set color based on difficulty
            const colors = {
                easy: '#10B981',
                medium: '#F59E0B',
                hard: '#EF4444'
            };
            difficultyBadge.style.backgroundColor = colors[question.difficulty] || colors.medium;
        }
        
        // Load answer options
        this.loadAnswerOptions(question);
        
        // Update counters
        this.updateCounters();
        
        // Update navigation buttons state
        this.updateNavigationButtons();
        
        // Update mark button
        this.updateMarkButton();
        
        // Hide answer reveal section initially
        const answerRevealSection = document.getElementById('answerRevealSection');
        if (answerRevealSection) {
            answerRevealSection.style.display = 'none';
        }
        
        // Reset option selection (unless already answered)
        const userAnswer = this.userTestAnswers[this.currentQuestionIndex];
        if (!userAnswer?.answered) {
            this.resetOptionSelection();
        }
        
        // Check if user already answered this question
        if (userAnswer?.answered) {
            this.showUserAnswer(userAnswer);
        }
        
        // Highlight current question in grid
        this.highlightCurrentQuestionInGrid();
    }
    
    // Load answer options
    loadAnswerOptions(question) {
        const optionsContainer = document.getElementById('optionsContainer');
        if (!optionsContainer) return;
        
        let options = [];
        try {
            // Parse options from question data
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
        
        // Default options if none provided
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
                <div class="option-item" data-option-index="${index}" data-is-correct="${isCorrectAnswer}">
                    <input type="radio" 
                           id="${optionId}" 
                           name="question-${this.currentQuestionIndex}" 
                           value="${option}" 
                           class="option-radio"
                           ${this.userTestAnswers[this.currentQuestionIndex]?.selectedOption === option ? 'checked' : ''}>
                    <label for="${optionId}" class="option-label">
                        <span class="option-letter">${optionLetter}</span>
                        <span class="option-text">${option}</span>
                    </label>
                </div>
            `;
        });
        
        optionsContainer.innerHTML = optionsHtml;
        
        // Add click handlers
        optionsContainer.querySelectorAll('.option-item').forEach(item => {
            item.addEventListener('click', () => {
                this.selectOption(item);
            });
        });
        
        // Update stored correct answer
        if (question.id) {
            this.userTestAnswers[this.currentQuestionIndex] = {
                ...this.userTestAnswers[this.currentQuestionIndex],
                questionId: question.id,
                correctAnswer: correctAnswer
            };
        }
    }
    
    // Select option
    selectOption(optionItem) {
        // Reset all options
        this.resetOptionSelection();
        
        // Select this option
        const radioInput = optionItem.querySelector('.option-radio');
        if (radioInput) {
            radioInput.checked = true;
            optionItem.classList.add('selected');
            
            // Store selected option
            const optionIndex = optionItem.dataset.optionIndex;
            const optionText = optionItem.querySelector('.option-text')?.textContent || '';
            
            this.userTestAnswers[this.currentQuestionIndex] = {
                ...this.userTestAnswers[this.currentQuestionIndex],
                selectedOption: optionText,
                selectedOptionIndex: parseInt(optionIndex),
                answered: false // Not checked yet
            };
        }
    }
    
    // Reset option selection
    resetOptionSelection() {
        const optionsContainer = document.getElementById('optionsContainer');
        if (!optionsContainer) return;
        
        optionsContainer.querySelectorAll('.option-item').forEach(item => {
            item.classList.remove('selected');
            item.classList.remove('correct');
            item.classList.remove('incorrect');
        });
        
        // Clear stored answer if not checked yet
        if (!this.userTestAnswers[this.currentQuestionIndex]?.answered) {
            delete this.userTestAnswers[this.currentQuestionIndex];
        }
    }
    
    // Show user's previous answer
    showUserAnswer(userAnswer) {
        const optionsContainer = document.getElementById('optionsContainer');
        if (!optionsContainer) return;
        
        optionsContainer.querySelectorAll('.option-item').forEach(item => {
            const optionText = item.querySelector('.option-text')?.textContent || '';
            
            if (optionText === userAnswer.selectedOption) {
                item.classList.add('selected');
                const radioInput = item.querySelector('.option-radio');
                if (radioInput) radioInput.checked = true;
                
                if (userAnswer.answered) {
                    if (userAnswer.correct) {
                        item.classList.add('correct');
                    } else {
                        item.classList.add('incorrect');
                        
                        // Also highlight correct answer
                        optionsContainer.querySelectorAll('.option-item').forEach(correctItem => {
                            const correctOptionText = correctItem.querySelector('.option-text')?.textContent || '';
                            if (correctOptionText === userAnswer.correctAnswer) {
                                correctItem.classList.add('correct');
                            }
                        });
                    }
                }
            }
        });
        
        // Show answer section if answered
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
        
        // Mark as answered
        const isCorrect = userAnswer.selectedOption === userAnswer.correctAnswer;
        userAnswer.answered = true;
        userAnswer.correct = isCorrect;
        
        // Show result
        this.showUserAnswer(userAnswer);
        
        // Update statistics
        this.updateCounters();
        
        // Show answer section
        this.showAnswerRevealSection();
        
        // Update question grid
        this.updateQuestionGrid();
        
        // Show feedback message
        this.showFeedbackNotification(isCorrect);
        
        // Auto-advance after 2 seconds if correct
        if (isCorrect && this.currentQuestionIndex < this.currentCourseQuestions.length - 1) {
            setTimeout(() => {
                this.nextQuestion();
            }, 2000);
        }
    }
    
    // Show answer reveal section
    showAnswerRevealSection() {
        const answerRevealSection = document.getElementById('answerRevealSection');
        if (!answerRevealSection) return;
        
        const question = this.currentCourseQuestions[this.currentQuestionIndex];
        if (!question) return;
        
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
        
        // Update correct answer text
        const correctAnswerText = document.getElementById('correctAnswerText');
        if (correctAnswerText) {
            correctAnswerText.textContent = correctAnswer || 'Correct answer not available';
        }
        
        // Update explanation text
        const explanationText = document.getElementById('explanationText');
        if (explanationText) {
            explanationText.innerHTML = question.explanation || 
                '<div class="no-explanation">No detailed explanation available for this question. Please review the course material.</div>';
        }
        
        // Show the section
        answerRevealSection.style.display = 'block';
    }
    
    // Show feedback notification
    showFeedbackNotification(isCorrect) {
        const notification = document.createElement('div');
        notification.className = `feedback-notification ${isCorrect ? 'success' : 'error'}`;
        notification.innerHTML = `
            <i class="fas fa-${isCorrect ? 'check-circle' : 'times-circle'}"></i>
            <span>${isCorrect ? 'Correct! Well done!' : 'Incorrect. Review the explanation below.'}</span>
        `;
        
        document.querySelector('.questions-main-container').appendChild(notification);
        
        setTimeout(() => {
            notification.classList.add('fade-out');
            setTimeout(() => notification.remove(), 500);
        }, 3000);
    }
    
    // Show general notification
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <i class="fas fa-${type === 'error' ? 'exclamation-circle' : 
                               type === 'warning' ? 'exclamation-triangle' : 
                               type === 'success' ? 'check-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        `;
        
        document.querySelector('.questions-main-container').appendChild(notification);
        
        setTimeout(() => {
            notification.classList.add('fade-out');
            setTimeout(() => notification.remove(), 500);
        }, 3000);
    }
    
    // Reset current question
    resetQuestion() {
        const userAnswer = this.userTestAnswers[this.currentQuestionIndex];
        if (userAnswer?.answered) {
            delete this.userTestAnswers[this.currentQuestionIndex];
        }
        
        this.loadCurrentInteractiveQuestion();
        this.updateQuestionGrid();
    }
    
    // Show answer without checking
    showAnswer() {
        const question = this.currentCourseQuestions[this.currentQuestionIndex];
        if (!question) return;
        
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
        
        // Highlight correct answer
        const optionsContainer = document.getElementById('optionsContainer');
        if (optionsContainer) {
            optionsContainer.querySelectorAll('.option-item').forEach(item => {
                const optionText = item.querySelector('.option-text')?.textContent || '';
                if (optionText === correctAnswer) {
                    item.classList.add('correct');
                }
            });
        }
        
        // Show answer section
        this.showAnswerRevealSection();
        
        // Mark as viewed (but not answered)
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
        }
    }
    
    // Next question
    nextQuestion() {
        if (this.currentQuestionIndex < this.currentCourseQuestions.length - 1) {
            this.currentQuestionIndex++;
            this.loadCurrentInteractiveQuestion();
            this.updateProgressBar();
            this.updateMiniDots();
        }
    }
    
    // Go to specific question
    goToQuestion(index) {
        if (index >= 0 && index < this.currentCourseQuestions.length) {
            this.currentQuestionIndex = index;
            this.loadCurrentInteractiveQuestion();
            this.updateProgressBar();
            this.updateMiniDots();
        }
    }
    
    // Jump to question using input
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
    
    // Finish practice session
    finishPractice() {
        const answeredCount = Object.values(this.userTestAnswers).filter(a => a.answered).length;
        const correctCount = Object.values(this.userTestAnswers).filter(a => a.answered && a.correct).length;
        const accuracy = answeredCount > 0 ? Math.round((correctCount / answeredCount) * 100) : 0;
        
        const confirmFinish = confirm(`Finish practice session?\n\nAnswered: ${answeredCount}/${this.currentCourseQuestions.length}\nCorrect: ${correctCount}\nAccuracy: ${accuracy}%\n\nReturn to question bank?`);
        
        if (confirmFinish) {
            this.loadQuestionBankCards();
        }
    }
    
    // Scroll question grid horizontally
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
        
        const answeredCountEl = document.getElementById('answeredCount');
        const correctCountEl = document.getElementById('correctCount');
        const incorrectCountEl = document.getElementById('incorrectCount');
        const markedCountEl = document.getElementById('markedCount');
        const overallAccuracyEl = document.getElementById('overallAccuracy');
        const currentQuestionCountEl = document.getElementById('currentQuestionCount');
        const totalQuestionsEl = document.getElementById('totalQuestions');
        
        if (answeredCountEl) answeredCountEl.textContent = answeredCount;
        if (correctCountEl) correctCountEl.textContent = correctCount;
        if (incorrectCountEl) incorrectCountEl.textContent = incorrectCount;
        if (markedCountEl) markedCountEl.textContent = markedCount;
        if (currentQuestionCountEl) currentQuestionCountEl.textContent = this.currentQuestionIndex + 1;
        if (totalQuestionsEl) totalQuestionsEl.textContent = totalQuestions;
        
        // Calculate accuracy
        const accuracy = answeredCount > 0 ? Math.round((correctCount / answeredCount) * 100) : 0;
        if (overallAccuracyEl) {
            overallAccuracyEl.textContent = `${accuracy}%`;
            overallAccuracyEl.style.color = accuracy >= 80 ? '#10B981' : 
                                           accuracy >= 60 ? '#F59E0B' : '#EF4444';
        }
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
    
    // Update horizontal question grid
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
        
        // Auto-scroll to current question
        this.scrollToCurrentQuestion();
    }
    
    // Scroll to current question in grid
    scrollToCurrentQuestion() {
        const questionGridContainer = document.getElementById('questionGridContainer');
        if (!questionGridContainer) return;
        
        const currentQuestionElement = questionGridContainer.querySelector('.grid-current');
        if (currentQuestionElement) {
            const containerWidth = questionGridContainer.clientWidth;
            const elementOffset = currentQuestionElement.offsetLeft;
            const elementWidth = currentQuestionElement.offsetWidth;
            
            // Center the current question
            questionGridContainer.scrollLeft = elementOffset - (containerWidth / 2) + (elementWidth / 2);
        }
    }
    
    // Highlight current question in grid
    highlightCurrentQuestionInGrid() {
        const questionGridContainer = document.getElementById('questionGridContainer');
        if (!questionGridContainer) return;
        
        // Remove highlight from all
        questionGridContainer.querySelectorAll('.grid-question-number').forEach(el => {
            el.classList.remove('grid-current');
        });
        
        // Add highlight to current
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
    
    // Utility functions
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
    
    hideLoading() {
        if (this.studentQuestionBankLoading) {
            this.studentQuestionBankLoading.style.display = 'none';
        }
    }
    
    showError(message) {
        if (this.studentQuestionBankContent) {
            this.studentQuestionBankContent.innerHTML = `
                <div class="error-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>Failed to Load Question Bank</h3>
                    <p>${message}</p>
                    <button onclick="window.loadQuestionBankCards()" class="btn-primary">
                        <i class="fas fa-redo"></i> Try Again
                    </button>
                </div>
            `;
        }
    }
}

// Expose methods to global scope for onclick handlers
window.NurseIQModule = NurseIQModule;
window.nurseiqModule = null;

// Initialize NurseIQ module when Supabase is ready
window.initNurseIQ = function() {
    window.nurseiqModule = new NurseIQModule();
    window.nurseiqModule.initialize();
    return window.nurseiqModule;
};

// Global helper functions for onclick handlers
window.loadQuestionBankCards = function() {
    if (window.nurseiqModule) {
        window.nurseiqModule.loadQuestionBankCards();
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

// Add CSS for horizontal question numbers and improvements
const style = document.createElement('style');
style.textContent = `
    /* Horizontal Question Grid */
    .horizontal-nav-card {
        background: white;
        border-radius: 10px;
        padding: 15px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.08);
        margin-bottom: 15px;
        border: 1px solid #e5e7eb;
    }
    
    .horizontal-question-grid {
        display: flex;
        overflow-x: auto;
        gap: 6px;
        padding: 10px 0;
        margin-bottom: 10px;
        scrollbar-width: thin;
        scrollbar-color: #cbd5e1 transparent;
    }
    
    .horizontal-question-grid::-webkit-scrollbar {
        height: 6px;
    }
    
    .horizontal-question-grid::-webkit-scrollbar-track {
        background: #f1f5f9;
        border-radius: 3px;
    }
    
    .horizontal-question-grid::-webkit-scrollbar-thumb {
        background: #cbd5e1;
        border-radius: 3px;
    }
    
    .grid-question-number {
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 8px;
        background: #f8fafc;
        border: 2px solid #e2e8f0;
        color: #64748b;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
        flex-shrink: 0;
        position: relative;
    }
    
    .grid-question-number:hover {
        background: #e2e8f0;
        transform: translateY(-2px);
    }
    
    .grid-current {
        background: #3b82f6 !important;
        border-color: #3b82f6 !important;
        color: white !important;
        box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
    }
    
    .grid-correct {
        background: #10b981 !important;
        border-color: #10b981 !important;
        color: white !important;
    }
    
    .grid-incorrect {
        background: #ef4444 !important;
        border-color: #ef4444 !important;
        color: white !important;
    }
    
    .grid-marked {
        background: #f59e0b !important;
        border-color: #f59e0b !important;
        color: white !important;
    }
    
    .grid-viewed {
        border-style: dashed;
    }
    
    .grid-flag {
        position: absolute;
        top: -4px;
        right: -4px;
        font-size: 10px;
        color: #f59e0b;
        background: white;
        border-radius: 50%;
        padding: 1px;
    }
    
    .grid-controls {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 10px;
        margin-top: 10px;
    }
    
    .grid-scroll-btn {
        background: #f1f5f9;
        border: 1px solid #cbd5e1;
        border-radius: 6px;
        padding: 6px 12px;
        cursor: pointer;
        color: #64748b;
        transition: all 0.2s ease;
    }
    
    .grid-scroll-btn:hover {
        background: #e2e8f0;
    }
    
    .grid-jump-btn {
        flex: 1;
        background: #3b82f6;
        color: white;
        border: none;
        border-radius: 6px;
        padding: 8px;
        cursor: pointer;
        font-weight: 500;
        transition: all 0.2s ease;
    }
    
    .grid-jump-btn:hover {
        background: #2563eb;
    }
    
    /* Feedback Notifications */
    .feedback-notification {
        position: fixed;
        top: 80px;
        right: 20px;
        padding: 12px 20px;
        border-radius: 8px;
        color: white;
        font-weight: 500;
        display: flex;
        align-items: center;
        gap: 10px;
        z-index: 1000;
        animation: slideIn 0.3s ease;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }
    
    .feedback-notification.success {
        background: #10b981;
    }
    
    .feedback-notification.error {
        background: #ef4444;
    }
    
    .feedback-notification.fade-out {
        animation: fadeOut 0.5s ease forwards;
    }
    
    .notification {
        position: fixed;
        top: 80px;
        left: 50%;
        transform: translateX(-50%);
        padding: 12px 20px;
        border-radius: 8px;
        color: white;
        font-weight: 500;
        display: flex;
        align-items: center;
        gap: 10px;
        z-index: 1000;
        animation: slideInDown 0.3s ease;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }
    
    .notification.info {
        background: #3b82f6;
    }
    
    .notification.warning {
        background: #f59e0b;
    }
    
    .notification.error {
        background: #ef4444;
    }
    
    .notification.success {
        background: #10b981;
    }
    
    .notification.fade-out {
        animation: fadeOut 0.5s ease forwards;
    }
    
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideInDown {
        from {
            transform: translate(-50%, -100%);
            opacity: 0;
        }
        to {
            transform: translate(-50%, 0);
            opacity: 1;
        }
    }
    
    @keyframes fadeOut {
        from {
            opacity: 1;
        }
        to {
            opacity: 0;
        }
    }
    
    /* Loading improvements */
    .loading-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        min-height: 300px;
    }
    
    .loading-spinner {
        width: 50px;
        height: 50px;
        border: 4px solid #e2e8f0;
        border-top-color: #3b82f6;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin-bottom: 15px;
    }
    
    @keyframes spin {
        to { transform: rotate(360deg); }
    }
    
    /* No explanation message */
    .no-explanation {
        color: #6b7280;
        font-style: italic;
        padding: 10px;
        background: #f9fafb;
        border-radius: 6px;
        border-left: 3px solid #d1d5db;
    }
    
    /* Finish button */
    .finish-btn {
        background: #10b981;
        margin-left: 10px;
    }
    
    .finish-btn:hover {
        background: #059669;
    }
    
    /* Difficulty badge colors */
    .difficulty-badge.easy {
        background: #10b981 !important;
    }
    
    .difficulty-badge.medium {
        background: #f59e0b !important;
    }
    
    .difficulty-badge.hard {
        background: #ef4444 !important;
    }
`;
document.head.appendChild(style);
