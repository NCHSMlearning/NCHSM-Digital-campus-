// js/lecturer-attendance.js
/**
 * NCHSM Lecturer Attendance Module
 * Uses geo_attendance_logs table with correct column names
 * Includes map view functionality
 */

const LecturerAttendance = {
    todayLogs: [],
    pastLogs: [],
    filters: {
        date: '',
        block: 'All',
        year: 'All',
        sessionType: 'All',
        search: ''
    },
    lecturerAssignmentId: null,
    assignedUnits: [],
    mapInstance: null,
    currentLocation: null,
    
    async init() {
        console.log('📋 Initializing Lecturer Attendance...');
        await this.resolveLecturerId();
        await this.loadAssignedUnits();
        await this.loadAttendance();
        this.setupEventListeners();
        this.populateFilters();
        console.log('✅ Lecturer Attendance initialized');
    },
    
    // ============================================
    // RESOLVE THE CORRECT LECTURER ID
    // ============================================
    async resolveLecturerId() {
        try {
            const supabase = window.lecturerDB?.supabase;
            if (!supabase) {
                console.warn('Supabase not available');
                return;
            }
            
            const profile = window.lecturerDB?.getCurrentUserProfile();
            if (!profile) {
                console.warn('No lecturer profile found');
                return;
            }
            
            const fullName = profile.full_name;
            const authId = profile.user_id;
            
            console.log('🔍 Auth ID:', authId);
            console.log('🔍 Lecturer name:', fullName);
            
            const { data: nameData, error: nameError } = await supabase
                .from('lecturer_subject_assignments')
                .select('lecturer_id, lecturer_name')
                .ilike('lecturer_name', `%${fullName}%`);
            
            if (!nameError && nameData && nameData.length > 0) {
                const nonStaff = nameData.find(l => !l.lecturer_id.toString().startsWith('STAFF'));
                if (nonStaff) {
                    this.lecturerAssignmentId = nonStaff.lecturer_id;
                    console.log('✅ Found non-STAFF ID by partial name match:', this.lecturerAssignmentId);
                    return;
                }
                this.lecturerAssignmentId = nameData[0].lecturer_id;
                console.log('⚠️ Found STAFF ID by partial name match:', this.lecturerAssignmentId);
                return;
            }
            
            this.lecturerAssignmentId = authId;
            console.log('⚠️ Falling back to auth ID:', this.lecturerAssignmentId);
            
        } catch (error) {
            console.error('Error resolving lecturer ID:', error);
            this.lecturerAssignmentId = null;
        }
    },
    
    // ============================================
    // LOAD ASSIGNED UNITS
    // ============================================
    async loadAssignedUnits() {
        try {
            const supabase = window.lecturerDB?.supabase;
            if (!supabase) return;
            
            const profile = window.lecturerDB?.getCurrentUserProfile();
            if (!profile) return;
            
            const lecturerId = this.lecturerAssignmentId || profile.user_id;
            
            const { data: assignments, error } = await supabase
                .from('lecturer_subject_assignments')
                .select('subject_name, subject_code, block, program, academic_year')
                .eq('lecturer_id', lecturerId);
            
            if (error) {
                console.error('Error loading assigned units:', error);
                return;
            }
            
            this.assignedUnits = assignments || [];
            console.log(`📚 Loaded ${this.assignedUnits.length} assigned units`);
            
            // Populate unit dropdown
            this.populateUnitSelectors();
            
        } catch (error) {
            console.error('Failed to load assigned units:', error);
        }
    },
    
    populateUnitSelectors() {
        const unitSelect = document.getElementById('attUnit');
        if (!unitSelect) return;
        
        const units = this.assignedUnits;
        
        if (units && units.length > 0) {
            unitSelect.innerHTML = '<option value="">-- Select Unit --</option>' +
                units.map(u => 
                    `<option value="${u.subject_name}">${u.subject_code ? u.subject_code + ' - ' : ''}${u.subject_name}</option>`
                ).join('');
        } else {
            unitSelect.innerHTML = '<option value="">-- No units assigned --</option>';
        }
    },
    
    // ============================================
    // LOAD ATTENDANCE DATA
    // ============================================
    async loadAttendance() {
        await Promise.all([
            this.loadTodayAttendance(),
            this.loadPastAttendance(),
            this.loadAttendanceStats(),
            this.loadProgramInfo()
        ]);
    },
    
    async loadProgramInfo() {
        try {
            const profile = window.lecturerDB?.getCurrentUserProfile();
            const program = profile?.program || profile?.department;
            
            if (!program) return;
            
            const supabase = window.lecturerDB?.supabase;
            if (!supabase) return;
            
            // Get student count
            const { count: studentCount } = await supabase
                .from('consolidated_user_profiles_table')
                .select('*', { count: 'exact', head: true })
                .eq('program', program)
                .eq('role', 'student');
            
            // Get block from assigned units
            const blocks = [...new Set(this.assignedUnits.map(u => u.block).filter(Boolean))];
            const currentBlock = blocks.length > 0 ? blocks[0] : 'N/A';
            
            const programDisplay = window.LecturerUtils?.getProgramDisplayName(program) || program;
            const isTVET = program !== 'KRCHN';
            
            document.getElementById('programDisplayName').textContent = programDisplay;
            document.getElementById('programTypeBadge').textContent = isTVET ? 'TVET' : 'Nursing';
            document.getElementById('currentBlockDisplay').textContent = currentBlock;
            document.getElementById('studentCountDisplay').textContent = studentCount || 0 + ' Students';
            
        } catch (error) {
            console.error('Failed to load program info:', error);
        }
    },
    
    async loadTodayAttendance() {
        const tbody = document.getElementById('attendanceTable');
        if (!tbody) return;
        
        try {
            const profile = window.lecturerDB?.getCurrentUserProfile();
            const program = profile?.program || profile?.department;
            
            if (!program) {
                tbody.innerHTML = '<tr><td colspan="10" style="padding:30px;text-align:center;color:#94a3b8;">No program found</td></tr>';
                return;
            }
            
            const today = new Date();
            const todayStr = today.toISOString().split('T')[0];
            const supabase = window.lecturerDB?.supabase;
            
            if (!supabase) {
                tbody.innerHTML = '<tr><td colspan="10" style="padding:30px;text-align:center;color:#94a3b8;">Database not available</td></tr>';
                return;
            }
            
            // ✅ Use correct column names
            const { data: logs, error } = await supabase
                .from('geo_attendance_logs')
                .select('*')
                .eq('program', program)
                .eq('session_type', 'Class')
                .gte('check_in_time', `${todayStr}T00:00:00.000Z`)
                .lte('check_in_time', `${todayStr}T23:59:59.999Z`)
                .order('check_in_time', { ascending: false });
            
            if (error) throw error;
            
            this.todayLogs = logs || [];
            this.renderTodayAttendance();
            
        } catch (error) {
            console.error('Failed to load today attendance:', error);
            tbody.innerHTML = `<tr><td colspan="10" style="padding:30px;text-align:center;color:#ef4444;">Error: ${error.message}</td></tr>`;
        }
    },
    
    renderTodayAttendance() {
        const tbody = document.getElementById('attendanceTable');
        if (!tbody) return;
        
        const logs = this.todayLogs;
        const countEl = document.getElementById('todayLogCount');
        if (countEl) countEl.textContent = `${logs.length} records`;
        
        if (!logs || logs.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="10" style="padding:40px;text-align:center;color:#94a3b8;">
                        <i class="fas fa-calendar-day" style="font-size:32px;display:block;margin-bottom:10px;color:#e2e8f0;"></i>
                        <p style="margin:0;">No student attendance records today.</p>
                    </td>
                </tr>
            `;
            return;
        }
        
        const statusColors = {
            'Present': '#10b981',
            'Absent': '#ef4444',
            'Pending': '#f59e0b',
            'Late': '#f59e0b',
            'Excused': '#3b82f6'
        };
        
        tbody.innerHTML = logs.map(log => {
            const hasLocation = log.latitude && log.longitude;
            const status = log.attendance_status || 'Pending';
            const statusColor = statusColors[status] || '#6b7280';
            
            return `
                <tr style="border-bottom: 1px solid #f1f5f9; transition: background 0.2s;" 
                    onmouseover="this.style.background='#f8fafc'" 
                    onmouseout="this.style.background='transparent'">
                    <td style="padding: 12px 16px; font-weight: 500; color: #1e293b;">
                        ${this.escapeHtml(log.student_name || 'Unknown')}
                    </td>
                    <td style="padding: 12px 16px; font-weight: 600; color: #4C1D95;">
                        ${this.escapeHtml(log.student_id || 'N/A')}
                    </td>
                    <td style="padding: 12px 16px; color: #475569;">
                        ${this.escapeHtml(log.program || 'N/A')}
                    </td>
                    <td style="padding: 12px 16px; color: #475569;">
                        ${this.escapeHtml(log.block || 'N/A')}
                    </td>
                    <td style="padding: 12px 16px; color: #475569;">
                        ${this.escapeHtml(log.unit_name || log.target_name || 'General')}
                    </td>
                    <td style="padding: 12px 16px;">
                        <span style="background: #dbeafe; color: #1e40af; padding: 2px 10px; border-radius: 12px; font-size: 11px;">
                            ${this.escapeHtml(log.session_type || 'Class')}
                        </span>
                    </td>
                    <td style="padding: 12px 16px; color: #475569; font-size: 13px;">
                        ${log.check_in_time ? new Date(log.check_in_time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                    </td>
                    <td style="padding: 12px 16px; color: #475569; font-size: 13px;">
                        ${this.escapeHtml(log.location_friendly_name || log.location_address || 'N/A')}
                    </td>
                    <td style="padding: 12px 16px; text-align: center;">
                        <span style="background: ${statusColor}20; color: ${statusColor}; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 500;">
                            ${status}
                        </span>
                    </td>
                    <td style="padding: 12px 16px; text-align: center;">
                        ${hasLocation ? 
                            `<button onclick="LecturerAttendance.viewAttendanceMap(${log.latitude}, ${log.longitude}, '${this.escapeHtml(log.student_name || 'Student')}')" 
                                    style="background: #4C1D95; color: white; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 12px; display: inline-flex; align-items: center; gap: 4px;"
                                    onmouseover="this.style.background='#5b21b6'" onmouseout="this.style.background='#4C1D95'">
                                <i class="fas fa-map-marker-alt"></i> View Map
                            </button>` : 
                            `<span style="color: #94a3b8; font-size: 12px;">No location</span>`
                        }
                    </td>
                </tr>
            `;
        }).join('');
    },
    
    async loadPastAttendance() {
        const tbody = document.getElementById('pastAttendanceTable');
        if (!tbody) return;
        
        try {
            const profile = window.lecturerDB?.getCurrentUserProfile();
            const program = profile?.program || profile?.department;
            
            if (!program) {
                tbody.innerHTML = '<tr><td colspan="10" style="padding:30px;text-align:center;color:#94a3b8;">No program found</td></tr>';
                return;
            }
            
            const today = new Date();
            const todayStr = today.toISOString().split('T')[0];
            const supabase = window.lecturerDB?.supabase;
            
            if (!supabase) {
                tbody.innerHTML = '<tr><td colspan="10" style="padding:30px;text-align:center;color:#94a3b8;">Database not available</td></tr>';
                return;
            }
            
            // ✅ Use correct column names
            const { data: logs, error } = await supabase
                .from('geo_attendance_logs')
                .select('*')
                .eq('program', program)
                .eq('session_type', 'Class')
                .lt('check_in_time', `${todayStr}T00:00:00.000Z`)
                .order('check_in_time', { ascending: false })
                .limit(100);
            
            if (error) throw error;
            
            this.pastLogs = logs || [];
            this.renderPastAttendance();
            
        } catch (error) {
            console.error('Failed to load past attendance:', error);
            tbody.innerHTML = `<tr><td colspan="10" style="padding:30px;text-align:center;color:#ef4444;">Error: ${error.message}</td></tr>`;
        }
    },
    
    renderPastAttendance() {
        const tbody = document.getElementById('pastAttendanceTable');
        if (!tbody) return;
        
        const logs = this.pastLogs;
        const countEl = document.getElementById('pastLogCount');
        if (countEl) countEl.textContent = `${logs.length} records`;
        
        if (!logs || logs.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="10" style="padding:40px;text-align:center;color:#94a3b8;">
                        <i class="fas fa-history" style="font-size:32px;display:block;margin-bottom:10px;color:#e2e8f0;"></i>
                        <p style="margin:0;">No past attendance records found.</p>
                    </td>
                </tr>
            `;
            return;
        }
        
        const statusColors = {
            'Present': '#10b981',
            'Absent': '#ef4444',
            'Pending': '#f59e0b',
            'Late': '#f59e0b',
            'Excused': '#3b82f6'
        };
        
        tbody.innerHTML = logs.map(log => {
            const hasLocation = log.latitude && log.longitude;
            const status = log.attendance_status || 'Pending';
            const statusColor = statusColors[status] || '#6b7280';
            const date = log.check_in_time ? new Date(log.check_in_time) : new Date();
            
            return `
                <tr style="border-bottom: 1px solid #f1f5f9; transition: background 0.2s;" 
                    onmouseover="this.style.background='#f8fafc'" 
                    onmouseout="this.style.background='transparent'">
                    <td style="padding: 12px 16px; color: #475569; font-size: 13px;">
                        ${date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td style="padding: 12px 16px; font-weight: 500; color: #1e293b;">
                        ${this.escapeHtml(log.student_name || 'Unknown')}
                    </td>
                    <td style="padding: 12px 16px; font-weight: 600; color: #4C1D95;">
                        ${this.escapeHtml(log.student_id || 'N/A')}
                    </td>
                    <td style="padding: 12px 16px; color: #475569;">
                        ${this.escapeHtml(log.block || 'N/A')}
                    </td>
                    <td style="padding: 12px 16px; color: #475569;">
                        ${this.escapeHtml(log.unit_name || log.target_name || 'General')}
                    </td>
                    <td style="padding: 12px 16px;">
                        <span style="background: #dbeafe; color: #1e40af; padding: 2px 10px; border-radius: 12px; font-size: 11px;">
                            ${this.escapeHtml(log.session_type || 'Class')}
                        </span>
                    </td>
                    <td style="padding: 12px 16px; color: #475569; font-size: 13px;">
                        ${date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td style="padding: 12px 16px; color: #475569; font-size: 13px;">
                        ${this.escapeHtml(log.location_friendly_name || log.location_address || 'N/A')}
                    </td>
                    <td style="padding: 12px 16px; text-align: center;">
                        <span style="background: ${statusColor}20; color: ${statusColor}; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 500;">
                            ${status}
                        </span>
                    </td>
                    <td style="padding: 12px 16px; text-align: center;">
                        ${hasLocation ? 
                            `<button onclick="LecturerAttendance.viewAttendanceMap(${log.latitude}, ${log.longitude}, '${this.escapeHtml(log.student_name || 'Student')}')" 
                                    style="background: #4C1D95; color: white; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 12px; display: inline-flex; align-items: center; gap: 4px;"
                                    onmouseover="this.style.background='#5b21b6'" onmouseout="this.style.background='#4C1D95'">
                                <i class="fas fa-map-marker-alt"></i> View Map
                            </button>` : 
                            `<span style="color: #94a3b8; font-size: 12px;">No location</span>`
                        }
                    </td>
                </tr>
            `;
        }).join('');
    },
    
    // ============================================
    // VIEW ATTENDANCE MAP
    // ============================================
    viewAttendanceMap(lat, lng, name) {
        if (!lat || !lng) {
            window.showNotification('No location data available.', 'warning');
            return;
        }
        
        this.currentLocation = { lat: parseFloat(lat), lng: parseFloat(lng), name: name };
        
        const modal = document.getElementById('attendanceMapModal');
        if (modal) {
            modal.style.display = 'flex';
        }
        
        const infoEl = document.getElementById('mapLocationInfo');
        const textEl = document.getElementById('mapLocationText');
        if (infoEl && textEl) {
            infoEl.style.display = 'block';
            textEl.textContent = `📍 ${name} - Latitude: ${lat}, Longitude: ${lng}`;
        }
        
        setTimeout(() => {
            this.initMap(lat, lng, name);
        }, 300);
    },
    
    initMap(lat, lng, name) {
        const container = document.getElementById('mapContainer');
        if (!container) return;
        
        if (this.mapInstance) {
            this.mapInstance.remove();
            this.mapInstance = null;
        }
        
        const loadingEl = document.getElementById('mapLoading');
        if (loadingEl) loadingEl.style.display = 'none';
        
        if (typeof L === 'undefined') {
            container.innerHTML = `
                <div style="display:flex;align-items:center;justify-content:center;height:100%;color:#94a3b8;flex-direction:column;">
                    <i class="fas fa-map" style="font-size:48px;margin-bottom:10px;"></i>
                    <p>Map library not loaded. Please check your internet connection.</p>
                    <button onclick="LecturerAttendance.initMap(${lat}, ${lng}, '${name}')" 
                            style="margin-top:10px;background:#4C1D95;color:white;border:none;padding:8px 20px;border-radius:6px;cursor:pointer;">
                        Retry
                    </button>
                </div>
            `;
            return;
        }
        
        this.mapInstance = L.map(container).setView([lat, lng], 16);
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
            maxZoom: 19
        }).addTo(this.mapInstance);
        
        L.marker([lat, lng])
            .addTo(this.mapInstance)
            .bindPopup(`<b>${name}</b><br>Lat: ${lat.toFixed(6)}<br>Lng: ${lng.toFixed(6)}`)
            .openPopup();
        
        L.circle([lat, lng], {
            radius: 50,
            color: '#4C1D95',
            fillColor: '#4C1D95',
            fillOpacity: 0.1,
            weight: 2
        }).addTo(this.mapInstance);
        
        setTimeout(() => {
            if (this.mapInstance) {
                this.mapInstance.invalidateSize();
            }
        }, 400);
    },
    
    // ============================================
    // LOAD ATTENDANCE STATS
    // ============================================
    async loadAttendanceStats() {
        try {
            const profile = window.lecturerDB?.getCurrentUserProfile();
            const program = profile?.program || profile?.department;
            
            if (!program) return;
            
            const today = new Date();
            const todayStr = today.toISOString().split('T')[0];
            const supabase = window.lecturerDB?.supabase;
            
            if (!supabase) return;
            
            // ✅ Use correct column names
            const { data: logs, error } = await supabase
                .from('geo_attendance_logs')
                .select('attendance_status, is_verified')
                .eq('program', program)
                .eq('session_type', 'Class')
                .gte('check_in_time', `${todayStr}T00:00:00.000Z`)
                .lte('check_in_time', `${todayStr}T23:59:59.999Z`);
            
            if (error) throw error;
            
            const present = logs?.filter(l => l.attendance_status === 'Present' || l.is_verified === true).length || 0;
            const absent = logs?.filter(l => l.attendance_status === 'Absent').length || 0;
            const pending = logs?.filter(l => l.attendance_status === 'Pending' && l.is_verified !== true).length || 0;
            const total = logs?.length || 0;
            const rate = total > 0 ? Math.round((present / total) * 100) : 0;
            
            document.getElementById('todayPresent').textContent = present;
            document.getElementById('todayAbsent').textContent = absent;
            document.getElementById('todayPending').textContent = pending;
            document.getElementById('attendanceRate').textContent = rate + '%';
            document.getElementById('filteredCount').textContent = total;
            
        } catch (error) {
            console.error('Failed to load attendance stats:', error);
        }
    },
    
    // ============================================
    // LECTURER CHECK-IN
    // ============================================
    async lecturerCheckIn() {
        const btn = document.getElementById('lecturerCheckinBtn');
        const statusEl = document.getElementById('lecturerCheckinStatus');
        if (!btn) return;
        
        btn.disabled = true;
        btn.textContent = 'Marking...';
        if (statusEl) statusEl.textContent = 'Getting location...';
        
        if (!navigator.geolocation) {
            window.showNotification('Geolocation not supported.', 'error');
            btn.disabled = false;
            btn.textContent = 'Mark My Attendance';
            if (statusEl) statusEl.textContent = '';
            return;
        }
        
        navigator.geolocation.getCurrentPosition(async (pos) => {
            try {
                const userId = this.lecturerAssignmentId || window.lecturerDB?.getCurrentUserId();
                const profile = window.lecturerDB?.getCurrentUserProfile();
                const supabase = window.lecturerDB?.supabase;
                
                if (!supabase || !userId) {
                    throw new Error('Database or user not available');
                }
                
                // Check if already checked in today
                const today = new Date().toISOString().split('T')[0];
                const { data: existing } = await supabase
                    .from('geo_attendance_logs')
                    .select('id')
                    .eq('student_id', userId)
                    .eq('session_type', 'Lecturer Check-in')
                    .gte('check_in_time', `${today}T00:00:00.000Z`)
                    .lte('check_in_time', `${today}T23:59:59.999Z`)
                    .limit(1);
                
                if (existing && existing.length > 0) {
                    window.showNotification('You have already checked in today!', 'warning');
                    if (statusEl) statusEl.textContent = '✅ Already checked in today';
                    btn.disabled = false;
                    btn.textContent = 'Mark My Attendance';
                    return;
                }
                
                // ✅ Use correct column names
                const { error } = await supabase
                    .from('geo_attendance_logs')
                    .insert({
                        student_id: userId,
                        student_name: profile?.full_name || 'Lecturer',
                        check_in_time: new Date().toISOString(),
                        session_type: 'Lecturer Check-in',
                        latitude: pos.coords.latitude,
                        longitude: pos.coords.longitude,
                        accuracy_m: pos.coords.accuracy || null,
                        attendance_status: 'Present',
                        is_verified: true,
                        target_name: 'Lecturer Check-in',
                        location_address: 'Lecturer Check-in',
                        program: profile?.program || profile?.department,
                        role: 'lecturer'
                    });
                
                if (error) throw error;
                
                window.showNotification('✅ Lecturer check-in logged!', 'success');
                if (statusEl) statusEl.textContent = '✅ Checked in successfully';
                await this.loadTodayAttendance();
                
            } catch (error) {
                console.error('Check-in error:', error);
                window.showNotification('Check-in failed: ' + error.message, 'error');
                if (statusEl) statusEl.textContent = '❌ Check-in failed';
            } finally {
                btn.disabled = false;
                btn.textContent = 'Mark My Attendance';
            }
        }, (error) => {
            console.error('Geolocation error:', error);
            window.showNotification('Geolocation error: ' + error.message, 'error');
            btn.disabled = false;
            btn.textContent = 'Mark My Attendance';
            if (statusEl) statusEl.textContent = '❌ Location unavailable';
        });
    },
    
    // ============================================
    // MARK STUDENT ATTENDANCE
    // ============================================
    async markStudentAttendance(e) {
        e.preventDefault();
        const btn = e.submitter || e.target.querySelector('button[type="submit"]');
        const originalText = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Marking...';
        
        const studentId = document.getElementById('attStudentId')?.value;
        const sessionType = document.getElementById('attSessionType')?.value;
        const unit = document.getElementById('attUnit')?.value;
        const location = document.getElementById('attLocation')?.value;
        const date = document.getElementById('attDate')?.value;
        const time = document.getElementById('attTime')?.value;
        
        if (!studentId || !sessionType || !date) {
            window.showNotification('Student, Session Type, and Date required.', 'error');
            btn.disabled = false;
            btn.innerHTML = originalText;
            return;
        }
        
        try {
            const supabase = window.lecturerDB?.supabase;
            const profile = window.lecturerDB?.getCurrentUserProfile();
            
            if (!supabase || !profile) {
                throw new Error('Database not available');
            }
            
            // Get student details
            const { data: student } = await supabase
                .from('consolidated_user_profiles_table')
                .select('full_name, program, block, intake_year, student_id')
                .eq('user_id', studentId)
                .single();
            
            if (!student) {
                throw new Error('Student not found');
            }
            
            // ✅ Use correct column names
            await supabase
                .from('geo_attendance_logs')
                .insert({
                    student_id: studentId,
                    student_name: student.full_name || 'Student',
                    check_in_time: `${date}T${time || '12:00'}:00.000Z`,
                    session_type: sessionType,
                    target_name: unit || 'General',
                    unit_name: unit || 'General',
                    attendance_status: 'Present',
                    is_verified: true,
                    is_manual_entry: true,
                    location_friendly_name: location || 'Manual Entry',
                    location_address: `MANUAL: ${location || 'N/A'} (By ${profile.full_name || 'Lecturer'})`,
                    program: student.program || profile.program,
                    block: student.block || profile.block,
                    intake_year: student.intake_year || profile.intake_year,
                    role: 'student'
                });
            
            window.showNotification(`✅ ${student.full_name || 'Student'} marked present!`, 'success');
            e.target.reset();
            
            const today = new Date();
            document.getElementById('attDate').value = today.toISOString().split('T')[0];
            
            await this.loadAttendance();
            
        } catch (error) {
            console.error('Mark attendance error:', error);
            window.showNotification('Failed to mark attendance: ' + error.message, 'error');
        } finally {
            btn.disabled = false;
            btn.innerHTML = originalText;
        }
    },
    
    // ============================================
    // POPULATE FILTERS
    // ============================================
    populateFilters() {
        const filterDate = document.getElementById('filterDate');
        if (filterDate) {
            filterDate.value = new Date().toISOString().split('T')[0];
        }
        
        const attDate = document.getElementById('attDate');
        if (attDate) {
            attDate.value = new Date().toISOString().split('T')[0];
        }
        
        this.populateStudentSelect();
    },
    
    async populateStudentSelect() {
        try {
            const profile = window.lecturerDB?.getCurrentUserProfile();
            const program = profile?.program || profile?.department;
            const supabase = window.lecturerDB?.supabase;
            
            if (!supabase || !program) return;
            
            const { data: students } = await supabase
                .from('consolidated_user_profiles_table')
                .select('user_id, full_name, student_id')
                .eq('program', program)
                .eq('role', 'student')
                .order('full_name', { ascending: true });
            
            const select = document.getElementById('attStudentId');
            if (select && students) {
                select.innerHTML = '<option value="">-- Select Student --</option>' +
                    students.map(s => 
                        `<option value="${s.user_id}">${this.escapeHtml(s.full_name)} (${this.escapeHtml(s.student_id || 'N/A')})</option>`
                    ).join('');
            }
            
        } catch (error) {
            console.error('Failed to populate student select:', error);
        }
    },
    
    // ============================================
    // FILTERS
    // ============================================
    applyFilters() {
        this.renderTodayAttendance();
    },
    
    resetFilters() {
        const filterIds = ['filterDate', 'filterBlock', 'filterYear', 'filterSessionType'];
        filterIds.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                if (id === 'filterDate') {
                    el.value = new Date().toISOString().split('T')[0];
                } else {
                    el.value = 'All';
                }
            }
        });
        
        const searchEl = document.getElementById('filterSearch');
        if (searchEl) searchEl.value = '';
        
        this.applyFilters();
        window.showNotification('Filters reset!', 'info');
    },
    
    // ============================================
    // EXPORT CSV
    // ============================================
    exportCSV() {
        const logs = this.todayLogs.filter(log => log.session_type !== 'Lecturer Check-in');
        if (!logs || logs.length === 0) {
            window.showNotification('No data to export.', 'warning');
            return;
        }
        
        const headers = ['Student Name', 'Reg No', 'Program', 'Block', 'Unit', 'Session Type', 'Date/Time', 'Location', 'Status'];
        const rows = [headers.join(',')];
        
        logs.forEach(log => {
            const status = log.attendance_status || (log.is_verified ? 'Present' : 'Pending');
            const date = log.check_in_time ? new Date(log.check_in_time) : new Date();
            
            const row = [
                `"${(log.student_name || 'Unknown')}"`,
                `"${(log.student_id || 'N/A')}"`,
                `"${(log.program || 'N/A')}"`,
                `"${(log.block || 'N/A')}"`,
                `"${(log.unit_name || log.target_name || 'General')}"`,
                `"${(log.session_type || 'Class')}"`,
                `"${date.toLocaleString('en-GB')}"`,
                `"${(log.location_friendly_name || log.location_address || 'N/A')}"`,
                `"${status}"`
            ];
            rows.push(row.join(','));
        });
        
        const csv = rows.join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `attendance_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        
        window.showNotification('✅ Attendance exported!', 'success');
    },
    
    // ============================================
    // PRINT REPORT
    // ============================================
    printReport() {
        window.print();
    },
    
    // ============================================
    // SETUP EVENT LISTENERS
    // ============================================
    setupEventListeners() {
        const checkinBtn = document.getElementById('lecturerCheckinBtn');
        if (checkinBtn) {
            checkinBtn.addEventListener('click', () => this.lecturerCheckIn());
        }
        
        const form = document.getElementById('manualAttendanceForm');
        if (form) {
            form.addEventListener('submit', (e) => this.markStudentAttendance(e));
        }
        
        ['filterDate', 'filterBlock', 'filterYear', 'filterSessionType'].forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('change', () => this.applyFilters());
            }
        });
        
        const searchInput = document.getElementById('filterSearch');
        if (searchInput) {
            let timeout;
            searchInput.addEventListener('input', () => {
                clearTimeout(timeout);
                timeout = setTimeout(() => this.applyFilters(), 300);
            });
        }
    },
    
    // ============================================
    // UTILITY FUNCTIONS
    // ============================================
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },
    
    // ============================================
    // REFRESH
    // ============================================
    async refresh() {
        await this.resolveLecturerId();
        await this.loadAssignedUnits();
        await this.loadAttendance();
        this.populateFilters();
        window.showNotification('Attendance refreshed!', 'success');
    }
};

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => LecturerAttendance.init(), 750);
});

// Make globally accessible
window.LecturerAttendance = LecturerAttendance;
window.viewAttendanceMap = (lat, lng, name) => LecturerAttendance.viewAttendanceMap(lat, lng, name);
window.applyAttendanceFilters = () => LecturerAttendance.applyFilters();
window.resetAttendanceFilters = () => LecturerAttendance.resetFilters();
window.exportAttendanceCSV = () => LecturerAttendance.exportCSV();
window.printAttendanceReport = () => LecturerAttendance.printReport();
window.lecturerCheckin = () => LecturerAttendance.lecturerCheckIn();
window.markAttendance = (e) => LecturerAttendance.markStudentAttendance(e);
window.closeAttendanceMap = () => {
    const modal = document.getElementById('attendanceMapModal');
    if (modal) modal.style.display = 'none';
    if (LecturerAttendance.mapInstance) {
        LecturerAttendance.mapInstance.remove();
        LecturerAttendance.mapInstance = null;
    }
};
window.openInGoogleMaps = () => {
    const loc = LecturerAttendance.currentLocation;
    if (loc) {
        window.open(`https://www.google.com/maps?q=${loc.lat},${loc.lng}`, '_blank');
    }
};

console.log('✅ LecturerAttendance module loaded - Using geo_attendance_logs with correct columns');
