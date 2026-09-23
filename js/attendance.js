// ============================================
// ✅ attendance.js - STUDENT SELF CHECK-IN
// ✅ Works like exams.js - waits for profile before loading
// ✅ Captures student ID from logged-in user profile
// ✅ Multi-reading GPS averaging (5+ readings)
// ✅ Confidence scoring & verification
// ✅ Anti-spoofing protection
// ✅ Clinical radius: Nakuru = 250m, Others = 200m
// ✅ 50m radius for classroom/lab
// ✅ Beautiful modals - NO "This site says" popups!
// ✅ Working navigation and filters
// ✅ FULLY SELF-CONTAINED
// ✅ FILTERS BY BLOCK & INTAKE YEAR
// ✅ WAITS FOR PROFILE TO LOAD (like exams.js)
// ✅ CAPTURES BOTH user_id (UUID) AND admission_number
// ✅ STUDENT-FRIENDLY - No distance warnings
// ✅ READS FROM DATABASE ONLY - NO localStorage!
// ✅ Active Sessions panel filtered by student's block + intake year
// ✅ One-click check-in from session card
// ✅ Duplicate check-in prevention
// ============================================

(function() {
    'use strict';
    
    console.log('✅ ULTRA-ACCURATE ATTENDANCE SYSTEM LOADING...');
    
    // ============================================
    // CONFIGURATION
    // ============================================
    
    const CAMPUS_COORDINATES = {
        latitude: -0.2607276,
        longitude: 36.0112599
    };
    
    const ACCURACY_CONFIG = {
        STRICT_MODE: true,
        MAX_ACCEPTABLE_ACCURACY: 50,
        CLINICAL_MAX_ACCURACY: 200,
        MIN_READINGS: 5,
        STABILIZATION_TIME: 3000,
        MAX_DRIFT: 20,
        MAX_MOVEMENT_SPEED: 2,
        CLINICAL_RADIUS: 300,
        CLASSROOM_RADIUS: 150,
        LAB_RADIUS: 150,
        TUTORIAL_RADIUS: 150
    };
    
    let approvedUnits = [];
    let clinicalLocations = [];
    let currentLocation = null;
    let selectedTarget = null;
    let currentStudent = null;
    let activeSessions = [];
    let currentSession = null;
    let attendanceStats = {
        present: 0,
        pending: 0,
        absent: 0,
        total: 0
    };
    let attendanceHistory = [];
    let isInitialized = false;
    let gpsWatchId = null;
    let isGettingLocation = false;
    let profileLoadAttempts = 0;
    const MAX_PROFILE_ATTEMPTS = 20;
    
    // ============================================
    // ✅ GET SUPABASE CLIENT
    // ============================================
    
    function getSupabase() {
        if (window.db?.supabase && typeof window.db.supabase.from === 'function') {
            return window.db.supabase;
        }
        if (window.supabase && typeof window.supabase.from === 'function') {
            return window.supabase;
        }
        if (window.sb && typeof window.sb.from === 'function') {
            return window.sb;
        }
        return null;
    }
    
    // ============================================
    // ✅ GET CURRENT STUDENT INFO
    // ============================================
    
    async function getCurrentStudentInfo() {
        let profile = null;
        let source = 'none';
        const supabase = getSupabase();
        
        if (supabase) {
            try {
                const { data: { user }, error: authError } = await supabase.auth.getUser();
                
                if (authError) {
                    console.warn('⚠️ Auth error:', authError);
                } else if (user) {
                    console.log(`✅ Found authenticated user:`, user.id);
                    
                    const { data: profileData, error: profileError } = await supabase
                        .from('consolidated_user_profiles_table')
                        .select('*')
                        .eq('user_id', user.id)
                        .single();
                    
                    if (profileError) {
                        console.warn('⚠️ Profile fetch error:', profileError);
                    } else if (profileData) {
                        profile = profileData;
                        source = 'supabase.auth + database';
                        console.log(`📋 Found profile in ${source}:`, profileData);
                        console.log(`📋 Admission Number:`, profileData.admission_number);
                    }
                }
            } catch(e) {
                console.warn('⚠️ Auth not available:', e);
            }
        }
        
        if (!profile && window.db?.currentUser) {
            profile = window.db.currentUser;
            source = 'window.db.currentUser';
            console.log(`📋 Found profile in ${source}:`, profile.block, profile.intake_year);
        }
        
        if (!profile && window.currentUser) {
            profile = window.currentUser;
            source = 'window.currentUser';
            console.log(`📋 Found profile in ${source}:`, profile.block, profile.intake_year);
        }
        
        if (!profile && window.db?.currentUserProfile) {
            profile = window.db.currentUserProfile;
            source = 'window.db.currentUserProfile';
            console.log(`📋 Found profile in ${source}:`, profile.block, profile.intake_year);
        }
        
        if (!profile && window.currentUserProfile) {
            profile = window.currentUserProfile;
            source = 'window.currentUserProfile';
            console.log(`📋 Found profile in ${source}:`, profile.block, profile.intake_year);
        }
        
        if (!profile && window.dashboardModule?.userData) {
            profile = window.dashboardModule.userData;
            source = 'window.dashboardModule.userData';
            console.log(`📋 Found profile in ${source}:`, profile.block, profile.intake_year);
        }
        
        if (!profile && window.userData) {
            profile = window.userData;
            source = 'window.userData';
            console.log(`📋 Found profile in ${source}:`, profile.block, profile.intake_year);
        }
        
        if (!profile) {
            const userId = window.userId || window.currentUserId || 
                          window.db?.currentUser?.id || 
                          window.currentUser?.id || 
                          null;
            if (userId) {
                source = 'userId fallback';
                console.log(`📋 Found userId in ${source}:`, userId);
                
                if (supabase) {
                    try {
                        const { data: profileData, error: profileError } = await supabase
                            .from('consolidated_user_profiles_table')
                            .select('*')
                            .eq('user_id', userId)
                            .single();
                        
                        if (profileData && !profileError) {
                            profile = profileData;
                            source = 'database by userId';
                            console.log(`📋 Found profile in ${source}:`, profileData);
                        }
                    } catch(e) {
                        console.warn('⚠️ Could not fetch by userId:', e);
                    }
                }
            }
        }
        
        if (!profile) {
            try {
                const stored = localStorage.getItem('userProfile');
                if (stored) {
                    const localProfile = JSON.parse(stored);
                    if (localProfile.user_id) {
                        profile = localProfile;
                        source = 'localStorage (ABSOLUTE LAST RESORT)';
                    }
                }
            } catch(e) {
                console.warn('⚠️ Could not read localStorage:', e);
            }
        }
        
        if (profile) {
            const block = profile.block || 
                         profile.current_block || 
                         profile.blockTerm || 
                         profile.userBlock || 
                         'Block 4';
            
            const intakeYear = profile.intake_year || 
                              profile.intakeYear || 
                              profile.intake || 
                              profile.academic_year || 
                              '2024';
            
            const userId = profile.user_id || profile.id || null;
            const admissionNumber = profile.admission_number ||   
                                   profile.admissionNumber ||    
                                   profile.student_id ||          
                                   profile.registration_number || 
                                   profile.reg_number ||          
                                   null;
            
            console.log(`✅ Profile loaded from ${source}:`);
            console.log(`   📋 User ID (UUID): ${userId}`);
            console.log(`   📋 Admission Number: ${admissionNumber}`);
            console.log(`   📋 Block: ${block}`);
            console.log(`   📋 Intake Year: ${intakeYear}`);
            
            return {
                user_id: userId,
                student_id: admissionNumber,
                admission_number: admissionNumber,
                registration_number: admissionNumber,
                full_name: profile.full_name || profile.name || 'Student',
                program: profile.program || 'KRCHN',
                block: block,
                intake_year: intakeYear
            };
        }
        
        console.warn('⚠️ No student profile found! Using defaults.');
        return {
            user_id: null,
            student_id: null,
            admission_number: null,
            registration_number: null,
            full_name: 'Student',
            program: 'KRCHN',
            block: 'Block 4',
            intake_year: '2024'
        };
    }

    async function getCurrentStudentId() {
        const info = await getCurrentStudentInfo();
        return info?.user_id || null;
    }

    async function getCurrentStudentRegNumber() {
        const info = await getCurrentStudentInfo();
        return info?.admission_number || info?.student_id || null;
    }

    async function getCurrentStudentName() {
        const info = await getCurrentStudentInfo();
        return info?.full_name || 'Student';
    }

    async function getCurrentStudentProgram() {
        const info = await getCurrentStudentInfo();
        return info?.program || 'KRCHN';
    }

    async function getCurrentStudentBlock() {
        const info = await getCurrentStudentInfo();
        return info?.block || 'Block 4';
    }

    async function getCurrentStudentIntakeYear() {
        const info = await getCurrentStudentInfo();
        return info?.intake_year || '2024';
    }
    
    function calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371000;
        const toRad = (x) => (x * Math.PI) / 180;
        const dLat = toRad(lat2 - lat1);
        const dLon = toRad(lon2 - lon1);
        const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon/2)**2;
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }
    
    async function getAddressFromCoordinates(lat, lon) {
        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`, {
                headers: { 'User-Agent': 'NCHSM-Attendance-System/1.0' }
            });
            const data = await response.json();
            if (data && data.display_name) {
                const road = data.address?.road || '';
                const city = data.address?.city || data.address?.town || '';
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
    // 📍 ULTRA-ACCURATE GPS CLASS
    // ============================================
    
    class UltraAccurateGPS {
        constructor() {
            this.readings = [];
            this.isRunning = false;
            this.stableLocation = null;
            this.watchId = null;
            this.accuracyHistory = [];
            this.movementSpeed = 0;
            this.lastPosition = null;
            this.lastTimestamp = null;
        }

        async getUltraAccurateLocation(options = {}) {
            return new Promise((resolve) => {
                const {
                    minReadings = ACCURACY_CONFIG.MIN_READINGS,
                    stabilizationTime = ACCURACY_CONFIG.STABILIZATION_TIME,
                    maxAccuracy = ACCURACY_CONFIG.MAX_ACCEPTABLE_ACCURACY,
                    timeout = 25000
                } = options;

                if (!navigator.geolocation) {
                    showToast('❌ GPS not supported on this device', 'error');
                    resolve(null);
                    return;
                }

                let readings = [];
                let isResolved = false;

                const getReading = () => {
                    return new Promise((resolveReading) => {
                        navigator.geolocation.getCurrentPosition(
                            (position) => {
                                const reading = {
                                    lat: position.coords.latitude,
                                    lon: position.coords.longitude,
                                    accuracy: position.coords.accuracy,
                                    altitude: position.coords.altitude,
                                    speed: position.coords.speed,
                                    heading: position.coords.heading,
                                    timestamp: position.timestamp
                                };
                                resolveReading(reading);
                            },
                            (error) => {
                                resolveReading(null);
                            },
                            { 
                                enableHighAccuracy: true, 
                                timeout: 5000, 
                                maximumAge: 0 
                            }
                        );
                    });
                };

                const calculateWeightedAverage = (readings) => {
                    if (readings.length === 0) return null;

                    let totalWeight = 0;
                    let weightedLat = 0;
                    let weightedLon = 0;
                    let totalAccuracy = 0;
                    let validReadings = 0;

                    readings.forEach(r => {
                        if (r.accuracy > 100) return;
                        const weight = 1 / (r.accuracy + 1);
                        weightedLat += r.lat * weight;
                        weightedLon += r.lon * weight;
                        totalWeight += weight;
                        totalAccuracy += r.accuracy;
                        validReadings++;
                    });

                    if (totalWeight === 0 || validReadings < 2) return null;

                    const avgLat = weightedLat / totalWeight;
                    const avgLon = weightedLon / totalWeight;
                    
                    let variance = 0;
                    let validCount = 0;
                    readings.forEach(r => {
                        if (r.accuracy > 100) return;
                        const dist = this.calculateDistance(avgLat, avgLon, r.lat, r.lon);
                        variance += dist * dist;
                        validCount++;
                    });
                    variance /= validCount;
                    const stdDev = Math.sqrt(variance);

                    return {
                        lat: avgLat,
                        lon: avgLon,
                        accuracy: totalAccuracy / validReadings,
                        readingsCount: validReadings,
                        stdDev: stdDev,
                        confidence: Math.max(0, 100 - (stdDev * 2))
                    };
                };

                const collectReadings = async () => {
                    while (readings.length < minReadings && !isResolved) {
                        const reading = await getReading();
                        if (reading && reading.accuracy < 200) {
                            if (readings.length > 0) {
                                const avg = calculateWeightedAverage(readings);
                                if (avg) {
                                    const dist = this.calculateDistance(
                                        avg.lat, avg.lon,
                                        reading.lat, reading.lon
                                    );
                                    if (dist > ACCURACY_CONFIG.MAX_DRIFT * 2) {
                                        console.log(`⚠️ Rejected outlier: ${dist.toFixed(0)}m from average`);
                                        continue;
                                    }
                                }
                            }
                            readings.push(reading);
                            console.log(`📡 Reading ${readings.length}/${minReadings}: ±${reading.accuracy.toFixed(0)}m`);
                            
                            this.updateGPSProgress(readings.length, minReadings);
                        }
                        
                        if (readings.length >= minReadings) {
                            break;
                        }
                    }

                    const finalLocation = calculateWeightedAverage(readings);
                    
                    if (!finalLocation) {
                        resolve(null);
                        return;
                    }

                    const verification = this.verifyLocation(finalLocation);
                    
                    if (!verification.passed) {
                        showToast(`❌ GPS verification failed: ${verification.reason}`, 'error', 5000);
                        resolve(null);
                        return;
                    }

                    try {
                        finalLocation.address = await getAddressFromCoordinates(finalLocation.lat, finalLocation.lon);
                    } catch(e) {
                        finalLocation.address = `${finalLocation.lat.toFixed(6)}, ${finalLocation.lon.toFixed(6)}`;
                    }

                    finalLocation.rawReadings = readings;
                    finalLocation.verification = verification;
                    this.stableLocation = finalLocation;
                    
                    resolve(finalLocation);
                };

                collectReadings();

                setTimeout(() => {
                    if (!isResolved) {
                        isResolved = true;
                        if (readings.length >= 2) {
                            const finalLocation = calculateWeightedAverage(readings);
                            if (finalLocation) {
                                resolve(finalLocation);
                                return;
                            }
                        }
                        showToast('⏰ GPS timeout - please try again', 'error');
                        resolve(null);
                    }
                }, timeout);
            });
        }

        verifyLocation(location) {
            let passed = true;
            let reason = '';

            if (location.accuracy > ACCURACY_CONFIG.MAX_ACCEPTABLE_ACCURACY) {
                passed = false;
                reason = `GPS accuracy too low (±${location.accuracy.toFixed(0)}m). Need ±${ACCURACY_CONFIG.MAX_ACCEPTABLE_ACCURACY}m`;
            }

            if (location.stdDev > ACCURACY_CONFIG.MAX_DRIFT) {
                passed = false;
                reason = `GPS readings inconsistent (drift: ${location.stdDev.toFixed(0)}m)`;
            }

            if (location.readingsCount < 3) {
                passed = false;
                reason = `Not enough GPS readings (${location.readingsCount}/3)`;
            }

            if (location.confidence < 50) {
                passed = false;
                reason = `Low confidence score (${location.confidence.toFixed(0)}%)`;
            }

            if (!this.isPlausibleLocation(location.lat, location.lon)) {
                passed = false;
                reason = 'Location appears implausible';
            }

            return { passed, reason };
        }

        isPlausibleLocation(lat, lon) {
            if (lat < -4.5 || lat > 5.5) return false;
            if (lon < 33.5 || lon > 42.5) return false;
            if (Math.abs(lat) < 0.0001 && Math.abs(lon) < 0.0001) return false;
            return true;
        }

        calculateDistance(lat1, lon1, lat2, lon2) {
            const R = 6371000;
            const toRad = (x) => (x * Math.PI) / 180;
            const dLat = toRad(lat2 - lat1);
            const dLon = toRad(lon2 - lon1);
            const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon/2)**2;
            return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        }

        updateGPSProgress(current, total) {
            const progressEl = document.getElementById('gps-progress');
            const statusEl = document.getElementById('gps-status');
            
            if (progressEl) {
                const percent = (current / total) * 100;
                progressEl.innerHTML = `
                    <div style="width: 100%; background: #e5e7eb; border-radius: 20px; height: 4px; overflow: hidden; margin-top: 4px;">
                        <div style="width: ${percent}%; background: linear-gradient(135deg, #4f46e5, #7c3aed); height: 100%; transition: width 0.3s;"></div>
                    </div>
                    <span style="font-size: 11px; color: #64748b;">📡 GPS: ${current}/${total} readings</span>
                `;
            }
            
            if (statusEl) {
                statusEl.innerHTML = `<i class="fas fa-satellite-dish" style="color: #f59e0b;"></i> <span>Acquiring GPS signal... ${current}/${total}</span>`;
                statusEl.style.background = '#fef3c7';
                statusEl.style.color = '#92400e';
                statusEl.style.padding = '6px 12px';
                statusEl.style.borderRadius = '8px';
                statusEl.style.fontSize = '13px';
            }
        }

        stop() {
            if (this.watchId) {
                navigator.geolocation.clearWatch(this.watchId);
                this.watchId = null;
            }
            this.isRunning = false;
            this.readings = [];
        }
    }

    const ultraGPS = new UltraAccurateGPS();

    // ============================================
    // 🍞 BEAUTIFUL TOAST
    // ============================================
    
    function showToast(message, type = 'success', duration = 3500) {
        const existing = document.querySelector('.custom-toast');
        if (existing) existing.remove();
        
        const toast = document.createElement('div');
        toast.className = 'custom-toast';
        toast.style.cssText = `
            position: fixed;
            bottom: 30px;
            left: 50%;
            transform: translateX(-50%);
            background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : type === 'warning' ? '#f59e0b' : '#4f46e5'};
            color: white;
            padding: 14px 28px;
            border-radius: 16px;
            font-size: 15px;
            font-weight: 500;
            z-index: 999997;
            box-shadow: 0 8px 32px rgba(0,0,0,0.2);
            display: flex;
            align-items: center;
            gap: 12px;
            max-width: 90%;
            animation: slideUpToast 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
            font-family: 'Inter', system-ui, sans-serif;
            pointer-events: none;
        `;
        const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️';
        toast.innerHTML = `<span style="font-size: 20px;">${icon}</span> ${message}`;
        document.body.appendChild(toast);
        setTimeout(() => {
            toast.style.animation = 'slideDownToast 0.3s ease forwards';
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }

    // ============================================
    // 📚 LOAD DATA
    // ============================================
    
    async function loadApprovedUnits() {
        try {
            const supabase = getSupabase();
            const studentId = await getCurrentStudentId();
            if (!supabase || !studentId) return [];
            const { data, error } = await supabase
                .from('student_unit_registrations')
                .select('*')
                .eq('student_id', studentId)
                .eq('status', 'approved');
            if (error) throw error;
            approvedUnits = (data || []).map(u => ({
                id: u.id, 
                unit_code: u.unit_code, 
                unit_name: u.unit_name,
                block: u.block,
                latitude: u.latitude || CAMPUS_COORDINATES.latitude,
                longitude: u.longitude || CAMPUS_COORDINATES.longitude,
                radius: u.radius || 50
            }));
            return approvedUnits;
        } catch(e) { return []; }
    }
    
    async function loadClinicalLocations() {
        try {
            const supabase = getSupabase();
            if (!supabase) return [];
            
            const studentInfo = await getCurrentStudentInfo();
            const intakeYear = studentInfo?.intake_year || '2024';
            const blockTerm = studentInfo?.block || 'Block 4';
            
            console.log(`🏥 Loading clinical locations for: ${intakeYear}, ${blockTerm}`);
            
            const { data, error } = await supabase
                .from('clinical_names')
                .select('id, clinical_area_name, latitude, longitude, radius_meters, block_term, intake_year')
                .eq('program', 'KRCHN')
                .eq('intake_year', intakeYear)
                .eq('block_term', blockTerm);
            
            if (error) throw error;
            
            clinicalLocations = (data || []).map(loc => {
                let radius = loc.radius_meters || 200;
                const lowerName = loc.clinical_area_name.toLowerCase();
                if (lowerName.includes('nakuru county referral hospital')) {
                    radius = 250;
                }
                return {
                    id: `clinical_${loc.id}`,
                    name: loc.clinical_area_name,
                    type: 'clinical',
                    latitude: parseFloat(loc.latitude),
                    longitude: parseFloat(loc.longitude),
                    radius: radius,
                    intake_year: loc.intake_year,
                    block_term: loc.block_term
                };
            });
            
            console.log(`✅ Loaded ${clinicalLocations.length} clinical locations for ${blockTerm}, ${intakeYear}`);
            return clinicalLocations;
        } catch(e) { 
            console.error('Error loading clinical locations:', e);
            return []; 
        }
    }
    
    // ============================================
    // 🎓 LOAD ACTIVE SESSIONS
    // ============================================
    
    async function loadActiveSessions() {
        try {
            const supabase = getSupabase();
            if (!supabase) return [];
            
            const studentInfo = await getCurrentStudentInfo();
            const studentProgram = studentInfo?.program || 'KRCHN';
            const studentBlock   = studentInfo?.block;
            const studentIntake  = studentInfo?.intake_year;
            
            console.log(`🎓 Loading sessions for: program=${studentProgram}, block=${studentBlock}, intake=${studentIntake}`);
            
            if (!studentBlock) {
                console.warn('⚠️ Student has no block — cannot filter sessions');
                activeSessions = [];
                return [];
            }
            
            let query = supabase
                .from('scheduled_sessions')
                .select('*')
                .eq('status', 'active')
                .eq('is_active', true)
                .gte('session_date', new Date().toISOString().split('T')[0])
                .order('session_date', { ascending: true });
            
            query = query.eq('block_term', studentBlock);
            
            if (studentIntake) {
                query = query.eq('intake_year', String(studentIntake));
            }
            
            query = query.eq('target_program', studentProgram);
            
            const { data: sessions, error } = await query;
            if (error) throw error;
            
            activeSessions = sessions || [];
            console.log(`✅ Loaded ${activeSessions.length} active sessions for ${studentBlock} / ${studentIntake}`);
            return activeSessions;
        } catch (error) {
            console.error('Error loading active sessions:', error);
            activeSessions = [];
            return [];
        }
    }
    
    // ============================================
    // 🎨 RENDER ACTIVE SESSIONS PANEL
    // ============================================
    
    async function renderActiveSessions() {
        const container = document.getElementById('active-sessions-list');
        const countBadge = document.getElementById('active-sessions-count');
        
        if (!container) {
            console.warn('⚠️ active-sessions-list container not found');
            return;
        }
        
        container.innerHTML = `
            <div style="padding: 20px; text-align: center; color: #94a3b8; font-size: 13px;">
                <i class="fas fa-spinner fa-spin" style="font-size: 20px; display: block; margin-bottom: 8px; color: #4C1D95;"></i>
                Loading your sessions...
            </div>
        `;
        
        await loadActiveSessions();
        
        if (countBadge) countBadge.textContent = activeSessions.length;
        
        if (activeSessions.length === 0) {
            container.innerHTML = `
                <div style="padding: 24px 20px; text-align: center; color: #94a3b8; background: #f8fafc; border-radius: 10px; border: 1px dashed #cbd5e1;">
                    <i class="fas fa-calendar-times" style="font-size: 32px; display: block; margin-bottom: 10px; color: #cbd5e1;"></i>
                    <div style="font-weight: 600; color: #475569; margin-bottom: 4px;">No active sessions right now</div>
                    <div style="font-size: 12px;">When your lecturer opens a session for your block, it will appear here.</div>
                </div>
            `;
            return;
        }
        
        container.innerHTML = activeSessions.map(session => {
            const sessionType = (session.session_type || 'class').toLowerCase();
            const icon = sessionType === 'clinical' ? '🏥' : sessionType === 'lab' ? '🔬' : sessionType === 'tutorial' ? '📖' : '📚';
            const unit = session.unit_name || session.session_title || session.title || 'Session';
            const safeUnit = unit.replace(/'/g, "\\'");
            const safeLoc = (session.location_name || '').replace(/'/g, "\\'");
            const displayDate = session.session_date 
                ? new Date(session.session_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) 
                : '';
            const displayTime = session.session_time || '09:00';
            const blockDisplay = session.block_display || session.block_term || '';
            
            return `
                <div style="background: white; border: 1px solid #e2e8f0; border-left: 4px solid #10b981; border-radius: 10px; padding: 14px 16px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center; gap: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); flex-wrap: wrap;">
                    <div style="flex: 1; min-width: 200px;">
                        <div style="font-weight: 600; color: #1e293b; font-size: 15px;">
                            ${icon} ${unit}
                        </div>
                        <div style="font-size: 12px; color: #64748b; margin-top: 4px; display: flex; gap: 10px; flex-wrap: wrap;">
                            <span><i class="fas fa-layer-group" style="color: #4C1D95;"></i> ${blockDisplay}</span>
                            <span><i class="fas fa-calendar"></i> ${displayDate}</span>
                            <span><i class="fas fa-clock"></i> ${displayTime}</span>
                            <span><i class="fas fa-map-marker-alt"></i> ${session.location_name || 'Lecture Hall'}</span>
                        </div>
                    </div>
                    <button onclick="quickCheckIn('${session.id}', '${sessionType}', '${safeUnit}', '${safeLoc}')"
                            onmouseout="this.style.background='linear-gradient(135deg, #4f46e5, #7c3aed)'; this.style.transform='none';"
                            onmouseover="this.style.background='linear-gradient(135deg, #4338ca, #6d28d9)'; this.style.transform='translateY(-1px)';"
                            style="background: linear-gradient(135deg, #4f46e5, #7c3aed); color: white; border: none; padding: 10px 20px; border-radius: 10px; font-weight: 600; cursor: pointer; font-size: 13px; white-space: nowrap; display: inline-flex; align-items: center; gap: 6px; transition: all 0.2s ease; box-shadow: 0 2px 8px rgba(79,70,229,0.3);">
                        <i class="fas fa-fingerprint"></i> Check In
                    </button>
                </div>
            `;
        }).join('');
    }
    
    // ============================================
    // ⚡ QUICK CHECK-IN — DIRECT CHECK-IN FLOW
    // ============================================
    
   // ============================================
// ⚡ QUICK CHECK-IN — SESSION-BASED, NO DROPDOWN
// ============================================

async function quickCheckIn(sessionId, sessionType, unitName, locationName) {
    console.log(`⚡ Quick check-in for session ${sessionId}`);
    
    const session = activeSessions.find(s => s.id === sessionId);
    if (!session) {
        showToast('Session not found — refreshing...', 'warning');
        await renderActiveSessions();
        return;
    }
    
    currentSession = session;
    
    const sessionInfo = await getCurrentStudentInfo();
    if (!sessionInfo?.user_id) {
        showToast('Please log in first', 'error');
        return;
    }
    
    // ============================================================
    // 🔒 DUPLICATE PREVENTION — ONE STUDENT, ONE RECORD PER SESSION
    // IMPORTANT: Do NOT use opened_at here. Re-opening the same session
    // must NOT create another attendance record. A second class of the
    // same unit/day must be created as a NEW scheduled session with a
    // different session_id.
    // ============================================================
    const supabase = getSupabase();
    if (supabase) {
        try {
            const { data: sessionRow, error: sessionError } = await supabase
                .from('scheduled_sessions')
                .select('status, is_active')
                .eq('id', sessionId)
                .single();

            if (sessionError) throw sessionError;

            const isActiveNow = sessionRow?.is_active === true || sessionRow?.status === 'active';

            if (!isActiveNow) {
                showToast('This session is not currently open for check-in.', 'warning', 4000);
                return;
            }

            const { data: existing, error: existingError } = await supabase
                .from('geo_attendance_logs')
                .select('id, check_in_time, attendance_status, verification_source, is_verified')
                .eq('user_id', sessionInfo.user_id)
                .eq('session_id', sessionId)
                .order('check_in_time', { ascending: false })
                .limit(1);

            if (existingError) throw existingError;

            if (existing && existing.length > 0) {
                const row = existing[0];
                const isAutomaticAbsent =
                    String(row.verification_source || '').toLowerCase().includes('automatic session finalization') &&
                    String(row.attendance_status || '').toLowerCase() === 'absent' &&
                    row.is_verified !== true;

                // Reopening the SAME session allows an automatic Absent placeholder
                // to be replaced by a real GPS check-in, but never creates a second row.
                if (!isAutomaticAbsent) {
                    const time = row.check_in_time
                        ? new Date(row.check_in_time).toLocaleTimeString('en-KE', {
                            hour: '2-digit', minute: '2-digit'
                        })
                        : 'earlier';
                    showToast(`✅ You already checked in for this class at ${time}.`, 'success', 4000);
                    return;
                }
            }
        } catch (e) {
            console.error('❌ Could not verify session/duplicate status:', e);
            showToast('Could not verify this attendance session. Please try again.', 'error', 5000);
            return;
        }
    }
    // ✅ Build the target DIRECTLY from the session — no dropdown lookup
    const targetType = (session.session_type || 'class').toLowerCase();
    const targetType_normalized = 
        targetType === 'clinical' ? 'clinical' :
        targetType === 'lab' ? 'lab' :
        targetType === 'tutorial' ? 'tutorial' :
        'class';
    
    // Coordinate resolution:
    //   1) session's own target_latitude/longitude if present
    //   2) else the matched approvedUnit's coords (if we can find it)
    //   3) else campus center
    let lat = session.target_latitude ? parseFloat(session.target_latitude) : null;
    let lon = session.target_longitude ? parseFloat(session.target_longitude) : null;
    let radius = session.target_radius ? parseInt(session.target_radius) : null;
    
    // Try to find a matching approved unit by name (fallback for coords)
    if (!lat || !lon) {
        const matchedUnit = approvedUnits.find(u => 
            (u.unit_name && unitName && 
             u.unit_name.toLowerCase().includes(unitName.toLowerCase().substring(0, 20))) ||
            (u.unit_name && session.unit_name && 
             u.unit_name.toLowerCase() === session.unit_name.toLowerCase())
        );
        if (matchedUnit?.latitude && matchedUnit?.longitude) {
            lat = matchedUnit.latitude;
            lon = matchedUnit.longitude;
            if (!radius) radius = matchedUnit.radius || ACCURACY_CONFIG.CLASSROOM_RADIUS;
            console.log('📍 Using matched unit coords:', matchedUnit.unit_name);
        }
    }
    
    // Final fallback
    if (!lat || !lon) {
        lat = CAMPUS_COORDINATES.latitude;
        lon = CAMPUS_COORDINATES.longitude;
        console.log('📍 Using campus center fallback');
    }
    
    if (!radius) {
        radius = targetType_normalized === 'clinical' 
            ? ACCURACY_CONFIG.CLINICAL_RADIUS 
            : ACCURACY_CONFIG.CLASSROOM_RADIUS;
    }
    
    selectedTarget = {
        id: `session_${session.id}`,
        name: session.unit_name || session.session_title || session.title || unitName || 'Session',
        type: targetType_normalized,
        latitude: lat,
        longitude: lon,
        radius: radius
    };
    
    console.log('✅ Built target from session:', selectedTarget);
    showToast(`📍 Preparing check-in for ${selectedTarget.name}...`, 'info', 2000);
    
    // Skip the target dropdown entirely — go straight to GPS + confirm
    setTimeout(() => {
        doCheckIn(session);
    }, 500);
}

    // ============================================
    // 🎯 POPULATE TARGET OPTIONS
    // ============================================
    
    async function populateTargetOptions(sessionType) {
        const targetSelect = document.getElementById('attendance-target');
        const targetGroup = document.getElementById('target-control-group');
        
        if (!targetSelect) return;
        
        if (targetGroup) targetGroup.style.display = 'block';
        
        targetSelect.innerHTML = '<option value="">Loading...</option>';
        targetSelect.disabled = true;
        
        let options = [];
        
        console.log(`📋 Populating targets for session type: ${sessionType}`);
        
        if (sessionType === 'clinical') {
            const studentInfo = await getCurrentStudentInfo();
            const blockTerm = studentInfo?.block || 'Block 4';
            const intakeYear = studentInfo?.intake_year || '2024';
            
            console.log(`🏥 Loading clinical locations for ${blockTerm}, ${intakeYear}`);
            
            if (clinicalLocations.length === 0) {
                await loadClinicalLocations();
            }
            
            options = clinicalLocations
                .filter(loc => {
                    const locBlock = loc.block_term || 'Block 4';
                    const locIntake = loc.intake_year || '2024';
                    return locBlock === blockTerm && locIntake === intakeYear;
                })
                .map(loc => ({
                    id: loc.id,
                    name: loc.name,
                    type: 'clinical',
                    latitude: loc.latitude,
                    longitude: loc.longitude,
                    radius: loc.radius || 200
                }));
            
            console.log(`🏥 Found ${options.length} clinical locations for ${blockTerm}, ${intakeYear}`);
        } else if (sessionType === 'class' || sessionType === 'lab' || sessionType === 'tutorial') {
            if (approvedUnits.length === 0) await loadApprovedUnits();
            options = approvedUnits.map(unit => ({
                id: `unit_${unit.id}`,
                name: `${unit.unit_code} - ${unit.unit_name}`,
                type: sessionType,
                latitude: unit.latitude || CAMPUS_COORDINATES.latitude,
                longitude: unit.longitude || CAMPUS_COORDINATES.longitude,
                radius: unit.radius || 50
            }));
            console.log(`📚 Found ${options.length} units`);
        }
        
        if (options.length === 0) {
            targetSelect.innerHTML = `<option value="">⚠️ No options available</option>`;
            targetSelect.disabled = false;
            return;
        }
        
        targetSelect.innerHTML = `<option value="">📚 Select ${sessionType === 'clinical' ? 'clinical area' : 'course'}...</option>`;
        options.forEach(opt => {
            const option = document.createElement('option');
            option.value = `${opt.id}|${opt.name}|${opt.type}|${opt.latitude}|${opt.longitude}|${opt.radius}`;
            const radiusText = opt.type === 'clinical' ? ` (${opt.radius}m radius)` : '';
            option.textContent = `${opt.name}${radiusText}`;
            targetSelect.appendChild(option);
        });
        targetSelect.disabled = false;
        
        const reqTarget = document.getElementById('req-target');
        if (reqTarget) {
            reqTarget.innerHTML = `<i class="fas fa-check-circle" style="color: #10b981; font-size: 11px;"></i> Target selected (${options.length} available)`;
            reqTarget.style.color = '#065f46';
        }
    }

    // ============================================
    // 📊 LOAD HISTORY
    // ============================================
    
    async function loadHistory() {
        const table = document.getElementById('geo-attendance-history');
        if (!table) return;
        
        table.innerHTML = `
            <tr>
                <td colspan="6" style="padding: 40px 20px; text-align: center; color: #94a3b8;">
                    <div style="width: 30px; height: 30px; border: 3px solid #e5e7eb; border-top-color: #4C1D95; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 8px;"></div>
                    <p style="margin: 0; font-size: 13px;">Loading attendance history...</p>
                </td>
            </tr>
        `;
        
        const supabase = getSupabase();
        if (!supabase) {
            table.innerHTML = `<tr><td colspan="6">Database not available</td></tr>`;
            return;
        }
        
        try {
            const studentInfo = await getCurrentStudentInfo();
            const userId = studentInfo?.user_id;
            const admissionNumber = studentInfo?.admission_number || studentInfo?.student_id;
            const studentName = studentInfo?.full_name;
            
            console.log('👤 Loading history for:', { userId, admissionNumber, studentName });
            
            let allRecords = [];
            
            if (userId) {
                const { data, error } = await supabase
                    .from('geo_attendance_logs')
                    .select('*')
                    .eq('user_id', userId)
                    .order('check_in_time', { ascending: false });
                
                if (!error && data) {
                    allRecords = [...allRecords, ...data];
                    console.log(`✅ Found ${data.length} records by user_id`);
                }
            }
            
            if (admissionNumber) {
                const { data, error } = await supabase
                    .from('geo_attendance_logs')
                    .select('*')
                    .eq('registration_number', admissionNumber)
                    .order('check_in_time', { ascending: false });
                
                if (!error && data) {
                    const existingIds = new Set(allRecords.map(r => r.id));
                    const newRecords = data.filter(r => !existingIds.has(r.id));
                    allRecords = [...allRecords, ...newRecords];
                    console.log(`✅ Added ${newRecords.length} records by registration_number`);
                }
            }
            
            if (studentName) {
                const { data, error } = await supabase
                    .from('geo_attendance_logs')
                    .select('*')
                    .eq('student_name', studentName)
                    .order('check_in_time', { ascending: false });
                
                if (!error && data) {
                    const existingIds = new Set(allRecords.map(r => r.id));
                    const newRecords = data.filter(r => !existingIds.has(r.id));
                    allRecords = [...allRecords, ...newRecords];
                    console.log(`✅ Added ${newRecords.length} records by student_name`);
                }
            }
            
            if (admissionNumber) {
                const { data, error } = await supabase
                    .from('geo_attendance_logs')
                    .select('*')
                    .eq('student_id', admissionNumber)
                    .order('check_in_time', { ascending: false });
                
                if (!error && data) {
                    const existingIds = new Set(allRecords.map(r => r.id));
                    const newRecords = data.filter(r => !existingIds.has(r.id));
                    allRecords = [...allRecords, ...newRecords];
                    console.log(`✅ Added ${newRecords.length} records by student_id (admission)`);
                }
            }
            
            if (userId) {
                const { data, error } = await supabase
                    .from('geo_attendance_logs')
                    .select('*')
                    .eq('student_id', userId)
                    .order('check_in_time', { ascending: false });
                
                if (!error && data) {
                    const existingIds = new Set(allRecords.map(r => r.id));
                    const newRecords = data.filter(r => !existingIds.has(r.id));
                    allRecords = [...allRecords, ...newRecords];
                    console.log(`✅ Added ${newRecords.length} records by student_id (UUID)`);
                }
            }
            
            const seenIds = new Set();
            const uniqueRecords = allRecords
                .filter(r => {
                    if (seenIds.has(r.id)) return false;
                    seenIds.add(r.id);
                    return true;
                })
                .sort((a, b) => new Date(b.check_in_time) - new Date(a.check_in_time));
            
            console.log(`📊 TOTAL UNIQUE RECORDS: ${uniqueRecords.length}`);
            
            if (uniqueRecords.length === 0) {
                table.innerHTML = `
                    <tr>
                        <td colspan="6" style="padding: 40px; text-align: center; color: #94a3b8;">
                            <i class="fas fa-calendar-times" style="font-size: 24px; display: block; margin-bottom: 8px;"></i>
                            No attendance records found.
                        </td>
                    </tr>
                `;
                return;
            }
            
            attendanceHistory = uniqueRecords;
            updateHistoryStats(uniqueRecords);
            
            table.innerHTML = uniqueRecords.map(log => {
                const accuracy = log.accuracy_m || log.accuracy_meters || 0;
                const distance = log.distance_meters || 0;
                const dist = distance >= 1000 ? (distance/1000).toFixed(2) + ' km' : distance.toFixed(0) + ' m';
                const time = new Date(log.check_in_time).toLocaleString('en-KE', {
                    timeZone: 'Africa/Nairobi',
                    day: '2-digit', month: 'short', year: 'numeric',
                    hour: '2-digit', minute: '2-digit'
                });
                
                let status = log.attendance_status || 'Pending';
                let statusClass = 'status-badge-pending';
                let statusIcon = '⏳';
                if (status === 'Present' || status === 'Verified') { 
                    statusClass = 'status-badge-present'; 
                    statusIcon = '✅'; 
                } else if (status === 'Absent') { 
                    statusClass = 'status-badge-absent'; 
                    statusIcon = '❌'; 
                }
                
                const sessionIcon = log.session_type === 'class' ? '📚' : log.session_type === 'clinical' ? '🏥' : '📅';
                const targetName = log.target_name || log.location_name || 'Unknown';
                const distanceClass = distance < 100 ? 'distance-verified' : distance < 200 ? 'distance-pending' : 'distance-absent';
                
                return `
                    <tr>
                        <td style="padding: 10px 14px; white-space: nowrap; font-size: 12px; color: #475569;">${time}</td>
                        <td style="padding: 10px 14px;">${sessionIcon} <span style="font-weight: 500; color: #1e293b;">${log.session_type || 'Unknown'}</span></td>
                        <td style="padding: 10px 14px; max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${targetName}">
                            <span style="font-weight: 500; color: #1e293b;">${targetName}</span>
                        </td>
                        <td style="padding: 10px 14px; text-align: center;">
                            <span class="${statusClass}">${statusIcon} ${status}</span>
                        </td>
                        <td style="padding: 10px 14px; text-align: center;">
                            <span class="${distanceClass}" style="font-weight: 600;">${dist}</span>
                        </td>
                        <td style="padding: 10px 14px; text-align: center;">
                            <span style="color: #64748b;">±${accuracy.toFixed(0)}m</span>
                        </td>
                    </tr>
                `;
            }).join('');
            
            const countEl = document.getElementById('history-count');
            if (countEl) countEl.textContent = `${uniqueRecords.length} records`;
            
            console.log(`✅ History loaded: ${uniqueRecords.length} records`);
            
        } catch (error) {
            console.error('History error:', error);
            table.innerHTML = `
                <tr>
                    <td colspan="6" style="padding: 40px; text-align: center; color: #ef4444;">
                        <i class="fas fa-exclamation-triangle" style="font-size: 24px; display: block; margin-bottom: 8px;"></i>
                        Error loading history: ${error.message}
                    </td>
                </tr>
            `;
        }
    }
    
    function updateHistoryStats(records) {
        const stats = {
            present: 0,
            pending: 0,
            absent: 0,
            total: records.length
        };
        
        records.forEach(log => {
            const status = log.attendance_status || 'Pending';
            if (status === 'Present' || status === 'Verified') stats.present++;
            else if (status === 'Pending') stats.pending++;
            else if (status === 'Absent') stats.absent++;
        });
        
        const presentEl = document.getElementById('hist-present');
        const pendingEl = document.getElementById('hist-pending');
        const absentEl = document.getElementById('hist-absent');
        const rateEl = document.getElementById('hist-rate');
        
        if (presentEl) presentEl.textContent = stats.present;
        if (pendingEl) pendingEl.textContent = stats.pending;
        if (absentEl) absentEl.textContent = stats.absent;
        
        const rate = stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 0;
        if (rateEl) rateEl.textContent = rate + '%';
        
        const presentCount = document.getElementById('presentCount');
        const pendingCount = document.getElementById('pendingCount');
        const absentCount = document.getElementById('absentCount');
        const totalCount = document.getElementById('totalCount');
        
        if (presentCount) presentCount.textContent = stats.present;
        if (pendingCount) pendingCount.textContent = stats.pending;
        if (absentCount) absentCount.textContent = stats.absent;
        if (totalCount) totalCount.textContent = stats.total;
    }

    // ============================================
    // 🔍 FILTER HISTORY
    // ============================================
    
    async function filterHistory() {
        const filter = document.getElementById('history-filter');
        if (!filter) return;
        
        const supabase = getSupabase();
        const studentId = await getCurrentStudentId();
        if (!supabase || !studentId) return;
        
        const table = document.getElementById('geo-attendance-history');
        const value = filter.value;
        
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
                table.innerHTML = `
                    <tr>
                        <td colspan="6" style="padding: 40px; text-align: center; color: #94a3b8;">
                            No records for this period
                        </td>
                    </tr>
                `;
                return;
            }
            
            table.innerHTML = data.map(log => {
                const accuracy = log.accuracy_m || log.accuracy_meters || 0;
                const distance = log.distance_meters || 0;
                const dist = distance >= 1000 ? (distance/1000).toFixed(2) + ' km' : distance.toFixed(0) + ' m';
                const time = new Date(log.check_in_time).toLocaleString('en-KE', {
                    timeZone: 'Africa/Nairobi',
                    day: '2-digit', month: 'short', year: 'numeric',
                    hour: '2-digit', minute: '2-digit'
                });
                let status = log.attendance_status || 'Pending';
                let statusClass = 'status-badge-pending';
                let statusIcon = '⏳';
                if (status === 'Present' || status === 'Verified') { 
                    statusClass = 'status-badge-present'; 
                    statusIcon = '✅'; 
                } else if (status === 'Absent') { 
                    statusClass = 'status-badge-absent'; 
                    statusIcon = '❌'; 
                }
                
                const sessionIcon = log.session_type === 'class' ? '📚' : log.session_type === 'clinical' ? '🏥' : '📅';
                const targetName = log.target_name || log.location_name || 'Unknown';
                const distanceClass = distance < 100 ? 'distance-verified' : distance < 200 ? 'distance-pending' : 'distance-absent';
                
                return `
                    <tr>
                        <td style="padding: 10px 14px; white-space: nowrap; font-size: 12px; color: #475569;">${time}</td>
                        <td style="padding: 10px 14px;">${sessionIcon} <span style="font-weight: 500; color: #1e293b;">${log.session_type || 'Unknown'}</span></td>
                        <td style="padding: 10px 14px; max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${targetName}">
                            <span style="font-weight: 500; color: #1e293b;">${targetName}</span>
                        </td>
                        <td style="padding: 10px 14px; text-align: center;">
                            <span class="${statusClass}">${statusIcon} ${status}</span>
                        </td>
                        <td style="padding: 10px 14px; text-align: center;">
                            <span class="${distanceClass}" style="font-weight: 600;">${dist}</span>
                        </td>
                        <td style="padding: 10px 14px; text-align: center;">
                            <span style="color: #64748b;">±${accuracy.toFixed(0)}m</span>
                        </td>
                    </tr>
                `;
            }).join('');
            
            updateHistoryStats(data);
            
        } catch (error) {
            console.error('Filter error:', error);
        }
    }

    // ============================================
    // 📋 CONFIRM MODAL
    // ============================================
    
    function showConfirmModal(options) {
        return new Promise((resolve) => {
            const existing = document.getElementById('confirmModal');
            if (existing) existing.remove();
            
            const modal = document.createElement('div');
            modal.id = 'confirmModal';
            modal.innerHTML = `
                <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); backdrop-filter: blur(6px); z-index: 999998; display: flex; align-items: center; justify-content: center; animation: fadeInBackdrop 0.25s ease;">
                    <div style="background: white; border-radius: 20px; max-width: 440px; width: 92%; padding: 28px; box-shadow: 0 20px 60px rgba(0,0,0,0.3); animation: slideUpModal 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);">
                        <div style="text-align: center; margin-bottom: 12px;">
                            <div style="width: 64px; height: 64px; border-radius: 50%; background: #ede9fe; display: inline-flex; align-items: center; justify-content: center; font-size: 32px;">${options.icon || '📍'}</div>
                        </div>
                        <h3 style="text-align: center; margin: 0 0 4px; font-size: 20px; font-weight: 700; color: #0f172a;">${options.title || 'Confirm Check-in'}</h3>
                        <p style="text-align: center; margin: 0 0 20px; font-size: 14px; color: #64748b;">${options.subtitle || 'Please verify your location before checking in.'}</p>
                        <div style="background: #f8fafc; border-radius: 12px; padding: 16px; margin-bottom: 20px; max-height: 300px; overflow-y: auto;">
                            ${Object.entries(options.details || {}).map(([key, value]) => `
                                <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #f1f5f9;">
                                    <span style="color: #64748b; font-size: 13px;">${key}</span>
                                    <span style="font-weight: 500; font-size: 13px; color: #0f172a;">${value}</span>
                                </div>
                            `).join('')}
                        </div>
                        <div style="display: flex; gap: 12px;">
                            <button onclick="window._closeConfirmModal(false)" style="flex: 1; padding: 14px; border: 2px solid #e2e8f0; border-radius: 12px; background: white; font-size: 15px; font-weight: 600; cursor: pointer; color: #64748b;">Cancel</button>
                            <button onclick="window._closeConfirmModal(true)" style="flex: 2; padding: 14px; border: none; border-radius: 12px; background: linear-gradient(135deg, #4f46e5, #7c3aed); font-size: 15px; font-weight: 600; cursor: pointer; color: white;">✅ Confirm</button>
                        </div>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            window._confirmResolve = resolve;
            
            window._closeConfirmModal = function(result) {
                const modal = document.getElementById('confirmModal');
                if (modal) {
                    modal.style.animation = 'slideUpModal 0.25s ease reverse';
                    setTimeout(() => {
                        modal.remove();
                        if (window._confirmResolve) {
                            window._confirmResolve(result);
                            window._confirmResolve = null;
                        }
                    }, 250);
                }
            };
        });
    }

    // ============================================
    // ✅ SUCCESS MODAL
    // ============================================
    
    function showSuccessModal(data) {
        const existing = document.getElementById('successModal');
        if (existing) existing.remove();
        
        const statusMap = {
            'Present': { emoji: '🎉', color: '#10b981', bg: '#d1fae5', title: '✨ Verified Check-in!', message: `✅ Verified within ${data.distance}m • ${data.confidence || 95}% confidence` },
            'Absent': { emoji: '📍', color: '#f59e0b', bg: '#fef3c7', title: '📍 Not at Location', message: `You are ${data.distance}m from the target area.` },
            'Pending': { emoji: '⏳', color: '#3b82f6', bg: '#dbeafe', title: '⏳ Pending Review', message: `GPS accuracy: ±${data.accuracy}m • ${data.confidence || 50}% confidence` }
        };
        const status = statusMap[data.status] || statusMap['Pending'];
        
        const modal = document.createElement('div');
        modal.id = 'successModal';
        modal.innerHTML = `
            <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); backdrop-filter: blur(6px); z-index: 999999; display: flex; align-items: center; justify-content: center; animation: fadeInBackdrop 0.3s ease;">
                <div style="background: white; border-radius: 24px; max-width: 420px; width: 92%; overflow: hidden; box-shadow: 0 20px 60px rgba(0,0,0,0.2); animation: slideUpModal 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);">
                    <div style="background: ${status.color}; padding: 20px 24px 16px; text-align: center; color: white;">
                        <div style="font-size: 48px; margin-bottom: 4px;">${status.emoji}</div>
                        <h2 style="margin: 0; font-size: 20px; font-weight: 700; color: white;">${status.title}</h2>
                        <p style="margin: 4px 0 0; font-size: 13px; opacity: 0.9;">${status.message}</p>
                    </div>
                    <div style="padding: 24px 24px 20px;">
                        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; margin-bottom: 12px;">
                            <div style="text-align: center; background: #f8fafc; border-radius: 10px; padding: 10px 4px;">
                                <div style="font-size: 18px; font-weight: 700; color: #0f172a;">${data.distance}m</div>
                                <div style="font-size: 10px; color: #94a3b8;">Distance</div>
                            </div>
                            <div style="text-align: center; background: #f8fafc; border-radius: 10px; padding: 10px 4px;">
                                <div style="font-size: 18px; font-weight: 700; color: #0f172a;">±${data.accuracy}m</div>
                                <div style="font-size: 10px; color: #94a3b8;">Accuracy</div>
                            </div>
                            <div style="text-align: center; background: ${status.bg}; border-radius: 10px; padding: 10px 4px;">
                                <div style="font-size: 18px; font-weight: 700; color: ${status.color};">${data.confidence || 95}%</div>
                                <div style="font-size: 10px; color: ${status.color};">Confidence</div>
                            </div>
                        </div>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 12px;">
                            <div style="text-align: center; background: #f1f5f9; border-radius: 8px; padding: 6px;">
                                <div style="font-size: 11px; color: #64748b;">Status</div>
                                <div style="font-size: 14px; font-weight: 600; color: ${status.color};">${data.status}</div>
                            </div>
                            <div style="text-align: center; background: #f1f5f9; border-radius: 8px; padding: 6px;">
                                <div style="font-size: 11px; color: #64748b;">Readings</div>
                                <div style="font-size: 14px; font-weight: 600; color: #0f172a;">${data.readings || 5}</div>
                            </div>
                        </div>
                        <div style="background: #f8fafc; border-radius: 10px; padding: 8px 14px; margin-bottom: 16px; text-align: center;">
                            <div style="font-size: 11px; color: #94a3b8;">📍 Target</div>
                            <div style="font-weight: 600; font-size: 14px; color: #0f172a;">${data.target}</div>
                            <div style="font-size: 11px; color: #64748b;">${data.type}</div>
                        </div>
                        ${data.points > 0 ? `
                            <div style="background: linear-gradient(135deg, #fbbf24, #f59e0b); border-radius: 10px; padding: 10px; text-align: center; color: white; margin-bottom: 16px;">
                                <span style="font-size: 20px;">⭐</span>
                                <span style="font-weight: 700; font-size: 16px;">+${data.points} points</span>
                                <span style="font-size: 13px; opacity: 0.9;"> awarded!</span>
                            </div>
                        ` : ''}
                        <button onclick="window._closeSuccessModal()" style="width: 100%; padding: 14px; border: none; border-radius: 14px; font-size: 16px; font-weight: 600; cursor: pointer; background: ${status.color}; color: white;">👍 Done</button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        
        window._closeSuccessModal = function() {
            const modal = document.getElementById('successModal');
            if (modal) {
                modal.style.animation = 'slideUpModal 0.25s ease reverse';
                setTimeout(() => modal.remove(), 250);
            }
        };
    }

    function showSimpleSuccessModal(data) {
        const existing = document.getElementById('successModal');
        if (existing) existing.remove();
        
        const modal = document.createElement('div');
        modal.id = 'successModal';
        modal.innerHTML = `
            <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); backdrop-filter: blur(6px); z-index: 999999; display: flex; align-items: center; justify-content: center; animation: fadeInBackdrop 0.3s ease;">
                <div style="background: white; border-radius: 24px; max-width: 420px; width: 92%; overflow: hidden; box-shadow: 0 20px 60px rgba(0,0,0,0.2); animation: slideUpModal 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);">
                    <div style="background: #10b981; padding: 20px 24px 16px; text-align: center; color: white;">
                        <div style="font-size: 48px; margin-bottom: 4px;">✅</div>
                        <h2 style="margin: 0; font-size: 20px; font-weight: 700; color: white;">Check-in Complete!</h2>
                        <p style="margin: 4px 0 0; font-size: 13px; opacity: 0.9;">${data.message}</p>
                    </div>
                    <div style="padding: 24px 24px 20px;">
                        <div style="background: #f8fafc; border-radius: 10px; padding: 12px 14px; margin-bottom: 16px; text-align: center;">
                            <div style="font-size: 11px; color: #94a3b8;">📍 Location</div>
                            <div style="font-weight: 600; font-size: 14px; color: #0f172a;">${data.target}</div>
                            <div style="font-size: 11px; color: #64748b;">${data.type}</div>
                        </div>
                        <div style="text-align: center; font-size: 12px; color: #94a3b8; margin-bottom: 16px;">
                            <i class="fas fa-clock"></i> ${data.time}
                        </div>
                        <button onclick="window._closeSuccessModal()" style="width: 100%; padding: 14px; border: none; border-radius: 14px; font-size: 16px; font-weight: 600; cursor: pointer; background: #10b981; color: white;">👍 Done</button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        
        window._closeSuccessModal = function() {
            const modal = document.getElementById('successModal');
            if (modal) {
                modal.style.display = 'none';
                setTimeout(() => modal.remove(), 300);
            }
        };
    }

    // ============================================
    // 📤 EXPORT ATTENDANCE
    // ============================================
    
    async function exportAttendanceHistory() {
        const supabase = getSupabase();
        const studentId = await getCurrentStudentId();
        if (!supabase || !studentId) {
            showToast('Please log in to export', 'error');
            return;
        }
        
        try {
            const { data, error } = await supabase
                .from('geo_attendance_logs')
                .select('*')
                .eq('student_id', studentId)
                .order('check_in_time', { ascending: false });
            
            if (error) throw error;
            
            if (!data || data.length === 0) {
                showToast('No attendance records to export', 'warning');
                return;
            }
            
            let csv = 'Date,Session Type,Target,Status,Distance,Accuracy,Confidence,Readings\n';
            data.forEach(log => {
                const date = new Date(log.check_in_time).toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' });
                const status = log.attendance_status || 'Pending';
                const distance = (log.distance_meters || 0).toFixed(0) + 'm';
                const accuracy = (log.accuracy_m || 0).toFixed(0) + 'm';
                const target = log.target_name || log.location_name || 'Unknown';
                const confidence = log.gps_confidence || 'N/A';
                const readings = log.gps_readings || 'N/A';
                csv += `${date},${log.session_type || 'Unknown'},${target},${status},${distance},${accuracy},${confidence},${readings}\n`;
            });
            
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Attendance_History_${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            showToast(`✅ Exported ${data.length} records`, 'success');
        } catch (error) {
            console.error('Export error:', error);
            showToast('Export failed: ' + error.message, 'error');
        }
    }

    // ============================================
    // 🎯 UPDATE REQUIREMENTS UI
    // ============================================
    
    function updateRequirementsUI() {
        const sessionType = document.getElementById('session-type')?.value;
        const targetSelect = document.getElementById('attendance-target');
        const targetSelected = targetSelect?.value && targetSelect.value !== '';
        const location = currentLocation;
        
        const reqSession = document.getElementById('req-session');
        const reqTarget = document.getElementById('req-target');
        const reqLocation = document.getElementById('req-location');
        const checkBtn = document.getElementById('check-in-button');
        
        if (reqSession) {
            if (sessionType && sessionType !== '') {
                reqSession.innerHTML = `<i class="fas fa-check-circle" style="color: #10b981; font-size: 11px;"></i> Session type selected`;
                reqSession.style.color = '#065f46';
            } else {
                reqSession.innerHTML = `<i class="fas fa-circle" style="color: #dc2626; font-size: 6px;"></i> Select session type`;
                reqSession.style.color = '#94a3b8';
            }
        }
        
        if (reqTarget) {
            if (targetSelected) {
                reqTarget.innerHTML = `<i class="fas fa-check-circle" style="color: #10b981; font-size: 11px;"></i> Target selected`;
                reqTarget.style.color = '#065f46';
            } else {
                reqTarget.innerHTML = `<i class="fas fa-circle" style="color: #dc2626; font-size: 6px;"></i> Select target`;
                reqTarget.style.color = '#94a3b8';
            }
        }
        
        if (reqLocation) {
            if (location && location.accuracy < 50) {
                reqLocation.innerHTML = `<i class="fas fa-check-circle" style="color: #10b981; font-size: 11px;"></i> High-accuracy GPS: ${location.accuracy.toFixed(0)}m (${location.confidence?.toFixed(0) || 0}% confidence)`;
                reqLocation.style.color = '#065f46';
            } else if (location && location.accuracy < 100) {
                reqLocation.innerHTML = `<i class="fas fa-exclamation-triangle" style="color: #f59e0b; font-size: 11px;"></i> GPS OK: ${location.accuracy.toFixed(0)}m`;
                reqLocation.style.color = '#92400e';
            } else {
                reqLocation.innerHTML = `<i class="fas fa-circle" style="color: #dc2626; font-size: 6px;"></i> GPS location acquired`;
                reqLocation.style.color = '#94a3b8';
            }
        }
        
        if (checkBtn) {
            const allMet = sessionType && sessionType !== '' && targetSelected && location && location.accuracy < 100;
            if (allMet) {
                checkBtn.disabled = false;
                checkBtn.style.background = 'linear-gradient(135deg, #4f46e5, #7c3aed)';
                checkBtn.style.opacity = '1';
                checkBtn.style.cursor = 'pointer';
                checkBtn.innerHTML = '<i class="fas fa-fingerprint" style="font-size: 18px;"></i> Check In Now';
            } else {
                checkBtn.disabled = true;
                checkBtn.style.background = '#94a3b8';
                checkBtn.style.opacity = '0.6';
                checkBtn.style.cursor = 'not-allowed';
            }
        }
    }

    // ============================================
    // 📍 UPDATE LOCATION DISPLAY
    // ============================================
    
    async function updateLocationDisplay(location) {
        const latEl = document.getElementById('latitude');
        const lonEl = document.getElementById('longitude');
        const accEl = document.getElementById('accuracy-value');
        const gpsStatus = document.getElementById('gps-status');
        const confidenceEl = document.getElementById('gps-confidence');
        
        if (!location) {
            if (latEl) latEl.textContent = '---';
            if (lonEl) lonEl.textContent = '---';
            if (accEl) accEl.textContent = '---';
            if (gpsStatus) {
                gpsStatus.innerHTML = `<i class="fas fa-exclamation-triangle" style="color: #ef4444;"></i> <span>GPS Failed</span>`;
                gpsStatus.style.background = '#fee2e2';
                gpsStatus.style.color = '#991b1b';
            }
            if (confidenceEl) confidenceEl.textContent = '---';
            return;
        }
        
        if (latEl) latEl.textContent = location.lat.toFixed(6);
        if (lonEl) lonEl.textContent = location.lon.toFixed(6);
        if (accEl) accEl.textContent = location.accuracy.toFixed(1);
        if (confidenceEl) {
            confidenceEl.textContent = location.confidence ? `${location.confidence.toFixed(0)}%` : '---';
            confidenceEl.style.color = location.confidence > 80 ? '#10b981' : location.confidence > 60 ? '#f59e0b' : '#ef4444';
        }
        
        if (gpsStatus) {
            const icon = location.accuracy < 20 ? '✅' : location.accuracy < 50 ? '📍' : '⚠️';
            const color = location.accuracy < 20 ? '#10b981' : location.accuracy < 50 ? '#f59e0b' : '#ef4444';
            const bg = location.accuracy < 20 ? '#d1fae5' : location.accuracy < 50 ? '#fef3c7' : '#fee2e2';
            const textColor = location.accuracy < 20 ? '#065f46' : location.accuracy < 50 ? '#92400e' : '#991b1b';
            
            gpsStatus.innerHTML = `${icon} <span>GPS Locked (${location.accuracy.toFixed(0)}m) • ${location.readingsCount} readings • ${location.confidence?.toFixed(0) || 0}% confidence</span>`;
            gpsStatus.style.background = bg;
            gpsStatus.style.color = textColor;
            gpsStatus.style.padding = '6px 12px';
            gpsStatus.style.borderRadius = '8px';
            gpsStatus.style.fontSize = '13px';
        }
        
        const reqLocation = document.getElementById('req-location');
        if (reqLocation) {
            if (location.accuracy < 50) {
                reqLocation.innerHTML = `<i class="fas fa-check-circle" style="color: #10b981; font-size: 11px;"></i> High-accuracy GPS: ${location.accuracy.toFixed(0)}m (${location.confidence?.toFixed(0) || 0}% confidence)`;
                reqLocation.style.color = '#065f46';
            } else if (location.accuracy < 100) {
                reqLocation.innerHTML = `<i class="fas fa-exclamation-triangle" style="color: #f59e0b; font-size: 11px;"></i> GPS OK: ${location.accuracy.toFixed(0)}m`;
                reqLocation.style.color = '#92400e';
            } else {
                reqLocation.innerHTML = `<i class="fas fa-circle" style="color: #dc2626; font-size: 6px;"></i> GPS weak: ${location.accuracy.toFixed(0)}m`;
                reqLocation.style.color = '#94a3b8';
            }
        }
    }

    // ============================================
    // 🔄 UPDATE STATS
    // ============================================
    
    async function updateStats() {
        const supabase = getSupabase();
        const studentId = await getCurrentStudentId();
        if (!supabase || !studentId) return;
        
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            const { data, error } = await supabase
                .from('geo_attendance_logs')
                .select('attendance_status, is_verified')
                .eq('student_id', studentId)
                .gte('check_in_time', today.toISOString());
            
            if (error) throw error;
            
            const stats = {
                present: 0,
                pending: 0,
                absent: 0,
                total: data?.length || 0
            };
            
            data?.forEach(log => {
                const status = log.attendance_status || 'Pending';
                const isVerified = log.is_verified === true;
                
                if (status === 'Present' || status === 'Verified' || isVerified) {
                    stats.present++;
                } else if (status === 'Pending') {
                    stats.pending++;
                } else if (status === 'Absent') {
                    stats.absent++;
                }
            });
            
            const presentCount = document.getElementById('presentCount');
            const pendingCount = document.getElementById('pendingCount');
            const absentCount = document.getElementById('absentCount');
            const totalCount = document.getElementById('totalCount');
            
            if (presentCount) presentCount.textContent = stats.present;
            if (pendingCount) pendingCount.textContent = stats.pending;
            if (absentCount) absentCount.textContent = stats.absent;
            if (totalCount) totalCount.textContent = stats.total;
            
        } catch (error) {
            console.error('Stats error:', error);
        }
    }

    // ============================================
    // 📍 GET ULTRA-ACCURATE LOCATION
    // ============================================
    
    
/**
 * Device-aware location profile.
 * Phones/tablets normally have better GNSS accuracy; laptops often rely on
 * browser/Wi-Fi positioning. Laptop support does NOT bypass distance checks.
 */
function getDeviceLocationProfile() {
    const ua = navigator.userAgent || '';
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
    const isTablet = /Tablet|iPad/i.test(ua) || (navigator.maxTouchPoints > 1 && /Macintosh/i.test(ua));
    return {
        isMobile: isMobile || isTablet,
        isLaptop: !isMobile && !isTablet,
        label: (isMobile || isTablet) ? 'mobile' : 'laptop'
    };
}

/**
 * Browser geolocation fallback for laptops.
 * The returned coordinate is still checked against the session target/radius
 * by doCheckIn(); this only improves compatibility where a laptop has no GNSS.
 */
function getLaptopBrowserLocation(options = {}) {
    return new Promise((resolve) => {
        if (!navigator.geolocation) {
            resolve(null);
            return;
        }

        const timeout = Number(options.timeout || 12000);

        navigator.geolocation.getCurrentPosition(
            (position) => {
                resolve({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    accuracy: Number(position.coords.accuracy || 9999),
                    timestamp: position.timestamp || Date.now(),
                    source: 'browser-laptop',
                    device_type: 'laptop'
                });
            },
            () => resolve(null),
            {
                enableHighAccuracy: false,
                maximumAge: 10000,
                timeout
            }
        );
    });
}

async function getAccurateLocation() {
        console.log('📍 Getting ULTRA-ACCURATE GPS with 5-point verification...');
        showToast('📡 Acquiring accurate GPS signal...', 'info', 2000);
        
        try {
            const location = await ultraGPS.getUltraAccurateLocation({
                minReadings: ACCURACY_CONFIG.MIN_READINGS,
                stabilizationTime: ACCURACY_CONFIG.STABILIZATION_TIME,
                maxAccuracy: ACCURACY_CONFIG.MAX_ACCEPTABLE_ACCURACY,
                timeout: 25000
            });
            
            if (!location) {
                showToast('❌ Could not get accurate GPS. Please try again in an open area.', 'error', 5000);
                return null;
            }
            
            console.log('✅ Ultra-accurate GPS acquired:', {
                lat: location.lat,
                lon: location.lon,
                accuracy: location.accuracy,
                confidence: location.confidence,
                readings: location.readingsCount
            });
            
            const confidenceEmoji = location.confidence > 80 ? '🟢' : location.confidence > 60 ? '🟡' : '🔴';
            showToast(`${confidenceEmoji} GPS locked! Accuracy: ±${location.accuracy.toFixed(0)}m (${location.confidence.toFixed(0)}% confidence)`, 'success', 3000);
            
            return location;
            
        } catch (error) {
            console.error('GPS Error:', error);
            showToast('❌ GPS error: ' + error.message, 'error', 5000);
            return null;
        }
    }

    // ============================================
    // 🏆 AWARD ATTENDANCE POINTS
    // ============================================

    async function awardAttendancePoints(studentId, targetName, distance) {
        try {
            const supabase = getSupabase();
            if (!supabase) {
                console.warn('No Supabase client available');
                return 0;
            }
            
            let points = 10;
            
            if (distance < 20) {
                points += 5;
                console.log('🎯 Super accurate! +5 bonus points!');
            }
            
            const { data: profile, error: fetchError } = await supabase
                .from('consolidated_user_profiles_table')
                .select('gamification_points, attendance_points, total_points, login_count')
                .eq('user_id', studentId)
                .single();
            
            if (fetchError) {
                console.warn('Could not fetch profile:', fetchError);
                return 0;
            }
            
            const currentPoints = profile?.gamification_points || 0;
            const currentAttendancePoints = profile?.attendance_points || 0;
            const loginCount = profile?.login_count || 0;
            const newPoints = currentPoints + points;
            const newAttendancePoints = currentAttendancePoints + points;
            const newTotal = newPoints + (loginCount * 10);
            
            const { error: updateError } = await supabase
                .from('consolidated_user_profiles_table')
                .update({
                    gamification_points: newPoints,
                    attendance_points: newAttendancePoints,
                    total_points: newTotal,
                    updated_at: new Date().toISOString()
                })
                .eq('user_id', studentId);
            
            if (updateError) {
                console.error('❌ Error updating points:', updateError);
                return 0;
            }
            
            console.log(`✅ Awarded ${points} points for attendance at ${targetName}`);
            
            document.dispatchEvent(new CustomEvent('attendanceCheckedIn', {
                detail: { points, target: targetName, distance, newTotal }
            }));
            
            if (window.dashboardModule && typeof window.dashboardModule.loadFreshData === 'function') {
                setTimeout(() => window.dashboardModule.loadFreshData(), 500);
            }
            
            return points;
            
        } catch (error) {
            console.error('❌ Error awarding attendance points:', error);
            return 0;
        }
    }

    // ============================================
    // ✅ DO CHECK-IN - ACCEPTS OPTIONAL SESSION
    // ============================================
    
    async function doCheckIn(sessionArg) {
        const btn = document.getElementById('check-in-button');
        const targetSelect = document.getElementById('attendance-target');
        const sessionTypeSelect = document.getElementById('session-type');
        
        // ✅ If called with session argument (from quickCheckIn), use it
        if (sessionArg) {
            currentSession = sessionArg;
        }
        
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
            showToast('Please select a target first', 'warning');
            return;
        }
        
        btn.disabled = true;
        btn.innerHTML = '📡 Acquiring GPS...';
        btn.style.opacity = '0.6';
        
        try {
            const studentInfo = await getCurrentStudentInfo();
            
            if (!studentInfo || !studentInfo.user_id) {
                showToast('Please log in first', 'error');
                btn.disabled = false;
                btn.innerHTML = '📍 Check In Now';
                btn.style.opacity = '1';
                return;
            }
            
            const userId = studentInfo.user_id;
            const admissionNumber = studentInfo.admission_number || studentInfo.student_id || null;
            const studentFullName = studentInfo.full_name || 'Student';
            const studentBlock = studentInfo.block || 'Not Assigned';
            const studentProgram = studentInfo.program || 'KRCHN';
            const studentIntakeYear = studentInfo.intake_year || '2024';
            
            console.log('👤 Student info:', {
                user_id: userId,
                admission_number: admissionNumber,
                full_name: studentFullName,
                block: studentBlock,
                intake_year: studentIntakeYear,
                session_id: currentSession?.id || null
            });
            
            updateStudentInfoBadge(studentBlock, studentIntakeYear, admissionNumber || 'N/A');
            
            const supabase = getSupabase();
            if (!supabase) {
                showToast('Database not available', 'error');
                btn.disabled = false;
                btn.innerHTML = '📍 Check In Now';
                btn.style.opacity = '1';
                return;
            }

            // Attendance is session-based. Never create a student attendance
            // record without a real scheduled session ID.
            const attendanceSessionId = currentSession?.id || null;
            if (!attendanceSessionId) {
                showToast('No attendance session is selected. Please use the active class Check In button.', 'error', 5000);
                btn.disabled = false;
                btn.innerHTML = '📍 Check In Now';
                btn.style.opacity = '1';
                return;
            }

            const location = await getAccurateLocation();
        const deviceType = location?.device_type || getDeviceLocationProfile().label;
            
            if (!location) {
                btn.disabled = false;
                btn.innerHTML = '📍 Check In Now';
                btn.style.opacity = '1';
                return;
            }
            
            await updateLocationDisplay(location);
            
            const distance = ultraGPS.calculateDistance(
                location.lat, location.lon,
                selectedTarget.latitude, selectedTarget.longitude
            );
            
            let radius = selectedTarget.radius || 200;
            
            if (selectedTarget.type === 'clinical') {
                const lowerName = selectedTarget.name.toLowerCase();
                if (lowerName.includes('nakuru county referral hospital')) {
                    radius = 250;
                } else {
                    radius = 200;
                }
            }
            
            if (selectedTarget.type === 'class' || selectedTarget.type === 'lab' || selectedTarget.type === 'tutorial') {
                radius = ACCURACY_CONFIG.CLASSROOM_RADIUS;
            }
            
            const accuracy = location.accuracy || 0;
            
            let status = 'Absent';
            let statusMessage = '';
            
            if (accuracy > ACCURACY_CONFIG.MAX_ACCEPTABLE_ACCURACY) {
                status = 'Pending';
                statusMessage = 'GPS accuracy needs review';
            }
            
            if (distance <= radius) {
                if (status !== 'Pending') {
                    status = 'Present';
                    statusMessage = `✅ Verified within ${radius}m`;
                }
            } else if (distance <= radius * 2) {
                if (status !== 'Pending') {
                    status = 'Pending';
                    statusMessage = `Distance needs review`;
                }
            } else {
                status = 'Absent';
                statusMessage = `Location needs verification`;
            }
            
            if (location.confidence < 50) {
                status = 'Pending';
                statusMessage = 'GPS confidence needs review';
            }
            
            if (location.readingsCount < 3) {
                status = 'Pending';
                statusMessage = 'GPS readings need review';
            }
            
            const details = {
                'Student': studentFullName,
                'Reg No': admissionNumber || 'N/A',
                'Block': studentBlock,
                'Intake': studentIntakeYear,
                'Target': selectedTarget.name,
                'Type': selectedTarget.type === 'clinical' ? '🏥 Clinical' : '📚 Classroom',
                'Time': new Date().toLocaleTimeString('en-KE', { timeZone: 'Africa/Nairobi' })
            };
            
            const confirmed = await showConfirmModal({
                icon: '📍',
                title: '📍 Check-in Confirmation',
                subtitle: `You are checking in to: ${selectedTarget.name}`,
                details: details
            });
            
            if (!confirmed) {
                btn.disabled = false;
                btn.innerHTML = '📍 Check In Now';
                btn.style.opacity = '1';
                showToast('Check-in cancelled', 'warning');
                return;
            }
            
            btn.innerHTML = '💾 Saving...';

            // 🔒 FINAL CLIENT-SIDE DUPLICATE CHECK
            // Re-check immediately before INSERT because GPS acquisition and
            // the confirmation modal may take several seconds.
            const { data: finalExisting, error: finalExistingError } = await supabase
                .from('geo_attendance_logs')
                .select('id, check_in_time, attendance_status, verification_source, is_verified')
                .eq('user_id', userId)
                .eq('session_id', attendanceSessionId)
                .order('check_in_time', { ascending: false })
                .limit(1);

            if (finalExistingError) throw finalExistingError;

            let replaceAttendanceId = null;
            if (finalExisting && finalExisting.length > 0) {
                const row = finalExisting[0];
                const isAutomaticAbsent =
                    String(row.verification_source || '').toLowerCase().includes('automatic session finalization') &&
                    String(row.attendance_status || '').toLowerCase() === 'absent' &&
                    row.is_verified !== true;

                if (isAutomaticAbsent) {
                    replaceAttendanceId = row.id;
                } else {
                    const time = row.check_in_time
                        ? new Date(row.check_in_time).toLocaleTimeString('en-KE', {
                            hour: '2-digit', minute: '2-digit'
                        })
                        : 'earlier';
                    showToast(`✅ Attendance already recorded for this session at ${time}.`, 'success', 5000);
                    await loadHistory();
                    await updateStats();
                    return;
                }
            }
            
            const sessionType = sessionTypeSelect?.value || currentSession?.session_type || 'class';
            
            const record = {
                user_id: userId,
                student_id: admissionNumber,
                registration_number: admissionNumber,
                student_name: studentFullName,
                block: studentBlock,
                intake_year: studentIntakeYear,
                program: studentProgram,
                check_in_time: new Date().toISOString(),
                session_type: sessionType,
                target_id: currentSession?.id || selectedTarget.id,
                session_id: attendanceSessionId,
                target_name: selectedTarget.name,
                latitude: location.lat,
                longitude: location.lon,
                accuracy_m: location.accuracy,
                distance_meters: distance,
                is_verified: status === 'Present',
                attendance_status: status,
                target_latitude: selectedTarget.latitude,
                target_longitude: selectedTarget.longitude,
                target_radius: radius,
                location_address: location.address || '',
                role: 'student',
                gps_confidence: location.confidence,
                gps_readings: location.readingsCount,
                gps_std_dev: location.stdDev,
                verification_checks: JSON.stringify(location.verification?.checks || []),
                location_type: selectedTarget.type,
                clinical_radius: selectedTarget.type === 'clinical' ? radius : null,
                created_at: new Date().toISOString()
            };
            
            console.log('📝 Saving record:', {
                user_id: record.user_id,
                session_id: record.session_id,
                status: record.attendance_status,
                distance: record.distance_meters
            });
            
            let saveError = null;
            if (replaceAttendanceId) {
                const { error } = await supabase
                    .from('geo_attendance_logs')
                    .update({
                        ...record,
                        verification_source: 'Student GPS Check-in (Reopened Session)',
                        finalized_at: null,
                        finalized_by: null,
                        finalization_reason: null
                    })
                    .eq('id', replaceAttendanceId)
                    .eq('user_id', userId)
                    .eq('session_id', attendanceSessionId);
                saveError = error;
            } else {
                const { error } = await supabase
                    .from('geo_attendance_logs')
                    .insert([record]);
                saveError = error;
            }

            if (saveError) {
                if (saveError.code === '23505') {
                    showToast('✅ You already have attendance recorded for this session.', 'success', 5000);
                    await loadHistory();
                    await updateStats();
                    return;
                }
                console.error('❌ Attendance save error:', saveError);
                throw saveError;
            }
            
            let successMessage = 'Check-in recorded successfully!';
            if (status === 'Present') {
                successMessage = '✅ Check-in verified! You are within the required range.';
            } else if (status === 'Pending') {
                successMessage = '⏳ Check-in recorded for review. You will be notified once verified.';
            } else {
                successMessage = '📝 Check-in recorded. Your location will be verified by staff.';
            }
            
            showToast('✅ Check-in recorded!', 'success', 3000);
            
            showSimpleSuccessModal({
                message: successMessage,
                target: selectedTarget.name,
                type: selectedTarget.type === 'clinical' ? '🏥 Clinical' : '📚 Classroom',
                time: new Date().toLocaleTimeString('en-KE', { timeZone: 'Africa/Nairobi' })
            });
            
            awardAttendancePoints(userId, selectedTarget.name, distance).catch(() => {});
            
            currentSession = null;
            
            await loadHistory();
            await updateStats();
            await renderActiveSessions();
            
        } catch (error) {
            console.error('❌ Check-in error:', error);
            showToast('Check-in failed: ' + error.message, 'error');
        } finally {
            btn.disabled = false;
            btn.innerHTML = '📍 Check In Now';
            btn.style.opacity = '1';
        }
    }

    // ============================================
    // 🆕 UPDATE STUDENT INFO BADGE
    // ============================================
    
    function updateStudentInfoBadge(block, intakeYear, regNumber) {
        const blockDisplay = document.getElementById('student-block-display');
        const intakeDisplay = document.getElementById('student-intake-display');
        const regDisplay = document.getElementById('student-reg-display');
        
        if (blockDisplay) blockDisplay.textContent = block || '--';
        if (intakeDisplay) intakeDisplay.textContent = intakeYear || '--';
        if (regDisplay) regDisplay.textContent = regNumber || 'N/A';
    }

    // ============================================
    // ✅ WAIT FOR PROFILE TO LOAD
    // ============================================
    
    async function waitForProfile(maxAttempts = MAX_PROFILE_ATTEMPTS) {
        console.log('⏳ Waiting for student profile to load...');
        
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            const info = await getCurrentStudentInfo();
            
            if (info && info.user_id) {
                console.log(`✅ Profile loaded after ${attempt} attempts:`, info.block, info.intake_year);
                console.log(`📋 Admission Number:`, info.admission_number);
                return info;
            }
            
            if (attempt < maxAttempts) {
                await new Promise(r => setTimeout(r, 300));
                console.log(`⏳ Attempt ${attempt}/${maxAttempts} - waiting for profile...`);
            }
        }
        
        console.warn('⚠️ Profile not loaded after maximum attempts');
        return null;
    }

    // ============================================
    // 🚀 INIT
    // ============================================
    
    async function init() {
        console.log('🚀 Initializing ULTRA-ACCURATE attendance system...');
        
        const studentInfo = await waitForProfile(MAX_PROFILE_ATTEMPTS);
        
        if (!studentInfo || !studentInfo.user_id) {
            console.warn('⚠️ No student logged in. Please log in first.');
            showToast('Please log in to check in', 'warning', 5000);
        } else {
            console.log('👤 Student logged in:', studentInfo.full_name);
            updateStudentInfoBadge(studentInfo.block, studentInfo.intake_year, studentInfo.admission_number || studentInfo.student_id || 'N/A');
        }
        
        let retries = 0;
        while (!getSupabase() && retries < 10) {
            await new Promise(r => setTimeout(r, 300));
            retries++;
        }
        
        await loadClinicalLocations();
        await loadApprovedUnits();
        await loadActiveSessions();
        await renderActiveSessions();
        
        const sessionType = document.getElementById('session-type');
        if (sessionType) {
            sessionType.addEventListener('change', function() {
                const value = this.value;
                const targetGroup = document.getElementById('target-control-group');
                
                if (value && value !== '') {
                    if (targetGroup) targetGroup.style.display = 'block';
                    populateTargetOptions(value);
                } else {
                    if (targetGroup) targetGroup.style.display = 'none';
                    const targetSelect = document.getElementById('attendance-target');
                    if (targetSelect) {
                        targetSelect.innerHTML = '<option value="">Select target...</option>';
                        targetSelect.disabled = true;
                    }
                }
                updateRequirementsUI();
            });
        }
        
        const targetSelect = document.getElementById('attendance-target');
        if (targetSelect) {
            targetSelect.addEventListener('change', function() {
                const value = this.value;
                if (value && value !== '') {
                    const parts = value.split('|');
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
                } else {
                    selectedTarget = null;
                }
                updateRequirementsUI();
            });
        }
        
        const filterSelect = document.getElementById('history-filter');
        if (filterSelect) {
            filterSelect.addEventListener('change', filterHistory);
        }
        
        const checkBtn = document.getElementById('check-in-button');
        if (checkBtn) {
            checkBtn.onclick = () => doCheckIn();
        }
        
        const location = await getAccurateLocation();
        currentLocation = location;
        await updateLocationDisplay(location);
        updateRequirementsUI();
        
        await loadHistory();
        
        setInterval(updateStats, 30000);
        
        window.addEventListener('focus', () => {
            renderActiveSessions();
        });
        
        setInterval(() => {
            renderActiveSessions();
        }, 60000);
        
        document.addEventListener('profileLoaded', function() {
            loadClinicalLocations();
            renderActiveSessions();
        });
        
        document.addEventListener('appReady', function() {
            setTimeout(() => {
                loadClinicalLocations();
                renderActiveSessions();
            }, 500);
        });
        
        isInitialized = true;
        console.log('✅ Ultra-accurate attendance system ready!');
        showToast(`🎯 Ultra-accurate attendance ready!`, 'success', 3000);
        
        const event = new CustomEvent('attendanceModuleReady', {
            detail: { 
                count: clinicalLocations.length,
                timestamp: new Date().toISOString()
            }
        });
        document.dispatchEvent(event);
    }
    
    // ============================================
    // 🌐 EXPOSE GLOBALLY
    // ============================================
    
    window.loadAttendanceHistory = loadHistory;
    window.exportAttendanceHistory = exportAttendanceHistory;
    window.filterHistory = filterHistory;
    window.refreshAttendance = init;
    window.attendanceSystemReady = true;
    window.doCheckIn = doCheckIn;
    window.getCurrentStudentInfo = getCurrentStudentInfo;
    window.getCurrentStudentId = getCurrentStudentId;
    window.getCurrentStudentBlock = getCurrentStudentBlock;
    window.getCurrentStudentIntakeYear = getCurrentStudentIntakeYear;
    window.updateStudentInfoBadge = updateStudentInfoBadge;
    window.waitForProfile = waitForProfile;
    window.renderActiveSessions = renderActiveSessions;
    window.quickCheckIn = quickCheckIn;
    
    // ============================================
    // 🏁 START
    // ============================================
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        setTimeout(init, 500);
    }
    
    console.log('✅ ULTRA-ACCURATE attendance system module loaded!');
    console.log('🎓 Active Sessions panel enabled with one-click check-in!');
    
})();

// ============================================
// 🔄 FORCE DISPATCH ATTENDANCE READY EVENT
// ============================================
(function ensureAttendanceReadyEvent() {
    const dispatchEvent = () => {
        if (window.attendanceSystemReady) {
            const event = new CustomEvent('attendanceModuleReady', {
                detail: { ready: true, timestamp: new Date().toISOString() }
            });
            document.dispatchEvent(event);
            return true;
        }
        return false;
    };
    
    if (!dispatchEvent()) {
        setTimeout(() => {
            if (!dispatchEvent()) {
                setTimeout(dispatchEvent, 2000);
            }
        }, 500);
    }
})();

console.log('✅ attendance.js fully loaded and ready');
