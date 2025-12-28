// js/attendance.js - Complete Attendance System Module (Updated)
class AttendanceModule {
    constructor() {
        this.userId = null;
        this.userProfile = null;
        this.cachedClinicalAreas = [];
        this.cachedCourses = [];
        
        // Constants
        this.FALLBACK_LAT = -1.2921;
        this.FALLBACK_LON = 36.8219;
        this.FALLBACK_ACCURACY = 1000;
        this.MAX_DISTANCE_RADIUS = 50; // 50 meters
        this.LOCATIONIQ_API_URL = 'https://us1.locationiq.com/v1/reverse';
        this.LOCATIONIQ_API_KEY = 'pk.b5a1de84afc36de2fd38643ba63d3124';
        
        // DOM elements
        this.sessionTypeSelect = document.getElementById('session-type');
        this.attendanceTargetSelect = document.getElementById('attendance-target');
        this.targetLabel = document.getElementById('target-label');
        this.geoMessage = document.getElementById('geo-message');
        this.checkInButton = document.getElementById('check-in-button');
        this.geoAttendanceHistory = document.getElementById('geo-attendance-history');
        
        // Initialize offline sync
        this.offlineQueueKey = 'offline_checkins_queue';
        
        this.initializeElements();
    }
    
    initializeElements() {
        console.log('🔧 AttendanceModule elements:', {
            sessionTypeSelect: !!this.sessionTypeSelect,
            attendanceTargetSelect: !!this.attendanceTargetSelect,
            geoMessage: !!this.geoMessage,
            checkInButton: !!this.checkInButton,
            geoAttendanceHistory: !!this.geoAttendanceHistory
        });
        
        // Setup event listeners
        if (this.sessionTypeSelect) {
            this.sessionTypeSelect.addEventListener('change', () => {
                console.log('🔄 Session type changed to:', this.sessionTypeSelect.value);
                this.updateTargetSelect();
            });
        }
        
        if (this.checkInButton) {
            this.checkInButton.addEventListener('click', () => this.geoCheckIn());
        }
        
        // Listen for online/offline status changes
        window.addEventListener('online', () => this.syncOfflineCheckins());
        window.addEventListener('offline', () => this.showOfflineWarning());
    }
    
    // Initialize with user ID and profile
    initialize() {
        console.log('🚀 AttendanceModule.initialize() called');
        this.userId = this.getCurrentUserId();
        this.userProfile = this.getUserProfile();
        
        console.log('👤 Attendance user data:', {
            userId: this.userId,
            userProfile: this.userProfile ? 'Loaded' : 'Missing'
        });
        
        if (this.userId && this.userProfile) {
            console.log('✅ User data available, loading attendance data...');
            this.loadAttendanceData();
            this.syncOfflineCheckins(); // Sync any pending check-ins
        } else {
            console.error('❌ Missing user data for attendance');
            this.showLoginPrompt();
        }
    }
    
    // Get user ID from storage
    getCurrentUserId() {
        return localStorage.getItem('user_id') || 
               sessionStorage.getItem('user_id') || 
               'unknown_user_' + Date.now();
    }
    
    // Get user profile from storage
    getUserProfile() {
        try {
            const profile = localStorage.getItem('user_profile') || 
                           sessionStorage.getItem('user_profile');
            return profile ? JSON.parse(profile) : null;
        } catch (e) {
            console.error('❌ Error parsing user profile:', e);
            return null;
        }
    }
    
    // Get Supabase client
    getSupabaseClient() {
        if (window.supabaseClient) {
            return window.supabaseClient;
        }
        
        // Fallback mock client for testing
        console.warn('⚠️ Supabase client not found, using mock client');
        return {
            from: (table) => ({
                select: () => Promise.resolve({ data: [], error: null }),
                insert: (data) => Promise.resolve({ error: null }),
                rpc: (fn, params) => Promise.resolve({ error: null })
            })
        };
    }
    
    // Show login prompt
    showLoginPrompt() {
        if (this.geoMessage) {
            this.geoMessage.innerHTML = `
                <div class="error-message">
                    Please log in to use attendance features.
                    <button onclick="window.location.reload()" class="btn-small">
                        Refresh
                    </button>
                </div>
            `;
        }
    }
    
    // Show offline warning
    showOfflineWarning() {
        if (this.geoMessage) {
            const existing = this.geoMessage.innerHTML;
            if (!existing.includes('offline')) {
                this.geoMessage.innerHTML += `
                    <div class="offline-message" style="margin-top: 10px;">
                        ⚠️ You are offline. Check-ins will be queued.
                    </div>
                `;
            }
        }
    }
    
    // Load all attendance data
    async loadAttendanceData() {
        console.log('📥 Loading attendance data...');
        try {
            await Promise.all([
                this.loadClinicalTargets(),
                this.loadClassTargets()
            ]);
            
            // Update dropdown after data is loaded
            this.updateTargetSelect();
            
            // Load attendance history
            if (this.geoAttendanceHistory) {
                this.loadGeoAttendanceHistory();
            }
            
            console.log('✅ Attendance data loaded successfully');
        } catch (error) {
            console.error('❌ Error loading attendance data:', error);
            if (this.geoMessage) {
                this.geoMessage.innerHTML = `
                    <div class="error-message">
                        Failed to load attendance data. 
                        <button onclick="attendanceModule.loadAttendanceData()" class="btn-small">
                            Retry
                        </button>
                    </div>
                `;
            }
        }
    }
    
    // Load clinical targets
    async loadClinicalTargets() {
        console.log('🏥 Loading clinical targets...');
        
        if (!this.userProfile) {
            this.userProfile = this.getUserProfile();
        }
        
        const program = this.userProfile?.program || this.userProfile?.department;
        const intakeYear = this.userProfile?.intake_year;
        const blockTerm = this.userProfile?.block || null;
        
        console.log('🎯 Clinical query params:', { program, intakeYear, blockTerm });
        
        if (!program || !intakeYear) {
            console.warn('⚠️ Missing program or intake year for clinical targets');
            this.cachedClinicalAreas = [];
            return;
        }
        
        try {
            // Geo-based clinical areas
            const { data: areaData, error: areaError } = await this.getSupabaseClient()
                .from('clinical_areas')
                .select('id, name, latitude, longitude, block, program, intake_year')
                .ilike('program', program)
                .ilike('intake_year', intakeYear)
                .or(blockTerm ? `block.ilike.${blockTerm},block.is.null` : 'block.is.null');
            
            if (areaError) throw areaError;
            console.log(`✅ Loaded ${areaData?.length || 0} clinical areas`);
            
            // Textual clinical names including UUID + coordinates
            const { data: nameData, error: nameError } = await this.getSupabaseClient()
                .from('clinical_names')
                .select('id, uuid, clinical_area_name, latitude, longitude, program, intake_year, block_term')
                .ilike('program', program)
                .ilike('intake_year', intakeYear)
                .or(blockTerm ? `block_term.ilike.${blockTerm},block_term.is.null` : 'block_term.is.null');
            
            if (nameError) throw nameError;
            console.log(`✅ Loaded ${nameData?.length || 0} clinical names`);
            
            // Map textual names to use actual UUIDs + keep coordinates
            const mappedNames = (nameData || []).map(n => ({
                id: n.uuid || n.id,
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
            
            console.log(`✅ Total unique clinical areas: ${this.cachedClinicalAreas.length}`);
            
        } catch (error) {
            console.error("❌ Error loading clinical areas:", error);
            this.cachedClinicalAreas = [];
        }
    }
    
    // Load class targets
    async loadClassTargets() {
        console.log('🏫 Loading class targets...');
        
        if (!this.userProfile) {
            this.userProfile = this.getUserProfile();
        }
        
        const program = this.userProfile?.program || this.userProfile?.department;
        const intakeYear = this.userProfile?.intake_year;
        const block = this.userProfile?.block || null;
        
        console.log('🎯 Class query params:', { program, intakeYear, block });
        
        if (!program || !intakeYear) {
            console.warn('⚠️ Missing program or intake year for class targets');
            this.cachedCourses = [];
            return;
        }
        
        try {
            // Query the 'courses' table
            const { data, error } = await this.getSupabaseClient()
                .from('courses')
                .select('id, course_name, unit_code, block, latitude, longitude')
                .or(`target_program.eq.${program},target_program.eq.General`)
                .eq('intake_year', intakeYear)
                .or(block ? `block.eq.${block},block.is.null` : 'block.is.null')
                .order('course_name', { ascending: true });
            
            if (error) throw error;
            
            // Map data to expected format with validation
            this.cachedCourses = (data || []).map(course => {
                // Ensure coordinates exist
                const hasCoords = course.latitude && course.longitude;
                return {
                    id: course.id,
                    name: course.course_name || 'Unnamed Course',
                    code: course.unit_code || 'N/A',
                    latitude: hasCoords ? course.latitude : this.FALLBACK_LAT,
                    longitude: hasCoords ? course.longitude : this.FALLBACK_LON,
                    hasCoordinates: hasCoords
                };
            }).filter(course => course.name !== 'Unnamed Course'); // Filter out invalid courses
            
            console.log(`✅ Loaded ${this.cachedCourses.length} class targets from 'courses' table`);
            
            // Log details for debugging
            if (this.cachedCourses.length > 0) {
                console.log('📋 Courses found:');
                this.cachedCourses.forEach((course, i) => {
                    console.log(`   ${i + 1}. ${course.code}: ${course.name} ${course.hasCoordinates ? '(with coords)' : '(no coords)'}`);
                });
            }
            
        } catch (error) {
            console.error("❌ Error loading class targets:", error);
            this.cachedCourses = [];
        }
    }
    
    // Load attendance history
    async loadGeoAttendanceHistory() {
        if (!this.geoAttendanceHistory) return;
        
        console.log('📊 Loading attendance history...');
        this.geoAttendanceHistory.innerHTML = '<tr><td colspan="4" class="loading">Loading geo check-in history...</td></tr>';
        
        try {
            const { data: logs, error } = await this.getSupabaseClient()
                .from('geo_attendance_logs')
                .select('check_in_time, session_type, target_name, is_verified')
                .eq('student_id', this.userId)
                .order('check_in_time', { ascending: false })
                .limit(100);
            
            if (error) throw error;
            
            this.geoAttendanceHistory.innerHTML = '';
            
            // Check for offline queued check-ins
            const offlineQueue = this.getOfflineQueue();
            if (offlineQueue.length > 0 && (!logs || logs.length === 0)) {
                this.geoAttendanceHistory.innerHTML = `
                    <tr>
                        <td colspan="4" class="offline-queue">
                            📱 ${offlineQueue.length} check-in(s) queued offline
                            <button onclick="attendanceModule.syncOfflineCheckins()" class="btn-small">
                                Sync Now
                            </button>
                        </td>
                    </tr>
                `;
            }
            
            if (!logs || logs.length === 0) {
                console.log('📭 No attendance logs found');
                if (offlineQueue.length === 0) {
                    this.geoAttendanceHistory.innerHTML = '<tr><td colspan="4">No check-in logs found.</td></tr>';
                }
                return;
            }
            
            console.log(`✅ Loaded ${logs.length} attendance logs`);
            
            logs.forEach(log => {
                const timeStr = new Date(log.check_in_time).toLocaleString();
                const verifiedText = log.is_verified ? '✅ Verified' : '⏳ Pending verification';
                const verifiedClass = log.is_verified ? 'verified' : 'pending';
                
                const row = `
                    <tr>
                        <td>${timeStr}</td>
                        <td>${log.session_type}</td>
                        <td>${log.target_name}</td>
                        <td class="verification-status ${verifiedClass}">${verifiedText}</td>
                    </tr>
                `;
                this.geoAttendanceHistory.innerHTML += row;
            });
            
        } catch (error) {
            console.error("❌ Failed to load attendance history:", error);
            this.geoAttendanceHistory.innerHTML = `
                <tr>
                    <td colspan="4" class="error">
                        Error loading attendance logs: ${error.message}
                        <br>
                        <button onclick="attendanceModule.loadGeoAttendanceHistory()" class="btn-small">
                            Retry
                        </button>
                    </td>
                </tr>
            `;
        }
    }
    
    // Update target dropdown
    updateTargetSelect() {
        console.log('🔄 Updating target select dropdown');
        
        if (!this.sessionTypeSelect || !this.attendanceTargetSelect || !this.geoMessage) {
            console.warn('⚠️ Missing required elements for target select');
            return;
        }
        
        const sessionType = this.sessionTypeSelect.value;
        this.attendanceTargetSelect.innerHTML = '';
        
        let targetList = [];
        let label = 'Department/Course:';
        
        if (sessionType === 'Clinical') {
            targetList = this.cachedClinicalAreas.map(d => ({
                id: d.id,
                name: d.name,
                text: `${d.name} (Clinical)`,
                hasCoords: !!(d.latitude && d.longitude)
            }));
            label = 'Department/Area:';
            console.log(`🎯 Clinical targets available: ${targetList.length}`);
        } else if (sessionType === 'Class') {
            targetList = this.cachedCourses.map(c => ({
                id: c.id,
                name: c.name,
                code: c.code,
                text: `${c.code ? c.code + ' - ' : ''}${c.name} ${c.hasCoordinates ? '' : '⚠️'} (Class)`,
                hasCoords: c.hasCoordinates
            }));
            label = 'Course/Subject:';
            console.log(`🎯 Class targets available: ${targetList.length}`);
        }
        
        // Update label
        if (this.targetLabel) {
            this.targetLabel.textContent = label;
        }
        
        if (targetList.length === 0) {
            const message = sessionType === 'Class'
                ? 'No active courses found for your block.'
                : 'No clinical areas assigned to your block.';
            this.attendanceTargetSelect.innerHTML = `<option value="">${message}</option>`;
            console.log(`📭 ${message}`);
        } else {
            const defaultOption = document.createElement('option');
            defaultOption.value = '';
            defaultOption.textContent = `-- Select a ${label.replace(':', '')} --`;
            this.attendanceTargetSelect.appendChild(defaultOption);
            
            targetList.forEach(target => {
                const option = document.createElement('option');
                option.value = `${target.id}|${target.name}`;
                option.textContent = target.text;
                if (!target.hasCoords) {
                    option.style.color = '#f59e0b'; // Orange warning for no coordinates
                }
                this.attendanceTargetSelect.appendChild(option);
            });
            
            this.attendanceTargetSelect.selectedIndex = 0;
            console.log(`✅ Populated dropdown with ${targetList.length} options`);
        }
        
        if (this.geoMessage) {
            this.geoMessage.innerHTML = `Please select a specific <strong>${label.replace(':', '')}</strong> to check in.`;
        }
    }
    
    // Get device ID
    getDeviceId() {
        let deviceId = localStorage.getItem('device_id');
        if (!deviceId) {
            deviceId = 'device_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('device_id', deviceId);
            console.log('📱 Generated new device ID:', deviceId);
        } else {
            console.log('📱 Using existing device ID:', deviceId);
        }
        return deviceId;
    }
    
    // Get offline queue
    getOfflineQueue() {
        try {
            return JSON.parse(localStorage.getItem(this.offlineQueueKey) || '[]');
        } catch (e) {
            console.error('❌ Error reading offline queue:', e);
            return [];
        }
    }
    
    // Save to offline queue
    saveToOfflineQueue(checkInData) {
        try {
            const queue = this.getOfflineQueue();
            checkInData.queueId = 'offline_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            checkInData.queuedAt = new Date().toISOString();
            queue.push(checkInData);
            localStorage.setItem(this.offlineQueueKey, JSON.stringify(queue));
            console.log('📴 Saved to offline queue:', checkInData.queueId);
            return checkInData.queueId;
        } catch (e) {
            console.error('❌ Error saving to offline queue:', e);
            return null;
        }
    }
    
    // Remove from offline queue
    removeFromOfflineQueue(queueId) {
        try {
            const queue = this.getOfflineQueue();
            const newQueue = queue.filter(item => item.queueId !== queueId);
            localStorage.setItem(this.offlineQueueKey, JSON.stringify(newQueue));
            console.log('✅ Removed from offline queue:', queueId);
        } catch (e) {
            console.error('❌ Error removing from offline queue:', e);
        }
    }
    
    // Sync offline check-ins
    async syncOfflineCheckins() {
        if (!navigator.onLine) {
            console.log('📴 Still offline, cannot sync');
            return;
        }
        
        const queue = this.getOfflineQueue();
        if (queue.length === 0) {
            console.log('📭 No offline check-ins to sync');
            return;
        }
        
        console.log(`🔄 Syncing ${queue.length} offline check-in(s)...`);
        
        if (this.geoMessage) {
            this.geoMessage.innerHTML = `
                <div class="info-message">
                    🔄 Syncing ${queue.length} offline check-in(s)...
                </div>
            `;
        }
        
        let successCount = 0;
        let errorCount = 0;
        
        for (const checkInData of queue) {
            try {
                await this.submitCheckInDirect(checkInData);
                this.removeFromOfflineQueue(checkInData.queueId);
                successCount++;
                console.log(`✅ Synced offline check-in: ${checkInData.queueId}`);
            } catch (error) {
                errorCount++;
                console.error(`❌ Failed to sync offline check-in ${checkInData.queueId}:`, error);
            }
        }
        
        if (this.geoMessage) {
            this.geoMessage.innerHTML = `
                <div class="success-message">
                    ✅ Synced ${successCount} offline check-in(s)
                    ${errorCount > 0 ? `<br><small>${errorCount} failed to sync</small>` : ''}
                </div>
            `;
        }
        
        // Refresh history
        this.loadGeoAttendanceHistory();
    }
    
    // Get current location
    async getCurrentLocation() {
        console.log('📍 Getting current location...');
        
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                console.warn('⚠️ Geolocation not supported by browser');
                resolve({
                    lat: this.FALLBACK_LAT,
                    lon: this.FALLBACK_LON,
                    acc: this.FALLBACK_ACCURACY,
                    friendly: 'GPS unavailable in browser',
                    source: 'fallback'
                });
                return;
            }
            
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const location = {
                        lat: position.coords.latitude,
                        lon: position.coords.longitude,
                        acc: position.coords.accuracy,
                        friendly: null,
                        source: 'gps'
                    };
                    console.log('📍 GPS location obtained:', location);
                    resolve(location);
                },
                (error) => {
                    console.warn('⚠️ GPS error:', error.message);
                    resolve({
                        lat: this.FALLBACK_LAT,
                        lon: this.FALLBACK_LON,
                        acc: this.FALLBACK_ACCURACY,
                        friendly: `GPS denied: ${error.message}`,
                        source: 'fallback'
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
    async reverseGeocode(lat, lon) {
        console.log('🗺️ Reverse geocoding location...');
        
        try {
            const res = await fetch(
                `${this.LOCATIONIQ_API_URL}?key=${this.LOCATIONIQ_API_KEY}&lat=${lat}&lon=${lon}&format=json`
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
    calculateDistance(lat1, lon1, lat2, lon2) {
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
    
    // Submit check-in directly to table (fallback if RPC fails)
    async submitCheckInDirect(checkInData) {
        console.log('📤 Submitting check-in directly...');
        
        const { error } = await this.getSupabaseClient()
            .from('geo_attendance_logs')
            .insert({
                student_id: checkInData.p_student_id,
                check_in_time: checkInData.p_check_in_time,
                session_type: checkInData.p_session_type,
                target_id: checkInData.p_target_id,
                target_name: checkInData.p_target_name,
                latitude: checkInData.p_latitude,
                longitude: checkInData.p_longitude,
                accuracy_m: checkInData.p_accuracy_m,
                location_friendly_name: checkInData.p_location_friendly_name,
                program: checkInData.p_program,
                block: checkInData.p_block,
                intake_year: checkInData.p_intake_year,
                device_id: checkInData.p_device_id,
                is_verified: checkInData.p_is_verified,
                course_id: checkInData.p_course_id,
                student_name: checkInData.p_student_name
            });
        
        if (error) throw error;
        console.log('✅ Direct check-in successful');
    }
    
    // Geo check-in function
    async geoCheckIn() {
        console.log('📍 Starting geo check-in process...');
        
        if (this.checkInButton) this.checkInButton.disabled = true;
        if (this.geoMessage) {
            this.geoMessage.innerHTML = `
                <div class="info-message">
                    ⏱️ Initializing check-in...
                </div>
            `;
        }
        
        try {
            // Ensure user profile is loaded
            if (!this.userProfile) {
                this.userProfile = this.getUserProfile();
            }
            
            if (!this.userProfile) {
                throw new Error('Student profile not loaded');
            }
            
            const studentProgram = this.userProfile?.program || this.userProfile?.department || 'Unknown';
            const deviceId = this.getDeviceId();
            const sessionType = this.sessionTypeSelect?.value;
            const targetSelect = this.attendanceTargetSelect?.value;
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
            
            // Find target entry
            let targetEntry = sessionType === 'Clinical'
                ? this.cachedClinicalAreas.find(c => c.id === targetId)
                : this.cachedCourses.find(c => c.id === targetId);
                
            if (!targetEntry) {
                throw new Error('Selected target not found in cache');
            }
            
            if (!targetEntry.latitude || !targetEntry.longitude) {
                console.warn('⚠️ Target has no coordinates, using default location');
                targetEntry.latitude = this.FALLBACK_LAT;
                targetEntry.longitude = this.FALLBACK_LON;
            }
            
            // Get current location
            if (this.geoMessage) {
                this.geoMessage.innerHTML = `
                    <div class="info-message">
                        📍 Requesting location... (Please allow GPS access)
                    </div>
                `;
            }
            
            const location = await this.getCurrentLocation();
            
            // Reverse geocode for friendly name
            if (!location.friendly) {
                location.friendly = await this.reverseGeocode(location.lat, location.lon);
            }
            
            // Prepare data for database
            let dbTargetId = targetEntry.id;
            let targetNameToLog = targetEntry.name;
            let selectedCourseId = sessionType === 'Class' ? targetEntry.id : null;
            
            // Calculate distance and verify
            const distanceMeters = this.calculateDistance(
                location.lat, location.lon,
                targetEntry.latitude, targetEntry.longitude
            );
            
            const isVerified = distanceMeters <= this.MAX_DISTANCE_RADIUS;
            console.log(`✅ Verification: ${isVerified ? 'Within range' : 'Out of range'} (${distanceMeters.toFixed(2)}m)`);
            
            // Prepare check-in data
            const checkInData = {
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
                p_block: this.userProfile.block || null,
                p_intake_year: this.userProfile.intake_year || null,
                p_device_id: deviceId,
                p_is_verified: isVerified,
                p_course_id: selectedCourseId,
                p_student_name: this.userProfile.full_name || this.userProfile.name || 'Unknown Student'
            };
            
            // Check offline status
            if (!navigator.onLine) {
                console.log('📴 Offline mode - queueing check-in');
                const queueId = this.saveToOfflineQueue(checkInData);
                
                if (this.geoMessage) {
                    this.geoMessage.innerHTML = `
                        <div class="offline-message">
                            ✅ Check-in saved offline (ID: ${queueId}). Will sync when back online.
                            <br><small>Distance: ${distanceMeters.toFixed(2)}m from target</small>
                        </div>
                    `;
                }
                
                // Refresh history to show queued item
                this.loadGeoAttendanceHistory();
                return;
            }
            
            // Submit check-in
            if (this.geoMessage) {
                this.geoMessage.innerHTML = `
                    <div class="info-message">
                        📡 Submitting check-in...
                    </div>
                `;
            }
            
            // Try RPC first
            try {
                const { error } = await this.getSupabaseClient()
                    .rpc('check_in_and_defer_fk', checkInData);
                
                if (error) throw error;
                
            } catch (rpcError) {
                console.warn('⚠️ RPC failed, trying direct insert:', rpcError);
                await this.submitCheckInDirect(checkInData);
            }
            
            // Success
            console.log('✅ Check-in successful!');
            if (this.geoMessage) {
                this.geoMessage.innerHTML = `
                    <div class="success-message">
                        ✅ Check-in complete! ${isVerified ? 'Verified successfully' : 'Pending verification'}
                        <br><small>Distance: ${distanceMeters.toFixed(2)}m from target</small>
                        <br><small>Location: ${location.source === 'gps' ? 'GPS' : 'Fallback'}</small>
                    </div>
                `;
            }
            
            // Refresh attendance history
            this.loadGeoAttendanceHistory();
            
        } catch (error) {
            console.error('❌ Geo check-in error:', error);
            if (this.geoMessage) {
                this.geoMessage.innerHTML = `
                    <div class="error-message">
                        🚫 ${error.message}
                        <br>
                        <button onclick="attendanceModule.geoCheckIn()" class="btn-small">
                            Try Again
                        </button>
                    </div>
                `;
            }
        } finally {
            if (this.checkInButton) {
                this.checkInButton.disabled = false;
            }
            console.log('🏁 Geo check-in process completed');
        }
    }
    
    // Update user profile
    updateUserProfile(userProfile) {
        console.log('👤 Updating user profile in AttendanceModule');
        this.userProfile = userProfile;
        // Save to storage
        try {
            localStorage.setItem('user_profile', JSON.stringify(userProfile));
            if (userProfile.id) {
                localStorage.setItem('user_id', userProfile.id);
            }
        } catch (e) {
            console.error('❌ Error saving user profile:', e);
        }
    }
    
    // Reload all attendance data
    async reloadAttendanceData() {
        console.log('🔄 Reloading all attendance data...');
        await this.loadAttendanceData();
    }
}

// Create global instance
let attendanceModule = null;

// Initialize attendance module
function initAttendanceModule() {
    console.log('🚀 initAttendanceModule() called');
    try {
        attendanceModule = new AttendanceModule();
        attendanceModule.initialize();
        console.log('✅ AttendanceModule initialized successfully');
        return attendanceModule;
    } catch (error) {
        console.error('❌ Failed to initialize AttendanceModule:', error);
        return null;
    }
}

// Auto-initialize when page loads
function autoInitializeAttendance() {
    console.log('🔄 Auto-initializing attendance module...');
    
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeWhenReady);
    } else {
        initializeWhenReady();
    }
}

function initializeWhenReady() {
    console.log('📱 DOM ready, checking for attendance elements...');
    
    // Check if attendance elements exist on this page
    const hasAttendanceElements = 
        document.getElementById('session-type') && 
        document.getElementById('attendance-target');
    
    if (hasAttendanceElements) {
        console.log('✅ Attendance elements found, initializing module...');
        
        // Wait a bit more to ensure all dependencies are loaded
        setTimeout(() => {
            if (typeof initAttendanceModule === 'function') {
                initAttendanceModule();
                console.log('✅ Attendance module auto-initialized');
            } else {
                console.warn('⚠️ initAttendanceModule not available yet');
                // Try again in 1 second
                setTimeout(() => {
                    if (typeof initAttendanceModule === 'function') {
                        initAttendanceModule();
                    }
                }, 1000);
            }
        }, 500);
    } else {
        console.log('📭 No attendance elements on this page');
    }
}

// Initialize if user navigates to attendance tab
function initializeAttendanceIfNeeded() {
    if (document.getElementById('session-type') && !attendanceModule) {
        console.log('📍 Attendance tab opened, initializing...');
        if (typeof initAttendanceModule === 'function') {
            initAttendanceModule();
        }
    }
}

// Global functions
function loadAttendanceData() {
    if (attendanceModule) {
        attendanceModule.loadAttendanceData();
    } else {
        console.warn('⚠️ attendanceModule not initialized');
        initAttendanceModule();
    }
}

function geoCheckIn() {
    if (attendanceModule) {
        attendanceModule.geoCheckIn();
    } else {
        console.error('❌ attendanceModule not initialized');
        alert('Please wait for attendance module to initialize');
    }
}

function loadGeoAttendanceHistory() {
    if (attendanceModule) {
        attendanceModule.loadGeoAttendanceHistory();
    }
}

function updateTargetSelect() {
    if (attendanceModule) {
        attendanceModule.updateTargetSelect();
    }
}

function syncOfflineCheckins() {
    if (attendanceModule) {
        attendanceModule.syncOfflineCheckins();
    }
}

// Auto-initialize on page load
autoInitializeAttendance();

// Make functions globally available
window.AttendanceModule = AttendanceModule;
window.initAttendanceModule = initAttendanceModule;
window.loadAttendanceData = loadAttendanceData;
window.geoCheckIn = geoCheckIn;
window.loadGeoAttendanceHistory = loadGeoAttendanceHistory;
window.updateTargetSelect = updateTargetSelect;
window.syncOfflineCheckins = syncOfflineCheckins;
window.initializeAttendanceIfNeeded = initializeAttendanceIfNeeded;
window.attendanceModule = null; // Will be set after init

// Add CSS styles
const attendanceStyles = document.createElement('style');
attendanceStyles.textContent = `
    .info-message, .success-message, .error-message, .offline-message {
        padding: 12px;
        border-radius: 6px;
        margin: 10px 0;
        display: block;
        font-size: 14px;
        line-height: 1.4;
    }
    
    .info-message { 
        background: #dbeafe; 
        color: #1e40af;
        border-left: 4px solid #3b82f6;
    }
    
    .success-message { 
        background: #d1fae5; 
        color: #065f46;
        border-left: 4px solid #10b981;
    }
    
    .error-message { 
        background: #fee2e2; 
        color: #991b1b;
        border-left: 4px solid #ef4444;
    }
    
    .offline-message { 
        background: #fef3c7; 
        color: #92400e;
        border-left: 4px solid #f59e0b;
    }
    
    .verification-status.verified { 
        color: #10b981; 
        font-weight: 600; 
    }
    
    .verification-status.pending { 
        color: #f59e0b; 
        font-weight: 600; 
    }
    
    .btn-small {
        padding: 6px 12px;
        font-size: 12px;
        background: #3b82f6;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        margin: 5px 5px 0 0;
        display: inline-block;
        transition: background 0.2s;
    }
    
    .btn-small:hover {
        background: #2563eb;
    }
    
    .btn-small:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
    
    .loading, .error, .offline-queue {
        padding: 10px;
        text-align: center;
        color: #666;
    }
    
    .error {
        color: #ef4444;
    }
    
    .offline-queue {
        color: #f59e0b;
    }
    
    #check-in-button:disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }
    
    select option[style*="color: #f59e0b"] {
        color: #f59e0b !important;
        font-weight: 500;
    }
    
    select:focus {
        outline: 2px solid #3b82f6;
        outline-offset: 2px;
    }
    
    table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 10px;
    }
    
    th, td {
        padding: 10px;
        text-align: left;
        border-bottom: 1px solid #e5e7eb;
    }
    
    th {
        background: #f9fafb;
        font-weight: 600;
    }
    
    tr:hover {
        background: #f9fafb;
    }
`;
document.head.appendChild(attendanceStyles);

console.log('🏁 Attendance module loaded with auto-initialization');
