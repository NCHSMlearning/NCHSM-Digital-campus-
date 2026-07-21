// js/lecturer-attendance.js
/**
 * NCHSM Lecturer Attendance Module
 * Uses dedicated lecturer database
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
    
    async init() {
        console.log('📋 Initializing Lecturer Attendance...');
        await this.loadAttendance();
        this.setupEventListeners();
        console.log('✅ Lecturer Attendance initialized');
    },
    
    async loadAttendance() {
        await Promise.all([
            this.loadTodayAttendance(),
            this.loadPastAttendance(),
            this.loadAttendanceStats()
        ]);
    },
    
    async loadTodayAttendance() {
        const tbody = document.getElementById('attendanceTable');
        if (!tbody) return;
        
        try {
            const profile = window.lecturerDB?.getCurrentUserProfile();
            const program = profile?.program || profile?.department;
            
            if (!program) {
                tbody.innerHTML = '<tr><td colspan="12">No program found</td></tr>';
                return;
            }
            
            const today = new Date();
            
            // ✅ Use lecturerDB
            const logs = await window.lecturerDB.getAttendance(program, today);
            this.todayLogs = logs;
            this.renderTodayAttendance();
            
        } catch (error) {
            console.error('Failed to load today attendance:', error);
            tbody.innerHTML = `<tr><td colspan="12" style="color:#ef4444;">Error: ${error.message}</td></tr>`;
        }
    },
    
    renderTodayAttendance() {
        const tbody = document.getElementById('attendanceTable');
        if (!tbody) return;
        
        const logs = this.todayLogs.filter(log => log.session_type !== 'Lecturer Check-in');
        
        if (!logs.length) {
            tbody.innerHTML = '<tr><td colspan="12" style="text-align:center;padding:30px;color:#9ca3af;">No student records today.</td></tr>';
            return;
        }
        
        tbody.innerHTML = logs.map(log => {
            const student = log.student || {};
            const hasLocation = log.latitude && log.longitude;
            const status = log.attendance_status || (log.is_verified ? 'Present' : 'Pending');
            const statusClass = status === 'Present' ? 'status-present' : 
                              status === 'Absent' ? 'status-absent' : 'status-pending';
            
            return `
                <tr>
                    <td>${window.LecturerUtils?.escapeHtml(student.full_name || 'Unknown') || student.full_name || 'Unknown'}</td>
                    <td>${window.LecturerUtils?.escapeHtml(student.student_id || 'N/A') || student.student_id || 'N/A'}</td>
                    <td>${window.LecturerUtils?.escapeHtml(student.program || 'N/A') || student.program || 'N/A'}</td>
                    <td>${window.LecturerUtils?.escapeHtml(student.block || 'N/A') || student.block || 'N/A'}</td>
                    <td>${window.LecturerUtils?.escapeHtml(student.intake_year || 'N/A') || student.intake_year || 'N/A'}</td>
                    <td><span class="session-type-badge type-${(log.session_type || 'class').toLowerCase()}">${window.LecturerUtils?.escapeHtml(log.session_type || 'Class') || log.session_type || 'Class'}</span></td>
                    <td>${window.LecturerUtils?.escapeHtml(log.target_name || log.unit_code || 'General') || log.target_name || 'General'}</td>
                    <td>${window.LecturerUtils?.formatDateTime(log.check_in_time) || log.check_in_time || 'N/A'}</td>
                    <td>${window.LecturerUtils?.escapeHtml(log.location_friendly_name || log.location_address || 'N/A') || log.location_friendly_name || 'N/A'}</td>
                    <td>${log.distance_meters ? (log.distance_meters / 1000).toFixed(2) + 'km' : 'N/A'}</td>
                    <td><span class="${statusClass}">${status}</span></td>
                    <td>
                        ${hasLocation ? 
                            `<button class="btn btn-action btn-small" onclick="LecturerAttendance.viewMap(${log.latitude}, ${log.longitude}, '${window.LecturerUtils?.escapeHtml(student.full_name) || student.full_name || 'Student'}')">
                                <i class="fas fa-map-marker-alt"></i>
                            </button>` : 
                            '<span style="color:#9ca3af;">No location</span>'
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
                tbody.innerHTML = '<tr><td colspan="11">No program found</td></tr>';
                return;
            }
            
            // ✅ Use lecturerDB
            const logs = await window.lecturerDB.getAttendance(program);
            this.pastLogs = logs;
            this.renderPastAttendance();
            
        } catch (error) {
            console.error('Failed to load past attendance:', error);
            tbody.innerHTML = `<tr><td colspan="11" style="color:#ef4444;">Error: ${error.message}</td></tr>`;
        }
    },
    
    renderPastAttendance() {
        const tbody = document.getElementById('pastAttendanceTable');
        if (!tbody) return;
        
        const logs = this.pastLogs.filter(log => log.session_type !== 'Lecturer Check-in');
        
        if (!logs.length) {
            tbody.innerHTML = '<tr><td colspan="11" style="text-align:center;padding:30px;color:#9ca3af;">No past records found.</td></tr>';
            return;
        }
        
        tbody.innerHTML = logs.map(log => {
            const student = log.student || {};
            const status = log.attendance_status || (log.is_verified ? 'Present' : 'Pending');
            const statusClass = status === 'Present' ? 'status-present' : 
                              status === 'Absent' ? 'status-absent' : 'status-pending';
            const dt = log.check_in_time ? new Date(log.check_in_time) : new Date();
            
            return `
                <tr>
                    <td>${dt.toLocaleDateString('en-GB')}</td>
                    <td>${window.LecturerUtils?.escapeHtml(student.full_name || 'Unknown') || student.full_name || 'Unknown'}</td>
                    <td>${window.LecturerUtils?.escapeHtml(student.student_id || 'N/A') || student.student_id || 'N/A'}</td>
                    <td>${window.LecturerUtils?.escapeHtml(student.program || 'N/A') || student.program || 'N/A'}</td>
                    <td>${window.LecturerUtils?.escapeHtml(student.block || 'N/A') || student.block || 'N/A'}</td>
                    <td><span class="session-type-badge type-${(log.session_type || 'class').toLowerCase()}">${window.LecturerUtils?.escapeHtml(log.session_type || 'Class') || log.session_type || 'Class'}</span></td>
                    <td>${window.LecturerUtils?.escapeHtml(log.target_name || log.unit_code || 'General') || log.target_name || 'General'}</td>
                    <td>${dt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</td>
                    <td>${window.LecturerUtils?.escapeHtml(log.location_friendly_name || log.location_address || 'N/A') || log.location_friendly_name || 'N/A'}</td>
                    <td><span class="${statusClass}">${status}</span></td>
                    <td>${window.LecturerUtils?.escapeHtml(log.student_name || 'Student') || log.student_name || 'Student'}</td>
                </tr>
            `;
        }).join('');
    },
    
    async loadAttendanceStats() {
        try {
            const profile = window.lecturerDB?.getCurrentUserProfile();
            const program = profile?.program || profile?.department;
            
            if (!program) return;
            
            const today = new Date();
            
            // ✅ Use lecturerDB
            const logs = await window.lecturerDB.getAttendance(program, today);
            
            const present = logs.filter(l => l.attendance_status === 'Present' || l.is_verified === true).length || 0;
            const absent = logs.filter(l => l.attendance_status === 'Absent').length || 0;
            const pending = logs.filter(l => l.attendance_status === 'Pending' && l.is_verified !== true).length || 0;
            const total = logs.length || 0;
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
    
    viewMap(lat, lng, name) {
        if (!lat || !lng) {
            if (window.LecturerUI) {
                window.LecturerUI.showNotification('No location data.', 'info');
            }
            return;
        }
        
        if (window.LecturerUI) {
            window.LecturerUI.openModal('mapModal');
        }
        document.getElementById('mapDetails').textContent = `Location for ${name}`;
        
        if (window.mapboxMap) {
            window.mapboxMap.remove();
        }
        
        window.mapboxMap = L.map('mapbox-map').setView([parseFloat(lat), parseFloat(lng)], 16);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap'
        }).addTo(window.mapboxMap);
        
        L.marker([parseFloat(lat), parseFloat(lng)])
            .addTo(window.mapboxMap)
            .bindPopup(`<b>${name}</b>`)
            .openPopup();
        
        setTimeout(() => window.mapboxMap.invalidateSize(), 300);
    },
    
    async lecturerCheckIn() {
        const btn = document.getElementById('lecturerCheckinBtn');
        if (!btn) return;
        
        btn.disabled = true;
        btn.textContent = 'Marking...';
        
        if (!navigator.geolocation) {
            if (window.LecturerUI) {
                window.LecturerUI.showNotification('Geolocation not supported.', 'error');
            }
            btn.disabled = false;
            btn.textContent = 'Mark My Attendance';
            return;
        }
        
        navigator.geolocation.getCurrentPosition(async (pos) => {
            try {
                const userId = window.lecturerDB?.getCurrentUserId();
                const profile = window.lecturerDB?.getCurrentUserProfile();
                
                // ✅ Use lecturerDB
                await window.lecturerDB.supabase
                    .from('geo_attendance_logs')
                    .insert({
                        student_id: userId,
                        check_in_time: new Date().toISOString(),
                        session_type: 'Lecturer Check-in',
                        latitude: pos.coords.latitude,
                        longitude: pos.coords.longitude,
                        accuracy_m: pos.coords.accuracy || null,
                        attendance_status: 'Present',
                        is_verified: true,
                        target_name: 'Lecturer Check-in',
                        location_address: 'Lecturer Check-in',
                        student_name: profile?.full_name || 'Lecturer',
                        program: profile?.program || profile?.department
                    });
                
                if (window.LecturerUI) {
                    window.LecturerUI.showNotification('✅ Lecturer check-in logged!', 'success');
                }
                await this.loadTodayAttendance();
                
            } catch (error) {
                if (window.LecturerUI) {
                    window.LecturerUI.showNotification('Check-in failed: ' + error.message, 'error');
                }
            } finally {
                btn.disabled = false;
                btn.textContent = 'Mark My Attendance';
            }
        }, (error) => {
            if (window.LecturerUI) {
                window.LecturerUI.showNotification('Geolocation error: ' + error.message, 'error');
            }
            btn.disabled = false;
            btn.textContent = 'Mark My Attendance';
        });
    },
    
    async markStudentAttendance(e) {
        e.preventDefault();
        const btn = e.submitter || e.target.querySelector('button[type="submit"]');
        btn.disabled = true;
        btn.textContent = 'Marking...';
        
        const studentId = document.getElementById('attStudentId')?.value;
        const sessionType = document.getElementById('attSessionType')?.value;
        const courseId = document.getElementById('attCourseId')?.value;
        const location = document.getElementById('attLocation')?.value;
        const date = document.getElementById('attDate')?.value;
        const time = document.getElementById('attTime')?.value;
        
        if (!studentId || !sessionType || !date) {
            if (window.LecturerUI) {
                window.LecturerUI.showNotification('Student, Session Type, and Date required.', 'error');
            }
            btn.disabled = false;
            btn.textContent = 'Mark Student Present';
            return;
        }
        
        try {
            const profile = window.lecturerDB?.getCurrentUserProfile();
            
            // ✅ Use lecturerDB
            const { data: student } = await window.lecturerDB.supabase
                .from('consolidated_user_profiles_table')
                .select('full_name, program, block, intake_year')
                .eq('user_id', studentId)
                .single();
            
            const { data: course } = await window.lecturerDB.supabase
                .from('courses')
                .select('course_name')
                .eq('id', courseId)
                .single();
            
            const courseName = course?.course_name || 'General';
            
            await window.lecturerDB.supabase
                .from('geo_attendance_logs')
                .insert({
                    student_id: studentId,
                    check_in_time: `${date}T${time || '12:00'}:00.000Z`,
                    session_type: sessionType,
                    target_id: courseId || null,
                    target_name: courseName,
                    attendance_status: 'Present',
                    is_verified: true,
                    location_address: `MANUAL: ${location || 'N/A'} (By ${profile?.full_name || 'Lecturer'})`,
                    student_name: student?.full_name || 'Student',
                    program: student?.program || profile?.program,
                    block: student?.block || profile?.block,
                    intake_year: student?.intake_year || profile?.intake_year,
                    unit_code: courseId || null,
                    clinical_area: sessionType === 'Clinical' ? courseName : null
                });
            
            if (window.LecturerUI) {
                window.LecturerUI.showNotification(`✅ ${student?.full_name || 'Student'} marked present!`, 'success');
            }
            e.target.reset();
            await this.loadAttendance();
            
        } catch (error) {
            if (window.LecturerUI) {
                window.LecturerUI.showNotification('Failed: ' + error.message, 'error');
            }
        } finally {
            btn.disabled = false;
            btn.textContent = 'Mark Student Present';
        }
    },
    
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
            if (el) el.addEventListener('change', () => this.applyFilters());
        });
        
        const searchInput = document.getElementById('filterSearch');
        if (searchInput) {
            searchInput.addEventListener('keyup', () => this.applyFilters());
        }
        
        document.getElementById('closeMapModal')?.addEventListener('click', () => {
            if (window.LecturerUI) {
                window.LecturerUI.closeModal('mapModal');
            }
        });
    },
    
    applyFilters() {
        // Filter implementation
        this.renderTodayAttendance();
    },
    
    exportCSV() {
        const logs = this.todayLogs.filter(log => log.session_type !== 'Lecturer Check-in');
        if (!logs.length) {
            if (window.LecturerUI) {
                window.LecturerUI.showNotification('No data to export.', 'warning');
            }
            return;
        }
        
        const headers = ['Student Name', 'Reg No', 'Program', 'Block/Term', 'Year', 'Session Type', 'Course', 'Date/Time', 'Location', 'Distance', 'Status'];
        const rows = [headers.join(',')];
        
        logs.forEach(log => {
            const student = log.student || {};
            const status = log.attendance_status || (log.is_verified ? 'Present' : 'Pending');
            const row = [
                `"${(student.full_name || 'Unknown')}"`,
                `"${(student.student_id || 'N/A')}"`,
                `"${(student.program || 'N/A')}"`,
                `"${(student.block || 'N/A')}"`,
                `"${(student.intake_year || 'N/A')}"`,
                `"${(log.session_type || 'Class')}"`,
                `"${(log.target_name || 'General')}"`,
                `"${window.LecturerUtils?.formatDateTime(log.check_in_time) || log.check_in_time || 'N/A'}"`,
                `"${(log.location_friendly_name || log.location_address || 'N/A')}"`,
                `${log.distance_meters ? (log.distance_meters / 1000).toFixed(2) : 'N/A'}`,
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
        
        if (window.LecturerUI) {
            window.LecturerUI.showNotification('✅ Attendance exported!', 'success');
        }
    },
    
    async refresh() {
        await this.loadAttendance();
        if (window.LecturerUI) {
            window.LecturerUI.showNotification('Attendance refreshed!', 'success');
        }
    }
};

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => LecturerAttendance.init(), 750);
});

window.LecturerAttendance = LecturerAttendance;
