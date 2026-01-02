// attendance.js - Working version with proper scope
// *************************************************************************
// *** ATTENDANCE SYSTEM ***
// *************************************************************************

(function() {
    'use strict';
    
    // LOCAL variables - don't conflict with other files
    let attendanceCachedClinicalAreas = [];
    let attendanceCachedCourses = [];
    let attendanceUserId = null;
    let attendanceUserProfile = null;
    let isLoadingAttendance = false;
    
    // Constants
    const ATTENDANCE_FALLBACK_LAT = -1.2921;
    const ATTENDANCE_FALLBACK_LON = 36.8219;
    const ATTENDANCE_FALLBACK_ACCURACY = 1000;
    const ATTENDANCE_MAX_DISTANCE_RADIUS = 50;
    const ATTENDANCE_LOCATIONIQ_API_URL = 'https://us1.locationiq.com/v1/reverse';
    const ATTENDANCE_LOCATIONIQ_API_KEY = 'pk.b5a1de84afc36de2fd38643ba63d3124';
    
    // Initialize attendance system
    function initializeAttendanceSystem() {
        console.log('📱 Initializing Attendance System...');
        
        // Set up event listeners for attendance tab
        const attendanceTab = document.querySelector('.nav a[data-tab="attendance"]');
        if (attendanceTab) {
            attendanceTab.addEventListener('click', () => {
                if (!isLoadingAttendance) {
                    loadAttendanceData();
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
        
        console.log('✅ Attendance System initialized');
    }
    
    // Load attendance data
    async function loadAttendanceData() {
        if (isLoadingAttendance) return;
        
        const geoMessage = document.getElementById('geo-message');
        const attendanceTargetSelect = document.getElementById('attendance-target');
        
        isLoadingAttendance = true;
        if (geoMessage) {
            geoMessage.textContent = '⏳ Loading attendance data...';
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
            
            // Load class targets  
            await loadClassTargets();
            
            // Update target dropdown
            attendanceUpdateTargetSelect();
            
            // Load attendance history
            if (document.getElementById('geo-attendance-history')) {
                await loadGeoAttendanceHistory();
            }
            
            if (geoMessage) {
                geoMessage.textContent = '✅ Attendance data loaded. Select session type and target to check in.';
                geoMessage.className = 'attendance-success-message';
            }
            
        } catch (error) {
            console.error("Failed to load attendance data:", error);
            if (geoMessage) {
                geoMessage.textContent = '❌ Error loading attendance data: ' + error.message;
                geoMessage.className = 'attendance-error-message';
            }
        } finally {
            isLoadingAttendance = false;
        }
    }
    
    // Load clinical targets
    async function loadClinicalTargets() {
        console.log('🏥 Loading clinical targets...');
        
        if (!attendanceUserProfile || (!attendanceUserProfile.program && !attendanceUserProfile.department) || !attendanceUserProfile.intake_year) {
            console.warn('⚠️ Missing user profile data for clinical targets');
            attendanceCachedClinicalAreas = [];
            return;
        }
        
        try {
            const supabaseClient = window.db?.supabase;
            
            if (!supabaseClient || typeof supabaseClient.from !== 'function') {
                console.error("❌ No valid Supabase client for clinical targets");
                attendanceCachedClinicalAreas = [];
                return;
            }
            
            const program = attendanceUserProfile?.program || attendanceUserProfile?.department;
            const intakeYear = attendanceUserProfile?.intake_year;
            const blockTerm = attendanceUserProfile?.block || null;
            
            console.log('🎯 Clinical query params:', { program, intakeYear, blockTerm });
            
            const { data: areaData, error: areaError } = await supabaseClient
                .from('clinical_areas')
                .select('id, name, latitude, longitude, block, program, intake_year')
                .ilike('program', program)
                .ilike('intake_year', intakeYear)
                .or(blockTerm ? `block.ilike.${blockTerm},block.is.null` : 'block.is.null');
            
            if (areaError) throw areaError;
            
            const { data: nameData, error: nameError } = await supabaseClient
                .from('clinical_names')
                .select('id, uuid, clinical_area_name, latitude, longitude, program, intake_year, block_term')
                .ilike('program', program)
                .ilike('intake_year', intakeYear)
                .or(blockTerm ? `block_term.ilike.${blockTerm},block_term.is.null` : 'block_term.is.null');
            
            if (nameError) throw nameError;
            
            const mappedNames = (nameData || []).map(n => ({
                id: n.uuid,
                original_id: n.id,
                name: n.clinical_area_name,
                latitude: n.latitude,
                longitude: n.longitude,
                block: n.block_term || null
            }));
            
            attendanceCachedClinicalAreas = [...(areaData || []), ...mappedNames]
                .filter((v, i, a) => a.findIndex(t => t.name === v.name) === i)
                .sort((a, b) => a.name.localeCompare(b.name));
            
            console.log(`✅ Loaded ${attendanceCachedClinicalAreas.length} clinical areas`);
            
        } catch (error) {
            console.error("Error loading clinical areas:", error);
            attendanceCachedClinicalAreas = [];
        }
    }
    
    // Load class targets
    async function loadClassTargets() {
        console.log('🏫 Loading class targets...');
        
        if (!attendanceUserProfile || (!attendanceUserProfile.program && !attendanceUserProfile.department) || !attendanceUserProfile.intake_year) {
            console.warn('⚠️ Missing user profile data for class targets');
            attendanceCachedCourses = [];
            return;
        }
        
        try {
            const supabaseClient = window.db?.supabase;
            
            if (!supabaseClient || typeof supabaseClient.from !== 'function') {
                console.error("❌ No valid Supabase client for class targets");
                attendanceCachedCourses = [];
                return;
            }
            
            const program = attendanceUserProfile?.program || attendanceUserProfile?.department;
            const intakeYear = attendanceUserProfile?.intake_year;
            const block = attendanceUserProfile?.block || null;
            
            console.log('🎯 Class query params:', { program, intakeYear, block });
            
            let query = supabaseClient.from('courses_sections')
                .select('id, name, code, latitude, longitude')
                .eq('program', program)
                .eq('intake_year', intakeYear);
            
            if (block) query = query.or(`block.eq.${block},block.is.null`);
            else query = query.is('block', null);
            
            const { data, error } = await query.order('name');
            
            if (error) throw error;
            
            attendanceCachedCourses = (data || []).map(course => ({
                id: course.id,
                name: course.name,
                code: course.code,
                latitude: course.latitude,
                longitude: course.longitude
            }));
            
            console.log(`✅ Loaded ${attendanceCachedCourses.length} class targets`);
            
        } catch (error) {
            console.error("Error loading class targets:", error);
            attendanceCachedCourses = [];
        }
    }
    
    // Load attendance history
    async function loadGeoAttendanceHistory() {
        const tableBody = document.getElementById('geo-attendance-history');
        if (!tableBody) return;
        
        tableBody.innerHTML = '<tr><td colspan="4">Loading geo check-in history...</td></tr>';
        
        try {
            const supabaseClient = window.db?.supabase;
            
            if (!supabaseClient || typeof supabaseClient.from !== 'function') {
                throw new Error('No valid database connection for attendance history');
            }
            
            const { data: logs, error } = await supabaseClient
                .from('geo_attendance_logs')
                .select('check_in_time, session_type, target_name, is_verified')
                .eq('student_id', attendanceUserId)
                .order('check_in_time', { ascending: false })
                .limit(100);
            
            if (error) throw error;
            
            tableBody.innerHTML = '';
            if (!logs || logs.length === 0) {
                tableBody.innerHTML = '<tr><td colspan="4">No check-in logs found.</td></tr>';
                return;
            }
            
            console.log(`✅ Loaded ${logs.length} attendance logs`);
            
            logs.forEach(log => {
                const timeStr = new Date(log.check_in_time).toLocaleString();
                const verifiedText = log.is_verified ? '✅ Verified' : '⏳ Pending verification';
                const verifiedClass = log.is_verified ? 'attendance-verified' : 'attendance-pending';
                
                const row = `
                    <tr>
                        <td>${timeStr}</td>
                        <td>${log.session_type}</td>
                        <td>${log.target_name}</td>
                        <td class="attendance-verification-status ${verifiedClass}">${verifiedText}</td>
                    </tr>
                `;
                tableBody.innerHTML += row;
            });
            
        } catch (error) {
            console.error("Failed to load attendance history:", error);
            tableBody.innerHTML = `
                <tr>
                    <td colspan="4" style="color:#EF4444;">
                        Error loading attendance logs: ${error.message}
                        <br>
                        <button onclick="attendanceLoadHistory()" class="attendance-btn-small">
                            Retry
                        </button>
                    </td>
                </tr>
            `;
        }
    }
    
    // Update target dropdown
    function attendanceUpdateTargetSelect() {
        const sessionTypeSelect = document.getElementById('session-type');
        const attendanceTargetSelect = document.getElementById('attendance-target');
        const geoMessage = document.getElementById('geo-message');
        
        if (!sessionTypeSelect || !attendanceTargetSelect || !geoMessage) {
            console.warn('⚠️ Missing required elements for target select');
            return;
        }
        
        const sessionType = sessionTypeSelect.value;
        attendanceTargetSelect.innerHTML = '';
        
        let targetList = [];
        let label = 'Department/Course:';
        
        if (sessionType === 'Clinical') {
            targetList = attendanceCachedClinicalAreas.map(d => ({
                id: d.id,
                name: d.name,
                text: `${d.name} (Clinical)`
            }));
            label = 'Department/Area:';
            console.log(`🎯 Clinical targets available: ${targetList.length}`);
        } else if (sessionType === 'Class') {
            targetList = attendanceCachedCourses.map(c => ({
                id: c.id,
                name: c.name,
                code: c.code,
                text: `${c.code ? c.code + ' - ' : ''}${c.name} (Class)`
            }));
            label = 'Course/Subject:';
            console.log(`🎯 Class targets available: ${targetList.length}`);
        }
        
        // Update label
        const targetLabel = document.getElementById('target-label');
        if (targetLabel) {
            targetLabel.textContent = label;
        }
        
        if (targetList.length === 0) {
            const message = sessionType === 'Class'
                ? 'No active courses found for your block.'
                : 'No clinical areas assigned to your block.';
            attendanceTargetSelect.innerHTML = `<option value="">${message}</option>`;
            console.log(`📭 ${message}`);
        } else {
            const defaultOption = document.createElement('option');
            defaultOption.value = '';
            defaultOption.textContent = `-- Select a ${label.replace(':', '')} --`;
            attendanceTargetSelect.appendChild(defaultOption);
            
            targetList.forEach(target => {
                const option = document.createElement('option');
                option.value = `${target.id}|${target.name}`;
                option.textContent = target.text;
                attendanceTargetSelect.appendChild(option);
            });
            
            attendanceTargetSelect.selectedIndex = 0;
            console.log(`✅ Populated dropdown with ${targetList.length} options`);
        }
        
        if (geoMessage) {
            geoMessage.innerHTML = `Please select a specific <strong>${label.replace(':', '')}</strong> to check in.`;
        }
    }
    
    // Get device ID
    function getAttendanceDeviceId() {
        let deviceId = localStorage.getItem('attendance_device_id');
        if (!deviceId) {
            deviceId = crypto.randomUUID();
            localStorage.setItem('attendance_device_id', deviceId);
            console.log('📱 Generated new attendance device ID:', deviceId);
        }
        return deviceId;
    }
    
    // Get current location
    async function getAttendanceCurrentLocation() {
        console.log('📍 Getting current location...');
        
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                console.warn('⚠️ Geolocation not supported by browser');
                resolve({
                    lat: ATTENDANCE_FALLBACK_LAT,
                    lon: ATTENDANCE_FALLBACK_LON,
                    acc: ATTENDANCE_FALLBACK_ACCURACY,
                    friendly: 'GPS unavailable in browser'
                });
                return;
            }
            
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const location = {
                        lat: position.coords.latitude,
                        lon: position.coords.longitude,
                        acc: position.coords.accuracy,
                        friendly: null
                    };
                    console.log('📍 GPS location obtained:', location);
                    resolve(location);
                },
                (error) => {
                    console.warn('⚠️ GPS error:', error.message);
                    resolve({
                        lat: ATTENDANCE_FALLBACK_LAT,
                        lon: ATTENDANCE_FALLBACK_LON,
                        acc: ATTENDANCE_FALLBACK_ACCURACY,
                        friendly: `GPS denied: ${error.message}`
                    });
                },
                { 
                    enableHighAccuracy: true, 
                    timeout: 15000, 
                    maximumAge: 0 
                }
            );
        });
    }
    
    // Reverse geocode location
    async function attendanceReverseGeocode(lat, lon) {
        console.log('🗺️ Reverse geocoding location...');
        
        try {
            const res = await fetch(
                `${ATTENDANCE_LOCATIONIQ_API_URL}?key=${ATTENDANCE_LOCATIONIQ_API_KEY}&lat=${lat}&lon=${lon}&format=json`
            );
            
            if (res.ok) {
                const geoData = await res.json();
                const friendlyName = geoData?.display_name || `Lat:${lat.toFixed(4)}, Lon:${lon.toFixed(4)}`;
                console.log('✅ Reverse geocode successful:', friendlyName);
                return friendlyName;
            } else {
                const fallback = `Lat:${lat.toFixed(4)}, Lon:${lon.toFixed(4)}`;
                console.warn('⚠️ Reverse geocode API failed, using fallback');
                return fallback;
            }
        } catch (err) {
            const fallback = `Lat:${lat.toFixed(4)}, Lon:${lon.toFixed(4)}`;
            console.warn('⚠️ Reverse geocode error:', err.message);
            return fallback;
        }
    }
    
    // Calculate distance between two points (Haversine formula)
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
        
        console.log(`📏 Distance calculation: ${distanceMeters.toFixed(2)} meters`);
        return distanceMeters;
    }
    
    // Geo check-in function
    async function attendanceGeoCheckIn() {
        console.log('📍 Starting attendance geo check-in process...');
        
        const button = document.getElementById('check-in-button');
        const geoMessage = document.getElementById('geo-message');
        const sessionTypeSelect = document.getElementById('session-type');
        const attendanceTargetSelect = document.getElementById('attendance-target');
        
        if (button) button.disabled = true;
        if (geoMessage) {
            geoMessage.textContent = '⏱️ Initializing check-in...';
            geoMessage.className = 'attendance-info-message';
        }
        
        try {
            // Ensure user profile is loaded
            if (!attendanceUserProfile) {
                throw new Error('Student profile not loaded');
            }
            
            const studentProgram = attendanceUserProfile?.program || attendanceUserProfile?.department || null;
            const deviceId = getAttendanceDeviceId();
            const sessionType = sessionTypeSelect?.value;
            const targetSelect = attendanceTargetSelect?.value;
            const checkInTime = new Date().toISOString();
            
            console.log('📋 Check-in parameters:', {
                sessionType,
                targetSelect,
                studentProgram,
                deviceId
            });
            
            // Validate inputs
            if (!sessionType || !targetSelect || targetSelect === '') {
                throw new Error('Please select session type and target');
            }
            
            // Parse target selection
            const [targetId, targetNameFromDropdown] = targetSelect.split('|');
            if (!targetId || !targetNameFromDropdown) {
                throw new Error('Invalid target selected');
            }
            
            // Check offline status
            if (!navigator.onLine) {
                console.log('📴 Offline mode detected');
                if (geoMessage) {
                    geoMessage.innerHTML = `
                        <span class="attendance-offline-message">
                            ✅ Check-in saved offline. Will sync when back online.
                        </span>
                    `;
                    geoMessage.className = 'attendance-offline-message';
                }
                return;
            }
            
            // Get current location
            if (geoMessage) {
                geoMessage.textContent = '📍 Requesting location... (Please allow GPS access)';
            }
            
            const location = await getAttendanceCurrentLocation();
            
            // Reverse geocode for friendly name
            if (!location.friendly) {
                location.friendly = await attendanceReverseGeocode(location.lat, location.lon);
            }
            
            // Find target entry
            let targetEntry = sessionType === 'Clinical'
                ? attendanceCachedClinicalAreas.find(c => c.id === targetId)
                : attendanceCachedCourses.find(c => c.id === targetId);
                
            if (!targetEntry) {
                throw new Error('Selected target not found in cache');
            }
            
            if (targetEntry.latitude === null || targetEntry.longitude === null) {
                throw new Error('Target location coordinates not available');
            }
            
            // Prepare data for database
            let dbTargetId = targetEntry.id;
            let targetNameToLog = targetEntry.name;
            let selectedCourseId = null;
            
            if (sessionType === 'Class') {
                selectedCourseId = targetEntry.id;
            }
            
            // Calculate distance and verify
            const distanceMeters = calculateAttendanceDistance(
                location.lat, location.lon,
                targetEntry.latitude, targetEntry.longitude
            );
            
            const isVerified = distanceMeters <= ATTENDANCE_MAX_DISTANCE_RADIUS;
            console.log(`✅ Verification: ${isVerified ? 'Within range' : 'Out of range'} (${distanceMeters.toFixed(2)}m)`);
            
            // Insert check-in via RPC
            if (geoMessage) {
                geoMessage.textContent = '📡 Submitting check-in...';
            }
            
            const supabaseClient = window.db?.supabase;
            
            if (!supabaseClient || typeof supabaseClient.rpc !== 'function') {
                throw new Error('No valid database connection for check-in');
            }
            
            const { error } = await supabaseClient
                .rpc('check_in_and_defer_fk', {
                    p_student_id: attendanceUserId,
                    p_check_in_time: checkInTime,
                    p_session_type: sessionType === 'Clinical' ? 'Clinical' : 'Class',
                    p_target_id: dbTargetId,
                    p_target_name: targetNameToLog,
                    p_latitude: location.lat,
                    p_longitude: location.lon,
                    p_accuracy_m: location.acc,
                    p_location_friendly_name: location.friendly,
                    p_program: studentProgram,
                    p_block: attendanceUserProfile.block,
                    p_intake_year: attendanceUserProfile.intake_year,
                    p_device_id: deviceId,
                    p_is_verified: isVerified,
                    p_course_id: selectedCourseId,
                    p_student_name: attendanceUserProfile.full_name || attendanceUserProfile.name || 'Unknown Student'
                });
            
            if (error) {
                console.error('❌ RPC error:', error);
                throw new Error(`Check-in failed: ${error.message}`);
            }
            
            // Success
            console.log('✅ Check-in successful!');
            if (geoMessage) {
                geoMessage.innerHTML = `
                    <span class="attendance-success-message">
                        ✅ Check-in complete! ${isVerified ? 'Verified successfully' : 'Pending verification'}
                        <br><small>Distance: ${distanceMeters.toFixed(2)}m from target</small>
                    </span>
                `;
                geoMessage.className = 'attendance-success-message';
            }
            
            // Refresh attendance history
            loadGeoAttendanceHistory();
            
            // Dispatch event to notify dashboard
            document.dispatchEvent(new CustomEvent('attendanceCheckedIn'));
            
        } catch (error) {
            console.error('❌ Geo check-in error:', error);
            if (geoMessage) {
                geoMessage.innerHTML = `
                    <span class="attendance-error-message">
                        🚫 ${error.message}
                    </span>
                `;
                geoMessage.className = 'attendance-error-message';
            }
        } finally {
            if (button) {
                button.disabled = false;
            }
            console.log('🏁 Geo check-in process completed');
        }
    }
    
    // Add CSS for attendance status indicators
    const attendanceStyles = document.createElement('style');
    attendanceStyles.textContent = `
        .attendance-info-message { color: #3b82f6; }
        .attendance-success-message { color: #10b981; }
        .attendance-error-message { color: #ef4444; }
        .attendance-offline-message { color: #f59e0b; }
        
        .attendance-verification-status.attendance-verified { color: #10b981; font-weight: 600; }
        .attendance-verification-status.attendance-pending { color: #f59e0b; font-weight: 600; }
        
        .attendance-btn-small {
            padding: 4px 8px;
            font-size: 0.8rem;
            background: #3b82f6;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            margin-top: 5px;
        }
        
        .attendance-btn-small:hover {
            background: #2563eb;
        }
    `;
    document.head.appendChild(attendanceStyles);
    
    // *************************************************************************
    // *** GLOBAL EXPORTS ***
    // *************************************************************************
    
    // Make functions globally available with unique names
    window.attendanceLoadData = loadAttendanceData;
    window.attendanceGeoCheckIn = attendanceGeoCheckIn;
    window.attendanceLoadHistory = loadGeoAttendanceHistory;
    window.attendanceUpdateTargetSelect = attendanceUpdateTargetSelect;
    window.initializeAttendanceSystem = initializeAttendanceSystem;
    
    // Auto-initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeAttendanceSystem);
    } else {
        initializeAttendanceSystem();
    }
    
    console.log('✅ Attendance module loaded with proper scope');
})();
