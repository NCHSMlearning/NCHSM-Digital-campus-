// ============================================================
// EXAM.JS - COMPLETE UPDATED VERSION
// WITH RETAKE/CONTINUATION SUPPORT & MODERN UI
// ============================================================

(function() {
    'use strict';

    console.log('✅ exam.js - Modern UI with Retake Support');

    // ============================================================
    // CONFIGURATION
    // ============================================================
    const CONFIG = {
        SUPABASE_URL: 'https://lwhtjozfsmbyihenfunw.supabase.co',
        SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx3aHRqb3pmc21ieWloZW5mdW53Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk2NTgxMjcsImV4cCI6MjA3NTIzNDEyN30.7Z8AYvPQwTAEEEhODlW6Xk-IR1FK3Uj5ivZS7P17Wpk',
        FACE_MODEL_URL: 'https://justadudewhohacks.github.io/face-api.js/models',
        FACE_DETECTION_INTERVAL: 500,
        FACE_SCORE_THRESHOLD: 0.5,
        MAX_BLUR_COUNT: 20,
        MAX_TAB_SWITCHES: 8,
        MAX_TIME_PER_QUESTION: 120,
        CONSECUTIVE_FACE_LOST_LIMIT: 15,
        TOTAL_VIOLATIONS_LIMIT: 5,
        RECOVERY_TIMER_SECONDS: 45,
        RETRY_COOLDOWN_SECONDS: 10,
        STORAGE_PREFIX: 'exam_',
        SNAPSHOT_INTERVAL: 30000,
        HEARTBEAT_INTERVAL: 15000,
        SAVE_INTERVAL: 10000,
        INACTIVITY_TIMEOUT: 30 * 60 * 1000,
        MULTIPLE_FACES_TIMEOUT: 45,
        FULLSCREEN_EXIT_TIMEOUT: 15,
        VIOLATION_COOLDOWN: 10000,
        EXAM_SESSION_KEY: 'exam_session',
        MAX_SESSION_AGE: 5 * 60 * 1000,
        CLEANUP_ON_COMPLETE: true,
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
        multipleFacesCount: 0,
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
        networkQuality: 'unknown',
        isRetake: false,
        retakeCount: 0,
    };

    // ============================================================
    // DOM REFS
    // ============================================================
    const DOM = {};

    function initDomRefs() {
        // Lobby
        DOM.lobbyContainer = document.getElementById('lobbyContainer');
        DOM.examInterface = document.getElementById('examInterface');
        DOM.examContainer = document.getElementById('exam-container');
        DOM.examTimer = document.getElementById('timerDisplayHeader');
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
        DOM.progressPercentage = document.getElementById('progress-percentage');
        
        // Lobby elements
        DOM.termsCheckbox = document.getElementById('termsCheckbox');
        DOM.termsNextBtn = document.getElementById('termsNextBtn');
        DOM.cameraNextBtn = document.getElementById('cameraNextBtn');
        DOM.startExamBtn = document.getElementById('startExamBtn');
        DOM.startExamText = document.getElementById('startExamText');
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
        DOM.continuationBadge = document.getElementById('continuationBadge');
        DOM.retakeInstructions = document.getElementById('retakeInstructions');
        DOM.retakeAttemptCount = document.getElementById('retakeAttemptCount');
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

    function showToast(message, type = 'info', duration = 3000) {
        const existing = document.querySelector('.toast');
        if (existing) existing.remove();

        const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
        const colors = {
            success: '#10b981',
            error: '#ef4444',
            warning: '#f59e0b',
            info: '#0A3D62'
        };
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.style.cssText = `
            position: fixed;
            bottom: 30px;
            left: 50%;
            transform: translateX(-50%);
            background: ${colors[type] || '#0A3D62'};
            color: white;
            padding: 12px 24px;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.15);
            z-index: 999999;
            font-family: 'Poppins', sans-serif;
            font-size: 0.9rem;
            font-weight: 500;
            max-width: 90%;
            text-align: center;
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            gap: 10px;
        `;
        toast.innerHTML = `${icons[type] || 'ℹ️'} ${message}`;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(-50%) translateY(20px)';
            setTimeout(() => toast.remove(), 500);
        }, duration);
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

    function getDeviceInfo() {
        return {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            language: navigator.language,
            screenResolution: `${window.screen.width}x${window.screen.height}`,
            colorDepth: window.screen.colorDepth,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        };
    }

    // ============================================================
    // FACE DETECTION
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
    // SESSION MANAGEMENT
    // ============================================================

    function saveExamSession() {
        try {
            sessionStorage.setItem(CONFIG.EXAM_SESSION_KEY, JSON.stringify({
                examId: AppState.examId,
                studentId: AppState.studentId,
                examActive: AppState.isExamActive,
                currentIndex: AppState.currentIndex,
                answers: AppState.answers,
                flaggedQuestions: AppState.flaggedQuestions,
                timestamp: Date.now(),
                isRetake: AppState.isRetake
            }));
        } catch (e) {}
    }

    function recoverExamSession() {
        try {
            const data = sessionStorage.getItem(CONFIG.EXAM_SESSION_KEY);
            if (data) {
                const session = JSON.parse(data);
                if (Date.now() - session.timestamp < CONFIG.MAX_SESSION_AGE) {
                    if (session.examId === AppState.examId && session.studentId === AppState.studentId) {
                        if (session.answers) {
                            AppState.answers = session.answers;
                            AppState.flaggedQuestions = session.flaggedQuestions || {};
                            AppState.currentIndex = session.currentIndex || 0;
                            AppState.hasAnsweredAtLeastOne = Object.keys(AppState.answers).length > 0;
                            AppState.isRetake = session.isRetake || false;
                            return true;
                        }
                    }
                }
            }
        } catch (e) {}
        return false;
    }

    // ============================================================
    // CHECK ACTIVE SESSION
    // ============================================================

    async function checkActiveSession() {
        try {
            const { data } = await sb
                .from('exam_heartbeats')
                .select('timestamp')
                .eq('student_id', AppState.studentId)
                .eq('exam_id', parseInt(AppState.examId))
                .order('timestamp', { ascending: false })
                .limit(1);
                
            if (data && data.length > 0) {
                const lastHeartbeat = new Date(data[0].timestamp);
                const now = new Date();
                const diff = (now - lastHeartbeat) / 1000 / 60;
                
                if (diff < 2) {
                    showToast('⚠️ Exam already active on another device', 'warning', 5000);
                    return false;
                }
            }
            return true;
        } catch (e) {
            return true;
        }
    }

    // ============================================================
    // CHECK RETAKE STATUS
    // ============================================================

    async function checkRetakeStatus() {
        try {
            const { data } = await sb
                .from('exam_grades')
                .select('result_status, reset_count, allow_retake, retake_unlocked')
                .eq('student_id', AppState.studentId)
                .eq('exam_id', parseInt(AppState.examId))
                .eq('question_id', '00000000-0000-0000-0000-000000000000')
                .single();

            if (data && data.result_status === 'RESET_FOR_RETAKE' && data.retake_unlocked === true) {
                AppState.isRetake = true;
                AppState.retakeCount = data.reset_count || 1;

                if (DOM.continuationBadge) {
                    DOM.continuationBadge.style.display = 'block';
                }
                if (DOM.retakeInstructions) {
                    DOM.retakeInstructions.style.display = 'block';
                }
                if (DOM.retakeAttemptCount) {
                    DOM.retakeAttemptCount.textContent = (data.reset_count || 0) + 1;
                }
                if (DOM.startExamText) {
                    DOM.startExamText.textContent = '🔄 Continue My Exam';
                }

                console.log('🔄 Continuation exam detected. Reset count:', data.reset_count);
                showToast('🔄 Continuing exam - Your answers are preserved', 'info', 4000);
            }
        } catch (e) {
            console.log('No retake status found');
        }
    }

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

            await checkRetakeStatus();

        } catch (error) {
            console.error('Error loading data:', error);
            showToast('Error loading exam data', 'error');
        }
    }

    // ============================================================
    // STEP NAVIGATION
    // ============================================================

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
            if (contentEl) contentEl.style.display = 'none';

            if (i < step) {
                stepEl.classList.add('completed');
            } else if (i === step) {
                stepEl.classList.add('active');
                if (contentEl) contentEl.style.display = 'block';
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
            DOM.startExamBtn.style.opacity = '0.5';
            DOM.startExamBtn.style.cursor = 'not-allowed';
            if (DOM.startExamText) {
                DOM.startExamText.textContent = '⏳ Waiting for verification...';
            }
        } else {
            DOM.startExamBtn.style.opacity = '1';
            DOM.startExamBtn.style.cursor = 'pointer';
            if (AppState.isRetake && DOM.startExamText) {
                DOM.startExamText.textContent = '🔄 Continue My Exam';
            } else if (DOM.startExamText) {
                DOM.startExamText.textContent = '🎯 I\'m Ready! Start My Exam';
            }
        }
    }

    // ============================================================
    // CAMERA TEST
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
    // START EXAM
    // ============================================================

    window.startExam = async function() {
        if (!AppState.cameraWorking || !AppState.termsAgreed || !AppState.faceVerified) {
            showToast('Please complete all steps first', 'warning');
            return;
        }

        if (!AppState.isRetake) {
            const sessionOk = await checkActiveSession();
            if (!sessionOk) {
                showToast('⚠️ You already have an active exam session on another device', 'error', 5000);
                return;
            }
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

        if (AppState.isRetake) {
            console.log('🔄 CONTINUING EXAM - Preserving all previous answers');
            showToast('🔄 Continuing from where you left off. Your answers are preserved.', 'info', 3000);
            await logProctoringEvent('exam_retake_continued', 'Student continuing exam after reset (answers preserved)', 'info');
        }

        DOM.lobbyContainer.style.display = 'none';
        DOM.examInterface.style.display = 'block';
        DOM.examInterface.classList.add('active');
        
        if (AppState.cameraStream) {
            DOM.faceVideo.srcObject = AppState.cameraStream;
            await DOM.faceVideo.play();
        }
        
        await enterSecureFullscreen();
        checkNetworkQuality();
        setupNetworkQualityMonitoring();
        initExam();
    };

    // ============================================================
    // EXAM INITIALIZATION
    // ============================================================

    async function initExam() {
        console.log('📝 Initializing exam...');

        try {
            const recovered = recoverExamSession();
            if (recovered) {
                showToast('📂 Session restored! Continuing where you left off.', 'success');
            }

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
                
                const answeredKeys = Object.keys(AppState.answers);
                if (answeredKeys.length > 0) {
                    let lastAnsweredIndex = 0;
                    AppState.questions.forEach((q, index) => {
                        if (AppState.answers[q.id]) {
                            lastAnsweredIndex = index;
                        }
                    });
                    AppState.currentIndex = lastAnsweredIndex;
                    if (AppState.isRetake) {
                        showToast(`📚 Resuming from question ${lastAnsweredIndex + 1}`, 'info');
                    }
                }
                
                renderQuestion(AppState.currentIndex);
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
                    DOM.submitBtn.style.opacity = '1';
                    DOM.submitBtn.style.cursor = 'pointer';
                }

                saveExamSession();
                sessionStorage.setItem('examInProgress', 'true');
                sessionStorage.setItem('examId', AppState.examId);
                sessionStorage.setItem('studentId', AppState.studentId);

                if (AppState.isRetake) {
                    showToast('🔄 Exam continuation started! Your answers are preserved.', 'success');
                } else {
                    showToast('📝 Exam started! Good luck!', 'success');
                }
                
                await logProctoringEvent('exam_started', 'Exam started with proctoring', 'info');

            } else {
                DOM.examContainer.innerHTML = '<div class="error-message">❌ No questions found for this exam.</div>';
            }

        } catch (error) {
            console.error('Error initializing exam:', error);
            DOM.examContainer.innerHTML = '<div class="error-message">❌ Error loading exam: ' + error.message + '</div>';
        }
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
        const optionLabels = ['A', 'B', 'C', 'D'];
        const optionValues = [q.option_a, q.option_b, q.option_c, q.option_d];
        
        optionValues.forEach((option, i) => {
            if (option) {
                const label = optionLabels[i];
                const checked = AppState.answers[q.id] === label ? 'checked' : '';
                optionsHtml += `
                    <li style="padding:10px 16px; border-radius:10px; border:2px solid ${AppState.answers[q.id] === label ? '#10b981' : '#e2e8f0'}; cursor:pointer; transition:all 0.2s; font-size:0.95rem; background:${AppState.answers[q.id] === label ? '#f0fdf4' : 'transparent'};">
                        <label style="cursor:pointer; display:flex; align-items:center; gap:10px; width:100%;">
                            <input type="radio" name="q${q.id}" value="${label}" ${checked} style="accent-color:#10b981; width:16px; height:16px; cursor:pointer;">
                            <strong>${label}.</strong> ${option}
                        </label>
                    </li>
                `;
            }
        });

        DOM.examContainer.innerHTML = `
            <div style="font-size:1.05rem; font-weight:500; color:#1e293b; line-height:1.7;">
                <strong>Q${AppState.currentIndex + 1}:</strong> ${q.question_text}
            </div>
            <div style="font-size:0.8rem; color:#94a3b8; margin:10px 0 14px; display:flex; align-items:center; gap:6px;">
                ⏱️ Time on this question: <span id="q-timer" style="font-weight:600; color:#64748b;">0:00</span>
            </div>
            <ul style="list-style:none; padding:0; display:flex; flex-direction:column; gap:8px;">${optionsHtml}</ul>
            ${isFlagged ? '<div style="color:#f59e0b; font-size:0.85rem; margin-top:10px;">🚩 Flagged for review</div>' : ''}
        `;

        if (DOM.flagQuestionBtn) {
            if (isFlagged) {
                DOM.flagQuestionBtn.innerHTML = '<i class="fas fa-flag"></i> Flagged';
                DOM.flagQuestionBtn.className = 'btn-flag flagged';
                DOM.flagQuestionBtn.style.background = '#f59e0b';
                DOM.flagQuestionBtn.style.color = 'white';
            } else {
                DOM.flagQuestionBtn.innerHTML = '<i class="far fa-flag"></i> Flag';
                DOM.flagQuestionBtn.className = 'btn-flag';
                DOM.flagQuestionBtn.style.background = '#fef3c7';
                DOM.flagQuestionBtn.style.color = '#92400e';
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
                    timerEl.style.color = '#dc2626';
                    timerEl.style.fontWeight = 'bold';
                } else if (remaining <= 60) {
                    timerEl.style.color = '#f59e0b';
                } else {
                    timerEl.style.color = '#64748b';
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
    // QUESTION NAVIGATION
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
    // ANSWER SAVING
    // ============================================================

    function saveAnswer(answer) {
        const q = AppState.questions[AppState.currentIndex];
        AppState.answers[q.id] = answer;
        AppState.hasAnsweredAtLeastOne = true;
        DOM.submitBtn.disabled = false;
        DOM.submitBtn.style.opacity = '1';
        DOM.submitBtn.style.cursor = 'pointer';

        if (DOM.answerSaved) {
            DOM.answerSaved.style.display = 'block';
            DOM.answerSaved.textContent = '✅ Saved!';
            setTimeout(() => { DOM.answerSaved.style.display = 'none'; }, 800);
        }

        saveAnswerToDatabase(q.id, answer);
        updateStatusTable();
        updateExamStats();
        saveProgressLocally();
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

    async function saveAnswerToDatabase(questionId, answer) {
        try {
            await sb.from('exam_grades').upsert({
                student_id: AppState.studentId,
                exam_id: parseInt(AppState.examId),
                question_id: questionId,
                selected_answer: answer,
                marks: 0,
                graded_at: new Date().toISOString()
            }, { onConflict: 'student_id, exam_id, question_id' });
        } catch (e) {
            console.warn('⚠️ Save failed, saving locally:', e);
            saveToLocalStorage(`draft_${questionId}`, { answer, timestamp: Date.now() });
        }
    }

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
                    DOM.submitBtn.style.opacity = '1';
                    DOM.submitBtn.style.cursor = 'pointer';
                }
                console.log('✅ Loaded ' + loaded + ' saved answers from database');
            }
        } catch (e) {
            console.warn('Could not load saved answers:', e);
        }
    }

    function saveProgressLocally() {
        if (!AppState.isExamActive) return;
        try {
            saveToLocalStorage('progress', {
                answers: AppState.answers,
                currentIndex: AppState.currentIndex,
                flaggedQuestions: AppState.flaggedQuestions,
                timestamp: Date.now()
            });
            saveExamSession();
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
                        DOM.submitBtn.style.opacity = '1';
                        DOM.submitBtn.style.cursor = 'pointer';
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
    // FLAGGING
    // ============================================================

    window.toggleFlagQuestion = function() {
        const q = AppState.questions[AppState.currentIndex];
        if (!q) return;

        const btn = DOM.flagQuestionBtn;
        if (AppState.flaggedQuestions[q.id]) {
            delete AppState.flaggedQuestions[q.id];
            btn.innerHTML = '<i class="far fa-flag"></i> Flag';
            btn.className = 'btn-flag';
            btn.style.background = '#fef3c7';
            btn.style.color = '#92400e';
            showToast('Question unmarked', 'info');
        } else {
            AppState.flaggedQuestions[q.id] = true;
            btn.innerHTML = '<i class="fas fa-flag"></i> Flagged';
            btn.className = 'btn-flag flagged';
            btn.style.background = '#f59e0b';
            btn.style.color = 'white';
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
    // QUESTION STATUS TABLE
    // ============================================================

    function renderQuestionStatusTable() {
        DOM.questionStatusTable.innerHTML = '';
        AppState.questions.forEach((_, index) => {
            const item = document.createElement('div');
            item.className = 'status-item';
            item.id = `q-status-${index}`;
            item.textContent = index + 1;
            item.style.cssText = `
                padding: 8px 4px;
                text-align: center;
                border-radius: 6px;
                font-size: 0.8rem;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s;
                background: #e2e8f0;
                color: #64748b;
                border: 2px solid transparent;
            `;
            
            const q = AppState.questions[index];
            if (AppState.answers[q.id]) {
                item.style.background = '#10b981';
                item.style.color = 'white';
                item.title = `Answer: ${AppState.answers[q.id]}`;
            }
            
            item.onclick = function() {
                if (!AppState.isExamPaused) renderQuestion(index);
                else showToast('⛔ Exam is paused. Face not detected.', 'warning');
            };
            DOM.questionStatusTable.appendChild(item);
        });
        updateStatusTable();
    }

    function updateStatusTable() {
        AppState.questions.forEach((q, index) => {
            const item = document.getElementById(`q-status-${index}`);
            if (item) {
                item.style.border = '2px solid transparent';
                if (index === AppState.currentIndex) {
                    item.style.border = '2px solid #3b82f6';
                }
                if (AppState.answers[q.id]) {
                    item.style.background = '#10b981';
                    item.style.color = 'white';
                } else {
                    item.style.background = '#e2e8f0';
                    item.style.color = '#64748b';
                }
                if (AppState.flaggedQuestions[q.id]) {
                    item.style.background = '#f59e0b';
                    item.style.color = 'white';
                }
                if (AppState.answers[q.id] && AppState.flaggedQuestions[q.id]) {
                    item.style.background = 'linear-gradient(135deg, #10b981, #f59e0b)';
                }
                item.textContent = index + 1;
            }
        });
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
            DOM.statsAnswered.style.color = answered === total ? '#059669' : answered > total * 0.5 ? '#d97706' : '#dc2626';
        }
        if (DOM.statsFlagged) {
            DOM.statsFlagged.textContent = flagged;
            DOM.statsFlagged.style.color = flagged > 0 ? '#d97706' : '#94a3b8';
        }
        if (DOM.statsProgress) {
            DOM.statsProgress.textContent = progress + '%';
            DOM.statsProgress.style.color = progress === 100 ? '#059669' : progress >= 50 ? '#d97706' : '#dc2626';
        }
        if (DOM.statsUnanswered) {
            DOM.statsUnanswered.textContent = unanswered;
            DOM.statsUnanswered.style.color = unanswered > 0 ? '#dc2626' : '#059669';
        }
        if (DOM.progressPercentage) {
            DOM.progressPercentage.textContent = progress + '%';
            DOM.progressPercentage.style.color = progress === 100 ? '#059669' : progress >= 50 ? '#d97706' : '#64748b';
        }
        if (DOM.progressFill) {
            DOM.progressFill.style.width = progress + '%';
        }
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
        
        if (DOM.prevBtn.disabled) {
            DOM.prevBtn.style.opacity = '0.4';
            DOM.prevBtn.style.cursor = 'not-allowed';
        } else {
            DOM.prevBtn.style.opacity = '1';
            DOM.prevBtn.style.cursor = 'pointer';
        }
        if (DOM.nextBtn.disabled) {
            DOM.nextBtn.style.opacity = '0.4';
            DOM.nextBtn.style.cursor = 'not-allowed';
        } else {
            DOM.nextBtn.style.opacity = '1';
            DOM.nextBtn.style.cursor = 'pointer';
        }
        
        updateExamStats();
    }

    function updateQuestionTimer() {
        const elapsed = (Date.now() - AppState.questionStartTime) / 1000;
        const currentQ = AppState.questions[AppState.currentIndex];
        if (currentQ) {
            AppState.questionTimes[currentQ.id] = elapsed;
        }
    }

    // ============================================================
    // TIMER
    // ============================================================

    function startTimer(seconds) {
        const timerEl = DOM.examTimer;
        if (!timerEl) return;

        AppState.timerInterval = setInterval(() => {
            const m = Math.floor(seconds / 60);
            const s = seconds % 60;
            timerEl.textContent = formatTime(seconds);

            const answered = Object.keys(AppState.answers).length;
            const total = AppState.questions.length;
            const pct = total > 0 ? Math.round((answered / total) * 100) : 0;
            if (DOM.progressPercentage) {
                DOM.progressPercentage.textContent = pct + '%';
            }

            if (seconds <= 60 && seconds > 0 && !AppState.timerWarningShown) {
                AppState.timerWarningShown = true;
                showTimerWarning();
                showToast('⚠️ 1 minute remaining! Your exam will auto-submit.', 'warning');
            }

            if (seconds <= 10 && seconds > 0) {
                timerEl.style.color = '#ef4444';
                timerEl.style.fontWeight = 'bold';
            } else {
                timerEl.style.color = 'white';
            }

            if (seconds <= 0) {
                clearInterval(AppState.timerInterval);
                timerEl.textContent = '00:00';
                logProctoringEvent('exam_auto_submitted', 'Exam was automatically submitted when timer reached 0', 'info');
                DOM.examContainer.innerHTML = `
                    <div style="text-align:center; padding:40px;">
                        <div style="font-size:4rem;">⏰</div>
                        <h2 style="color:#0A3D62;">Time's Up!</h2>
                        <p style="color:#64748b;">Your exam time has ended. Your answers are being submitted automatically.</p>
                        <div style="margin-top:12px; color:#0A3D62;">⏳ Submitting...</div>
                    </div>
                `;
                DOM.prevBtn.disabled = true;
                DOM.nextBtn.disabled = true;
                DOM.submitBtn.disabled = true;
                captureSnapshot();
                setTimeout(() => executeSubmissionWithLoading(), 2000);
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
                const answeredColor = isAnswered ? '#10b981' : '#dc2626';
                const answeredText = isAnswered ? `✅ ${answer}` : '⚠️ Not answered';
                const flaggedText = isFlagged ? ' 🚩' : '';
                html += `
                    <div style="padding:8px 12px; border-radius:8px; margin-bottom:4px; background:${isAnswered ? '#f0fdf4' : '#fef2f2'}; border-left:3px solid ${isAnswered ? '#10b981' : '#dc2626'}; cursor:pointer; display:flex; justify-content:space-between; align-items:center; font-size:0.85rem;" 
                         onclick="window.renderQuestion(${index})">
                        <span>Q${index + 1}: ${q.question_text.substring(0, 40)}${q.question_text.length > 40 ? '...' : ''}</span>
                        <span style="font-weight:600; color:${answeredColor}">${answeredText}${flaggedText}</span>
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
        if (AppState.isSubmitting) {
            showToast('⏳ Submission already in progress...', 'warning');
            return;
        }

        showSubmissionSummary();

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

    function showSubmissionSummary() {
        const total = AppState.questions.length;
        const answered = Object.keys(AppState.answers).length;
        const skipped = total - answered;
        const flagged = Object.keys(AppState.flaggedQuestions).length;
        
        let summary = `📊 Exam Summary:\n✅ Answered: ${answered}/${total}`;
        if (skipped > 0) {
            summary += `\n⚠️ Skipped: ${skipped}`;
        }
        if (flagged > 0) {
            summary += `\n🚩 Flagged: ${flagged}`;
        }
        summary += skipped > 0 ? '\n⚠️ You have unanswered questions!' : '\n🎯 All questions answered!';
        
        showToast(summary, skipped > 0 ? 'warning' : 'success', 5000);
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
    // EXECUTE SUBMISSION
    // ============================================================

    async function executeSubmissionWithLoading() {
        if (AppState.isSubmitting) {
            console.log('⚠️ Submission already in progress, skipping...');
            return;
        }
        
        if (!AppState.isExamActive) {
            console.log('⚠️ Exam not active, skipping submission...');
            return;
        }
        
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
            if (CONFIG.CLEANUP_ON_COMPLETE) {
                cleanupExamData();
            }

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

    function showSubmissionProgress(title, message) {
        const overlay = DOM.submissionProgress;
        const titleEl = overlay.querySelector('.progress-title');
        const msgEl = DOM.submissionMessage;
        const fillEl = DOM.submissionProgressFill;
        const percentEl = DOM.submissionPercentage;

        overlay.style.display = 'flex';
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

    function cleanupExamData() {
        sessionStorage.removeItem(CONFIG.EXAM_SESSION_KEY);
        sessionStorage.removeItem('examInProgress');
        sessionStorage.removeItem('examId');
        sessionStorage.removeItem('studentId');
        
        const keys = Object.keys(localStorage).filter(key => 
            key.startsWith(`${CONFIG.STORAGE_PREFIX}${AppState.examId}`)
        );
        keys.forEach(key => localStorage.removeItem(key));
        
        AppState.isExamActive = false;
        AppState.examStarted = false;
        AppState.isSubmitting = false;
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

            await sb.from('exam_grades')
                .delete()
                .eq('student_id', AppState.studentId)
                .eq('exam_id', parseInt(AppState.examId));

            if (answerRecords.length > 0) {
                const BATCH_SIZE = 50;
                for (let i = 0; i < answerRecords.length; i += BATCH_SIZE) {
                    const batch = answerRecords.slice(i, i + BATCH_SIZE);
                    await sb.from('exam_grades').insert(batch);
                }
            }

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
            
            return { totalEarned, totalPossible, percentage, correctCount, wrongCount, resultStatus };

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
            <div style="text-align:center; padding:30px 20px;">
                <div style="font-size:4rem; margin-bottom:12px;">🏆</div>
                <h2 style="color:#0A3D62; margin-bottom:8px;">Exam Complete!</h2>
                <div style="background:linear-gradient(135deg, #f0fdf4, #ecfdf5); border-radius:14px; padding:20px; max-width:500px; margin:12px auto; border:1px solid #86efac;">
                    <div style="display:inline-block; background:#10b981; color:white; padding:4px 16px; border-radius:20px; font-size:0.8rem; font-weight:600; margin-bottom:12px;">✅ COMPLETED</div>
                    <h3 style="color:#065f46; margin-bottom:10px;">📊 Exam Summary</h3>
                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
                        <div style="background:white; padding:10px; border-radius:8px;">
                            <div style="font-size:0.7rem; color:#94a3b8;">Questions Answered</div>
                            <div style="font-size:1.2rem; font-weight:700; color:#0A3D62;">${answered}/${totalQuestions}</div>
                        </div>
                        <div style="background:white; padding:10px; border-radius:8px;">
                            <div style="font-size:0.7rem; color:#94a3b8;">Skipped</div>
                            <div style="font-size:1.2rem; font-weight:700; color:#dc2626;">${skipped}</div>
                        </div>
                        <div style="background:white; padding:10px; border-radius:8px;">
                            <div style="font-size:0.7rem; color:#94a3b8;">Completion Rate</div>
                            <div style="font-size:1.2rem; font-weight:700; color:#10b981;">${percentAnswered}%</div>
                        </div>
                        <div style="background:white; padding:10px; border-radius:8px;">
                            <div style="font-size:0.7rem; color:#94a3b8;">Status</div>
                            <div style="font-size:1.2rem; font-weight:700; color:#f59e0b;">⏳ Pending Review</div>
                        </div>
                    </div>
                    <p style="color:#64748b; font-size:0.85rem; margin-top:12px;">Your results will be available after the exam is reviewed by the admin.</p>
                </div>
                <div style="margin:12px 0; font-size:0.9rem; color:#94a3b8;">Redirecting in <span id="countdown-number" style="font-weight:700; color:#0A3D62;">5</span> seconds...</div>
                <a href="https://nakurucollegeofhealthelearning.site/student/cats" style="display:inline-block; background:#0A3D62; color:white; padding:12px 28px; border-radius:30px; text-decoration:none; font-weight:600;">📊 Go to Dashboard Now</a>
            </div>
        `;

        const navButtons = document.querySelector('.nav-section');
        const progress = document.querySelector('.question-progress');
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
        let countdown = CONFIG.FULLSCREEN_EXIT_TIMEOUT;
        countdownEl.textContent = countdown;
        warningOverlay.style.display = 'flex';

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
                if (!AppState.isSubmitting && AppState.isExamActive) {
                    showToast('⚠️ Fullscreen exit detected! Auto-submitting...', 'error');
                    logProctoringEvent('auto_submit', 'Auto-submitted due to fullscreen exit', 'critical');
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
        document.addEventListener('selectstart', preventDefault);

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
        if (e.ctrlKey && e.shiftKey && (e.key === 'J' || e.key === 'j')) {
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
        if (e.ctrlKey && (e.key === '+' || e.key === '-' || e.key === '=')) {
            e.preventDefault();
            return false;
        }
        if ((e.key === 'f' || e.key === 'F') && !e.target.matches('input, textarea, select')) {
            e.preventDefault();
            if (!AppState.isExamPaused) window.toggleFlagQuestion();
        }
        if (e.key === '?' && !e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            showKeyboardShortcuts();
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
        document.removeEventListener('selectstart', preventDefault);
    }

    function showKeyboardShortcuts() {
        showToast('⌨️ ← → Navigate | F Flag | Ctrl+S Save | Enter Submit', 'info', 5000);
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
            showToast('🚨 Multiple blur violations! Auto-submitting...', 'error');
            setTimeout(() => {
                if (!AppState.isSubmitting && AppState.isExamActive) {
                    executeSubmissionWithLoading();
                }
            }, 3000);
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
        AppState.tabSwitchCount = 0;
    };

    function handleVisibilityChange() {
        if (document.hidden && AppState.isExamActive && !AppState.isExamPaused) {
            AppState.tabSwitchCount++;
            DOM.appBlockOverlay.style.display = 'flex';
            logProctoringEvent('tab_switch', 'Student switched tabs (' + AppState.tabSwitchCount + ')', 'warning');
            showToast('⚠️ Tab switch detected! (' + AppState.tabSwitchCount + '/' + CONFIG.MAX_TAB_SWITCHES + ')', 'warning');
            captureSnapshot();

            if (AppState.tabSwitchCount >= CONFIG.MAX_TAB_SWITCHES) {
                showToast('🚨 Multiple tab switches detected! Auto-submitting...', 'error');
                logProctoringEvent('auto_submit', 'Auto-submitted due to excessive tab switches', 'critical');
                setTimeout(() => {
                    if (!AppState.isSubmitting && AppState.isExamActive) {
                        executeSubmissionWithLoading();
                    }
                }, 3000);
            }
        } else if (!document.hidden && AppState.isExamActive) {
            DOM.appBlockOverlay.style.display = 'none';
        }
    }

    // ============================================================
    // NETWORK MONITORING
    // ============================================================

    function checkNetworkQuality() {
        if ('connection' in navigator) {
            const conn = navigator.connection;
            if (conn) {
                AppState.networkQuality = conn.effectiveType || 'unknown';
                if (conn.effectiveType === 'slow-2g' || conn.effectiveType === '2g') {
                    showToast('📶 Slow network detected. Answers saved locally.', 'warning', 4000);
                    return 'slow';
                } else if (conn.effectiveType === '3g') {
                    showToast('📶 Medium network speed. Auto-save may be delayed.', 'info', 3000);
                    return 'medium';
                }
                return 'fast';
            }
        }
        return 'unknown';
    }

    function setupNetworkQualityMonitoring() {
        if ('connection' in navigator) {
            const conn = navigator.connection;
            if (conn) {
                conn.addEventListener('change', () => {
                    checkNetworkQuality();
                });
            }
        }
    }

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
        });

        window.addEventListener('offline', () => {
            DOM.networkIndicator.innerHTML = '<i class="fas fa-wifi-slash"></i> Offline';
            DOM.networkIndicator.className = 'offline';
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
            
            const message = `⚠️ EXAM IN PROGRESS!\n\n📊 Progress: ${answered}/${total} questions answered\n⏳ ${unanswered} question(s) remaining\n\n💾 Your answers are being saved automatically.\n⚠️ Are you sure you want to leave?`;
            
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
    // SNAPSHOT CAPTURE
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
        } catch (uploadError) {}

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
        } catch (e) {}
    }

    function startSnapshotCapture() {
        if (AppState.snapshotInterval) clearInterval(AppState.snapshotInterval);
        AppState.snapshotInterval = setInterval(() => {
            if (AppState.isExamActive && !AppState.isExamPaused) captureSnapshot();
        }, CONFIG.SNAPSHOT_INTERVAL);
    }

    // ============================================================
    // HEARTBEAT
    // ============================================================

    async function sendHeartbeat() {
        if (!AppState.isExamActive) return;
        try {
            await sb.from('exam_heartbeats').insert({
                student_id: AppState.studentId,
                exam_id: parseInt(AppState.examId),
                current_question: AppState.currentIndex + 1,
                answered_count: Object.keys(AppState.answers).length,
                total_questions: AppState.questions.length,
                face_detected: !AppState.isExamPaused,
                timestamp: new Date().toISOString()
            });
        } catch (e) {}
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
                        logProctoringEvent('face_violation', `Violation ${count}/3: ${message}`, 'warning');
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
                        logProctoringEvent('exam_paused', `Exam paused: ${reason}`, 'warning');
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
                        logProctoringEvent('exam_resumed', 'Exam resumed after face detection', 'info');
                    },
                    onAutoSubmit: () => {
                        showToast('❌ Auto-submitting due to violations', 'error');
                        const overlay = DOM.faceBlockOverlay;
                        if (overlay) {
                            DOM.faceBlockReason.textContent = '❌ Too many violations! Auto-submitting...';
                            DOM.faceRecoveryCountdown.textContent = '0';
                        }
                        logProctoringEvent('auto_submit', 'Auto-submitted due to face violations', 'critical');
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
            logProctoringEvent('face_detection_error', 'Face detection failed to start', 'critical');
        }
    }

    function updateCameraStatus(status, text, faceCount) {
        if (DOM.examStatusDot) {
            DOM.examStatusDot.className = 'status-dot ' + status;
            DOM.examStatusDot.style.background = status === 'good' ? '#10b981' : status === 'warning' ? '#f59e0b' : '#ef4444';
        }
        if (DOM.examStatusText) DOM.examStatusText.textContent = text;
        if (DOM.examFaceCount) DOM.examFaceCount.textContent = '👤 ' + faceCount;
    }

    // ============================================================
    // SECURE FACE PROCTOR CLASS
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
                VIOLATION_COOLDOWN: CONFIG.VIOLATION_COOLDOWN,
            };
            this.state = {
                consecutiveLost: 0,
                totalViolations: 0,
                isPaused: false,
                isSubmitting: false,
                recoveryTimerId: null,
                recoveryTimer: null,
                detectionInterval: null,
                lastRetryTime: 0,
                faceStable: false,
                lastFaceCount: 0,
                remainingTime: 0,
                lastViolationTime: 0,
                multipleFacesStartTime: 0,
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
            
            detections.forEach((det) => {
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
                this.state.multipleFacesStartTime = 0;
                
                if (this.state.isPaused) {
                    this.resumeExam();
                }
                updateCameraStatus('good', '✅ Face detected', '1 face');
                
                const warning = DOM.multipleFacesWarning;
                if (warning) warning.style.display = 'none';
                return;
            }
            
            if (this.state.isPaused) {
                updateCameraStatus('warning', `⏳ Face still lost (${this.state.remainingTime || 0}s remaining)`, '0 faces');
                return;
            }
            
            this.state.consecutiveLost++;
            this.state.faceStable = false;
            
            if (faceCount > 1) {
                updateCameraStatus('warning', `⚠️ Multiple faces (${faceCount})`, `${faceCount} faces`);
                this.showMultipleFacesWarning(faceCount);
                
                if (this.state.multipleFacesStartTime === 0) {
                    this.state.multipleFacesStartTime = Date.now();
                } else if (Date.now() - this.state.multipleFacesStartTime > CONFIG.MULTIPLE_FACES_TIMEOUT * 1000) {
                    this.handleViolation();
                    this.state.multipleFacesStartTime = 0;
                }
                return;
            } else {
                this.state.multipleFacesStartTime = 0;
                const warning = DOM.multipleFacesWarning;
                if (warning) warning.style.display = 'none';
                
                updateCameraStatus('warning', `⚠️ Face lost (${this.state.consecutiveLost}/${this.config.CONSECUTIVE_LOST_LIMIT})`, '0 faces');
            }
            
            if (this.state.consecutiveLost >= this.config.CONSECUTIVE_LOST_LIMIT) {
                this.handleViolation();
            }
        }
        
        showMultipleFacesWarning(faceCount) {
            const warning = DOM.multipleFacesWarning;
            if (!warning) return;
            
            const countdownEl = document.getElementById('multiple-faces-countdown');
            const progressEl = document.getElementById('multiple-faces-progress');
            
            if (this.state.multipleFacesStartTime > 0) {
                const elapsed = (Date.now() - this.state.multipleFacesStartTime) / 1000;
                const remaining = Math.max(0, CONFIG.MULTIPLE_FACES_TIMEOUT - elapsed);
                
                if (countdownEl) countdownEl.textContent = Math.ceil(remaining);
                if (progressEl) {
                    const pct = (elapsed / CONFIG.MULTIPLE_FACES_TIMEOUT) * 100;
                    progressEl.style.width = Math.min(100, pct) + '%';
                }
            }
            
            warning.style.display = 'flex';
        }
        
        handleViolation() {
            const now = Date.now();
            if (now - this.state.lastViolationTime < this.config.VIOLATION_COOLDOWN) {
                console.log('⏳ Violation cooldown active, skipping...');
                return;
            }
            
            if (this.state.isSubmitting) return;
            
            if (this.state.totalViolations >= this.config.TOTAL_VIOLATIONS_LIMIT) {
                this.autoSubmitExam();
                return;
            }
            
            this.state.totalViolations++;
            this.state.consecutiveLost = 0;
            this.state.lastViolationTime = now;
            
            console.log(`⚠️ Face violation ${this.state.totalViolations}/${this.config.TOTAL_VIOLATIONS_LIMIT}`);
            
            let timerSeconds = this.config.RECOVERY_TIMER_SECONDS - (this.state.totalViolations - 1) * 5;
            timerSeconds = Math.max(5, timerSeconds);
            
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
            
            if (DOM.faceRecoveryCountdown) {
                DOM.faceRecoveryCountdown.textContent = seconds;
                DOM.faceRecoveryCountdown.className = 'block-timer';
            }
            
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
                
                if (DOM.examStatusText) {
                    DOM.examStatusText.textContent = `⏳ Face lost - ${remaining}s to recover`;
                }
                
                if (remaining <= 0) {
                    clearInterval(this.state.recoveryTimerId);
                    this.state.recoveryTimerId = null;
                    this.state.recoveryTimer = null;
                    this.autoSubmitExam();
                }
            }, 1000);
            
            this.state.recoveryTimer = setTimeout(() => {
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
            this.state.multipleFacesStartTime = 0;
            
            if (DOM.faceRecoveryCountdown) {
                DOM.faceRecoveryCountdown.textContent = '✅';
                DOM.faceRecoveryCountdown.className = 'block-timer recovered';
            }
            
            const overlay = DOM.faceBlockOverlay;
            if (overlay) {
                overlay.style.display = 'none';
                overlay.classList.remove('active');
            }
            
            const warning = DOM.multipleFacesWarning;
            if (warning) warning.style.display = 'none';
            
            this.callbacks.onResume?.();
            updateCameraStatus('good', '✅ Face detected', '1 face');
            DOM.cameraContainer.className = 'camera-container face-verified';
            
            DOM.proctoringStatusText.textContent = 'Active';
            DOM.proctoringStatusText.className = 'status-value active';
            DOM.statsFace.textContent = '✅ OK';
            DOM.statsFace.style.color = '#38A169';
            
            showToast('✅ Face detected! Exam resumed.', 'success');
        }
        
        retryCamera() {
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
            
            this.state.lastRetryTime = now;
            showToast('🔄 Restarting camera...', 'info');
            
            try {
                navigator.mediaDevices.getUserMedia({
                    video: { facingMode: 'user', width: { ideal: 480 }, height: { ideal: 360 } },
                    audio: false
                }).then(stream => {
                    if (this.video) {
                        if (this.video.srcObject) {
                            const oldTracks = this.video.srcObject.getTracks();
                            oldTracks.forEach(t => t.stop());
                        }
                        this.video.srcObject = stream;
                        this.video.play();
                    }
                    this.state.consecutiveLost = 0;
                    this.state.isPaused = false;
                    AppState.isExamPaused = false;
                    this.resumeExam();
                    showToast('✅ Camera restarted', 'success');
                }).catch(() => {
                    showToast('❌ Camera restart failed', 'error');
                });
            } catch (error) {
                showToast('❌ Camera restart failed', 'error');
                return false;
            }
            return true;
        }
        
        autoSubmitExam() {
            if (this.state.isSubmitting) return;
            this.state.isSubmitting = true;
            
            if (this.state.recoveryTimerId) {
                clearInterval(this.state.recoveryTimerId);
                this.state.recoveryTimerId = null;
            }
            if (this.state.recoveryTimer) {
                clearTimeout(this.state.recoveryTimer);
                this.state.recoveryTimer = null;
            }
            
            const overlay = DOM.faceBlockOverlay;
            if (overlay) {
                overlay.style.display = 'none';
                overlay.classList.remove('active');
            }
            const warning = DOM.multipleFacesWarning;
            if (warning) warning.style.display = 'none';
            
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
    // STEALTH PROCTOR CLASS
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

                const { error } = await sb.storage
                    .from('proctoring')
                    .upload(fileName, blob, {
                        contentType: 'video/webm',
                        cacheControl: '3600',
                        upsert: false
                    });

                if (error) {
                    console.warn('Storage upload error:', error);
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
                await sb.from('exam_heartbeats').insert({
                    student_id: studentId,
                    exam_id: parseInt(examId),
                    current_question: AppState.currentIndex + 1 || 0,
                    answered_count: Object.keys(AppState.answers).length || 0,
                    total_questions: AppState.questions.length || 0,
                    face_detected: true,
                    timestamp: new Date().toISOString()
                });
            } catch (error) {}
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
    // PROCTORING LOGS
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
    // EXAM EVENT LISTENERS
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
        AppState.isRetake = params.get('retake') === 'true';

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

        if (!AppState.isRetake && sessionStorage.getItem('examInProgress') === 'true') {
            const storedExamId = sessionStorage.getItem('examId');
            const storedStudentId = sessionStorage.getItem('studentId');
            if (storedExamId && storedStudentId) {
                window.location.href = `exam.html?user_id=${storedStudentId}&exam_id=${storedExamId}`;
                return;
            }
        }

        if (AppState.isRetake) {
            console.log('🔄 CONTINUATION EXAM MODE - Answers preserved');
            showToast('🔄 Continuing exam - You can continue from where you left off', 'info', 4000);
        }

        initDomRefs();
        loadLobbyData();
        console.log('📝 Exam Lobby loaded. Exam ID:', AppState.examId, 'Student ID:', AppState.studentId);
        if (AppState.isRetake) {
            console.log('🔄 CONTINUATION MODE ACTIVE - Answers will be preserved');
        }
    });

    console.log('✅ exam.js loaded with Retake/Continuation support');

})();

// ============================================================
// EXPOSE FUNCTIONS TO GLOBAL WINDOW
// ============================================================

// Navigation
window.renderQuestion = renderQuestion;
window.prevQuestion = prevQuestion;
window.nextQuestion = nextQuestion;

// Submission
window.submitExam = submitExam;

// Review & Flagging
window.toggleReviewMode = toggleReviewMode;
window.toggleFlagQuestion = toggleFlagQuestion;

// Overlays & Modals
window.returnToExam = returnToExam;
window.closeAttendanceModal = closeAttendanceModal;

// Lobby Functions
window.startExam = startExam;
window.testCamera = testCamera;
window.goToStep = goToStep;
window.toggleTermsAgreed = toggleTermsAgreed;

// Camera Retry (during exam)
window.retryCameraDuringExam = function() {
    if (AppState.secureProctor) {
        AppState.secureProctor.retryCamera();
    } else {
        showToast('❌ Face detection not initialized', 'error');
    }
};

// Toast
window.showToast = showToast;

// Keyboard Shortcuts Helper
window.showKeyboardShortcuts = showKeyboardShortcuts;

console.log('✅ exam.js loaded with Retake/Continuation support');
console.log('📋 Available functions:');
console.log('   🔄 Navigation: renderQuestion, prevQuestion, nextQuestion');
console.log('   📤 Submission: submitExam');
console.log('   🚩 Review: toggleReviewMode, toggleFlagQuestion');
console.log('   📋 Lobby: startExam, testCamera, goToStep, toggleTermsAgreed');
console.log('   🔙 Overlays: returnToExam, closeAttendanceModal, retryCameraDuringExam');
console.log('   💬 Toast: showToast');
