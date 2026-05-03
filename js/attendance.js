// attendance.js - ENHANCED with 50 METERS MAX ACCURACY
(function() {
    'use strict';
    
    console.log('✅ attendance.js - ENHANCED with 50m max accuracy requirement');
    
    // Configuration
    const MAX_ALLOWED_DISTANCE = 50; // MAX 50 METERS for verification
    const MIN_GPS_ACCURACY = 30; // Need accuracy within 30 meters
    
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
                    resolve();
                }
            }, 500);
        });
    }
    
    // Main attendance system
    async function startAttendanceSystem() {
        console.log('🎯 Starting attendance system with 50m max distance requirement...');
        
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
        let lastDistanceCheck = null;
        
        // College coordinates - NAKURU COLLEGE
        const NAKURU_COLLEGE = {
            latitude: -0.2610284,
            longitude: 36.0116283,
            radius: MAX_ALLOWED_DISTANCE // NOW 50 METERS
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
            console.log('Initializing attendance system UI with 50m accuracy requirement...');
            
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
                    // Use APPROVED UNITS from courses module
                    if (!approvedUnits || approvedUnits.length === 0) {
                        targetSelect.innerHTML = '<option value="">⚠️ No approved units found. Please register for units first.</option>';
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
                    
                    targetSelect.innerHTML = '<option value="">📚 Select approved course...</option>';
                    
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
                            displayText += ` [Block: ${unit.block}]`;
                        }
                        if (unit.term) {
                            displayText += ` [Term: ${unit.term}]`;
                        }
                        
                        // Add credits info
                        if (unit.credits) {
                            displayText += ` (${unit.credits} credits)`;
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
                    countIndicator.style.color = '#10b981';
                    countIndicator.innerHTML = `<i class="fas fa-check-circle"></i> ${approvedUnits.length} approved course(s) available for check-in`;
                    
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
        
        // Update check-in button state with distance check
        function updateCheckInButton() {
            const checkInButton = document.getElementById('check-in-button');
            const sessionTypeSelect = document.getElementById('session-type');
            const targetSelect = document.getElementById('attendance-target');
            const distanceStatus = document.getElementById('distance-status');
            
            if (!checkInButton) return;
            
            const hasSession = sessionTypeSelect?.value;
            const hasTarget = targetSelect?.value && targetSelect.value !== '';
            const hasLocation = currentLocation !== null;
            
            // Check distance if location and target exist
            let isWithinRange = false;
            let distance = null;
            
            if (hasLocation && hasTarget) {
                const [targetId, targetName, sessionType] = targetSelect.value.split('|');
                const targetType = sessionTypeSelect?.value;
                
                let targetLat = NAKURU_COLLEGE.latitude;
                let targetLon = NAKURU_COLLEGE.longitude;
                
                if (targetType === 'clinical') {
                    const target = attendanceCachedClinicalAreas.find(t => t.id === targetId);
                    if (target) {
                        targetLat = target.latitude;
                        targetLon = target.longitude;
                    }
                }
                
                distance = calculateAttendanceDistance(
                    currentLocation.latitude,
                    currentLocation.longitude,
                    targetLat,
                    targetLon
                );
                
                isWithinRange = distance <= MAX_ALLOWED_DISTANCE;
                lastDistanceCheck = distance;
                
                // Update distance status display
                if (distanceStatus) {
                    const distanceMeters = distance.toFixed(0);
                    const isAccurate = currentLocation.accuracy <= MIN_GPS_ACCURACY;
                    
                    if (isWithinRange && isAccurate) {
                        distanceStatus.innerHTML = `<i class="fas fa-check-circle" style="color: #10b981;"></i> <span style="color: #10b981;">✓ Within ${MAX_ALLOWED_DISTANCE}m range (${distanceMeters}m) - Ready to check in!</span>`;
                        distanceStatus.style.backgroundColor = '#d1fae5';
                    } else if (isWithinRange && !isAccurate) {
                        distanceStatus.innerHTML = `<i class="fas fa-exclamation-triangle" style="color: #f59e0b;"></i> <span style="color: #f59e0b;">⚠️ Within range but GPS accuracy is ${currentLocation.accuracy.toFixed(0)}m (need ≤${MIN_GPS_ACCURACY}m)</span>`;
                        distanceStatus.style.backgroundColor = '#fed7aa';
                    } else {
                        let distanceText = distanceMeters;
                        if (distanceMeters >= 1000) {
                            distanceText = (distanceMeters / 1000).toFixed(2) + 'km';
                        }
                        distanceStatus.innerHTML = `<i class="fas fa-times-circle" style="color: #ef4444;"></i> <span style="color: #ef4444;">❌ Too far! ${distanceText} away (must be within ${MAX_ALLOWED_DISTANCE}m)</span>`;
                        distanceStatus.style.backgroundColor = '#fee2e2';
                    }
                    distanceStatus.style.display = 'flex';
                }
            } else if (distanceStatus) {
                distanceStatus.style.display = 'none';
            }
            
            const allRequirementsMet = hasSession && hasTarget && hasLocation && isWithinRange && 
                                       (currentLocation?.accuracy <= MIN_GPS_ACCURACY);
            
            checkInButton.disabled = !allRequirementsMet;
            
            const btnSubtext = checkInButton.querySelector('.btn-subtext');
            if (btnSubtext) {
                if (!hasLocation) {
                    btnSubtext.textContent = '📍 GPS location required';
                } else if (currentLocation?.accuracy > MIN_GPS_ACCURACY) {
                    btnSubtext.textContent = `🎯 Need better GPS accuracy (${currentLocation.accuracy.toFixed(0)}m / need ≤${MIN_GPS_ACCURACY}m)`;
                } else if (!hasSession || !hasTarget) {
                    btnSubtext.textContent = '📝 Complete all fields above';
                } else if (!isWithinRange) {
                    const distanceText = distance ? (distance >= 1000 ? (distance/1000).toFixed(2) + 'km' : distance.toFixed(0) + 'm') : 'unknown';
                    btnSubtext.textContent = `📍 Too far! ${distanceText} from campus (must be within ${MAX_ALLOWED_DISTANCE}m)`;
                } else {
                    btnSubtext.textContent = `✅ Ready! Within ${MAX_ALLOWED_DISTANCE}m (${distance?.toFixed(0)}m)`;
                }
            }
            
            if (allRequirementsMet) {
                checkInButton.classList.add('ready');
            } else {
                checkInButton.classList.remove('ready');
            }
            
            updateRequirement('session', hasSession);
            updateRequirement('target', hasTarget);
            updateRequirement('location', hasLocation && currentLocation?.accuracy <= MIN_GPS_ACCURACY);
        }
        
        // Start location monitoring with high accuracy
        function startLocationMonitoring() {
            if (!navigator.geolocation) {
                updateGPSStatus('error', 'Geolocation not supported');
                return;
            }
            
            if (locationWatchId) {
                navigator.geolocation.clearWatch(locationWatchId);
            }
            
            updateGPSStatus('loading', 'Getting precise location (need ≤30m accuracy)...');
            
            // First get high accuracy position
            const getHighAccuracyLocation = () => {
                const options = {
                    enableHighAccuracy: true,
                    timeout: 15000,
                    maximumAge: 0
                };
                
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        handleLocationSuccess(position);
                        // Then watch for updates
                        startWatchingLocation();
                    },
                    (error) => {
                        console.warn('High accuracy failed:', error);
                        // Fall back to standard accuracy
                        startWatchingLocation();
                    },
                    options
                );
            };
            
            const startWatchingLocation = () => {
                const watchOptions = {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 5000
                };
                
                locationWatchId = navigator.geolocation.watchPosition(
                    (position) => {
                        handleLocationSuccess(position);
                    },
                    (error) => {
                        console.warn('Watch position error:', error);
                        handleLocationError(error);
                    },
                    watchOptions
                );
            };
            
            getHighAccuracyLocation();
        }
        
        function handleLocationSuccess(position) {
            const accuracy = position.coords.accuracy;
            const isHighAccuracy = accuracy <= MIN_GPS_ACCURACY;
            
            currentLocation = {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                accuracy: accuracy,
                timestamp: new Date(position.timestamp),
                isHighAccuracy: isHighAccuracy
            };
            
            if (isHighAccuracy) {
                updateGPSStatus('success', `High accuracy GPS: ±${accuracy.toFixed(0)}m`);
            } else {
                updateGPSStatus('warning', `Low accuracy: ±${accuracy.toFixed(0)}m (need ≤${MIN_GPS_ACCURACY}m)`);
            }
            
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
            let bgColor = '';
            switch(status) {
                case 'success':
                    icon = '<i class="fas fa-check-circle"></i>';
                    gpsStatus.style.color = '#10b981';
                    bgColor = '#d1fae5';
                    break;
                case 'warning':
                    icon = '<i class="fas fa-exclamation-triangle"></i>';
                    gpsStatus.style.color = '#f59e0b';
                    bgColor = '#fed7aa';
                    break;
                case 'error':
                    icon = '<i class="fas fa-times-circle"></i>';
                    gpsStatus.style.color = '#ef4444';
                    bgColor = '#fee2e2';
                    break;
                default:
                    icon = '<i class="fas fa-spinner fa-spin"></i>';
                    gpsStatus.style.color = '#f59e0b';
                    bgColor = '#fed7aa';
            }
            
            gpsStatus.style.backgroundColor = bgColor;
            gpsStatus.style.padding = '8px 12px';
            gpsStatus.style.borderRadius = '8px';
            gpsStatus.innerHTML = `${icon} <span>${message}</span>`;
        }
        
        function updateLocationDisplay() {
            if (!currentLocation) return;
            
            const latElement = document.getElementById('latitude');
            const lonElement = document.getElementById('longitude');
            const accuracyElement = document.getElementById('accuracy-value');
            const accuracyDot = document.querySelector('.accuracy-dot');
            const accuracyWarning = document.getElementById('accuracy-warning');
            
            if (latElement) latElement.textContent = currentLocation.latitude.toFixed(6);
            if (lonElement) lonElement.textContent = currentLocation.longitude.toFixed(6);
            if (accuracyElement) {
                accuracyElement.textContent = currentLocation.accuracy.toFixed(1);
                if (currentLocation.accuracy > MIN_GPS_ACCURACY) {
                    accuracyElement.style.color = '#f59e0b';
                    if (accuracyWarning) accuracyWarning.style.display = 'inline';
                } else {
                    accuracyElement.style.color = '#10b981';
                    if (accuracyWarning) accuracyWarning.style.display = 'none';
                }
            }
            
            if (accuracyDot) {
                accuracyDot.className = 'accuracy-dot';
                if (currentLocation.accuracy <= 10) {
                    accuracyDot.classList.add('excellent');
                } else if (currentLocation.accuracy <= MIN_GPS_ACCURACY) {
                    accuracyDot.classList.add('good');
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
                
                const { data, error } = await query;
                
                if (error) throw error;
                
                attendanceCachedClinicalAreas = (data || []).map(area => ({
                    id: area.id,
                    name: area.clinical_area_name,
                    clinicalArea: area.clinical_area_name,
                    latitude: parseFloat(area.latitude) || NAKURU_COLLEGE.latitude,
                    longitude: parseFloat(area.longitude) || NAKURU_COLLEGE.longitude,
                    radius: MAX_ALLOWED_DISTANCE,
                    program: area.program,
                    intakeYear: area.intake_year,
                    block: area.block_term
                }));
                
                console.log(`Loaded ${attendanceCachedClinicalAreas.length} clinical areas`);
                return attendanceCachedClinicalAreas;
                
            } catch (error) {
                console.error('Error loading clinical areas:', error);
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
                    .eq('is_verified', true)
                    .gte('check_in_time', today.toISOString())
                    .lt('check_in_time', tomorrow.toISOString());
                
                if (!error) {
                    presentTodayElement.textContent = count || 0;
                }
            } catch (error) {
                console.error('Error loading today count:', error);
            }
        }
        
        // Load attendance history with enhanced display
        async function loadGeoAttendanceHistory(filter = 'today') {
            const tableBody = document.getElementById('geo-attendance-history');
            if (!tableBody || !attendanceUserId) return;
            
            tableBody.innerHTML = '<tr><td colspan="7"><div class="loading-spinner"></div> Loading history...</td></tr>';
            
            try {
                const supabaseClient = window.db?.supabase;
                if (!supabaseClient) throw new Error('Database not available');
                
                let query = supabaseClient
                    .from('geo_attendance_logs')
                    .select('*')
                    .eq('student_id', attendanceUserId)
                    .order('check_in_time', { ascending: false })
                    .limit(100);
                
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
                            <td colspan="7" class="text-center py-4">
                                <i class="fas fa-history fa-2x" style="color: #cbd5e1;"></i>
                                <p style="color: #94a3b8; margin-top: 8px;">No check-in history found</p>
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
                    
                    const distance = log.distance_meters;
                    const isVerified = log.is_verified;
                    const distanceWithinRange = distance && distance <= MAX_ALLOWED_DISTANCE;
                    
                    let statusIcon, statusColor, statusText;
                    if (isVerified && distanceWithinRange) {
                        statusIcon = 'fa-check-circle';
                        statusColor = '#10b981';
                        statusText = '✓ Verified';
                    } else if (distance && distance <= MAX_ALLOWED_DISTANCE && !isVerified) {
                        statusIcon = 'fa-clock';
                        statusColor = '#f59e0b';
                        statusText = '⏳ Pending Review';
                    } else {
                        statusIcon = 'fa-times-circle';
                        statusColor = '#ef4444';
                        statusText = '✗ Out of Range';
                    }
                    
                    let locationIcon, locationColor, locationText;
                    if (distance && distance <= MAX_ALLOWED_DISTANCE) {
                        locationIcon = 'fa-check-circle';
                        locationColor = '#10b981';
                        locationText = 'On Campus ✓';
                    } else if (distance && distance <= 100) {
                        locationIcon = 'fa-exclamation-triangle';
                        locationColor = '#f59e0b';
                        locationText = 'Near Campus';
                    } else {
                        locationIcon = 'fa-map-marker-alt';
                        locationColor = '#ef4444';
                        locationText = 'Off Campus';
                    }
                    
                    let distanceText = '';
                    let distanceClass = '';
                    if (distance) {
                        if (distance <= MAX_ALLOWED_DISTANCE) {
                            distanceClass = 'distance-good';
                            distanceText = `${distance.toFixed(0)}m ✓`;
                        } else if (distance <= 100) {
                            distanceClass = 'distance-warning';
                            distanceText = `${distance.toFixed(0)}m ⚠️`;
                        } else {
                            distanceClass = 'distance-bad';
                            if (distance >= 1000) {
                                distanceText = `${(distance / 1000).toFixed(2)}km ✗`;
                            } else {
                                distanceText = `${distance.toFixed(0)}m ✗`;
                            }
                        }
                    } else {
                        distanceText = 'N/A';
                    }
                    
                    const accuracy = log.accuracy_m;
                    let accuracyText = '';
                    let accuracyClass = '';
                    if (accuracy) {
                        if (accuracy <= MIN_GPS_ACCURACY) {
                            accuracyClass = 'accuracy-good';
                            accuracyText = `±${accuracy.toFixed(0)}m ✓`;
                        } else if (accuracy <= 50) {
                            accuracyClass = 'accuracy-warning';
                            accuracyText = `±${accuracy.toFixed(0)}m ⚠️`;
                        } else {
                            accuracyClass = 'accuracy-bad';
                            accuracyText = `±${accuracy.toFixed(0)}m ✗`;
                        }
                    } else {
                        accuracyText = 'N/A';
                    }
                    
                    const row = document.createElement('tr');
                    row.className = 'attendance-row';
                    row.innerHTML = `
                        <td style="white-space: nowrap;"><i class="far fa-calendar-alt" style="color: #94a3b8; margin-right: 6px;"></i>${timeStr}</td>
                        <td><span class="session-badge session-${log.session_type?.toLowerCase()}">${log.session_type || 'N/A'}</span></td>
                        <td><strong>${log.target_name || 'N/A'}</strong></td>
                        <td style="color: ${statusColor}; font-weight: 500;">
                            <i class="fas ${statusIcon}" style="margin-right: 4px;"></i>${statusText}
                        </td>
                        <td style="color: ${locationColor};">
                            <i class="fas ${locationIcon}" style="margin-right: 4px;"></i>${locationText}
                        </td>
                        <td>
                            <div class="distance-badge ${distanceClass}">${distanceText}</div>
                            <div class="accuracy-badge ${accuracyClass}" style="margin-top: 4px;">${accuracyText}</div>
                        </td>
                     </tr>
                    `;
                    tableBody.appendChild(row);
                });
                
                // Update summary stats
                updateHistoryStats(logs);
                
            } catch (error) {
                console.error('Error loading history:', error);
                tableBody.innerHTML = `
                    <tr>
                        <td colspan="7" class="text-center" style="color: #ef4444; padding: 20px;">
                            <i class="fas fa-exclamation-triangle"></i> Error loading history
                        </td>
                    </tr>
                `;
            }
        }
        
        function updateHistoryStats(logs) {
            const statsContainer = document.getElementById('history-stats');
            if (!statsContainer) return;
            
            const total = logs.length;
            const verified = logs.filter(l => l.is_verified).length;
            const withinRange = logs.filter(l => l.distance_meters && l.distance_meters <= MAX_ALLOWED_DISTANCE).length;
            const highAccuracy = logs.filter(l => l.accuracy_m && l.accuracy_m <= MIN_GPS_ACCURACY).length;
            
            statsContainer.innerHTML = `
                <div style="display: flex; gap: 1rem; flex-wrap: wrap; padding: 1rem; background: #f8fafc; border-radius: 12px; margin-bottom: 1rem;">
                    <div style="flex: 1; text-align: center;">
                        <div style="font-size: 11px; color: #64748b; text-transform: uppercase;">Total Check-ins</div>
                        <div style="font-size: 24px; font-weight: bold; color: #4C1D95;">${total}</div>
                    </div>
                    <div style="flex: 1; text-align: center;">
                        <div style="font-size: 11px; color: #64748b; text-transform: uppercase;">Verified</div>
                        <div style="font-size: 24px; font-weight: bold; color: #10b981;">${verified}</div>
                    </div>
                    <div style="flex: 1; text-align: center;">
                        <div style="font-size: 11px; color: #64748b; text-transform: uppercase;">Within ${MAX_ALLOWED_DISTANCE}m</div>
                        <div style="font-size: 24px; font-weight: bold; color: #3b82f6;">${withinRange}</div>
                    </div>
                    <div style="flex: 1; text-align: center;">
                        <div style="font-size: 11px; color: #64748b; text-transform: uppercase;">High Accuracy (≤${MIN_GPS_ACCURACY}m)</div>
                        <div style="font-size: 24px; font-weight: bold; color: #8b5cf6;">${highAccuracy}</div>
                    </div>
                </div>
            `;
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
            
            return R * c;
        }
        
        // Check-in function with 50m verification
        async function attendanceGeoCheckIn() {
            const button = document.getElementById('check-in-button');
            const sessionTypeSelect = document.getElementById('session-type');
            const targetSelect = document.getElementById('attendance-target');
            
            if (!button || !sessionTypeSelect || !targetSelect) return;
            
            button.disabled = true;
            const originalHTML = button.innerHTML;
            button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verifying location within 50m...';
            
            try {
                if (!sessionTypeSelect.value) throw new Error('Please select session type');
                if (!targetSelect.value || targetSelect.value === '') throw new Error('Please select target');
                if (!currentLocation) throw new Error('Location not available. Enable GPS and try again.');
                
                // Check GPS accuracy
                if (currentLocation.accuracy > MIN_GPS_ACCURACY) {
                    throw new Error(`GPS accuracy too low (${currentLocation.accuracy.toFixed(0)}m). Need ≤${MIN_GPS_ACCURACY}m accuracy. Please move to an open area.`);
                }
                
                const [targetId, targetName, sessionType, unitCode] = targetSelect.value.split('|');
                const targetType = sessionTypeSelect.value;
                
                let targetLat = NAKURU_COLLEGE.latitude;
                let targetLon = NAKURU_COLLEGE.longitude;
                
                if (targetType === 'clinical') {
                    const target = attendanceCachedClinicalAreas.find(t => t.id === targetId);
                    if (target) {
                        targetLat = target.latitude;
                        targetLon = target.longitude;
                    }
                }
                
                const distance = calculateAttendanceDistance(
                    currentLocation.latitude,
                    currentLocation.longitude,
                    targetLat,
                    targetLon
                );
                
                // CRITICAL: Check if within 50 METERS
                const isVerified = distance <= MAX_ALLOWED_DISTANCE;
                
                if (!isVerified) {
                    let distanceText = distance >= 1000 ? `${(distance/1000).toFixed(2)} km` : `${distance.toFixed(0)} meters`;
                    throw new Error(`You are ${distanceText} away from campus. Must be within ${MAX_ALLOWED_DISTANCE} meters to check in.`);
                }
                
                const supabaseClient = window.db?.supabase;
                if (!supabaseClient) throw new Error('Database connection error');
                
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
                    is_verified: true, // Auto-verified since we checked distance
                    device_id: getAttendanceDeviceId(),
                    student_name: attendanceUserProfile?.full_name || 'Unknown',
                    distance_meters: distance,
                    target_latitude: targetLat,
                    target_longitude: targetLon,
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
                
                // Dispatch attendance event
                document.dispatchEvent(new CustomEvent('attendanceRecorded', {
                    detail: {
                        unitCode: selectedUnit?.unit_code || unitCode,
                        unitName: selectedUnit?.unit_name || targetName,
                        isVerified: true,
                        distance: distance,
                        timestamp: new Date().toISOString(),
                        sessionType: targetType
                    }
                }));
                
                if (window.AppUtils?.showToast) {
                    window.AppUtils.showToast(
                        `✅ Successfully checked into ${targetName}! (${distance.toFixed(0)}m from campus)`, 
                        'success'
                    );
                }
                
                await loadTodayAttendanceCount();
                triggerDashboardAttendanceUpdate();
                
                // Reset form
                sessionTypeSelect.value = '';
                targetSelect.value = '';
                handleSessionTypeChange();
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
        
        // Add CSS for enhanced attendance system
        const style = document.createElement('style');
        style.textContent = `
            .accuracy-dot.excellent { background-color: #10b981; box-shadow: 0 0 0 2px #d1fae5; }
            .accuracy-dot.good { background-color: #3b82f6; box-shadow: 0 0 0 2px #dbeafe; }
            .accuracy-dot.medium { background-color: #f59e0b; }
            .accuracy-dot.low { background-color: #ef4444; }
            
            .session-badge {
                display: inline-block;
                padding: 4px 10px;
                border-radius: 20px;
                font-size: 11px;
                font-weight: 600;
            }
            .session-class { background: #e0e7ff; color: #3730a3; }
            .session-clinical { background: #dcfce7; color: #166534; }
            .session-lab { background: #fef3c7; color: #92400e; }
            .session-tutorial { background: #fce7f3; color: #9d174d; }
            
            .distance-good { color: #10b981; font-weight: 500; }
            .distance-warning { color: #f59e0b; font-weight: 500; }
            .distance-bad { color: #ef4444; font-weight: 500; }
            
            .accuracy-good { color: #10b981; font-size: 11px; }
            .accuracy-warning { color: #f59e0b; font-size: 11px; }
            .accuracy-bad { color: #ef4444; font-size: 11px; }
            
            .attendance-row:hover {
                background-color: #f8fafc;
                transition: background-color 0.2s;
            }
            
            #distance-status {
                margin-top: 10px;
                padding: 10px;
                border-radius: 8px;
                font-size: 13px;
                align-items: center;
                gap: 8px;
            }
            
            #gps-status {
                transition: all 0.3s ease;
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
