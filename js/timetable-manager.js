// =====================================================
// STUDENT DASHBOARD - TIMETABLE (USES STUDENT'S ACTUAL BLOCK FROM PROFILE)
// =====================================================

// Initialize timetable on student dashboard
async function initStudentTimetable() {
    console.log('📅 Initializing student timetable...');
    
    const container = document.getElementById('timetable-container');
    const loadingDiv = document.getElementById('timetable-loading');
    const emptyDiv = document.getElementById('timetable-empty');
    
    if (!container) return;
    
    try {
        // Get student's block from ProfileModule
        let studentBlock = null;
        let studentProgram = null;
        let studentName = null;
        
        // Method 1: Check if ProfileModule is initialized
        if (window.profileModule && window.profileModule.userProfile) {
            studentBlock = window.profileModule.userProfile.block || 
                          window.profileModule.userProfile.current_block;
            studentProgram = window.profileModule.userProfile.program;
            studentName = window.profileModule.userProfile.full_name;
            console.log('📌 Got block from ProfileModule:', studentBlock);
        }
        
        // Method 2: Fallback to window.currentUserProfile
        if (!studentBlock && window.currentUserProfile) {
            studentBlock = window.currentUserProfile.block || 
                          window.currentUserProfile.current_block;
            studentProgram = window.currentUserProfile.program;
            studentName = window.currentUserProfile.full_name;
            console.log('📌 Got block from currentUserProfile:', studentBlock);
        }
        
        // Method 3: Direct database query
        if (!studentBlock) {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: profile, error } = await supabase
                    .from('consolidated_user_profiles_table')
                    .select('block, current_block, program, full_name')
                    .eq('user_id', user.id)
                    .single();
                
                if (!error && profile) {
                    studentBlock = profile.block || profile.current_block;
                    studentProgram = profile.program;
                    studentName = profile.full_name;
                    console.log('📌 Got block from direct DB query:', studentBlock);
                }
            }
        }
        
        // If still no block, show error
        if (!studentBlock || studentBlock === 'null' || studentBlock === '') {
            console.error('❌ No block assigned to student');
            showEmptyTimetable('Your block has not been assigned yet. Please contact the administrator to assign your block.');
            return;
        }
        
        // Normalize block name to match timetables table format
        const normalizedBlock = normalizeBlockName(studentBlock);
        
        console.log(`🎓 Student: ${studentName || 'Unknown'}`);
        console.log(`📚 Program: ${studentProgram || 'KRCHN'}`);
        console.log(`📌 STUDENT'S ACTUAL BLOCK: "${studentBlock}" -> Normalized: "${normalizedBlock}"`);
        
        // Update UI to show student's actual block
        const blockTitleSpan = document.getElementById('timetable-block-title');
        const emptyBlockNameSpan = document.getElementById('empty-block-name');
        const currentBlockBadge = document.getElementById('current-block-badge');
        
        if (blockTitleSpan) blockTitleSpan.textContent = studentBlock;
        if (emptyBlockNameSpan) emptyBlockNameSpan.textContent = studentBlock;
        if (currentBlockBadge) currentBlockBadge.innerHTML = `<i class="fas fa-graduation-cap"></i> ${studentBlock}`;
        
        // Fetch timetable for the student's ACTUAL block
        const { data: timetable, error: timetableError } = await supabase
            .from('timetables')
            .select('*')
            .eq('block', normalizedBlock)
            .order('week_number', { ascending: true })
            .order('day_of_week', { ascending: true })
            .order('start_time', { ascending: true });
        
        if (timetableError) {
            console.error('Timetable fetch error:', timetableError);
            showEmptyTimetable('Error loading schedule');
            return;
        }
        
        if (!timetable || timetable.length === 0) {
            console.log(`ℹ️ No timetable found for block: "${normalizedBlock}"`);
            showEmptyTimetable(`No schedule available for ${studentBlock} yet. Please check back later.`);
            return;
        }
        
        console.log(`✅ Loaded ${timetable.length} timetable entries for block: "${normalizedBlock}"`);
        
        // Store in global for week filtering
        window.studentTimetableData = timetable;
        window.currentStudentBlock = normalizedBlock;
        
        // Render timetable
        renderStudentTimetable(timetable, 'all');
        
        // Update next class in quick actions
        updateNextClassCard(timetable);
        
        // Hide loading, show container
        if (loadingDiv) loadingDiv.style.display = 'none';
        if (container) container.style.display = 'block';
        if (emptyDiv) emptyDiv.style.display = 'none';
        
        // Setup week filter buttons
        setupWeekFilterButtons(timetable);
        
    } catch (error) {
        console.error('Error loading timetable:', error);
        showEmptyTimetable('Unable to load your schedule. Please try again later.');
    }
}

// Normalize block name to match timetables table format
function normalizeBlockName(block) {
    if (!block) return 'Block 4';
    
    const blockMap = {
        'introductory': 'Introductory',
        'Introductory': 'Introductory',
        'Introductory Block': 'Introductory',
        
        'block1': 'Block 1',
        'Block1': 'Block 1',
        'Block 1': 'Block 1',
        
        'block2': 'Block 2',
        'Block2': 'Block 2',
        'Block 2': 'Block 2',
        
        'block3': 'Block 3',
        'Block3': 'Block 3',
        'Block 3': 'Block 3',
        
        'block4': 'Block 4',
        'Block4': 'Block 4',
        'Block 4': 'Block 4',
        
        'block5': 'Block 5',
        'Block5': 'Block 5',
        'Block 5': 'Block 5',
        
        'final': 'Final',
        'Final': 'Final',
        'Final Block': 'Final'
    };
    
    const normalized = blockMap[block] || blockMap[block.toLowerCase()] || block;
    console.log(`🔀 Block normalized: "${block}" -> "${normalized}"`);
    return normalized;
}

// Render student timetable
function renderStudentTimetable(timetable, weekFilter = 'all') {
    const container = document.getElementById('timetable-container');
    if (!container) return;
    
    // Filter by week if needed
    let filteredData = timetable;
    if (weekFilter !== 'all') {
        filteredData = timetable.filter(item => item.week_number == weekFilter);
    }
    
    if (filteredData.length === 0) {
        container.innerHTML = `
            <div class="empty-state-small">
                <i class="fas fa-calendar-week"></i>
                <p>No classes scheduled for Week ${weekFilter}</p>
            </div>
        `;
        return;
    }
    
    // Group by day
    const daysOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
    const dayNames = {
        monday: 'Monday', tuesday: 'Tuesday', wednesday: 'Wednesday',
        thursday: 'Thursday', friday: 'Friday'
    };
    
    const grouped = {};
    daysOrder.forEach(day => { grouped[day] = []; });
    
    filteredData.forEach(cls => {
        if (grouped[cls.day_of_week]) {
            grouped[cls.day_of_week].push(cls);
        }
    });
    
    // Sort by time within each day
    Object.keys(grouped).forEach(day => {
        grouped[day].sort((a, b) => a.start_time.localeCompare(b.start_time));
    });
    
    // Build HTML
    let html = `
        <div class="timetable-wrapper">
            <table class="timetable-table">
                <thead>
                    <tr>
                        <th>Day</th>
                        <th>Time</th>
                        <th>Course/Session</th>
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
                    <td class="day-cell"><strong>${dayNames[day]}</strong></td>
                    <td colspan="4" class="no-class-cell">No classes scheduled</td>
                </tr>
            `;
        } else {
            classes.forEach((cls, idx) => {
                const holidayBadge = cls.is_holiday ? '<span class="badge-holiday">🔴 HOLIDAY</span>' : '';
                const examBadge = cls.is_exam ? '<span class="badge-exam">📝 EXAM</span>' : '';
                const pendingBadge = cls.pending_allocation ? '<span class="badge-pending">⏳ Pending</span>' : '';
                
                html += `
                    <tr class="${cls.is_holiday ? 'holiday-row' : ''}">
                        ${idx === 0 ? `<td class="day-cell" rowspan="${classes.length}"><strong>${dayNames[day]}</strong></td>` : ''}
                        <td class="time-cell">${cls.start_time.substring(0, 5)} - ${cls.end_time.substring(0, 5)}</td>
                        <td class="course-cell">
                            <strong>${escapeHtml(cls.session_name || cls.course_name)}</strong>
                            ${holidayBadge}${examBadge}
                            <br><small class="course-code">${escapeHtml(cls.course_name || '')}</small>
                        </td>
                        <td class="lecturer-cell">
                            ${escapeHtml(cls.lecturer_name || 'TBA')}
                            ${pendingBadge}
                        </td>
                        <td class="venue-cell">${escapeHtml(cls.venue || 'TBD')}</td>
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

// Setup week filter buttons
function setupWeekFilterButtons(timetable) {
    const weekBtns = document.querySelectorAll('.week-btn');
    if (!weekBtns.length) return;
    
    // Get unique weeks from timetable
    const uniqueWeeks = [...new Set(timetable.map(item => item.week_number))].sort((a, b) => a - b);
    
    // Update button visibility based on available weeks
    weekBtns.forEach(btn => {
        const weekValue = btn.getAttribute('data-week');
        if (weekValue !== 'all') {
            const weekNum = parseInt(weekValue);
            if (!uniqueWeeks.includes(weekNum)) {
                btn.style.display = 'none';
            } else {
                btn.style.display = 'inline-flex';
            }
        }
    });
    
    // Add click handlers
    weekBtns.forEach(btn => {
        btn.removeEventListener('click', handleWeekFilterClick);
        btn.addEventListener('click', handleWeekFilterClick);
    });
}

// Handle week filter click
function handleWeekFilterClick(e) {
    const btn = e.currentTarget;
    const weekValue = btn.getAttribute('data-week');
    
    // Update active state
    document.querySelectorAll('.week-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    
    // Filter and render
    if (window.studentTimetableData) {
        renderStudentTimetable(window.studentTimetableData, weekValue);
    }
}

// Update next class card in Quick Actions
function updateNextClassCard(timetable) {
    const nextClassCard = document.getElementById('next-class-card');
    if (!nextClassCard) return;
    
    const nextClass = findNextClass(timetable);
    
    if (!nextClass) {
        nextClassCard.style.display = 'none';
        return;
    }
    
    nextClassCard.style.display = 'block';
    
    const nextClassTime = document.getElementById('next-class-time');
    const nextClassName = document.getElementById('next-class-name');
    const nextClassLecturer = document.getElementById('next-class-lecturer');
    const nextClassVenue = document.getElementById('next-class-venue');
    const nextClassNote = document.getElementById('next-class-note');
    
    if (nextClassTime) nextClassTime.innerHTML = `${nextClass.start_time.substring(0, 5)} - ${nextClass.end_time.substring(0, 5)}`;
    if (nextClassName) nextClassName.innerHTML = escapeHtml(nextClass.session_name || nextClass.course_name);
    if (nextClassLecturer) nextClassLecturer.innerHTML = escapeHtml(nextClass.lecturer_name || 'TBA');
    if (nextClassVenue) nextClassVenue.innerHTML = escapeHtml(nextClass.venue || 'TBD');
    
    if (nextClassNote) {
        if (nextClass.isToday) {
            nextClassNote.innerHTML = '<i class="fas fa-hourglass-half"></i> Today\'s upcoming class';
        } else {
            nextClassNote.innerHTML = `<i class="fas fa-calendar-day"></i> Next class on ${nextClass.dayName}`;
        }
    }
}

// Find next upcoming class
function findNextClass(timetable) {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTime = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;
    const currentDayIndex = now.getDay(); // 0=Sunday, 1=Monday, 5=Friday
    
    const dayMap = {1: 'monday', 2: 'tuesday', 3: 'wednesday', 4: 'thursday', 5: 'friday'};
    const dayNameMap = {1: 'Monday', 2: 'Tuesday', 3: 'Wednesday', 4: 'Thursday', 5: 'Friday'};
    
    // Check today's upcoming classes (excluding holidays)
    const currentDay = dayMap[currentDayIndex];
    if (currentDay) {
        const todayClasses = timetable.filter(c => 
            c.day_of_week === currentDay && !c.is_holiday && c.start_time > currentTime
        );
        todayClasses.sort((a, b) => a.start_time.localeCompare(b.start_time));
        
        if (todayClasses.length > 0) {
            return { ...todayClasses[0], isToday: true };
        }
    }
    
    // Check next days
    for (let i = currentDayIndex + 1; i <= 5; i++) {
        const nextDay = dayMap[i];
        if (nextDay) {
            const nextClasses = timetable.filter(c => 
                c.day_of_week === nextDay && !c.is_holiday
            );
            nextClasses.sort((a, b) => a.start_time.localeCompare(b.start_time));
            
            if (nextClasses.length > 0) {
                return { ...nextClasses[0], isToday: false, dayName: dayNameMap[i] };
            }
        }
    }
    
    return null;
}

// Show empty timetable message
function showEmptyTimetable(message) {
    const loadingDiv = document.getElementById('timetable-loading');
    const container = document.getElementById('timetable-container');
    const emptyDiv = document.getElementById('timetable-empty');
    const emptyBlockNameSpan = document.getElementById('empty-block-name');
    
    if (loadingDiv) loadingDiv.style.display = 'none';
    if (container) container.style.display = 'none';
    if (emptyDiv) {
        const msgElement = emptyDiv.querySelector('p');
        if (msgElement) msgElement.innerHTML = message;
        emptyDiv.style.display = 'block';
    }
}

// Helper function to escape HTML
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Initialize when student dashboard loads
document.addEventListener('DOMContentLoaded', function() {
    // Check if we're on student dashboard
    const timetableSection = document.getElementById('timetable-container');
    if (timetableSection) {
        // Wait for profile to load first
        setTimeout(() => {
            initStudentTimetable();
        }, 1500);
    }
});

// Also expose globally
window.initStudentTimetable = initStudentTimetable;
window.renderStudentTimetable = renderStudentTimetable;
