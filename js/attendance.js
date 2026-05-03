// attendance.js - INTEGRATED with courses.js (shows only APPROVED units)
(function() {
    'use strict';
    
    console.log('✅ attendance.js - Integrated with courses module for approved units');
    
    // Check if courses module is ready
    let coursesModuleReady = false;
    let approvedUnits = [];
    
    // Wait for courses module before initializing
    function waitForCoursesModule() {
        return new Promise((resolve) => {
            if (window.coursesModule && window.coursesModule.getAllCourses) {
                console.log('✅ Courses module already available');
                resolve();
                return;
            }
            
            document.addEventListener('coursesModuleReady', () => {
                console.log('📚 Courses module ready event received');
                resolve();
            });
            
            // Also check periodically
            let checks = 0;
            const interval = setInterval(() => {
                if (window.coursesModule && window.coursesModule.getAllCourses) {
                    clearInterval(interval);
                    resolve();
                }
                checks++;
                if (checks > 20) {
                    clearInterval(interval);
                    console.warn('Courses module not ready after 10 seconds');
                    resolve(); // Continue anyway
                }
            }, 500);
        });
    }
    
    // Main attendance system
    async function startAttendanceSystem() {
        console.log('🎯 Starting attendance system with courses integration...');
        
        // Wait for courses module
        await waitForCoursesModule();
        
        // Get approved units from courses module
        if (window.coursesModule) {
            approvedUnits = window.coursesModule.getAllCourses() || [];
            console.log(`📚 Loaded ${approvedUnits.length} approved units for attendance`);
            
            // Listen for course updates
            document.addEventListener('studentStatsUpdated', (e) => {
                if (window.coursesModule) {
                    approvedUnits = window.coursesModule.getAllCourses() || [];
                    console.log(`🔄 Attendance: Updated to ${approvedUnits.length} approved units`);
                    refreshCourseSelectors();
                }
            });
        }
        
        // Set global variables
        let attendanceCachedClinicalAreas = [];
        let attendanceUserId = window.db?.currentUserId;
        let attendanceUserProfile = window.db?.currentUserProfile;
        let currentLocation = null;
        let locationWatchId = null;
        
        // College coordinates - NAKURU COLLEGE
        const NAKURU_COLLEGE = {
            latitude: -0.2610284,
            longitude: 36.0116283,
            radius: 100
        };
        
        // Helper: Refresh course selectors when approved units change
        function refreshCourseSelectors() {
            const sessionTypeSelect = document.getElementById('session-type');
            if (sessionTypeSelect && sessionTypeSelect.value === 'class') {
                populateTargetOptions('class');
            }
        }
        
        // Initialize attendance system UI
        function initializeAttendanceUI() {
            console.log('Initializing attendance system UI with approved courses...');
            
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
                    switchToTab('attendance');
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
            
            // Start location monitoring
            startLocationMonitoring();
            
            // Check if we're already on attendance tab
            if (isOnAttendanceTab()) {
                loadAttendanceData();
            }
            
            // Listen for dashboard ready event
            document.addEventListener('dashboardReady', () => {
                setTimeout(() => {
                    triggerDashboardAttendanceUpdate();
                }, 1000);
            });
        }
        
        // Helper: Trigger dashboard attendance update
        function triggerDashboardAttendanceUpdate() {
            if (window.triggerDashboardUpdate) {
                window.triggerDashboardUpdate('attendance');
                return;
            }
            
            const event = new CustomEvent('attendanceCheckedIn', {
                detail: {
                    timestamp: new Date().toISOString(),
                    userId: attendanceUserId,
                    action: 'check-in'
                }
            });
            
            window.dispatchEvent(event);
            document.dispatchEvent(event);
        }
        
        // Helper: Check if on attendance tab
        function isOnAttendanceTab() {
            return window.location.hash === '#attendance' || 
                   (document.querySelector('.tab-content#attendance') && 
                    document.querySelector('.tab-content#attendance').style.display === 'block');
        }
        
        // Helper: Switch to tab
        function switchToTab(tabName) {
            document.querySelectorAll('.tab-content').forEach(tab => {
                tab.style.display = 'none';
            });
            
            document.querySelectorAll('.nav a').forEach(navItem => {
                navItem.classList.remove('active');
            });
            
            const selectedTab = document.getElementById(tabName);
            if (selectedTab) {
                selectedTab.style.display = 'block';
            }
            
            const activeNav = document.querySelector(`.nav a[data-tab="${tabName}"]`);
            if (activeNav) {
                activeNav.classList.add('active');
            }
            
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
            
            if (sessionType) {
                targetControlGroup.style.display = 'flex';
                targetSelect.disabled = false;
                
                let label = 'Select:';
                switch(sessionType) {
                    case 'clinical': label = 'Clinical Department:'; break;
                    case 'class': label = 'Course (Approved Units):'; break;
                    case 'lab': label = 'Lab Session:'; break;
                    case 'tutorial': label = 'Tutorial:'; break;
                    default: label = 'Target:';
                }
                
                if (targetText) targetText.textContent = label;
                
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
        
        // Populate target options (using APPROVED UNITS for class sessions)
        async function populateTargetOptions(sessionType) {
            const targetSelect = document.getElementById('attendance-target');
            if (!targetSelect) return;
            
            targetSelect.innerHTML = '<option value="">Loading options...</option>';
            targetSelect.disabled = true;
            
            try {
                if (sessionType === 'clinical') {
                    await loadClinicalTargets();
                    
                    if (!attendanceCachedClinicalAreas || attendanceCachedClinicalAreas.length === 0) {
                        targetSelect.innerHTML = '<option value="">No clinical areas available for your program</option>';
                        targetSelect.disabled = false;
                        return;
                    }
                    
                    targetSelect.innerHTML = '<option value="">Select clinical department...</option>';
                    attendanceCachedClinicalAreas.forEach(area => {
                        const opt = document.createElement('option');
                        opt.value = `${area.id}|${area.name}|clinical`;
                        opt.textContent = area.name;
                        targetSelect.appendChild(opt);
                    });
                    
                } else if (sessionType === 'class') {
                    // CRITICAL: Use APPROVED UNITS from courses module
                    if (!approvedUnits || approvedUnits.length === 0) {
                        targetSelect.innerHTML = '<option value="">No approved units found. Please register for units first.</option>';
                        targetSelect.disabled = false;
                        
                        // Add helpful message and link
                        const helpText = document.createElement('div');
                        helpText.className = 'help-text mt-2';
                        helpText.style.fontSize = '12px';
                        helpText.style.color = '#f59e0b';
                        helpText.innerHTML = '<i class="fas fa-info-circle"></i> You need to register for units in the Learning Hub first.';
                        
                        const existingHelp = targetSelect.parentElement.querySelector('.help-text');
                        if (existingHelp) existingHelp.remove();
                        targetSelect.parentElement.appendChild(helpText);
                        return;
                    }
                    
                    targetSelect.innerHTML = '<option value="">Select approved course...</option>';
                    
                    // Display approved units from student_unit_registrations
                    approvedUnits.forEach(unit => {
                        const opt = document.createElement('option');
                        const unitCode = unit.unit_code || '';
                        const unitName = unit.unit_name || 'Unknown Course';
                        
                        let displayText = unitName;
                        if (unitCode) {
                            displayText = `${unitCode} - ${unitName}`;
                        }
                        
                        // Add block/term info if available
                        if (unit.block) {
                            displayText += ` (Block: ${unit.block})`;
                        }
                        if (unit.term) {
                            displayText += ` (Term: ${unit.term})`;
                        }
                        
                        opt.value = `unit_${unit.id || unit.unit_code}|${displayText}|class|${unit.unit_code}`;
                        opt.textContent = displayText;
                        
                        // Add data attributes for additional info
                        opt.setAttribute('data-unit-code', unit.unit_code || '');
                        opt.setAttribute('data-unit-name', unit.unit_name || '');
                        opt.setAttribute('data-credits', unit.credits || 3);
                        opt.setAttribute('data-status', unit.status || 'approved');
                        
                        targetSelect.appendChild(opt);
                    });
                    
                    // Remove any help text
                    const existingHelp = targetSelect.parentElement.querySelector('.help-text');
                    if (existingHelp) existingHelp.remove();
                    
                    // Show count of available courses
                    console.log(`📚 Showing ${approvedUnits.length} approved units for attendance check-in`);
                    
                    // Add course count indicator
                    const countIndicator = document.createElement('div');
                    countIndicator.className = 'course-count-indicator mt-1';
                    countIndicator.style.fontSize = '11px';
                    countIndicator.style.color = '#6b7280';
                    countIndicator.innerHTML = `<i class="fas fa-check-circle"></i> ${approvedUnits.length} approved course(s) available`;
                    
                    const existingIndicator = targetSelect.parentElement.querySelector('.course-count-indicator');
                    if (existingIndicator) existingIndicator.remove();
                    targetSelect.parentElement.appendChild(countIndicator);
                    
                } else {
                    // For lab/tutorial - use approved units as well
                    if (!approvedUnits || approvedUnits.length === 0) {
                        targetSelect.innerHTML = '<option value="">No approved units available</option>';
                        targetSelect.disabled = false;
                        return;
                    }
                    
                    targetSelect.innerHTML = '<option value="">Select session...</option>';
                    approvedUnits.forEach(unit => {
                        const opt = document.createElement('option');
                        const unitCode = unit.unit_code || '';
                        const unitName = unit.unit_name || 'Unknown';
                        let displayText = unitName;
                        if (unitCode) displayText = `${unitCode} - ${unitName}`;
                        opt.value = `unit_${unit.id || unit.unit_code}|${displayText}|${sessionType}|${unit.unit_code}`;
                        opt.textContent = displayText;
                        targetSelect.appendChild(opt);
                    });
                }
            } catch (error) {
                console.error('Error populating targets:', error);
                targetSelect.innerHTML = '<option value="">Error loading options</option>';
            }
            
            targetSelect.disabled = false;
            updateRequirement('target', false);
            
            targetSelect.addEventListener('change', () => {
                updateRequirement('target', targetSelect.value && targetSelect.value !== '');
                updateCheckInButton();
            });
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
            
            if (allRequirementsMet) {
                checkInButton.classList.add('ready');
            } else {
                checkInButton.classList.remove('ready');
            }
            
            updateRequirement('session', hasSession);
            updateRequirement('target', hasTarget);
            updateRequirement('location', hasLocation);
        }
        
        // Start location monitoring
        function startLocationMonitoring() {
            if (!navigator.geolocation) {
                updateGPSStatus('error', 'Geolocation not supported');
                return;
            }
            
            if (locationWatchId) {
                navigator.geolocation.clearWatch(locationWatchId);
            }
            
            updateGPSStatus('loading', 'Getting location...');
            
            const getLocationWithRetry = (retryCount = 0) => {
                const options = {
                    enableHighAccuracy: true,
                    timeout: retryCount === 0 ? 10000 : 15000,
                    maximumAge: 60000
                };
                
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        handleLocationSuccess(position);
                    },
                    (error) => {
                        if (error.code === error.TIMEOUT && retryCount < 2) {
                            updateGPSStatus('loading', `Getting location... Retry ${retryCount + 1}/2`);
                            setTimeout(() => getLocationWithRetry(retryCount + 1), 1000);
                        } else {
                            handleLocationError(error);
                        }
                    },
                    options
                );
                
                locationWatchId = navigator.geolocation.watchPosition(
                    (position) => {
                        handleLocationSuccess(position);
                    },
                    (error) => {},
                    {
                        enableHighAccuracy: false,
                        timeout: 30000,
                        maximumAge: 10000
                    }
                );
            };
            
            getLocationWithRetry(0);
        }
        
        function handleLocationSuccess(position) {
            currentLocation = {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                accuracy: position.coords.accuracy,
                timestamp: new Date(position.timestamp)
            };
            
            updateGPSStatus('success', 'Location active');
            updateLocationDisplay();
            updateCheckInButton();
        }
        
        function handleLocationError(error) {
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
        
        // Load attendance data
        async function loadAttendanceData() {
            try {
                attendanceUserProfile = window.db?.currentUserProfile;
                attendanceUserId = window.db?.currentUserId;
                
                if (!attendanceUserProfile || !attendanceUserId) {
                    console.log('No user profile or ID');
                    return;
                }
                
                await loadClinicalTargets();
                await loadTodayAttendanceCount();
                await loadGeoAttendanceHistory('today');
                
            } catch (error) {
                console.error('Error loading attendance data:', error);
            }
        }
        
        // Load clinical targets
        async function loadClinicalTargets() {
            console.log('Loading clinical targets from clinical_names...');
            
            try {
                const supabaseClient = window.db?.supabase;
                if (!supabaseClient || !attendanceUserProfile) {
                    console.log('No supabase client or user profile');
                    attendanceCachedClinicalAreas = [];
                    return [];
                }
                
                const program = attendanceUserProfile?.program;
                const intakeYear = attendanceUserProfile?.intake_year;
                const block = attendanceUserProfile?.block;
                
                console.log('User profile:', { program, intakeYear, block });
                
                if (program !== 'KRCHN') {
                    console.log('Program is not KRCHN, no clinical areas');
                    attendanceCachedClinicalAreas = [];
                    return [];
                }
                
                let query = supabaseClient
                    .from('clinical_names')
                    .select('id, clinical_area_name, latitude, longitude, program, intake_year, block_term')
                    .eq('program', program);
                
                if (intakeYear) {
                    query = query.eq('intake_year', intakeYear);
                }
                
                if (block) {
                    query = query.eq('block_term', block);
                }
                
                query = query.order('clinical_area_name');
                
                console.log('Executing query...');
                const { data, error } = await query;
                
                if (error) {
                    console.error('Error loading clinical areas:', error);
                    attendanceCachedClinicalAreas = [];
                    return [];
                }
                
                console.log('Clinical areas loaded:', data);
                
                if (!data || data.length === 0) {
                    console.log('No clinical areas found for your program');
                    attendanceCachedClinicalAreas = [];
                    return [];
                }
                
                attendanceCachedClinicalAreas = data.map(area => ({
                    id: area.id,
                    name: area.clinical_area_name,
                    clinicalArea: area.clinical_area_name,
                    latitude: parseFloat(area.latitude) || 0,
                    longitude: parseFloat(area.longitude) || 0,
                    radius: 100,
                    program: area.program,
                    intakeYear: area.intake_year,
                    block: area.block_term
                }));
                
                console.log('Cached clinical areas:', attendanceCachedClinicalAreas.length);
                return attendanceCachedClinicalAreas;
                
            } catch (error) {
                console.error('Exception in loadClinicalTargets:', error);
                attendanceCachedClinicalAreas = [];
                return [];
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
                console.error('Error loading today count:', error);
            }
        }
        
        // Load attendance history
        async function loadGeoAttendanceHistory(filter = 'today') {
            const tableBody = document.getElementById('geo-attendance-history');
            if (!tableBody || !attendanceUserId) {
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
                console.error('Error loading history:', error);
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
            
            return distanceMeters;
        }
        
        // Check-in function with unit tracking
        async function attendanceGeoCheckIn() {
            const button = document.getElementById('check-in-button');
            const sessionTypeSelect = document.getElementById('session-type');
            const targetSelect = document.getElementById('attendance-target');
            
            if (!button || !sessionTypeSelect || !targetSelect) return;
            
            button.disabled = true;
            const originalHTML = button.innerHTML;
            button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Checking in...';
            
            try {
                if (!sessionTypeSelect.value) {
                    throw new Error('Please select session type');
                }
                
                if (!targetSelect.value || targetSelect.value === '') {
                    throw new Error('Please select target');
                }
                
                if (!currentLocation) {
                    throw new Error('Location not available. Enable GPS and try again.');
                }
                
                const [targetId, targetName, sessionType, unitCode] = targetSelect.value.split('|');
                
                const targetType = sessionTypeSelect.value;
                let targetLat, targetLon, targetRadius;
                
                if (targetType === 'clinical') {
                    const target = attendanceCachedClinicalAreas.find(t => t.id === targetId);
                    if (target) {
                        targetLat = target.latitude;
                        targetLon = target.longitude;
                        targetRadius = 100;
                    } else {
                        targetLat = NAKURU_COLLEGE.latitude;
                        targetLon = NAKURU_COLLEGE.longitude;
                        targetRadius = NAKURU_COLLEGE.radius;
                    }
                } else {
                    targetLat = NAKURU_COLLEGE.latitude;
                    targetLon = NAKURU_COLLEGE.longitude;
                    targetRadius = NAKURU_COLLEGE.radius;
                }
                
                const distance = calculateAttendanceDistance(
                    currentLocation.latitude,
                    currentLocation.longitude,
                    targetLat,
                    targetLon
                );
                
                const isVerified = distance <= targetRadius;
                
                const supabaseClient = window.db?.supabase;
                if (!supabaseClient) {
                    throw new Error('Database connection error');
                }
                
                // Find the unit information from approved units
                const selectedUnit = approvedUnits.find(u => 
                    (u.id === targetId || u.unit_code === unitCode || u.id === parseInt(targetId))
                );
                
                const checkInData = {
                    student_id: attendanceUserId,
                    check_in_time: new Date().toISOString(),
                    session_type: targetType.charAt(0).toUpperCase() + targetType.slice(1),
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
                    target_longitude: targetLon,
                    // Additional fields for unit tracking
                    unit_code: selectedUnit?.unit_code || unitCode,
                    unit_name: selectedUnit?.unit_name || targetName,
                    program: attendanceUserProfile?.program,
                    block: attendanceUserProfile?.block,
                    term: attendanceUserProfile?.term
                };
                
                const { error } = await supabaseClient
                    .from('geo_attendance_logs')
                    .insert([checkInData]);
                
                if (error) throw error;
                
                // Dispatch attendance event for tracking
                document.dispatchEvent(new CustomEvent('attendanceRecorded', {
                    detail: {
                        unitCode: selectedUnit?.unit_code || unitCode,
                        unitName: selectedUnit?.unit_name || targetName,
                        isVerified: isVerified,
                        timestamp: new Date().toISOString(),
                        sessionType: targetType
                    }
                }));
                
                if (window.AppUtils?.showToast) {
                    let message;
                    let distanceText = '';
                    
                    if (distance >= 1000) {
                        const distanceKm = (distance / 1000).toFixed(2);
                        distanceText = ` (${distanceKm} km away)`;
                    } else {
                        distanceText = ` (${distance.toFixed(0)} m away)`;
                    }
                    
                    if (isVerified) {
                        if (targetType === 'clinical') {
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
                
                await loadTodayAttendanceCount();
                triggerDashboardAttendanceUpdate();
                
                // Reset form but keep location monitoring active
                sessionTypeSelect.value = '';
                targetSelect.value = '';
                handleSessionTypeChange(); // This will clear the target selector
                await loadGeoAttendanceHistory('today');
                
            } catch (error) {
                console.error('Check-in error:', error);
                if (window.AppUtils?.showToast) {
                    window.AppUtils.showToast(error.message, 'error');
                }
            } finally {
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
            .mt-1 { margin-top: 0.25rem; }
            .mt-2 { margin-top: 0.5rem; }
            
            .help-text {
                font-size: 12px;
                color: #f59e0b;
                margin-top: 4px;
            }
            
            .course-count-indicator {
                font-size: 11px;
                color: #10b981;
                margin-top: 4px;
            }
        `;
        document.head.appendChild(style);
        
        // Initialize when DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initializeAttendanceUI);
        } else {
            initializeAttendanceUI();
        }
        
        // Make functions available globally
        window.initializeAttendanceUI = initializeAttendanceUI;
        window.attendanceGeoCheckIn = attendanceGeoCheckIn;
        window.loadAttendanceData = loadAttendanceData;
        window.loadGeoAttendanceHistory = loadGeoAttendanceHistory;
        window.triggerDashboardAttendanceUpdate = triggerDashboardAttendanceUpdate;
        window.refreshCourseSelectors = refreshCourseSelectors;
    }
    
    // Start the attendance system
    startAttendanceSystem();
})();
