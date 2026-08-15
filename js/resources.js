// ============================================================
// RESOURCES MODULE - COMPLETE ENHANCED VERSION
// ✅ Read Now - Opens resource (NO auto-play)
// ✅ Listen - Dual-voice podcast style (Male + Female)
// ✅ AI Summary - Generates summary
// ✅ All buttons VISIBLE
// ✅ Full PDF text extraction
// ✅ Full document audio reading
// ✅ Mobile responsive
// ✅ NotebookLM-style dual-voice podcast audio
// ============================================================

class ResourcesModule {
    constructor() {
        // ===== DOM Elements =====
        this.resourcesGrid = document.getElementById('student-resources-grid');
        this.blockFilter = document.getElementById('student-block-resource-filter');
        this.refreshBtn = document.getElementById('student-refresh-block-resources');
        this.searchInput = document.getElementById('student-resource-search');
        this.typeFilter = document.getElementById('student-resource-type-filter');
        this.courseFilter = document.getElementById('student-course-filter');
        this.yearFilter = document.getElementById('student-year-filter');
        this.resourceTypeTabs = document.querySelectorAll('.type-tab');
        
        // UI Elements
        this.programNameDisplay = document.getElementById('program-name-display');
        this.blockTermValue = document.getElementById('block-term-value');
        this.blockTermDisplay = document.getElementById('block-term-display');
        this.filterTitle = document.getElementById('filter-title');
        this.filterSubtitle = document.getElementById('filter-subtitle');
        this.filterInfoText = document.getElementById('filter-info-text');
        this.intakeYearValue = document.getElementById('intake-year-value');
        this.programDisplayBadge = document.getElementById('program-display-badge');
        this.studentCurrentBlock = document.getElementById('student-current-user-block');
        this.pastpaperCount = document.getElementById('student-pastpaper-count');
        
        // Mobile Reader
        this.mobileReader = document.getElementById('student-mobile-reader');
        this.readerTitle = document.getElementById('student-reader-title');
        this.readerContent = document.getElementById('student-reader-content');
        this.readerBackBtn = document.getElementById('student-reader-back-btn');
        
        // Audio Player
        this.audioContainer = document.getElementById('audio-player-container');
        this.audioTitle = document.getElementById('audio-title');
        this.audioStatus = document.getElementById('audio-status');
        this.audioWordCount = document.getElementById('audio-word-count');
        this.audioPlayBtn = document.getElementById('audio-play-btn');
        this.audioPauseBtn = document.getElementById('audio-pause-btn');
        this.audioStopBtn = document.getElementById('audio-stop-btn');
        this.audioSpeed = document.getElementById('audio-speed');
        this.audioCurrentTime = document.getElementById('audio-current-time');
        this.audioDuration = document.getElementById('audio-duration');
        this.audioProgressFill = document.getElementById('audio-progress-fill');
        this.audioProgressBar = document.getElementById('audio-progress-bar');
        this.audioCloseBtn = document.getElementById('audio-close-btn');
        this.audioWave = document.getElementById('audio-wave');
        this.audioSpeakerIndicator = document.getElementById('audio-speaker-indicator');
        
        // AI Summary Modal
        this.summaryModal = document.getElementById('ai-summary-modal');
        this.summaryTitle = document.getElementById('summary-resource-title');
        this.summaryLoading = document.getElementById('summary-loading');
        this.summaryContent = document.getElementById('summary-content');
        this.summaryActions = document.getElementById('summary-actions');
        this.closeSummaryBtn = document.getElementById('close-summary-modal');
        
        // ===== State =====
        this.allResources = [];
        this.filteredResources = [];
        this.currentBlockFilter = 'all';
        this.currentResourceType = 'all';
        this.currentSearchTerm = '';
        this.currentFileType = 'all';
        this.currentCourse = 'all';
        this.currentYear = 'all';
        this.isLoading = false;
        this.supabaseClient = null;
        
        // ===== Program Detection =====
        this.userProgram = 'krchn';
        this.userProgramDisplay = 'KRCHN Nursing';
        this.userProgramCode = 'KRCHN';
        this.userBlock = 'Introductory';
        this.userTerm = null;
        this.userIntakeYear = 2025;
        this.userId = null;
        this.isTVETStudent = false;
        this.userProfile = null;
        
        // ===== Audio State =====
        this.audioContext = null;
        this.audioSynth = null;
        this.isPlaying = false;
        this.isAudioPaused = false;
        this.currentAudioText = '';
        this.audioTimeout = null;
        this.currentAudioResource = null;
        this.audioStartTime = null;
        this.audioProgressInterval = null;
        this.audioVoicesLoaded = false;
        
        // ===== Dual-Voice Podcast State =====
        this.dualVoiceEnabled = true;
        this.maleVoice = null;
        this.femaleVoice = null;
        this.currentDialogueIndex = 0;
        this.dialogueLines = [];
        this.audioDialogueSpeed = 0.85;
        this.waveAnimationId = null;
        this.audioWaveCanvas = null;
        this.audioWaveCtx = null;
        
        // ===== TVET Program Codes =====
        this.TVET_PROGRAMS = [
            'DPOTT', 'DCH', 'DHRIT', 'DSL', 'DSW', 'DCJS', 'DHSS', 'DICT', 'DME',
            'CPOTT', 'CCH', 'CHRIT', 'CPC', 'CSL', 'CSW', 'CCJS', 'CAG', 'CHSS', 'CICT',
            'ACH', 'AAG', 'ASW', 'CCA', 'PTE'
        ];
        
        // ===== Block/Term Mapping =====
        this.BLOCK_MAPPING = {
            'all': ['All'],
            'introductory': ['Introductory', 'Intro', 'Foundation', 'Block 0'],
            'block1': ['Block 1', 'Block1', 'B1'],
            'block2': ['Block 2', 'Block2', 'B2'],
            'block3': ['Block 3', 'Block3', 'B3'],
            'block4': ['Block 4', 'Block4', 'B4'],
            'block5': ['Block 5', 'Block5', 'B5'],
            'final': ['Final', 'Final Block', 'Block 6']
        };
        
        this.TERM_MAPPING = {
            'all': ['All'],
            'term1': ['Term 1', 'Term1', 'Trimester 1', 'Semester 1', '1'],
            'term2': ['Term 2', 'Term2', 'Trimester 2', 'Semester 2', '2'],
            'term3': ['Term 3', 'Term3', 'Trimester 3', 'Semester 3', '3'],
            'term4': ['Term 4', 'Term4', 'Trimester 4', 'Semester 4', '4'],
            'term5': ['Term 5', 'Term5', 'Trimester 5', 'Semester 5', '5'],
            'term6': ['Term 6', 'Term6', 'Trimester 6', 'Semester 6', '6'],
            'final': ['Final', 'Final Term', 'Graduating', '7']
        };
        
        this.TERM_NUMBER_MAP = {
            'term1': 1,
            'term2': 2,
            'term3': 3,
            'term4': 4,
            'term5': 5,
            'term6': 6,
            'final': 7
        };
        
        // ===== PDF Viewer =====
        this.pdfjsLib = null;
        this.pdfjsLoaded = false;
        this.currentPDFDoc = null;
        this.currentPDFPage = 1;
        this.totalPDFPages = 0;
        this.pdfScale = 1.5;
        this.isRendering = false;
        this.pageNumPending = null;
        this.currentResource = null;
        this.isFullscreen = false;
        
        // Debounce timers
        this.searchDebounceTimer = null;
        this.filterChangeTimer = null;
        
        this.initializeElements();
    }
    
    // ============================================================
    // INITIALIZATION
    // ============================================================
    initializeElements() {
        console.log('📁 Initializing Student Resources Module with Dual-Voice Audio...');
        
        this.setupEventListeners();
        this.setupMobileReaderEvents();
        this.setupAudioEvents();
        this.setupSummaryEvents();
        this.detectUserProgram();
        this.loadResources();
        this.initWaveformCanvas();
    }
    
    setupEventListeners() {
        if (this.searchInput) {
            this.searchInput.addEventListener('input', (e) => {
                clearTimeout(this.searchDebounceTimer);
                this.searchDebounceTimer = setTimeout(() => {
                    this.currentSearchTerm = this.searchInput.value.trim();
                    this.applyFilters();
                }, 300);
            });
            
            this.searchInput.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    this.searchInput.value = '';
                    this.currentSearchTerm = '';
                    this.applyFilters();
                }
            });
        }
        
        const filterElements = [this.typeFilter, this.courseFilter, this.yearFilter, this.blockFilter];
        filterElements.forEach(filter => {
            if (filter) {
                filter.addEventListener('change', () => {
                    clearTimeout(this.filterChangeTimer);
                    this.filterChangeTimer = setTimeout(() => {
                        this.updateFilterStates();
                        this.applyFilters();
                    }, 100);
                });
            }
        });
        
        if (this.resourceTypeTabs) {
            this.resourceTypeTabs.forEach(tab => {
                tab.addEventListener('click', (e) => {
                    e.preventDefault();
                    const type = tab.getAttribute('data-type') || 'all';
                    this.filterResourcesByType(type);
                });
            });
        }
        
        if (this.refreshBtn) {
            const newRefreshBtn = this.refreshBtn.cloneNode(true);
            this.refreshBtn.parentNode.replaceChild(newRefreshBtn, this.refreshBtn);
            this.refreshBtn = newRefreshBtn;
            this.refreshBtn.addEventListener('click', () => {
                if (this.isLoading) return;
                this.showSkeletonCards(6);
                this.loadResources();
            });
        }
        
        document.addEventListener('nurseiqProgramChanged', (e) => {
            if (e.detail) {
                this.userProgram = e.detail.isTVET ? 'tvet' : 'krchn';
                this.isTVETStudent = e.detail.isTVET || false;
                this.userProgramDisplay = e.detail.displayName || 'KRCHN Nursing';
                this.updateUIForProgram();
                this.updateBlockFilterOptions();
                this.loadResources();
            }
        });
    }
    
    setupMobileReaderEvents() {
        if (this.readerBackBtn) {
            this.readerBackBtn.addEventListener('click', () => {
                this.closeMobileReader();
            });
        }
    }
    
    // ============================================================
    // MOBILE READER
    // ============================================================
    openMobileReader(resource) {
        if (!this.mobileReader || !this.readerTitle || !this.readerContent) {
            console.warn('Mobile reader elements not found');
            return;
        }
        
        this.readerTitle.textContent = resource.title || 'Resource';
        this.currentResource = resource;
        
        const fileType = this.getFileType(resource.file_path);
        let contentHtml = '';
        
        if (fileType === 'pdf') {
            contentHtml = `
                <div style="text-align:center;padding:30px 0;">
                    <i class="fas fa-file-pdf" style="font-size:64px;color:#ef4444;display:block;margin-bottom:16px;"></i>
                    <p style="font-size:16px;color:#1e293b;font-weight:500;">${this.escapeHtml(resource.title)}</p>
                    <p style="font-size:13px;color:#94a3b8;">PDF Document</p>
                    <button onclick="window.resourcesModule?.openResource(${resource.id})" 
                            style="margin-top:16px;padding:12px 32px;background:#4C1D95;color:white;border:none;border-radius:40px;cursor:pointer;font-weight:600;">
                        <i class="fas fa-eye"></i> Open PDF
                    </button>
                    <div style="margin-top:12px;font-size:12px;color:#94a3b8;">
                        <i class="fas fa-lock"></i> Read Only · No Download
                    </div>
                </div>
            `;
        } else if (fileType === 'image') {
            contentHtml = `
                <div style="text-align:center;">
                    <img src="${resource.file_url}" alt="${this.escapeHtml(resource.title)}" 
                         style="max-width:100%;max-height:70vh;border-radius:8px;border:1px solid #e5e7eb;">
                    <div style="margin-top:12px;font-size:12px;color:#94a3b8;">
                        <i class="fas fa-lock"></i> Read Only · No Download
                    </div>
                </div>
            `;
        } else if (fileType === 'video') {
            contentHtml = `
                <div style="text-align:center;">
                    <video controls controlslist="nodownload" style="width:100%;max-height:60vh;border-radius:8px;">
                        <source src="${resource.file_url}" type="video/mp4">
                        Your browser does not support video playback.
                    </video>
                    <div style="margin-top:12px;font-size:12px;color:#94a3b8;">
                        <i class="fas fa-lock"></i> Read Only · No Download
                    </div>
                </div>
            `;
        } else {
            contentHtml = `
                <div style="text-align:center;padding:30px 0;">
                    <i class="fas fa-file-alt" style="font-size:64px;color:#4C1D95;display:block;margin-bottom:16px;"></i>
                    <p style="font-size:16px;color:#1e293b;font-weight:500;">${this.escapeHtml(resource.title)}</p>
                    <p style="font-size:13px;color:#94a3b8;">File: ${resource.file_path || 'Unknown'}</p>
                    <button onclick="window.open('${resource.file_url}', '_blank')" 
                            style="margin-top:16px;padding:12px 32px;background:#4C1D95;color:white;border:none;border-radius:40px;cursor:pointer;font-weight:600;">
                        <i class="fas fa-external-link-alt"></i> Open File
                    </button>
                </div>
            `;
        }
        
        this.readerContent.innerHTML = contentHtml;
        this.mobileReader.style.display = 'block';
        document.body.style.overflow = 'hidden';
    }
    
    closeMobileReader() {
        if (this.mobileReader) {
            this.mobileReader.style.display = 'none';
            document.body.style.overflow = '';
        }
        this.stopAudio();
    }
    
    // ============================================================
    // 🎙️ DUAL-VOICE AUDIO ENGINE (NotebookLM Style)
    // ============================================================
    
    setupAudioEvents() {
        if (this.audioPlayBtn) {
            this.audioPlayBtn.addEventListener('click', () => this.resumeAudio());
        }
        if (this.audioPauseBtn) {
            this.audioPauseBtn.addEventListener('click', () => this.pauseAudio());
        }
        if (this.audioStopBtn) {
            this.audioStopBtn.addEventListener('click', () => this.stopAudio());
        }
        if (this.audioCloseBtn) {
            this.audioCloseBtn.addEventListener('click', () => this.closeAudioPlayer());
        }
        if (this.audioSpeed) {
            this.audioSpeed.addEventListener('change', () => {
                this.audioDialogueSpeed = parseFloat(this.audioSpeed.value);
                if (this.audioSynth) {
                    this.audioSynth.rate = this.audioDialogueSpeed;
                }
            });
            // Set default
            this.audioSpeed.value = '0.85';
        }
        if (this.audioProgressBar) {
            this.audioProgressBar.addEventListener('click', (e) => {
                // Seek not supported with speech synthesis
                this.showToast('Seeking is not supported in podcast mode', 'info');
            });
        }
    }
    
    // ============================================================
    // 🎙️ VOICE LOADING
    // ============================================================
    
    async initAudioWithVoices() {
        return new Promise((resolve) => {
            if (this.audioVoicesLoaded) {
                resolve(true);
                return;
            }
            
            let voices = window.speechSynthesis.getVoices();
            if (voices && voices.length > 0) {
                this.audioVoicesLoaded = true;
                resolve(true);
                return;
            }
            
            window.speechSynthesis.onvoiceschanged = () => {
                voices = window.speechSynthesis.getVoices();
                if (voices && voices.length > 0) {
                    this.audioVoicesLoaded = true;
                    resolve(true);
                }
            };
            
            setTimeout(() => {
                if (!this.audioVoicesLoaded) {
                    voices = window.speechSynthesis.getVoices();
                    if (voices && voices.length > 0) {
                        this.audioVoicesLoaded = true;
                    }
                    resolve(this.audioVoicesLoaded);
                }
            }, 3000);
        });
    }
    
    // ============================================================
    // 🎙️ GET MALE AND FEMALE VOICES
    // ============================================================
    
    getMaleVoice() {
        const voices = window.speechSynthesis.getVoices();
        
        const malePatterns = [
            'Google UK English Male',
            'Google US English Male',
            'Microsoft David',
            'Daniel',
            'en-US Male',
            'en-GB Male',
            'Google UK',
            'Google US'
        ];
        
        for (const pattern of malePatterns) {
            const found = voices.find(v => 
                v.name.includes(pattern) && v.lang.startsWith('en')
            );
            if (found) return found;
        }
        
        // Fallback: any English voice with lower pitch
        const fallback = voices.find(v => v.lang.startsWith('en'));
        return fallback;
    }
    
    getFemaleVoice() {
        const voices = window.speechSynthesis.getVoices();
        
        const femalePatterns = [
            'Google UK English Female',
            'Google US English Female',
            'Microsoft Zira',
            'Samantha',
            'Karen',
            'en-US Female',
            'en-GB Female'
        ];
        
        for (const pattern of femalePatterns) {
            const found = voices.find(v => 
                v.name.includes(pattern) && v.lang.startsWith('en')
            );
            if (found) return found;
        }
        
        // Fallback: any English voice with higher pitch
        const fallback = voices.find(v => v.lang.startsWith('en'));
        return fallback;
    }
    
    // ============================================================
    // 🎙️ GENERATE DIALOGUE SCRIPT
    // ============================================================
    
    generateDialogueScript(text, title = '') {
        const lines = [];
        
        // Clean and split text
        const cleanText = text.replace(/\s+/g, ' ').trim();
        const sentences = cleanText.match(/[^.!?]+[.!?]+/g) || [cleanText];
        
        // Generate podcast-style introduction
        if (title) {
            lines.push({
                speaker: 'host1',
                text: `Welcome to this deep dive. We're exploring "${title}".`,
                pauseAfter: 0.8
            });
            lines.push({
                speaker: 'host2',
                text: `This is a fascinating topic. Let's break it down together.`,
                pauseAfter: 0.6
            });
            lines.push({
                speaker: 'host1',
                text: `Let's start with the key concepts.`,
                pauseAfter: 0.5
            });
        }
        
        // Distribute sentences between speakers
        let speakerToggle = 'host1';
        let paragraphCount = 0;
        let currentParagraph = '';
        
        for (let i = 0; i < sentences.length; i++) {
            const sentence = sentences[i].trim();
            if (!sentence) continue;
            
            currentParagraph += sentence + ' ';
            paragraphCount++;
            
            if (paragraphCount >= 2 + Math.floor(Math.random() * 2)) {
                let cleanParagraph = currentParagraph.trim();
                
                // Add conversational filler
                if (i > 0 && i < sentences.length - 1 && Math.random() > 0.5) {
                    const fillers = [
                        'So, ', 'Now, ', 'You know, ',
                        'Here\'s the thing: ', 'Essentially, ',
                        'What\'s interesting is that ', 'The key point is that '
                    ];
                    cleanParagraph = fillers[Math.floor(Math.random() * fillers.length)] + 
                                    cleanParagraph.charAt(0).toLowerCase() + cleanParagraph.slice(1);
                }
                
                lines.push({
                    speaker: speakerToggle,
                    text: cleanParagraph,
                    pauseAfter: 0.3 + Math.random() * 0.4
                });
                
                speakerToggle = speakerToggle === 'host1' ? 'host2' : 'host1';
                currentParagraph = '';
                paragraphCount = 0;
            }
        }
        
        if (currentParagraph) {
            lines.push({
                speaker: speakerToggle,
                text: currentParagraph.trim(),
                pauseAfter: 0.5
            });
        }
        
        // Conclusion
        lines.push({
            speaker: 'host2',
            text: `That's the key takeaway from this topic.`,
            pauseAfter: 0.5
        });
        lines.push({
            speaker: 'host1',
            text: `Thanks for listening to this deep dive! Stay curious, and we'll see you next time.`,
            pauseAfter: 0.0
        });
        
        return lines;
    }
    
    // ============================================================
    // 🎙️ PLAY DUAL-VOICE DIALOGUE
    // ============================================================
    
    async playDualVoiceDialogue(lines) {
        if (!lines || lines.length === 0) {
            this.showToast('No dialogue to play', 'warning');
            return;
        }
        
        window.speechSynthesis.cancel();
        await this.initAudioWithVoices();
        
        this.maleVoice = this.getMaleVoice();
        this.femaleVoice = this.getFemaleVoice();
        
        if (!this.maleVoice || !this.femaleVoice) {
            this.showToast('Using best available voices', 'info');
        }
        
        this.dialogueLines = lines;
        this.currentDialogueIndex = 0;
        this.isPlaying = true;
        this.isAudioPaused = false;
        this.updateAudioUI('playing');
        this.startWaveformAnimation();
        this.updateDialogueProgress();
        
        if (this.audioStatus) {
            this.audioStatus.textContent = `🎙️ Podcast - 0/${lines.length}`;
        }
        
        this.playDialogueLine();
    }
    
    playDialogueLine() {
        if (this.currentDialogueIndex >= this.dialogueLines.length) {
            this.isPlaying = false;
            this.updateAudioUI('stopped');
            this.stopWaveformAnimation();
            this.resetAudioProgress();
            if (this.audioStatus) {
                this.audioStatus.textContent = '✅ Podcast complete!';
            }
            this.showToast('✅ Podcast complete!', 'success');
            return;
        }
        
        const line = this.dialogueLines[this.currentDialogueIndex];
        const isMale = line.speaker === 'host1';
        const voice = isMale ? this.maleVoice : this.femaleVoice;
        const speakerLabel = isMale ? '🎙️ Host 1' : '🎙️ Host 2';
        const total = this.dialogueLines.length;
        const current = this.currentDialogueIndex + 1;
        
        if (this.audioStatus) {
            this.audioStatus.textContent = `${speakerLabel} ${current}/${total}`;
        }
        if (this.audioSpeakerIndicator) {
            this.audioSpeakerIndicator.textContent = isMale ? '👨 Host speaking...' : '👩 Co-host speaking...';
            this.audioSpeakerIndicator.style.color = isMale ? '#4a90d9' : '#e84393';
        }
        
        this.updateDialogueProgress();
        
        const utterance = new SpeechSynthesisUtterance(line.text);
        if (voice) utterance.voice = voice;
        utterance.rate = this.audioDialogueSpeed;
        utterance.pitch = isMale ? 0.85 : 1.15;
        utterance.volume = 1;
        
        this.audioSynth = utterance;
        
        utterance.onstart = () => {
            this.isPlaying = true;
            this.updateAudioUI('playing');
        };
        
        utterance.onend = () => {
            this.currentDialogueIndex++;
            const pause = line.pauseAfter || 0.4;
            setTimeout(() => {
                if (!this.isAudioPaused) {
                    this.playDialogueLine();
                }
            }, pause * 1000);
        };
        
        utterance.onerror = (e) => {
            console.warn('Dialogue line error:', e);
            this.currentDialogueIndex++;
            setTimeout(() => {
                if (!this.isAudioPaused) {
                    this.playDialogueLine();
                }
            }, 500);
        };
        
        window.speechSynthesis.speak(utterance);
    }
    
    updateDialogueProgress() {
        if (this.dialogueLines.length === 0) return;
        const progress = (this.currentDialogueIndex / this.dialogueLines.length) * 100;
        if (this.audioProgressFill) {
            this.audioProgressFill.style.width = Math.min(progress, 100) + '%';
        }
    }
    
    // ============================================================
    // 🎙️ AUDIO CONTROLS
    // ============================================================
    
    resumeAudio() {
        if (this.isAudioPaused) {
            window.speechSynthesis.resume();
            this.isPlaying = true;
            this.isAudioPaused = false;
            this.updateAudioUI('playing');
            this.startWaveformAnimation();
            // Resume dialogue
            this.playDialogueLine();
        } else if (!this.isPlaying && this.dialogueLines.length > 0) {
            // Restart from beginning
            this.currentDialogueIndex = 0;
            this.playDialogueLine();
        }
    }
    
    pauseAudio() {
        if (this.isPlaying) {
            window.speechSynthesis.pause();
            this.isPlaying = false;
            this.isAudioPaused = true;
            this.updateAudioUI('paused');
            this.stopWaveformAnimation();
            if (this.audioSpeakerIndicator) {
                this.audioSpeakerIndicator.textContent = '⏸️ Paused';
            }
        }
    }
    
    stopAudio() {
        window.speechSynthesis.cancel();
        this.isPlaying = false;
        this.isAudioPaused = false;
        this.audioSynth = null;
        this.currentDialogueIndex = 0;
        this.dialogueLines = [];
        this.updateAudioUI('stopped');
        this.stopWaveformAnimation();
        this.resetAudioProgress();
        if (this.audioSpeakerIndicator) {
            this.audioSpeakerIndicator.textContent = '🎧 Ready';
            this.audioSpeakerIndicator.style.color = '#94a3b8';
        }
        if (this.audioContainer) {
            this.audioContainer.classList.remove('audio-playing', 'audio-paused');
        }
    }
    
    resetAudioProgress() {
        if (this.audioProgressInterval) {
            clearInterval(this.audioProgressInterval);
            this.audioProgressInterval = null;
        }
        if (this.audioProgressFill) {
            this.audioProgressFill.style.width = '0%';
        }
        if (this.audioCurrentTime) {
            this.audioCurrentTime.textContent = '0:00';
        }
        if (this.audioStatus) {
            this.audioStatus.textContent = '🎧 Ready';
        }
    }
    
    updateAudioUI(state) {
        if (!this.audioPlayBtn || !this.audioPauseBtn) return;
        
        if (state === 'playing') {
            this.audioPlayBtn.style.display = 'none';
            this.audioPauseBtn.style.display = 'flex';
            if (this.audioContainer) {
                this.audioContainer.classList.add('audio-playing');
                this.audioContainer.classList.remove('audio-paused');
            }
        } else if (state === 'paused') {
            this.audioPlayBtn.style.display = 'flex';
            this.audioPauseBtn.style.display = 'none';
            if (this.audioStatus) this.audioStatus.textContent = '⏸️ Paused';
            if (this.audioContainer) {
                this.audioContainer.classList.add('audio-paused');
                this.audioContainer.classList.remove('audio-playing');
            }
        } else {
            this.audioPlayBtn.style.display = 'flex';
            this.audioPauseBtn.style.display = 'none';
            if (this.audioContainer) {
                this.audioContainer.classList.remove('audio-playing', 'audio-paused');
            }
        }
    }
    
    closeAudioPlayer() {
        this.stopAudio();
        if (this.audioContainer) {
            this.audioContainer.style.display = 'none';
        }
    }
    
    showAudioPlayer(text, title) {
        if (!text || !this.audioContainer) return;
        
        this.currentAudioText = text;
        if (this.audioTitle) {
            this.audioTitle.textContent = `🎙️ ${title || 'Podcast'}`;
        }
        if (this.audioStatus) this.audioStatus.textContent = '🎙️ Generating podcast...';
        
        const wordCount = text.split(/\s+/).length;
        if (this.audioWordCount) {
            this.audioWordCount.textContent = wordCount + ' words';
        }
        
        this.audioContainer.style.display = 'block';
        this.audioContainer.classList.remove('audio-hidden');
        this.audioContainer.classList.add('audio-podcast-mode');
        
        if (this.audioCurrentTime) this.audioCurrentTime.textContent = '0:00';
        if (this.audioProgressFill) this.audioProgressFill.style.width = '0%';
        if (this.audioDuration) {
            const estimatedDuration = wordCount * 0.2;
            const minutes = Math.floor(estimatedDuration / 60);
            const seconds = Math.floor(estimatedDuration % 60);
            this.audioDuration.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        }
    }
    
    // ============================================================
    // 🎙️ WAVEFORM VISUALIZATION
    // ============================================================
    
    initWaveformCanvas() {
        if (!this.audioWave) return;
        
        // Clear existing content
        this.audioWave.innerHTML = '';
        
        this.audioWaveCanvas = document.createElement('canvas');
        this.audioWaveCanvas.style.width = '100%';
        this.audioWaveCanvas.style.height = '100%';
        this.audioWaveCanvas.style.display = 'block';
        this.audioWaveCanvas.style.borderRadius = '4px';
        this.audioWave.appendChild(this.audioWaveCanvas);
        
        this.resizeWaveCanvas();
    }
    
    resizeWaveCanvas() {
        if (!this.audioWaveCanvas) return;
        
        const rect = this.audioWave.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        this.audioWaveCanvas.width = (rect.width || 300) * dpr;
        this.audioWaveCanvas.height = (rect.height || 40) * dpr;
        this.audioWaveCanvas.style.width = (rect.width || 300) + 'px';
        this.audioWaveCanvas.style.height = (rect.height || 40) + 'px';
        this.audioWaveCtx = this.audioWaveCanvas.getContext('2d');
        this.audioWaveCtx.scale(dpr, dpr);
    }
    
    startWaveformAnimation() {
        if (this.waveAnimationId) return;
        this.resizeWaveCanvas();
        this.animateWaveform();
    }
    
    animateWaveform() {
        const canvas = this.audioWaveCanvas;
        const ctx = this.audioWaveCtx;
        if (!canvas || !ctx) return;
        
        const width = canvas.width / (window.devicePixelRatio || 1);
        const height = canvas.height / (window.devicePixelRatio || 1);
        
        ctx.clearRect(0, 0, width, height);
        
        const barCount = Math.floor(width / 5);
        const barWidth = Math.max(2, width / barCount - 1);
        const time = Date.now() / 400;
        
        for (let i = 0; i < barCount; i++) {
            const seed = (i / barCount) * Math.PI * 6;
            const heightFactor = 0.2 + 0.8 * Math.abs(Math.sin(seed + time + Math.sin(i * 0.3 + time * 0.7)));
            const barHeight = height * 0.1 + height * 0.7 * heightFactor;
            
            const x = i * (barWidth + 1);
            const y = (height - barHeight) / 2;
            
            const hue = 220 + 30 * heightFactor;
            const lightness = 50 + 30 * heightFactor;
            ctx.fillStyle = `hsl(${hue}, 80%, ${lightness}%)`;
            ctx.fillRect(x, y, barWidth, barHeight);
        }
        
        this.waveAnimationId = requestAnimationFrame(() => this.animateWaveform());
    }
    
    stopWaveformAnimation() {
        if (this.waveAnimationId) {
            cancelAnimationFrame(this.waveAnimationId);
            this.waveAnimationId = null;
        }
        
        if (this.audioWaveCanvas && this.audioWaveCtx) {
            const width = this.audioWaveCanvas.width / (window.devicePixelRatio || 1);
            const height = this.audioWaveCanvas.height / (window.devicePixelRatio || 1);
            this.audioWaveCtx.clearRect(0, 0, width, height);
        }
    }
    
    // ============================================================
    // 🎙️ READ ALOUD WITH DUAL VOICES (Main Method)
    // ============================================================
    
    async readAloud(resourceId) {
        const resource = this.allResources.find(r => r.id == resourceId);
        if (!resource) {
            this.showToast('Resource not found', 'error');
            return;
        }
        
        this.showToast('🎙️ Generating podcast-style audio...', 'info');
        
        try {
            let fullText = '';
            const fileType = this.getFileType(resource.file_path);
            
            fullText = `Document: ${resource.title}. `;
            
            if (resource.resource_type === 'pastpaper') {
                fullText += `Past paper. `;
                if (resource.exam_type) {
                    fullText += `Exam type: ${this.getExamTypeLabel(resource.exam_type)}. `;
                }
                if (resource.course_name) {
                    fullText += `Course: ${resource.course_name}. `;
                }
            }
            
            if (resource.description && resource.description.length > 10) {
                fullText += resource.description + ' ';
            }
            
            if (resource.file_url || resource.file_path) {
                const url = resource.file_url || this.getResourceUrl(resource.file_path);
                
                if (fileType === 'pdf') {
                    try {
                        const extractedText = await this.extractFullPDFText(url);
                        if (extractedText && extractedText.length > 50) {
                            fullText += extractedText;
                            this.showToast('✅ PDF content extracted', 'success');
                        }
                    } catch (e) {
                        console.warn('Could not extract PDF text:', e);
                    }
                } else if (fileType === 'text' || fileType === 'file') {
                    try {
                        const extractedText = await this.extractTextFileContent(url);
                        if (extractedText && extractedText.length > 50) {
                            fullText += extractedText;
                            this.showToast('✅ Text content extracted', 'success');
                        }
                    } catch (e) {
                        console.warn('Could not extract text:', e);
                    }
                } else {
                    if (fileType === 'image' || fileType === 'video') {
                        fullText += `This is a ${fileType} file containing visual content. `;
                    }
                }
            }
            
            if (!fullText || fullText.length < 50) {
                fullText = this.generateResourceDescription(resource);
            }
            
            fullText = fullText.replace(/\s+/g, ' ').trim();
            
            // Generate dialogue script
            const dialogueScript = this.generateDialogueScript(fullText, resource.title);
            
            // Show audio player
            this.showAudioPlayer(fullText, resource.title);
            
            // Play with dual voices
            await this.playDualVoiceDialogue(dialogueScript);
            
        } catch (error) {
            console.error('Dual-voice error:', error);
            this.showToast('Failed to generate podcast: ' + error.message, 'error');
            
            // Fallback to regular TTS
            let fallbackText = `Document: ${resource.title}. `;
            if (resource.description) {
                fallbackText += resource.description;
            }
            this.showAudioPlayer(fallbackText, resource.title);
            this.playFallbackAudio();
        }
    }
    
    playFallbackAudio() {
        if (!this.currentAudioText) {
            this.showToast('No text to read', 'warning');
            return;
        }
        
        window.speechSynthesis.cancel();
        
        const utterance = new SpeechSynthesisUtterance(this.currentAudioText);
        utterance.rate = parseFloat(this.audioSpeed?.value || 1);
        utterance.pitch = 1;
        utterance.volume = 1;
        
        const voices = window.speechSynthesis.getVoices();
        const preferredVoice = voices.find(v => v.lang.startsWith('en'));
        if (preferredVoice) utterance.voice = preferredVoice;
        
        utterance.onstart = () => {
            this.isPlaying = true;
            this.updateAudioUI('playing');
            this.startWaveformAnimation();
        };
        
        utterance.onend = () => {
            this.isPlaying = false;
            this.updateAudioUI('stopped');
            this.stopWaveformAnimation();
            this.resetAudioProgress();
        };
        
        utterance.onerror = (e) => {
            console.error('Speech error:', e);
            this.isPlaying = false;
            this.updateAudioUI('stopped');
            this.stopWaveformAnimation();
        };
        
        this.audioSynth = utterance;
        window.speechSynthesis.speak(utterance);
    }
    
    // ============================================================
    // 📄 EXTRACT FULL PDF TEXT
    // ============================================================
    
    async extractFullPDFText(pdfUrl) {
        try {
            await this.initializePDFJS();
            if (!this.pdfjsLib) return '';
            
            const loadingTask = this.pdfjsLib.getDocument({
                url: pdfUrl,
                cMapUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/',
                cMapPacked: true,
                verbosity: 0
            });
            
            const pdf = await loadingTask.promise;
            let fullText = '';
            const totalPages = pdf.numPages;
            const maxPages = Math.min(totalPages, 20);
            
            for (let i = 1; i <= maxPages; i++) {
                try {
                    const page = await pdf.getPage(i);
                    const textContent = await page.getTextContent();
                    const pageText = textContent.items.map(item => item.str).join(' ').trim();
                    if (pageText) {
                        fullText += pageText + '\n\n';
                    }
                } catch (pageError) {
                    console.warn(`Could not extract page ${i}:`, pageError);
                }
            }
            
            pdf.destroy();
            return fullText.trim();
            
        } catch (error) {
            console.error('PDF extraction error:', error);
            throw error;
        }
    }
    
    async extractTextFileContent(url) {
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error('Failed to fetch file');
            const text = await response.text();
            return text.trim();
        } catch (error) {
            console.error('Text extraction error:', error);
            return '';
        }
    }
    
    // ============================================================
    // 📝 GENERATE RESOURCE DESCRIPTION
    // ============================================================
    
    generateResourceDescription(resource) {
        let text = `Resource: ${resource.title}. `;
        
        if (resource.course_name) {
            text += `Course: ${resource.course_name}. `;
        }
        
        if (resource.resource_type === 'pastpaper') {
            text += `This is a past paper. `;
            if (resource.exam_type) {
                text += `Exam type: ${this.getExamTypeLabel(resource.exam_type)}. `;
            }
            if (resource.year) {
                text += `Year: ${resource.year}. `;
            }
        } else {
            text += `This is a learning resource. `;
        }
        
        if (resource.block || resource.term) {
            const blockOrTerm = resource.block || resource.term;
            const isTVET = this.TVET_PROGRAMS.includes(resource.program_type || '');
            const label = isTVET ? 'Term' : 'Block';
            text += `${label}: ${blockOrTerm}. `;
        }
        
        if (resource.description) {
            text += resource.description;
        } else {
            text += `This resource is available for students to study and review.`;
        }
        
        return text;
    }
    
    // ============================================================
    // 🔗 GET RESOURCE URL
    // ============================================================
    
    getResourceUrl(filePath) {
        if (!filePath) return '';
        if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
            return filePath;
        }
        const supabaseUrl = window.APP_CONFIG?.SUPABASE_URL || 'https://lwhtjozfsmbyihenfunw.supabase.co';
        return `${supabaseUrl}/storage/v1/object/public/resources/${filePath}`;
    }
    
    // ============================================================
    // 📄 OPEN RESOURCE - NO AUTO-PLAY
    // ============================================================
    
    async openResource(resourceId) {
        const resource = this.allResources.find(r => r.id == resourceId);
        if (!resource) {
            this.showToast('Resource not found', 'error');
            return;
        }
        
        this.currentResource = resource;
        const fileType = this.getFileType(resource.file_path);
        
        if (window.innerWidth < 768) {
            this.openMobileReader(resource);
            return;
        }
        
        if (fileType === 'pdf') {
            await this.openPDFInModal(resource);
        } else if (fileType === 'image') {
            this.openImageInModal(resource);
        } else if (fileType === 'video') {
            this.openVideoInModal(resource);
        } else {
            window.open(resource.file_url, '_blank');
        }
    }
    
    viewPastPaper(resourceId) {
        this.openResource(resourceId);
    }
    
    // ============================================================
    // 🤖 AI SUMMARY MODAL
    // ============================================================
    
    setupSummaryEvents() {
        if (this.closeSummaryBtn) {
            this.closeSummaryBtn.addEventListener('click', () => {
                this.closeSummaryModal();
            });
        }
        
        if (this.summaryModal) {
            this.summaryModal.addEventListener('click', (e) => {
                if (e.target === this.summaryModal) {
                    this.closeSummaryModal();
                }
            });
        }
    }
    
   // ============================================================
// 🤖 AI SUMMARY - FIXED to accept resource ID
// ============================================================

async generateSummary(resourceId) {
    // Find resource by ID
    const resource = this.allResources.find(r => r.id == resourceId);
    if (!resource) {
        this.showToast('Resource not found', 'error');
        return;
    }
    
    if (!this.summaryModal) return;
    
    this.currentResource = resource;
    this.summaryModal.style.display = 'flex';
    
    if (this.summaryTitle) {
        this.summaryTitle.textContent = resource.title || 'Resource';
    }
    
    if (this.summaryLoading) this.summaryLoading.style.display = 'flex';
    if (this.summaryContent) this.summaryContent.style.display = 'none';
    if (this.summaryActions) this.summaryActions.style.display = 'none';
    
    try {
        let content = '';
        
        if (resource.description) {
            content = resource.description;
        }
        
        if (resource.file_path && resource.file_url) {
            const fileType = this.getFileType(resource.file_path);
            if (fileType === 'pdf') {
                try {
                    content = await this.extractPDFText(resource.file_url);
                } catch (e) {
                    console.warn('Could not extract PDF text:', e);
                }
            }
        }
        
        if (!content || content.length < 50) {
            content = `Resource: ${resource.title || 'Untitled'}\n`;
            content += `Course: ${resource.course_name || 'General'}\n`;
            content += `Type: ${resource.resource_type || 'Material'}\n`;
            content += `Block/Term: ${resource.block || resource.term || 'General'}\n`;
            if (resource.description) {
                content += `\nDescription: ${resource.description}`;
            }
        }
        
        const summary = this.generateSimpleSummary(content);
        
        if (this.summaryLoading) this.summaryLoading.style.display = 'none';
        if (this.summaryContent) {
            this.summaryContent.style.display = 'block';
            this.summaryContent.innerHTML = summary;
        }
        if (this.summaryActions) this.summaryActions.style.display = 'flex';
        
    } catch (error) {
        console.error('Summary error:', error);
        if (this.summaryLoading) this.summaryLoading.style.display = 'none';
        if (this.summaryContent) {
            this.summaryContent.style.display = 'block';
            this.summaryContent.innerHTML = `
                <div style="color:#ef4444;text-align:center;padding:20px;">
                    <i class="fas fa-exclamation-triangle" style="font-size:32px;display:block;margin-bottom:12px;"></i>
                    <p>Unable to generate summary: ${error.message}</p>
                </div>
            `;
        }
    }
}
    
    generateSimpleSummary(text) {
        if (!text || text.length < 10) {
            return '<p>No content available to summarize.</p>';
        }
        
        let cleanText = text.replace(/\s+/g, ' ').trim();
        
        if (cleanText.length < 200) {
            return `<p>${this.escapeHtml(cleanText)}</p>`;
        }
        
        const sentences = cleanText.match(/[^.!?]+[.!?]+/g) || [cleanText];
        const summarySentences = sentences.slice(0, 5);
        let summary = summarySentences.join(' ');
        
        if (summary.length > 500) {
            summary = summary.substring(0, 500) + '...';
        }
        
        let html = `<p>${this.escapeHtml(summary)}</p>`;
        
        if (text.includes('•') || text.includes('-') || text.includes('*')) {
            const bulletItems = text.split(/[•\-*]\s*/).slice(1, 6);
            if (bulletItems.length > 0) {
                html += '<h4 style="color:#FDB913;margin-top:16px;">Key Points:</h4><ul style="list-style:disc;padding-left:20px;color:#e2e8f0;">';
                bulletItems.forEach(item => {
                    if (item.trim()) {
                        html += `<li>${this.escapeHtml(item.trim().substring(0, 100))}</li>`;
                    }
                });
                html += '</ul>';
            }
        }
        
        const wordCount = cleanText.split(/\s+/).length;
        html += `<p style="color:#64748b;font-size:12px;margin-top:12px;">📄 ${wordCount} words in original document</p>`;
        
        return html;
    }
    
    async extractPDFText(pdfUrl) {
        try {
            await this.initializePDFJS();
            if (!this.pdfjsLib) return '';
            
            const loadingTask = this.pdfjsLib.getDocument({
                url: pdfUrl,
                cMapUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/',
                cMapPacked: true,
                verbosity: 0
            });
            
            const pdf = await loadingTask.promise;
            let fullText = '';
            const maxPages = Math.min(pdf.numPages, 5);
            
            for (let i = 1; i <= maxPages; i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                const pageText = textContent.items.map(item => item.str).join(' ');
                fullText += pageText + '\n';
            }
            
            pdf.destroy();
            return fullText.trim();
            
        } catch (error) {
            console.warn('PDF text extraction error:', error);
            return '';
        }
    }
    
    closeSummaryModal() {
        if (this.summaryModal) {
            this.summaryModal.style.display = 'none';
        }
        if (this.summaryContent) {
            this.summaryContent.innerHTML = '';
        }
        this.currentResource = null;
        this.stopAudio();
    }
    
    playSummaryAudio() {
        if (!this.summaryContent) return;
        const text = this.summaryContent.textContent || '';
        if (text) {
            this.showAudioPlayer(text, 'AI Summary');
            this.readAloud(this.currentResource?.id);
        }
    }
    
    copySummary() {
        if (!this.summaryContent) return;
        const text = this.summaryContent.textContent || '';
        if (text) {
            navigator.clipboard.writeText(text).then(() => {
                this.showToast('Summary copied to clipboard!', 'success');
            }).catch(() => {
                const textarea = document.createElement('textarea');
                textarea.value = text;
                document.body.appendChild(textarea);
                textarea.select();
                document.execCommand('copy');
                document.body.removeChild(textarea);
                this.showToast('Summary copied to clipboard!', 'success');
            });
        }
    }
    
    // ============================================================
    // PROGRAM DETECTION
    // ============================================================
    detectUserProgram() {
        console.log('🔍 Detecting user program...');
        
        let profile = null;
        if (window.currentUserProfile) profile = window.currentUserProfile;
        else if (window.db?.currentUserProfile) profile = window.db.currentUserProfile;
        else if (window.userProfile) profile = window.userProfile;
        else if (window.profileModule?.userProfile) profile = window.profileModule.userProfile;
        
        if (!profile) {
            try {
                const savedProfile = localStorage.getItem('userProfile');
                if (savedProfile) profile = JSON.parse(savedProfile);
            } catch (e) {}
        }
        
        if (profile) {
            this.userProfile = profile;
            this.userId = profile.user_id || profile.id || null;
            const programCode = String(profile.program || profile.course || '').toUpperCase().trim();
            
            if (this.TVET_PROGRAMS.includes(programCode)) {
                this.userProgram = 'tvet';
                this.isTVETStudent = true;
                this.userProgramDisplay = window.PROGRAM_DISPLAY_NAMES?.[programCode] || programCode || 'TVET Program';
                this.userProgramCode = programCode;
                this.userBlock = profile.block || 'Term1';
                this.userTerm = null;
                console.log(`✅ TVET Student: ${programCode}`);
            } else {
                this.userProgram = 'krchn';
                this.isTVETStudent = false;
                this.userProgramDisplay = 'KRCHN Nursing';
                this.userProgramCode = 'KRCHN';
                this.userBlock = profile.block || 'Introductory';
                this.userTerm = null;
                console.log(`✅ KRCHN Student: ${programCode}, Block: ${this.userBlock}`);
            }
            
            this.userIntakeYear = profile.intake_year || profile.intake || 2025;
            
            this.updateUIForProgram();
            this.updateBlockFilterOptions();
            this.updateBlockDisplay();
            return this.userProgram;
        }
        
        this.userProgram = 'krchn';
        this.isTVETStudent = false;
        this.userProgramDisplay = 'KRCHN Nursing';
        this.userProgramCode = 'KRCHN';
        this.userBlock = 'Introductory';
        this.userTerm = null;
        this.userIntakeYear = 2025;
        
        this.updateUIForProgram();
        this.updateBlockFilterOptions();
        this.updateBlockDisplay();
        return 'krchn';
    }
    
    async getUserProfile() {
        if (this.userProfile) return this.userProfile;
        if (window.currentUserProfile) return window.currentUserProfile;
        
        const supabase = this.getSupabaseClient();
        if (!supabase) return {};
        
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return {};
            this.userId = user.id;
            
            const { data: profile, error } = await supabase
                .from('consolidated_user_profiles_table')
                .select('program, intake_year, block, full_name, role, student_id, term, program_type')
                .eq('user_id', user.id)
                .maybeSingle();
            
            if (profile) {
                this.userProfile = profile;
                window.currentUserProfile = profile;
                if (window.db) window.db.currentUserProfile = profile;
                this.detectUserProgram();
                return profile;
            }
            return {};
        } catch (err) {
            console.error('Error loading profile:', err);
            return {};
        }
    }
    
    getSupabaseClient() {
        if (this.supabaseClient) return this.supabaseClient;
        
        if (window.NCHSMLogin && window.NCHSMLogin.supabase) {
            this.supabaseClient = window.NCHSMLogin.supabase;
            return this.supabaseClient;
        }
        if (window.db && window.db.supabase && typeof window.db.supabase.from === 'function') {
            this.supabaseClient = window.db.supabase;
            return this.supabaseClient;
        }
        if (window.supabase && typeof window.supabase.from === 'function') {
            this.supabaseClient = window.supabase;
            if (!window.db) window.db = {};
            window.db.supabase = this.supabaseClient;
            return this.supabaseClient;
        }
        return null;
    }
    
    // ============================================================
    // UI UPDATES
    // ============================================================
    updateUIForProgram() {
        const isTVET = this.isTVETStudent || this.userProgram === 'tvet';
        
        if (this.programDisplayBadge) {
            if (isTVET) {
                this.programDisplayBadge.style.background = '#1a7a5a';
                this.programDisplayBadge.innerHTML = `<i class="fas fa-tools"></i> <span id="program-name-display">${this.userProgramDisplay || 'TVET Program'}</span>`;
            } else {
                this.programDisplayBadge.style.background = '#4C1D95';
                this.programDisplayBadge.innerHTML = `<i class="fas fa-graduation-cap"></i> <span id="program-name-display">${this.userProgramDisplay || 'KRCHN Nursing'}</span>`;
            }
        }
        
        if (this.programNameDisplay) {
            this.programNameDisplay.textContent = this.userProgramDisplay || (isTVET ? 'TVET Program' : 'KRCHN Nursing');
        }
        
        if (this.blockTermDisplay && this.blockTermValue) {
            if (isTVET) {
                const termNumber = this.userTerm || 1;
                this.blockTermDisplay.style.background = '#fef3c7';
                this.blockTermDisplay.style.color = '#78350f';
                this.blockTermDisplay.innerHTML = `<i class="fas fa-calendar-alt"></i> <span id="block-term-value">Term ${termNumber}</span>`;
                this.blockTermValue.textContent = `Term ${termNumber}`;
            } else {
                const blockName = this.userBlock || 'Introductory';
                this.blockTermDisplay.style.background = '#dbeafe';
                this.blockTermDisplay.style.color = '#1e40af';
                this.blockTermDisplay.innerHTML = `<i class="fas fa-layer-group"></i> <span id="block-term-value">${blockName}</span>`;
                this.blockTermValue.textContent = blockName;
            }
        }
        
        if (this.filterTitle) {
            this.filterTitle.textContent = isTVET ? 'Filter by Term' : 'Filter by Block';
        }
        if (this.filterSubtitle) {
            this.filterSubtitle.textContent = isTVET ? 'Select academic term to view materials' : 'Select academic block to view materials';
        }
        if (this.filterInfoText) {
            this.filterInfoText.textContent = isTVET ? 'Select a term and click Refresh to load materials' : 'Select a block and click Refresh to load materials';
        }
        if (this.intakeYearValue) {
            this.intakeYearValue.textContent = this.userIntakeYear || 2026;
        }
    }
    
    updateBlockDisplay() {
        if (!this.studentCurrentBlock) return;
        const isTVET = this.isTVETStudent || this.userProgram === 'tvet';
        
        if (isTVET) {
            this.studentCurrentBlock.textContent = `Term ${this.userTerm || 1}`;
        } else {
            this.studentCurrentBlock.textContent = this.userBlock || 'Introductory';
        }
    }
    
    updateBlockFilterOptions() {
        if (!this.blockFilter) return;
        const isTVET = this.isTVETStudent || this.userProgram === 'tvet';
        
        this.blockFilter.innerHTML = '';
        const allOption = document.createElement('option');
        allOption.value = 'all';
        allOption.textContent = isTVET ? '📚 All Terms' : '📚 All Blocks';
        this.blockFilter.appendChild(allOption);
        
        if (isTVET) {
            const terms = [
                { value: 'term1', label: '📘 Term 1' },
                { value: 'term2', label: '📗 Term 2' },
                { value: 'term3', label: '📕 Term 3' },
                { value: 'term4', label: '📙 Term 4' },
                { value: 'term5', label: '📒 Term 5' },
                { value: 'term6', label: '📓 Term 6' },
                { value: 'final', label: '🏆 Final Term' }
            ];
            terms.forEach(term => {
                const option = document.createElement('option');
                option.value = term.value;
                option.textContent = term.label;
                this.blockFilter.appendChild(option);
            });
            
            if (this.userTerm) {
                const termKey = this.getTermKeyFromNumber(this.userTerm);
                if (termKey) {
                    this.blockFilter.value = termKey;
                    this.currentBlockFilter = termKey;
                }
            }
        } else {
            const blocks = [
                { value: 'introductory', label: '🚀 Introductory' },
                { value: 'block1', label: '📖 Block 1' },
                { value: 'block2', label: '📗 Block 2' },
                { value: 'block3', label: '📘 Block 3' },
                { value: 'block4', label: '📙 Block 4' },
                { value: 'block5', label: '📕 Block 5' },
                { value: 'final', label: '🏆 Final Block' }
            ];
            blocks.forEach(block => {
                const option = document.createElement('option');
                option.value = block.value;
                option.textContent = block.label;
                this.blockFilter.appendChild(option);
            });
            
            if (this.userBlock) {
                const userBlockLower = this.userBlock.toLowerCase();
                for (const [key, keywords] of Object.entries(this.BLOCK_MAPPING)) {
                    if (keywords.some(k => userBlockLower.includes(k.toLowerCase()))) {
                        this.blockFilter.value = key;
                        this.currentBlockFilter = key;
                        break;
                    }
                }
            }
        }
        this.currentBlockFilter = this.blockFilter.value || 'all';
    }
    
    getTermKeyFromNumber(termNumber) {
        const map = { 1: 'term1', 2: 'term2', 3: 'term3', 4: 'term4', 5: 'term5', 6: 'term6', 7: 'final' };
        return map[termNumber] || null;
    }
    
    getTermNumberFromKey(termKey) {
        return this.TERM_NUMBER_MAP[termKey] || null;
    }
    
    updateFilterStates() {
        this.currentBlockFilter = this.blockFilter?.value || 'all';
        this.currentFileType = this.typeFilter?.value || 'all';
        this.currentCourse = this.courseFilter?.value || 'all';
        this.currentYear = this.yearFilter?.value || 'all';
    }
    
    // ============================================================
    // RESOURCE LOADING
    // ============================================================
    async loadResources() {
        if (this.isLoading) return;
        this.detectUserProgram();
        if (!this.userProfile) await this.getUserProfile();
        
        const supabase = this.getSupabaseClient();
        if (!supabase) {
            this.showError('Database connection error');
            return;
        }
        if (!this.resourcesGrid) return;
        
        this.isLoading = true;
        this.showSkeletonCards(6);
        
        try {
            const isTVET = this.isTVETStudent || this.userProgram === 'tvet';
            const intakeYear = this.userIntakeYear || 2025;
            
            let query = supabase
                .from('resources')
                .select('*')
                .eq('intake', String(intakeYear))
                .order('created_at', { ascending: false });
            
            if (isTVET) {
                const studentProgram = this.userProfile?.program || '';
                if (studentProgram && this.TVET_PROGRAMS.includes(studentProgram)) {
                    query = query.eq('program_type', studentProgram);
                } else {
                    query = query.in('program_type', this.TVET_PROGRAMS);
                }
            } else {
                query = query.eq('program_type', 'KRCHN');
                if (this.userBlock && this.userBlock !== 'General') {
                    const blockPattern = this.userBlock.toLowerCase();
                    query = query.or(`block.ilike.%${blockPattern}%, block_term.ilike.%${blockPattern}%`);
                }
            }
            
            const { data: resources, error } = await query;
            if (error) throw error;
            
            this.allResources = resources || [];
            console.log(`✅ Loaded ${this.allResources.length} resources`);
            
            this.updatePastPaperCount();
            this.populateFilters();
            this.applyFilters();
            this.updateDashboardResourceCount();
            
        } catch (err) {
            console.error('Error loading resources:', err);
            this.showError(err.message);
        } finally {
            this.isLoading = false;
        }
    }
    
    // ============================================================
    // FILTERS & RENDERING
    // ============================================================
    applyFilters() {
        if (!this.allResources.length) {
            this.showEmptyState();
            return;
        }
        
        let filtered = [...this.allResources];
        const isTVET = this.isTVETStudent || this.userProgram === 'tvet';
        
        if (this.currentResourceType !== 'all') {
            filtered = filtered.filter(r => r.resource_type === this.currentResourceType);
        }
        
        if (this.currentBlockFilter !== 'all') {
            const mapping = isTVET ? this.TERM_MAPPING : this.BLOCK_MAPPING;
            const targetKeywords = mapping[this.currentBlockFilter] || [];
            const termNumber = isTVET ? this.getTermNumberFromKey(this.currentBlockFilter) : null;
            
            filtered = filtered.filter(resource => {
                if (isTVET && termNumber !== null) {
                    if (resource.term === termNumber) return true;
                    const resourceTerm = (resource.term_text || resource.term_name || resource.block_term || '').toString().toLowerCase();
                    return targetKeywords.some(keyword => resourceTerm.includes(keyword.toLowerCase()));
                }
                const resourceBlock = (resource.block || resource.block_term || '').toString().toLowerCase();
                return targetKeywords.some(keyword => resourceBlock.includes(keyword.toLowerCase()));
            });
        }
        
        const searchTerm = this.currentSearchTerm.toLowerCase();
        if (searchTerm) {
            filtered = filtered.filter(r => {
                const title = (r.title || '').toLowerCase();
                const course = (r.course_name || '').toLowerCase();
                const desc = (r.description || '').toLowerCase();
                const block = (r.block || r.term || '').toString().toLowerCase();
                return title.includes(searchTerm) || course.includes(searchTerm) || 
                       desc.includes(searchTerm) || block.includes(searchTerm);
            });
        }
        
        if (this.currentFileType !== 'all') {
            filtered = filtered.filter(r => this.getFileType(r.file_path) === this.currentFileType);
        }
        
        if (this.currentCourse !== 'all') {
            filtered = filtered.filter(r => (r.course_name || r.program_type) === this.currentCourse);
        }
        
        if (this.currentYear !== 'all') {
            if (this.currentResourceType === 'pastpaper') {
                filtered = filtered.filter(r => r.pastpaper_year == this.currentYear);
            } else {
                filtered = filtered.filter(r => r.intake == this.currentYear);
            }
        }
        
        this.filteredResources = filtered;
        this.renderResources();
        this.updateResourceCount();
    }
    
    // ============================================================
    // 📄 RENDER RESOURCES - WITH VISIBLE BUTTONS
    // ============================================================
    
  // ============================================================
// 📄 RENDER RESOURCES - FIXED VERSION
// ============================================================

renderResources() {
    if (!this.resourcesGrid) return;
    if (this.filteredResources.length === 0) {
        this.showEmptyState();
        return;
    }
    
    let html = '';
    for (const resource of this.filteredResources) {
        const isPastPaper = resource.resource_type === 'pastpaper';
        const fileIcon = this.getFileIcon(resource.file_path);
        const fileType = this.getFileType(resource.file_path);
        const iconColor = isPastPaper ? '#d97706' : '#4C1D95';
        const bgColor = isPastPaper ? '#fef3c7' : '#dbeafe';
        
        html += `
            <div class="resource-card" style="
                display: flex !important;
                flex-direction: column !important;
                visibility: visible !important;
                opacity: 1 !important;
                min-height: 280px !important;
                background: white !important;
                border-radius: 12px !important;
                border: 1px solid #e5e7eb !important;
                overflow: hidden !important;
                margin: 0 !important;
                box-shadow: 0 1px 3px rgba(0,0,0,0.04) !important;
                transition: all 0.3s ease !important;
            ">
                <div style="
                    padding: 16px 20px;
                    background: #f8fafc;
                    border-bottom: 1px solid #e5e7eb;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    flex-wrap: wrap;
                    gap: 8px;
                ">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <div style="
                            width: 40px;
                            height: 40px;
                            border-radius: 8px;
                            background: ${bgColor};
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            flex-shrink: 0;
                        ">
                            <i class="${fileIcon}" style="font-size: 20px; color: ${iconColor};"></i>
                        </div>
                        <div>
                            <div style="font-weight: 600; color: #0A3D62; font-size: 14px;">${this.escapeHtml(resource.title)}</div>
                            <div style="font-size: 11px; color: #94a3b8; display: flex; gap: 8px; flex-wrap: wrap;">
                                <span>${this.escapeHtml(resource.intake || 'N/A')}</span>
                                <span>•</span>
                                <span>${isPastPaper ? '📄 Past Paper' : '📚 Material'}</span>
                                ${resource.course_name ? `<span>• ${this.escapeHtml(resource.course_name)}</span>` : ''}
                            </div>
                        </div>
                    </div>
                    <span style="font-size: 11px; color: #94a3b8; background: #f1f5f9; padding: 2px 12px; border-radius: 12px;">
                        <i class="fas fa-lock"></i> Read Only
                    </span>
                </div>
                
                <div style="padding: 12px 20px; flex: 1;">
                    <p style="color: #64748b; font-size: 13px; margin: 0; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
                        ${this.escapeHtml(resource.description || 'No description available')}
                    </p>
                </div>
                
                <div class="resource-actions" style="
                    display: flex !important;
                    gap: 8px !important;
                    flex-wrap: wrap !important;
                    padding: 12px 16px 16px !important;
                    border-top: 1px solid #f1f5f9 !important;
                    visibility: visible !important;
                    opacity: 1 !important;
                    min-height: 50px !important;
                    margin-top: auto !important;
                    background: white !important;
                ">
                    <!-- READ NOW BUTTON -->
                    <button onclick="window.resourcesModule?.openResource(${resource.id})" style="
                        flex: 1 !important;
                        min-width: 80px !important;
                        padding: 10px 16px !important;
                        border-radius: 8px !important;
                        font-weight: 600 !important;
                        font-size: 13px !important;
                        cursor: pointer !important;
                        display: inline-flex !important;
                        align-items: center !important;
                        justify-content: center !important;
                        gap: 6px !important;
                        visibility: visible !important;
                        opacity: 1 !important;
                        border: none !important;
                        transition: all 0.2s ease !important;
                        pointer-events: auto !important;
                        position: relative !important;
                        z-index: 10 !important;
                        color: white !important;
                        margin: 0 !important;
                        background: #4C1D95 !important;
                    " onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(76,29,149,0.3)'" onmouseout="this.style.transform='none'; this.style.boxShadow='none'">
                        <i class="fas fa-eye"></i> Read Now
                    </button>
                    
                    <!-- PODCAST BUTTON -->
                    <button onclick="window.resourcesModule?.readAloud(${resource.id})" style="
                        flex: 1 !important;
                        min-width: 80px !important;
                        padding: 10px 16px !important;
                        border-radius: 8px !important;
                        font-weight: 600 !important;
                        font-size: 13px !important;
                        cursor: pointer !important;
                        display: inline-flex !important;
                        align-items: center !important;
                        justify-content: center !important;
                        gap: 6px !important;
                        visibility: visible !important;
                        opacity: 1 !important;
                        border: none !important;
                        transition: all 0.2s ease !important;
                        pointer-events: auto !important;
                        position: relative !important;
                        z-index: 10 !important;
                        color: white !important;
                        margin: 0 !important;
                        background: linear-gradient(135deg, #4a90d9, #e84393) !important;
                    " onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(74,144,217,0.4)'" onmouseout="this.style.transform='none'; this.style.boxShadow='none'">
                        <i class="fas fa-podcast"></i> Podcast
                    </button>
                    
                    <!-- AI SUMMARY BUTTON - ✅ FIXED: No raw CSS inside the button -->
                    <button onclick="window.resourcesModule?.generateSummary(${resource.id})" style="
                        flex: 1 !important;
                        min-width: 80px !important;
                        padding: 10px 16px !important;
                        border-radius: 8px !important;
                        font-weight: 600 !important;
                        font-size: 13px !important;
                        cursor: pointer !important;
                        display: inline-flex !important;
                        align-items: center !important;
                        justify-content: center !important;
                        gap: 6px !important;
                        visibility: visible !important;
                        opacity: 1 !important;
                        border: none !important;
                        transition: all 0.2s ease !important;
                        pointer-events: auto !important;
                        position: relative !important;
                        z-index: 10 !important;
                        color: white !important;
                        margin: 0 !important;
                        background: #7c3aed !important;
                    " onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(124,58,237,0.3)'" onmouseout="this.style.transform='none'; this.style.boxShadow='none'">
                        <i class="fas fa-robot"></i> AI Summary
                    </button>
                </div>
            </div>
        `;
    }
    
    this.resourcesGrid.innerHTML = html;
    this.updateResourceCount();
    
    const cards = this.resourcesGrid.querySelectorAll('.resource-card');
    cards.forEach((card, index) => {
        card.style.animation = `fadeInUp 0.4s ease forwards ${index * 0.05}s`;
    });
}
    
    // ============================================================
    // 📄 OPEN PDF IN MODAL
    // ============================================================
    
    async openPDFInModal(resource) {
        try {
            await this.initializePDFJS();
            this.createPDFViewerModal(resource);
            await this.loadPDFInModal(resource.file_url);
        } catch (error) {
            console.error('PDF error:', error);
            this.showToast('Failed to load PDF: ' + error.message, 'error');
        }
    }
    
    async initializePDFJS() {
        if (this.pdfjsLoaded) return true;
        
        return new Promise((resolve, reject) => {
            if (typeof window.pdfjsLib !== 'undefined' && window.pdfjsLib) {
                this.pdfjsLib = window.pdfjsLib;
                if (this.pdfjsLib.GlobalWorkerOptions) {
                    this.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
                }
                this.pdfjsLoaded = true;
                resolve(true);
                return;
            }
            
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
            script.onload = () => {
                this.pdfjsLib = window.pdfjsLib;
                if (this.pdfjsLib && this.pdfjsLib.GlobalWorkerOptions) {
                    this.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
                }
                this.pdfjsLoaded = true;
                resolve(true);
            };
            script.onerror = () => reject(new Error('Failed to load PDF.js'));
            document.head.appendChild(script);
        });
    }
    
    createPDFViewerModal(resource) {
        const existingModal = document.getElementById('pdf-viewer-modal');
        if (existingModal) existingModal.remove();
        
        const modal = document.createElement('div');
        modal.id = 'pdf-viewer-modal';
        modal.className = 'pdf-viewer-modal';
        modal.innerHTML = `
            <div class="pdf-modal-container" id="pdf-modal-container">
                <div class="pdf-modal-header">
                    <div class="pdf-modal-title">
                        <i class="fas fa-file-pdf" style="color: #ef4444;"></i>
                        <span>${this.escapeHtml(resource.title)}</span>
                    </div>
                    <div class="pdf-modal-actions">
                        <button class="pdf-modal-btn" id="pdf-fullscreen-btn" title="Fullscreen">
                            <i class="fas fa-expand"></i>
                        </button>
                        <button class="pdf-modal-btn" id="pdf-zoom-in-btn" title="Zoom In">
                            <i class="fas fa-search-plus"></i>
                        </button>
                        <button class="pdf-modal-btn" id="pdf-zoom-out-btn" title="Zoom Out">
                            <i class="fas fa-search-minus"></i>
                        </button>
                        <button class="pdf-modal-btn close-pdf-modal" title="Close">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </div>
                <div class="pdf-modal-body" id="pdf-modal-body">
                    <div id="pdf-loading-modal" class="pdf-loading-modal">
                        <div class="loading-spinner"></div>
                        <p>Loading high-quality document...</p>
                    </div>
                    <div id="pdf-error-modal" class="pdf-error-modal" style="display: none;">
                        <i class="fas fa-exclamation-triangle"></i>
                        <h3>Failed to Load Document</h3>
                        <p id="pdf-error-message-modal"></p>
                        <button id="retry-pdf-modal" class="btn-primary">Retry</button>
                    </div>
                    <div id="pdf-viewer-modal-area" class="pdf-viewer-modal-area" style="display: none;">
                        <canvas id="pdf-canvas-modal" class="pdf-canvas-modal"></canvas>
                    </div>
                </div>
                <div class="pdf-modal-footer">
                    <div class="pdf-nav-controls">
                        <button class="pdf-nav-btn" id="pdf-first-modal" title="First Page">
                            <i class="fas fa-fast-backward"></i>
                        </button>
                        <button class="pdf-nav-btn" id="pdf-prev-modal" title="Previous Page">
                            <i class="fas fa-chevron-left"></i>
                        </button>
                        <span class="pdf-page-info">
                            <input type="number" id="pdf-page-modal" value="1" min="1">
                            <span>/</span>
                            <span id="pdf-total-modal">1</span>
                        </span>
                        <button class="pdf-nav-btn" id="pdf-next-modal" title="Next Page">
                            <i class="fas fa-chevron-right"></i>
                        </button>
                        <button class="pdf-nav-btn" id="pdf-last-modal" title="Last Page">
                            <i class="fas fa-fast-forward"></i>
                        </button>
                    </div>
                    <div class="pdf-zoom-info">
                        <span id="pdf-zoom-percent-modal">100%</span>
                    </div>
                    <div class="pdf-protected-badge">
                        <i class="fas fa-lock"></i> Read Only
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        this.addPDFModalStyles();
        this.setupPDFModalEvents();
        modal.style.display = 'flex';
    }
    
    addPDFModalStyles() {
        if (document.getElementById('pdf-modal-styles')) return;
        
        const styles = document.createElement('style');
        styles.id = 'pdf-modal-styles';
        styles.textContent = `
            .pdf-viewer-modal {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0,0,0,0.92);
                display: none;
                justify-content: center;
                align-items: center;
                z-index: 100000;
                padding: 10px;
            }
            .pdf-modal-container {
                width: 100%;
                height: 100%;
                max-width: 1200px;
                max-height: 98vh;
                background: #1a1a2e;
                border-radius: 16px;
                display: flex;
                flex-direction: column;
                overflow: hidden;
                box-shadow: 0 20px 60px rgba(0,0,0,0.8);
            }
            .pdf-modal-header {
                padding: 12px 20px;
                background: linear-gradient(135deg, #16213e, #1a1a2e);
                border-bottom: 1px solid rgba(255,255,255,0.1);
                display: flex;
                justify-content: space-between;
                align-items: center;
                flex-shrink: 0;
                min-height: 56px;
            }
            .pdf-modal-title {
                display: flex;
                align-items: center;
                gap: 12px;
                color: white;
                font-weight: 500;
                font-size: 14px;
                min-width: 0;
                flex: 1;
            }
            .pdf-modal-title span {
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            .pdf-modal-title i { font-size: 22px; flex-shrink: 0; }
            .pdf-modal-actions {
                display: flex;
                gap: 6px;
                flex-shrink: 0;
            }
            .pdf-modal-btn {
                background: rgba(255,255,255,0.08);
                border: none;
                color: #94a3b8;
                width: 38px;
                height: 38px;
                border-radius: 8px;
                cursor: pointer;
                font-size: 16px;
                transition: all 0.2s;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .pdf-modal-btn:hover {
                background: #4C1D95;
                color: white;
                transform: scale(1.05);
            }
            .pdf-modal-btn:active { transform: scale(0.95); }
            .pdf-modal-body {
                flex: 1;
                overflow: auto;
                background: #1a1a2e;
                position: relative;
            }
            .pdf-viewer-modal-area {
                display: flex;
                justify-content: center;
                padding: 20px;
                min-height: 100%;
                align-items: flex-start;
                background: #2d2d3a;
            }
            .pdf-canvas-modal {
                box-shadow: 0 4px 30px rgba(0,0,0,0.5);
                background: white;
                border-radius: 4px;
                max-width: 100%;
                height: auto;
                image-rendering: auto;
                -webkit-font-smoothing: antialiased;
            }
            .pdf-modal-footer {
                padding: 10px 20px;
                background: linear-gradient(135deg, #16213e, #1a1a2e);
                border-top: 1px solid rgba(255,255,255,0.1);
                display: flex;
                justify-content: space-between;
                align-items: center;
                flex-shrink: 0;
                flex-wrap: wrap;
                gap: 8px;
                min-height: 48px;
            }
            .pdf-nav-controls {
                display: flex;
                align-items: center;
                gap: 6px;
            }
            .pdf-nav-btn {
                background: rgba(255,255,255,0.08);
                border: none;
                color: #94a3b8;
                width: 34px;
                height: 34px;
                border-radius: 6px;
                cursor: pointer;
                transition: all 0.2s;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .pdf-nav-btn:hover:not(:disabled) {
                background: #4C1D95;
                color: white;
            }
            .pdf-nav-btn:disabled {
                opacity: 0.3;
                cursor: not-allowed;
            }
            .pdf-page-info {
                display: flex;
                align-items: center;
                gap: 4px;
                color: #94a3b8;
                font-size: 14px;
                margin: 0 8px;
            }
            #pdf-page-modal {
                width: 44px;
                padding: 4px 6px;
                border-radius: 4px;
                border: 1px solid rgba(255,255,255,0.15);
                text-align: center;
                background: rgba(255,255,255,0.05);
                color: white;
                font-size: 14px;
                font-weight: 500;
            }
            #pdf-page-modal:focus {
                outline: 2px solid #4C1D95;
                border-color: #4C1D95;
            }
            .pdf-zoom-info {
                color: #94a3b8;
                font-size: 13px;
                font-weight: 500;
                min-width: 50px;
                text-align: center;
            }
            .pdf-protected-badge {
                background: rgba(76,29,149,0.25);
                padding: 4px 12px;
                border-radius: 20px;
                color: #a78bfa;
                font-size: 11px;
                display: flex;
                align-items: center;
                gap: 6px;
                white-space: nowrap;
            }
            .loading-spinner {
                width: 48px;
                height: 48px;
                border: 4px solid rgba(255,255,255,0.1);
                border-top-color: #4C1D95;
                border-radius: 50%;
                animation: spin 0.8s linear infinite;
                margin: 0 auto 16px;
            }
            .pdf-loading-modal, .pdf-error-modal {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                height: 100%;
                color: white;
                padding: 30px;
            }
            .pdf-error-modal i { font-size: 48px; color: #ef4444; margin-bottom: 16px; }
            .pdf-error-modal h3 { margin: 8px 0; font-size: 20px; }
            .pdf-error-modal p { color: #9ca3af; margin-bottom: 16px; text-align: center; }
            .pdf-error-modal .btn-primary {
                padding: 10px 30px;
                background: #4C1D95;
                color: white;
                border: none;
                border-radius: 8px;
                font-size: 14px;
                cursor: pointer;
                font-weight: 500;
            }
            .pdf-error-modal .btn-primary:hover { background: #5b21b6; }
            @keyframes spin { to { transform: rotate(360deg); } }
            .pdf-viewer-modal:fullscreen .pdf-modal-container {
                max-width: 100%;
                max-height: 100vh;
                border-radius: 0;
            }
            .pdf-viewer-modal:fullscreen .pdf-modal-body { background: #0a0a1a; }
            .pdf-viewer-modal:fullscreen .pdf-viewer-modal-area {
                background: #0a0a1a;
                padding: 10px;
            }
            @media (max-width: 768px) {
                .pdf-viewer-modal { padding: 5px; }
                .pdf-modal-container { max-height: 100vh; border-radius: 8px; }
                .pdf-modal-header { padding: 8px 12px; min-height: 44px; }
                .pdf-modal-title { font-size: 12px; }
                .pdf-modal-title i { font-size: 18px; }
                .pdf-modal-btn { width: 32px; height: 32px; font-size: 14px; }
                .pdf-viewer-modal-area { padding: 10px; }
                .pdf-modal-footer { padding: 6px 10px; gap: 4px; }
                .pdf-nav-btn { width: 28px; height: 28px; font-size: 12px; }
                #pdf-page-modal { width: 34px; font-size: 12px; }
                .pdf-page-info { font-size: 12px; gap: 2px; margin: 0 4px; }
                .pdf-protected-badge { font-size: 10px; padding: 2px 8px; }
                .pdf-zoom-info { font-size: 11px; min-width: 40px; }
            }
        `;
        document.head.appendChild(styles);
    }
    
    setupPDFModalEvents() {
        const modal = document.getElementById('pdf-viewer-modal');
        const closeBtn = document.querySelector('.close-pdf-modal');
        const fullscreenBtn = document.getElementById('pdf-fullscreen-btn');
        const zoomInBtn = document.getElementById('pdf-zoom-in-btn');
        const zoomOutBtn = document.getElementById('pdf-zoom-out-btn');
        const firstBtn = document.getElementById('pdf-first-modal');
        const prevBtn = document.getElementById('pdf-prev-modal');
        const nextBtn = document.getElementById('pdf-next-modal');
        const lastBtn = document.getElementById('pdf-last-modal');
        const pageInput = document.getElementById('pdf-page-modal');
        
        if (closeBtn) closeBtn.onclick = () => { this.closePDFModal(); };
        if (modal) modal.onclick = (e) => { if (e.target === modal) this.closePDFModal(); };
        if (fullscreenBtn) fullscreenBtn.onclick = () => this.togglePDFFullscreen();
        if (zoomInBtn) zoomInBtn.onclick = () => this.zoomPDF(1.2);
        if (zoomOutBtn) zoomOutBtn.onclick = () => this.zoomPDF(0.8);
        if (firstBtn) firstBtn.onclick = () => this.goToPDFPage(1);
        if (prevBtn) prevBtn.onclick = () => this.goToPDFPage(this.currentPDFPage - 1);
        if (nextBtn) nextBtn.onclick = () => this.goToPDFPage(this.currentPDFPage + 1);
        if (lastBtn) lastBtn.onclick = () => this.goToPDFPage(this.totalPDFPages);
        
        if (pageInput) {
            pageInput.addEventListener('change', () => {
                const page = parseInt(pageInput.value);
                if (page >= 1 && page <= this.totalPDFPages) this.goToPDFPage(page);
            });
        }
        
        document.addEventListener('keydown', (e) => {
            if (!modal || modal.style.display !== 'flex') return;
            if (e.key === 'Escape' && !this.isFullscreen) this.closePDFModal();
            else if (e.key === 'f' || e.key === 'F') this.togglePDFFullscreen();
            else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                e.preventDefault();
                this.goToPDFPage(this.currentPDFPage - 1);
            } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                e.preventDefault();
                this.goToPDFPage(this.currentPDFPage + 1);
            } else if (e.key === 'Home') {
                e.preventDefault();
                this.goToPDFPage(1);
            } else if (e.key === 'End') {
                e.preventDefault();
                this.goToPDFPage(this.totalPDFPages);
            } else if (e.key === '+' || e.key === '=') {
                e.preventDefault();
                this.zoomPDF(1.2);
            } else if (e.key === '-') {
                e.preventDefault();
                this.zoomPDF(0.8);
            }
        });
    }
    
    togglePDFFullscreen() {
        const modal = document.getElementById('pdf-viewer-modal');
        if (!modal) return;
        
        if (document.fullscreenElement) {
            document.exitFullscreen();
            this.isFullscreen = false;
        } else {
            modal.requestFullscreen().catch(err => {
                this.showToast('Fullscreen mode not supported', 'warning');
            });
            this.isFullscreen = true;
        }
    }
    
    closePDFModal() {
        const modal = document.getElementById('pdf-viewer-modal');
        if (modal) {
            if (document.fullscreenElement) document.exitFullscreen();
            modal.style.display = 'none';
            this.cleanupPDFModal();
            this.stopAudio();
        }
    }
    
    async loadPDFInModal(pdfUrl) {
        try {
            const loadingDiv = document.getElementById('pdf-loading-modal');
            const errorDiv = document.getElementById('pdf-error-modal');
            const viewerDiv = document.getElementById('pdf-viewer-modal-area');
            
            if (loadingDiv) loadingDiv.style.display = 'flex';
            if (errorDiv) errorDiv.style.display = 'none';
            if (viewerDiv) viewerDiv.style.display = 'none';
            
            const loadingTask = this.pdfjsLib.getDocument({
                url: pdfUrl,
                cMapUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/',
                cMapPacked: true,
                verbosity: 0,
                useSystemFonts: true,
                disableFontFace: false,
                fontExtraProperties: false
            });
            
            this.currentPDFDoc = await loadingTask.promise;
            this.totalPDFPages = this.currentPDFDoc.numPages;
            
            const totalSpan = document.getElementById('pdf-total-modal');
            const pageInput = document.getElementById('pdf-page-modal');
            if (totalSpan) totalSpan.textContent = this.totalPDFPages;
            if (pageInput) pageInput.max = this.totalPDFPages;
            
            if (loadingDiv) loadingDiv.style.display = 'none';
            if (viewerDiv) viewerDiv.style.display = 'flex';
            
            const isMobile = window.innerWidth < 768;
            this.pdfScale = isMobile ? 1.0 : 1.3;
            this.updateZoomDisplay();
            
            await this.renderPDFPage(1);
            
        } catch (error) {
            console.error('PDF loading error:', error);
            const loadingDiv = document.getElementById('pdf-loading-modal');
            const errorDiv = document.getElementById('pdf-error-modal');
            const errorMsg = document.getElementById('pdf-error-message-modal');
            const retryBtn = document.getElementById('retry-pdf-modal');
            
            if (loadingDiv) loadingDiv.style.display = 'none';
            if (errorDiv) errorDiv.style.display = 'flex';
            if (errorMsg) errorMsg.textContent = error.message;
            if (retryBtn) retryBtn.onclick = () => this.loadPDFInModal(pdfUrl);
        }
    }
    
    async renderPDFPage(pageNum) {
        if (!this.currentPDFDoc || pageNum < 1 || pageNum > this.totalPDFPages) return;
        if (this.pageRendering) { this.pageNumPending = pageNum; return; }
        this.pageRendering = true;
        
        try {
            const page = await this.currentPDFDoc.getPage(pageNum);
            const canvas = document.getElementById('pdf-canvas-modal');
            if (!canvas) { this.pageRendering = false; return; }
            const ctx = canvas.getContext('2d', { alpha: false });
            
            const viewerArea = document.getElementById('pdf-viewer-modal-area');
            const containerWidth = viewerArea ? viewerArea.clientWidth - 40 : window.innerWidth - 60;
            const maxWidth = Math.min(containerWidth, 1400);
            
            const viewport = page.getViewport({ scale: 1 });
            let scale = this.pdfScale;
            
            if (this.pdfScale === 1.0) {
                const fitScale = (maxWidth - 20) / viewport.width;
                scale = Math.max(fitScale, 0.8);
            }
            
            const scaledViewport = page.getViewport({ scale: scale });
            const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
            
            canvas.width = scaledViewport.width * dpr;
            canvas.height = scaledViewport.height * dpr;
            canvas.style.width = scaledViewport.width + 'px';
            canvas.style.height = scaledViewport.height + 'px';
            
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            
            const renderContext = {
                canvasContext: ctx,
                viewport: scaledViewport,
                background: 'white',
                enableWebGL: false,
                renderInteractiveForms: false,
                useSystemFonts: true,
            };
            
            await page.render(renderContext).promise;
            
            this.currentPDFPage = pageNum;
            const pageInput = document.getElementById('pdf-page-modal');
            if (pageInput) pageInput.value = pageNum;
            
            this.updatePDFNavButtons();
            
        } catch (error) {
            console.error('Render error:', error);
        }
        
        this.pageRendering = false;
        if (this.pageNumPending !== null) {
            this.renderPDFPage(this.pageNumPending);
            this.pageNumPending = null;
        }
    }
    
    goToPDFPage(pageNum) {
        if (pageNum < 1) pageNum = 1;
        if (pageNum > this.totalPDFPages) pageNum = this.totalPDFPages;
        this.renderPDFPage(pageNum);
    }
    
    zoomPDF(factor) {
        this.pdfScale = this.pdfScale * factor;
        if (this.pdfScale < 0.5) this.pdfScale = 0.5;
        if (this.pdfScale > 4.0) this.pdfScale = 4.0;
        this.updateZoomDisplay();
        this.renderPDFPage(this.currentPDFPage);
    }
    
    updateZoomDisplay() {
        const percent = Math.round(this.pdfScale * 100);
        const zoomDisplay = document.getElementById('pdf-zoom-percent-modal');
        if (zoomDisplay) zoomDisplay.textContent = percent + '%';
    }
    
    updatePDFNavButtons() {
        const firstBtn = document.getElementById('pdf-first-modal');
        const prevBtn = document.getElementById('pdf-prev-modal');
        const nextBtn = document.getElementById('pdf-next-modal');
        const lastBtn = document.getElementById('pdf-last-modal');
        if (firstBtn) firstBtn.disabled = this.currentPDFPage <= 1;
        if (prevBtn) prevBtn.disabled = this.currentPDFPage <= 1;
        if (nextBtn) nextBtn.disabled = this.currentPDFPage >= this.totalPDFPages;
        if (lastBtn) lastBtn.disabled = this.currentPDFPage >= this.totalPDFPages;
    }
    
    cleanupPDFModal() {
        if (this.currentPDFDoc) {
            this.currentPDFDoc.destroy();
            this.currentPDFDoc = null;
        }
        this.currentPDFPage = 1;
        this.totalPDFPages = 0;
        this.pdfScale = 1.0;
        this.pageRendering = false;
        this.pageNumPending = null;
        this.isFullscreen = false;
    }
    
    // ============================================================
    // IMAGE/VIDEO VIEWER
    // ============================================================
    openImageInModal(resource) {
        const modal = document.createElement('div');
        modal.className = 'image-viewer-modal';
        modal.innerHTML = `
            <div class="image-modal-container" style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.92);z-index:100000;display:flex;align-items:center;justify-content:center;">
                <div style="background:white;border-radius:12px;max-width:90%;max-height:90%;overflow:hidden;position:relative;">
                    <button class="close-image-modal" style="position:absolute;top:10px;right:10px;background:rgba(0,0,0,0.5);color:white;border:none;width:40px;height:40px;border-radius:50%;font-size:24px;cursor:pointer;z-index:10;display:flex;align-items:center;justify-content:center;">×</button>
                    <div style="padding:20px;max-height:85vh;overflow:auto;">
                        <img src="${resource.file_url}" alt="${this.escapeHtml(resource.title)}" style="max-width:100%;max-height:80vh;display:block;margin:0 auto;">
                        <p style="text-align:center;color:#64748b;font-size:13px;margin-top:12px;"><i class="fas fa-lock"></i> Protected Image - No Download</p>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        modal.querySelector('.close-image-modal').onclick = () => modal.remove();
        modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
    }
    
    openVideoInModal(resource) {
        const modal = document.createElement('div');
        modal.className = 'video-viewer-modal';
        modal.innerHTML = `
            <div style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.92);z-index:100000;display:flex;align-items:center;justify-content:center;">
                <div style="background:white;border-radius:12px;max-width:90%;max-height:90%;overflow:hidden;position:relative;width:800px;">
                    <button class="close-video-modal" style="position:absolute;top:10px;right:10px;background:rgba(0,0,0,0.5);color:white;border:none;width:40px;height:40px;border-radius:50%;font-size:24px;cursor:pointer;z-index:10;display:flex;align-items:center;justify-content:center;">×</button>
                    <div style="padding:20px;">
                        <video controls controlslist="nodownload" disablepictureinpicture style="width:100%;max-height:70vh;border-radius:8px;">
                            <source src="${resource.file_url}" type="video/mp4">
                            Your browser does not support video playback.
                        </video>
                        <p style="text-align:center;color:#64748b;font-size:13px;margin-top:12px;"><i class="fas fa-lock"></i> Protected Video - No Download</p>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        modal.querySelector('.close-video-modal').onclick = () => modal.remove();
        modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
    }
    
    // ============================================================
    // UTILITY FUNCTIONS
    // ============================================================
    getFileType(filePath) {
        if (!filePath) return 'unknown';
        const ext = filePath.split('.').pop().toLowerCase();
        if (ext === 'pdf') return 'pdf';
        if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(ext)) return 'image';
        if (['mp4', 'avi', 'mov', 'wmv', 'webm'].includes(ext)) return 'video';
        return 'file';
    }
    
    getFileIcon(filePath) {
        const type = this.getFileType(filePath);
        const icons = { pdf: 'fa-file-pdf', image: 'fa-file-image', video: 'fa-file-video' };
        return `fas ${icons[type] || 'fa-file-alt'}`;
    }
    
    getExamTypeLabel(examType) {
        const labels = {
            'CAT_1': 'CAT 1',
            'CAT_2': 'CAT 2',
            'CAT': 'CAT',
            'END_TERM': 'End of Term',
            'FINAL': 'Final Exam',
            'SUPPLEMENTARY': 'Supplementary',
            'SPECIAL': 'Special Exam'
        };
        return labels[examType] || examType;
    }
    
    getBlockTagClass(blockOrTerm, isTVET = false) {
        if (!blockOrTerm) return 'tag-general';
        const b = String(blockOrTerm).toLowerCase();
        if (isTVET) {
            if (b.includes('term 1') || b.includes('trimester 1') || b === '1') return 'tag-block1';
            if (b.includes('term 2') || b.includes('trimester 2') || b === '2') return 'tag-block2';
            if (b.includes('term 3') || b.includes('trimester 3') || b === '3') return 'tag-block3';
            if (b.includes('term 4') || b.includes('trimester 4') || b === '4') return 'tag-block4';
            if (b.includes('term 5') || b.includes('trimester 5') || b === '5') return 'tag-block5';
            if (b.includes('term 6') || b.includes('trimester 6') || b === '6') return 'tag-block5';
            if (b.includes('final') || b.includes('graduating') || b === '7') return 'tag-final';
            return 'tag-general';
        }
        if (b.includes('intro')) return 'tag-intro';
        if (b.includes('block 1') || b.includes('block1') || b === '1') return 'tag-block1';
        if (b.includes('block 2') || b.includes('block2') || b === '2') return 'tag-block2';
        if (b.includes('block 3') || b.includes('block3') || b === '3') return 'tag-block3';
        if (b.includes('block 4') || b.includes('block4') || b === '4') return 'tag-block4';
        if (b.includes('block 5') || b.includes('block5') || b === '5') return 'tag-block5';
        if (b.includes('final')) return 'tag-final';
        return 'tag-general';
    }
    
    getBlockIcon(blockOrTerm, isTVET = false) {
        if (!blockOrTerm) return 'fa-layer-group';
        const b = String(blockOrTerm).toLowerCase();
        if (isTVET) {
            if (b.includes('term 1') || b === '1') return 'fa-flag-checkered';
            if (b.includes('term 2') || b === '2') return 'fa-book';
            if (b.includes('term 3') || b === '3') return 'fa-book-open';
            if (b.includes('term 4') || b === '4') return 'fa-chalkboard-user';
            if (b.includes('term 5') || b === '5') return 'fa-stethoscope';
            if (b.includes('term 6') || b === '6') return 'fa-user-nurse';
            if (b.includes('final') || b === '7') return 'fa-graduation-cap';
            return 'fa-layer-group';
        }
        if (b.includes('intro')) return 'fa-flag-checkered';
        if (b.includes('block 1') || b === '1') return 'fa-book';
        if (b.includes('block 2') || b === '2') return 'fa-book-open';
        if (b.includes('block 3') || b === '3') return 'fa-chalkboard-user';
        if (b.includes('block 4') || b === '4') return 'fa-stethoscope';
        if (b.includes('block 5') || b === '5') return 'fa-user-nurse';
        if (b.includes('final') || b === '6') return 'fa-graduation-cap';
        return 'fa-layer-group';
    }
    
    escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
    
    // ============================================================
    // SKELETON & LOADING STATES
    // ============================================================
    showSkeletonCards(count = 6) {
        if (!this.resourcesGrid) return;
        let skeletonHtml = '';
        for (let i = 0; i < count; i++) {
            skeletonHtml += `
                <div class="resource-card skeleton">
                    <div class="resource-preview">
                        <div class="preview-icon skeleton-shimmer"></div>
                        <div class="skeleton-badge"></div>
                    </div>
                    <div class="resource-details">
                        <div class="skeleton-title"></div>
                        <div class="skeleton-text"></div>
                        <div class="skeleton-text short"></div>
                        <div class="skeleton-meta">
                            <div class="skeleton-tag"></div>
                            <div class="skeleton-tag"></div>
                        </div>
                    </div>
                    <div class="resource-actions">
                        <div class="skeleton-button"></div>
                    </div>
                </div>
            `;
        }
        this.resourcesGrid.innerHTML = skeletonHtml;
        this.addSkeletonStyles();
    }
    
    addSkeletonStyles() {
        if (document.getElementById('skeleton-styles')) return;
        const styles = document.createElement('style');
        styles.id = 'skeleton-styles';
        styles.textContent = `
            .skeleton-shimmer {
                background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
                background-size: 200% 100%;
                animation: shimmer 1.5s infinite;
            }
            @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
            .skeleton-title { height: 20px; width: 70%; background: #e5e7eb; border-radius: 8px; margin-bottom: 12px; }
            .skeleton-text { height: 14px; width: 100%; background: #e5e7eb; border-radius: 6px; margin-bottom: 8px; }
            .skeleton-text.short { width: 60%; }
            .skeleton-meta { display: flex; gap: 8px; margin-top: 12px; }
            .skeleton-tag { height: 24px; width: 70px; background: #e5e7eb; border-radius: 20px; }
            .skeleton-button { height: 40px; width: 100%; background: #e5e7eb; border-radius: 40px; }
            .skeleton-badge { position: absolute; top: 12px; right: 12px; width: 80px; height: 24px; background: #e5e7eb; border-radius: 20px; }
            .resource-card.skeleton { pointer-events: none; opacity: 0.7; }
        `;
        document.head.appendChild(styles);
    }
    
    showError(message, showRetry = true) {
        if (!this.resourcesGrid) return;
        this.resourcesGrid.innerHTML = `
            <div class="error-state-premium">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Unable to Load Resources</h3>
                <p>${message}</p>
                ${showRetry ? '<button onclick="window.resourcesModule?.retryLoad()" class="premium-btn"><i class="fas fa-sync-alt"></i> Retry</button>' : ''}
            </div>
        `;
    }
    
    showEmptyState() {
        if (!this.resourcesGrid) return;
        const isTVET = this.isTVETStudent || this.userProgram === 'tvet';
        const filterType = isTVET ? 'term' : 'block';
        this.resourcesGrid.innerHTML = `
            <div class="empty-state-premium">
                <i class="fas fa-folder-open"></i>
                <h3>No Resources Found</h3>
                <p>No resources match your selected ${filterType} or filters.</p>
                <button onclick="window.resourcesModule?.resetFilters()" class="premium-btn">
                    <i class="fas fa-eye"></i> Reset Filters
                </button>
            </div>
        `;
    }
    
    // ============================================================
    // FILTER FUNCTIONS
    // ============================================================
    populateFilters() {
        if (this.courseFilter) {
            const courses = [...new Set(this.allResources.map(r => r.course_name || r.program_type).filter(Boolean))];
            this.courseFilter.innerHTML = '<option value="all">All Courses</option>';
            courses.sort().forEach(course => {
                const option = document.createElement('option');
                option.value = course;
                option.textContent = course;
                this.courseFilter.appendChild(option);
            });
        }
        if (this.yearFilter) {
            const years = [...new Set(this.allResources.map(r => r.intake || r.pastpaper_year).filter(Boolean))];
            this.yearFilter.innerHTML = '<option value="all">All Years</option>';
            years.sort((a, b) => b - a).forEach(year => {
                const option = document.createElement('option');
                option.value = year;
                option.textContent = year;
                this.yearFilter.appendChild(option);
            });
        }
    }
    
    updatePastPaperCount() {
        const pastpaperCount = this.allResources.filter(r => r.resource_type === 'pastpaper').length;
        if (this.pastpaperCount) this.pastpaperCount.textContent = pastpaperCount;
    }
    
    updateDashboardResourceCount() {
        const totalResources = this.allResources.length;
        const dashboardResourcesEl = document.getElementById('dashboard-new-resources');
        if (dashboardResourcesEl) dashboardResourcesEl.innerText = totalResources;
    }
    
    updateResourceCount() {
        const countEl = document.getElementById('resource-count-display');
        if (countEl) countEl.textContent = `${this.filteredResources.length} resources`;
    }
    
    filterResourcesByType(type) {
        this.currentResourceType = type;
        const buttons = document.querySelectorAll('.type-tab');
        buttons.forEach(btn => {
            const btnType = btn.getAttribute('data-type');
            if (btnType === type) btn.classList.add('active');
            else btn.classList.remove('active');
        });
        if (this.searchInput) this.searchInput.value = '';
        this.currentSearchTerm = '';
        if (this.typeFilter) this.typeFilter.value = 'all';
        if (this.yearFilter) this.yearFilter.value = 'all';
        this.applyFilters();
    }
    
    resetFilters() {
        if (this.blockFilter) this.blockFilter.value = 'all';
        if (this.searchInput) this.searchInput.value = '';
        this.currentSearchTerm = '';
        if (this.typeFilter) this.typeFilter.value = 'all';
        if (this.courseFilter) this.courseFilter.value = 'all';
        if (this.yearFilter) this.yearFilter.value = 'all';
        this.currentBlockFilter = 'all';
        this.currentResourceType = 'all';
        this.currentFileType = 'all';
        this.currentCourse = 'all';
        this.currentYear = 'all';
        const buttons = document.querySelectorAll('.type-tab');
        buttons.forEach(btn => {
            if (btn.getAttribute('data-type') === 'all') btn.classList.add('active');
            else btn.classList.remove('active');
        });
        this.applyFilters();
    }
    
    retryLoad() { this.loadResources(); }
    
    showToast(message, type = 'info') {
        const toast = document.getElementById('toast');
        if (toast) {
            toast.textContent = message;
            toast.style.display = 'block';
            toast.style.backgroundColor = type === 'error' ? '#dc2626' : type === 'success' ? '#10b981' : '#3b82f6';
            toast.style.color = 'white';
            toast.style.padding = '12px 20px';
            toast.style.borderRadius = '8px';
            toast.style.position = 'fixed';
            toast.style.bottom = '20px';
            toast.style.right = '20px';
            toast.style.zIndex = '100000';
            setTimeout(() => { toast.style.display = 'none'; }, 3000);
        } else {
            console.log(message);
        }
    }
    
    // ============================================================
    // INITIALIZATION
    // ============================================================
    async initialize() {
        console.log('📁 Initializing Student Resources Module with Podcast Audio...');
        this.detectUserProgram();
        await this.getUserProfile();
        
        let attempts = 0;
        const maxAttempts = 30;
        
        const checkAndInit = async () => {
            attempts++;
            const hasDb = window.db && window.db.supabase;
            const hasUserProfile = window.currentUserProfile || this.userProfile;
            
            if (hasDb && hasUserProfile) {
                console.log('✅ Database and user ready, loading resources...');
                await this.loadResources();
            } else if (attempts < maxAttempts) {
                console.log(`⏳ Waiting for user profile... (attempt ${attempts}/${maxAttempts})`);
                setTimeout(checkAndInit, 500);
            } else {
                console.error('❌ Timeout waiting for user profile');
                if (this.resourcesGrid) {
                    this.resourcesGrid.innerHTML = `
                        <div class="error-state-premium">
                            <i class="fas fa-user-slash"></i>
                            <h3>Unable to Load Profile</h3>
                            <p>Please refresh the page or contact support.</p>
                            <button onclick="location.reload()" class="premium-btn">
                                <i class="fas fa-sync-alt"></i> Refresh Page
                            </button>
                        </div>
                    `;
                }
            }
        };
        
        if (window.db && typeof window.db.loadUserProfile === 'function' && !window.currentUserProfile) {
            try {
                await window.db.loadUserProfile();
            } catch (e) {
                console.warn('Could not load user profile via db:', e);
            }
        }
        
        checkAndInit();
    }
}

// ============================================================
// EXPORT / GLOBAL INITIALIZATION
// ============================================================

let resourcesModule = null;

function initResourcesModule() {
    if (!document.getElementById('student-resources-grid') && !document.getElementById('resources-grid')) {
        console.log('Resources grid not found');
        return null;
    }
    if (resourcesModule) return resourcesModule;
    try {
        resourcesModule = new ResourcesModule();
        resourcesModule.initialize();
        window.resourcesModule = resourcesModule;
        return resourcesModule;
    } catch (error) {
        console.error('Resources init error:', error);
        return null;
    }
}

// ============================================================
// GLOBAL FUNCTIONS
// ============================================================

window.filterStudentResourceType = function(type) {
    if (resourcesModule) resourcesModule.filterResourcesByType(type);
};

window.openResourceInline = function(id) {
    if (resourcesModule) resourcesModule.openResource(id);
};

window.resetResourceFilters = function() {
    if (resourcesModule) resourcesModule.resetFilters();
};

window.loadStudentResources = function() {
    if (resourcesModule) resourcesModule.loadResources();
};

// ============================================================
// AUTO-INITIALIZE
// ============================================================

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => initResourcesModule(), 500);
    });
} else {
    setTimeout(() => initResourcesModule(), 500);
}

document.addEventListener('appReady', () => {
    setTimeout(() => initResourcesModule(), 300);
});

console.log('✅ Resources module loaded with NotebookLM-style Podcast Audio!');
