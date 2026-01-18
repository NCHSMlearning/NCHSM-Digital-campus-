// calendar.js - UPDATED FOR STATS IN HEADERS
// ============================================

let cachedCalendarEvents = [];
let isLoadingCalendar = false;
let eventsLastLoaded = null;

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
    // Setup filter dropdown
    const filter = document.getElementById('calendar-filter');
    if (filter) {
        filter.addEventListener('change', function() {
            console.log('🔍 Filter changed to:', this.value);
            filterCalendarEvents(this.value);
        });
    }
    
    // Setup refresh button
    const refreshBtn = document.getElementById('refresh-calendar');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', loadAcademicCalendar);
    }
    
    // Setup refresh from empty state
    const refreshEmptyBtn = document.getElementById('refresh-calendar-empty');
    if (refreshEmptyBtn) {
        refreshEmptyBtn.addEventListener('click', loadAcademicCalendar);
    }
    
    console.log('✅ Calendar event listeners setup complete');
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
        // Hide empty state, show loading
        const emptyState = document.getElementById('calendar-empty');
        const loadingState = document.getElementById('calendar-loading');
        const tableContainer = document.getElementById('calendar-table-container');
        
        if (emptyState) emptyState.style.display = 'none';
        if (loadingState) loadingState.style.display = 'flex';
        if (tableContainer) tableContainer.style.display = 'none';
        
        // Update Today's date
        updateTodayDate();
        
        // Show loading in table
        tableBody.innerHTML = `
            <tr>
                <td colspan="4" style="padding: 40px; text-align: center;">
                    <div style="display: inline-block; width: 40px; height: 40px; border: 3px solid #f3f4f6; border-top-color: #6d28d9; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                    <p style="margin-top: 10px; color: #6b7280;">Loading your academic calendar...</p>
                </td>
            </tr>
        `;
        
        // Fetch from database
        console.log('🔄 Fetching events from database...');
        const allEvents = await fetchEventsFromDatabase();
        console.log(`📊 Database returned: ${allEvents.length} total events`);
        
        // Remove duplicates and sort
        const uniqueEvents = removeDuplicateEvents(allEvents);
        console.log(`✨ ${uniqueEvents.length} unique events after deduplication`);
        
        // Sort by date
        uniqueEvents.sort((a, b) => new Date(a.date) - new Date(b.date));
        
        // Store with formatting
        cachedCalendarEvents = uniqueEvents.map(event => ({
            ...event,
            formattedDate: formatEventDate(event.date),
            formattedTime: formatEventTime(event.startTime, event.endTime),
            status: getEventStatus(event.date, event.startTime)
        }));
        
        // Update header stats (stats are IN the headers now)
        updateHeaderStats(cachedCalendarEvents);
        
        // Hide loading, show table container
        if (loadingState) loadingState.style.display = 'none';
        if (tableContainer) {
            tableContainer.style.display = 'block';
            console.log('✅ Table container shown');
        }
        
        // Apply initial filter
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
    
    // Calculate counts
    const totalEvents = events.length;
    const upcomingEvents = events.filter(e => new Date(e.date) >= now).length;
    const weekEvents = events.filter(e => {
        const eventDate = new Date(e.date);
        return eventDate >= now && eventDate <= oneWeekLater;
    }).length;
    const examEvents = events.filter(e => e.type.includes('EXAM') || e.type.includes('CAT')).length;
    
    // Update header stats
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
    
    // Hide empty and loading states
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
    
    // Update header stats for filtered events
    updateHeaderStats(filteredEvents);
    
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
        const isUpcoming = !isPast;
        
        html += `
            <tr class="calendar-event-row" data-id="${event.id}" ${isPast ? 'style="opacity: 0.8;"' : ''}>
                <!-- Column 1: Date & Time -->
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
                                ${event.venue}
                            </div>
                        ` : ''}
                    </div>
                </td>
                
                <!-- Column 2: Event Details -->
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
                                ${event.organizer}
                            </div>
                        ` : ''}
                        <div class="event-source">
                            <i class="fas fa-database"></i>
                            Source: ${event.source}
                            ${event.courseName ? ` • Course: ${event.courseName}` : ''}
                        </div>
                    </div>
                </td>
                
                <!-- Column 3: Type -->
                <td class="type-col">
                    <span class="event-type-badge" style="background-color: ${event.color}15; color: ${event.color}; border-color: ${event.color}30;">
                        <i class="${event.icon}"></i>
                        ${event.type}
                    </span>
                </td>
                
                <!-- Column 4: Status -->
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
    
    // Add click handlers
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

// ========== DATABASE FUNCTIONS ==========
async function fetchEventsFromDatabase() {
    const events = [];
    const supabase = window.db?.supabase || window.supabase;
    
    if (!supabase) {
        throw new Error('No database connection available');
    }
    
    // Get user info
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
                    course: exam.course_name,
                    status: exam.status,
                    duration: exam.duration_minutes
                });
            });
        }
    } catch (error) {
        console.error('exams_with_courses error:', error.message);
    }
    
    // ===== 3. Fetch clinical_names =====
    try {
        console.log('🏥 Fetching clinical_names...');
        const { data: clinicalData, error } = await supabase
            .from('clinical_names')
            .select('*')
            .eq('program', userProgram)
            .eq('intake_year', userIntakeYear)
            .eq('block_term', userBlock);
        
        if (error) throw error;
        
        if (clinicalData && clinicalData.length > 0) {
            console.log(`✅ Found ${clinicalData.length} clinical rotations`);
            
            // Create clinical events for next 14 days
            const today = new Date();
            for (let i = 0; i < 14; i++) {
                const date = new Date(today);
                date.setDate(today.getDate() + i);
                
                // Skip weekends
                if (date.getDay() === 0 || date.getDay() === 6) continue;
                
                clinicalData.forEach(clinical => {
                    events.push({
                        id: `clinical_${clinical.id}_${i}`,
                        date: date.toISOString().split('T')[0],
                        title: `Clinical: ${clinical.clinical_area_name}`,
                        type: 'Clinical',
                        details: `Clinical rotation in ${clinical.clinical_area_name}`,
                        venue: clinical.clinical_area_name,
                        startTime: '08:00:00',
                        endTime: '17:00:00',
                        organizer: 'Clinical Department',
                        color: '#10B981',
                        icon: 'fas fa-hospital',
                        source: 'clinical_names',
                        program: clinical.program,
                        block: clinical.block_term,
                        clinicalArea: clinical.clinical_area_name
                    });
                });
            }
        }
    } catch (error) {
        console.error('clinical_names error:', error.message);
    }
    
    // ===== 4. Create class events from courses =====
    try {
        console.log('📚 Creating class events from courses...');
        const { data: coursesData, error } = await supabase
            .from('courses')
            .select('*')
            .or(`target_program.eq.${userProgram},target_program.is.null`)
            .or(`block.eq.${userBlock},block.is.null`)
            .limit(10);
        
        if (error) throw error;
        
        if (coursesData && coursesData.length > 0) {
            console.log(`✅ Found ${coursesData.length} courses for class schedule`);
            
            // Create class events for next 7 days
            const today = new Date();
            for (let i = 0; i < 7; i++) {
                const date = new Date(today);
                date.setDate(today.getDate() + i);
                
                // Skip weekends
                if (date.getDay() === 0 || date.getDay() === 6) continue;
                
                coursesData.forEach(course => {
                    events.push({
                        id: `course_${course.id}_${i}`,
                        date: date.toISOString().split('T')[0],
                        title: `${course.course_name || course.name || 'Course'} Class`,
                        type: 'Class',
                        details: course.description || `${course.code || course.unit_code || ''}`,
                        venue: 'Lecture Hall',
                        startTime: '09:00:00',
                        endTime: '12:00:00',
                        organizer: 'Lecturer',
                        color: '#3B82F6',
                        icon: 'fas fa-chalkboard-teacher',
                        source: 'courses',
                        program: course.target_program || userProgram,
                        block: course.block || userBlock,
                        courseName: course.course_name || course.name,
                        courseCode: course.code || course.unit_code
                    });
                });
            }
        }
    } catch (error) {
        console.error('courses error:', error.message);
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
        emptyState.querySelector('h3').textContent = message;
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
                    <button onclick="loadAcademicCalendar()" 
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

console.log('📅 calendar.js loaded - UPDATED FOR STATS IN HEADERS');
