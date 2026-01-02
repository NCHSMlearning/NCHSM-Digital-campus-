// attendance.js - Fixed version for your database structure
// *************************************************************************
// *** ATTENDANCE SYSTEM ***
// *************************************************************************

(function() {
    'use strict';
    
    // ============================
    // Configuration
    // ============================
    const CONFIG = {
        FALLBACK_LAT: -1.2921,
        FALLBACK_LON: 36.8219,
        FALLBACK_ACCURACY: 1000,
        MAX_DISTANCE_RADIUS: 50,
        LOCATIONIQ_API_KEY: 'pk.b5a1de84afc36de2fd38643ba63d3124',
        GEOLOCATION_TIMEOUT: 10000
    };
    
    // ============================
    // State Management
    // ============================
    let attendanceState = {
        clinicalAreas: [],
        courses: [],
        userId: null,
        userProfile: null,
        isLoading: false,
        currentLocation: null
    };
    
    // ============================
    // Core Initialization
    // ============================
    function initializeAttendanceSystem() {
        console.log('📱 Initializing Attendance System...');
        
        // Wait for DOM to be fully ready
        setTimeout(() => {
            cacheDOMElements();
            setupEventListeners();
            injectStyles();
            
            // Check if we're on attendance tab on load
            if (isOnAttendanceTab()) {
                loadAttendanceData();
            }
        }, 100);
        
        console.log('✅ Attendance System ready');
    }
    
    function cacheDOMElements() {
        // Cache all attendance-related DOM elements
        window.attendanceElements = {
            geoMessage: document.getElementById('geo-message'),
            checkInButton: document.getElementById('check-in-button'),
            sessionTypeSelect: document.getElementById('session-type'),
            attendanceTargetSelect: document.getElementById('attendance-target'),
            targetLabel: document.getElementById('target-label'),
            historyTable: document.getElementById('geo-attendance-history')
        };
    }
    
    function setupEventListeners() {
        // Attendance tab click
        const attendanceTab = document.querySelector('.nav a[data-tab="attendance"]');
        if (attendanceTab) {
            attendanceTab.addEventListener('click', () => {
                if (!attendanceState.isLoading) {
                    loadAttendanceData();
                }
            });
        }
        
        // Check-in button
        if (window.attendanceElements?.checkInButton) {
            window.attendanceElements.checkInButton.addEventListener('click', geoCheckIn);
        }
        
        // Session type change
        if (window.attendanceElements?.sessionTypeSelect) {
            window.attendanceElements.sessionTypeSelect.addEventListener('change', updateTargetSelect);
        }
        
        // Online/offline detection
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
    }
    
    // ============================
    // Data Loading
    // ============================
    async function loadAttendanceData() {
        if (attendanceState.isLoading) return;
        
        attendanceState.isLoading = true;
        showMessage('⏳ Loading attendance data...', 'info');
        updateButtonState(true, '⏳ Loading...');
        
        try {
            // Load user profile
            await loadUserProfile();
            
            if (!attendanceState.userProfile) {
                throw new Error('Please log in again to use attendance system');
            }
            
            console.log('👤 User profile loaded:', {
                name: attendanceState.userProfile.full_name,
                program: attendanceState.userProfile.program || attendanceState.userProfile.department,
                block: attendanceState.userProfile.block,
                intakeYear: attendanceState.userProfile.intake_year
            });
            
            // Load data based on tab
            const sessionType = window.attendanceElements?.sessionTypeSelect?.value;
            
            if (sessionType === 'Clinical') {
                await loadClinicalAreas();
            } else if (sessionType === 'Class') {
                await loadCourses();
            } else {
                // Load both if no selection
                await Promise.all([loadClinicalAreas(), loadCourses()]);
            }
            
            // Update UI
            updateTargetSelect();
            
            // Load history if table exists
            if (window.attendanceElements?.historyTable) {
                await loadAttendanceHistory();
            }
            
            showMessage('✅ Attendance data loaded. Select session type and target.', 'success');
            
        } catch (error) {
            console.error('❌ Failed to load attendance data:', error);
            showMessage(`❌ ${error.message}`, 'error');
        } finally {
            attendanceState.isLoading = false;
            updateButtonState(false, 'Check In');
        }
    }
    
    async function loadUserProfile() {
        // Try multiple sources for user profile
        attendanceState.userProfile = window.db?.currentUserProfile || 
                                     window.currentUserProfile || 
                                     window.userProfile;
        
        attendanceState.userId = window.db?.currentUserId || 
                                window.currentUserId || 
                                attendanceState.userProfile?.user_id;
        
        // If still no profile, try to fetch it
        if (!attendanceState.userProfile || !attendanceState.userId) {
            const supabase = getSupabaseClient();
            if (supabase) {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    attendanceState.userId = user.id;
                    
                    const { data: profile } = await supabase
                        .from('consolidated_user_profiles_table')
                        .select('*')
                        .eq('user_id', attendanceState.userId)
                        .single();
                    
                    if (profile) {
                        attendanceState.userProfile = profile;
                        
                        // Update global references
                        window.currentUserProfile = profile;
                        window.userProfile = profile;
                        window.currentUserId = user.id;
                        
                        if (window.db) {
                            window.db.currentUserProfile = profile;
                            window.db.currentUserId = user.id;
                        }
                        
                        console.log('✅ User profile loaded from database');
                    }
                }
            }
        }
        
        if (!attendanceState.userProfile) {
            throw new Error('User profile not found. Please refresh the page.');
        }
    }
    
    async function loadClinicalAreas() {
        console.log('🏥 Loading clinical areas...');
        
        if (!attendanceState.userProfile) {
            console.warn('⚠️ No user profile for clinical areas');
            attendanceState.clinicalAreas = [];
            return;
        }
        
        const supabase = getSupabaseClient();
        if (!supabase) {
            console.error('❌ No database connection');
            attendanceState.clinicalAreas = [];
            return;
        }
        
        const program = attendanceState.userProfile.program || attendanceState.userProfile.department;
        const intakeYear = attendanceState.userProfile.intake_year;
        const blockTerm = attendanceState.userProfile.block;
        
        if (!program || !intakeYear) {
            console.warn('⚠️ Missing program or intake year');
            attendanceState.clinicalAreas = [];
            return;
        }
        
        try {
            // Query clinical areas
            const { data: areaData, error: areaError } = await supabase
                .from('clinical_areas')
                .select('id, name, latitude, longitude, block, program, intake_year')
                .eq('program', program)
                .eq('intake_year', intakeYear)
                .or(blockTerm ? `block.ilike.${blockTerm},block.is.null` : 'block.is.null');
            
            if (areaError) throw areaError;
            
            // Query clinical names
            const { data: nameData, error: nameError } = await supabase
                .from('clinical_names')
                .select('id, uuid, clinical_area_name, latitude, longitude, program, intake_year, block_term')
                .eq('program', program)
                .eq('intake_year', intakeYear)
                .or(blockTerm ? `block_term.ilike.${blockTerm},block_term.is.null` : 'block_term.is.null');
            
            if (nameError) throw nameError;
            
            // Combine results
            const mappedNames = (nameData || []).map(n => ({
                id: n.uuid || n.id,
                name: n.clinical_area_name,
                latitude: n.latitude,
                longitude: n.longitude,
                block: n.block_term || null,
                type: 'clinical_name'
            }));
            
            const mappedAreas = (areaData || []).map(a => ({
                id: a.id,
                name: a.name,
                latitude: a.latitude,
                longitude: a.longitude,
                block: a.block || null,
                type: 'clinical_area'
            }));
            
            attendanceState.clinicalAreas = [...mappedAreas, ...mappedNames]
                .filter(item => item.name && item.latitude && item.longitude)
                .filter((item, index, array) => 
                    array.findIndex(t => t.name === item.name) === index
                )
                .sort((a, b) => a.name.localeCompare(b.name));
            
            console.log(`✅ Loaded ${attendanceState.clinicalAreas.length} clinical areas`);
            
        } catch (error) {
            console.error('❌ Error loading clinical areas:', error);
            attendanceState.clinicalAreas = [];
        }
    }
    
    async function loadCourses() {
        console.log('📚 Loading courses for attendance...');
        
        if (!attendanceState.userProfile) {
            console.warn('⚠️ No user profile for courses');
            attendanceState.courses = [];
            return;
        }
        
        const supabase = getSupabaseClient();
        if (!supabase) {
            console.error('❌ No database connection');
            attendanceState.courses = [];
            return;
        }
        
        const program = attendanceState.userProfile.program || attendanceState.userProfile.department;
        const intakeYear = attendanceState.userProfile.intake_year;
        const block = attendanceState.userProfile.block;
        
        if (!program || !intakeYear) {
            console.warn('⚠️ Missing program or intake year');
            attendanceState.courses = [];
            return;
        }
        
        try {
            // FIRST: Try to get courses via user_role_courses for instructors
            console.log('🔍 Checking user_role_courses for instructor assignments...');
            
            const { data: roleCourses, error: roleError } = await supabase
                .from('user_role_courses')
                .select(`
                    course_id,
                    courses (
                        id,
                        course_name,
                        unit_code,
                        latitude,
                        longitude,
                        program_type,
                        intake_year,
                        block
                    )
                `)
                .eq('user_id', attendanceState.userId);
            
            if (roleError && roleError.code !== 'PGRST116') { // Not "no rows found" error
                console.warn('⚠️ Error checking user_role_courses:', roleError);
            }
            
            let courses = [];
            
            if (roleCourses && roleCourses.length > 0) {
                // Filter courses that match user's program and intake year
                courses = roleCourses
                    .filter(item => item.courses)
                    .map(item => ({
                        ...item.courses,
                        source: 'user_role_courses'
                    }))
                    .filter(course => 
                        course.program_type === program && 
                        course.intake_year === intakeYear
                    );
                
                console.log(`📚 Found ${courses.length} courses via user_role_courses`);
            }
            
            // SECOND: If no courses via user_role_courses, try courses_sections table
            if (courses.length === 0) {
                console.log('🔍 Checking courses_sections table...');
                
                let query = supabase
                    .from('courses_sections')
                    .select('id, name, code, latitude, longitude, program, intake_year, block')
                    .eq('program', program)
                    .eq('intake_year', intakeYear);
                
                if (block) {
                    query = query.or(`block.eq.${block},block.is.null`);
                } else {
                    query = query.is('block', null);
                }
                
                const { data: sectionsData, error: sectionsError } = await query.order('name');
                
                if (sectionsError) {
                    console.warn('⚠️ Error checking courses_sections:', sectionsError);
                } else if (sectionsData) {
                    courses = sectionsData.map(course => ({
                        id: course.id,
                        course_name: course.name,
                        unit_code: course.code,
                        latitude: course.latitude,
                        longitude: course.longitude,
                        program_type: course.program,
                        intake_year: course.intake_year,
                        block: course.block,
                        source: 'courses_sections'
                    }));
                    
                    console.log(`📚 Found ${courses.length} courses via courses_sections`);
                }
            }
            
            // THIRD: If still no courses, try direct courses table
            if (courses.length === 0) {
                console.log('🔍 Checking courses table directly...');
                
                let query = supabase
                    .from('courses')
                    .select('id, course_name, unit_code, latitude, longitude, program_type, intake_year, block')
                    .eq('program_type', program)
                    .eq('intake_year', intakeYear);
                
                if (block) {
                    query = query.or(`block.eq.${block},block.is.null`);
                } else {
                    query = query.is('block', null);
                }
                
                const { data: coursesData, error: coursesError } = await query.order('course_name');
                
                if (coursesError) {
                    console.warn('⚠️ Error checking courses table:', coursesError);
                } else if (coursesData) {
                    courses = coursesData.map(course => ({
                        ...course,
                        source: 'courses_table'
                    }));
                    
                    console.log(`📚 Found ${courses.length} courses via direct query`);
                }
            }
            
            // Filter courses by block if specified
            if (block && courses.length > 0) {
                courses = courses.filter(course => 
                    !course.block || course.block === block || course.block === 'General'
                );
            }
            
            // Ensure all required fields exist
            attendanceState.courses = courses
                .filter(course => 
                    course.course_name && 
                    course.latitude && 
                    course.longitude
                )
                .map(course => ({
                    id: course.id,
                    name: course.course_name,
                    code: course.unit_code || course.code || '',
                    latitude: course.latitude,
                    longitude: course.longitude,
                    block: course.block || null,
                    program: course.program_type || course.program,
                    intake_year: course.intake_year,
                    source: course.source || 'unknown'
                }))
                .filter((course, index, array) => 
                    array.findIndex(c => c.id === course.id) === index
                )
                .sort((a, b) => a.name.localeCompare(b.name));
            
            console.log(`✅ Total loaded: ${attendanceState.courses.length} courses for attendance`);
            
        } catch (error) {
            console.error('❌ Error loading courses:', error);
            attendanceState.courses = [];
        }
    }
    
    // ============================
    // UI Updates
    // ============================
    function updateTargetSelect() {
        const sessionSelect = window.attendanceElements?.sessionTypeSelect;
        const targetSelect = window.attendanceElements?.attendanceTargetSelect;
        const targetLabel = window.attendanceElements?.targetLabel;
        
        if (!sessionSelect || !targetSelect) return;
        
        const sessionType = sessionSelect.value;
        targetSelect.innerHTML = '';
        
        let options = [];
        let label = 'Select Target:';
        let placeholder = '-- Select --';
        
        if (sessionType === 'Clinical') {
            options = attendanceState.clinicalAreas;
            label = 'Clinical Area:';
            placeholder = '-- Select Clinical Area --';
        } else if (sessionType === 'Class') {
            options = attendanceState.courses;
            label = 'Course:';
            placeholder = '-- Select Course --';
        }
        
        // Update label
        if (targetLabel) {
            targetLabel.textContent = label;
        }
        
        // Add placeholder option
        const placeholderOption = document.createElement('option');
        placeholderOption.value = '';
        placeholderOption.textContent = placeholder;
        placeholderOption.disabled = true;
        placeholderOption.selected = true;
        targetSelect.appendChild(placeholderOption);
        
        // Add options
        if (options.length === 0) {
            const noDataOption = document.createElement('option');
            noDataOption.value = '';
            noDataOption.textContent = sessionType === 'Class' 
                ? 'No courses available for your program/block' 
                : 'No clinical areas available for your program/block';
            noDataOption.disabled = true;
            targetSelect.appendChild(noDataOption);
            targetSelect.disabled = true;
        } else {
            options.forEach((item, index) => {
                const option = document.createElement('option');
                option.value = `${item.id}|${item.name}|${item.latitude}|${item.longitude}|${item.code || ''}`;
                
                // Format display text
                let displayText = item.name;
                if (item.code) {
                    displayText = `${item.code} - ${item.name}`;
                }
                if (item.block) {
                    displayText += ` (${item.block})`;
                }
                
                option.textContent = displayText;
                option.dataset.lat = item.latitude;
                option.dataset.lon = item.longitude;
                targetSelect.appendChild(option);
            });
            targetSelect.disabled = false;
        }
        
        console.log(`✅ Updated ${sessionType} dropdown with ${options.length} options`);
    }
    
    async function loadAttendanceHistory() {
        const tableBody = window.attendanceElements?.historyTable;
        if (!tableBody) return;
        
        tableBody.innerHTML = `
            <tr>
                <td colspan="5" class="loading-cell">
                    <div class="loading-spinner-small"></div>
                    Loading attendance history...
                </td>
            </tr>
        `;
        
        try {
            const supabase = getSupabaseClient();
            if (!supabase) throw new Error('No database connection');
            
            const { data: logs, error } = await supabase
                .from('geo_attendance_logs')
                .select(`
                    check_in_time,
                    session_type,
                    target_name,
                    is_verified,
                    distance_meters,
                    location_friendly_name
                `)
                .eq('student_id', attendanceState.userId)
                .order('check_in_time', { ascending: false })
                .limit(50);
            
            if (error) throw error;
            
            renderAttendanceHistory(logs || []);
            
        } catch (error) {
            console.error('❌ Failed to load attendance history:', error);
            tableBody.innerHTML = `
                <tr>
                    <td colspan="5" class="error-cell">
                        ❌ Error loading history: ${error.message}
                        <br>
                        <button onclick="attendanceLoadHistory()" class="attendance-btn-small">
                            Retry
                        </button>
                    </td>
                </tr>
            `;
        }
    }
    
    function renderAttendanceHistory(logs) {
        const tableBody = window.attendanceElements?.historyTable;
        if (!tableBody) return;
        
        if (logs.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="5" class="empty-cell">
                        No attendance records found
                    </td>
                </tr>
            `;
            return;
        }
        
        tableBody.innerHTML = logs.map(log => {
            const time = new Date(log.check_in_time);
            const timeStr = time.toLocaleDateString('en-KE', {
                weekday: 'short',
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
            
            const verifiedClass = log.is_verified ? 'verified' : 'pending';
            const verifiedText = log.is_verified ? '✅ Verified' : '⏳ Pending';
            const distance = log.distance_meters ? 
                `${Math.round(log.distance_meters)}m` : 'N/A';
            
            let location = log.location_friendly_name || '';
            if (location.length > 30) {
                location = location.substring(0, 30) + '...';
            }
            
            return `
                <tr>
                    <td><small>${timeStr}</small></td>
                    <td>${log.session_type}</td>
                    <td>${log.target_name}</td>
                    <td><span class="attendance-badge ${verifiedClass}">${verifiedText}</span></td>
                    <td><small>${distance}${location ? `<br>📍 ${location}` : ''}</small></td>
                </tr>
            `;
        }).join('');
    }
    
    // ============================
    // Check-in Process
    // ============================
    async function geoCheckIn() {
        console.log('📍 Starting check-in process...');
        
        // Validate form
        if (!validateCheckInForm()) return;
        
        const originalButtonText = window.attendanceElements?.checkInButton?.textContent || 'Check In';
        updateButtonState(true, '⏳ Checking in...');
        showMessage('📍 Getting your location...', 'info');
        
        try {
            // Get current location
            const location = await getCurrentLocation();
            attendanceState.currentLocation = location;
            
            // Parse target data
            const targetData = parseTargetData();
            if (!targetData) return;
            
            // Calculate distance
            const distance = calculateDistance(
                location.lat, location.lon,
                targetData.latitude, targetData.longitude
            );
            
            const isVerified = distance <= CONFIG.MAX_DISTANCE_RADIUS;
            console.log(`📏 Distance to target: ${distance.toFixed(2)}m, Verified: ${isVerified}`);
            
            // Prepare check-in data
            const checkInData = prepareCheckInData(location, targetData, distance, isVerified);
            
            // Submit check-in
            await submitCheckIn(checkInData);
            
            // Success
            showCheckInSuccess(distance, isVerified);
            
            // Refresh history
            await loadAttendanceHistory();
            
            // Notify other components
            document.dispatchEvent(new CustomEvent('attendanceCheckedIn'));
            
        } catch (error) {
            console.error('❌ Check-in failed:', error);
            showMessage(`❌ ${error.message}`, 'error');
            
            // Try offline save
            if (!navigator.onLine) {
                showMessage('📴 Check-in saved offline. Will sync when back online.', 'warning');
            }
        } finally {
            updateButtonState(false, originalButtonText);
        }
    }
    
    function validateCheckInForm() {
        const sessionSelect = window.attendanceElements?.sessionTypeSelect;
        const targetSelect = window.attendanceElements?.attendanceTargetSelect;
        
        if (!sessionSelect?.value) {
            showMessage('❌ Please select a session type', 'error');
            sessionSelect?.focus();
            return false;
        }
        
        if (!targetSelect?.value) {
            showMessage('❌ Please select a target', 'error');
            targetSelect?.focus();
            return false;
        }
        
        return true;
    }
    
    function parseTargetData() {
        const targetValue = window.attendanceElements?.attendanceTargetSelect?.value;
        if (!targetValue) return null;
        
        const [id, name, lat, lon, code] = targetValue.split('|');
        
        if (!id || !name || !lat || !lon) {
            throw new Error('Invalid target selection');
        }
        
        return {
            id,
            name,
            code: code || '',
            latitude: parseFloat(lat),
            longitude: parseFloat(lon)
        };
    }
    
    async function getCurrentLocation() {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                console.warn('⚠️ Geolocation not supported');
                resolve({
                    lat: CONFIG.FALLBACK_LAT,
                    lon: CONFIG.FALLBACK_LON,
                    acc: CONFIG.FALLBACK_ACCURACY,
                    isFallback: true
                });
                return;
            }
            
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    resolve({
                        lat: position.coords.latitude,
                        lon: position.coords.longitude,
                        acc: position.coords.accuracy,
                        timestamp: new Date().toISOString(),
                        isFallback: false
                    });
                },
                (error) => {
                    console.warn('⚠️ Geolocation error:', error.message);
                    resolve({
                        lat: CONFIG.FALLBACK_LAT,
                        lon: CONFIG.FALLBACK_LON,
                        acc: CONFIG.FALLBACK_ACCURACY,
                        isFallback: true,
                        error: error.message
                    });
                },
                {
                    enableHighAccuracy: true,
                    timeout: CONFIG.GEOLOCATION_TIMEOUT,
                    maximumAge: 0
                }
            );
        });
    }
    
    function calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371000; // Earth radius in meters
        const toRad = (deg) => deg * Math.PI / 180;
        
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
    
    function prepareCheckInData(location, target, distance, isVerified) {
        const sessionType = window.attendanceElements?.sessionTypeSelect?.value;
        const deviceId = getDeviceId();
        
        return {
            p_student_id: attendanceState.userId,
            p_check_in_time: new Date().toISOString(),
            p_session_type: sessionType,
            p_target_id: target.id,
            p_target_name: target.name,
            p_latitude: location.lat,
            p_longitude: location.lon,
            p_accuracy_m: location.acc,
            p_location_friendly_name: `Lat: ${location.lat.toFixed(6)}, Lon: ${location.lon.toFixed(6)}`,
            p_program: attendanceState.userProfile?.program || attendanceState.userProfile?.department,
            p_block: attendanceState.userProfile?.block,
            p_intake_year: attendanceState.userProfile?.intake_year,
            p_device_id: deviceId,
            p_is_verified: isVerified,
            p_course_id: sessionType === 'Class' ? target.id : null,
            p_student_name: attendanceState.userProfile?.full_name || 'Student',
            p_distance_meters: Math.round(distance)
        };
    }
    
    async function submitCheckIn(checkInData) {
        showMessage('📡 Submitting check-in...', 'info');
        
        const supabase = getSupabaseClient();
        if (!supabase) {
            throw new Error('No database connection');
        }
        
        // Add reverse geocoding for friendly location name
        try {
            const friendlyName = await reverseGeocode(checkInData.p_latitude, checkInData.p_longitude);
            checkInData.p_location_friendly_name = friendlyName;
        } catch (error) {
            console.warn('⚠️ Reverse geocode failed:', error.message);
        }
        
        const { error } = await supabase
            .rpc('check_in_and_defer_fk', checkInData);
        
        if (error) {
            console.error('❌ RPC error:', error);
            
            // Save to local storage if offline
            if (!navigator.onLine) {
                saveCheckInOffline(checkInData);
                throw new Error('Check-in saved offline. Will sync when back online.');
            }
            
            throw new Error(`Check-in failed: ${error.message}`);
        }
        
        console.log('✅ Check-in submitted successfully');
    }
    
    async function reverseGeocode(lat, lon) {
        try {
            const response = await fetch(
                `https://us1.locationiq.com/v1/reverse?key=${CONFIG.LOCATIONIQ_API_KEY}&lat=${lat}&lon=${lon}&format=json`
            );
            
            if (response.ok) {
                const data = await response.json();
                return data.display_name || `Location: ${lat.toFixed(4)}, ${lon.toFixed(4)}`;
            }
        } catch (error) {
            console.warn('⚠️ Reverse geocode failed:', error.message);
        }
        
        return `Location: ${lat.toFixed(4)}, ${lon.toFixed(4)}`;
    }
    
    // ============================
    // Offline Support
    // ============================
    function saveCheckInOffline(checkInData) {
        const pendingCheckIns = JSON.parse(localStorage.getItem('attendance_pending') || '[]');
        checkInData.offline_saved = new Date().toISOString();
        pendingCheckIns.push(checkInData);
        localStorage.setItem('attendance_pending', JSON.stringify(pendingCheckIns));
        console.log('💾 Check-in saved offline');
    }
    
    async function syncPendingCheckIns() {
        const pendingCheckIns = JSON.parse(localStorage.getItem('attendance_pending') || '[]');
        if (pendingCheckIns.length === 0) return;
        
        console.log(`📤 Syncing ${pendingCheckIns.length} pending check-ins...`);
        
        const supabase = getSupabaseClient();
        if (!supabase) return;
        
        const successful = [];
        
        for (const checkIn of pendingCheckIns) {
            try {
                const { error } = await supabase
                    .rpc('check_in_and_defer_fk', checkIn);
                
                if (!error) {
                    successful.push(checkIn);
                }
            } catch (error) {
                console.warn('⚠️ Failed to sync check-in:', error);
            }
        }
        
        // Remove successful syncs
        const remaining = pendingCheckIns.filter(c => 
            !successful.some(s => s.offline_saved === c.offline_saved)
        );
        
        localStorage.setItem('attendance_pending', JSON.stringify(remaining));
        
        if (successful.length > 0) {
            console.log(`✅ Synced ${successful.length} pending check-ins`);
            showMessage(`✅ Synced ${successful.length} pending check-ins`, 'success');
            loadAttendanceHistory();
        }
    }
    
    function handleOnline() {
        console.log('🌐 Back online');
        showMessage('✅ Back online - syncing pending check-ins...', 'success');
        syncPendingCheckIns();
    }
    
    function handleOffline() {
        console.log('📴 Offline');
        showMessage('⚠️ You are offline - check-ins will be saved locally', 'warning');
    }
    
    // ============================
    // Utility Functions
    // ============================
    function getSupabaseClient() {
        return window.db?.supabase || window.supabase;
    }
    
    function getDeviceId() {
        let deviceId = localStorage.getItem('attendance_device_id');
        if (!deviceId) {
            deviceId = 'device_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('attendance_device_id', deviceId);
        }
        return deviceId;
    }
    
    function showMessage(text, type = 'info') {
        const messageEl = window.attendanceElements?.geoMessage;
        if (!messageEl) return;
        
        messageEl.textContent = text;
        messageEl.className = `attendance-message attendance-${type}-message`;
        
        // Auto-clear success messages
        if (type === 'success') {
            setTimeout(() => {
                if (messageEl.textContent === text) {
                    messageEl.textContent = '';
                    messageEl.className = 'attendance-message';
                }
            }, 5000);
        }
    }
    
    function updateButtonState(disabled, text) {
        const button = window.attendanceElements?.checkInButton;
        if (!button) return;
        
        button.disabled = disabled;
        button.textContent = text;
        
        if (disabled) {
            button.classList.add('loading');
        } else {
            button.classList.remove('loading');
        }
    }
    
    function showCheckInSuccess(distance, isVerified) {
        const status = isVerified ? '✅ Verified' : '⏳ Pending verification';
        const distanceText = distance < 1000 ? 
            `${distance.toFixed(0)}m` : 
            `${(distance/1000).toFixed(1)}km`;
        
        showMessage(`
            ${status}
            <br><small>Distance: ${distanceText} from target</small>
        `, 'success');
    }
    
    function isOnAttendanceTab() {
        const activeTab = document.querySelector('.nav a.active[data-tab="attendance"]');
        return activeTab !== null;
    }
    
    // ============================
    // CSS Injection
    // ============================
    function injectStyles() {
        if (document.querySelector('#attendance-styles')) return;
        
        const styles = document.createElement('style');
        styles.id = 'attendance-styles';
        styles.textContent = `
            .attendance-message {
                padding: 10px 15px;
                border-radius: 6px;
                margin: 10px 0;
                font-size: 14px;
                transition: all 0.3s ease;
            }
            
            .attendance-info-message {
                background-color: #e0f2fe;
                color: #0369a1;
                border: 1px solid #bae6fd;
            }
            
            .attendance-success-message {
                background-color: #dcfce7;
                color: #166534;
                border: 1px solid #bbf7d0;
            }
            
            .attendance-error-message {
                background-color: #fee2e2;
                color: #991b1b;
                border: 1px solid #fecaca;
            }
            
            .attendance-warning-message {
                background-color: #fef3c7;
                color: #92400e;
                border: 1px solid #fde68a;
            }
            
            .attendance-badge {
                display: inline-block;
                padding: 3px 10px;
                border-radius: 12px;
                font-size: 12px;
                font-weight: 600;
                white-space: nowrap;
            }
            
            .attendance-badge.verified {
                background-color: #dcfce7;
                color: #166534;
            }
            
            .attendance-badge.pending {
                background-color: #fef3c7;
                color: #92400e;
            }
            
            .loading-cell, .empty-cell, .error-cell {
                text-align: center;
                padding: 20px !important;
                color: #6b7280;
            }
            
            .loading-spinner-small {
                display: inline-block;
                width: 16px;
                height: 16px;
                border: 2px solid #e5e7eb;
                border-top-color: #3b82f6;
                border-radius: 50%;
                animation: attendance-spin 1s linear infinite;
                margin-right: 8px;
                vertical-align: middle;
            }
            
            @keyframes attendance-spin {
                to { transform: rotate(360deg); }
            }
            
            button.loading {
                opacity: 0.7;
                cursor: not-allowed;
            }
            
            .attendance-btn-small {
                padding: 4px 12px;
                background: #3b82f6;
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 13px;
                transition: background 0.2s;
            }
            
            .attendance-btn-small:hover {
                background: #2563eb;
            }
            
            #check-in-button {
                transition: all 0.3s ease;
                position: relative;
                min-width: 120px;
            }
            
            #check-in-button:disabled {
                opacity: 0.6;
                cursor: not-allowed;
            }
            
            select:disabled {
                opacity: 0.6;
                cursor: not-allowed;
            }
        `;
        document.head.appendChild(styles);
    }
    
    // ============================
    // Public API
    // ============================
    window.attendance = {
        loadData: loadAttendanceData,
        checkIn: geoCheckIn,
        loadHistory: loadAttendanceHistory,
        updateTargets: updateTargetSelect,
        refresh: () => {
            attendanceState.clinicalAreas = [];
            attendanceState.courses = [];
            loadAttendanceData();
        },
        syncPending: syncPendingCheckIns,
        getState: () => ({ ...attendanceState }),
        getUserProfile: () => attendanceState.userProfile
    };
    
    // Alias for backward compatibility
    window.attendanceLoadData = loadAttendanceData;
    window.attendanceGeoCheckIn = geoCheckIn;
    window.attendanceLoadHistory = loadAttendanceHistory;
    window.attendanceUpdateTargetSelect = updateTargetSelect;
    window.initializeAttendanceSystem = initializeAttendanceSystem;
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeAttendanceSystem);
    } else {
        initializeAttendanceSystem();
    }
    
    console.log('🚀 Attendance System loaded successfully');
})();
