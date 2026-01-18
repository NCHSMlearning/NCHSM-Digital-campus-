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
    
    // Setup filter dropdown
    setupCalendarFilter();
    
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
    const todayElement = document.getElementById('calendar-today');
    if (!todayElement) {
        console.log('⚠️ calendar-today element not found');
        return;
    }
    
    const today = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    todayElement.textContent = today.toLocaleDateString('en-US', options);
    console.log('✅ Today date updated:', todayElement.textContent);
}

function setupCalendarFilter() {
    const filter = document.getElementById('calendar-filter');
    if (!filter) {
        console.log('⚠️ calendar-filter element not found');
        return;
    }
    
    // Remove any existing listeners
    const newFilter = filter.cloneNode(true);
    filter.parentNode.replaceChild(newFilter, filter);
    
    // Add new listener
    newFilter.addEventListener('change', function() {
        console.log('🔍 Filter changed to:', this.value);
        filterCalendarEvents(this.value);
    });
    
    console.log('✅ Calendar filter setup complete');
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
        // Show loading state
        showLoadingState(tableBody);
        
        // Show table container
        const container = document.getElementById('calendar-table-container');
        if (container) {
            container.style.display = 'block';
        }
        
        // Update Today's date
        updateTodayDate();
        
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
            formattedTime: formatEventTime(event.startTime, event.endTime)
        }));
        
        // Apply initial filter
        const filter = document.getElementById('calendar-filter');
        const filterType = filter ? filter.value : 'all';
        filterCalendarEvents(filterType);
        
        // Update dashboard
        updateDashboardWithEvents(cachedCalendarEvents);
        
        console.log(`✅ Calendar loaded successfully: ${uniqueEvents.length} events`);
        
    } catch (error) {
        console.error('❌ Calendar error:', error);
        showErrorInTable('Failed to load calendar: ' + error.message);
    } finally {
        isLoadingCalendar = false;
    }
}

// ========== FILTER FUNCTION ==========
function filterCalendarEvents(filterType) {
    const tableBody = document.getElementById('calendar-table');
    if (!tableBody || cachedCalendarEvents.length === 0) return;
    
    console.log(`🔍 Filtering events: ${filterType}`);
    
    let filteredEvents;
    if (filterType === 'all') {
        filteredEvents = cachedCalendarEvents;
    } else if (filterType === 'exam') {
        filteredEvents = cachedCalendarEvents.filter(e => 
            e.type === 'Exam' || e.type === 'CAT_1' || e.type === 'EXAM' || e.type === 'CAT'
        );
    } else if (filterType === 'clinical') {
        filteredEvents = cachedCalendarEvents.filter(e => e.type === 'Clinical');
    } else if (filterType === 'class') {
        filteredEvents = cachedCalendarEvents.filter(e => e.type === 'Class');
    } else if (filterType === 'event') {
        filteredEvents = cachedCalendarEvents.filter(e => e.type === 'Event');
    } else {
        filteredEvents = cachedCalendarEvents.filter(e => e.type === filterType);
    }
    
    console.log(`📋 Showing ${filteredEvents.length} events for filter: ${filterType}`);
    
    if (filteredEvents.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="3" style="padding: 40px; text-align: center; color: #6b7280;">
                    <i class="fas fa-filter" style="font-size: 2rem; margin-bottom: 10px;"></i>
                    <p>No ${filterType === 'all' ? '' : filterType + ' '}events found</p>
                    <button onclick="loadAcademicCalendar()" 
                            style="margin-top: 15px; padding: 8px 16px; background: #f3f4f6; color: #6b7280; border: 1px solid #d1d5db; border-radius: 6px; cursor: pointer;">
                        Refresh Calendar
                    </button>
                </td>
            </tr>
        `;
    } else {
        renderCalendarTable(filteredEvents, tableBody);
    }
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
    
    // ===== 2. Fetch from exams_with_courses (PRIMARY) =====
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
                
                // Convert duration_minutes to end time
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
                    duration: exam.duration_minutes,
                    originalId: exam.id
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
            
            // Create clinical events for next 14 days only (not 30)
            const today = new Date();
            for (let i = 0; i < 14; i++) {
                const date = new Date(today);
                date.setDate(today.getDate() + i);
                
                // Skip weekends
                if (date.getDay() === 0 || date.getDay() === 6) continue;
                
                // For each clinical area, create a daily event
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
                        intakeYear: clinical.intake_year,
                        latitude: clinical.latitude,
                        longitude: clinical.longitude,
                        clinicalArea: clinical.clinical_area_name
                    });
                });
            }
        }
    } catch (error) {
        console.error('clinical_names error:', error.message);
    }
    
    // ===== 4. Create SMART class events from courses =====
    try {
        console.log('📚 Creating SMART class events...');
        const { data: coursesData, error } = await supabase
            .from('courses')
            .select('*')
            .or(`target_program.eq.${userProgram},target_program.is.null`)
            .or(`block.eq.${userBlock},block.is.null`)
            .limit(10);
        
        if (error) throw error;
        
        if (coursesData && coursesData.length > 0) {
            console.log(`✅ Found ${coursesData.length} courses for class schedule`);
            
            // Create class events for next 5 days only (not 14)
            const today = new Date();
            for (let i = 0; i < 5; i++) {
                const date = new Date(today);
                date.setDate(today.getDate() + i);
                
                // Skip weekends
                if (date.getDay() === 0 || date.getDay() === 6) continue;
                
                // For each course, create ONE class per day
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
                        courseCode: course.code || course.unit_code,
                        description: course.description
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
        // Create a unique key based on date, title, type, and startTime
        const key = `${event.date}_${event.title}_${event.type}_${event.startTime}`;
        
        // Keep the first occurrence (from exams_with_courses if possible)
        if (!uniqueMap.has(key)) {
            uniqueMap.set(key, event);
        } else {
            // Prefer exams_with_courses over exams table
            const existing = uniqueMap.get(key);
            if (existing.source === 'exams' && event.source === 'exams_with_courses') {
                uniqueMap.set(key, event);
            }
        }
    });
    
    return Array.from(uniqueMap.values());
}

function showLoadingState(tableBody) {
    tableBody.innerHTML = `
        <tr>
            <td colspan="3" style="padding: 40px; text-align: center;">
                <div style="display: inline-block; width: 40px; height: 40px; border: 3px solid #f3f4f6; border-top-color: #6d28d9; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                <p style="margin-top: 10px; color: #6b7280; font-size: 0.9rem;">
                    Loading academic calendar...
                </p>
                <p style="margin-top: 5px; color: #9ca3af; font-size: 0.8rem;">
                    Fetching from: calendar_events, exams_with_courses, clinical_names, courses
                </p>
            </td>
        </tr>
    `;
}

// ========== RENDER FUNCTION ==========
function renderCalendarTable(events, tableBody) {
    if (!tableBody) return;
    
    console.log(`🎨 Rendering ${events.length} events...`);
    
    if (events.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="3" style="padding: 40px; text-align: center; color: #6b7280;">
                    <i class="fas fa-calendar-times" style="font-size: 2rem; margin-bottom: 10px;"></i>
                    <p>No events found</p>
                    <div style="margin-top: 15px; font-size: 0.9rem; color: #9ca3af;">
                        <p>Try changing the filter or refreshing</p>
                    </div>
                    <button onclick="loadAcademicCalendar()" 
                            style="margin-top: 15px; padding: 8px 16px; background: #6d28d9; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 0.9rem;">
                        <i class="fas fa-sync-alt"></i> Refresh Calendar
                    </button>
                </td>
            </tr>
        `;
        return;
    }
    
    let html = '';
    const today = new Date().toISOString().split('T')[0];
    
    events.forEach(event => {
        const isToday = event.date === today;
        const isPast = new Date(event.date) < new Date(today);
        
        html += `
            <tr class="calendar-event-row" data-id="${event.id}" style="${isPast ? 'opacity: 0.7;' : ''}">
                <td class="date-col">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <div style="width: 40px; height: 40px; border-radius: 8px; background: ${event.color}20; display: flex; align-items: center; justify-content: center;">
                            <i class="${event.icon}" style="color: ${event.color}; font-size: 1.2rem;"></i>
                        </div>
                        <div>
                            <div style="font-weight: 600; color: ${isToday ? '#6d28d9' : '#1f2937'}; font-size: 1rem;">
                                ${event.formattedDate}
                                ${isToday ? '<span style="font-size: 0.7rem; color: #6d28d9; margin-left: 5px;">(TODAY)</span>' : ''}
                            </div>
                            <div style="font-size: 0.85rem; color: #6b7280;">${event.formattedTime}</div>
                            ${event.venue ? `<div style="font-size: 0.8rem; color: #9ca3af; margin-top: 2px;"><i class="fas fa-map-marker-alt"></i> ${event.venue}</div>` : ''}
                        </div>
                    </div>
                </td>
                <td>
                    <div>
                        <div style="font-weight: 700; color: #1f2937; margin-bottom: 6px; font-size: 1.1rem; display: flex; align-items: center; gap: 8px;">
                            ${escapeHtml(event.title)}
                            <span style="font-size: 0.7rem; padding: 2px 6px; background: #f3f4f6; color: #6b7280; border-radius: 4px;">
                                ${event.program && event.program !== 'General' ? event.program : 'All'}
                            </span>
                        </div>
                        <div style="color: #4b5563; margin-bottom: 8px; font-size: 0.95rem; line-height: 1.4;">
                            ${escapeHtml(event.details || 'No details provided')}
                        </div>
                        ${event.organizer ? `<div style="font-size: 0.85rem; color: #6b7280;"><i class="fas fa-user"></i> ${event.organizer}</div>` : ''}
                        <div style="font-size: 0.7rem; color: #9ca3af; margin-top: 4px;">
                            <i class="fas fa-database"></i> ${event.source}
                            ${event.courseName ? ` • <i class="fas fa-book"></i> ${event.courseName}` : ''}
                        </div>
                    </div>
                </td>
                <td class="session-type-col">
                    <span style="display: inline-block; padding: 6px 14px; background: ${event.color}15; color: ${event.color}; border-radius: 12px; font-size: 0.85rem; font-weight: 600; border: 1px solid ${event.color}30;">
                        ${event.type}
                    </span>
                    ${isPast ? '<div style="font-size: 0.7rem; color: #9ca3af; margin-top: 4px;">Completed</div>' : ''}
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

function showErrorInTable(message) {
    const tableBody = document.getElementById('calendar-table');
    if (!tableBody) return;
    
    tableBody.innerHTML = `
        <tr>
            <td colspan="3" style="padding: 40px; text-align: center; color: #ef4444;">
                <i class="fas fa-exclamation-triangle" style="font-size: 2rem; margin-bottom: 10px;"></i>
                <p style="font-weight: 600;">Database Error</p>
                <p style="margin: 10px 0; font-size: 0.9rem;">${message}</p>
                <button onclick="loadAcademicCalendar()" 
                        style="margin-top: 15px; padding: 8px 16px; background: #ef4444; color: white; border: none; border-radius: 6px; cursor: pointer;">
                    Retry Connection
                </button>
            </td>
        </tr>
    `;
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

// ========== CSS STYLES ==========
if (!document.querySelector('#calendar-css')) {
    const style = document.createElement('style');
    style.id = 'calendar-css';
    style.textContent = `
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        
        .calendar-event-row {
            cursor: pointer;
            transition: all 0.2s;
        }
        
        .calendar-event-row:hover {
            background-color: #f9fafb;
            transform: translateY(-1px);
            box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        }
        
        .date-col {
            min-width: 180px;
        }
        
        .session-type-col {
            white-space: nowrap;
        }
    `;
    document.head.appendChild(style);
}

console.log('📅 calendar.js loaded - ALL ISSUES FIXED ✅');
