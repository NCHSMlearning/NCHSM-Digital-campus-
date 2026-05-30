// =====================================================
// COMPLETE STUDENT TIMETABLE - FIXED VERSION
// =====================================================

// Global variables
let studentTimetableData = [];
let currentStudentBlock = null;

// Initialize timetable when page loads
async function initStudentTimetable() {
    console.log('📅 Initializing student timetable...');
    
    const container = document.getElementById('timetable-container');
    const loadingDiv = document.getElementById('timetable-loading');
    const emptyDiv = document.getElementById('timetable-empty');
    
    if (!container) return;
    
    try {
        // Get student's block from profile
        let studentBlock = null;
        let studentProgram = null;
        let studentName = null;
        
        // Get from currentUserProfile (most reliable)
        if (window.currentUserProfile) {
            studentBlock = window.currentUserProfile.block;
            studentProgram = window.currentUserProfile.program;
            studentName = window.currentUserProfile.full_name;
            console.log('📌 Student block from profile:', studentBlock);
        }
        
        // Fallback to direct database query
        if (!studentBlock) {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: profile, error } = await supabase
                    .from('consolidated_user_profiles_table')
                    .select('block, program, full_name')
                    .eq('user_id', user.id)
                    .single();
                
                if (!error && profile) {
                    studentBlock = profile.block;
                    studentProgram = profile.program;
                    studentName = profile.full_name;
                    console.log('📌 Student block from DB:', studentBlock);
                }
            }
        }
        
        // If no block found
        if (!studentBlock || studentBlock === 'null' || studentBlock === '') {
            console.error('❌ No block assigned');
            if (loadingDiv) loadingDiv.style.display = 'none';
            if (emptyDiv) {
                const msgElement = emptyDiv.querySelector('#empty-message-text') || emptyDiv.querySelector('p');
                if (msgElement) msgElement.innerHTML = 'Your block has not been assigned yet. Please contact the administrator.';
                emptyDiv.style.display = 'block';
            }
            return;
        }
        
        currentStudentBlock = studentBlock;
        
        // UPDATE THE BLOCK TITLE (THIS IS WHAT YOU'RE MISSING!)
        const blockTitleSpan = document.getElementById('timetable-block-title');
        if (blockTitleSpan) {
            blockTitleSpan.textContent = studentBlock;
            console.log(`✅ Updated block title to: ${studentBlock}`);
        }
        
        // Update empty state block name if it exists
        const emptyBlockName = document.getElementById('empty-block-name');
        if (emptyBlockName) emptyBlockName.textContent = studentBlock;
        
        console.log(`🎓 Student: ${studentName || 'Unknown'}, Block: ${studentBlock}, Program: ${studentProgram || 'KRCHN'}`);
        
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
                if (msgElement) msgElement.innerHTML = `No schedule available for ${studentBlock} yet.`;
                emptyDiv.style.display = 'block';
            }
            return;
        }
        
        studentTimetableData = timetable;
        console.log(`✅ Loaded ${timetable.length} timetable entries for ${studentBlock}`);
        
        // Get unique weeks for filter buttons
        const uniqueWeeks = [...new Set(timetable.map(item => item.week_number))].sort((a, b) => a - b);
        console.log(`📅 Weeks available: ${uniqueWeeks.join(', ')}`);
        
        // Update week buttons - show/hide based on available weeks
        updateWeekButtons(uniqueWeeks);
        
        // Render the timetable (show all weeks by default)
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

// Update week filter buttons based on available weeks
function updateWeekButtons(availableWeeks) {
    const weekBtns = document.querySelectorAll('.week-btn');
    
    weekBtns.forEach(btn => {
        const weekValue = btn.getAttribute('data-week');
        if (weekValue !== 'all') {
            const weekNum = parseInt(weekValue);
            if (availableWeeks.includes(weekNum)) {
                btn.style.display = 'inline-flex';
                // Remove existing listeners and add new one
                btn.removeEventListener('click', handleWeekClick);
                btn.addEventListener('click', handleWeekClick);
            } else {
                btn.style.display = 'none';
            }
        } else {
            // All Weeks button - always visible
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
            <div class="empty-state-small">
                <i class="fas fa-calendar-week"></i>
                <p>No classes scheduled for ${weekFilter === 'all' ? 'any week' : `Week ${weekFilter}`}</p>
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
    
    // Build HTML table
    let html = `
        <div class="timetable-wrapper" style="overflow-x: auto;">
            <table class="timetable-table" style="width: 100%; border-collapse: collapse; background: white; border-radius: 12px; overflow: hidden;">
                <thead>
                    <tr style="background: #4C1D95; color: white;">
                        <th style="padding: 12px; text-align: left;">Day</th>
                        <th style="padding: 12px; text-align: left;">Time</th>
                        <th style="padding: 12px; text-align: left;">Course/Session</th>
                        <th style="padding: 12px; text-align: left;">Lecturer</th>
                        <th style="padding: 12px; text-align: left;">Venue</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    for (const day of daysOrder) {
        const classes = grouped[day];
        
        if (classes.length === 0) {
            html += `
                <tr style="border-bottom: 1px solid #e5e7eb;">
                    <td style="padding: 12px; background: #f8f9fa; font-weight: 600;">${dayNames[day]}</td>
                    <td colspan="4" style="padding: 12px; color: #6b7280; text-align: center;">No classes scheduled</td>
                </tr>
            `;
        } else {
            classes.forEach((cls, idx) => {
                const holidayBadge = cls.is_holiday ? '<span style="background: #dc2626; color: white; padding: 2px 8px; border-radius: 4px; font-size: 11px; margin-left: 8px;">HOLIDAY</span>' : '';
                const examBadge = cls.is_exam ? '<span style="background: #f59e0b; color: white; padding: 2px 8px; border-radius: 4px; font-size: 11px; margin-left: 8px;">EXAM</span>' : '';
                const pendingBadge = cls.pending_allocation ? '<span style="background: #94a3b8; color: white; padding: 2px 8px; border-radius: 4px; font-size: 11px; margin-left: 8px;">Pending</span>' : '';
                
                // Format time (remove seconds if present)
                const startTime = cls.start_time.substring(0, 5);
                const endTime = cls.end_time.substring(0, 5);
                
                html += `
                    <tr style="border-bottom: 1px solid #e5e7eb; ${cls.is_holiday ? 'background: #fef2f2;' : ''}">
                        ${idx === 0 ? `<td style="padding: 12px; background: #f8f9fa; font-weight: 600; vertical-align: top;" rowspan="${classes.length}">${dayNames[day]}</td>` : ''}
                        <td style="padding: 12px;"><strong>${startTime} - ${endTime}</strong></td>
                        <td style="padding: 12px;">
                            <strong>${escapeHtml(cls.session_name || cls.course_name)}</strong>
                            ${holidayBadge}${examBadge}
                            ${cls.course_name && cls.course_name !== cls.session_name ? `<br><small style="color: #6b7280;">${escapeHtml(cls.course_name)}</small>` : ''}
                        </td>
                        <td style="padding: 12px;">
                            ${escapeHtml(cls.lecturer_name || 'TBA')}
                            ${pendingBadge}
                        </td>
                        <td style="padding: 12px;">${escapeHtml(cls.venue || 'TBD')}</td>
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

// Helper function to escape HTML
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Manual override function for testing
window.forceRefreshTimetable = async function(blockName = null) {
    const block = blockName || (window.currentUserProfile?.block);
    
    if (!block) {
        console.error('No block specified');
        return;
    }
    
    console.log(`🔄 Force refreshing timetable for ${block}`);
    
    const { data: timetable } = await supabase
        .from('timetables')
        .select('*')
        .eq('block', block);
    
    if (timetable && timetable.length > 0) {
        studentTimetableData = timetable;
        currentStudentBlock = block;
        
        // Update title
        const blockTitleSpan = document.getElementById('timetable-block-title');
        if (blockTitleSpan) blockTitleSpan.textContent = block;
        
        // Update week buttons
        const uniqueWeeks = [...new Set(timetable.map(item => item.week_number))];
        updateWeekButtons(uniqueWeeks);
        
        // Render
        renderTimetableByWeek('all');
        
        // Hide loading/empty
        document.getElementById('timetable-loading').style.display = 'none';
        document.getElementById('timetable-container').style.display = 'block';
        document.getElementById('timetable-empty').style.display = 'none';
        
        console.log(`✅ Rendered ${timetable.length} entries for ${block}`);
    } else {
        console.log(`❌ No timetable found for ${block}`);
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Wait a bit for profile to load
    setTimeout(() => {
        initStudentTimetable();
    }, 1000);
});

// Also listen for profile tab clicks to refresh
const profileTab = document.querySelector('[data-tab="profile"]');
if (profileTab) {
    profileTab.addEventListener('click', function() {
        setTimeout(() => {
            if (window.currentUserProfile?.block) {
                forceRefreshTimetable(window.currentUserProfile.block);
            }
        }, 500);
    });
}

console.log('✅ Student timetable module loaded');
