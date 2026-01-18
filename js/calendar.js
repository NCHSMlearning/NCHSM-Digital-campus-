// calendar.js - COMPLETE VERSION FOR YOUR DATABASE
// ============================================

let cachedCalendarEvents = [];
let isLoadingCalendar = false;

document.addEventListener('DOMContentLoaded', function() {
    console.log('📅 Calendar: Initializing...');
    
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
        
        // Fetch from database
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
            .or(`program_type.eq.${userProgram},program_type.is.null`)
            .or(`block_term.eq.${userBlock},block_term.is.null`)
            .order('exam_date', { ascending: true });
        
        if (error) {
            console.error('exams_with_courses error:', error);
        } else if (examsData && examsData.length > 0) {
            console.log(`✅ Found ${examsData.length} exams from exams_with_courses`);
            
            examsData.forEach(exam => {
                // Convert duration_minutes to end time
                const startTime = exam.exam_start_time || '09:00:00';
                let endTime = '12:00:00';
                
                if (exam.exam_start_time && exam.duration_minutes) {
                    const start = new Date(`1970-01-01T${exam.exam_start_time}`);
                    const end = new Date(start.getTime() + exam.duration_minutes * 60000);
                    endTime = end.toTimeString().slice(0, 8);
                }
                
                events.push({
                    id: `exam_${exam.id}`,
                    date: exam.exam_date,
                    title: exam.exam_name || 'Exam',
                    type: exam.exam_type || 'Exam',
                    details: `${exam.course_code || ''} - ${exam.course_name || ''}`,
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
        console.error('exams_with_courses fetch failed:', error);
    }
    
    // ===== 3. Fetch from exams table (backup) =====
    try {
        console.log('📝 Fetching exams table...');
        const { data: examsTableData, error } = await supabase
            .from('exams')
            .select('*')
            .or(`program_type.eq.${userProgram},target_program.eq.${userProgram},program_type.is.null,target_program.is.null`)
            .or(`block.eq.${userBlock},block_term.eq.${userBlock},block.is.null,block_term.is.null`)
            .order('exam_date', { ascending: true });
        
        if (error) {
            console.error('exams table error:', error);
        } else if (examsTableData && examsTableData.length > 0) {
            console.log(`✅ Found ${examsTableData.length} exams from exams table`);
            
            examsTableData.forEach(exam => {
                events.push({
                    id: `exam_table_${exam.id}`,
                    date: exam.exam_date,
                    title: exam.exam_name || exam.title || 'Exam',
                    type: exam.exam_type || 'Exam',
                    details: exam.course_code || '',
                    venue: 'Examination Hall',
                    startTime: exam.exam_start_time || '09:00:00',
                    endTime: exam.exam_start_time ? 
                        (() => {
                            if (exam.exam_start_time && exam.duration_minutes) {
                                const start = new Date(`1970-01-01T${exam.exam_start_time}`);
                                const end = new Date(start.getTime() + exam.duration_minutes * 60000);
                                return end.toTimeString().slice(0, 8);
                            }
                            return '12:00:00';
                        })() : '12:00:00',
                    organizer: 'Examinations Department',
                    color: '#EF4444',
                    icon: 'fas fa-file-alt',
                    source: 'exams',
                    program: exam.program_type || exam.target_program || userProgram,
                    block: exam.block || exam.block_term || userBlock,
                    status: exam.status,
                    duration: exam.duration_minutes
                });
            });
        }
    } catch (error) {
        console.error('exams table fetch failed:', error);
    }
    
    // ===== 4. Fetch from clinical_names =====
    try {
        console.log('🏥 Fetching clinical_names...');
        const { data: clinicalData, error } = await supabase
            .from('clinical_names')
            .select('*')
            .eq('program', userProgram)
            .eq('intake_year', userIntakeYear)
            .eq('block_term', userBlock);
        
        if (error) {
            console.error('clinical_names error:', error);
        } else if (clinicalData && clinicalData.length > 0) {
            console.log(`✅ Found ${clinicalData.length} clinical rotations`);
            
            // Create clinical rotation events for the next 30 days
            const today = new Date();
            for (let i = 0; i < 30; i++) {
                const date = new Date(today);
                date.setDate(today.getDate() + i);
                
                // Skip weekends (optional)
                if (date.getDay() === 0 || date.getDay() === 6) continue;
                
                // For each clinical area, create a daily event
                clinicalData.forEach(clinical => {
                    events.push({
                        id: `clinical_${clinical.id}_${i}`,
                        date: date.toISOString().split('T')[0],
                        title: `Clinical Rotation: ${clinical.clinical_area_name}`,
                        type: 'Clinical',
                        details: `Clinical placement in ${clinical.clinical_area_name}`,
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
        console.error('clinical_names fetch failed:', error);
    }
    
    // ===== 5. Create class events from courses table =====
    try {
        console.log('📚 Creating class events from courses...');
        const { data: coursesData, error } = await supabase
            .from('courses')
            .select('*')
            .or(`target_program.eq.${userProgram},target_program.is.null`)
            .or(`block.eq.${userBlock},block.is.null`)
            .limit(10);
        
        if (!error && coursesData && coursesData.length > 0) {
            console.log(`✅ Found ${coursesData.length} courses for class schedule`);
            
            // Create class events for next 14 days
            const today = new Date();
            for (let i = 0; i < 14; i++) {
                const date = new Date(today);
                date.setDate(today.getDate() + i);
                
                // Skip weekends
                if (date.getDay() === 0 || date.getDay() === 6) continue;
                
                // For each course, create a class event
                coursesData.forEach(course => {
                    events.push({
                        id: `course_${course.id}_${i}`,
                        date: date.toISOString().split('T')[0],
                        title: `${course.course_name || course.name || 'Course'} Class`,
                        type: 'Class',
                        details: course.description || `${course.code || course.unit_code || ''} lecture`,
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
        console.error('courses fetch failed:', error);
    }
    
    if (events.length === 0) {
        console.log('⚠️ Database returned NO events');
    }
    
    console.log(`🎯 Total events found: ${events.length}`);
    return events;
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
                    <p>No events found in database</p>
                    <div style="margin-top: 15px; font-size: 0.9rem; color: #9ca3af;">
                        <p>Tables checked:</p>
                        <ul style="text-align: left; margin: 10px auto; max-width: 300px;">
                            <li>✓ calendar_events</li>
                            <li>✓ exams_with_courses</li>
                            <li>✓ exams</li>
                            <li>✓ clinical_names</li>
                            <li>✓ courses</li>
                        </ul>
                    </div>
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
                            ${event.courseName ? ` • Course: ${event.courseName}` : ''}
                            ${event.clinicalArea ? ` • Clinical: ${event.clinicalArea}` : ''}
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

// ========== KEEP OTHER FUNCTIONS SAME ==========
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
                ${event.courseName ? `<div>Course: ${event.courseName}${event.courseCode ? ` (${event.courseCode})` : ''}</div>` : ''}
                ${event.clinicalArea ? `<div>Clinical Area: ${event.clinicalArea}</div>` : ''}
                ${event.block && event.block !== 'All' ? `<div>Block: ${event.block}</div>` : ''}
                ${event.intakeYear ? `<div>Intake Year: ${event.intakeYear}</div>` : ''}
            </div>
            
            ${event.type === 'Exam' ? `
                <button onclick="viewExamDetails('${event.id}')" 
                        style="width: 100%; padding: 12px; background: linear-gradient(135deg, #6d28d9, #9333ea); color: white; border: none; border-radius: 12px; font-weight: 600; cursor: pointer; margin-top: 16px;">
                    <i class="fas fa-file-alt"></i> View Exam Details
                </button>
            ` : ''}
            
            ${event.type === 'Clinical' && event.latitude && event.longitude ? `
                <button onclick="openClinicalLocation(${event.latitude}, ${event.longitude})" 
                        style="width: 100%; padding: 12px; background: linear-gradient(135deg, #10B981, #34D399); color: white; border: none; border-radius: 12px; font-weight: 600; cursor: pointer; margin-top: 10px;">
                    <i class="fas fa-map-marked-alt"></i> View Clinical Location
                </button>
            ` : ''}
        </div>
    `;
    
    document.body.appendChild(modal);
    
    const closeModal = () => modal.remove();
    modal.querySelector('button').addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeModal();
    });
}

function openClinicalLocation(latitude, longitude) {
    // Open in Google Maps
    window.open(`https://www.google.com/maps?q=${latitude},${longitude}`, '_blank');
}

function updateDashboardWithEvents(events) {
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
    
    const clinicalEvents = events.filter(e => e.type === 'Clinical')
        .filter(e => new Date(e.date) > new Date())
        .sort((a, b) => new Date(a.date) - new Date(b.date));
    
    const clinicalElement = document.getElementById('dashboard-clinical');
    if (clinicalElement && clinicalEvents.length > 0) {
        const nextClinical = clinicalEvents[0];
        clinicalElement.innerHTML = `
            <span style="color: #10B981; font-weight: 600; font-size: 1.1rem;">${nextClinical.clinicalArea || 'Clinical Rotation'}</span>
            <div style="font-size: 0.9rem; color: #6b7280; margin-top: 4px;">
                ${nextClinical.formattedDate}
            </div>
        `;
        clinicalElement.style.cursor = 'pointer';
        clinicalElement.onclick = () => showEventDetails(nextClinical);
    }
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
window.openClinicalLocation = openClinicalLocation;

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

console.log('📅 calendar.js loaded - COMPLETE DATABASE VERSION');
