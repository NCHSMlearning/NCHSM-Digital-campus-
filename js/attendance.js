// attendance.js - HANDLES BOTH CLASSROOM (approved units) & CLINICAL (clinical_names)
(function() {
    'use strict';
    
    console.log('✅ attendance.js - Classroom: approved units | Clinical: clinical_names');
    
    // ============================================
    // CONFIGURATION
    // ============================================
    
    const VERIFIED_DISTANCE = 100;       // 100 meters - Auto verified
    const PENDING_DISTANCE = 200;        // 200 meters - Needs review
    const MIN_GPS_ACCURACY = 100;        // Acceptable GPS accuracy
    
    // Campus coordinates (fallback)
    const CAMPUS_COORDINATES = {
        latitude: -0.2714611,
        longitude: 36.0519956,
        name: "NCHSM Main Campus"
    };
    
    // Store data
    let approvedUnits = [];               // From student_unit_registrations (Classroom)
    let clinicalLocations = [];           // From clinical_names (Clinical sessions)
    let attendanceUserId = null;
    let attendanceUserProfile = null;
    let currentLocation = null;
    let locationWatchId = null;
    let selectedTarget = null;
    
    // ============================================
    // DEVICE ID MANAGEMENT
    // ============================================
    
    function getDeviceId() {
        let deviceId = localStorage.getItem('nchsm_device_id');
        if (!deviceId) {
            deviceId = 'web_' + Date.now() + '_' + Math.random().toString(36).substr(2, 16);
            localStorage.setItem('nchsm_device_id', deviceId);
            console.log('🆕 New device ID generated:', deviceId);
        }
        return deviceId;
    }
    
    async function validateDeviceForUser(userId, deviceId) {
        try {
            const supabaseClient = window.db?.supabase;
            if (!supabaseClient) return { allowed: true, message: 'No database connection' };
            
            const { data: existingLink, error } = await supabaseClient
                .from('user_device_links')
                .select('user_id, device_id, is_active')
                .eq('device_id', deviceId)
                .maybeSingle();
            
            if (error && error.code !== 'PGRST116') {
                return { allowed: true, message: 'Continuing' };
            }
            
            if (existingLink) {
                if (existingLink.user_id !== userId) {
                    return { allowed: false, message: '❌ This device is linked to another user account.' };
                }
                if (!existingLink.is_active) {
                    return { allowed: false, message: '❌ Your device has been deactivated.' };
                }
                return { allowed: true, message: 'Device verified' };
            }
            
            await supabaseClient
                .from('user_device_links')
                .insert({
                    user_id: userId,
                    device_id: deviceId,
                    device_type: 'web',
                    last_used: new Date().toISOString(),
                    is_active: true
                });
            
            console.log('✅ Device linked to user:', userId);
            return { allowed: true, message: 'Device linked' };
            
        } catch (error) {
            console.error('Device validation error:', error);
            return { allowed: true, message: 'Continuing' };
        }
    }
    
    // ============================================
    // LOAD APPROVED UNITS (CLASSROOM SESSIONS)
    // ============================================
async function loadApprovedUnits() {
    try {
        const supabaseClient = window.db?.supabase;
        if (!supabaseClient || !attendanceUserId) {
            console.log('No supabase client or user ID');
            return [];
        }
        
        console.log('📚 Loading approved units for classroom sessions...');
        console.log('Student ID:', attendanceUserId);
        
        // CRITICAL: Get student ID the SAME way courses.js does
        // courses.js uses: studentId = this.userProfile?.user_id || this.userProfile?.id
        let studentId = attendanceUserId;
        
        // If attendanceUserId doesn't work, try to get from profile
        if (attendanceUserProfile) {
            studentId = attendanceUserProfile.user_id || attendanceUserProfile.id || attendanceUserId;
        }
        
        console.log('Using student ID for query:', studentId);
        
        // Load approved units - EXACT same query as courses.js
        const { data, error } = await supabaseClient
            .from('student_unit_registrations')
            .select('*')
            .eq('student_id', studentId)
            .eq('status', 'approved')
            .order('unit_code', { ascending: true });
        
        if (error) {
            console.error('Error loading approved units:', error);
            return [];
        }
        
        console.log('Raw approved units data:', data);
        console.log(`Found ${data?.length || 0} approved units`);
        
        if (!data || data.length === 0) {
            console.log('⚠️ No approved units found. Trying alternative field names...');
            
            // Try with user_id instead
            const { data: altData, error: altError } = await supabaseClient
                .from('student_unit_registrations')
                .select('*')
                .eq('user_id', studentId)
                .eq('status', 'approved')
                .order('unit_code', { ascending: true });
            
            if (!altError && altData && altData.length > 0) {
                console.log(`✅ Found ${altData.length} units using user_id field`);
                data = altData;
            } else {
                console.log('Still no units found. Check console for details.');
                return [];
            }
        }
        
        // Map the data - keep ALL original fields
        approvedUnits = (data || []).map(unit => ({
            id: unit.id,
            unit_code: unit.unit_code,
            unit_name: unit.unit_name,
            block: unit.block,
            term: unit.term,
            status: unit.status,
            approval_date: unit.approval_date,
            reg_type: unit.reg_type,
            credits: unit.credits || 3,
            course_id: unit.course_id,
            // Keep original data for debugging
            _raw: unit
        }));
        
        console.log(`✅ Loaded ${approvedUnits.length} approved units for classroom sessions`);
        
        // Log each unit for verification
        approvedUnits.forEach((unit, index) => {
            console.log(`  ${index + 1}. 📖 ${unit.unit_code}: ${unit.unit_name} [Block: ${unit.block}]`);
        });
        
        // Also try to get from coursesModule as fallback
        if (approvedUnits.length === 0 && window.coursesModule && window.coursesModule.getActiveCourseCount() > 0) {
            console.log('🔄 Fallback: Loading from coursesModule');
            const coursesModuleUnits = window.coursesModule.getAllCourses();
            if (coursesModuleUnits && coursesModuleUnits.length > 0) {
                approvedUnits = coursesModuleUnits.map(unit => ({
                    id: unit.id,
                    unit_code: unit.unit_code,
                    unit_name: unit.unit_name,
                    block: unit.block,
                    status: unit.status,
                    approval_date: unit.approval_date,
                    reg_type: unit.reg_type
                }));
                console.log(`✅ Loaded ${approvedUnits.length} units from coursesModule fallback`);
            }
        }
        
        // Dispatch event for other modules
        document.dispatchEvent(new CustomEvent('approvedUnitsLoaded', {
            detail: { units: approvedUnits, count: approvedUnits.length }
        }));
        
        return approvedUnits;
        
    } catch (error) {
        console.error('Error loading approved units:', error);
        return [];
    }
}
    // ============================================
    // LOAD CLINICAL LOCATIONS (CLINICAL SESSIONS)
    // ============================================
    
    async function loadClinicalLocations() {
        try {
            const supabaseClient = window.db?.supabase;
            if (!supabaseClient || !attendanceUserProfile) {
                console.log('No supabase client or user profile');
                return [];
            }
            
            const program = attendanceUserProfile?.program;
            const intakeYear = attendanceUserProfile?.intake_year;
            const block = attendanceUserProfile?.block;
            
            console.log(`🏥 Loading clinical locations for: ${program}, ${intakeYear}, ${block}`);
            
            let query = supabaseClient
                .from('clinical_names')
                .select('id, clinical_area_name, latitude, longitude, program, intake_year, block_term, address');
            
            if (program) {
                query = query.eq('program', program);
            }
            
            if (intakeYear) {
                query = query.eq('intake_year', intakeYear);
            }
            
            if (block) {
                query = query.eq('block_term', block);
            }
            
            const { data, error } = await query.order('clinical_area_name');
            
            if (error) {
                console.error('Error loading clinical locations:', error);
                return [];
            }
            
            clinicalLocations = (data || []).map(loc => ({
                id: loc.id,
                name: loc.clinical_area_name,
                latitude: parseFloat(loc.latitude) || CAMPUS_COORDINATES.latitude,
                longitude: parseFloat(loc.longitude) || CAMPUS_COORDINATES.longitude,
                program: loc.program,
                intakeYear: loc.intake_year,
                block: loc.block_term,
                address: loc.address
            }));
            
            console.log(`✅ Loaded ${clinicalLocations.length} clinical locations`);
            
            clinicalLocations.forEach(loc => {
                console.log(`  🏥 ${loc.name} [${loc.latitude}, ${loc.longitude}]`);
            });
            
            return clinicalLocations;
            
        } catch (error) {
            console.error('Error loading clinical locations:', error);
            return [];
        }
    }
    
    // ============================================
    // GPS & DISTANCE CALCULATION
    // ============================================
    
    function calculateDistance(lat1, lon1, lat2, lon2) {
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
    
    function startLocationMonitoring() {
        if (!navigator.geolocation) {
            updateGPSStatus('error', 'Geolocation not supported');
            return;
        }
        
        if (locationWatchId) {
            navigator.geolocation.clearWatch(locationWatchId);
        }
        
        updateGPSStatus('loading', 'Getting your location...');
        
        const options = {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 0
        };
        
        navigator.geolocation.getCurrentPosition(
            (position) => {
                handleLocationUpdate(position);
                
                const watchOptions = {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 2000
                };
                
                locationWatchId = navigator.geolocation.watchPosition(
                    handleLocationUpdate,
                    (error) => console.warn('Watch error:', error),
                    watchOptions
                );
            },
            (error) => {
                console.error('Location error:', error);
                handleLocationError(error);
            },
            options
        );
    }
    
    function handleLocationUpdate(position) {
        currentLocation = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: new Date(position.timestamp)
        };
        
        updateLocationDisplay();
        updateCheckInButton();
        
        const accuracyMsg = currentLocation.accuracy <= MIN_GPS_ACCURACY ? 
            `✅ GPS: ±${currentLocation.accuracy.toFixed(0)}m` : 
            `⚠️ GPS: ±${currentLocation.accuracy.toFixed(0)}m`;
        updateGPSStatus('success', accuracyMsg);
    }
    
    function handleLocationError(error) {
        let message = '';
        switch(error.code) {
            case error.PERMISSION_DENIED:
                message = 'Location permission denied. Please enable GPS.';
                break;
            case error.POSITION_UNAVAILABLE:
                message = 'Location unavailable. Please check GPS.';
                break;
            case error.TIMEOUT:
                message = 'Location request timed out. Please try again.';
                break;
            default:
                message = 'Unable to get your location.';
        }
        updateGPSStatus('error', message);
        updateCheckInButton();
    }
    
    function updateGPSStatus(status, message) {
        const gpsStatus = document.getElementById('gps-status');
        if (!gpsStatus) return;
        
        let icon = '';
        let bgColor = '';
        
        if (status === 'success') {
            icon = '<i class="fas fa-check-circle"></i>';
            bgColor = '#d1fae5';
            gpsStatus.style.color = '#10b981';
        } else if (status === 'loading') {
            icon = '<i class="fas fa-spinner fa-spin"></i>';
            bgColor = '#fed7aa';
            gpsStatus.style.color = '#f59e0b';
        } else {
            icon = '<i class="fas fa-exclamation-triangle"></i>';
            bgColor = '#fee2e2';
            gpsStatus.style.color = '#ef4444';
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
        
        if (latElement) latElement.textContent = currentLocation.latitude.toFixed(6);
        if (lonElement) lonElement.textContent = currentLocation.longitude.toFixed(6);
        if (accuracyElement) {
            accuracyElement.textContent = currentLocation.accuracy.toFixed(1);
            accuracyElement.style.color = currentLocation.accuracy <= MIN_GPS_ACCURACY ? '#10b981' : '#f59e0b';
        }
    }
    
    // ============================================
    // POPULATE TARGET OPTIONS
    // ============================================
    
    async function populateTargetOptions(sessionType) {
        const targetSelect = document.getElementById('attendance-target');
        if (!targetSelect) return;
        
        targetSelect.innerHTML = '<option value="">Loading options...</option>';
        targetSelect.disabled = true;
        
        try {
            if (sessionType === 'clinical') {
                // CLINICAL SESSIONS - Load from clinical_names table
                if (clinicalLocations.length === 0) {
                    await loadClinicalLocations();
                }
                
                if (clinicalLocations.length === 0) {
                    targetSelect.innerHTML = '<option value="">🏥 No clinical locations available for your program</option>';
                    targetSelect.disabled = false;
                    
                    const helpText = document.createElement('div');
                    helpText.className = 'help-text mt-2';
                    helpText.style.fontSize = '12px';
                    helpText.style.color = '#f59e0b';
                    helpText.innerHTML = '<i class="fas fa-info-circle"></i> No clinical locations assigned. Please contact administrator.';
                    
                    const existingHelp = targetSelect.parentElement.querySelector('.help-text');
                    if (existingHelp) existingHelp.remove();
                    targetSelect.parentElement.appendChild(helpText);
                    return;
                }
                
                targetSelect.innerHTML = '<option value="">🏥 Select clinical location...</option>';
                clinicalLocations.forEach(loc => {
                    const opt = document.createElement('option');
                    opt.value = `${loc.id}|${loc.name}|clinical|${loc.latitude}|${loc.longitude}|100`;
                    opt.textContent = `${loc.name} ${loc.block ? `[${loc.block}]` : ''}`;
                    targetSelect.appendChild(opt);
                });
                
                const countIndicator = document.createElement('div');
                countIndicator.className = 'location-count-indicator mt-1';
                countIndicator.style.fontSize = '11px';
                countIndicator.style.color = '#3b82f6';
                countIndicator.innerHTML = `<i class="fas fa-building"></i> ${clinicalLocations.length} clinical location(s) available`;
                
                const existingIndicator = targetSelect.parentElement.querySelector('.location-count-indicator');
                if (existingIndicator) existingIndicator.remove();
                targetSelect.parentElement.appendChild(countIndicator);
                
                console.log(`🏥 Displaying ${clinicalLocations.length} clinical locations in dropdown`);
                
            } else if (sessionType === 'class') {
                // CLASSROOM SESSIONS - Load from approved units
                if (approvedUnits.length === 0) {
                    await loadApprovedUnits();
                }
                
                if (approvedUnits.length === 0) {
                    targetSelect.innerHTML = '<option value="">📚 No approved units found. Please register for units first.</option>';
                    targetSelect.disabled = false;
                    
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
                approvedUnits.forEach(unit => {
                    const opt = document.createElement('option');
                    let displayText = unit.unit_code ? `${unit.unit_code} - ${unit.unit_name}` : unit.unit_name;
                    if (unit.block) displayText += ` [Block: ${unit.block}]`;
                    if (unit.term) displayText += ` [Term: ${unit.term}]`;
                    
                    opt.value = `unit_${unit.id}|${displayText}|class|${CAMPUS_COORDINATES.latitude}|${CAMPUS_COORDINATES.longitude}|${VERIFIED_DISTANCE}`;
                    opt.textContent = displayText;
                    targetSelect.appendChild(opt);
                });
                
                const countIndicator = document.createElement('div');
                countIndicator.className = 'course-count-indicator mt-1';
                countIndicator.style.fontSize = '11px';
                countIndicator.style.color = '#10b981';
                countIndicator.innerHTML = `<i class="fas fa-check-circle"></i> ${approvedUnits.length} approved course(s) available`;
                
                const existingIndicator = targetSelect.parentElement.querySelector('.course-count-indicator');
                if (existingIndicator) existingIndicator.remove();
                targetSelect.parentElement.appendChild(countIndicator);
                
                console.log(`📚 Displaying ${approvedUnits.length} approved units in dropdown`);
            }
        } catch (error) {
            console.error('Error populating targets:', error);
            targetSelect.innerHTML = '<option value="">Error loading options</option>';
        }
        
        targetSelect.disabled = false;
        targetSelect.addEventListener('change', () => {
            updateCheckInButton();
            const value = targetSelect.value;
            if (value) {
                const parts = value.split('|');
                selectedTarget = {
                    id: parts[0],
                    name: parts[1],
                    type: parts[2],
                    latitude: parseFloat(parts[3]) || CAMPUS_COORDINATES.latitude,
                    longitude: parseFloat(parts[4]) || CAMPUS_COORDINATES.longitude,
                    radius: parseInt(parts[5]) || VERIFIED_DISTANCE
                };
                console.log('Selected target:', selectedTarget.name, `(${selectedTarget.type})`);
            } else {
                selectedTarget = null;
            }
        });
    }
    
    function handleSessionTypeChange() {
        const sessionTypeSelect = document.getElementById('session-type');
        const targetControlGroup = document.getElementById('target-control-group');
        const targetSelect = document.getElementById('attendance-target');
        
        if (!sessionTypeSelect || !targetControlGroup || !targetSelect) return;
        
        const sessionType = sessionTypeSelect.value;
        
        if (sessionType) {
            targetControlGroup.style.display = 'flex';
            targetSelect.disabled = false;
            populateTargetOptions(sessionType);
        } else {
            targetControlGroup.style.display = 'none';
            targetSelect.disabled = true;
            selectedTarget = null;
        }
        
        updateCheckInButton();
    }
    
    // ============================================
    // UPDATE CHECK-IN BUTTON
    // ============================================
    
    function updateCheckInButton() {
        const checkInButton = document.getElementById('check-in-button');
        const sessionTypeSelect = document.getElementById('session-type');
        const targetSelect = document.getElementById('attendance-target');
        const distanceStatus = document.getElementById('distance-status');
        
        if (!checkInButton) return;
        
        const hasSession = sessionTypeSelect?.value;
        const hasTarget = targetSelect?.value && targetSelect.value !== '';
        const hasLocation = currentLocation !== null;
        
        let canCheckIn = hasSession && hasTarget && hasLocation;
        
        if (hasLocation && selectedTarget && selectedTarget.latitude && selectedTarget.longitude) {
            const distance = calculateDistance(
                currentLocation.latitude,
                currentLocation.longitude,
                selectedTarget.latitude,
                selectedTarget.longitude
            );
            
            const distanceDisplay = distance >= 1000 ? `${(distance/1000).toFixed(2)} km` : `${distance.toFixed(0)} m`;
            
            if (distanceStatus) {
                let statusHtml = '';
                let bgColor = '';
                let statusColor = '';
                
                if (distance <= VERIFIED_DISTANCE) {
                    statusHtml = `<span style="color: #10b981;">✅ Within range (${distanceDisplay}) - Will be AUTO VERIFIED</span>`;
                    bgColor = '#d1fae5';
                    statusColor = '#10b981';
                } else if (distance <= PENDING_DISTANCE) {
                    statusHtml = `<span style="color: #f59e0b;">⚠️ Near location (${distanceDisplay}) - Pending review</span>`;
                    bgColor = '#fed7aa';
                    statusColor = '#f59e0b';
                } else {
                    statusHtml = `<span style="color: #ef4444;">❌ Too far (${distanceDisplay}) - Will be marked ABSENT</span>`;
                    bgColor = '#fee2e2';
                    statusColor = '#ef4444';
                }
                
                distanceStatus.innerHTML = `
                    <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
                        <i class="fas fa-map-pin" style="color: ${statusColor};"></i>
                        <strong>Target:</strong> ${selectedTarget.name}
                        <strong>Distance:</strong> ${distanceDisplay}
                        ${statusHtml}
                    </div>
                `;
                distanceStatus.style.display = 'block';
                distanceStatus.style.backgroundColor = bgColor;
                distanceStatus.style.padding = '10px';
                distanceStatus.style.borderRadius = '8px';
            }
        } else if (distanceStatus) {
            distanceStatus.style.display = 'none';
        }
        
        checkInButton.disabled = !canCheckIn;
        
        const btnSubtext = checkInButton.querySelector('.btn-subtext');
        if (btnSubtext) {
            if (!hasLocation) {
                btnSubtext.textContent = '📍 Waiting for GPS...';
            } else if (!hasSession || !hasTarget) {
                btnSubtext.textContent = '📝 Select session type and target';
            } else {
                btnSubtext.textContent = '✅ Ready to check in';
            }
        }
    }
    
    // ============================================
    // CHECK-IN FUNCTION
    // ============================================
    
   async function attendanceGeoCheckIn() {
    const button = document.getElementById('check-in-button');
    const sessionTypeSelect = document.getElementById('session-type');
    const targetSelect = document.getElementById('attendance-target');
    
    if (!button || !sessionTypeSelect || !targetSelect) return;
    
    button.disabled = true;
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
    
    try {
        if (!sessionTypeSelect.value) throw new Error('Select session type');
        if (!targetSelect.value) throw new Error('Select target');
        if (!currentLocation) throw new Error('Location not available');
        if (!selectedTarget) throw new Error('Target info missing');
        
        const deviceId = getDeviceId();
        const deviceValidation = await validateDeviceForUser(attendanceUserId, deviceId);
        if (!deviceValidation.allowed) throw new Error(deviceValidation.message);
        
        // Calculate distance based on target type
        const distance = calculateDistance(
            currentLocation.latitude,
            currentLocation.longitude,
            selectedTarget.latitude,
            selectedTarget.longitude
        );
        
        console.log(`📍 Distance to ${selectedTarget.type}: ${distance.toFixed(2)} meters`);
        console.log(`   Your location: ${currentLocation.latitude}, ${currentLocation.longitude}`);
        console.log(`   Target location: ${selectedTarget.latitude}, ${selectedTarget.longitude}`);
        
        let isVerified = false;
        let attendanceStatus = 'Present';
        
        if (distance <= VERIFIED_DISTANCE) {
            isVerified = true;
            attendanceStatus = 'Present';
            console.log('✅ Within range - AUTO VERIFIED');
        } else if (distance <= PENDING_DISTANCE) {
            isVerified = false;
            attendanceStatus = 'Pending';
            console.log('⚠️ Near location - PENDING REVIEW');
        } else {
            isVerified = false;
            attendanceStatus = 'Absent';
            console.log('❌ Too far - ABSENT');
        }
        
        const supabaseClient = window.db?.supabase;
        if (!supabaseClient) throw new Error('Database error');
        
        // Build check-in data - NO reg_type field
        const checkInData = {
            student_id: attendanceUserId,
            check_in_time: new Date().toISOString(),
            session_type: sessionTypeSelect.value,
            target_id: selectedTarget.id,
            target_name: selectedTarget.name,
            latitude: currentLocation.latitude,
            longitude: currentLocation.longitude,
            accuracy_m: currentLocation.accuracy,
            distance_meters: distance,
            is_verified: isVerified,
            device_id: deviceId,
            student_name: attendanceUserProfile?.full_name || 'Unknown',
            program: attendanceUserProfile?.program,
            block: attendanceUserProfile?.block,
            intake_year: attendanceUserProfile?.intake_year,
            attendance_status: attendanceStatus,
            is_remote: distance > VERIFIED_DISTANCE,
            target_latitude: selectedTarget.latitude,
            target_longitude: selectedTarget.longitude
        };
        
        // Add unit info for class sessions ONLY
        if (sessionTypeSelect.value === 'class') {
            let targetId = selectedTarget.id;
            if (targetId && targetId.startsWith('unit_')) {
                targetId = targetId.replace('unit_', '');
            }
            
            const selectedUnit = approvedUnits.find(u => u.id == targetId);
            if (selectedUnit) {
                checkInData.unit_code = selectedUnit.unit_code;
                checkInData.unit_name = selectedUnit.unit_name;
                checkInData.block = selectedUnit.block;
                // DO NOT add reg_type - it doesn't exist in the table
                console.log(`📚 Check-in for unit: ${selectedUnit.unit_code} - ${selectedUnit.unit_name}`);
            } else {
                console.warn('Selected unit not found in approved units:', targetId);
            }
        } else if (sessionTypeSelect.value === 'clinical') {
            console.log(`🏥 Check-in for clinical location: ${selectedTarget.name}`);
        }
        
        console.log('Sending check-in data:', checkInData);
        
        const { error } = await supabaseClient
            .from('geo_attendance_logs')
            .insert([checkInData]);
        
        if (error) throw error;
        
        const distanceDisplay = distance >= 1000 ? `${(distance/1000).toFixed(2)} km` : `${distance.toFixed(0)} m`;
        let resultMsg = '';
        
        if (isVerified) {
            resultMsg = `✅ Check-in successful!\n📍 ${selectedTarget.name}\n📏 Distance: ${distanceDisplay}\n✅ Status: VERIFIED`;
        } else if (attendanceStatus === 'Pending') {
            resultMsg = `⚠️ Check-in recorded!\n📍 ${selectedTarget.name}\n📏 Distance: ${distanceDisplay}\n⏳ Status: PENDING REVIEW (Lecturer will verify)`;
        } else {
            resultMsg = `❌ Check-in FAILED - Too far!\n📍 ${selectedTarget.name}\n📏 Distance: ${distanceDisplay}\n❌ Status: ABSENT (Must be within ${VERIFIED_DISTANCE}m)`;
        }
        
        alert(resultMsg);
        
        await loadTodayAttendanceCount();
        await loadGeoAttendanceHistory('today');
        
        // Reset form
        sessionTypeSelect.value = '';
        targetSelect.value = '';
        selectedTarget = null;
        handleSessionTypeChange();
        
    } catch (error) {
        console.error('Check-in error:', error);
        alert(`❌ Check-in failed: ${error.message}`);
    } finally {
        button.disabled = false;
        button.innerHTML = '<i class="fas fa-fingerprint"></i> Check In Now';
    }
}
    
    // ============================================
    // LOAD HISTORY
    // ============================================
    
    async function loadTodayAttendanceCount() {
        const presentTodayElement = document.getElementById('present-today');
        if (!presentTodayElement || !attendanceUserId) return;
        
        try {
            const supabaseClient = window.db?.supabase;
            if (!supabaseClient) return;
            
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            const { count, error } = await supabaseClient
                .from('geo_attendance_logs')
                .select('*', { count: 'exact', head: true })
                .eq('student_id', attendanceUserId)
                .eq('attendance_status', 'Present')
                .gte('check_in_time', today.toISOString());
            
            if (!error) presentTodayElement.textContent = count || 0;
        } catch (error) {
            console.error('Error loading today count:', error);
        }
    }
    
    async function loadGeoAttendanceHistory(filter = 'today') {
        const tableBody = document.getElementById('geo-attendance-history');
        if (!tableBody || !attendanceUserId) return;
        
        tableBody.innerHTML = '<tr><td colspan="7"><div class="loading-spinner"></div> Loading...<\/td><\/tr>';
        
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
                tableBody.innerHTML = '<tr><td colspan="7" class="text-center">No check-in history found<\/td><\/tr>';
                return;
            }
            
            logs.forEach(log => {
                const time = new Date(log.check_in_time);
                const timeStr = time.toLocaleString();
                const distance = log.distance_meters;
                const distanceDisplay = distance ? (distance >= 1000 ? `${(distance/1000).toFixed(2)} km` : `${distance.toFixed(0)} m`) : 'N/A';
                const status = log.attendance_status || (log.is_verified ? 'Present' : 'Absent');
                
                let statusIcon = status === 'Present' ? '✅' : (status === 'Pending' ? '⏳' : '❌');
                let statusColor = status === 'Present' ? '#10b981' : (status === 'Pending' ? '#f59e0b' : '#ef4444');
                
                tableBody.innerHTML += `
                    <tr style="border-bottom: 1px solid #e5e7eb;">
                        <td style="padding: 12px;">${timeStr}</td>
                        <td style="padding: 12px;"><span class="session-badge">${log.session_type || 'N/A'}</span></td>
                        <td style="padding: 12px;"><strong>${log.target_name || 'N/A'}</strong></td>
                        <td style="padding: 12px; color: ${statusColor}; font-weight: 600;">${statusIcon} ${status}</td>
                        <td style="padding: 12px;">📍 ${distanceDisplay}</td>
                        <td style="padding: 12px;">🎯 ±${log.accuracy_m?.toFixed(0) || 'N/A'}m</td>
                    </tr>
                `;
            });
        } catch (error) {
            console.error('Error loading history:', error);
            tableBody.innerHTML = '<tr><td colspan="7" style="color:red;">Error loading history<\/td><\/tr>';
        }
    }
    
    function updateTimeDisplay() {
        const currentTimeElement = document.getElementById('current-time');
        if (currentTimeElement) {
            const now = new Date();
            currentTimeElement.textContent = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
        }
    }
    
    function switchToTab(tabName) {
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.style.display = 'none';
        });
        document.querySelectorAll('.nav a').forEach(navItem => {
            navItem.classList.remove('active');
        });
        const selectedTab = document.getElementById(tabName);
        if (selectedTab) selectedTab.style.display = 'block';
        const activeNav = document.querySelector(`.nav a[data-tab="${tabName}"]`);
        if (activeNav) activeNav.classList.add('active');
    }
    
    function isOnAttendanceTab() {
        const attendanceTab = document.getElementById('attendance');
        return attendanceTab && attendanceTab.style.display === 'block';
    }
    
    // ============================================
    // INITIALIZATION
    // ============================================
    
    async function loadAttendanceData() {
        try {
            attendanceUserProfile = window.db?.currentUserProfile;
            attendanceUserId = window.db?.currentUserId;
            
            if (!attendanceUserProfile || !attendanceUserId) {
                console.log('Waiting for user data...');
                return;
            }
            
            console.log('👤 User:', attendanceUserProfile.full_name);
            console.log('📋 Program:', attendanceUserProfile.program);
            console.log('📚 Student Block:', attendanceUserProfile.block);
            console.log('📅 Intake Year:', attendanceUserProfile.intake_year);
            
            await Promise.all([
                loadApprovedUnits(),
                loadClinicalLocations()
            ]);
            
            await loadTodayAttendanceCount();
            await loadGeoAttendanceHistory('today');
            
        } catch (error) {
            console.error('Error loading attendance data:', error);
        }
    }
    
    function initializeAttendanceUI() {
        console.log('🚀 Initializing attendance system...');
        
        const sessionTypeSelect = document.getElementById('session-type');
        const checkInButton = document.getElementById('check-in-button');
        const attendanceTab = document.querySelector('.nav a[data-tab="attendance"]');
        const historyFilter = document.getElementById('history-filter');
        const refreshHistoryBtn = document.getElementById('refresh-history');
        
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
            historyFilter.addEventListener('change', () => loadGeoAttendanceHistory(historyFilter.value));
        }
        
        if (refreshHistoryBtn) {
            refreshHistoryBtn.addEventListener('click', () => loadGeoAttendanceHistory(historyFilter?.value || 'today'));
        }
        
        updateTimeDisplay();
        setInterval(updateTimeDisplay, 60000);
        
        startLocationMonitoring();
        
        if (isOnAttendanceTab()) {
            loadAttendanceData();
        }
    }
    
    // ============================================
    // CSS STYLES
    // ============================================
    
    const style = document.createElement('style');
    style.textContent = `
        .session-badge {
            display: inline-block;
            padding: 4px 10px;
            border-radius: 20px;
            font-size: 11px;
            font-weight: 600;
            background: #e0e7ff;
            color: #3730a3;
        }
        #gps-status { transition: all 0.3s ease; padding: 8px 12px; border-radius: 8px; margin-bottom: 15px; }
        #distance-status { margin-top: 10px; padding: 10px; border-radius: 8px; font-size: 13px; }
        .course-count-indicator, .location-count-indicator { margin-top: 8px; font-size: 12px; }
        .btn-checkin.ready { background: linear-gradient(135deg, #10b981, #059669); }
    `;
    document.head.appendChild(style);
    
    // Start
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeAttendanceUI);
    } else {
        initializeAttendanceUI();
    }
    
    // Expose globals
    window.attendanceGeoCheckIn = attendanceGeoCheckIn;
    window.loadAttendanceData = loadAttendanceData;
    window.loadGeoAttendanceHistory = loadGeoAttendanceHistory;
    
})();
