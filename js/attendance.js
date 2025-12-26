// js/attendance.js - Attendance Management Module
class AttendanceModule {
    constructor(supabaseClient, locationiqApiKey) {
        this.sb = supabaseClient;
        this.locationiqApiKey = locationiqApiKey;
        this.userId = null;
        this.userProfile = null;
        
        // Attendance elements
        this.sessionTypeSelect = document.getElementById('session-type');
        this.attendanceTargetSelect = document.getElementById('attendance-target');
        this.checkInButton = document.getElementById('check-in-button');
        this.geoMessage = document.getElementById('geo-message');
        this.targetLabel = document.getElementById('target-label');
        this.geoAttendanceHistory = document.getElementById('geo-attendance-history');
        
        // Data caches
        this.cachedClinicalAreas = [];
        this.cachedCourses = [];
        
        // Constants
        this.MAX_DISTANCE_RADIUS = 200;
        this.FALLBACK_LAT = 0.00;
        this.FALLBACK_LON = 0.00;
        this.FALLBACK_ACCURACY = 9999;
        this.LOCATIONIQ_API_URL = 'https://us1.locationiq.com/v1/reverse.php';
        
        this.initializeElements();
    }
    
    initializeElements() {
        // Setup event listeners
        if (this.sessionTypeSelect) {
            this.sessionTypeSelect.addEventListener('change', () => this.updateTargetSelect());
        }
        
        if (this.checkInButton) {
            this.checkInButton.addEventListener('click', () => this.geoCheckIn());
        }
    }
    
    // Initialize with user ID and profile
    initialize(userId, userProfile) {
        this.userId = userId;
        this.userProfile = userProfile;
        
        if (userId && userProfile) {
            this.loadAttendanceData();
        }
    }
    
    async loadAttendanceData() {
        try {
            await Promise.all([
                this.loadClinicalTargets(),
                this.loadClassTargets(),
                this.loadAttendanceHistory()
            ]);
            
            this.updateTargetSelect();
            
        } catch (error) {
            console.error('Error loading attendance data:', error);
        }
    }
    
    // Load clinical targets
    async loadClinicalTargets() {
        if (!this.userProfile) return;
        
        const program = this.userProfile?.program || this.userProfile?.department;
        const intakeYear = this.userProfile?.intake_year;
        const blockTerm = this.userProfile?.block || null;
        
        if (!program || !intakeYear) {
            this.cachedClinicalAreas = [];
            return;
        }
        
        try {
            // Geo-based clinical areas
            const { data: areaData, error: areaError } = await this.sb
                .from('clinical_areas')
                .select('id, name, latitude, longitude, block, program, intake_year')
                .ilike('program', program)
                .ilike('intake_year', intakeYear)
                .or(blockTerm ? `block.ilike.${blockTerm},block.is.null` : 'block.is.null');
            
            if (areaError) throw areaError;
            
            // Textual clinical names including UUID + coordinates
            const { data: nameData, error: nameError } = await this.sb
                .from('clinical_names')
                .select('id, uuid, clinical_area_name, latitude, longitude, program, intake_year, block_term')
                .ilike('program', program)
                .ilike('intake_year', intakeYear)
                .or(blockTerm ? `block_term.ilike.${blockTerm},block_term.is.null` : 'block_term.is.null');
            
            if (nameError) throw nameError;
            
            // Map textual names to use actual UUIDs + keep coordinates
            const mappedNames = (nameData || []).map(n => ({
                id: n.uuid,
                original_id: n.id,
                name: n.clinical_area_name,
                latitude: n.latitude,
                longitude: n.longitude,
                block: n.block_term || null
            }));
            
            // Merge + deduplicate
            this.cachedClinicalAreas = [...(areaData || []), ...mappedNames]
                .filter((v, i, a) => a.findIndex(t => t.name === v.name) === i)
                .sort((a, b) => a.name.localeCompare(b.name));
            
        } catch (error) {
            console.error("Error loading clinical areas:", error);
            this.cachedClinicalAreas = [];
        }
    }
    
    // Load class targets
    async loadClassTargets() {
        if (!this.userProfile) return;
        
        const program = this.userProfile?.program || this.userProfile?.department;
        const intakeYear = this.userProfile?.intake_year;
        const block = this.userProfile?.block || null;
        
        if (!program || !intakeYear) {
            this.cachedCourses = [];
            return;
        }
        
        try {
            let query = this.sb.from('courses_sections')
                .select('id, name, code, latitude, longitude')
                .eq('program', program)
                .eq('intake_year', intakeYear);
            
            if (block) query = query.or(`block.eq.${block},block.is.null`);
            else query = query.is('block', null);
            
            const { data, error } = await query.order('name');
            if (error) throw error;
            
            this.cachedCourses = (data || []).map(c => ({
                id: c.id,
                name: c.name,
                code: c.code,
                latitude: c.latitude,
                longitude: c.longitude
            }));
        } catch (error) {
            console.error("Error loading class targets:", error);
            this.cachedCourses = [];
        }
    }
    
    // Update target dropdown
    updateTargetSelect() {
        if (!this.sessionTypeSelect || !this.attendanceTargetSelect || !this.geoMessage) return;
        
        const sessionType = this.sessionTypeSelect.value;
        this.attendanceTargetSelect.innerHTML = '';
        
        let targetList = [];
        let label = 'Department/Course:';
        
        if (sessionType === 'Clinical') {
            targetList = this.cachedClinicalAreas.map(d => ({
                id: d.id,
                name: d.name,
                text: `${d.name} (Clinical)`
            }));
            label = 'Department/Area:';
        } else if (sessionType === 'Class') {
            targetList = this.cachedCourses.map(c => ({
                id: c.id,
                name: c.name,
                code: c.code,
                text: `${c.code ? c.code + ' - ' : ''}${c.name} (Class)`
            }));
            label = 'Course/Subject:';
        }
        
        if (this.targetLabel) this.targetLabel.textContent = label;
        
        if (targetList.length === 0) {
            const message = sessionType === 'Class'
                ? 'No active courses found for your block.'
                : 'No clinical areas assigned to your block.';
            this.attendanceTargetSelect.innerHTML = `<option value="">${message}</option>`;
        } else {
            const defaultOption = document.createElement('option');
            defaultOption.value = '';
            defaultOption.textContent = `-- Select a ${label.replace(':', '')} --`;
            this.attendanceTargetSelect.appendChild(defaultOption);
            
            targetList.forEach(target => {
                const option = document.createElement('option');
                option.value = `${target.id}|${target.name}`;
                option.textContent = target.text;
                this.attendanceTargetSelect.appendChild(option);
            });
            
            this.attendanceTargetSelect.selectedIndex = 0;
        }
        
        this.geoMessage.innerHTML = `Please select a specific <strong>${label.replace(':', '')}</strong> to check in.`;
    }
    
    // Get device ID
    getDeviceId() {
        let deviceId = localStorage.getItem('device_id');
        if (!deviceId) {
            deviceId = crypto.randomUUID();
            localStorage.setItem('device_id', deviceId);
        }
        return deviceId;
    }
    
    // Geo check-in function
    async geoCheckIn() {
        if (this.checkInButton) this.checkInButton.disabled = true;
        if (this.geoMessage) this.geoMessage.textContent = '⏱️ Initializing check-in...';
        
        try {
            if (!this.userProfile) {
                if (this.geoMessage) this.geoMessage.textContent = 'Error: Student profile not loaded.';
                return;
            }
            
            const studentProgram = this.userProfile?.program || this.userProfile?.department || null;
            const deviceId = this.getDeviceId();
            const sessionType = this.sessionTypeSelect?.value;
            const targetSelect = this.attendanceTargetSelect?.value;
            const checkInTime = new Date().toISOString();
            
            if (!sessionType || !targetSelect || targetSelect === '') {
                if (this.geoMessage) this.geoMessage.textContent = 'Error: Select session type and target.';
                return;
            }
            
            // TargetSelect format is ID|NAME
            const [targetId, targetNameFromDropdown] = targetSelect.split('|');
            
            if (!targetId || !targetNameFromDropdown) {
                if (this.geoMessage) this.geoMessage.textContent = 'Error: Invalid target selected.';
                return;
            }
            
            // Check if offline
            if (!navigator.onLine) {
                // Add to offline queue (you need to implement OfflineManager)
                if (window.OfflineManager && window.OfflineManager.addToQueue) {
                    window.OfflineManager.addToQueue('checkIn', {
                        sessionType,
                        targetId,
                        targetNameFromDropdown,
                        studentProgram,
                        checkInTime,
                        deviceId
                    });
                }
                if (this.geoMessage) this.geoMessage.innerHTML = `✅ Check-in saved offline. Will sync when back online.`;
                if (this.checkInButton) this.checkInButton.disabled = false;
                return;
            }
            
            if (this.geoMessage) this.geoMessage.textContent = '⏱️ Requesting device location... (Allow up to 15 seconds for GPS lock)';
            
            // Get geolocation
            const location = await new Promise(resolve => {
                if (!navigator.geolocation) return resolve({ lat: this.FALLBACK_LAT, lon: this.FALLBACK_LON, acc: this.FALLBACK_ACCURACY, friendly: 'GPS unavailable' });
                navigator.geolocation.getCurrentPosition(
                    pos => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude, acc: pos.coords.accuracy, friendly: null }),
                    () => resolve({ lat: this.FALLBACK_LAT, lon: this.FALLBACK_LON, acc: this.FALLBACK_ACCURACY, friendly: 'GPS denied/timeout' }),
                    { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
                );
            });
            
            // Reverse-geocode for friendly name
            if (!location.friendly) {
                try {
                    const res = await fetch(`${this.LOCATIONIQ_API_URL}?key=${this.locationiqApiKey}&lat=${location.lat}&lon=${location.lon}&format=json`);
                    if (res.ok) {
                        const geoData = await res.json();
                        location.friendly = geoData?.display_name || `Lat:${location.lat.toFixed(4)}, Lon:${location.lon.toFixed(4)}`;
                    } else {
                        location.friendly = `Lat:${location.lat.toFixed(4)}, Lon:${location.lon.toFixed(4)} (Geo-API failed)`;
                    }
                } catch (err) {
                    location.friendly = `Lat:${location.lat.toFixed(4)}, Lon:${location.lon.toFixed(4)} (Geo-API error)`;
                    console.warn('Reverse geocoding error:', err);
                }
            }
            
            // Find the target entry to get coordinates and the CORRECT name
            let targetEntry = sessionType === 'Clinical'
                ? this.cachedClinicalAreas.find(c => c.id === targetId)
                : this.cachedCourses.find(c => c.id === targetId);
                
            if (!targetEntry || (targetEntry.latitude === null || targetEntry.longitude === null)) {
                if (this.geoMessage) this.geoMessage.textContent = 'Error: Target location coordinates not found.';
                return;
            }
            
            let dbTargetId = targetEntry.id;
            let targetNameToLog = targetNameFromDropdown;
            let selectedCourseId = null;
            
            // Set name and ID for logging based on type
            if (sessionType === 'Class') {
                targetNameToLog = targetEntry.name; 
                selectedCourseId = targetEntry.id;
            } else if (sessionType === 'Clinical') {
                targetNameToLog = targetEntry.name;
                dbTargetId = targetEntry.id;
            }
            
            // Haversine distance calculation
            const R = 6371000; // Earth radius in meters
            const toRad = x => x * Math.PI / 180;
            const dLat = toRad(location.lat - targetEntry.latitude);
            const dLon = toRad(location.lon - targetEntry.longitude);
            const lat1 = toRad(location.lat);
            const lat2 = toRad(targetEntry.latitude);
            const a = Math.sin(dLat/2)**2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon/2)**2;
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            const distanceMeters = R * c;
            const isVerified = distanceMeters <= this.MAX_DISTANCE_RADIUS;
            
            // RPC call to insert check-in
            const { error } = await this.sb.rpc('check_in_and_defer_fk', {
                p_student_id: this.userId,
                p_check_in_time: checkInTime,
                p_session_type: sessionType === 'Clinical' ? 'Clinical' : 'Class',
                p_target_id: dbTargetId,
                p_target_name: targetNameToLog,
                p_latitude: location.lat,
                p_longitude: location.lon,
                p_accuracy_m: location.acc,
                p_location_friendly_name: location.friendly,
                p_program: studentProgram,
                p_block: this.userProfile.block,
                p_intake_year: this.userProfile.intake_year,
                p_device_id: deviceId,
                p_is_verified: isVerified,
                p_course_id: selectedCourseId,
                p_student_name: this.userProfile.full_name || this.userProfile.name || 'Unknown Student'
            });
            
            if (error) {
                console.error('Check-in failed:', error);
                if (this.geoMessage) this.geoMessage.textContent = `Check-in failed: ${error.message}`;
            } else {
                if (this.geoMessage) this.geoMessage.innerHTML = `✅ Check-in complete! ${isVerified ? 'Verified successfully' : 'Pending verification'}`;
                this.loadAttendanceHistory();
            }
            
        } catch (e) {
            console.error('GeoCheckIn error:', e);
            if (this.geoMessage) this.geoMessage.textContent = `🚫 Critical error: ${e.message}`;
        } finally {
            if (this.checkInButton) this.checkInButton.disabled = false;
        }
    }
    
    // Load attendance history
    async loadAttendanceHistory() {
        if (!this.geoAttendanceHistory) return;
        
        this.geoAttendanceHistory.innerHTML = '<tr><td colspan="4">Loading geo check-in history...</td></tr>';
        
        try {
            const { data: logs, error } = await this.sb
                .from('geo_attendance_logs')
                .select('check_in_time, session_type, target_name, is_verified')
                .eq('student_id', this.userId)
                .order('check_in_time', { ascending: false })
                .limit(100);
        
            if (error) throw error;
        
            this.geoAttendanceHistory.innerHTML = '';
            if (!logs || logs.length === 0) {
                this.geoAttendanceHistory.innerHTML = '<tr><td colspan="4">No check-in logs found.</td></tr>';
                return;
            }
        
            logs.forEach(log => {
                const timeStr = new Date(log.check_in_time).toLocaleString();
                const verifiedText = log.is_verified ? '✅ Verified' : '⏳ Pending verification';
        
                const row = `
                    <tr>
                        <td>${timeStr}</td>
                        <td>${log.session_type}</td>
                        <td>${log.target_name}</td>
                        <td>${verifiedText}</td>
                    </tr>
                `;
                this.geoAttendanceHistory.innerHTML += row;
            });
        } catch (error) {
            console.error("Failed to load attendance history:", error);
            this.geoAttendanceHistory.innerHTML = `<tr><td colspan="4" style="color:#EF4444;">Error loading attendance logs: ${error.message}</td></tr>`;
        }
    }
    
    // Update user profile
    updateUserProfile(userProfile) {
        this.userProfile = userProfile;
    }
}

// Create global instance and export functions
let attendanceModule = null;

// Initialize attendance module
function initAttendanceModule(supabaseClient, locationiqApiKey, userId, userProfile) {
    attendanceModule = new AttendanceModule(supabaseClient, locationiqApiKey);
    attendanceModule.initialize(userId, userProfile);
    return attendanceModule;
}

// Global function to load attendance
async function loadAttendance() {
    if (attendanceModule) {
        await attendanceModule.loadAttendanceData();
    }
}

// Global function to update target select
function updateTargetSelect() {
    if (attendanceModule) {
        attendanceModule.updateTargetSelect();
    }
}

// Global function for geo check-in
function geoCheckIn() {
    if (attendanceModule) {
        attendanceModule.geoCheckIn();
    }
}

// Make functions globally available
window.AttendanceModule = AttendanceModule;
window.initAttendanceModule = initAttendanceModule;
window.loadAttendance = loadAttendance;
window.updateTargetSelect = updateTargetSelect;
window.geoCheckIn = geoCheckIn;
