// ============================================================
// CONFIGURATION
// ============================================================
const CONFIG = {
    SUPABASE_URL: 'https://lwhtjozfsmbyihenfunw.supabase.co',
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx3aHRqb3pmc21ieWloZW5mdW53Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk2NTgxMjcsImV4cCI6MjA3NTIzNDEyN30.7Z8AYvPQwTAEEEhODlW6Xk-IR1FK3Uj5ivZS7P17Wpk',
    FACE_MODEL_URL: 'https://justadudewhohacks.github.io/face-api.js/models',
    FACE_DETECTION_INTERVAL: 300,
    FACE_SCORE_THRESHOLD: 0.6,
    MAX_BLUR_COUNT: 10,
    MAX_TAB_SWITCHES: 3,
    MAX_TIME_PER_QUESTION: 120,
    CONSECUTIVE_FACE_LOST_LIMIT: 10,
    TOTAL_VIOLATIONS_LIMIT: 3,
    RECOVERY_TIMER_SECONDS: 20,
    RETRY_COOLDOWN_SECONDS: 10,
    STORAGE_PREFIX: 'exam_',
    SNAPSHOT_INTERVAL: 30000,
    HEARTBEAT_INTERVAL: 15000,
    SAVE_INTERVAL: 10000,
    INACTIVITY_TIMEOUT: 30 * 60 * 1000,
};

// ============================================================
// SUPABASE CLIENT
// ============================================================
const sb = supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);

// ============================================================
// APPLICATION STATE
// ============================================================
const AppState = {
    studentId: null,
    studentProfile: null,
    examId: null,
    examData: null,
    questions: [],
    currentIndex: 0,
    duration: 0,
    answers: {},
    flaggedQuestions: {},
    hasAnsweredAtLeastOne: false,
    examStarted: false,
    isExamActive: false,
    isExamPaused: false,
    isSubmitting: false,
    termsAgreed: false,
    cameraWorking: false,
    faceVerified: false,
    currentStep: 1,
    cameraStream: null,
    isCameraTesting: false,
    timerWarningShown: false,
    fullscreenWarningActive: false,
    attendanceRecorded: false,
    blurCount: 0,
    tabSwitchCount: 0,
    timerInterval: null,
    snapshotInterval: null,
    heartbeatInterval: null,
    saveProgressInterval: null,
    questionTimerInterval: null,
    inactivityTimer: null,
    countdownInterval: null,
    questionStartTime: Date.now(),
    questionTimeElapsed: 0,
    questionTimes: {},
    secureProctor: null,
    stealthProctor: null,
};

// ============================================================
// DOM REFS
// ============================================================
const DOM = {};

function initDomRefs() {
    DOM.lobbyContainer = document.getElementById('lobbyContainer');
    DOM.examInterface = document.getElementById('examInterface');
    DOM.examContainer = document.getElementById('exam-container');
    DOM.examTimer = document.getElementById('timer');
    DOM.timerDisplay = document.getElementById('timerDisplay');
    DOM.questionStatusTable = document.getElementById('question-status-table');
    DOM.prevBtn = document.getElementById('prev-btn');
    DOM.nextBtn = document.getElementById('next-btn');
    DOM.submitBtn = document.getElementById('submit-exam-btn');
    DOM.submitText = document.getElementById('submit-text');
    DOM.submitSpinner = document.getElementById('submit-spinner');
    DOM.progressFill = document.getElementById('progress-fill');
    DOM.currentSpan = document.getElementById('current');
    DOM.totalSpan = document.getElementById('total');
    DOM.examTitle = document.getElementById('exam-title');
    DOM.faceVideo = document.getElementById('face-video');
    DOM.faceCanvas = document.getElementById('face-canvas');
    DOM.cameraContainer = document.getElementById('cameraContainer');
    DOM.examStatusDot = document.getElementById('examStatusDot');
    DOM.examStatusText = document.getElementById('examStatusText');
    DOM.examFaceCount = document.getElementById('examFaceCount');
    DOM.autoSaveStatus = document.getElementById('auto-save-status');
    DOM.faceBlockOverlay = document.getElementById('face-block-overlay');
    DOM.faceBlockReason = document.getElementById('face-block-reason');
    DOM.faceRecoveryCountdown = document.getElementById('face-recovery-countdown');
    DOM.multipleFacesWarning = document.getElementById('multiple-faces-warning');
    DOM.proctoringStatusText = document.getElementById('proctoringStatusText');
    DOM.statsAnswered = document.getElementById('statsAnswered');
    DOM.statsFlagged = document.getElementById('statsFlagged');
    DOM.statsFace = document.getElementById('statsFace');
    DOM.statsProgress = document.getElementById('statsProgress');
    DOM.statsUnanswered = document.getElementById('statsUnanswered');
    DOM.attendanceModal = document.getElementById('attendance-required-modal');
    DOM.appBlockOverlay = document.getElementById('app-block-overlay');
    DOM.fullscreenExitWarning = document.getElementById('fullscreen-exit-warning');
    DOM.exitCountdown = document.getElementById('exit-countdown');
    DOM.submissionProgress = document.getElementById('submission-progress-overlay');
    DOM.submissionMessage = document.getElementById('submission-message');
    DOM.submissionProgressFill = document.getElementById('submission-progress-fill');
    DOM.submissionPercentage = document.getElementById('submission-percentage');
    DOM.networkIndicator = document.getElementById('networkIndicator');
    DOM.flagQuestionBtn = document.getElementById('flag-question-btn');
    DOM.reviewContainer = document.getElementById('review-container');
    DOM.reviewModeToggle = document.getElementById('review-mode-toggle');
    DOM.answerSaved = document.getElementById('answer-saved');
    DOM.submissionModal = document.getElementById('submission-modal');
    DOM.modalMessage = document.getElementById('modal-message');
    
    DOM.termsCheckbox = document.getElementById('termsCheckbox');
    DOM.termsNextBtn = document.getElementById('termsNextBtn');
    DOM.cameraNextBtn = document.getElementById('cameraNextBtn');
    DOM.startExamBtn = document.getElementById('startExamBtn');
    DOM.cameraVideo = document.getElementById('cameraVideo');
    DOM.cameraPreview = document.getElementById('cameraPreview');
    DOM.cameraStatusDot = document.getElementById('cameraStatusDot');
    DOM.cameraStatusText = document.getElementById('cameraStatusText');
    DOM.cameraStatusMessage = document.getElementById('cameraStatusMessage');
    DOM.faceCountDisplay = document.getElementById('faceCountDisplay');
    DOM.testCameraBtn = document.getElementById('testCameraBtn');
    DOM.retryCameraBtn = document.getElementById('retryCameraBtn');
    DOM.faceVerifiedCheck = document.getElementById('faceVerifiedCheck');
    DOM.readyStudentName = document.getElementById('readyStudentName');
    DOM.studentName = document.getElementById('studentName');
    DOM.studentReg = document.getElementById('studentReg');
    DOM.studentProgram = document.getElementById('studentProgram');
    DOM.examStudentName = document.getElementById('examStudentName');
    DOM.examStudentReg = document.getElementById('examStudentReg');
    DOM.examTitleLobby = document.getElementById('examTitle');
    DOM.examDuration = document.getElementById('examDuration');
    DOM.examQuestions = document.getElementById('examQuestions');
    DOM.examPassMark = document.getElementById('examPassMark');
    DOM.funFact = document.getElementById('funFact');
}

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

function shuffleArrayWithSeed(array, seed) {
    const shuffled = [...array];
    let s = seed.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    for (let i = shuffled.length - 1; i > 0; i--) {
        s = (s * 9301 + 49297) % 233280;
        const j = Math.floor((s / 233280) * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

function getStorageKey(key) {
    return `${CONFIG.STORAGE_PREFIX}${AppState.examId}_${key}_${AppState.studentId}`;
}

function saveToLocalStorage(key, data) {
    try {
        localStorage.setItem(getStorageKey(key), JSON.stringify(data));
        return true;
    } catch (e) { return false; }
}

function loadFromLocalStorage(key) {
    try {
        const data = localStorage.getItem(getStorageKey(key));
        return data ? JSON.parse(data) : null;
    } catch (e) { return null; }
}

function removeFromLocalStorage(key) {
    try {
        localStorage.removeItem(getStorageKey(key));
        return true;
    } catch (e) { return false; }
}

function showToast(message, type = 'info') {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();

    const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `${icons[type] || ''} ${message}`;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.5s ease';
        setTimeout(() => toast.remove(), 500);
    }, 3000);
}

function formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
}

window.showToast = showToast;

async function getIPAddress() {
    try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        return data.ip;
    } catch { return 'unknown'; }
}

// ============================================================
// FACE DETECTION - LOAD ONCE
// ============================================================
let faceModelsLoaded = false;

async function loadFaceDetectionModels() {
    if (faceModelsLoaded) return true;
    try {
        await faceapi.nets.tinyFaceDetector.loadFromUri(CONFIG.FACE_MODEL_URL);
        faceModelsLoaded = true;
        console.log('✅ Face detection models loaded');
        return true;
    } catch (error) {
        console.warn('Face detection not available:', error);
        return false;
    }
}

async function fastDetectFace(videoElement) {
    if (!videoElement || !videoElement.srcObject) return null;
    try {
        const options = new faceapi.TinyFaceDetectorOptions({
            inputSize: 160,
            scoreThreshold: CONFIG.FACE_SCORE_THRESHOLD
        });
        const detections = await faceapi.detectAllFaces(videoElement, options);
        return detections;
    } catch (error) {
        return null;
    }
}

// ============================================================
// SINGLE CAMERA TEST - FAST & ONLY IN LOBBY
// ============================================================
window.testCamera = async function() {
    if (AppState.isCameraTesting) return;
    AppState.isCameraTesting = true;
    DOM.testCameraBtn.disabled = true;
    DOM.testCameraBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Starting...';

    try {
        const constraints = {
            video: {
                facingMode: 'user',
                width: { ideal: 480 },
                height: { ideal: 360 },
                frameRate: { ideal: 20 }
            },
            audio: false
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        AppState.cameraStream = stream;

        // Use same stream for both lobby and exam
        DOM.cameraVideo.srcObject = stream;
        DOM.faceVideo.srcObject = stream;
        
        await Promise.all([
            DOM.cameraVideo.play(),
            DOM.faceVideo.play()
        ]);

        DOM.cameraPreview.className = 'camera-preview';
        DOM.cameraStatusDot.className = 'status-dot good';
        DOM.cameraStatusText.textContent = 'Camera active - Verifying...';
        DOM.cameraStatusMessage.className = 'camera-status-text info';
        DOM.cameraStatusMessage.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verifying face...';
        DOM.retryCameraBtn.style.display = 'none';
        DOM.testCameraBtn.style.display = 'none';
        AppState.cameraWorking = true;

        await loadFaceDetectionModels();

        // Fast face detection - 5 quick attempts
        let faceDetected = false;
        let attempts = 0;
        const maxAttempts = 5;
        
        while (attempts < maxAttempts && !faceDetected) {
            await new Promise(r => setTimeout(r, 200));
            attempts++;
            
            const detections = await fastDetectFace(DOM.cameraVideo);
            if (detections && detections.length === 1) {
                faceDetected = true;
                break;
            } else if (detections && detections.length > 1) {
                DOM.faceCountDisplay.textContent = `👤 ${detections.length} faces ⚠️`;
                DOM.cameraStatusMessage.className = 'camera-status-text warning';
                DOM.cameraStatusMessage.innerHTML = `<i class="fas fa-exclamation-triangle"></i> ${detections.length} faces detected - only 1 allowed`;
                await new Promise(r => setTimeout(r, 500));
            } else {
                DOM.faceCountDisplay.textContent = '👤 0 faces';
            }
        }

        if (faceDetected) {
            AppState.faceVerified = true;
            DOM.faceCountDisplay.textContent = '👤 1 face ✅';
            DOM.cameraPreview.className = 'camera-preview camera-status-good';
            DOM.cameraStatusDot.className = 'status-dot good';
            DOM.cameraStatusText.textContent = '✅ Face verified!';
            DOM.cameraStatusMessage.className = 'camera-status-text success';
            DOM.cameraStatusMessage.innerHTML = '<i class="fas fa-check-circle"></i> ✅ Camera ready!';
            DOM.cameraNextBtn.disabled = false;
            
            if (DOM.faceVerifiedCheck) {
                DOM.faceVerifiedCheck.innerHTML = `
                    <span class="check-icon verified"><i class="fas fa-check-circle"></i></span>
                    <span>✅ Face verified! You're all set 😊</span>
                `;
            }
            
            updateStartButton();
            showToast('✅ Camera ready!', 'success');
            
        } else {
            AppState.faceVerified = false;
            DOM.cameraPreview.className = 'camera-preview camera-status-warning';
            DOM.cameraStatusDot.className = 'status-dot warning';
            DOM.cameraStatusText.textContent = '⚠️ No face detected';
            DOM.cameraStatusMessage.className = 'camera-status-text warning';
            DOM.cameraStatusMessage.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Please look at the camera';
            DOM.cameraNextBtn.disabled = true;
            
            if (DOM.faceVerifiedCheck) {
                DOM.faceVerifiedCheck.innerHTML = `
                    <span class="check-icon pending"><i class="fas fa-circle"></i></span>
                    <span>🔍 Please look at the camera...</span>
                `;
            }
            
            setTimeout(() => {
                if (!AppState.faceVerified && !AppState.isCameraTesting) {
                    showToast('🔄 Retrying...', 'info');
                    window.testCamera();
                }
            }, 2000);
        }

    } catch (error) {
        console.error('Camera error:', error);
        DOM.cameraPreview.className = 'camera-preview camera-status-danger';
        DOM.cameraStatusDot.className = 'status-dot danger';
        DOM.cameraStatusText.textContent = 'Camera failed';
        DOM.cameraStatusMessage.className = 'camera-status-text error';
        DOM.cameraStatusMessage.innerHTML =
            '<i class="fas fa-exclamation-circle"></i> Camera access denied. Please allow camera access.';
        DOM.retryCameraBtn.style.display = 'flex';
        DOM.testCameraBtn.style.display = 'none';
        AppState.cameraWorking = false;
        AppState.faceVerified = false;
        DOM.cameraNextBtn.disabled = true;
        updateStartButton();
        showToast('❌ Camera access denied', 'error');
    }

    AppState.isCameraTesting = false;
    DOM.testCameraBtn.disabled = false;
};

// ============================================================
// LOBBY FUNCTIONS
// ============================================================

async function loadLobbyData() {
    try {
        const { data: profile } = await sb
            .from('consolidated_user_profiles_table')
            .select('*')
            .eq('user_id', AppState.studentId)
            .single();

        if (profile) {
            AppState.studentProfile = profile;
            DOM.studentName.textContent = profile.full_name || 'Unknown';
            DOM.studentReg.textContent = profile.student_id || 'N/A';
            DOM.studentProgram.textContent = profile.program || 'N/A';
            DOM.examStudentName.textContent = profile.full_name || 'Unknown';
            DOM.examStudentReg.textContent = profile.student_id || 'N/A';
            
            if (DOM.readyStudentName) {
                DOM.readyStudentName.textContent = profile.full_name || 'Student';
            }
            
            if (DOM.funFact && profile.full_name) {
                const facts = [
                    `💡 ${profile.full_name}, a positive mindset can improve performance by up to 15%!`,
                    `🌟 ${profile.full_name}, you've got this! Preparation is the key to success.`,
                    `📚 ${profile.full_name}, every great journey begins with a single step.`,
                    `💪 ${profile.full_name}, believe in yourself! You are capable of amazing things.`,
                    `🎯 ${profile.full_name}, focus on the goal, the path will become clear.`
                ];
                DOM.funFact.textContent = facts[Math.floor(Math.random() * facts.length)];
            }
        }

        const { data: exam } = await sb
            .from('exams')
            .select('*')
            .eq('id', AppState.examId)
            .single();

        if (exam) {
            AppState.examData = exam;
            DOM.examTitleLobby.textContent = exam.title || exam.exam_name || 'Exam';
            DOM.examDuration.textContent = exam.duration_minutes || 30;
            DOM.examPassMark.textContent = exam.pass_mark || 60;

            const { data: qData } = await sb
                .from('exam_questions')
                .select('id', { count: 'exact' })
                .eq('exam_id', AppState.examId);

            const count = qData ? qData.length : 0;
            DOM.examQuestions.textContent = count;
            DOM.totalSpan.textContent = count;
        }

    } catch (error) {
        console.error('Error loading data:', error);
        showToast('Error loading exam data', 'error');
    }
}

window.toggleTermsAgreed = function() {
    AppState.termsAgreed = DOM.termsCheckbox.checked;
    DOM.termsNextBtn.disabled = !AppState.termsAgreed;
    updateStartButton();
};

window.goToStep = function(step) {
    AppState.currentStep = step;
    for (let i = 1; i <= 3; i++) {
        const stepEl = document.getElementById(`step${i}`);
        const contentEl = document.getElementById(`stepContent${i}`);
        stepEl.classList.remove('active', 'completed');
        contentEl.classList.remove('active');

        if (i < step) {
            stepEl.classList.add('completed');
        } else if (i === step) {
            stepEl.classList.add('active');
            contentEl.classList.add('active');
        }
    }

    if (step === 2 && AppState.cameraWorking && AppState.faceVerified) {
        DOM.cameraNextBtn.disabled = false;
    }
    if (step === 3) {
        updateStartButton();
    }
};

function updateStartButton() {
    const ready = AppState.termsAgreed && AppState.cameraWorking && AppState.faceVerified;
    DOM.startExamBtn.disabled = !ready;
    if (DOM.startExamBtn.disabled) {
        DOM.startExamBtn.innerHTML = `
            <span class="btn-icon">⏳</span>
            <span>Waiting for verification...</span>
        `;
    } else {
        DOM.startExamBtn.innerHTML = `
            <span class="btn-icon">🎯</span>
            <span>I'm Ready! Start My Exam</span>
            <i class="fas fa-arrow-right"></i>
        `;
    }
}

// ============================================================
// START EXAM
// ============================================================
window.startExam = async function() {
    if (!AppState.cameraWorking || !AppState.termsAgreed || !AppState.faceVerified) {
        showToast('Please complete all steps first', 'warning');
        return;
    }

    const detections = await fastDetectFace(DOM.cameraVideo);
    if (!detections || detections.length !== 1) {
        showToast('❌ Face verification failed. Please try again.', 'error');
        return;
    }

    try {
        await markExamAttendance('in_progress');
        AppState.attendanceRecorded = true;
    } catch (e) {
        console.warn('Could not mark attendance:', e);
    }

    try {
        const stealthProctor = new StealthProctor();
        AppState.stealthProctor = stealthProctor;
        await stealthProctor.startStealthRecording(AppState.studentId, AppState.examId);
    } catch (error) {
        console.warn('Stealth proctoring error:', error);
    }

    DOM.lobbyContainer.classList.remove('active');
    DOM.examInterface.classList.add('active');
    
    if (AppState.cameraStream) {
        DOM.faceVideo.srcObject = AppState.cameraStream;
        await DOM.faceVideo.play();
    }
    
    await enterSecureFullscreen();
    initExam();
};

// ============================================================
// EXAM INITIALIZATION
// ============================================================
async function initExam() {
    console.log('📝 Initializing exam...');

    try {
        const examResult = await sb
            .from('exams')
            .select('exam_name, duration_minutes, pass_mark, total_marks')
            .eq('id', AppState.examId)
            .single();

        if (examResult.data) {
            const exam = examResult.data;
            DOM.examTitle.textContent = exam.exam_name || 'Examination';
            AppState.duration = exam.duration_minutes || 30;
        }

        const qResult = await sb
            .from('exam_questions')
            .select('*')
            .eq('exam_id', AppState.examId)
            .order('question_number');

        if (qResult.data && qResult.data.length > 0) {
            AppState.questions = qResult.data;
            
            const studentSeed = AppState.studentId + '_' + AppState.examId;
            AppState.questions = shuffleArrayWithSeed([...AppState.questions], studentSeed);
            
            DOM.totalSpan.textContent = AppState.questions.length;

            renderQuestionStatusTable();
            await loadSavedAnswers();
            checkSavedProgress();
            loadFlaggedQuestions();
            renderQuestion(0);
            startTimer(AppState.duration * 60);
            startExamFaceDetection();
            setupFullscreenMonitoring();
            setupNetworkMonitoring();
            setupBeforeUnloadHandler();
            setupInactivityTimer();

            AppState.saveProgressInterval = setInterval(saveProgressLocally, CONFIG.SAVE_INTERVAL);
            AppState.heartbeatInterval = setInterval(sendHeartbeat, CONFIG.HEARTBEAT_INTERVAL);
            startSnapshotCapture();

            setupExamEventListeners();
            updateExamStats();

            AppState.isExamActive = true;
            AppState.examStarted = true;

            const answerCount = Object.keys(AppState.answers).length;
            if (answerCount > 0 || AppState.hasAnsweredAtLeastOne) {
                DOM.submitBtn.disabled = false;
            }

            showToast('📝 Exam started! Good luck!', 'success');
            await logProctoringEvent('exam_started', 'Exam started with proctoring', 'info');
            showSwipeHint();

        } else {
            DOM.examContainer.innerHTML = '<div class="error-message">❌ No questions found for this exam.</div>';
        }

    } catch (error) {
        console.error('Error initializing exam:', error);
        DOM.examContainer.innerHTML = '<div class="error-message">❌ Error loading exam: ' + error.message + '</div>';
    }
}

// ============================================================
// FACE DETECTION - EXAM
// ============================================================
async function startExamFaceDetection() {
    try {
        await loadFaceDetectionModels();
        
        if (!AppState.secureProctor) {
            AppState.secureProctor = new SecureFaceProctor(AppState.examId, AppState.studentId, {
                onViolation: (count, message) => {
                    showToast(message, 'warning');
                    if (DOM.examStatusText) DOM.examStatusText.textContent = message;
                    console.log(`⚠️ Face violation ${count}/3`);
                },
                onPause: (reason, timer) => {
                    const overlay = DOM.faceBlockOverlay;
                    if (overlay) {
                        overlay.style.display = 'flex';
                        overlay.classList.add('active');
                        DOM.faceBlockReason.textContent = reason;
                        DOM.faceRecoveryCountdown.textContent = timer;
                    }
                    DOM.proctoringStatusText.textContent = '⛔ Paused!';
                    DOM.proctoringStatusText.className = 'status-value danger';
                    DOM.statsFace.textContent = '⛔ Paused';
                    DOM.statsFace.style.color = '#DC2626';
                    updateCameraStatus('danger', '⛔ Exam Paused - Face Lost', '0 faces');
                    DOM.cameraContainer.className = 'camera-container face-lost';
                    AppState.isExamPaused = true;
                },
                onResume: () => {
                    const overlay = DOM.faceBlockOverlay;
                    if (overlay) {
                        overlay.style.display = 'none';
                        overlay.classList.remove('active');
                    }
                    DOM.proctoringStatusText.textContent = 'Active';
                    DOM.proctoringStatusText.className = 'status-value active';
                    DOM.statsFace.textContent = '✅ OK';
                    DOM.statsFace.style.color = '#38A169';
                    updateCameraStatus('good', '✅ Face detected', '1 face');
                    DOM.cameraContainer.className = 'camera-container face-verified';
                    AppState.isExamPaused = false;
                    showToast('✅ Face detected! Exam resumed.', 'success');
                },
                onAutoSubmit: () => {
                    showToast('❌ Auto-submitting due to violations', 'error');
                    const overlay = DOM.faceBlockOverlay;
                    if (overlay) {
                        DOM.faceBlockReason.textContent = '❌ Too many violations! Auto-submitting...';
                        DOM.faceRecoveryCountdown.textContent = '0';
                    }
                    setTimeout(() => executeSubmissionWithLoading(), 1000);
                }
            });
        }
        
        AppState.secureProctor.startDetection(DOM.faceVideo, DOM.faceCanvas);
        
        updateCameraStatus('good', '✅ Face detection active', 'Detecting...');
        DOM.cameraContainer.className = 'camera-container face-verified';
        DOM.proctoringStatusText.textContent = 'Active';
        DOM.proctoringStatusText.className = 'status-value active';
        DOM.statsFace.textContent = '✅ OK';
        DOM.statsFace.style.color = '#38A169';
        
        console.log('✅ Face detection started');
        
    } catch (error) {
        console.error('Face detection error:', error);
        updateCameraStatus('danger', '❌ Face detection unavailable', '0 faces');
    }
}

function updateCameraStatus(status, text, faceCount) {
    if (DOM.examStatusDot) DOM.examStatusDot.className = 'status-dot ' + status;
    if (DOM.examStatusText) DOM.examStatusText.textContent = text;
    if (DOM.examFaceCount) DOM.examFaceCount.textContent = '👤 ' + faceCount;
}

// ============================================================
// SECURE FACE PROCTOR CLASS
// ============================================================
// ============================================================
// SECURE FACE PROCTOR CLASS - FIXED TIMER
// ============================================================
class SecureFaceProctor {
    constructor(examId, studentId, callbacks = {}) {
        this.examId = examId;
        this.studentId = studentId;
        this.callbacks = callbacks;
        this.config = {
            CONSECUTIVE_LOST_LIMIT: CONFIG.CONSECUTIVE_FACE_LOST_LIMIT,
            TOTAL_VIOLATIONS_LIMIT: CONFIG.TOTAL_VIOLATIONS_LIMIT,
            RECOVERY_TIMER_SECONDS: CONFIG.RECOVERY_TIMER_SECONDS,
            RETRY_COOLDOWN_SECONDS: CONFIG.RETRY_COOLDOWN_SECONDS,
            DETECTION_INTERVAL: CONFIG.FACE_DETECTION_INTERVAL,
        };
        this.state = {
            consecutiveLost: 0,
            totalViolations: 0,
            isPaused: false,
            isSubmitting: false,
            recoveryTimer: null,
            recoveryTimerId: null,  // Add this to track timer ID
            detectionInterval: null,
            lastRetryTime: 0,
            faceStable: false,
            lastFaceCount: 0,
            remainingTime: 0,  // Track remaining time
        };
        this.video = null;
        this.canvas = null;
        this.ctx = null;
    }
    
    startDetection(video, canvas) {
        this.video = video;
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        canvas.width = 320;
        canvas.height = 240;
        
        if (this.state.detectionInterval) clearInterval(this.state.detectionInterval);
        
        this.state.detectionInterval = setInterval(async () => {
            if (!this.video || !this.video.srcObject) return;
            
            try {
                const detections = await fastDetectFace(this.video);
                this.drawDetections(detections);
                const faceCount = detections ? detections.length : 0;
                this.handleDetectionResult(faceCount);
            } catch (error) {}
        }, this.config.DETECTION_INTERVAL);
    }
    
    drawDetections(detections) {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, 320, 240);
        
        if (!detections || detections.length === 0) return;
        
        detections.forEach((det, index) => {
            const box = det.box;
            const color = detections.length === 1 ? '#16A34A' : '#DC2626';
            
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.shadowColor = color;
            ctx.shadowBlur = 10;
            ctx.strokeRect(box.x * 0.5, box.y * 0.5, box.width * 0.5, box.height * 0.5);
            ctx.shadowBlur = 0;
        });
    }
    
    handleDetectionResult(faceCount) {
        if (this.state.isSubmitting) return;
        
        if (faceCount === 1) {
            this.state.consecutiveLost = 0;
            this.state.faceStable = true;
            
            // If exam is paused, resume immediately
            if (this.state.isPaused) {
                this.resumeExam();
            }
            updateCameraStatus('good', '✅ Face detected', '1 face');
            return;
        }
        
        // If exam is paused and face is lost again, don't increment more
        if (this.state.isPaused) {
            // Still update the status but don't count more violations
            updateCameraStatus('warning', `⏳ Face still lost (${this.state.remainingTime || 0}s remaining)`, '0 faces');
            return;
        }
        
        this.state.consecutiveLost++;
        this.state.faceStable = false;
        
        if (faceCount > 1) {
            updateCameraStatus('warning', `⚠️ Multiple faces (${faceCount})`, `${faceCount} faces`);
            this.showMultipleFacesWarning(faceCount);
        } else {
            updateCameraStatus('warning', `⚠️ Face lost (${this.state.consecutiveLost}/${this.config.CONSECUTIVE_LOST_LIMIT})`, '0 faces');
        }
        
        if (this.state.consecutiveLost >= this.config.CONSECUTIVE_LOST_LIMIT) {
            this.handleViolation();
        }
    }
    
    showMultipleFacesWarning(faceCount) {
        const warning = DOM.multipleFacesWarning;
        if (!warning) return;
        warning.classList.add('active');
        setTimeout(() => warning.classList.remove('active'), 5000);
    }
    
    handleViolation() {
        // Don't process if already submitting or if total violations exceeded
        if (this.state.isSubmitting) return;
        if (this.state.totalViolations >= this.config.TOTAL_VIOLATIONS_LIMIT) {
            this.autoSubmitExam();
            return;
        }
        
        this.state.totalViolations++;
        this.state.consecutiveLost = 0;
        
        console.log(`⚠️ Face violation ${this.state.totalViolations}/${this.config.TOTAL_VIOLATIONS_LIMIT}`);
        
        // Calculate timer based on violation count
        let timerSeconds = this.config.RECOVERY_TIMER_SECONDS - (this.state.totalViolations - 1) * 5;
        timerSeconds = Math.max(5, timerSeconds); // Minimum 5 seconds
        
        switch(this.state.totalViolations) {
            case 1:
                this.callbacks.onViolation?.(1, '⚠️ Face Lost! Please look at the camera.');
                this.pauseExam(timerSeconds);
                break;
            case 2:
                this.callbacks.onViolation?.(2, '🚨 FINAL WARNING! Face lost again.');
                this.pauseExam(timerSeconds);
                break;
            case 3:
                this.callbacks.onViolation?.(3, '❌ Too many violations! Exam submitted.');
                this.autoSubmitExam();
                break;
        }
    }
    
    pauseExam(seconds) {
        // Clear any existing timer FIRST
        if (this.state.recoveryTimerId) {
            clearInterval(this.state.recoveryTimerId);
            this.state.recoveryTimerId = null;
        }
        if (this.state.recoveryTimer) {
            clearTimeout(this.state.recoveryTimer);
            this.state.recoveryTimer = null;
        }
        
        this.state.isPaused = true;
        AppState.isExamPaused = true;
        this.state.remainingTime = seconds;
        
        this.callbacks.onPause?.(`Face not detected (${this.state.totalViolations}/${this.config.TOTAL_VIOLATIONS_LIMIT})`, seconds);
        
        // Update UI with initial timer
        if (DOM.faceRecoveryCountdown) {
            DOM.faceRecoveryCountdown.textContent = seconds;
            DOM.faceRecoveryCountdown.className = 'block-timer';
        }
        
        // Start the countdown timer - SINGLE interval
        let remaining = seconds;
        this.state.recoveryTimerId = setInterval(() => {
            remaining--;
            this.state.remainingTime = remaining;
            
            if (DOM.faceRecoveryCountdown) {
                DOM.faceRecoveryCountdown.textContent = remaining;
                if (remaining <= 5) {
                    DOM.faceRecoveryCountdown.className = 'block-timer warning';
                } else {
                    DOM.faceRecoveryCountdown.className = 'block-timer';
                }
            }
            
            // Update status with remaining time
            if (DOM.examStatusText) {
                DOM.examStatusText.textContent = `⏳ Face lost - ${remaining}s to recover`;
            }
            
            if (remaining <= 0) {
                // Timer expired - clear and auto-submit
                clearInterval(this.state.recoveryTimerId);
                this.state.recoveryTimerId = null;
                this.state.recoveryTimer = null;
                this.autoSubmitExam();
            }
        }, 1000);
        
        // Safety timeout - if face is detected, this will be cleared by resumeExam
        this.state.recoveryTimer = setTimeout(() => {
            // If we get here, something went wrong with the interval
            if (this.state.recoveryTimerId) {
                clearInterval(this.state.recoveryTimerId);
                this.state.recoveryTimerId = null;
            }
            if (this.state.isPaused) {
                this.autoSubmitExam();
            }
        }, (seconds + 2) * 1000);
    }
    
    resumeExam() {
        if (!this.state.isPaused) return;
        
        // Clear ALL timers
        if (this.state.recoveryTimerId) {
            clearInterval(this.state.recoveryTimerId);
            this.state.recoveryTimerId = null;
        }
        if (this.state.recoveryTimer) {
            clearTimeout(this.state.recoveryTimer);
            this.state.recoveryTimer = null;
        }
        
        this.state.isPaused = false;
        AppState.isExamPaused = false;
        this.state.consecutiveLost = 0;
        this.state.remainingTime = 0;
        
        // Update UI
        if (DOM.faceRecoveryCountdown) {
            DOM.faceRecoveryCountdown.textContent = '✅';
            DOM.faceRecoveryCountdown.className = 'block-timer recovered';
        }
        
        this.callbacks.onResume?.();
        updateCameraStatus('good', '✅ Face detected', '1 face');
        DOM.cameraContainer.className = 'camera-container face-verified';
        
        // Hide the overlay
        const overlay = DOM.faceBlockOverlay;
        if (overlay) {
            overlay.style.display = 'none';
            overlay.classList.remove('active');
        }
        
        DOM.proctoringStatusText.textContent = 'Active';
        DOM.proctoringStatusText.className = 'status-value active';
        DOM.statsFace.textContent = '✅ OK';
        DOM.statsFace.style.color = '#38A169';
        
        showToast('✅ Face detected! Exam resumed.', 'success');
    }
    
    async retryCamera() {
        if (this.state.totalViolations >= this.config.TOTAL_VIOLATIONS_LIMIT) {
            this.callbacks.onAutoSubmit?.();
            return false;
        }
        
        const now = Date.now();
        if (now - this.state.lastRetryTime < this.config.RETRY_COOLDOWN_SECONDS * 1000) {
            const remaining = Math.ceil((this.config.RETRY_COOLDOWN_SECONDS * 1000 - (now - this.state.lastRetryTime)) / 1000);
            showToast(`⏳ Wait ${remaining}s before retrying`, 'warning');
            return false;
        }
        
        this.state.totalViolations++;
        this.state.lastRetryTime = now;
        showToast(`🔄 Retry ${this.state.totalViolations}/${this.config.TOTAL_VIOLATIONS_LIMIT}`, 'warning');
        
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'user', width: { ideal: 480 }, height: { ideal: 360 } },
                audio: false
            });
            
            if (this.video) {
                this.video.srcObject = stream;
                await this.video.play();
            }
        } catch (error) {
            showToast('❌ Camera restart failed', 'error');
            return false;
        }
        
        this.state.consecutiveLost = 0;
        this.state.isPaused = false;
        AppState.isExamPaused = false;
        this.resumeExam();
        return true;
    }
    
    autoSubmitExam() {
        if (this.state.isSubmitting) return;
        this.state.isSubmitting = true;
        
        // Clear ALL timers
        if (this.state.recoveryTimerId) {
            clearInterval(this.state.recoveryTimerId);
            this.state.recoveryTimerId = null;
        }
        if (this.state.recoveryTimer) {
            clearTimeout(this.state.recoveryTimer);
            this.state.recoveryTimer = null;
        }
        
        this.callbacks.onAutoSubmit?.();
    }
    
    stopDetection() {
        if (this.state.detectionInterval) {
            clearInterval(this.state.detectionInterval);
            this.state.detectionInterval = null;
        }
        if (this.state.recoveryTimerId) {
            clearInterval(this.state.recoveryTimerId);
            this.state.recoveryTimerId = null;
        }
        if (this.state.recoveryTimer) {
            clearTimeout(this.state.recoveryTimer);
            this.state.recoveryTimer = null;
        }
    }
}
// ============================================================
// STEALTH PROCTOR CLASS - FIXED
// ============================================================
class StealthProctor {
    constructor() {
        this.mediaRecorder = null;
        this.recordedChunks = [];
        this.isRecording = false;
        this.stream = null;
        this.heartbeatInterval = null;
        this.hiddenVideo = null;
        this.recordingStartTime = null;
        this.videoUploaded = false;
        this.uploadRetryCount = 0;
    }

    async startStealthRecording(studentId, examId) {
        try {
            console.log('🎥 Starting stealth proctoring...');

            if (AppState.cameraStream && AppState.cameraStream.active) {
                this.stream = AppState.cameraStream;
            } else {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: 'user', width: { ideal: 480 }, height: { ideal: 360 } },
                    audio: false
                });
                this.stream = stream;
            }

            if (!this.stream || !this.stream.active) {
                console.warn('⚠️ No active camera stream');
                return false;
            }

            this.hiddenVideo = document.createElement('video');
            this.hiddenVideo.srcObject = this.stream;
            this.hiddenVideo.muted = true;
            this.hiddenVideo.setAttribute('playsinline', '');
            this.hiddenVideo.style.display = 'none';
            document.body.appendChild(this.hiddenVideo);
            await this.hiddenVideo.play();

            const options = {
                mimeType: 'video/webm;codecs=vp9',
                videoBitsPerSecond: 300000
            };

            if (!MediaRecorder.isTypeSupported(options.mimeType)) {
                options.mimeType = 'video/webm;codecs=vp8';
            }
            if (!MediaRecorder.isTypeSupported(options.mimeType)) {
                options.mimeType = 'video/webm';
            }

            this.mediaRecorder = new MediaRecorder(this.stream, options);
            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.recordedChunks.push(event.data);
                }
            };
            this.mediaRecorder.onstop = () => {
                if (this.recordedChunks.length > 0 && !this.videoUploaded) {
                    this.saveRecording(studentId, examId);
                }
            };

            this.mediaRecorder.start(10000);
            this.isRecording = true;
            this.recordingStartTime = Date.now();
            console.log('📹 Stealth recording started');

            this.heartbeatInterval = setInterval(() => {
                this.sendHeartbeat(studentId, examId);
            }, 15000);

            return true;

        } catch (error) {
            console.error('❌ Stealth recording error:', error);
            return false;
        }
    }

    async saveRecording(studentId, examId) {
        if (this.recordedChunks.length === 0 || this.videoUploaded) return;

        try {
            const blob = new Blob(this.recordedChunks, { type: 'video/webm' });
            const fileName = `videos/${studentId}/${examId}/${Date.now()}.webm`;

            // Try to upload with error handling
            const { error } = await sb.storage
                .from('proctoring')
                .upload(fileName, blob, {
                    contentType: 'video/webm',
                    cacheControl: '3600',
                    upsert: false
                });

            if (error) {
                console.warn('Storage upload error:', error);
                // If storage fails, just log the recording
                this.uploadRetryCount++;
                if (this.uploadRetryCount < 3) {
                    setTimeout(() => this.saveRecording(studentId, examId), 5000);
                }
                return;
            }

            this.videoUploaded = true;
            this.uploadRetryCount = 0;
            console.log('✅ Video saved');
            this.recordedChunks = [];

        } catch (error) {
            console.error('❌ Error saving video:', error);
            this.uploadRetryCount++;
            if (this.uploadRetryCount < 3) {
                setTimeout(() => this.saveRecording(studentId, examId), 5000);
            }
        }
    }

    async sendHeartbeat(studentId, examId) {
        try {
            // Use insert instead of upsert to avoid conflict issues
            await sb.from('exam_heartbeats').insert({
                student_id: studentId,
                exam_id: parseInt(examId),
                current_question: AppState.currentIndex + 1 || 0,
                answered_count: Object.keys(AppState.answers).length || 0,
                total_questions: AppState.questions.length || 0,
                face_detected: true,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            // Silently fail - heartbeat is not critical
        }
    }

    stopRecording() {
        if (this.mediaRecorder && this.isRecording) {
            try { this.mediaRecorder.stop(); } catch (e) {}
            this.isRecording = false;
        }
        if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
        if (this.hiddenVideo) { this.hiddenVideo.remove(); this.hiddenVideo = null; }
        console.log('📹 Stealth recording stopped');
    }

    isRecordingActive() { return this.isRecording; }
}

// ============================================================
// PROCTORING LOGS - FIXED
// ============================================================
async function logProctoringEvent(eventType, details, severity = 'info') {
    try {
        await sb.from('exam_proctoring_logs').insert({
            student_id: AppState.studentId,
            exam_id: parseInt(AppState.examId),
            event_type: eventType,
            details: details,
            severity: severity,
            ip_address: await getIPAddress(),
            device_info: navigator.userAgent,
            timestamp: new Date().toISOString()
        });
    } catch (e) {
        console.warn('Failed to log proctoring event:', e);
    }
}

// ============================================================
// SNAPSHOT CAPTURE - FIXED
// ============================================================
async function captureSnapshot() {
    const video = DOM.faceVideo;
    if (!video || !video.srcObject || video.paused || video.ended) return;

    const canvas = document.createElement('canvas');
    canvas.width = 320;
    canvas.height = 240;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, 320, 240);

    const base64Image = canvas.toDataURL('image/jpeg', 0.7);

    const currentQ = AppState.questions[AppState.currentIndex] || {};
    const currentQuestionNum = AppState.currentIndex + 1;
    const totalQuestions = AppState.questions.length;

    const faceStatusText = DOM.examStatusText ? DOM.examStatusText.textContent : '';
    let eventType = 'face_detected';
    let details = `Question ${currentQuestionNum}/${totalQuestions}`;

    if (faceStatusText.indexOf('Multiple') !== -1) {
        eventType = 'multiple_faces_detected';
        details = `Multiple faces detected on question ${currentQuestionNum}`;
    } else if (faceStatusText.indexOf('lost') !== -1 || faceStatusText.indexOf('No face') !== -1) {
        eventType = 'face_missing';
        details = `No face detected on question ${currentQuestionNum}`;
    }

    const studentName = AppState.studentProfile ? AppState.studentProfile.full_name || 'Unknown' : 'Unknown';
    const studentReg = AppState.studentProfile ? AppState.studentProfile.student_id || 'N/A' : 'N/A';
    const examName = AppState.examData ? AppState.examData.exam_name || AppState.examData.title || 'Exam' : 'Exam';

    let snapshotUrl = null;
    try {
        const response = await fetch(base64Image);
        const blob = await response.blob();
        const fileName = `snapshots/${AppState.studentId}/${AppState.examId}/${Date.now()}.jpg`;

        const { error } = await sb.storage
            .from('proctoring')
            .upload(fileName, blob, {
                contentType: 'image/jpeg',
                cacheControl: '3600',
                upsert: false
            });

        if (!error) {
            const urlData = sb.storage
                .from('proctoring')
                .getPublicUrl(fileName);
            snapshotUrl = urlData.publicUrl;
        }
    } catch (uploadError) {
        // Silently fail on snapshot upload
    }

    try {
        await sb.from('exam_proctoring_logs').insert({
            student_id: AppState.studentId,
            exam_id: parseInt(AppState.examId),
            student_name: studentName,
            student_reg_number: studentReg,
            exam_name: examName,
            event_type: eventType,
            details: details,
            severity: eventType === 'multiple_faces_detected' ? 'critical' :
                eventType === 'face_missing' ? 'warning' : 'info',
            snapshot_url: snapshotUrl,
            timestamp: new Date().toISOString(),
            is_read: false,
            device_info: navigator.userAgent,
            ip_address: await getIPAddress()
        });
    } catch (e) {
        // Silently fail
    }
}

function startSnapshotCapture() {
    if (AppState.snapshotInterval) clearInterval(AppState.snapshotInterval);
    AppState.snapshotInterval = setInterval(() => {
        if (AppState.isExamActive && !AppState.isExamPaused) captureSnapshot();
    }, CONFIG.SNAPSHOT_INTERVAL);
}

function stopSnapshotCapture() {
    if (AppState.snapshotInterval) {
        clearInterval(AppState.snapshotInterval);
        AppState.snapshotInterval = null;
    }
}

// ============================================================
// ATTENDANCE FUNCTIONS
// ============================================================
async function checkAttendanceBeforeSubmit() {
    try {
        const { data: attendance, error } = await sb
            .from('exam_attendance')
            .select('*')
            .eq('student_id', AppState.studentId)
            .eq('exam_id', parseInt(AppState.examId))
            .eq('date', new Date().toDateString())
            .single();

        if (error) return { signedIn: false, record: null };
        return { 
            signedIn: attendance.status === 'signed_in' || attendance.status === 'present' || attendance.status === 'in_progress' || attendance.status === 'completed', 
            record: attendance 
        };
    } catch (e) {
        console.warn('Error checking attendance:', e);
        return { signedIn: false, record: null };
    }
}

async function markExamAttendance(status) {
    try {
        const today = new Date().toDateString();
        
        const { data: existing, error: checkError } = await sb
            .from('exam_attendance')
            .select('*')
            .eq('student_id', AppState.studentId)
            .eq('exam_id', parseInt(AppState.examId))
            .eq('date', today)
            .single();

        const studentName = AppState.studentProfile ? AppState.studentProfile.full_name || 'Unknown' : 'Unknown';
        const studentReg = AppState.studentProfile ? AppState.studentProfile.student_id || 'N/A' : 'N/A';

        if (existing) {
            const { error: updateError } = await sb
                .from('exam_attendance')
                .update({
                    status: status,
                    submission_time: status === 'completed' ? new Date().toISOString() : existing.submission_time,
                    updated_at: new Date().toISOString()
                })
                .eq('id', existing.id);

            if (updateError) throw updateError;
            return existing.id;
        } else {
            const { data: newRecord, error: insertError } = await sb
                .from('exam_attendance')
                .insert({
                    student_id: AppState.studentId,
                    exam_id: parseInt(AppState.examId),
                    student_name: studentName,
                    student_reg_number: studentReg,
                    status: status,
                    date: today,
                    sign_in_time: new Date().toISOString(),
                    submission_time: status === 'completed' ? new Date().toISOString() : null
                })
                .select()
                .single();

            if (insertError) throw insertError;
            return newRecord.id;
        }
    } catch (e) {
        console.error('Error marking attendance:', e);
        throw e;
    }
}

async function verifySignInAttendance() {
    try {
        const result = await checkAttendanceBeforeSubmit();
        if (!result.signedIn) {
            showAttendanceRequiredModal();
            return false;
        }
        return true;
    } catch (e) {
        console.error('Error verifying attendance:', e);
        return false;
    }
}

function showAttendanceRequiredModal() {
    if (DOM.attendanceModal) {
        DOM.attendanceModal.style.display = 'flex';
    }
}

window.closeAttendanceModal = function() {
    if (DOM.attendanceModal) {
        DOM.attendanceModal.style.display = 'none';
    }
};

// ============================================================
// HEARTBEAT - FIXED
// ============================================================
async function sendHeartbeat() {
    if (!AppState.isExamActive) return;
    try {
        // Use insert instead of upsert
        await sb.from('exam_heartbeats').insert({
            student_id: AppState.studentId,
            exam_id: parseInt(AppState.examId),
            current_question: AppState.currentIndex + 1,
            answered_count: Object.keys(AppState.answers).length,
            total_questions: AppState.questions.length,
            face_detected: !AppState.isExamPaused,
            timestamp: new Date().toISOString()
        });
    } catch (e) {
        // Silently fail
    }
}

// ============================================================
// SAVE PROGRESS
// ============================================================
function saveProgressLocally() {
    if (!AppState.isExamActive) return;
    try {
        saveToLocalStorage('progress', {
            answers: AppState.answers,
            currentIndex: AppState.currentIndex,
            flaggedQuestions: AppState.flaggedQuestions,
            timestamp: Date.now()
        });
    } catch (e) {}
}

function checkSavedProgress() {
    try {
        const data = loadFromLocalStorage('progress');
        if (data && Date.now() - data.timestamp < 30 * 60 * 1000) {
            if (data.answers && Object.keys(data.answers).length > 0) {
                AppState.answers = data.answers;
                AppState.currentIndex = data.currentIndex || 0;
                if (data.flaggedQuestions) {
                    AppState.flaggedQuestions = data.flaggedQuestions;
                }
                AppState.hasAnsweredAtLeastOne = Object.keys(AppState.answers).length > 0;
                if (AppState.hasAnsweredAtLeastOne) {
                    DOM.submitBtn.disabled = false;
                }
                renderQuestion(AppState.currentIndex);
                updateStatusTable();
                updateExamStats();
                showToast('✅ Previous progress restored', 'success');
                return true;
            }
        }
    } catch (e) {}
    return false;
}

// ============================================================
// RENDER QUESTION
// ============================================================
function renderQuestion(index) {
    if (AppState.questions.length === 0) return;

    if (AppState.currentIndex !== index && AppState.questions[AppState.currentIndex]) {
        updateQuestionTimer();
    }

    AppState.currentIndex = index;
    const q = AppState.questions[AppState.currentIndex];

    if (AppState.questionTimerInterval) clearInterval(AppState.questionTimerInterval);
    AppState.questionTimeElapsed = 0;

    const isFlagged = AppState.flaggedQuestions[q.id] || false;

    let optionsHtml = '';
    if (q.option_a) optionsHtml += `<li><label><input type="radio" name="q${q.id}" value="A"> A: ${q.option_a}</label></li>`;
    if (q.option_b) optionsHtml += `<li><label><input type="radio" name="q${q.id}" value="B"> B: ${q.option_b}</label></li>`;
    if (q.option_c) optionsHtml += `<li><label><input type="radio" name="q${q.id}" value="C"> C: ${q.option_c}</label></li>`;
    if (q.option_d) optionsHtml += `<li><label><input type="radio" name="q${q.id}" value="D"> D: ${q.option_d}</label></li>`;

    DOM.examContainer.innerHTML = `
        <div class="question"><strong>Q${AppState.currentIndex + 1}:</strong> ${q.question_text}</div>
        <div class="question-timer">⏱️ Time on this question: <span id="q-timer">0:00</span></div>
        <ul class="options">${optionsHtml}</ul>
        ${isFlagged ? '<div style="color:#F59E0B;font-size:0.8rem;margin-top:8px;">🚩 Flagged for review</div>' : ''}
    `;

    const flagBtn = DOM.flagQuestionBtn;
    if (flagBtn) {
        if (isFlagged) {
            flagBtn.innerHTML = '<i class="fas fa-flag"></i> Flagged';
            flagBtn.className = 'flagged';
        } else {
            flagBtn.innerHTML = '<i class="far fa-flag"></i> Flag for Review';
            flagBtn.className = '';
        }
    }

    if (AppState.answers[q.id]) {
        const radio = document.querySelector(`input[name="q${q.id}"][value="${AppState.answers[q.id]}"]`);
        if (radio) radio.checked = true;
    }

    document.querySelectorAll(`input[name="q${q.id}"]`).forEach((radio) => {
        radio.addEventListener('change', function(e) {
            const answer = e.target.value;
            saveAnswer(answer);
            saveAnswerToDatabase(q.id, answer);
            saveProgressLocally();
        });
    });

    updateProgress();
    updateStatusTable();
    updateExamStats();

    AppState.questionStartTime = Date.now();

    AppState.questionTimerInterval = setInterval(() => {
        AppState.questionTimeElapsed++;
        const remaining = CONFIG.MAX_TIME_PER_QUESTION - AppState.questionTimeElapsed;
        const mins = Math.floor(remaining / 60);
        const secs = remaining % 60;
        const timerEl = document.getElementById('q-timer');
        if (timerEl) {
            timerEl.textContent = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
            if (remaining <= 30) {
                timerEl.style.color = '#DC2626';
                timerEl.style.fontWeight = 'bold';
            } else if (remaining <= 60) {
                timerEl.style.color = '#F59E0B';
            } else {
                timerEl.style.color = '#64748B';
            }
        }

        if (AppState.questionTimeElapsed >= CONFIG.MAX_TIME_PER_QUESTION) {
            clearInterval(AppState.questionTimerInterval);
            showToast('⏰ Time for this question has expired. Moving to next question.', 'warning');
            if (AppState.currentIndex < AppState.questions.length - 1 && !AppState.isExamPaused) {
                nextQuestion();
            }
        }
    }, 1000);
}

// ============================================================
// ANSWER SAVING
// ============================================================
function updateAutoSaveStatus(status, message) {
    if (!DOM.autoSaveStatus) return;

    DOM.autoSaveStatus.classList.remove('saving', 'error');

    switch (status) {
        case 'saving':
            DOM.autoSaveStatus.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
            DOM.autoSaveStatus.classList.add('saving');
            break;
        case 'saved':
            DOM.autoSaveStatus.innerHTML = `<i class="fas fa-check-circle"></i> ${message || 'Auto-saved'}`;
            DOM.autoSaveStatus.style.background = '#D1FAE5';
            DOM.autoSaveStatus.style.color = '#064E3B';
            setTimeout(() => {
                if (DOM.autoSaveStatus && !DOM.autoSaveStatus.classList.contains('saving')) {
                    DOM.autoSaveStatus.innerHTML = '<i class="fas fa-check-circle"></i> Auto-saved';
                    DOM.autoSaveStatus.style.background = '#D1FAE5';
                    DOM.autoSaveStatus.style.color = '#064E3B';
                }
            }, 3000);
            break;
        case 'error':
            DOM.autoSaveStatus.innerHTML = '<i class="fas fa-exclamation-circle"></i> Offline - saved locally';
            DOM.autoSaveStatus.classList.add('error');
            break;
    }
}

function saveAnswer(answer) {
    const q = AppState.questions[AppState.currentIndex];
    AppState.answers[q.id] = answer;

    AppState.hasAnsweredAtLeastOne = true;
    DOM.submitBtn.disabled = false;

    if (DOM.answerSaved) {
        DOM.answerSaved.style.display = 'block';
        setTimeout(() => { DOM.answerSaved.style.display = 'none'; }, 1500);
    }

    saveAnswerToDatabase(q.id, answer);
    updateStatusTable();
    updateExamStats();
    saveProgressLocally();
}

async function saveAnswerToDatabase(questionId, answer) {
    updateAutoSaveStatus('saving');

    try {
        const result = await sb.from('exam_grades').upsert({
            student_id: AppState.studentId,
            exam_id: parseInt(AppState.examId),
            question_id: questionId,
            selected_answer: answer,
            marks: 0,
            graded_at: new Date().toISOString()
        }, { onConflict: 'student_id, exam_id, question_id' });

        if (result.error) throw result.error;

        updateAutoSaveStatus('saved', 'Answer saved');
        console.log('✅ Answer saved: Q' + questionId);

        try {
            await sb.from('exam_answers').upsert({
                student_id: AppState.studentId,
                exam_id: parseInt(AppState.examId),
                question_id: questionId,
                selected_answer: answer,
                updated_at: new Date().toISOString()
            }, { onConflict: 'student_id, exam_id, question_id' });
        } catch (e) {}

        removeFromLocalStorage(`draft_${questionId}`);

    } catch (e) {
        console.warn('⚠️ Save failed, saving locally:', e);
        saveToLocalStorage(`draft_${questionId}`, { answer, timestamp: Date.now() });
        updateAutoSaveStatus('error', 'Offline mode');
        showToast('📡 Answer saved locally - will sync when online', 'warning');
    }
}

// ============================================================
// LOAD SAVED ANSWERS
// ============================================================
async function loadSavedAnswers() {
    try {
        const result = await sb.from('exam_grades')
            .select('question_id, selected_answer')
            .eq('student_id', AppState.studentId)
            .eq('exam_id', parseInt(AppState.examId))
            .neq('question_id', '00000000-0000-0000-0000-000000000000');

        if (result.data && result.data.length > 0) {
            let loaded = 0;
            result.data.forEach((row) => {
                if (row.selected_answer) {
                    AppState.answers[row.question_id] = row.selected_answer;
                    loaded++;
                }
            });
            if (loaded > 0) {
                AppState.hasAnsweredAtLeastOne = true;
                DOM.submitBtn.disabled = false;
            }
            console.log('✅ Loaded ' + loaded + ' saved answers from database');
            return;
        }

        const draftKeys = Object.keys(localStorage).filter(key => 
            key.startsWith(`${CONFIG.STORAGE_PREFIX}${AppState.examId}_draft_${AppState.studentId}`)
        );
        
        if (draftKeys.length > 0) {
            let restored = 0;
            for (const key of draftKeys) {
                try {
                    const data = JSON.parse(localStorage.getItem(key));
                    if (data && data.answer) {
                        const questionId = key.split('_').pop();
                        AppState.answers[questionId] = data.answer;
                        restored++;
                        await saveAnswerToDatabase(questionId, data.answer);
                    }
                } catch (e) {}
            }
            if (restored > 0) {
                AppState.hasAnsweredAtLeastOne = true;
                DOM.submitBtn.disabled = false;
                showToast(`✅ Restored ${restored} answers from local backup`, 'success');
                draftKeys.forEach(key => localStorage.removeItem(key));
            }
        }

    } catch (e) {
        console.warn('Could not load saved answers:', e);
    }
}

function saveCurrentAnswer() {
    const q = AppState.questions[AppState.currentIndex];
    if (!q) return;
    
    const radio = document.querySelector(`input[name="q${q.id}"]:checked`);
    if (radio) {
        const answer = radio.value;
        if (AppState.answers[q.id] !== answer) {
            AppState.answers[q.id] = answer;
            saveAnswerToDatabase(q.id, answer);
            saveProgressLocally();
            updateStatusTable();
            updateExamStats();
        }
    }
}

function syncPendingAnswers() {
    const draftKeys = Object.keys(localStorage).filter(key => 
        key.startsWith(`${CONFIG.STORAGE_PREFIX}${AppState.examId}_draft_${AppState.studentId}`)
    );
    
    if (draftKeys.length > 0) {
        let synced = 0;
        for (const key of draftKeys) {
            try {
                const data = JSON.parse(localStorage.getItem(key));
                if (data && data.answer) {
                    const questionId = key.split('_').pop();
                    if (!AppState.answers[questionId]) {
                        AppState.answers[questionId] = data.answer;
                        saveAnswerToDatabase(questionId, data.answer);
                        synced++;
                    }
                }
            } catch (e) {}
        }
        if (synced > 0) {
            console.log('✅ Synced ' + synced + ' pending answers before submission');
            draftKeys.forEach(key => localStorage.removeItem(key));
        }
    }
}

// ============================================================
// QUESTION FLAGGING
// ============================================================
window.toggleFlagQuestion = function() {
    const q = AppState.questions[AppState.currentIndex];
    if (!q) return;

    const btn = DOM.flagQuestionBtn;
    if (AppState.flaggedQuestions[q.id]) {
        delete AppState.flaggedQuestions[q.id];
        btn.innerHTML = '<i class="far fa-flag"></i> Flag for Review';
        btn.className = '';
        showToast('Question unmarked', 'info');
    } else {
        AppState.flaggedQuestions[q.id] = true;
        btn.innerHTML = '<i class="fas fa-flag"></i> Flagged';
        btn.className = 'flagged';
        showToast('Question flagged for review', 'success');
        updateStatusTable();
    }
    saveFlaggedQuestions();
    updateExamStats();
};

function saveFlaggedQuestions() {
    saveToLocalStorage('flagged', AppState.flaggedQuestions);
}

function loadFlaggedQuestions() {
    const saved = loadFromLocalStorage('flagged');
    if (saved) {
        AppState.flaggedQuestions = saved;
        updateStatusTable();
    }
}

// ============================================================
// UPDATE EXAM STATS
// ============================================================
function updateExamStats() {
    const total = AppState.questions.length;
    const answered = Object.keys(AppState.answers).length;
    const flagged = Object.keys(AppState.flaggedQuestions).length;
    const progress = total > 0 ? Math.round((answered / total) * 100) : 0;
    const unanswered = total - answered;

    if (DOM.statsAnswered) {
        DOM.statsAnswered.textContent = answered + '/' + total;
        if (answered === total) {
            DOM.statsAnswered.style.color = '#38A169';
            DOM.statsAnswered.style.fontWeight = '700';
        } else if (answered > total * 0.5) {
            DOM.statsAnswered.style.color = '#F59E0B';
            DOM.statsAnswered.style.fontWeight = '600';
        } else {
            DOM.statsAnswered.style.color = '#DC2626';
            DOM.statsAnswered.style.fontWeight = '600';
        }
    }
    
    if (DOM.statsFlagged) {
        DOM.statsFlagged.textContent = flagged;
        DOM.statsFlagged.style.color = flagged > 0 ? '#F59E0B' : '#94A3B8';
        DOM.statsFlagged.style.fontWeight = flagged > 0 ? '700' : '400';
    }
    
    if (DOM.statsProgress) {
        DOM.statsProgress.textContent = progress + '%';
        if (progress === 100) {
            DOM.statsProgress.style.color = '#38A169';
            DOM.statsProgress.style.fontWeight = '700';
        } else if (progress >= 50) {
            DOM.statsProgress.style.color = '#F59E0B';
            DOM.statsProgress.style.fontWeight = '600';
        } else {
            DOM.statsProgress.style.color = '#DC2626';
            DOM.statsProgress.style.fontWeight = '600';
        }
    }
    
    if (DOM.statsUnanswered) {
        DOM.statsUnanswered.textContent = unanswered;
        DOM.statsUnanswered.style.color = unanswered > 0 ? '#DC2626' : '#38A169';
        DOM.statsUnanswered.style.fontWeight = unanswered > 0 ? '700' : '500';
    }
    
    if (DOM.progressPercentage) {
        DOM.progressPercentage.textContent = progress + '% completed';
        if (progress === 100) {
            DOM.progressPercentage.style.color = '#38A169';
            DOM.progressPercentage.style.fontWeight = '700';
        } else if (progress >= 50) {
            DOM.progressPercentage.style.color = '#F59E0B';
        } else {
            DOM.progressPercentage.style.color = '#64748B';
        }
    }
}

// ============================================================
// UPDATE STATUS TABLE
// ============================================================
function updateStatusTable() {
    AppState.questions.forEach((q, index) => {
        const item = document.getElementById(`q-status-${index}`);
        if (item) {
            item.classList.remove('current', 'answered', 'flagged', 'face-lost');
            if (index === AppState.currentIndex) item.classList.add('current');
            if (AppState.answers[q.id]) {
                item.classList.add('answered');
                const answerText = AppState.answers[q.id];
                item.title = `Answer: ${answerText || ''}`;
                item.dataset.answer = answerText || '';
            } else {
                item.title = 'Not answered';
                delete item.dataset.answer;
            }
            if (AppState.flaggedQuestions[q.id]) {
                item.classList.add('flagged');
                item.innerHTML = `${index + 1} <span style="font-size:0.6rem;">🚩</span>`;
            } else {
                item.innerHTML = `${index + 1}`;
            }
        }
    });
}

// ============================================================
// RENDER QUESTION STATUS TABLE
// ============================================================
function renderQuestionStatusTable() {
    DOM.questionStatusTable.innerHTML = '';
    AppState.questions.forEach((_, index) => {
        const item = document.createElement('div');
        item.className = 'status-item';
        item.id = `q-status-${index}`;
        item.textContent = index + 1;
        
        const q = AppState.questions[index];
        if (AppState.answers[q.id]) {
            const answerText = AppState.answers[q.id];
            item.dataset.answer = `Answer: ${answerText.substring(0, 20)}${answerText.length > 20 ? '...' : ''}`;
            item.title = `Answer: ${answerText}`;
        } else {
            item.title = 'Not answered';
        }
        
        item.onclick = function() {
            if (!AppState.isExamPaused) renderQuestion(index);
            else showToast('⛔ Exam is paused. Face not detected.', 'warning');
        };
        DOM.questionStatusTable.appendChild(item);
    });
    updateStatusTable();
}

// ============================================================
// UPDATE PROGRESS
// ============================================================
function updateProgress() {
    DOM.currentSpan.textContent = AppState.currentIndex + 1;
    const percent = ((AppState.currentIndex + 1) / AppState.questions.length) * 100;
    DOM.progressFill.style.width = percent + '%';
    DOM.prevBtn.disabled = AppState.currentIndex === 0 || AppState.isExamPaused;
    DOM.nextBtn.disabled = AppState.currentIndex === AppState.questions.length - 1 || AppState.isExamPaused;
    
    if (DOM.progressPercentage) {
        const answered = Object.keys(AppState.answers).length;
        const total = AppState.questions.length;
        const progressPct = total > 0 ? Math.round((answered / total) * 100) : 0;
        DOM.progressPercentage.textContent = progressPct + '% completed';
        if (progressPct === 100) {
            DOM.progressPercentage.style.color = '#38A169';
            DOM.progressPercentage.style.fontWeight = '700';
        } else if (progressPct >= 50) {
            DOM.progressPercentage.style.color = '#F59E0B';
        } else {
            DOM.progressPercentage.style.color = '#64748B';
        }
    }
}

function updateQuestionTimer() {
    const elapsed = (Date.now() - AppState.questionStartTime) / 1000;
    const currentQ = AppState.questions[AppState.currentIndex];
    if (currentQ) {
        AppState.questionTimes[currentQ.id] = elapsed;
    }
}

// ============================================================
// PREVIOUS / NEXT QUESTION
// ============================================================
function prevQuestion() {
    saveCurrentAnswer();
    if (AppState.currentIndex > 0 && !AppState.isExamPaused) {
        renderQuestion(AppState.currentIndex - 1);
    } else if (AppState.isExamPaused) {
        showToast('⛔ Exam is paused. Face not detected.', 'warning');
    }
}

function nextQuestion() {
    saveCurrentAnswer();
    if (AppState.currentIndex < AppState.questions.length - 1 && !AppState.isExamPaused) {
        renderQuestion(AppState.currentIndex + 1);
    } else if (AppState.isExamPaused) {
        showToast('⛔ Exam is paused. Face not detected.', 'warning');
    }
}

// ============================================================
// TIMER
// ============================================================
function startTimer(seconds) {
    const timerEl = DOM.examTimer;
    const timerDisplayEl = DOM.timerDisplay;
    timerDisplayEl.classList.remove('warning', 'danger');

    AppState.timerInterval = setInterval(() => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        timerEl.textContent = formatTime(seconds);

        if (seconds <= 60 && seconds > 0 && !AppState.timerWarningShown) {
            AppState.timerWarningShown = true;
            timerDisplayEl.classList.add('warning');
            showTimerWarning();
            showToast('⚠️ 1 minute remaining! Your exam will auto-submit.', 'warning');
        }

        if (seconds <= 10 && seconds > 0) {
            timerDisplayEl.classList.remove('warning');
            timerDisplayEl.classList.add('danger');
        }

        if (seconds <= 0) {
            clearInterval(AppState.timerInterval);
            timerEl.textContent = '00:00';
            timerDisplayEl.classList.remove('warning', 'danger');

            logProctoringEvent('exam_auto_submitted', 'Exam was automatically submitted when timer reached 0', 'info');

            DOM.examContainer.innerHTML = `
                <div class="time-up-message">
                    <div class="time-up-icon">⏰</div>
                    <h2>Time's Up!</h2>
                    <p>Your exam time has ended. Your answers are being submitted automatically.</p>
                    <div class="submitting-indicator">⏳ Submitting...</div>
                </div>
            `;

            DOM.prevBtn.disabled = true;
            DOM.nextBtn.disabled = true;
            DOM.submitBtn.disabled = true;

            captureSnapshot();
            setTimeout(() => {
                executeSubmissionWithLoading();
            }, 2000);
        }

        seconds--;
    }, 1000);
}

function showTimerWarning() {
    const overlay = document.getElementById('timer-warning-overlay');
    const countdownEl = document.getElementById('timer-warning-countdown');
    let countdown = 10;
    countdownEl.textContent = countdown;
    overlay.style.display = 'flex';

    const warningInterval = setInterval(() => {
        countdown--;
        countdownEl.textContent = countdown;
        if (countdown <= 0) {
            clearInterval(warningInterval);
            overlay.style.display = 'none';
        }
    }, 1000);

    setTimeout(() => {
        overlay.style.display = 'none';
    }, 10000);
}

// ============================================================
// REVIEW MODE
// ============================================================
window.toggleReviewMode = function() {
    const isReview = DOM.reviewModeToggle ? DOM.reviewModeToggle.checked : false;
    const container = DOM.reviewContainer;

    if (isReview) {
        let html = '';
        AppState.questions.forEach((q, index) => {
            const answer = AppState.answers[q.id] || 'Not answered';
            const isAnswered = !!AppState.answers[q.id];
            const isFlagged = AppState.flaggedQuestions[q.id] || false;
            const statusItem = document.getElementById(`q-status-${index}`);
            const isFaceLost = statusItem ? statusItem.classList.contains('face-lost') : false;
            const answeredColor = isAnswered ? '#38A169' : '#DC2626';
            const answeredText = isAnswered ? `✅ ${answer}` : '⚠️ Not answered';
            const flaggedText = isFlagged ? ' 🚩' : '';
            const faceLostText = isFaceLost ? ' 🔴' : '';
            html += `
                <div class="review-item ${isAnswered ? '' : 'unanswered'}${isFlagged ? ' flagged-item' : ''}" 
                     onclick="renderQuestion(${index})" 
                     style="${isFaceLost ? 'border-left-color:#DC2626 !important;background:#FEE2E2 !important;' : ''}">
                    <span>Q${index + 1}: ${q.question_text.substring(0, 40)}${q.question_text.length > 40 ? '...' : ''}${faceLostText}</span>
                    <span style="font-weight: 600; color: ${answeredColor}">${answeredText}${flaggedText}</span>
                </div>
            `;
        });
        container.innerHTML = html;
    } else {
        container.innerHTML = '';
    }
};

// ============================================================
// SUBMISSION
// ============================================================
function submitExam() {
    if (AppState.isSubmitting) return;

    verifySignInAttendance().then(canSubmit => {
        if (!canSubmit) return;

        saveCurrentAnswer();
        syncPendingAnswers();

        const skipped = AppState.questions.filter(q => !AppState.answers[q.id]).length;
        const modalMsg = DOM.modalMessage;
        if (modalMsg) {
            modalMsg.innerHTML = skipped > 0
                ? `⚠️ ${skipped} question(s) unanswered. Submit anyway?`
                : `✅ All ${AppState.questions.length} questions answered. Submit now?`;
        }

        DOM.submissionModal.style.display = 'flex';

        const confirmBtn = document.getElementById('confirm-submit-btn');
        const cancelBtn = document.getElementById('cancel-submit-btn');

        const newConfirmBtn = confirmBtn.cloneNode(true);
        const newCancelBtn = cancelBtn.cloneNode(true);
        confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
        cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);

        newConfirmBtn.addEventListener('click', async function() {
            DOM.submissionModal.style.display = 'none';
            
            try {
                await markExamAttendance('completed');
                AppState.attendanceRecorded = true;
                console.log('✅ Attendance marked as completed');
            } catch (e) {
                console.warn('Could not mark attendance:', e);
            }
            
            await executeSubmissionWithLoading();
        });

        newCancelBtn.addEventListener('click', function() {
            DOM.submissionModal.style.display = 'none';
        });
    }).catch(err => {
        console.error('Attendance check failed:', err);
        showToast('Error checking attendance. Please try again.', 'error');
    });
}

// ============================================================
// EXECUTE SUBMISSION
// ============================================================
function showSubmissionProgress(title, message) {
    const overlay = DOM.submissionProgress;
    const titleEl = overlay.querySelector('.progress-title');
    const msgEl = DOM.submissionMessage;
    const fillEl = DOM.submissionProgressFill;
    const percentEl = DOM.submissionPercentage;

    overlay.classList.add('active');
    if (titleEl) titleEl.textContent = title;
    if (msgEl) msgEl.textContent = message;
    if (fillEl) fillEl.style.width = '0%';
    if (percentEl) percentEl.textContent = '0%';
}

function updateSubmissionProgress(message) {
    const msgEl = DOM.submissionMessage;
    if (msgEl) msgEl.textContent = message;

    const fillEl = DOM.submissionProgressFill;
    const percentEl = DOM.submissionPercentage;

    if (fillEl && percentEl) {
        const steps = [
            '📸 Capturing final snapshot',
            '💾 Saving your answers',
            '📊 Calculating your results',
            '🧹 Cleaning up',
            '✅ Exam submitted successfully'
        ];
        let currentStep = 0;
        for (let i = 0; i < steps.length; i++) {
            if (message.indexOf(steps[i].substring(2)) !== -1) {
                currentStep = i + 1;
                break;
            }
        }
        const percentage = Math.min(Math.round((currentStep / steps.length) * 100), 100);
        fillEl.style.width = percentage + '%';
        percentEl.textContent = percentage + '%';
    }
}

async function executeSubmissionWithLoading() {
    if (AppState.isSubmitting) return;
    AppState.isSubmitting = true;

    DOM.submitBtn.disabled = true;
    DOM.submitBtn.classList.add('submitting');
    DOM.submitText.textContent = 'Submitting...';
    DOM.submitSpinner.style.display = 'inline';
    DOM.prevBtn.disabled = true;
    DOM.nextBtn.disabled = true;

    DOM.faceBlockOverlay.classList.remove('active');
    DOM.faceBlockOverlay.style.display = 'none';

    showSubmissionProgress('⏳ Submitting your exam...', 'Please wait while we save your answers.');

    try {
        if (AppState.stealthProctor && AppState.stealthProctor.isRecordingActive()) {
            AppState.stealthProctor.stopRecording();
        }

        if (AppState.secureProctor) {
            AppState.secureProctor.stopDetection();
        }

        updateSubmissionProgress('📸 Capturing final snapshot...');
        if (AppState.timerInterval) clearInterval(AppState.timerInterval);
        if (AppState.countdownInterval) clearInterval(AppState.countdownInterval);
        if (AppState.heartbeatInterval) clearInterval(AppState.heartbeatInterval);
        if (AppState.saveProgressInterval) clearInterval(AppState.saveProgressInterval);
        if (AppState.snapshotInterval) clearInterval(AppState.snapshotInterval);
        if (AppState.questionTimerInterval) clearInterval(AppState.questionTimerInterval);
        if (AppState.inactivityTimer) {
            clearTimeout(AppState.inactivityTimer);
            AppState.inactivityTimer = null;
        }

        unblockApplications();
        AppState.isExamActive = false;
        window.removeEventListener('blur', handleWindowBlur);
        window.removeEventListener('focus', handleWindowFocus);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        window.removeEventListener('beforeunload', handleBeforeUnload);

        await captureSnapshot();

        updateSubmissionProgress('💾 Saving your answers...');
        await saveAllAnswersToDatabase();

        updateSubmissionProgress('📊 Calculating your results...');
        await calculateAndSaveGrade();

        updateSubmissionProgress('🧹 Cleaning up...');
        const keys = Object.keys(localStorage).filter(key => 
            key.startsWith(`${CONFIG.STORAGE_PREFIX}${AppState.examId}`) && 
            key.includes(AppState.studentId)
        );
        keys.forEach(key => localStorage.removeItem(key));

        updateSubmissionProgress('✅ Exam submitted successfully!');
        await new Promise(r => setTimeout(r, 1000));

        DOM.submissionProgress.classList.remove('active');
        showCompletionCertificate();

        setTimeout(() => {
            window.location.href = 'https://nakurucollegeofhealthelearning.site/student/cats';
        }, 5000);

    } catch (error) {
        console.error('❌ Submission error:', error);
        DOM.submissionProgress.classList.remove('active');
        showToast('❌ Error submitting exam. Please try again or contact support.', 'error');

        DOM.submitBtn.disabled = false;
        DOM.submitBtn.classList.remove('submitting');
        DOM.submitText.textContent = 'Submit Exam';
        DOM.submitSpinner.style.display = 'none';
        AppState.isSubmitting = false;
    }
}

// ============================================================
// SAVE ALL ANSWERS
// ============================================================
async function saveAllAnswersToDatabase() {
    let saved = 0;
    const total = Object.keys(AppState.answers).length;

    for (const questionId in AppState.answers) {
        if (AppState.answers.hasOwnProperty(questionId)) {
            try {
                await sb.from('exam_grades').upsert({
                    student_id: AppState.studentId,
                    exam_id: parseInt(AppState.examId),
                    question_id: questionId,
                    selected_answer: AppState.answers[questionId],
                    marks: 0,
                    graded_at: new Date().toISOString()
                }, { onConflict: 'student_id, exam_id, question_id' });
                saved++;
            } catch (e) {
                console.warn('Failed to save answer for question ' + questionId + ':', e);
            }
        }
    }

    console.log('✅ Saved ' + saved + '/' + total + ' answers to database');
    return saved;
}

// ============================================================
// CALCULATE AND SAVE GRADE
// ============================================================
async function calculateAndSaveGrade() {
    try {
        const qResult = await sb.from('exam_questions')
            .select('id, correct_answer, marks')
            .eq('exam_id', parseInt(AppState.examId));

        const questionsData = qResult.data;
        if (!questionsData || questionsData.length === 0) {
            throw new Error('No questions found');
        }

        let totalEarned = 0;
        let totalPossible = 0;
        const answerRecords = [];
        let correctCount = 0;
        let wrongCount = 0;

        for (let i = 0; i < questionsData.length; i++) {
            const q = questionsData[i];
            const marks = q.marks || 1;
            totalPossible += marks;
            const studentAnswer = AppState.answers[q.id];
            const isCorrect = studentAnswer === q.correct_answer;
            const earned = isCorrect ? marks : 0;
            totalEarned += earned;

            if (isCorrect) correctCount++;
            else wrongCount++;

            answerRecords.push({
                student_id: AppState.studentId,
                exam_id: parseInt(AppState.examId),
                question_id: q.id,
                selected_answer: studentAnswer || null,
                marks: earned,
                graded_at: new Date().toISOString()
            });
        }

        // Handle unanswered questions
        questionsData.forEach((q) => {
            if (!AppState.answers[q.id]) {
                answerRecords.push({
                    student_id: AppState.studentId,
                    exam_id: parseInt(AppState.examId),
                    question_id: q.id,
                    selected_answer: null,
                    marks: 0,
                    graded_at: new Date().toISOString()
                });
            }
        });

        const percentage = totalPossible > 0 ? (totalEarned / totalPossible) * 100 : 0;
        const resultStatus = 'PENDING_REVIEW';

        // Delete existing grades
        await sb.from('exam_grades')
            .delete()
            .eq('student_id', AppState.studentId)
            .eq('exam_id', parseInt(AppState.examId));

        // Insert all answers in batches
        if (answerRecords.length > 0) {
            const BATCH_SIZE = 50;
            for (let i = 0; i < answerRecords.length; i += BATCH_SIZE) {
                const batch = answerRecords.slice(i, i + BATCH_SIZE);
                await sb.from('exam_grades').insert(batch);
            }
        }

        // Insert summary record
        await sb.from('exam_grades').insert({
            student_id: AppState.studentId,
            exam_id: parseInt(AppState.examId),
            question_id: '00000000-0000-0000-0000-000000000000',
            marks: totalEarned,
            total_score: totalEarned,
            percentage: percentage,
            result_status: resultStatus,
            graded_at: new Date().toISOString()
        });

        console.log('✅ Grade calculated: ' + totalEarned + '/' + totalPossible + ' marks (' + percentage.toFixed(2) + '%)');
        console.log('✅ Correct: ' + correctCount + ', Wrong: ' + wrongCount);
        console.log('✅ Status: ' + resultStatus + ' (Waiting for admin release)');
        
        return { 
            totalEarned, 
            totalPossible, 
            percentage,
            correctCount,
            wrongCount,
            resultStatus
        };

    } catch (error) {
        console.error('❌ Error calculating grade:', error);
        throw error;
    }
}

// ============================================================
// COMPLETION SCREEN
// ============================================================
function showCompletionCertificate() {
    const totalQuestions = AppState.questions.length;
    const answered = Object.keys(AppState.answers).length;
    const skipped = totalQuestions - answered;
    const percentAnswered = totalQuestions > 0 ? Math.round((answered / totalQuestions) * 100) : 0;

    DOM.examContainer.innerHTML = `
        <div class="success-screen">
            <div class="success-icon">🏆</div>
            <h2>Exam Complete!</h2>
            <div class="completion-certificate">
                <div class="cert-badge">✅ COMPLETED</div>
                <h3>📊 Exam Summary</h3>
                <div class="summary-grid">
                    <div class="summary-item"><div class="label">Questions Answered</div><div class="value">${answered}/${totalQuestions}</div></div>
                    <div class="summary-item"><div class="label">Skipped</div><div class="value">${skipped}</div></div>
                    <div class="summary-item"><div class="label">Completion Rate</div><div class="value">${percentAnswered}%</div></div>
                    <div class="summary-item"><div class="label">Status</div><div class="value" style="color: #F59E0B;">⏳ Pending Review</div></div>
                </div>
                <p class="completion-note">Your results will be available after the exam is reviewed by the admin.</p>
            </div>
            <div class="redirect-countdown">Redirecting in <span id="countdown-number">5</span> seconds...</div>
            <a href="https://nakurucollegeofhealthelearning.site/student/cats" class="dashboard-link">📊 Go to Dashboard Now</a>
        </div>
    `;

    const navButtons = document.querySelector('.nav-buttons');
    const progress = document.querySelector('.progress-container');
    const timer = DOM.examTimer;
    if (navButtons) navButtons.style.display = 'none';
    if (progress) progress.style.display = 'none';
    if (timer) timer.style.display = 'none';

    let countdown = 5;
    const redirectInterval = setInterval(() => {
        countdown--;
        const el = document.getElementById('countdown-number');
        if (el) el.textContent = countdown;
        if (countdown <= 0) {
            clearInterval(redirectInterval);
            window.location.href = 'https://nakurucollegeofhealthelearning.site/student/cats';
        }
    }, 1000);
}

// ============================================================
// FULLSCREEN MONITORING
// ============================================================
function setupFullscreenMonitoring() {
    document.addEventListener('fullscreenchange', () => {
        const isFullscreen = !!document.fullscreenElement;
        if (!isFullscreen && AppState.examStarted && !AppState.fullscreenWarningActive && !AppState.isSubmitting) {
            if (document.documentElement.requestFullscreen) {
                document.documentElement.requestFullscreen().catch(() => showFullscreenExitWarning());
            } else {
                showFullscreenExitWarning();
            }
        } else if (isFullscreen && AppState.fullscreenWarningActive) {
            if (AppState.countdownInterval) clearInterval(AppState.countdownInterval);
            DOM.fullscreenExitWarning.style.display = 'none';
            AppState.fullscreenWarningActive = false;
        }
    });
}

function showFullscreenExitWarning() {
    if (AppState.fullscreenWarningActive || AppState.isSubmitting) return;
    AppState.fullscreenWarningActive = true;
    logProctoringEvent('fullscreen_exit_attempt', 'Student attempted to exit fullscreen mode', 'critical');

    const warningOverlay = DOM.fullscreenExitWarning;
    const countdownEl = DOM.exitCountdown;
    let countdown = 5;
    countdownEl.textContent = countdown;
    warningOverlay.style.display = 'flex';

    try {
        const audio = new Audio(
            'data:audio/wav;base64,UklGRlQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoAAACBhYqFhYaFhYaFhYaFhYaFhYaFhYaFhYaFhYaFhYaFhYaFhYaFhYaFhYaFhYaFhYaFhYaFhYaFhYaFhYWFhQ=='
        );
        audio.volume = 0.3;
        audio.play().catch(() => {});
    } catch (e) {}

    if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => {});
    }

    AppState.countdownInterval = setInterval(() => {
        countdown--;
        countdownEl.textContent = countdown;

        if (countdown <= 2) {
            warningOverlay.style.backgroundColor = countdown % 2 === 0 ? 'rgba(0,0,0,0.98)' : 'rgba(220,38,38,0.3)';
        }

        if (document.fullscreenElement) {
            clearInterval(AppState.countdownInterval);
            warningOverlay.style.display = 'none';
            AppState.fullscreenWarningActive = false;
            return;
        }
        if (countdown <= 0) {
            clearInterval(AppState.countdownInterval);
            warningOverlay.style.display = 'none';
            AppState.fullscreenWarningActive = false;
            if (!AppState.isSubmitting) {
                executeSubmissionWithLoading();
            }
        }
    }, 1000);
}

async function enterSecureFullscreen() {
    try {
        await document.documentElement.requestFullscreen();
        console.log('✅ Fullscreen mode activated');
        blockApplications();
        return true;
    } catch (err) {
        console.warn('Fullscreen request failed:', err);
        showToast('⚠️ Please enable fullscreen for exam security', 'warning');
        return false;
    }
}

// ============================================================
// APPLICATION BLOCKING
// ============================================================
function blockApplications() {
    document.addEventListener('keydown', blockKeyboardShortcuts);
    document.addEventListener('contextmenu', preventDefault);
    document.addEventListener('copy', preventDefault);
    document.addEventListener('paste', preventDefault);
    document.addEventListener('cut', preventDefault);
    document.addEventListener('dragstart', preventDefault);
    document.addEventListener('drop', preventDefault);

    document.addEventListener('keyup', function(e) {
        if (e.key === 'PrintScreen') {
            preventDefault(e);
            showToast('⚠️ Screenshot attempt detected!', 'warning');
            logProctoringEvent('screenshot_attempt', 'Student attempted to take screenshot', 'critical');
        }
    });
}

function preventDefault(e) {
    e.preventDefault();
    e.stopPropagation();
    return false;
}

function blockKeyboardShortcuts(e) {
    if (e.key === 'F12') {
        e.preventDefault();
        showToast('⚠️ Developer Tools are blocked!', 'warning');
        return false;
    }
    if (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i')) {
        e.preventDefault();
        return false;
    }
    if (e.altKey && e.key === 'Tab') {
        e.preventDefault();
        showToast('⚠️ Alt+Tab is blocked!', 'warning');
        return false;
    }
    if (e.key === 'Meta' || e.key === 'Windows') {
        e.preventDefault();
        return false;
    }
    if (e.altKey && e.key === 'F4') {
        e.preventDefault();
        return false;
    }
    if (e.ctrlKey && e.key === 'w') {
        e.preventDefault();
        return false;
    }
    if (e.ctrlKey && (e.key === 'n' || e.key === 't')) {
        e.preventDefault();
        return false;
    }
    if (e.ctrlKey && e.shiftKey && e.key === 'Escape') {
        e.preventDefault();
        showToast('⚠️ Task Manager is blocked!', 'warning');
        return false;
    }
    if (e.ctrlKey && (e.key === 'c' || e.key === 'C' || e.key === 'v' || e.key === 'V' || e.key === 'x' || e.key === 'X')) {
        e.preventDefault();
        return false;
    }
    if (e.ctrlKey && (e.key === 's' || e.key === 'S' || e.key === 'p' || e.key === 'P' || e.key === 'u' || e.key === 'U')) {
        e.preventDefault();
        return false;
    }
    if (e.key === 'f' || e.key === 'F') {
        if (!e.target.matches('input, textarea, select')) {
            e.preventDefault();
            if (!AppState.isExamPaused) window.toggleFlagQuestion();
        }
    }
}

function unblockApplications() {
    document.removeEventListener('keydown', blockKeyboardShortcuts);
    document.removeEventListener('contextmenu', preventDefault);
    document.removeEventListener('copy', preventDefault);
    document.removeEventListener('paste', preventDefault);
    document.removeEventListener('cut', preventDefault);
    document.removeEventListener('dragstart', preventDefault);
    document.removeEventListener('drop', preventDefault);
}

// ============================================================
// WINDOW EVENT HANDLERS
// ============================================================
function handleWindowBlur() {
    if (!AppState.isExamActive || AppState.isExamPaused) return;
    AppState.blurCount++;
    DOM.appBlockOverlay.style.display = 'flex';
    logProctoringEvent('window_blur', 'Window lost focus (' + AppState.blurCount + ')', 'warning');
    showToast('⚠️ Please stay on the exam window! (' + AppState.blurCount + '/' + CONFIG.MAX_BLUR_COUNT + ')', 'warning');
    captureSnapshot();

    if (AppState.blurCount >= CONFIG.MAX_BLUR_COUNT) {
        logProctoringEvent('auto_submit', 'Auto-submitted due to multiple window blur violations', 'critical');
        executeSubmissionWithLoading();
    }
}

function handleWindowFocus() {
    if (AppState.isExamActive) {
        AppState.blurCount = 0;
        DOM.appBlockOverlay.style.display = 'none';
    }
}

window.returnToExam = function() {
    DOM.appBlockOverlay.style.display = 'none';
    if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => {
            showToast('⚠️ Please enter fullscreen mode', 'warning');
        });
    }
    window.focus();
    AppState.blurCount = 0;
};

function handleVisibilityChange() {
    if (document.hidden && AppState.isExamActive && !AppState.isExamPaused) {
        AppState.tabSwitchCount++;
        DOM.appBlockOverlay.style.display = 'flex';
        logProctoringEvent('tab_switch', 'Student switched tabs (' + AppState.tabSwitchCount + ')', 'warning');
        showToast('⚠️ Tab switch detected! (' + AppState.tabSwitchCount + '/3)', 'warning');
        captureSnapshot();

        if (AppState.tabSwitchCount >= CONFIG.MAX_TAB_SWITCHES) {
            showToast('🚨 Multiple tab switches detected! Auto-submitting...', 'error');
            logProctoringEvent('auto_submit', 'Auto-submitted due to excessive tab switches', 'critical');
            setTimeout(executeSubmissionWithLoading, 3000);
        }
    } else if (!document.hidden && AppState.isExamActive) {
        DOM.appBlockOverlay.style.display = 'none';
    }
}

// ============================================================
// NETWORK MONITORING
// ============================================================
function setupNetworkMonitoring() {
    window.addEventListener('online', async () => {
        showToast('✅ Network restored! Syncing answers...', 'success');

        const draftKeys = Object.keys(localStorage).filter(key => 
            key.startsWith(`${CONFIG.STORAGE_PREFIX}${AppState.examId}_draft_${AppState.studentId}`)
        );
        
        if (draftKeys.length > 0) {
            let synced = 0;
            for (const key of draftKeys) {
                try {
                    const data = JSON.parse(localStorage.getItem(key));
                    if (data && data.answer) {
                        const questionId = key.split('_').pop();
                        await saveAnswerToDatabase(questionId, data.answer);
                        synced++;
                    }
                } catch (e) {}
            }
            if (synced > 0) {
                showToast('✅ Synced ' + synced + ' answers to server', 'success');
                draftKeys.forEach(key => localStorage.removeItem(key));
            }
        }
    });

    window.addEventListener('offline', () => {
        showToast('⚠️ Network lost! Answers saved locally.', 'warning');
        for (const questionId in AppState.answers) {
            if (AppState.answers.hasOwnProperty(questionId)) {
                saveToLocalStorage(`draft_${questionId}`, { 
                    answer: AppState.answers[questionId], 
                    timestamp: Date.now() 
                });
            }
        }
    });

    window.addEventListener('online', () => {
        DOM.networkIndicator.innerHTML = '<i class="fas fa-wifi"></i> Online';
        DOM.networkIndicator.className = '';
        showToast('✅ Network restored', 'success');
    });

    window.addEventListener('offline', () => {
        DOM.networkIndicator.innerHTML = '<i class="fas fa-wifi-slash"></i> Offline';
        DOM.networkIndicator.className = 'offline';
        showToast('⚠️ You are offline. Answers will be saved locally.', 'warning');
    });
}

// ============================================================
// BEFORE UNLOAD HANDLER
// ============================================================
function handleBeforeUnload(e) {
    if (AppState.isExamActive && !AppState.isSubmitting) {
        const answered = Object.keys(AppState.answers).length;
        const total = AppState.questions.length;
        const unanswered = total - answered;
        
        const message = `⚠️ EXAM IN PROGRESS!\n\n` +
            `📊 Progress: ${answered}/${total} questions answered\n` +
            `⏳ ${unanswered} question(s) remaining\n\n` +
            `💾 Your answers are being saved automatically.\n` +
            `⚠️ Are you sure you want to leave?\n` +
            `   Your progress will be saved.`;
        
        e.preventDefault();
        e.returnValue = message;
        return message;
    }
}

function setupBeforeUnloadHandler() {
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    document.addEventListener('visibilitychange', function() {
        if (document.hidden && AppState.isExamActive && !AppState.isSubmitting) {
            logProctoringEvent('page_hide', 'Student minimized or switched apps', 'warning');
        }
    });
}

// ============================================================
// INACTIVITY TIMER
// ============================================================
function setupInactivityTimer() {
    resetInactivityTimer();
    
    document.addEventListener('click', resetInactivityTimer);
    document.addEventListener('keydown', resetInactivityTimer);
    document.addEventListener('touchstart', resetInactivityTimer);
    document.addEventListener('mousemove', resetInactivityTimer);
}

function resetInactivityTimer() {
    if (AppState.inactivityTimer) {
        clearTimeout(AppState.inactivityTimer);
    }
    AppState.inactivityTimer = setTimeout(() => {
        if (AppState.isExamActive && !AppState.isSubmitting && !AppState.isExamPaused) {
            showToast('⏰ Still there? Your exam is waiting for you!', 'warning');
            logProctoringEvent('inactivity_warning', 'Student inactive for 30 minutes', 'warning');
        }
    }, CONFIG.INACTIVITY_TIMEOUT);
}

// ============================================================
// MOBILE SWIPE SUPPORT
// ============================================================
let touchStartX = 0;
let touchStartY = 0;

document.addEventListener('touchstart', function(e) {
    const middlePanel = document.querySelector('.middle-panel');
    if (middlePanel && middlePanel.contains(e.target)) {
        touchStartX = e.changedTouches[0].screenX;
        touchStartY = e.changedTouches[0].screenY;
    }
}, { passive: true });

document.addEventListener('touchmove', function(e) {
    if (touchStartX > 0) {
        const touch = e.changedTouches[0];
        const diffX = touchStartX - touch.screenX;
        const diffY = touchStartY - touch.screenY;
        if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 20) {
            e.preventDefault();
        }
    }
}, { passive: false });

document.addEventListener('touchend', function(e) {
    if (touchStartX === 0) return;
    
    const touchEndX = e.changedTouches[0].screenX;
    const touchEndY = e.changedTouches[0].screenY;
    
    const swipeThreshold = 50;
    const diffX = touchStartX - touchEndX;
    const diffY = touchStartY - touchEndY;
    
    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > swipeThreshold) {
        if (diffX > 0 && !DOM.nextBtn.disabled && !AppState.isExamPaused) {
            nextQuestion();
            showToast('👈 Swiped to next question', 'info');
            if (navigator.vibrate) navigator.vibrate(10);
        } else if (diffX < 0 && !DOM.prevBtn.disabled && !AppState.isExamPaused) {
            prevQuestion();
            showToast('👉 Swiped to previous question', 'info');
            if (navigator.vibrate) navigator.vibrate(10);
        }
    }
    
    touchStartX = 0;
    touchStartY = 0;
}, { passive: true });

function showSwipeHint() {
    const isMobile = window.innerWidth <= 768;
    if (isMobile && !sessionStorage.getItem('swipeHintShown')) {
        setTimeout(() => {
            showToast('👆 Swipe left/right to navigate questions', 'info');
            sessionStorage.setItem('swipeHintShown', 'true');
        }, 3000);
    }
}

// ============================================================
// EXAM EVENT LISTENERS - FIXED (removed startExamCamera reference)
// ============================================================
function setupExamEventListeners() {
    if (DOM.prevBtn) {
        DOM.prevBtn.addEventListener('click', prevQuestion);
    }
    if (DOM.nextBtn) {
        DOM.nextBtn.addEventListener('click', nextQuestion);
    }
    if (DOM.submitBtn) {
        DOM.submitBtn.addEventListener('click', submitExam);
    }

    document.addEventListener('keydown', function(e) {
        if (e.target.matches('input, textarea, select')) return;
        if (e.key === 'ArrowLeft' && DOM.prevBtn && !DOM.prevBtn.disabled) {
            prevQuestion();
            e.preventDefault();
        }
        if (e.key === 'ArrowRight' && DOM.nextBtn && !DOM.nextBtn.disabled) {
            nextQuestion();
            e.preventDefault();
        }
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            if (!AppState.isExamPaused) {
                saveProgressLocally();
                showToast('💾 Progress saved manually', 'success');
            } else {
                showToast('⛔ Exam is paused. Face not detected.', 'warning');
            }
        }
        if (e.key === 'Enter' && DOM.submitBtn && !DOM.submitBtn.disabled) {
            submitExam();
            e.preventDefault();
        }
    });
}

// ============================================================
// INITIALIZATION
// ============================================================
document.addEventListener('DOMContentLoaded', function() {
    const params = new URLSearchParams(window.location.search);
    AppState.studentId = params.get('user_id') || localStorage.getItem('currentUserId');
    AppState.examId = params.get('exam_id');

    if (!AppState.studentId) {
        window.location.href = 'exam_login.html';
        return;
    }
    localStorage.setItem('currentUserId', AppState.studentId);

    if (!AppState.examId) {
        document.getElementById('examTitle').textContent = '❌ No Exam Selected';
        showToast('No exam selected. Please go back and try again.', 'error');
        return;
    }

    if (sessionStorage.getItem('examInProgress') === 'true') {
        const storedExamId = sessionStorage.getItem('examId');
        const storedStudentId = sessionStorage.getItem('studentId');
        if (storedExamId && storedStudentId) {
            window.location.href = `exam.html?user_id=${storedStudentId}&exam_id=${storedExamId}`;
            return;
        }
    }

    initDomRefs();
    loadLobbyData();
    console.log('📝 Exam Lobby loaded. Exam ID:', AppState.examId, 'Student ID:', AppState.studentId);
});

// Expose functions to window
window.renderQuestion = renderQuestion;
window.prevQuestion = prevQuestion;
window.nextQuestion = nextQuestion;
window.submitExam = submitExam;
window.toggleReviewMode = toggleReviewMode;
window.toggleFlagQuestion = toggleFlagQuestion;
window.returnToExam = window.returnToExam;
window.closeAttendanceModal = window.closeAttendanceModal;
window.startExam = window.startExam;
window.testCamera = window.testCamera;
window.goToStep = window.goToStep;
window.toggleTermsAgreed = window.toggleTermsAgreed;
window.retryCameraDuringExam = function() {
    if (AppState.secureProctor) {
        AppState.secureProctor.retryCamera();
    } else {
        showToast('❌ Face detection not initialized', 'error');
    }
};
