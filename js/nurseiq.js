// js/nurseiq.js - OPTIMIZED & FIXED VERSION
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
            await this.loadQuestionBankCards();
            this.initialized = true;
            console.log('✅ NurseIQ Module initialized');
        } catch (error) {
            console.error('❌ Failed to initialize:', error);
        }
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
                        stats: { total: 0, active: 0, hard: 0, medium: 0, easy: 0, lastUpdated: null }
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
        
        let html = `<div class="question-bank-container">`;
        
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
                            <div class="active-badge">
                                <i class="fas fa-check-circle"></i> Active Questions
                            </div>
                        </div>
                        
                        <div class="course-stats">
                            <div class="stats-grid">
                                <div class="stat-item">
                                    <div class="stat-value text-primary">${course.stats.active}</div>
                                    <div class="stat-label">ACTIVE</div>
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
                                    onclick="window.startCourseTest('${course.id}', '${course.name.replace(/'/g, "\\'")}')" 
                                    style="background: ${courseColor}">
                                <i class="fas fa-play-circle"></i> START PRACTICE TEST
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
    
    async startCourseTest(courseId, courseName) {
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
    
    displayInteractiveQuestions(courseName, questions) {
        if (!this.studentQuestionBankContent) return;
        
        const courseColor = questions[0]?.courses?.color || '#4f46e5';
        
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
                        
                        <!-- COMPACT NAVIGATION ADDED HERE -->
                        <div class="compact-navigation">
                            <button onclick="window.prevQuestion()" id="prevBtn" class="compact-nav-btn compact-nav-prev">
                                <i class="fas fa-chevron-left"></i> Previous
                            </button>
                            
                            <div class="compact-progress">
                                <div class="compact-progress-bar">
                                    <div class="compact-progress-fill" id="progressFill" style="width: 0%;"></div>
                                </div>
                                <span class="compact-progress-text" id="progressPercent">0%</span>
                            </div>
                            
                            <button onclick="window.nextQuestion()" id="nextBtn" class="compact-nav-btn compact-nav-next">
                                Next <i class="fas fa-chevron-right"></i>
                            </button>
                            
                            <button onclick="window.finishPractice()" class="compact-nav-btn compact-nav-finish">
                                <i class="fas fa-flag-checkered"></i> Finish
                            </button>
                        </div>
                        
                        <div id="answerRevealSection" class="answer-reveal-section" style="display: none;">
                            <div class="answer-header">
                                <h3><i class="fas fa-check-double"></i> Answer & Explanation</h3>
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
        
        const answerRevealSection = document.getElementById('answerRevealSection');
        if (answerRevealSection) answerRevealSection.style.display = 'none';
        
        const userAnswer = this.userTestAnswers[this.currentQuestionIndex];
        if (!userAnswer?.answered) this.resetOptionSelection();
        if (userAnswer?.answered) this.showUserAnswer(userAnswer);
        
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
                        <input type="radio" id="${optionId}" name="question-${this.currentQuestionIndex}" value="${option}" class="option-input-hidden"
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
        
        optionsContainer.querySelectorAll('.option-item-improved').forEach(item => {
            item.addEventListener('click', () => this.selectOption(item));
        });
        
        if (question.id) {
            this.userTestAnswers[this.currentQuestionIndex] = {
                ...this.userTestAnswers[this.currentQuestionIndex],
                questionId: question.id,
                correctAnswer: correctAnswer
            };
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
        if (!this.userTestAnswers[this.currentQuestionIndex]?.answered) {
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
        
        if (userAnswer.answered) this.showAnswerRevealSection();
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
        userAnswer.answered = true;
        userAnswer.correct = isCorrect;
        
        this.showUserAnswer(userAnswer);
        this.updateCounters();
        this.updateTopProgressStats();
        this.showAnswerRevealSection();
        this.updateQuestionGrid();
        this.showFeedbackNotification(isCorrect);
        
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
        const userAnswer = this.userTestAnswers[this.currentQuestionIndex];
        if (userAnswer?.answered) delete this.userTestAnswers[this.currentQuestionIndex];
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
        const isMarked = this.userTestAnswers[currentIndex]?.marked || false;
        this.userTestAnswers[currentIndex] = { ...this.userTestAnswers[currentIndex], marked: !isMarked };
        this.updateMarkButton();
        this.updateQuestionGrid();
        this.updateMiniDots();
        this.updateTopProgressStats();
        const action = !isMarked ? 'marked for review' : 'unmarked';
        this.showNotification(`Question ${currentIndex + 1} ${action}`, 'info');
    }
    
    updateMarkButton() {
        const markBtn = document.getElementById('markBtn');
        const markBtnText = document.getElementById('markBtnText');
        if (!markBtn || !markBtnText) return;
        const isMarked = this.userTestAnswers[this.currentQuestionIndex]?.marked || false;
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
        const answeredCount = Object.values(this.userTestAnswers).filter(a => a.answered).length;
        const correctCount = Object.values(this.userTestAnswers).filter(a => a.answered && a.correct).length;
        const accuracy = answeredCount > 0 ? Math.round((correctCount / answeredCount) * 100) : 0;
        const confirmFinish = confirm(`Finish practice session?\n\nAnswered: ${answeredCount}/${this.currentCourseQuestions.length}\nCorrect: ${correctCount}\nAccuracy: ${accuracy}%\n\nReturn to question bank?`);
        if (confirmFinish) this.loadQuestionBankCards();
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
        const totalQuestions = this.currentCourseQuestions.length;
        const answeredCount = Object.values(this.userTestAnswers).filter(a => a.answered).length;
        const correctCount = Object.values(this.userTestAnswers).filter(a => a.answered && a.correct).length;
        const accuracy = answeredCount > 0 ? Math.round((correctCount / answeredCount) * 100) : 0;
        
        const currentQuestionCountEl = document.getElementById('currentQuestionCountTop');
        const totalQuestionsEl = document.getElementById('totalQuestionsTop');
        const answeredCountEl = document.getElementById('answeredCountTop');
        const correctCountEl = document.getElementById('correctCountTop');
        const accuracyEl = document.getElementById('accuracyTop');
        
        if (currentQuestionCountEl) currentQuestionCountEl.textContent = this.currentQuestionIndex + 1;
        if (totalQuestionsEl) totalQuestionsEl.textContent = totalQuestions;
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
            let questionClass = 'grid-question-number';
            if (i === this.currentQuestionIndex) questionClass += ' grid-current';
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
            gridHtml += `<div class="${questionClass}" onclick="window.goToQuestion(${i})" title="Question ${i + 1}${userAnswer?.answered ? ` - ${userAnswer.correct ? 'Correct' : 'Incorrect'}` : ''}">
                        ${i + 1}${userAnswer?.marked ? '<i class="fas fa-flag grid-flag"></i>' : ''}</div>`;
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
            if (this.userTestAnswers[i]?.answered) {
                dotClass += this.userTestAnswers[i]?.correct ? ' mini-dot-correct' : ' mini-dot-incorrect';
            } else if (this.userTestAnswers[i]?.marked) {
                dotClass += ' mini-dot-marked';
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

window.loadQuestionBankCards = function() {
    if (window.nurseiqModule) window.nurseiqModule.loadQuestionBankCards();
    else window.initNurseIQ().then(() => window.nurseiqModule.loadQuestionBankCards()).catch(console.error);
};
window.clearQuestionBankSearch = function() { if (window.nurseiqModule) window.nurseiqModule.clearQuestionBankSearch(); };
window.startCourseTest = function(courseId, courseName) { if (window.nurseiqModule) window.nurseiqModule.startCourseTest(courseId, courseName); };
window.prevQuestion = function() { if (window.nurseiqModule) window.nurseiqModule.prevQuestion(); };
window.nextQuestion = function() { if (window.nurseiqModule) window.nurseiqModule.nextQuestion(); };
window.goToQuestion = function(index) { if (window.nurseiqModule) window.nurseiqModule.goToQuestion(index); };
window.jumpToQuestion = function() { if (window.nurseiqModule) window.nurseiqModule.jumpToQuestion(); };
window.checkAnswer = function() { if (window.nurseiqModule) window.nurseiqModule.checkAnswer(); };
window.resetQuestion = function() { if (window.nurseiqModule) window.nurseiqModule.resetQuestion(); };
window.showAnswer = function() { if (window.nurseiqModule) window.nurseiqModule.showAnswer(); };
window.markForReview = function() { if (window.nurseiqModule) window.nurseiqModule.markForReview(); };
window.finishPractice = function() { if (window.nurseiqModule) window.nurseiqModule.finishPractice(); };
window.scrollQuestions = function(direction) { if (window.nurseiqModule) window.nurseiqModule.scrollQuestions(direction); };

console.log('✅ NurseIQ module loaded (Optimized & Fixed)');
