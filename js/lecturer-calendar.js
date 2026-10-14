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
    timetableRows: [],
    selectedBlock: 'all',
    timetableError: '',
    currentView: 'month',
    lecturerAssignmentId: null,
    lecturerUuid: null,
    
    async init() {
        console.log('📅 Initializing Lecturer Calendar...');
        await this.resolveLecturerId();
        await this.loadEvents();
        await this.loadBlockTimetable();
        this.renderBlockTimetablePanel();
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
                this.events = [];
                return;
            }
            
            const program = profile.program || profile.department || 'KRCHN';
            const supabase = window.lecturerDB?.supabase;
            
            if (!supabase) {
                console.error('Calendar data service is unavailable');
                this.events = [];
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
                    if (!s.session_date || Number.isNaN(new Date(s.session_date).getTime())) return;
                    const date = new Date(s.session_date);
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
                    if (!e.exam_date || Number.isNaN(new Date(e.exam_date).getTime())) return;
                    const date = new Date(e.exam_date);
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
                    if (!e.event_date || Number.isNaN(new Date(e.event_date).getTime())) return;
                    const date = new Date(e.event_date);
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
            this.events = [];
        }
    },
    

    // Load the same published timetable source used by the student timetable module.
    async loadBlockTimetable() {
        const supabase = window.lecturerDB?.supabase;
        this.timetableError = '';
        if (!supabase) {
            this.timetableError = 'Timetable service is unavailable. Please refresh and try again.';
            this.timetableRows = [];
            return;
        }
        try {
            const { data, error } = await supabase.from('timetables').select('*');
            if (error) throw error;
            const profile = window.lecturerDB?.getCurrentUserProfile?.() || {};
            const program = String(profile.program || profile.department || '').trim().toLowerCase();
            this.timetableRows = (data || []).filter(row => {
                const rowProgram = String(row.program || row.target_program || row.department || '').trim().toLowerCase();
                return !program || !rowProgram || rowProgram === program;
            });
        } catch (error) {
            console.error('[Lecturer timetable] Failed to load:', error);
            this.timetableRows = [];
            this.timetableError = 'Could not load the published timetable. Check access and try again.';
        }
    },

    timetableValue(row, keys, fallback='') {
        for (const key of keys) {
            if (row?.[key] !== undefined && row[key] !== null && String(row[key]).trim() !== '') return row[key];
        }
        return fallback;
    },

    renderBlockTimetablePanel() {
        const calendarDays = document.getElementById('calendarDays');
        if (!calendarDays) return;
        let panel = document.getElementById('lecturer-block-timetable-panel');
        if (!panel) {
            panel = document.createElement('section');
            panel.id = 'lecturer-block-timetable-panel';
            panel.style.cssText = 'margin-top:24px;padding:20px;border:1px solid #e2e8f0;border-radius:14px;background:#fff;color:#1e293b;';
            calendarDays.parentElement.insertAdjacentElement('afterend', panel);
        }
        const esc = value => this.escapeHtml(String(value ?? ''));
        const dateKeys = ['class_date','session_date','scheduled_date','timetable_date','date','start_date','event_date'];
        const dateOf = row => {
            const raw = this.timetableValue(row, dateKeys, '');
            if (!raw) return null;
            const d = new Date(raw);
            return Number.isNaN(d.getTime()) ? null : d;
        };
        const isoWeek = date => {
            if (!date) return '';
            const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
            d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
            const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
            return d.getUTCFullYear() + '-W' + String(Math.ceil((((d - yearStart) / 86400000) + 1) / 7)).padStart(2, '0');
        };
        const blockOf = row => String(this.timetableValue(row, ['block','student_block','class_block','block_term'], '')).trim();
        const dayOf = row => String(this.timetableValue(row, ['day_of_week','day','week_day','weekday'], '')).trim();
        const weekOf = row => {
            const named = this.timetableValue(row, ['week_number','academic_week','week','week_no','week_label'], '');
            if (named !== '') return String(named).trim();
            const d = dateOf(row);
            return d ? isoWeek(d) : '';
        };
        const blocks = [...new Set(this.timetableRows.map(blockOf).filter(Boolean))].sort((a,b)=>a.localeCompare(b,undefined,{numeric:true}));
        const weeks = [...new Set(this.timetableRows.map(weekOf).filter(Boolean))].sort((a,b)=>a.localeCompare(b,undefined,{numeric:true}));
        const days = [...new Set(this.timetableRows.map(dayOf).filter(Boolean))].sort((a,b)=>a.localeCompare(b));
        const filters = this.timetableFilters || (this.timetableFilters = {block:'all',week:'all',day:'all'});
        const rows = this.timetableRows.filter(r =>
            (filters.block === 'all' || blockOf(r) === filters.block) &&
            (filters.week === 'all' || weekOf(r) === filters.week) &&
            (filters.day === 'all' || dayOf(r).toLowerCase() === filters.day.toLowerCase())
        );
        const selectedBlock = filters.block;
        const upcoming = this.events.filter(e => e.type === 'session' || e.type === 'exam')
            .filter(e => selectedBlock === 'all' || String(e.block || '').trim() === selectedBlock)
            .filter(e => e.date >= new Date()).sort((a,b)=>a.date-b.date).slice(0,8);
        const dateText = row => {
            const d = dateOf(row);
            return d ? d.toLocaleDateString('en-GB',{weekday:'short',day:'2-digit',month:'short',year:'numeric'}) : 'Not scheduled (weekly timetable)';
        };
        const sortedRows = rows.slice().sort((a,b) => {
            const da = dateOf(a), db = dateOf(b);
            if (da && db && da.getTime() !== db.getTime()) return da - db;
            if (da && !db) return -1;
            if (!da && db) return 1;
            return dayOf(a).localeCompare(dayOf(b)) ||
                String(this.timetableValue(a,['start_time','start'],'')).localeCompare(String(this.timetableValue(b,['start_time','start'],'')));
        });
        panel.innerHTML = `
          <div style="display:flex;gap:12px;justify-content:space-between;align-items:center;flex-wrap:wrap;margin-bottom:16px">
            <div><h3 style="margin:0 0 4px;font-size:20px">Block Timetable & Upcoming Assessments</h3><p style="margin:0;color:#64748b;font-size:13px">Filter published classes by block, academic week, and day. Scheduled dates are shown when present in the timetable data.</p></div>
            <button type="button" id="lecturer-timetable-refresh" style="padding:9px 12px;border:0;border-radius:8px;background:#4c1d95;color:#fff;font-weight:600">Refresh</button>
          </div>
          <div style="display:flex;gap:12px;align-items:end;flex-wrap:wrap;margin-bottom:16px;padding:14px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px">
            <div style="display:grid;gap:5px"><label for="lecturer-timetable-block" style="font-weight:600;font-size:13px">Block</label><select id="lecturer-timetable-block" style="min-width:150px;padding:9px 12px;border:1px solid #cbd5e1;border-radius:8px"><option value="all">All blocks</option>${blocks.map(b=>`<option value="${esc(b)}" ${b===filters.block?'selected':''}>${esc(b)}</option>`).join('')}</select></div>
            <div style="display:grid;gap:5px"><label for="lecturer-timetable-week" style="font-weight:600;font-size:13px">Week</label><select id="lecturer-timetable-week" style="min-width:160px;padding:9px 12px;border:1px solid #cbd5e1;border-radius:8px"><option value="all">All weeks</option>${weeks.map(w=>`<option value="${esc(w)}" ${w===filters.week?'selected':''}>${esc(/^\\d{4}-W\\d{2}$/.test(w)?w.replace('-W',' · Week '):w)}</option>`).join('')}</select></div>
            <div style="display:grid;gap:5px"><label for="lecturer-timetable-day" style="font-weight:600;font-size:13px">Day</label><select id="lecturer-timetable-day" style="min-width:150px;padding:9px 12px;border:1px solid #cbd5e1;border-radius:8px"><option value="all">All days</option>${days.map(d=>`<option value="${esc(d)}" ${d.toLowerCase()===filters.day.toLowerCase()?'selected':''}>${esc(d)}</option>`).join('')}</select></div>
            <button type="button" id="lecturer-timetable-clear" style="padding:9px 12px;border:1px solid #cbd5e1;border-radius:8px;background:#fff;color:#334155;font-weight:600">Clear filters</button>
          </div>
          ${this.timetableError ? `<p role="alert" style="padding:12px;background:#fff7ed;color:#9a3412;border-radius:8px">${esc(this.timetableError)}</p>` : ''}
          <div style="font-weight:700;margin:14px 0 8px">Published block timetable <span style="font-weight:400;color:#64748b">(${rows.length} classes)</span></div>
          ${rows.length ? `<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;min-width:980px"><thead><tr>${['Date','Week','Day','Time','Unit Code','Unit / Session','Type','Block','Venue','Lecturer'].map(h=>`<th style="padding:10px;text-align:left;background:#f8fafc;border-bottom:1px solid #e2e8f0;white-space:nowrap">${h}</th>`).join('')}</tr></thead><tbody>${sortedRows.map(r=>`<tr>${[
            dateText(r),
            weekOf(r) || '—',
            dayOf(r) || '—',
            [this.timetableValue(r,['start_time','start'],'—'),this.timetableValue(r,['end_time','end'],'')].filter(Boolean).join(' - '),
            this.timetableValue(r,['unit_code','course_code','code'],'—'),
            this.timetableValue(r,['unit_name','course_name','session_name','title'],'—'),
            this.timetableValue(r,['class_type','session_type','type'],'Lecture'),
            blockOf(r) || '—',
            this.timetableValue(r,['venue','room','location','classroom'],'—'),
            this.timetableValue(r,['lecturer_name','lecturer','teacher_name','instructor'],'—')
          ].map(v=>`<td style="padding:10px;border-bottom:1px solid #e2e8f0;vertical-align:top">${esc(v)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>` : `<p style="padding:18px;text-align:center;background:#f8fafc;border-radius:8px;color:#64748b">${this.timetableError ? 'Timetable unavailable until the data service is restored.' : 'No timetable rows match these filters.'}</p>`}
          <div style="font-weight:700;margin:20px 0 8px">Upcoming sessions & exams <span style="font-weight:400;color:#64748b">(${upcoming.length})</span></div>
          ${upcoming.length ? upcoming.map(e=>`<div style="display:flex;gap:12px;align-items:flex-start;padding:12px 0;border-bottom:1px solid #e2e8f0"><div style="font-size:22px">${e.type==='exam'?'📝':'📚'}</div><div style="flex:1"><strong>${esc(e.title)}</strong><div style="font-size:13px;color:#64748b;margin-top:3px">${esc(e.date.toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short',year:'numeric'}))} · ${esc(e.time||'Time TBC')} · ${esc(e.location||'Venue TBC')} · ${esc(e.block||'Block not specified')}</div>${e.description?`<div style="font-size:13px;margin-top:4px">${esc(e.description)}</div>`:''}</div><span style="font-size:12px;font-weight:700;color:${e.type==='exam'?'#047857':'#1d4ed8'}">${e.type==='exam'?'EXAM':'SESSION'}</span></div>`).join('') : '<p style="color:#64748b;padding:12px 0">No upcoming sessions or exams found for this block filter.</p>'}
        `;
        const blockSelect = document.getElementById('lecturer-timetable-block');
        const weekSelect = document.getElementById('lecturer-timetable-week');
        const daySelect = document.getElementById('lecturer-timetable-day');
        const rerender = () => {
            this.timetableFilters = {
                block: blockSelect?.value || 'all',
                week: weekSelect?.value || 'all',
                day: daySelect?.value || 'all'
            };
            this.renderBlockTimetablePanel();
        };
        [blockSelect, weekSelect, daySelect].forEach(el => { if (el) el.onchange = rerender; });
        const clear = document.getElementById('lecturer-timetable-clear');
        if (clear) clear.onclick = () => { this.timetableFilters = {block:'all',week:'all',day:'all'}; this.renderBlockTimetablePanel(); };
        const refresh = document.getElementById('lecturer-timetable-refresh');
        if (refresh) refresh.onclick = async () => {
            refresh.disabled = true; refresh.textContent = 'Loading…';
            await this.loadEvents(); await this.loadBlockTimetable();
            this.renderBlockTimetablePanel(); this.renderCalendar(); this.updateStats(); this.renderUpcomingEvents();
        };
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
        await this.loadBlockTimetable();
        this.renderBlockTimetablePanel();
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
