// attendance.js - FIXED LOCATION TIMEOUT ISSUE
(function() {
    'use strict';
    
    let attendanceCachedClinicalAreas = [];
    let attendanceCachedCourses = [];
    let attendanceUserId = null;
    let attendanceUserProfile = null;
    let currentLocation = null;
    let locationWatchId = null;
    
    // College coordinates - NAKURU COLLEGE
    const NAKURU_COLLEGE = {
        latitude: -0.2610284,
        longitude: 36.0116283,
        radius: 100
    };
    
    // Initialize attendance system - WITH DASHBOARD INTEGRATION
    function initializeAttendanceSystem() {
        console.log('📱 Initializing Attendance System with Dashboard Integration...');
        
        // Cache DOM elements
        const sessionTypeSelect = document.getElementById('session-type');
        const checkInButton = document.getElementById('check-in-button');
        const attendanceTab = document.querySelector('.nav a[data-tab="attendance"]');
        const historyFilter = document.getElementById('history-filter');
        const refreshHistoryBtn = document.getElementById('refresh-history');
        
        // Set up event listeners
        if (attendanceTab) {
            attendanceTab.addEventListener('click', async (e) => {
                e.preventDefault();
                console.log('📊 Attendance tab clicked...');
                
                // Switch to attendance tab
                switchToTab('attendance');
                
                // Load attendance data
                await loadAttendanceData();
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
        
        // Check if we're already on attendance tab
        if (isOnAttendanceTab()) {
            console.log('📊 Currently on attendance tab, loading data...');
            loadAttendanceData();
        }
        
        // Listen for dashboard ready event
        document.addEventListener('dashboardReady', () => {
            console.log('📊 Dashboard ready, syncing attendance metrics...');
            setTimeout(() => {
                triggerDashboardAttendanceUpdate();
            }, 1000);
        });
        
        console.log('✅ Attendance System initialized with Dashboard Integration');
    }
    
    // Helper: Trigger dashboard attendance update
    function triggerDashboardAttendanceUpdate() {
        console.log('🎯 Triggering dashboard attendance update...');
        
        // Method 1: Use global helper function
        if (window.triggerDashboardUpdate) {
            window.triggerDashboardUpdate('attendance');
            return;
        }
        
        // Method 2: Dispatch custom event
        const event = new CustomEvent('attendanceCheckedIn', {
            detail: {
                timestamp: new Date().toISOString(),
                userId: attendanceUserId,
                action: 'check-in'
            }
        });
        
        // Try multiple dispatch methods
        window.dispatchEvent(event);
        document.dispatchEvent(event);
        
        console.log('✅ Attendance update event dispatched');
    }
    
    // Helper: Check if on attendance tab
    function isOnAttendanceTab() {
        return window.location.hash === '#attendance' || 
               (document.querySelector('.tab-content#attendance') && 
                document.querySelector('.tab-content#attendance').style.display === 'block');
    }
    
    // Helper: Switch to tab (independent of other modules)
    function switchToTab(tabName) {
        // Hide all tab contents
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.style.display = 'none';
        });
        
        // Remove active class from all nav items
        document.querySelectorAll('.nav a').forEach(navItem => {
            navItem.classList.remove('active');
        });
        
        // Show selected tab
        const selectedTab = document.getElementById(tabName);
        if (selectedTab) {
            selectedTab.style.display = 'block';
        }
        
        // Set active nav item
        const activeNav = document.querySelector(`.nav a[data-tab="${tabName}"]`);
        if (activeNav) {
            activeNav.classList.add('active');
        }
        
        // Update URL hash
        window.location.hash = tabName;
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
            
            // Update label
            let label = 'Select:';
            switch(sessionType) {
                case 'clinical': label = 'Clinical Department:'; break;
                case 'class': label = 'Course:'; break;
                case 'lab': label = 'Laboratory:'; break;
                case 'tutorial': label = 'Tutorial Room:'; break;
                default: label = 'Target:';
            }
            
            if (targetText) targetText.textContent = label;
            
            // Populate options - INDEPENDENTLY
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
    
    // Populate target options - INDEPENDENT VERSION
    async function populateTargetOptions(sessionType) {
        console.log('🎯 Populating target options INDEPENDENTLY for:', sessionType);
        
        const targetSelect = document.getElementById('attendance-target');
        if (!targetSelect) return;
        
        // Clear existing options
        targetSelect.innerHTML = '<option value="">Loading options...</option>';
        targetSelect.disabled = true;
        
        try {
            if (sessionType === 'clinical') {
                // Load clinical areas independently
                await loadClinicalTargets();
                
                if (attendanceCachedClinicalAreas.length === 0) {
                    targetSelect.innerHTML = '<option value="">No clinical areas available</option>';
                    return;
                }
                
                // Populate clinical areas
                targetSelect.innerHTML = '<option value="">Select clinical department...</option>';
                attendanceCachedClinicalAreas.forEach(area => {
                    const opt = document.createElement('option');
                    opt.value = `${area.id}|${area.name}`;
                    opt.textContent = area.name;
                    targetSelect.appendChild(opt);
                });
                
            } else if (['class', 'lab', 'tutorial'].includes(sessionType)) {
                // Load courses INDEPENDENTLY - don't wait for courses tab
                console.log('📚 Loading courses independently...');
                
                const courses = await loadCoursesForAttendance();
                
                if (!courses || courses.length === 0) {
                    targetSelect.innerHTML = '<option value="">No courses found. Please refresh.</option>';
                    return;
                }
                
                // Populate courses
                targetSelect.innerHTML = '<option value="">Select course...</option>';
                
                courses.forEach(course => {
                    const opt = document.createElement('option');
                    const courseName = course.course_name || course.name || 'Unknown Course';
                    const unitCode = course.unit_code || course.code || '';
                    
                    let displayText = courseName;
                    if (unitCode) {
                        displayText = `${unitCode} - ${courseName}`;
                    }
                    
                    opt.value = `${course.id}|${displayText}`;
                    opt.textContent = displayText;
                    targetSelect.appendChild(opt);
                });
            }
        } catch (error) {
            console.error('❌ Error loading targets:', error);
            targetSelect.innerHTML = '<option value="">Error loading options</option>';
            return;
        }
        
        targetSelect.disabled = false;
        updateRequirement('target', false);
        
        // Update button when selection changes
        targetSelect.addEventListener('change', () => {
            updateRequirement('target', targetSelect.value && targetSelect.value !== '');
            updateCheckInButton();
        });
    }
    
    // Load courses INDEPENDENTLY from database
    async function loadCoursesForAttendance() {
        console.log('📖 Loading courses INDEPENDENTLY from database...');
        
        // Don't depend on coursesModule or cachedCourses
        // Query database directly
        
        if (!attendanceUserProfile || !window.db?.supabase) {
            console.log('⚠️ Waiting for user authentication...');
            return [];
        }
        
        const supabaseClient = window.db.supabase;
        const yourProgram = attendanceUserProfile.program;
        const yourIntakeYear = attendanceUserProfile.intake_year;
        const yourBlock = attendanceUserProfile.block;
        
        try {
            let query = supabaseClient
                .from('courses')
                .select('id, course_name, name, unit_code, code, status, target_program, intake_year, block, latitude, longitude, radius_m')
                .eq('status', 'Active')
                .order('course_name');
            
            // Filter by user's program if available
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
                console.error('❌ Database error loading courses:', error);
                return [];
            }
            
            if (!courses || courses.length === 0) {
                console.warn('⚠️ No courses found in database');
                return [];
            }
            
            console.log(`✅ Loaded ${courses.length} courses INDEPENDENTLY`);
            
            // Cache for this session
            attendanceCachedCourses = courses;
            
            return courses;
            
        } catch (error) {
            console.error('❌ Failed to load courses independently:', error);
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
    
    // Start location monitoring - FIXED VERSION with better timeout handling
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
        
        // Try different timeouts for different scenarios
        const getLocationWithRetry = (retryCount = 0) => {
            const options = {
                enableHighAccuracy: true,
                timeout: retryCount === 0 ? 10000 : 15000, // 10s first, 15s on retry
                maximumAge: 60000 // Accept cached location up to 1 minute old
            };
            
            console.log(`📍 Attempt ${retryCount + 1}: Getting location with ${options.timeout}ms timeout`);
            
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    console.log('✅ Location obtained successfully');
                    handleLocationSuccess(position);
                },
                (error) => {
                    console.warn(`⚠️ Location attempt ${retryCount + 1} failed:`, error.message);
                    
                    // Retry logic - only retry timeout errors
                    if (error.code === error.TIMEOUT && retryCount < 2) {
                        console.log(`🔄 Retrying location... (${retryCount + 1}/2)`);
                        updateGPSStatus('loading', `Getting location... Retry ${retryCount + 1}/2`);
                        setTimeout(() => getLocationWithRetry(retryCount + 1), 1000);
                    } else {
                        handleLocationError(error);
                    }
                },
                options
            );
            
            // Start watch position for continuous updates
            locationWatchId = navigator.geolocation.watchPosition(
                (position) => {
                    console.log('📍 Location updated (watch)');
                    handleLocationSuccess(position);
                },
                (error) => {
                    console.warn('⚠️ Location watch error:', error.message);
                    // Don't show error for watch, just for initial get
                },
                {
                    enableHighAccuracy: false, // Less battery for continuous
                    timeout: 30000,
                    maximumAge: 10000 // Update every 10s
                }
            );
        };
        
        // Start first attempt
        getLocationWithRetry(0);
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
                message = 'GPS permission denied. Enable location in browser settings.';
                break;
            case error.POSITION_UNAVAILABLE:
                message = 'Location unavailable. Check your GPS/network connection.';
                break;
            case error.TIMEOUT:
                message = 'Location timeout. Ensure GPS is enabled and try again.';
                break;
            default:
                message = 'Location error. Try refreshing the page.';
        }
        
        updateGPSStatus('error', message);
        updateRequirement('location', false);
        updateCheckInButton();
        
        // Add retry button functionality
        const gpsStatus = document.getElementById('gps-status');
        if (gpsStatus && error.code !== error.PERMISSION_DENIED) {
            const retryBtn = document.createElement('button');
            retryBtn.innerHTML = '<i class="fas fa-redo"></i> Retry';
            retryBtn.style.marginLeft = '10px';
            retryBtn.style.padding = '2px 8px';
            retryBtn.style.fontSize = '12px';
            retryBtn.style.borderRadius = '4px';
            retryBtn.style.backgroundColor = '#3b82f6';
            retryBtn.style.color = 'white';
            retryBtn.style.border = 'none';
            retryBtn.style.cursor = 'pointer';
            retryBtn.addEventListener('click', () => {
                retryBtn.remove();
                startLocationMonitoring();
            });
            
            // Remove any existing retry button
            const existingRetry = gpsStatus.querySelector('button');
            if (existingRetry) existingRetry.remove();
            
            gpsStatus.appendChild(retryBtn);
        }
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
    
    // Load attendance data INDEPENDENTLY
    async function loadAttendanceData() {
        console.log('📱 Loading attendance data INDEPENDENTLY...');
        
        try {
            // Get user profile from global db object
            attendanceUserProfile = window.db?.currentUserProfile;
            attendanceUserId = window.db?.currentUserId;
            
            if (!attendanceUserProfile || !attendanceUserId) {
                console.log('⏳ Waiting for user login...');
                return;
            }
            
            console.log('👤 User profile loaded:', {
                name: attendanceUserProfile.full_name,
                program: attendanceUserProfile.program,
                intake_year: attendanceUserProfile.intake_year,
                block: attendanceUserProfile.block
            });
            
            // Load clinical areas
            await loadClinicalTargets();
            
            // Load courses INDEPENDENTLY (don't wait for courses tab)
            console.log('📚 Loading courses for attendance tab...');
            await loadCoursesForAttendance();
            
            // Load today's attendance count
            await loadTodayAttendanceCount();
            
            // Load attendance history
            await loadGeoAttendanceHistory('today');
            
            console.log('✅ Attendance data loaded INDEPENDENTLY');
            
        } catch (error) {
            console.error('❌ Failed to load attendance data:', error);
        }
    }
    
  // Load clinical targets - FIXED VERSION
async function loadClinicalTargets() {
    try {
        const supabaseClient = window.db?.supabase;
        if (!supabaseClient || !attendanceUserProfile) {
            console.log('⚠️ No supabase client or user profile');
            return;
        }
        
        const program = attendanceUserProfile?.program;
        const intakeYear = attendanceUserProfile?.intake_year;
        const block = attendanceUserProfile?.block;
        
        if (!program || !intakeYear) {
            console.log('⚠️ Missing program or intake year');
            return;
        }
        
        console.log(`🏥 Fetching clinical areas for: ${program}, ${intakeYear}, block ${block}`);
        
        // CORRECT TABLE NAME: clinical_names
        const { data, error } = await supabaseClient
            .from('clinical_names')
            .select('id, clinical_area_name, latitude, longitude, program, intake_year, block_term')
            .eq('program', program)
            .eq('intake_year', intakeYear)
            .or(block ? `block_term.eq.${block},block_term.is.null` : 'block_term.is.null')
            .order('clinical_area_name');
        
        if (error) {
            console.error('❌ Error loading clinical names:', error);
            attendanceCachedClinicalAreas = [];
            return;
        }
        
        if (!data || data.length === 0) {
            console.warn('⚠️ No clinical areas found for current user');
            attendanceCachedClinicalAreas = [];
            return;
        }
        
        // CORRECT FIELD MAPPING
        attendanceCachedClinicalAreas = data.map(area => ({
            id: area.id,
            name: area.clinical_area_name, // CORRECT: clinical_area_name
            clinicalArea: area.clinical_area_name,
            latitude: area.latitude,
            longitude: area.longitude,
            radius: 100, // Default radius
            program: area.program,
            intakeYear: area.intake_year,
            block: area.block_term
        }));
        
        console.log(`✅ Loaded ${attendanceCachedClinicalAreas.length} clinical areas`);
        console.log('Sample clinical area:', attendanceCachedClinicalAreas[0]);
        
    } catch (error) {
        console.error('❌ Error loading clinical names:', error);
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
                    const distanceM = parseFloat(log.distance_meters);
                    let distanceText;
                    if (distanceM >= 1000) {
                        distanceText = `${(distanceM / 1000).toFixed(2)} km`;
                    } else {
                        distanceText = `${distanceM.toFixed(0)} m`;
                    }
                    detailsText += `Distance: ${distanceText}`;
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
    
    // CHECK-IN FUNCTION - UPDATED WITH DASHBOARD INTEGRATION AND KM DISPLAY
    async function attendanceGeoCheckIn() {
        console.log('📍 Starting check-in with dashboard integration...');
        
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
                throw new Error('Location not available. Enable GPS and try again.');
            }
            
            // Parse target
            const [targetId, targetName] = targetSelect.value.split('|');
            
            // Find target coordinates
            const sessionType = sessionTypeSelect.value;
            let targetLat, targetLon, targetRadius;
            
            if (sessionType === 'clinical') {
               // CORRECT - your clinical names have different structure
const target = attendanceCachedClinicalAreas.find(t => t.id === targetId);
if (target) {
    targetLat = target.latitude;
    targetLon = target.longitude;
    targetRadius = 100; // Your database doesn't have radius_m
                } else {
                    // Fallback to Nakuru College
                    targetLat = NAKURU_COLLEGE.latitude;
                    targetLon = NAKURU_COLLEGE.longitude;
                    targetRadius = NAKURU_COLLEGE.radius;
                }
            } else {
                // Courses: Use Nakuru College coordinates
                targetLat = NAKURU_COLLEGE.latitude;
                targetLon = NAKURU_COLLEGE.longitude;
                targetRadius = NAKURU_COLLEGE.radius;
            }
            
            // Calculate distance
            const distance = calculateAttendanceDistance(
                currentLocation.latitude,
                currentLocation.longitude,
                targetLat,
                targetLon
            );
            
            // Verify if within range
            const isVerified = distance <= targetRadius;
            
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
                distance_meters: distance,
                target_latitude: targetLat,
                target_longitude: targetLon
            };
            
            const { error } = await supabaseClient
                .from('geo_attendance_logs')
                .insert([checkInData]);
            
            if (error) throw error;
            
            // Success
            console.log('✅ Check-in successful');
            
            // Show success message with distance in km if applicable
            if (window.AppUtils?.showToast) {
                let message;
                let distanceText = '';
                
                // Add distance in kilometers if > 1000 meters
                if (distance >= 1000) {
                    const distanceKm = (distance / 1000).toFixed(2);
                    distanceText = ` (${distanceKm} km away)`;
                } else {
                    distanceText = ` (${distance.toFixed(0)} m away)`;
                }
                
                if (isVerified) {
                    if (sessionType === 'clinical') {
                        message = `✅ Checked in at ${targetName} successfully!`;
                    } else {
                        message = `✅ Checked into ${targetName} at college successfully!`;
                    }
                    window.AppUtils.showToast(message, 'success');
                } else {
                    message = `📍 Checked into ${targetName}${distanceText} - Outside range`;
                    window.AppUtils.showToast(message, 'warning');
                }
            }
            
            // Update today's count
            await loadTodayAttendanceCount();
            
            // 🔥 CRITICAL: TRIGGER DASHBOARD UPDATE
            triggerDashboardAttendanceUpdate();
            
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
    window.triggerDashboardAttendanceUpdate = triggerDashboardAttendanceUpdate;
    
    console.log('✅ Attendance module loaded with Dashboard Integration and KM distance display');
})();
