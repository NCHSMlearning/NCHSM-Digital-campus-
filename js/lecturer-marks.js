// ============================================================
// LECTURER MARKS MODULE - COMPLETE
// ============================================================

// ============================================================
// STATE
// ============================================================

let me_currentMarks = [];
let me_currentBlock = '';
let me_currentSubject = '';
let me_currentYear = '2025';
let me_currentProgram = '';
let me_currentAssessmentType = 'full';
let me_approvalStatus = 'draft';
let me_currentLecturer = null;
let me_approvalId = null;

// ============================================================
// LECTURER MARKS CLASS
// ============================================================

const LecturerMarks = {
    students: [],
    marks: [],
    nckMarks: [],
    
    async init() {
        console.log('📊 Initializing Lecturer Marks...');
        await this.loadMarksManagement();
        this.setupEventListeners();
        await this.detectLecturerProgram();
        console.log('✅ Lecturer Marks initialized');
    },
    
    async detectLecturerProgram() {
        console.log('🔍 Detecting lecturer program...');
        
        try {
            const { data: { user }, error: userError } = await sb.auth.getUser();
            if (userError) throw userError;
            
            const { data: profile, error: profileError } = await sb
                .from('consolidated_user_profiles_table')
                .select('*')
                .eq('user_id', user.id)
                .maybeSingle();
            
            if (profileError) throw profileError;
            
            const { data: staff, error: staffError } = await sb
                .from('staff_records')
                .select('*')
                .eq('email', profile?.email || user.email)
                .maybeSingle();
            
            me_currentLecturer = { profile, staff };
            
            const isTVET = staff?.program && staff.program !== 'KRCHN';
            const programCode = staff?.program || profile?.program || 'KRCHN';
            const programName = isTVET ? 'TVET' : 'KRCHN Nursing';
            const departmentName = staff?.department || (isTVET ? 'TVET Department' : 'School of Nursing');
            
            // Update UI
            const programNameEl = document.getElementById('lecturerProgramName');
            const programTypeEl = document.getElementById('lecturerProgramType');
            const subjectCountEl = document.getElementById('lecturerSubjectCount');
            const programSelect = document.getElementById('me_program_select');
            
            if (programNameEl) programNameEl.textContent = `${programName} - ${departmentName}`;
            if (programTypeEl) programTypeEl.textContent = isTVET ? '🔧 TVET' : '🎓 Nursing';
            if (subjectCountEl) subjectCountEl.textContent = staff?.assigned_subjects?.length || 0;
            
            if (programSelect) {
                programSelect.innerHTML = `<option value="${programCode}">${programName}</option>`;
                programSelect.value = programCode;
            }
            
            // Show/hide department info
            const tvetInfo = document.getElementById('tvetDepartmentInfo');
            const krchnInfo = document.getElementById('krchnDepartmentInfo');
            
            if (isTVET) {
                if (tvetInfo) tvetInfo.style.display = 'block';
                if (krchnInfo) krchnInfo.style.display = 'none';
                const deptName = document.getElementById('tvetDepartmentName');
                if (deptName) deptName.textContent = departmentName;
            } else {
                if (tvetInfo) tvetInfo.style.display = 'none';
                if (krchnInfo) krchnInfo.style.display = 'block';
                const blockName = document.getElementById('krchnBlockName');
                if (blockName) blockName.textContent = staff?.block || 'N/A';
            }
            
            // Load blocks after program detection
            await loadMEBlocks();
            
            return staff;
            
        } catch (error) {
            console.error('Error detecting lecturer program:', error);
            return null;
        }
    },
    
    async loadMarksManagement() {
        const blockSelect = document.getElementById('lecBlockSelect');
        if (!blockSelect) return;
        
        await this.loadStudents();
        await this.loadSubjects();
        await this.loadInternalMarks();
        await this.loadNCKMarks();
        this.updateStats();
    },
    
    async loadStudents() {
        try {
            const profile = me_currentLecturer?.profile;
            const program = profile?.program || profile?.department;
            
            if (!program) {
                console.warn('No program found');
                return;
            }
            
            const { data, error } = await sb
                .from('consolidated_user_profiles_table')
                .select('*')
                .eq('role', 'student')
                .eq('program', program)
                .order('full_name', { ascending: true });
            
            if (error) throw error;
            
            this.students = data || [];
            const totalEl = document.getElementById('lecTotalStudents');
            if (totalEl) totalEl.textContent = this.students.length;
            
        } catch (error) {
            console.error('Failed to load students:', error);
        }
    },
    
    async loadSubjects() {
        const block = document.getElementById('lecBlockSelect')?.value;
        const subjectSelect = document.getElementById('lecSubjectSelect');
        if (!subjectSelect) return;
        
        if (!block) {
            subjectSelect.innerHTML = '<option value="">-- Select Block First --</option>';
            return;
        }
        
        try {
            const { data, error } = await sb
                .from('units_catalog')
                .select('*')
                .eq('block', block)
                .eq('status', 'active')
                .order('unit_name', { ascending: true });
            
            if (error) throw error;
            
            if (!data || !data.length) {
                subjectSelect.innerHTML = '<option value="">No subjects found</option>';
                return;
            }
            
            subjectSelect.innerHTML = '<option value="">-- Select Subject --</option>' +
                data.map(u => `<option value="${u.unit_name}" data-code="${u.unit_code || ''}" data-assessment="${u.assessment_type || 'full'}">${u.unit_name}${u.unit_code ? ' (' + u.unit_code + ')' : ''}</option>`).join('');
            
        } catch (error) {
            console.error('Error loading subjects:', error);
            subjectSelect.innerHTML = '<option value="">Error loading subjects</option>';
        }
    },
    
    async loadInternalMarks() {
        const block = document.getElementById('lecBlockSelect')?.value;
        const subject = document.getElementById('lecSubjectSelect')?.value;
        const container = document.getElementById('lecInternalContainer');
        if (!container) return;
        
        if (!block || !subject) {
            container.innerHTML = '<div class="text-center" style="padding:40px;">Select a block and subject</div>';
            return;
        }
        
        container.innerHTML = '<div class="text-center" style="padding:40px;"><div class="loading-spinner"></div><p>Loading marks...</p></div>';
        
        try {
            const students = this.students.filter(s => s.block === block);
            
            if (!students.length) {
                container.innerHTML = '<div class="text-center" style="padding:40px;">No students found in this block</div>';
                return;
            }
            
            const { data: existing, error } = await sb
                .from('student_marks')
                .select('*')
                .eq('block', block)
                .eq('subject_name', subject);
            
            if (error) throw error;
            
            const marksMap = {};
            existing?.forEach(m => { marksMap[m.admission_number] = m; });
            
            let html = `<div class="table-responsive"><table class="data-table" style="width:100%;border-collapse:collapse;">
                <thead><tr style="background:#4C1D95;color:white;">
                    <th style="padding:10px;">#</th>
                    <th style="padding:10px;">Admission</th>
                    <th style="padding:10px;">Student Name</th>
                    <th style="padding:10px;">CAT1 (0-30)</th>
                    <th style="padding:10px;">CAT2 (0-30)</th>
                    <th style="padding:10px;">Exam (0-70)</th>
                    <th style="padding:10px;">Total</th>
                    <th style="padding:10px;">Grade</th>
                    <th style="padding:10px;">Status</th>
                    <th style="padding:10px;">Approval</th>
                </tr></thead><tbody>`;
            
            for (let i = 0; i < students.length; i++) {
                const s = students[i];
                const m = marksMap[s.student_id] || {};
                const cat1 = m.cat1_score !== undefined && m.cat1_score !== null ? m.cat1_score : '';
                const cat2 = m.cat2_score !== undefined && m.cat2_score !== null ? m.cat2_score : '';
                const exam = m.exam_score !== undefined && m.exam_score !== null ? m.exam_score : '';
                const approvalStatus = m.approval_status || 'draft';
                
                let total = 0, grade = '-', status = 'PENDING', color = '#f59e0b';
                if (cat1 !== '' || cat2 !== '' || exam !== '') {
                    const ncat1 = Math.min(parseFloat(cat1) || 0, 30);
                    const ncat2 = Math.min(parseFloat(cat2) || 0, 30);
                    const nexam = Math.min(parseFloat(exam) || 0, 70);
                    total = Math.round((((ncat1 + ncat2) / 60 * 30) + nexam) * 10) / 10;
                    grade = getMarksEntryGrade(total).grade;
                    status = total >= 60 ? 'PASS' : (total > 0 ? 'FAIL' : 'PENDING');
                    color = status === 'PASS' ? '#10b981' : (status === 'FAIL' ? '#ef4444' : '#f59e0b');
                }
                
                const approvalBadge = {
                    'pending': '<span style="background:#fef3c7;color:#92400e;padding:2px 10px;border-radius:12px;font-size:11px;">⏳ Pending</span>',
                    'approved': '<span style="background:#d1fae5;color:#065f46;padding:2px 10px;border-radius:12px;font-size:11px;">✅ Approved</span>',
                    'rejected': '<span style="background:#fee2e2;color:#991b1b;padding:2px 10px;border-radius:12px;font-size:11px;">❌ Rejected</span>',
                    'draft': '<span style="background:#e5e7eb;color:#6b7280;padding:2px 10px;border-radius:12px;font-size:11px;">📝 Draft</span>'
                }[approvalStatus] || '<span style="background:#e5e7eb;color:#6b7280;padding:2px 10px;border-radius:12px;font-size:11px;">📝 Draft</span>';
                
                html += `<tr>
                    <td>${i + 1}</td>
                    <td>${s.student_id || 'N/A'}</td>
                    <td><strong>${s.full_name || 'N/A'}</strong></td>
                    <td><input type="number" class="internal-cat1" data-student="${s.student_id}" value="${cat1}" min="0" max="30" step="0.5" style="width:65px;padding:5px;border-radius:4px;border:1px solid #e2e8f0;"></td>
                    <td><input type="number" class="internal-cat2" data-student="${s.student_id}" value="${cat2}" min="0" max="30" step="0.5" style="width:65px;padding:5px;border-radius:4px;border:1px solid #e2e8f0;"></td>
                    <td><input type="number" class="internal-exam" data-student="${s.student_id}" value="${exam}" min="0" max="70" step="0.5" style="width:65px;padding:5px;border-radius:4px;border:1px solid #e2e8f0;"></td>
                    <td id="lecTotal_${s.student_id}" style="font-weight:bold;color:${color};">${total || '-'}</td>
                    <td id="lecGrade_${s.student_id}" style="font-weight:bold;color:${color};">${grade}</td>
                    <td id="lecStatus_${s.student_id}" style="color:${color};">${status}</td>
                    <td>${approvalBadge}</td>
                </tr>`;
            }
            
            html += `</tbody></table></div>
                <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-top:20px;">
                    <div style="display:flex;gap:10px;flex-wrap:wrap;">
                        <button class="btn btn-action" id="saveInternalMarksBtn" style="background:#059669;padding:8px 20px;border:none;border-radius:6px;color:white;cursor:pointer;font-weight:600;">
                            <i class="fas fa-save"></i> Save All Marks
                        </button>
                        <button class="btn btn-action" id="fillDownInternalBtn" style="background:#3b82f6;padding:8px 20px;border:none;border-radius:6px;color:white;cursor:pointer;font-weight:600;">
                            <i class="fas fa-arrow-down"></i> Fill Down
                        </button>
                        <button class="btn btn-action" id="submitForApprovalBtn" style="background:#4C1D95;padding:8px 20px;border:none;border-radius:6px;color:white;cursor:pointer;font-weight:600;">
                            <i class="fas fa-paper-plane"></i> Submit for Approval
                        </button>
                    </div>
                    <div style="font-size:13px;color:#64748b;">
                        <i class="fas fa-info-circle"></i> Total: ${students.length} students
                    </div>
                </div>`;
            
            container.innerHTML = html;
            
            // Event listeners for inputs
            document.querySelectorAll('.internal-cat1, .internal-cat2, .internal-exam').forEach(input => {
                input.addEventListener('change', function() {
                    const studentId = this.dataset.student;
                    LecturerMarks.updateInternalTotal(studentId);
                });
                input.addEventListener('input', function() {
                    const studentId = this.dataset.student;
                    LecturerMarks.updateInternalTotal(studentId);
                });
            });
            
            document.getElementById('saveInternalMarksBtn')?.addEventListener('click', () => this.saveInternalMarks());
            document.getElementById('fillDownInternalBtn')?.addEventListener('click', () => this.fillDownInternal());
            document.getElementById('submitForApprovalBtn')?.addEventListener('click', () => submitMarksForApproval());
            
        } catch (error) {
            console.error('Error loading marks:', error);
            container.innerHTML = `<div class="alert alert-danger" style="padding:20px;background:#fee2e2;border-radius:8px;color:#991b1b;">Error: ${error.message}</div>`;
        }
    },
    
    updateInternalTotal(studentId) {
        const cat1 = parseFloat(document.querySelector(`.internal-cat1[data-student="${studentId}"]`)?.value) || 0;
        const cat2 = parseFloat(document.querySelector(`.internal-cat2[data-student="${studentId}"]`)?.value) || 0;
        const exam = parseFloat(document.querySelector(`.internal-exam[data-student="${studentId}"]`)?.value) || 0;
        
        const ncat1 = Math.min(cat1, 30);
        const ncat2 = Math.min(cat2, 30);
        const nexam = Math.min(exam, 70);
        const total = Math.round((((ncat1 + ncat2) / 60 * 30) + nexam) * 10) / 10;
        const gradeInfo = getMarksEntryGrade(total);
        const status = total >= 60 ? 'PASS' : (total > 0 ? 'FAIL' : 'PENDING');
        const color = status === 'PASS' ? '#10b981' : (status === 'FAIL' ? '#ef4444' : '#f59e0b');
        
        const totalSpan = document.getElementById(`lecTotal_${studentId}`);
        const gradeSpan = document.getElementById(`lecGrade_${studentId}`);
        const statusSpan = document.getElementById(`lecStatus_${studentId}`);
        
        if (totalSpan) { totalSpan.innerHTML = total || '-'; totalSpan.style.color = color; }
        if (gradeSpan) { gradeSpan.innerHTML = total > 0 ? gradeInfo.grade : '-'; gradeSpan.style.color = color; }
        if (statusSpan) { statusSpan.innerHTML = status; statusSpan.style.color = color; }
    },
    
    fillDownInternal() {
        const cat1s = document.querySelectorAll('.internal-cat1');
        if (!cat1s.length) return;
        
        const v1 = cat1s[0].value;
        const v2 = document.querySelector('.internal-cat2')?.value || '';
        const v3 = document.querySelector('.internal-exam')?.value || '';
        
        cat1s.forEach((input, i) => {
            if (i === 0) return;
            const sId = input.dataset.student;
            const cat1Input = document.querySelector(`.internal-cat1[data-student="${sId}"]`);
            const cat2Input = document.querySelector(`.internal-cat2[data-student="${sId}"]`);
            const examInput = document.querySelector(`.internal-exam[data-student="${sId}"]`);
            
            if (cat1Input) cat1Input.value = v1;
            if (cat2Input) cat2Input.value = v2;
            if (examInput) examInput.value = v3;
            this.updateInternalTotal(sId);
        });
        
        showNotification('Values filled down!', 'success');
    },
    
    async saveInternalMarks() {
        const block = document.getElementById('lecBlockSelect').value;
        const subject = document.getElementById('lecSubjectSelect').value;
        
        if (!block || !subject) {
            showNotification('Select block and subject', 'error');
            return;
        }
        
        const inputs = document.querySelectorAll('.internal-cat1');
        if (!inputs.length) {
            showNotification('No data to save', 'error');
            return;
        }
        
        showLoading('Saving marks...');
        let saved = 0;
        let errors = 0;
        
        for (const input of inputs) {
            const sId = input.dataset.student;
            const cat1 = parseFloat(document.querySelector(`.internal-cat1[data-student="${sId}"]`)?.value) || 0;
            const cat2 = parseFloat(document.querySelector(`.internal-cat2[data-student="${sId}"]`)?.value) || 0;
            const exam = parseFloat(document.querySelector(`.internal-exam[data-student="${sId}"]`)?.value) || 0;
            
            const student = this.students.find(s => s.student_id === sId);
            const studentName = student?.full_name || 'Unknown Student';
            
            const ncat1 = Math.min(cat1, 30);
            const ncat2 = Math.min(cat2, 30);
            const nexam = Math.min(exam, 70);
            const finalTotal = Math.round((((ncat1 + ncat2) / 60 * 30) + nexam) * 10) / 10;
            const gradeInfo = getMarksEntryGrade(finalTotal);
            
            // Check if exists
            const { data: existing } = await sb
                .from('student_marks')
                .select('id')
                .eq('admission_number', sId)
                .eq('subject_name', subject)
                .eq('block', block)
                .maybeSingle();
            
            try {
                const markData = {
                    admission_number: sId,
                    student_name: studentName,
                    block: block,
                    subject_name: subject,
                    assessment_type: 'full',
                    cat1_score: cat1 || null,
                    cat2_score: cat2 || null,
                    exam_score: exam || null,
                    final_score: finalTotal || null,
                    grade: gradeInfo.grade || null,
                    academic_year: document.getElementById('me_year_select')?.value || '2025',
                    updated_at: new Date().toISOString()
                };
                
                let result;
                if (existing) {
                    result = await sb
                        .from('student_marks')
                        .update(markData)
                        .eq('id', existing.id);
                } else {
                    markData.created_at = new Date().toISOString();
                    result = await sb
                        .from('student_marks')
                        .insert([markData]);
                }
                
                if (result.error) {
                    errors++;
                    console.error('Error saving for', sId, ':', result.error);
                } else {
                    saved++;
                }
            } catch (err) {
                errors++;
                console.error('Error saving for', sId, ':', err);
            }
        }
        
        hideLoading();
        showNotification(`✅ Saved ${saved} marks${errors > 0 ? `, ${errors} errors` : ''}`, errors > 0 ? 'warning' : 'success');
        await this.loadInternalMarks();
    },
    
    async loadNCKMarks() {
        const block = document.getElementById('lecNckBlock')?.value;
        const sheet = document.getElementById('lecNckSheet')?.value;
        const container = document.getElementById('lecNckContainer');
        if (!container) return;
        
        if (!block) {
            container.innerHTML = '<div class="text-center" style="padding:40px;">Select a block</div>';
            return;
        }
        
        container.innerHTML = '<div class="text-center" style="padding:40px;"><div class="loading-spinner"></div><p>Loading NCK marks...</p></div>';
        
        try {
            const students = this.students.filter(s => s.block === block);
            
            if (!students.length) {
                container.innerHTML = '<div class="text-center" style="padding:40px;">No students found</div>';
                return;
            }
            
            const { data: existing, error } = await sb
                .from('nck_marks')
                .select('*')
                .eq('block', block)
                .eq('subject_name', sheet || 'XY FORMS');
            
            if (error) throw error;
            
            const marksMap = {};
            existing?.forEach(m => { marksMap[m.admission_number] = m; });
            
            let html = `<div class="table-responsive"><table class="data-table" style="width:100%;border-collapse:collapse;">
                <thead><tr style="background:#4C1D95;color:white;">
                    <th style="padding:10px;">#</th>
                    <th style="padding:10px;">Student Name</th>
                    <th style="padding:10px;">Admission</th>
                    <th style="padding:10px;">Score (%)</th>
                    <th style="padding:10px;">Grade</th>
                    <th style="padding:10px;">Status</th>
                    <th style="padding:10px;">Graded By</th>
                    <th style="padding:10px;">Actions</th>
                </tr></thead><tbody>`;
            
            for (let i = 0; i < students.length; i++) {
                const s = students[i];
                const m = marksMap[s.student_id] || {};
                const score = m.final_score !== undefined && m.final_score !== null ? m.final_score : '';
                const gradeInfo = score !== '' ? getMarksEntryGrade(parseFloat(score)) : { grade: '-', color: '#94a3b8' };
                const status = score !== '' ? (parseFloat(score) >= 60 ? 'PASS' : (parseFloat(score) > 0 ? 'FAIL' : 'PENDING')) : 'PENDING';
                const color = status === 'PASS' ? '#10b981' : (status === 'FAIL' ? '#ef4444' : '#f59e0b');
                
                html += `<tr>
                    <td>${i + 1}</td>
                    <td><strong>${s.full_name || 'N/A'}</strong></td>
                    <td>${s.student_id || 'N/A'}</td>
                    <td><input type="number" class="nck-score" data-index="${i}" value="${score}" min="0" max="100" step="0.5" style="width:70px;padding:5px;border-radius:4px;border:1px solid #e2e8f0;"></td>
                    <td id="nckGrade_${i}" style="font-weight:bold;color:${color};">${gradeInfo.grade}</td>
                    <td id="nckStatus_${i}" style="color:${color};">${status}</td>
                    <td><input type="text" class="nck-graded" data-index="${i}" value="${m.graded_by || ''}" placeholder="Lecturer" style="width:120px;padding:5px;border-radius:4px;border:1px solid #e2e8f0;"></td>
                    <td><button class="btn btn-action save-nck" data-index="${i}" data-student="${s.student_id}" style="background:#059669;padding:4px 12px;border:none;border-radius:4px;color:white;cursor:pointer;font-size:12px;"><i class="fas fa-save"></i> Save</button></td>
                </tr>`;
            }
            
            html += `</tbody></table></div>
                <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-top:20px;">
                    <div style="display:flex;gap:10px;flex-wrap:wrap;">
                        <button class="btn btn-action" id="saveAllNckMarksBtn" style="background:#059669;padding:8px 20px;border:none;border-radius:6px;color:white;cursor:pointer;font-weight:600;">
                            <i class="fas fa-save"></i> Save All NCK Marks
                        </button>
                        <button class="btn btn-action" id="fillDownNckBtn" style="background:#3b82f6;padding:8px 20px;border:none;border-radius:6px;color:white;cursor:pointer;font-weight:600;">
                            <i class="fas fa-arrow-down"></i> Fill Down
                        </button>
                    </div>
                </div>`;
            
            container.innerHTML = html;
            
            document.querySelectorAll('.nck-score').forEach(input => {
                input.addEventListener('change', function() {
                    const idx = parseInt(this.dataset.index);
                    LecturerMarks.updateNCKTotal(idx);
                });
                input.addEventListener('input', function() {
                    const idx = parseInt(this.dataset.index);
                    LecturerMarks.updateNCKTotal(idx);
                });
            });
            
            document.querySelectorAll('.save-nck').forEach(btn => {
                btn.addEventListener('click', function() {
                    const idx = parseInt(this.dataset.index);
                    const studentId = this.dataset.student;
                    LecturerMarks.saveSingleNCK(idx, studentId);
                });
            });
            
            document.getElementById('saveAllNckMarksBtn')?.addEventListener('click', () => this.saveAllNCK());
            document.getElementById('fillDownNckBtn')?.addEventListener('click', () => this.fillDownNCK());
            
        } catch (error) {
            container.innerHTML = `<div class="alert alert-danger" style="padding:20px;background:#fee2e2;border-radius:8px;color:#991b1b;">Error: ${error.message}</div>`;
        }
    },
    
    updateNCKTotal(idx) {
        const score = parseFloat(document.querySelector(`.nck-score[data-index="${idx}"]`)?.value) || 0;
        const gradeInfo = getMarksEntryGrade(score);
        const status = score >= 60 ? 'PASS' : (score > 0 ? 'FAIL' : 'PENDING');
        const color = status === 'PASS' ? '#10b981' : (status === 'FAIL' ? '#ef4444' : '#f59e0b');
        
        const gradeEl = document.getElementById(`nckGrade_${idx}`);
        const statusEl = document.getElementById(`nckStatus_${idx}`);
        
        if (gradeEl) { gradeEl.innerHTML = score > 0 ? gradeInfo.grade : '-'; gradeEl.style.color = color; }
        if (statusEl) { statusEl.innerHTML = status; statusEl.style.color = color; }
    },
    
    fillDownNCK() {
        const inputs = document.querySelectorAll('.nck-score');
        if (!inputs.length) return;
        
        const val = inputs[0].value;
        inputs.forEach((input, i) => {
            if (i > 0) {
                input.value = val;
                this.updateNCKTotal(i);
            }
        });
        showNotification('Values filled down!', 'success');
    },
    
    async saveSingleNCK(idx, studentId) {
        const block = document.getElementById('lecNckBlock').value;
        const sheet = document.getElementById('lecNckSheet').value;
        const score = parseFloat(document.querySelector(`.nck-score[data-index="${idx}"]`)?.value) || 0;
        const gradedBy = document.querySelector(`.nck-graded[data-index="${idx}"]`)?.value;
        const student = this.students.find(s => s.student_id === studentId);
        
        const gradeInfo = getMarksEntryGrade(score);
        
        try {
            const { data: existing } = await sb
                .from('nck_marks')
                .select('id')
                .eq('admission_number', studentId)
                .eq('subject_name', sheet)
                .eq('block', block)
                .maybeSingle();
            
            const markData = {
                admission_number: studentId,
                student_name: student?.full_name || '',
                block: block,
                subject_name: sheet || 'XY FORMS',
                final_score: score || null,
                grade: gradeInfo.grade || null,
                status: score >= 60 ? 'passed' : (score > 0 ? 'failed' : 'pending'),
                graded_by: gradedBy || me_currentLecturer?.profile?.full_name || 'Lecturer',
                updated_at: new Date().toISOString()
            };
            
            let result;
            if (existing) {
                result = await sb
                    .from('nck_marks')
                    .update(markData)
                    .eq('id', existing.id);
            } else {
                markData.created_at = new Date().toISOString();
                result = await sb
                    .from('nck_marks')
                    .insert([markData]);
            }
            
            if (result.error) throw new Error(result.error.message);
            
            showNotification('✅ Saved!', 'success');
            await this.loadNCKMarks();
            
        } catch (error) {
            showNotification('Error: ' + error.message, 'error');
        }
    },
    
    async saveAllNCK() {
        const inputs = document.querySelectorAll('.nck-score');
        if (!inputs.length) {
            showNotification('No data to save', 'error');
            return;
        }
        
        showLoading('Saving all NCK marks...');
        let saved = 0;
        let errors = 0;
        
        for (let i = 0; i < inputs.length; i++) {
            const student = this.students[i];
            if (!student) continue;
            
            const score = parseFloat(document.querySelector(`.nck-score[data-index="${i}"]`)?.value) || 0;
            const gradedBy = document.querySelector(`.nck-graded[data-index="${i}"]`)?.value;
            const gradeInfo = getMarksEntryGrade(score);
            
            try {
                const { data: existing } = await sb
                    .from('nck_marks')
                    .select('id')
                    .eq('admission_number', student.student_id)
                    .eq('subject_name', document.getElementById('lecNckSheet').value)
                    .eq('block', document.getElementById('lecNckBlock').value)
                    .maybeSingle();
                
                const markData = {
                    admission_number: student.student_id,
                    student_name: student.full_name,
                    block: document.getElementById('lecNckBlock').value,
                    subject_name: document.getElementById('lecNckSheet').value,
                    final_score: score || null,
                    grade: gradeInfo.grade || null,
                    status: score >= 60 ? 'passed' : (score > 0 ? 'failed' : 'pending'),
                    graded_by: gradedBy || me_currentLecturer?.profile?.full_name || 'Lecturer',
                    updated_at: new Date().toISOString()
                };
                
                let result;
                if (existing) {
                    result = await sb
                        .from('nck_marks')
                        .update(markData)
                        .eq('id', existing.id);
                } else {
                    markData.created_at = new Date().toISOString();
                    result = await sb
                        .from('nck_marks')
                        .insert([markData]);
                }
                
                if (result.error) {
                    errors++;
                    console.error('Error saving NCK for', student.student_id, ':', result.error);
                } else {
                    saved++;
                }
            } catch (err) {
                errors++;
                console.error('Error saving NCK for', student.student_id, ':', err);
            }
        }
        
        hideLoading();
        showNotification(`✅ Saved ${saved} NCK records${errors > 0 ? `, ${errors} errors` : ''}`, errors > 0 ? 'warning' : 'success');
        await this.loadNCKMarks();
    },
    
    updateStats() {
        const totalMarks = this.marks.length || 0;
        const totalNck = this.nckMarks.length || 0;
        const avgScore = this.calculateAverageScore();
        
        const totalInternal = document.getElementById('lecTotalInternal');
        const totalNckEl = document.getElementById('lecTotalNck');
        const avgEl = document.getElementById('lecAvgScore');
        
        if (totalInternal) totalInternal.textContent = totalMarks;
        if (totalNckEl) totalNckEl.textContent = totalNck;
        if (avgEl) avgEl.textContent = avgScore + '%';
    },
    
    calculateAverageScore() {
        const allScores = [];
        document.querySelectorAll('.internal-exam').forEach(input => {
            const val = parseFloat(input.value);
            if (!isNaN(val) && val > 0) allScores.push(val);
        });
        
        if (!allScores.length) return 0;
        const avg = allScores.reduce((a, b) => a + b, 0) / allScores.length;
        return Math.round(avg);
    },
    
    setupEventListeners() {
        document.getElementById('lecBlockSelect')?.addEventListener('change', () => {
            this.loadSubjects();
            this.loadInternalMarks();
        });
        
        document.getElementById('lecSubjectSelect')?.addEventListener('change', () => {
            this.loadInternalMarks();
        });
        
        document.getElementById('lecNckBlock')?.addEventListener('change', () => {
            this.loadNCKMarks();
        });
        
        document.getElementById('lecNckSheet')?.addEventListener('change', () => {
            this.loadNCKMarks();
        });
        
        document.getElementById('lecTabInternal')?.addEventListener('click', () => {
            switchLecturerMarksTab('internal');
        });
        
        document.getElementById('lecTabNck')?.addEventListener('click', () => {
            switchLecturerMarksTab('nck');
        });
        
        document.getElementById('lecTabAnalytics')?.addEventListener('click', () => {
            switchLecturerMarksTab('analytics');
        });
    },
    
    async refresh() {
        await this.loadMarksManagement();
        showNotification('Marks refreshed!', 'success');
    }
};

// ============================================================
// STANDALONE FUNCTIONS - CALLED FROM HTML
// ============================================================

/**
 * Load blocks based on selected program
 * Called from HTML: onchange="loadMEBlocks()"
 */
async function loadMEBlocks() {
    console.log('📚 Loading blocks...');
    const program = document.getElementById('me_program_select')?.value;
    const blockSelect = document.getElementById('me_block_select');
    const subjectSelect = document.getElementById('me_subject_select');
    const year = document.getElementById('me_year_select')?.value;
    
    if (!program) {
        if (blockSelect) blockSelect.innerHTML = '<option value="">-- Select Program First --</option>';
        if (subjectSelect) subjectSelect.innerHTML = '<option value="">-- Select Subject --</option>';
        return;
    }
    
    me_currentProgram = program;
    me_currentYear = year;
    
    if (blockSelect) {
        blockSelect.innerHTML = '<option value="">Loading blocks...</option>';
    }
    
    try {
        const { data, error } = await sb
            .from('units_catalog')
            .select('block')
            .eq('program', program)
            .eq('status', 'active')
            .order('block', { ascending: true });
        
        if (error) throw error;
        
        const blocks = [...new Set(data.map(d => d.block))];
        
        if (blockSelect) {
            blockSelect.innerHTML = '<option value="">-- Select Block --</option>';
            blocks.forEach(block => {
                const option = document.createElement('option');
                option.value = block;
                option.textContent = block.replace(/_/g, ' ');
                blockSelect.appendChild(option);
            });
            
            if (blocks.length === 0) {
                blockSelect.innerHTML = '<option value="">No blocks found</option>';
            }
        }
        
        if (subjectSelect) {
            subjectSelect.innerHTML = '<option value="">-- Select Subject --</option>';
        }
        
    } catch (error) {
        console.error('Error loading blocks:', error);
        if (blockSelect) {
            blockSelect.innerHTML = '<option value="">Error loading blocks</option>';
        }
        showNotification('Error loading blocks: ' + error.message, 'error');
    }
}

/**
 * Load subjects for selected block
 * Called from HTML: onchange="loadMESubjects()"
 */
async function loadMESubjects() {
    console.log('📖 Loading subjects...');
    const program = document.getElementById('me_program_select')?.value;
    const block = document.getElementById('me_block_select')?.value;
    const subjectSelect = document.getElementById('me_subject_select');
    const year = document.getElementById('me_year_select')?.value;
    
    if (!program || !block) {
        if (subjectSelect) {
            subjectSelect.innerHTML = '<option value="">-- Select Block First --</option>';
        }
        return;
    }
    
    me_currentBlock = block;
    
    if (subjectSelect) {
        subjectSelect.innerHTML = '<option value="">Loading subjects...</option>';
    }
    
    try {
        const { data, error } = await sb
            .from('units_catalog')
            .select('unit_code, unit_name, assessment_type')
            .eq('program', program)
            .eq('block', block)
            .eq('status', 'active')
            .order('unit_name', { ascending: true });
        
        if (error) throw error;
        
        if (subjectSelect) {
            subjectSelect.innerHTML = '<option value="">-- Select Subject --</option>';
            data.forEach(unit => {
                const option = document.createElement('option');
                option.value = unit.unit_name;
                option.dataset.assessment = unit.assessment_type || 'full';
                option.dataset.code = unit.unit_code || '';
                option.textContent = `${unit.unit_code || ''} - ${unit.unit_name}`;
                subjectSelect.appendChild(option);
            });
            
            if (data.length === 0) {
                subjectSelect.innerHTML = '<option value="">No subjects found</option>';
            }
            
            // Update assessment type dropdown
            const assessmentSelect = document.getElementById('me_assessment_type');
            if (assessmentSelect && data.length > 0) {
                const firstUnit = data[0];
                assessmentSelect.value = firstUnit.assessment_type || 'full';
                assessmentSelect.disabled = false;
            }
        }
        
    } catch (error) {
        console.error('Error loading subjects:', error);
        if (subjectSelect) {
            subjectSelect.innerHTML = '<option value="">Error loading subjects</option>';
        }
        showNotification('Error loading subjects: ' + error.message, 'error');
    }
}

/**
 * Load marks for selected subject
 * Called from HTML: onchange="loadMarksEntry()"
 */
async function loadMarksEntry() {
    console.log('📊 Loading marks entry...');
    const program = document.getElementById('me_program_select')?.value;
    const block = document.getElementById('me_block_select')?.value;
    const subject = document.getElementById('me_subject_select')?.value;
    const year = document.getElementById('me_year_select')?.value;
    const subjectSelect = document.getElementById('me_subject_select');
    const selectedOption = subjectSelect?.options[subjectSelect.selectedIndex];
    const assessmentType = selectedOption?.dataset?.assessment || 'full';
    const unitCode = selectedOption?.dataset?.code || '';
    const container = document.getElementById('me_marks_container');
    
    if (!program || !block || !subject) {
        if (container) {
            container.innerHTML = `
                <div style="text-align: center; padding: 60px 20px;">
                    <i class="fas fa-pen-alt" style="font-size: 48px; color: #94a3b8; margin-bottom: 16px; display: block;"></i>
                    <h3 style="color: #1e293b;">Select Program, Block and Subject</h3>
                    <p style="color: #94a3b8;">Choose from the dropdowns above to load marks</p>
                </div>
            `;
        }
        return;
    }
    
    me_currentProgram = program;
    me_currentBlock = block;
    me_currentSubject = subject;
    me_currentYear = year;
    me_currentAssessmentType = assessmentType;
    
    if (container) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px;">
                <div class="loading-spinner"></div>
                <p style="color: #6b7280; margin-top: 10px;">Loading marks for ${unitCode || subject}...</p>
            </div>
        `;
    }
    
    try {
        // Get marks from Supabase
        const { data: marks, error } = await sb
            .from('student_marks')
            .select('*')
            .eq('block', block)
            .eq('subject_name', subject)
            .eq('academic_year', year);
        
        if (error) throw error;
        
        // Get students for this program/block
        const { data: students, error: studentError } = await sb
            .from('consolidated_user_profiles_table')
            .select('student_id, full_name, block, intake_year, program')
            .eq('role', 'student')
            .eq('program', program)
            .eq('block', block);
        
        if (studentError) throw studentError;
        
        console.log('📊 Students found:', students?.length || 0);
        
        // Build marks map
        const marksMap = {};
        marks?.forEach(m => {
            marksMap[m.admission_number] = m;
        });
        
        // Combine data
        const fullMarks = students?.map(s => {
            const studentId = s.student_id || '';
            const existing = marksMap[studentId] || {};
            
            return {
                admission: studentId,
                name: s.full_name || 'Unknown',
                program: s.program || program,
                cat1: existing.cat1_score || '',
                cat2: existing.cat2_score || '',
                exam: existing.exam_score || '',
                final: existing.final_score || '',
                grade: existing.grade || '',
                gradedBy: existing.graded_by || '',
                assessmentType: existing.assessment_type || assessmentType,
                id: existing.id || null,
                approval_status: existing.approval_status || 'draft'
            };
        }) || [];
        
        me_currentMarks = fullMarks;
        renderMarksEntryTable(fullMarks, unitCode, assessmentType);
        updateMarksEntryStats(fullMarks, assessmentType);
        
        // Check approval status
        checkMarksApprovalStatus(fullMarks);
        
    } catch (error) {
        console.error('Error loading marks:', error);
        if (container) {
            container.innerHTML = `
                <div style="text-align: center; padding: 40px;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 48px; color: #f59e0b; margin-bottom: 16px; display: block;"></i>
                    <h4 style="color: #991b1b;">Error loading marks</h4>
                    <p style="color: #64748b;">${error.message}</p>
                    <button onclick="loadMarksEntry()" class="btn-action" style="margin-top: 12px; padding: 8px 20px; background: #4C1D95; color: white; border: none; border-radius: 6px; cursor: pointer;">
                        <i class="fas fa-sync-alt"></i> Retry
                    </button>
                </div>
            `;
        }
        showNotification('Error loading marks: ' + error.message, 'error');
    }
}

/**
 * Render marks entry table
 */
function renderMarksEntryTable(marks, unitCode, assessmentType) {
    const container = document.getElementById('me_marks_container');
    if (!container) return;
    
    if (!marks || marks.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px;">
                <i class="fas fa-users" style="font-size: 48px; color: #94a3b8; margin-bottom: 16px; display: block;"></i>
                <h4 style="color: #1e293b;">No students found</h4>
                <p style="color: #94a3b8;">No students are enrolled in this block</p>
            </div>
        `;
        return;
    }
    
    const withScores = marks.filter(m => m.cat1 > 0 || m.cat2 > 0 || m.exam > 0);
    const passing = marks.filter(m => {
        const total = calculateMarksEntryTotal(m.cat1, m.cat2, m.exam, assessmentType);
        return total >= 60;
    });
    
    // Check approval status
    const pendingCount = marks.filter(m => m.approval_status === 'pending').length;
    const approvedCount = marks.filter(m => m.approval_status === 'approved').length;
    const rejectedCount = marks.filter(m => m.approval_status === 'rejected').length;
    
    let html = `
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; margin-bottom: 16px;">
            <div>
                <h3 style="margin: 0; color: #0f172a;">${unitCode || me_currentSubject}</h3>
                <span style="font-size: 12px; color: #64748b;">${me_currentProgram} | ${me_currentBlock?.replace('_', ' ') || ''} | ${me_currentYear}</span>
                <span style="font-size: 12px; color: #64748b; margin-left: 12px; background: #e0f2fe; padding: 2px 12px; border-radius: 40px;">👥 ${marks.length} students</span>
                <span style="font-size: 12px; color: #059669; margin-left: 12px; background: #d1fae5; padding: 2px 12px; border-radius: 40px;">📊 ${withScores.length} with scores</span>
                <span style="font-size: 12px; color: #10b981; margin-left: 12px; background: #d1fae5; padding: 2px 12px; border-radius: 40px;">✅ ${passing.length} passing</span>
                ${pendingCount > 0 ? `<span style="font-size: 12px; color: #d97706; margin-left: 12px; background: #fef3c7; padding: 2px 12px; border-radius: 40px;">⏳ ${pendingCount} pending</span>` : ''}
                ${approvedCount > 0 ? `<span style="font-size: 12px; color: #065f46; margin-left: 12px; background: #d1fae5; padding: 2px 12px; border-radius: 40px;">✅ ${approvedCount} approved</span>` : ''}
            </div>
            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                <button onclick="saveMarksEntry()" class="btn-action" style="background: #059669; padding: 8px 16px; border: none; border-radius: 6px; color: white; cursor: pointer; font-weight: 600;">
                    <i class="fas fa-save"></i> Save All
                </button>
                <button onclick="submitMarksForApproval()" class="btn-action" style="background: #4C1D95; padding: 8px 16px; border: none; border-radius: 6px; color: white; cursor: pointer; font-weight: 600;">
                    <i class="fas fa-paper-plane"></i> Submit for Approval
                </button>
                <button onclick="exportMarksEntry()" class="btn-action" style="background: #2563eb; padding: 8px 16px; border: none; border-radius: 6px; color: white; cursor: pointer; font-weight: 600;">
                    <i class="fas fa-file-export"></i> Export CSV
                </button>
                <button onclick="loadMarksEntry()" class="btn-action" style="background: #6b7280; padding: 8px 16px; border: none; border-radius: 6px; color: white; cursor: pointer; font-weight: 600;">
                    <i class="fas fa-sync-alt"></i> Refresh
                </button>
            </div>
        </div>
        
        <div style="overflow-x: auto;">
            <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                <thead>
                    <tr style="background: linear-gradient(135deg, #4C1D95, #7c3aed); color: white;">
                        <th style="padding: 10px 6px; text-align: center; width: 35px;">#</th>
                        <th style="padding: 10px 8px; text-align: left;">Admission</th>
                        <th style="padding: 10px 8px; text-align: left;">Name</th>
                        <th style="padding: 10px 8px; text-align: center;">CAT1 (0-30)</th>
                        ${assessmentType === 'full' ? '<th style="padding: 10px 8px; text-align: center;">CAT2 (0-30)</th>' : ''}
                        <th style="padding: 10px 8px; text-align: center;">Exam (0-${assessmentType === 'exam_only' ? 100 : 70})</th>
                        <th style="padding: 10px 8px; text-align: center;">Total</th>
                        <th style="padding: 10px 8px; text-align: center;">Grade</th>
                        <th style="padding: 10px 8px; text-align: center;">Rating</th>
                        <th style="padding: 10px 8px; text-align: center;">Status</th>
                    </tr>
                </thead>
                <tbody>`;
    
    marks.forEach((m, i) => {
        const cat1 = parseFloat(m.cat1) || 0;
        const cat2 = parseFloat(m.cat2) || 0;
        const exam = parseFloat(m.exam) || 0;
        const total = calculateMarksEntryTotal(cat1, cat2, exam, assessmentType);
        const gradeInfo = getMarksEntryGrade(total);
        const rowClass = total >= 60 ? 'pass-row' : (total > 0 ? 'fail-row' : 'pending-row');
        const displayTotal = total > 0 ? total : '--';
        const displayGrade = total > 0 ? gradeInfo.grade : '--';
        const displayPoints = total > 0 ? gradeInfo.points.toFixed(1) : '--';
        
        const approvalBadge = {
            'pending': '<span style="background:#fef3c7;color:#92400e;padding:2px 10px;border-radius:12px;font-size:11px;">⏳ Pending</span>',
            'approved': '<span style="background:#d1fae5;color:#065f46;padding:2px 10px;border-radius:12px;font-size:11px;">✅ Approved</span>',
            'rejected': '<span style="background:#fee2e2;color:#991b1b;padding:2px 10px;border-radius:12px;font-size:11px;">❌ Rejected</span>',
            'draft': '<span style="background:#e5e7eb;color:#6b7280;padding:2px 10px;border-radius:12px;font-size:11px;">📝 Draft</span>'
        }[m.approval_status] || '<span style="background:#e5e7eb;color:#6b7280;padding:2px 10px;border-radius:12px;font-size:11px;">📝 Draft</span>';
        
        html += `<tr class="${rowClass}" style="${total > 0 ? `background: ${total >= 60 ? '#d1fae5' : '#fee2e2'};` : ''}">
            <td style="padding: 8px 6px; text-align: center; font-size: 12px; color: #94a3b8;">${i + 1}</td>
            <td style="padding: 8px 8px; font-weight: 500; font-size: 12px;">${m.admission || 'N/A'}</td>
            <td style="padding: 8px 8px;"><strong>${m.name || 'Unknown'}</strong></td>
            <td style="padding: 8px; text-align: center;">
                <input type="number" id="me_cat1_${i}" value="${cat1}" min="0" max="30" step="0.5" style="width: 60px; padding: 6px; border-radius: 6px; border: 1px solid #e2e8f0; text-align: center;" onchange="updateMarksEntryRow(${i})">
            </td>
            ${assessmentType === 'full' ? `
            <td style="padding: 8px; text-align: center;">
                <input type="number" id="me_cat2_${i}" value="${cat2}" min="0" max="30" step="0.5" style="width: 60px; padding: 6px; border-radius: 6px; border: 1px solid #e2e8f0; text-align: center;" onchange="updateMarksEntryRow(${i})">
            </td>` : ''}
            <td style="padding: 8px; text-align: center;">
                <input type="number" id="me_exam_${i}" value="${exam}" min="0" max="${assessmentType === 'exam_only' ? 100 : 70}" step="0.5" style="width: 60px; padding: 6px; border-radius: 6px; border: 1px solid #e2e8f0; text-align: center;" onchange="updateMarksEntryRow(${i})">
            </td>
            <td id="me_total_${i}" style="padding: 8px 6px; text-align: center; font-weight: bold; ${total >= 60 ? 'color: #065f46;' : (total > 0 ? 'color: #991b1b;' : 'color: #f59e0b;')}">${displayTotal}</td>
            <td id="me_grade_${i}" style="padding: 8px 6px; text-align: center; font-weight: bold; font-size: 16px; color: ${gradeInfo.color};">${displayGrade}</td>
            <td id="me_points_${i}" style="padding: 8px 6px; text-align: center; font-weight: bold; font-size: 15px; color: ${gradeInfo.color};">${displayPoints}</td>
            <td style="padding: 8px 6px; text-align: center;">
                ${total > 0 ? `<span style="background: ${total >= 60 ? '#d1fae5' : '#fee2e2'}; padding: 3px 12px; border-radius: 12px; color: ${total >= 60 ? '#065f46' : '#991b1b'}; font-weight: 600; display: inline-block;">${gradeInfo.rating}</span>` : '<span style="color: #94a3b8;">PENDING</span>'}
                <br><span style="font-size: 10px;">${approvalBadge}</span>
            </td>
        </tr>`;
    });
    
    html += `
                </tbody>
            </table>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-top:16px;">
            <button onclick="saveMarksEntry()" class="btn-action" style="background: #059669; padding: 10px 24px; border: none; border-radius: 8px; color: white; cursor: pointer; font-weight: 600; font-size: 14px;">
                <i class="fas fa-save"></i> 💾 Save All Marks
            </button>
            <button onclick="submitMarksForApproval()" class="btn-action" style="background: #4C1D95; padding: 10px 24px; border: none; border-radius: 8px; color: white; cursor: pointer; font-weight: 600; font-size: 14px;">
                <i class="fas fa-paper-plane"></i> 📤 Submit for Approval
            </button>
        </div>
    `;
    
    container.innerHTML = html;
}

/**
 * Update marks row when input changes
 */
function updateMarksEntryRow(index) {
    const cat1 = parseFloat(document.getElementById(`me_cat1_${index}`)?.value) || 0;
    const cat2 = parseFloat(document.getElementById(`me_cat2_${index}`)?.value) || 0;
    const exam = parseFloat(document.getElementById(`me_exam_${index}`)?.value) || 0;
    const assessmentType = me_currentAssessmentType;
    
    const total = calculateMarksEntryTotal(cat1, cat2, exam, assessmentType);
    const gradeInfo = getMarksEntryGrade(total);
    
    // Update total
    const totalEl = document.getElementById(`me_total_${index}`);
    if (totalEl) {
        totalEl.textContent = total > 0 ? total : '--';
        totalEl.style.color = total >= 60 ? '#065f46' : (total > 0 ? '#991b1b' : '#f59e0b');
    }
    
    // Update grade
    const gradeEl = document.getElementById(`me_grade_${index}`);
    if (gradeEl) {
        gradeEl.textContent = total > 0 ? gradeInfo.grade : '--';
        gradeEl.style.color = gradeInfo.color;
    }
    
    // Update points
    const pointsEl = document.getElementById(`me_points_${index}`);
    if (pointsEl) {
        pointsEl.textContent = total > 0 ? gradeInfo.points.toFixed(1) : '--';
        pointsEl.style.color = gradeInfo.color;
    }
    
    // Update rating in the status cell
    const row = totalEl?.closest('tr');
    if (row) {
        const statusCell = row.cells[row.cells.length - 1];
        if (statusCell) {
            if (total > 0) {
                const ratingSpan = statusCell.querySelector('span');
                if (ratingSpan) {
                    ratingSpan.textContent = gradeInfo.rating;
                    ratingSpan.style.background = total >= 60 ? '#d1fae5' : '#fee2e2';
                    ratingSpan.style.color = total >= 60 ? '#065f46' : '#991b1b';
                }
            } else {
                statusCell.innerHTML = '<span style="color: #94a3b8;">PENDING</span><br><span style="font-size:10px;">📝 Draft</span>';
            }
        }
    }
    
    // Update me_currentMarks
    if (me_currentMarks && me_currentMarks[index]) {
        me_currentMarks[index].cat1 = cat1;
        me_currentMarks[index].cat2 = cat2;
        me_currentMarks[index].exam = exam;
    }
}

/**
 * Calculate total based on assessment type
 */
function calculateMarksEntryTotal(cat1, cat2, exam, type) {
    let total = 0;
    if (type === 'full') {
        total = Math.round(((Math.min(cat1,30) + Math.min(cat2,30)) / 60 * 30 + Math.min(exam,70)) * 10) / 10;
    } else if (type === 'single_cat') {
        total = Math.round((Math.min(cat1,30) + Math.min(exam,70)) * 10) / 10;
    } else if (type === 'exam_only') {
        total = Math.round(Math.min(exam,100) * 10) / 10;
    } else if (type === 'cats_only') {
        total = Math.round(((Math.min(cat1,30) + Math.min(cat2,30)) / 60) * 100 * 10) / 10;
    } else if (type === 'cat_only') {
        total = Math.round((Math.min(cat1,30) / 30) * 100 * 10) / 10;
    }
    return total;
}

/**
 * Get grade info
 */
function getMarksEntryGrade(score) {
    if (score >= 75) return { grade: 'A', rating: 'Distinction', points: 4.0, color: '#065f46' };
    else if (score >= 65) return { grade: 'B', rating: 'Credit', points: 3.0, color: '#1e40af' };
    else if (score >= 60) return { grade: 'C', rating: 'Pass', points: 2.0, color: '#92400e' };
    else return { grade: 'D', rating: 'Fail', points: 0.0, color: '#991b1b' };
}

/**
 * Update stats
 */
function updateMarksEntryStats(marks, assessmentType) {
    const withScores = marks.filter(m => m.cat1 > 0 || m.cat2 > 0 || m.exam > 0);
    const passing = marks.filter(m => {
        const total = calculateMarksEntryTotal(m.cat1, m.cat2, m.exam, assessmentType);
        return total >= 60;
    });
    const avg = withScores.length > 0 ? 
        withScores.reduce((sum, m) => sum + calculateMarksEntryTotal(m.cat1, m.cat2, m.exam, assessmentType), 0) / withScores.length : 0;
    
    const totalEl = document.getElementById('me_total_students');
    const subjectsEl = document.getElementById('me_total_subjects');
    const passEl = document.getElementById('me_pass_rate');
    const avgEl = document.getElementById('me_class_avg');
    
    if (totalEl) totalEl.textContent = marks.length;
    if (subjectsEl) subjectsEl.textContent = marks.length > 0 ? 1 : 0;
    if (passEl) passEl.textContent = marks.length > 0 ? Math.round((passing.length / marks.length) * 100) + '%' : '0%';
    if (avgEl) avgEl.textContent = Math.round(avg) + '%';
}

/**
 * Check approval status
 */
function checkMarksApprovalStatus(marks) {
    const pendingCount = marks.filter(m => m.approval_status === 'pending').length;
    const approvedCount = marks.filter(m => m.approval_status === 'approved').length;
    const rejectedCount = marks.filter(m => m.approval_status === 'rejected').length;
    
    const banner = document.getElementById('approvalStatusBanner');
    const statusText = document.getElementById('approvalStatusText');
    const statusBadge = document.getElementById('approvalStatusBadge');
    const submitBtn = document.getElementById('submitForApprovalBtn');
    const withdrawBtn = document.getElementById('withdrawApprovalBtn');
    
    if (!banner) return;
    
    if (pendingCount > 0) {
        banner.style.display = 'block';
        banner.style.borderLeftColor = '#f59e0b';
        banner.style.background = '#fef3c7';
        if (statusText) statusText.textContent = 'Pending Admin Approval';
        if (statusBadge) {
            statusBadge.textContent = '⏳ Pending';
            statusBadge.className = 'badge badge-warning';
        }
        if (submitBtn) submitBtn.style.display = 'none';
        if (withdrawBtn) withdrawBtn.style.display = 'inline-block';
        // Show approval details
        document.getElementById('approvalDetails').style.display = 'block';
        document.getElementById('rejectionReason').style.display = 'none';
    } else if (approvedCount > 0) {
        banner.style.display = 'block';
        banner.style.borderLeftColor = '#10b981';
        banner.style.background = '#d1fae5';
        if (statusText) statusText.textContent = '✅ Approved by Admin';
        if (statusBadge) {
            statusBadge.textContent = '✅ Approved';
            statusBadge.className = 'badge badge-success';
        }
        if (submitBtn) submitBtn.style.display = 'none';
        if (withdrawBtn) withdrawBtn.style.display = 'none';
        document.getElementById('approvalDetails').style.display = 'block';
        document.getElementById('rejectionReason').style.display = 'none';
    } else if (rejectedCount > 0) {
        banner.style.display = 'block';
        banner.style.borderLeftColor = '#dc2626';
        banner.style.background = '#fee2e2';
        if (statusText) statusText.textContent = '❌ Rejected by Admin';
        if (statusBadge) {
            statusBadge.textContent = '❌ Rejected';
            statusBadge.className = 'badge badge-danger';
        }
        if (submitBtn) submitBtn.style.display = 'inline-block';
        if (withdrawBtn) withdrawBtn.style.display = 'none';
        document.getElementById('approvalDetails').style.display = 'block';
        document.getElementById('rejectionReason').style.display = 'block';
    } else {
        banner.style.display = 'none';
        if (submitBtn) submitBtn.style.display = 'inline-block';
        if (withdrawBtn) withdrawBtn.style.display = 'none';
    }
}

/**
 * Save all marks
 */
async function saveMarksEntry() {
    const program = me_currentProgram;
    const block = me_currentBlock;
    const subject = me_currentSubject;
    const year = me_currentYear;
    const assessmentType = me_currentAssessmentType;
    
    const marksData = [];
    const rows = document.querySelectorAll('#me_marks_container table tbody tr');
    
    rows.forEach((row, index) => {
        const cat1Input = document.getElementById(`me_cat1_${index}`);
        const cat2Input = document.getElementById(`me_cat2_${index}`);
        const examInput = document.getElementById(`me_exam_${index}`);
        
        if (cat1Input || cat2Input || examInput) {
            const admission = row.cells[1]?.textContent?.trim() || '';
            const name = row.cells[2]?.textContent?.trim() || '';
            const cat1 = parseFloat(cat1Input?.value) || 0;
            const cat2 = parseFloat(cat2Input?.value) || 0;
            const exam = parseFloat(examInput?.value) || 0;
            
            if (admission) {
                marksData.push({
                    admission: admission,
                    name: name,
                    cat1: cat1,
                    cat2: cat2,
                    exam: exam,
                    assessmentType: assessmentType
                });
            }
        }
    });
    
    if (marksData.length === 0) {
        showNotification('No marks to save', 'warning');
        return;
    }
    
    showLoading('Saving marks...');
    
    try {
        let saved = 0;
        let errors = 0;
        
        for (const mark of marksData) {
            // Check if exists
            const { data: existing } = await sb
                .from('student_marks')
                .select('id')
                .eq('admission_number', mark.admission)
                .eq('subject_name', subject)
                .eq('block', block)
                .eq('academic_year', year)
                .maybeSingle();
            
            const total = calculateMarksEntryTotal(mark.cat1, mark.cat2, mark.exam, assessmentType);
            const gradeInfo = getMarksEntryGrade(total);
            
            const markData = {
                admission_number: mark.admission,
                student_name: mark.name || 'Unknown',
                block: block,
                subject_name: subject,
                assessment_type: assessmentType,
                cat1_score: mark.cat1,
                cat2_score: mark.cat2,
                exam_score: mark.exam,
                final_score: total,
                grade: gradeInfo.grade,
                academic_year: year,
                updated_at: new Date().toISOString()
            };
            
            let result;
            if (existing) {
                result = await sb
                    .from('student_marks')
                    .update(markData)
                    .eq('id', existing.id);
            } else {
                markData.created_at = new Date().toISOString();
                result = await sb
                    .from('student_marks')
                    .insert([markData]);
            }
            
            if (result.error) {
                errors++;
                console.error('Error saving mark:', result.error);
            } else {
                saved++;
            }
        }
        
        hideLoading();
        showNotification(`✅ Saved ${saved} marks${errors > 0 ? `, ${errors} errors` : ''}`, errors > 0 ? 'warning' : 'success');
        
        // Reload marks to show updated data
        setTimeout(() => loadMarksEntry(), 500);
        
    } catch (error) {
        hideLoading();
        showNotification('❌ Error saving marks: ' + error.message, 'error');
    }
}

/**
 * Submit marks for approval
 */
async function submitMarksForApproval() {
    const block = me_currentBlock;
    const subject = me_currentSubject;
    const year = me_currentYear;
    
    if (!block || !subject) {
        showNotification('Please load marks first', 'warning');
        return;
    }
    
    // Check if any marks exist
    const { data: existing } = await sb
        .from('student_marks')
        .select('id, approval_status')
        .eq('block', block)
        .eq('subject_name', subject)
        .eq('academic_year', year);
    
    if (!existing || existing.length === 0) {
        showNotification('No marks to submit for approval', 'warning');
        return;
    }
    
    // Check if already submitted
    const alreadyPending = existing.filter(m => m.approval_status === 'pending');
    if (alreadyPending.length > 0) {
        showNotification(`${alreadyPending.length} marks already pending approval`, 'warning');
        return;
    }
    
    if (!confirm(`Submit ${existing.length} marks for ${subject} in ${block.replace('_', ' ')} for admin approval?`)) return;
    
    showLoading('Submitting for approval...');
    
    try {
        // Update all marks to pending
        const { error } = await sb
            .from('student_marks')
            .update({
                approval_status: 'pending',
                submitted_at: new Date().toISOString(),
                submitted_by: me_currentLecturer?.profile?.id || null
            })
            .eq('block', block)
            .eq('subject_name', subject)
            .eq('academic_year', year);
        
        if (error) throw error;
        
        // Log the submission
        await sb
            .from('mark_approval_logs')
            .insert({
                mark_id: null,
                action: 'submitted',
                action_by: me_currentLecturer?.profile?.id || null,
                action_by_name: me_currentLecturer?.profile?.full_name || 'Lecturer',
                reason: `Submitted ${existing.length} marks for ${subject} in ${block}`,
                created_at: new Date().toISOString()
            });
        
        hideLoading();
        showNotification(`✅ ${existing.length} marks submitted for approval!`, 'success');
        
        // Reload marks
        await loadMarksEntry();
        
    } catch (error) {
        hideLoading();
        showNotification('❌ Error submitting for approval: ' + error.message, 'error');
    }
}

/**
 * Withdraw marks from approval
 */
async function withdrawMarksFromApproval() {
    const block = me_currentBlock;
    const subject = me_currentSubject;
    const year = me_currentYear;
    
    if (!block || !subject) {
        showNotification('Please load marks first', 'warning');
        return;
    }
    
    if (!confirm(`Withdraw ${subject} marks from admin approval?`)) return;
    
    showLoading('Withdrawing from approval...');
    
    try {
        const { error } = await sb
            .from('student_marks')
            .update({
                approval_status: 'draft',
                submitted_at: null,
                submitted_by: null
            })
            .eq('block', block)
            .eq('subject_name', subject)
            .eq('academic_year', year)
            .eq('approval_status', 'pending');
        
        if (error) throw error;
        
        hideLoading();
        showNotification('✅ Marks withdrawn from approval!', 'success');
        
        // Reload marks
        await loadMarksEntry();
        
    } catch (error) {
        hideLoading();
        showNotification('❌ Error withdrawing: ' + error.message, 'error');
    }
}

/**
 * Export marks to CSV
 */
function exportMarksEntry() {
    const marks = me_currentMarks;
    if (!marks || marks.length === 0) {
        showNotification('No data to export', 'warning');
        return;
    }
    
    const assessmentType = me_currentAssessmentType;
    const headers = ['Admission', 'Name', 'CAT1', 'CAT2', 'Exam', 'Total', 'Grade', 'Points', 'Rating', 'Approval Status'];
    const rows = marks.map(m => {
        const cat1 = m.cat1 || 0;
        const cat2 = m.cat2 || 0;
        const exam = m.exam || 0;
        const total = calculateMarksEntryTotal(cat1, cat2, exam, assessmentType);
        const gradeInfo = getMarksEntryGrade(total);
        return [
            m.admission || '',
            m.name || '',
            cat1,
            cat2,
            exam,
            total > 0 ? total : '',
            total > 0 ? gradeInfo.grade : '',
            total > 0 ? gradeInfo.points : '',
            total > 0 ? gradeInfo.rating : '',
            m.approval_status || 'draft'
        ];
    });
    
    let csv = headers.join(',') + '\n';
    rows.forEach(row => {
        csv += row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',') + '\n';
    });
    
    downloadCSV(csv, `marks_${me_currentSubject}_${me_currentBlock}_${me_currentYear}.csv`);
    showNotification('✅ Marks exported!', 'success');
}

/**
 * Switch between marks tabs
 */
function switchLecturerMarksTab(tab) {
    // Hide all tabs
    document.querySelectorAll('.marks-tab').forEach(el => {
        el.style.display = 'none';
    });
    
    // Remove active class from all tab buttons
    document.querySelectorAll('.tabs-nav .tab-btn').forEach(el => {
        el.classList.remove('active');
    });
    
    // Show selected tab
    if (tab === 'internal') {
        document.getElementById('lecInternalTab').style.display = 'block';
        document.getElementById('lecTabInternal').classList.add('active');
        LecturerMarks.loadInternalMarks();
    } else if (tab === 'nck') {
        document.getElementById('lecNckTab').style.display = 'block';
        document.getElementById('lecTabNck').classList.add('active');
        LecturerMarks.loadNCKMarks();
    } else if (tab === 'analytics') {
        document.getElementById('lecAnalyticsTab').style.display = 'block';
        document.getElementById('lecTabAnalytics').classList.add('active');
        LecturerMarks.updateStats();
    }
}

/**
 * Download CSV helper
 */
function downloadCSV(csv, filename) {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

/**
 * Show notification helper
 */
function showNotification(message, type = 'info') {
    const container = document.getElementById('feedbackMessage') || document.body;
    const notification = document.createElement('div');
    const colors = {
        success: '#059669',
        error: '#dc2626',
        warning: '#f59e0b',
        info: '#3b82f6'
    };
    notification.style.cssText = `
        position: fixed; top: 20px; right: 20px; padding: 12px 24px;
        background: ${colors[type] || '#3b82f6'}; color: white;
        border-radius: 8px; font-weight: 500; z-index: 10000;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        max-width: 400px;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transition = 'opacity 0.5s';
        setTimeout(() => notification.remove(), 500);
    }, 3000);
}

/**
 * Show loading helper
 */
function showLoading(message = 'Loading...') {
    let overlay = document.getElementById('loadingOverlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'loadingOverlay';
        overlay.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.6); z-index: 9999;
            display: flex; align-items: center; justify-content: center;
            flex-direction: column;
        `;
        overlay.innerHTML = `
            <div style="background: white; padding: 30px 40px; border-radius: 12px; text-align: center; min-width: 200px;">
                <div class="loading-spinner" style="border: 4px solid #e2e8f0; border-top: 4px solid #4C1D95; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 0 auto 15px;"></div>
                <p style="color: #1e293b; font-weight: 500;" id="loadingMessage">${message}</p>
            </div>
        `;
        document.body.appendChild(overlay);
    } else {
        document.getElementById('loadingMessage').textContent = message;
        overlay.style.display = 'flex';
    }
}

/**
 * Hide loading helper
 */
function hideLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) overlay.style.display = 'none';
}

// ============================================================
// INITIALIZATION
// ============================================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('📊 Initializing Lecturer Marks...');
    
    // Initialize the class
    setTimeout(() => {
        LecturerMarks.init();
        
        // Also detect lecturer program for the marks entry section
        setTimeout(() => {
            detectLecturerProgram();
        }, 500);
    }, 500);
});

// ============================================================
// GLOBAL EXPOSURE
// ============================================================

// Class
window.LecturerMarks = LecturerMarks;

// Standalone functions
window.loadMEBlocks = loadMEBlocks;
window.loadMESubjects = loadMESubjects;
window.loadMarksEntry = loadMarksEntry;
window.renderMarksEntryTable = renderMarksEntryTable;
window.updateMarksEntryRow = updateMarksEntryRow;
window.calculateMarksEntryTotal = calculateMarksEntryTotal;
window.getMarksEntryGrade = getMarksEntryGrade;
window.updateMarksEntryStats = updateMarksEntryStats;
window.saveMarksEntry = saveMarksEntry;
window.submitMarksForApproval = submitMarksForApproval;
window.withdrawMarksFromApproval = withdrawMarksFromApproval;
window.exportMarksEntry = exportMarksEntry;
window.switchLecturerMarksTab = switchLecturerMarksTab;
window.checkMarksApprovalStatus = checkMarksApprovalStatus;
window.detectLecturerProgram = detectLecturerProgram;
window.showNotification = showNotification;
window.showLoading = showLoading;
window.hideLoading = hideLoading;

console.log('✅ Lecturer Marks module loaded successfully!');
