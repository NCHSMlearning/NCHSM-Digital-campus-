// enhanced-attendance.js - COMPLETE AUTOMATIC LOCATION ATTENDANCE SYSTEM
(function() {
    'use strict';
    
    console.log('✅ Complete Attendance System Loading...');
    
    // ============================================
    // CONFIGURATION
    // ============================================
    
    const VERIFIED_DISTANCE = 50;        // 50m - Auto verified
    const PENDING_DISTANCE = 200;        // 200m - Needs review
    
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
    let historyLoaded = false;
    
    // ============================================
    // HELPER: Get Current Student ID
    // ============================================
    
    function getCurrentStudentId() {
        if (window.db?.currentUserProfile?.user_id) {
            return window.db.currentUserProfile.user_id;
        }
        if (window.db?.currentUserId) {
            return window.db.currentUserId;
        }
        if (attendanceUserProfile?.user_id) {
            return attendanceUserProfile.user_id;
        }
        if (attendanceUserProfile?.id) {
            return attendanceUserProfile.id;
        }
        try {
            const profile = localStorage.getItem('userProfile');
            if (profile) {
                const parsed = JSON.parse(profile);
                return parsed.user_id || parsed.id;
            }
        } catch(e) {}
        return null;
    }
    
    // ============================================
    // LOAD APPROVED UNITS
    // ============================================
    
    async function loadApprovedUnits() {
        try {
            const supabaseClient = window.db?.supabase;
            const studentId = getCurrentStudentId();
            
            console.log('📚 Loading approved units for student:', studentId);
            
            if (!supabaseClient || !studentId) {
                return [];
            }
            
            const { data, error } = await supabaseClient
                .from('student_unit_registrations')
                .select('*')
                .eq('student_id', studentId)
                .eq('status', 'approved')
                .order('unit_code', { ascending: true });
            
            if (error) {
                console.error('Error loading units:', error);
                return [];
            }
            
            if (!data || data.length === 0) {
                const targetSelect = document.getElementById('attendance-target');
                if (targetSelect) {
                    targetSelect.innerHTML = '<option value="">⚠️ No approved units - Register first</option>';
                    targetSelect.disabled = true;
                }
                return [];
            }
            
            approvedUnits = data.map(unit => ({
                id: unit.id,
                unit_code: unit.unit_code,
                unit_name: unit.unit_name,
                block: unit.block,
                status: unit.status,
                credits: 3
            }));
            
            console.log(`✅ Loaded ${approvedUnits.length} approved units`);
            return approvedUnits;
            
        } catch (error) {
            console.error('Error in loadApprovedUnits:', error);
            return [];
        }
    }
    
    // ============================================
    // LOAD CLINICAL LOCATIONS
    // ============================================
    
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
    // AUTOMATIC LOCATION DETECTION
    // ============================================
    
    function startLocationMonitoring() {
        console.log('📍 Starting automatic location detection...');
        
        if (!navigator.geolocation) {
            updateGPSStatus('error', 'Geolocation not supported');
            return;
        }
        
        if (locationWatchId) {
            navigator.geolocation.clearWatch(locationWatchId);
        }
        
        updateGPSStatus('loading', 'Detecting your location...');
        
        // Try multiple attempts with different strategies
        let attempts = 0;
        const MAX_ATTEMPTS = 3;
        
        function attemptLocation() {
            attempts++;
            console.log(`📍 Attempt ${attempts}/${MAX_ATTEMPTS}...`);
            
            const options = {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            };
            
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    handleLocationUpdate(position);
                    
                    // Start watching for better accuracy
                    locationWatchId = navigator.geolocation.watchPosition(
                        (newPosition) => {
                            if (newPosition.coords.accuracy < (currentLocation?.accuracy || 999)) {
                                handleLocationUpdate(newPosition);
                            }
                        },
                        (error) => console.warn('Watch error:', error),
                        { enableHighAccuracy: true, timeout: 5000 }
                    );
                },
                (error) => {
                    console.warn(`Attempt ${attempts} failed:`, error.message);
                    if (attempts < MAX_ATTEMPTS) {
                        setTimeout(attemptLocation, 2000);
                    } else {
                        handleLocationError(error);
                    }
                },
                options
            );
        }
        
        attemptLocation();
    }
    
    function handleLocationUpdate(position) {
        const accuracy = position.coords.accuracy;
        
        currentLocation = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: accuracy,
            timestamp: new Date(position.timestamp)
        };
        
        updateLocationDisplay();
        updateCheckInButton();
        updateLiveDistanceMeter();
        updateRequirementsList();
        
        let accuracyMsg = '';
        let statusType = 'success';
        
        if (accuracy <= 50) {
            accuracyMsg = `✅ Excellent GPS: ±${accuracy.toFixed(0)}m - Ready for check-in`;
            statusType = 'success';
        } else if (accuracy <= 100) {
            accuracyMsg = `✅ Good GPS: ±${accuracy.toFixed(0)}m - Ready for check-in`;
            statusType = 'success';
        } else if (accuracy <= 200) {
            accuracyMsg = `⚠️ Fair GPS: ±${accuracy.toFixed(0)}m - May need review`;
            statusType = 'warning';
        } else {
            accuracyMsg = `⚠️ Poor GPS: ±${accuracy.toFixed(0)}m - Move to open area`;
            statusType = 'warning';
        }
        
        updateGPSStatus(statusType, accuracyMsg);
    }
    
    function handleLocationError(error) {
        let message = '';
        switch(error.code) {
            case error.PERMISSION_DENIED:
                message = '📍 Location permission denied. Please enable GPS.';
                break;
            case error.POSITION_UNAVAILABLE:
                message = '📡 Location unavailable. Please check GPS signal.';
                break;
            case error.TIMEOUT:
                message = '⏱️ Location timeout. Please try again.';
                break;
            default:
                message = 'Unable to get your location.';
        }
        updateGPSStatus('error', message);
        updateCheckInButton();
        
        // Add manual fallback button
        addManualFallbackButton();
    }
    
    function addManualFallbackButton() {
        const gpsStatus = document.getElementById('gps-status');
        if (!gpsStatus || document.getElementById('manual-fallback-btn')) return;
        
        const btn = document.createElement('button');
        btn.id = 'manual-fallback-btn';
        btn.innerHTML = '📍 Set Location Manually';
        btn.style.cssText = `
            margin-top: 10px;
            padding: 6px 12px;
            background: #f59e0b;
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 12px;
        `;
        
        btn.onclick = () => {
            const lat = prompt('Enter your latitude:', '-0.2714611');
            const lon = prompt('Enter your longitude:', '36.0519956');
            if (lat && lon) {
                currentLocation = {
                    latitude: parseFloat(lat),
                    longitude: parseFloat(lon),
                    accuracy: 50,
                    timestamp: new Date()
                };
                updateLocationDisplay();
                updateGPSStatus('success', '✅ Manual location set - Ready for check-in');
                updateLiveDistanceMeter();
                updateCheckInButton();
                btn.remove();
            }
        };
        
        gpsStatus.appendChild(btn);
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
        } else if (status === 'warning') {
            icon = '<i class="fas fa-exclamation-triangle"></i>';
            bgColor = '#fed7aa';
            gpsStatus.style.color = '#f59e0b';
        } else if (status === 'loading') {
            icon = '<i class="fas fa-spinner fa-spin"></i>';
            bgColor = '#e0e7ff';
            gpsStatus.style.color = '#667eea';
        } else {
            icon = '<i class="fas fa-times-circle"></i>';
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
            const isAccurate = currentLocation.accuracy <= 200;
            accuracyElement.style.color = isAccurate ? '#10b981' : '#f59e0b';
        }
    }
    
    // ============================================
    // DISTANCE CALCULATION
    // ============================================
    
    function calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371000;
        const toRad = (x) => (x * Math.PI) / 180;
        const dLat = toRad(lat2 - lat1);
        const dLon = toRad(lon2 - lon1);
        const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon/2)**2;
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
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
                    return;
                }
                
                targetSelect.innerHTML = '<option value="">🏥 Select clinical location...</option>';
                clinicalLocations.forEach(loc => {
                    const opt = document.createElement('option');
                    opt.value = `${loc.id}|${loc.name}|clinical|${loc.latitude}|${loc.longitude}|${VERIFIED_DISTANCE}`;
                    opt.textContent = `${loc.name} ${loc.block ? `[${loc.block}]` : ''}`;
                    targetSelect.appendChild(opt);
                });
                
            } else {
                if (approvedUnits.length === 0) {
                    await loadApprovedUnits();
                }
                
                if (approvedUnits.length === 0) {
                    targetSelect.innerHTML = '<option value="">📚 No approved units found</option>';
                    targetSelect.disabled = false;
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
                
                console.log(`✅ Populated dropdown with ${approvedUnits.length} approved units`);
            }
        } catch (error) {
            console.error('Error populating targets:', error);
            targetSelect.innerHTML = '<option value="">Error loading options</option>';
        }
        
        targetSelect.disabled = false;
        
        targetSelect.addEventListener('change', () => {
            const value = targetSelect.value;
            if (value && value !== '') {
                const parts = value.split('|');
                if (parts.length >= 6) {
                    selectedTarget = {
                        id: parts[0],
                        name: parts[1],
                        type: parts[2],
                        latitude: parseFloat(parts[3]),
                        longitude: parseFloat(parts[4]),
                        radius: parseInt(parts[5]) || VERIFIED_DISTANCE
                    };
                    console.log('✅ Target selected:', selectedTarget.name);
                    updateLiveDistanceMeter();
                    updateCheckInButton();
                }
            } else {
                selectedTarget = null;
                updateCheckInButton();
            }
        });
    }
    
    function updateLiveDistanceMeter() {
        if (!currentLocation || !selectedTarget) return;
        
        const distance = calculateDistance(
            currentLocation.latitude, currentLocation.longitude,
            selectedTarget.latitude, selectedTarget.longitude
        );
        
        const distanceDisplay = distance >= 1000 ? `${(distance/1000).toFixed(2)} km` : `${distance.toFixed(0)} m`;
        const distanceStatus = document.getElementById('distance-status');
        
        if (!distanceStatus) return;
        
        let statusIcon = '';
        let statusText = '';
        let bgColor = '';
        let borderColor = '';
        
        if (distance <= VERIFIED_DISTANCE) {
            statusIcon = '✅';
            statusText = 'AUTO VERIFIED';
            bgColor = '#d1fae5';
            borderColor = '#10b981';
        } else if (distance <= PENDING_DISTANCE) {
            statusIcon = '⚠️';
            statusText = 'PENDING REVIEW';
            bgColor = '#fed7aa';
            borderColor = '#f59e0b';
        } else {
            statusIcon = '❌';
            statusText = 'TOO FAR';
            bgColor = '#fee2e2';
            borderColor = '#ef4444';
        }
        
        distanceStatus.innerHTML = `
            <div style="background: ${bgColor}; border-left: 4px solid ${borderColor}; padding: 15px; border-radius: 8px;">
                <div style="display: flex; align-items: center; gap: 12px;">
                    <span style="font-size: 28px;">${statusIcon}</span>
                    <div>
                        <strong style="font-size: 16px; color: ${borderColor};">${statusText}</strong>
                        <div>Distance: ${distanceDisplay}</div>
                        <div>Target: ${selectedTarget.name}</div>
                    </div>
                </div>
            </div>
        `;
        
        distanceStatus.style.display = 'block';
    }
    
    // ============================================
    // CHECK-IN FUNCTION
    // ============================================
    
    async function attendanceGeoCheckIn() {
        const button = document.getElementById('check-in-button');
        const sessionTypeSelect = document.getElementById('session-type');
        const targetSelect = document.getElementById('attendance-target');
        
        if (!selectedTarget && targetSelect && targetSelect.value) {
            const parts = targetSelect.value.split('|');
            if (parts.length >= 6) {
                selectedTarget = {
                    id: parts[0],
                    name: parts[1],
                    type: parts[2],
                    latitude: parseFloat(parts[3]),
                    longitude: parseFloat(parts[4]),
                    radius: parseInt(parts[5]) || VERIFIED_DISTANCE
                };
            }
        }
        
        if (!selectedTarget) {
            alert('❌ Please select a course first');
            return;
        }
        
        if (!currentLocation) {
            alert('📍 Waiting for location detection... Please wait');
            return;
        }
        
        const distance = calculateDistance(
            currentLocation.latitude,
            currentLocation.longitude,
            selectedTarget.latitude,
            selectedTarget.longitude
        );
        
        let status = 'Absent';
        if (distance <= VERIFIED_DISTANCE) status = 'Present';
        else if (distance <= PENDING_DISTANCE) status = 'Pending';
        
        const confirmed = confirm(
            `📚 CHECK-IN CONFIRMATION\n\n` +
            `Course: ${selectedTarget.name}\n` +
            `📍 Your location: ${currentLocation.latitude.toFixed(6)}, ${currentLocation.longitude.toFixed(6)}\n` +
            `📡 Accuracy: ±${currentLocation.accuracy.toFixed(0)}m\n` +
            `📏 Distance: ${distance.toFixed(0)}m (${(distance/1000).toFixed(2)} km)\n` +
            `📋 Status: ${status}\n\n` +
            `Proceed?`
        );
        
        if (!confirmed) return;
        
        if (button) {
            button.disabled = true;
            button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
        }
        
        try {
            const supabaseClient = window.db?.supabase;
            const studentId = getCurrentStudentId();
            
            const checkInData = {
                student_id: studentId,
                check_in_time: new Date().toISOString(),
                session_type: sessionTypeSelect?.value || 'class',
                target_id: selectedTarget.id,
                target_name: selectedTarget.name,
                latitude: currentLocation.latitude,
                longitude: currentLocation.longitude,
                accuracy_m: currentLocation.accuracy,
                distance_meters: distance,
                is_verified: status === 'Present',
                attendance_status: status,
                target_latitude: selectedTarget.latitude,
                target_longitude: selectedTarget.longitude,
                unit_code: selectedTarget.name.split(' - ')[0],
                unit_name: selectedTarget.name
            };
            
            const { error } = await supabaseClient
                .from('geo_attendance_logs')
                .insert([checkInData]);
            
            if (error) throw error;
            
            const emoji = status === 'Present' ? '✅' : (status === 'Pending' ? '⚠️' : '❌');
            alert(`${emoji} CHECK-IN SUCCESSFUL!\n\nCourse: ${selectedTarget.name}\nStatus: ${status}\nDistance: ${distance.toFixed(0)}m`);
            
            await loadTodayAttendanceCount();
            await loadGeoAttendanceHistory('today');
            await loadAttendanceStreak();
            
        } catch (error) {
            console.error('Check-in error:', error);
            alert('❌ Check-in failed: ' + error.message);
        } finally {
            if (button) {
                button.disabled = false;
                button.innerHTML = '<i class="fas fa-fingerprint"></i> Check In Now';
            }
        }
    }
    
    function updateCheckInButton() {
        const checkInButton = document.getElementById('check-in-button');
        const sessionTypeSelect = document.getElementById('session-type');
        const targetSelect = document.getElementById('attendance-target');
        
        if (!checkInButton) return;
        
        const hasSession = sessionTypeSelect?.value;
        const hasTarget = targetSelect?.value && targetSelect.value !== '';
        const hasLocation = currentLocation !== null;
        
        checkInButton.disabled = !(hasSession && hasTarget && hasLocation);
        
        if (!hasLocation) {
            checkInButton.title = 'Waiting for location detection...';
            checkInButton.style.opacity = '0.6';
        } else if (!hasSession || !hasTarget) {
            checkInButton.title = 'Please select session type and target';
            checkInButton.style.opacity = '0.6';
        } else {
            checkInButton.title = 'Click to check in';
            checkInButton.style.opacity = '1';
        }
    }
    
    function updateRequirementsList() {
        const hasSession = document.getElementById('session-type')?.value;
        const hasTarget = document.getElementById('attendance-target')?.value && document.getElementById('attendance-target')?.value !== '';
        const hasLocation = currentLocation !== null;
        
        const reqSession = document.getElementById('req-session');
        const reqTarget = document.getElementById('req-target');
        const reqLocation = document.getElementById('req-location');
        
        if (reqSession) {
            reqSession.className = hasSession ? 'fulfilled' : '';
            reqSession.innerHTML = hasSession ? 
                '<i class="fas fa-check-circle" style="color:#10b981;"></i> Select session type' :
                '<i class="fas fa-times"></i> Select session type';
        }
        
        if (reqTarget) {
            reqTarget.className = hasTarget ? 'fulfilled' : '';
            reqTarget.innerHTML = hasTarget ? 
                '<i class="fas fa-check-circle" style="color:#10b981;"></i> Select target' :
                '<i class="fas fa-times"></i> Select target';
        }
        
        if (reqLocation) {
            reqLocation.className = hasLocation ? 'fulfilled' : '';
            reqLocation.innerHTML = hasLocation ? 
                '<i class="fas fa-check-circle" style="color:#10b981;"></i> Location detected' :
                '<i class="fas fa-times"></i> Location detection in progress...';
        }
    }
    
    function handleSessionTypeChange() {
        const sessionTypeSelect = document.getElementById('session-type');
        const targetControlGroup = document.getElementById('target-control-group');
        
        if (!sessionTypeSelect || !targetControlGroup) return;
        
        const sessionType = sessionTypeSelect.value;
        
        if (sessionType) {
            targetControlGroup.style.display = 'flex';
            populateTargetOptions(sessionType);
        } else {
            targetControlGroup.style.display = 'none';
            selectedTarget = null;
            const distanceStatus = document.getElementById('distance-status');
            if (distanceStatus) {
                distanceStatus.style.display = 'none';
            }
        }
        
        updateCheckInButton();
    }
    
    function showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: white;
            padding: 12px 20px;
            border-radius: 40px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            display: flex;
            align-items: center;
            gap: 10px;
            z-index: 10001;
            border-left: 4px solid ${type === 'success' ? '#10b981' : (type === 'warning' ? '#f59e0b' : '#ef4444')};
        `;
        const icon = type === 'success' ? '✅' : (type === 'warning' ? '⚠️' : '❌');
        toast.innerHTML = `${icon} ${message}`;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }
    
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
        
        tableBody.innerHTML = '<tr><td colspan="6"><div class="loading-spinner"></div> Loading...</td></tr>';
        
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
                tableBody.innerHTML = '<tr><td colspan="6" class="text-center" style="text-align:center;padding:20px;">📭 No check-in history found</td></tr>';
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
            
            historyLoaded = true;
            
        } catch (error) {
            console.error('Error loading history:', error);
            tableBody.innerHTML = '<tr><td colspan="6" style="color:red;text-align:center;padding:20px;">❌ Error loading history: ' + error.message + '</td></tr>';
        }
    }
    
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
                    <div style="flex:1;background:linear-gradient(135deg,#667eea,#764ba2);color:white;padding:15px;border-radius:12px;">
                        <i class="fas fa-fire"></i> Current: ${currentStreak} day${currentStreak !== 1 ? 's' : ''}
                    </div>
                    <div style="flex:1;background:linear-gradient(135deg,#059669,#10b981);color:white;padding:15px;border-radius:12px;">
                        <i class="fas fa-trophy"></i> Best: ${bestStreak} day${bestStreak !== 1 ? 's' : ''}
                    </div>
                </div>
            `;
        }
    }
    
    // ============================================
    // INITIALIZATION
    // ============================================
    
    async function loadAttendanceData() {
        try {
            attendanceUserProfile = window.db?.currentUserProfile;
            attendanceUserId = getCurrentStudentId();
            
            if (!attendanceUserProfile || !attendanceUserId) {
                console.log('Waiting for user data...');
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
            
            await loadTodayAttendanceCount();
            await loadGeoAttendanceHistory('today');
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
        
        if (tabName === 'attendance' && attendanceUserId && !historyLoaded) {
            loadGeoAttendanceHistory(document.getElementById('history-filter')?.value || 'today');
        } else if (tabName === 'attendance' && attendanceUserId) {
            loadGeoAttendanceHistory(document.getElementById('history-filter')?.value || 'today');
        }
    }
    
    function initializeAttendanceUI() {
        console.log('🚀 Initializing Automatic Location Attendance System...');
        
        const sessionTypeSelect = document.getElementById('session-type');
        const checkInButton = document.getElementById('check-in-button');
        const attendanceTab = document.querySelector('.nav a[data-tab="attendance"]');
        const historyFilter = document.getElementById('history-filter');
        const refreshHistoryBtn = document.getElementById('refresh-history');
        
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
        loadAttendanceData();
    }
    
    // Add CSS
    const style = document.createElement('style');
    style.textContent = `
        @keyframes spin {
            to { transform: rotate(360deg); }
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
        .fulfilled { color: #10b981; }
        #gps-status { transition: all 0.3s ease; }
        .btn-checkin.ready { background: linear-gradient(135deg, #10b981, #059669); }
        .progress-container { margin-top: 10px; }
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
    window.loadApprovedUnits = loadApprovedUnits;
    
})();
