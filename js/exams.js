// js/exams.js - Exams Management Module
class ExamsModule {
    constructor(supabaseClient) {
        this.sb = supabaseClient;
        this.userId = null;
        this.userProfile = null;
        this.cachedExams = [];
        
        // Exams elements
        this.examTypeFilter = document.getElementById('exam-type-filter');
        this.examsTable = document.getElementById('exams-table');
        
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
        // Setup event listeners
        if (this.examTypeFilter) {
            this.examTypeFilter.addEventListener('change', () => this.loadExams());
        }
        
        // Close transcript modal buttons
        document.querySelectorAll('#closeTranscriptBtn, #closeTranscriptModalBtn').forEach(btn => {
            if (btn) btn.addEventListener('click', () => this.closeTranscriptModal());
        });
        
        // Close modal when clicking outside
        if (this.transcriptModal) {
            this.transcriptModal.addEventListener('click', (e) => {
                if (e.target === this.transcriptModal) {
                    this.closeTranscriptModal();
                }
            });
        }
    }
    
    // Initialize with user ID and profile
    initialize(userId, userProfile) {
        this.userId = userId;
        this.userProfile = userProfile;
        
        if (userId && userProfile) {
            this.loadExams();
        }
    }
    
    // Load exams and grades
    async loadExams() {
        if (!this.examsTable) return;
        
        this.showLoading(this.examsTable, 'Loading your exams and grades...');
        
        if (!this.userProfile) return;
        const program = this.userProfile?.program || this.userProfile?.department;
        const block = this.userProfile?.block;
        const intakeYear = this.userProfile?.intake_year;
        const studentId = this.userId;
        
        if (!program || !intakeYear) {
            this.examsTable.innerHTML = `<tr><td colspan="9">Missing program or intake year info. Cannot load exams.</td></tr>`;
            this.cachedExams = [];
            return;
        }
        
        try {
            // Fetch exams for this student's program
            const { data: exams, error: examsError } = await this.sb
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
            
            if (examsError) throw examsError;
            
            // Fetch overall grades
            const { data: grades, error: gradesError } = await this.sb
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
            
            if (gradesError) throw gradesError;
            
            // Combine exams with their grades
            this.cachedExams = exams.map(exam => {
                const grade = grades?.find(g => String(g.exam_id) === String(exam.id));
                const examType = exam.exam_type || '';
                
                let resultStatus = 'Scheduled';
                let displayStatus = 'Scheduled';
                let calculatedPercentage = null;
                
                if (grade) {
                    // Calculate percentage consistently
                    if (grade.total_score !== null && grade.total_score !== undefined) {
                        calculatedPercentage = Number(grade.total_score);
                    } else {
                        // Calculate from CAT scores if total_score not available
                        if (examType.includes('CAT_1') || examType === 'CAT' || examType === 'CAT_1') {
                            if (grade.cat_1_score !== null) {
                                calculatedPercentage = (grade.cat_1_score / 30) * 100;
                            }
                        } else if (examType.includes('CAT_2') || examType === 'CAT_2') {
                            if (grade.cat_2_score !== null) {
                                calculatedPercentage = (grade.cat_2_score / 30) * 100;
                            }
                        } else if (examType === 'EXAM' || examType.includes('EXAM') || examType.includes('Final')) {
                            if (grade.cat_1_score !== null && grade.cat_2_score !== null && grade.exam_score !== null) {
                                const totalMarks = grade.cat_1_score + grade.cat_2_score + grade.exam_score;
                                calculatedPercentage = (totalMarks / 100) * 100;
                            } else if (grade.marks) {
                                try {
                                    const marksData = typeof grade.marks === 'string' ? JSON.parse(grade.marks) : grade.marks;
                                    if (marksData.percentage !== undefined) {
                                        calculatedPercentage = marksData.percentage;
                                    }
                                } catch (e) {
                                    // Ignore parsing errors
                                }
                            }
                        }
                    }
                    
                    // Determine PASS/FAIL based on 60% threshold
                    if (calculatedPercentage !== null) {
                        displayStatus = calculatedPercentage >= 60 ? 'PASS' : 'FAIL';
                        resultStatus = 'Final';
                    } else {
                        if (grade.result_status === 'Final') {
                            displayStatus = 'Graded';
                            resultStatus = 'Final';
                        } else {
                            displayStatus = grade.result_status || 'Graded';
                            resultStatus = grade.result_status || 'Graded';
                        }
                    }
                }
                
                return { 
                    ...exam, 
                    grade: grade || null,
                    display_status: displayStatus,
                    result_status: resultStatus,
                    calculated_percentage: calculatedPercentage
                };
            });
            
            // Make exams data globally accessible
            window.cachedExams = this.cachedExams;
            
            // Filter by dropdown
            const filter = this.examTypeFilter?.value || 'all';
            let filteredExams = this.cachedExams;
            
            if (filter === 'CAT') {
                filteredExams = this.cachedExams.filter(e => {
                    const examType = e.exam_type || '';
                    const examName = e.exam_name || '';
                    return examType.includes('CAT') || 
                           examName.toLowerCase().includes('cat') ||
                           examType === 'CAT_1' || 
                           examType === 'CAT_2';
                });
            } else if (filter === 'Final') {
                filteredExams = this.cachedExams.filter(e => {
                    const examType = e.exam_type || '';
                    const examName = e.exam_name || '';
                    return examType === 'EXAM' || 
                           examName.toLowerCase().includes('final') ||
                           examName.toLowerCase().includes('exam');
                });
            }
            
            // Display exams table
            this.displayExamsTable(filteredExams);
            
        } catch (error) {
            console.error('❌ Failed to load exams:', error);
            this.showError(this.examsTable, `Error loading exams: ${error.message}`);
            this.cachedExams = [];
            
            this.examsTable.innerHTML = `
                <tr>
                    <td colspan="9" style="color: #DC2626; padding: 20px; text-align: center;">
                        Error loading exams: ${error.message}
                    </td>
                </tr>
            `;
        }
    }
    
    // Display exams in table
    displayExamsTable(exams) {
        if (!this.examsTable) return;
        
        this.examsTable.innerHTML = '';
        
        if (!exams || exams.length === 0) {
            this.examsTable.innerHTML = `
                <tr>
                    <td colspan="9" style="padding: 40px; text-align: center; color: #6B7280;">
                        <i class="fas fa-clipboard-list" style="font-size: 2rem; margin-bottom: 10px; display: block;"></i>
                        <h3>No Exams Found</h3>
                        <p>No exams match your current filter.</p>
                        <button onclick="resetExamFilter()" class="profile-button" style="margin-top: 10px;">
                            <i class="fas fa-redo"></i> Reset Filter
                        </button>
                    </td>
                </tr>
            `;
            return;
        }
        
        exams.forEach(exam => {
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
            
            this.examsTable.innerHTML += `
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
        });
    }
    
    // View provisional transcript
    async viewProvisionalTranscript(examId) {
        try {
            const exam = this.cachedExams?.find(e => String(e.id) === String(examId));
            if (!exam) {
                if (window.showToast) {
                    showToast("Exam not found.", 'error');
                }
                return;
            }
            
            const grade = exam.grade || {};
            const examType = exam.exam_type || '';
            
            // Get scores with better formatting
            let cat1Score = grade.cat_1_score !== null ? grade.cat_1_score : 'N/A';
            let cat2Score = grade.cat_2_score !== null ? grade.cat_2_score : 'N/A';
            let finalScore = grade.exam_score !== null ? grade.exam_score : 'N/A';
            let totalScore = '-';
            
            // Use calculated_percentage from exam object
            if (exam.calculated_percentage !== null) {
                totalScore = `${exam.calculated_percentage.toFixed(1)}%`;
            } else if (grade.total_score !== null) {
                totalScore = `${grade.total_score.toFixed(1)}%`;
            } else {
                // Calculate from available scores (fallback)
                if (examType.includes('CAT_1') || examType === 'CAT' || examType === 'CAT_1') {
                    if (grade.cat_1_score !== null) {
                        totalScore = `${((grade.cat_1_score / 30) * 100).toFixed(1)}%`;
                    }
                    cat2Score = 'N/A';
                    finalScore = 'N/A';
                } else if (examType.includes('CAT_2') || examType === 'CAT_2') {
                    if (grade.cat_2_score !== null) {
                        totalScore = `${((grade.cat_2_score / 30) * 100).toFixed(1)}%`;
                    }
                    cat1Score = 'N/A';
                    finalScore = 'N/A';
                } else if (examType === 'EXAM' || examType.includes('EXAM') || examType.includes('Final')) {
                    if (grade.cat_1_score !== null && grade.cat_2_score !== null && grade.exam_score !== null) {
                        const totalMarks = grade.cat_1_score + grade.cat_2_score + grade.exam_score;
                        totalScore = `${totalMarks.toFixed(1)}%`;
                    }
                }
            }
            
            const resultStatus = exam.display_status || 'Provisional';
            
            // Format graded date
            let gradedDateStr = 'N/A';
            let gradedByStr = 'System';
            
            if (grade.graded_at) {
                gradedDateStr = new Date(grade.graded_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });
            }
            
            // Try to get lecturer name
            if (grade.graded_by) {
                if (this.lecturerCache && this.lecturerCache[grade.graded_by]) {
                    gradedByStr = this.lecturerCache[grade.graded_by];
                } else {
                    try {
                        const { data: lecturer, error } = await this.sb
                            .from('users')
                            .select('full_name, email, username')
                            .eq('id', grade.graded_by)
                            .single();
                        
                        if (!error && lecturer) {
                            gradedByStr = lecturer.full_name || lecturer.email || lecturer.username || 'Lecturer';
                            
                            // Cache it for future use
                            if (!this.lecturerCache) this.lecturerCache = {};
                            this.lecturerCache[grade.graded_by] = gradedByStr;
                        } else {
                            if (!grade.graded_by.includes('-') || grade.graded_by.length !== 36) {
                                gradedByStr = grade.graded_by;
                            } else {
                                gradedByStr = 'Auto-graded';
                            }
                        }
                    } catch (e) {
                        console.warn('Could not fetch lecturer name:', e);
                        gradedByStr = 'Auto-graded';
                    }
                }
            }
            
            // Update transcript modal
            if (this.transcriptExamName) {
                this.transcriptExamName.textContent = exam.exam_name || 'N/A';
            }
            
            if (this.transcriptCat1) {
                if (grade.cat_1_score !== null && (examType.includes('CAT_1') || examType === 'CAT' || examType === 'CAT_1')) {
                    const percentage = ((grade.cat_1_score / 30) * 100).toFixed(1);
                    this.transcriptCat1.textContent = `${grade.cat_1_score} (${percentage}%)`;
                } else {
                    this.transcriptCat1.textContent = cat1Score;
                }
            }
            
            if (this.transcriptCat2) {
                if (grade.cat_2_score !== null && examType.includes('CAT_2')) {
                    const percentage = ((grade.cat_2_score / 30) * 100).toFixed(1);
                    this.transcriptCat2.textContent = `${grade.cat_2_score} (${percentage}%)`;
                } else {
                    this.transcriptCat2.textContent = cat2Score;
                }
            }
            
            if (this.transcriptFinal) {
                this.transcriptFinal.textContent = finalScore;
            }
            
            if (this.transcriptTotal) {
                this.transcriptTotal.textContent = totalScore;
                
                // Color code total score
                if (totalScore !== '-' && totalScore !== '-%' && totalScore !== 'N/A') {
                    const numericScore = parseFloat(totalScore);
                    if (!isNaN(numericScore)) {
                        this.transcriptTotal.style.color = numericScore >= 60 ? '#10B981' : '#EF4444';
                        this.transcriptTotal.style.fontWeight = 'bold';
                    }
                }
            }
            
            if (this.transcriptStatus) {
                this.transcriptStatus.textContent = resultStatus;
                this.transcriptStatus.style.color = resultStatus === 'PASS' ? '#10B981' : 
                                                resultStatus === 'FAIL' ? '#EF4444' : '#6B7280';
                this.transcriptStatus.style.fontWeight = 'bold';
            }
            
            // Add or update extra info rows
            const table = document.querySelector('#transcript-modal table');
            if (table) {
                // Remove any existing dynamic rows
                const existingRows = table.querySelectorAll('.dynamic-row');
                existingRows.forEach(row => row.remove());
                
                // Add Graded By, Date, and Pass Mark
                const rowsToAdd = [
                    { label: 'Graded By:', value: gradedByStr },
                    { label: 'Graded On:', value: gradedDateStr },
                    { label: 'Pass Mark:', value: '60%' }
                ];
                
                rowsToAdd.forEach(rowData => {
                    const row = table.insertRow();
                    row.className = 'dynamic-row';
                    row.innerHTML = `
                        <td style="font-weight:600; padding:4px 0; color:#4B5563; font-size:0.9em;">${rowData.label}</td>
                        <td style="padding:4px 0; font-size:0.9em; text-align:right;">${rowData.value}</td>
                    `;
                });
            }
            
            // Show the modal
            if (this.transcriptModal) {
                this.transcriptModal.style.display = 'flex';
            }
            
        } catch (error) {
            console.error('Error viewing transcript:', error);
            if (window.showToast) {
                showToast('Failed to load transcript details', 'error');
            }
        }
    }
    
    // Close transcript modal
    closeTranscriptModal() {
        if (this.transcriptModal) {
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
        this.userProfile = userProfile;
    }
}

// Create global instance and export functions
let examsModule = null;

// Initialize exams module
function initExamsModule(supabaseClient, userId, userProfile) {
    examsModule = new ExamsModule(supabaseClient);
    examsModule.initialize(userId, userProfile);
    return examsModule;
}

// Global functions
async function loadExams() {
    if (examsModule) {
        await examsModule.loadExams();
    }
}

function viewProvisionalTranscript(examId) {
    if (examsModule) {
        examsModule.viewProvisionalTranscript(examId);
    }
}

function closeTranscriptModal() {
    if (examsModule) {
        examsModule.closeTranscriptModal();
    }
}

function resetExamFilter() {
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
