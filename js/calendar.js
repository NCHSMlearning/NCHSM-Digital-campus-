let cachedCalendarEvents = [];
let isLoadingCalendar = false;

// Initialize calendar system - AUTO-INITIALIZE
document.addEventListener('DOMContentLoaded', function() {
    console.log('📅 Initializing Academic Calendar System...');
    
    // Set up calendar tab click
    const calendarTab = document.querySelector('a[data-tab="calendar"]');
    if (calendarTab) {
        calendarTab.addEventListener('click', function(e) {
            e.preventDefault();
            if (window.currentUserId && !isLoadingCalendar) {
                loadAcademicCalendar();
            }
        });
    }
    
    // Set up calendar filter
    const calendarFilter = document.getElementById('calendar-filter');
    if (calendarFilter) {
        calendarFilter.addEventListener('change', loadAcademicCalendar);
    }
    
    // Set up refresh button if exists
    const refreshBtn = document.getElementById('refresh-calendar');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', loadAcademicCalendar);
    }
    
    console.log('✅ Calendar System initialized');
});

// Load academic calendar - SIMPLIFIED VERSION
async function loadAcademicCalendar() {
    if (isLoadingCalendar) return;
    
    const tableBody = document.getElementById('calendar-table');
    if (!tableBody) return;
    
    isLoadingCalendar = true;
    
    try {
        // Clear table and show loading
        tableBody.innerHTML = `
            <tr class="loading-row">
                <td colspan="3">
                    <div style="text-align: center; padding: 40px;">
                        <div style="display: inline-block; width: 40px; height: 40px; border: 3px solid #f3f4f6; border-top-color: #6d28d9; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                        <p style="margin-top: 10px; color: #6b7280;">Loading academic schedule...</p>
                    </div>
                </td>
            </tr>
        `;
        
        // Get user data - FIXED: Use multiple fallbacks
        let userProfile = window.db?.currentUserProfile || 
                         window.currentUserProfile || 
                         { full_name: 'Student', program: 'Nursing', block: 'A', intake_year: new Date().getFullYear() };
        
        let userId = window.db?.currentUserId || window.currentUserId;
        
        // Try to get Supabase client
        let supabaseClient = window.db?.supabase || window.supabase;
        
        console.log('📅 Loading calendar for:', {
            name: userProfile.full_name,
            program: userProfile.program,
            block: userProfile.block,
            intakeYear: userProfile.intake_year
        });
        
        // Fetch events
        const allEvents = await fetchScheduleData(userProfile, supabaseClient);
        const filterType = document.getElementById('calendar-filter')?.value || 'all';
        
        // Filter events
        const filteredEvents = allEvents
            .filter(e => filterType === 'all' || e.type === filterType)
            .sort((a, b) => new Date(a.date) - new Date(b.date));
        
        cachedCalendarEvents = filteredEvents;
        
        // Render table
        renderCalendarTable(filteredEvents, filterType);
        
        // Update dashboard if function exists
        if (typeof updateDashboardCalendarEvents === 'function') {
            updateDashboardCalendarEvents(filteredEvents);
        }
        
    } catch (error) {
        console.error("❌ Failed to load academic calendar:", error);
        tableBody.innerHTML = `
            <tr class="error-row">
                <td colspan="3">
                    <div style="text-align: center; padding: 40px; color: #ef4444;">
                        <i class="fas fa-exclamation-triangle" style="font-size: 2rem; margin-bottom: 10px;"></i>
                        <p>Error loading calendar: ${error.message}</p>
                        <button onclick="loadAcademicCalendar()" style="margin-top: 15px; padding: 8px 16px; background: #6d28d9; color: white; border: none; border-radius: 6px; cursor: pointer;">
                            Retry
                        </button>
                    </div>
                </td>
            </tr>
        `;
    } finally {
        isLoadingCalendar = false;
    }
}

// Fetch schedule data - SIMPLIFIED
async function fetchScheduleData(userProfile, supabaseClient) {
    const events = [];
    
    // If no Supabase client, use mock data for demo
    if (!supabaseClient || typeof supabaseClient.from !== 'function') {
        console.log('⚠️ No Supabase client, using demo data');
        return getDemoCalendarEvents(userProfile);
    }
    
    try {
        const program = userProfile?.program || 'Nursing';
        const block = userProfile?.block || 'A';
        const intakeYear = userProfile?.intake_year || new Date().getFullYear();
        
        console.log('🔍 Querying calendar_events for:', { program, block, intakeYear });
        
        // 1. Fetch from calendar_events table
        const { data: calendarEvents, error: eventsError } = await supabaseClient
            .from('calendar_events')
            .select('event_name, event_date, type, description, target_program, target_block, target_intake_year, venue, start_time, end_time, organizer')
            .or(`target_program.eq.${program},target_program.eq.General`)
            .or(`target_block.eq.${block},target_block.is.null`)
            .eq('target_intake_year', intakeYear)
            .order('event_date', { ascending: true });
        
        if (eventsError) {
            console.error('Error fetching calendar events:', eventsError);
            // Fall back to demo data
            return getDemoCalendarEvents(userProfile);
        }
        
        // Format calendar events
        if (calendarEvents && calendarEvents.length > 0) {
            calendarEvents.forEach(event => {
                events.push({
                    id: `event_${event.event_date}_${event.event_name}`,
                    date: event.event_date,
                    title: event.event_name,
                    type: event.type || 'Event',
                    details: event.description,
                    venue: event.venue,
                    startTime: event.start_time,
                    endTime: event.end_time,
                    organizer: event.organizer,
                    color: getEventColor(event.type),
                    icon: getEventIcon(event.type)
                });
            });
        }
        
        // 2. Try to fetch from other tables if available
        try {
            // Clinical sessions
            const { data: clinicalSessions } = await supabaseClient
                .from('clinical_sessions')
                .select('date, department, description, hospital, start_time, end_time, supervisor')
                .eq('program', program)
                .eq('block', block)
                .eq('intake_year', intakeYear)
                .limit(10);
            
            if (clinicalSessions && clinicalSessions.length > 0) {
                clinicalSessions.forEach(session => {
                    events.push({
                        id: `clinical_${session.date}_${session.department}`,
                        date: session.date,
                        title: `Clinical: ${session.department}`,
                        type: 'Clinical',
                        details: session.description || `${session.hospital} - ${session.supervisor}`,
                        venue: session.hospital,
                        startTime: session.start_time,
                        endTime: session.end_time,
                        organizer: session.supervisor,
                        color: '#10B981',
                        icon: 'fas fa-hospital'
                    });
                });
            }
        } catch (clinicalError) {
            console.log('No clinical sessions table or error:', clinicalError.message);
        }
        
        // Add upcoming exams from dashboard if available
        if (window.cachedExams && Array.isArray(window.cachedExams)) {
            window.cachedExams.forEach(exam => {
                if (exam.exam_date && new Date(exam.exam_date) > new Date()) {
                    events.push({
                        id: `exam_${exam.id || exam.exam_date}`,
                        date: exam.exam_date,
                        title: exam.exam_name || 'Exam',
                        type: 'Exam',
                        details: `Block ${exam.block_term || exam.block || 'N/A'}`,
                        venue: 'Examination Hall',
                        startTime: '09:00',
                        endTime: '12:00',
                        organizer: 'Examinations Department',
                        color: '#EF4444',
                        icon: 'fas fa-file-alt'
                    });
                }
            });
        }
        
        // If still no events, use demo data
        if (events.length === 0) {
            console.log('⚠️ No events found in database, using demo data');
            return getDemoCalendarEvents(userProfile);
        }
        
        console.log(`✅ Found ${events.length} calendar events`);
        return events;
        
    } catch (error) {
        console.error('❌ Error in fetchScheduleData:', error);
        return getDemoCalendarEvents(userProfile);
    }
}

// Demo data for testing
function getDemoCalendarEvents(userProfile) {
    console.log('🎭 Using demo calendar data');
    
    const today = new Date();
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);
    const twoWeeks = new Date(today);
    twoWeeks.setDate(today.getDate() + 14);
    
    const program = userProfile?.program || 'Nursing';
    const block = userProfile?.block || 'A';
    
    return [
        {
            id: 'exam_1',
            date: nextWeek.toISOString().split('T')[0],
            title: `${program} Mid-Term Exam`,
            type: 'Exam',
            details: `Block ${block} - Comprehensive mid-term examination covering all topics`,
            venue: 'Main Examination Hall',
            startTime: '09:00',
            endTime: '12:00',
            organizer: 'Examinations Department',
            color: '#EF4444',
            icon: 'fas fa-file-alt'
        },
        {
            id: 'clinical_1',
            date: today.toISOString().split('T')[0],
            title: 'Clinical Rotation: Pediatrics',
            type: 'Clinical',
            details: 'Hands-on clinical practice at Nakuru Level 5 Hospital',
            venue: 'Nakuru Level 5 Hospital',
            startTime: '08:00',
            endTime: '16:00',
            organizer: 'Dr. Wangari',
            color: '#10B981',
            icon: 'fas fa-hospital'
        },
        {
            id: 'class_1',
            date: twoWeeks.toISOString().split('T')[0],
            title: 'Anatomy & Physiology Lecture',
            type: 'Class',
            details: 'Cardiovascular System - Lecture and practical demonstration',
            venue: 'Lecture Hall 3',
            startTime: '10:00',
            endTime: '13:00',
            organizer: 'Prof. Kamau',
            color: '#3B82F6',
            icon: 'fas fa-chalkboard-teacher'
        },
        {
            id: 'event_1',
            date: new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            title: 'Health Sciences Symposium',
            type: 'Event',
            details: 'Annual symposium on emerging trends in healthcare',
            venue: 'NCHSM Auditorium',
            startTime: '09:00',
            endTime: '17:00',
            organizer: 'Student Affairs',
            color: '#8B5CF6',
            icon: 'fas fa-calendar-alt'
        }
    ];
}

// Render calendar table - SIMPLE VERSION
function renderCalendarTable(events, filterType) {
    const tableBody = document.getElementById('calendar-table');
    if (!tableBody) return;
    
    tableBody.innerHTML = '';
    
    if (events.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="3" style="text-align: center; padding: 40px; color: #6b7280;">
                    <i class="fas fa-calendar-times" style="font-size: 2rem; margin-bottom: 10px;"></i>
                    <p>No scheduled events found for "${filterType}"</p>
                </td>
            </tr>
        `;
        return;
    }
    
    events.forEach(event => {
        const row = document.createElement('tr');
        row.className = 'calendar-event-row';
        row.setAttribute('data-id', event.id);
        
        // Format date
        const date = new Date(event.date);
        const dateStr = event.startTime 
            ? `${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} ${event.startTime}${event.endTime ? ` - ${event.endTime}` : ''}`
            : date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
        
        // Create cells
        const dateCell = document.createElement('td');
        dateCell.className = 'date-col';
        dateCell.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px;">
                <i class="${event.icon}" style="color: ${event.color}; font-size: 1.2rem;"></i>
                <div>
                    <div style="font-weight: 600; color: #1f2937;">${dateStr}</div>
                    ${event.venue ? `<div style="font-size: 0.85rem; color: #6b7280;">${event.venue}</div>` : ''}
                </div>
            </div>
        `;
        
        const detailsCell = document.createElement('td');
        detailsCell.innerHTML = `
            <div>
                <div style="font-weight: 700; color: #1f2937; margin-bottom: 4px;">${escapeHtml(event.title)}</div>
                <div style="color: #4b5563; margin-bottom: 8px; font-size: 0.95rem;">${escapeHtml(event.details)}</div>
                ${event.organizer ? `<div style="font-size: 0.85rem; color: #6b7280;"><i class="fas fa-user"></i> ${event.organizer}</div>` : ''}
            </div>
        `;
        
        const typeCell = document.createElement('td');
        typeCell.className = 'session-type-col';
        typeCell.innerHTML = `
            <span style="display: inline-block; padding: 4px 12px; background: ${event.color}20; color: ${event.color}; border-radius: 12px; font-size: 0.8rem; font-weight: 600; text-transform: uppercase;">
                ${event.type}
            </span>
        `;
        
        // Append cells
        row.appendChild(dateCell);
        row.appendChild(detailsCell);
        row.appendChild(typeCell);
        
        // Add click handler
        row.addEventListener('click', function() {
            showEventDetails(event);
        });
        
        // Add to table
        tableBody.appendChild(row);
    });
}

// Show event details in modal
function showEventDetails(event) {
    // Create modal
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
        z-index: 1000;
        padding: 20px;
    `;
    
    // Format date
    const date = new Date(event.date);
    const dateStr = event.startTime 
        ? `${date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })} • ${event.startTime}${event.endTime ? ` - ${event.endTime}` : ''}`
        : date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    
    modal.innerHTML = `
        <div style="background: white; padding: 24px; border-radius: 16px; max-width: 500px; width: 100%; box-shadow: 0 10px 40px rgba(0,0,0,0.2);">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px;">
                <div style="display: flex; align-items: center; gap: 12px;">
                    <div style="width: 50px; height: 50px; border-radius: 12px; background: ${event.color}20; display: flex; align-items: center; justify-content: center;">
                        <i class="${event.icon}" style="color: ${event.color}; font-size: 1.5rem;"></i>
                    </div>
                    <div>
                        <h3 style="margin: 0 0 4px 0; color: #1f2937;">${escapeHtml(event.title)}</h3>
                        <div style="color: ${event.color}; font-weight: 600; font-size: 0.9rem; text-transform: uppercase;">${event.type}</div>
                    </div>
                </div>
                <button onclick="this.closest('div[style*=\"position: fixed\"]').remove()" style="background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #6B7280; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: 50%; transition: background 0.2s;">
                    ×
                </button>
            </div>
            
            <div style="margin-bottom: 20px;">
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px; color: #4b5563;">
                    <i class="fas fa-calendar" style="color: #6d28d9;"></i>
                    <span>${dateStr}</span>
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
            
            ${event.type === 'Exam' ? `
                <button onclick="viewExamInCalendar('${event.id}')" style="width: 100%; padding: 12px; background: linear-gradient(135deg, #6d28d9, #9333ea); color: white; border: none; border-radius: 12px; font-weight: 600; cursor: pointer; transition: all 0.2s;">
                    <i class="fas fa-file-alt"></i> View Exam Details
                </button>
            ` : ''}
        </div>
    `;
    
    // Add hover effect to close button
    modal.querySelector('button').addEventListener('mouseenter', function() {
        this.style.background = '#f3f4f6';
    });
    
    modal.querySelector('button').addEventListener('mouseleave', function() {
        this.style.background = 'none';
    });
    
    document.body.appendChild(modal);
    
    // Close on ESC key
    const closeModal = () => modal.remove();
    const handleEsc = (e) => {
        if (e.key === 'Escape') closeModal();
    };
    
    document.addEventListener('keydown', handleEsc);
    modal.addEventListener('click', function(e) {
        if (e.target === this) closeModal();
    });
}

// View exam details from calendar
function viewExamInCalendar(eventId) {
    // Close calendar modal first
    const modal = document.querySelector('div[style*="position: fixed"]');
    if (modal) modal.remove();
    
    // Navigate to exams tab and show exam details
    if (typeof window.showTab === 'function') {
        window.showTab('cats');
        
        // Try to find and trigger exam details after a delay
        setTimeout(() => {
            const examId = eventId.replace('exam_', '');
            if (typeof viewProvisionalTranscript === 'function') {
                viewProvisionalTranscript(examId);
            } else {
                console.log('Exam ID to view:', examId);
                // You can trigger exam modal here if available
            }
        }, 500);
    }
}

// Update dashboard with calendar events
function updateDashboardCalendarEvents(events) {
    // Update upcoming exam on dashboard
    const upcomingExams = events.filter(event => 
        event.type === 'Exam' && new Date(event.date) > new Date()
    ).sort((a, b) => new Date(a.date) - new Date(b.date));
    
    const upcomingExamElement = document.getElementById('dashboard-upcoming-exam');
    if (upcomingExamElement && upcomingExams.length > 0) {
        const nextExam = upcomingExams[0];
        const examDate = new Date(nextExam.date);
        const formattedDate = examDate.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric',
            year: examDate.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
        });
        
        upcomingExamElement.innerHTML = `
            <span style="color: #EF4444; font-weight: 600; font-size: 1.1rem;">
                ${nextExam.title}
            </span>
            <div style="font-size: 0.9rem; color: #6b7280; margin-top: 4px;">
                ${formattedDate} • ${nextExam.startTime || 'All day'}
            </div>
        `;
        
        // Make it clickable
        upcomingExamElement.style.cursor = 'pointer';
        upcomingExamElement.onclick = () => showEventDetails(nextExam);
    } else if (upcomingExamElement) {
        upcomingExamElement.innerHTML = `
            <span style="color: #10B981; font-weight: 600;">No upcoming exams</span>
            <div style="font-size: 0.9rem; color: #6b7280; margin-top: 4px;">All caught up!</div>
        `;
    }
    
    // Update active courses count based on events
    const uniqueCourses = new Set(
        events
            .filter(e => e.type === 'Class')
            .map(e => e.title.split(':')[0] || e.title)
    );
    
    const activeCoursesElement = document.getElementById('dashboard-active-courses');
    if (activeCoursesElement && uniqueCourses.size > 0) {
        activeCoursesElement.textContent = uniqueCourses.size;
    }
}

// Utility functions
function getEventColor(eventType) {
    const colors = {
        'Exam': '#EF4444',
        'Clinical': '#10B981',
        'Class': '#3B82F6',
        'Event': '#8B5CF6',
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
        'default': 'fas fa-calendar'
    };
    return icons[eventType] || icons.default;
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

// Add CSS for spinner animation
if (!document.querySelector('#calendar-spinner-style')) {
    const style = document.createElement('style');
    style.id = 'calendar-spinner-style';
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
        
        .session-type-col {
            white-space: nowrap;
        }
        
        .date-col {
            min-width: 180px;
        }
    `;
    document.head.appendChild(style);
}

// *************************************************************************
// *** GLOBAL EXPORTS ***
// *************************************************************************

// Make functions globally available
window.loadAcademicCalendar = loadAcademicCalendar;
window.showEventDetails = showEventDetails;
window.viewExamInCalendar = viewExamInCalendar;

// Auto-load calendar when tab is shown
document.addEventListener('appReady', function() {
    console.log('📅 App ready, setting up calendar...');
    
    // Check if calendar tab is active on page load
    if (window.location.hash === '#calendar' || 
        localStorage.getItem('nchsm_last_tab') === 'calendar') {
        setTimeout(() => loadAcademicCalendar(), 500);
    }
    
    // Listen for tab changes
    document.addEventListener('tabChanged', function(e) {
        if (e.detail && e.detail.tab === 'calendar') {
            loadAcademicCalendar();
        }
    });
});
