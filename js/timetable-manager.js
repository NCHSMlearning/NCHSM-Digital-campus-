// =====================================================
// STUDENT TIMETABLE MODULE - COMPLETE FIXED VERSION
// =====================================================

// =====================================================
// 🔧 SUPABASE CLIENT HELPER
// =====================================================

function getSupabase() {
    // Try multiple sources
    if (window.supabase && typeof window.supabase.from === 'function') {
        return window.supabase;
    }
    if (window.db?.supabase && typeof window.db.supabase.from === 'function') {
        return window.db.supabase;
    }
    if (window.NCHSMLogin?.supabase && typeof window.NCHSMLogin.supabase.from === 'function') {
        return window.NCHSMLogin.supabase;
    }
    return null;
}

// =====================================================
// 📅 STUDENT TIMETABLE MODULE
// =====================================================

let studentTimetableData = [];
let currentStudentBlock = null;

// Initialize timetable when page loads
async function initStudentTimetable() {
    console.log('📅 Loading student timetable...');
    
    // Get fresh supabase client
    const supabaseClient = getSupabase();
    if (!supabaseClient) {
        console.error('❌ Supabase client not available. Retrying...');
        setTimeout(initStudentTimetable, 1000);
        return;
    }
    
    const container = document.getElementById('timetable-container');
    const loadingDiv = document.getElementById('timetable-loading');
    const emptyDiv = document.getElementById('timetable-empty');
    
    if (!container) {
        console.log('⏳ Timetable container not found, waiting...');
        setTimeout(initStudentTimetable, 500);
        return;
    }
    
    // Show loading
    if (loadingDiv) loadingDiv.style.display = 'block';
    if (container) container.style.display = 'none';
    if (emptyDiv) emptyDiv.style.display = 'none';
    
    try {
        // Get student's block from profile
        let studentBlock = null;
        let retryCount = 0;
        const maxRetries = 10;
        
        while (!studentBlock && retryCount < maxRetries) {
            // Check currentUserProfile
            if (window.currentUserProfile?.block) {
                studentBlock = window.currentUserProfile.block;
                console.log(`📌 Block from currentUserProfile: ${studentBlock}`);
                break;
            }
            
            // Check db.currentUserProfile
            if (window.db?.currentUserProfile?.block) {
                studentBlock = window.db.currentUserProfile.block;
                console.log(`📌 Block from db.currentUserProfile: ${studentBlock}`);
                break;
            }
            
            // Check profileModule
            if (window.profileModule?.userProfile?.block) {
                studentBlock = window.profileModule.userProfile.block;
                console.log(`📌 Block from profileModule: ${studentBlock}`);
                break;
            }
            
            // Direct database query
            try {
                const { data: { user } } = await supabaseClient.auth.getUser();
                if (user) {
                    const { data: profile, error } = await supabaseClient
                        .from('consolidated_user_profiles_table')
                        .select('block, program, full_name, intake_year')
                        .eq('user_id', user.id)
                        .single();
                    
                    if (profile?.block) {
                        studentBlock = profile.block;
                        console.log(`📌 Block from direct DB: ${studentBlock}`);
                        // Also update window.currentUserProfile for future use
                        if (!window.currentUserProfile) {
                            window.currentUserProfile = profile;
                        }
                        break;
                    }
                }
            } catch (e) {
                console.log('⏳ DB not ready, retrying...');
            }
            
            retryCount++;
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        // If no block found
        if (!studentBlock || studentBlock === 'null' || studentBlock === '') {
            console.error('❌ No block assigned to student');
            if (loadingDiv) loadingDiv.style.display = 'none';
            if (emptyDiv) {
                const msgElement = emptyDiv.querySelector('#empty-message-text') || emptyDiv.querySelector('p');
                if (msgElement) msgElement.innerHTML = 'Your block has not been assigned yet. Please contact administrator.';
                emptyDiv.style.display = 'block';
            }
            return;
        }
        
        currentStudentBlock = studentBlock;
        
        // Update block title
        const blockTitleSpan = document.getElementById('timetable-block-title');
        if (blockTitleSpan) blockTitleSpan.textContent = studentBlock;
        
        // Fetch timetable from database
        const { data: timetable, error } = await supabaseClient
            .from('timetables')
            .select('*')
            .eq('block', studentBlock)
            .order('week_number', { ascending: true })
            .order('day_of_week', { ascending: true })
            .order('start_time', { ascending: true });
        
        if (error) {
            console.error('❌ Timetable fetch error:', error);
            if (loadingDiv) loadingDiv.style.display = 'none';
            if (emptyDiv) {
                const msgElement = emptyDiv.querySelector('#empty-message-text') || emptyDiv.querySelector('p');
                if (msgElement) msgElement.innerHTML = 'Error loading schedule. Please try again.';
                emptyDiv.style.display = 'block';
            }
            return;
        }
        
        if (!timetable || timetable.length === 0) {
            console.log(`ℹ️ No timetable found for ${studentBlock}`);
            if (loadingDiv) loadingDiv.style.display = 'none';
            if (emptyDiv) {
                const msgElement = emptyDiv.querySelector('#empty-message-text') || emptyDiv.querySelector('p');
                if (msgElement) msgElement.innerHTML = `No schedule available for ${studentBlock} yet.`;
                emptyDiv.style.display = 'block';
            }
            return;
        }
        
        studentTimetableData = timetable;
        console.log(`✅ Loaded ${timetable.length} entries for ${studentBlock}`);
        
        // Update class count
        const countDisplay = document.getElementById('class-count-display');
        if (countDisplay) countDisplay.textContent = `${timetable.length} classes`;
        
        // Show next class widget
        showNextClassWidget(timetable);
        
        // Update week dropdown
        updateWeekDropdown(timetable);
        
        // Render timetable (all weeks by default)
        renderTimetable('all');
        
        // Hide loading, show container
        if (loadingDiv) loadingDiv.style.display = 'none';
        if (container) container.style.display = 'block';
        if (emptyDiv) emptyDiv.style.display = 'none';
        
    } catch (error) {
        console.error('❌ Error loading timetable:', error);
        if (loadingDiv) loadingDiv.style.display = 'none';
        if (emptyDiv) {
            const msgElement = emptyDiv.querySelector('#empty-message-text') || emptyDiv.querySelector('p');
            if (msgElement) msgElement.innerHTML = 'Error loading schedule. Please refresh the page.';
            emptyDiv.style.display = 'block';
        }
    }
}

// =====================================================
// 🎯 NEXT CLASS WIDGET
// =====================================================

function showNextClassWidget(timetable) {
    const nextClass = findNextClass(timetable);
    const snapWidget = document.getElementById('next-class-snap');
    
    if (!snapWidget) return;
    
    if (!nextClass) {
        snapWidget.style.display = 'none';
        return;
    }
    
    snapWidget.style.display = 'block';
    
    const startTime = nextClass.start_time ? nextClass.start_time.substring(0, 5) : 'TBA';
    const endTime = nextClass.end_time ? nextClass.end_time.substring(0, 5) : 'TBA';
    
    const nameEl = document.getElementById('next-class-name');
    const lecturerEl = document.getElementById('next-class-lecturer');
    const timeEl = document.getElementById('next-class-time');
    const venueEl = document.getElementById('next-class-venue');
    const dayEl = document.getElementById('next-class-day');
    
    if (nameEl) nameEl.innerHTML = escapeHtml(nextClass.session_name || nextClass.course_name || 'Class');
    if (lecturerEl) lecturerEl.innerHTML = escapeHtml(nextClass.lecturer_name || 'TBA');
    if (timeEl) timeEl.innerHTML = `${startTime} - ${endTime}`;
    if (venueEl) venueEl.innerHTML = escapeHtml(nextClass.venue || 'TBD');
    
    const dayNames = { 
        monday: 'Monday', 
        tuesday: 'Tuesday', 
        wednesday: 'Wednesday', 
        thursday: 'Thursday', 
        friday: 'Friday' 
    };
    
    const today = new Date();
    const todayDay = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][today.getDay()];
    
    if (dayEl) {
        if (nextClass.day_of_week === todayDay) {
            dayEl.innerHTML = '🟢 Today';
        } else {
            dayEl.innerHTML = `📅 ${dayNames[nextClass.day_of_week] || nextClass.day_of_week}`;
        }
    }
}

// Find next upcoming class
function findNextClass(timetable) {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTime = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;
    
    const dayMap = { 1: 'monday', 2: 'tuesday', 3: 'wednesday', 4: 'thursday', 5: 'friday' };
    const currentDayIndex = now.getDay();
    const currentDay = dayMap[currentDayIndex];
    
    // Check today's upcoming classes (not holiday)
    if (currentDay) {
        const todayClasses = timetable.filter(c => 
            c.day_of_week === currentDay && !c.is_holiday && c.start_time > currentTime
        );
        todayClasses.sort((a, b) => a.start_time.localeCompare(b.start_time));
        
        if (todayClasses.length > 0) {
            return todayClasses[0];
        }
    }
    
    // Check next days
    for (let i = currentDayIndex + 1; i <= 5; i++) {
        const nextDay = dayMap[i];
        if (nextDay) {
            const nextClasses = timetable.filter(c => 
                c.day_of_week === nextDay && !c.is_holiday
            );
            nextClasses.sort((a, b) => a.start_time.localeCompare(b.start_time));
            
            if (nextClasses.length > 0) {
                return nextClasses[0];
            }
        }
    }
    
    return null;
}

// =====================================================
// 📊 WEEK DROPDOWN
// =====================================================

function updateWeekDropdown(timetable) {
    const dropdown = document.getElementById('week-filter-select');
    if (!dropdown) return;
    
    const uniqueWeeks = [...new Set(timetable.map(item => item.week_number))].sort((a, b) => a - b);
    
    let options = '<option value="all">📅 All Weeks</option>';
    uniqueWeeks.forEach(week => {
        options += `<option value="${week}">Week ${week}</option>`;
    });
    
    dropdown.innerHTML = options;
    
    // Remove old listener and add new one
    const newDropdown = dropdown.cloneNode(true);
    dropdown.parentNode.replaceChild(newDropdown, dropdown);
    newDropdown.addEventListener('change', function(e) {
        const weekValue = e.target.value;
        renderTimetable(weekValue);
    });
}

// =====================================================
// 🗓️ RENDER TIMETABLE
// =====================================================

function renderTimetable(weekFilter) {
    const container = document.getElementById('timetable-container');
    if (!container) return;
    
    let filteredData = studentTimetableData;
    if (weekFilter !== 'all') {
        filteredData = studentTimetableData.filter(item => item.week_number == weekFilter);
    }
    
    if (filteredData.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 30px; color: #9ca3af;">
                <i class="fas fa-calendar-week" style="font-size: 28px;"></i>
                <p style="margin-top: 8px; font-size: 13px;">No classes this week</p>
            </div>
        `;
        return;
    }
    
    // Group by day
    const daysOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
    const dayNames = { monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed', thursday: 'Thu', friday: 'Fri' };
    
    const grouped = {};
    daysOrder.forEach(day => { grouped[day] = []; });
    
    filteredData.forEach(cls => {
        if (grouped[cls.day_of_week]) {
            grouped[cls.day_of_week].push(cls);
        }
    });
    
    // Sort by time within each day
    Object.keys(grouped).forEach(day => {
        grouped[day].sort((a, b) => a.start_time.localeCompare(b.start_time));
    });
    
    // Build HTML
    let html = `
        <style>
            .timetable-compact {
                width: 100%;
                border-collapse: collapse;
                font-size: 12px;
                background: white;
                border-radius: 8px;
                overflow: hidden;
            }
            .timetable-compact th {
                background: #f8f9fa;
                padding: 8px 10px;
                text-align: left;
                font-weight: 600;
                color: #374151;
                border-bottom: 1px solid #e5e7eb;
                font-size: 11px;
            }
            .timetable-compact td {
                padding: 8px 10px;
                border-bottom: 1px solid #f0f0f0;
                vertical-align: top;
            }
            .timetable-compact tr:hover {
                background: #faf5ff;
            }
            .timetable-day {
                font-weight: 600;
                width: 55px;
                background: #faf5ff;
            }
            .timetable-time {
                font-family: monospace;
                font-size: 11px;
                white-space: nowrap;
                width: 70px;
            }
            .timetable-course {
                font-weight: 500;
                font-size: 12px;
            }
            .timetable-lecturer, .timetable-venue {
                font-size: 11px;
                color: #6b7280;
            }
            .badge-tiny {
                display: inline-block;
                padding: 1px 5px;
                border-radius: 3px;
                font-size: 9px;
                margin-left: 5px;
            }
            .badge-exam { background: #fef3c7; color: #d97706; }
            .badge-holiday { background: #fee2e2; color: #dc2626; }
            .badge-pending { background: #f3f4f6; color: #6b7280; }
            @media (max-width: 768px) {
                .timetable-compact th,
                .timetable-compact td {
                    padding: 6px 8px;
                }
                .timetable-day {
                    width: 45px;
                }
                .timetable-time {
                    font-size: 10px;
                    width: 60px;
                }
            }
        </style>
        <table class="timetable-compact">
            <thead>
                <tr>
                    <th>Day</th>
                    <th>Time</th>
                    <th>Course</th>
                    <th>Lecturer</th>
                    <th>Venue</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    for (const day of daysOrder) {
        const classes = grouped[day];
        
        if (classes.length === 0) {
            html += `
                <tr>
                    <td class="timetable-day">${dayNames[day]}</td>
                    <td colspan="4" style="color: #9ca3af; text-align: center;">—</td>
                </tr>
            `;
        } else {
            classes.forEach((cls, idx) => {
                let badges = '';
                if (cls.is_exam) badges += '<span class="badge-tiny badge-exam">Exam</span>';
                if (cls.is_holiday) badges += '<span class="badge-tiny badge-holiday">Holiday</span>';
                if (cls.pending_allocation) badges += '<span class="badge-tiny badge-pending">Pending</span>';
                
                const startTime = cls.start_time ? cls.start_time.substring(0, 5) : 'TBA';
                const endTime = cls.end_time ? cls.end_time.substring(0, 5) : 'TBA';
                
                // Shorten lecturer name (first two words)
                let lecturerName = cls.lecturer_name || 'TBA';
                if (lecturerName !== 'TBA') {
                    const nameParts = lecturerName.split(' ');
                    lecturerName = nameParts.slice(0, 2).join(' ');
                }
                
                html += `
                    <tr>
                        ${idx === 0 ? `<td class="timetable-day" rowspan="${classes.length}">${dayNames[day]}</td>` : ''}
                        <td class="timetable-time">${startTime}-${endTime}</td>
                        <td class="timetable-course">
                            <strong>${escapeHtml(cls.session_name || cls.course_name || 'Class')}</strong>${badges}
                        </td>
                        <td class="timetable-lecturer">${escapeHtml(lecturerName)}</td>
                        <td class="timetable-venue">${escapeHtml(cls.venue || 'TBD')}</td>
                    </tr>
                `;
            });
        }
    }
    
    html += `
            </tbody>
        </table>
    `;
    
    container.innerHTML = html;
}

// =====================================================
// 🔧 HELPER FUNCTIONS
// =====================================================

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// =====================================================
// 🔄 FORCE REFRESH (for manual testing)
// =====================================================

window.forceRefreshTimetable = async function(blockName = null) {
    const supabaseClient = getSupabase();
    if (!supabaseClient) {
        console.error('❌ Supabase client not available');
        return false;
    }
    
    const block = blockName || window.currentUserProfile?.block;
    
    if (!block) {
        console.error('❌ No block specified');
        return false;
    }
    
    console.log(`🔄 Force refreshing timetable for ${block}`);
    
    try {
        const { data: timetable, error } = await supabaseClient
            .from('timetables')
            .select('*')
            .eq('block', block)
            .order('week_number', { ascending: true })
            .order('day_of_week', { ascending: true })
            .order('start_time', { ascending: true });
        
        if (error) {
            console.error('❌ Fetch error:', error);
            return false;
        }
        
        if (timetable && timetable.length > 0) {
            studentTimetableData = timetable;
            currentStudentBlock = block;
            
            // Update UI
            const blockTitleSpan = document.getElementById('timetable-block-title');
            if (blockTitleSpan) blockTitleSpan.textContent = block;
            
            const countDisplay = document.getElementById('class-count-display');
            if (countDisplay) countDisplay.textContent = `${timetable.length} classes`;
            
            showNextClassWidget(timetable);
            updateWeekDropdown(timetable);
            renderTimetable('all');
            
            // Hide loading/empty
            const loadingDiv = document.getElementById('timetable-loading');
            const container = document.getElementById('timetable-container');
            const emptyDiv = document.getElementById('timetable-empty');
            
            if (loadingDiv) loadingDiv.style.display = 'none';
            if (container) container.style.display = 'block';
            if (emptyDiv) emptyDiv.style.display = 'none';
            
            console.log(`✅ Rendered ${timetable.length} entries for ${block}`);
            return true;
        } else {
            console.log(`ℹ️ No timetable found for ${block}`);
            return false;
        }
    } catch (error) {
        console.error('❌ Error refreshing timetable:', error);
        return false;
    }
};

// =====================================================
// 🚀 AUTO-INITIALIZATION
// =====================================================

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    if (document.getElementById('timetable-container')) {
        console.log('📅 Timetable container found, initializing...');
        setTimeout(() => {
            initStudentTimetable();
        }, 1500);
    }
});

// Re-initialize when app is ready
document.addEventListener('appReady', function() {
    console.log('📅 App ready, initializing timetable...');
    setTimeout(() => {
        initStudentTimetable();
    }, 500);
});

// Also refresh when profile tab is clicked
document.addEventListener('click', function(e) {
    const target = e.target.closest('[data-tab="profile"]');
    if (target) {
        setTimeout(() => {
            if (window.currentUserProfile?.block) {
                console.log('🔄 Profile tab clicked, refreshing timetable...');
                window.forceRefreshTimetable(window.currentUserProfile.block);
            }
        }, 500);
    }
});

// Export for debugging
window.initStudentTimetable = initStudentTimetable;
window.getSupabase = getSupabase;

console.log('✅ Student timetable module loaded (fixed version)');
