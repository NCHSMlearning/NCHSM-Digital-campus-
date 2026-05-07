// attendance.js - COMPLETE FINAL VERSION
// Features: Strict device linking, Geo targets, Auto-verification, Remote check-in
(function() {
    'use strict';
    
    console.log('✅ attendance.js - COMPLETE FINAL VERSION');
    
    // ============================================
    // CONFIGURATION
    // ============================================
    
    const VERIFIED_DISTANCE = 100;       // 100 meters - Auto verified
    const PENDING_DISTANCE = 200;        // 200 meters - Needs review
    const MIN_GPS_ACCURACY = 100;        // Acceptable GPS accuracy
    
    // Campus coordinates (fallback)
    const CAMPUS_COORDINATES = {
        latitude: -0.2610284,
        longitude: 36.0116283,
        name: "NCHSM Main Campus"
    };
    
    // Store data
    let approvedUnits = [];
    let geoTargets = [];
    let attendanceUserId = null;
    let attendanceUserProfile = null;
    let currentLocation = null;
    let locationWatchId = null;
    let selectedTarget = null;
    
    // ============================================
    // DEVICE ID MANAGEMENT - STRICT LINKING
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
            
            // Check if device is already linked to another user
            const { data: existingLink, error } = await supabaseClient
                .from('user_device_links')
                .select('user_id, device_id, is_active')
                .eq('device_id', deviceId)
                .maybeSingle();
            
            if (error && error.code !== 'PGRST116') {
                console.error('Device validation error:', error);
                return { allowed: true, message: 'Continuing with check-in' };
            }
            
            if (existingLink) {
                if (existingLink.user_id !== userId) {
                    return { 
                        allowed: false, 
                        message: `This device is already linked to another user account. Please use your own device.` 
                    };
                }
                if (!existingLink.is_active) {
                    return { 
                        allowed: false, 
                        message: `Your device has been deactivated. Please contact administrator.` 
                    };
                }
                return { allowed: true, message: 'Device verified' };
            }
            
            // First time using this device - link it to current user
            const { error: insertError } = await supabaseClient
                .from('user_device_links')
                .insert({
                    user_id: userId,
                    device_id: deviceId,
                    device_type: 'web',
                    last_used: new Date().toISOString(),
                    is_active: true
                });
            
            if (insertError) {
                console.error('Failed to link device:', insertError);
                return { allowed: true, message: 'Device linking failed but continuing' };
            }
            
            console.log('✅ Device linked to user:', userId);
            return { allowed: true, message: 'Device linked successfully' };
            
        } catch (error) {
            console.error('Device validation error:', error);
            return { allowed: true, message: 'Continuing with check-in' };
        }
    }
    
    async function updateDeviceLastUsed(deviceId) {
        try {
            const supabaseClient = window.db?.supabase;
            if (!supabaseClient) return;
            
            await supabaseClient
                .from('user_device_links')
                .update({ last_used: new Date().toISOString() })
                .eq('device_id', deviceId);
        } catch (error) {
            console.error('Failed to update device last used:', error);
        }
    }
    
    // ============================================
    // LOAD GEO TARGETS FROM DATABASE
    // ============================================
    
    async function loadGeoTargets() {
        try {
            const supabaseClient = window.db?.supabase;
            if (!supabaseClient) return [];
            
            console.log('📡 Loading geo targets from database...');
            
            const { data, error } = await supabaseClient
                .from('geo_targets')
                .select('*')
                .order('target_name', { ascending: true });
            
            if (error) throw error;
            
            geoTargets = data || [];
            console.log(`✅ Loaded ${geoTargets.length} geo targets`);
            
            return geoTargets;
            
        } catch (error) {
            console.error('Error loading geo targets:', error);
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
    
    function getLocationWithRetry() {
        return new Promise((resolve, reject) => {
            const options = {
                enableHighAccuracy: true,
                timeout: 15000,
                maximumAge: 0
            };
            navigator.geolocation.getCurrentPosition(resolve, reject, options);
        });
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
        
        getLocationWithRetry()
            .then(position => {
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
            })
            .catch(error => {
                console.error('Location error:', error);
                handleLocationError(error);
            });
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
    
    function updateGPSStatus(status, message, color = '#f59e0b') {
        const gpsStatus = document.getElementById('gps-status');
        if (!gpsStatus) return;
        
        let icon = '';
        let bgColor = '#fed7aa';
        
        if (status === 'success') {
            icon = '<i class="fas fa-check-circle"></i>';
            bgColor = '#d1fae5';
        } else if (status === 'loading') {
            icon = '<i class="fas fa-spinner fa-spin"></i>';
            bgColor = '#fed7aa';
        } else {
            icon = '<i class="fas fa-exclamation-triangle"></i>';
            bgColor = '#fee2e2';
        }
        
        gpsStatus.style.backgroundColor = bgColor;
        gpsStatus.style.padding = '8px 12px';
        gpsStatus.style.borderRadius = '8px';
        gpsStatus.style.color = color;
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
    // LOAD APPROVED UNITS
    // ============================================
    
    async function loadApprovedUnits() {
        try {
            const supabaseClient = window.db?.supabase;
            if (!supabaseClient || !attendanceUserId) return [];
            
            const { data, error } = await supabaseClient
                .from('student_unit_registrations')
                .select('unit_code, unit_name, block, term, status, id')
                .eq('student_id', attendanceUserId)
                .eq('status', 'approved');
            
            if (error) throw error;
            
            approvedUnits = data || [];
            console.log(`📚 Loaded ${approvedUnits.length} approved units`);
            return approvedUnits;
            
        } catch (error) {
            console.error('Error loading approved units:', error);
            return [];
        }
    }
    
    // ============================================
    // TARGET SELECTION
    // ============================================
    
    async function populateTargetOptions(sessionType) {
        const targetSelect = document.getElementById('attendance-target');
        if (!targetSelect) return;
        
        targetSelect.innerHTML = '<option value="">Loading options...</option>';
        targetSelect.disabled = true;
        
        try {
            // Load geo targets first
            if (geoTargets.length === 0) {
                await loadGeoTargets();
            }
            
            if (sessionType === 'clinical') {
                // Filter clinical targets
                const clinicalTargets = geoTargets.filter(t => t.session_type === 'clinical');
                
                if (clinicalTargets.length === 0) {
                    targetSelect.innerHTML = '<option value="">No clinical locations available</option>';
                    targetSelect.disabled = false;
                    return;
                }
                
                targetSelect.innerHTML = '<option value="">Select clinical location...</option>';
                clinicalTargets.forEach(target => {
                    const opt = document.createElement('option');
                    opt.value = `${target.id}|${target.target_name}|clinical|${target.latitude}|${target.longitude}|${target.radius_meters || 100}`;
                    opt.textContent = target.target_name;
                    targetSelect.appendChild(opt);
                });
                
            } else if (sessionType === 'class') {
                if (!approvedUnits || approvedUnits.length === 0) {
                    targetSelect.innerHTML = '<option value="">⚠️ No approved units. Please register first.</option>';
                    targetSelect.disabled = false;
                    return;
                }
                
                targetSelect.innerHTML = '<option value="">📚 Select approved course...</option>';
                
                approvedUnits.forEach(unit => {
                    const opt = document.createElement('option');
                    const unitCode = unit.unit_code || '';
                    const unitName = unit.unit_name || 'Unknown Course';
                    let displayText = unitCode ? `${unitCode} - ${unitName}` : unitName;
                    if (unit.block) displayText += ` [${unit.block}]`;
                    
                    opt.value = `unit_${unit.id || unit.unit_code}|${displayText}|class|||`;
                    opt.textContent = displayText;
                    targetSelect.appendChild(opt);
                });
            }
        } catch (error) {
            console.error('Error populating targets:', error);
            targetSelect.innerHTML = '<option value="">Error loading options</option>';
        }
        
        targetSelect.disabled = false;
        targetSelect.addEventListener('change', () => {
            updateCheckInButton();
            // Store selected target info
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
        
        // Calculate distance if location and target exist
        if (hasLocation && selectedTarget) {
            const distance = calculateDistance(
                currentLocation.latitude,
                currentLocation.longitude,
                selectedTarget.latitude,
                selectedTarget.longitude
            );
            
            const isWithinRange = distance <= VERIFIED_DISTANCE;
            const isPending = distance <= PENDING_DISTANCE;
            
            // Update distance status display
            if (distanceStatus) {
                const distanceMeters = distance.toFixed(0);
                const distanceKm = (distance / 1000).toFixed(2);
                const distanceDisplay = distance >= 1000 ? `${distanceKm} km` : `${distanceMeters} m`;
                
                let statusHtml = '';
                let bgColor = '';
                
                if (isWithinRange) {
                    statusHtml = `<span style="color: #10b981;">✅ Within range (${distanceDisplay}) - Will be verified</span>`;
                    bgColor = '#d1fae5';
                    canCheckIn = true;
                } else if (isPending) {
                    statusHtml = `<span style="color: #f59e0b;">⚠️ Near location (${distanceDisplay}) - Pending review</span>`;
                    bgColor = '#fed7aa';
                    canCheckIn = true;
                } else {
                    statusHtml = `<span style="color: #ef4444;">❌ Too far (${distanceDisplay}) - Will be marked ABSENT</span>`;
                    bgColor = '#fee2e2';
                    canCheckIn = true; // Still allow check-in, but will mark absent
                }
                
                distanceStatus.innerHTML = `
                    <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
                        <i class="fas fa-map-pin"></i>
                        <strong>Target:</strong> ${selectedTarget.name}
                        <strong>Distance:</strong> ${distanceDisplay}
                        ${statusHtml}
                    </div>
                `;
                distanceStatus.style.display = 'block';
                distanceStatus.style.backgroundColor = bgColor;
                distanceStatus.style.padding = '10px';
                distanceStatus.style.borderRadius = '8px';
                distanceStatus.style.marginTop = '10px';
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
                btnSubtext.textContent = '📝 Select session type and location';
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
        const originalHTML = button.innerHTML;
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing check-in...';
        
        try {
            if (!sessionTypeSelect.value) throw new Error('Please select session type');
            if (!targetSelect.value) throw new Error('Please select target');
            if (!currentLocation) throw new Error('Location not available');
            
            // Validate device linking
            const deviceId = getDeviceId();
            const deviceValidation = await validateDeviceForUser(attendanceUserId, deviceId);
            
            if (!deviceValidation.allowed) {
                throw new Error(deviceValidation.message);
            }
            
            await updateDeviceLastUsed(deviceId);
            
            // Get target coordinates
            let targetLat = CAMPUS_COORDINATES.latitude;
            let targetLon = CAMPUS_COORDINATES.longitude;
            let targetRadius = VERIFIED_DISTANCE;
            let targetName = '';
            
            if (selectedTarget) {
                targetLat = selectedTarget.latitude;
                targetLon = selectedTarget.longitude;
                targetRadius = selectedTarget.radius || VERIFIED_DISTANCE;
                targetName = selectedTarget.name;
            }
            
            const distance = calculateDistance(
                currentLocation.latitude,
                currentLocation.longitude,
                targetLat,
                targetLon
            );
            
            // Determine verification status and attendance status
            let isVerified = false;
            let attendanceStatus = 'Present';
            let verificationSource = 'Auto';
            
            if (distance <= VERIFIED_DISTANCE) {
                isVerified = true;
                attendanceStatus = 'Present';
                verificationSource = 'Auto - Verified';
            } else if (distance <= PENDING_DISTANCE) {
                isVerified = false;
                attendanceStatus = 'Pending';
                verificationSource = 'Auto - Pending Review';
            } else {
                isVerified = false;
                attendanceStatus = 'Absent';
                verificationSource = 'Auto - Too Far';
            }
            
            const supabaseClient = window.db?.supabase;
            if (!supabaseClient) throw new Error('Database connection error');
            
            const checkInData = {
                student_id: attendanceUserId,
                check_in_time: new Date().toISOString(),
                session_type: sessionTypeSelect.value,
                target_id: selectedTarget?.id || null,
                target_name: targetName,
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
                verification_source: verificationSource,
                is_remote: distance > VERIFIED_DISTANCE
            };
            
            const { error } = await supabaseClient
                .from('geo_attendance_logs')
                .insert([checkInData]);
            
            if (error) throw error;
            
            // Show result message
            const distanceDisplay = distance >= 1000 ? `${(distance/1000).toFixed(2)} km` : `${distance.toFixed(0)} m`;
            
            let resultMessage = '';
            let resultType = 'success';
            
            if (isVerified) {
                resultMessage = `✅ Check-in successful!\n📍 Location: ${targetName}\n📏 Distance: ${distanceDisplay}\n✅ Status: Verified (On Campus)`;
            } else if (attendanceStatus === 'Pending') {
                resultMessage = `⚠️ Check-in recorded!\n📍 Location: ${targetName}\n📏 Distance: ${distanceDisplay}\n⏳ Status: Pending Review (Near Campus)`;
                resultType = 'warning';
            } else {
                resultMessage = `📝 Check-in recorded - You will be marked ABSENT!\n📍 Location: ${targetName}\n📏 Distance: ${distanceDisplay}\n❌ Status: Absent (Too far from campus)`;
                resultType = 'error';
            }
            
            if (window.AppUtils?.showToast) {
                window.AppUtils.showToast(resultMessage, resultType);
            } else {
                alert(resultMessage);
            }
            
            await loadTodayAttendanceCount();
            await loadGeoAttendanceHistory('today');
            
            // Reset form
            sessionTypeSelect.value = '';
            targetSelect.value = '';
            selectedTarget = null;
            handleSessionTypeChange();
            
        } catch (error) {
            console.error('Check-in error:', error);
            if (window.AppUtils?.showToast) {
                window.AppUtils.showToast(error.message, 'error');
            } else {
                alert(`❌ Check-in failed: ${error.message}`);
            }
        } finally {
            button.disabled = false;
            button.innerHTML = originalHTML;
        }
    }
    
    // ============================================
    // LOAD ATTENDANCE HISTORY
    // ============================================
    
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
            
            if (!error) presentTodayElement.textContent = count || 0;
        } catch (error) {
            console.error('Error loading today count:', error);
        }
    }
    
    async function loadGeoAttendanceHistory(filter = 'today') {
        const tableBody = document.getElementById('geo-attendance-history');
        if (!tableBody || !attendanceUserId) return;
        
        tableBody.innerHTML = '<tr><td colspan="7"><div class="loading-spinner"></div> Loading history...<\/td><\/tr>';
        
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
                const timeStr = time.toLocaleString('en-US', {
                    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                });
                
                const distance = log.distance_meters;
                const distanceDisplay = distance ? (distance >= 1000 ? `${(distance/1000).toFixed(2)} km` : `${distance.toFixed(0)} m`) : 'N/A';
                const isVerified = log.is_verified;
                const attendanceStatus = log.attendance_status || (isVerified ? 'Present' : 'Absent');
                
                let statusIcon = '';
                let statusColor = '';
                let statusText = '';
                
                if (attendanceStatus === 'Present') {
                    statusIcon = '✅';
                    statusColor = '#10b981';
                    statusText = 'Present';
                } else if (attendanceStatus === 'Pending') {
                    statusIcon = '⏳';
                    statusColor = '#f59e0b';
                    statusText = 'Pending';
                } else {
                    statusIcon = '❌';
                    statusColor = '#ef4444';
                    statusText = 'Absent';
                }
                
                tableBody.innerHTML += `
                    <tr style="border-bottom: 1px solid #e5e7eb;">
                        <td style="padding: 12px;">${timeStr}</td>
                        <td style="padding: 12px;">${log.session_type || 'N/A'}</td>
                        <td style="padding: 12px;"><strong>${log.target_name || 'N/A'}</strong></td>
                        <td style="padding: 12px; color: ${statusColor}; font-weight: 600;">${statusIcon} ${statusText}</td>
                        <td style="padding: 12px;">${distanceDisplay}</td>
                        <td style="padding: 12px;">GPS: ±${log.accuracy_m?.toFixed(0) || 'N/A'}m</td>
                    </tr>
                `;
            });
        } catch (error) {
            console.error('Error loading history:', error);
            tableBody.innerHTML = `<tr><td colspan="7" style="color:red;">Error loading history<\/td><\/tr>`;
        }
    }
    
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
    
    function triggerDashboardAttendanceUpdate() {
        const event = new CustomEvent('attendanceCheckedIn', {
            detail: { timestamp: new Date().toISOString() }
        });
        document.dispatchEvent(event);
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
            
            await loadApprovedUnits();
            await loadGeoTargets();
            await loadTodayAttendanceCount();
            await loadGeoAttendanceHistory('today');
            
        } catch (error) {
            console.error('Error loading attendance data:', error);
        }
    }
    
    function initializeAttendanceUI() {
        console.log('Initializing attendance system UI...');
        
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
            historyFilter.addEventListener('change', () => {
                loadGeoAttendanceHistory(historyFilter.value);
            });
        }
        
        if (refreshHistoryBtn) {
            refreshHistoryBtn.addEventListener('click', () => {
                loadGeoAttendanceHistory(historyFilter?.value || 'today');
            });
        }
        
        updateTimeDisplay();
        setInterval(updateTimeDisplay, 60000);
        
        startLocationMonitoring();
        
        if (isOnAttendanceTab()) {
            loadAttendanceData();
        }
        
        document.addEventListener('dashboardReady', () => {
            setTimeout(() => triggerDashboardAttendanceUpdate(), 1000);
        });
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
        }
        .session-class { background: #e0e7ff; color: #3730a3; }
        .session-clinical { background: #dcfce7; color: #166534; }
        .session-lab { background: #fef3c7; color: #92400e; }
        .session-tutorial { background: #fce7f3; color: #9d174d; }
        
        .attendance-row:hover { background-color: #f8fafc; }
        
        .btn-checkin.ready { 
            background: linear-gradient(135deg, #10b981, #059669); 
            box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3);
        }
        
        #distance-status { margin-top: 10px; padding: 10px; border-radius: 8px; font-size: 13px; }
        #gps-status { transition: all 0.3s ease; padding: 8px 12px; border-radius: 8px; }
    `;
    document.head.appendChild(style);
    
    // ============================================
    // START SYSTEM
    // ============================================
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeAttendanceUI);
    } else {
        initializeAttendanceUI();
    }
    
    // Expose global functions
    window.attendanceGeoCheckIn = attendanceGeoCheckIn;
    window.loadAttendanceData = loadAttendanceData;
    window.loadGeoAttendanceHistory = loadGeoAttendanceHistory;
    
})();
