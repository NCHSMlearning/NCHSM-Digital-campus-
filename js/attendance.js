// ============================================
// ✅ attendance.js - COMPLETE WORKING VERSION
// All features: Stats, GPS, History, Check-in
// ============================================

(function() {
    'use strict';
    
    console.log('✅ ATTENDANCE SYSTEM LOADING...');
    
    // ============================================
    // CONFIGURATION
    // ============================================
    
    const CAMPUS_COORDINATES = {
        latitude: -0.2607276,
        longitude: 36.0112599
    };
    
    let approvedUnits = [];
    let clinicalLocations = [];
    let currentLocation = null;
    let selectedTarget = null;
    let currentStudent = null;
    let deviceTableExists = null;
    
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
        
        try {
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
        } catch(e) {
            console.warn('Profile load error:', e);
        }
        
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
    // TABLE EXISTENCE CHECK
    // ============================================
    
    async function tableExists(tableName) {
        try {
            const supabase = window.db?.supabase;
            if (!supabase) return false;
            
            const { error } = await supabase
                .from(tableName)
                .select('count', { count: 'exact', head: true })
                .limit(1);
            
            return !error;
        } catch(e) {
            return false;
        }
    }
    
    // ============================================
    // 🆕 SUPERIOR GPS FROM OLD SYSTEM
    // ============================================
    
    function getAccurateLocation() {
        console.log('📍 Getting ACCURATE GPS (maximumAge:0)...');
        
        return new Promise((resolve) => {
            if (!navigator.geolocation) {
                console.warn('⚠️ Geolocation not supported, using campus coordinates');
                resolve({ 
                    lat: CAMPUS_COORDINATES.latitude, 
                    lon: CAMPUS_COORDINATES.longitude, 
                    acc: 9999,
                    address: 'Campus (GPS unavailable)'
                });
                return;
            }
            
            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    const location = {
                        lat: position.coords.latitude,
                        lon: position.coords.longitude,
                        acc: position.coords.accuracy
                    };
                    console.log(`📍 GPS: ${location.lat.toFixed(6)}, ${location.lon.toFixed(6)} (Accuracy: ±${location.acc.toFixed(0)}m)`);
                    
                    try {
                        const address = await getAddressFromCoordinates(location.lat, location.lon);
                        location.address = address;
                    } catch(e) {
                        location.address = `${location.lat.toFixed(6)}, ${location.lon.toFixed(6)}`;
                    }
                    
                    resolve(location);
                },
                (error) => {
                    console.warn('⚠️ GPS Error:', error.message, '- Using campus coordinates');
                    resolve({ 
                        lat: CAMPUS_COORDINATES.latitude, 
                        lon: CAMPUS_COORDINATES.longitude, 
                        acc: 9999,
                        address: 'Campus (GPS fallback)'
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
    
    // ============================================
    // FORCE GPS FUNCTION (FOR THE BUTTON)
    // ============================================
    
    window.forceGPS = async function() {
        console.log('📍 FORCE GPS BUTTON CLICKED!');
        const statusEl = document.getElementById('stats-gps-status');
        if (statusEl) statusEl.textContent = '⏳ Getting GPS...';
        
        try {
            const location = await getAccurateLocation();
            await updateLocationDisplay(location);
            
            const msg = `📍 REAL GPS:\nLat: ${location.lat.toFixed(6)}\nLon: ${location.lon.toFixed(6)}\nAccuracy: ±${location.acc.toFixed(0)}m\nAddress: ${location.address || 'N/A'}`;
            alert(msg);
            
            if (statusEl) statusEl.textContent = '✅ GPS Locked';
            
            const checkBtn = document.getElementById('check-in-button');
            if (checkBtn) {
                checkBtn.disabled = false;
                checkBtn.innerHTML = '📍 Check In Now';
            }
        } catch(e) {
            alert('GPS failed: ' + e.message);
            if (statusEl) statusEl.textContent = '❌ GPS Failed';
        }
    };
    
    // ============================================
    // DEVICE FINGERPRINTING
    // ============================================
    
    async function getDeviceFingerprint() {
        const fingerprint = {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            language: navigator.language,
            screenResolution: `${screen.width}x${screen.height}`,
            screenColorDepth: screen.colorDepth,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            hardwareConcurrency: navigator.hardwareConcurrency || 'unknown',
            deviceMemory: navigator.deviceMemory || 'unknown',
            touchSupport: 'ontouchstart' in window,
            localStorage: !!window.localStorage
        };
        
        const fingerprintString = JSON.stringify(fingerprint);
        const encoder = new TextEncoder();
        const data = encoder.encode(fingerprintString);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        
        return { hash: hashHex, details: fingerprint };
    }
    
    async function checkDeviceTableExists() {
        if (deviceTableExists !== null) return deviceTableExists;
        
        try {
            deviceTableExists = await tableExists('device_registrations');
            if (!deviceTableExists) {
                console.log('⚠️ device_registrations table not found. Device fingerprinting disabled.');
            } else {
                console.log('✅ device_registrations table found');
            }
            return deviceTableExists;
        } catch(e) {
            deviceTableExists = false;
            return false;
        }
    }
    
    async function verifyAndRegisterDevice() {
        const tableExists = await checkDeviceTableExists();
        if (!tableExists) {
            console.log('Device fingerprinting skipped - table not found');
            return true;
        }
        
        const supabase = window.db?.supabase;
        const studentId = getCurrentStudentId();
        if (!supabase || !studentId) return true;
        
        try {
            const deviceFingerprint = await getDeviceFingerprint();
            
            const { data: existing } = await supabase
                .from('device_registrations')
                .select('student_id, student_name')
                .eq('device_hash', deviceFingerprint.hash)
                .maybeSingle();
            
            if (existing && existing.student_id !== studentId) {
                alert(`⚠️ DEVICE ALREADY REGISTERED\n\nThis device is registered to: ${existing.student_name || 'another student'}\n\nEach student must use their OWN device for attendance.`);
                const checkBtn = document.getElementById('check-in-button');
                if (checkBtn) {
                    checkBtn.disabled = true;
                    checkBtn.style.opacity = '0.5';
                }
                return false;
            }
            
            const { data: student } = await supabase
                .from('consolidated_user_profiles_table')
                .select('full_name')
                .eq('user_id', studentId)
                .maybeSingle();
            
            await supabase
                .from('device_registrations')
                .upsert({
                    device_hash: deviceFingerprint.hash,
                    student_id: studentId,
                    student_name: student?.full_name || 'Unknown',
                    device_name: `${navigator.platform} - ${fingerprint.touchSupport ? 'Mobile' : 'Desktop'}`,
                    device_details: deviceFingerprint.details,
                    last_used: new Date().toISOString()
                }, { onConflict: 'device_hash' });
            
            console.log('✅ Device verified and registered');
            return true;
        } catch(e) {
            console.error('Device verification error:', e);
            return true;
        }
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
    // UPDATE LOCATION DISPLAY
    // ============================================
    
    async function updateLocationDisplay(location) {
        const latEl = document.getElementById('latitude');
        const lonEl = document.getElementById('longitude');
        const accEl = document.getElementById('accuracy-value');
        
        if (latEl) latEl.textContent = location.lat.toFixed(6);
        if (lonEl) lonEl.textContent = location.lon.toFixed(6);
        if (accEl) accEl.textContent = location.acc.toFixed(1);
        
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
    // CREATE STATS DISPLAY
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
                flex-wrap: wrap;
            `;
            statsContainer.innerHTML = `
                <div style="flex:1; text-align:center; min-width: 100px;">
                    <div style="font-size:12px; opacity:0.8;">📅 PRESENT TODAY</div>
                    <div id="stats-present-count" style="font-size:36px; font-weight:bold; color:#4ade80;">0</div>
                </div>
                <div style="flex:1; text-align:center; min-width: 100px;">
                    <div style="font-size:12px; opacity:0.8;">⏰ CURRENT TIME</div>
                    <div id="stats-current-time" style="font-size:24px; font-weight:bold; font-family:monospace;">--:--:--</div>
                </div>
                <div style="flex:1; text-align:center; min-width: 100px;">
                    <div style="font-size:12px; opacity:0.8;">📍 GPS STATUS</div>
                    <div id="stats-gps-status" style="font-size:16px; font-weight:bold; color:#93c5fd;">Ready</div>
                </div>
            `;
            heading.parentElement.insertBefore(statsContainer, heading.nextSibling);
        }
    }
    
    // ============================================
    // ADD FORCE GPS BUTTON
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
                transition: all 0.3s ease;
            `;
            btn.onmouseover = () => { btn.style.background = '#d97706'; };
            btn.onmouseout = () => { btn.style.background = '#f59e0b'; };
            btn.onclick = window.forceGPS;
            container.insertBefore(btn, container.firstChild);
            console.log('✅ Force GPS button created');
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
            
            if (error) {
                console.error('Error loading units:', error);
                return [];
            }
            
            approvedUnits = data.map(u => ({
                id: u.id,
                unit_code: u.unit_code,
                unit_name: u.unit_name,
                block: u.block,
                latitude: u.latitude || CAMPUS_COORDINATES.latitude,
                longitude: u.longitude || CAMPUS_COORDINATES.longitude,
                radius: u.radius || 50
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
            
            const exists = await tableExists('clinical_names');
            if (!exists) {
                console.warn('⚠️ clinical_names table not found');
                return [];
            }
            
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
                latitude: unit.latitude || CAMPUS_COORDINATES.latitude,
                longitude: unit.longitude || CAMPUS_COORDINATES.longitude,
                radius: unit.radius || 50
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
        
        const deviceAllowed = await verifyAndRegisterDevice();
        if (!deviceAllowed) return;
        
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
            const location = await getAccurateLocation();
            currentLocation = location;
            
            await updateLocationDisplay(location);
            
            const distance = calculateDistance(
                location.lat, location.lon,
                selectedTarget.latitude, selectedTarget.longitude
            );
            
            const radius = selectedTarget.radius || 50;
            const accuracy = location.acc;
            
            let status = 'Absent';
            let verificationNote = '';
            
            if (accuracy > radius * 2) {
                status = 'Pending';
                verificationNote = `⚠️ GPS accuracy too low (±${accuracy.toFixed(0)}m)`;
            } else if (distance <= radius) {
                status = 'Present';
                verificationNote = `✅ Verified within ${radius}m`;
            } else if (distance <= radius * 2) {
                status = 'Pending';
                verificationNote = `⚠️ Within ${radius * 2}m, needs review`;
            } else {
                status = 'Absent';
                verificationNote = `❌ Too far (${distance.toFixed(0)}m)`;
            }
            
            const confirmed = confirm(
                `📍 CHECK-IN CONFIRMATION\n\n` +
                `Target: ${selectedTarget.name}\n` +
                `Type: ${selectedTarget.type === 'class' ? 'Classroom' : 'Clinical'}\n` +
                `Your Location: ${location.address || `${location.lat.toFixed(6)}, ${location.lon.toFixed(6)}`}\n` +
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
                latitude: location.lat,
                longitude: location.lon,
                accuracy_m: location.acc,
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
            
            alert(`✅ Check-in successful!\nStatus: ${status}\nDistance: ${distance.toFixed(0)}m`);
            await updateStatsData();
            await loadHistory();
            
            document.dispatchEvent(new CustomEvent('attendanceRecorded', {
                detail: { isVerified: status === 'Present' }
            }));
            
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
        if (!table) {
            console.warn('History table not found');
            return;
        }
        
        const supabaseClient = window.db?.supabase || window.supabase;
        const studentId = getCurrentStudentId();
        
        if (!supabaseClient || !studentId) {
            table.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:20px; color:#6b7280;">
                <i class="fas fa-exclamation-circle"></i> Please log in to view history
            </td></tr>`;
            return;
        }
        
        try {
            const { data, error } = await supabaseClient
                .from('geo_attendance_logs')
                .select('*')
                .eq('student_id', studentId)
                .order('check_in_time', { ascending: false })
                .limit(20);
            
            if (error) {
                console.error('History query error:', error);
                table.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:20px; color:#ef4444;">
                    <i class="fas fa-exclamation-triangle"></i> Error loading history
                </td></tr>`;
                return;
            }
            
            if (!data || data.length === 0) {
                table.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:30px; color:#9ca3af;">
                    <i class="fas fa-inbox" style="font-size:24px; display:block; margin-bottom:8px;"></i>
                    No attendance records found
                    <div style="font-size:12px; margin-top:4px;">Check in to start tracking your attendance!</div>
                </td></tr>`;
                return;
            }
            
            table.innerHTML = data.map(log => {
                const accuracy = log.accuracy_m || log.accuracy_meters || 0;
                const distance = log.distance_meters || 0;
                
                const dist = distance >= 1000 ? 
                    (distance/1000).toFixed(2) + ' km' : 
                    distance.toFixed(0) + ' m';
                
                const time = new Date(log.check_in_time).toLocaleString('en-KE', {
                    timeZone: 'Africa/Nairobi',
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });
                
                let status = log.attendance_status || 'Pending';
                let statusColor = '#f59e0b';
                let statusIcon = '⏳';
                
                if (status === 'Present' || status === 'Verified') {
                    statusColor = '#10b981';
                    statusIcon = '✅';
                } else if (status === 'Absent') {
                    statusColor = '#ef4444';
                    statusIcon = '❌';
                }
                
                const sessionIcon = log.session_type === 'class' ? '📚' : 
                                    (log.session_type === 'clinical' ? '🏥' : '📖');
                
                const targetName = log.target_name || log.location_name || 'Unknown';
                
                return `<tr>
                    <td style="white-space: nowrap; font-size: 12px;">${time}</td>
                    <td>${sessionIcon} ${log.session_type || 'Unknown'}</td>
                    <td style="max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${targetName}">
                        ${targetName}
                    </td>
                    <td style="color: ${statusColor}; font-weight: 600;">
                        ${statusIcon} ${status}
                    </td>
                    <td>${dist}</td>
                    <td>±${accuracy.toFixed(0)}m</td>
                </tr>`;
            }).join('');
            
            console.log(`✅ Loaded ${data.length} history records`);
            updatePresentCount(data);
            
        } catch(e) {
            console.error('History error:', e);
            table.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:20px; color:#ef4444;">
                <i class="fas fa-exclamation-triangle"></i> Error loading history
            </td></tr>`;
        }
    }
    
    // ============================================
    // UPDATE PRESENT COUNT
    // ============================================
    
    function updatePresentCount(records) {
        const presentEl = document.getElementById('stats-present-count');
        if (!presentEl) return;
        
        if (!records || records.length === 0) {
            presentEl.textContent = '0';
            return;
        }
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const todayRecords = records.filter(log => {
            const logDate = new Date(log.check_in_time);
            return logDate >= today && (log.attendance_status === 'Present' || log.attendance_status === 'Verified');
        });
        
        presentEl.textContent = todayRecords.length;
    }
    
    // ============================================
    // STATS DISPLAY
    // ============================================
    
    async function updateStatsData() {
        const presentEl = document.getElementById('stats-present-count');
        if (!presentEl) {
            createStatsDisplayIfNeeded();
            return;
        }
        
        const supabase = window.db?.supabase;
        const studentId = getCurrentStudentId();
        
        if (!supabase || !studentId) {
            presentEl.textContent = '0';
            return;
        }
        
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const todayStr = today.toISOString();
            
            const { data, error } = await supabase
                .from('geo_attendance_logs')
                .select('id', { count: 'exact' })
                .eq('student_id', studentId)
                .eq('attendance_status', 'Present')
                .gte('check_in_time', todayStr);
            
            if (error) throw error;
            presentEl.textContent = data?.length || 0;
            
        } catch(e) {
            console.error('Stats error:', e);
            presentEl.textContent = '?';
        }
    }
    
    function startTimeUpdates() {
        updateStatsData();
        setInterval(() => {
            const timeEl = document.getElementById('stats-current-time');
            if (timeEl) timeEl.textContent = new Date().toLocaleTimeString();
        }, 1000);
    }
    
    // ============================================
    // FILTER FUNCTION
    // ============================================
    
    async function filterHistory() {
        const filter = document.getElementById('history-filter');
        if (!filter) return;
        
        const value = filter.value;
        const table = document.getElementById('geo-attendance-history');
        if (!table) return;
        
        const supabase = window.db?.supabase;
        const studentId = getCurrentStudentId();
        
        if (!supabase || !studentId) {
            table.innerHTML = '<tr><td colspan="6">Please log in</td></tr>';
            return;
        }
        
        try {
            let query = supabase
                .from('geo_attendance_logs')
                .select('*')
                .eq('student_id', studentId)
                .order('check_in_time', { ascending: false });
            
            const now = new Date();
            
            if (value === 'today') {
                const today = new Date(now);
                today.setHours(0, 0, 0, 0);
                query = query.gte('check_in_time', today.toISOString());
            } else if (value === 'week') {
                const weekAgo = new Date(now);
                weekAgo.setDate(weekAgo.getDate() - 7);
                query = query.gte('check_in_time', weekAgo.toISOString());
            } else if (value === 'month') {
                const monthAgo = new Date(now);
                monthAgo.setMonth(monthAgo.getMonth() - 1);
                query = query.gte('check_in_time', monthAgo.toISOString());
            }
            
            const { data, error } = await query.limit(50);
            
            if (error) throw error;
            
            if (!data || data.length === 0) {
                table.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:30px; color:#9ca3af;">
                    <i class="fas fa-inbox" style="font-size:24px; display:block; margin-bottom:8px;"></i>
                    No records for this period
                </td></tr>`;
                return;
            }
            
            table.innerHTML = data.map(log => {
                const accuracy = log.accuracy_m || log.accuracy_meters || 0;
                const distance = log.distance_meters || 0;
                
                const dist = distance >= 1000 ? 
                    (distance/1000).toFixed(2) + ' km' : 
                    distance.toFixed(0) + ' m';
                
                const time = new Date(log.check_in_time).toLocaleString('en-KE', {
                    timeZone: 'Africa/Nairobi',
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });
                
                let status = log.attendance_status || 'Pending';
                let statusColor = '#f59e0b';
                let statusIcon = '⏳';
                
                if (status === 'Present' || status === 'Verified') {
                    statusColor = '#10b981';
                    statusIcon = '✅';
                } else if (status === 'Absent') {
                    statusColor = '#ef4444';
                    statusIcon = '❌';
                }
                
                const sessionIcon = log.session_type === 'class' ? '📚' : 
                                    (log.session_type === 'clinical' ? '🏥' : '📖');
                
                const targetName = log.target_name || log.location_name || 'Unknown';
                
                return `<tr>
                    <td style="white-space: nowrap; font-size: 12px;">${time}</td>
                    <td>${sessionIcon} ${log.session_type || 'Unknown'}</td>
                    <td style="max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${targetName}">
                        ${targetName}
                    </td>
                    <td style="color: ${statusColor}; font-weight: 600;">
                        ${statusIcon} ${status}
                    </td>
                    <td>${dist}</td>
                    <td>±${accuracy.toFixed(0)}m</td>
                </tr>`;
            }).join('');
            
            console.log(`✅ Filtered ${data.length} records`);
            
        } catch(e) {
            console.error('Filter error:', e);
            table.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:20px; color:#ef4444;">
                <i class="fas fa-exclamation-triangle"></i> Error filtering
            </td></tr>`;
        }
    }
    
    // ============================================
    // INITIALIZATION
    // ============================================
    
    async function init() {
        console.log('🚀 Initializing attendance system...');
        
        try {
            await getCurrentStudentProfile();
            await loadApprovedUnits();
            await loadClinicalLocations();
            
            createStatsDisplayIfNeeded();
            await updateStatsData();
            startTimeUpdates();
            
            fixDropdown();
            addForceGPSButton();
            
            // Make forceGPS available globally
            window.forceGPS = window.forceGPS || async function() {
                console.log('📍 FORCE GPS BUTTON CLICKED!');
                const statusEl = document.getElementById('stats-gps-status');
                if (statusEl) statusEl.textContent = '⏳ Getting GPS...';
                
                try {
                    const location = await getAccurateLocation();
                    await updateLocationDisplay(location);
                    
                    const msg = `📍 REAL GPS:\nLat: ${location.lat.toFixed(6)}\nLon: ${location.lon.toFixed(6)}\nAccuracy: ±${location.acc.toFixed(0)}m\nAddress: ${location.address || 'N/A'}`;
                    alert(msg);
                    
                    if (statusEl) statusEl.textContent = '✅ GPS Locked';
                    
                    const checkBtn = document.getElementById('check-in-button');
                    if (checkBtn) {
                        checkBtn.disabled = false;
                        checkBtn.innerHTML = '📍 Check In Now';
                    }
                } catch(e) {
                    alert('GPS failed: ' + e.message);
                    if (statusEl) statusEl.textContent = '❌ GPS Failed';
                }
            };
            
            await checkDeviceTableExists();
            
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
            
            const filterSelect = document.getElementById('history-filter');
            if (filterSelect) {
                filterSelect.addEventListener('change', filterHistory);
            }
            
            const refreshBtn = document.getElementById('refresh-history');
            if (refreshBtn) {
                refreshBtn.addEventListener('click', () => {
                    loadHistory();
                    updateStatsData();
                });
            }
            
            const checkBtn = document.getElementById('check-in-button');
            if (checkBtn) {
                checkBtn.onclick = (e) => { e.preventDefault(); doCheckIn(); };
            }
            
            await loadHistory();
            console.log('✅ Attendance system ready!');
            console.log('📍 Using SUPERIOR GPS: maximumAge:0, enableHighAccuracy:true');
            console.log(`🏫 Campus: ${CAMPUS_COORDINATES.latitude}, ${CAMPUS_COORDINATES.longitude}`);
            
        } catch(e) {
            console.error('❌ Attendance init error:', e);
            const btn = document.getElementById('check-in-button');
            if (btn) {
                btn.disabled = true;
                btn.innerHTML = '⚠️ System Error - Refresh';
                btn.style.background = '#ef4444';
            }
        }
    }
    
    // ============================================
    // EXPOSE FUNCTIONS
    // ============================================
    
    window.refreshStats = updateStatsData;
    window.refreshHistory = loadHistory;
    window.filterHistory = filterHistory;
    window.getAccurateLocation = getAccurateLocation;
    window.forceGPS = window.forceGPS || async function() {
        console.log('📍 FORCE GPS BUTTON CLICKED!');
        const statusEl = document.getElementById('stats-gps-status');
        if (statusEl) statusEl.textContent = '⏳ Getting GPS...';
        
        try {
            const location = await getAccurateLocation();
            await updateLocationDisplay(location);
            
            const msg = `📍 REAL GPS:\nLat: ${location.lat.toFixed(6)}\nLon: ${location.lon.toFixed(6)}\nAccuracy: ±${location.acc.toFixed(0)}m\nAddress: ${location.address || 'N/A'}`;
            alert(msg);
            
            if (statusEl) statusEl.textContent = '✅ GPS Locked';
            
            const checkBtn = document.getElementById('check-in-button');
            if (checkBtn) {
                checkBtn.disabled = false;
                checkBtn.innerHTML = '📍 Check In Now';
            }
        } catch(e) {
            alert('GPS failed: ' + e.message);
            if (statusEl) statusEl.textContent = '❌ GPS Failed';
        }
    };
    window.attendanceSystemReady = true;
    
    // ============================================
    // START
    // ============================================
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
    console.log('✅ Attendance system module loaded!');
    console.log('🔥 Using OLD system\'s SUPERIOR GPS accuracy!');
    console.log(`🏫 Campus: ${CAMPUS_COORDINATES.latitude}, ${CAMPUS_COORDINATES.longitude} (Kiamunyi)`);
    
})();
