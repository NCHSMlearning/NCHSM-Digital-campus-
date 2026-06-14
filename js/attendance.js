// COMPLETE ATTENDANCE SYSTEM - WITH FORCED FRESH GPS
(function() {
    'use strict';
    
    console.log('✅ ATTENDANCE SYSTEM LOADING...');
    
    // ============================================
    // CONFIGURATION
    // ============================================
    
    const CAMPUS_COORDINATES = {
        latitude: -0.2714611,
        longitude: 36.0519956
    };
    
    let approvedUnits = [];
    let clinicalLocations = [];
    let currentLocation = null;
    let selectedTarget = null;
    let currentStudent = null;
    
    // ============================================
    // HELPER FUNCTIONS
    // ============================================
    
    function getCurrentStudentId() {
        if (window.db?.currentUserProfile?.user_id) return window.db.currentUserProfile.user_id;
        if (window.db?.currentUserId) return window.db.currentUserId;
        try {
            const profile = localStorage.getItem('userProfile');
            if (profile) return JSON.parse(profile).user_id;
        } catch(e) {}
        return null;
    }
    
    async function getCurrentStudentProfile() {
        if (currentStudent) return currentStudent;
        
        const supabase = window.db?.supabase;
        const studentId = getCurrentStudentId();
        
        if (!supabase || !studentId) {
            return { program: 'KRCHN', intake_year: '2026' };
        }
        
        // Use consolidated_user_profiles_table
        const { data, error } = await supabase
            .from('consolidated_user_profiles_table')
            .select('program, intake_year, full_name')
            .eq('user_id', studentId)
            .maybeSingle();
        
        if (!error && data && data.program) {
            currentStudent = data;
            console.log(`👨‍🎓 Student: ${data.program} ${data.intake_year}`);
            return currentStudent;
        }
        
        // Fallback
        return { program: 'KRCHN', intake_year: '2026' };
    }
    
    function calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371000;
        const toRad = (x) => (x * Math.PI) / 180;
        const dLat = toRad(lat2 - lat1);
        const dLon = toRad(lon2 - lon1);
        const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon/2)**2;
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }
    
    // ============================================
    // FREE ADDRESS LOOKUP
    // ============================================
    
    async function getAddressFromCoordinates(lat, lon) {
        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`, {
                headers: { 'User-Agent': 'NCHSM-Attendance-System/1.0' }
            });
            const data = await response.json();
            
            if (data && data.display_name) {
                const road = data.address?.road || '';
                const suburb = data.address?.suburb || data.address?.neighbourhood || '';
                const city = data.address?.city || data.address?.town || data.address?.county || '';
                
                if (road && city) return `${road}, ${city}`;
                if (city) return city;
                return data.display_name.split(',')[0];
            }
            return `${lat.toFixed(6)}, ${lon.toFixed(6)}`;
        } catch(e) {
            return `${lat.toFixed(6)}, ${lon.toFixed(6)}`;
        }
    }
    
    // ============================================
    // FORCED FRESH GPS - NO CACHE
    // ============================================
    
    function getRealLocation() {
        console.log('📍 FORCING FRESH GPS - Clearing cache...');
        
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('Geolocation not supported'));
                return;
            }
            
            const options = {
                enableHighAccuracy: true,
                maximumAge: 0,
                timeout: 30000
            };
            
            // Clear any active watchers
            if (navigator.geolocation.clearWatch && window.locationWatchId) {
                navigator.geolocation.clearWatch(window.locationWatchId);
                window.locationWatchId = null;
            }
            
            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    const timestamp = position.coords.timestamp;
                    const age = Date.now() - timestamp;
                    
                    console.log(`📍 GPS received, age: ${age}ms`);
                    
                    // If data is cached, retry
                    if (age > 2000) {
                        console.warn('⚠️ Received cached GPS! Retrying...');
                        getRealLocation().then(resolve).catch(reject);
                        return;
                    }
                    
                    const lat = position.coords.latitude;
                    const lon = position.coords.longitude;
                    const acc = position.coords.accuracy;
                    
                    console.log(`✅ FRESH GPS: ${lat}, ${lon} (±${acc}m)`);
                    
                    const address = await getAddressFromCoordinates(lat, lon);
                    console.log(`🏠 Address: ${address}`);
                    
                    // Check for cached campus coordinates
                    const campusLat = -0.2714611;
                    const campusLon = 36.0519956;
                    const isCachedCampus = Math.abs(lat - campusLat) < 0.001 && Math.abs(lon - campusLon) < 0.001;
                    
                    if (isCachedCampus && acc > 100) {
                        console.warn('⚠️ Got cached campus coordinates! Please go outside and enable GPS.');
                    }
                    
                    resolve({ 
                        latitude: lat, 
                        longitude: lon, 
                        accuracy: acc,
                        address: address
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
    // UPDATE LOCATION DISPLAY
    // ============================================
    
    async function updateLocationDisplay(location) {
        const latEl = document.getElementById('latitude');
        const lonEl = document.getElementById('longitude');
        const accEl = document.getElementById('accuracy-value');
        
        if (latEl) latEl.textContent = location.latitude.toFixed(6);
        if (lonEl) lonEl.textContent = location.longitude.toFixed(6);
        if (accEl) accEl.textContent = location.accuracy.toFixed(1);
        
        let addressDisplay = document.getElementById('location-address');
        if (!addressDisplay) {
            const locationInfo = document.getElementById('location-info');
            if (locationInfo) {
                const addressDiv = document.createElement('div');
                addressDiv.id = 'location-address';
                addressDiv.className = 'location-address';
                addressDiv.style.cssText = 'margin-top: 8px; font-size: 12px; color: #666;';
                locationInfo.appendChild(addressDiv);
                addressDisplay = addressDiv;
            }
        }
        
        if (addressDisplay && location.address) {
            addressDisplay.innerHTML = `📍 <strong>Location:</strong> ${location.address}`;
        }
    }
    
    // ============================================
    // FIX DROPDOWN
    // ============================================
    
    function fixDropdown() {
        const targetSelect = document.getElementById('attendance-target');
        if (!targetSelect) return;
        
        targetSelect.disabled = false;
        
        const newSelect = targetSelect.cloneNode(true);
        targetSelect.parentNode.replaceChild(newSelect, targetSelect);
        
        newSelect.addEventListener('change', function() {
            if (this.value && this.value !== '') {
                const parts = this.value.split('|');
                if (parts.length >= 6) {
                    window.selectedTarget = {
                        id: parts[0],
                        name: parts[1],
                        type: parts[2],
                        latitude: parseFloat(parts[3]),
                        longitude: parseFloat(parts[4]),
                        radius: parseFloat(parts[5])
                    };
                    console.log('✅ Target selected:', window.selectedTarget.name);
                    
                    const checkBtn = document.getElementById('check-in-button');
                    if (checkBtn) checkBtn.disabled = false;
                }
            } else {
                window.selectedTarget = null;
                const checkBtn = document.getElementById('check-in-button');
                if (checkBtn) checkBtn.disabled = true;
            }
        });
        
        console.log('✅ Dropdown fixed');
    }
    
    // ============================================
    // LOAD CLASSROOM UNITS
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
            
            console.log(`📚 Loaded ${approvedUnits.length} classroom units`);
            return approvedUnits;
        } catch(e) {
            console.error('Error loading units:', e);
            return [];
        }
    }
    
    // ============================================
    // LOAD CLINICAL LOCATIONS
    // ============================================
    
    async function loadClinicalLocations() {
        try {
            const supabase = window.db?.supabase;
            if (!supabase) return [];
            
            const student = await getCurrentStudentProfile();
            const program = student?.program || 'KRCHN';
            const intakeYear = student?.intake_year || '2026';
            
            console.log(`Loading clinical locations for: ${program} ${intakeYear}`);
            
            const { data, error } = await supabase
                .from('clinical_names')
                .select('id, clinical_area_name, latitude, longitude')
                .eq('program', program)
                .eq('intake_year', intakeYear)
                .order('clinical_area_name');
            
            if (error) {
                console.error('Error loading clinical locations:', error);
                return [];
            }
            
            console.log(`🏥 Loaded ${data?.length || 0} clinical locations`);
            return data || [];
        } catch(e) {
            console.error('Error:', e);
            return [];
        }
    }
    
    // ============================================
    // POPULATE DROPDOWN
    // ============================================
    
    async function populateTargetOptions(sessionType) {
        const targetSelect = document.getElementById('attendance-target');
        if (!targetSelect) return;
        
        targetSelect.innerHTML = '<option value="">Loading...</option>';
        targetSelect.disabled = true;
        
        let options = [];
        
        if (sessionType === 'class') {
            if (approvedUnits.length === 0) await loadApprovedUnits();
            
            options = approvedUnits.map(unit => ({
                id: `unit_${unit.id}`,
                name: `${unit.unit_code} - ${unit.unit_name}`,
                type: 'class',
                latitude: CAMPUS_COORDINATES.latitude,
                longitude: CAMPUS_COORDINATES.longitude,
                radius: 50
            }));
        } 
        else if (sessionType === 'clinical') {
            const clinics = await loadClinicalLocations();
            options = clinics.map(loc => ({
                id: `clinical_${loc.id}`,
                name: loc.clinical_area_name,
                type: 'clinical',
                latitude: parseFloat(loc.latitude),
                longitude: parseFloat(loc.longitude),
                radius: 100
            }));
        }
        
        if (options.length === 0) {
            targetSelect.innerHTML = `<option value="">⚠️ No ${sessionType === 'class' ? 'courses' : 'clinical locations'} available</option>`;
            targetSelect.disabled = false;
            return;
        }
        
        targetSelect.innerHTML = `<option value="">📚 Select ${sessionType === 'class' ? 'course' : 'clinical area'}...</option>`;
        
        options.forEach(opt => {
            const option = document.createElement('option');
            option.value = `${opt.id}|${opt.name}|${opt.type}|${opt.latitude}|${opt.longitude}|${opt.radius}`;
            option.textContent = opt.name;
            targetSelect.appendChild(option);
        });
        
        targetSelect.disabled = false;
        console.log(`✅ Loaded ${options.length} ${sessionType} options`);
    }
    
    // ============================================
    // CHECK-IN FUNCTION
    // ============================================
    
    async function doCheckIn() {
        const btn = document.getElementById('check-in-button');
        const targetSelect = document.getElementById('attendance-target');
        const sessionTypeSelect = document.getElementById('session-type');
        
        if (!selectedTarget && targetSelect?.value) {
            const parts = targetSelect.value.split('|');
            if (parts.length >= 6) {
                selectedTarget = {
                    id: parts[0],
                    name: parts[1],
                    type: parts[2],
                    latitude: parseFloat(parts[3]),
                    longitude: parseFloat(parts[4]),
                    radius: parseFloat(parts[5])
                };
            }
        }
        
        if (!selectedTarget) {
            alert('Please select a target');
            return;
        }
        
        btn.disabled = true;
        btn.innerHTML = '📍 Getting GPS...';
        
        try {
            const location = await getRealLocation();
            currentLocation = location;
            
            await updateLocationDisplay(location);
            
            const distance = calculateDistance(
                location.latitude, location.longitude,
                selectedTarget.latitude, selectedTarget.longitude
            );
            
            const radius = selectedTarget.radius || 50;
            const accuracy = location.accuracy;
            
            let status = 'Absent';
            let verificationNote = '';
            
            // Accuracy-based verification
            if (accuracy > radius) {
                status = 'Pending';
                verificationNote = `⚠️ GPS accuracy too low (±${accuracy.toFixed(0)}m). Cannot verify exact location.`;
            } else if (distance <= radius) {
                status = 'Present';
                verificationNote = `✅ Verified within ${radius}m (GPS accuracy ±${accuracy.toFixed(0)}m)`;
            } else if (distance <= radius * 2) {
                status = 'Pending';
                verificationNote = `⚠️ Within ${radius * 2}m, needs review`;
            } else {
                status = 'Absent';
                verificationNote = `❌ Too far (${distance.toFixed(0)}m) from target`;
            }
            
            const confirmed = confirm(
                `📍 CHECK-IN CONFIRMATION\n\n` +
                `Target: ${selectedTarget.name}\n` +
                `Type: ${selectedTarget.type === 'class' ? 'Classroom' : 'Clinical'}\n` +
                `Your Location: ${location.address || `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`}\n` +
                `GPS Accuracy: ±${accuracy.toFixed(0)}m\n` +
                `Distance: ${distance.toFixed(0)}m\n` +
                `Verification Radius: ${radius}m\n` +
                `Status: ${status}\n\n` +
                `${verificationNote}\n\n` +
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
            const sessionType = sessionTypeSelect?.value || 'class';
            
            const record = {
                student_id: studentId,
                check_in_time: new Date().toISOString(),
                session_type: sessionType,
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
                location_address: location.address || null
            };
            
            if (sessionType === 'class') {
                record.unit_code = selectedTarget.name.split(' - ')[0];
            } else {
                record.clinical_area = selectedTarget.name;
            }
            
            const { error } = await supabase.from('geo_attendance_logs').insert([record]);
            if (error) throw error;
            
            alert(`✅ Check-in successful!\nStatus: ${status}\nDistance: ${distance.toFixed(0)}m\nLocation: ${location.address || 'Coordinates saved'}`);
            await updateStatsData();
            await loadHistory();
            
        } catch(error) {
            console.error('Check-in error:', error);
            alert('Check-in failed: ' + error.message);
        } finally {
            btn.disabled = false;
            btn.innerHTML = '📍 Check In Now';
        }
    }
    
    // ============================================
    // LOAD HISTORY
    // ============================================
    
    async function loadHistory() {
        const table = document.getElementById('geo-attendance-history');
        if (!table) return;
        
        const supabase = window.db?.supabase;
        const studentId = getCurrentStudentId();
        
        if (!supabase || !studentId) {
            table.innerHTML = '<tr><td colspan="7">Unable to load history...</td></tr>';
            return;
        }
        
        const { data, error } = await supabase
            .from('geo_attendance_logs')
            .select('*')
            .eq('student_id', studentId)
            .order('check_in_time', { ascending: false })
            .limit(20);
        
        if (error || !data || data.length === 0) {
            table.innerHTML = '<tr><td colspan="7">No history records found</td></tr>';
            return;
        }
        
        table.innerHTML = data.map(log => {
            const dist = log.distance_meters >= 1000 ? 
                (log.distance_meters/1000).toFixed(2) + ' km' : 
                log.distance_meters.toFixed(0) + ' m';
            const time = new Date(log.check_in_time).toLocaleString();
            const statusColor = log.attendance_status === 'Present' ? '#10b981' : 
                               (log.attendance_status === 'Pending' ? '#f59e0b' : '#ef4444');
            const locationDisplay = log.location_address || `${log.latitude?.toFixed(4) || '--'}, ${log.longitude?.toFixed(4) || '--'}`;
            
            return `<tr>
                <td>${time}</td>
                <td>${log.session_type === 'class' ? '📚 Class' : '🏥 Clinical'}</td>
                <td>${log.target_name || 'Unknown'}</td>
                <td style="color: ${statusColor}">${log.attendance_status || 'Unknown'}</td>
                <td>${dist}</td>
                <td>±${(log.accuracy_m || 0).toFixed(0)}m</td>
                <td style="font-size: 11px; max-width: 150px; overflow: hidden;">${locationDisplay}</td>
            </tr>`;
        }).join('');
    }
    
    // ============================================
    // STATS DISPLAY
    // ============================================
    
    function createStatsDisplayIfNeeded() {
        if (document.getElementById('stats-present-count')) return;
        
        const heading = Array.from(document.querySelectorAll('h1, h2, h3')).find(h => 
            h.textContent && h.textContent.includes('Daily Attendance'));
        
        if (heading && heading.parentElement) {
            const statsContainer = document.createElement('div');
            statsContainer.id = 'attendance-stats-container';
            statsContainer.style.cssText = `
                display: flex; gap: 20px; margin: 20px 0; padding: 15px 20px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                border-radius: 12px; color: white; box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            `;
            statsContainer.innerHTML = `
                <div style="flex:1; text-align:center;">
                    <div style="font-size:12px; opacity:0.8;">📅 PRESENT TODAY</div>
                    <div id="stats-present-count" style="font-size:36px; font-weight:bold; color:#4ade80;">0</div>
                </div>
                <div style="flex:1; text-align:center;">
                    <div style="font-size:12px; opacity:0.8;">⏰ CURRENT TIME</div>
                    <div id="stats-current-time" style="font-size:24px; font-weight:bold; font-family:monospace;">--:--:--</div>
                </div>
            `;
            heading.parentElement.insertBefore(statsContainer, heading.nextSibling);
        }
    }
    
    async function updateStatsData() {
        const presentEl = document.getElementById('stats-present-count');
        if (presentEl) {
            const supabase = window.db?.supabase;
            const studentId = getCurrentStudentId();
            if (supabase && studentId) {
                const today = new Date();
                today.setHours(0,0,0,0);
                const { data } = await supabase
                    .from('geo_attendance_logs')
                    .select('id', { count: 'exact' })
                    .eq('student_id', studentId)
                    .eq('attendance_status', 'Present')
                    .gte('check_in_time', today.toISOString());
                presentEl.textContent = data?.length || 0;
            }
        }
        const timeEl = document.getElementById('stats-current-time');
        if (timeEl) timeEl.textContent = new Date().toLocaleTimeString();
    }
    
    function startTimeUpdates() {
        updateStatsData();
        setInterval(() => {
            const timeEl = document.getElementById('stats-current-time');
            if (timeEl) timeEl.textContent = new Date().toLocaleTimeString();
        }, 1000);
    }
    
    // ============================================
    // FORCE GPS BUTTON
    // ============================================
    
    function addForceGPSButton() {
        const container = document.querySelector('.check-in-controls');
        if (container && !document.getElementById('force-gps-btn')) {
            const btn = document.createElement('button');
            btn.id = 'force-gps-btn';
            btn.innerHTML = '🔄 Get REAL GPS (Force Fresh)';
            btn.style.cssText = `
                background: #f59e0b;
                color: white;
                border: none;
                padding: 10px 16px;
                border-radius: 8px;
                margin: 10px 0;
                cursor: pointer;
                font-size: 14px;
                width: 100%;
            `;
            btn.onclick = async () => {
                console.log('🔄 Force refreshing GPS...');
                try {
                    const location = await getRealLocation();
                    alert(`📍 REAL GPS:\nLat: ${location.latitude.toFixed(6)}\nLon: ${location.longitude.toFixed(6)}\nAccuracy: ±${location.accuracy.toFixed(0)}m\n\nIf accuracy > 100m, please go outside and enable GPS.`);
                    await updateLocationDisplay(location);
                } catch(e) {
                    alert('GPS failed: ' + e.message);
                }
            };
            container.insertBefore(btn, container.firstChild);
        }
    }
    
    // ============================================
    // INITIALIZATION
    // ============================================
    
    async function init() {
        console.log('🚀 Initializing attendance system...');
        
        await getCurrentStudentProfile();
        await loadApprovedUnits();
        await loadClinicalLocations();
        
        createStatsDisplayIfNeeded();
        await updateStatsData();
        startTimeUpdates();
        
        fixDropdown();
        addForceGPSButton();
        
        const sessionType = document.getElementById('session-type');
        if (sessionType) {
            sessionType.addEventListener('change', async () => {
                const targetGroup = document.getElementById('target-control-group');
                const targetLabel = document.getElementById('target-text');
                
                if (sessionType.value === 'class') {
                    if (targetGroup) targetGroup.style.display = 'flex';
                    if (targetLabel) targetLabel.textContent = 'Select Course:';
                    await populateTargetOptions('class');
                } else if (sessionType.value === 'clinical') {
                    if (targetGroup) targetGroup.style.display = 'flex';
                    if (targetLabel) targetLabel.textContent = 'Select Clinical Area:';
                    await populateTargetOptions('clinical');
                } else {
                    if (targetGroup) targetGroup.style.display = 'none';
                }
            });
            
            if (sessionType.value === 'class') {
                await populateTargetOptions('class');
            } else if (sessionType.value === 'clinical') {
                await populateTargetOptions('clinical');
            }
        }
        
        const checkBtn = document.getElementById('check-in-button');
        if (checkBtn) {
            checkBtn.onclick = (e) => { e.preventDefault(); doCheckIn(); };
        }
        
        await loadHistory();
        console.log('✅ Attendance system ready!');
        console.log('📍 Use the "Get REAL GPS" button for fresh location');
    }
    
    // Start
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
    window.refreshStats = updateStatsData;
    window.refreshHistory = loadHistory;
    
})();
