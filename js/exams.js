// js/exams.js - Exams Management Module (with debug logging)
class ExamsModule {
    constructor() {
        console.log('🔧 ExamsModule constructor called');
        // Removed supabaseClient parameter since we'll use getSupabaseClient()
        this.userId = null;
        this.userProfile = null;
        this.cachedExams = [];
        
        // Exams elements
        this.examTypeFilter = document.getElementById('exam-type-filter');
        this.examsTable = document.getElementById('exams-table');
        
        console.log('📋 Element references:', {
            examTypeFilter: !!this.examTypeFilter,
            examsTable: !!this.examsTable
        });
        
        // Transcript modal elements
        this.transcriptModal = document.getElementById('transcript-modal');
        this.transcriptExamName = document.getElementById('transcript-exam-name');
        this.transcriptCat1 = document.getElementById('transcript-cat1');
        this.transcriptCat2 = document.getElementById('transcript-cat2');
        this.transcriptFinal = document.getElementById('transcript-final');
        this.transcriptTotal = document.getElementById('transcript-total');
        this.transcriptStatus = document.getElementById('transcript-status');
        
        this.lecturerCache = {};
        
        this.initializeElements();
    }
    
    initializeElements() {
        console.log('🔌 initializeElements called');
        // Setup event listeners
        if (this.examTypeFilter) {
            console.log('✅ Added event listener to examTypeFilter');
            this.examTypeFilter.addEventListener('change', () => {
                console.log('🔄 Exam filter changed to:', this.examTypeFilter.value);
                this.loadExams();
            });
        } else {
            console.warn('⚠️ examTypeFilter element not found');
        }
        
        // Close transcript modal buttons
        document.querySelectorAll('#closeTranscriptBtn, #closeTranscriptModalBtn').forEach(btn => {
            if (btn) {
                btn.addEventListener('click', () => {
                    console.log('❌ Closing transcript modal');
                    this.closeTranscriptModal();
                });
            }
        });
        
        // Close modal when clicking outside
        if (this.transcriptModal) {
            this.transcriptModal.addEventListener('click', (e) => {
                if (e.target === this.transcriptModal) {
                    console.log('👆 Closing transcript modal (outside click)');
                    this.closeTranscriptModal();
                }
            });
        }
    }
    
    // Initialize with user ID and profile
    initialize() {
        console.log('🚀 ExamsModule.initialize() called');
        // Get user info from global functions
        this.userId = getCurrentUserId();
        this.userProfile = getUserProfile();
        
        console.log('👤 User data:', {
            userId: this.userId,
            userProfile: this.userProfile ? 'Loaded' : 'Missing'
        });
        
        if (this.userId && this.userProfile) {
            console.log('✅ User data available, loading exams...');
            this.loadExams();
        } else {
            console.error('❌ Missing user data:', {
                userId: this.userId,
                userProfile: !!this.userProfile
            });
        }
    }
    
    // Get Supabase client
    getSupabaseClient() {
        const client = window.supabaseClient || getSupabaseClient();
        console.log('🔌 Supabase client:', client ? 'Available' : 'Missing');
        return client;
    }
    
    // Load exams and grades
    async loadExams() {
        console.log('📥 loadExams() started');
        
        if (!this.examsTable) {
            console.error('❌ examsTable element not found!');
            return;
        }
        
        this.showLoading(this.examsTable, 'Loading your exams and grades...');
        console.log('⏳ Loading indicator shown');
        
        if (!this.userProfile) {
            console.log('🔄 Re-fetching user profile');
            this.userProfile = getUserProfile();
        }
        
        if (!this.userId) {
            console.log('🔄 Re-fetching user ID');
            this.userId = getCurrentUserId();
        }
        
        const program = this.userProfile?.program || this.userProfile?.department;
        const block = this.userProfile?.block;
        const intakeYear = this.userProfile?.intake_year;
        const studentId = this.userId;
        
        console.log('🎯 Query parameters:', {
            program,
            block,
            intakeYear,
            studentId,
            userProfileKeys: Object.keys(this.userProfile || {})
        });
        
        if (!program || !intakeYear) {
            console.error('❌ Missing program or intake year:', {
                program: program || 'undefined',
                intakeYear: intakeYear || 'undefined'
            });
            this.examsTable.innerHTML = `<tr><td colspan="9">Missing program or intake year info. Cannot load exams.</td></tr>`;
            this.cachedExams = [];
            return;
        }
        
        try {
            console.log('📡 Fetching exams from Supabase...');
            // Fetch exams for this student's program
            const { data: exams, error: examsError } = await this.getSupabaseClient()
                .from('exams_with_courses')
                .select(`
                    id,
                    exam_name,
                    exam_type,  
                    exam_date,
                    status,
                    block_term,
                    program_type,
                    exam_link,
                    course_name
                `)
                .or(`program_type.eq.${program},program_type.eq.General`)
                .or(`block_term.eq.${block},block_term.is.null,block_term.eq.General`)
                .eq('intake_year', intakeYear)
                .order('exam_date', { ascending: true });
            
            if (examsError) {
                console.error('❌ Error fetching exams:', examsError);
                throw examsError;
            }
            
            console.log(`✅ Fetched ${exams?.length || 0} exams:`, exams);
            
            // Fetch overall grades
            console.log('📡 Fetching grades from Supabase...');
            const { data: grades, error: gradesError } = await this.getSupabaseClient()
                .from('exam_grades')
                .select(`
                    exam_id,
                    student_id,
                    cat_1_score,
                    cat_2_score,
                    exam_score,
                    total_score,
                    result_status,
                    marks,
                    graded_by,
                    graded_at
                `)
                .eq('student_id', studentId)
                .eq('question_id', '00000000-0000-0000-0000-000000000000')
                .order('graded_at', { ascending: false });
            
            if (gradesError) {
                console.error('❌ Error fetching grades:', gradesError);
                throw gradesError;
            }
            
            console.log(`✅ Fetched ${grades?.length || 0} grades:`, grades);
            
            // Combine exams with their grades
            this.cachedExams = exams.map(exam => {
                const grade = grades?.find(g => String(g.exam_id) === String(exam.id));
                const examType = exam.exam_type || '';
                
                let resultStatus = 'Scheduled';
                let displayStatus = 'Scheduled';
                let calculatedPercentage = null;
                
                if (grade) {
                    console.log(`📊 Processing grade for exam ${exam.id}:`, grade);
                    
                    // Calculate percentage consistently
                    if (grade.total_score !== null && grade.total_score !== undefined) {
                        calculatedPercentage = Number(grade.total_score);
                        console.log(`📐 Using total_score: ${calculatedPercentage}%`);
                    } else {
                        // Calculate from CAT scores if total_score not available
                        if (examType.includes('CAT_1') || examType === 'CAT' || examType === 'CAT_1') {
                            if (grade.cat_1_score !== null) {
                                calculatedPercentage = (grade.cat_1_score / 30) * 100;
                                console.log(`📐 Calculated CAT1 percentage: ${calculatedPercentage}%`);
                            }
                        } else if (examType.includes('CAT_2') || examType === 'CAT_2') {
                            if (grade.cat_2_score !== null) {
                                calculatedPercentage = (grade.cat_2_score / 30) * 100;
                                console.log(`📐 Calculated CAT2 percentage: ${calculatedPercentage}%`);
                            }
                        } else if (examType === 'EXAM' || examType.includes('EXAM') || examType.includes('Final')) {
                            if (grade.cat_1_score !== null && grade.cat_2_score !== null && grade.exam_score !== null) {
                                const totalMarks = grade.cat_1_score + grade.cat_2_score + grade.exam_score;
                                calculatedPercentage = (totalMarks / 100) * 100;
                                console.log(`📐 Calculated Final exam percentage: ${calculatedPercentage}%`);
                            } else if (grade.marks) {
                                try {
                                    const marksData = typeof grade.marks === 'string' ? JSON.parse(grade.marks) : grade.marks;
                                    if (marksData.percentage !== undefined) {
                                        calculatedPercentage = marksData.percentage;
                                        console.log(`📐 Using marks JSON percentage: ${calculatedPercentage}%`);
                                    }
                                } catch (e) {
                                    console.warn('⚠️ Error parsing marks JSON:', e);
                                }
                            }
                        }
                    }
                    
                    // Determine PASS/FAIL based on 60% threshold
                    if (calculatedPercentage !== null) {
                        displayStatus = calculatedPercentage >= 60 ? 'PASS' : 'FAIL';
                        resultStatus = 'Final';
                        console.log(`🎯 Exam ${exam.id}: ${calculatedPercentage}% = ${displayStatus}`);
                    } else {
                        if (grade.result_status === 'Final') {
                            displayStatus = 'Graded';
                            resultStatus = 'Final';
                        } else {
                            displayStatus = grade.result_status || 'Graded';
                            resultStatus = grade.result_status || 'Graded';
                        }
                        console.log(`🎯 Exam ${exam.id}: No percentage, using ${displayStatus}`);
                    }
                } else {
                    console.log(`📭 No grade found for exam ${exam.id}`);
                }
                
                return { 
                    ...exam, 
                    grade: grade || null,
                    display_status: displayStatus,
                    result_status: resultStatus,
                    calculated_percentage: calculatedPercentage
                };
            });
            
            console.log('💾 Cached exams:', this.cachedExams);
            
            // Make exams data globally accessible
            window.cachedExams = this.cachedExams;
            console.log('🌐 Set window.cachedExams');
            
            // Filter by dropdown
            const filter = this.examTypeFilter?.value || 'all';
            let filteredExams = this.cachedExams;
            
            console.log(`🔍 Filter type: ${filter}, Total exams: ${this.cachedExams.length}`);
            
            if (filter === 'CAT') {
                filteredExams = this.cachedExams.filter(e => {
                    const examType = e.exam_type || '';
                    const examName = e.exam_name || '';
                    return examType.includes('CAT') || 
                           examName.toLowerCase().includes('cat') ||
                           examType === 'CAT_1' || 
                           examType === 'CAT_2';
                });
                console.log(`🔍 Filtered to ${filteredExams.length} CAT exams`);
            } else if (filter === 'Final') {
                filteredExams = this.cachedExams.filter(e => {
                    const examType = e.exam_type || '';
                    const examName = e.exam_name || '';
                    return examType === 'EXAM' || 
                           examName.toLowerCase().includes('final') ||
                           examName.toLowerCase().includes('exam');
                });
                console.log(`🔍 Filtered to ${filteredExams.length} Final exams`);
            }
            
            // Display exams table
            console.log('🖥️ Displaying exams table with', filteredExams.length, 'exams');
            this.displayExamsTable(filteredExams);
            
        } catch (error) {
            console.error('❌ Failed to load exams:', error);
            this.showError(this.examsTable, `Error loading exams: ${error.message}`);
            this.cachedExams = [];
            
            this.examsTable.innerHTML = `
                <tr>
                    <td colspan="9" style="color: #DC2626; padding: 20px; text-align: center;">
                        Error loading exams: ${error.message}
                        <br><br>
                        <button onclick="location.reload()" class="profile-button">
                            <i class="fas fa-redo"></i> Reload Page
                        </button>
                    </td>
                </tr>
            `;
        }
    }
    
    // Display exams in table
    displayExamsTable(exams) {
        console.log('🎨 displayExamsTable called with', exams?.length, 'exams');
        
        if (!this.examsTable) {
            console.error('❌ examsTable element not found in displayExamsTable!');
            return;
        }
        
        this.examsTable.innerHTML = '';
        
        if (!exams || exams.length === 0) {
            console.log('📭 No exams to display');
            this.examsTable.innerHTML = `
                <tr>
                    <td colspan="9" style="padding: 40px; text-align: center; color: #6B7280;">
                        <i class="fas fa-clipboard-list" style="font-size: 2rem; margin-bottom: 10px; display: block;"></i>
                        <h3>No Exams Found</h3>
                        <p>No exams match your current filter.</p>
                        <p><small>Debug: Found ${exams?.length || 0} exams</small></p>
                        <button onclick="resetExamFilter()" class="profile-button" style="margin-top: 10px;">
                            <i class="fas fa-redo"></i> Reset Filter
                        </button>
                        <button onclick="loadExams()" class="profile-button" style="margin-top: 10px; margin-left: 10px;">
                            <i class="fas fa-sync"></i> Reload Exams
                        </button>
                    </td>
                </tr>
            `;
            return;
        }
        
        console.log('🎨 Rendering', exams.length, 'exams to table');
        
        exams.forEach((exam, index) => {
            console.log(`🎨 Rendering exam ${index + 1}:`, exam.exam_name);
            
            const dateStr = exam.exam_date
                ? new Date(exam.exam_date).toLocaleDateString('en-US', { 
                    weekday: 'short', 
                    year: 'numeric', 
                    month: 'short', 
                    day: 'numeric' 
                })
                : 'N/A';
            
            const gradeEntry = exam.grade;
            const examType = exam.exam_type || 'EXAM';
            
            // Determine what scores to show
            let cat1Score = '-';
            let cat2Score = '-';
            let finalExamScore = '-';
            let totalScore = '-';
            let hasResults = false;
            
            if (gradeEntry) {
                hasResults = true;
                console.log(`📊 Exam ${exam.id} has grade:`, gradeEntry);
                
                if (examType.includes('CAT_1') || examType === 'CAT' || examType === 'CAT_1') {
                    cat1Score = gradeEntry.cat_1_score !== null ? gradeEntry.cat_1_score : '-';
                    cat2Score = '<span style="color:#9CA3AF; font-style:italic;">N/A</span>';
                    finalExamScore = '<span style="color:#9CA3AF; font-style:italic;">N/A</span>';
                    
                    if (exam.calculated_percentage !== null) {
                        totalScore = `${exam.calculated_percentage.toFixed(1)}%`;
                    } else if (gradeEntry.total_score !== null) {
                        totalScore = `${gradeEntry.total_score.toFixed(1)}%`;
                    } else if (gradeEntry.cat_1_score !== null) {
                        totalScore = `${((gradeEntry.cat_1_score / 30) * 100).toFixed(1)}%`;
                    } else {
                        totalScore = '-';
                    }
                        
                } else if (examType.includes('CAT_2') || examType === 'CAT_2') {
                    cat1Score = '<span style="color:#9CA3AF; font-style:italic;">N/A</span>';
                    cat2Score = gradeEntry.cat_2_score !== null ? gradeEntry.cat_2_score : '-';
                    finalExamScore = '<span style="color:#9CA3AF; font-style:italic;">N/A</span>';
                    
                    if (exam.calculated_percentage !== null) {
                        totalScore = `${exam.calculated_percentage.toFixed(1)}%`;
                    } else if (gradeEntry.total_score !== null) {
                        totalScore = `${gradeEntry.total_score.toFixed(1)}%`;
                    } else if (gradeEntry.cat_2_score !== null) {
                        totalScore = `${((gradeEntry.cat_2_score / 30) * 100).toFixed(1)}%`;
                    } else {
                        totalScore = '-';
                    }
                        
                } else if (examType === 'EXAM' || examType.includes('EXAM') || examType.includes('Final')) {
                    cat1Score = gradeEntry.cat_1_score !== null ? gradeEntry.cat_1_score : '-';
                    cat2Score = gradeEntry.cat_2_score !== null ? gradeEntry.cat_2_score : '-';
                    finalExamScore = gradeEntry.exam_score !== null ? gradeEntry.exam_score : '-';
                    
                    if (exam.calculated_percentage !== null) {
                        totalScore = `${exam.calculated_percentage.toFixed(1)}%`;
                    } else if (gradeEntry.total_score !== null) {
                        totalScore = `${gradeEntry.total_score.toFixed(1)}%`;
                    } else if (gradeEntry.cat_1_score !== null && gradeEntry.cat_2_score !== null && gradeEntry.exam_score !== null) {
                        const totalMarks = gradeEntry.cat_1_score + gradeEntry.cat_2_score + gradeEntry.exam_score;
                        totalScore = `${totalMarks.toFixed(1)}%`;
                    } else {
                        totalScore = '-';
                    }
                }
            }
            
            // Use display_status
            const resultStatus = exam.display_status || 'Scheduled';
            
            // Determine status color and text
            let statusDisplay = '';
            let statusColor = '';
            
            if (resultStatus === 'PASS') {
                statusColor = '#10B981';
                statusDisplay = `<span style="color:${statusColor}; font-weight:700;">
                    <i class="fas fa-check-circle"></i> PASS
                </span>`;
            } else if (resultStatus === 'FAIL') {
                statusColor = '#EF4444';
                statusDisplay = `<span style="color:${statusColor}; font-weight:700;">
                    <i class="fas fa-times-circle"></i> FAIL
                </span>`;
            } else if (resultStatus === 'Graded') {
                statusColor = '#3B82F6';
                statusDisplay = `<span style="color:${statusColor}; font-weight:700;">
                    <i class="fas fa-clipboard-check"></i> Graded
                </span>`;
            } else {
                statusColor = '#F59E0B';
                statusDisplay = `<span style="color:${statusColor}; font-weight:700;">
                    <i class="fas fa-calendar"></i> ${resultStatus}
                </span>`;
            }
            
            // Add exam type badge
            const typeBadge = examType.includes('CAT_1') ? 
                '<span style="background:#3B82F6; color:white; padding:2px 8px; border-radius:12px; font-size:11px; margin-left:5px;">CAT 1</span>' :
                examType.includes('CAT_2') ?
                '<span style="background:#8B5CF6; color:white; padding:2px 8px; border-radius:12px; font-size:11px; margin-left:5px;">CAT 2</span>' :
                examType.includes('EXAM') || examType.includes('Final') ?
                '<span style="background:#EF4444; color:white; padding:2px 8px; border-radius:12px; font-size:11px; margin-left:5px;">Final</span>' :
                '<span style="background:#6B7280; color:white; padding:2px 8px; border-radius:12px; font-size:11px; margin-left:5px;">Exam</span>';
            
            // Action buttons
            let actionBtn = '';
            if (exam.exam_link && !hasResults) {
                actionBtn += `<a href="${exam.exam_link}" target="_blank" class="profile-button" style="background-color: var(--color-success); padding:6px 10px; font-size:0.85em; margin-right:5px;">
                    <i class="fas fa-play-circle"></i> Start Exam
                </a>`;
            }
            
            if (hasResults) {
                actionBtn += `<button onclick="viewProvisionalTranscript('${exam.id}')" class="profile-button" style="background-color: var(--color-primary); padding:6px 10px; font-size:0.85em;">
                    <i class="fas fa-eye"></i> View Transcript
                </button>`;
            } else if (!exam.exam_link) {
                actionBtn += `<button disabled class="profile-button" style="background-color: var(--color-secondary); padding:6px 10px; font-size:0.85em; opacity:0.6; cursor: not-allowed;">
                    <i class="fas fa-clock"></i> Not Available
                </button>`;
            }
            
            const rowHTML = `
                <tr>
                    <td>${this.escapeHtml(exam.exam_name || 'N/A')} ${typeBadge}</td>
                    <td>${this.escapeHtml(exam.block_term || 'N/A')}</td>
                    <td>${dateStr}</td>
                    <td>${statusDisplay}</td>
                    <td style="text-align:center; ${cat1Score !== '-' ? 'font-weight:600;' : ''}">${cat1Score}</td>
                    <td style="text-align:center; ${cat2Score !== '-' && !cat2Score.includes('N/A') ? 'font-weight:600;' : ''}">${cat2Score}</td>
                    <td style="text-align:center; ${finalExamScore !== '-' ? 'font-weight:600;' : ''}">${finalExamScore}</td>
                    <td style="text-align:center; ${totalScore !== '-' && totalScore !== '-%' ? 'font-weight:700;' : ''}">
                        ${totalScore}
                    </td>
                    <td>${actionBtn}</td>
                </tr>`;
            
            this.examsTable.innerHTML += rowHTML;
        });
        
        console.log('✅ Exams table rendered with', exams.length, 'rows');
    }
    
    // View provisional transcript
    async viewProvisionalTranscript(examId) {
        console.log('📄 viewProvisionalTranscript called for exam:', examId);
        try {
            const exam = this.cachedExams?.find(e => String(e.id) === String(examId));
            if (!exam) {
                console.error('❌ Exam not found in cache:', examId);
                if (window.showToast) {
                    showToast("Exam not found.", 'error');
                }
                return;
            }
            
            console.log('📄 Found exam:', exam.exam_name);
            // ... rest of the function remains the same ...
            
        } catch (error) {
            console.error('❌ Error viewing transcript:', error);
            if (window.showToast) {
                showToast('Failed to load transcript details', 'error');
            }
        }
    }
    
    // Close transcript modal
    closeTranscriptModal() {
        if (this.transcriptModal) {
            console.log('❌ Closing transcript modal');
            this.transcriptModal.style.display = 'none';
            
            // Clean up dynamic rows
            const table = this.transcriptModal.querySelector('table');
            if (table) {
                const dynamicRows = table.querySelectorAll('.dynamic-row');
                dynamicRows.forEach(row => row.remove());
            }
        }
    }
    
    // Reset exam filter
    resetExamFilter() {
        console.log('🔄 Resetting exam filter');
        if (this.examTypeFilter) {
            this.examTypeFilter.value = 'all';
            this.loadExams();
        }
    }
    
    // Utility functions
    showLoading(element, message = 'Loading...') {
        if (element) {
            element.innerHTML = `<div class="loading-state">${message}</div>`;
        }
    }
    
    showError(element, message) {
        if (element) {
            element.innerHTML = `<div class="error-state">${message}</div>`;
        }
    }
    
    escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
    
    // Update user profile
    updateUserProfile(userProfile) {
        console.log('👤 Updating user profile in ExamsModule');
        this.userProfile = userProfile;
    }
}

// Create global instance and export functions
let examsModule = null;

// Initialize exams module (updated to not require parameters)
function initExamsModule() {
    console.log('🚀 initExamsModule() called');
    try {
        examsModule = new ExamsModule();
        examsModule.initialize();
        console.log('✅ ExamsModule initialized successfully');
        return examsModule;
    } catch (error) {
        console.error('❌ Failed to initialize ExamsModule:', error);
        return null;
    }
}

// Global functions
async function loadExams() {
    console.log('🌍 Global loadExams() called');
    if (examsModule) {
        console.log('📥 Calling examsModule.loadExams()');
        await examsModule.loadExams();
    } else {
        console.error('❌ examsModule not initialized!');
        // Try to initialize it
        initExamsModule();
    }
}

function viewProvisionalTranscript(examId) {
    console.log('🌍 Global viewProvisionalTranscript called for exam:', examId);
    if (examsModule) {
        examsModule.viewProvisionalTranscript(examId);
    } else {
        console.error('❌ examsModule not initialized!');
    }
}

function closeTranscriptModal() {
    console.log('🌍 Global closeTranscriptModal called');
    if (examsModule) {
        examsModule.closeTranscriptModal();
    }
}

function resetExamFilter() {
    console.log('🌍 Global resetExamFilter called');
    if (examsModule) {
        examsModule.resetExamFilter();
    }
}

// Make functions globally available
window.ExamsModule = ExamsModule;
window.initExamsModule = initExamsModule;
window.loadExams = loadExams;
window.viewProvisionalTranscript = viewProvisionalTranscript;
window.closeTranscriptModal = closeTranscriptModal;
window.resetExamFilter = resetExamFilter;

// Auto-initialize if in browser context
if (typeof window !== 'undefined') {
    console.log('🏁 Exams module loaded, ready to initialize');
}
