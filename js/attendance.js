// ============================================
// ✅ attendance.js - COMPLETE WITH SESSION SUPPORT
// ✅ Beautiful modals - NO "This site says" popups!
// ✅ Enhanced table styling matching the HTML
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
    let activeSessions = [];
    let attendanceStats = {
        present: 0,
        pending: 0,
        absent: 0,
        total: 0
    };
    
    // ============================================
    // ✅ BEAUTIFUL MODALS - NO "This site says"!
    // ============================================
    
    // 1. TOAST NOTIFICATION
    function showToast(message, type = 'success', duration = 3500) {
        const toast = document.createElement('div');
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
            font-family: 'Inter', system-ui, -apple-system, sans-serif;
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
    
    // Add toast styles if not exists
    if (!document.getElementById('toast-styles')) {
        const style = document.createElement('style');
        style.id = 'toast-styles';
        style.textContent = `
            @keyframes slideUpToast {
                from { opacity: 0; transform: translateX(-50%) translateY(30px) scale(0.9); }
                to { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
            }
            @keyframes slideDownToast {
                from { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
                to { opacity: 0; transform: translateX(-50%) translateY(30px) scale(0.9); }
            }
            @keyframes fadeInBackdrop {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            @keyframes slideUpModal {
                from { opacity: 0; transform: translateY(30px) scale(0.95); }
                to { opacity: 1; transform: translateY(0) scale(1); }
            }
        `;
        document.head.appendChild(style);
    }
    
    // 2. CONFIRMATION MODAL - Replaces confirm()
    function showConfirmModal(options) {
        return new Promise((resolve) => {
            const existing = document.getElementById('confirmModal');
            if (existing) existing.remove();
            
            const modal = document.createElement('div');
            modal.id = 'confirmModal';
            modal.innerHTML = `
                <div style="
                    position: fixed;
                    top: 0; left: 0;
                    width: 100%; height: 100%;
                    background: rgba(0,0,0,0.5);
                    backdrop-filter: blur(6px);
                    -webkit-backdrop-filter: blur(6px);
                    z-index: 999998;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    animation: fadeInBackdrop 0.25s ease;
                ">
                    <div style="
                        background: white;
                        border-radius: 20px;
                        max-width: 440px;
                        width: 92%;
                        padding: 28px;
                        box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                        animation: slideUpModal 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
                    ">
                        <div style="text-align: center; margin-bottom: 12px;">
                            <div style="width: 64px; height: 64px; border-radius: 50%; background: #ede9fe; display: inline-flex; align-items: center; justify-content: center; font-size: 32px;">${options.icon || '📍'}</div>
                        </div>
                        <h3 style="text-align: center; margin: 0 0 4px; font-size: 20px; font-weight: 700; color: #0f172a;">${options.title || 'Confirm Check-in'}</h3>
                        <p style="text-align: center; margin: 0 0 20px; font-size: 14px; color: #64748b;">${options.subtitle || 'Please verify your location before checking in.'}</p>
                        <div style="background: #f8fafc; border-radius: 12px; padding: 16px; margin-bottom: 20px;">
                            ${Object.entries(options.details || {}).map(([key, value]) => `
                                <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #f1f5f9;">
                                    <span style="color: #64748b; font-size: 13px;">${key}</span>
                                    <span style="font-weight: 500; font-size: 13px; color: #0f172a;">${value}</span>
                                </div>
                            `).join('')}
                        </div>
                        <div style="display: flex; gap: 12px;">
                            <button onclick="window._closeConfirmModal(false)" style="flex: 1; padding: 14px; border: 2px solid #e2e8f0; border-radius: 12px; background: white; font-size: 15px; font-weight: 600; cursor: pointer; color: #64748b; transition: all 0.2s ease;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='white'">Cancel</button>
                            <button onclick="window._closeConfirmModal(true)" style="flex: 2; padding: 14px; border: none; border-radius: 12px; background: linear-gradient(135deg, #4f46e5, #7c3aed); font-size: 15px; font-weight: 600; cursor: pointer; color: white; transition: all 0.2s ease;" onmouseover="this.style.transform='scale(1.02)'" onmouseout="this.style.transform='scale(1)'">✅ Confirm</button>
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
    
    // 3. SUCCESS MODAL
    function showSuccessModal(data) {
        const existing = document.getElementById('successModal');
        if (existing) existing.remove();
        
        const statusMap = {
            'Present': { emoji: '🎉', color: '#10b981', bg: '#d1fae5', title: '✨ Check-in Successful!', message: 'You have been verified! 🎊' },
            'Absent': { emoji: '📍', color: '#f59e0b', bg: '#fef3c7', title: '📍 You are not at this location', message: 'Your location is too far from the target area.' },
            'Pending': { emoji: '⏳', color: '#3b82f6', bg: '#dbeafe', title: '⏳ Pending Review', message: 'Your check-in is being reviewed.' }
        };
        const status = statusMap[data.status] || statusMap['Pending'];
        
        const modal = document.createElement('div');
        modal.id = 'successModal';
        modal.innerHTML = `
            <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.4); backdrop-filter: blur(4px); z-index: 999999; display: flex; align-items: center; justify-content: center; animation: fadeInBackdrop 0.3s ease;">
                <div style="background: white; border-radius: 24px; max-width: 380px; width: 92%; overflow: hidden; box-shadow: 0 20px 60px rgba(0,0,0,0.15); animation: slideUpModal 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);">
                    <div style="background: ${status.color}; padding: 20px 24px 16px; text-align: center; color: white;">
                        <div style="font-size: 48px; margin-bottom: 4px;">${status.emoji}</div>
                        <h2 style="margin: 0; font-size: 20px; font-weight: 700; color: white;">${status.title}</h2>
                    </div>
                    <div style="padding: 24px 24px 20px;">
                        <div style="text-align: center; margin-bottom: 16px; padding: 12px; background: ${status.bg}; border-radius: 12px; color: ${status.color}; font-weight: 500; font-size: 15px;">${status.message}</div>
                        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; margin-bottom: 16px;">
                            <div style="text-align: center; background: #f8fafc; border-radius: 10px; padding: 10px 4px;">
                                <div style="font-size: 18px; font-weight: 700; color: #0f172a;">${data.distance}</div>
                                <div style="font-size: 10px; color: #94a3b8;">Distance</div>
                            </div>
                            <div style="text-align: center; background: #f8fafc; border-radius: 10px; padding: 10px 4px;">
                                <div style="font-size: 18px; font-weight: 700; color: #0f172a;">${data.accuracy}</div>
                                <div style="font-size: 10px; color: #94a3b8;">Accuracy</div>
                            </div>
                            <div style="text-align: center; background: ${status.bg}; border-radius: 10px; padding: 10px 4px;">
                                <div style="font-size: 18px; font-weight: 700; color: ${status.color};">${data.status}</div>
                                <div style="font-size: 10px; color: ${status.color};">Status</div>
                            </div>
                        </div>
                        ${data.session ? `
                            <div style="background: #f8fafc; border-radius: 10px; padding: 10px 14px; margin-bottom: 16px; text-align: center;">
                                <div style="font-size: 12px; color: #94a3b8;">📅 Session</div>
                                <div style="font-weight: 600; font-size: 14px; color: #0f172a;">${data.session}</div>
                            </div>
                        ` : ''}
                        <div style="background: #f8fafc; border-radius: 10px; padding: 10px 14px; margin-bottom: 16px; text-align: center;">
                            <div style="font-size: 12px; color: #94a3b8;">📍 Target</div>
                            <div style="font-weight: 600; font-size: 14px; color: #0f172a;">${data.target}</div>
                            <div style="font-size: 12px; color: #64748b;">${data.type}</div>
                        </div>
                        <button onclick="window._closeSuccessModal()" style="width: 100%; padding: 14px; border: none; border-radius: 14px; font-size: 16px; font-weight: 600; cursor: pointer; background: ${status.color}; color: white; transition: all 0.2s ease; display: flex; align-items: center; justify-content: center; gap: 8px;" onmouseover="this.style.transform='scale(1.02)'" onmouseout="this.style.transform='scale(1)'">Got it! 👍</button>
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
        if (data.status === 'Present') {
            setTimeout(() => { if (document.getElementById('successModal')) window._closeSuccessModal(); }, 4000);
        }
    }
    
    // ============================================
    // HELPER FUNCTIONS
    // ============================================
    
    function getCurrentStudentId() {
        if (window.db?.currentUserId) return window.db.currentUserId;
        if (window.db?.currentUserProfile?.user_id) return window.db.currentUserProfile.user_id;
        if (window.currentUserId) return window.currentUserId;
        try {
            const profile = localStorage.getItem('userProfile');
            if (profile) {
                const parsed = JSON.parse(profile);
                return parsed.user_id || parsed.id || null;
            }
        } catch(e) {}
        return null;
    }
    
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
    // GPS FUNCTION
    // ============================================
    
    function getAccurateLocation() {
        console.log('📍 Getting ACCURATE GPS (maximumAge:0)...');
        return new Promise((resolve) => {
            if (!navigator.geolocation) {
                resolve({ lat: CAMPUS_COORDINATES.latitude, lon: CAMPUS_COORDINATES.longitude, acc: 9999, address: 'Campus (GPS unavailable)' });
                return;
            }
            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    const location = { lat: position.coords.latitude, lon: position.coords.longitude, acc: position.coords.accuracy };
                    try {
                        location.address = await getAddressFromCoordinates(location.lat, location.lon);
                    } catch(e) {
                        location.address = `${location.lat.toFixed(6)}, ${location.lon.toFixed(6)}`;
                    }
                    resolve(location);
                },
                () => {
                    resolve({ lat: CAMPUS_COORDINATES.latitude, lon: CAMPUS_COORDINATES.longitude, acc: 9999, address: 'Campus (GPS fallback)' });
                },
                { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
            );
        });
    }
    
    async function updateLocationDisplay(location) {
        const latEl = document.getElementById('latitude');
        const lonEl = document.getElementById('longitude');
        const accEl = document.getElementById('accuracy-value');
        if (latEl) latEl.textContent = location.lat.toFixed(6);
        if (lonEl) lonEl.textContent = location.lon.toFixed(6);
        if (accEl) accEl.textContent = location.acc.toFixed(1);
        
        // Update GPS status in header
        const gpsStatus = document.getElementById('gps-status');
        if (gpsStatus) {
            if (location.acc < 50) {
                gpsStatus.innerHTML = `<i class="fas fa-check-circle" style="color: #10b981;"></i> <span>GPS Locked (${location.acc.toFixed(0)}m)</span>`;
                gpsStatus.style.background = '#d1fae5';
                gpsStatus.style.color = '#065f46';
            } else if (location.acc < 200) {
                gpsStatus.innerHTML = `<i class="fas fa-satellite" style="color: #f59e0b;"></i> <span>GPS OK (${location.acc.toFixed(0)}m)</span>`;
                gpsStatus.style.background = '#fef3c7';
                gpsStatus.style.color = '#92400e';
            } else {
                gpsStatus.innerHTML = `<i class="fas fa-exclamation-triangle" style="color: #ef4444;"></i> <span>GPS Weak (${location.acc.toFixed(0)}m)</span>`;
                gpsStatus.style.background = '#fee2e2';
                gpsStatus.style.color = '#991b1b';
            }
        }
        
        let addressDisplay = document.getElementById('location-address');
        if (!addressDisplay) {
            const locationInfo = document.getElementById('location-info');
            if (locationInfo) {
                const addressDiv = document.createElement('div');
                addressDiv.id = 'location-address';
                addressDiv.className = 'location-address';
                addressDiv.style.cssText = 'margin-top: 8px; font-size: 12px; color: #64748b;';
                locationInfo.appendChild(addressDiv);
                addressDisplay = addressDiv;
            }
        }
        if (addressDisplay && location.address) {
            addressDisplay.innerHTML = `📍 <strong>Location:</strong> ${location.address}`;
        }
    }
    
    // ============================================
    // LOAD ACTIVE SESSIONS
    // ============================================
    
    async function loadActiveSessions() {
        try {
            const supabase = getSupabase();
            if (!supabase) return [];
            
            const studentId = getCurrentStudentId();
            if (!studentId) return [];
            
            const profile = window.db?.currentUserProfile || JSON.parse(localStorage.getItem('userProfile') || '{}');
            const program = profile.program || profile.department || 'KRCHN';
            
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
            
            // Update active sessions count in stats
            const sessionsEl = document.getElementById('stats-active-sessions');
            if (sessionsEl) {
                sessionsEl.textContent = activeSessions.length;
            }
            
            return activeSessions;
            
        } catch (error) {
            console.error('Error loading active sessions:', error);
            return [];
        }
    }
    
    // ============================================
    // LOAD APPROVED UNITS
    // ============================================
    
    async function loadApprovedUnits() {
        try {
            const supabase = getSupabase();
            const studentId = getCurrentStudentId();
            if (!supabase || !studentId) return [];
            const { data, error } = await supabase
                .from('student_unit_registrations')
                .select('*')
                .eq('student_id', studentId)
                .eq('status', 'approved');
            if (error) throw error;
            approvedUnits = (data || []).map(u => ({
                id: u.id, unit_code: u.unit_code, unit_name: u.unit_name,
                block: u.block,
                latitude: u.latitude || CAMPUS_COORDINATES.latitude,
                longitude: u.longitude || CAMPUS_COORDINATES.longitude,
                radius: u.radius || 50
            }));
            return approvedUnits;
        } catch(e) { return []; }
    }
    
    // ============================================
    // LOAD CLINICAL LOCATIONS
    // ============================================
    
    async function loadClinicalLocations() {
        try {
            const supabase = getSupabase();
            if (!supabase) return [];
            const { data, error } = await supabase
                .from('clinical_names')
                .select('id, clinical_area_name, latitude, longitude')
                .eq('program', 'KRCHN')
                .eq('intake_year', '2026');
            if (error) throw error;
            clinicalLocations = data || [];
            return clinicalLocations;
        } catch(e) { return []; }
    }
    
    // ============================================
    // POPULATE TARGET OPTIONS
    // ============================================
    
    async function populateTargetOptions(sessionType) {
        const targetSelect = document.getElementById('attendance-target');
        if (!targetSelect) return;
        targetSelect.innerHTML = '<option value="">Loading...</option>';
        targetSelect.disabled = true;
        let options = [];
        
        if (sessionType === 'session' || (sessionType === 'class' && activeSessions.length > 0)) {
            options = activeSessions.map(session => ({
                id: `session_${session.id}`,
                name: `📅 ${session.session_title || session.title || 'Session'}`,
                type: 'session',
                latitude: session.target_latitude || CAMPUS_COORDINATES.latitude,
                longitude: session.target_longitude || CAMPUS_COORDINATES.longitude,
                radius: session.target_radius || 100,
                session_id: session.id
            }));
        } else if (sessionType === 'class') {
            if (approvedUnits.length === 0) await loadApprovedUnits();
            options = approvedUnits.map(unit => ({
                id: `unit_${unit.id}`,
                name: `${unit.unit_code} - ${unit.unit_name}`,
                type: 'class',
                latitude: unit.latitude || CAMPUS_COORDINATES.latitude,
                longitude: unit.longitude || CAMPUS_COORDINATES.longitude,
                radius: unit.radius || 50
            }));
        } else if (sessionType === 'clinical') {
            if (clinicalLocations.length === 0) await loadClinicalLocations();
            options = clinicalLocations.map(loc => ({
                id: `clinical_${loc.id}`,
                name: loc.clinical_area_name,
                type: 'clinical',
                latitude: parseFloat(loc.latitude),
                longitude: parseFloat(loc.longitude),
                radius: 100
            }));
        }
        
        if (options.length === 0) {
            targetSelect.innerHTML = `<option value="">⚠️ No options available</option>`;
            targetSelect.disabled = false;
            return;
        }
        targetSelect.innerHTML = `<option value="">📚 Select ${sessionType === 'class' ? 'course' : sessionType === 'clinical' ? 'clinical area' : 'session'}...</option>`;
        options.forEach(opt => {
            const option = document.createElement('option');
            option.value = `${opt.id}|${opt.name}|${opt.type}|${opt.latitude}|${opt.longitude}|${opt.radius}`;
            option.textContent = opt.name;
            targetSelect.appendChild(option);
        });
        targetSelect.disabled = false;
        const targetGroup = document.getElementById('target-control-group');
        if (targetGroup) targetGroup.style.display = 'block';
    }
    
    // ============================================
    // UPDATE STATS DISPLAY
    // ============================================
    
    async function updateStatsDisplay() {
        try {
            const supabase = getSupabase();
            const studentId = getCurrentStudentId();
            if (!supabase || !studentId) return;
            
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const todayISO = today.toISOString();
            
            // Get today's stats
            const { data: todayRecords, error } = await supabase
                .from('geo_attendance_logs')
                .select('attendance_status, is_verified')
                .eq('student_id', studentId)
                .gte('check_in_time', todayISO);
            
            if (error) throw error;
            
            const stats = {
                present: 0,
                pending: 0,
                absent: 0,
                total: todayRecords?.length || 0
            };
            
            todayRecords?.forEach(record => {
                const status = record.attendance_status || 'Pending';
                if (status === 'Present' || status === 'Verified') stats.present++;
                else if (status === 'Pending') stats.pending++;
                else if (status === 'Absent') stats.absent++;
            });
            
            attendanceStats = stats;
            
            // Update DOM elements
            const presentEl = document.getElementById('presentCount');
            const pendingEl = document.getElementById('pendingCount');
            const absentEl = document.getElementById('absentCount');
            const totalEl = document.getElementById('totalCount');
            
            if (presentEl) presentEl.textContent = stats.present;
            if (pendingEl) pendingEl.textContent = stats.pending;
            if (absentEl) absentEl.textContent = stats.absent;
            if (totalEl) totalEl.textContent = stats.total;
            
            // Update history stats if visible
            const histPresent = document.getElementById('hist-present');
            const histPending = document.getElementById('hist-pending');
            const histAbsent = document.getElementById('hist-absent');
            const histRate = document.getElementById('hist-rate');
            
            if (histPresent) histPresent.textContent = stats.present;
            if (histPending) histPending.textContent = stats.pending;
            if (histAbsent) histAbsent.textContent = stats.absent;
            if (histRate) {
                const rate = stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 0;
                histRate.textContent = rate + '%';
            }
            
            console.log(`📊 Stats updated: Present: ${stats.present}, Pending: ${stats.pending}, Absent: ${stats.absent}, Total: ${stats.total}`);
            
        } catch (error) {
            console.error('Error updating stats:', error);
        }
    }
    
    // ============================================
    // LOAD HISTORY
    // ============================================
    
    async function loadHistory() {
        const table = document.getElementById('geo-attendance-history');
        if (!table) { console.warn('History table not found'); return; }
        
        table.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 40px; color: #94a3b8;">
            <div style="width: 30px; height: 30px; border: 3px solid #e5e7eb; border-top-color: #4C1D95; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 8px;"></div>
            <p style="margin: 0; font-size: 13px;">Loading attendance history...</p>
        </td></tr>`;
        
        const supabase = getSupabase();
        if (!supabase) {
            table.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 40px; color: #ef4444;">Database not available</td></tr>`;
            return;
        }
        
        const studentId = getCurrentStudentId();
        if (!studentId) {
            table.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 40px; color: #94a3b8;">Please log in to view history</td></tr>`;
            return;
        }
        
        try {
            const { data, error } = await supabase
                .from('geo_attendance_logs')
                .select('*')
                .eq('student_id', studentId)
                .order('check_in_time', { ascending: false })
                .limit(50);
            
            if (error) {
                console.error('History error:', error);
                table.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 40px; color: #ef4444;">Error: ${error.message}</td></tr>`;
                return;
            }
            
            if (!data || data.length === 0) {
                table.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 40px; color: #94a3b8;">
                    <i class="fas fa-calendar-times" style="font-size: 24px; display: block; margin-bottom: 8px;"></i>
                    No attendance records found
                </td></tr>`;
                return;
            }
            
            // Update stats with history data
            await updateStatsDisplay();
            
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
                
                const sessionIcon = log.session_type === 'class' ? '📚' : log.session_type === 'session' ? '📅' : '🏥';
                const targetName = log.target_name || log.location_name || 'Unknown';
                const distanceClass = distance < 100 ? 'distance-verified' : distance < 200 ? 'distance-pending' : 'distance-absent';
                
                return `<tr>
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
                </tr>`;
            }).join('');
            
            console.log(`✅ Loaded ${data.length} history records`);
            
        } catch(e) {
            console.error('History error:', e);
            table.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 40px; color: #ef4444;">Error: ${e.message}</td></tr>`;
        }
    }
    
    // ============================================
    // FILTER HISTORY
    // ============================================
    
    async function filterHistory() {
        const filter = document.getElementById('history-filter');
        if (!filter) return;
        const supabase = getSupabase();
        const studentId = getCurrentStudentId();
        if (!supabase || !studentId) return;
        
        const table = document.getElementById('geo-attendance-history');
        const value = filter.value;
        try {
            let query = supabase.from('geo_attendance_logs').select('*').eq('student_id', studentId).order('check_in_time', { ascending: false });
            const now = new Date();
            if (value === 'today') { const today = new Date(now); today.setHours(0,0,0,0); query = query.gte('check_in_time', today.toISOString()); }
            else if (value === 'week') { const weekAgo = new Date(now); weekAgo.setDate(weekAgo.getDate()-7); query = query.gte('check_in_time', weekAgo.toISOString()); }
            else if (value === 'month') { const monthAgo = new Date(now); monthAgo.setMonth(monthAgo.getMonth()-1); query = query.gte('check_in_time', monthAgo.toISOString()); }
            const { data, error } = await query.limit(50);
            if (error) throw error;
            if (!data || data.length === 0) { 
                table.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 40px; color: #94a3b8;">No records for this period</td></tr>`; 
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
                const sessionIcon = log.session_type === 'class' ? '📚' : log.session_type === 'session' ? '📅' : '🏥';
                const targetName = log.target_name || log.location_name || 'Unknown';
                const distanceClass = distance < 100 ? 'distance-verified' : distance < 200 ? 'distance-pending' : 'distance-absent';
                
                return `<tr>
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
                </tr>`;
            }).join('');
        } catch(e) { console.error('Filter error:', e); }
    }
    
    // ============================================
    // DO CHECK-IN
    // ============================================
    
    async function doCheckIn() {
        const btn = document.getElementById('check-in-button');
        const targetSelect = document.getElementById('attendance-target');
        const sessionTypeSelect = document.getElementById('session-type');
        
        if (!selectedTarget && targetSelect?.value) {
            const parts = targetSelect.value.split('|');
            if (parts.length >= 6) {
                selectedTarget = {
                    id: parts[0], name: parts[1], type: parts[2],
                    latitude: parseFloat(parts[3]), longitude: parseFloat(parts[4]), radius: parseFloat(parts[5])
                };
            }
        }
        if (!selectedTarget) {
            showToast('Please select a target first', 'warning');
            return;
        }
        
        btn.disabled = true;
        btn.innerHTML = '📍 Getting GPS...';
        
        try {
            const studentId = getCurrentStudentId();
            if (!studentId) {
                showToast('Please log in first', 'error');
                btn.disabled = false;
                btn.innerHTML = '📍 Check In Now';
                return;
            }
            
            const supabase = getSupabase();
            if (!supabase) {
                showToast('Database not available', 'error');
                btn.disabled = false;
                btn.innerHTML = '📍 Check In Now';
                return;
            }
            
            // Get student profile
            const { data: studentProfile, error: profileError } = await supabase
                .from('consolidated_user_profiles_table')
                .select('user_id, student_id, full_name, block, program, intake_year, department')
                .eq('user_id', studentId)
                .maybeSingle();
            
            if (profileError) {
                console.error('Profile fetch error:', profileError);
            }
            
            const studentRegNumber = studentProfile?.student_id || 'UNKNOWN-' + studentId.substring(0, 8);
            const studentFullName = studentProfile?.full_name || 'Student';
            const studentBlock = studentProfile?.block || 'Not Assigned';
            const studentProgram = studentProfile?.program || 'KRCHN';
            const studentIntake = studentProfile?.intake_year || '2025';
            
            console.log(`👤 Student: ${studentFullName} (${studentRegNumber})`);
            
            // Get GPS location
            const location = await getAccurateLocation();
            await updateLocationDisplay(location);
            
            const distance = calculateDistance(location.lat, location.lon, selectedTarget.latitude, selectedTarget.longitude);
            const radius = selectedTarget.radius || 50;
            const accuracy = location.acc;
            
            let status = 'Absent', verificationNote = '';
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
            
            // Show confirmation modal
            const confirmed = await showConfirmModal({
                icon: '📍',
                title: 'Verify Check-in',
                subtitle: 'Please confirm your attendance details:',
                details: {
                    'Student': studentFullName,
                    'Reg No': studentRegNumber,
                    'Block': studentBlock,
                    'Program': studentProgram,
                    'Target': selectedTarget.name,
                    'Type': selectedTarget.type === 'class' ? 'Classroom' : selectedTarget.type === 'session' ? 'Session' : 'Clinical',
                    'Distance': distance.toFixed(0) + 'm',
                    'GPS Accuracy': '±' + accuracy.toFixed(0) + 'm',
                    'Status': status
                }
            });
            
            if (!confirmed) {
                btn.disabled = false;
                btn.innerHTML = '📍 Check In Now';
                showToast('Check-in cancelled', 'warning');
                return;
            }
            
            btn.innerHTML = '💾 Saving...';
            const sessionType = sessionTypeSelect?.value || 'class';
            
            // Build record
            const record = {
                student_id: studentId,
                user_id: studentId,
                registration_number: studentRegNumber,
                student_name: studentFullName,
                block: studentBlock,
                program: studentProgram,
                intake_year: studentIntake,
                check_in_time: new Date().toISOString(),
                session_type: sessionType,
                target_id: selectedTarget.id,
                target_name: selectedTarget.name,
                location_name: selectedTarget.name,
                latitude: location.lat,
                longitude: location.lon,
                accuracy_m: location.acc,
                distance_meters: distance,
                location_address: location.address || `${location.lat.toFixed(6)}, ${location.lon.toFixed(6)}`,
                location_friendly_name: selectedTarget.name,
                is_verified: status === 'Present',
                attendance_status: status,
                verification_source: 'GPS',
                target_latitude: selectedTarget.latitude,
                target_longitude: selectedTarget.longitude,
                target_radius: radius,
                role: 'student',
                created_at: new Date().toISOString()
            };
            
            // Add session_id if checking into a session
            if (selectedTarget.type === 'session' && selectedTarget.id.startsWith('session_')) {
                const sessionId = selectedTarget.id.replace('session_', '');
                record.session_id = sessionId;
                
                const session = activeSessions.find(s => s.id === sessionId);
                if (session) {
                    record.unit_name = session.unit_name || session.session_title;
                    record.block = session.block_term || studentBlock;
                }
            }
            
            // Add unit info for class type
            if (sessionType === 'class') {
                const unitParts = selectedTarget.name.split(' - ');
                record.unit_code = unitParts[0] || '';
                record.unit_name = selectedTarget.name;
            } else if (sessionType === 'clinical') {
                record.clinical_area = selectedTarget.name;
            }
            
            const { error } = await supabase.from('geo_attendance_logs').insert([record]);
            if (error) throw error;
            
            console.log(`✅ Check-in saved! Record:`, record);
            
            showSuccessModal({
                target: selectedTarget.name,
                type: selectedTarget.type === 'class' ? 'Classroom' : selectedTarget.type === 'session' ? 'Session' : 'Clinical',
                distance: distance.toFixed(0),
                accuracy: accuracy.toFixed(0),
                status: status,
                note: verificationNote,
                session: selectedTarget.type === 'session' ? selectedTarget.name : null
            });
            
            await updateStatsDisplay();
            await loadHistory();
            await loadActiveSessions();
            
        } catch(error) {
            console.error('❌ Check-in error:', error);
            showToast('Check-in failed: ' + error.message, 'error');
        } finally {
            btn.disabled = false;
            btn.innerHTML = '📍 Check In Now';
        }
    }
    
    // ============================================
    // EXPORT ATTENDANCE HISTORY
    // ============================================
    
    async function exportAttendanceHistory() {
        try {
            const supabase = getSupabase();
            const studentId = getCurrentStudentId();
            if (!supabase || !studentId) {
                showToast('Please log in to export', 'error');
                return;
            }
            
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
            
            // Create CSV
            let csv = 'Date,Session Type,Target,Status,Distance,Accuracy,Address\n';
            data.forEach(log => {
                const date = new Date(log.check_in_time).toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' });
                const status = log.attendance_status || 'Pending';
                const distance = (log.distance_meters || 0).toFixed(0) + 'm';
                const accuracy = (log.accuracy_m || 0).toFixed(0) + 'm';
                const target = log.target_name || log.location_name || 'Unknown';
                const address = log.location_address || '';
                csv += `${date},${log.session_type || 'Unknown'},${target},${status},${distance},${accuracy},${address}\n`;
            });
            
            // Download
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
    // INIT
    // ============================================
    
    async function init() {
        console.log('🚀 Initializing attendance system...');
        try {
            // Wait for db
            let retries = 0;
            while (!getSupabase() && retries < 10) {
                await new Promise(r => setTimeout(r, 300));
                retries++;
            }
            
            await loadActiveSessions();
            await loadApprovedUnits();
            await loadClinicalLocations();
            await updateStatsDisplay();
            
            const sessionType = document.getElementById('session-type');
            if (sessionType) {
                sessionType.addEventListener('change', async () => {
                    const targetGroup = document.getElementById('target-control-group');
                    if (sessionType.value === 'session') {
                        if (targetGroup) targetGroup.style.display = 'block';
                        await populateTargetOptions('session');
                    } else if (sessionType.value === 'class') {
                        if (targetGroup) targetGroup.style.display = 'block';
                        await populateTargetOptions('class');
                    } else if (sessionType.value === 'clinical') {
                        if (targetGroup) targetGroup.style.display = 'block';
                        await populateTargetOptions('clinical');
                    } else {
                        if (targetGroup) targetGroup.style.display = 'none';
                    }
                });
                
                // Add 'session' option if there are active sessions
                if (activeSessions.length > 0) {
                    let hasSessionOption = false;
                    for (let i = 0; i < sessionType.options.length; i++) {
                        if (sessionType.options[i].value === 'session') {
                            hasSessionOption = true;
                            break;
                        }
                    }
                    if (!hasSessionOption) {
                        const option = document.createElement('option');
                        option.value = 'session';
                        option.textContent = '📅 Active Session';
                        sessionType.appendChild(option);
                    }
                }
                
                if (sessionType.value === 'class') await populateTargetOptions('class');
                else if (sessionType.value === 'clinical') await populateTargetOptions('clinical');
                else if (sessionType.value === 'session') await populateTargetOptions('session');
            }
            
            const filterSelect = document.getElementById('history-filter');
            if (filterSelect) filterSelect.addEventListener('change', filterHistory);
            
            const checkBtn = document.getElementById('check-in-button');
            if (checkBtn) checkBtn.onclick = (e) => { e.preventDefault(); doCheckIn(); };
            
            await loadHistory();
            console.log('✅ Attendance system ready!');
            showToast('Attendance system ready! 🎯', 'success', 2000);
        } catch(e) {
            console.error('❌ Attendance init error:', e);
            showToast('Error loading attendance system', 'error');
        }
    }
    
    // ============================================
    // EXPOSE
    // ============================================
    
    window.refreshStats = updateStatsDisplay;
    window.refreshHistory = loadHistory;
    window.filterHistory = filterHistory;
    window.getAccurateLocation = getAccurateLocation;
    window.signInToSession = signInToSession;
    window.loadActiveSessions = loadActiveSessions;
    window.exportAttendanceHistory = exportAttendanceHistory;
    window.attendanceSystemReady = true;
    window.loadAttendanceHistory = loadHistory;
    
    // ============================================
    // START
    // ============================================
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
    console.log('✅ Attendance system module loaded!');
    console.log(`🏫 Campus: ${CAMPUS_COORDINATES.latitude}, ${CAMPUS_COORDINATES.longitude}`);
    console.log('🎉 NO "This site says" popups! Beautiful modals only!');
    console.log('📅 Session support added! Students can sign in to active sessions.');
    
})();
