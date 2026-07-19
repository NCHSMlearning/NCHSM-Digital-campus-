// ============================================
// ✅ attendance.js - COMPLETE WITH BEAUTIFUL MODALS
// NO "This site says" popups!
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
                            <div style="
                                width: 64px; height: 64px;
                                border-radius: 50%;
                                background: #ede9fe;
                                display: inline-flex;
                                align-items: center;
                                justify-content: center;
                                font-size: 32px;
                            ">${options.icon || '📍'}</div>
                        </div>
                        
                        <h3 style="
                            text-align: center;
                            margin: 0 0 4px;
                            font-size: 20px;
                            font-weight: 700;
                            color: #0f172a;
                        ">${options.title || 'Confirm Check-in'}</h3>
                        
                        <p style="
                            text-align: center;
                            margin: 0 0 20px;
                            font-size: 14px;
                            color: #64748b;
                        ">${options.subtitle || 'Please verify your location before checking in.'}</p>
                        
                        <div style="
                            background: #f8fafc;
                            border-radius: 12px;
                            padding: 16px;
                            margin-bottom: 20px;
                        ">
                            ${Object.entries(options.details || {}).map(([key, value]) => `
                                <div style="
                                    display: flex;
                                    justify-content: space-between;
                                    padding: 6px 0;
                                    border-bottom: 1px solid #f1f5f9;
                                ">
                                    <span style="color: #64748b; font-size: 13px;">${key}</span>
                                    <span style="font-weight: 500; font-size: 13px; color: #0f172a;">${value}</span>
                                </div>
                            `).join('')}
                        </div>
                        
                        <div style="display: flex; gap: 12px;">
                            <button onclick="window._closeConfirmModal(false)" style="
                                flex: 1;
                                padding: 14px;
                                border: 2px solid #e2e8f0;
                                border-radius: 12px;
                                background: white;
                                font-size: 15px;
                                font-weight: 600;
                                cursor: pointer;
                                color: #64748b;
                                transition: all 0.2s ease;
                            " onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='white'">
                                Cancel
                            </button>
                            <button onclick="window._closeConfirmModal(true)" style="
                                flex: 2;
                                padding: 14px;
                                border: none;
                                border-radius: 12px;
                                background: linear-gradient(135deg, #4f46e5, #7c3aed);
                                font-size: 15px;
                                font-weight: 600;
                                cursor: pointer;
                                color: white;
                                transition: all 0.2s ease;
                            " onmouseover="this.style.transform='scale(1.02)'" onmouseout="this.style.transform='scale(1)'">
                                ✅ Confirm
                            </button>
                        </div>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            window._confirmResolve = resolve;
            
            // Store close function
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
    
    // 3. SUCCESS MODAL - Replaces success alert()
    function showSuccessModal(data) {
        const existing = document.getElementById('successModal');
        if (existing) existing.remove();
        
        const statusMap = {
            'Present': { emoji: '✅', color: '#10b981', bg: '#d1fae5', title: 'Check-in Successful!' },
            'Absent': { emoji: '❌', color: '#ef4444', bg: '#fee2e2', title: 'Out of Range' },
            'Pending': { emoji: '⏳', color: '#f59e0b', bg: '#fef3c7', title: 'Pending Review' }
        };
        
        const status = statusMap[data.status] || statusMap['Pending'];
        
        const modal = document.createElement('div');
        modal.id = 'successModal';
        modal.innerHTML = `
            <div style="
                position: fixed;
                top: 0; left: 0;
                width: 100%; height: 100%;
                background: rgba(0,0,0,0.5);
                backdrop-filter: blur(8px);
                -webkit-backdrop-filter: blur(8px);
                z-index: 999999;
                display: flex;
                align-items: center;
                justify-content: center;
                animation: fadeInBackdrop 0.3s ease;
            ">
                <div style="
                    background: white;
                    border-radius: 24px;
                    max-width: 400px;
                    width: 92%;
                    overflow: hidden;
                    box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                    animation: slideUpModal 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
                ">
                    <div style="
                        background: linear-gradient(135deg, ${status.color}, ${status.color}dd);
                        padding: 24px 28px 20px;
                        text-align: center;
                        color: white;
                    ">
                        <div style="font-size: 48px; margin-bottom: 4px;">${status.emoji}</div>
                        <h2 style="margin: 0; font-size: 22px; font-weight: 700;">${status.title}</h2>
                    </div>
                    
                    <div style="padding: 24px 28px 28px;">
                        <div style="
                            background: #f8fafc;
                            border-radius: 12px;
                            padding: 14px 16px;
                            margin-bottom: 16px;
                        ">
                            <div style="font-size: 12px; color: #94a3b8; text-transform: uppercase;">Target</div>
                            <div style="font-weight: 600; font-size: 16px; color: #0f172a;">${data.target}</div>
                            <div style="font-size: 13px; color: #64748b; margin-top: 2px;">${data.type}</div>
                        </div>
                        
                        <div style="
                            display: grid;
                            grid-template-columns: 1fr 1fr 1fr;
                            gap: 10px;
                            margin-bottom: 16px;
                        ">
                            <div style="text-align: center; background: #f8fafc; border-radius: 10px; padding: 10px;">
                                <div style="font-size: 18px; font-weight: 700; color: #0f172a;">${data.distance}</div>
                                <div style="font-size: 10px; color: #94a3b8;">Distance</div>
                            </div>
                            <div style="text-align: center; background: #f8fafc; border-radius: 10px; padding: 10px;">
                                <div style="font-size: 18px; font-weight: 700; color: #0f172a;">${data.accuracy}</div>
                                <div style="font-size: 10px; color: #94a3b8;">Accuracy</div>
                            </div>
                            <div style="text-align: center; background: #f8fafc; border-radius: 10px; padding: 10px;">
                                <div style="font-size: 18px; font-weight: 700; color: ${status.color};">${data.status}</div>
                                <div style="font-size: 10px; color: #94a3b8;">Status</div>
                            </div>
                        </div>
                        
                        <div style="
                            background: ${status.bg};
                            border-radius: 10px;
                            padding: 12px 16px;
                            margin-bottom: 20px;
                            font-size: 13px;
                            color: ${status.color};
                            display: flex;
                            align-items: center;
                            gap: 10px;
                        ">
                            <span style="font-size: 18px;">${status.emoji}</span>
                            <span>${data.note || 'Your attendance has been recorded.'}</span>
                        </div>
                        
                        <button onclick="window._closeSuccessModal()" style="
                            width: 100%;
                            padding: 14px;
                            border: none;
                            border-radius: 12px;
                            font-size: 16px;
                            font-weight: 600;
                            cursor: pointer;
                            background: ${status.color};
                            color: white;
                            transition: all 0.2s ease;
                        " onmouseover="this.style.transform='scale(1.02)'" onmouseout="this.style.transform='scale(1)'">
                            ✅ Done
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        window._closeSuccessModal = function() {
            const modal = document.getElementById('successModal');
            if (modal) {
                modal.style.animation = 'slideUpModal 0.3s ease reverse';
                setTimeout(() => modal.remove(), 300);
            }
        };
        
        // Auto-close for success
        if (data.status === 'Present') {
            setTimeout(() => {
                if (document.getElementById('successModal')) {
                    window._closeSuccessModal();
                }
            }, 4000);
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
    // UI ELEMENTS
    // ============================================
    
    function createStatsDisplayIfNeeded() {
        if (document.getElementById('stats-present-count')) return;
        const heading = Array.from(document.querySelectorAll('h1, h2, h3')).find(h => h.textContent && h.textContent.includes('Daily Attendance'));
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
            btn.onclick = async function() {
                console.log('📍 FORCE GPS BUTTON CLICKED!');
                const statusEl = document.getElementById('stats-gps-status');
                if (statusEl) statusEl.textContent = '⏳ Getting GPS...';
                try {
                    const location = await getAccurateLocation();
                    await updateLocationDisplay(location);
                    showToast(`📍 GPS Locked! Accuracy: ±${location.acc.toFixed(0)}m`, 'success');
                    if (statusEl) statusEl.textContent = '✅ GPS Locked';
                    const checkBtn = document.getElementById('check-in-button');
                    if (checkBtn) { checkBtn.disabled = false; checkBtn.innerHTML = '📍 Check In Now'; }
                } catch(e) {
                    showToast('GPS failed: ' + e.message, 'error');
                    if (statusEl) statusEl.textContent = '❌ GPS Failed';
                }
            };
            container.insertBefore(btn, container.firstChild);
            console.log('✅ Force GPS button created');
        }
    }
    
    function fixDropdown() {
        const targetSelect = document.getElementById('attendance-target');
        if (!targetSelect) return;
        const newSelect = targetSelect.cloneNode(true);
        targetSelect.parentNode.replaceChild(newSelect, targetSelect);
        newSelect.addEventListener('change', function() {
            if (this.value && this.value !== '') {
                const parts = this.value.split('|');
                if (parts.length >= 6) {
                    window.selectedTarget = {
                        id: parts[0], name: parts[1], type: parts[2],
                        latitude: parseFloat(parts[3]), longitude: parseFloat(parts[4]), radius: parseFloat(parts[5])
                    };
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
    // LOAD DATA
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
        targetSelect.innerHTML = `<option value="">📚 Select ${sessionType === 'class' ? 'course' : 'clinical area'}...</option>`;
        options.forEach(opt => {
            const option = document.createElement('option');
            option.value = `${opt.id}|${opt.name}|${opt.type}|${opt.latitude}|${opt.longitude}|${opt.radius}`;
            option.textContent = opt.name;
            targetSelect.appendChild(option);
        });
        targetSelect.disabled = false;
        const targetGroup = document.getElementById('target-control-group');
        if (targetGroup) targetGroup.style.display = 'flex';
    }
    
    // ============================================
    // ✅ DO CHECK-IN - WITH BEAUTIFUL MODALS
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
            const location = await getAccurateLocation();
            await updateLocationDisplay(location);
            const distance = calculateDistance(location.lat, location.lon, selectedTarget.latitude, selectedTarget.longitude);
            const radius = selectedTarget.radius || 50;
            const accuracy = location.acc;
            
            let status = 'Absent', verificationNote = '';
            if (accuracy > radius * 2) { status = 'Pending'; verificationNote = `⚠️ GPS accuracy too low (±${accuracy.toFixed(0)}m)`; }
            else if (distance <= radius) { status = 'Present'; verificationNote = `✅ Verified within ${radius}m`; }
            else if (distance <= radius * 2) { status = 'Pending'; verificationNote = `⚠️ Within ${radius * 2}m, needs review`; }
            else { status = 'Absent'; verificationNote = `❌ Too far (${distance.toFixed(0)}m)`; }
            
            // ✅ BEAUTIFUL CONFIRMATION MODAL - NO "This site says"!
            const confirmed = await showConfirmModal({
                icon: '📍',
                title: 'Verify Check-in',
                subtitle: 'Please confirm your attendance details:',
                details: {
                    'Target': selectedTarget.name,
                    'Type': selectedTarget.type === 'class' ? 'Classroom' : 'Clinical',
                    'Location': location.address || 'Unknown',
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
            const supabase = getSupabase();
            const studentId = getCurrentStudentId();
            const sessionType = sessionTypeSelect?.value || 'class';
            
            const record = {
                student_id: studentId, check_in_time: new Date().toISOString(),
                session_type: sessionType, target_id: selectedTarget.id, target_name: selectedTarget.name,
                latitude: location.lat, longitude: location.lon, accuracy_m: location.acc,
                distance_meters: distance, is_verified: status === 'Present',
                attendance_status: status,
                target_latitude: selectedTarget.latitude, target_longitude: selectedTarget.longitude,
                location_address: location.address || null
            };
            if (sessionType === 'class') { record.unit_code = selectedTarget.name.split(' - ')[0]; }
            else { record.clinical_area = selectedTarget.name; }
            
            const { error } = await supabase.from('geo_attendance_logs').insert([record]);
            if (error) throw error;
            
            // ✅ BEAUTIFUL SUCCESS MODAL - NO "This site says"!
            showSuccessModal({
                target: selectedTarget.name,
                type: selectedTarget.type === 'class' ? 'Classroom' : 'Clinical',
                distance: distance.toFixed(0),
                accuracy: accuracy.toFixed(0),
                status: status,
                note: verificationNote
            });
            
            await updateStatsData();
            await loadHistory();
            
        } catch(error) {
            console.error('Check-in error:', error);
            showToast('Check-in failed: ' + error.message, 'error');
        } finally {
            btn.disabled = false;
            btn.innerHTML = '📍 Check In Now';
        }
    }
    
    // ============================================
    // ✅ LOAD HISTORY - FIXED
    // ============================================
    
    async function loadHistory() {
        const table = document.getElementById('geo-attendance-history');
        if (!table) { console.warn('History table not found'); return; }
        
        table.innerHTML = `<tr><td colspan="6">Loading attendance history...</td></tr>`;
        
        const supabase = getSupabase();
        if (!supabase) {
            table.innerHTML = `<tr><td colspan="6" style="color:#ef4444;">Database not available</td></tr>`;
            return;
        }
        
        const studentId = getCurrentStudentId();
        if (!studentId) {
            table.innerHTML = `<tr><td colspan="6">Please log in to view history</td></tr>`;
            return;
        }
        
        try {
            const { data, error } = await supabase
                .from('geo_attendance_logs')
                .select('*')
                .eq('student_id', studentId)
                .order('check_in_time', { ascending: false })
                .limit(20);
            
            if (error) {
                console.error('History error:', error);
                table.innerHTML = `<tr><td colspan="6" style="color:#ef4444;">Error: ${error.message}</td></tr>`;
                return;
            }
            
            if (!data || data.length === 0) {
                table.innerHTML = `<tr><td colspan="6">No attendance records found</td></tr>`;
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
                let statusColor = '#f59e0b', statusIcon = '⏳';
                if (status === 'Present' || status === 'Verified') { statusColor = '#10b981'; statusIcon = '✅'; }
                else if (status === 'Absent') { statusColor = '#ef4444'; statusIcon = '❌'; }
                const sessionIcon = log.session_type === 'class' ? '📚' : '🏥';
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
            updatePresentCount(data);
            
        } catch(e) {
            console.error('History error:', e);
            table.innerHTML = `<tr><td colspan="6" style="color:#ef4444;">Error: ${e.message}</td></tr>`;
        }
    }
    
    function updatePresentCount(records) {
        const presentEl = document.getElementById('stats-present-count');
        if (!presentEl) return;
        if (!records || records.length === 0) { presentEl.textContent = '0'; return; }
        const today = new Date(); today.setHours(0,0,0,0);
        const todayRecords = records.filter(log => {
            const logDate = new Date(log.check_in_time);
            return logDate >= today && (log.attendance_status === 'Present' || log.attendance_status === 'Verified');
        });
        presentEl.textContent = todayRecords.length;
    }
    
    async function updateStatsData() {
        const presentEl = document.getElementById('stats-present-count');
        if (!presentEl) { createStatsDisplayIfNeeded(); return; }
        const supabase = getSupabase();
        const studentId = getCurrentStudentId();
        if (!supabase || !studentId) { presentEl.textContent = '0'; return; }
        try {
            const today = new Date(); today.setHours(0,0,0,0);
            const { data, error } = await supabase
                .from('geo_attendance_logs')
                .select('id', { count: 'exact' })
                .eq('student_id', studentId)
                .eq('attendance_status', 'Present')
                .gte('check_in_time', today.toISOString());
            if (error) throw error;
            presentEl.textContent = data?.length || 0;
        } catch(e) { presentEl.textContent = '?'; }
    }
    
    function startTimeUpdates() {
        updateStatsData();
        setInterval(() => {
            const timeEl = document.getElementById('stats-current-time');
            if (timeEl) timeEl.textContent = new Date().toLocaleTimeString();
        }, 1000);
    }
    
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
            if (!data || data.length === 0) { table.innerHTML = `<tr><td colspan="6">No records for this period</td></tr>`; return; }
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
                let statusColor = '#f59e0b', statusIcon = '⏳';
                if (status === 'Present' || status === 'Verified') { statusColor = '#10b981'; statusIcon = '✅'; }
                else if (status === 'Absent') { statusColor = '#ef4444'; statusIcon = '❌'; }
                const sessionIcon = log.session_type === 'class' ? '📚' : '🏥';
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
        } catch(e) { console.error('Filter error:', e); }
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
            
            createStatsDisplayIfNeeded();
            addForceGPSButton();
            fixDropdown();
            
            await loadApprovedUnits();
            await loadClinicalLocations();
            await updateStatsData();
            startTimeUpdates();
            
            const sessionType = document.getElementById('session-type');
            if (sessionType) {
                sessionType.addEventListener('change', async () => {
                    const targetGroup = document.getElementById('target-control-group');
                    if (sessionType.value === 'class') { if (targetGroup) targetGroup.style.display = 'flex'; await populateTargetOptions('class'); }
                    else if (sessionType.value === 'clinical') { if (targetGroup) targetGroup.style.display = 'flex'; await populateTargetOptions('clinical'); }
                    else { if (targetGroup) targetGroup.style.display = 'none'; }
                });
                if (sessionType.value === 'class') await populateTargetOptions('class');
                else if (sessionType.value === 'clinical') await populateTargetOptions('clinical');
            }
            
            const filterSelect = document.getElementById('history-filter');
            if (filterSelect) filterSelect.addEventListener('change', filterHistory);
            
            const refreshBtn = document.getElementById('refresh-history');
            if (refreshBtn) refreshBtn.addEventListener('click', () => { loadHistory(); updateStatsData(); });
            
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
    
    window.refreshStats = updateStatsData;
    window.refreshHistory = loadHistory;
    window.filterHistory = filterHistory;
    window.getAccurateLocation = getAccurateLocation;
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
    console.log(`🏫 Campus: ${CAMPUS_COORDINATES.latitude}, ${CAMPUS_COORDINATES.longitude} (Kiamunyi)`);
    console.log('🎉 NO "This site says" popups! Beautiful modals only!');
    
})();
