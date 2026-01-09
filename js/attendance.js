// attendance.js - COMPLETE FIXED VERSION WITH AUTO COURSE LOADING
(function() {
    'use strict';
    
    let attendanceCachedClinicalAreas = [];
    let attendanceCachedCourses = [];
    let attendanceUserId = null;
    let attendanceUserProfile = null;
    let currentLocation = null;
    let locationWatchId = null;
    let coursesLoaded = false; // Track if courses have been loaded
    
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
            attendanceTab.addEventListener('click', async () => {
                console.log('📊 Attendance tab clicked');
                await loadAttendanceData(); // Load everything
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
            console.log('📊 Already on attendance tab, loading data...');
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
        console.log('📋 Session type changed to:', sessionType);
        
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
    
    // Populate target options - FIXED
    async function populateTargetOptions(sessionType) {
        console.log('🎯 Populating target options for:', sessionType);
        
        const targetSelect = document.getElementById('attendance-target');
        if (!targetSelect) return;
        
        // Clear existing options
        targetSelect.innerHTML = '<option value="">Loading options...</option>';
        targetSelect.disabled = true;
        
        let options = [];
        
        try {
            if (sessionType === 'clinical') {
                // Load clinical areas if not cached
                if (attendanceCachedClinicalAreas.length === 0) {
                    await loadClinicalTargets();
                }
                options = attendanceCachedClinicalAreas;
                
                if (options.length === 0) {
                    targetSelect.innerHTML = '<option value="">No clinical areas available</option>';
                    return;
                }
            } else if (['class', 'lab', 'tutorial'].includes(sessionType)) {
                // Load courses if not already loaded
                if (!coursesLoaded || attendanceCachedCourses.length === 0) {
                    console.log('📚 Loading courses for attendance...');
                    options = await loadCoursesForAttendance();
                    coursesLoaded = true;
                } else {
                    options = attendanceCachedCourses;
                }
                
                if (options.length === 0) {
                    targetSelect.innerHTML = '<option value="">No active courses found</option>';
                    return;
                }
            }
        } catch (error) {
            console.error('❌ Error loading targets:', error);
            targetSelect.innerHTML = '<option value="">Error loading options</option>';
            return;
        }
        
        // Populate options
        targetSelect.innerHTML = '<option value="">Select target...</option>';
        
        options.forEach(option => {
            const opt = document.createElement('option');
            
            if (sessionType === 'clinical') {
                // Clinical areas
                opt.value = `${option.id}|${option.name}`;
                opt.textContent = option.name || 'Unknown Department';
            } else {
                // Courses - use proper naming
                const courseName = option.course_name || option.name || 'Unknown Course';
                const unitCode = option.unit_code || option.code || '';
                
                let displayText = courseName;
                if (unitCode) {
                    displayText = `${unitCode} - ${courseName}`;
                }
                
                opt.value = `${option.id}|${displayText}`;
                opt.textContent = displayText;
            }
            
            targetSelect.appendChild(opt);
        });
        
        targetSelect.disabled = false;
        updateRequirement('target', false);
        
        // Add change listener to update button state
        targetSelect.addEventListener('change', () => {
            updateRequirement('target', targetSelect.value && targetSelect.value !== '');
            updateCheckInButton();
        });
    }
    
    // NEW FUNCTION: Load courses specifically for attendance
    async function loadCoursesForAttendance() {
        console.log('📖 Loading courses for attendance system...');
        
        if (!attendanceUserProfile) {
            console.error('❌ No user profile available');
            return [];
        }
        
        const supabaseClient = window.db?.supabase;
        if (!supabaseClient) {
            console.error('❌ No Supabase client');
            return [];
        }
        
        const yourProgram = attendanceUserProfile.program;
        const yourIntakeYear = attendanceUserProfile.intake_year;
        const yourBlock = attendanceUserProfile.block;
        
        console.log('🔍 Searching courses for:', {
            program: yourProgram,
            intake_year: yourIntakeYear,
            block: yourBlock
        });
        
        try {
            // Build query
            let query = supabaseClient
                .from('courses')
                .select('id, course_name, name, unit_code, code, status, target_program, intake_year, block')
                .eq('status', 'Active') // Only active courses
                .order('course_name');
            
            // Add filters if available
            if (yourProgram) {
                query = query.or(`target_program.ilike.%${yourProgram}%,target_program.is.null`);
            }
            
            if (yourIntakeYear) {
                query = query.or(`intake_year.eq.${yourIntakeYear},intake_year.is.null`);
            }
            
            if (yourBlock) {
                query = query.or(`block.eq.${yourBlock},block.is.null`);
            }
            
            const { data: courses, error } = await query;
            
            if (error) {
                console.error('❌ Database error:', error);
                throw error;
            }
            
            if (!courses || courses.length === 0) {
                console.warn('⚠️ No courses found in database');
                return [];
            }
            
            console.log(`✅ Found ${courses.length} courses from database`);
            
            // Cache the courses
            attendanceCachedCourses = courses;
            
            // Also update global cache for other modules
            if (!window.cachedCourses) {
                window.cachedCourses = courses;
            }
            
            return courses;
            
        } catch (error) {
            console.error('❌ Failed to load courses:', error);
            return [];
        }
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
    
    // Update check-in button state
    function updateCheckInButton() {
        const checkInButton = document.getElementById('check-in-button');
        const sessionTypeSelect = document.getElementById('session-type');
        const targetSelect = document.getElementById('attendance-target');
        
        if (!checkInButton) return;
        
        const hasSession = sessionTypeSelect?.value;
        const hasTarget = targetSelect?.value && targetSelect.value !== '';
        const hasLocation = currentLocation !== null;
        
        const allRequirementsMet = hasSession && hasTarget && hasLocation;
        
        checkInButton.disabled = !allRequirementsMet;
        
        // Update button text
        const btnSubtext = checkInButton.querySelector('.btn-subtext');
        if (btnSubtext) {
            if (!hasLocation) {
                btnSubtext.textContent = 'GPS location required';
            } else if (!hasSession || !hasTarget) {
                btnSubtext.textContent = 'Complete all fields above';
            } else {
                btnSubtext.textContent = `Ready (${currentLocation.accuracy.toFixed(0)}m accuracy)`;
            }
        }
        
        // Update button style
        if (allRequirementsMet) {
            checkInButton.classList.add('ready');
        } else {
            checkInButton.classList.remove('ready');
        }
        
        // Update requirements list
        updateRequirement('session', hasSession);
        updateRequirement('target', hasTarget);
        updateRequirement('location', hasLocation);
    }
    
    // Start location monitoring
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
        
        const options = {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        };
        
        // Get initial position
        navigator.geolocation.getCurrentPosition(
            (position) => handleLocationSuccess(position),
            (error) => handleLocationError(error),
            options
        );
        
        // Watch for updates
        locationWatchId = navigator.geolocation.watchPosition(
            (position) => handleLocationSuccess(position),
            (error) => handleLocationError(error),
            options
        );
    }
    
    function handleLocationSuccess(position) {
        currentLocation = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: new Date(position.timestamp)
        };
        
        console.log('📍 Location updated:', {
            lat: currentLocation.latitude.toFixed(6),
            lon: currentLocation.longitude.toFixed(6),
            accuracy: currentLocation.accuracy.toFixed(1) + 'm'
        });
        
        updateGPSStatus('success', 'Location active');
        updateLocationDisplay();
        updateCheckInButton();
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
                message = 'Unknown GPS error';
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
            if (currentLocation.accuracy <= 20) {
                accuracyDot.classList.add('high');
            } else if (currentLocation.accuracy <= 50) {
                accuracyDot.classList.add('medium');
            } else {
                accuracyDot.classList.add('low');
            }
        }
    }
    
    // Load attendance data - FIXED
    async function loadAttendanceData() {
        console.log('📱 Loading attendance data...');
        
        try {
            // Get user profile
            attendanceUserProfile = window.db?.currentUserProfile;
            attendanceUserId = window.db?.currentUserId;
            
            if (!attendanceUserProfile || !attendanceUserId) {
                throw new Error('User not logged in');
            }
            
            console.log('👤 User profile loaded:', {
                name: attendanceUserProfile.full_name,
                program: attendanceUserProfile.program,
                intake_year: attendanceUserProfile.intake_year,
                block: attendanceUserProfile.block
            });
            
            // Load clinical areas
            await loadClinicalTargets();
            
            // Load courses for attendance (DOES NOT wait for courses tab)
            await loadCoursesForAttendance();
            coursesLoaded = true;
            
            // Load today's attendance count
            await loadTodayAttendanceCount();
            
            // Load attendance history
            await loadGeoAttendanceHistory('today');
            
            console.log('✅ Attendance data loaded successfully');
            
        } catch (error) {
            console.error('❌ Failed to load attendance data:', error);
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
            
            const { data, error } = await supabaseClient
                .from('clinical_areas')
                .select('id, name, latitude, longitude')
                .ilike('program', program)
                .ilike('intake_year', intakeYear)
                .or(block ? `block.ilike.${block},block.is.null` : 'block.is.null')
                .order('name');
            
            if (!error && data) {
                attendanceCachedClinicalAreas = data.map(area => ({
                    id: area.id,
                    name: area.name,
                    latitude: area.latitude || -1.2921,
                    longitude: area.longitude || 36.8219
                }));
                console.log(`✅ Loaded ${attendanceCachedClinicalAreas.length} clinical areas`);
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
        
        tableBody.innerHTML = '<tr><td colspan="6"><div class="loading-spinner"></div> Loading history...</td></tr>';
        
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
                
                const isVerified = log.is_verified || false;
                const statusIcon = isVerified ? 'fa-check-circle' : 'fa-clock';
                const statusColor = isVerified ? 'text-green-600' : 'text-yellow-600';
                const statusText = isVerified ? 'Verified' : 'Pending';
                
                const locationIcon = isVerified ? 'fa-check-circle' : 'fa-exclamation-triangle';
                const locationColor = isVerified ? 'text-green-600' : 'text-yellow-600';
                const locationText = isVerified ? 'On-site' : 'Remote';
                
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
                    <td>${log.session_type || 'N/A'}</td>
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
            deviceId = 'web-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('attendance_device_id', deviceId);
        }
        return deviceId;
    }
    
    // Calculate distance between two points
    function calculateAttendanceDistance(lat1, lon1, lat2, lon2) {
        const R = 6371000;
        const toRad = (x) => (x * Math.PI) / 180;
        
        const dLat = toRad(lat2 - lat1);
        const dLon = toRad(lon2 - lon1);
        const radLat1 = toRad(lat1);
        const radLat2 = toRad(lat2);
        
        const a = Math.sin(dLat / 2) ** 2 +
                Math.cos(radLat1) * Math.cos(radLat2) *
                Math.sin(dLon / 2) ** 2;
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distanceMeters = R * c;
        
        console.log(`📏 Distance: ${distanceMeters.toFixed(2)} meters`);
        return distanceMeters;
    }
    
    // Check-in function
    async function attendanceGeoCheckIn() {
        console.log('📍 Starting check-in...');
        
        const button = document.getElementById('check-in-button');
        const sessionTypeSelect = document.getElementById('session-type');
        const targetSelect = document.getElementById('attendance-target');
        
        if (!button || !sessionTypeSelect || !targetSelect) return;
        
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
            
            if (sessionType === 'clinical') {
                const target = attendanceCachedClinicalAreas.find(t => t.id === targetId);
                if (target) {
                    targetLat = target.latitude;
                    targetLon = target.longitude;
                }
            }
            
            // Calculate distance
            const distance = calculateAttendanceDistance(
                currentLocation.latitude,
                currentLocation.longitude,
                targetLat,
                targetLon
            );
            
            // Verify if within range (100 meters)
            const isVerified = distance <= 100;
            
            // Save check-in to database
            const supabaseClient = window.db?.supabase;
            if (!supabaseClient) {
                throw new Error('Database connection error');
            }
            
            const checkInData = {
                student_id: attendanceUserId,
                check_in_time: new Date().toISOString(),
                session_type: sessionType.charAt(0).toUpperCase() + sessionType.slice(1),
                target_id: targetId,
                target_name: targetName,
                latitude: currentLocation.latitude,
                longitude: currentLocation.longitude,
                accuracy_m: currentLocation.accuracy,
                is_verified: isVerified,
                device_id: getAttendanceDeviceId(),
                student_name: attendanceUserProfile?.full_name || 'Unknown',
                distance_meters: distance
            };
            
            const { error } = await supabaseClient
                .from('geo_attendance_logs')
                .insert([checkInData]);
            
            if (error) throw error;
            
            // Success
            console.log('✅ Check-in successful');
            
            // Show success message
            if (window.AppUtils?.showToast) {
                const message = isVerified 
                    ? `Checked in to ${targetName} successfully (Verified)`
                    : `Checked in to ${targetName} (Pending verification)`;
                window.AppUtils.showToast(message, 'success');
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
    window.loadCoursesForAttendance = loadCoursesForAttendance; // NEW: Export this function
    
    console.log('✅ AUTO-LOADING Attendance module loaded');
})();
