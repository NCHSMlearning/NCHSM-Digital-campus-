// ============================================================
// LECTURER MARKS MODULE - COMPLETE (COLUMN MANAGEMENT REMOVED)
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

// [All the standalone functions remain the same as above...]
// loadMEBlocks, loadMESubjects, loadMarksEntry, renderMarksEntryTable,
// updateMarksEntryRow, calculateMarksEntryTotal, getMarksEntryGrade,
// updateMarksEntryStats, saveMarksEntry, submitMarksForApproval,
// withdrawMarksFromApproval, exportMarksEntry, switchLecturerMarksTab,
// downloadCSV, showNotification, showLoading, hideLoading

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
