// calendar.js - DATABASE ONLY VERSION
// ============================================

let cachedCalendarEvents = [];
let isLoadingCalendar = false;

// ========== INITIALIZATION ==========
document.addEventListener('DOMContentLoaded', function() {
    console.log('📅 Calendar: Initializing database-only version...');
    
    const calendarTab = document.querySelector('a[data-tab="calendar"]');
    if (calendarTab) {
        calendarTab.addEventListener('click', function(e) {
            e.preventDefault();
            if (!isLoadingCalendar) {
                loadAcademicCalendar();
            }
        });
    }
    
    const calendarFilter = document.getElementById('calendar-filter');
    if (calendarFilter) {
        calendarFilter.addEventListener('change', loadAcademicCalendar);
    }
    
    if (window.location.hash === '#calendar') {
        setTimeout(loadAcademicCalendar, 500);
    }
});

// ========== MAIN LOAD FUNCTION ==========
async function loadAcademicCalendar() {
    if (isLoadingCalendar) return;
    
    const tableBody = document.getElementById('calendar-table');
    if (!tableBody) return;
    
    isLoadingCalendar = true;
    
    try {
        // Show loading
        tableBody.innerHTML = `
            <tr>
                <td colspan="3" style="padding: 40px; text-align: center;">
                    <div style="display: inline-block; width: 40px; height: 40px; border: 3px solid #f3f4f6; border-top-color: #6d28d9; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                    <p style="margin-top: 10px; color: #6b7280;">Fetching events from database...</p>
                </td>
            </tr>
        `;
        
        // Show table container
        const container = document.getElementById('calendar-table-container');
        if (container) container.style.display = 'block';
        
        // Fetch from actual database
        console.log('🔄 Fetching from database...');
        const allEvents = await fetchEventsFromDatabase();
        console.log(`📊 Database returned: ${allEvents.length} events`);
        
        // Apply filter
        const filter = document.getElementById('calendar-filter');
        const filterType = filter ? filter.value : 'all';
        const filteredEvents = allEvents
            .filter(e => filterType === 'all' || e.type === filterType)
            .sort((a, b) => new Date(a.date) - new Date(b.date));
        
        // Store with formatting
        cachedCalendarEvents = filteredEvents.map(event => ({
            ...event,
            formattedDate: formatEventDate(event.date),
            formattedTime: formatEventTime(event.startTime, event.endTime)
        }));
        
        // Hide empty/loading states
        const emptyState = document.getElementById('calendar-empty');
        if (emptyState) emptyState.style.display = 'none';
        const loadingState = document.getElementById('calendar-loading');
        if (loadingState) loadingState.style.display = 'none';
        
        // Render table
        renderCalendarTable(cachedCalendarEvents, tableBody);
        
        // Update dashboard
        updateDashboardWithEvents(cachedCalendarEvents);
        
        console.log(`✅ Calendar loaded: ${filteredEvents.length} events`);
        
    } catch (error) {
        console.error('❌ Calendar error:', error);
        showErrorInTable('Failed to load from database: ' + error.message);
    } finally {
        isLoadingCalendar = false;
    }
}

// ========== DATABASE FETCH ==========
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
    
    console.log(`👤 User: ${userProgram} - Block ${userBlock}`);
    
    // ===== 1. Fetch from calendar_events =====
    try {
        console.log('📋 Fetching calendar_events...');
        const { data: calendarEvents, error } = await supabase
            .from('calendar_events')
            .select('*')
            .or(`target_program.eq.${userProgram},target_program.eq.General`)
            .or(`target_block.eq.${userBlock},target_block.is.null`)
            .order('event_date', { ascending: true });
        
        if (error) {
            console.error('calendar_events error:', error);
        } else if (calendarEvents && calendarEvents.length > 0) {
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
        console.error('calendar_events fetch failed:', error);
    }
    
    // ===== 2. Fetch from exams_with_courses =====
    try {
        console.log('📝 Fetching exams_with_courses...');
        const { data: examsData, error } = await supabase
            .from('exams_with_courses')
            .select('*')
            .or(`program.eq.${userProgram},program.eq.General`)
            .or(`block.eq.${userBlock},block.is.null`)
            .order('exam_date', { ascending: true });
        
        if (error) {
            console.error('exams_with_courses error:', error);
        } else if (examsData && examsData.length > 0) {
            console.log(`✅ Found ${examsData.length} exams`);
            
            examsData.forEach(exam => {
                events.push({
                    id: `exam_${exam.id}`,
                    date: exam.exam_date,
                    title: `${exam.exam_name} - ${exam.course_name || ''}`,
                    type: 'Exam',
                    details: `${exam.program} - ${exam.description || ''}`,
                    venue: exam.venue || 'Examination Hall',
                    startTime: exam.start_time || '09:00',
                    endTime: exam.end_time || '12:00',
                    organizer: 'Examinations Department',
                    color: '#EF4444',
                    icon: 'fas fa-file-alt',
                    source: 'exams_with_courses',
                    program: exam.program || 'General',
                    block: exam.block || 'All',
                    course: exam.course_name
                });
            });
        }
    } catch (error) {
        console.error('exams_with_courses fetch failed:', error);
    }
    
    // ===== 3. Fetch from other tables if they exist =====
    const otherTables = [
        'clinical_sessions',
        'class_sessions',
        'academic_schedule'
    ];
    
    for (const tableName of otherTables) {
        try {
            const { data, error } = await supabase
                .from(tableName)
                .select('*')
                .limit(20);
            
            if (!error && data && data.length > 0) {
                console.log(`📁 Found ${data.length} events in ${tableName}`);
                
                data.forEach(item => {
                    const eventDate = item.date || item.session_date || item.event_date;
                    if (eventDate) {
                        events.push({
                            id: `${tableName}_${item.id}`,
                            date: eventDate,
                            title: item.course_name || item.department || tableName,
                            type: getEventTypeFromTable(tableName),
                            details: item.description || '',
                            venue: item.venue || item.hospital || 'Campus',
                            startTime: item.start_time || '08:00',
                            endTime: item.end_time || '17:00',
                            organizer: item.organizer || item.supervisor || 'Department',
                            color: getEventColor(getEventTypeFromTable(tableName)),
                            icon: getEventIcon(getEventTypeFromTable(tableName)),
                            source: tableName,
                            program: item.program || userProgram,
                            block: item.block || userBlock
                        });
                    }
                });
            }
        } catch (err) {
            // Table doesn't exist - skip
        }
    }
    
    if (events.length === 0) {
        console.log('⚠️ Database returned NO events');
        throw new Error('No events found in database');
    }
    
    return events;
}

// ========== RENDER FUNCTIONS ==========
function renderCalendarTable(events, tableBody) {
    if (!tableBody) return;
    
    console.log(`🎨 Rendering ${events.length} events...`);
    
    if (events.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="3" style="padding: 40px; text-align: center; color: #6b7280;">
                    <i class="fas fa-database" style="font-size: 2rem; margin-bottom: 10px;"></i>
                    <p>No events found in database</p>
                    <button onclick="loadAcademicCalendar()" style="margin-top: 15px; padding: 8px 16px; background: #6d28d9; color: white; border: none; border-radius: 6px; cursor: pointer;">
                        Refresh Database
                    </button>
                </td>
            </tr>
        `;
        return;
    }
    
    let html = '';
    events.forEach(event => {
        html += `
            <tr class="calendar-event-row" data-id="${event.id}">
                <td class="date-col">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <div style="width: 40px; height: 40px; border-radius: 8px; background: ${event.color}20; display: flex; align-items: center; justify-content: center;">
                            <i class="${event.icon}" style="color: ${event.color}; font-size: 1.2rem;"></i>
                        </div>
                        <div>
                            <div style="font-weight: 600; color: #1f2937; font-size: 1rem;">${event.formattedDate}</div>
                            <div style="font-size: 0.85rem; color: #6b7280;">${event.formattedTime}</div>
                            ${event.venue ? `<div style="font-size: 0.8rem; color: #9ca3af; margin-top: 2px;"><i class="fas fa-map-marker-alt"></i> ${event.venue}</div>` : ''}
                        </div>
                    </div>
                </td>
                <td>
                    <div>
                        <div style="font-weight: 700; color: #1f2937; margin-bottom: 6px; font-size: 1.1rem;">
                            ${escapeHtml(event.title)}
                            ${event.program && event.program !== 'General' ? 
                                `<span style="font-size: 0.7rem; padding: 2px 6px; background: #f3f4f6; color: #6b7280; border-radius: 4px; margin-left: 6px;">
                                    ${event.program}
                                </span>` : ''}
                        </div>
                        <div style="color: #4b5563; margin-bottom: 8px; font-size: 0.95rem; line-height: 1.4;">${escapeHtml(event.details)}</div>
                        ${event.organizer ? `<div style="font-size: 0.85rem; color: #6b7280;"><i class="fas fa-user"></i> ${event.organizer}</div>` : ''}
                        <div style="font-size: 0.7rem; color: #9ca3af; margin-top: 4px;">
                            Source: ${event.source}
                            ${event.course ? ` • Course: ${event.course}` : ''}
                        </div>
                    </div>
                </td>
                <td class="session-type-col">
                    <span style="display: inline-block; padding: 6px 14px; background: ${event.color}15; color: ${event.color}; border-radius: 12px; font-size: 0.85rem; font-weight: 600; border: 1px solid ${event.color}30;">
                        ${event.type}
                    </span>
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

function showEventDetails(event) {
    const modal = document.createElement('div');
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
        z-index: 10000;
        padding: 20px;
    `;
    
    modal.innerHTML = `
        <div style="background: white; padding: 24px; border-radius: 16px; max-width: 500px; width: 100%; box-shadow: 0 20px 60px rgba(0,0,0,0.3);">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px;">
                <div style="display: flex; align-items: center; gap: 12px;">
                    <div style="width: 50px; height: 50px; border-radius: 12px; background: ${event.color}20; display: flex; align-items: center; justify-content: center;">
                        <i class="${event.icon}" style="color: ${event.color}; font-size: 1.5rem;"></i>
                    </div>
                    <div>
                        <h3 style="margin: 0 0 4px 0; color: #1f2937; font-size: 1.3rem;">${escapeHtml(event.title)}</h3>
                        <div style="color: ${event.color}; font-weight: 600; font-size: 0.9rem;">
                            ${event.type}
                            ${event.program && event.program !== 'General' ? ` • ${event.program}` : ''}
                        </div>
                    </div>
                </div>
                <button onclick="this.closest('div[style*=\"position: fixed\"]').remove()" 
                        style="background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #6B7280; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: 50%;">
                    ×
                </button>
            </div>
            
            <div style="margin-bottom: 20px;">
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px; color: #4b5563;">
                    <i class="fas fa-calendar" style="color: #6d28d9;"></i>
                    <span>${event.formattedDate} • ${event.formattedTime}</span>
                </div>
                
                ${event.venue ? `
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px; color: #4b5563;">
                        <i class="fas fa-map-marker-alt" style="color: #10B981;"></i>
                        <span>${event.venue}</span>
                    </div>
                ` : ''}
                
                ${event.organizer ? `
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 20px; color: #4b5563;">
                        <i class="fas fa-user" style="color: #3B82F6;"></i>
                        <span>${event.organizer}</span>
                    </div>
                ` : ''}
            </div>
            
            <div style="background: #f9fafb; padding: 16px; border-radius: 12px; margin-bottom: 24px;">
                <h4 style="margin: 0 0 8px 0; color: #1f2937; font-size: 1rem;">Details</h4>
                <p style="margin: 0; color: #4b5563; line-height: 1.5;">${escapeHtml(event.details)}</p>
            </div>
            
            <div style="font-size: 0.8rem; color: #9ca3af; padding: 10px; background: #f3f4f6; border-radius: 8px;">
                <div>Source: ${event.source}</div>
                ${event.course ? `<div>Course: ${event.course}</div>` : ''}
                ${event.block && event.block !== 'All' ? `<div>Block: ${event.block}</div>` : ''}
            </div>
            
            ${event.type === 'Exam' ? `
                <button onclick="viewExamDetails('${event.id}')" 
                        style="width: 100%; padding: 12px; background: linear-gradient(135deg, #6d28d9, #9333ea); color: white; border: none; border-radius: 12px; font-weight: 600; cursor: pointer; margin-top: 16px;">
                    <i class="fas fa-file-alt"></i> View Exam Details
                </button>
            ` : ''}
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Close handlers
    const closeModal = () => modal.remove();
    modal.querySelector('button').addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeModal();
    });
}

function viewExamDetails(eventId) {
    const modal = document.querySelector('div[style*="position: fixed"]');
    if (modal) modal.remove();
    
    if (typeof window.showTab === 'function') {
        window.showTab('cats');
        
        setTimeout(() => {
            const examId = eventId.replace('exam_', '');
            if (typeof viewProvisionalTranscript === 'function') {
                viewProvisionalTranscript(examId);
            }
        }, 500);
    }
}

// ========== DASHBOARD UPDATES ==========
function updateDashboardWithEvents(events) {
    // Update upcoming exam
    const upcomingExams = events.filter(e => e.type === 'Exam')
        .filter(e => new Date(e.date) > new Date())
        .sort((a, b) => new Date(a.date) - new Date(b.date));
    
    const examElement = document.getElementById('dashboard-upcoming-exam');
    if (examElement) {
        if (upcomingExams.length > 0) {
            const nextExam = upcomingExams[0];
            examElement.innerHTML = `
                <span style="color: #EF4444; font-weight: 600; font-size: 1.1rem;">${nextExam.title}</span>
                <div style="font-size: 0.9rem; color: #6b7280; margin-top: 4px;">
                    ${nextExam.formattedDate} • ${nextExam.formattedTime}
                </div>
            `;
            examElement.style.cursor = 'pointer';
            examElement.onclick = () => showEventDetails(nextExam);
        } else {
            examElement.innerHTML = '<span style="color: #10B981; font-weight: 600;">No upcoming exams</span>';
            examElement.style.cursor = 'default';
            examElement.onclick = null;
        }
    }
    
    // Update active courses count
    const activeCourses = events.filter(e => e.type === 'Class');
    const uniqueCourses = [...new Set(activeCourses.map(e => e.title))];
    const coursesElement = document.getElementById('dashboard-active-courses');
    if (coursesElement) {
        coursesElement.textContent = uniqueCourses.length;
    }
}

// ========== UTILITY FUNCTIONS ==========
function getEventTypeFromTable(tableName) {
    const typeMap = {
        'clinical_sessions': 'Clinical',
        'class_sessions': 'Class',
        'exams_with_courses': 'Exam',
        'academic_schedule': 'Academic',
        'calendar_events': 'Event'
    };
    return typeMap[tableName] || 'Event';
}

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
    const colors = {
        'Exam': '#EF4444',
        'Clinical': '#10B981',
        'Class': '#3B82F6',
        'Event': '#8B5CF6',
        'Academic': '#F59E0B',
        'default': '#6B7280'
    };
    return colors[eventType] || colors.default;
}

function getEventIcon(eventType) {
    const icons = {
        'Exam': 'fas fa-file-alt',
        'Clinical': 'fas fa-hospital',
        'Class': 'fas fa-chalkboard-teacher',
        'Event': 'fas fa-calendar-alt',
        'Academic': 'fas fa-graduation-cap',
        'default': 'fas fa-calendar'
    };
    return icons[eventType] || icons.default;
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
                        style="margin-top: 15px; padding: 8px 16px; background: #6d28d9; color: white; border: none; border-radius: 6px; cursor: pointer;">
                    Retry Database Connection
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

// ========== GLOBAL EXPORTS ==========
window.loadAcademicCalendar = loadAcademicCalendar;
window.showEventDetails = showEventDetails;
window.viewExamDetails = viewExamDetails;

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
            transition: background-color 0.2s;
        }
        
        .calendar-event-row:hover {
            background-color: #f9fafb;
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

console.log('📅 calendar.js loaded - DATABASE ONLY VERSION');
