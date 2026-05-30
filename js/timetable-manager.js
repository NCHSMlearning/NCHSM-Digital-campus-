// =====================================================
// STUDENT TIMETABLE MODULE
// Displays class schedule based on student's assigned block
// =====================================================

// Global variables
let studentTimetableData = [];
let currentStudentBlock = null;

// Initialize timetable when profile is ready
async function initStudentTimetable() {
    console.log('📅 Initializing student timetable...');
    
    const container = document.getElementById('timetable-container');
    const loadingDiv = document.getElementById('timetable-loading');
    const emptyDiv = document.getElementById('timetable-empty');
    
    if (!container) {
        console.log('Timetable container not found on this page');
        return;
    }
    
    try {
        // Get student's block from profile (wait for profile to load)
        let studentBlock = null;
        let studentProgram = null;
        let retryCount = 0;
        const maxRetries = 10;
        
        while (!studentBlock && retryCount < maxRetries) {
            // Try to get from global profile
            if (window.currentUserProfile && window.currentUserProfile.block) {
                studentBlock = window.currentUserProfile.block;
                studentProgram = window.currentUserProfile.program;
                console.log(`📌 Got block from currentUserProfile: ${studentBlock} (attempt ${retryCount + 1})`);
                break;
            }
            
            // Try from db.currentUserProfile
            if (window.db && window.db.currentUserProfile && window.db.currentUserProfile.block) {
                studentBlock = window.db.currentUserProfile.block;
                studentProgram = window.db.currentUserProfile.program;
                console.log(`📌 Got block from db.currentUserProfile: ${studentBlock} (attempt ${retryCount + 1})`);
                break;
            }
            
            // Try direct database query
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    const { data: profile } = await supabase
                        .from('consolidated_user_profiles_table')
                        .select('block, program, full_name')
                        .eq('user_id', user.id)
                        .single();
                    
                    if (profile && profile.block) {
                        studentBlock = profile.block;
                        studentProgram = profile.program;
                        console.log(`📌 Got block from direct DB: ${studentBlock} (attempt ${retryCount + 1})`);
                        break;
                    }
                }
            } catch (e) {
                console.log('DB query not ready yet');
            }
            
            retryCount++;
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        // If no block found after retries
        if (!studentBlock || studentBlock === 'null' || studentBlock === '') {
            console.error('❌ No block assigned to student after', maxRetries, 'attempts');
            if (loadingDiv) loadingDiv.style.display = 'none';
            if (emptyDiv) {
                const msgElement = emptyDiv.querySelector('#empty-message-text') || emptyDiv.querySelector('p');
                if (msgElement) msgElement.innerHTML = 'Your block has not been assigned yet. Please contact the administrator.';
                emptyDiv.style.display = 'block';
            }
            return;
        }
        
        currentStudentBlock = studentBlock;
        
        // UPDATE THE BLOCK TITLE
        const blockTitleSpan = document.getElementById('timetable-block-title');
        if (blockTitleSpan) {
            blockTitleSpan.textContent = studentBlock;
            console.log(`✅ Updated block title to: ${studentBlock}`);
        }
        
        // Update empty state block name
        const emptyBlockName = document.getElementById('empty-block-name');
        if (emptyBlockName) emptyBlockName.textContent = studentBlock;
        
        console.log(`🎓 Student Block: ${studentBlock}, Program: ${studentProgram || 'KRCHN'}`);
        
        // Fetch timetable from database
        const { data: timetable, error } = await supabase
            .from('timetables')
            .select('*')
            .eq('block', studentBlock)
            .order('week_number', { ascending: true })
            .order('day_of_week', { ascending: true })
            .order('start_time', { ascending: true });
        
        if (error) {
            console.error('Timetable fetch error:', error);
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
                if (msgElement) msgElement.innerHTML = `No schedule available for ${studentBlock} yet. Please check back later.`;
                emptyDiv.style.display = 'block';
            }
            return;
        }
        
        studentTimetableData = timetable;
        console.log(`✅ Loaded ${timetable.length} timetable entries for ${studentBlock}`);
        
        // Get unique weeks
        const uniqueWeeks = [...new Set(timetable.map(item => item.week_number))].sort((a, b) => a - b);
        console.log(`📅 Weeks available: ${uniqueWeeks.join(', ')}`);
        
        // Update week buttons
        updateWeekButtons(uniqueWeeks);
        
        // Render timetable (all weeks by default)
        renderTimetableByWeek('all');
        
        // Hide loading, show container
        if (loadingDiv) loadingDiv.style.display = 'none';
        if (container) container.style.display = 'block';
        if (emptyDiv) emptyDiv.style.display = 'none';
        
    } catch (error) {
        console.error('Error loading timetable:', error);
        if (loadingDiv) loadingDiv.style.display = 'none';
        if (emptyDiv) {
            const msgElement = emptyDiv.querySelector('#empty-message-text') || emptyDiv.querySelector('p');
            if (msgElement) msgElement.innerHTML = 'Unable to load your schedule. Please try again later.';
            emptyDiv.style.display = 'block';
        }
    }
}

// Update week filter buttons
function updateWeekButtons(availableWeeks) {
    const weekBtns = document.querySelectorAll('.week-btn');
    
    weekBtns.forEach(btn => {
        const weekValue = btn.getAttribute('data-week');
        if (weekValue !== 'all') {
            const weekNum = parseInt(weekValue);
            if (availableWeeks.includes(weekNum)) {
                btn.style.display = 'inline-flex';
                btn.removeEventListener('click', handleWeekClick);
                btn.addEventListener('click', handleWeekClick);
            } else {
                btn.style.display = 'none';
            }
        } else {
            btn.removeEventListener('click', handleWeekClick);
            btn.addEventListener('click', handleWeekClick);
        }
    });
}

// Handle week button click
function handleWeekClick(e) {
    const btn = e.currentTarget;
    const weekValue = btn.getAttribute('data-week');
    
    // Update active state
    document.querySelectorAll('.week-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    
    // Render filtered timetable
    renderTimetableByWeek(weekValue);
}

// Render timetable by week filter
function renderTimetableByWeek(weekFilter) {
    const container = document.getElementById('timetable-container');
    if (!container) return;
    
    let filteredData = studentTimetableData;
    if (weekFilter !== 'all') {
        filteredData = studentTimetableData.filter(item => item.week_number == weekFilter);
    }
    
    if (filteredData.length === 0) {
        container.innerHTML = `
            <div class="empty-state-small" style="text-align: center; padding: 40px;">
                <i class="fas fa-calendar-week" style="font-size: 48px; color: #9ca3af;"></i>
                <p style="margin-top: 10px;">No classes scheduled for ${weekFilter === 'all' ? 'any week' : `Week ${weekFilter}`}</p>
            </div>
        `;
        return;
    }
    
    // Group by day
    const daysOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
    const dayNames = {
        monday: 'Monday', tuesday: 'Tuesday', wednesday: 'Wednesday',
        thursday: 'Thursday', friday: 'Friday'
    };
    
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
        <div class="timetable-wrapper" style="overflow-x: auto;">
            <table class="timetable-table" style="width: 100%; border-collapse: collapse; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                <thead>
                    <tr style="background: #4C1D95; color: white;">
                        <th style="padding: 14px; text-align: left; font-weight: 600;">Day</th>
                        <th style="padding: 14px; text-align: left; font-weight: 600;">Time</th>
                        <th style="padding: 14px; text-align: left; font-weight: 600;">Course/Session</th>
                        <th style="padding: 14px; text-align: left; font-weight: 600;">Lecturer</th>
                        <th style="padding: 14px; text-align: left; font-weight: 600;">Venue</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    for (const day of daysOrder) {
        const classes = grouped[day];
        
        if (classes.length === 0) {
            html += `
                <tr style="border-bottom: 1px solid #e5e7eb;">
                    <td style="padding: 12px; background: #faf5ff; font-weight: 600; width: 100px;">${dayNames[day]}</td>
                    <td colspan="4" style="padding: 12px; color: #9ca3af; text-align: center;">No classes scheduled</td>
                </tr>
            `;
        } else {
            classes.forEach((cls, idx) => {
                const holidayBadge = cls.is_holiday ? '<span style="background: #dc2626; color: white; padding: 2px 8px; border-radius: 4px; font-size: 10px; margin-left: 8px; display: inline-block;">🔴 HOLIDAY</span>' : '';
                const examBadge = cls.is_exam ? '<span style="background: #f59e0b; color: white; padding: 2px 8px; border-radius: 4px; font-size: 10px; margin-left: 8px; display: inline-block;">📝 EXAM</span>' : '';
                const pendingBadge = cls.pending_allocation ? '<span style="background: #94a3b8; color: white; padding: 2px 8px; border-radius: 4px; font-size: 10px; margin-left: 8px; display: inline-block;">⏳ Pending</span>' : '';
                
                // Format time (remove seconds)
                const startTime = cls.start_time ? cls.start_time.substring(0, 5) : 'TBA';
                const endTime = cls.end_time ? cls.end_time.substring(0, 5) : 'TBA';
                
                const rowClass = cls.is_holiday ? 'style="background: #fef2f2;"' : '';
                
                html += `
                    <tr style="border-bottom: 1px solid #e5e7eb;" ${rowClass}>
                        ${idx === 0 ? `<td style="padding: 12px; background: #faf5ff; font-weight: 600; vertical-align: top;" rowspan="${classes.length}">${dayNames[day]}</td>` : ''}
                        <td style="padding: 12px; vertical-align: top;"><strong>${startTime} - ${endTime}</strong></td>
                        <td style="padding: 12px; vertical-align: top;">
                            <strong>${escapeHtml(cls.session_name || cls.course_name)}</strong>
                            ${holidayBadge}${examBadge}
                            ${cls.course_name && cls.course_name !== cls.session_name ? `<br><small style="color: #6b7280;">${escapeHtml(cls.course_name)}</small>` : ''}
                        </td>
                        <td style="padding: 12px; vertical-align: top;">
                            ${escapeHtml(cls.lecturer_name || 'TBA')}
                            ${pendingBadge}
                        </td>
                        <td style="padding: 12px; vertical-align: top;">${escapeHtml(cls.venue || 'TBD')}</td>
                    </tr>
                `;
            });
        }
    }
    
    html += `
                </tbody>
            </table>
        </div>
    `;
    
    container.innerHTML = html;
}

// Helper function
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Manual override for testing
window.forceRefreshTimetable = async function(blockName = null) {
    const block = blockName || (window.currentUserProfile?.block);
    
    if (!block) {
        console.error('No block specified');
        return false;
    }
    
    console.log(`🔄 Force refreshing timetable for ${block}`);
    
    const { data: timetable } = await supabase
        .from('timetables')
        .select('*')
        .eq('block', block);
    
    if (timetable && timetable.length > 0) {
        studentTimetableData = timetable;
        currentStudentBlock = block;
        
        const blockTitleSpan = document.getElementById('timetable-block-title');
        if (blockTitleSpan) blockTitleSpan.textContent = block;
        
        const uniqueWeeks = [...new Set(timetable.map(item => item.week_number))];
        updateWeekButtons(uniqueWeeks);
        renderTimetableByWeek('all');
        
        document.getElementById('timetable-loading').style.display = 'none';
        document.getElementById('timetable-container').style.display = 'block';
        document.getElementById('timetable-empty').style.display = 'none';
        
        console.log(`✅ Rendered ${timetable.length} entries for ${block}`);
        return true;
    } else {
        console.log(`❌ No timetable found for ${block}`);
        return false;
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Check if we're on a page with timetable
    if (document.getElementById('timetable-container')) {
        // Wait for profile to load (db.js initializes)
        setTimeout(() => {
            initStudentTimetable();
        }, 1500);
    }
});

// Also listen for profile tab clicks to refresh
document.addEventListener('click', function(e) {
    const tabLink = e.target.closest('[data-tab="profile"]');
    if (tabLink) {
        setTimeout(() => {
            if (window.currentUserProfile?.block) {
                forceRefreshTimetable(window.currentUserProfile.block);
            }
        }, 500);
    }
});

console.log('✅ Student timetable module loaded');
