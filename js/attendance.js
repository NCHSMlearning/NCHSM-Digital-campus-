// COMPLETE FIX - Replace your entire enhanced-attendance.js with this
(function() {
    'use strict';
    
    console.log('✅ COMPLETELY FIXED ATTENDANCE SYSTEM');
    // ============================================
// PERMANENT FIX FOR DROPDOWN AND SELECTED TARGET
// ============================================

// Ensure window.selectedTarget is defined
window.selectedTarget = null;

// Fix the dropdown initialization
function fixDropdown() {
    const targetSelect = document.getElementById('attendance-target');
    if (!targetSelect) return;
    
    // Remove disabled attribute
    targetSelect.disabled = false;
    
    // Remove all existing event listeners by cloning
    const newSelect = targetSelect.cloneNode(true);
    targetSelect.parentNode.replaceChild(newSelect, targetSelect);
    
    // Add proper change event listener
    newSelect.addEventListener('change', function() {
        if (this.value && this.value !== '') {
            const parts = this.value.split('|');
            if (parts.length >= 6) {
                window.selectedTarget = {
                    id: parts[0],
                    name: parts[1],
                    latitude: parseFloat(parts[3]),
                    longitude: parseFloat(parts[4]),
                    radius: parseFloat(parts[5])
                };
                console.log('✅ Course selected:', window.selectedTarget.name);
                
                // Enable check-in button
                const checkBtn = document.getElementById('check-in-button');
                if (checkBtn) {
                    checkBtn.disabled = false;
                }
            }
        } else {
            window.selectedTarget = null;
            const checkBtn = document.getElementById('check-in-button');
            if (checkBtn) {
                checkBtn.disabled = true;
            }
        }
    });
    
    console.log('✅ Dropdown fixed permanently');
}

// Run fix when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fixDropdown);
} else {
    fixDropdown();
}
    // ============================================
    // CONFIGURATION
    // ============================================
    
    const VERIFIED_DISTANCE = 50;
    const PENDING_DISTANCE = 200;
    
    const CAMPUS_COORDINATES = {
        latitude: -0.2714611,
        longitude: 36.0519956
    };
    
    let approvedUnits = [];
    let currentLocation = null;
    let selectedTarget = null;
    let locationWatchId = null;
    let attendanceUserId = null;
    let attendanceUserProfile = null;
    
    // ============================================
    // GET STUDENT ID
    // ============================================
    
    function getCurrentStudentId() {
        if (window.db?.currentUserProfile?.user_id) return window.db.currentUserProfile.user_id;
        if (window.db?.currentUserId) return window.db.currentUserId;
        try {
            const profile = localStorage.getItem('userProfile');
            if (profile) return JSON.parse(profile).user_id;
        } catch(e) {}
        return '7f7a8296-fa13-4660-b8a6-d092351ebdf6'; // Fallback
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
    // LOAD APPROVED UNITS
    // ============================================
    
    async function loadApprovedUnits() {
        try {
            const supabase = window.db?.supabase;
            const studentId = getCurrentStudentId();
            if (!supabase || !studentId) return [];
            
            const { data, error } = await supabase
                .from('student_unit_registrations')
                .select('*')
                .eq('student_id', studentId)
                .eq('status', 'approved')
                .order('unit_code');
            
            if (error || !data) return [];
            
            approvedUnits = data.map(u => ({
                id: u.id,
                unit_code: u.unit_code,
                unit_name: u.unit_name,
                block: u.block
            }));
            
            console.log(`✅ Loaded ${approvedUnits.length} units`);
            return approvedUnits;
        } catch(e) {
            console.error('Error loading units:', e);
            return [];
        }
    }
    
    // ============================================
    // FIXED LOCATION DETECTION - NO CACHING!
    // ============================================
    
    function getRealLocation() {
        console.log('📍 Getting REAL GPS location...');
        
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('Geolocation not supported'));
                return;
            }
            
            // CRITICAL: Use maximumAge: 0 to force fresh location
            const options = {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0  // THIS IS KEY - forces fresh GPS, no cache
            };
            
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const lat = position.coords.latitude;
                    const lon = position.coords.longitude;
                    const acc = position.coords.accuracy;
                    
                    console.log(`✅ REAL GPS: ${lat}, ${lon} (±${acc}m)`);
                    
                    // Calculate distance to campus
                    const distance = calculateDistance(lat, lon, CAMPUS_COORDINATES.latitude, CAMPUS_COORDINATES.longitude);
                    console.log(`📏 Distance to campus: ${distance.toFixed(0)}m`);
                    
                    resolve({
                        latitude: lat,
                        longitude: lon,
                        accuracy: acc,
                        distance: distance
                    });
                },
                (error) => {
                    console.error('GPS Error:', error.message);
                    reject(error);
                },
                options
            );
        });
    }
    
    // ============================================
    // POPULATE DROPDOWN
    // ============================================
    
    async function populateTargetOptions(sessionType) {
        const targetSelect = document.getElementById('attendance-target');
        if (!targetSelect || sessionType !== 'class') return;
        
        if (approvedUnits.length === 0) await loadApprovedUnits();
        
        if (approvedUnits.length === 0) {
            targetSelect.innerHTML = '<option value="">⚠️ No approved units</option>';
            return;
        }
        
        targetSelect.innerHTML = '<option value="">📚 Select course...</option>';
        approvedUnits.forEach(unit => {
            const opt = document.createElement('option');
            opt.value = `unit_${unit.id}|${unit.unit_code} - ${unit.unit_name}|class|${CAMPUS_COORDINATES.latitude}|${CAMPUS_COORDINATES.longitude}|50`;
            opt.textContent = `${unit.unit_code} - ${unit.unit_name}`;
            targetSelect.appendChild(opt);
        });
        
        targetSelect.addEventListener('change', () => {
            if (targetSelect.value) {
                const parts = targetSelect.value.split('|');
                selectedTarget = {
                    id: parts[0],
                    name: parts[1],
                    latitude: parseFloat(parts[3]),
                    longitude: parseFloat(parts[4])
                };
                updateDistanceDisplay();
            }
        });
    }
    
    function updateDistanceDisplay() {
        const distanceDiv = document.getElementById('distance-status');
        if (!distanceDiv || !currentLocation || !selectedTarget) return;
        
        const distance = calculateDistance(
            currentLocation.latitude, currentLocation.longitude,
            selectedTarget.latitude, selectedTarget.longitude
        );
        
        let status, color, bg;
        if (distance <= 50) {
            status = '✅ PRESENT (Auto-Verified)';
            color = '#10b981';
            bg = '#d1fae5';
        } else if (distance <= 200) {
            status = '⚠️ PENDING (Review Required)';
            color = '#f59e0b';
            bg = '#fed7aa';
        } else {
            status = '❌ ABSENT (Too Far)';
            color = '#ef4444';
            bg = '#fee2e2';
        }
        
        distanceDiv.innerHTML = `
            <div style="background: ${bg}; border-left: 4px solid ${color}; padding: 15px; border-radius: 8px;">
                <strong style="color: ${color};">${status}</strong><br>
                Distance: ${distance >= 1000 ? (distance/1000).toFixed(2) + ' km' : distance.toFixed(0) + ' m'}
            </div>
        `;
        distanceDiv.style.display = 'block';
    }
    
    // ============================================
    // CHECK-IN FUNCTION
    // ============================================
    
    async function doCheckIn() {
        const btn = document.getElementById('check-in-button');
        const targetSelect = document.getElementById('attendance-target');
        
        if (!selectedTarget && targetSelect?.value) {
            const parts = targetSelect.value.split('|');
            if (parts.length >= 6) {
                selectedTarget = {
                    id: parts[0],
                    name: parts[1],
                    latitude: parseFloat(parts[3]),
                    longitude: parseFloat(parts[4])
                };
            }
        }
        
        if (!selectedTarget) {
            alert('Please select a course');
            return;
        }
        
        // Get REAL location every time (no caching!)
        btn.disabled = true;
        btn.innerHTML = '📍 Getting GPS...';
        
        try {
            const location = await getRealLocation();
            currentLocation = location;
            
            // Update display
            document.getElementById('latitude').textContent = location.latitude.toFixed(6);
            document.getElementById('longitude').textContent = location.longitude.toFixed(6);
            document.getElementById('accuracy-value').textContent = location.accuracy.toFixed(1);
            
            const distance = calculateDistance(
                location.latitude, location.longitude,
                selectedTarget.latitude, selectedTarget.longitude
            );
            
            let status = distance <= 50 ? 'Present' : (distance <= 200 ? 'Pending' : 'Absent');
            
            const confirmed = confirm(
                `📍 CHECK-IN CONFIRMATION\n\n` +
                `Course: ${selectedTarget.name}\n` +
                `Your GPS: ${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}\n` +
                `Accuracy: ±${location.accuracy.toFixed(0)}m\n` +
                `Distance to campus: ${distance >= 1000 ? (distance/1000).toFixed(2) + ' km' : distance.toFixed(0) + ' m'}\n` +
                `Status: ${status}\n\n` +
                `Proceed?`
            );
            
            if (!confirmed) {
                btn.disabled = false;
                btn.innerHTML = '📍 Check In Now';
                return;
            }
            
            btn.innerHTML = '💾 Saving...';
            
            const supabase = window.db?.supabase;
            const studentId = getCurrentStudentId();
            
            const { error } = await supabase.from('geo_attendance_logs').insert([{
                student_id: studentId,
                check_in_time: new Date().toISOString(),
                session_type: 'class',
                target_id: selectedTarget.id,
                target_name: selectedTarget.name,
                latitude: location.latitude,
                longitude: location.longitude,
                accuracy_m: location.accuracy,
                distance_meters: distance,
                is_verified: status === 'Present',
                attendance_status: status,
                target_latitude: selectedTarget.latitude,
                target_longitude: selectedTarget.longitude,
                unit_code: selectedTarget.name.split(' - ')[0]
            }]);
            
            if (error) throw error;
            
            alert(`✅ Check-in successful!\nStatus: ${status}\nDistance: ${distance >= 1000 ? (distance/1000).toFixed(2) + ' km' : distance.toFixed(0) + ' m'}`);
            location.reload();
            
        } catch(error) {
            console.error('Check-in error:', error);
            alert('GPS failed. Please ensure location is enabled and try again.\n\nOn iPhone: Settings → Privacy → Location Services → ON\nOn Android: Settings → Location → ON');
        } finally {
            btn.disabled = false;
            btn.innerHTML = '📍 Check In Now';
        }
    }
    
    // ============================================
    // INITIALIZATION
    // ============================================
    
    async function init() {
        console.log('🚀 Initializing...');
        
        attendanceUserProfile = window.db?.currentUserProfile;
        attendanceUserId = getCurrentStudentId();
        
        await loadApprovedUnits();
        
        const sessionType = document.getElementById('session-type');
        if (sessionType) {
            sessionType.addEventListener('change', () => {
                if (sessionType.value === 'class') {
                    document.getElementById('target-control-group').style.display = 'flex';
                    populateTargetOptions('class');
                }
            });
        }
        
        const checkBtn = document.getElementById('check-in-button');
        if (checkBtn) {
            checkBtn.onclick = (e) => {
                e.preventDefault();
                doCheckIn();
            };
        }
        
        // Load history
        await loadHistory();
        
        console.log('✅ Ready! Click "Check In Now" to get your REAL GPS location');
    }
    
    async function loadHistory() {
        const table = document.getElementById('geo-attendance-history');
        if (!table) return;
        
        const supabase = window.db?.supabase;
        const studentId = getCurrentStudentId();
        
        const { data } = await supabase
            .from('geo_attendance_logs')
            .select('*')
            .eq('student_id', studentId)
            .order('check_in_time', { ascending: false })
            .limit(20);
        
        if (!data || data.length === 0) {
            table.innerHTML = '<tr><td colspan="5">No history</td></tr>';
            return;
        }
        
        table.innerHTML = data.map(log => {
            const d = log.distance_meters;
            const dist = d >= 1000 ? (d/1000).toFixed(2) + ' km' : d.toFixed(0) + ' m';
            const time = new Date(log.check_in_time).toLocaleString();
            return `<tr><td>${time}</td><td>${log.target_name}</td><td>${log.attendance_status}</td><td>${dist}</td></tr>`;
        }).join('');
    }
    
    // Start
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
    window.setManualLocation = function(lat, lon) {
        currentLocation = { latitude: lat, longitude: lon, accuracy: 50 };
        document.getElementById('latitude').textContent = lat.toFixed(6);
        document.getElementById('longitude').textContent = lon.toFixed(6);
        alert(`Location set to ${lat}, ${lon}`);
    };
    
})();
