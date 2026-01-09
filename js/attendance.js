// attendance.js - FIXED TO MATCH YOUR HTML
(function() {
    'use strict';
    
    console.log('📱 Attendance System Loading...');
    
    // Variables
    let currentLocation = null;
    let clinicalAreas = [];
    let userProfile = null;
    let userId = null;
    
    // Initialize on DOM ready
    document.addEventListener('DOMContentLoaded', function() {
        console.log('📱 Initializing Attendance System...');
        
        // Get elements - using IDs from YOUR HTML
        const sessionTypeSelect = document.getElementById('session-type');
        const targetSelect = document.getElementById('attendance-target');
        const checkInButton = document.getElementById('check-in-button');
        const historyBody = document.getElementById('geo-attendance-history');
        
        console.log('🔍 Found elements:', {
            sessionTypeSelect: !!sessionTypeSelect,
            targetSelect: !!targetSelect,
            checkInButton: !!checkInButton,
            historyBody: !!historyBody
        });
        
        // Set up event listeners
        if (sessionTypeSelect) {
            sessionTypeSelect.addEventListener('change', handleSessionTypeChange);
            console.log('✅ Added session type listener');
        }
        
        if (checkInButton) {
            checkInButton.addEventListener('click', performCheckIn);
            console.log('✅ Added check-in button listener');
        }
        
        // Start location tracking
        startLocationTracking();
        
        // Load data
        loadAttendanceData();
        
        // Update time every minute
        updateCurrentTime();
        setInterval(updateCurrentTime, 60000);
        
        console.log('✅ Attendance System initialized');
    });
    
    // Update current time display
    function updateCurrentTime() {
        const timeElement = document.getElementById('current-time');
        if (timeElement) {
            const now = new Date();
            timeElement.textContent = now.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            });
        }
    }
    
    // Handle session type change - SIMPLIFIED
    function handleSessionTypeChange() {
        console.log('🎯 Session type changed');
        
        const sessionTypeSelect = document.getElementById('session-type');
        const targetSelect = document.getElementById('attendance-target');
        const targetGroup = document.getElementById('target-control-group');
        
        if (!sessionTypeSelect || !targetSelect || !targetGroup) {
            console.error('❌ Missing required elements');
            return;
        }
        
        const sessionType = sessionTypeSelect.value;
        console.log('Selected session type:', sessionType);
        
        // Show/hide target group
        if (sessionType) {
            targetGroup.style.display = 'flex';
            populateTargetOptions(sessionType);
        } else {
            targetGroup.style.display = 'none';
            targetSelect.innerHTML = '<option value="">Select session type first...</option>';
        }
        
        updateCheckInButton();
    }
    
    // Populate target options - SIMPLIFIED
    function populateTargetOptions(sessionType) {
        const targetSelect = document.getElementById('attendance-target');
        if (!targetSelect) return;
        
        targetSelect.innerHTML = '<option value="">Loading options...</option>';
        
        // Get options based on session type
        let options = [];
        
        if (sessionType === 'Clinical') {
            options = clinicalAreas.map(area => ({
                value: area.id,
                text: area.name
            }));
        } else if (sessionType === 'Class') {
            // Get active courses
            if (window.coursesModule?.activeCourses) {
                options = window.coursesModule.activeCourses.map(course => ({
                    value: course.id,
                    text: course.course_name || 'Unnamed Course'
                }));
            } else {
                options = [{
                    value: 'no-courses',
                    text: 'No active courses found'
                }];
            }
        } else if (sessionType === 'Lab') {
            options = [
                { value: 'lab1', text: 'Anatomy Laboratory' },
                { value: 'lab2', text: 'Chemistry Laboratory' },
                { value: 'lab3', text: 'Microbiology Laboratory' }
            ];
        }
        
        // Populate dropdown
        targetSelect.innerHTML = '<option value="">Select target...</option>';
        
        if (options.length === 0) {
            targetSelect.innerHTML += '<option value="">No options available</option>';
            targetSelect.disabled = true;
        } else {
            options.forEach(option => {
                const opt = document.createElement('option');
                opt.value = option.value;
                opt.textContent = option.text;
                targetSelect.appendChild(opt);
            });
            targetSelect.disabled = false;
        }
        
        console.log(`✅ Populated ${options.length} options for ${sessionType}`);
    }
    
    // Update check-in button
    function updateCheckInButton() {
        const button = document.getElementById('check-in-button');
        const sessionType = document.getElementById('session-type')?.value;
        const target = document.getElementById('attendance-target')?.value;
        
        if (!button) return;
        
        const isReady = sessionType && target && currentLocation;
        button.disabled = !isReady;
        
        console.log('🔘 Check-in button:', {
            ready: isReady,
            sessionType: !!sessionType,
            target: !!target,
            location: !!currentLocation
        });
    }
    
    // Start location tracking - SIMPLIFIED
    function startLocationTracking() {
        if (!navigator.geolocation) {
            console.warn('⚠️ Geolocation not supported');
            return;
        }
        
        const options = {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        };
        
        navigator.geolocation.getCurrentPosition(
            function(position) {
                currentLocation = {
                    lat: position.coords.latitude,
                    lon: position.coords.longitude,
                    acc: position.coords.accuracy
                };
                
                console.log('📍 Got location:', currentLocation);
                updateLocationDisplay();
                updateCheckInButton();
            },
            function(error) {
                console.warn('⚠️ Location error:', error.message);
                currentLocation = null;
                updateCheckInButton();
            },
            options
        );
    }
    
    // Update location display
    function updateLocationDisplay() {
        if (!currentLocation) return;
        
        const latElement = document.getElementById('latitude');
        const lonElement = document.getElementById('longitude');
        const accElement = document.getElementById('accuracy-value');
        
        if (latElement) latElement.textContent = currentLocation.lat.toFixed(6);
        if (lonElement) lonElement.textContent = currentLocation.lon.toFixed(6);
        if (accElement) accElement.textContent = currentLocation.acc.toFixed(1);
    }
    
    // Load attendance data
    async function loadAttendanceData() {
        console.log('📥 Loading attendance data...');
        
        try {
            // Get user info
            userProfile = window.db?.currentUserProfile;
            userId = window.db?.currentUserId;
            
            if (!userProfile || !userId) {
                console.warn('⚠️ User not logged in');
                return;
            }
            
            console.log('👤 User:', {
                name: userProfile.full_name,
                program: userProfile.program,
                id: userId
            });
            
            // Load clinical areas
            await loadClinicalAreas();
            
            // Load today's attendance
            await loadTodayAttendance();
            
            // Load history
            await loadAttendanceHistory();
            
            console.log('✅ Attendance data loaded');
            
        } catch (error) {
            console.error('❌ Error loading attendance data:', error);
        }
    }
    
    // Load clinical areas
    async function loadClinicalAreas() {
        try {
            const supabase = window.db?.supabase;
            if (!supabase) return;
            
            const program = userProfile.program;
            const intakeYear = userProfile.intake_year;
            
            if (!program || !intakeYear) return;
            
            const { data, error } = await supabase
                .from('clinical_areas')
                .select('id, name')
                .ilike('program', program)
                .ilike('intake_year', intakeYear)
                .order('name');
            
            if (!error && data) {
                clinicalAreas = data;
                console.log(`✅ Loaded ${clinicalAreas.length} clinical areas`);
            }
            
        } catch (error) {
            console.error('Error loading clinical areas:', error);
        }
    }
    
    // Load today's attendance
    async function loadTodayAttendance() {
        const todayElement = document.getElementById('present-today');
        if (!todayElement || !userId) return;
        
        try {
            const supabase = window.db?.supabase;
            if (!supabase) return;
            
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            const { count, error } = await supabase
                .from('geo_attendance_logs')
                .select('*', { count: 'exact', head: true })
                .eq('student_id', userId)
                .gte('check_in_time', today.toISOString());
            
            if (!error) {
                todayElement.textContent = count || 0;
            }
            
        } catch (error) {
            console.error('Error loading today attendance:', error);
        }
    }
    
    // Load attendance history - FIXED
    async function loadAttendanceHistory() {
        const historyBody = document.getElementById('geo-attendance-history');
        if (!historyBody || !userId) {
            console.log('❌ No history body or user ID');
            return;
        }
        
        console.log('📋 Loading attendance history...');
        
        try {
            const supabase = window.db?.supabase;
            if (!supabase) {
                throw new Error('Database not available');
            }
            
            const { data: logs, error } = await supabase
                .from('geo_attendance_logs')
                .select('check_in_time, session_type, target_name, is_verified')
                .eq('student_id', userId)
                .order('check_in_time', { ascending: false })
                .limit(20);
            
            if (error) throw error;
            
            console.log(`📊 Found ${logs?.length || 0} attendance logs`);
            
            // Clear loading message
            historyBody.innerHTML = '';
            
            if (!logs || logs.length === 0) {
                historyBody.innerHTML = `
                    <tr>
                        <td colspan="4" style="text-align: center; padding: 20px; color: #666;">
                            No attendance records found.
                        </td>
                    </tr>
                `;
                return;
            }
            
            // Populate table
            logs.forEach(log => {
                const time = new Date(log.check_in_time);
                const timeStr = time.toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });
                
                const verifiedText = log.is_verified ? '✅ Verified' : '⏳ Pending';
                const verifiedClass = log.is_verified ? 'verified' : 'pending';
                
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${timeStr}</td>
                    <td>${log.session_type || 'N/A'}</td>
                    <td>${log.target_name || 'N/A'}</td>
                    <td class="attendance-status ${verifiedClass}">${verifiedText}</td>
                `;
                historyBody.appendChild(row);
            });
            
        } catch (error) {
            console.error('❌ Error loading history:', error);
            historyBody.innerHTML = `
                <tr>
                    <td colspan="4" style="color: #ef4444; padding: 20px; text-align: center;">
                        Error loading attendance history: ${error.message}
                    </td>
                </tr>
            `;
        }
    }
    
    // Perform check-in - SIMPLIFIED
    async function performCheckIn() {
        console.log('📍 Starting check-in process...');
        
        const button = document.getElementById('check-in-button');
        const sessionTypeSelect = document.getElementById('session-type');
        const targetSelect = document.getElementById('attendance-target');
        
        if (!button || !sessionTypeSelect || !targetSelect) {
            console.error('❌ Missing required elements');
            return;
        }
        
        // Disable button during process
        button.disabled = true;
        const originalText = button.textContent;
        button.textContent = 'Checking in...';
        
        try {
            // Get values
            const sessionType = sessionTypeSelect.value;
            const targetValue = targetSelect.value;
            
            if (!sessionType || !targetValue) {
                throw new Error('Please select session type and target');
            }
            
            if (!currentLocation) {
                throw new Error('Location not available');
            }
            
            if (!userId || !userProfile) {
                throw new Error('User not logged in');
            }
            
            // Parse target
            const [targetId, targetName] = targetValue.split('|');
            
            // Prepare check-in data
            const checkInData = {
                student_id: userId,
                check_in_time: new Date().toISOString(),
                session_type: sessionType,
                target_id: targetId,
                target_name: targetName,
                latitude: currentLocation.lat,
                longitude: currentLocation.lon,
                accuracy_m: currentLocation.acc,
                is_verified: true, // For now, always verified
                student_name: userProfile.full_name || 'Unknown',
                program: userProfile.program,
                block: userProfile.block
            };
            
            console.log('📤 Saving check-in:', checkInData);
            
            // Save to database
            const supabase = window.db?.supabase;
            if (!supabase) {
                throw new Error('Database not available');
            }
            
            const { error } = await supabase
                .from('geo_attendance_logs')
                .insert([checkInData]);
            
            if (error) throw error;
            
            console.log('✅ Check-in saved successfully');
            
            // Show success message
            if (window.AppUtils?.showToast) {
                window.AppUtils.showToast(`Checked in to ${targetName}`, 'success');
            }
            
            // Reset form
            sessionTypeSelect.value = '';
            targetSelect.value = '';
            targetSelect.disabled = true;
            document.getElementById('target-control-group').style.display = 'none';
            
            // Refresh data
            await loadTodayAttendance();
            await loadAttendanceHistory();
            
        } catch (error) {
            console.error('❌ Check-in failed:', error);
            
            // Show error message
            if (window.AppUtils?.showToast) {
                window.AppUtils.showToast(`Check-in failed: ${error.message}`, 'error');
            }
        } finally {
            // Restore button
            button.disabled = false;
            button.textContent = originalText;
        }
    }
    
    // Add CSS for attendance status
    const style = document.createElement('style');
    style.textContent = `
        .attendance-status {
            font-weight: 600;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 0.85em;
        }
        
        .attendance-status.verified {
            background-color: #d1fae5;
            color: #065f46;
        }
        
        .attendance-status.pending {
            background-color: #fef3c7;
            color: #92400e;
        }
        
        #check-in-button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
        
        #check-in-button:not(:disabled):hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(76, 29, 149, 0.2);
        }
    `;
    document.head.appendChild(style);
    
    // Make functions available globally
    window.attendanceRefresh = loadAttendanceData;
    window.attendanceCheckIn = performCheckIn;
    
    console.log('✅ Attendance System ready');
})();
