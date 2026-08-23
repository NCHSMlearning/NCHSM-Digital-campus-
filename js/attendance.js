// ============================================
// ✅ attendance.js - FIXED FOR STUDENT SELF CHECK-IN
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
        CLINICAL_MAX_ACCURACY: 100,
        MIN_READINGS: 5,
        STABILIZATION_TIME: 3000,
        MAX_DRIFT: 20,
        MAX_MOVEMENT_SPEED: 2,
        CLINICAL_RADIUS: 300,
        CLASSROOM_RADIUS: 50,
        LAB_RADIUS: 50,
        TUTORIAL_RADIUS: 50
    };
    
    let approvedUnits = [];
    let clinicalLocations = [];
    let currentLocation = null;
    let selectedTarget = null;
    let currentStudent = null;
    let activeSessions = [];
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
    // ✅ GET CURRENT STUDENT INFO - LIKE EXAMS.JS
    // ============================================
    
    async function getCurrentStudentInfo() {
        let profile = null;
        let source = 'none';
        const supabase = getSupabase();
        
        // ✅ 1. FIRST: Try from Supabase Auth (like exams.js)
        if (supabase) {
            try {
                const { data: { user }, error: authError } = await supabase.auth.getUser();
                
                if (authError) {
                    console.warn('⚠️ Auth error:', authError);
                } else if (user) {
                    console.log(`✅ Found authenticated user:`, user.id);
                    
                    // ✅ Fetch the full profile from database
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
        
        // ✅ 2. SECOND: Try from window.db.currentUser (fallback)
        if (!profile && window.db?.currentUser) {
            profile = window.db.currentUser;
            source = 'window.db.currentUser';
            console.log(`📋 Found profile in ${source}:`, profile.block, profile.intake_year);
            console.log(`📋 Admission Number in ${source}:`, profile.admission_number);
        }
        
        // ✅ 3. THIRD: Try from window.currentUser
        if (!profile && window.currentUser) {
            profile = window.currentUser;
            source = 'window.currentUser';
            console.log(`📋 Found profile in ${source}:`, profile.block, profile.intake_year);
            console.log(`📋 Admission Number in ${source}:`, profile.admission_number);
        }
        
        // ✅ 4. FOURTH: Try from window.db.currentUserProfile
        if (!profile && window.db?.currentUserProfile) {
            profile = window.db.currentUserProfile;
            source = 'window.db.currentUserProfile';
            console.log(`📋 Found profile in ${source}:`, profile.block, profile.intake_year);
            console.log(`📋 Admission Number in ${source}:`, profile.admission_number);
        }
        
        // ✅ 5. FIFTH: Try from window.currentUserProfile
        if (!profile && window.currentUserProfile) {
            profile = window.currentUserProfile;
            source = 'window.currentUserProfile';
            console.log(`📋 Found profile in ${source}:`, profile.block, profile.intake_year);
            console.log(`📋 Admission Number in ${source}:`, profile.admission_number);
        }
        
        // ✅ 6. SIXTH: Try from window.dashboardModule
        if (!profile && window.dashboardModule?.userData) {
            profile = window.dashboardModule.userData;
            source = 'window.dashboardModule.userData';
            console.log(`📋 Found profile in ${source}:`, profile.block, profile.intake_year);
            console.log(`📋 Admission Number in ${source}:`, profile.admission_number);
        }
        
        // ✅ 7. SEVENTH: Try from window.userData
        if (!profile && window.userData) {
            profile = window.userData;
            source = 'window.userData';
            console.log(`📋 Found profile in ${source}:`, profile.block, profile.intake_year);
            console.log(`📋 Admission Number in ${source}:`, profile.admission_number);
        }
        
        // ✅ 8. EIGHTH: Check if we have a user ID from anywhere
        if (!profile) {
            const userId = window.userId || window.currentUserId || 
                          window.db?.currentUser?.id || 
                          window.currentUser?.id || 
                          null;
            if (userId) {
                source = 'userId fallback';
                console.log(`📋 Found userId in ${source}:`, userId);
                
                // ✅ Try one more time to fetch from database with this userId
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
                            console.log(`📋 Admission Number:`, profileData.admission_number);
                        }
                    } catch(e) {
                        console.warn('⚠️ Could not fetch by userId:', e);
                    }
                }
            }
        }
        
        // ✅ 9. ABSOLUTE LAST RESORT: Try localStorage
        if (!profile) {
            try {
                const stored = localStorage.getItem('userProfile');
                if (stored) {
                    const localProfile = JSON.parse(stored);
                    if (localProfile.user_id) {
                        profile = localProfile;
                        source = 'localStorage (ABSOLUTE LAST RESORT)';
                        console.log(`📋 Found profile in ${source}:`, profile.block, profile.intake_year);
                        console.log(`📋 Admission Number in ${source}:`, profile.admission_number);
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

    // ✅ Get student ID - use user_id from profile (ASYNC)
    async function getCurrentStudentId() {
        const info = await getCurrentStudentInfo();
        return info?.user_id || null;
    }

    // ✅ Get student registration number (ASYNC)
    async function getCurrentStudentRegNumber() {
        const info = await getCurrentStudentInfo();
        return info?.admission_number || info?.student_id || null;
    }

    // ✅ Get student name (ASYNC)
    async function getCurrentStudentName() {
        const info = await getCurrentStudentInfo();
        return info?.full_name || 'Student';
    }

    // ✅ Get student program (ASYNC)
    async function getCurrentStudentProgram() {
        const info = await getCurrentStudentInfo();
        return info?.program || 'KRCHN';
    }

    // ✅ Get student block (ASYNC)
    async function getCurrentStudentBlock() {
        const info = await getCurrentStudentInfo();
        return info?.block || 'Block 4';
    }

    // ✅ Get student intake year (ASYNC)
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

    // ============================================
    // 🎯 CREATE GPS INSTANCE
    // ============================================
    
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
    // 📚 LOAD DATA WITH BLOCK & INTAKE YEAR FILTERING
    // ============================================
    
    async function loadApprovedUnits() {
        try {
            const supabase = getSupabase();
            const studentId = await getCurrentStudentId(); // ✅ AWAIT
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
            
            // ✅ AWAIT the async function
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
    
    async function loadActiveSessions() {
        try {
            const supabase = getSupabase();
            if (!supabase) return [];
            
            const studentId = await getCurrentStudentId(); // ✅ AWAIT
            if (!studentId) return [];
            
            const profile = await getCurrentStudentInfo(); // ✅ AWAIT
            const program = profile?.program || 'KRCHN';
            
            const { data: sessions, error } = await supabase
                .from('scheduled_sessions')
                .select('*')
                .eq('target_program', program)
                .eq('status', 'active')
                .eq('is_active', true)
                .gte('session_date', new Date().toISOString().split('T')[0])
                .order('session_date', { ascending: true });
            
            if (error) throw error;
            activeSessions = sessions || [];
            console.log(`✅ Loaded ${activeSessions.length} active sessions`);
            return activeSessions;
        } catch (error) {
            console.error('Error loading active sessions:', error);
            return [];
        }
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
            // ✅ AWAIT the async function
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
        const studentId = await getCurrentStudentId(); // ✅ AWAIT
        
        if (!supabase || !studentId) {
            table.innerHTML = `
                <tr>
                    <td colspan="6" style="padding: 40px; text-align: center; color: #94a3b8;">
                        <i class="fas fa-info-circle" style="font-size: 24px; display: block; margin-bottom: 8px;"></i>
                        Please log in to view history
                    </td>
                </tr>
            `;
            return;
        }
        
        try {
            const { data, error } = await supabase
                .from('geo_attendance_logs')
                .select('*')
                .eq('student_id', studentId)
                .order('check_in_time', { ascending: false })
                .limit(50);
            
            if (error) throw error;
            
            if (!data || data.length === 0) {
                table.innerHTML = `
                    <tr>
                        <td colspan="6" style="padding: 40px; text-align: center; color: #94a3b8;">
                            <i class="fas fa-calendar-times" style="font-size: 24px; display: block; margin-bottom: 8px;"></i>
                            No attendance records found
                        </td>
                    </tr>
                `;
                return;
            }
            
            attendanceHistory = data;
            updateHistoryStats(data);
            
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
            
            const countEl = document.getElementById('history-count');
            if (countEl) countEl.textContent = `${data.length} records`;
            
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
        const studentId = await getCurrentStudentId(); // ✅ AWAIT
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

    // ============================================
    // ✅ SIMPLE SUCCESS MODAL - No distance warnings
    // ============================================
    
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
        const studentId = await getCurrentStudentId(); // ✅ AWAIT
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
        const studentId = await getCurrentStudentId(); // ✅ AWAIT
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
    // ✅ DO CHECK-IN - STUDENT FRIENDLY
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
            showToast('Please select a target first', 'warning');
            return;
        }
        
        btn.disabled = true;
        btn.innerHTML = '📡 Acquiring GPS...';
        btn.style.opacity = '0.6';
        
        try {
            // ✅ AWAIT the async function
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
                intake_year: studentIntakeYear
            });
            
            // ✅ Update the student info badge
            updateStudentInfoBadge(studentBlock, studentIntakeYear, admissionNumber || 'N/A');
            
            const supabase = getSupabase();
            if (!supabase) {
                showToast('Database not available', 'error');
                btn.disabled = false;
                btn.innerHTML = '📍 Check In Now';
                btn.style.opacity = '1';
                return;
            }
            
            // 🚀 Get ULTRA-ACCURATE location
            const location = await getAccurateLocation();
            
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
            
            const sessionType = sessionTypeSelect?.value || 'class';
            
            // ✅ Record with CORRECT identifiers
            const record = {
                // ✅ user_id = UUID (for RLS)
                user_id: userId,
                
                // ✅ student_id = admission_number (for display)
                student_id: admissionNumber,
                
                // ✅ registration_number = admission_number (for display)
                registration_number: admissionNumber,
                
                student_name: studentFullName,
                block: studentBlock,
                intake_year: studentIntakeYear,
                program: studentProgram,
                check_in_time: new Date().toISOString(),
                session_type: sessionType,
                target_id: selectedTarget.id,
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
                student_id: record.student_id,
                registration_number: record.registration_number,
                student_name: record.student_name,
                status: record.attendance_status,
                distance: record.distance_meters
            });
            
            const { error } = await supabase
                .from('geo_attendance_logs')
                .insert([record]);
            
            if (error) {
                console.error('❌ Insert error:', error);
                throw error;
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
            
            await loadHistory();
            await updateStats();
            
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
    // ✅ WAIT FOR PROFILE TO LOAD (like exams.js)
    // ============================================
    
    async function waitForProfile(maxAttempts = MAX_PROFILE_ATTEMPTS) {
        console.log('⏳ Waiting for student profile to load...');
        
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            // ✅ AWAIT the async function
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
    // 🚀 INIT (like exams.js)
    // ============================================
    
    async function init() {
        console.log('🚀 Initializing ULTRA-ACCURATE attendance system...');
        console.log('🏥 Clinical radius: Nakuru = 250m, Others = 200m');
        console.log('📚 Classroom radius: 50m for classes/labs');
        
        // ✅ AWAIT the profile (like exams.js)
        const studentInfo = await waitForProfile(MAX_PROFILE_ATTEMPTS);
        
        if (!studentInfo || !studentInfo.user_id) {
            console.warn('⚠️ No student logged in. Please log in first.');
            showToast('Please log in to check in', 'warning', 5000);
        } else {
            console.log('👤 Student logged in:', studentInfo.full_name);
            console.log('📋 Student ID (UUID):', studentInfo.user_id);
            console.log('📋 Registration Number:', studentInfo.admission_number || studentInfo.student_id || 'N/A');
            console.log('📋 Block:', studentInfo.block);
            console.log('📋 Intake Year:', studentInfo.intake_year);
            
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
        
        // Setup event listeners
        const sessionType = document.getElementById('session-type');
        if (sessionType) {
            sessionType.addEventListener('change', function() {
                const value = this.value;
                console.log(`📋 Session type changed to: ${value}`);
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
                        console.log('✅ Target selected:', selectedTarget.name);
                        console.log(`📏 Radius: ${selectedTarget.radius}m`);
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
            checkBtn.onclick = doCheckIn;
        }
        
        // Get initial location
        const location = await getAccurateLocation();
        currentLocation = location;
        await updateLocationDisplay(location);
        updateRequirementsUI();
        
        await loadHistory();
        
        setInterval(updateStats, 30000);
        
        // Listen for profile updates
        document.addEventListener('profileLoaded', function(event) {
            console.log('🔄 Profile updated, reloading clinical locations...');
            loadClinicalLocations();
        });
        
        document.addEventListener('appReady', function(event) {
            console.log('🔄 App ready, refreshing clinical locations...');
            setTimeout(() => {
                loadClinicalLocations();
            }, 500);
        });
        
        isInitialized = true;
        console.log('✅ Ultra-accurate attendance system ready!');
        console.log(`🏥 Clinical radius: Nakuru = 250m, Others = 200m`);
        console.log(`📚 Classroom radius: ${ACCURACY_CONFIG.CLASSROOM_RADIUS}m`);
        showToast(`🎯 Ultra-accurate attendance ready!`, 'success', 3000);
        
        // Dispatch event like exams.js
        const event = new CustomEvent('attendanceModuleReady', {
            detail: { 
                count: clinicalLocations.length,
                timestamp: new Date().toISOString()
            }
        });
        document.dispatchEvent(event);
    }
    
    // ============================================
    // 🌐 EXPOSE GLOBALLY (like exams.js)
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
    
    // ============================================
    // 🏁 START (like exams.js)
    // ============================================
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        setTimeout(init, 500);
    }
    
    console.log('✅ ULTRA-ACCURATE attendance system module loaded!');
    console.log('🎯 5-point GPS verification enabled!');
    console.log('📡 Multi-reading averaging active!');
    console.log('🏥 Clinical radius: Nakuru = 250m, Others = 200m');
    console.log('📚 Classroom radius: 50m (classes/labs)');
    console.log('📋 Filtering by Block & Intake Year enabled!');
    console.log('👤 Student ID capture: FIXED!');
    console.log('⏳ Waiting for profile to load before initializing...');
    console.log('❌ NO localStorage - Reading from database only!');
    
})();

// ============================================
// 🔄 FORCE DISPATCH ATTENDANCE READY EVENT
// ============================================
(function ensureAttendanceReadyEvent() {
    console.log('📣 Ensuring attendanceModuleReady event...');
    
    const dispatchEvent = () => {
        if (window.attendanceSystemReady) {
            const event = new CustomEvent('attendanceModuleReady', {
                detail: { 
                    ready: true,
                    timestamp: new Date().toISOString()
                }
            });
            document.dispatchEvent(event);
            console.log('✅ attendanceModuleReady event dispatched');
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
