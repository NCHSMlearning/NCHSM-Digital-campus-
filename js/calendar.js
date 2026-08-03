// calendar.js - COMPLETE UPDATED VERSION WITH TIMETABLE INSIDE CALENDAR TAB
// Enhanced to match the new HTML styling
// ============================================

let cachedCalendarEvents = [];
let isLoadingCalendar = false;
let eventsLastLoaded = null;

// Timetable variables
let calendarTimetableData = [];
let calendarCurrentBlock = null;

document.addEventListener('DOMContentLoaded', function() {
    console.log('📅 Calendar: Initializing...');
    
    // Update Today's date immediately
    updateTodayDate();
    
    // Setup calendar tab click
    const calendarTab = document.querySelector('a[data-tab="calendar"]');
    if (calendarTab) {
        calendarTab.addEventListener('click', function(e) {
            e.preventDefault();
            if (!isLoadingCalendar) {
                loadAcademicCalendar();
                loadCalendarTimetable();
            }
        });
    }
    
    // Setup all event listeners
    setupCalendarEventListeners();
    
    // Load calendar if on calendar tab
    if (window.location.hash === '#calendar') {
        setTimeout(() => {
            if (!eventsLastLoaded || Date.now() - eventsLastLoaded > 30000) {
                loadAcademicCalendar();
                loadCalendarTimetable();
            }
        }, 300);
    }
});

// ========== SETUP FUNCTIONS ==========
function updateTodayDate() {
    const todayElement = document.getElementById('current-date-display');
    if (!todayElement) return;
    
    const today = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    todayElement.textContent = `Today: ${today.toLocaleDateString('en-US', options)}`;
    console.log('✅ Today date updated');
}

function setupCalendarEventListeners() {
    const filter = document.getElementById('calendar-filter');
    if (filter) {
        filter.addEventListener('change', function() {
            console.log('🔍 Filter changed to:', this.value);
            filterCalendarEvents(this.value);
        });
    }
    
    const refreshBtn = document.getElementById('refresh-calendar');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', function() {
            loadAcademicCalendar();
            loadCalendarTimetable();
        });
    }
    
    const refreshEmptyBtn = document.getElementById('refresh-calendar-empty');
    if (refreshEmptyBtn) {
        refreshEmptyBtn.addEventListener('click', function() {
            loadAcademicCalendar();
            loadCalendarTimetable();
        });
    }
    
    const exportBtn = document.getElementById('export-calendar');
    if (exportBtn) {
        exportBtn.addEventListener('click', function() {
            exportCalendarToPDF();
        });
    }
    
    const viewToggle = document.getElementById('calendar-view-toggle');
    if (viewToggle) {
        viewToggle.addEventListener('click', function() {
            toggleCalendarView();
        });
    }
    
    console.log('✅ Calendar event listeners setup complete');
}

// ========== VIEW TOGGLE ==========
function toggleCalendarView() {
    const tableContainer = document.getElementById('calendar-table-container');
    const toggleBtn = document.getElementById('calendar-view-toggle');
    
    if (!tableContainer || !toggleBtn) return;
    
    const currentDisplay = tableContainer.style.display;
    if (currentDisplay === 'none' || !currentDisplay) {
        tableContainer.style.display = 'block';
        toggleBtn.innerHTML = '<i class="fas fa-list"></i> List View';
        toggleBtn.style.background = '#4C1D95';
        toggleBtn.style.color = 'white';
    } else {
        tableContainer.style.display = 'none';
        toggleBtn.innerHTML = '<i class="fas fa-calendar-alt"></i> Calendar View';
        toggleBtn.style.background = '#f1f5f9';
        toggleBtn.style.color = '#475569';
    }
}

// ========== EXPORT CALENDAR ==========
function exportCalendarToPDF() {
    if (cachedCalendarEvents.length === 0) {
        showToast('No events to export', 'warning');
        return;
    }
    
    showToast('Generating calendar export...', 'info');
    
    // Create printable content
    const printContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>NCHSM Calendar - ${new Date().toLocaleDateString()}</title>
            <style>
                body { font-family: 'Inter', Arial, sans-serif; padding: 30px; max-width: 1200px; margin: 0 auto; }
                .header { text-align: center; padding: 20px 0; border-bottom: 3px solid #4C1D95; margin-bottom: 20px; }
                .header h1 { color: #0A3D62; margin: 0; }
                .header p { color: #64748b; margin: 4px 0 0; }
                table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 13px; }
                th { background: #f8fafc; padding: 10px 12px; text-align: left; font-weight: 600; color: #475569; border-bottom: 2px solid #e5e7eb; }
                td { padding: 10px 12px; border-bottom: 1px solid #e5e7eb; }
                .status-badge { display: inline-block; padding: 2px 10px; border-radius: 12px; font-size: 11px; font-weight: 600; }
                .status-upcoming { background: #dbeafe; color: #1e40af; }
                .status-completed { background: #d1fae5; color: #065f46; }
                .today-badge { background: #ef4444; color: white; padding: 2px 8px; border-radius: 12px; font-size: 10px; font-weight: 600; margin-left: 8px; }
                .type-badge { display: inline-block; padding: 2px 10px; border-radius: 12px; font-size: 10px; font-weight: 600; }
                .footer { margin-top: 30px; padding-top: 16px; border-top: 1px solid #e5e7eb; text-align: center; font-size: 12px; color: #94a3b8; }
                @media print { body { padding: 20px; } }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>📅 NCHSM Academic Calendar</h1>
                <p>Generated on ${new Date().toLocaleString()}</p>
            </div>
            <table>
                <thead>
                    <tr>
                        <th>Date & Time</th>
                        <th>Event / Details</th>
                        <th>Type</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${cachedCalendarEvents.map(event => `
                        <tr>
                            <td>
                                <strong>${event.formattedDate}</strong>
                                ${new Date(event.date).toDateString() === new Date().toDateString() ? '<span class="today-badge">TODAY</span>' : ''}
                                <br>
                                <span style="font-size: 11px; color: #64748b;">
                                    <i class="fas fa-clock"></i> ${event.formattedTime}
                                </span>
                                ${event.venue ? `<br><span style="font-size: 11px; color: #64748b;">📍 ${event.venue}</span>` : ''}
                            </td>
                            <td>
                                <strong>${event.title}</strong>
                                <p style="margin: 4px 0 0; font-size: 12px; color: #64748b;">${event.details || 'No details'}</p>
                            </td>
                            <td>
                                <span class="type-badge" style="background: ${event.color}20; color: ${event.color};">
                                    ${event.type}
                                </span>
                            </td>
                            <td>
                                <span class="status-badge ${new Date(event.date + 'T' + (event.startTime || '00:00:00')) < new Date() ? 'status-completed' : 'status-upcoming'}">
                                    ${new Date(event.date + 'T' + (event.startTime || '00:00:00')) < new Date() ? '✅ Completed' : '⏳ Upcoming'}
                                </span>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            <div style="margin-top: 16px; display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; background: #f8fafc; padding: 12px; border-radius: 8px; text-align: center;">
                <div><strong style="color: #0A3D62;">${cachedCalendarEvents.length}</strong> Total Events</div>
                <div><strong style="color: #059669;">${cachedCalendarEvents.filter(e => new Date(e.date + 'T' + (e.startTime || '00:00:00')) >= new Date()).length}</strong> Upcoming</div>
                <div><strong style="color: #d97706;">${cachedCalendarEvents.filter(e => e.type.includes('EXAM') || e.type.includes('CAT')).length}</strong> Exams</div>
                <div><strong style="color: #6d28d9;">${cachedCalendarEvents.filter(e => e.type.includes('Clinical')).length}</strong> Clinical</div>
            </div>
            <div class="footer">
                <p>Nakuru College of Health Sciences and Management (NCHSM)</p>
                <p>This calendar is auto-generated from the student portal.</p>
            </div>
        </body>
        </html>
    `;
    
    const blob = new Blob([printContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `NCHSM_Calendar_${new Date().toISOString().split('T')[0]}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showToast('✅ Calendar exported successfully!', 'success');
}

// ========== TOAST NOTIFICATION ==========
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed;
        bottom: 30px;
        left: 50%;
        transform: translateX(-50%);
        background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : type === 'warning' ? '#f59e0b' : '#4f46e5'};
        color: white;
        padding: 12px 24px;
        border-radius: 12px;
        font-size: 14px;
        font-weight: 500;
        z-index: 9999;
        box-shadow: 0 8px 32px rgba(0,0,0,0.15);
        display: flex;
        align-items: center;
        gap: 10px;
        max-width: 90%;
        animation: slideUpToast 0.3s ease;
        font-family: 'Inter', system-ui, sans-serif;
    `;
    const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
    };
    toast.innerHTML = `<span style="font-size: 18px;">${icons[type] || 'ℹ️'}</span> ${message}`;
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(-50%) translateY(20px)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ========== TIMETABLE FUNCTIONS ==========
async function loadCalendarTimetable() {
    console.log('📅 Loading timetable in Calendar tab...');
    
    const container = document.getElementById('timetable-container');
    const loadingDiv = document.getElementById('timetable-loading');
    const emptyDiv = document.getElementById('timetable-empty');
    const weekButtonsDiv = document.getElementById('week-buttons');
    
    if (!container) return;
    
    if (loadingDiv) loadingDiv.style.display = 'block';
    if (container) container.style.display = 'none';
    if (emptyDiv) emptyDiv.style.display = 'none';
    
    try {
        // Get student block
        let studentBlock = null;
        
        if (window.currentUserProfile?.block) {
            studentBlock = window.currentUserProfile.block;
        } else if (window.db?.currentUserProfile?.block) {
            studentBlock = window.db.currentUserProfile.block;
        } else {
            const supabase = window.db?.supabase || window.supabase;
            if (supabase) {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    const { data: profile } = await supabase
                        .from('consolidated_user_profiles_table')
                        .select('block, current_block')
                        .eq('user_id', user.id)
                        .single();
                    studentBlock = profile?.block || profile?.current_block || 'Introductory';
                }
            }
        }
        
        if (!studentBlock) {
            if (loadingDiv) loadingDiv.style.display = 'none';
            if (emptyDiv) emptyDiv.style.display = 'block';
            return;
        }
        
        calendarCurrentBlock = studentBlock;
        
        const blockTitleSpan = document.getElementById('timetable-block-title');
        if (blockTitleSpan) blockTitleSpan.textContent = studentBlock;
        
        const supabase = window.db?.supabase || window.supabase;
        if (!supabase) throw new Error('No database connection');
        
        const { data: timetable, error } = await supabase
            .from('timetables')
            .select('*')
            .eq('block', studentBlock)
            .order('week_number', { ascending: true })
            .order('day_of_week', { ascending: true })
            .order('start_time', { ascending: true });
        
        if (error || !timetable || timetable.length === 0) {
            if (loadingDiv) loadingDiv.style.display = 'none';
            if (emptyDiv) emptyDiv.style.display = 'block';
            return;
        }
        
        calendarTimetableData = timetable;
        
        const classCountSpan = document.getElementById('class-count-display');
        if (classCountSpan) classCountSpan.textContent = `${timetable.length} total classes`;
        
        // Get unique weeks
        const uniqueWeeks = [...new Set(timetable.map(item => item.week_number))].sort((a, b) => a - b);
        console.log('📅 Weeks available:', uniqueWeeks);
        
        // Generate week buttons
        if (weekButtonsDiv) {
            weekButtonsDiv.innerHTML = uniqueWeeks.map(week => `
                <button class="week-btn-calendar" data-week="${week}" style="
                    padding: 6px 16px;
                    border: 1px solid #e2e8f0;
                    border-radius: 20px;
                    background: white;
                    color: #64748b;
                    cursor: pointer;
                    font-size: 12px;
                    font-weight: 500;
                    transition: all 0.3s ease;
                " onmouseover="if(!this.classList.contains('active')){this.style.background='#f1f5f9'}" 
                   onmouseout="if(!this.classList.contains('active')){this.style.background='white'}">
                    Week ${week}
                </button>
            `).join('');
            
            // Add click handlers
            weekButtonsDiv.querySelectorAll('.week-btn-calendar').forEach((btn, index) => {
                btn.addEventListener('click', function() {
                    const week = parseInt(this.dataset.week);
                    renderCalendarTimetable(week);
                    
                    weekButtonsDiv.querySelectorAll('.week-btn-calendar').forEach(b => {
                        b.classList.remove('active');
                        b.style.background = 'white';
                        b.style.color = '#64748b';
                    });
                    this.classList.add('active');
                    this.style.background = '#4C1D95';
                    this.style.color = 'white';
                });
                
                // Activate first week by default
                if (index === 0) {
                    btn.classList.add('active');
                    btn.style.background = '#4C1D95';
                    btn.style.color = 'white';
                }
            });
            
            // Render first week by default
            if (uniqueWeeks.length > 0) {
                renderCalendarTimetable(uniqueWeeks[0]);
            }
        }
        
        if (loadingDiv) loadingDiv.style.display = 'none';
        if (container) container.style.display = 'block';
        if (emptyDiv) emptyDiv.style.display = 'none';
        
        console.log(`✅ Timetable loaded: ${timetable.length} entries for ${studentBlock}`);
        
    } catch (error) {
        console.error('Error loading timetable:', error);
        if (loadingDiv) loadingDiv.style.display = 'none';
        if (emptyDiv) emptyDiv.style.display = 'block';
    }
}

function renderCalendarTimetable(weekNumber) {
    const container = document.getElementById('timetable-container');
    if (!container) return;
    
    const filteredData = calendarTimetableData.filter(item => item.week_number === weekNumber);
    
    if (filteredData.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 30px; color: #9ca3af;">
                <i class="fas fa-calendar-week" style="font-size: 36px;"></i>
                <p style="margin-top: 10px;">No classes scheduled for Week ${weekNumber}</p>
            </div>
        `;
        return;
    }
    
    const daysOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
    const shortDayNames = { monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed', thursday: 'Thu', friday: 'Fri' };
    
    const grouped = {};
    daysOrder.forEach(day => { grouped[day] = []; });
    
    filteredData.forEach(cls => {
        if (grouped[cls.day_of_week]) {
            grouped[cls.day_of_week].push(cls);
        }
    });
    
    Object.keys(grouped).forEach(day => {
        grouped[day].sort((a, b) => a.start_time.localeCompare(b.start_time));
    });
    
    let html = `
        <style>
            .timetable-compact {
                width: 100%;
                border-collapse: collapse;
                font-size: 13px;
                min-width: 600px;
            }
            .timetable-compact th {
                background: #0A3D62;
                color: white;
                padding: 10px 14px;
                text-align: left;
                font-weight: 600;
                font-size: 11px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            .timetable-compact td {
                padding: 10px 14px;
                border-bottom: 1px solid #f1f5f9;
                vertical-align: middle;
            }
            .timetable-compact tr:hover td {
                background: #f8fafc;
            }
            .timetable-day {
                font-weight: 600;
                color: #0A3D62;
                width: 60px;
            }
            .timetable-time {
                font-family: monospace;
                font-size: 12px;
                white-space: nowrap;
                width: 80px;
                color: #475569;
            }
            .badge-tiny {
                display: inline-block;
                padding: 2px 8px;
                border-radius: 12px;
                font-size: 9px;
                margin-left: 6px;
                font-weight: 600;
            }
            .badge-exam { background: #fef3c7; color: #d97706; }
            .badge-holiday { background: #fee2e2; color: #dc2626; }
            .badge-pending { background: #f3f4f6; color: #6b7280; }
            .badge-study { background: #e0e7ff; color: #4338ca; }
            .week-header {
                background: #f8fafc;
                font-weight: 600;
                color: #0A3D62;
            }
            .week-header td {
                padding: 8px 14px;
                background: #f1f5f9;
            }
        </style>
        <div style="overflow-x: auto;">
            <table class="timetable-compact">
                <thead>
                    <tr>
                        <th style="width: 60px;">Day</th>
                        <th style="width: 80px;">Time</th>
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
                    <td class="timetable-day">${shortDayNames[day]}</td>
                    <td colspan="4" style="color: #9ca3af; text-align: center; font-size: 12px;">— No classes —</td>
                </tr>
            `;
        } else {
            classes.forEach((cls, idx) => {
                let badges = '';
                if (cls.is_exam) badges += '<span class="badge-tiny badge-exam">Exam</span>';
                if (cls.is_holiday) badges += '<span class="badge-tiny badge-holiday">Holiday</span>';
                if (cls.pending_allocation) badges += '<span class="badge-tiny badge-pending">Pending</span>';
                if (cls.is_self_study) badges += '<span class="badge-tiny badge-study">Study</span>';
                
                const startTime = cls.start_time?.substring(0, 5) || 'TBA';
                const endTime = cls.end_time?.substring(0, 5) || 'TBA';
                
                let courseDisplay = cls.session_name || cls.course_name;
                if (courseDisplay && courseDisplay.length > 50) {
                    courseDisplay = courseDisplay.substring(0, 47) + '...';
                }
                
                let lecturerName = cls.lecturer_name || 'TBA';
                if (lecturerName !== 'TBA' && lecturerName !== '—') {
                    const parts = lecturerName.split(' ');
                    lecturerName = parts.slice(0, 2).join(' ');
                }
                
                html += `
                    <tr>
                        ${idx === 0 ? `<td class="timetable-day" rowspan="${classes.length}">${shortDayNames[day]}</td>` : ''}
                        <td class="timetable-time">${startTime} - ${endTime}</td>
                        <td><strong style="color: #1e293b;">${escapeHtml(courseDisplay)}</strong>${badges}</td>
                        <td style="color: #475569;">${escapeHtml(lecturerName)}</td>
                        <td style="color: #475569;">${escapeHtml(cls.venue || 'TBD')}</td>
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

// ========== MAIN LOAD FUNCTION ==========
async function loadAcademicCalendar() {
    if (isLoadingCalendar) {
        console.log('⏳ Calendar already loading...');
        return;
    }
    
    const tableBody = document.getElementById('calendar-table');
    if (!tableBody) {
        console.error('❌ calendar-table element not found');
        return;
    }
    
    isLoadingCalendar = true;
    eventsLastLoaded = Date.now();
    
    try {
        const emptyState = document.getElementById('calendar-empty');
        const loadingState = document.getElementById('calendar-loading');
        const tableContainer = document.getElementById('calendar-table-container');
        
        if (emptyState) emptyState.style.display = 'none';
        if (loadingState) loadingState.style.display = 'block';
        if (tableContainer) tableContainer.style.display = 'none';
        
        updateTodayDate();
        
        tableBody.innerHTML = `
            <tr>
                <td colspan="4" style="padding: 40px; text-align: center;">
                    <div style="display: inline-block; width: 40px; height: 40px; border: 3px solid #f3f4f6; border-top-color: #4C1D95; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                    <p style="margin-top: 10px; color: #6b7280;">Loading your academic calendar...</p>
                </td>
            </tr>
        `;
        
        console.log('🔄 Fetching events from database...');
        const allEvents = await fetchEventsFromDatabase();
        console.log(`📊 Database returned: ${allEvents.length} total events`);
        
        const uniqueEvents = removeDuplicateEvents(allEvents);
        console.log(`✨ ${uniqueEvents.length} unique events after deduplication`);
        
        uniqueEvents.sort((a, b) => new Date(a.date) - new Date(b.date));
        
        cachedCalendarEvents = uniqueEvents.map(event => ({
            ...event,
            formattedDate: formatEventDate(event.date),
            formattedTime: formatEventTime(event.startTime, event.endTime),
            status: getEventStatus(event.date, event.startTime)
        }));
        
        updateHeaderStats(cachedCalendarEvents);
        
        if (loadingState) loadingState.style.display = 'none';
        if (tableContainer) {
            tableContainer.style.display = 'block';
            console.log('✅ Table container shown');
        }
        
        const filter = document.getElementById('calendar-filter');
        const filterType = filter ? filter.value : 'all';
        filterCalendarEvents(filterType);
        
        console.log(`✅ Calendar loaded successfully: ${uniqueEvents.length} events`);
        
    } catch (error) {
        console.error('❌ Calendar error:', error);
        showErrorState(error.message);
    } finally {
        isLoadingCalendar = false;
    }
}

// ========== HEADER STATS FUNCTION ==========
function updateHeaderStats(events) {
    console.log('📈 Updating header stats...');
    
    const now = new Date();
    const oneWeekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    const totalEvents = events.length;
    const upcomingEvents = events.filter(e => new Date(e.date) >= now).length;
    const weekEvents = events.filter(e => {
        const eventDate = new Date(e.date);
        return eventDate >= now && eventDate <= oneWeekLater;
    }).length;
    const examEvents = events.filter(e => e.type.includes('EXAM') || e.type.includes('CAT')).length;
    
    const totalEventsEl = document.getElementById('total-events');
    const upcomingEventsEl = document.getElementById('upcoming-events');
    const weekEventsEl = document.getElementById('week-events');
    const examEventsEl = document.getElementById('exam-events');
    
    if (totalEventsEl) totalEventsEl.textContent = totalEvents;
    if (upcomingEventsEl) upcomingEventsEl.textContent = upcomingEvents;
    if (weekEventsEl) weekEventsEl.textContent = weekEvents;
    if (examEventsEl) examEventsEl.textContent = examEvents;
    
    console.log(`📊 Stats updated: Total=${totalEvents}, Upcoming=${upcomingEvents}, Week=${weekEvents}, Exams=${examEvents}`);
}

// ========== FILTER FUNCTION ==========
function filterCalendarEvents(filterType) {
    const tableBody = document.getElementById('calendar-table');
    const emptyState = document.getElementById('calendar-empty');
    const loadingState = document.getElementById('calendar-loading');
    const tableContainer = document.getElementById('calendar-table-container');
    
    if (!tableBody) return;
    
    if (emptyState) emptyState.style.display = 'none';
    if (loadingState) loadingState.style.display = 'none';
    if (tableContainer) tableContainer.style.display = 'block';
    
    if (cachedCalendarEvents.length === 0) {
        showEmptyState();
        return;
    }
    
    console.log(`🔍 Filtering events: ${filterType}`);
    
    let filteredEvents;
    if (filterType === 'all') {
        filteredEvents = cachedCalendarEvents;
    } else {
        filteredEvents = cachedCalendarEvents.filter(e => e.type === filterType);
    }
    
    console.log(`📋 Showing ${filteredEvents.length} events for filter: ${filterType}`);
    
    if (filteredEvents.length === 0) {
        showEmptyState(`No ${filterType === 'all' ? '' : filterType + ' '}events found`);
    } else {
        renderCalendarTable(filteredEvents, tableBody);
    }
}

// ========== RENDER FUNCTION ==========
function renderCalendarTable(events, tableBody) {
    if (!tableBody) return;
    
    console.log(`🎨 Rendering ${events.length} events...`);
    
    let html = '';
    const today = new Date().toISOString().split('T')[0];
    const now = new Date();
    
    events.forEach(event => {
        const isToday = event.date === today;
        const eventDate = new Date(event.date + 'T' + (event.startTime || '00:00:00'));
        const isPast = eventDate < now;
        
        html += `
            <tr class="calendar-event-row" data-id="${event.id}" style="${isPast ? 'opacity: 0.8;' : ''} cursor: pointer;" onclick="showEventDetails(${JSON.stringify(event).replace(/"/g, '&quot;')})">
                <td style="padding: 12px 16px;">
                    <div>
                        <div style="font-weight: 600; color: #0A3D62;">${event.formattedDate}</div>
                        ${isToday ? '<span style="display: inline-block; background: #ef4444; color: white; padding: 2px 8px; border-radius: 12px; font-size: 10px; font-weight: 600; margin-top: 4px;">TODAY</span>' : ''}
                        <div style="font-size: 12px; color: #64748b; margin-top: 4px;">
                            <i class="fas fa-clock"></i> ${event.formattedTime}
                        </div>
                        ${event.venue ? `
                            <div style="font-size: 12px; color: #64748b;">
                                <i class="fas fa-map-marker-alt"></i> ${escapeHtml(event.venue)}
                            </div>
                        ` : ''}
                    </div>
                </td>
                <td style="padding: 12px 16px;">
                    <div>
                        <div style="font-weight: 600; color: #1e293b;">${escapeHtml(event.title)}</div>
                        ${event.program && event.program !== 'General' ? `
                            <span style="display: inline-block; background: #4C1D95; color: white; padding: 2px 10px; border-radius: 12px; font-size: 10px; font-weight: 600; margin-top: 4px;">${event.program}</span>
                        ` : ''}
                        <p style="margin: 4px 0 0; font-size: 13px; color: #64748b;">${escapeHtml(event.details || 'No details provided')}</p>
                        ${event.organizer ? `
                            <div style="font-size: 12px; color: #64748b; margin-top: 4px;">
                                <i class="fas fa-user"></i> ${escapeHtml(event.organizer)}
                            </div>
                        ` : ''}
                        <div style="font-size: 11px; color: #94a3b8; margin-top: 4px;">
                            <i class="fas fa-database"></i> Source: ${event.source}
                            ${event.courseName ? ` • Course: ${escapeHtml(event.courseName)}` : ''}
                        </div>
                    </div>
                </td>
                <td style="padding: 12px 16px; text-align: center;">
                    <span style="display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 600; background: ${event.color}20; color: ${event.color}; border: 1px solid ${event.color}30;">
                        <i class="${event.icon}" style="margin-right: 4px;"></i>
                        ${event.type}
                    </span>
                </td>
                <td style="padding: 12px 16px; text-align: center;">
                    ${isPast ? 
                        '<span style="display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 600; background: #d1fae5; color: #065f46;"><i class="fas fa-check-circle"></i> Completed</span>' :
                        '<span style="display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 600; background: #dbeafe; color: #1e40af;"><i class="fas fa-clock"></i> Upcoming</span>'
                    }
                </td>
            </tr>
        `;
    });
    
    tableBody.innerHTML = html;
    console.log('✅ Table rendered');
}

function showEventDetails(event) {
    // If event is a string (from onclick), parse it
    if (typeof event === 'string') {
        try {
            event = JSON.parse(event);
        } catch (e) {
            console.error('Error parsing event:', e);
            return;
        }
    }
    
    const isPast = new Date(event.date + 'T' + (event.startTime || '00:00:00')) < new Date();
    
    // Create a beautiful modal
    const modalHtml = `
        <div id="eventDetailModal" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); backdrop-filter: blur(4px); z-index: 99999; display: flex; align-items: center; justify-content: center; animation: fadeInBackdrop 0.3s ease;">
            <div style="background: white; border-radius: 16px; max-width: 500px; width: 92%; padding: 28px; box-shadow: 0 20px 60px rgba(0,0,0,0.2); animation: slideUpModal 0.35s ease; max-height: 90vh; overflow-y: auto;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px;">
                    <div>
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <span style="font-size: 24px;">${event.icon ? `<i class="${event.icon}"></i>` : '📅'}</span>
                            <h2 style="margin: 0; font-size: 20px; color: #0A3D62;">${escapeHtml(event.title)}</h2>
                        </div>
                        <span style="display: inline-block; padding: 2px 12px; border-radius: 12px; font-size: 11px; font-weight: 600; background: ${event.color}20; color: ${event.color}; margin-top: 4px;">${event.type}</span>
                    </div>
                    <button onclick="document.getElementById('eventDetailModal').remove()" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #94a3b8;">&times;</button>
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 16px 0; padding: 16px; background: #f8fafc; border-radius: 12px;">
                    <div>
                        <div style="font-size: 11px; color: #94a3b8;">Date</div>
                        <div style="font-weight: 600; color: #0A3D62;">${event.formattedDate}</div>
                    </div>
                    <div>
                        <div style="font-size: 11px; color: #94a3b8;">Time</div>
                        <div style="font-weight: 600; color: #0A3D62;">${event.formattedTime}</div>
                    </div>
                    ${event.venue ? `
                    <div style="grid-column: span 2;">
                        <div style="font-size: 11px; color: #94a3b8;">Location</div>
                        <div style="font-weight: 600; color: #0A3D62;">${escapeHtml(event.venue)}</div>
                    </div>
                    ` : ''}
                    ${event.organizer ? `
                    <div style="grid-column: span 2;">
                        <div style="font-size: 11px; color: #94a3b8;">Organizer</div>
                        <div style="font-weight: 600; color: #0A3D62;">${escapeHtml(event.organizer)}</div>
                    </div>
                    ` : ''}
                    <div style="grid-column: span 2;">
                        <div style="font-size: 11px; color: #94a3b8;">Status</div>
                        <div style="font-weight: 600; color: ${isPast ? '#059669' : '#3B82F6'};">${isPast ? '✅ Completed' : '⏳ Upcoming'}</div>
                    </div>
                </div>
                
                ${event.details ? `
                <div style="margin: 16px 0; padding: 12px 16px; background: #f0f7ff; border-radius: 8px; border-left: 3px solid #3B82F6;">
                    <div style="font-size: 11px; color: #94a3b8;">Details</div>
                    <div style="color: #475569;">${escapeHtml(event.details)}</div>
                </div>
                ` : ''}
                
                <button onclick="document.getElementById('eventDetailModal').remove()" style="width: 100%; padding: 12px; border: none; border-radius: 10px; background: #4C1D95; color: white; font-weight: 600; cursor: pointer; transition: all 0.3s ease;" onmouseover="this.style.background='#6d28d9'" onmouseout="this.style.background='#4C1D95'">
                    Close
                </button>
            </div>
        </div>
    `;
    
    // Remove existing modal if any
    const existing = document.getElementById('eventDetailModal');
    if (existing) existing.remove();
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    // Add styles if not exists
    if (!document.getElementById('modal-styles')) {
        const style = document.createElement('style');
        style.id = 'modal-styles';
        style.textContent = `
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
}

// ========== DATABASE FUNCTIONS ==========
async function fetchEventsFromDatabase() {
    const events = [];
    const supabase = window.db?.supabase || window.supabase;
    
    if (!supabase) {
        throw new Error('No database connection available');
    }
    
    const userProfile = window.db?.currentUserProfile || window.currentUserProfile;
    const userProgram = userProfile?.program || 'KRCHN';
    const userBlock = userProfile?.block || 'A';
    const userIntakeYear = userProfile?.intake_year || '2023';
    
    console.log(`👤 User: ${userProgram} - Block ${userBlock} - Intake ${userIntakeYear}`);
    
    // ===== 1. Fetch from calendar_events =====
    try {
        console.log('📋 Fetching calendar_events...');
        const { data: calendarEvents, error } = await supabase
            .from('calendar_events')
            .select('*')
            .or(`target_program.eq.${userProgram},target_program.eq.General`)
            .or(`target_block.eq.${userBlock},target_block.is.null`)
            .order('event_date', { ascending: true });
        
        if (error) throw error;
        
        if (calendarEvents && calendarEvents.length > 0) {
            console.log(`✅ Found ${calendarEvents.length} calendar events`);
            
            calendarEvents.forEach(event => {
                events.push({
                    id: `cal_${event.id}`,
                    date: event.event_date,
                    title: event.event_name,
                    type: event.type || 'Event',
                    details: event.description || '',
                    venue: event.venue,
                    startTime: event.start_time,
                    endTime: event.end_time,
                    organizer: event.organizer,
                    color: getEventColor(event.type),
                    icon: getEventIcon(event.type),
                    source: 'calendar_events',
                    program: event.target_program || 'General',
                    block: event.target_block || 'All'
                });
            });
        }
    } catch (error) {
        console.error('calendar_events error:', error.message);
    }
    
    // ===== 2. Fetch from exams_with_courses =====
    try {
        console.log('📝 Fetching exams_with_courses...');
        const { data: examsData, error } = await supabase
            .from('exams_with_courses')
            .select('*')
            .or(`program_type.eq.${userProgram},program_type.is.null`)
            .or(`block_term.eq.${userBlock},block_term.is.null`)
            .order('exam_date', { ascending: true });
        
        if (error) throw error;
        
        if (examsData && examsData.length > 0) {
            console.log(`✅ Found ${examsData.length} exams from exams_with_courses`);
            
            examsData.forEach(exam => {
                if (!exam.exam_date) return;
                
                const startTime = exam.exam_start_time || '09:00:00';
                let endTime = '12:00:00';
                
                if (exam.exam_start_time && exam.duration_minutes) {
                    const start = new Date(`1970-01-01T${exam.exam_start_time}`);
                    const end = new Date(start.getTime() + exam.duration_minutes * 60000);
                    endTime = end.toTimeString().slice(0, 8);
                }
                
                events.push({
                    id: `exam_wc_${exam.id}`,
                    date: exam.exam_date,
                    title: exam.exam_name || 'Exam',
                    type: (exam.exam_type || 'Exam').toUpperCase(),
                    details: `${exam.course_code || ''} - ${exam.course_name || ''}`.trim(),
                    venue: 'Examination Hall',
                    startTime: startTime,
                    endTime: endTime,
                    organizer: 'Examinations Department',
                    color: '#EF4444',
                    icon: 'fas fa-file-alt',
                    source: 'exams_with_courses',
                    program: exam.program_type || userProgram,
                    block: exam.block_term || userBlock,
                    courseName: exam.course_name,
                    status: exam.status,
                    duration: exam.duration_minutes
                });
            });
        }
    } catch (error) {
        console.error('exams_with_courses error:', error.message);
    }
    
    console.log(`🎯 Total raw events: ${events.length}`);
    return events;
}

// ========== HELPER FUNCTIONS ==========
function removeDuplicateEvents(events) {
    const uniqueMap = new Map();
    
    events.forEach(event => {
        const key = `${event.date}_${event.title}_${event.type}_${event.startTime}`;
        if (!uniqueMap.has(key)) {
            uniqueMap.set(key, event);
        }
    });
    
    return Array.from(uniqueMap.values());
}

function getEventStatus(eventDate, eventTime) {
    const now = new Date();
    const eventDateTime = new Date(eventDate + 'T' + (eventTime || '00:00:00'));
    
    if (eventDateTime < now) {
        return 'Completed';
    } else if (eventDateTime.toDateString() === now.toDateString()) {
        return 'Today';
    } else {
        return 'Upcoming';
    }
}

function showEmptyState(message = 'No scheduled events found') {
    const emptyState = document.getElementById('calendar-empty');
    const tableContainer = document.getElementById('calendar-table-container');
    
    if (emptyState) {
        const titleEl = emptyState.querySelector('h3');
        if (titleEl) titleEl.textContent = message;
        emptyState.style.display = 'block';
    }
    if (tableContainer) {
        tableContainer.style.display = 'none';
    }
}

function showErrorState(message) {
    const tableBody = document.getElementById('calendar-table');
    const loadingState = document.getElementById('calendar-loading');
    const emptyState = document.getElementById('calendar-empty');
    
    if (loadingState) loadingState.style.display = 'none';
    if (emptyState) emptyState.style.display = 'none';
    
    if (tableBody) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="4" style="padding: 40px; text-align: center; color: #ef4444;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 2rem; margin-bottom: 10px;"></i>
                    <p style="font-weight: 600; margin-bottom: 10px;">Error Loading Calendar</p>
                    <p style="margin-bottom: 15px; font-size: 0.9rem;">${escapeHtml(message)}</p>
                    <button onclick="location.reload()" 
                            style="padding: 8px 16px; background: #ef4444; color: white; border: none; border-radius: 6px; cursor: pointer;">
                        <i class="fas fa-redo"></i> Try Again
                    </button>
                </td>
            </tr>
        `;
    }
}

// ========== UTILITY FUNCTIONS ==========
function formatEventDate(dateString) {
    if (!dateString) return 'Date not set';
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric'
        });
    } catch (error) {
        return dateString;
    }
}

function formatEventTime(startTime, endTime) {
    if (!startTime) return 'All day';
    const cleanStart = startTime.includes(':') ? 
        startTime.split(':').slice(0, 2).join(':') : 
        startTime;
    if (!endTime) return cleanStart;
    const cleanEnd = endTime.includes(':') ? 
        endTime.split(':').slice(0, 2).join(':') : 
        endTime;
    return `${cleanStart} - ${cleanEnd}`;
}

function getEventColor(eventType) {
    const type = eventType.toUpperCase();
    if (type.includes('EXAM') || type.includes('CAT')) return '#EF4444';
    if (type.includes('CLINICAL')) return '#10B981';
    if (type.includes('CLASS')) return '#3B82F6';
    if (type.includes('EVENT')) return '#8B5CF6';
    return '#6B7280';
}

function getEventIcon(eventType) {
    const type = eventType.toUpperCase();
    if (type.includes('EXAM') || type.includes('CAT')) return 'fas fa-file-alt';
    if (type.includes('CLINICAL')) return 'fas fa-hospital';
    if (type.includes('CLASS')) return 'fas fa-chalkboard-teacher';
    if (type.includes('EVENT')) return 'fas fa-calendar-alt';
    return 'fas fa-calendar';
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// ========== GLOBAL FUNCTIONS ==========
window.loadAcademicCalendar = loadAcademicCalendar;
window.filterCalendarEvents = filterCalendarEvents;
window.loadCalendarTimetable = loadCalendarTimetable;
window.toggleCalendarView = toggleCalendarView;
window.exportCalendarToPDF = exportCalendarToPDF;

console.log('📅 calendar.js updated - Enhanced with new HTML styling!');
