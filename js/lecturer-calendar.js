// js/lecturer-calendar.js - COMPLETE FIXED VERSION
/**
 * NCHSM Lecturer Calendar Module
 * Enhanced calendar with event management for lecturers
 * Shows sessions, exams, and calendar events
 * Uses: scheduled_sessions, exams, calendar_events
 */

const LecturerCalendar = {
    currentMonth: new Date().getMonth(),
    currentYear: new Date().getFullYear(),
    events: [],
    currentView: 'month',
    lecturerAssignmentId: null,
    lecturerUuid: null,
    
    async init() {
        console.log('📅 Initializing Lecturer Calendar...');
        await this.resolveLecturerId();
        await this.loadEvents();
        this.renderCalendar();
        this.updateStats();
        this.renderUpcomingEvents();
        console.log('✅ Lecturer Calendar initialized');
    },
    
    // ============================================
    // RESOLVE THE CORRECT LECTURER ID
    // ============================================
    async resolveLecturerId() {
        try {
            const supabase = window.lecturerDB?.supabase;
            if (!supabase) return;
            
            const profile = window.lecturerDB?.getCurrentUserProfile();
            if (!profile) return;
            
            const authId = profile.user_id;
            const fullName = profile.full_name;
            
            console.log('🔍 Auth ID (UUID):', authId);
            console.log('🔍 Lecturer name:', fullName);
            
            // Store UUID for calendar
            this.lecturerUuid = authId;
            
            const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(authId));
            
            if (!isUUID && authId) {
                this.lecturerAssignmentId = authId;
                console.log('✅ Using non-UUID auth ID:', this.lecturerAssignmentId);
                return;
            }
            
            const { data: assignments, error: assignError } = await supabase
                .from('lecturer_subject_assignments')
                .select('lecturer_id, lecturer_name')
                .ilike('lecturer_name', `%${fullName}%`);
            
            if (!assignError && assignments && assignments.length > 0) {
                const textId = assignments.find(a => {
                    const id = a.lecturer_id;
                    return id && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(id));
                });
                
                if (textId) {
                    this.lecturerAssignmentId = textId.lecturer_id;
                    console.log('✅ Found non-UUID ID:', this.lecturerAssignmentId);
                    return;
                }
                
                this.lecturerAssignmentId = assignments[0].lecturer_id;
                console.log('⚠️ Using first match ID:', this.lecturerAssignmentId);
                return;
            }
            
            const nameParts = fullName.split(' ');
            const { data: staff, error: staffError } = await supabase
                .from('staff_records')
                .select('id, first_name, other_names')
                .ilike('first_name', `%${nameParts[0]}%`);
            
            if (!staffError && staff && staff.length > 0) {
                this.lecturerAssignmentId = staff[0].id;
                console.log('✅ Found lecturer ID from staff_records:', this.lecturerAssignmentId);
                return;
            }
            
            this.lecturerAssignmentId = authId;
            console.log('⚠️ Falling back to auth ID:', this.lecturerAssignmentId);
            
        } catch (error) {
            console.error('Error resolving lecturer ID:', error);
            this.lecturerAssignmentId = null;
            this.lecturerUuid = null;
        }
    },
    
    async loadEvents() {
        try {
            const profile = window.lecturerDB?.getCurrentUserProfile();
            if (!profile) {
                console.warn('No lecturer profile found');
                this.events = this.getMockEvents();
                return;
            }
            
            const program = profile.program || profile.department || 'KRCHN';
            const supabase = window.lecturerDB?.supabase;
            
            if (!supabase) {
                this.events = this.getMockEvents();
                return;
            }
            
            console.log('📅 Loading events for program:', program);
            
            this.events = [];
            
            // ============================================
            // 1. LOAD SESSIONS FROM scheduled_sessions
            // ============================================
            const { data: sessions, error: sessionsError } = await supabase
                .from('scheduled_sessions')
                .select('*')
                .eq('target_program', program);
            
            if (sessionsError) {
                console.error('Error loading sessions:', sessionsError);
            } else if (sessions) {
                console.log(`📚 Found ${sessions.length} sessions`);
                sessions.forEach(s => {
                    const date = s.session_date ? new Date(s.session_date) : new Date();
                    this.events.push({
                        id: s.id || `session-${Date.now()}`,
                        title: s.session_title || s.title || 'Session',
                        description: s.description || '',
                        date: date,
                        time: s.session_time || '09:00',
                        endTime: s.session_end_time || '10:00',
                        location: s.location_name || s.venue || 'Lecture Hall',
                        type: 'session',
                        program: s.target_program || program,
                        block: s.block_term || s.block || 'N/A',
                        color: '#3b82f6',
                        icon: '📚',
                        raw: s
                    });
                });
            }
            
            // ============================================
            // 2. LOAD EXAMS FROM exams
            // ============================================
            const { data: exams, error: examsError } = await supabase
                .from('exams')
                .select('*')
                .eq('target_program', program);
            
            if (examsError) {
                console.error('Error loading exams:', examsError);
            } else if (exams) {
                console.log(`📝 Found ${exams.length} exams`);
                exams.forEach(e => {
                    const date = e.exam_date ? new Date(e.exam_date) : new Date();
                    this.events.push({
                        id: e.id || `exam-${Date.now()}`,
                        title: e.exam_name || e.title || 'Exam',
                        description: e.instructions || '',
                        date: date,
                        time: e.exam_start_time || '10:00',
                        endTime: e.end_time || '12:00',
                        location: e.venue || 'Exam Hall',
                        type: 'exam',
                        program: e.target_program || program,
                        block: e.block || e.block_term || 'N/A',
                        color: '#10b981',
                        icon: '📝',
                        raw: e
                    });
                });
            }
            
            // ============================================
            // 3. LOAD CALENDAR EVENTS FROM calendar_events
            // ============================================
            const { data: calendarEvents, error: calendarError } = await supabase
                .from('calendar_events')
                .select('*')
                .eq('target_program', program);
            
            if (calendarError) {
                console.error('Error loading calendar events:', calendarError);
            } else if (calendarEvents) {
                console.log(`📅 Found ${calendarEvents.length} calendar events`);
                calendarEvents.forEach(e => {
                    const date = e.event_date ? new Date(e.event_date) : new Date();
                    this.events.push({
                        id: e.id || `calendar-${Date.now()}`,
                        title: e.event_name || e.title || 'Event',
                        description: e.description || '',
                        date: date,
                        time: e.start_time || '09:00',
                        endTime: e.end_time || '17:00',
                        location: e.venue || e.location || 'N/A',
                        type: 'event',
                        program: e.target_program || program,
                        block: e.target_block || 'N/A',
                        organizer: e.organizer || '',
                        color: '#8b5cf6',
                        icon: '📌',
                        raw: e
                    });
                });
            }
            
            // Sort events by date
            this.events.sort((a, b) => a.date - b.date);
            
            console.log(`✅ Loaded ${this.events.length} total events`);
            
        } catch (error) {
            console.error('Failed to load events:', error);
            this.events = this.getMockEvents();
        }
    },
    
    getMockEvents() {
        const today = new Date();
        const events = [];
        
        for (let i = 1; i <= 5; i++) {
            const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i * 2);
            events.push({
                id: `mock-${i}`,
                title: i % 2 === 0 ? 'Maternal Health Lecture' : 'Clinical Skills Session',
                description: `Event ${i}`,
                date: date,
                time: i % 2 === 0 ? '09:00' : '14:00',
                endTime: i % 2 === 0 ? '10:00' : '15:00',
                location: i % 2 === 0 ? 'Lecture Hall A' : 'Clinical Lab 2',
                type: i % 2 === 0 ? 'session' : 'exam',
                program: 'KRCHN',
                block: `Block ${Math.ceil(i/2)}`,
                color: i % 2 === 0 ? '#3b82f6' : '#10b981',
                icon: i % 2 === 0 ? '📚' : '📝'
            });
        }
        
        return events;
    },
    
    renderCalendar() {
        const monthYear = document.getElementById('calendarMonthYear');
        const daysContainer = document.getElementById('calendarDays');
        
        if (!daysContainer) return;
        
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                           'July', 'August', 'September', 'October', 'November', 'December'];
        
        if (monthYear) {
            monthYear.textContent = `${monthNames[this.currentMonth]} ${this.currentYear}`;
        }
        
        const firstDay = new Date(this.currentYear, this.currentMonth, 1).getDay();
        const daysInMonth = new Date(this.currentYear, this.currentMonth + 1, 0).getDate();
        const today = new Date();
        const todayStr = today.toDateString();
        
        let html = '';
        
        for (let i = 0; i < firstDay; i++) {
            html += `<div style="padding: 8px; min-height: 70px; background: #fafafa; border-radius: 6px;"></div>`;
        }
        
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(this.currentYear, this.currentMonth, day);
            const dateStr = date.toDateString();
            const isToday = dateStr === todayStr;
            const dayEvents = this.events.filter(e => e.date.toDateString() === dateStr);
            
            let bgColor = 'white';
            let borderColor = '#e5e7eb';
            
            if (isToday) {
                bgColor = '#f0f4ff';
                borderColor = '#4C1D95';
            }
            
            if (dayEvents.length > 0) {
                const hasSession = dayEvents.some(e => e.type === 'session');
                const hasExam = dayEvents.some(e => e.type === 'exam');
                const hasEvent = dayEvents.some(e => e.type === 'event');
                
                if (hasEvent) bgColor = '#ede9fe';
                else if (hasExam) bgColor = '#d1fae5';
                else if (hasSession) bgColor = '#dbeafe';
                if (hasEvent && hasExam) bgColor = '#fef3c7';
                if (hasEvent && hasSession) bgColor = '#fef3c7';
            }
            
            const eventDots = dayEvents.slice(0, 3).map(e => {
                const colors = {
                    'session': '#3b82f6',
                    'exam': '#10b981',
                    'event': '#8b5cf6',
                    'deadline': '#ef4444',
                    'holiday': '#f59e0b'
                };
                return `<span style="display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: ${colors[e.type] || '#6b7280'}; margin-right: 2px;"></span>`;
            }).join('');
            
            html += `
                <div style="padding: 8px; min-height: 70px; background: ${bgColor}; border-radius: 6px; border: 2px solid ${isToday ? '#4C1D95' : 'transparent'}; cursor: pointer; transition: all 0.2s; position: relative;" 
                     onmouseover="this.style.transform='scale(1.02)'; this.style.boxShadow='0 2px 8px rgba(0,0,0,0.1)'" 
                     onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='none'"
                     onclick="window.LecturerCalendar.viewDay('${date.toISOString()}')">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span style="font-weight: ${isToday ? '800' : '500'}; color: ${isToday ? '#4C1D95' : '#1e293b'};">
                            ${day}
                        </span>
                        ${isToday ? '<span style="font-size: 8px; background: #4C1D95; color: white; padding: 1px 6px; border-radius: 10px;">Today</span>' : ''}
                    </div>
                    ${dayEvents.length > 0 ? `
                        <div style="margin-top: 6px;">
                            ${dayEvents.slice(0, 2).map(e => `
                                <div style="font-size: 9px; color: #475569; background: rgba(255,255,255,0.8); padding: 1px 4px; border-radius: 3px; margin-bottom: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: flex; align-items: center; gap: 3px;">
                                    <span>${e.icon || '📌'}</span>
                                    <span>${e.title}</span>
                                </div>
                            `).join('')}
                            ${dayEvents.length > 2 ? `<div style="font-size: 8px; color: #94a3b8;">+${dayEvents.length - 2} more</div>` : ''}
                        </div>
                    ` : ''}
                    <div style="position: absolute; bottom: 4px; right: 4px; display: flex; gap: 2px;">
                        ${eventDots}
                    </div>
                </div>
            `;
        }
        
        daysContainer.innerHTML = html;
    },
    
    viewDay(dateString) {
        const date = new Date(dateString);
        const events = this.events.filter(e => e.date.toDateString() === date.toDateString());
        
        if (events.length === 0) {
            window.showNotification('No events on this day', 'info');
            return;
        }
        
        let message = `📅 ${date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}\n\n`;
        message += `━`.repeat(30) + `\n\n`;
        
        events.forEach((e, index) => {
            message += `${e.icon || '📌'} ${e.title}\n`;
            message += `   ⏰ ${e.time || 'TBD'} - ${e.endTime || 'TBD'}\n`;
            message += `   📍 ${e.location || 'N/A'}\n`;
            if (e.description) {
                message += `   📝 ${e.description}\n`;
            }
            if (e.organizer) {
                message += `   👤 ${e.organizer}\n`;
            }
            if (index < events.length - 1) {
                message += `\n`;
            }
        });
        
        alert(message);
    },
    
    changeMonth(delta) {
        this.currentMonth += delta;
        if (this.currentMonth > 11) {
            this.currentMonth = 0;
            this.currentYear++;
        } else if (this.currentMonth < 0) {
            this.currentMonth = 11;
            this.currentYear--;
        }
        this.renderCalendar();
    },
    
    goToToday() {
        const today = new Date();
        this.currentMonth = today.getMonth();
        this.currentYear = today.getFullYear();
        this.renderCalendar();
        this.updateStats();
        this.renderUpcomingEvents();
    },
    
    updateStats() {
        const today = new Date();
        const todayStr = today.toDateString();
        const weekStart = new Date(today);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        
        const todayEvents = this.events.filter(e => e.date.toDateString() === todayStr);
        const todaySessions = todayEvents.filter(e => e.type === 'session' || e.type === 'exam' || e.type === 'event').length;
        const todayEl = document.getElementById('todaySessions');
        if (todayEl) todayEl.textContent = todaySessions;
        
        const weekEvents = this.events.filter(e => e.date >= weekStart && e.date <= weekEnd);
        const weekEl = document.getElementById('weekSessions');
        if (weekEl) weekEl.textContent = weekEvents.length;
        
        const upcomingExams = this.events.filter(e => e.type === 'exam' && e.date >= today);
        const examsEl = document.getElementById('upcomingExams');
        if (examsEl) examsEl.textContent = upcomingExams.length;
        
        const totalEl = document.getElementById('totalEvents');
        if (totalEl) totalEl.textContent = this.events.length;
    },
    
    renderUpcomingEvents() {
        const container = document.getElementById('upcomingEventsList');
        if (!container) return;
        
        const today = new Date();
        const upcoming = this.events
            .filter(e => e.date >= today)
            .sort((a, b) => a.date - b.date)
            .slice(0, 10);
        
        if (upcoming.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 30px; color: #94a3b8;">
                    <i class="fas fa-calendar-plus" style="font-size: 32px; display: block; margin-bottom: 10px; color: #e2e8f0;"></i>
                    <p style="margin: 0;">No upcoming events</p>
                </div>
            `;
            const countEl = document.getElementById('upcomingEventCount');
            if (countEl) countEl.textContent = '0';
            return;
        }
        
        const typeColors = {
            'session': '#3b82f6',
            'exam': '#10b981',
            'event': '#8b5cf6',
            'deadline': '#ef4444',
            'holiday': '#f59e0b'
        };
        
        container.innerHTML = upcoming.map(e => `
            <div style="display: flex; align-items: center; gap: 12px; padding: 10px 14px; border-bottom: 1px solid #f1f5f9; transition: background 0.2s;" 
                 onmouseover="this.style.background='#f8fafc'" 
                 onmouseout="this.style.background='transparent'">
                <div style="width: 4px; height: 40px; background: ${typeColors[e.type] || '#6b7280'}; border-radius: 2px;"></div>
                <div style="flex: 1;">
                    <div style="font-weight: 600; font-size: 14px; color: #1e293b;">
                        ${e.icon || '📌'} ${this.escapeHtml(e.title)}
                    </div>
                    <div style="font-size: 12px; color: #64748b; display: flex; gap: 12px; flex-wrap: wrap; margin-top: 2px;">
                        <span>📅 ${e.date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                        <span>⏰ ${e.time || 'TBD'}</span>
                        ${e.location ? `<span>📍 ${this.escapeHtml(e.location)}</span>` : ''}
                        <span style="background: ${typeColors[e.type] || '#6b7280'}20; padding: 0 8px; border-radius: 10px; font-size: 10px; color: ${typeColors[e.type] || '#6b7280'};">
                            ${e.type.charAt(0).toUpperCase() + e.type.slice(1)}
                        </span>
                    </div>
                </div>
                <div style="font-size: 12px; color: #94a3b8;">
                    ${this.getDaysUntil(e.date)}
                </div>
            </div>
        `).join('');
        
        const countEl = document.getElementById('upcomingEventCount');
        if (countEl) countEl.textContent = upcoming.length;
    },
    
    getDaysUntil(date) {
        const today = new Date();
        const diffTime = date - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Tomorrow';
        if (diffDays < 7) return `${diffDays} days`;
        if (diffDays < 14) return '1 week';
        if (diffDays < 21) return '2 weeks';
        if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks`;
        return `${Math.floor(diffDays / 30)} months`;
    },
    
    formatDate(dateString) {
        if (!dateString) return 'N/A';
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
            });
        } catch {
            return dateString;
        }
    },
    
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },
    
    async refresh() {
        await this.resolveLecturerId();
        await this.loadEvents();
        this.renderCalendar();
        this.updateStats();
        this.renderUpcomingEvents();
        window.showNotification('Calendar refreshed!', 'success');
    }
};

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => LecturerCalendar.init(), 900);
});

// Make available globally
window.LecturerCalendar = LecturerCalendar;
window.loadCalendar = () => LecturerCalendar.goToToday();
window.changeMonth = (delta) => LecturerCalendar.changeMonth(delta);

console.log('✅ LecturerCalendar module loaded - Uses scheduled_sessions, exams, and calendar_events');
