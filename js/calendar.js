// calendar.js - COMPLETE FIXED VERSION WITH TIMETABLE INSIDE CALENDAR TAB
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
    if (!todayElement) {
        console.log('⚠️ current-date-display element not found');
        return;
    }
    
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
    
    console.log('✅ Calendar event listeners setup complete');
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
                        .select('block')
                        .eq('user_id', user.id)
                        .single();
                    studentBlock = profile?.block;
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
                <button class="week-btn-calendar" data-week="${week}">Week ${week}</button>
            `).join('');
            
            // Style the container
            weekButtonsDiv.style.cssText = 'display: flex; gap: 5px; flex-wrap: wrap;';
            
            // Add click handlers
            weekButtonsDiv.querySelectorAll('.week-btn-calendar').forEach((btn, index) => {
                btn.addEventListener('click', function() {
                    const week = parseInt(this.dataset.week);
                    renderCalendarTimetable(week);
                    
                    weekButtonsDiv.querySelectorAll('.week-btn-calendar').forEach(b => {
                        b.classList.remove('active');
                        b.style.background = 'transparent';
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
                background: #4C1D95;
                color: white;
                padding: 12px;
                text-align: left;
                font-weight: 600;
                font-size: 12px;
            }
            .timetable-compact td {
                padding: 10px 12px;
                border-bottom: 1px solid #f0f0f0;
                vertical-align: top;
            }
            .timetable-compact tr:hover td {
                background: #faf5ff;
            }
            .timetable-day {
                font-weight: 600;
                width: 70px;
                background: #faf5ff;
            }
            .timetable-time {
                font-family: monospace;
                font-size: 11px;
                white-space: nowrap;
                width: 80px;
            }
            .badge-tiny {
                display: inline-block;
                padding: 2px 6px;
                border-radius: 4px;
                font-size: 9px;
                margin-left: 6px;
                font-weight: 600;
            }
            .badge-exam { background: #fef3c7; color: #d97706; }
            .badge-holiday { background: #fee2e2; color: #dc2626; }
            .badge-pending { background: #f3f4f6; color: #6b7280; }
            .badge-study { background: #e0e7ff; color: #4338ca; }
        </style>
        <div style="overflow-x: auto;">
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
                    <td class="timetable-day">${shortDayNames[day]}</td>
                    <td colspan="4" style="color: #9ca3af; text-align: center;">— No classes —</td>
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
                        <td><strong>${escapeHtml(courseDisplay)}</strong>${badges}</td>
                        <td>${escapeHtml(lecturerName)}</td>
                        <td>${escapeHtml(cls.venue || 'TBD')}</td>
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
        if (loadingState) loadingState.style.display = 'flex';
        if (tableContainer) tableContainer.style.display = 'none';
        
        updateTodayDate();
        
        tableBody.innerHTML = `
            <tr>
                <td colspan="4" style="padding: 40px; text-align: center;">
                    <div style="display: inline-block; width: 40px; height: 40px; border: 3px solid #f3f4f6; border-top-color: #6d28d9; border-radius: 50%; animation: spin 1s linear infinite;"></div>
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
            <tr class="calendar-event-row" data-id="${event.id}" ${isPast ? 'style="opacity: 0.8;"' : ''}>
                <td class="date-col">
                    <div class="date-time-container">
                        <div class="event-date">
                            <strong>${event.formattedDate}</strong>
                            ${isToday ? '<span class="today-badge">TODAY</span>' : ''}
                        </div>
                        <div class="event-time">
                            <i class="fas fa-clock"></i>
                            ${event.formattedTime}
                        </div>
                        ${event.venue ? `
                            <div class="event-venue">
                                <i class="fas fa-map-marker-alt"></i>
                                ${escapeHtml(event.venue)}
                            </div>
                        ` : ''}
                    </div>
                </td>
                <td>
                    <div class="event-details">
                        <h3 class="event-title">
                            ${escapeHtml(event.title)}
                            ${event.program && event.program !== 'General' ? 
                                `<span class="program-badge">${event.program}</span>` : ''}
                        </h3>
                        <p class="event-description">${escapeHtml(event.details || 'No details provided')}</p>
                        ${event.organizer ? `
                            <div class="event-organizer">
                                <i class="fas fa-user"></i>
                                ${escapeHtml(event.organizer)}
                            </div>
                        ` : ''}
                        <div class="event-source">
                            <i class="fas fa-database"></i>
                            Source: ${event.source}
                            ${event.courseName ? ` • Course: ${escapeHtml(event.courseName)}` : ''}
                        </div>
                    </div>
                </td>
                <td class="type-col">
                    <span class="event-type-badge" style="background-color: ${event.color}15; color: ${event.color}; border-color: ${event.color}30;">
                        <i class="${event.icon}"></i>
                        ${event.type}
                    </span>
                </td>
                <td class="status-col">
                    ${isPast ? 
                        '<span class="status-badge status-completed"><i class="fas fa-check-circle"></i> Completed</span>' :
                        '<span class="status-badge status-upcoming"><i class="fas fa-clock"></i> Upcoming</span>'
                    }
                </td>
            </tr>
        `;
    });
    
    tableBody.innerHTML = html;
    
    document.querySelectorAll('.calendar-event-row').forEach(row => {
        row.addEventListener('click', function() {
            const eventId = this.getAttribute('data-id');
            const event = events.find(e => e.id === eventId);
            if (event) {
                showEventDetails(event);
            }
        });
    });
    
    console.log('✅ Table rendered');
}

function showEventDetails(event) {
    alert(`📅 ${event.title}\n\n📆 Date: ${event.formattedDate}\n⏰ Time: ${event.formattedTime}\n📍 Venue: ${event.venue || 'TBD'}\n📝 Details: ${event.details || 'No additional details'}`);
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
        emptyState.style.display = 'flex';
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

console.log('📅 calendar.js loaded - WITH TIMETABLE INSIDE CALENDAR TAB');
