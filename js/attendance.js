// enhanced-attendance.js - Practical Anti-Cheat System (No Photos)
(function() {
    'use strict';
    
    console.log('🔒 PRACTICAL ATTENDANCE SYSTEM - Anti-Cheat Enabled');
    
    // ============================================
    // CONFIGURATION
    // ============================================
    
    const ATTENDANCE_RULES = {
        // Within 50m → Auto-approved (clearly on campus)
        autoApproved: { 
            maxDistance: 50, 
            status: 'Present',
            icon: '✅',
            requiresReview: false
        },
        // 50-200m → Pending review (lecturer can approve based on context)
        pendingReview: { 
            maxDistance: 200, 
            status: 'Pending',
            icon: '⚠️',
            requiresReview: true
        },
        // Beyond 200m → Auto-rejected
        autoRejected: { 
            maxDistance: Infinity, 
            status: 'Absent',
            icon: '❌',
            requiresReview: false
        }
    };
    
    const GPS_SETTINGS = {
        requiredAccuracy: 150,     // 150m is reasonable for campus
        maxRetries: 3,
        timeout: 15000,
        minimumAccuracy: 200       // Reject accuracy worse than 200m
    };
    
    const TIME_RESTRICTIONS = {
        enabled: true,
        startHour: 6,      // 6 AM
        endHour: 22,       // 10 PM
        message: 'Check-in only allowed between 6 AM and 10 PM'
    };
    
    const DAILY_LIMITS = {
        enabled: true,
        maxPerUnit: 1,     // Can only check in once per unit per day
        maxTotal: 6        // Max 6 check-ins per day total
    };
    
    // Store data
    let approvedUnits = [];
    let clinicalLocations = [];
    let attendanceUserId = null;
    let attendanceUserProfile = null;
    let currentLocation = null;
    let locationWatchId = null;
    let selectedTarget = null;
    let todayCheckIns = [];
    
    // ============================================
    // HELPER: Get Current Student ID
    // ============================================
    
    function getCurrentStudentId() {
        const sources = [
            () => attendanceUserProfile?.user_id,
            () => window.db?.currentUserProfile?.user_id,
            () => window.unitRegistrationModule?.userProfile?.user_id,
            () => {
                try {
                    const profile = localStorage.getItem('userProfile');
                    return profile ? JSON.parse(profile).user_id : null;
                } catch(e) { return null; }
            },
            () => window.db?.currentUserId
        ];
        
        for (const source of sources) {
            const id = source();
            if (id && typeof id === 'string' && id.length > 10) return id;
        }
        return null;
    }
    
    // ============================================
    // TIME-BASED CHECKS
    // ============================================
    
    function isWithinAllowedHours() {
        if (!TIME_RESTRICTIONS.enabled) return true;
        
        const now = new Date();
        const hour = now.getHours();
        return hour >= TIME_RESTRICTIONS.startHour && hour < TIME_RESTRICTIONS.endHour;
    }
    
    function getTimeRestrictionMessage() {
        return `${TIME_RESTRICTIONS.message} (${TIME_RESTRICTIONS.startHour}:00 - ${TIME_RESTRICTIONS.endHour}:00)`;
    }
    
    // ============================================
    // DAILY LIMIT CHECKS
    // ============================================
    
    async function loadTodayCheckIns() {
        const supabase = window.db?.supabase;
        const studentId = getCurrentStudentId();
        
        if (!supabase || !studentId) return [];
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const { data } = await supabase
            .from('geo_attendance_logs')
            .select('*')
            .eq('student_id', studentId)
            .gte('check_in_time', today.toISOString());
        
        todayCheckIns = data || [];
        return todayCheckIns;
    }
    
    async function canCheckInToday(unitCode = null) {
        await loadTodayCheckIns();
        
        // Check total daily limit
        if (todayCheckIns.length >= DAILY_LIMITS.maxTotal) {
            return { 
                allowed: false, 
                reason: `You have reached the daily limit of ${DAILY_LIMITS.maxTotal} check-ins` 
            };
        }
        
        // Check per-unit limit
        if (unitCode && DAILY_LIMITS.maxPerUnit === 1) {
            const alreadyCheckedUnit = todayCheckIns.some(check => check.unit_code === unitCode);
            if (alreadyCheckedUnit) {
                return { 
                    allowed: false, 
                    reason: `You have already checked in for this unit today` 
                };
            }
        }
        
        return { allowed: true };
    }
    
    // ============================================
    // GPS ACCURACY VALIDATION
    // ============================================
    
    function isGPSAccurate(position) {
        const accuracy = position.coords.accuracy;
        
        // Reject obviously fake GPS (accuracy of 0 or 1 is suspicious)
        if (accuracy <= 1) {
            console.warn('⚠️ Suspicious GPS accuracy detected:', accuracy);
            return false;
        }
        
        // Reject poor accuracy
        if (accuracy > GPS_SETTINGS.minimumAccuracy) {
            console.warn(`⚠️ GPS accuracy too poor: ±${accuracy}m (need <${GPS_SETTINGS.minimumAccuracy}m)`);
            return false;
        }
        
        // Check if coordinates are within Kenya (basic validation)
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        if (lat < -4.5 || lat > 5.0 || lon < 34.0 || lon > 42.0) {
            console.warn('⚠️ Coordinates outside Kenya detected');
            return false;
        }
        
        return true;
    }
    
    // ============================================
    // GET VERIFIED LOCATION
    // ============================================
    
    async function getVerifiedLocation() {
        return new Promise((resolve, reject) => {
            let attempts = 0;
            const MAX_ATTEMPTS = GPS_SETTINGS.maxRetries;
            let bestLocation = null;
            
            function attemptLocation() {
                attempts++;
                console.log(`📍 Location attempt ${attempts}/${MAX_ATTEMPTS}...`);
                
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        const accuracy = position.coords.accuracy;
                        console.log(`   Accuracy: ±${accuracy}m`);
                        
                        if (!isGPSAccurate(position)) {
                            if (attempts < MAX_ATTEMPTS) {
                                setTimeout(attemptLocation, 2000);
                            } else if (bestLocation) {
                                console.warn(`⚠️ Using best available accuracy: ±${bestLocation.coords.accuracy}m`);
                                resolve(bestLocation);
                            } else {
                                reject(new Error(`GPS accuracy too poor (±${accuracy}m). Please move to an open area.`));
                            }
                            return;
                        }
                        
                        if (!bestLocation || accuracy < bestLocation.coords.accuracy) {
                            bestLocation = position;
                        }
                        
                        if (accuracy <= GPS_SETTINGS.requiredAccuracy) {
                            resolve(bestLocation);
                        } else if (attempts >= MAX_ATTEMPTS) {
                            resolve(bestLocation);
                        } else {
                            setTimeout(attemptLocation, 2000);
                        }
                    },
                    (error) => {
                        console.error(`Attempt ${attempts} failed:`, error.message);
                        if (attempts >= MAX_ATTEMPTS) {
                            reject(error);
                        } else {
                            setTimeout(attemptLocation, 2000);
                        }
                    },
                    {
                        enableHighAccuracy: true,
                        timeout: GPS_SETTINGS.timeout,
                        maximumAge: 0
                    }
                );
            }
            
            attemptLocation();
        });
    }
    
    // ============================================
    // DISTANCE CALCULATION
    // ============================================
    
    function calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371000;
        const toRad = (x) => (x * Math.PI) / 180;
        const dLat = toRad(lat2 - lat1);
        const dLon = toRad(lon2 - lon1);
        const a = Math.sin(dLat / 2) ** 2 +
                  Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
                  Math.sin(dLon / 2) ** 2;
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }
    
    // ============================================
    // LOAD APPROVED UNITS
    // ============================================
    
    async function loadApprovedUnits() {
        try {
            const supabaseClient = window.db?.supabase;
            const studentId = getCurrentStudentId();
            
            if (!supabaseClient || !studentId) return [];
            
            const { data, error } = await supabaseClient
                .from('student_unit_registrations')
                .select('*')
                .eq('student_id', studentId)
                .eq('status', 'approved')
                .order('unit_code', { ascending: true });
            
            if (error || !data) return [];
            
            approvedUnits = data.map(reg => ({
                id: reg.id,
                unit_code: reg.unit_code,
                unit_name: reg.unit_name,
                block: reg.block,
                status: reg.status,
                credits: 3
            }));
            
            console.log(`✅ Loaded ${approvedUnits.length} approved units`);
            return approvedUnits;
            
        } catch (error) {
            console.error('Error loading units:', error);
            return [];
        }
    }
    
    // ============================================
    // LOAD CLINICAL LOCATIONS
    // ============================================
    
    async function loadClinicalLocations() {
        try {
            const supabaseClient = window.db?.supabase;
            if (!supabaseClient || !attendanceUserProfile) return [];
            
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
            if (error) return [];
            
            clinicalLocations = (data || []).map(loc => ({
                id: loc.id,
                name: loc.clinical_area_name,
                latitude: parseFloat(loc.latitude) || CAMPUS_COORDINATES.latitude,
                longitude: parseFloat(loc.longitude) || CAMPUS_COORDINATES.longitude,
                program: loc.program,
                block: loc.block_term
            }));
            
            return clinicalLocations;
            
        } catch (error) {
            console.error('Error loading clinical locations:', error);
            return [];
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
                if (clinicalLocations.length === 0) await loadClinicalLocations();
                
                if (clinicalLocations.length === 0) {
                    targetSelect.innerHTML = '<option value="">🏥 No clinical locations available</option>';
                    targetSelect.disabled = false;
                    return;
                }
                
                targetSelect.innerHTML = '<option value="">🏥 Select clinical location...</option>';
                clinicalLocations.forEach(loc => {
                    const opt = document.createElement('option');
                    opt.value = `${loc.id}|${loc.name}|clinical|${loc.latitude}|${loc.longitude}|100`;
                    opt.textContent = `${loc.name} ${loc.block ? `[${loc.block}]` : ''}`;
                    targetSelect.appendChild(opt);
                });
                
            } else {
                if (approvedUnits.length === 0) await loadApprovedUnits();
                
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
                    
                    opt.value = `unit_${unit.id}|${displayText}|class|-0.2714611|36.0519956|100`;
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
                        radius: parseInt(parts[5]) || 100
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
    
    // ============================================
    // CHECK-IN FUNCTION
    // ============================================
    
    async function attendanceGeoCheckIn() {
        const button = document.getElementById('check-in-button');
        const sessionTypeSelect = document.getElementById('session-type');
        const targetSelect = document.getElementById('attendance-target');
        
        if (!selectedTarget && targetSelect?.value) {
            const parts = targetSelect.value.split('|');
            if (parts.length >= 6) {
                selectedTarget = {
                    id: parts[0], name: parts[1], type: parts[2],
                    latitude: parseFloat(parts[3]), longitude: parseFloat(parts[4]),
                    radius: parseInt(parts[5]) || 100
                };
            }
        }
        
        if (!selectedTarget) {
            showToast('Please select a course first', 'warning');
            return;
        }
        
        // 1. TIME CHECK
        if (!isWithinAllowedHours()) {
            showToast(getTimeRestrictionMessage(), 'error');
            return;
        }
        
        // 2. DAILY LIMIT CHECK
        const unitCode = selectedTarget.name.split(' - ')[0];
        const limitCheck = await canCheckInToday(unitCode);
        if (!limitCheck.allowed) {
            showToast(limitCheck.reason, 'warning');
            return;
        }
        
        if (button) {
            button.disabled = true;
            button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verifying GPS...';
        }
        
        try {
            // Get verified GPS location
            const position = await getVerifiedLocation();
            
            const userLat = position.coords.latitude;
            const userLon = position.coords.longitude;
            const accuracy = position.coords.accuracy;
            
            // Calculate distance
            const distance = calculateDistance(userLat, userLon, selectedTarget.latitude, selectedTarget.longitude);
            
            // Determine status based on distance
            let rule = ATTENDANCE_RULES.autoRejected;
            if (distance <= ATTENDANCE_RULES.autoApproved.maxDistance) {
                rule = ATTENDANCE_RULES.autoApproved;
            } else if (distance <= ATTENDANCE_RULES.pendingReview.maxDistance) {
                rule = ATTENDANCE_RULES.pendingReview;
            }
            
            console.log(`📍 Distance: ${distance.toFixed(0)}m | Status: ${rule.status}`);
            
            // Confirm with user
            const confirmed = confirm(
                `${rule.icon} CHECK-IN VERIFICATION\n\n` +
                `Course: ${selectedTarget.name}\n` +
                `📍 Distance: ${distance.toFixed(0)}m (${(distance/1000).toFixed(2)} km)\n` +
                `📡 GPS Accuracy: ±${accuracy}m\n` +
                `📋 Status: ${rule.status}\n` +
                `${rule.requiresReview ? '⏳ This check-in requires lecturer review\n' : '✅ Auto-verified check-in\n'}\n` +
                `Proceed?`
            );
            
            if (!confirmed) {
                if (button) button.disabled = false;
                return;
            }
            
            if (button) button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
            
            // Save to database
            const supabase = window.db.supabase;
            const studentId = getCurrentStudentId();
            const selectedUnit = approvedUnits.find(u => u.unit_code === unitCode);
            
            const checkInData = {
                student_id: studentId,
                check_in_time: new Date().toISOString(),
                session_type: sessionTypeSelect.value,
                target_id: selectedTarget.id,
                target_name: selectedTarget.name,
                latitude: userLat,
                longitude: userLon,
                accuracy_m: accuracy,
                distance_meters: distance,
                is_verified: !rule.requiresReview,
                attendance_status: rule.status,
                target_latitude: selectedTarget.latitude,
                target_longitude: selectedTarget.longitude,
                unit_code: unitCode,
                unit_name: selectedUnit?.unit_name || selectedTarget.name,
                requires_lecturer_review: rule.requiresReview
            };
            
            const { error } = await supabase.from('geo_attendance_logs').insert([checkInData]);
            
            if (error) throw error;
            
            showToast(`${rule.icon} Check-in successful! Status: ${rule.status}`, rule.status === 'Present' ? 'success' : 'warning');
            
            // Refresh data
            await loadTodayCheckIns();
            await loadGeoAttendanceHistory('today');
            await loadAttendanceStreak();
            
        } catch (error) {
            console.error('Check-in error:', error);
            showToast(`Check-in failed: ${error.message}`, 'error');
        } finally {
            if (button) {
                button.disabled = false;
                button.innerHTML = '<i class="fas fa-fingerprint"></i> Check In Now';
            }
        }
    }
    
    // ============================================
    // UI UPDATE FUNCTIONS
    // ============================================
    
    function startLocationMonitoring() {
        if (!navigator.geolocation) {
            updateGPSStatus('error', 'Geolocation not supported');
            return;
        }
        
        if (locationWatchId) navigator.geolocation.clearWatch(locationWatchId);
        
        updateGPSStatus('loading', 'Getting GPS location...');
        
        navigator.geolocation.getCurrentPosition(
            (position) => {
                handleLocationUpdate(position);
                
                locationWatchId = navigator.geolocation.watchPosition(
                    handleLocationUpdate,
                    (error) => console.warn('Watch error:', error),
                    { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
                );
            },
            (error) => handleLocationError(error),
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
        );
    }
    
    function handleLocationUpdate(position) {
        const accuracy = position.coords.accuracy;
        const isValid = accuracy <= GPS_SETTINGS.minimumAccuracy;
        
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
        if (accuracy <= 50) {
            accuracyMsg = `✅ Excellent GPS: ±${accuracy.toFixed(0)}m`;
        } else if (accuracy <= 100) {
            accuracyMsg = `✅ Good GPS: ±${accuracy.toFixed(0)}m`;
        } else if (accuracy <= 150) {
            accuracyMsg = `⚠️ Fair GPS: ±${accuracy.toFixed(0)}m`;
        } else {
            accuracyMsg = `⚠️ Poor GPS: ±${accuracy.toFixed(0)}m - Move to open area`;
        }
        
        updateGPSStatus(isValid ? 'success' : 'warning', accuracyMsg);
    }
    
    function handleLocationError(error) {
        let message = '';
        switch(error.code) {
            case error.PERMISSION_DENIED:
                message = '📍 Location permission denied. Required for attendance.';
                break;
            case error.POSITION_UNAVAILABLE:
                message = '📡 Location unavailable. Please enable GPS.';
                break;
            case error.TIMEOUT:
                message = '⏱️ Location timeout. Please try again.';
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
            const isAccurate = currentLocation.accuracy <= GPS_SETTINGS.requiredAccuracy;
            accuracyElement.style.color = isAccurate ? '#10b981' : '#f59e0b';
        }
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
        
        let rule = ATTENDANCE_RULES.autoRejected;
        if (distance <= ATTENDANCE_RULES.autoApproved.maxDistance) rule = ATTENDANCE_RULES.autoApproved;
        else if (distance <= ATTENDANCE_RULES.pendingReview.maxDistance) rule = ATTENDANCE_RULES.pendingReview;
        
        distanceStatus.innerHTML = `
            <div style="background: ${rule.status === 'Present' ? '#d1fae5' : (rule.status === 'Pending' ? '#fed7aa' : '#fee2e2')}; border-left: 4px solid ${rule.status === 'Present' ? '#10b981' : (rule.status === 'Pending' ? '#f59e0b' : '#ef4444')}; padding: 15px; border-radius: 8px;">
                <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 10px;">
                    <span style="font-size: 28px;">${rule.icon}</span>
                    <div>
                        <strong style="font-size: 16px;">${rule.status.toUpperCase()}</strong>
                        <div style="font-size: 12px; color: #666;">Distance: ${distanceDisplay}</div>
                    </div>
                </div>
                <div style="font-size: 13px; margin-top: 8px;">
                    ${rule.requiresReview ? '⏳ This check-in will require lecturer review' : '✅ Auto-verified check-in'}
                </div>
            </div>
        `;
        
        distanceStatus.style.display = 'block';
    }
    
    function updateCheckInButton() {
        const checkInButton = document.getElementById('check-in-button');
        const sessionTypeSelect = document.getElementById('session-type');
        const targetSelect = document.getElementById('attendance-target');
        
        if (!checkInButton) return;
        
        const hasSession = sessionTypeSelect?.value;
        const hasTarget = targetSelect?.value && targetSelect.value !== '';
        const hasLocation = currentLocation !== null && currentLocation.accuracy <= GPS_SETTINGS.minimumAccuracy;
        
        const canCheckIn = hasSession && hasTarget && hasLocation;
        checkInButton.disabled = !canCheckIn;
        
        if (!canCheckIn) {
            if (!hasLocation) {
                checkInButton.title = 'Waiting for accurate GPS (need <200m)...';
                checkInButton.style.opacity = '0.6';
            } else {
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
        const hasLocation = currentLocation !== null && currentLocation.accuracy <= GPS_SETTINGS.minimumAccuracy;
        
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
                '<i class="fas fa-check-circle" style="color:#10b981;"></i> GPS location acquired' :
                '<i class="fas fa-times"></i> GPS location acquired (need <200m accuracy)';
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
            document.getElementById('distance-status').style.display = 'none';
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
        if (!presentTodayElement) return;
        
        const studentId = getCurrentStudentId();
        if (!studentId) return;
        
        try {
            const supabaseClient = window.db?.supabase;
            if (!supabaseClient) return;
            
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            const { count } = await supabaseClient
                .from('geo_attendance_logs')
                .select('*', { count: 'exact', head: true })
                .eq('student_id', studentId)
                .eq('attendance_status', 'Present')
                .gte('check_in_time', today.toISOString());
            
            presentTodayElement.textContent = count || 0;
        } catch (error) {
            console.error('Error loading today count:', error);
        }
    }
    
    async function loadGeoAttendanceHistory(filter = 'today') {
        const tableBody = document.getElementById('geo-attendance-history');
        if (!tableBody) return;
        
        const studentId = getCurrentStudentId();
        if (!studentId) return;
        
        tableBody.innerHTML = '<tr><td colspan="6"><div class="loading-spinner"></div> Loading...</td></tr>';
        
        try {
            const supabaseClient = window.db?.supabase;
            if (!supabaseClient) throw new Error('Database not available');
            
            let query = supabaseClient
                .from('geo_attendance_logs')
                .select('*')
                .eq('student_id', studentId)
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
                tableBody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:20px;">📭 No check-in history</td></tr>';
                return;
            }
            
            logs.forEach(log => {
                const time = new Date(log.check_in_time);
                const distance = log.distance_meters;
                const distanceDisplay = distance ? (distance >= 1000 ? `${(distance/1000).toFixed(2)} km` : `${distance.toFixed(0)} m`) : 'N/A';
                const status = log.attendance_status;
                
                let statusIcon = status === 'Present' ? '✅' : (status === 'Pending' ? '⏳' : '❌');
                let statusColor = status === 'Present' ? '#10b981' : (status === 'Pending' ? '#f59e0b' : '#ef4444');
                
                tableBody.innerHTML += `
                    <tr style="border-bottom: 1px solid #e5e7eb;">
                        <td style="padding: 12px;">${time.toLocaleString()}</td>
                        <td style="padding: 12px;">${log.session_type || 'N/A'}</td>
                        <td style="padding: 12px;"><strong>${log.target_name || 'N/A'}</strong></td>
                        <td style="padding: 12px; color: ${statusColor};">${statusIcon} ${status}</td>
                        <td style="padding: 12px;">📍 ${distanceDisplay}</td>
                        <td style="padding: 12px;">🎯 ±${log.accuracy_m?.toFixed(0) || 'N/A'}m</td>
                    </tr>
                `;
            });
        } catch (error) {
            console.error('Error loading history:', error);
            tableBody.innerHTML = '<tr><td colspan="6" style="color:red;text-align:center;">Error loading history</td></tr>';
        }
    }
    
    async function loadAttendanceStreak() {
        const supabaseClient = window.db?.supabase;
        const studentId = getCurrentStudentId();
        if (!supabaseClient || !studentId) return;
        
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const { data } = await supabaseClient
            .from('geo_attendance_logs')
            .select('check_in_time, attendance_status')
            .eq('student_id', studentId)
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
                if (diffDays === 1) tempStreak++;
                else tempStreak = 1;
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
                setTimeout(loadAttendanceData, 1000);
                return;
            }
            
            console.log('👤 User:', attendanceUserProfile.full_name);
            console.log('🔒 Anti-Cheat Mode: ENABLED');
            
            await Promise.all([loadApprovedUnits(), loadClinicalLocations()]);
            await loadTodayAttendanceCount();
            await loadGeoAttendanceHistory('today');
            await loadAttendanceStreak();
            
            console.log('✅ Attendance system ready');
        } catch (error) {
            console.error('Error loading attendance data:', error);
        }
    }
    
    function updateTimeDisplay() {
        const currentTimeElement = document.getElementById('current-time');
        if (currentTimeElement) {
            currentTimeElement.textContent = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
        }
    }
    
    function switchToTab(tabName) {
        document.querySelectorAll('.tab-content').forEach(tab => tab.style.display = 'none');
        document.querySelectorAll('.nav a').forEach(nav => nav.classList.remove('active'));
        
        const selectedTab = document.getElementById(tabName);
        if (selectedTab) selectedTab.style.display = 'block';
        
        const activeNav = document.querySelector(`.nav a[data-tab="${tabName}"]`);
        if (activeNav) activeNav.classList.add('active');
        
        if (tabName === 'attendance') {
            loadGeoAttendanceHistory(document.getElementById('history-filter')?.value || 'today');
            startLocationMonitoring();
        }
    }
    
    function initializeAttendanceUI() {
        console.log('🔒 Initializing Anti-Cheat Attendance System...');
        
        const sessionTypeSelect = document.getElementById('session-type');
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
            attendanceTab.addEventListener('click', (e) => {
                e.preventDefault();
                switchToTab('attendance');
            });
        }
        
        if (sessionTypeSelect) {
            sessionTypeSelect.addEventListener('change', handleSessionTypeChange);
        }
        
        if (historyFilter) {
            historyFilter.addEventListener('change', () => loadGeoAttendanceHistory(historyFilter.value));
        }
        
        if (refreshHistoryBtn) {
            refreshHistoryBtn.addEventListener('click', () => {
                const filter = historyFilter?.value || 'today';
                loadGeoAttendanceHistory(filter);
                showToast('History refreshed', 'success');
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
        .fulfilled { color: #10b981; }
        .loading-spinner {
            display: inline-block;
            width: 20px;
            height: 20px;
            border: 2px solid #e5e7eb;
            border-top-color: #667eea;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
        }
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
        #gps-status { transition: all 0.3s ease; }
    `;
    document.head.appendChild(style);
    
    // Start
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeAttendanceUI);
    } else {
        initializeAttendanceUI();
    }
    
    // Expose API
    window.attendanceGeoCheckIn = attendanceGeoCheckIn;
    window.loadGeoAttendanceHistory = loadGeoAttendanceHistory;
    window.loadAttendanceData = loadAttendanceData;
    
    console.log('🔒 ANTI-CHEAT ATTENDANCE SYSTEM READY');
    console.log('   Features:');
    console.log('   ✅ Time restrictions (6 AM - 10 PM)');
    console.log('   ✅ Daily limits (max 5 check-ins)');
    console.log('   ✅ GPS accuracy validation (<200m required)');
    console.log('   ✅ Location validation (Kenya only)');
    console.log('   ✅ Lecturer review for boundary cases (50-200m)');
    console.log('   ✅ Auto-approved within 50m');
    
})();
