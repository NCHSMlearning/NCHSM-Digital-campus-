// attendance.js - FIXED FOR IMMEDIATE BUTTON ENABLEMENT
(function() {
    'use strict';
    
    let attendanceCachedClinicalAreas = [];
    let attendanceCachedCourses = [];
    let attendanceUserId = null;
    let attendanceUserProfile = null;
    let currentLocation = null;
    let locationWatchId = null;
    let locationRetryCount = 0;
    const MAX_LOCATION_RETRIES = 3;
    
    // Initialize attendance system
    function initializeAttendanceSystem() {
        console.log('📱 Initializing Attendance System...');
        
        // Cache DOM elements
        const sessionTypeSelect = document.getElementById('session-type');
        const checkInButton = document.getElementById('check-in-button');
        const attendanceTab = document.querySelector('.nav a[data-tab="attendance"]');
        const historyFilter = document.getElementById('history-filter');
        const refreshHistoryBtn = document.getElementById('refresh-history');
        
        // Set up event listeners
        if (attendanceTab) {
            attendanceTab.addEventListener('click', () => {
                loadAttendanceData();
                startLocationMonitoring();
            });
        }
        
        if (sessionTypeSelect) {
            sessionTypeSelect.addEventListener('change', handleSessionTypeChange);
        }
        
        if (checkInButton) {
            checkInButton.addEventListener('click', attendanceGeoCheckIn);
        }
        
        if (historyFilter) {
            historyFilter.addEventListener('change', () => {
                loadGeoAttendanceHistory(historyFilter.value);
            });
        }
        
        if (refreshHistoryBtn) {
            refreshHistoryBtn.addEventListener('click', () => {
                loadGeoAttendanceHistory(historyFilter?.value || 'today');
            });
        }
        
        // Initialize time display
        updateTimeDisplay();
        setInterval(updateTimeDisplay, 60000);
        
        // Start location monitoring immediately
        startLocationMonitoring();
        
        // Load data if already on attendance tab
        if (window.location.hash === '#attendance' || 
            document.querySelector('.tab-content#attendance').style.display === 'block') {
            loadAttendanceData();
        }
        
        console.log('✅ Attendance System initialized');
    }
    
    // Update current time display
    function updateTimeDisplay() {
        const currentTimeElement = document.getElementById('current-time');
        if (currentTimeElement) {
            const now = new Date();
            currentTimeElement.textContent = now.toLocaleTimeString('en-US', { 
                hour: '2-digit', 
                minute: '2-digit',
                hour12: true 
            });
        }
    }
    
    // Handle session type change
    function handleSessionTypeChange() {
        const sessionTypeSelect = document.getElementById('session-type');
        const targetControlGroup = document.getElementById('target-control-group');
        const targetSelect = document.getElementById('attendance-target');
        const targetText = document.getElementById('target-text');
        
        if (!sessionTypeSelect || !targetControlGroup || !targetSelect) return;
        
        const sessionType = sessionTypeSelect.value;
        console.log('Session type changed to:', sessionType);
        
        // Show/hide target group
        if (sessionType) {
            targetControlGroup.style.display = 'flex';
            targetSelect.disabled = false;
            
            // Update label based on session type
            let label = 'Select:';
            switch(sessionType) {
                case 'clinical':
                    label = 'Clinical Department:';
                    break;
                case 'class':
                    label = 'Course:';
                    break;
                case 'lab':
                    label = 'Laboratory:';
                    break;
                case 'tutorial':
                    label = 'Tutorial Room:';
                    break;
                default:
                    label = 'Target:';
            }
            
            if (targetText) {
                targetText.textContent = label;
            }
            
            // Populate options based on session type
            populateTargetOptions(sessionType);
            updateRequirement('session', true);
        } else {
            targetControlGroup.style.display = 'none';
            targetSelect.disabled = true;
            updateRequirement('session', false);
            updateRequirement('target', false);
        }
        
        updateCheckInButton();
    }
    
    // Populate target options
    async function populateTargetOptions(sessionType) {
        const targetSelect = document.getElementById('attendance-target');
        if (!targetSelect) return;
        
        // Clear existing options
        targetSelect.innerHTML = '<option value="">Loading options...</option>';
        targetSelect.disabled = true;
        
        let options = [];
        let errorMessage = '';
        
        try {
            if (sessionType === 'clinical') {
                // Ensure clinical areas are loaded
                if (attendanceCachedClinicalAreas.length === 0) {
                    await loadClinicalTargets();
                }
                options = attendanceCachedClinicalAreas;
                
                if (options.length === 0) {
                    errorMessage = 'No clinical areas found for your program/block';
                }
            } else if (['class', 'lab', 'tutorial'].includes(sessionType)) {
                // Get courses with better accuracy
                options = await getActiveCoursesWithRetry(2); // Reduced retries for speed
                
                if (options.length === 0) {
                    errorMessage = 'No active courses found. Please refresh or contact support.';
                }
            }
        } catch (error) {
            console.error('Error loading targets:', error);
            errorMessage = 'Failed to load options. Please try again.';
        }
        
        // If no options, show message
        if (options.length === 0 || errorMessage) {
            targetSelect.innerHTML = `<option value="">${errorMessage || 'No options available'}</option>`;
            targetSelect.disabled = true;
            updateRequirement('target', false);
            return;
        }
        
        // Populate options with better formatting
        targetSelect.innerHTML = '<option value="">Select target...</option>';
        
        options.forEach(option => {
            const opt = document.createElement('option');
            
            // Format display text based on session type
            let displayText = option.name || option.course_name || option.unit_name || 'Unnamed';
            
            if (sessionType === 'clinical') {
                opt.value = `${option.id}|${option.name}`;
                opt.textContent = displayText;
            } else {
                // For courses
                let prefix = '';
                if (option.unit_code) {
                    prefix = `${option.unit_code} - `;
                } else if (option.code) {
                    prefix = `${option.code} - `;
                }
                
                displayText = prefix + displayText;
                
                // Add credits if available for class sessions
                if (sessionType === 'class' && option.credits) {
                    displayText += ` (${option.credits} credits)`;
                }
                
                opt.value = `${option.id}|${displayText}`;
                opt.textContent = displayText;
            }
            
            targetSelect.appendChild(opt);
        });
        
        targetSelect.disabled = false;
        updateRequirement('target', false);
        
        // IMPORTANT: Trigger change event to update button state immediately
        targetSelect.addEventListener('change', () => {
            updateRequirement('target', targetSelect.value && targetSelect.value !== '');
            updateCheckInButton();
        });
    }
    
    // Get active courses with retry mechanism
    async function getActiveCoursesWithRetry(maxRetries = 2) {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                let courses = [];
                
                // Check multiple sources in order of reliability
                if (window.coursesModule?.getActiveCourses) {
                    courses = await window.coursesModule.getActiveCourses();
                } else if (window.coursesModule?.activeCourses) {
                    courses = window.coursesModule.activeCourses;
                } else if (window.cachedCourses) {
                    courses = window.cachedCourses.filter(course => 
                        !course.isCompleted && course.status !== 'Completed'
                    );
                }
                
                if (courses && courses.length > 0) {
                    console.log(`✅ Found ${courses.length} active courses on attempt ${attempt}`);
                    attendanceCachedCourses = courses;
                    return courses;
                }
                
                // If no courses found and we're not on the last attempt, wait and try again
                if (attempt < maxRetries) {
                    console.log(`Attempt ${attempt} failed, retrying in 500ms...`);
                    await new Promise(resolve => setTimeout(resolve, 500)); // Faster retry
                }
            } catch (error) {
                console.error(`Attempt ${attempt} failed:`, error);
                if (attempt < maxRetries) {
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
            }
        }
        
        console.warn('⚠️ No courses found after all retry attempts');
        return [];
    }
    
    // Update requirement status
    function updateRequirement(type, isValid) {
        const reqElement = document.getElementById(`req-${type}`);
        if (!reqElement) return;
        
        const icon = reqElement.querySelector('.req-icon');
        if (icon) {
            icon.className = `fas ${isValid ? 'fa-check' : 'fa-times'} req-icon`;
            reqElement.style.color = isValid ? '#22c55e' : '#ef4444';
        }
    }
    
    // Update check-in button state - FIXED VERSION
    function updateCheckInButton() {
        const checkInButton = document.getElementById('check-in-button');
        const sessionTypeSelect = document.getElementById('session-type');
        const targetSelect = document.getElementById('attendance-target');
        
        if (!checkInButton) return;
        
        const hasSession = sessionTypeSelect?.value;
        const hasTarget = targetSelect?.value && targetSelect.value !== '';
        const hasLocation = currentLocation !== null; // Removed accuracy requirement
        
        const allRequirementsMet = hasSession && hasTarget && hasLocation;
        
        checkInButton.disabled = !allRequirementsMet;
        
        // Update button text
        const btnSubtext = checkInButton.querySelector('.btn-subtext');
        if (btnSubtext) {
            if (!hasLocation) {
                btnSubtext.textContent = 'Waiting for GPS...';
            } else if (!hasSession || !hasTarget) {
                btnSubtext.textContent = 'Select session type and target';
            } else {
                // Show accuracy info but don't block check-in
                if (currentLocation.accuracy < 20) {
                    btnSubtext.textContent = `High accuracy (${currentLocation.accuracy.toFixed(0)}m)`;
                } else if (currentLocation.accuracy < 50) {
                    btnSubtext.textContent = `Good accuracy (${currentLocation.accuracy.toFixed(0)}m)`;
                } else if (currentLocation.accuracy < 100) {
                    btnSubtext.textContent = `Fair accuracy (${currentLocation.accuracy.toFixed(0)}m)`;
                } else {
                    btnSubtext.textContent = `Low accuracy (${currentLocation.accuracy.toFixed(0)}m) - may affect verification`;
                }
            }
        }
        
        // Update button style
        if (allRequirementsMet) {
            if (currentLocation && currentLocation.accuracy < 50) {
                checkInButton.className = 'btn-checkin ready';
            } else if (currentLocation && currentLocation.accuracy <= 100) {
                checkInButton.className = 'btn-checkin warning';
            } else {
                checkInButton.className = 'btn-checkin';
            }
        } else {
            checkInButton.className = 'btn-checkin';
        }
        
        // Update requirements list
        updateRequirement('session', hasSession);
        updateRequirement('target', hasTarget);
        updateRequirement('location', hasLocation);
    }
    
    // Start location monitoring with improved accuracy
    function startLocationMonitoring() {
        if (!navigator.geolocation) {
            console.warn('Geolocation not supported');
            updateGPSStatus('error', 'Geolocation not supported');
            return;
        }
        
        // Clear any existing watcher
        if (locationWatchId) {
            navigator.geolocation.clearWatch(locationWatchId);
        }
        
        updateGPSStatus('loading', 'Getting location...');
        locationRetryCount = 0;
        
        // Use less strict options for faster acquisition
        const options = {
            enableHighAccuracy: true,
            timeout: 10000, // Reduced timeout
            maximumAge: 30000 // Accept location up to 30 seconds old
        };
        
        // Get initial position with retry on failure
        navigator.geolocation.getCurrentPosition(
            (position) => {
                handleLocationSuccess(position);
                // Start watching after initial success
                locationWatchId = navigator.geolocation.watchPosition(
                    (pos) => handleLocationSuccess(pos),
                    handleLocationError,
                    options
                );
            },
            (error) => {
                handleLocationError(error);
                // Still try to watch even if initial fails
                locationWatchId = navigator.geolocation.watchPosition(
                    (pos) => handleLocationSuccess(pos),
                    handleLocationError,
                    { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 }
                );
            },
            options
        );
    }
    
    function handleLocationSuccess(position) {
        if (!position || !position.coords) {
            console.error('Invalid position data received');
            return;
        }
        
        const newLocation = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            altitude: position.coords.altitude,
            altitudeAccuracy: position.coords.altitudeAccuracy,
            heading: position.coords.heading,
            speed: position.coords.speed,
            timestamp: new Date(position.timestamp)
        };
        
        // Validate coordinates
        if (!isValidCoordinates(newLocation.latitude, newLocation.longitude)) {
            console.warn('Invalid coordinates received');
            return;
        }
        
        // Always update on first location or if accuracy improved
        if (!currentLocation || newLocation.accuracy < currentLocation.accuracy) {
            currentLocation = newLocation;
            
            console.log('📍 Location updated:', {
                lat: currentLocation.latitude.toFixed(6),
                lon: currentLocation.longitude.toFixed(6),
                accuracy: currentLocation.accuracy.toFixed(1) + 'm'
            });
            
            // Update GPS status
            if (currentLocation.accuracy < 20) {
                updateGPSStatus('success', 'High accuracy GPS');
            } else if (currentLocation.accuracy < 50) {
                updateGPSStatus('success', 'Good accuracy GPS');
            } else if (currentLocation.accuracy < 100) {
                updateGPSStatus('success', 'Fair accuracy GPS');
            } else {
                updateGPSStatus('success', 'GPS active (low accuracy)');
            }
            
            updateLocationDisplay();
            updateCheckInButton(); // IMPORTANT: Update button immediately
        }
    }
    
    function isValidCoordinates(lat, lon) {
        return lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
    }
    
    function calculateDistance(loc1, loc2) {
        const R = 6371000;
        const toRad = (x) => (x * Math.PI) / 180;
        
        const dLat = toRad(loc2.latitude - loc1.latitude);
        const dLon = toRad(loc2.longitude - loc1.longitude);
        const radLat1 = toRad(loc1.latitude);
        const radLat2 = toRad(loc2.latitude);
        
        const a = Math.sin(dLat / 2) ** 2 +
                Math.cos(radLat1) * Math.cos(radLat2) *
                Math.sin(dLon / 2) ** 2;
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }
    
    function handleLocationError(error) {
        console.warn('GPS error:', error.message);
        
        let message = '';
        switch(error.code) {
            case error.PERMISSION_DENIED:
                message = 'GPS permission denied';
                break;
            case error.POSITION_UNAVAILABLE:
                message = 'Location unavailable';
                break;
            case error.TIMEOUT:
                message = 'Location request timeout';
                break;
            default:
                message = 'GPS error';
        }
        
        updateGPSStatus('error', message);
        updateRequirement('location', false);
        updateCheckInButton();
    }
    
    function updateGPSStatus(status, message) {
        const gpsStatus = document.getElementById('gps-status');
        if (!gpsStatus) return;
        
        let icon = '';
        switch(status) {
            case 'success':
                icon = '<i class="fas fa-check-circle"></i>';
                gpsStatus.style.color = '#22c55e';
                break;
            case 'error':
                icon = '<i class="fas fa-exclamation-triangle"></i>';
                gpsStatus.style.color = '#ef4444';
                break;
            default:
                icon = '<i class="fas fa-spinner fa-spin"></i>';
                gpsStatus.style.color = '#f59e0b';
        }
        
        gpsStatus.innerHTML = `${icon} <span>${message}</span>`;
    }
    
    function updateLocationDisplay() {
        if (!currentLocation) return;
        
        const latElement = document.getElementById('latitude');
        const lonElement = document.getElementById('longitude');
        const accuracyElement = document.getElementById('accuracy-value');
        const accuracyDot = document.querySelector('.accuracy-dot');
        
        if (latElement) latElement.textContent = currentLocation.latitude.toFixed(6);
        if (lonElement) lonElement.textContent = currentLocation.longitude.toFixed(6);
        if (accuracyElement) accuracyElement.textContent = currentLocation.accuracy.toFixed(1);
        
        // Update accuracy dot color
        if (accuracyDot) {
            accuracyDot.className = 'accuracy-dot';
            if (currentLocation.accuracy <= 15) {
                accuracyDot.classList.add('high');
            } else if (currentLocation.accuracy <= 35) {
                accuracyDot.classList.add('medium');
            } else if (currentLocation.accuracy <= 70) {
                accuracyDot.classList.add('fair');
            } else {
                accuracyDot.classList.add('low');
            }
        }
    }
    
    // Load attendance data
    async function loadAttendanceData() {
        console.log('📱 Loading attendance data...');
        
        try {
            // Get user profile
            attendanceUserProfile = window.db?.currentUserProfile;
            attendanceUserId = window.db?.currentUserId;
            
            if (!attendanceUserProfile || !attendanceUserId) {
                throw new Error('User not logged in');
            }
            
            // Load clinical areas
            await loadClinicalTargets();
            
            // Load today's attendance count
            await loadTodayAttendanceCount();
            
            // Load attendance history
            await loadGeoAttendanceHistory('today');
            
            console.log('✅ Attendance data loaded');
            
        } catch (error) {
            console.error('Failed to load attendance data:', error);
        }
    }
    
    // Load clinical targets
    async function loadClinicalTargets() {
        try {
            const supabaseClient = window.db?.supabase;
            if (!supabaseClient || !attendanceUserProfile) return;
            
            const program = attendanceUserProfile?.program;
            const intakeYear = attendanceUserProfile?.intake_year;
            const block = attendanceUserProfile?.block;
            
            if (!program || !intakeYear) return;
            
            // Build query matching your schema
            let query = supabaseClient
                .from('clinical_areas')
                .select('id, name, latitude, longitude, radius_m')
                .or(`program.ilike.${program},program.is.null`);
            
            if (intakeYear) {
                query = query.or(`intake_year.ilike.${intakeYear},intake_year.is.null`);
            }
            
            if (block) {
                query = query.or(`block.ilike.${block},block.is.null`);
            }
            
            query = query.order('name');
            
            const { data, error } = await query;
            
            if (!error && data) {
                attendanceCachedClinicalAreas = data.map(area => ({
                    id: area.id,
                    name: area.name,
                    latitude: area.latitude,
                    longitude: area.longitude,
                    radius: area.radius_m || 100
                }));
                console.log(`✅ Loaded ${attendanceCachedClinicalAreas.length} clinical areas`);
            } else if (error) {
                console.error('Database error loading clinical areas:', error);
            }
            
        } catch (error) {
            console.error('Error loading clinical areas:', error);
            attendanceCachedClinicalAreas = [];
        }
    }
    
    // Load today's attendance count
    async function loadTodayAttendanceCount() {
        const presentTodayElement = document.getElementById('present-today');
        if (!presentTodayElement || !attendanceUserId) return;
        
        try {
            const supabaseClient = window.db?.supabase;
            if (!supabaseClient) return;
            
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            
            const { count, error } = await supabaseClient
                .from('geo_attendance_logs')
                .select('*', { count: 'exact', head: true })
                .eq('student_id', attendanceUserId)
                .gte('check_in_time', today.toISOString())
                .lt('check_in_time', tomorrow.toISOString());
            
            if (!error) {
                presentTodayElement.textContent = count || 0;
            }
        } catch (error) {
            console.error('Error loading today attendance count:', error);
        }
    }
    
    // Load attendance history
    async function loadGeoAttendanceHistory(filter = 'today') {
        const tableBody = document.getElementById('geo-attendance-history');
        if (!tableBody || !attendanceUserId) {
            console.log('No table body or user ID for history');
            return;
        }
        
        // Show loading state
        tableBody.innerHTML = `
            <tr class="loading-row">
                <td colspan="6">
                    <div class="loading-content">
                        <div class="loading-spinner"></div>
                        <p>Loading attendance history...</p>
                    </div>
                </td>
            </tr>
        `;
        
        try {
            const supabaseClient = window.db?.supabase;
            if (!supabaseClient) {
                throw new Error('Database not available');
            }
            
            let query = supabaseClient
                .from('geo_attendance_logs')
                .select('*')
                .eq('student_id', attendanceUserId)
                .order('check_in_time', { ascending: false })
                .limit(50);
            
            // Apply date filter
            const now = new Date();
            if (filter === 'today') {
                const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                query = query.gte('check_in_time', today.toISOString());
            } else if (filter === 'week') {
                const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                query = query.gte('check_in_time', weekAgo.toISOString());
            } else if (filter === 'month') {
                const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                query = query.gte('check_in_time', monthAgo.toISOString());
            }
            
            const { data: logs, error } = await query;
            
            if (error) throw error;
            
            tableBody.innerHTML = '';
            
            if (!logs || logs.length === 0) {
                tableBody.innerHTML = `
                    <tr>
                        <td colspan="6" class="text-center py-4">
                            <i class="fas fa-history fa-2x text-gray-300 mb-2"></i>
                            <p class="text-gray-500">No check-in history found</p>
                        </td>
                    </tr>
                `;
                return;
            }
            
            logs.forEach(log => {
                const time = new Date(log.check_in_time);
                const timeStr = time.toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });
                
                // Format session type
                let sessionTypeDisplay = log.session_type || 'N/A';
                if (sessionTypeDisplay === 'Class') {
                    sessionTypeDisplay = '📚 Class';
                } else if (sessionTypeDisplay === 'Clinical') {
                    sessionTypeDisplay = '🏥 Clinical';
                } else if (sessionTypeDisplay === 'Lab') {
                    sessionTypeDisplay = '🔬 Lab';
                } else if (sessionTypeDisplay === 'Tutorial') {
                    sessionTypeDisplay = '💬 Tutorial';
                }
                
                // Status column
                const isVerified = log.is_verified || false;
                const statusIcon = isVerified ? 'fa-check-circle' : 'fa-clock';
                const statusColor = isVerified ? 'text-green-600' : 'text-yellow-600';
                const statusText = isVerified ? 'Verified' : 'Pending';
                
                // Location column
                const locationIcon = isVerified ? 'fa-check-circle' : 'fa-exclamation-triangle';
                const locationColor = isVerified ? 'text-green-600' : 'text-yellow-600';
                const locationText = isVerified ? 'On-site' : 'Remote';
                
                // Details column
                let detailsText = '';
                if (log.accuracy_m) {
                    detailsText += `Accuracy: ${parseFloat(log.accuracy_m).toFixed(0)}m`;
                }
                
                if (log.distance_meters && !isVerified) {
                    if (detailsText) detailsText += '<br>';
                    detailsText += `Distance: ${parseFloat(log.distance_meters).toFixed(0)}m`;
                }
                
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${timeStr}</td>
                    <td>${sessionTypeDisplay}</td>
                    <td>${log.target_name || 'N/A'}</td>
                    <td class="${statusColor}">
                        <i class="fas ${statusIcon}"></i> ${statusText}
                    </td>
                    <td class="${locationColor}">
                        <i class="fas ${locationIcon}"></i> ${locationText}
                    </td>
                    <td>${detailsText || '-'}</td>
                `;
                tableBody.appendChild(row);
            });
            
        } catch (error) {
            console.error('Failed to load attendance history:', error);
            tableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center text-red-600 py-4">
                        <i class="fas fa-exclamation-triangle"></i> Error loading history
                    </td>
                </tr>
            `;
        }
    }
    
    // Get device ID
    function getAttendanceDeviceId() {
        let deviceId = localStorage.getItem('attendance_device_id');
        if (!deviceId) {
            const time = Date.now();
            const random = Math.random().toString(36).substr(2, 9);
            deviceId = `web-${time}-${random}`;
            localStorage.setItem('attendance_device_id', deviceId);
        }
        return deviceId;
    }
    
    // Calculate distance between two points
    function calculateAttendanceDistance(lat1, lon1, lat2, lon2) {
        const R = 6371000;
        
        const toRad = (x) => (x * Math.PI) / 180;
        const φ1 = toRad(lat1);
        const φ2 = toRad(lat2);
        const Δφ = toRad(lat2 - lat1);
        const Δλ = toRad(lon2 - lon1);
        
        const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
                  Math.cos(φ1) * Math.cos(φ2) *
                  Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        
        const distance = R * c;
        
        console.log(`📏 Distance: ${distance.toFixed(2)} meters`);
        
        return distance;
    }
    
    // Check-in function - WITH WARNING FOR LOW ACCURACY
    async function attendanceGeoCheckIn() {
        console.log('📍 Starting check-in...');
        
        const button = document.getElementById('check-in-button');
        const sessionTypeSelect = document.getElementById('session-type');
        const targetSelect = document.getElementById('attendance-target');
        
        if (!button || !sessionTypeSelect || !targetSelect) return;
        
        // Warn about low accuracy but don't block
        if (currentLocation && currentLocation.accuracy > 100) {
            const proceed = confirm(`Warning: GPS accuracy is low (${currentLocation.accuracy.toFixed(0)}m). This may affect verification. Proceed anyway?`);
            if (!proceed) {
                return;
            }
        }
        
        // Disable button
        button.disabled = true;
        const originalHTML = button.innerHTML;
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Checking in...';
        
        try {
            // Validate inputs
            if (!sessionTypeSelect.value) {
                throw new Error('Please select session type');
            }
            
            if (!targetSelect.value || targetSelect.value === '') {
                throw new Error('Please select target');
            }
            
            if (!currentLocation) {
                throw new Error('Location not available');
            }
            
            // Parse target
            const [targetId, targetName] = targetSelect.value.split('|');
            
            // Find target coordinates
            const sessionType = sessionTypeSelect.value;
            let targetLat = -1.2921;
            let targetLon = 36.8219;
            let targetRadius = 100;
            let courseId = null;
            
            if (sessionType === 'clinical') {
                const target = attendanceCachedClinicalAreas.find(t => t.id === targetId);
                if (target) {
                    targetLat = target.latitude;
                    targetLon = target.longitude;
                    targetRadius = target.radius || 100;
                }
            } else {
                // Try to find course
                const targetCourse = attendanceCachedCourses.find(c => c.id === targetId);
                if (targetCourse) {
                    courseId = targetCourse.id;
                }
                targetRadius = 150; // Larger radius for campus areas
            }
            
            // Calculate distance
            const distance = calculateAttendanceDistance(
                currentLocation.latitude,
                currentLocation.longitude,
                targetLat,
                targetLon
            );
            
            // Verify if within target radius (with leniency for poor accuracy)
            const isVerified = distance <= (targetRadius + Math.min(currentLocation.accuracy, 50));
            
            console.log(`📍 Check-in details:`, {
                distance: `${distance.toFixed(0)}m`,
                radius: `${targetRadius}m`,
                verified: isVerified,
                accuracy: `${currentLocation.accuracy.toFixed(0)}m`
            });
            
            // Prepare data
            const supabaseClient = window.db?.supabase;
            if (!supabaseClient) {
                throw new Error('Database connection error');
            }
            
            const checkInData = {
                student_id: attendanceUserId,
                session_type: sessionType.charAt(0).toUpperCase() + sessionType.slice(1),
                check_in_time: new Date().toISOString(),
                latitude: currentLocation.latitude,
                longitude: currentLocation.longitude,
                accuracy_m: currentLocation.accuracy,
                accuracy_meters: currentLocation.accuracy,
                is_verified: isVerified,
                device_id: getAttendanceDeviceId(),
                target_id: targetId,
                target_name: targetName,
                target_latitude: targetLat,
                target_longitude: targetLon,
                distance_meters: distance,
                location_age_seconds: Math.round((Date.now() - currentLocation.timestamp.getTime()) / 1000),
                student_name: attendanceUserProfile?.full_name || 'Unknown',
                student_email: attendanceUserProfile?.email || '',
                program: attendanceUserProfile?.program || '',
                intake_year: attendanceUserProfile?.intake_year || '',
                block: attendanceUserProfile?.block || '',
                role: 'student',
                user_role: 'student',
                status: isVerified ? 'verified' : 'pending',
                course_id: courseId,
                is_manual_entry: false
            };
            
            const { error } = await supabaseClient
                .from('geo_attendance_logs')
                .insert([checkInData]);
            
            if (error) throw error;
            
            // Success
            console.log('✅ Check-in successful');
            
            // Show success message
            if (window.AppUtils?.showToast) {
                let message = '';
                if (isVerified) {
                    message = `✅ Checked in to ${targetName} successfully!`;
                } else {
                    message = `📍 Checked in to ${targetName} (${distance.toFixed(0)}m away)`;
                }
                window.AppUtils.showToast(message, isVerified ? 'success' : 'warning');
            }
            
            // Update today's count
            await loadTodayAttendanceCount();
            
            // Reset form
            sessionTypeSelect.value = '';
            targetSelect.value = '';
            handleSessionTypeChange();
            
            // Refresh history
            await loadGeoAttendanceHistory('today');
            
        } catch (error) {
            console.error('❌ Check-in failed:', error);
            
            // Show error message
            if (window.AppUtils?.showToast) {
                window.AppUtils.showToast(error.message, 'error');
            }
        } finally {
            // Restore button
            button.disabled = false;
            button.innerHTML = originalHTML;
        }
    }
    
    // Add CSS for attendance system
    const style = document.createElement('style');
    style.textContent = `
        .accuracy-dot {
            width: 10px;
            height: 10px;
            border-radius: 50%;
            display: inline-block;
            margin-right: 5px;
        }
        .accuracy-dot.high { background-color: #22c55e; }
        .accuracy-dot.medium { background-color: #f59e0b; }
        .accuracy-dot.fair { background-color: #f97316; }
        .accuracy-dot.low { background-color: #ef4444; }
        
        .req-icon {
            margin-right: 5px;
            font-size: 0.9em;
        }
        
        #check-in-button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
        
        #check-in-button:not(:disabled):hover {
            transform: translateY(-2px);
            transition: transform 0.2s;
        }
        
        #check-in-button.ready {
            background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
        }
        
        #check-in-button.warning {
            background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
        }
        
        .loading-spinner {
            width: 30px;
            height: 30px;
            border: 3px solid #f3f3f3;
            border-top: 3px solid var(--color-primary);
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto;
        }
        
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        
        .text-green-600 { color: #16a34a; }
        .text-yellow-600 { color: #ca8a04; }
        .text-red-600 { color: #dc2626; }
        .text-gray-300 { color: #d1d5db; }
        .text-gray-500 { color: #6b7280; }
        
        .text-center { text-align: center; }
        .py-4 { padding-top: 1rem; padding-bottom: 1rem; }
        .mb-2 { margin-bottom: 0.5rem; }
        
        /* Improved table styles */
        .attendance-table td {
            padding: 12px 8px;
            vertical-align: middle;
        }
        
        .attendance-table tr:hover {
            background-color: #f8fafc;
        }
        
        .loading-content {
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 20px;
            gap: 10px;
        }
    `;
    document.head.appendChild(style);
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeAttendanceSystem);
    } else {
        initializeAttendanceSystem();
    }
    
    // Make functions available globally
    window.initializeAttendanceSystem = initializeAttendanceSystem;
    window.attendanceGeoCheckIn = attendanceGeoCheckIn;
    window.loadAttendanceData = loadAttendanceData;
    window.loadGeoAttendanceHistory = loadGeoAttendanceHistory;
    
    console.log('✅ FAST BUTTON ENABLEMENT Attendance module loaded');
})();
