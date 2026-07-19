// ============================================
// ✅ attendance.js - CLASS-BASED (Like dashboard.js)
// COMPLETE with Stats, Force GPS, Target Dropdown, History
// ============================================

class AttendanceModule {
    constructor(supabaseClient) {
        console.log('🔧 AttendanceModule initialized');
        
        // ✅ Store dependencies (SAME as dashboard.js)
        this.sb = supabaseClient || window.sb || window.db?.supabase;
        this.userId = null;
        this.userProfile = null;
        
        // ✅ Store data internally
        this.approvedUnits = [];
        this.clinicalLocations = [];
        this.currentLocation = null;
        this.selectedTarget = null;
        this.deviceTableExists = null;
        
        // ✅ CAMPUS COORDINATES (CORRECT - Kiamunyi)
        this.CAMPUS_COORDINATES = {
            latitude: -0.2607276,
            longitude: 36.0112599
        };
        
        // ✅ Cache DOM elements
        this.cacheElements();
        
        // ✅ Setup event listeners
        this.setupEventListeners();
        
        // ✅ Create UI components
        this.createStatsDisplayIfNeeded();
        this.addForceGPSButton();
        
        // ✅ Initialize
        this.init();
    }
    
    // ============================================
    // CACHE DOM ELEMENTS (SAME as dashboard.js)
    // ============================================
    
    cacheElements() {
        this.elements = {
            sessionType: document.getElementById('session-type'),
            targetSelect: document.getElementById('attendance-target'),
            targetGroup: document.getElementById('target-control-group'),
            checkBtn: document.getElementById('check-in-button'),
            historyTable: document.getElementById('geo-attendance-history'),
            presentCount: document.getElementById('stats-present-count'),
            currentTime: document.getElementById('stats-current-time'),
            gpsStatus: document.getElementById('stats-gps-status'),
            latEl: document.getElementById('latitude'),
            lonEl: document.getElementById('longitude'),
            accEl: document.getElementById('accuracy-value'),
            locationInfo: document.getElementById('location-info'),
            geoMessage: document.getElementById('geo-message')
        };
    }
    
    // ============================================
    // SETUP EVENT LISTENERS (SAME as dashboard.js)
    // ============================================
    
    setupEventListeners() {
        if (this.elements.sessionType) {
            this.elements.sessionType.addEventListener('change', () => {
                this.populateTargetOptions();
            });
        }
        
        if (this.elements.checkBtn) {
            this.elements.checkBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.doCheckIn();
            });
        }
        
        const filterSelect = document.getElementById('history-filter');
        if (filterSelect) {
            filterSelect.addEventListener('change', () => {
                this.filterHistory();
            });
        }
        
        const refreshBtn = document.getElementById('refresh-history');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.loadHistory();
                this.updateStats();
            });
        }
        
        // ✅ Start time updates
        this.startTimeUpdates();
    }
    
    // ============================================
    // CREATE STATS DISPLAY
    // ============================================
    
    createStatsDisplayIfNeeded() {
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
    
    addForceGPSButton() {
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
            btn.onclick = async () => {
                console.log('🔄 Force refreshing GPS...');
                const statusEl = document.getElementById('stats-gps-status');
                if (statusEl) statusEl.textContent = '⏳ Getting GPS...';
                
                try {
                    const location = await this.getAccurateLocation();
                    const msg = `📍 REAL GPS:\nLat: ${location.lat.toFixed(6)}\nLon: ${location.lon.toFixed(6)}\nAccuracy: ±${location.acc.toFixed(0)}m\nAddress: ${location.address || 'N/A'}`;
                    alert(msg);
                    await this.updateLocationDisplay(location);
                    if (statusEl) statusEl.textContent = '✅ GPS Locked';
                    if (this.elements.checkBtn) {
                        this.elements.checkBtn.disabled = false;
                        this.elements.checkBtn.innerHTML = '📍 Check In Now';
                    }
                } catch(e) {
                    alert('GPS failed: ' + e.message);
                    if (statusEl) statusEl.textContent = '❌ GPS Failed';
                }
            };
            container.insertBefore(btn, container.firstChild);
        }
    }
    
    // ============================================
    // GET STUDENT ID (SAME as dashboard.js)
    // ============================================
    
    getStudentId() {
        if (this.userId) return this.userId;
        if (window.db?.currentUserId) {
            this.userId = window.db.currentUserId;
            return this.userId;
        }
        if (window.db?.currentUserProfile?.user_id) {
            this.userId = window.db.currentUserProfile.user_id;
            return this.userId;
        }
        try {
            const profile = localStorage.getItem('userProfile');
            if (profile) {
                const parsed = JSON.parse(profile);
                if (parsed.user_id || parsed.id) {
                    this.userId = parsed.user_id || parsed.id;
                    return this.userId;
                }
            }
        } catch(e) {}
        return null;
    }
    
    // ============================================
    // GET STUDENT PROFILE (SAME as dashboard.js)
    // ============================================
    
    async getStudentProfile() {
        if (this.userProfile) return this.userProfile;
        
        const studentId = this.getStudentId();
        if (!studentId) return { program: 'KRCHN', intake_year: '2026' };
        if (!this.sb) return { program: 'KRCHN', intake_year: '2026' };
        
        try {
            const { data, error } = await this.sb
                .from('consolidated_user_profiles_table')
                .select('program, intake_year, full_name')
                .eq('user_id', studentId)
                .maybeSingle();
            
            if (!error && data) {
                this.userProfile = data;
                console.log(`👨‍🎓 Student: ${data.program} ${data.intake_year}`);
                return this.userProfile;
            }
        } catch(e) {
            console.warn('Profile load error:', e);
        }
        return { program: 'KRCHN', intake_year: '2026' };
    }
    
    // ============================================
    // CALCULATE DISTANCE
    // ============================================
    
    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371000;
        const toRad = (x) => (x * Math.PI) / 180;
        const dLat = toRad(lat2 - lat1);
        const dLon = toRad(lon2 - lon1);
        const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon/2)**2;
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }
    
    // ============================================
    // GET ACCURATE GPS (SUPERIOR OLD SYSTEM)
    // ============================================
    
    getAccurateLocation() {
        console.log('📍 Getting ACCURATE GPS (maximumAge:0)...');
        
        return new Promise((resolve) => {
            if (!navigator.geolocation) {
                resolve({ 
                    lat: this.CAMPUS_COORDINATES.latitude, 
                    lon: this.CAMPUS_COORDINATES.longitude, 
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
                        const address = await this.getAddressFromCoordinates(location.lat, location.lon);
                        location.address = address;
                    } catch(e) {
                        location.address = `${location.lat.toFixed(6)}, ${location.lon.toFixed(6)}`;
                    }
                    
                    resolve(location);
                },
                (error) => {
                    console.warn('⚠️ GPS Error:', error.message);
                    resolve({ 
                        lat: this.CAMPUS_COORDINATES.latitude, 
                        lon: this.CAMPUS_COORDINATES.longitude, 
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
    // GET ADDRESS FROM COORDINATES
    // ============================================
    
    async getAddressFromCoordinates(lat, lon) {
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
    
    async updateLocationDisplay(location) {
        if (this.elements.latEl) this.elements.latEl.textContent = location.lat.toFixed(6);
        if (this.elements.lonEl) this.elements.lonEl.textContent = location.lon.toFixed(6);
        if (this.elements.accEl) this.elements.accEl.textContent = location.acc.toFixed(1);
        
        let addressDisplay = document.getElementById('location-address');
        if (!addressDisplay) {
            if (this.elements.locationInfo) {
                const addressDiv = document.createElement('div');
                addressDiv.id = 'location-address';
                addressDiv.className = 'location-address';
                addressDiv.style.cssText = 'margin-top: 8px; font-size: 12px; color: #666;';
                this.elements.locationInfo.appendChild(addressDiv);
                addressDisplay = addressDiv;
            }
        }
        
        if (addressDisplay && location.address) {
            addressDisplay.innerHTML = `📍 <strong>Location:</strong> ${location.address}`;
        }
    }
    
    // ============================================
    // LOAD APPROVED UNITS
    // ============================================
    
    async loadApprovedUnits() {
        try {
            const studentId = this.getStudentId();
            if (!this.sb || !studentId) return [];
            
            const { data, error } = await this.sb
                .from('student_unit_registrations')
                .select('*')
                .eq('student_id', studentId)
                .eq('status', 'approved')
                .order('unit_code');
            
            if (error) {
                console.error('Error loading units:', error);
                return [];
            }
            
            this.approvedUnits = data.map(u => ({
                id: u.id,
                unit_code: u.unit_code,
                unit_name: u.unit_name,
                block: u.block,
                latitude: u.latitude || this.CAMPUS_COORDINATES.latitude,
                longitude: u.longitude || this.CAMPUS_COORDINATES.longitude,
                radius: u.radius || 50
            }));
            
            console.log(`📚 Loaded ${this.approvedUnits.length} classroom units`);
            return this.approvedUnits;
        } catch(e) {
            console.error('Error loading units:', e);
            return [];
        }
    }
    
    // ============================================
    // LOAD CLINICAL LOCATIONS
    // ============================================
    
    async loadClinicalLocations() {
        try {
            if (!this.sb) return [];
            
            const student = await this.getStudentProfile();
            const program = student?.program || 'KRCHN';
            const intakeYear = student?.intake_year || '2026';
            
            const { data, error } = await this.sb
                .from('clinical_names')
                .select('id, clinical_area_name, latitude, longitude')
                .eq('program', program)
                .eq('intake_year', intakeYear)
                .order('clinical_area_name');
            
            if (error) {
                console.error('Error loading clinical locations:', error);
                return [];
            }
            
            this.clinicalLocations = data || [];
            console.log(`🏥 Loaded ${this.clinicalLocations.length} clinical locations`);
            return this.clinicalLocations;
        } catch(e) {
            console.error('Error:', e);
            return [];
        }
    }
    
    // ============================================
    // POPULATE TARGET OPTIONS
    // ============================================
    
    async populateTargetOptions() {
        if (!this.elements.targetSelect || !this.elements.sessionType) return;
        
        const sessionType = this.elements.sessionType.value;
        this.elements.targetSelect.innerHTML = '<option value="">Loading...</option>';
        this.elements.targetSelect.disabled = true;
        
        let options = [];
        
        if (sessionType === 'class') {
            await this.loadApprovedUnits();
            options = this.approvedUnits.map(unit => ({
                id: `unit_${unit.id}`,
                name: `${unit.unit_code} - ${unit.unit_name}`,
                type: 'class',
                latitude: unit.latitude || this.CAMPUS_COORDINATES.latitude,
                longitude: unit.longitude || this.CAMPUS_COORDINATES.longitude,
                radius: unit.radius || 50
            }));
        } else if (sessionType === 'clinical') {
            await this.loadClinicalLocations();
            options = this.clinicalLocations.map(loc => ({
                id: `clinical_${loc.id}`,
                name: loc.clinical_area_name,
                type: 'clinical',
                latitude: parseFloat(loc.latitude),
                longitude: parseFloat(loc.longitude),
                radius: 100
            }));
        }
        
        if (options.length === 0) {
            this.elements.targetSelect.innerHTML = `<option value="">⚠️ No ${sessionType === 'class' ? 'courses' : 'clinical locations'} available</option>`;
            this.elements.targetSelect.disabled = false;
            return;
        }
        
        this.elements.targetSelect.innerHTML = `<option value="">📚 Select ${sessionType === 'class' ? 'course' : 'clinical area'}...</option>`;
        
        options.forEach(opt => {
            const option = document.createElement('option');
            option.value = `${opt.id}|${opt.name}|${opt.type}|${opt.latitude}|${opt.longitude}|${opt.radius}`;
            option.textContent = opt.name;
            this.elements.targetSelect.appendChild(option);
        });
        
        this.elements.targetSelect.disabled = false;
        console.log(`✅ Loaded ${options.length} ${sessionType} options`);
        
        // ✅ Show target group
        if (this.elements.targetGroup) {
            this.elements.targetGroup.style.display = 'flex';
        }
    }
    
    // ============================================
    // DO CHECK-IN
    // ============================================
    
    async doCheckIn() {
        if (!this.elements.checkBtn) return;
        
        if (!this.selectedTarget) {
            // Try to get from dropdown
            if (this.elements.targetSelect && this.elements.targetSelect.value) {
                const parts = this.elements.targetSelect.value.split('|');
                if (parts.length >= 6) {
                    this.selectedTarget = {
                        id: parts[0],
                        name: parts[1],
                        type: parts[2],
                        latitude: parseFloat(parts[3]),
                        longitude: parseFloat(parts[4]),
                        radius: parseFloat(parts[5])
                    };
                }
            }
        }
        
        if (!this.selectedTarget) {
            alert('Please select a target');
            return;
        }
        
        this.elements.checkBtn.disabled = true;
        this.elements.checkBtn.innerHTML = '📍 Getting GPS...';
        
        try {
            const location = await this.getAccurateLocation();
            this.currentLocation = location;
            
            await this.updateLocationDisplay(location);
            
            const distance = this.calculateDistance(
                location.lat, location.lon,
                this.selectedTarget.latitude, this.selectedTarget.longitude
            );
            
            const radius = this.selectedTarget.radius || 50;
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
                `Target: ${this.selectedTarget.name}\n` +
                `Type: ${this.selectedTarget.type === 'class' ? 'Classroom' : 'Clinical'}\n` +
                `Your Location: ${location.address || `${location.lat.toFixed(6)}, ${location.lon.toFixed(6)}`}\n` +
                `GPS Accuracy: ±${accuracy.toFixed(0)}m\n` +
                `Distance: ${distance.toFixed(0)}m\n` +
                `Verification Radius: ${radius}m\n` +
                `Status: ${status}\n\n` +
                `${verificationNote}\n\n` +
                `Proceed?`
            );
            
            if (!confirmed) {
                this.elements.checkBtn.disabled = false;
                this.elements.checkBtn.innerHTML = '📍 Check In Now';
                return;
            }
            
            this.elements.checkBtn.innerHTML = '💾 Saving...';
            
            const studentId = this.getStudentId();
            const sessionType = this.elements.sessionType?.value || 'class';
            
            const record = {
                student_id: studentId,
                check_in_time: new Date().toISOString(),
                session_type: sessionType,
                target_id: this.selectedTarget.id,
                target_name: this.selectedTarget.name,
                latitude: location.lat,
                longitude: location.lon,
                accuracy_m: location.acc,
                distance_meters: distance,
                is_verified: status === 'Present',
                attendance_status: status,
                target_latitude: this.selectedTarget.latitude,
                target_longitude: this.selectedTarget.longitude,
                location_address: location.address || null
            };
            
            if (sessionType === 'class') {
                record.unit_code = this.selectedTarget.name.split(' - ')[0];
            } else {
                record.clinical_area = this.selectedTarget.name;
            }
            
            const { error } = await this.sb.from('geo_attendance_logs').insert([record]);
            if (error) throw error;
            
            alert(`✅ Check-in successful!\nStatus: ${status}\nDistance: ${distance.toFixed(0)}m`);
            await this.updateStats();
            await this.loadHistory();
            
            document.dispatchEvent(new CustomEvent('attendanceRecorded', {
                detail: { isVerified: status === 'Present' }
            }));
            
        } catch(error) {
            console.error('Check-in error:', error);
            alert('Check-in failed: ' + error.message);
        } finally {
            this.elements.checkBtn.disabled = false;
            this.elements.checkBtn.innerHTML = '📍 Check In Now';
        }
    }
    
    // ============================================
    // LOAD HISTORY
    // ============================================
    
    async loadHistory() {
        if (!this.elements.historyTable) {
            console.warn('History table not found');
            return;
        }
        
        const studentId = this.getStudentId();
        if (!this.sb || !studentId) {
            this.elements.historyTable.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:20px; color:#6b7280;">
                <i class="fas fa-exclamation-circle"></i> Please log in to view history
            </td></tr>`;
            return;
        }
        
        try {
            const { data, error } = await this.sb
                .from('geo_attendance_logs')
                .select('*')
                .eq('student_id', studentId)
                .order('check_in_time', { ascending: false })
                .limit(20);
            
            if (error) throw error;
            
            if (!data || data.length === 0) {
                this.elements.historyTable.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:30px; color:#9ca3af;">
                    <i class="fas fa-inbox" style="font-size:24px; display:block; margin-bottom:8px;"></i>
                    No attendance records found
                </td></tr>`;
                return;
            }
            
            this.elements.historyTable.innerHTML = data.map(log => {
                const accuracy = log.accuracy_m || log.accuracy_meters || 0;
                const distance = log.distance_meters || 0;
                const dist = distance >= 1000 ? (distance/1000).toFixed(2) + ' km' : distance.toFixed(0) + ' m';
                
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
                
                const sessionIcon = log.session_type === 'class' ? '📚' : (log.session_type === 'clinical' ? '🏥' : '📖');
                const targetName = log.target_name || log.location_name || 'Unknown';
                
                return `<tr>
                    <td style="white-space: nowrap; font-size: 12px;">${time}</td>
                    <td>${sessionIcon} ${log.session_type || 'Unknown'}</td>
                    <td style="max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${targetName}">${targetName}</td>
                    <td style="color: ${statusColor}; font-weight: 600;">${statusIcon} ${status}</td>
                    <td>${dist}</td>
                    <td>±${accuracy.toFixed(0)}m</td>
                </tr>`;
            }).join('');
            
            console.log(`✅ Loaded ${data.length} history records`);
            this.updatePresentCount(data);
            
        } catch(e) {
            console.error('History error:', e);
            this.elements.historyTable.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:20px; color:#ef4444;">
                <i class="fas fa-exclamation-triangle"></i> Error loading history
            </td></tr>`;
        }
    }
    
    // ============================================
    // UPDATE PRESENT COUNT
    // ============================================
    
    updatePresentCount(records) {
        if (!this.elements.presentCount) return;
        
        if (!records || records.length === 0) {
            this.elements.presentCount.textContent = '0';
            return;
        }
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const todayRecords = records.filter(log => {
            const logDate = new Date(log.check_in_time);
            return logDate >= today && (log.attendance_status === 'Present' || log.attendance_status === 'Verified');
        });
        
        this.elements.presentCount.textContent = todayRecords.length;
    }
    
    // ============================================
    // UPDATE STATS
    // ============================================
    
    async updateStats() {
        if (!this.elements.presentCount) return;
        
        const studentId = this.getStudentId();
        if (!this.sb || !studentId) {
            this.elements.presentCount.textContent = '0';
            return;
        }
        
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const todayStr = today.toISOString();
            
            const { data, error } = await this.sb
                .from('geo_attendance_logs')
                .select('id', { count: 'exact' })
                .eq('student_id', studentId)
                .eq('attendance_status', 'Present')
                .gte('check_in_time', todayStr);
            
            if (error) throw error;
            this.elements.presentCount.textContent = data?.length || 0;
            
        } catch(e) {
            console.error('Stats error:', e);
            this.elements.presentCount.textContent = '?';
        }
    }
    
    // ============================================
    // FILTER HISTORY
    // ============================================
    
    async filterHistory() {
        const filter = document.getElementById('history-filter');
        if (!filter) return;
        
        const value = filter.value;
        const studentId = this.getStudentId();
        if (!this.sb || !studentId) return;
        
        try {
            let query = this.sb
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
                this.elements.historyTable.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:30px; color:#9ca3af;">
                    <i class="fas fa-inbox" style="font-size:24px; display:block; margin-bottom:8px;"></i>
                    No records for this period
                </td></tr>`;
                return;
            }
            
            this.elements.historyTable.innerHTML = data.map(log => {
                const accuracy = log.accuracy_m || log.accuracy_meters || 0;
                const distance = log.distance_meters || 0;
                const dist = distance >= 1000 ? (distance/1000).toFixed(2) + ' km' : distance.toFixed(0) + ' m';
                
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
                
                const sessionIcon = log.session_type === 'class' ? '📚' : (log.session_type === 'clinical' ? '🏥' : '📖');
                const targetName = log.target_name || log.location_name || 'Unknown';
                
                return `<tr>
                    <td style="white-space: nowrap; font-size: 12px;">${time}</td>
                    <td>${sessionIcon} ${log.session_type || 'Unknown'}</td>
                    <td style="max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${targetName}">${targetName}</td>
                    <td style="color: ${statusColor}; font-weight: 600;">${statusIcon} ${status}</td>
                    <td>${dist}</td>
                    <td>±${accuracy.toFixed(0)}m</td>
                </tr>`;
            }).join('');
            
        } catch(e) {
            console.error('Filter error:', e);
        }
    }
    
    // ============================================
    // START TIME UPDATES
    // ============================================
    
    startTimeUpdates() {
        this.updateStats();
        setInterval(() => {
            const timeEl = document.getElementById('stats-current-time');
            if (timeEl) timeEl.textContent = new Date().toLocaleTimeString();
        }, 1000);
    }
    
    // ============================================
    // INIT (SAME as dashboard.js)
    // ============================================
    
    async init() {
        console.log('🚀 Initializing attendance system...');
        
        try {
            // ✅ Get student ID
            const studentId = this.getStudentId();
            if (!studentId) {
                console.log('⏳ Waiting for student data...');
                setTimeout(() => this.init(), 1000);
                return;
            }
            
            // ✅ Get profile
            await this.getStudentProfile();
            
            // ✅ Load data
            await this.loadApprovedUnits();
            await this.loadClinicalLocations();
            
            // ✅ Update UI
            await this.updateStats();
            
            // ✅ Setup dropdown
            await this.populateTargetOptions();
            
            // ✅ Load history
            await this.loadHistory();
            
            // ✅ Enable check-in button if target is selected
            if (this.elements.targetSelect && this.elements.targetSelect.value) {
                const parts = this.elements.targetSelect.value.split('|');
                if (parts.length >= 6) {
                    this.selectedTarget = {
                        id: parts[0],
                        name: parts[1],
                        type: parts[2],
                        latitude: parseFloat(parts[3]),
                        longitude: parseFloat(parts[4]),
                        radius: parseFloat(parts[5])
                    };
                    if (this.elements.checkBtn) {
                        this.elements.checkBtn.disabled = false;
                        this.elements.checkBtn.innerHTML = '📍 Check In Now';
                    }
                }
            }
            
            console.log('✅ Attendance system ready!');
            console.log('📍 Using SUPERIOR GPS: maximumAge:0, enableHighAccuracy:true');
            console.log(`🏫 Campus: ${this.CAMPUS_COORDINATES.latitude}, ${this.CAMPUS_COORDINATES.longitude}`);
            
        } catch(e) {
            console.error('❌ Attendance init error:', e);
            if (this.elements.checkBtn) {
                this.elements.checkBtn.disabled = true;
                this.elements.checkBtn.innerHTML = '⚠️ System Error - Refresh';
                this.elements.checkBtn.style.background = '#ef4444';
            }
        }
    }
    
    // ============================================
    // REFRESH (SAME as dashboard.js)
    // ============================================
    
    async refresh() {
        console.log('🔄 Refreshing attendance...');
        await this.init();
    }
}

// ============================================
// ✅ CREATE GLOBAL INSTANCE (SAME as dashboard.js)
// ============================================

let attendanceModule = null;

function initAttendanceModule(supabaseClient) {
    const client = supabaseClient || window.sb || window.db?.supabase;
    if (!client) {
        console.error('❌ No Supabase client for attendance');
        return null;
    }
    
    attendanceModule = new AttendanceModule(client);
    return attendanceModule;
}

// ✅ Make it globally accessible (SAME as dashboard.js)
window.AttendanceModule = AttendanceModule;
window.initAttendanceModule = initAttendanceModule;
window.refreshAttendance = () => attendanceModule?.refresh();

console.log('✅ Attendance module loaded - CLASS-BASED (like dashboard.js)');
console.log('🔥 Using OLD system\'s SUPERIOR GPS accuracy!');
console.log(`🏫 Campus: -0.2607276, 36.0112599 (Kiamunyi)`);
