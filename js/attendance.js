// enhanced-attendance.js - Complete Working Attendance System
(function() {
    'use strict';
    
    console.log('✅ Attendance System Loading...');
    
    // ============================================
    // CONFIGURATION
    // ============================================
    
    const VERIFIED_DISTANCE = 50;        // 50m - Auto verified
    const PENDING_DISTANCE = 200;        // 200m - Needs review
    const MIN_GPS_ACCURACY = 200;        // 200m - Minimum acceptable accuracy
    
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
    
    // ============================================
    // HELPER: Get Current Student ID (DYNAMIC - Works for ANY student)
    // ============================================
    
    function getCurrentStudentId() {
        // Priority 1: Check window.db
        if (window.db?.currentUserProfile?.user_id) {
            return window.db.currentUserProfile.user_id;
        }
        if (window.db?.currentUserId) {
            return window.db.currentUserId;
        }
        
        // Priority 2: Check attendanceUserProfile
        if (attendanceUserProfile?.user_id) {
            return attendanceUserProfile.user_id;
        }
        if (attendanceUserProfile?.id) {
            return attendanceUserProfile.id;
        }
        
        // Priority 3: Check localStorage
        try {
            const profile = localStorage.getItem('userProfile');
            if (profile) {
                const parsed = JSON.parse(profile);
                return parsed.user_id || parsed.id;
            }
        } catch(e) {}
        
        // Priority 4: Check sessionStorage
        try {
            const sessionId = sessionStorage.getItem('userId');
            if (sessionId) return sessionId;
        } catch(e) {}
        
        console.warn('⚠️ Could not find student ID');
        return null;
    }
    
    // ============================================
    // LOAD APPROVED UNITS (FIXED - Works for ANY student)
    // ============================================
    
    async function loadApprovedUnits() {
        try {
            const supabaseClient = window.db?.supabase;
            const studentId = getCurrentStudentId();
            
            console.log('📚 Loading approved units for student:', studentId);
            
            if (!supabaseClient || !studentId) {
                console.warn('❌ Cannot load units: no client or student ID');
                return [];
            }
            
            // Query student_unit_registrations for approved units
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
            
            console.log(`📊 Found ${data?.length || 0} approved units`);
            
            if (!data || data.length === 0) {
                const targetSelect = document.getElementById('attendance-target');
                if (targetSelect) {
                    targetSelect.innerHTML = '<option value="">⚠️ No approved units - Register first</option>';
                    targetSelect.disabled = true;
                }
                return [];
            }
            
            // Store approved units
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
    // POPULATE DROPDOWN (FIXED)
    // ============================================
    
    async function populateTargetOptions(sessionType) {
        const targetSelect = document.getElementById('attendance-target');
        if (!targetSelect) return;
        
        targetSelect.innerHTML = '<option value="">Loading...</option>';
        targetSelect.disabled = true;
        
        try {
            if (sessionType === 'class') {
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
                    const displayText = `${unit.unit_code} - ${unit.unit_name}`;
                    opt.value = `unit_${unit.id}|${displayText}|class|${CAMPUS_COORDINATES.latitude}|${CAMPUS_COORDINATES.longitude}|${VERIFIED_DISTANCE}`;
                    opt.textContent = displayText;
                    targetSelect.appendChild(opt);
                });
                
                targetSelect.disabled = false;
                console.log(`✅ Populated dropdown with ${approvedUnits.length} units`);
            }
        } catch (error) {
            console.error('Error populating targets:', error);
            targetSelect.innerHTML = '<option value="">Error loading options</option>';
            targetSelect.disabled = false;
        }
    }
    
    // ============================================
    // GPS LOCATION (FIXED - Better error handling)
    // ============================================
    
    function startLocationMonitoring() {
        if (!navigator.geolocation) {
            updateGPSStatus('error', 'Geolocation not supported');
            return;
        }
        
        if (locationWatchId) {
            navigator.geolocation.clearWatch(locationWatchId);
        }
        
        updateGPSStatus('loading', 'Getting GPS location...');
        
        const options = {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 0
        };
        
        navigator.geolocation.getCurrentPosition(
            (position) => {
                handleLocationUpdate(position);
                
                locationWatchId = navigator.geolocation.watchPosition(
                    handleLocationUpdate,
                    (error) => console.warn('Watch error:', error),
                    options
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
        
        let accuracyMsg = '';
        if (currentLocation.accuracy <= 50) {
            accuracyMsg = `✅ Excellent GPS: ±${currentLocation.accuracy.toFixed(0)}m`;
        } else if (currentLocation.accuracy <= 100) {
            accuracyMsg = `✅ Good GPS: ±${currentLocation.accuracy.toFixed(0)}m`;
        } else if (currentLocation.accuracy <= MIN_GPS_ACCURACY) {
            accuracyMsg = `⚠️ Fair GPS: ±${currentLocation.accuracy.toFixed(0)}m`;
        } else {
            accuracyMsg = `⚠️ Poor GPS: ±${currentLocation.accuracy.toFixed(0)}m - Move to open area`;
        }
        
        updateGPSStatus('success', accuracyMsg);
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
            const isAccurate = currentLocation.accuracy <= MIN_GPS_ACCURACY;
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
    // CHECK-IN FUNCTION (FIXED)
    // ============================================
    
    async function attendanceGeoCheckIn() {
        const button = document.getElementById('check-in-button');
        const sessionTypeSelect = document.getElementById('session-type');
        const targetSelect = document.getElementById('attendance-target');
        
        // Get selected target
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
            alert('Please select a course first');
            return;
        }
        
        if (!currentLocation) {
            alert('Waiting for GPS... Please wait');
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
            `📚 Check in for: ${selectedTarget.name}\n\n` +
            `📍 Your location: ${currentLocation.latitude.toFixed(6)}, ${currentLocation.longitude.toFixed(6)}\n` +
            `📏 Distance to campus: ${distance.toFixed(0)}m (${(distance/1000).toFixed(2)} km)\n` +
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
            
            // Refresh history
            await loadGeoAttendanceHistory('today');
            await loadTodayAttendanceCount();
            
        } catch (error) {
            console.error('Check-in error:', error);
            alert('Check-in failed: ' + error.message);
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
        const hasLocation = currentLocation !== null && currentLocation.accuracy <= MIN_GPS_ACCURACY;
        
        checkInButton.disabled = !(hasSession && hasTarget && hasLocation);
        
        if (!hasLocation) {
            checkInButton.title = 'Waiting for accurate GPS...';
        } else {
            checkInButton.title = 'Click to check in';
        }
    }
    
    function updateRequirementsList() {
        const hasSession = document.getElementById('session-type')?.value;
        const hasTarget = document.getElementById('attendance-target')?.value;
        const hasLocation = currentLocation !== null && currentLocation.accuracy <= MIN_GPS_ACCURACY;
        
        const reqSession = document.getElementById('req-session');
        const reqTarget = document.getElementById('req-target');
        const reqLocation = document.getElementById('req-location');
        
        if (reqSession) {
            reqSession.innerHTML = hasSession ? 
                '<i class="fas fa-check-circle" style="color:#10b981;"></i> Select session type' :
                '<i class="fas fa-times"></i> Select session type';
        }
        
        if (reqTarget) {
            reqTarget.innerHTML = hasTarget ? 
                '<i class="fas fa-check-circle" style="color:#10b981;"></i> Select target' :
                '<i class="fas fa-times"></i> Select target';
        }
        
        if (reqLocation) {
            reqLocation.innerHTML = hasLocation ? 
                '<i class="fas fa-check-circle" style="color:#10b981;"></i> GPS location acquired' :
                '<i class="fas fa-times"></i> GPS location acquired (need <200m)';
        }
    }
    
    function handleSessionTypeChange() {
        const sessionTypeSelect = document.getElementById('session-type');
        const targetControlGroup = document.getElementById('target-control-group');
        
        if (!sessionTypeSelect || !targetControlGroup) return;
        
        if (sessionTypeSelect.value) {
            targetControlGroup.style.display = 'flex';
            populateTargetOptions(sessionTypeSelect.value);
        } else {
            targetControlGroup.style.display = 'none';
            selectedTarget = null;
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
            z-index: 10001;
            border-left: 4px solid ${type === 'success' ? '#10b981' : '#ef4444'};
        `;
        toast.innerHTML = `${type === 'success' ? '✅' : '❌'} ${message}`;
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
            console.error('Error:', error);
        }
    }
    
    async function loadGeoAttendanceHistory(filter = 'today') {
        const tableBody = document.getElementById('geo-attendance-history');
        if (!tableBody) return;
        
        const studentId = getCurrentStudentId();
        if (!studentId) {
            tableBody.innerHTML = '<tr><td colspan="6">Please log in to view history</td></tr>';
            return;
        }
        
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
            }
            
            const { data: logs, error } = await query;
            if (error) throw error;
            
            tableBody.innerHTML = '';
            
            if (!logs || logs.length === 0) {
                tableBody.innerHTML = '<tr><td colspan="6" style="text-align:center;">📭 No check-in history</td></tr>';
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
                    <tr>
                        <td style="padding: 12px;">${time.toLocaleString()}</td>
                        <td style="padding: 12px;">${log.session_type || 'N/A'}</td>
                        <td style="padding: 12px;"><strong>${log.target_name || 'N/A'}</strong></td>
                        <td style="padding: 12px; color: ${statusColor};">${statusIcon} ${status}</td>
                        <td style="padding: 12px;">📍 ${distanceDisplay}</td>
                        <td style="padding: 12px;">🎯 ±${log.accuracy_m?.toFixed(0) || 'N/A'}m</td>
                    <tr>
                `;
            });
        } catch (error) {
            console.error('Error:', error);
            tableBody.innerHTML = '<tr><td colspan="6" style="color:red;">Error loading history</td></tr>';
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
            .select('check_in_time')
            .eq('student_id', studentId)
            .eq('attendance_status', 'Present')
            .gte('check_in_time', thirtyDaysAgo.toISOString());
        
        const streakContainer = document.getElementById('attendance-streak-container');
        if (streakContainer && data) {
            const uniqueDays = new Set(data.map(d => new Date(d.check_in_time).toDateString()));
            streakContainer.innerHTML = `
                <div style="display:flex;gap:15px;margin:15px 0;">
                    <div style="flex:1;background:linear-gradient(135deg,#667eea,#764ba2);color:white;padding:15px;border-radius:12px;">
                        <i class="fas fa-calendar-check"></i> Total Present: ${uniqueDays.size} days
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
            console.log('🆔 Student ID:', attendanceUserId);
            
            await loadApprovedUnits();
            await loadTodayAttendanceCount();
            await loadGeoAttendanceHistory('today');
            await loadAttendanceStreak();
            
            // If class is selected, populate dropdown
            const sessionType = document.getElementById('session-type');
            if (sessionType && sessionType.value === 'class') {
                await populateTargetOptions('class');
            }
            
            console.log('✅ Attendance system ready');
        } catch (error) {
            console.error('Error:', error);
        }
    }
    
    function updateTimeDisplay() {
        const el = document.getElementById('current-time');
        if (el) {
            el.textContent = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
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
            loadGeoAttendanceHistory('today');
            startLocationMonitoring();
        }
    }
    
    function initializeAttendanceUI() {
        console.log('🚀 Initializing Attendance System...');
        
        const sessionTypeSelect = document.getElementById('session-type');
        const attendanceTab = document.querySelector('.nav a[data-tab="attendance"]');
        const historyFilter = document.getElementById('history-filter');
        const refreshBtn = document.getElementById('refresh-history');
        
        // Add streak container
        const stats = document.querySelector('.attendance-stats');
        if (stats && !document.getElementById('attendance-streak-container')) {
            const container = document.createElement('div');
            container.id = 'attendance-streak-container';
            stats.insertAdjacentElement('afterend', container);
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
        
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                loadGeoAttendanceHistory(historyFilter?.value || 'today');
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
    `;
    document.head.appendChild(style);
    
    // Start
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeAttendanceUI);
    } else {
        initializeAttendanceUI();
    }
    
    // Expose functions
    window.attendanceGeoCheckIn = attendanceGeoCheckIn;
    window.loadGeoAttendanceHistory = loadGeoAttendanceHistory;
    window.loadApprovedUnits = loadApprovedUnits;
    
})();
