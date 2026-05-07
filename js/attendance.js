// attendance.js - COMPLETE WORKING VERSION
(function() {
    'use strict';
    
    console.log('✅ attendance.js - FINAL WORKING VERSION');
    
    // ============================================
    // CONFIGURATION
    // ============================================
    
    const VERIFIED_DISTANCE = 100;       // 100 meters - Auto verified
    const PENDING_DISTANCE = 200;        // 200 meters - Needs review
    const MIN_GPS_ACCURACY = 100;        // Acceptable GPS accuracy
    
    // Campus coordinates
    const CAMPUS_COORDINATES = {
        latitude: -0.2610284,
        longitude: 36.0116283,
        name: "NCHSM Main Campus"
    };
    
    // Store data
    let activeCourses = [];
    let clinicalLocations = [];
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
                return { allowed: true, message: 'Continuing with check-in' };
            }
            
            if (existingLink) {
                if (existingLink.user_id !== userId) {
                    return { 
                        allowed: false, 
                        message: `❌ This device is already linked to another user account.` 
                    };
                }
                if (!existingLink.is_active) {
                    return { 
                        allowed: false, 
                        message: `❌ Your device has been deactivated.` 
                    };
                }
                return { allowed: true, message: 'Device verified' };
            }
            
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
            } else {
                console.log('✅ Device linked to user:', userId);
            }
            
            return { allowed: true, message: 'Device linked successfully' };
            
        } catch (error) {
            console.error('Device validation error:', error);
            return { allowed: true, message: 'Continuing with check-in' };
        }
    }
    
    // ============================================
    // LOAD ACTIVE COURSES
    // ============================================
    
    async function loadActiveCourses() {
        try {
            const supabaseClient = window.db?.supabase;
            if (!supabaseClient || !attendanceUserProfile) {
                console.log('No supabase client or user profile');
                return [];
            }
            
            const program = attendanceUserProfile?.program;
            const intakeYear = attendanceUserProfile?.intake_year;
            const userBlock = attendanceUserProfile?.block;
            
            console.log(`📚 Loading ACTIVE courses for: ${program}, ${intakeYear}, User Block: ${userBlock}`);
            
            // Get ALL active courses first (no block filter initially)
            let query = supabaseClient
                .from('courses')
                .select('id, course_name, unit_code, description, block, intake_year, target_program, status, latitude, longitude, radius_m')
                .eq('status', 'Active');
            
            // Filter by program if available
            if (program) {
                query = query.eq('target_program', program);
            }
            
            // Filter by intake year if available
            if (intakeYear) {
                query = query.eq('intake_year', intakeYear);
            }
            
            const { data, error } = await query.order('course_name');
            
            if (error) {
                console.error('Error loading courses:', error);
                return [];
            }
            
            console.log(`📚 Total active courses found: ${data?.length || 0}`);
            
            if (!data || data.length === 0) {
                console.log('⚠️ No active courses found');
                return [];
            }
            
            // Filter courses by block - match user's block or show all if no match
            let filteredCourses = data;
            
            if (userBlock && userBlock !== 'N/A' && userBlock !== '') {
                // Try to match exact block
                const exactMatches = data.filter(c => c.block === userBlock);
                
                if (exactMatches.length > 0) {
                    filteredCourses = exactMatches;
                    console.log(`✅ Found ${exactMatches.length} courses matching block "${userBlock}"`);
                } else {
                    // No exact block match, show courses with null block or relevant blocks
                    console.log(`⚠️ No exact block match for "${userBlock}", showing relevant courses`);
                    filteredCourses = data.filter(c => 
                        c.block === null || 
                        c.block === '' || 
                        c.block === userBlock ||
                        (userBlock === 'Introductory' && c.block === 'Introductory') ||
                        (userBlock === 'Block A' && c.block === 'A') ||
                        (userBlock === 'Block 4' && c.block === 'Block 4')
                    );
                    console.log(`📚 Showing ${filteredCourses.length} courses (no exact block match)`);
                }
            }
            
            // Log found courses
            filteredCourses.forEach(course => {
                console.log(`  📖 ${course.unit_code || course.course_name}: ${course.course_name} [Block: ${course.block || 'General'}]`);
            });
            
            return filteredCourses;
            
        } catch (error) {
            console.error('Error loading active courses:', error);
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
                block: loc.block_term
            }));
            
            console.log(`🏥 Loaded ${clinicalLocations.length} clinical locations`);
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
            `⚠️ GPS: ±${currentLocation.accuracy.toFixed(0)}m (needs ≤${MIN_GPS_ACCURACY}m)`;
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
                if (clinicalLocations.length === 0) {
                    await loadClinicalLocations();
                }
                
                if (clinicalLocations.length === 0) {
                    targetSelect.innerHTML = '<option value="">No clinical locations available</option>';
                    targetSelect.disabled = false;
                    return;
                }
                
                targetSelect.innerHTML = '<option value="">🏥 Select clinical location...</option>';
                clinicalLocations.forEach(loc => {
                    const opt = document.createElement('option');
                    opt.value = `${loc.id}|${loc.name}|clinical|${loc.latitude}|${loc.longitude}|100`;
                    opt.textContent = loc.name;
                    targetSelect.appendChild(opt);
                });
                
            } else if (sessionType === 'class') {
                if (activeCourses.length === 0) {
                    await loadActiveCourses();
                }
                
                if (activeCourses.length === 0) {
                    targetSelect.innerHTML = '<option value="">⚠️ No active courses available</option>';
                    targetSelect.disabled = false;
                    return;
                }
                
                targetSelect.innerHTML = '<option value="">📚 Select course...</option>';
                activeCourses.forEach(course => {
                    const displayCode = course.unit_code || '';
                    const displayName = course.course_name;
                    let displayText = displayCode ? `${displayCode} - ${displayName}` : displayName;
                    if (course.block) displayText += ` [${course.block}]`;
                    
                    const targetLat = course.latitude || CAMPUS_COORDINATES.latitude;
                    const targetLon = course.longitude || CAMPUS_COORDINATES.longitude;
                    
                    const opt = document.createElement('option');
                    opt.value = `course_${course.id}|${displayText}|class|${targetLat}|${targetLon}|${VERIFIED_DISTANCE}`;
                    opt.textContent = displayText;
                    targetSelect.appendChild(opt);
                });
                
                // Show count
                const countIndicator = document.createElement('div');
                countIndicator.className = 'course-count-indicator mt-1';
                countIndicator.style.fontSize = '11px';
                countIndicator.style.color = '#10b981';
                countIndicator.innerHTML = `<i class="fas fa-book-open"></i> ${activeCourses.length} active course(s) available`;
                
                const existingIndicator = targetSelect.parentElement.querySelector('.course-count-indicator');
                if (existingIndicator) existingIndicator.remove();
                targetSelect.parentElement.appendChild(countIndicator);
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
                console.log('Selected target:', selectedTarget.name);
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
                btnSubtext.textContent = '📝 Select session type and course';
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
            
            const distance = calculateDistance(
                currentLocation.latitude,
                currentLocation.longitude,
                selectedTarget.latitude,
                selectedTarget.longitude
            );
            
            let isVerified = false;
            let attendanceStatus = 'Present';
            
            if (distance <= VERIFIED_DISTANCE) {
                isVerified = true;
                attendanceStatus = 'Present';
            } else if (distance <= PENDING_DISTANCE) {
                isVerified = false;
                attendanceStatus = 'Pending';
            } else {
                isVerified = false;
                attendanceStatus = 'Absent';
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
                device_id: deviceId,
                student_name: attendanceUserProfile?.full_name || 'Unknown',
                program: attendanceUserProfile?.program,
                block: attendanceUserProfile?.block,
                intake_year: attendanceUserProfile?.intake_year,
                attendance_status: attendanceStatus,
                is_remote: distance > VERIFIED_DISTANCE
            };
            
            const { error } = await supabaseClient
                .from('geo_attendance_logs')
                .insert([checkInData]);
            
            if (error) throw error;
            
            const distanceDisplay = distance >= 1000 ? `${(distance/1000).toFixed(2)} km` : `${distance.toFixed(0)} m`;
            let resultMsg = '';
            
            if (isVerified) {
                resultMsg = `✅ Check-in successful!\nCourse: ${selectedTarget.name}\nDistance: ${distanceDisplay}\nStatus: VERIFIED`;
            } else if (attendanceStatus === 'Pending') {
                resultMsg = `⚠️ Check-in recorded!\nCourse: ${selectedTarget.name}\nDistance: ${distanceDisplay}\nStatus: PENDING REVIEW`;
            } else {
                resultMsg = `📝 Check-in recorded - ABSENT!\nCourse: ${selectedTarget.name}\nDistance: ${distanceDisplay}\nStatus: ABSENT (Too far)`;
            }
            
            alert(resultMsg);
            
            await loadTodayAttendanceCount();
            await loadGeoAttendanceHistory('today');
            
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
        
        tableBody.innerHTML = '<tr><td colspan="7"><div class="loading-spinner"></div> Loading...</td></tr>';
        
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
                tableBody.innerHTML = '<tr><td colspan="7" class="text-center">No check-in history found</td></tr>';
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
            tableBody.innerHTML = '<tr><td colspan="7" style="color:red;">Error loading history</td></tr>';
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
                loadActiveCourses(),
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
        .course-count-indicator { margin-top: 8px; font-size: 12px; }
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
