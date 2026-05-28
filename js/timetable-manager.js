// ==================== TIMETABLE MANAGER MODULE ====================
const TimetableManager = {
    currentTimetable: [],
    daysOrder: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
    dayNames: {
        monday: 'Monday', tuesday: 'Tuesday', wednesday: 'Wednesday',
        thursday: 'Thursday', friday: 'Friday'
    },
    
    // Load timetable from Supabase
    async loadTimetable(block = 'Block 4') {
        try {
            const { data, error } = await window.db.supabase
                .from('timetables')
                .select('*')
                .eq('block', block)
                .order('day_of_week', { ascending: true })
                .order('start_time', { ascending: true });
            
            if (error) throw error;
            this.currentTimetable = data || [];
            return this.currentTimetable;
        } catch (error) {
            console.error('Error loading timetable:', error);
            return [];
        }
    },
    
    // Get next upcoming class (for Quick Actions)
    getNextClass() {
        if (!this.currentTimetable.length) return null;
        
        const now = new Date();
        const currentDayIndex = now.getDay();
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        const currentTime = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;
        
        const dayMap = {1: 'monday', 2: 'tuesday', 3: 'wednesday', 4: 'thursday', 5: 'friday'};
        let currentDay = dayMap[currentDayIndex];
        
        // Check today's upcoming classes
        let todayClasses = this.currentTimetable.filter(c => 
            c.day_of_week === currentDay && !c.is_holiday
        );
        
        let upcoming = todayClasses.filter(c => c.start_time > currentTime);
        upcoming.sort((a, b) => a.start_time.localeCompare(b.start_time));
        
        if (upcoming.length > 0) {
            return { type: 'today', class: upcoming[0] };
        }
        
        // Find next day's first class
        for (let i = currentDayIndex + 1; i <= 5; i++) {
            let nextDay = dayMap[i];
            if (nextDay) {
                let nextClasses = this.currentTimetable.filter(c => 
                    c.day_of_week === nextDay && !c.is_holiday
                );
                nextClasses.sort((a, b) => a.start_time.localeCompare(b.start_time));
                if (nextClasses.length > 0) {
                    return { type: 'tomorrow', class: nextClasses[0], day: this.dayNames[nextDay] };
                }
            }
        }
        
        return null;
    },
    
    // Render full timetable
    async renderTimetable(containerId, weekFilter = 'all') {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        await this.loadTimetable('Block 4');
        
        let filteredData = this.currentTimetable;
        if (weekFilter !== 'all') {
            filteredData = this.currentTimetable.filter(c => c.week_number == weekFilter);
        }
        
        // Group by day
        const grouped = {};
        this.daysOrder.forEach(day => { grouped[day] = []; });
        filteredData.forEach(cls => {
            if (grouped[cls.day_of_week]) {
                grouped[cls.day_of_week].push(cls);
            }
        });
        
        // Sort by time
        Object.keys(grouped).forEach(day => {
            grouped[day].sort((a, b) => a.start_time.localeCompare(b.start_time));
        });
        
        let html = `<div class="timetable-container"><table class="timetable-table">
            <thead><tr>
                <th>Day</th><th>Time</th><th>Course/Session</th><th>Lecturer</th><th>Venue</th>
            </tr></thead><tbody>`;
        
        for (const day of this.daysOrder) {
            const classes = grouped[day];
            if (classes.length === 0) {
                html += `<tr><td><strong>${this.dayNames[day]}</strong></td>
                        <td colspan="4" style="color:#94a3b8; text-align:center;">No classes scheduled</td></tr>`;
            } else {
                classes.forEach((cls, idx) => {
                    const holidayBadge = cls.is_holiday ? '<span class="holiday-badge">HOLIDAY</span>' : '';
                    const examBadge = cls.is_exam ? '<span class="exam-badge">EXAM</span>' : '';
                    const pendingBadge = cls.pending_allocation ? '<span class="pending-badge">Pending</span>' : '';
                    
                    html += `<tr>
                        <td>${idx === 0 ? `<strong>${this.dayNames[day]}</strong>` : ''}</td>
                        <td>${cls.start_time} - ${cls.end_time}</td>
                        <td><strong>${cls.session_name || cls.course_name}</strong> ${holidayBadge}${examBadge}<br>
                        <small>${cls.course_name || ''}</small></td>
                        <td>${cls.lecturer_name || 'TBA'} ${pendingBadge}</td>
                        <td>${cls.venue || 'TBD'}</td>
                    </tr>`;
                });
            }
        }
        
        html += `</tbody></table></div>`;
        container.innerHTML = html;
    },
    
    // Update Quick Actions with next class
    updateQuickActions() {
        const nextClass = this.getNextClass();
        const card = document.getElementById('next-class-card');
        
        if (!card) return;
        
        if (nextClass && nextClass.class) {
            const cls = nextClass.class;
            card.style.display = 'block';
            
            document.getElementById('next-class-time').innerHTML = `${cls.start_time} - ${cls.end_time}`;
            document.getElementById('next-class-name').innerHTML = cls.session_name || cls.course_name;
            document.getElementById('next-class-lecturer').innerHTML = cls.lecturer_name || 'TBA';
            document.getElementById('next-class-venue').innerHTML = cls.venue || 'TBD';
            
            const noteSpan = document.getElementById('next-class-note');
            if (nextClass.type === 'today') {
                noteSpan.innerHTML = '<i class="fas fa-hourglass-half"></i> Today\'s upcoming class';
            } else {
                noteSpan.innerHTML = `<i class="fas fa-calendar-day"></i> First class on ${nextClass.day}`;
            }
        } else {
            card.style.display = 'none';
        }
    },
    
    // ========== ADMIN FUNCTIONS ==========
    // Parse CSV data
    parseCSV(csvText) {
        const lines = csvText.split(/\r?\n/);
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        
        const data = [];
        for (let i = 1; i < lines.length; i++) {
            if (!lines[i].trim()) continue;
            
            // Handle quoted values
            let row = [];
            let inQuote = false;
            let current = '';
            for (let char of lines[i]) {
                if (char === '"') {
                    inQuote = !inQuote;
                } else if (char === ',' && !inQuote) {
                    row.push(current.trim());
                    current = '';
                } else {
                    current += char;
                }
            }
            row.push(current.trim());
            
            if (row.length >= 5) {
                const entry = {};
                headers.forEach((h, idx) => {
                    let value = row[idx] || '';
                    value = value.replace(/^"|"$/g, '');
                    entry[h] = value;
                });
                
                data.push({
                    day_of_week: entry.day_of_week?.toLowerCase() || '',
                    week_number: parseInt(entry.week_number) || 1,
                    start_time: entry.start_time || '08:00',
                    end_time: entry.end_time || '10:00',
                    session_name: entry.session_name || entry.course_name || '',
                    course_name: entry.course_name || '',
                    lecturer_name: entry.lecturer_name || '',
                    venue: entry.venue || '',
                    is_holiday: entry.is_holiday === 'TRUE' || entry.is_holiday === 'true',
                    is_exam: entry.is_exam === 'TRUE' || entry.is_exam === 'true',
                    pending_allocation: entry.lecturer_name === 'TBA' || entry.pending_allocation === 'TRUE'
                });
            }
        }
        return data;
    },
    
    // Upload timetable to Supabase
    async uploadTimetable(entries, block = 'Block 4') {
        const enriched = entries.map(entry => ({
            ...entry,
            block: block,
            academic_year: '2026',
            program: 'KRCHN'
        }));
        
        const { data, error } = await window.db.supabase
            .from('timetables')
            .insert(enriched);
        
        if (error) throw error;
        return data;
    },
    
    // Delete all timetable entries for a block
    async clearTimetable(block = 'Block 4') {
        const { error } = await window.db.supabase
            .from('timetables')
            .delete()
            .eq('block', block);
        
        if (error) throw error;
        return true;
    },
    
    // Process uploaded file
    async processUpload(file, block, onProgress) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    if (onProgress) onProgress('Parsing file...', 30);
                    const entries = this.parseCSV(e.target.result);
                    
                    if (entries.length === 0) {
                        throw new Error('No valid data found in file');
                    }
                    
                    if (onProgress) onProgress(`Found ${entries.length} entries, uploading...`, 60);
                    
                    // Clear existing and upload new
                    await this.clearTimetable(block);
                    const result = await this.uploadTimetable(entries, block);
                    
                    if (onProgress) onProgress('Complete!', 100);
                    resolve({ success: true, count: entries.length });
                } catch (error) {
                    reject(error);
                }
            };
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsText(file);
        });
    }
};

window.TimetableManager = TimetableManager;
