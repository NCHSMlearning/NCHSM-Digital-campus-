// enhanced-attendance.js - Complete student check-in system
(function() {
    'use strict';
    
    console.log('✅ Enhanced Student Check-in System Loading...');
    
    // ============================================
    // CONFIGURATION
    // ============================================
    
    const VERIFIED_DISTANCE = 100;       // 100m - Auto verified
    const PENDING_DISTANCE = 200;        // 200m - Needs review
    const MIN_GPS_ACCURACY = 50;         // 50m - Good accuracy
    
    // NCHSM Campus Coordinates (Nakuru)
    const CAMPUS_COORDINATES = {
        latitude: -0.2714611,
        longitude: 36.0519956,
        name: "NCHSM Main Campus - Nakuru"
    };
    
    // Store data
    let approvedUnits = [];
    let clinicalLocations = [];
    let attendanceUserId = null;
    let attendanceUserProfile = null;
    let currentLocation = null;
    let locationWatchId = null;
    let selectedTarget = null;
    let checkInHistory = [];
    
    // Audio feedback
    let audioEnabled = true;
    let audioContext = null;
    
    // ============================================
    // ENHANCED UI COMPONENTS
    // ============================================
    
    function addEnhancedUI() {
        const checkInCard = document.querySelector('.check-in-card .card-body');
        if (!checkInCard || document.querySelector('.enhanced-attendance-ui')) return;
        
        const enhancedHTML = `
            <div class="enhanced-attendance-ui">
                <!-- Live Distance Meter -->
                <div class="live-distance-meter" id="liveDistanceMeter" style="display: none;">
                    <div class="meter-header">
                        <i class="fas fa-map-pin"></i>
                        <span>Distance to Target</span>
                        <span id="liveDistanceValue" class="distance-value">--</span>
                    </div>
                    <div class="progress-container">
                        <div class="progress-bar-bg">
                            <div class="progress-fill" id="distanceProgressFill" style="width: 0%"></div>
                        </div>
                        <div class="threshold-markers">
                            <span class="threshold verified">✅ ${VERIFIED_DISTANCE}m</span>
                            <span class="threshold pending">⚠️ ${PENDING_DISTANCE}m</span>
                        </div>
                    </div>
                    <div id="locationFeedback" class="location-feedback"></div>
                </div>
                
                <!-- Mini Map -->
                <div class="mini-map-container" id="miniMapContainer" style="display: none;">
                    <div class="map-header">
                        <i class="fas fa-map"></i>
                        <span>Location Map</span>
                        <button id="toggleMapBtn" class="btn-icon-sm">
                            <i class="fas fa-chevron-up"></i>
                        </button>
                    </div>
                    <div id="mapCanvas" class="map-canvas">
                        <canvas id="distanceCanvas" width="300" height="150"></canvas>
                        <div class="map-legend">
                            <span><span style="background: #10b981;"></span> You</span>
                            <span><span style="background: #ef4444;"></span> Target</span>
                        </div>
                    </div>
                </div>
                
                <!-- Voice Feedback Toggle -->
                <div class="voice-toggle">
                    <button id="toggleVoiceBtn" class="btn-voice">
                        <i class="fas fa-volume-up"></i>
                        <span>Voice Feedback ${audioEnabled ? 'ON' : 'OFF'}</span>
                    </button>
                </div>
            </div>
        `;
        
        // Insert after check-in controls
        const controls = checkInCard.querySelector('.check-in-controls');
        if (controls) {
            controls.insertAdjacentHTML('afterend', enhancedHTML);
        }
        
        // Setup event listeners for enhanced UI
        setupEnhancedUIEvents();
    }
    
    function setupEnhancedUIEvents() {
        // Toggle map
        const toggleMapBtn = document.getElementById('toggleMapBtn');
        const mapCanvas = document.getElementById('mapCanvas');
        if (toggleMapBtn && mapCanvas) {
            toggleMapBtn.addEventListener('click', () => {
                const isVisible = mapCanvas.style.display !== 'none';
                mapCanvas.style.display = isVisible ? 'none' : 'block';
                toggleMapBtn.querySelector('i').className = isVisible ? 'fas fa-chevron-down' : 'fas fa-chevron-up';
            });
        }
        
        // Toggle voice feedback
        const toggleVoiceBtn = document.getElementById('toggleVoiceBtn');
        if (toggleVoiceBtn) {
            toggleVoiceBtn.addEventListener('click', () => {
                audioEnabled = !audioEnabled;
                toggleVoiceBtn.innerHTML = `<i class="fas fa-volume-${audioEnabled ? 'up' : 'mute'}"></i><span>Voice Feedback ${audioEnabled ? 'ON' : 'OFF'}</span>`;
                speakFeedback(`Voice feedback ${audioEnabled ? 'enabled' : 'disabled'}`, audioEnabled);
            });
        }
    }
    
    // ============================================
    // LIVE DISTANCE TRACKER WITH CANVAS MAP
    // ============================================
    
    function startLiveTracking() {
        setInterval(() => {
            if (currentLocation && selectedTarget) {
                updateLiveDistanceMeter();
                drawDistanceCanvas();
            }
        }, 1000);
    }
    
    function updateLiveDistanceMeter() {
        const distance = calculateDistance(
            currentLocation.latitude,
            currentLocation.longitude,
            selectedTarget.latitude,
            selectedTarget.longitude
        );
        
        const distanceDisplay = distance >= 1000 ? `${(distance/1000).toFixed(2)} km` : `${distance.toFixed(0)} m`;
        const distanceValue = document.getElementById('liveDistanceValue');
        const progressFill = document.getElementById('distanceProgressFill');
        const liveMeter = document.getElementById('liveDistanceMeter');
        const feedback = document.getElementById('locationFeedback');
        
        if (!distanceValue || !progressFill) return;
        
        if (liveMeter) liveMeter.style.display = 'block';
        
        distanceValue.textContent = distanceDisplay;
        
        // Calculate percentage for progress bar (0-200m scale)
        let percentage = Math.min((distance / PENDING_DISTANCE) * 100, 100);
        progressFill.style.width = `${percentage}%`;
        
        // Color coding and feedback
        let statusColor = '#ef4444';
        let statusText = '';
        let feedbackMessage = '';
        
        if (distance <= VERIFIED_DISTANCE) {
            statusColor = '#10b981';
            statusText = 'Auto-Verified';
            feedbackMessage = `Excellent! You're at the correct location. Distance: ${distanceDisplay}`;
            progressFill.style.backgroundColor = '#10b981';
            playBeepSound('success');
        } else if (distance <= PENDING_DISTANCE) {
            statusColor = '#f59e0b';
            statusText = 'Pending Review';
            feedbackMessage = `You're near the location. Distance: ${distanceDisplay}. Move closer for auto-verification.`;
            progressFill.style.backgroundColor = '#f59e0b';
            playBeepSound('warning');
        } else {
            statusColor = '#ef4444';
            statusText = 'Out of Range';
            feedbackMessage = `You're too far! Distance: ${distanceDisplay}. Please move to the correct location.`;
            progressFill.style.backgroundColor = '#ef4444';
            playBeepSound('error');
        }
        
        if (feedback) {
            feedback.innerHTML = `
                <div style="color: ${statusColor};">
                    <i class="fas ${distance <= VERIFIED_DISTANCE ? 'fa-check-circle' : (distance <= PENDING_DISTANCE ? 'fa-exclamation-triangle' : 'fa-times-circle')}"></i>
                    ${feedbackMessage}
                </div>
            `;
        }
        
        // Update check-in button state
        updateCheckInButton();
    }
    
    function drawDistanceCanvas() {
        const canvas = document.getElementById('distanceCanvas');
        if (!canvas || !currentLocation || !selectedTarget) return;
        
        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;
        const ctx = canvas.getContext('2d');
        
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw background
        ctx.fillStyle = '#f8f9fa';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Calculate positions (simple representation)
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        
        // Draw target zone circles
        ctx.beginPath();
        ctx.arc(centerX, centerY, 40, 0, 2 * Math.PI);
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        ctx.beginPath();
        ctx.arc(centerX, centerY, 25, 0, 2 * Math.PI);
        ctx.strokeStyle = '#f59e0b';
        ctx.stroke();
        
        ctx.beginPath();
        ctx.arc(centerX, centerY, 10, 0, 2 * Math.PI);
        ctx.fillStyle = '#ef4444';
        ctx.fill();
        
        // Draw user position (random offset for demo, will be accurate in real)
        const distance = calculateDistance(
            currentLocation.latitude,
            currentLocation.longitude,
            selectedTarget.latitude,
            selectedTarget.longitude
        );
        
        let offsetX = 0, offsetY = 0;
        if (distance <= VERIFIED_DISTANCE) {
            offsetX = (Math.random() - 0.5) * 20;
            offsetY = (Math.random() - 0.5) * 20;
            ctx.fillStyle = '#10b981';
        } else if (distance <= PENDING_DISTANCE) {
            offsetX = (Math.random() - 0.5) * 60;
            offsetY = (Math.random() - 0.5) * 60;
            ctx.fillStyle = '#f59e0b';
        } else {
            offsetX = (Math.random() - 0.5) * 120;
            offsetY = (Math.random() - 0.5) * 120;
            ctx.fillStyle = '#6b7280';
        }
        
        ctx.beginPath();
        ctx.arc(centerX + offsetX, centerY + offsetY, 6, 0, 2 * Math.PI);
        ctx.fill();
        
        // Draw line
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(centerX + offsetX, centerY + offsetY);
        ctx.strokeStyle = '#667eea';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.stroke();
        ctx.setLineDash([]);
    }
    
    // ============================================
    // VOICE FEEDBACK
    // ============================================
    
    function speakFeedback(message, isSuccess = true) {
        if (!audioEnabled) return;
        
        if ('speechSynthesis' in window) {
            // Cancel any ongoing speech
            window.speechSynthesis.cancel();
            
            const utterance = new SpeechSynthesisUtterance(message);
            utterance.rate = 0.9;
            utterance.pitch = isSuccess ? 1.1 : 0.9;
            utterance.volume = 0.8;
            
            // Try to get a natural voice
            const voices = window.speechSynthesis.getVoices();
            const preferredVoice = voices.find(v => v.lang === 'en-US' && v.name.includes('Google'));
            if (preferredVoice) utterance.voice = preferredVoice;
            
            window.speechSynthesis.speak(utterance);
        }
    }
    
    function playBeepSound(type) {
        if (!audioEnabled) return;
        
        try {
            if (!audioContext) {
                audioContext = new (window.AudioContext || window.webkitAudioContext)();
            }
            
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.type = 'sine';
            
            if (type === 'success') {
                oscillator.frequency.value = 880;
                gainNode.gain.value = 0.3;
                oscillator.start();
                setTimeout(() => {
                    oscillator.stop();
                    gainNode.gain.exponentialRampToValueAtTime(0.00001, audioContext.currentTime + 0.5);
                }, 200);
            } else if (type === 'warning') {
                oscillator.frequency.value = 660;
                gainNode.gain.value = 0.2;
                oscillator.start();
                setTimeout(() => {
                    oscillator.stop();
                    gainNode.gain.exponentialRampToValueAtTime(0.00001, audioContext.currentTime + 0.3);
                }, 150);
            } else if (type === 'error') {
                oscillator.frequency.value = 440;
                gainNode.gain.value = 0.2;
                oscillator.start();
                setTimeout(() => {
                    oscillator.stop();
                    gainNode.gain.exponentialRampToValueAtTime(0.00001, audioContext.currentTime + 0.3);
                }, 100);
            }
        } catch (e) {
            console.log('Audio not supported');
        }
    }
    
    // ============================================
    // ENHANCED CHECK-IN WITH CONFIRMATION
    // ============================================
    
    async function enhancedCheckIn() {
        if (!selectedTarget) {
            showToast('Please select a target first', 'warning');
            return;
        }
        
        if (!currentLocation) {
            showToast('Waiting for GPS signal...', 'warning');
            return;
        }
        
        const distance = calculateDistance(
            currentLocation.latitude,
            currentLocation.longitude,
            selectedTarget.latitude,
            selectedTarget.longitude
        );
        
        // Show confirmation dialog
        const confirmed = await showCheckInConfirmation(distance);
        if (!confirmed) return;
        
        // Proceed with check-in
        await attendanceGeoCheckIn();
    }
    
    function showCheckInConfirmation(distance) {
        return new Promise((resolve) => {
            const distanceDisplay = distance >= 1000 ? `${(distance/1000).toFixed(2)} km` : `${distance.toFixed(0)} m`;
            let statusIcon = '';
            let statusColor = '';
            let statusMessage = '';
            
            if (distance <= VERIFIED_DISTANCE) {
                statusIcon = '✅';
                statusColor = '#10b981';
                statusMessage = 'Will be AUTO-VERIFIED';
            } else if (distance <= PENDING_DISTANCE) {
                statusIcon = '⚠️';
                statusColor = '#f59e0b';
                statusMessage = 'Will be PENDING REVIEW';
            } else {
                statusIcon = '❌';
                statusColor = '#ef4444';
                statusMessage = 'Will be marked ABSENT';
            }
            
            const modalHTML = `
                <div id="confirmModal" class="modal-overlay">
                    <div class="modal-content">
                        <div class="modal-header">
                            <i class="fas fa-fingerprint"></i>
                            <h3>Confirm Check-in</h3>
                        </div>
                        <div class="modal-body">
                            <div class="confirm-details">
                                <div class="detail-row">
                                    <span><i class="fas fa-bullseye"></i> Target:</span>
                                    <strong>${selectedTarget.name}</strong>
                                </div>
                                <div class="detail-row">
                                    <span><i class="fas fa-map-marker-alt"></i> Distance:</span>
                                    <strong style="color: ${statusColor}">${distanceDisplay}</strong>
                                </div>
                                <div class="detail-row">
                                    <span><i class="fas fa-info-circle"></i> Status:</span>
                                    <strong style="color: ${statusColor}">${statusIcon} ${statusMessage}</strong>
                                </div>
                                <div class="detail-row">
                                    <span><i class="fas fa-clock"></i> Time:</span>
                                    <strong>${new Date().toLocaleTimeString()}</strong>
                                </div>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button class="btn-cancel" id="cancelCheckin">Cancel</button>
                            <button class="btn-confirm" id="confirmCheckin">Confirm Check-in</button>
                        </div>
                    </div>
                </div>
            `;
            
            document.body.insertAdjacentHTML('beforeend', modalHTML);
            
            document.getElementById('cancelCheckin').onclick = () => {
                document.getElementById('confirmModal').remove();
                resolve(false);
            };
            
            document.getElementById('confirmCheckin').onclick = () => {
                document.getElementById('confirmModal').remove();
                resolve(true);
            };
        });
    }
    
    function showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast-notification toast-${type}`;
        toast.innerHTML = `
            <i class="fas ${type === 'success' ? 'fa-check-circle' : (type === 'warning' ? 'fa-exclamation-triangle' : 'fa-info-circle')}"></i>
            <span>${message}</span>
        `;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.classList.add('show');
            setTimeout(() => {
                toast.classList.remove('show');
                setTimeout(() => toast.remove(), 300);
            }, 3000);
        }, 100);
    }
    
    // ============================================
    // ATTENDANCE STREAK & BADGES
    // ============================================
    
    async function loadAttendanceStreak() {
        const supabase = window.db?.supabase;
        if (!supabase || !attendanceUserId) return;
        
        // Get last 30 days of attendance
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const { data } = await supabase
            .from('geo_attendance_logs')
            .select('check_in_time, attendance_status')
            .eq('student_id', attendanceUserId)
            .eq('attendance_status', 'Present')
            .gte('check_in_time', thirtyDaysAgo.toISOString());
        
        if (!data) return;
        
        // Calculate streak
        const dates = data.map(d => new Date(d.check_in_time).toDateString());
        const uniqueDates = [...new Set(dates)];
        
        let currentStreak = 0;
        let bestStreak = 0;
        let tempStreak = 0;
        
        // Sort dates and calculate consecutive days
        uniqueDates.sort();
        let lastDate = null;
        
        for (const dateStr of uniqueDates) {
            const currentDate = new Date(dateStr);
            if (lastDate) {
                const diffDays = (currentDate - lastDate) / (1000 * 60 * 60 * 24);
                if (diffDays === 1) {
                    tempStreak++;
                } else {
                    tempStreak = 1;
                }
            } else {
                tempStreak = 1;
            }
            
            currentStreak = tempStreak;
            bestStreak = Math.max(bestStreak, currentStreak);
            lastDate = currentDate;
        }
        
        // Display streak
        const streakHTML = `
            <div class="streak-container">
                <div class="streak-card">
                    <i class="fas fa-fire"></i>
                    <div class="streak-info">
                        <span class="streak-label">Current Streak</span>
                        <span class="streak-value">${currentStreak} days</span>
                    </div>
                </div>
                <div class="streak-card">
                    <i class="fas fa-trophy"></i>
                    <div class="streak-info">
                        <span class="streak-label">Best Streak</span>
                        <span class="streak-value">${bestStreak} days</span>
                    </div>
                </div>
            </div>
        `;
        
        const statsContainer = document.querySelector('.attendance-stats');
        if (statsContainer && !document.querySelector('.streak-container')) {
            statsContainer.insertAdjacentHTML('afterend', streakHTML);
        }
    }
    
    // ============================================
    // CSS STYLES FOR ENHANCED UI
    // ============================================
    
    function addEnhancedStyles() {
        const styles = `
            <style>
                .enhanced-attendance-ui {
                    margin-top: 20px;
                }
                
                .live-distance-meter {
                    background: white;
                    border-radius: 12px;
                    padding: 15px;
                    margin-bottom: 15px;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                }
                
                .meter-header {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 10px;
                    font-weight: 600;
                }
                
                .distance-value {
                    color: #667eea;
                    font-size: 18px;
                }
                
                .progress-container {
                    margin: 10px 0;
                }
                
                .progress-bar-bg {
                    background: #e5e7eb;
                    border-radius: 10px;
                    overflow: hidden;
                    height: 12px;
                }
                
                .progress-fill {
                    height: 100%;
                    transition: width 0.3s ease, background 0.3s ease;
                    border-radius: 10px;
                }
                
                .threshold-markers {
                    display: flex;
                    justify-content: space-between;
                    margin-top: 5px;
                    font-size: 11px;
                }
                
                .threshold.verified { color: #10b981; }
                .threshold.pending { color: #f59e0b; }
                
                .location-feedback {
                    margin-top: 10px;
                    font-size: 13px;
                    padding: 8px;
                    border-radius: 8px;
                    background: #f8f9fa;
                }
                
                .mini-map-container {
                    background: white;
                    border-radius: 12px;
                    margin-bottom: 15px;
                    overflow: hidden;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                }
                
                .map-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 12px 15px;
                    background: #f8f9fa;
                    border-bottom: 1px solid #e5e7eb;
                }
                
                .btn-icon-sm {
                    background: none;
                    border: none;
                    cursor: pointer;
                    color: #667eea;
                    font-size: 14px;
                }
                
                .map-canvas {
                    padding: 15px;
                    text-align: center;
                }
                
                #distanceCanvas {
                    width: 100%;
                    height: auto;
                    border-radius: 8px;
                    background: #f8f9fa;
                }
                
                .map-legend {
                    display: flex;
                    justify-content: center;
                    gap: 15px;
                    margin-top: 10px;
                    font-size: 11px;
                }
                
                .map-legend span span {
                    display: inline-block;
                    width: 12px;
                    height: 12px;
                    border-radius: 50%;
                    margin-right: 4px;
                }
                
                .voice-toggle {
                    text-align: right;
                    margin-bottom: 15px;
                }
                
                .btn-voice {
                    background: #f3f4f6;
                    border: 1px solid #e5e7eb;
                    padding: 6px 12px;
                    border-radius: 20px;
                    font-size: 12px;
                    cursor: pointer;
                    transition: all 0.3s ease;
                }
                
                .btn-voice:hover {
                    background: #e5e7eb;
                }
                
                .modal-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0,0,0,0.5);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 10000;
                }
                
                .modal-content {
                    background: white;
                    border-radius: 16px;
                    width: 90%;
                    max-width: 400px;
                    animation: slideUp 0.3s ease;
                }
                
                @keyframes slideUp {
                    from {
                        transform: translateY(50px);
                        opacity: 0;
                    }
                    to {
                        transform: translateY(0);
                        opacity: 1;
                    }
                }
                
                .modal-header {
                    padding: 20px;
                    background: linear-gradient(135deg, #667eea, #764ba2);
                    color: white;
                    border-radius: 16px 16px 0 0;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }
                
                .modal-body {
                    padding: 20px;
                }
                
                .confirm-details {
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                }
                
                .detail-row {
                    display: flex;
                    justify-content: space-between;
                    padding: 8px 0;
                    border-bottom: 1px solid #e5e7eb;
                }
                
                .modal-footer {
                    padding: 20px;
                    display: flex;
                    gap: 10px;
                    justify-content: flex-end;
                    border-top: 1px solid #e5e7eb;
                }
                
                .btn-cancel, .btn-confirm {
                    padding: 10px 20px;
                    border: none;
                    border-radius: 8px;
                    cursor: pointer;
                    font-weight: 600;
                }
                
                .btn-cancel {
                    background: #f3f4f6;
                    color: #374151;
                }
                
                .btn-confirm {
                    background: #10b981;
                    color: white;
                }
                
                .toast-notification {
                    position: fixed;
                    bottom: 20px;
                    left: 50%;
                    transform: translateX(-50%) translateY(100px);
                    background: white;
                    padding: 12px 20px;
                    border-radius: 40px;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    z-index: 10001;
                    transition: transform 0.3s ease;
                }
                
                .toast-notification.show {
                    transform: translateX(-50%) translateY(0);
                }
                
                .toast-success { border-left: 4px solid #10b981; }
                .toast-warning { border-left: 4px solid #f59e0b; }
                .toast-info { border-left: 4px solid #3b82f6; }
                
                .streak-container {
                    display: flex;
                    gap: 15px;
                    margin: 15px 0;
                }
                
                .streak-card {
                    flex: 1;
                    background: linear-gradient(135deg, #667eea, #764ba2);
                    color: white;
                    padding: 15px;
                    border-radius: 12px;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }
                
                .streak-card i {
                    font-size: 24px;
                }
                
                .streak-info {
                    display: flex;
                    flex-direction: column;
                }
                
                .streak-label {
                    font-size: 11px;
                    opacity: 0.8;
                }
                
                .streak-value {
                    font-size: 20px;
                    font-weight: bold;
                }
            </style>
        `;
        
        document.head.insertAdjacentHTML('beforeend', styles);
    }
    
    // ============================================
    // INITIALIZATION
    // ============================================
    
    function initializeEnhancedAttendance() {
        console.log('🎯 Initializing Enhanced Student Check-in System...');
        
        addEnhancedStyles();
        addEnhancedUI();
        startLiveTracking();
        
        // Override check-in button
        const checkInBtn = document.getElementById('check-in-button');
        if (checkInBtn) {
            const originalClick = checkInBtn.onclick;
            checkInBtn.onclick = (e) => {
                e.preventDefault();
                enhancedCheckIn();
            };
        }
        
        // Load streak data
        setTimeout(() => {
            if (attendanceUserId) {
                loadAttendanceStreak();
            }
        }, 2000);
        
        console.log('✅ Enhanced Attendance System Ready!');
    }
    
    // Start when ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeEnhancedAttendance);
    } else {
        setTimeout(initializeEnhancedAttendance, 1000);
    }
    
    // Export functions
    window.enhancedAttendance = {
        speakFeedback,
        showToast,
        loadAttendanceStreak
    };
    
})();
