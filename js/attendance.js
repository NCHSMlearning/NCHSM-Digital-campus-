// attendance.js - ENHANCED VERSION WITH BETTER ACCURACY & COURSE INTEGRATION
// *************************************************************************
// *** ATTENDANCE SYSTEM ***
// *************************************************************************

(function() {
    'use strict';
    
    // LOCAL variables - don't conflict with other files
    let attendanceCachedClinicalAreas = [];
    let attendanceUserId = null;
    let attendanceUserProfile = null;
    let isLoadingAttendance = false;
    let currentLocation = null;
    let locationWatchId = null;
    let locationAccuracy = 'low';
    
    // Constants
    const ATTENDANCE_MAX_DISTANCE_RADIUS = 50; // 50 meters max distance
    const ATTENDANCE_HIGH_ACCURACY_THRESHOLD = 20; // meters
    const ATTENDANCE_MEDIUM_ACCURACY_THRESHOLD = 50; // meters
    
    // Initialize attendance system
    function initializeAttendanceSystem() {
        console.log('📱 Initializing Enhanced Attendance System...');
        
        // Set up event listeners for attendance tab
        const attendanceTab = document.querySelector('.nav a[data-tab="attendance"]');
        if (attendanceTab) {
            attendanceTab.addEventListener('click', () => {
                if (!isLoadingAttendance) {
                    loadAttendanceData();
                    startLocationMonitoring();
                }
            });
        }
        
        // Set up check-in button
        const checkInButton = document.getElementById('check-in-button');
        if (checkInButton) {
            checkInButton.addEventListener('click', attendanceGeoCheckIn);
        }
        
        // Set up session type change
        const sessionTypeSelect = document.getElementById('session-type');
        if (sessionTypeSelect) {
            sessionTypeSelect.addEventListener('change', attendanceUpdateTargetSelect);
        }
        
        // Set up refresh button for courses
        const refreshCoursesBtn = document.createElement('button');
        refreshCoursesBtn.id = 'refresh-attendance-courses';
        refreshCoursesBtn.className = 'btn-refresh-small';
        refreshCoursesBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Refresh Courses';
        refreshCoursesBtn.style.marginLeft = '10px';
        refreshCoursesBtn.addEventListener('click', () => {
            loadClassTargets(true);
        });
        
        const targetLabel = document.getElementById('target-label');
        if (targetLabel) {
            targetLabel.parentNode.appendChild(refreshCoursesBtn);
        }
        
        // Update time display every minute
        updateTimeDisplay();
        setInterval(updateTimeDisplay, 60000);
        
        console.log('✅ Enhanced Attendance System initialized');
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
    
    // Load attendance data
    async function loadAttendanceData() {
        if (isLoadingAttendance) return;
        
        const geoMessage = document.getElementById('geo-message');
        const presentTodayElement = document.getElementById('present-today');
        
        isLoadingAttendance = true;
        
        if (geoMessage) {
            geoMessage.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading attendance data...';
            geoMessage.className = 'attendance-info-message';
        }
        
        try {
            // Try multiple sources for user profile
            attendanceUserProfile = window.db?.currentUserProfile || 
                                   window.currentUserProfile || 
                                   window.userProfile;
            
            attendanceUserId = window.db?.currentUserId || 
                              window.currentUserId || 
                              attendanceUserProfile?.user_id;
            
            const supabaseClient = window.db?.supabase || window.supabase;
            
            // If no profile found, try to load it
            if (!attendanceUserProfile || !attendanceUserId || !supabaseClient) {
                console.warn('📱 User profile or database not available for attendance, attempting to load...');
                
                if (supabaseClient) {
                    const { data: { user } } = await supabaseClient.auth.getUser();
                    if (user) {
                        window.currentUserId = user.id;
                        
                        const { data: profile } = await supabaseClient
                            .from('consolidated_user_profiles_table')
                            .select('*')
                            .eq('user_id', user.id)
                            .single();
                        
                        if (profile) {
                            attendanceUserProfile = profile;
                            window.currentUserProfile = profile;
                            window.userProfile = profile;
                            
                            if (window.db) {
                                window.db.currentUserProfile = profile;
                                window.db.currentUserId = user.id;
                            }
                            
                            console.log('✅ Attendance: User profile loaded');
                        }
                    }
                }
                
                if (!attendanceUserProfile) {
                    throw new Error('User profile not available. Please refresh the page or log in again.');
                }
            }
            
            console.log('📱 Attendance using profile:', {
                name: attendanceUserProfile.full_name,
                program: attendanceUserProfile.program || attendanceUserProfile.department,
                block: attendanceUserProfile.block,
                intakeYear: attendanceUserProfile.intake_year
            });
            
            // Load clinical targets
            await loadClinicalTargets();
            
            // Load active courses from courses module
            await loadClassTargets(false);
            
            // Load today's attendance count
            await loadTodayAttendanceCount();
            
            // Update target dropdown
            attendanceUpdateTargetSelect();
            
            // Load attendance history
            if (document.getElementById('geo-attendance-history')) {
                await loadGeoAttendanceHistory();
            }
            
            if (geoMessage) {
                geoMessage.innerHTML = '<i class="fas fa-check-circle"></i> Attendance data loaded. Select session type and target to check in.';
                geoMessage.className = 'attendance-success-message';
            }
            
        } catch (error) {
            console.error("Failed to load attendance data:", error);
            if (geoMessage) {
                geoMessage.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Error loading attendance data: ' + error.message;
                geoMessage.className = 'attendance-error-message';
            }
        } finally {
            isLoadingAttendance = false;
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
    
    // Start continuous location monitoring for better accuracy
    function startLocationMonitoring() {
        if (!navigator.geolocation) {
            updateGPSStatus('error', 'Geolocation not supported');
            return;
        }
        
        if (locationWatchId) {
            navigator.geolocation.clearWatch(locationWatchId);
        }
        
        const gpsStatus = document.getElementById('gps-status');
        if (gpsStatus) {
            gpsStatus.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span>Acquiring precise location...</span>';
        }
        
        const options = {
            enableHighAccuracy: true,
            timeout: 30000,
            maximumAge: 0
        };
        
        // First, get a quick position
        navigator.geolocation.getCurrentPosition(
            (position) => {
                handleLocationUpdate(position, true);
                // Then start watching for better accuracy
                locationWatchId = navigator.geolocation.watchPosition(
                    (position) => handleLocationUpdate(position, false),
                    (error) => handleLocationError(error),
                    options
                );
            },
            (error) => handleLocationError(error),
            options
        );
    }
    
    function handleLocationUpdate(position, isFirst) {
        currentLocation = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: new Date(position.timestamp)
        };
        
        // Determine accuracy level
        if (currentLocation.accuracy <= ATTENDANCE_HIGH_ACCURACY_THRESHOLD) {
            locationAccuracy = 'high';
        } else if (currentLocation.accuracy <= ATTENDANCE_MEDIUM_ACCURACY_THRESHOLD) {
            locationAccuracy = 'medium';
        } else {
            locationAccuracy = 'low';
        }
        
        // Update UI
        updateGPSStatus('success', `Location accuracy: ${locationAccuracy}`);
        updateLocationDisplay();
        updateRequirement('location', locationAccuracy === 'high' || locationAccuracy === 'medium');
        
        console.log(`📍 Location updated (${locationAccuracy}):`, {
            lat: currentLocation.latitude.toFixed(6),
            lon: currentLocation.longitude.toFixed(6),
            accuracy: currentLocation.accuracy.toFixed(1) + 'm'
        });
    }
    
    function handleLocationError(error) {
        console.warn('GPS error:', error);
        
        let message = '';
        switch(error.code) {
            case error.PERMISSION_DENIED:
                message = 'GPS permission denied. Please enable location services.';
                break;
            case error.POSITION_UNAVAILABLE:
                message = 'Location information unavailable.';
                break;
            case error.TIMEOUT:
                message = 'Location request timed out.';
                break;
            default:
                message = 'Unknown GPS error.';
        }
        
        updateGPSStatus('error', message);
        updateRequirement('location', false);
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
            case 'loading':
                icon = '<i class="fas fa-spinner fa-spin"></i>';
                gpsStatus.style.color = '#f59e0b';
                break;
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
            accuracyDot.classList.add(locationAccuracy);
        }
    }
    
    // Load class targets from courses module (ACTIVE COURSES ONLY)
    async function loadClassTargets(forceRefresh = false) {
        console.log('🏫 Loading class targets from active courses...');
        
        try {
            // First, try to get active courses from courses module
            let activeCourses = [];
            
            // Check if courses module exists
            if (window.coursesModule && window.coursesModule.activeCourses) {
                console.log('📚 Getting active courses from courses module');
                activeCourses = window.coursesModule.activeCourses;
            } 
            // Fallback to global cached courses
            else if (window.cachedCourses) {
                console.log('📚 Getting courses from global cache');
                activeCourses = window.cachedCourses.filter(course => 
                    !course.isCompleted && course.status !== 'Completed'
                );
            }
            // If no courses available, fetch from database
            else if (attendanceUserProfile) {
                console.log('📚 Fetching courses from database');
                const supabaseClient = window.db?.supabase;
                if (supabaseClient) {
                    const program = attendanceUserProfile.program || attendanceUserProfile.department;
                    const intakeYear = attendanceUserProfile.intake_year;
                    const block = attendanceUserProfile.block;
                    
                    let query = supabaseClient
                        .from('courses')
                        .select('*')
                        .eq('intake_year', intakeYear)
                        .order('course_name', { ascending: true });
                    
                    const isTVET = program.includes('TVET') || program.includes('CRAFT') || program.includes('ARTISAN');
                    
                    if (isTVET) {
                        query = query
                            .eq('target_program', program)
                            .or(`block.eq.${attendanceUserProfile.term || 'Term 1'},block.eq.General,block.is.null`);
                    } else {
                        query = query
                            .or(`target_program.eq.${program},target_program.eq.General`)
                            .or(`block.eq.${block},block.is.null,block.eq.General`);
                    }
                    
                    const { data: courses, error } = await query;
                    
                    if (!error && courses) {
                        activeCourses = courses.filter(course => 
                            course.status !== 'Completed' && course.status !== 'Passed'
                        );
                    }
                }
            }
            
            // Transform to target format
            const classTargets = activeCourses.map(course => ({
                id: course.id,
                name: course.course_name || 'Unnamed Course',
                code: course.unit_code || course.code || '',
                latitude: course.latitude || -1.2921, // Default: Nairobi coordinates
                longitude: course.longitude || 36.8219,
                credits: course.credits || 3,
                block: course.block || 'General'
            }));
            
            console.log(`✅ Loaded ${classTargets.length} active courses for attendance`);
            console.log('📋 Active courses:', classTargets);
            
            // Store in window for reuse
            window.attendanceCachedCourses = classTargets;
            
            // Update UI
            if (forceRefresh) {
                attendanceUpdateTargetSelect();
                if (window.AppUtils?.showToast) {
                    window.AppUtils.showToast('Courses refreshed successfully', 'success');
                }
            }
            
            return classTargets;
            
        } catch (error) {
            console.error("Error loading class targets:", error);
            window.attendanceCachedCourses = [];
            return [];
        }
    }
    
    // Load clinical targets (same as before)
    async function loadClinicalTargets() {
        // ... keep the existing clinical target loading code ...
        // (Your original clinical target loading code remains the same)
    }
    
    // Update target dropdown with better UX
    function attendanceUpdateTargetSelect() {
        const sessionTypeSelect = document.getElementById('session-type');
        const attendanceTargetSelect = document.getElementById('attendance-target');
        const targetControlGroup = document.getElementById('target-control-group');
        const geoMessage = document.getElementById('geo-message');
        
        if (!sessionTypeSelect || !attendanceTargetSelect) return;
        
        const sessionType = sessionTypeSelect.value;
        attendanceTargetSelect.innerHTML = '';
        targetControlGroup.style.display = sessionType ? 'flex' : 'none';
        
        let targetList = [];
        let label = 'Select:';
        let placeholder = 'Select target...';
        
        if (sessionType === 'clinical') {
            targetList = attendanceCachedClinicalAreas || [];
            label = 'Clinical Department:';
            placeholder = 'Select clinical department...';
        } else if (sessionType === 'class' || sessionType === 'lab' || sessionType === 'tutorial') {
            targetList = window.attendanceCachedCourses || [];
            
            if (sessionType === 'class') {
                label = 'Course:';
                placeholder = 'Select course...';
            } else if (sessionType === 'lab') {
                label = 'Laboratory:';
                placeholder = 'Select laboratory...';
            } else if (sessionType === 'tutorial') {
                label = 'Tutorial Room:';
                placeholder = 'Select tutorial room...';
            }
        }
        
        // Update label and placeholder
        const targetText = document.getElementById('target-text');
        if (targetText) targetText.textContent = label;
        
        if (targetList.length === 0) {
            const message = sessionType === 'clinical' 
                ? 'No clinical areas available'
                : 'No active courses found. Click "Refresh Courses" above.';
            attendanceTargetSelect.innerHTML = `<option value="">${message}</option>`;
            attendanceTargetSelect.disabled = true;
        } else {
            attendanceTargetSelect.disabled = false;
            attendanceTargetSelect.innerHTML = `<option value="">${placeholder}</option>`;
            
            targetList.forEach(target => {
                const option = document.createElement('option');
                option.value = `${target.id}|${target.name}`;
                
                // Format display text
                let displayText = target.name;
                if (target.code && sessionType === 'class') {
                    displayText = `${target.code} - ${target.name}`;
                }
                if (target.credits && sessionType === 'class') {
                    displayText += ` (${target.credits} credits)`;
                }
                if (target.block && target.block !== 'General') {
                    displayText += ` [${target.block}]`;
                }
                
                option.textContent = displayText;
                attendanceTargetSelect.appendChild(option);
            });
        }
        
        // Update requirement
        updateRequirement('session', !!sessionType);
        updateRequirement('target', false);
        
        // Update check-in button
        updateCheckInButton();
        
        if (geoMessage) {
            geoMessage.innerHTML = `<i class="fas fa-info-circle"></i> Select a <strong>${label.replace(':', '')}</strong> to check in.`;
        }
    }
    
    // Update requirement status
    function updateRequirement(type, isValid) {
        const reqElement = document.getElementById(`req-${type}`);
        if (!reqElement) return;
        
        const icon = reqElement.querySelector('.req-icon');
        if (icon) {
            icon.className = `fas ${isValid ? 'fa-check' : 'fa-times'} req-icon`;
            icon.style.color = isValid ? '#22c55e' : '#ef4444';
        }
    }
    
    // Update check-in button state
    function updateCheckInButton() {
        const checkInButton = document.getElementById('check-in-button');
        const sessionTypeSelect = document.getElementById('session-type');
        const attendanceTargetSelect = document.getElementById('attendance-target');
        
        if (!checkInButton) return;
        
        const hasSession = sessionTypeSelect?.value;
        const hasTarget = attendanceTargetSelect?.value && attendanceTargetSelect.value !== '';
        const hasLocation = locationAccuracy === 'high' || locationAccuracy === 'medium';
        
        const allRequirementsMet = hasSession && hasTarget && hasLocation;
        
        checkInButton.disabled = !allRequirementsMet;
        
        if (allRequirementsMet) {
            checkInButton.classList.add('ready');
            checkInButton.querySelector('.btn-subtext').textContent = 'Ready to check in';
        } else {
            checkInButton.classList.remove('ready');
            checkInButton.querySelector('.btn-subtext').textContent = 'GPS verification required';
        }
    }
    
    // Enhanced distance calculation with accuracy adjustment
    function calculateAttendanceDistance(lat1, lon1, lat2, lon2) {
        const R = 6371000; // Earth radius in meters
        
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
        
        // Adjust for GPS accuracy
        const adjustedDistance = Math.max(0, distanceMeters - currentLocation.accuracy);
        
        console.log(`📏 Distance calculation:`, {
            actual: distanceMeters.toFixed(2) + 'm',
            accuracy: currentLocation.accuracy.toFixed(2) + 'm',
            adjusted: adjustedDistance.toFixed(2) + 'm',
            accuracyLevel: locationAccuracy
        });
        
        return {
            actual: distanceMeters,
            adjusted: adjustedDistance,
            accuracy: currentLocation.accuracy,
            accuracyLevel: locationAccuracy
        };
    }
    
    // Enhanced geo check-in with better verification
    async function attendanceGeoCheckIn() {
        console.log('📍 Starting enhanced attendance check-in...');
        
        const button = document.getElementById('check-in-button');
        const geoMessage = document.getElementById('geo-message');
        const sessionTypeSelect = document.getElementById('session-type');
        const attendanceTargetSelect = document.getElementById('attendance-target');
        
        if (button) {
            button.disabled = true;
            button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Checking in...';
        }
        
        if (geoMessage) {
            geoMessage.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Starting check-in process...';
            geoMessage.className = 'attendance-info-message';
        }
        
        try {
            // Validate inputs
            if (!sessionTypeSelect?.value) {
                throw new Error('Please select a session type');
            }
            
            if (!attendanceTargetSelect?.value || attendanceTargetSelect.value === '') {
                throw new Error('Please select a target');
            }
            
            if (!currentLocation) {
                throw new Error('Location not available. Please wait for GPS to connect.');
            }
            
            if (locationAccuracy === 'low') {
                throw new Error('GPS accuracy too low for check-in. Please move to a better location.');
            }
            
            // Parse target selection
            const [targetId, targetName] = attendanceTargetSelect.value.split('|');
            if (!targetId || !targetName) {
                throw new Error('Invalid target selection');
            }
            
            // Find target
            const sessionType = sessionTypeSelect.value;
            const targetList = sessionType === 'clinical' 
                ? attendanceCachedClinicalAreas 
                : window.attendanceCachedCourses;
            
            const target = targetList?.find(t => t.id === targetId);
            if (!target) {
                throw new Error('Target not found');
            }
            
            // Calculate distance with enhanced accuracy
            const distance = calculateAttendanceDistance(
                currentLocation.latitude,
                currentLocation.longitude,
                target.latitude,
                target.longitude
            );
            
            // Enhanced verification logic
            const maxAllowedDistance = ATTENDANCE_MAX_DISTANCE_RADIUS + currentLocation.accuracy;
            const isVerified = distance.adjusted <= maxAllowedDistance;
            const verificationReason = isVerified 
                ? `Within allowed range (${distance.adjusted.toFixed(1)}m ≤ ${maxAllowedDistance.toFixed(1)}m)`
                : `Too far from target (${distance.adjusted.toFixed(1)}m > ${maxAllowedDistance.toFixed(1)}m)`;
            
            console.log(`✅ Verification: ${verificationReason}`);
            
            // Prepare check-in data
            const checkInData = {
                student_id: attendanceUserId,
                check_in_time: new Date().toISOString(),
                session_type: sessionType.charAt(0).toUpperCase() + sessionType.slice(1),
                target_id: targetId,
                target_name: targetName,
                latitude: currentLocation.latitude,
                longitude: currentLocation.longitude,
                accuracy_m: currentLocation.accuracy,
                location_friendly_name: `Accuracy: ${locationAccuracy} (${currentLocation.accuracy.toFixed(1)}m)`,
                program: attendanceUserProfile?.program || attendanceUserProfile?.department,
                block: attendanceUserProfile?.block,
                intake_year: attendanceUserProfile?.intake_year,
                device_id: getAttendanceDeviceId(),
                is_verified: isVerified,
                course_id: sessionType === 'class' ? targetId : null,
                student_name: attendanceUserProfile?.full_name || 'Unknown Student',
                distance_meters: distance.actual,
                accuracy_level: locationAccuracy
            };
            
            // Save check-in
            const supabaseClient = window.db?.supabase;
            if (!supabaseClient) {
                throw new Error('Database connection not available');
            }
            
            const { error } = await supabaseClient
                .from('geo_attendance_logs')
                .insert([checkInData]);
            
            if (error) throw error;
            
            // Success
            console.log('✅ Check-in recorded successfully');
            
            if (geoMessage) {
                const icon = isVerified ? 'fa-check-circle' : 'fa-clock';
                const color = isVerified ? 'success' : 'warning';
                const status = isVerified ? 'Verified' : 'Pending review';
                
                geoMessage.innerHTML = `
                    <i class="fas ${icon}"></i>
                    <div>
                        <strong>Check-in ${status}!</strong><br>
                        <small>
                            Target: ${targetName}<br>
                            Distance: ${distance.actual.toFixed(1)}m<br>
                            GPS Accuracy: ${locationAccuracy} (${currentLocation.accuracy.toFixed(1)}m)
                        </small>
                    </div>
                `;
                geoMessage.className = `attendance-${color}-message`;
            }
            
            // Update today's count
            loadTodayAttendanceCount();
            
            // Refresh history
            loadGeoAttendanceHistory();
            
            // Reset form after successful check-in
            setTimeout(() => {
                sessionTypeSelect.value = '';
                attendanceUpdateTargetSelect();
                if (geoMessage) {
                    geoMessage.innerHTML = '<i class="fas fa-info-circle"></i> Select session type and target for next check-in.';
                    geoMessage.className = 'attendance-info-message';
                }
            }, 3000);
            
        } catch (error) {
            console.error('❌ Check-in failed:', error);
            if (geoMessage) {
                geoMessage.innerHTML = `<i class="fas fa-exclamation-triangle"></i> ${error.message}`;
                geoMessage.className = 'attendance-error-message';
            }
        } finally {
            if (button) {
                button.disabled = false;
                button.innerHTML = '<i class="fas fa-fingerprint"></i> Check In Now';
            }
        }
    }
    
    // Load attendance history (enhanced)
    async function loadGeoAttendanceHistory(filter = 'today') {
        const tableBody = document.getElementById('geo-attendance-history');
        if (!tableBody || !attendanceUserId) return;
        
        try {
            const supabaseClient = window.db?.supabase;
            if (!supabaseClient) return;
            
            let query = supabaseClient
                .from('geo_attendance_logs')
                .select('*')
                .eq('student_id', attendanceUserId)
                .order('check_in_time', { ascending: false });
            
            // Apply filter
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
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });
                
                const statusIcon = log.is_verified ? 'fa-check-circle' : 'fa-clock';
                const statusColor = log.is_verified ? 'text-green-600' : 'text-yellow-600';
                const statusText = log.is_verified ? 'Verified' : 'Pending';
                
                const accuracyBadge = log.accuracy_level === 'high' 
                    ? '<span class="accuracy-badge high">High</span>'
                    : log.accuracy_level === 'medium'
                    ? '<span class="accuracy-badge medium">Medium</span>'
                    : '<span class="accuracy-badge low">Low</span>';
                
                const row = `
                    <tr>
                        <td>
                            <strong>${timeStr}</strong><br>
                            <small class="text-gray-500">${accuracyBadge}</small>
                        </td>
                        <td>${log.session_type}</td>
                        <td>${log.target_name}</td>
                        <td class="${statusColor}">
                            <i class="fas ${statusIcon}"></i> ${statusText}
                        </td>
                        <td>
                            <small>${log.location_friendly_name || 'N/A'}</small><br>
                            <small class="text-gray-500">${log.distance_meters ? log.distance_meters.toFixed(1) + 'm' : 'N/A'}</small>
                        </td>
                        <td>
                            <button class="view-details-btn" data-id="${log.id}">
                                <i class="fas fa-eye"></i>
                            </button>
                        </td>
                    </tr>
                `;
                tableBody.innerHTML += row;
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
    
    // Add enhanced CSS
    const attendanceStyles = document.createElement('style');
    attendanceStyles.textContent = `
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
        
        .accuracy-badge {
            padding: 2px 6px;
            border-radius: 10px;
            font-size: 0.7rem;
            font-weight: 600;
        }
        .accuracy-badge.high {
            background-color: #dcfce7;
            color: #166534;
        }
        .accuracy-badge.medium {
            background-color: #fef3c7;
            color: #92400e;
        }
        .accuracy-badge.low {
            background-color: #fee2e2;
            color: #991b1b;
        }
        
        .btn-checkin.ready {
            background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
            animation: pulse 2s infinite;
        }
        
        @keyframes pulse {
            0% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.7); }
            70% { box-shadow: 0 0 0 10px rgba(34, 197, 94, 0); }
            100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0); }
        }
        
        .btn-refresh-small {
            background: #f1f5f9;
            border: 1px solid #e2e8f0;
            color: #64748b;
            padding: 5px 10px;
            border-radius: 6px;
            font-size: 0.8rem;
            cursor: pointer;
            transition: all 0.2s;
        }
        
        .btn-refresh-small:hover {
            background: #e2e8f0;
        }
        
        .view-details-btn {
            background: none;
            border: 1px solid #e2e8f0;
            color: #64748b;
            width: 30px;
            height: 30px;
            border-radius: 6px;
            cursor: pointer;
            transition: all 0.2s;
        }
        
        .view-details-btn:hover {
            background: #f8fafc;
            color: var(--color-primary);
        }
    `;
    document.head.appendChild(attendanceStyles);
    
    // *************************************************************************
    // *** GLOBAL EXPORTS ***
    // *************************************************************************
    
    // Make functions globally available
    window.attendanceLoadData = loadAttendanceData;
    window.attendanceGeoCheckIn = attendanceGeoCheckIn;
    window.attendanceLoadHistory = loadGeoAttendanceHistory;
    window.attendanceUpdateTargetSelect = attendanceUpdateTargetSelect;
    window.initializeAttendanceSystem = initializeAttendanceSystem;
    window.refreshAttendanceCourses = () => loadClassTargets(true);
    
    // Auto-initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeAttendanceSystem);
    } else {
        initializeAttendanceSystem();
    }
    
    console.log('✅ Enhanced Attendance module loaded');
})();
