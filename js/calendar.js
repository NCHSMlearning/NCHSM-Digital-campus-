// calendar.js - Academic Calendar System for NCHSM Digital Student Dashboard

// *************************************************************************
// *** ACADEMIC CALENDAR SYSTEM ***
// *************************************************************************

let cachedCalendarEvents = [];
let currentCalendarView = 'list'; // month, week, day, list
let currentDate = new Date();
let isLoadingCalendar = false;

// Initialize calendar system
function initializeCalendarSystem() {
    console.log('📅 Initializing Academic Calendar System...');
    
    // Set up event listeners for calendar tab
    const calendarTab = document.querySelector('.nav a[data-tab="calendar"]');
    if (calendarTab) {
        calendarTab.addEventListener('click', () => {
            if (currentUserId && !isLoadingCalendar) {
                loadAcademicCalendar();
                initializeCalendarControls();
            }
        });
    }
    
    // Set up calendar filter
    const calendarFilter = document.getElementById('calendar-filter');
    if (calendarFilter) {
        calendarFilter.addEventListener('change', loadAcademicCalendar);
    }
    
    // Set up calendar navigation (if controls exist)
    initializeCalendarControls();
    
    console.log('✅ Calendar System initialized');
}

// Initialize calendar navigation controls
function initializeCalendarControls() {
    // Today button
    const todayBtn = document.getElementById('calendar-today-btn');
    if (todayBtn) {
        todayBtn.addEventListener('click', () => {
            currentDate = new Date();
            loadAcademicCalendar();
            updateCalendarHeader();
        });
    }
    
    // Previous button
    const prevBtn = document.getElementById('calendar-prev-btn');
    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            if (currentCalendarView === 'month') {
                currentDate.setMonth(currentDate.getMonth() - 1);
            } else if (currentCalendarView === 'week') {
                currentDate.setDate(currentDate.getDate() - 7);
            } else if (currentCalendarView === 'day') {
                currentDate.setDate(currentDate.getDate() - 1);
            }
            loadAcademicCalendar();
            updateCalendarHeader();
        });
    }
    
    // Next button
    const nextBtn = document.getElementById('calendar-next-btn');
    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            if (currentCalendarView === 'month') {
                currentDate.setMonth(currentDate.getMonth() + 1);
            } else if (currentCalendarView === 'week') {
                currentDate.setDate(currentDate.getDate() + 7);
            } else if (currentCalendarView === 'day') {
                currentDate.setDate(currentDate.getDate() + 1);
            }
            loadAcademicCalendar();
            updateCalendarHeader();
        });
    }
    
    // View toggle buttons
    const viewButtons = document.querySelectorAll('.calendar-view-btn');
    viewButtons.forEach(button => {
        button.addEventListener('click', function() {
            const view = this.getAttribute('data-view');
            switchCalendarView(view);
        });
    });
    
    // Print button
    const printBtn = document.getElementById('calendar-print-btn');
    if (printBtn) {
        printBtn.addEventListener('click', printCalendar);
    }
    
    // Export button
    const exportBtn = document.getElementById('calendar-export-btn');
    if (exportBtn) {
        exportBtn.addEventListener('click', exportCalendar);
    }
}

// Load academic calendar
async function loadAcademicCalendar() {
    if (isLoadingCalendar) return;
    
    const tableBody = document.getElementById('calendar-table');
    if (!tableBody) return;
    
    isLoadingCalendar = true;
   AppUtils.showLoading(tableBody, 'Loading academic schedule...');
    
    try {
        // ====== CRITICAL FIX: Ensure user profile is available ======
        // Try multiple sources for user profile
        let userProfile = window.db?.currentUserProfile || 
                         window.currentUserProfile || 
                         window.userProfile;
        
        const userId = window.db?.currentUserId || 
                      window.currentUserId || 
                      userProfile?.user_id;
        
        const supabaseClient = window.supabase || window.db?.supabase;
        
        // If no profile found, try to load it
        if (!userProfile || !userId || !supabaseClient) {
            console.warn('📅 User profile or database not available, attempting to load...');
            
            // Try to get from auth
            if (supabaseClient) {
                const { data: { user } } = await supabaseClient.auth.getUser();
                if (user) {
                    window.currentUserId = user.id;
                    
                    // Try to load profile from database
                    const { data: profile } = await supabaseClient
                        .from('consolidated_user_profiles_table')
                        .select('*')
                        .eq('user_id', user.id)
                        .single();
                    
                    if (profile) {
                        userProfile = profile;
                        window.currentUserProfile = profile;
                        window.userProfile = profile;
                        
                        if (window.db) {
                            window.db.currentUserProfile = profile;
                            window.db.currentUserId = user.id;
                        }
                        
                        console.log('✅ Calendar: User profile loaded');
                    }
                }
            }
            
            // If still no profile, show error
            if (!userProfile) {
                throw new Error('User profile not available. Please refresh the page or log in again.');
            }
        }
        
        // Set global variables for fetchAllScheduleData function
        window.currentUserProfile = userProfile;
        window.currentUserId = userId;
        window.sb = supabaseClient;
        
        console.log('📅 Calendar using profile:', {
            name: userProfile.full_name,
            program: userProfile.program || userProfile.department,
            block: userProfile.block,
            intakeYear: userProfile.intake_year
        });
        // ====== END OF FIX ======
        
        // Clear any existing calendar rendering
        clearCalendarRendering();
        
        // Fetch all schedule data
        const allEvents = await fetchAllScheduleData();
        const filterType = document.getElementById('calendar-filter')?.value || 'all';
        
        // Filter events
        const filteredEvents = allEvents
            .filter(e => filterType === 'all' || e.type === filterType)
            .sort((a, b) => new Date(a.date) - new Date(b.date));
        
        cachedCalendarEvents = filteredEvents;
        
        // Render based on current view
        if (currentCalendarView === 'month') {
            renderMonthView(filteredEvents);
        } else if (currentCalendarView === 'week') {
            renderWeekView(filteredEvents);
        } else if (currentCalendarView === 'day') {
            renderDayView(filteredEvents);
        } else {
            // Default to list view (original implementation)
            renderListView(filteredEvents, filterType);
        }
        
        // Update statistics
        updateCalendarStatistics(filteredEvents);
        
        // Update upcoming events in dashboard
        updateDashboardCalendarEvents(filteredEvents);
        
    } catch (error) {
        console.error("Failed to load academic calendar:", error);
        AppUtils.showError(tableBody, 'Error loading calendar data: ' + error.message);
    } finally {
        isLoadingCalendar = false;
    }
}
// Fetch all schedule data from multiple sources
async function fetchAllScheduleData() {
    console.log('📅 Starting fetchAllScheduleData...');
    
    // ALWAYS use window.db.supabase - it's the working client
    const supabaseClient = window.db?.supabase;
    
    if (!supabaseClient || typeof supabaseClient.from !== 'function') {
        console.error('❌ No valid Supabase client found');
        console.log('Available clients:', {
            'window.db.supabase': window.db?.supabase,
            'window.supabase': window.supabase,
            'window.sb': window.sb
        });
        return [];
    }
    
    // Get user data
    const currentUserProfile = window.db?.currentUserProfile || window.currentUserProfile || {};
    const currentUserId = window.db?.currentUserId || window.currentUserId;
    
    console.log('👤 Using profile:', {
        name: currentUserProfile.full_name,
        program: currentUserProfile.program,
        block: currentUserProfile.block,
        intakeYear: currentUserProfile.intake_year
    });
    
    const program = currentUserProfile?.program || currentUserProfile?.department;
    const block = currentUserProfile?.block;
    const intakeYear = currentUserProfile?.intake_year;
    
    if (!program || !block || !intakeYear) {
        console.warn('❌ Missing profile data:', { program, block, intakeYear });
        return [];
    }
    
    const events = [];
    
    try {
        console.log('🔍 Querying calendar_events table...');
        
        // Fetch events from calendar_events table
        const { data: calendarEvents, error: eventsError } = await supabaseClient
            .from('calendar_events')
            .select('event_name, event_date, type, description, target_program, target_block, target_intake_year, venue, start_time, end_time, organizer')
            .or(`target_program.eq.${program},target_program.eq.General`)
            .or(`target_block.eq.${block},target_block.is.null`)
            .eq('target_intake_year', intakeYear)
            .order('event_date', { ascending: true });
        
        if (eventsError) {
            console.error('❌ Error fetching calendar events:', eventsError);
            throw eventsError;
        }
        
        console.log(`✅ Found ${calendarEvents?.length || 0} calendar events`);
        
        // Format calendar events
        if (calendarEvents && calendarEvents.length > 0) {
            calendarEvents.forEach(event => {
                events.push({
                    id: `event_${event.event_date}_${event.event_name}`,
                    date: event.event_date,
                    title: event.event_name,
                    type: event.type || 'Event',
                    subtype: 'Calendar',
                    details: event.description,
                    venue: event.venue,
                    startTime: event.start_time,
                    endTime: event.end_time,
                    organizer: event.organizer,
                    fullDate: event.event_date,
                    color: getEventColor(event.type),
                    icon: getEventIcon(event.type)
                });
            });
        }
        
        // Fetch exams from cached exams or database
        let exams = [];
        if (window.cachedExams && window.cachedExams.length > 0) {
            exams = window.cachedExams;
            console.log(`📝 Using ${exams.length} cached exams`);
        } else if (window.db && typeof window.db.getExams === 'function') {
            console.log('📝 Fetching exams from database...');
            exams = await window.db.getExams() || [];
            console.log(`✅ Found ${exams.length} exams`);
        }
        
        exams.forEach(exam => {
            if (exam.exam_date) {
                events.push({
                    id: `exam_${exam.id}`,
                    date: exam.exam_date,
                    title: exam.exam_name,
                    type: 'Exam',
                    subtype: 'Exam/CAT',
                    details: `${exam.status || 'Scheduled'} - Block ${exam.block_term || exam.block || 'N/A'}`,
                    venue: 'Examination Hall',
                    startTime: '09:00',
                    endTime: '12:00',
                    organizer: 'Examinations Department',
                    fullDate: exam.exam_date,
                    color: '#EF4444',
                    icon: 'fas fa-file-alt'
                });
            }
        });
        
        console.log(`🎯 Total events collected: ${events.length}`);
        return events;
        
    } catch (error) {
        console.error("❌ Error fetching schedule data:", error);
        return [];
    }
}
// Fetch clinical sessions
async function fetchClinicalSessions(program, block, intakeYear) {
    try {
        const supabaseClient = window.db?.supabase;
        if (!supabaseClient) return [];
        
        const { data: sessions, error } = await supabaseClient
            .from('clinical_sessions')
            .select('date, department, description, hospital, start_time, end_time, supervisor')
            .eq('program', program)
            .eq('block', block)
            .eq('intake_year', intakeYear)
            .order('date', { ascending: true });
        
        if (error) throw error;
        
        return sessions || [];
    } catch (error) {
        console.error("Error fetching clinical sessions:", error);
        return [];
    }
}


// Fetch clinical sessions
async function fetchClinicalSessions(program, block, intakeYear) {
    try {
        // USE window.db.supabase instead of sb
        const supabaseClient = window.db?.supabase;
        
        if (!supabaseClient || typeof supabaseClient.from !== 'function') {
            console.error("❌ No valid Supabase client for clinical sessions");
            return [];
        }
        
        const { data: sessions, error } = await supabaseClient
            .from('clinical_sessions')
            .select('date, department, description, hospital, start_time, end_time, supervisor')
            .eq('program', program)
            .eq('block', block)
            .eq('intake_year', intakeYear)
            .order('date', { ascending: true });
        
        if (error) throw error;
        
        return sessions || [];
    } catch (error) {
        console.error("Error fetching clinical sessions:", error);
        return [];
    }
}

// Fetch class sessions
async function fetchClassSessions(program, block, intakeYear) {
    try {
        // USE window.db.supabase instead of sb
        const supabaseClient = window.db?.supabase;
        
        if (!supabaseClient || typeof supabaseClient.from !== 'function') {
            console.error("❌ No valid Supabase client for class sessions");
            return [];
        }
        
        const { data: sessions, error } = await supabaseClient
            .from('class_sessions')
            .select('date, course_name, description, venue, start_time, end_time, lecturer')
            .eq('program', program)
            .eq('block', block)
            .eq('intake_year', intakeYear)
            .order('date', { ascending: true });
        
        if (error) throw error;
        
        return sessions || [];
    } catch (error) {
        console.error("Error fetching class sessions:", error);
        return [];
    }
}
// Render list view (original implementation)
function renderListView(events, filterType) {
    const tableBody = document.getElementById('calendar-table');
    if (!tableBody) return;
    
    tableBody.innerHTML = '';
    
    if (events.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="3">No scheduled events found for the selected filter (${filterType}).</td></tr>`;
        return;
    }
    
    events.forEach(event => {
        const dateStr = formatEventDateTime(event);
        const row = `
            <tr class="calendar-event-row" data-id="${event.id}">
                <td class="date-col">
                    <div class="event-date">
                        <i class="${event.icon}" style="color: ${event.color}; margin-right: 8px;"></i>
                        ${dateStr}
                    </div>
                </td>
                <td>
                    <div class="event-details">
                        <strong class="event-title">${escapeHtml(event.title)}</strong>
                        <div class="event-info">
                            <span class="event-type" style="background: ${event.color}20; color: ${event.color};">
                                ${event.type}
                            </span>
                            <span class="event-subtype">${event.subtype}</span>
                        </div>
                        <p class="event-description">${escapeHtml(event.details)}</p>
                        ${event.venue ? `<div class="event-venue"><i class="fas fa-map-marker-alt"></i> ${event.venue}</div>` : ''}
                        ${event.organizer ? `<div class="event-organizer"><i class="fas fa-user"></i> ${event.organizer}</div>` : ''}
                    </div>
                </td>
                <td class="session-type-col">
                    <span class="event-type-badge" style="background: ${event.color};">
                        ${event.type}
                    </span>
                </td>
            </tr>
        `;
        tableBody.innerHTML += row;
    });
    
    // Add click handlers for event rows
    addCalendarEventListeners();
}

// Render month view
function renderMonthView(events) {
    const calendarContainer = document.getElementById('calendar-container');
    if (!calendarContainer) return;
    
    // Clear container
    calendarContainer.innerHTML = '';
    
    // Create month view structure
    const monthView = document.createElement('div');
    monthView.className = 'calendar-month-view';
    
    // Calculate month details
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay(); // 0 = Sunday, 1 = Monday, etc.
    
    // Month header
    const monthHeader = document.createElement('div');
    monthHeader.className = 'calendar-month-header';
    monthHeader.innerHTML = `
        <h3>${currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h3>
        <div class="month-stats">
            <span><i class="fas fa-calendar-check"></i> ${events.length} events</span>
            <span><i class="fas fa-exclamation-circle"></i> ${getUpcomingEventsCount(events)} upcoming</span>
        </div>
    `;
    monthView.appendChild(monthHeader);
    
    // Day names header
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayNamesRow = document.createElement('div');
    dayNamesRow.className = 'calendar-day-names';
    dayNames.forEach(day => {
        const dayCell = document.createElement('div');
        dayCell.className = 'calendar-day-name';
        dayCell.textContent = day;
        dayNamesRow.appendChild(dayCell);
    });
    monthView.appendChild(dayNamesRow);
    
    // Calendar grid
    const calendarGrid = document.createElement('div');
    calendarGrid.className = 'calendar-month-grid';
    
    // Add empty cells for days before the first day of month
    for (let i = 0; i < startingDay; i++) {
        const emptyCell = document.createElement('div');
        emptyCell.className = 'calendar-day empty';
        calendarGrid.appendChild(emptyCell);
    }
    
    // Add days of the month
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    for (let day = 1; day <= daysInMonth; day++) {
        const dayCell = document.createElement('div');
        dayCell.className = 'calendar-day';
        
        const currentDay = new Date(year, month, day);
        currentDay.setHours(0, 0, 0, 0);
        
        // Check if today
        if (currentDay.getTime() === today.getTime()) {
            dayCell.classList.add('today');
        }
        
        // Check if weekend
        const dayOfWeek = currentDay.getDay();
        if (dayOfWeek === 0 || dayOfWeek === 6) {
            dayCell.classList.add('weekend');
        }
        
        // Day number
        const dayNumber = document.createElement('div');
        dayNumber.className = 'day-number';
        dayNumber.textContent = day;
        dayCell.appendChild(dayNumber);
        
        // Get events for this day
        const dayEvents = events.filter(event => {
            const eventDate = new Date(event.date);
            eventDate.setHours(0, 0, 0, 0);
            return eventDate.getTime() === currentDay.getTime();
        });
        
        // Add event indicators
        if (dayEvents.length > 0) {
            const eventsIndicator = document.createElement('div');
            eventsIndicator.className = 'day-events';
            
            dayEvents.slice(0, 3).forEach(event => {
                const eventDot = document.createElement('span');
                eventDot.className = 'event-dot';
                eventDot.style.backgroundColor = event.color;
                eventDot.title = event.title;
                eventsIndicator.appendChild(eventDot);
            });
            
            if (dayEvents.length > 3) {
                const moreIndicator = document.createElement('span');
                moreIndicator.className = 'more-events';
                moreIndicator.textContent = `+${dayEvents.length - 3}`;
                eventsIndicator.appendChild(moreIndicator);
            }
            
            dayCell.appendChild(eventsIndicator);
            
            // Add click handler to view day details
            dayCell.addEventListener('click', () => {
                showDayEvents(dayEvents, currentDay);
            });
            
            dayCell.style.cursor = 'pointer';
            dayCell.classList.add('has-events');
        }
        
        calendarGrid.appendChild(dayCell);
    }
    
    monthView.appendChild(calendarGrid);
    calendarContainer.appendChild(monthView);
    
    // Add event list summary
    renderUpcomingEventsSummary(events);
}

// Render week view
function renderWeekView(events) {
    const calendarContainer = document.getElementById('calendar-container');
    if (!calendarContainer) return;
    
    calendarContainer.innerHTML = '';
    
    // Calculate week start and end
    const weekStart = new Date(currentDate);
    weekStart.setDate(currentDate.getDate() - currentDate.getDay()); // Start from Sunday
    
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    
    const weekView = document.createElement('div');
    weekView.className = 'calendar-week-view';
    
    // Week header
    const weekHeader = document.createElement('div');
    weekHeader.className = 'calendar-week-header';
    weekHeader.innerHTML = `
        <h3>Week of ${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</h3>
    `;
    weekView.appendChild(weekHeader);
    
    // Time slots (8 AM to 6 PM)
    const timeSlots = [];
    for (let hour = 8; hour <= 18; hour++) {
        timeSlots.push(`${hour.toString().padStart(2, '0')}:00`);
    }
    
    // Create day columns
    const daysContainer = document.createElement('div');
    daysContainer.className = 'calendar-week-days';
    
    // Day headers
    const dayHeaders = document.createElement('div');
    dayHeaders.className = 'week-day-headers';
    
    // Empty cell for time column
    const timeHeader = document.createElement('div');
    timeHeader.className = 'week-time-header';
    timeHeader.textContent = 'Time';
    dayHeaders.appendChild(timeHeader);
    
    // Create day columns
    for (let i = 0; i < 7; i++) {
        const dayDate = new Date(weekStart);
        dayDate.setDate(weekStart.getDate() + i);
        
        const dayHeader = document.createElement('div');
        dayHeader.className = 'week-day-header';
        
        const dayName = dayDate.toLocaleDateString('en-US', { weekday: 'short' });
        const dayNumber = dayDate.getDate();
        const isToday = isSameDay(dayDate, new Date());
        
        dayHeader.innerHTML = `
            <div class="day-name ${isToday ? 'today' : ''}">${dayName}</div>
            <div class="day-number ${isToday ? 'today' : ''}">${dayNumber}</div>
        `;
        
        dayHeaders.appendChild(dayHeader);
    }
    
    daysContainer.appendChild(dayHeaders);
    
    // Time slots and events
    const timeGrid = document.createElement('div');
    timeGrid.className = 'week-time-grid';
    
    timeSlots.forEach(timeSlot => {
        const timeRow = document.createElement('div');
        timeRow.className = 'week-time-row';
        
        // Time label
        const timeLabel = document.createElement('div');
        timeLabel.className = 'time-slot-label';
        timeLabel.textContent = timeSlot;
        timeRow.appendChild(timeLabel);
        
        // Day cells
        for (let i = 0; i < 7; i++) {
            const dayDate = new Date(weekStart);
            dayDate.setDate(weekStart.getDate() + i);
            
            const dayCell = document.createElement('div');
            dayCell.className = 'week-day-cell';
            
            // Check for events in this time slot
            const [hour, minute] = timeSlot.split(':').map(Number);
            const slotStart = new Date(dayDate);
            slotStart.setHours(hour, minute, 0, 0);
            
            const slotEnd = new Date(slotStart);
            slotEnd.setHours(hour + 1, 0, 0, 0);
            
            const slotEvents = events.filter(event => {
                if (!event.startTime) return false;
                
                const eventDate = new Date(event.date);
                const [eventHour, eventMinute] = event.startTime.split(':').map(Number);
                eventDate.setHours(eventHour, eventMinute, 0, 0);
                
                return isSameDay(eventDate, dayDate) && 
                       eventHour === hour;
            });
            
            if (slotEvents.length > 0) {
                slotEvents.forEach(event => {
                    const eventElement = createWeekEventElement(event);
                    dayCell.appendChild(eventElement);
                });
                dayCell.classList.add('has-events');
            }
            
            timeRow.appendChild(dayCell);
        }
        
        timeGrid.appendChild(timeRow);
    });
    
    daysContainer.appendChild(timeGrid);
    weekView.appendChild(daysContainer);
    calendarContainer.appendChild(weekView);
}

// Render day view
function renderDayView(events) {
    const calendarContainer = document.getElementById('calendar-container');
    if (!calendarContainer) return;
    
    calendarContainer.innerHTML = '';
    
    const dayView = document.createElement('div');
    dayView.className = 'calendar-day-view';
    
    // Day header
    const dayHeader = document.createElement('div');
    dayHeader.className = 'calendar-day-header';
    dayHeader.innerHTML = `
        <h3>${currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</h3>
    `;
    dayView.appendChild(dayHeader);
    
    // Get events for this day
    const dayEvents = events.filter(event => {
        const eventDate = new Date(event.date);
        return isSameDay(eventDate, currentDate);
    });
    
    if (dayEvents.length === 0) {
        const emptyState = document.createElement('div');
        emptyState.className = 'calendar-empty-state';
        emptyState.innerHTML = `
            <i class="fas fa-calendar-times"></i>
            <h4>No Events Scheduled</h4>
            <p>You have no events scheduled for today.</p>
        `;
        dayView.appendChild(emptyState);
    } else {
        // Group events by time
        const eventsByTime = groupEventsByTime(dayEvents);
        
        // Time slots
        const timeSlotsContainer = document.createElement('div');
        timeSlotsContainer.className = 'day-time-slots';
        
        const timeSlots = [
            'Morning (8:00 - 12:00)',
            'Afternoon (12:00 - 17:00)',
            'Evening (17:00 - 20:00)'
        ];
        
        timeSlots.forEach(timeSlot => {
            const slotEvents = eventsByTime[timeSlot] || [];
            
            const timeSlotElement = document.createElement('div');
            timeSlotElement.className = 'day-time-slot';
            
            const slotHeader = document.createElement('div');
            slotHeader.className = 'time-slot-header';
            slotHeader.innerHTML = `
                <h4>${timeSlot}</h4>
                <span class="event-count">${slotEvents.length} event${slotEvents.length !== 1 ? 's' : ''}</span>
            `;
            timeSlotElement.appendChild(slotHeader);
            
            if (slotEvents.length > 0) {
                const eventsList = document.createElement('div');
                eventsList.className = 'time-slot-events';
                
                slotEvents.forEach(event => {
                    const eventElement = createDayEventElement(event);
                    eventsList.appendChild(eventElement);
                });
                
                timeSlotElement.appendChild(eventsList);
            } else {
                const emptySlot = document.createElement('div');
                emptySlot.className = 'time-slot-empty';
                emptySlot.textContent = 'No events scheduled';
                timeSlotElement.appendChild(emptySlot);
            }
            
            timeSlotsContainer.appendChild(timeSlotElement);
        });
        
        dayView.appendChild(timeSlotsContainer);
    }
    
    calendarContainer.appendChild(dayView);
}

// Create week event element
function createWeekEventElement(event) {
    const element = document.createElement('div');
    element.className = 'week-event';
    element.style.backgroundColor = event.color;
    element.innerHTML = `
        <div class="week-event-title">${escapeHtml(event.title)}</div>
        <div class="week-event-time">${event.startTime || ''}${event.endTime ? ` - ${event.endTime}` : ''}</div>
    `;
    
    element.addEventListener('click', (e) => {
        e.stopPropagation();
        showEventDetails(event);
    });
    
    return element;
}

// Create day event element
function createDayEventElement(event) {
    const element = document.createElement('div');
    element.className = 'day-event';
    element.style.borderLeftColor = event.color;
    element.innerHTML = `
        <div class="event-time">
            <i class="fas fa-clock"></i>
            <span>${event.startTime || 'All day'}${event.endTime ? ` - ${event.endTime}` : ''}</span>
        </div>
        <div class="event-main">
            <div class="event-header">
                <h4 class="event-title">${escapeHtml(event.title)}</h4>
                <span class="event-type" style="background: ${event.color}20; color: ${event.color};">
                    ${event.type}
                </span>
            </div>
            <p class="event-description">${escapeHtml(event.details)}</p>
            ${event.venue ? `<div class="event-venue"><i class="fas fa-map-marker-alt"></i> ${event.venue}</div>` : ''}
            ${event.organizer ? `<div class="event-organizer"><i class="fas fa-user"></i> ${event.organizer}</div>` : ''}
        </div>
    `;
    
    element.addEventListener('click', () => {
        showEventDetails(event);
    });
    
    return element;
}

// Show day events in modal
function showDayEvents(events, date) {
    if (events.length === 0) return;
    
    const modalContent = `
        <div class="day-events-modal">
            <div class="modal-header">
                <h3>${date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</h3>
                <span class="event-count">${events.length} event${events.length !== 1 ? 's' : ''}</span>
            </div>
            <div class="modal-body">
                ${events.map(event => createEventCard(event)).join('')}
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="closeModal()">Close</button>
                ${events.some(e => e.type === 'Exam') ? 
                    `<button class="btn btn-primary" onclick="showExamsForDate('${date.toISOString()}')">
                        <i class="fas fa-file-alt"></i> View Exam Details
                    </button>` : ''}
            </div>
        </div>
    `;
    
    showModal('Day Events', modalContent);
}

// Create event card for modal
function createEventCard(event) {
    return `
        <div class="event-card" style="border-left-color: ${event.color};">
            <div class="event-card-header">
                <div class="event-icon" style="background: ${event.color};">
                    <i class="${event.icon}"></i>
                </div>
                <div class="event-card-title">
                    <h4>${escapeHtml(event.title)}</h4>
                    <div class="event-card-meta">
                        <span class="event-type">${event.type}</span>
                        <span class="event-time">
                            <i class="fas fa-clock"></i>
                            ${event.startTime || 'All day'}${event.endTime ? ` - ${event.endTime}` : ''}
                        </span>
                    </div>
                </div>
            </div>
            <div class="event-card-body">
                <p class="event-description">${escapeHtml(event.details)}</p>
                <div class="event-details-grid">
                    ${event.venue ? `
                        <div class="event-detail">
                            <i class="fas fa-map-marker-alt"></i>
                            <span>${event.venue}</span>
                        </div>
                    ` : ''}
                    ${event.organizer ? `
                        <div class="event-detail">
                            <i class="fas fa-user"></i>
                            <span>${event.organizer}</span>
                        </div>
                    ` : ''}
                </div>
            </div>
        </div>
    `;
}

// Show event details modal
function showEventDetails(event) {
    const modalContent = `
        <div class="event-details-modal">
            <div class="event-details-header" style="background: ${event.color};">
                <div class="event-icon-large">
                    <i class="${event.icon}"></i>
                </div>
                <div class="event-header-content">
                    <h3>${escapeHtml(event.title)}</h3>
                    <div class="event-header-meta">
                        <span class="event-date">
                            <i class="fas fa-calendar"></i>
                            ${formatEventDate(event.date)}
                        </span>
                        <span class="event-type-badge">
                            ${event.type}
                        </span>
                    </div>
                </div>
            </div>
            <div class="event-details-body">
                <div class="event-detail-section">
                    <h4><i class="fas fa-info-circle"></i> Details</h4>
                    <p>${escapeHtml(event.details)}</p>
                </div>
                
                <div class="event-info-grid">
                    ${event.startTime ? `
                        <div class="info-item">
                            <i class="fas fa-clock"></i>
                            <div>
                                <label>Time</label>
                                <span>${event.startTime}${event.endTime ? ` - ${event.endTime}` : ''}</span>
                            </div>
                        </div>
                    ` : ''}
                    
                    ${event.venue ? `
                        <div class="info-item">
                            <i class="fas fa-map-marker-alt"></i>
                            <div>
                                <label>Venue</label>
                                <span>${event.venue}</span>
                            </div>
                        </div>
                    ` : ''}
                    
                    ${event.organizer ? `
                        <div class="info-item">
                            <i class="fas fa-user"></i>
                            <div>
                                <label>Organizer</label>
                                <span>${event.organizer}</span>
                            </div>
                        </div>
                    ` : ''}
                </div>
                
                ${event.type === 'Exam' ? `
                    <div class="event-actions">
                        <button class="btn btn-primary" onclick="viewExamDetails('${event.id.replace('exam_', '')}')">
                            <i class="fas fa-file-alt"></i> View Exam Details
                        </button>
                    </div>
                ` : ''}
            </div>
        </div>
    `;
    
    showModal('Event Details', modalContent);
}

// Show exam details
function showExamsForDate(dateString) {
    const date = new Date(dateString);
    const exams = cachedCalendarEvents.filter(event => 
        event.type === 'Exam' && isSameDay(new Date(event.date), date)
    );
    
    if (exams.length === 0) {
        AppUtils.showToast('No exams found for this date', 'info');
        return;
    }
    
    const modalContent = `
        <div class="exams-modal">
            <div class="modal-header">
                <h3>Exams on ${date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}</h3>
            </div>
            <div class="modal-body">
                ${exams.map(exam => `
                    <div class="exam-card">
                        <div class="exam-header">
                            <h4>${escapeHtml(exam.title)}</h4>
                            <span class="exam-time">${exam.startTime} - ${exam.endTime}</span>
                        </div>
                        <div class="exam-details">
                            <p>${escapeHtml(exam.details)}</p>
                            <div class="exam-venue">
                                <i class="fas fa-map-marker-alt"></i>
                                ${exam.venue}
                            </div>
                        </div>
                        <div class="exam-actions">
                            <button class="btn btn-outline" onclick="viewProvisionalTranscript('${exam.id.replace('exam_', '')}')">
                                <i class="fas fa-eye"></i> View Transcript
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
    
    showModal('Exams', modalContent);
}

// View exam details
function viewExamDetails(examId) {
    closeModal();
    viewProvisionalTranscript(examId);
}

// Switch calendar view
function switchCalendarView(view) {
    currentCalendarView = view;
    currentDate = new Date(); // Reset to today when switching views
    
    // Update active view button
    document.querySelectorAll('.calendar-view-btn').forEach(btn => {
        if (btn.getAttribute('data-view') === view) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    // Load calendar with new view
    loadAcademicCalendar();
    updateCalendarHeader();
}

// Update calendar header
function updateCalendarHeader() {
    const headerElement = document.getElementById('calendar-header');
    if (!headerElement) return;
    
    let headerText = '';
    
    switch(currentCalendarView) {
        case 'month':
            headerText = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
            break;
        case 'week':
            const weekStart = new Date(currentDate);
            weekStart.setDate(currentDate.getDate() - currentDate.getDay());
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekStart.getDate() + 6);
            headerText = `Week of ${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
            break;
        case 'day':
            headerText = currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
            break;
        default:
            headerText = 'Academic Calendar';
    }
    
    headerElement.textContent = headerText;
}

// Update calendar statistics
function updateCalendarStatistics(events) {
    const statsElement = document.getElementById('calendar-stats');
    if (!statsElement) return;
    
    const totalEvents = events.length;
    const upcomingEvents = getUpcomingEventsCount(events);
    const exams = events.filter(e => e.type === 'Exam').length;
    const clinical = events.filter(e => e.type === 'Clinical').length;
    const classes = events.filter(e => e.type === 'Class').length;
    
    statsElement.innerHTML = `
        <div class="stat-item">
            <i class="fas fa-calendar-alt"></i>
            <span class="stat-value">${totalEvents}</span>
            <span class="stat-label">Total Events</span>
        </div>
        <div class="stat-item">
            <i class="fas fa-clock"></i>
            <span class="stat-value">${upcomingEvents}</span>
            <span class="stat-label">Upcoming</span>
        </div>
        <div class="stat-item">
            <i class="fas fa-file-alt"></i>
            <span class="stat-value">${exams}</span>
            <span class="stat-label">Exams</span>
        </div>
        <div class="stat-item">
            <i class="fas fa-hospital"></i>
            <span class="stat-value">${clinical}</span>
            <span class="stat-label">Clinical</span>
        </div>
        <div class="stat-item">
            <i class="fas fa-chalkboard-teacher"></i>
            <span class="stat-value">${classes}</span>
            <span class="stat-label">Classes</span>
        </div>
    `;
}

// Render upcoming events summary
function renderUpcomingEventsSummary(events) {
    const summaryElement = document.getElementById('upcoming-events');
    if (!summaryElement) return;
    
    const upcoming = events.filter(event => {
        const eventDate = new Date(event.date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return eventDate >= today;
    }).slice(0, 5); // Show next 5 events
    
    if (upcoming.length === 0) {
        summaryElement.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-calendar-check"></i>
                <p>No upcoming events</p>
            </div>
        `;
        return;
    }
    
    summaryElement.innerHTML = `
        <h4>Upcoming Events</h4>
        <div class="upcoming-events-list">
            ${upcoming.map(event => `
                <div class="upcoming-event-item">
                    <div class="upcoming-event-date" style="color: ${event.color};">
                        ${formatEventDate(event.date, true)}
                    </div>
                    <div class="upcoming-event-details">
                        <div class="upcoming-event-title">${escapeHtml(event.title)}</div>
                        <div class="upcoming-event-time">${event.startTime || ''}</div>
                    </div>
                    <div class="upcoming-event-type" style="background: ${event.color}20; color: ${event.color};">
                        ${event.type}
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

// Update dashboard calendar events
function updateDashboardCalendarEvents(events) {
    // Update upcoming exam on dashboard
    const upcomingExams = events.filter(event => 
        event.type === 'Exam' && new Date(event.date) > new Date()
    ).sort((a, b) => new Date(a.date) - new Date(b.date));
    
    const upcomingExamElement = document.getElementById('dashboard-upcoming-exam');
    if (upcomingExamElement && upcomingExams.length > 0) {
        const nextExam = upcomingExams[0];
        const examDate = new Date(nextExam.date).toLocaleDateString('en-US', { 
            month: 'short', day: 'numeric' 
        });
        upcomingExamElement.innerHTML = `
            <span style="color: #EF4444; font-weight: 600;">
                ${nextExam.title} on ${examDate}
            </span>
        `;
    }
}

// Clear calendar rendering
function clearCalendarRendering() {
    console.log("🧹 Clearing calendar rendering...");
    
    // Clear table view
    const tableBody = document.getElementById('calendar-table');
    if (tableBody) {
        tableBody.innerHTML = '';
        console.log("   Cleared #calendar-table");
    }
    
    // Clear container view
    const calendarContainer = document.getElementById('calendar-container');
    if (calendarContainer) {
        calendarContainer.innerHTML = '';
        console.log("   Cleared #calendar-container");
    }
}

// Add calendar event listeners
function addCalendarEventListeners() {
    document.querySelectorAll('.calendar-event-row').forEach(row => {
        row.addEventListener('click', function() {
            const eventId = this.getAttribute('data-id');
            const event = cachedCalendarEvents.find(e => e.id === eventId);
            if (event) {
                showEventDetails(event);
            }
        });
    });
}

// Print calendar
function printCalendar() {
    const printContent = document.createElement('div');
    printContent.className = 'print-calendar';
    
    // Header
    printContent.innerHTML = `
        <div class="print-header">
            <h2>NCHSM Academic Calendar</h2>
            <p>Generated on ${new Date().toLocaleDateString()}</p>
            <p>Student: ${currentUserProfile?.full_name || 'N/A'}</p>
            <p>Program: ${currentUserProfile?.program || 'N/A'} | Block: ${currentUserProfile?.block || 'N/A'}</p>
        </div>
    `;
    
    // Events list
    const eventsList = document.createElement('div');
    eventsList.className = 'print-events';
    
    if (cachedCalendarEvents.length === 0) {
        eventsList.innerHTML = '<p>No events scheduled.</p>';
    } else {
        eventsList.innerHTML = `
            <table class="print-table">
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Event</th>
                        <th>Type</th>
                        <th>Time</th>
                        <th>Venue</th>
                    </tr>
                </thead>
                <tbody>
                    ${cachedCalendarEvents.map(event => `
                        <tr>
                            <td>${formatEventDate(event.date)}</td>
                            <td>${escapeHtml(event.title)}</td>
                            <td>${event.type}</td>
                            <td>${event.startTime || 'All day'}${event.endTime ? ` - ${event.endTime}` : ''}</td>
                            <td>${event.venue || 'N/A'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }
    
    printContent.appendChild(eventsList);
    
    // Statistics
    const stats = document.createElement('div');
    stats.className = 'print-stats';
    stats.innerHTML = `
        <h4>Summary</h4>
        <p>Total Events: ${cachedCalendarEvents.length}</p>
        <p>Exams: ${cachedCalendarEvents.filter(e => e.type === 'Exam').length}</p>
        <p>Clinical: ${cachedCalendarEvents.filter(e => e.type === 'Clinical').length}</p>
        <p>Classes: ${cachedCalendarEvents.filter(e => e.type === 'Class').length}</p>
    `;
    
    printContent.appendChild(stats);
    
    // Open print window
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html>
            <head>
                <title>NCHSM Academic Calendar</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 20px; }
                    .print-header { text-align: center; margin-bottom: 30px; }
                    .print-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                    .print-table th, .print-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                    .print-table th { background-color: #f5f5f5; }
                    .print-stats { margin-top: 30px; padding: 15px; background-color: #f9f9f9; }
                    @media print {
                        body { padding: 0; }
                    }
                </style>
            </head>
            <body>
                ${printContent.innerHTML}
            </body>
        </html>
    `);
    
    printWindow.document.close();
    printWindow.focus();
    
    setTimeout(() => {
        printWindow.print();
        printWindow.close();
    }, 250);
}

// Export calendar to ICS
async function exportCalendar() {
    if (cachedCalendarEvents.length === 0) {
        AppUtils.showToast('No events to export', 'warning');
        return;
    }
    
    try {
        let icsContent = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//NCHSM//Academic Calendar//EN',
            'CALSCALE:GREGORIAN',
            'METHOD:PUBLISH'
        ];
        
        cachedCalendarEvents.forEach((event, index) => {
            const eventDate = new Date(event.date);
            const startDateTime = event.startTime ? 
                `${eventDate.toISOString().split('T')[0]}T${event.startTime.replace(':', '')}00` :
                `${eventDate.toISOString().split('T')[0]}T000000`;
            
            const endDateTime = event.endTime ? 
                `${eventDate.toISOString().split('T')[0]}T${event.endTime.replace(':', '')}00` :
                `${eventDate.toISOString().split('T')[0]}T235959`;
            
            icsContent.push(
                'BEGIN:VEVENT',
                `UID:${index}_${event.id}@nchsm.ac.ke`,
                `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
                `DTSTART:${startDateTime}`,
                `DTEND:${endDateTime}`,
                `SUMMARY:${event.title}`,
                `DESCRIPTION:${event.details}\\nType: ${event.type}\\nProgram: ${currentUserProfile?.program || 'N/A'}`,
                `LOCATION:${event.venue || 'NCHSM Campus'}`,
                `ORGANIZER:${event.organizer || 'NCHSM Administration'}`,
                `CATEGORIES:${event.type}`,
                `COLOR:${getEventColorHex(event.type)}`,
                'END:VEVENT'
            );
        });
        
        icsContent.push('END:VCALENDAR');
        
        const blob = new Blob([icsContent.join('\r\n')], { type: 'text/calendar' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `nchsm-calendar-${new Date().toISOString().split('T')[0]}.ics`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        AppUtils.showToast('Calendar exported successfully', 'success');
        
    } catch (error) {
        console.error('Error exporting calendar:', error);
        AppUtils.showToast('Failed to export calendar', 'error');
    }
}

// Utility functions
function formatEventDateTime(event) {
    const date = new Date(event.date);
    let dateStr = date.toLocaleString();
    
    if (event.startTime) {
        dateStr = `${date.toLocaleDateString()} ${event.startTime}`;
        if (event.endTime) {
            dateStr += ` - ${event.endTime}`;
        }
    }
    
    return dateStr;
}

function formatEventDate(dateString, short = false) {
    const date = new Date(dateString);
    
    if (short) {
        return date.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric' 
        });
    }
    
    return date.toLocaleDateString('en-US', { 
        weekday: 'short',
        month: 'short', 
        day: 'numeric',
        year: 'numeric'
    });
}

function getUpcomingEventsCount(events) {
    const now = new Date();
    return events.filter(event => new Date(event.date) > now).length;
}

function getEventColor(eventType) {
    const colors = {
        'Exam': '#EF4444',
        'Clinical': '#10B981',
        'Class': '#3B82F6',
        'Event': '#8B5CF6',
        'Holiday': '#F59E0B',
        'Meeting': '#0EA5E9',
        'Deadline': '#EC4899',
        'default': '#6B7280'
    };
    
    return colors[eventType] || colors.default;
}

function getEventColorHex(eventType) {
    return getEventColor(eventType).replace('#', '');
}

function getEventIcon(eventType) {
    const icons = {
        'Exam': 'fas fa-file-alt',
        'Clinical': 'fas fa-hospital',
        'Class': 'fas fa-chalkboard-teacher',
        'Event': 'fas fa-calendar-alt',
        'Holiday': 'fas fa-umbrella-beach',
        'Meeting': 'fas fa-users',
        'Deadline': 'fas fa-flag',
        'default': 'fas fa-calendar'
    };
    
    return icons[eventType] || icons.default;
}

function isSameDay(date1, date2) {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
}

function groupEventsByTime(events) {
    const groups = {
        'Morning (8:00 - 12:00)': [],
        'Afternoon (12:00 - 17:00)': [],
        'Evening (17:00 - 20:00)': []
    };
    
    events.forEach(event => {
        if (event.startTime) {
            const hour = parseInt(event.startTime.split(':')[0]);
            if (hour >= 8 && hour < 12) {
                groups['Morning (8:00 - 12:00)'].push(event);
            } else if (hour >= 12 && hour < 17) {
                groups['Afternoon (12:00 - 17:00)'].push(event);
            } else if (hour >= 17 && hour < 20) {
                groups['Evening (17:00 - 20:00)'].push(event);
            }
        } else {
            // All-day events go to morning
            groups['Morning (8:00 - 12:00)'].push(event);
        }
    });
    
    return groups;
}

// Utility to safely escape HTML
function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Show modal (reusable)
function showModal(title, content) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
        padding: 20px;
    `;
    
    modal.innerHTML = `
        <div style="background: white; padding: 20px; border-radius: 12px; max-width: 800px; width: 90%; max-height: 80vh; overflow-y: auto;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h3 style="margin: 0; color: #4C1D95;">${title}</h3>
                <button onclick="this.closest('.modal-overlay').remove()" style="background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #6B7280;">×</button>
            </div>
            <div>${content}</div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

function closeModal() {
    const modal = document.querySelector('.modal-overlay');
    if (modal) modal.remove();
}

// *************************************************************************
// *** GLOBAL EXPORTS ***
// *************************************************************************

// Make functions globally available
window.loadAcademicCalendar = loadAcademicCalendar;
window.switchCalendarView = switchCalendarView;
window.showEventDetails = showEventDetails;
window.showDayEvents = showDayEvents;
window.showExamsForDate = showExamsForDate;
window.viewExamDetails = viewExamDetails;
window.printCalendar = printCalendar;
window.exportCalendar = exportCalendar;
window.initializeCalendarSystem = initializeCalendarSystem;

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeCalendarSystem);
} else {
    initializeCalendarSystem();
}
