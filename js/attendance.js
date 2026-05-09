// enhanced-attendance.js - Complete Student Check-in System (Auto-load History)
(function() {
    'use strict';
    
    console.log('✅ Enhanced Student Check-in System Loading...');
    
    // ============================================
    // CONFIGURATION
    // ============================================
    
    const VERIFIED_DISTANCE = 100;       // 100m - Auto verified
    const PENDING_DISTANCE = 200;        // 200m - Needs review
    const MIN_GPS_ACCURACY = 50;         // 50m - Good accuracy
    
    // Allow check-in from ANY distance
    const ALLOW_CHECKIN_ANY_DISTANCE = true;
    
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
    let liveTrackingInterval = null;
    let historyLoaded = false; // Track if history has been loaded
    
    // ============================================
    // INITIALIZATION
    // ============================================
    
   async function loadApprovedUnits() {
    try {
        const supabaseClient = window.db?.supabase;
        
        // Get user ID from multiple possible sources
        let studentId = null;
        let userProgram = null;
        let userBlock = null;
        
        // Get user profile
        if (attendanceUserProfile) {
            userProgram = attendanceUserProfile.program;
            userBlock = attendanceUserProfile.block;
            studentId = attendanceUserProfile.id || attendanceUserProfile.user_id;
        } else if (window.db?.currentUserProfile) {
            userProgram = window.db.currentUserProfile.program;
            userBlock = window.db.currentUserProfile.block;
            studentId = window.db.currentUserProfile.id || window.db.currentUserProfile.user_id;
        } else if (window.unitRegistrationModule?.userProfile) {
            userProgram = window.unitRegistrationModule.userProfile.program;
            userBlock = window.unitRegistrationModule.userProfile.block;
        }
        
        console.log('📚 Loading courses for:', { program: userProgram, block: userBlock });
        
        if (!supabaseClient) {
            console.error('❌ Supabase client not available');
            return [];
        }
        
        // QUERY FROM COURSES TABLE - NOT student_unit_registrations
        let query = supabaseClient
            .from('courses')
            .select('*')
            .eq('status', 'Active')
            .eq('target_program', userProgram);
        
        // Filter by block if available
        if (userBlock) {
            query = query.eq('block', userBlock);
        }
        
        // Also get courses that match your specific units
        const { data, error } = await query.order('unit_code', { ascending: true });
        
        if (error) {
            console.error('Error loading courses:', error);
            return [];
        }
        
        console.log(`✅ Found ${data?.length || 0} courses from courses table`);
        
        // Filter for Block 4 specific courses (your units)
        const block4Courses = (data || []).filter(course => 
            course.block === 'Block 4' || 
            course.block === userBlock ||
            course.unit_code?.includes('30') // Your units have 301-306
        );
        
        // Map courses to approved units format
        approvedUnits = block4Courses.map(course => ({
            id: course.id,
            unit_code: course.unit_code,
            unit_name: course.name,
            block: course.block,
            status: course.status,
            credits: 3,
            course_id: course.id
        }));
        
        console.log(`✅ Loaded ${approvedUnits.length} approved units from courses table:`);
        approvedUnits.forEach((unit, i) => {
            console.log(`   ${i+1}. ${unit.unit_code} - ${unit.unit_name} [${unit.block}]`);
        });
        
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
    
    async function loadClinicalLocations() {
        try {
            const supabaseClient = window.db?.supabase;
            if (!supabaseClient || !attendanceUserProfile) {
                return [];
            }
            
            const program = attendanceUserProfile?.program;
            const intakeYear = attendanceUserProfile?.intake_year;
            const block = attendanceUserProfile?.block;
            
            let query = supabaseClient
                .from('clinical_names')
                .select('id, clinical_area_name, latitude, longitude, program, intake_year, block_term');
            
            if (program) query = query.eq('program', program);
            if (intakeYear) query = query.eq('intake_year', intakeYear);
            if (block) query = query.eq('block_term', block);
            
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
                block: loc.block_term
            }));
            
            console.log(`✅ Loaded ${clinicalLocations.length} clinical locations`);
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
        updateLiveDistanceMeter();
        updateRequirementsList();
        
        const accuracyMsg = currentLocation.accuracy <= MIN_GPS_ACCURACY ? 
            `✅ GPS: ±${currentLocation.accuracy.toFixed(0)}m` : 
            `⚠️ GPS: ±${currentLocation.accuracy.toFixed(0)}m (Low accuracy, move to open area)`;
        updateGPSStatus('success', accuracyMsg);
    }
    
    function handleLocationError(error) {
        let message = '';
        switch(error.code) {
            case error.PERMISSION_DENIED:
                message = '📍 Location permission denied. Please enable GPS in your browser settings.';
                break;
            case error.POSITION_UNAVAILABLE:
                message = '📡 Location unavailable. Please check your GPS signal.';
                break;
            case error.TIMEOUT:
                message = '⏱️ Location request timed out. Please try again.';
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
        const accuracyWarning = document.getElementById('accuracy-warning');
        
        if (latElement) latElement.textContent = currentLocation.latitude.toFixed(6);
        if (lonElement) lonElement.textContent = currentLocation.longitude.toFixed(6);
        if (accuracyElement) {
            accuracyElement.textContent = currentLocation.accuracy.toFixed(1);
            const isAccurate = currentLocation.accuracy <= MIN_GPS_ACCURACY;
            accuracyElement.style.color = isAccurate ? '#10b981' : '#f59e0b';
            if (accuracyWarning) {
                accuracyWarning.style.display = isAccurate ? 'none' : 'inline';
            }
        }
    }
    
    // ============================================
    // LIVE DISTANCE METER
    // ============================================
    
    function updateLiveDistanceMeter() {
        if (!currentLocation || !selectedTarget) return;
        
        const distance = calculateDistance(
            currentLocation.latitude,
            currentLocation.longitude,
            selectedTarget.latitude,
            selectedTarget.longitude
        );
        
        const distanceDisplay = distance >= 1000 ? `${(distance/1000).toFixed(2)} km` : `${distance.toFixed(0)} m`;
        const distanceStatus = document.getElementById('distance-status');
        
        if (!distanceStatus) return;
        
        let statusIcon = '';
        let statusText = '';
        let bgColor = '';
        let borderColor = '';
        let willBeStatus = '';
        let feedbackMessage = '';
        
        if (distance <= VERIFIED_DISTANCE) {
            statusIcon = '✅';
            statusText = 'AUTO VERIFIED';
            bgColor = '#d1fae5';
            borderColor = '#10b981';
            willBeStatus = 'Present (Auto-Verified)';
            feedbackMessage = `🎉 Perfect! You're at the correct location. Distance: ${distanceDisplay}`;
        } else if (distance <= PENDING_DISTANCE) {
            statusIcon = '⚠️';
            statusText = 'PENDING REVIEW';
            bgColor = '#fed7aa';
            borderColor = '#f59e0b';
            willBeStatus = 'Pending (Lecturer Review)';
            feedbackMessage = `📍 You're near the location. Distance: ${distanceDisplay}. Move closer for auto-verification.`;
        } else {
            statusIcon = '❌';
            statusText = 'TOO FAR';
            bgColor = '#fee2e2';
            borderColor = '#ef4444';
            willBeStatus = 'Absent (Distance Exceeded)';
            feedbackMessage = `⚠️ You're too far! Distance: ${distanceDisplay}. Check-in will be recorded as ABSENT.`;
        }
        
        const sessionType = document.getElementById('session-type')?.value;
        const targetTypeText = sessionType === 'clinical' ? 'Clinical Site' : 'Classroom';
        
        distanceStatus.innerHTML = `
            <div style="background: ${bgColor}; border-left: 4px solid ${borderColor}; padding: 15px; border-radius: 8px;">
                <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap; margin-bottom: 10px;">
                    <span style="font-size: 28px;">${statusIcon}</span>
                    <div>
                        <strong style="font-size: 16px; color: ${borderColor};">${statusText}</strong>
                        <div style="font-size: 12px; color: #666;">Will be marked as: ${willBeStatus}</div>
                    </div>
                </div>
                
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; margin-top: 10px;">
                    <div>
                        <span style="color: #666;">🎯 Target:</span>
                        <strong>${selectedTarget.name}</strong>
                    </div>
                    <div>
                        <span style="color: #666;">📏 Distance:</span>
                        <strong style="color: ${borderColor};">${distanceDisplay}</strong>
                    </div>
                    <div>
                        <span style="color: #666;">🏷️ Type:</span>
                        <strong>${targetTypeText}</strong>
                    </div>
                </div>
                
                <div class="progress-container" style="margin-top: 15px;">
                    <div style="background: #e5e7eb; border-radius: 10px; height: 10px; overflow: hidden;">
                        <div style="width: ${Math.min((distance / PENDING_DISTANCE) * 100, 100)}%; height: 100%; background: ${borderColor}; transition: width 0.3s ease;"></div>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-top: 5px; font-size: 11px;">
                        <span style="color: #10b981;">✅ ${VERIFIED_DISTANCE}m (Auto)</span>
                        <span style="color: #f59e0b;">⚠️ ${PENDING_DISTANCE}m (Pending)</span>
                        <span style="color: #ef4444;">❌ Any (Absent)</span>
                    </div>
                </div>
                
                <div style="margin-top: 12px; font-size: 13px; color: ${borderColor}; background: rgba(0,0,0,0.05); padding: 8px; border-radius: 6px;">
                    <i class="fas fa-info-circle"></i> ${feedbackMessage}
                </div>
            </div>
        `;
        
        distanceStatus.style.display = 'block';
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
                if (clinicalLocations.length === 0) {
                    await loadClinicalLocations();
                }
                
                if (clinicalLocations.length === 0) {
                    targetSelect.innerHTML = '<option value="">🏥 No clinical locations available</option>';
                    targetSelect.disabled = false;
                    showToast('No clinical locations assigned for your program', 'warning');
                    return;
                }
                
                targetSelect.innerHTML = '<option value="">🏥 Select clinical location...</option>';
                clinicalLocations.forEach(loc => {
                    const opt = document.createElement('option');
                    opt.value = `${loc.id}|${loc.name}|clinical|${loc.latitude}|${loc.longitude}|${VERIFIED_DISTANCE}`;
                    opt.textContent = `${loc.name} ${loc.block ? `[${loc.block}]` : ''}`;
                    targetSelect.appendChild(opt);
                });
                
                showToast(`${clinicalLocations.length} clinical location(s) available`, 'success');
                
            } else {
                if (approvedUnits.length === 0) {
                    await loadApprovedUnits();
                }
                
                if (approvedUnits.length === 0) {
                    targetSelect.innerHTML = '<option value="">📚 No approved units found</option>';
                    targetSelect.disabled = false;
                    showToast('Please register for units in Learning Hub first', 'warning');
                    return;
                }
                
                targetSelect.innerHTML = '<option value="">📚 Select approved course...</option>';
                approvedUnits.forEach(unit => {
                    const opt = document.createElement('option');
                    let displayText = `${unit.unit_code} - ${unit.unit_name}`;
                    if (unit.block) displayText += ` [${unit.block}]`;
                    
                    opt.value = `unit_${unit.id}|${displayText}|class|${CAMPUS_COORDINATES.latitude}|${CAMPUS_COORDINATES.longitude}|${VERIFIED_DISTANCE}`;
                    opt.textContent = displayText;
                    targetSelect.appendChild(opt);
                });
                
                showToast(`${approvedUnits.length} approved course(s) available`, 'success');
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
                    latitude: parseFloat(parts[3]),
                    longitude: parseFloat(parts[4]),
                    radius: parseInt(parts[5]) || VERIFIED_DISTANCE
                };
                updateLiveDistanceMeter();
            } else {
                selectedTarget = null;
                document.getElementById('distance-status').style.display = 'none';
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
            populateTargetOptions(sessionType);
        } else {
            targetControlGroup.style.display = 'none';
            targetSelect.disabled = true;
            selectedTarget = null;
            document.getElementById('distance-status').style.display = 'none';
        }
        
        updateCheckInButton();
    }
    
    // ============================================
    // UPDATE UI
    // ============================================
    
    function updateCheckInButton() {
        const checkInButton = document.getElementById('check-in-button');
        const sessionTypeSelect = document.getElementById('session-type');
        const targetSelect = document.getElementById('attendance-target');
        
        if (!checkInButton) return;
        
        const hasSession = sessionTypeSelect?.value;
        const hasTarget = targetSelect?.value && targetSelect.value !== '';
        const hasLocation = currentLocation !== null;
        const isAccurate = currentLocation ? currentLocation.accuracy <= MIN_GPS_ACCURACY : false;
        
        // Allow check-in from ANY distance
        let canCheckIn = hasSession && hasTarget && hasLocation;
        
        // If not allowing any distance, check distance limits
        if (!ALLOW_CHECKIN_ANY_DISTANCE && canCheckIn && selectedTarget) {
            const distance = calculateDistance(
                currentLocation.latitude,
                currentLocation.longitude,
                selectedTarget.latitude,
                selectedTarget.longitude
            );
            canCheckIn = distance <= PENDING_DISTANCE;
        }
        
        checkInButton.disabled = !canCheckIn;
        
        // Update button styling and tooltip
        if (!canCheckIn) {
            if (!hasLocation) {
                checkInButton.title = 'Waiting for GPS signal...';
                checkInButton.style.opacity = '0.6';
            } else if (!hasSession || !hasTarget) {
                checkInButton.title = 'Please select session type and target';
                checkInButton.style.opacity = '0.6';
            }
        } else {
            checkInButton.title = 'Click to check in';
            checkInButton.style.opacity = '1';
        }
    }
    
    function updateRequirementsList() {
        const hasSession = document.getElementById('session-type')?.value;
        const hasTarget = document.getElementById('attendance-target')?.value && document.getElementById('attendance-target')?.value !== '';
        const hasLocation = currentLocation !== null;
        const isAccurate = currentLocation ? currentLocation.accuracy <= MIN_GPS_ACCURACY : false;
        
        const reqSession = document.getElementById('req-session');
        const reqTarget = document.getElementById('req-target');
        const reqLocation = document.getElementById('req-location');
        
        if (reqSession) {
            reqSession.className = hasSession ? 'fulfilled' : '';
            reqSession.innerHTML = hasSession ? 
                '<i class="fas fa-check-circle req-icon" style="color:#10b981;"></i> Select session type' :
                '<i class="fas fa-times req-icon"></i> Select session type';
        }
        
        if (reqTarget) {
            reqTarget.className = hasTarget ? 'fulfilled' : '';
            reqTarget.innerHTML = hasTarget ? 
                '<i class="fas fa-check-circle req-icon" style="color:#10b981;"></i> Select target' :
                '<i class="fas fa-times req-icon"></i> Select target';
        }
        
        if (reqLocation) {
            const isReady = hasLocation && isAccurate;
            reqLocation.className = isReady ? 'fulfilled' : '';
            reqLocation.innerHTML = isReady ? 
                '<i class="fas fa-check-circle req-icon" style="color:#10b981;"></i> GPS location acquired' :
                '<i class="fas fa-times req-icon"></i> GPS location acquired';
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
        
        if (!selectedTarget) {
            showToast('Please select a target first', 'warning');
            return;
        }
        
        const distance = calculateDistance(
            currentLocation.latitude,
            currentLocation.longitude,
            selectedTarget.latitude,
            selectedTarget.longitude
        );
        
        // Show confirmation modal
        const confirmed = await showConfirmationModal(distance);
        if (!confirmed) return;
        
        button.disabled = true;
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
        
        try {
            let isVerified = false;
            let attendanceStatus = 'Present';
            
            // Determine status based on distance
            if (distance <= VERIFIED_DISTANCE) {
                isVerified = true;
                attendanceStatus = 'Present';
            } else if (distance <= PENDING_DISTANCE) {
                isVerified = false;
                attendanceStatus = 'Pending';
            } else {
                attendanceStatus = 'Absent';
                isVerified = false;
            }
            
            const supabaseClient = window.db?.supabase;
            if (!supabaseClient) throw new Error('Database error');
            
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
                student_name: attendanceUserProfile?.full_name || 'Unknown',
                program: attendanceUserProfile?.program,
                block: attendanceUserProfile?.block,
                intake_year: attendanceUserProfile?.intake_year,
                attendance_status: attendanceStatus,
                target_latitude: selectedTarget.latitude,
                target_longitude: selectedTarget.longitude
            };
            
            if (sessionTypeSelect.value === 'class') {
                let targetId = selectedTarget.id;
                if (targetId && targetId.startsWith('unit_')) {
                    targetId = targetId.replace('unit_', '');
                }
                const selectedUnit = approvedUnits.find(u => u.id == targetId);
                if (selectedUnit) {
                    checkInData.unit_code = selectedUnit.unit_code;
                    checkInData.unit_name = selectedUnit.unit_name;
                }
            }
            
            const { error } = await supabaseClient
                .from('geo_attendance_logs')
                .insert([checkInData]);
            
            if (error) throw error;
            
            const distanceDisplay = distance >= 1000 ? `${(distance/1000).toFixed(2)} km` : `${distance.toFixed(0)} m`;
            
            // Different messages based on status
            if (attendanceStatus === 'Present') {
                showToast(`✅ Check-in successful! Verified at ${selectedTarget.name}`, 'success');
            } else if (attendanceStatus === 'Pending') {
                showToast(`⚠️ Check-in recorded! Pending review by lecturer`, 'warning');
            } else if (attendanceStatus === 'Absent') {
                showToast(`📝 Check-in recorded from ${distanceDisplay} away. Marked as ABSENT.`, 'info');
            }
            
            await loadTodayAttendanceCount();
            await loadGeoAttendanceHistory('today');
            await loadAttendanceStreak();
            
            // Update button state
            updateCheckInButton();
            
        } catch (error) {
            console.error('Check-in error:', error);
            showToast(`❌ Check-in failed: ${error.message}`, 'error');
        } finally {
            button.disabled = false;
            button.innerHTML = '<i class="fas fa-fingerprint"></i><span class="btn-text">Check In Now</span><span class="btn-subtext">GPS verification required</span>';
        }
    }
    
    function showConfirmationModal(distance) {
        return new Promise((resolve) => {
            const distanceDisplay = distance >= 1000 ? `${(distance/1000).toFixed(2)} km` : `${distance.toFixed(0)} m`;
            let statusIcon = '';
            let statusColor = '';
            let statusMessage = '';
            let warningText = '';
            
            if (distance <= VERIFIED_DISTANCE) {
                statusIcon = '✅';
                statusColor = '#10b981';
                statusMessage = 'Will be AUTO-VERIFIED (Present)';
                warningText = '';
            } else if (distance <= PENDING_DISTANCE) {
                statusIcon = '⚠️';
                statusColor = '#f59e0b';
                statusMessage = 'Will be PENDING REVIEW';
                warningText = '⚠️ Your check-in will require lecturer approval.';
            } else {
                statusIcon = '❌';
                statusColor = '#ef4444';
                statusMessage = 'Will be marked ABSENT';
                warningText = '⚠️ WARNING: You are far from the location! This check-in will be marked as ABSENT.';
            }
            
            const modalHTML = `
                <div id="confirmModal" class="modal-overlay" style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:10000;">
                    <div style="background:white;border-radius:16px;width:90%;max-width:400px;animation:slideUp 0.3s ease;">
                        <div style="padding:20px;background:linear-gradient(135deg,#667eea,#764ba2);color:white;border-radius:16px 16px 0 0;display:flex;align-items:center;gap:10px;">
                            <i class="fas fa-fingerprint" style="font-size:24px;"></i>
                            <h3 style="margin:0;">Confirm Check-in</h3>
                        </div>
                        <div style="padding:20px;">
                            ${warningText ? `<div style="background:#fee2e2;border-left:4px solid #ef4444;padding:10px;margin-bottom:15px;border-radius:8px;color:#991b1b;">${warningText}</div>` : ''}
                            <div style="display:flex;flex-direction:column;gap:12px;">
                                <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #e5e7eb;">
                                    <span><i class="fas fa-bullseye"></i> Target:</span>
                                    <strong>${selectedTarget.name}</strong>
                                </div>
                                <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #e5e7eb;">
                                    <span><i class="fas fa-map-marker-alt"></i> Distance:</span>
                                    <strong style="color:${statusColor}">${distanceDisplay}</strong>
                                </div>
                                <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #e5e7eb;">
                                    <span><i class="fas fa-info-circle"></i> Status:</span>
                                    <strong style="color:${statusColor}">${statusIcon} ${statusMessage}</strong>
                                </div>
                                <div style="display:flex;justify-content:space-between;padding:8px 0;">
                                    <span><i class="fas fa-clock"></i> Time:</span>
                                    <strong>${new Date().toLocaleTimeString()}</strong>
                                </div>
                            </div>
                        </div>
                        <div style="padding:20px;display:flex;gap:10px;justify-content:flex-end;border-top:1px solid #e5e7eb;">
                            <button id="cancelCheckin" style="padding:10px 20px;border:none;border-radius:8px;cursor:pointer;background:#f3f4f6;color:#374151;">Cancel</button>
                            <button id="confirmCheckin" style="padding:10px 20px;border:none;border-radius:8px;cursor:pointer;background:${statusColor};color:white;">Confirm Check-in</button>
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
    
    // ============================================
    // TOAST NOTIFICATIONS
    // ============================================
    
    function showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.style.cssText = `
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
            border-left: 4px solid ${type === 'success' ? '#10b981' : (type === 'warning' ? '#f59e0b' : type === 'error' ? '#ef4444' : '#3b82f6')};
        `;
        const icon = type === 'success' ? '✅' : (type === 'warning' ? '⚠️' : (type === 'error' ? '❌' : 'ℹ️'));
        toast.innerHTML = `${icon} ${message}`;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.transform = 'translateX(-50%) translateY(0)';
            setTimeout(() => {
                toast.style.transform = 'translateX(-50%) translateY(100px)';
                setTimeout(() => toast.remove(), 300);
            }, 3000);
        }, 100);
    }
    
    // ============================================
    // ATTENDANCE STREAK
    // ============================================
    
    async function loadAttendanceStreak() {
        const supabaseClient = window.db?.supabase;
        if (!supabaseClient || !attendanceUserId) return;
        
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const { data } = await supabaseClient
            .from('geo_attendance_logs')
            .select('check_in_time, attendance_status')
            .eq('student_id', attendanceUserId)
            .eq('attendance_status', 'Present')
            .gte('check_in_time', thirtyDaysAgo.toISOString());
        
        if (!data) return;
        
        const dates = [...new Set(data.map(d => new Date(d.check_in_time).toDateString()))];
        dates.sort();
        
        let currentStreak = 0;
        let bestStreak = 0;
        let tempStreak = 1;
        let lastDate = null;
        
        for (const dateStr of dates) {
            const currentDate = new Date(dateStr);
            if (lastDate) {
                const diffDays = (currentDate - lastDate) / (1000 * 60 * 60 * 24);
                if (diffDays === 1) {
                    tempStreak++;
                } else {
                    tempStreak = 1;
                }
            }
            currentStreak = tempStreak;
            bestStreak = Math.max(bestStreak, currentStreak);
            lastDate = currentDate;
        }
        
        const streakContainer = document.getElementById('attendance-streak-container');
        if (streakContainer) {
            streakContainer.innerHTML = `
                <div style="display:flex;gap:15px;margin:15px 0;">
                    <div style="flex:1;background:linear-gradient(135deg,#667eea,#764ba2);color:white;padding:15px;border-radius:12px;display:flex;align-items:center;gap:12px;">
                        <i class="fas fa-fire" style="font-size:24px;"></i>
                        <div>
                            <div style="font-size:11px;opacity:0.8;">Current Streak</div>
                            <div style="font-size:20px;font-weight:bold;">${currentStreak} day${currentStreak !== 1 ? 's' : ''}</div>
                        </div>
                    </div>
                    <div style="flex:1;background:linear-gradient(135deg,#059669,#10b981);color:white;padding:15px;border-radius:12px;display:flex;align-items:center;gap:12px;">
                        <i class="fas fa-trophy" style="font-size:24px;"></i>
                        <div>
                            <div style="font-size:11px;opacity:0.8;">Best Streak</div>
                            <div style="font-size:20px;font-weight:bold;">${bestStreak} day${bestStreak !== 1 ? 's' : ''}</div>
                        </div>
                    </div>
                </div>
            `;
        }
    }
    
    // ============================================
    // LOAD HISTORY - FIXED TO AUTO-LOAD
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
        if (!tableBody || !attendanceUserId) {
            console.log('History table or user ID not ready yet');
            return;
        }
        
        console.log('Loading attendance history with filter:', filter);
        
        // Show loading state
        tableBody.innerHTML = '<tr><td colspan="6"><div class="loading-spinner"></div> Loading attendance history...</td></tr>';
        
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
                console.log('Filtering for today:', today.toISOString());
            } else if (filter === 'week') {
                const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                query = query.gte('check_in_time', weekAgo.toISOString());
                console.log('Filtering for last week');
            } else if (filter === 'month') {
                const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                query = query.gte('check_in_time', monthAgo.toISOString());
                console.log('Filtering for last month');
            }
            
            const { data: logs, error } = await query;
            if (error) throw error;
            
            tableBody.innerHTML = '';
            
            if (!logs || logs.length === 0) {
                tableBody.innerHTML = '<tr><td colspan="6" class="text-center" style="text-align:center;padding:20px;">📭 No check-in history found</td></tr>';
                console.log('No history records found');
                return;
            }
            
            console.log(`Found ${logs.length} history records`);
            
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
            
            historyLoaded = true;
            
        } catch (error) {
            console.error('Error loading history:', error);
            tableBody.innerHTML = '<tr><td colspan="6" style="color:red;text-align:center;padding:20px;">❌ Error loading history: ' + error.message + '</td></tr>';
        }
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
                // Retry after 1 second if not ready
                setTimeout(() => {
                    if (!attendanceUserProfile || !attendanceUserId) {
                        console.log('Retrying to load user data...');
                        loadAttendanceData();
                    }
                }, 1000);
                return;
            }
            
            console.log('👤 User:', attendanceUserProfile.full_name);
            console.log('📋 Program:', attendanceUserProfile.program);
            console.log('🆔 User ID:', attendanceUserId);
            
            await Promise.all([
                loadApprovedUnits(),
                loadClinicalLocations()
            ]);
            
            // Auto-load all data without requiring check-in
            await loadTodayAttendanceCount();
            await loadGeoAttendanceHistory('today'); // This will now auto-load
            await loadAttendanceStreak();
            
            console.log('✅ All attendance data loaded successfully');
            
        } catch (error) {
            console.error('Error loading attendance data:', error);
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
        
        // Auto-load history when attendance tab is opened
        if (tabName === 'attendance' && attendanceUserId && !historyLoaded) {
            console.log('Attendance tab opened, loading history...');
            loadGeoAttendanceHistory(document.getElementById('history-filter')?.value || 'today');
        } else if (tabName === 'attendance' && attendanceUserId) {
            // Refresh history even if already loaded (to show latest)
            console.log('Attendance tab opened, refreshing history...');
            loadGeoAttendanceHistory(document.getElementById('history-filter')?.value || 'today');
        }
    }
    
    function isOnAttendanceTab() {
        const attendanceTab = document.getElementById('attendance');
        return attendanceTab && attendanceTab.style.display === 'block';
    }
    
    function initializeAttendanceUI() {
        console.log('🚀 Initializing Enhanced Attendance System...');
        
        const sessionTypeSelect = document.getElementById('session-type');
        const checkInButton = document.getElementById('check-in-button');
        const attendanceTab = document.querySelector('.nav a[data-tab="attendance"]');
        const historyFilter = document.getElementById('history-filter');
        const refreshHistoryBtn = document.getElementById('refresh-history');
        
        // Add streak container
        const attendanceStats = document.querySelector('.attendance-stats');
        if (attendanceStats && !document.getElementById('attendance-streak-container')) {
            const streakContainer = document.createElement('div');
            streakContainer.id = 'attendance-streak-container';
            attendanceStats.insertAdjacentElement('afterend', streakContainer);
        }
        
        if (attendanceTab) {
            attendanceTab.addEventListener('click', async (e) => {
                e.preventDefault();
                switchToTab('attendance');
                if (!attendanceUserId) {
                    await loadAttendanceData();
                } else {
                    // Refresh history when tab is clicked
                    const currentFilter = historyFilter?.value || 'today';
                    await loadGeoAttendanceHistory(currentFilter);
                    await loadTodayAttendanceCount();
                    await loadAttendanceStreak();
                }
                startLocationMonitoring();
            });
        }
        
        if (sessionTypeSelect) {
            sessionTypeSelect.addEventListener('change', handleSessionTypeChange);
        }
        
        if (checkInButton) {
            checkInButton.onclick = (e) => {
                e.preventDefault();
                attendanceGeoCheckIn();
            };
        }
        
        if (historyFilter) {
            historyFilter.addEventListener('change', () => {
                loadGeoAttendanceHistory(historyFilter.value);
            });
        }
        
        if (refreshHistoryBtn) {
            refreshHistoryBtn.addEventListener('click', () => {
                const currentFilter = historyFilter?.value || 'today';
                showToast('Refreshing history...', 'info');
                loadGeoAttendanceHistory(currentFilter);
            });
        }
        
        updateTimeDisplay();
        setInterval(updateTimeDisplay, 60000);
        setInterval(updateRequirementsList, 1000);
        
        startLocationMonitoring();
        
        // Auto-load data when page loads
        loadAttendanceData();
        
        // If attendance tab is active on load, load history immediately
        if (isOnAttendanceTab()) {
            setTimeout(() => {
                if (attendanceUserId) {
                    loadGeoAttendanceHistory('today');
                }
            }, 500);
        }
    }
    
    // Add CSS animations
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideUp {
            from { transform: translateY(50px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
        }
        .session-badge {
            display: inline-block;
            padding: 4px 10px;
            border-radius: 20px;
            font-size: 11px;
            font-weight: 600;
            background: #e0e7ff;
            color: #3730a3;
        }
        #gps-status { transition: all 0.3s ease; }
        .btn-checkin.ready { background: linear-gradient(135deg, #10b981, #059669); }
        .fulfilled { color: #10b981; }
        .progress-container {
            margin-top: 10px;
        }
        .loading-spinner {
            display: inline-block;
            width: 20px;
            height: 20px;
            border: 2px solid #e5e7eb;
            border-top-color: #667eea;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
            margin-right: 8px;
            vertical-align: middle;
        }
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
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
