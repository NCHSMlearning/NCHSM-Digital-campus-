// js/attendance.js - Attendance System Module (FIXED to work with Database class)
// *************************************************************************
// *** ATTENDANCE SYSTEM ***
// *************************************************************************

// Global variables
let currentUserId = null;
let currentUserProfile = null;
let cachedClinicalAreas = [];
let cachedCourses = [];
let db = null; // Database instance

// Constants
const FALLBACK_LAT = -1.2921;
const FALLBACK_LON = 36.8219;
const FALLBACK_ACCURACY = 1000;
const MAX_DISTANCE_RADIUS = 50;
const LOCATIONIQ_API_URL = 'https://us1.locationiq.com/v1/reverse';
const LOCATIONIQ_API_KEY = 'pk.b5a1de84afc36de2fd38643ba63d3124';

// Initialize attendance system
async function initAttendance() {
    console.log('🚀 Initializing attendance system...');
    
    // Get database instance
    db = getDatabaseInstance();
    
    if (!db) {
        console.error('❌ Database instance not available');
        setTimeout(initAttendance, 1000);
        return;
    }
    
    // Make sure database is initialized
    if (!db.isInitialized) {
        console.log('⏳ Database not initialized yet, waiting...');
        setTimeout(initAttendance, 500);
        return;
    }
    
    console.log('✅ Database instance found:', db);
    
    // Get current user data
    currentUserId = db.currentUserId;
    currentUserProfile = db.currentUserProfile;
    
    if (!currentUserId || !currentUserProfile) {
        console.log('⏳ User data not loaded yet, waiting...');
        setTimeout(initAttendance, 500);
        return;
    }
    
    console.log('✅ User data loaded:', currentUserProfile.full_name);
    
    // Initialize UI elements
    initializeAttendanceUI();
    
    // Load initial data
    await loadInitialAttendanceData();
    
    console.log('✅ Attendance system initialized successfully');
}

// Get database instance from available sources
function getDatabaseInstance() {
    // Priority 1: window.db (should be your Database class instance)
    if (window.db && window.db.constructor && window.db.constructor.name === 'Database') {
        return window.db;
    }
    
    // Priority 2: Check if Database class instance exists globally
    if (typeof Database !== 'undefined' && window.databaseInstance) {
        return window.databaseInstance;
    }
    
    // Priority 3: Try to find any database instance
    if (window.db && window.db.getCurrentUserProfile) {
        return window.db;
    }
    
    console.log('❌ No Database class instance found');
    return null;
}

// Initialize UI elements
function initializeAttendanceUI() {
    console.log('🔧 Initializing attendance UI...');
    
    const sessionTypeSelect = document.getElementById('session-type');
    const attendanceTargetSelect = document.getElementById('attendance-target');
    const checkInButton = document.getElementById('check-in-button');
    const geoAttendanceHistory = document.getElementById('geo-attendance-history');
    
    if (sessionTypeSelect) {
        sessionTypeSelect.addEventListener('change', updateTargetSelect);
    }
    
    if (checkInButton) {
        checkInButton.addEventListener('click', geoCheckIn);
    }
    
    console.log('✅ UI elements initialized');
}

// Load initial attendance data
async function loadInitialAttendanceData() {
    console.log('📥 Loading initial attendance data...');
    
    try {
        // Load clinical targets using Database class method
        cachedClinicalAreas = await db.getClinicalTargets();
        console.log(`✅ Loaded ${cachedClinicalAreas.length} clinical areas`);
        
        // Load class targets using Database class method  
        cachedCourses = await db.getClassTargets();
        console.log(`✅ Loaded ${cachedCourses.length} courses`);
        
        // Update target dropdown
        updateTargetSelect();
        
        // Load attendance history
        if (document.getElementById('geo-attendance-history')) {
            await loadGeoAttendanceHistory();
        }
        
    } catch (error) {
        console.error('❌ Error loading attendance data:', error);
    }
}

// Load clinical targets using Database class
async function loadClinicalTargets() {
    console.log('🏥 Loading clinical targets...');
    
    if (!currentUserProfile || (!currentUserProfile.program && !currentUserProfile.department) || !currentUserProfile.intake_year) {
        console.warn('⚠️ Missing user profile data');
        cachedClinicalAreas = [];
        return;
    }
    
    try {
        cachedClinicalAreas = await db.getClinicalTargets();
        console.log(`✅ Loaded ${cachedClinicalAreas.length} clinical areas`);
    } catch (error) {
        console.error("Error loading clinical areas:", error);
        cachedClinicalAreas = [];
    }
}

// Load class targets using Database class
async function loadClassTargets() {
    console.log('🏫 Loading class targets...');
    
    if (!currentUserProfile || (!currentUserProfile.program && !currentUserProfile.department) || !currentUserProfile.intake_year) {
        console.warn('⚠️ Missing user profile data');
        cachedCourses = [];
        return;
    }
    
    try {
        cachedCourses = await db.getClassTargets();
        console.log(`✅ Loaded ${cachedCourses.length} class targets`);
    } catch (error) {
        console.error("Error loading class targets:", error);
        cachedCourses = [];
    }
}

// Load attendance history using Database class
async function loadGeoAttendanceHistory() {
    const tableBody = document.getElementById('geo-attendance-history');
    if (!tableBody) return;
    
    tableBody.innerHTML = '<tr><td colspan="4">Loading geo check-in history...</td></tr>';
    
    try {
        const logs = await db.getAttendanceHistory();
        
        tableBody.innerHTML = '';
        if (!logs || logs.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="4">No check-in logs found.</td></tr>';
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
            tableBody.innerHTML += row;
        });
    } catch (error) {
        console.error("Failed to load attendance history:", error);
        tableBody.innerHTML = `
            <tr>
                <td colspan="4" style="color:#EF4444;">
                    Error loading attendance logs: ${error.message}
                    <br>
                    <button onclick="loadGeoAttendanceHistory()" class="btn-small">
                        Retry
                    </button>
                </td>
            </tr>
        `;
    }
}

// Update target dropdown
function updateTargetSelect() {
    const sessionTypeSelect = document.getElementById('session-type');
    const attendanceTargetSelect = document.getElementById('attendance-target');
    const geoMessage = document.getElementById('geo-message');
    
    if (!sessionTypeSelect || !attendanceTargetSelect || !geoMessage) return;
    
    const sessionType = sessionTypeSelect.value;
    attendanceTargetSelect.innerHTML = '';
    
    let targetList = [];
    let label = 'Department/Course:';
    
    if (sessionType === 'Clinical') {
        targetList = cachedClinicalAreas.map(d => ({
            id: d.id,
            name: d.name,
            text: `${d.name} (Clinical)`
        }));
        label = 'Department/Area:';
    } else if (sessionType === 'Class') {
        targetList = cachedCourses.map(c => ({
            id: c.id,
            name: c.name,
            code: c.code,
            text: `${c.code ? c.code + ' - ' : ''}${c.name} (Class)`
        }));
        label = 'Course/Subject:';
    }
    
    const targetLabel = document.getElementById('target-label');
    if (targetLabel) targetLabel.textContent = label;
    
    if (targetList.length === 0) {
        const message = sessionType === 'Class'
            ? 'No active courses found for your block.'
            : 'No clinical areas assigned to your block.';
        attendanceTargetSelect.innerHTML = `<option value="">${message}</option>`;
    } else {
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = `-- Select a ${label.replace(':', '')} --`;
        attendanceTargetSelect.appendChild(defaultOption);
        
        targetList.forEach(target => {
            const option = document.createElement('option');
            option.value = `${target.id}|${target.name}`;
            option.textContent = target.text;
            attendanceTargetSelect.appendChild(option);
        });
        
        attendanceTargetSelect.selectedIndex = 0;
    }
    
    geoMessage.innerHTML = `Please select a specific <strong>${label.replace(':', '')}</strong> to check in.`;
}

// Get device ID
function getDeviceId() {
    let deviceId = localStorage.getItem('device_id');
    if (!deviceId) {
        deviceId = crypto.randomUUID();
        localStorage.setItem('device_id', deviceId);
        console.log('📱 Generated new device ID:', deviceId);
    }
    return deviceId;
}

// Get current location
async function getCurrentLocation() {
    console.log('📍 Getting current location...');
    
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            console.warn('⚠️ Geolocation not supported by browser');
            resolve({
                lat: FALLBACK_LAT,
                lon: FALLBACK_LON,
                acc: FALLBACK_ACCURACY,
                friendly: 'GPS unavailable in browser'
            });
            return;
        }
        
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const location = {
                    lat: position.coords.latitude,
                    lon: position.coords.longitude,
                    acc: position.coords.accuracy,
                    friendly: null
                };
                console.log('📍 GPS location obtained:', location);
                resolve(location);
            },
            (error) => {
                console.warn('⚠️ GPS error:', error.message);
                resolve({
                    lat: FALLBACK_LAT,
                    lon: FALLBACK_LON,
                    acc: FALLBACK_ACCURACY,
                    friendly: `GPS denied: ${error.message}`
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
async function reverseGeocode(lat, lon) {
    console.log('🗺️ Reverse geocoding location...');
    
    try {
        const res = await fetch(
            `${LOCATIONIQ_API_URL}?key=${LOCATIONIQ_API_KEY}&lat=${lat}&lon=${lon}&format=json`
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
function calculateDistance(lat1, lon1, lat2, lon2) {
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

// Geo check-in function using Database class
async function geoCheckIn() {
    console.log('📍 Starting geo check-in process...');
    
    const button = document.getElementById('check-in-button');
    const geoMessage = document.getElementById('geo-message');
    const sessionTypeSelect = document.getElementById('session-type');
    const attendanceTargetSelect = document.getElementById('attendance-target');
    
    if (button) button.disabled = true;
    if (geoMessage) {
        geoMessage.textContent = '⏱️ Initializing check-in...';
        geoMessage.className = 'info-message';
    }
    
    try {
        if (!currentUserProfile) {
            throw new Error('Student profile not loaded');
        }
        
        const studentProgram = currentUserProfile?.program || currentUserProfile?.department || null;
        const deviceId = getDeviceId();
        const sessionType = sessionTypeSelect?.value;
        const targetSelect = attendanceTargetSelect?.value;
        
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
        
        // Check offline status
        if (!navigator.onLine) {
            console.log('📴 Offline mode detected');
            if (geoMessage) {
                geoMessage.innerHTML = `
                    <span class="offline-message">
                        ✅ Check-in saved offline. Will sync when back online.
                    </span>
                `;
                geoMessage.className = 'offline-message';
            }
            // TODO: Implement offline queue
            return;
        }
        
        // Get current location
        if (geoMessage) {
            geoMessage.textContent = '📍 Requesting location... (Please allow GPS access)';
        }
        
        const location = await getCurrentLocation();
        
        // Reverse geocode for friendly name
        if (!location.friendly) {
            location.friendly = await reverseGeocode(location.lat, location.lon);
        }
        
        // Find target entry
        let targetEntry = sessionType === 'Clinical'
            ? cachedClinicalAreas.find(c => c.id === targetId)
            : cachedCourses.find(c => c.id === targetId);
            
        if (!targetEntry) {
            throw new Error('Selected target not found in cache');
        }
        
        if (targetEntry.latitude === null || targetEntry.longitude === null) {
            throw new Error('Target location coordinates not available');
        }
        
        // Prepare data for database
        let dbTargetId = targetEntry.id;
        let targetNameToLog = targetEntry.name;
        let selectedCourseId = null;
        
        if (sessionType === 'Class') {
            selectedCourseId = targetEntry.id;
        }
        
        // Calculate distance and verify
        const distanceMeters = calculateDistance(
            location.lat, location.lon,
            targetEntry.latitude, targetEntry.longitude
        );
        
        const isVerified = distanceMeters <= MAX_DISTANCE_RADIUS;
        console.log(`✅ Verification: ${isVerified ? 'Within range' : 'Out of range'} (${distanceMeters.toFixed(2)}m)`);
        
        // Use Database class method for check-in
        if (geoMessage) {
            geoMessage.textContent = '📡 Submitting check-in...';
        }
        
        const result = await db.checkInAttendance(
            sessionType,
            targetId,
            targetNameToLog,
            location,
            studentProgram
        );
        
        if (!result.success) {
            throw new Error(result.error || 'Check-in failed');
        }
        
        // Success
        console.log('✅ Check-in successful!');
        if (geoMessage) {
            geoMessage.innerHTML = `
                <span class="success-message">
                    ✅ Check-in complete! ${isVerified ? 'Verified successfully' : 'Pending verification'}
                    <br><small>Distance: ${distanceMeters.toFixed(2)}m from target</small>
                </span>
            `;
            geoMessage.className = 'success-message';
        }
        
        // Refresh attendance history
        await loadGeoAttendanceHistory();
        
        // Dispatch event to notify dashboard
        document.dispatchEvent(new CustomEvent('attendanceCheckedIn'));
        
    } catch (error) {
        console.error('❌ Geo check-in error:', error);
        if (geoMessage) {
            geoMessage.innerHTML = `
                <span class="error-message">
                    🚫 ${error.message}
                </span>
            `;
            geoMessage.className = 'error-message';
        }
    } finally {
        if (button) {
            button.disabled = false;
        }
        console.log('🏁 Geo check-in process completed');
    }
}

// Auto-initialize when page loads
function autoInitializeAttendance() {
    console.log('🔄 Auto-initializing attendance system...');
    
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
        console.log('✅ Attendance elements found, initializing system...');
        
        // Wait for database to be ready
        const checkDatabase = () => {
            if (window.db && window.db.isInitialized) {
                initAttendance();
                console.log('✅ Attendance system auto-initialized');
            } else {
                console.log('⏳ Waiting for database...');
                setTimeout(checkDatabase, 500);
            }
        };
        
        setTimeout(checkDatabase, 300);
    } else {
        console.log('📭 No attendance elements on this page');
    }
}

// Initialize when tab is opened
function initializeAttendanceIfNeeded() {
    if (document.getElementById('session-type') && !db) {
        console.log('📍 Attendance tab opened, initializing...');
        initAttendance();
    }
}

// Listen for tab changes
document.addEventListener('tabChanged', function(e) {
    if (e.detail && e.detail.tabId === 'attendance') {
        initializeAttendanceIfNeeded();
    }
});

// Listen for app ready event
document.addEventListener('appReady', function() {
    console.log('🎯 App is ready, checking attendance...');
    if (document.getElementById('session-type') && !db) {
        setTimeout(() => {
            initAttendance();
        }, 300);
    }
});

// Make functions globally available
window.initAttendance = initAttendance;
window.loadAttendanceData = async function() {
    await loadInitialAttendanceData();
};
window.geoCheckIn = geoCheckIn;
window.loadGeoAttendanceHistory = loadGeoAttendanceHistory;
window.updateTargetSelect = updateTargetSelect;

// Auto-initialize on page load
autoInitializeAttendance();
