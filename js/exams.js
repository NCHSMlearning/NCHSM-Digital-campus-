// exams.js - COMPLETE FINAL FIXED VERSION
// This version correctly displays released exam results (including FAIL with 0-5% scores)
// in the Completed Assessments section instead of showing "Pending Release" or "Missed"

(function() {
    'use strict';
    
    console.log('✅ exams.js - FINAL FIXED VERSION loaded');
    
    class ExamsModule {
        constructor() {
            console.log('🔧 ExamsModule initializing...');
            
            // Define TVET program codes
            this.TVET_PROGRAMS = [
                'DPOTT', 'DCH', 'DHRIT', 'DSL', 'DSW', 'DCJS', 'DHSS', 'DICT', 'DME',
                'CPOTT', 'CCH', 'CHRIT', 'CPC', 'CSL', 'CSW', 'CCJS', 'CAG', 'CHSS', 'CICT',
                'ACH', 'AAG', 'ASW', 'CCA', 'PTE'
            ];
            
            // Store exam data
            this.allExams = [];
            this.currentExams = [];
            this.completedExams = [];
            this.currentFilter = 'all';
            this.releasedResults = new Set();
            this.countdownInterval = null;
            this.gradesMap = new Map(); // Store grades by exam_id
            
            // User data
            this.userProfile = {};
            this.program = 'KRCHN';
            this.programCode = 'KRCHN';
            this.programName = 'KRCHN Nursing';
            this.programType = 'KRCHN';
            this.programLevel = 'KRCHN';
            this.intakeYear = 2025;
            this.userBlock = 'A';
            this.userTerm = 'Term1';
            this.userId = null;
            this.isTVETStudent = false;
            
            // Cache DOM elements
            this.cacheElements();
            
            // Initialize
            this.initializeEventListeners();
            this.updateFilterButtons();
            this.initializeUserData();
            this.setupAutoRefresh();
            this.startCountdownTimer();
        }
        
        startCountdownTimer() {
            if (this.countdownInterval) clearInterval(this.countdownInterval);
            this.countdownInterval = setInterval(() => {
                if (this.currentExams && this.currentExams.length > 0) {
                    this.updateDisplayedCountdowns();
                }
            }, 1000);
        }
        
        updateDisplayedCountdowns() {
            const now = new Date();
            const kenyaNow = new Date(now.getTime() + (3 * 60 * 60 * 1000));
            
            this.currentExams.forEach(exam => {
                if (exam.examStartDateTime && exam.examEndDateTime && exam.actionState === 'available') {
                    if (kenyaNow >= exam.examStartDateTime && kenyaNow <= exam.examEndDateTime) {
                        const timeLeftMs = exam.examEndDateTime - kenyaNow;
                        const minutesLeft = Math.floor(timeLeftMs / 60000);
                        const secondsLeft = Math.floor((timeLeftMs % 60000) / 1000);
                        
                        const rowElement = document.querySelector(`tr[data-exam-id="${exam.id}"]`);
                        if (rowElement) {
                            const timeRemainingSpan = rowElement.querySelector('.time-remaining');
                            if (timeRemainingSpan) {
                                timeRemainingSpan.innerHTML = `<i class="fas fa-hourglass-half"></i> Time left: ${minutesLeft}m ${secondsLeft}s`;
                            }
                        }
                    }
                }
            });
        }
        
        cacheElements() {
            this.currentTable = document.getElementById('current-assessments-table');
            this.completedTable = document.getElementById('completed-assessments-table');
            this.currentEmpty = document.getElementById('current-empty');
            this.completedEmpty = document.getElementById('completed-empty');
            this.currentCount = document.getElementById('current-count');
            this.completedCount = document.getElementById('completed-count');
            this.completedAverage = document.getElementById('completed-average');
            this.currentHeaderCount = document.getElementById('current-assessments-count');
            this.completedHeaderCount = document.getElementById('completed-assessments-count');
            this.overallAverage = document.getElementById('overall-average');
            this.programIndicator = document.getElementById('program-indicator');
        }
        
        initializeUserData() {
            console.log('👤 Initializing user data...');
            
            if (window.db?.currentUserProfile) {
                this.updateUserData();
                this.loadExams();
                return;
            }
            
            // Wait for user data to load
            const checkInterval = setInterval(() => {
                if (window.db?.currentUserProfile) {
                    this.updateUserData();
                    this.loadExams();
                    clearInterval(checkInterval);
                }
            }, 500);
            
            setTimeout(() => {
                if (!this.userId) {
                    console.warn('⚠️ User data timeout, using defaults');
                    this.loadExams();
                }
                clearInterval(checkInterval);
            }, 5000);
        }
        
        updateUserData() {
            if (!window.db?.currentUserProfile) return false;
            
            this.userProfile = window.db.currentUserProfile;
            this.intakeYear = this.userProfile.intake_year || 2025;
            this.userId = window.db.currentUserId;
            
            const programFromProfile = this.userProfile.program || this.userProfile.course || 'KRCHN';
            const programInfo = this.determineProgramType(programFromProfile);
            
            this.programCode = programInfo.code;
            this.programType = programInfo.type;
            this.programLevel = programInfo.level;
            this.isTVETStudent = (this.programType === 'TVET');
            this.programName = this.getProgramDisplayName(programFromProfile);
            
            if (this.isTVETStudent) {
                this.userTerm = this.userProfile.term || this.userProfile.block || 'Term1';
                this.userBlock = null;
            } else {
                this.userBlock = this.userProfile.block || 'A';
                this.userTerm = null;
            }
            
            this.updateProgramIndicator();
            return true;
        }
        
        determineProgramType(programCode) {
            if (!programCode) return { type: 'KRCHN', level: 'KRCHN', code: 'KRCHN' };
            const code = String(programCode).toUpperCase().trim();
            
            if (this.TVET_PROGRAMS.includes(code)) {
                let level = 'CERTIFICATE';
                if (code.startsWith('D')) level = 'DIPLOMA';
                if (code.startsWith('A')) level = 'ARTISAN';
                return { type: 'TVET', level: level, code: code };
            }
            return { type: 'KRCHN', level: 'KRCHN', code: 'KRCHN' };
        }
        
        getProgramDisplayName(programCode) {
            const names = {
                'KRCHN': 'KRCHN Nursing',
                'DPOTT': 'Diploma in Perioperative Theatre Technology',
                'DCH': 'Diploma in Community Health',
                'CPOTT': 'Certificate in Perioperative Theatre Technology',
                'CCH': 'Certificate in Community Health',
            };
            return names[programCode?.toUpperCase()] || programCode || 'KRCHN Nursing';
        }
        
        updateProgramIndicator() {
            if (this.programIndicator) {
                const badgeClass = this.isTVETStudent ? 'badge-tvet' : 'badge-krchn';
                const icon = this.isTVETStudent ? 'fa-tools' : 'fa-graduation-cap';
                const blockTermText = this.isTVETStudent ? `Term: ${this.userTerm}` : `Block: ${this.userBlock}`;
                
                this.programIndicator.innerHTML = `
                    <span class="badge ${badgeClass}">
                        <i class="fas ${icon}"></i>
                        ${this.escapeHtml(this.programName)}
                        <span class="ms-2">${blockTermText}</span>
                    </span>
                `;
            }
        }
        
        setupAutoRefresh() {
            // Refresh when returning from exam
            const returning = sessionStorage.getItem('returningFromExam');
            if (returning === 'true') {
                setTimeout(() => this.loadExams(), 2000);
                sessionStorage.removeItem('returningFromExam');
            }
            
            // Refresh when window gets focus
            window.addEventListener('focus', () => setTimeout(() => this.loadExams(), 500));
        }
        
        initializeEventListeners() {
            const filters = [
                { id: 'view-all-assessments', filter: 'all' },
                { id: 'view-current-only', filter: 'current' },
                { id: 'view-completed-only', filter: 'completed' }
            ];
            
            filters.forEach(({ id, filter }) => {
                const btn = document.getElementById(id);
                if (btn) btn.addEventListener('click', (e) => { e.preventDefault(); this.applyFilter(filter); });
            });
            
            document.getElementById('refresh-assessments')?.addEventListener('click', (e) => {
                e.preventDefault();
                this.loadExams();
            });
            
            document.getElementById('view-transcript')?.addEventListener('click', (e) => {
                e.preventDefault();
                this.showTranscript();
            });
        }
        
        applyFilter(filterType) {
            this.currentFilter = filterType;
            this.updateFilterButtons();
            this.showFilteredSections();
            this.applyDataFilter();
        }
        
        updateFilterButtons() {
            const ids = ['view-all-assessments', 'view-current-only', 'view-completed-only'];
            ids.forEach(id => {
                const btn = document.getElementById(id);
                if (btn) btn.classList.remove('active');
            });
            
            const activeBtn = {
                'all': 'view-all-assessments',
                'current': 'view-current-only',
                'completed': 'view-completed-only'
            }[this.currentFilter];
            
            document.getElementById(activeBtn)?.classList.add('active');
        }
        
        showFilteredSections() {
            const currentSection = document.querySelector('.current-section');
            const completedSection = document.querySelector('.completed-section');
            
            if (!currentSection || !completedSection) return;
            
            switch(this.currentFilter) {
                case 'current':
                    currentSection.style.display = 'block';
                    completedSection.style.display = 'none';
                    break;
                case 'completed':
                    currentSection.style.display = 'none';
                    completedSection.style.display = 'block';
                    break;
                default:
                    currentSection.style.display = 'block';
                    completedSection.style.display = 'block';
            }
        }
        
        applyDataFilter() {
            // CRITICAL FIX: Released exams go to completed section
            this.currentExams = this.allExams.filter(exam => 
                !exam.isCompleted && exam.actionState !== 'expired' && exam.actionState !== 'pending_release' && !exam.isReleased
            );
            
            this.completedExams = this.allExams.filter(exam => 
                exam.isCompleted || exam.actionState === 'expired' || exam.isReleased === true
            );
            
            if (this.currentFilter === 'current') this.completedExams = [];
            if (this.currentFilter === 'completed') this.currentExams = [];
            
            this.displayTables();
            this.updateCounts();
        }
        
        async loadExams() {
            console.log('📥 Loading exams...');
            this.showLoading();
            
            try {
                if (!this.userId && !this.updateUserData()) {
                    setTimeout(() => this.loadExams(), 1000);
                    return;
                }
                
                const supabase = window.db?.supabase;
                if (!supabase) throw new Error('Database not available');
                
                // Fetch exams for this student
                let query = supabase
                    .from('exams_with_courses')
                    .select('*')
                    .eq('intake_year', this.intakeYear)
                    .order('exam_date', { ascending: true });
                
                if (this.isTVETStudent) {
                    query = query.eq('program_type', 'TVET');
                    if (this.userTerm) query = query.eq('block_term', this.userTerm);
                } else {
                    query = query.eq('program_type', 'KRCHN');
                    if (this.userBlock) query = query.eq('block_term', this.userBlock);
                }
                
                const { data: exams, error: examsError } = await query;
                if (examsError) throw examsError;
                
                console.log(`📊 Found ${exams?.length || 0} exams`);
                
                // Fetch grades for this student
                let grades = [];
                if (this.userId) {
                    const { data: gradesData, error: gradesError } = await supabase
                        .from('exam_grades')
                        .select('*')
                        .eq('student_id', this.userId)
                        .eq('question_id', '00000000-0000-0000-0000-000000000000');
                    
                    if (!gradesError && gradesData) {
                        grades = gradesData;
                        console.log(`📊 Found ${grades.length} grade records`);
                        
                        // Build grades map
                        this.gradesMap.clear();
                        grades.forEach(g => this.gradesMap.set(g.exam_id, g));
                    }
                }
                
                // Fetch released results
                const gradeIds = grades.map(g => g.id);
                this.releasedResults.clear();
                
                if (gradeIds.length > 0) {
                    const { data: released } = await supabase
                        .from('released_exam_results')
                        .select('result_id')
                        .in('result_id', gradeIds);
                    
                    if (released) {
                        this.releasedResults = new Set(released.map(r => String(r.result_id)));
                        console.log(`✅ Loaded ${this.releasedResults.size} released results`);
                    }
                }
                
                this.processExamsData(exams || [], grades);
                this.applyDataFilter();
                this.dispatchDashboardEvent();
                
                console.log('✅ Exams loaded successfully');
                
            } catch (error) {
                console.error('❌ Error loading exams:', error);
                this.showError(error.message);
            }
        }
        
        processExamsData(exams, grades) {
            const gradeMap = new Map();
            grades.forEach(grade => gradeMap.set(grade.exam_id, grade));
            
            // Group exams by name and intake year
            const examGroups = new Map();
            
            exams.forEach(exam => {
                const groupKey = `${exam.exam_name || exam.title || 'Untitled'}_${exam.intake_year}`;
                
                if (!examGroups.has(groupKey)) {
                    examGroups.set(groupKey, {
                        id: exam.id,
                        exam_name: exam.exam_name || exam.title || 'Untitled Exam',
                        exam_type: exam.exam_type,
                        intake_year: exam.intake_year,
                        program_type: exam.program_type,
                        block_term: exam.block_term,
                        exam_date: exam.exam_date,
                        exam_start_time: exam.exam_start_time,
                        duration_minutes: exam.duration_minutes || 40,
                        exam_link: exam.exam_link || exam.online_link,
                        course: exam.course_name || exam.course || 'General',
                        course_levels: new Set(),
                        blocks: new Set(),
                        programs: new Set(),
                        grade: null
                    });
                }
                
                const group = examGroups.get(groupKey);
                if (exam.course_name) group.course_levels.add(exam.course_name);
                if (exam.block_term) group.blocks.add(exam.block_term);
                
                const grade = gradeMap.get(exam.id);
                if (grade && !group.grade) group.grade = grade;
            });
            
            // Current Kenya time (UTC+3)
            const now = new Date();
            const kenyaNow = new Date(now.getTime() + (3 * 60 * 60 * 1000));
            
            this.allExams = Array.from(examGroups.values()).map(group => {
                const grade = group.grade;
                const gradeId = grade?.id;
                const isReleased = gradeId ? this.releasedResults.has(String(gradeId)) : false;
                
                const combinedCourse = Array.from(group.course_levels).join(' · ') || group.course || 'General';
                const combinedBlock = Array.from(group.blocks).join(' · ') || group.block_term || 'General';
                
                const totalPercentage = grade?.total_score ? parseFloat(grade.total_score) : null;
                const examType = (group.exam_type || '').toUpperCase();
                const isCatExam = examType.includes('CAT');
                
                // Parse exam date/time
                let examStartDateTime = null;
                let examEndDateTime = null;
                let formattedExamDateTime = 'TBA';
                let countdownText = '';
                let examStatus = 'upcoming';
                let canStart = false;
                let timeRemainingMs = 0;
                
                if (group.exam_date) {
                    const [year, month, day] = group.exam_date.split('-');
                    
                    if (group.exam_start_time) {
                        const [hours, minutes] = group.exam_start_time.split(':');
                        examStartDateTime = new Date(Date.UTC(year, month-1, day, hours, minutes, 0));
                        examStartDateTime = new Date(examStartDateTime.getTime() + (3 * 60 * 60 * 1000));
                    } else {
                        examStartDateTime = new Date(Date.UTC(year, month-1, day, 0, 0, 0));
                        examStartDateTime = new Date(examStartDateTime.getTime() + (3 * 60 * 60 * 1000));
                    }
                    
                    examEndDateTime = new Date(examStartDateTime.getTime() + (group.duration_minutes || 40) * 60000);
                    
                    // Format for display
                    const dateOpts = { month: 'short', day: 'numeric', year: 'numeric' };
                    formattedExamDateTime = new Date(group.exam_date).toLocaleDateString('en-US', dateOpts);
                    
                    if (group.exam_start_time) {
                        const [hours, minutes] = group.exam_start_time.split(':');
                        const hour12 = parseInt(hours) % 12 || 12;
                        const ampm = parseInt(hours) >= 12 ? 'PM' : 'AM';
                        formattedExamDateTime += ` at ${hour12}:${minutes} ${ampm}`;
                    }
                }
                
                // Determine exam status based on current time
                if (examStartDateTime && examEndDateTime) {
                    if (kenyaNow < examStartDateTime) {
                        const diffMs = examStartDateTime - kenyaNow;
                        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
                        const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
                        
                        if (diffHours > 24) {
                            const diffDays = Math.floor(diffHours / 24);
                            countdownText = `in ${diffDays} day${diffDays > 1 ? 's' : ''}`;
                        } else if (diffHours > 0) {
                            countdownText = `in ${diffHours}h ${diffMinutes}m`;
                        } else {
                            countdownText = `in ${diffMinutes} min`;
                        }
                        examStatus = 'upcoming';
                        canStart = false;
                        
                    } else if (kenyaNow >= examStartDateTime && kenyaNow <= examEndDateTime) {
                        examStatus = 'available';
                        timeRemainingMs = examEndDateTime - kenyaNow;
                        canStart = true;
                        
                    } else if (kenyaNow > examEndDateTime) {
                        examStatus = 'expired';
                        canStart = false;
                    }
                }
                
                const hasTaken = grade && (grade.result_status === 'PASS' || grade.result_status === 'FAIL');
                const hasValidLink = group.exam_link && group.exam_link.startsWith('http');
                
                // ========== CRITICAL: Determine final state for display ==========
                let finalStatus = examStatus;
                let finalCanStart = false;
                let isCompleted = false;
                let displayPercentage = null;
                let gradeText = 'Not Started';
                let gradeClass = 'pending';
                let actionMessage = '';
                let buttonText = '';
                
                // RELEASED RESULTS (PASS or FAIL) - GO TO COMPLETED SECTION
                if (hasTaken && isReleased) {
                    displayPercentage = totalPercentage !== null ? totalPercentage : 0;
                    isCompleted = true;
                    finalStatus = 'completed';
                    finalCanStart = false;
                    actionMessage = '✅ Completed';
                    buttonText = 'View Results';
                    
                    if (totalPercentage !== null && totalPercentage >= 85) {
                        gradeText = 'Distinction';
                        gradeClass = 'distinction';
                    } else if (totalPercentage !== null && totalPercentage >= 75) {
                        gradeText = 'Credit';
                        gradeClass = 'credit';
                    } else if (totalPercentage !== null && totalPercentage >= 60) {
                        gradeText = 'Pass';
                        gradeClass = 'pass';
                    } else if (totalPercentage !== null) {
                        gradeText = 'Fail';
                        gradeClass = 'fail';
                    } else {
                        gradeText = 'Completed';
                        gradeClass = 'completed';
                    }
                }
                // TAKEN BUT NOT RELEASED YET
                else if (hasTaken && !isReleased) {
                    finalStatus = 'pending_release';
                    finalCanStart = false;
                    isCompleted = false;
                    actionMessage = '⏳ Pending Release';
                    buttonText = 'Pending';
                    gradeText = 'Pending Release';
                    gradeClass = 'pending';
                }
                // AVAILABLE EXAM
                else if (examStatus === 'available' && !hasTaken && hasValidLink) {
                    finalStatus = 'available';
                    finalCanStart = true;
                    isCompleted = false;
                    actionMessage = '🟢 Available Now';
                    buttonText = 'Start Exam';
                }
                // UPCOMING EXAM
                else if (examStatus === 'upcoming' && !hasTaken) {
                    finalStatus = 'upcoming';
                    finalCanStart = false;
                    isCompleted = false;
                    actionMessage = countdownText || 'Coming Soon';
                    buttonText = countdownText || 'Coming Soon';
                }
                // EXPIRED (NOT TAKEN)
                else if (examStatus === 'expired' && !hasTaken) {
                    finalStatus = 'expired';
                    finalCanStart = false;
                    isCompleted = true;
                    actionMessage = '🔒 Exam Closed';
                    buttonText = 'Missed';
                    gradeText = 'Missed';
                    gradeClass = 'missed';
                }
                // NO LINK
                else if (!hasValidLink) {
                    finalStatus = 'no_link';
                    finalCanStart = false;
                    isCompleted = false;
                    actionMessage = '⚠️ Link coming soon';
                    buttonText = 'Not Available';
                }
                
                // Format score displays
                let catDisplay = '--';
                if (isReleased && displayPercentage !== null) {
                    catDisplay = `${displayPercentage.toFixed(1)}%`;
                }
                
                return {
                    ...group,
                    id: group.id,
                    exam_name: group.exam_name,
                    exam_type: group.exam_type || (isCatExam ? 'CAT' : 'EXAM'),
                    isCatExam,
                    isCompleted: isCompleted,
                    isReleased: isReleased,
                    hasGrade: hasTaken,
                    totalPercentage: displayPercentage,
                    gradeText: gradeText,
                    gradeClass: gradeClass,
                    hasValidLink: hasValidLink,
                    canTakeExam: finalCanStart,
                    actionState: finalStatus,
                    actionMessage: actionMessage,
                    buttonText: buttonText,
                    examLink: group.exam_link,
                    examStartDateTime: examStartDateTime,
                    examEndDateTime: examEndDateTime,
                    timeRemainingMs: timeRemainingMs,
                    countdownText: countdownText,
                    catDisplay: catDisplay,
                    formattedExamDateTime: formattedExamDateTime,
                    formattedGradedDate: grade?.graded_at ? new Date(grade.graded_at).toLocaleDateString() : '--',
                    course: combinedCourse,
                    block_term: combinedBlock
                };
            });
            
            const currentCount = this.allExams.filter(e => !e.isCompleted && e.actionState !== 'expired' && e.actionState !== 'pending_release').length;
            const completedCount = this.allExams.filter(e => e.isCompleted || e.isReleased === true).length;
            console.log(`✅ Processed: ${currentCount} current, ${completedCount} completed`);
        }
        
        displayTables() {
            this.displayCurrentTable();
            this.displayCompletedTable();
            this.updateCounts();
            this.updateEmptyStates();
        }
        
        displayCurrentTable() {
            if (!this.currentTable) return;
            
            const activeExams = this.currentExams.filter(e => !e.isCompleted && e.actionState !== 'expired');
            
            if (activeExams.length === 0) {
                this.currentTable.innerHTML = '';
                return;
            }
            
            const html = activeExams.map(exam => {
                let actionHtml = '';
                let timeHtml = '';
                
                if (exam.actionState === 'available' && exam.canTakeExam && exam.hasValidLink) {
                    actionHtml = `<a href="${exam.examLink}" target="_blank" class="exam-link-btn btn-primary" onclick="sessionStorage.setItem('returningFromExam', 'true')" style="display: inline-block; padding: 8px 20px; background: #38A169; color: white; border-radius: 8px; text-decoration: none; font-weight: 600;">
                                    <i class="fas fa-external-link-alt"></i> Start Exam
                                </a>`;
                    
                    if (exam.timeRemainingMs > 0) {
                        const mins = Math.floor(exam.timeRemainingMs / 60000);
                        const secs = Math.floor((exam.timeRemainingMs % 60000) / 1000);
                        timeHtml = `<div class="time-remaining" style="font-size: 0.7rem; color: #059669; margin-top: 5px;">
                                        <i class="fas fa-hourglass-half"></i> Time left: ${mins}m ${secs}s
                                    </div>`;
                    }
                } else {
                    actionHtml = `<span class="exam-link-btn btn-secondary" style="display: inline-block; padding: 8px 20px; background: #6B7280; color: white; border-radius: 8px; cursor: not-allowed;">
                                    <i class="fas fa-clock"></i> ${exam.buttonText || 'Coming Soon'}
                                </span>`;
                }
                
                const statusHtml = `<span class="status-badge ${exam.gradeClass}">${exam.gradeText}</span>`;
                
                const assessmentCell = `
                    <div class="assessment-info-box">
                        <div class="assessment-name">
                            <strong>${this.escapeHtml(exam.exam_name)}</strong>
                            <span class="${exam.isCatExam ? 'badge-cat' : 'badge-final'}">${exam.isCatExam ? 'CAT' : 'Exam'}</span>
                        </div>
                        <div class="assessment-details">
                            <span class="detail-item"><i class="fas fa-book"></i> ${this.escapeHtml(exam.course)}</span>
                            <span class="detail-item"><i class="fas fa-layer-group"></i> ${exam.block_term}</span>
                        </div>
                        ${exam.formattedExamDateTime !== 'TBA' ? `<div class="exam-datetime"><i class="fas fa-calendar-clock"></i> ${exam.formattedExamDateTime}</div>` : ''}
                        ${timeHtml}
                    </div>
                `;
                
                return `
                    <tr class="assessment-row" data-exam-id="${exam.id}">
                        <td class="assessment-cell">${assessmentCell}</td>
                        <td class="text-center date-cell">${exam.formattedExamDateTime}</td>
                        <td class="text-center status-cell">${statusHtml}</td>
                        <td class="text-center">${exam.catDisplay}</td>
                        <td class="text-center">--</td>
                        <td class="text-center">--</td>
                        <td class="text-center total-cell">${exam.totalPercentage !== null ? `${exam.totalPercentage.toFixed(1)}%` : '--'}</td>
                        <td class="text-center action-cell">${actionHtml}</td>
                    </tr>
                `;
            }).join('');
            
            this.currentTable.innerHTML = html;
        }
        
        displayCompletedTable() {
            if (!this.completedTable) return;
            
            // CRITICAL: Only show RELEASED exams in completed section
            const releasedExams = this.completedExams.filter(exam => exam.isReleased === true);
            
            if (releasedExams.length === 0) {
                this.completedTable.innerHTML = '';
                return;
            }
            
            const html = releasedExams.map(exam => {
                const percentage = exam.totalPercentage !== null ? exam.totalPercentage.toFixed(1) : '0';
                const displayPercentage = `${percentage}%`;
                
                const assessmentCell = `
                    <div class="assessment-info-box">
                        <div class="assessment-name">
                            <strong>${this.escapeHtml(exam.exam_name)}</strong>
                            <span class="${exam.isCatExam ? 'badge-cat' : 'badge-final'}">${exam.isCatExam ? 'CAT' : 'Exam'}</span>
                        </div>
                        <div class="assessment-details">
                            <span class="detail-item"><i class="fas fa-book"></i> ${this.escapeHtml(exam.course)}</span>
                            <span class="detail-item"><i class="fas fa-layer-group"></i> ${exam.block_term}</span>
                        </div>
                    </div>
                `;
                
                return `
                    <tr class="assessment-row">
                        <td class="assessment-cell">${assessmentCell}</td>
                        <td class="text-center date-cell">${exam.formattedGradedDate}</td>
                        <td class="text-center status-cell">
                            <span class="grade-badge ${exam.gradeClass}">${exam.gradeText}</span>
                        </td>
                        <td class="text-center">${displayPercentage}</td>
                        <td class="text-center">--</td>
                        <td class="text-center">--</td>
                        <td class="text-center total-cell"><strong>${displayPercentage}</strong></td>
                        <td class="text-center grade-cell">
                            <button class="exam-link-btn btn-success" onclick="window.examsModule?.viewExamResults(${exam.id})" style="padding: 8px 16px; background: #10B981; color: white; border-radius: 8px; border: none; cursor: pointer;">
                                <i class="fas fa-chart-line"></i> View Results
                            </button>
                        </td>
                    </tr>
                `;
            }).join('');
            
            this.completedTable.innerHTML = html;
        }
        
        async viewExamResults(examId) {
            try {
                const supabase = window.db?.supabase;
                if (!supabase) return;
                
                const { data: grade, error } = await supabase
                    .from('exam_grades')
                    .select('*')
                    .eq('student_id', this.userId)
                    .eq('exam_id', examId)
                    .eq('question_id', '00000000-0000-0000-0000-000000000000')
                    .single();
                
                if (error) throw error;
                
                const exam = this.allExams.find(e => e.id === examId);
                const percentage = grade.total_score ? parseFloat(grade.total_score) : 0;
                
                let gradeText = '';
                if (percentage >= 85) gradeText = 'DISTINCTION';
                else if (percentage >= 75) gradeText = 'CREDIT';
                else if (percentage >= 60) gradeText = 'PASS';
                else gradeText = 'FAIL';
                
                alert(`📊 EXAM RESULTS\n\n` +
                      `Exam: ${exam?.exam_name}\n` +
                      `Score: ${grade.marks || 0} marks\n` +
                      `Percentage: ${percentage}%\n` +
                      `Grade: ${gradeText}\n` +
                      `Released: ${grade.graded_at ? new Date(grade.graded_at).toLocaleDateString() : 'N/A'}`);
                
            } catch (error) {
                console.error('Error:', error);
                alert('Unable to load exam results. Please try again.');
            }
        }
        
        updateCounts() {
            const currentCount = this.currentExams.length;
            const completedCount = this.completedExams.filter(e => e.isReleased === true).length;
            
            if (this.currentCount) this.currentCount.textContent = `${currentCount} pending`;
            if (this.completedCount) this.completedCount.textContent = `${completedCount} completed`;
            if (this.currentHeaderCount) this.currentHeaderCount.textContent = currentCount;
            if (this.completedHeaderCount) this.completedHeaderCount.textContent = completedCount;
            
            // Calculate average for released exams only
            const scoredExams = this.completedExams.filter(e => e.isReleased === true && e.totalPercentage !== null);
            if (scoredExams.length > 0) {
                const total = scoredExams.reduce((sum, e) => sum + e.totalPercentage, 0);
                const avg = total / scoredExams.length;
                if (this.completedAverage) this.completedAverage.textContent = `Average: ${avg.toFixed(1)}%`;
                if (this.overallAverage) this.overallAverage.textContent = `${avg.toFixed(1)}%`;
            } else {
                if (this.completedAverage) this.completedAverage.textContent = 'Average: --';
                if (this.overallAverage) this.overallAverage.textContent = '--';
            }
        }
        
        updateEmptyStates() {
            if (this.currentEmpty) this.currentEmpty.style.display = this.currentExams.length === 0 ? 'block' : 'none';
            if (this.completedEmpty) this.completedEmpty.style.display = this.completedExams.filter(e => e.isReleased === true).length === 0 ? 'block' : 'none';
        }
        
        showTranscript() {
            const releasedExams = this.completedExams.filter(e => e.isReleased === true && e.totalPercentage !== null);
            if (releasedExams.length === 0) {
                alert('No released results available for transcript yet.');
                return;
            }
            const avg = releasedExams.reduce((sum, e) => sum + e.totalPercentage, 0) / releasedExams.length;
            alert(`📊 Transcript Summary\n\nCompleted Exams: ${releasedExams.length}\nAverage Score: ${avg.toFixed(1)}%\n\nContact registrar for official transcript.`);
        }
        
        showLoading() {
            const loadingHtml = `<tr class="loading"><td colspan="8"><div class="loading-content"><div class="loading-spinner"></div><p>Loading assessments...</p></div></td></tr>`;
            if (this.currentTable) this.currentTable.innerHTML = loadingHtml;
            if (this.completedTable) this.completedTable.innerHTML = loadingHtml;
        }
        
        showError(message) {
            const errorHtml = `<tr class="error"><td colspan="8"><div class="error-content"><i class="fas fa-exclamation-circle"></i><p>${message}</p><button onclick="window.examsModule?.refresh()" class="btn btn-sm">Retry</button></div></td></tr>`;
            if (this.currentTable) this.currentTable.innerHTML = errorHtml;
            if (this.completedTable) this.completedTable.innerHTML = errorHtml;
        }
        
        escapeHtml(str) {
            if (!str) return '';
            const div = document.createElement('div');
            div.textContent = str;
            return div.innerHTML;
        }
        
        dispatchDashboardEvent() {
            document.dispatchEvent(new CustomEvent('examsModuleReady', { detail: { count: this.allExams.length } }));
            window.examsData = { allExams: this.allExams, loaded: true };
        }
        
        refresh() {
            this.loadExams();
        }
    }
    
    // Initialize
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => { window.examsModule = new ExamsModule(); });
    } else {
        window.examsModule = new ExamsModule();
    }
    
    window.loadExams = () => window.examsModule?.refresh();
    window.refreshAssessments = () => window.examsModule?.refresh();
    
    console.log('✅ exams.js FINAL FIXED VERSION ready - Released results will show in Completed section!');
})();
