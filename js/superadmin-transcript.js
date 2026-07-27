// ============================================================
// SUPER ADMIN TRANSCRIPT GENERATOR - COMPLETE
// ============================================================

console.log('📄 Super Admin Transcript Generator Loading...');

// ============================================================
// GLOBAL VARIABLES
// ============================================================

window.transcriptData = {
    students: [],
    selectedStudents: [],
    currentStudent: null,
    marks: []
};

// ============================================================
// LOAD TRANSCRIPT STUDENTS
// ============================================================

window.loadTranscriptStudents = async function() {
    console.log('📄 Loading transcript students...');
    
    const program = document.getElementById('transcript_program_select')?.value || 'all';
    const year = document.getElementById('transcript_year_select')?.value || '2025';
    const block = document.getElementById('transcript_block_select')?.value || 'all';
    
    const placeholder = document.getElementById('transcriptPlaceholder');
    const dynamicContent = document.getElementById('transcriptDynamicContent');
    const studentList = document.getElementById('transcriptStudentList');
    const previewContainer = document.getElementById('transcriptPreviewContainer');
    
    // Show loading
    if (studentList) {
        studentList.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 30px;">
                <div class="loading-spinner" style="display: inline-block; width: 30px; height: 30px; border: 3px solid #e5e7eb; border-top-color: #4C1D95; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                <p style="color: #94a3b8; margin-top: 10px;">Loading students...</p>
            </div>
        `;
    }
    
    try {
        // Get students
        let query = window.sb
            .from('consolidated_user_profiles_table')
            .select('*')
            .eq('role', 'student')
            .eq('status', 'approved');
        
        if (program !== 'all') {
            if (program === 'TVET') {
                query = query.neq('program', 'KRCHN');
            } else {
                query = query.eq('program', program);
            }
        }
        
        if (block !== 'all') {
            query = query.eq('block', block);
        }
        
        if (year) {
            query = query.eq('intake_year', year);
        }
        
        const { data: students, error: studentError } = await query;
        
        if (studentError) throw studentError;
        
        window.transcriptData.students = students || [];
        window.transcriptData.selectedStudents = [];
        
        if (students && students.length > 0) {
            // Get marks for all students
            const studentIds = students.map(s => s.student_id);
            const { data: marks, error: marksError } = await window.sb
                .from('student_marks')
                .select('*')
                .in('admission_number', studentIds)
                .eq('academic_year', year);
            
            if (marksError) throw marksError;
            
            window.transcriptData.marks = marks || [];
            
            // Update stats
            window.updateTranscriptStats(students, marks);
            
            // Render student list
            window.renderTranscriptStudentList(students, marks);
            
            // Show dynamic content, hide placeholder
            if (placeholder) placeholder.style.display = 'none';
            if (dynamicContent) dynamicContent.style.display = 'block';
            if (previewContainer) previewContainer.style.display = 'none';
            
        } else {
            // No students found
            if (studentList) {
                studentList.innerHTML = `
                    <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #94a3b8;">
                        <i class="fas fa-users" style="font-size: 48px; display: block; margin-bottom: 10px;"></i>
                        <h3 style="color: #1e293b;">No students found</h3>
                        <p>Try adjusting your filters</p>
                    </div>
                `;
            }
            if (dynamicContent) dynamicContent.style.display = 'block';
            if (placeholder) placeholder.style.display = 'none';
        }
        
        // Populate student dropdown
        window.populateTranscriptStudentDropdown(students);
        
        console.log(`✅ Loaded ${students?.length || 0} students`);
        
    } catch (error) {
        console.error('❌ Error loading students:', error);
        if (studentList) {
            studentList.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 30px; color: #dc2626;">
                    <i class="fas fa-exclamation-circle" style="font-size: 32px; display: block; margin-bottom: 10px;"></i>
                    Error: ${window.escapeHtml(error.message)}
                </div>
            `;
        }
        if (typeof window.showNotification === 'function') {
            window.showNotification('Error loading students: ' + error.message, 'error');
        }
    }
};

// ============================================================
// UPDATE TRANSCRIPT STATS
// ============================================================

window.updateTranscriptStats = function(students, marks) {
    const totalStudents = students?.length || 0;
    
    // Calculate passing/failing/pending
    let passing = 0;
    let failing = 0;
    let pending = 0;
    let totalScore = 0;
    let scoredCount = 0;
    
    marks?.forEach(m => {
        const score = m.final_score || 0;
        if (score > 0) {
            totalScore += score;
            scoredCount++;
            if (score >= 60) passing++;
            else failing++;
        } else {
            pending++;
        }
    });
    
    const avg = scoredCount > 0 ? Math.round((totalScore / scoredCount) * 10) / 10 : 0;
    
    document.getElementById('transcript_total_students').textContent = totalStudents;
    document.getElementById('transcript_passing').textContent = passing;
    document.getElementById('transcript_failing').textContent = failing;
    document.getElementById('transcript_pending').textContent = pending;
    document.getElementById('transcript_avg').textContent = avg + '%';
};

// ============================================================
// RENDER TRANSCRIPT STUDENT LIST
// ============================================================

window.renderTranscriptStudentList = function(students, marks) {
    const container = document.getElementById('transcriptStudentList');
    if (!container) return;
    
    if (!students || students.length === 0) {
        container.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #94a3b8;">
                <i class="fas fa-users" style="font-size: 32px; display: block; margin-bottom: 10px;"></i>
                No students found
            </div>
        `;
        return;
    }
    
    // Calculate averages per student
    const studentAverages = {};
    marks?.forEach(m => {
        const admission = m.admission_number;
        const score = m.final_score || 0;
        if (!studentAverages[admission]) {
            studentAverages[admission] = { total: 0, count: 0, scores: [] };
        }
        if (score > 0) {
            studentAverages[admission].total += score;
            studentAverages[admission].count++;
            studentAverages[admission].scores.push(score);
        }
    });
    
    let html = '';
    students.forEach((student, index) => {
        const avgData = studentAverages[student.student_id] || { total: 0, count: 0, scores: [] };
        const avg = avgData.count > 0 ? Math.round((avgData.total / avgData.count) * 10) / 10 : 0;
        const grade = avg >= 80 ? 'A' : avg >= 65 ? 'B' : avg >= 60 ? 'C' : avg >= 40 ? 'D' : 'F';
        const isPassing = avg >= 60;
        const statusColor = isPassing ? '#10b981' : (avg > 0 ? '#dc2626' : '#f59e0b');
        const statusText = isPassing ? '✅ Passing' : (avg > 0 ? '❌ Failing' : '⏳ Pending');
        
        const isSelected = window.transcriptData.selectedStudents.includes(student.student_id);
        
        html += `
            <div style="
                background: ${isSelected ? '#e0e7ff' : '#f8fafc'};
                border: 2px solid ${isSelected ? '#4C1D95' : '#e5e7eb'};
                border-radius: 8px;
                padding: 12px 16px;
                display: flex;
                align-items: center;
                justify-content: space-between;
                cursor: pointer;
                transition: all 0.2s;
                ${isSelected ? 'box-shadow: 0 0 0 2px #4C1D95;' : ''}
            "
            onclick="window.toggleTranscriptStudent('${student.student_id}')"
            onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(0,0,0,0.1)';"
            onmouseout="this.style.transform='none'; this.style.boxShadow='${isSelected ? '0 0 0 2px #4C1D95' : 'none'}';">
                <div style="display: flex; align-items: center; gap: 12px; flex: 1;">
                    <input type="checkbox" 
                           ${isSelected ? 'checked' : ''} 
                           onclick="event.stopPropagation(); window.toggleTranscriptStudent('${student.student_id}')"
                           style="width: 18px; height: 18px; cursor: pointer;">
                    <div>
                        <strong style="color: #1e293b;">${window.escapeHtml(student.full_name || 'Unknown')}</strong>
                        <div style="font-size: 12px; color: #64748b;">
                            ${window.escapeHtml(student.student_id || 'N/A')} | 
                            ${window.escapeHtml(student.program || 'N/A')} | 
                            ${window.escapeHtml(student.block || 'N/A')}
                        </div>
                    </div>
                </div>
                <div style="text-align: right;">
                    <div style="font-weight: 700; font-size: 16px; color: ${statusColor};">${avg || '-'}%</div>
                    <div style="font-size: 12px; color: ${statusColor};">${statusText}</div>
                    <div style="font-size: 11px; color: #94a3b8;">${avgData.count} subjects</div>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
    
    // Update selected count
    window.updateTranscriptSelectedCount();
};

// ============================================================
// TOGGLE TRANSCRIPT STUDENT SELECTION
// ============================================================

window.toggleTranscriptStudent = function(studentId) {
    const index = window.transcriptData.selectedStudents.indexOf(studentId);
    if (index > -1) {
        window.transcriptData.selectedStudents.splice(index, 1);
    } else {
        window.transcriptData.selectedStudents.push(studentId);
    }
    
    // Re-render the student list
    window.renderTranscriptStudentList(
        window.transcriptData.students,
        window.transcriptData.marks
    );
};

// ============================================================
// SELECT ALL TRANSCRIPT STUDENTS
// ============================================================

window.selectAllTranscriptStudents = function() {
    window.transcriptData.selectedStudents = window.transcriptData.students.map(s => s.student_id);
    window.renderTranscriptStudentList(
        window.transcriptData.students,
        window.transcriptData.marks
    );
    if (typeof window.showNotification === 'function') {
        window.showNotification(`✅ ${window.transcriptData.selectedStudents.length} students selected`, 'success');
    }
};

// ============================================================
// DESELECT ALL TRANSCRIPT STUDENTS
// ============================================================

window.deselectAllTranscriptStudents = function() {
    window.transcriptData.selectedStudents = [];
    window.renderTranscriptStudentList(
        window.transcriptData.students,
        window.transcriptData.marks
    );
    if (typeof window.showNotification === 'function') {
        window.showNotification('✅ All students deselected', 'info');
    }
};

// ============================================================
// UPDATE TRANSCRIPT SELECTED COUNT
// ============================================================

window.updateTranscriptSelectedCount = function() {
    const count = window.transcriptData.selectedStudents.length;
    const countEl = document.getElementById('transcriptSelectedCount');
    if (countEl) countEl.textContent = count;
};

// ============================================================
// POPULATE TRANSCRIPT STUDENT DROPDOWN
// ============================================================

window.populateTranscriptStudentDropdown = function(students) {
    const select = document.getElementById('transcript_student_select');
    if (!select) return;
    
    const currentValue = select.value;
    select.innerHTML = '<option value="">-- Select Student --</option>';
    
    students?.forEach(s => {
        const option = document.createElement('option');
        option.value = s.student_id;
        option.textContent = `${s.full_name || 'Unknown'} (${s.student_id || 'N/A'})`;
        select.appendChild(option);
    });
    
    if (currentValue) {
        select.value = currentValue;
    }
};

// ============================================================
// GENERATE SELECTED TRANSCRIPT
// ============================================================

window.generateSelectedTranscript = async function() {
    const studentId = document.getElementById('transcript_student_select')?.value;
    const year = document.getElementById('transcript_year_select')?.value || '2025';
    
    if (!studentId) {
        if (typeof window.showNotification === 'function') {
            window.showNotification('Please select a student first', 'warning');
        }
        return;
    }
    
    // Find student
    const student = window.transcriptData.students.find(s => s.student_id === studentId);
    if (!student) {
        if (typeof window.showNotification === 'function') {
            window.showNotification('Student not found', 'error');
        }
        return;
    }
    
    // Get student marks
    const studentMarks = window.transcriptData.marks.filter(m => m.admission_number === studentId);
    
    if (studentMarks.length === 0) {
        if (typeof window.showNotification === 'function') {
            window.showNotification('No marks found for this student', 'warning');
        }
        return;
    }
    
    // Generate and show transcript
    window.showTranscriptPreview(student, studentMarks, year);
};

// ============================================================
// GENERATE SELECTED TRANSCRIPTS (Bulk)
// ============================================================

window.generateSelectedTranscripts = async function() {
    const selectedIds = window.transcriptData.selectedStudents;
    
    if (selectedIds.length === 0) {
        if (typeof window.showNotification === 'function') {
            window.showNotification('Please select at least one student', 'warning');
        }
        return;
    }
    
    if (selectedIds.length > 10) {
        if (!confirm(`Generate transcripts for ${selectedIds.length} students? This may take a moment.`)) {
            return;
        }
    }
    
    const year = document.getElementById('transcript_year_select')?.value || '2025';
    
    if (typeof window.showLoading === 'function') {
        window.showLoading(`Generating ${selectedIds.length} transcripts...`);
    }
    
    try {
        let successCount = 0;
        let failCount = 0;
        
        for (const studentId of selectedIds) {
            const student = window.transcriptData.students.find(s => s.student_id === studentId);
            if (!student) {
                failCount++;
                continue;
            }
            
            const studentMarks = window.transcriptData.marks.filter(m => m.admission_number === studentId);
            
            if (studentMarks.length === 0) {
                failCount++;
                continue;
            }
            
            // Generate transcript PDF
            const pdfData = window.buildTranscriptData(student, studentMarks, year);
            if (pdfData) {
                successCount++;
            } else {
                failCount++;
            }
        }
        
        if (typeof window.hideLoading === 'function') {
            window.hideLoading();
        }
        
        if (typeof window.showNotification === 'function') {
            window.showNotification(`✅ ${successCount} transcripts generated, ${failCount} failed`, successCount > 0 ? 'success' : 'error');
        }
        
    } catch (error) {
        if (typeof window.hideLoading === 'function') {
            window.hideLoading();
        }
        console.error('❌ Error generating transcripts:', error);
        if (typeof window.showNotification === 'function') {
            window.showNotification('Error: ' + error.message, 'error');
        }
    }
};

// ============================================================
// SHOW TRANSCRIPT PREVIEW
// ============================================================

window.showTranscriptPreview = function(student, marks, year) {
    const container = document.getElementById('transcriptPreviewContainer');
    const content = document.getElementById('transcriptPreviewContent');
    
    if (!container || !content) return;
    
    // Build transcript data
    const transcriptData = window.buildTranscriptData(student, marks, year);
    
    if (!transcriptData) {
        content.innerHTML = '<p style="color: #dc2626;">Error building transcript</p>';
        container.style.display = 'block';
        return;
    }
    
    // Calculate averages
    let totalScore = 0;
    let scoredCount = 0;
    marks.forEach(m => {
        const score = m.final_score || 0;
        if (score > 0) {
            totalScore += score;
            scoredCount++;
        }
    });
    const overallAvg = scoredCount > 0 ? Math.round((totalScore / scoredCount) * 10) / 10 : 0;
    const overallGrade = window.calculateTranscriptGrade(overallAvg);
    const overallStatus = overallAvg >= 60 ? 'PASS' : (overallAvg > 0 ? 'FAIL' : 'PENDING');
    const statusColor = overallAvg >= 60 ? '#10b981' : (overallAvg > 0 ? '#dc2626' : '#f59e0b');
    
    // Build marks table
    let marksHtml = '';
    marks.forEach((m, index) => {
        const score = m.final_score || 0;
        const grade = window.calculateTranscriptGrade(score);
        const isPassing = score >= 60;
        
        marksHtml += `
            <tr style="border-bottom: 1px solid #e5e7eb;">
                <td style="padding: 8px 12px;">${index + 1}</td>
                <td style="padding: 8px 12px;">${window.escapeHtml(m.subject_name || 'N/A')}</td>
                <td style="padding: 8px 12px; text-align: center;">${window.escapeHtml(m.block || 'N/A')}</td>
                <td style="padding: 8px 12px; text-align: center;">${m.cat1_score || '-'}</td>
                <td style="padding: 8px 12px; text-align: center;">${m.cat2_score || '-'}</td>
                <td style="padding: 8px 12px; text-align: center;">${m.exam_score || '-'}</td>
                <td style="padding: 8px 12px; text-align: center; font-weight: 700; color: ${isPassing ? '#10b981' : '#dc2626'};">${score || '-'}</td>
                <td style="padding: 8px 12px; text-align: center; font-weight: 700; color: ${isPassing ? '#10b981' : '#dc2626'};">${grade}</td>
            </tr>
        `;
    });
    
    // Build full transcript HTML
    const html = `
        <div style="background: white; padding: 30px; border: 2px solid #4C1D95; border-radius: 12px;">
            <!-- Header -->
            <div style="text-align: center; border-bottom: 3px solid #4C1D95; padding-bottom: 15px; margin-bottom: 20px;">
                <h2 style="color: #4C1D95; margin: 0;">NCHSM</h2>
                <p style="color: #64748b; margin: 0;">Nakuru College of Health Sciences and Management</p>
                <h3 style="color: #1e293b; margin: 5px 0 0 0;">ACADEMIC TRANSCRIPT</h3>
            </div>
            
            <!-- Student Info -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px;">
                <div><strong>Student Name:</strong> ${window.escapeHtml(student.full_name || 'Unknown')}</div>
                <div><strong>Admission No:</strong> ${window.escapeHtml(student.student_id || 'N/A')}</div>
                <div><strong>Program:</strong> ${window.escapeHtml(student.program || 'N/A')}</div>
                <div><strong>Intake:</strong> ${window.escapeHtml(student.intake_year || 'N/A')}</div>
                <div><strong>Block:</strong> ${window.escapeHtml(student.block || 'N/A')}</div>
                <div><strong>Academic Year:</strong> ${window.escapeHtml(year)}</div>
            </div>
            
            <!-- Summary -->
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; background: #f8fafc; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                <div style="text-align: center;">
                    <div style="font-size: 12px; color: #64748b;">Overall Average</div>
                    <div style="font-size: 24px; font-weight: 700; color: ${statusColor};">${overallAvg || '-'}%</div>
                </div>
                <div style="text-align: center;">
                    <div style="font-size: 12px; color: #64748b;">Overall Grade</div>
                    <div style="font-size: 24px; font-weight: 700; color: ${statusColor};">${overallGrade}</div>
                </div>
                <div style="text-align: center;">
                    <div style="font-size: 12px; color: #64748b;">Status</div>
                    <div style="font-size: 18px; font-weight: 700; color: ${statusColor};">${overallStatus}</div>
                </div>
            </div>
            
            <!-- Marks Table -->
            <div style="overflow-x: auto;">
                <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                    <thead>
                        <tr style="background: #4C1D95; color: white;">
                            <th style="padding: 10px 12px; text-align: left;">#</th>
                            <th style="padding: 10px 12px; text-align: left;">Subject</th>
                            <th style="padding: 10px 12px; text-align: center;">Block</th>
                            <th style="padding: 10px 12px; text-align: center;">CAT1</th>
                            <th style="padding: 10px 12px; text-align: center;">CAT2</th>
                            <th style="padding: 10px 12px; text-align: center;">Exam</th>
                            <th style="padding: 10px 12px; text-align: center;">Total</th>
                            <th style="padding: 10px 12px; text-align: center;">Grade</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${marksHtml}
                    </tbody>
                </table>
            </div>
            
            <!-- Footer -->
            <div style="margin-top: 20px; padding-top: 15px; border-top: 2px solid #e5e7eb; text-align: center; font-size: 12px; color: #94a3b8;">
                <p>This is a computer-generated transcript. <br>Generated on: ${new Date().toLocaleString()}</p>
                <div style="display: flex; justify-content: center; gap: 20px; margin-top: 10px;">
                    <button onclick="window.downloadTranscriptPDF()" style="background: #4C1D95; color: white; border: none; padding: 8px 24px; border-radius: 6px; cursor: pointer; font-weight: 600;">
                        <i class="fas fa-file-pdf"></i> Download PDF
                    </button>
                    <button onclick="window.printTranscript()" style="background: #6b7280; color: white; border: none; padding: 8px 24px; border-radius: 6px; cursor: pointer; font-weight: 600;">
                        <i class="fas fa-print"></i> Print
                    </button>
                    <button onclick="window.closeTranscriptPreview()" style="background: #dc2626; color: white; border: none; padding: 8px 24px; border-radius: 6px; cursor: pointer; font-weight: 600;">
                        <i class="fas fa-times"></i> Close
                    </button>
                </div>
            </div>
        </div>
    `;
    
    content.innerHTML = html;
    container.style.display = 'block';
    
    // Store current transcript data for download
    window._currentTranscript = {
        student: student,
        marks: marks,
        year: year,
        html: html
    };
};

// ============================================================
// BUILD TRANSCRIPT DATA
// ============================================================

window.buildTranscriptData = function(student, marks, year) {
    // Calculate totals
    let totalScore = 0;
    let scoredCount = 0;
    const subjectData = [];
    
    marks.forEach(m => {
        const score = m.final_score || 0;
        const grade = window.calculateTranscriptGrade(score);
        subjectData.push({
            subject: m.subject_name || 'N/A',
            block: m.block || 'N/A',
            cat1: m.cat1_score || '-',
            cat2: m.cat2_score || '-',
            exam: m.exam_score || '-',
            total: score || '-',
            grade: grade,
            isPassing: score >= 60
        });
        if (score > 0) {
            totalScore += score;
            scoredCount++;
        }
    });
    
    const overallAvg = scoredCount > 0 ? Math.round((totalScore / scoredCount) * 10) / 10 : 0;
    const overallGrade = window.calculateTranscriptGrade(overallAvg);
    const overallStatus = overallAvg >= 60 ? 'PASS' : (overallAvg > 0 ? 'FAIL' : 'PENDING');
    
    return {
        student: student,
        marks: subjectData,
        year: year,
        overallAvg: overallAvg,
        overallGrade: overallGrade,
        overallStatus: overallStatus,
        totalSubjects: marks.length,
        scoredSubjects: scoredCount
    };
};

// ============================================================
// CALCULATE TRANSCRIPT GRADE
// ============================================================

window.calculateTranscriptGrade = function(score) {
    if (score >= 80) return 'A';
    if (score >= 75) return 'A-';
    if (score >= 70) return 'B+';
    if (score >= 65) return 'B';
    if (score >= 60) return 'B-';
    if (score >= 55) return 'C+';
    if (score >= 50) return 'C';
    if (score >= 45) return 'C-';
    if (score >= 40) return 'D+';
    if (score >= 35) return 'D';
    return 'E';
};

// ============================================================
// DOWNLOAD TRANSCRIPT PDF
// ============================================================

window.downloadTranscriptPDF = function() {
    const transcript = window._currentTranscript;
    if (!transcript) {
        if (typeof window.showNotification === 'function') {
            window.showNotification('No transcript to download', 'warning');
        }
        return;
    }
    
    // Open print dialog to save as PDF
    window.print();
};

// ============================================================
// PRINT TRANSCRIPT
// ============================================================

window.printTranscript = function() {
    // Get the transcript content
    const content = document.getElementById('transcriptPreviewContent');
    if (!content) return;
    
    // Open print dialog
    window.print();
};

// ============================================================
// CLOSE TRANSCRIPT PREVIEW
// ============================================================

window.closeTranscriptPreview = function() {
    const container = document.getElementById('transcriptPreviewContainer');
    if (container) {
        container.style.display = 'none';
    }
    window._currentTranscript = null;
};

// ============================================================
// EXPORT ALL TRANSCRIPTS
// ============================================================

window.exportAllTranscripts = function() {
    const selectedIds = window.transcriptData.selectedStudents;
    
    if (selectedIds.length === 0) {
        if (typeof window.showNotification === 'function') {
            window.showNotification('Please select students first', 'warning');
        }
        return;
    }
    
    // Generate a summary CSV
    const headers = ['Admission', 'Student Name', 'Program', 'Block', 'Subjects', 'Average', 'Grade', 'Status'];
    const rows = [];
    
    for (const studentId of selectedIds) {
        const student = window.transcriptData.students.find(s => s.student_id === studentId);
        if (!student) continue;
        
        const studentMarks = window.transcriptData.marks.filter(m => m.admission_number === studentId);
        
        let totalScore = 0;
        let scoredCount = 0;
        studentMarks.forEach(m => {
            const score = m.final_score || 0;
            if (score > 0) {
                totalScore += score;
                scoredCount++;
            }
        });
        
        const avg = scoredCount > 0 ? Math.round((totalScore / scoredCount) * 10) / 10 : 0;
        const grade = window.calculateTranscriptGrade(avg);
        const status = avg >= 60 ? 'PASS' : (avg > 0 ? 'FAIL' : 'PENDING');
        
        rows.push([
            student.student_id || 'N/A',
            student.full_name || 'Unknown',
            student.program || 'N/A',
            student.block || 'N/A',
            studentMarks.length,
            avg + '%',
            grade,
            status
        ]);
    }
    
    // Build CSV
    let csv = headers.join(',') + '\n';
    rows.forEach(row => {
        csv += row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',') + '\n';
    });
    
    // Download CSV
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transcripts_summary_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    
    if (typeof window.showNotification === 'function') {
        window.showNotification(`✅ Exported ${rows.length} transcripts`, 'success');
    }
};

// ============================================================
// REFRESH TRANSCRIPT DATA
// ============================================================

window.refreshTranscriptData = function() {
    console.log('🔄 Refreshing transcript data...');
    window.loadTranscriptStudents();
    if (typeof window.showNotification === 'function') {
        window.showNotification('🔄 Transcript data refreshed!', 'success');
    }
};

// ============================================================
// ESCAPE HTML HELPER
// ============================================================

window.escapeHtml = function(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
};

// ============================================================
// EXPOSE FUNCTIONS TO GLOBAL SCOPE
// ============================================================

window.loadTranscriptStudents = window.loadTranscriptStudents;
window.refreshTranscriptData = window.refreshTranscriptData;
window.exportAllTranscripts = window.exportAllTranscripts;
window.generateSelectedTranscript = window.generateSelectedTranscript;
window.generateSelectedTranscripts = window.generateSelectedTranscripts;
window.selectAllTranscriptStudents = window.selectAllTranscriptStudents;
window.deselectAllTranscriptStudents = window.deselectAllTranscriptStudents;
window.toggleTranscriptStudent = window.toggleTranscriptStudent;
window.showTranscriptPreview = window.showTranscriptPreview;
window.closeTranscriptPreview = window.closeTranscriptPreview;
window.downloadTranscriptPDF = window.downloadTranscriptPDF;
window.printTranscript = window.printTranscript;
window.calculateTranscriptGrade = window.calculateTranscriptGrade;
window.buildTranscriptData = window.buildTranscriptData;
window.updateTranscriptStats = window.updateTranscriptStats;
window.renderTranscriptStudentList = window.renderTranscriptStudentList;
window.populateTranscriptStudentDropdown = window.populateTranscriptStudentDropdown;
window.updateTranscriptSelectedCount = window.updateTranscriptSelectedCount;
window.escapeHtml = window.escapeHtml;

console.log('✅ Super Admin Transcript Generator Module Loaded Successfully!');
console.log('📄 Available functions:');
console.log('   - loadTranscriptStudents()');
console.log('   - refreshTranscriptData()');
console.log('   - exportAllTranscripts()');
console.log('   - generateSelectedTranscript()');
console.log('   - generateSelectedTranscripts()');
console.log('   - selectAllTranscriptStudents()');
console.log('   - deselectAllTranscriptStudents()');
console.log('   - toggleTranscriptStudent(studentId)');
