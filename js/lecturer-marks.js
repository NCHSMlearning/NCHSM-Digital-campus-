// js/lecturer-marks.js
/**
 * NCHSM Lecturer Marks Module
 * Uses dedicated lecturer database
 */

const LecturerMarks = {
    students: [],
    marks: [],
    nckMarks: [],
    
    async init() {
        console.log('📊 Initializing Lecturer Marks...');
        await this.loadMarksManagement();
        this.setupEventListeners();
        console.log('✅ Lecturer Marks initialized');
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
            const profile = window.lecturerDB?.getCurrentUserProfile();
            const program = profile?.program || profile?.department;
            
            if (!program) {
                console.warn('No program found');
                return;
            }
            
            // ✅ Use lecturerDB
            this.students = await window.lecturerDB.getStudents(program);
            document.getElementById('lecTotalStudents').textContent = this.students.length;
            
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
            // ✅ Use lecturerDB
            const { data, error } = await window.lecturerDB.supabase
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
                data.map(u => `<option value="${u.unit_name}">${u.unit_name}${u.unit_code ? ' (' + u.unit_code + ')' : ''}</option>`).join('');
            
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
            
            // ✅ Use lecturerDB
            const existing = await window.lecturerDB.getMarks(block, subject);
            
            const marksMap = {};
            existing?.forEach(m => { marksMap[m.admission_number] = m; });
            
            let html = `<div class="table-responsive"><table class="data-table" style="width:100%;border-collapse:collapse;">
                <thead><tr style="background:#4C1D95;color:white;">
                    <th style="padding:10px;">Admission</th>
                    <th style="padding:10px;">Student Name</th>
                    <th style="padding:10px;">CAT1 (0-30)</th>
                    <th style="padding:10px;">CAT2 (0-30)</th>
                    <th style="padding:10px;">Exam (0-70)</th>
                    <th style="padding:10px;">Total</th>
                    <th style="padding:10px;">Grade</th>
                    <th style="padding:10px;">Status</th>
                </tr></thead><tbody>`;
            
            for (const s of students) {
                const m = marksMap[s.student_id] || {};
                const cat1 = m.cat1_score !== undefined && m.cat1_score !== null ? m.cat1_score : '';
                const cat2 = m.cat2_score !== undefined && m.cat2_score !== null ? m.cat2_score : '';
                const exam = m.exam_score !== undefined && m.exam_score !== null ? m.exam_score : '';
                
                let total = 0, grade = '-', status = 'PENDING', color = '#f59e0b';
                if (cat1 !== '' || cat2 !== '' || exam !== '') {
                    const ncat1 = Math.min(parseFloat(cat1) || 0, 30);
                    const ncat2 = Math.min(parseFloat(cat2) || 0, 30);
                    const nexam = Math.min(parseFloat(exam) || 0, 70);
                    total = Math.round((((ncat1 + ncat2) / 60 * 30) + nexam) * 10) / 10;
                    grade = window.LecturerUtils?.calculateGrade(total) || '-';
                    status = total >= 60 ? 'PASS' : (total > 0 ? 'FAIL' : 'PENDING');
                    color = status === 'PASS' ? '#10b981' : (status === 'FAIL' ? '#ef4444' : '#f59e0b');
                }
                
                html += `<tr>
                    <td>${window.LecturerUtils?.escapeHtml(s.student_id) || s.student_id || 'N/A'}</td>
                    <td><strong>${window.LecturerUtils?.escapeHtml(s.full_name) || s.full_name || 'N/A'}</strong></td>
                    <td><input type="number" class="internal-cat1" data-student="${s.student_id}" value="${cat1}" min="0" max="30" step="0.5" style="width:70px;padding:5px;"></td>
                    <td><input type="number" class="internal-cat2" data-student="${s.student_id}" value="${cat2}" min="0" max="30" step="0.5" style="width:70px;padding:5px;"></td>
                    <td><input type="number" class="internal-exam" data-student="${s.student_id}" value="${exam}" min="0" max="70" step="0.5" style="width:70px;padding:5px;"></td>
                    <td id="lecTotal_${s.student_id}" style="font-weight:bold;color:${color};">${total || '-'}</td>
                    <td id="lecGrade_${s.student_id}">${grade}</td>
                    <td id="lecStatus_${s.student_id}" style="color:${color};">${status}</td>
                </tr>`;
            }
            
            html += `</tbody></table></div>
                <div style="text-align:center;margin-top:20px;">
                    <button class="btn btn-action" id="saveInternalMarksBtn" style="background:#059669;"><i class="fas fa-save"></i> Save All Marks</button>
                    <button class="btn btn-action" id="fillDownInternalBtn" style="background:#3b82f6;margin-left:10px;"><i class="fas fa-arrow-down"></i> Fill Down</button>
                </div>`;
            
            container.innerHTML = html;
            
            document.querySelectorAll('.internal-cat1, .internal-cat2, .internal-exam').forEach(input => {
                input.addEventListener('change', function() {
                    const studentId = this.dataset.student;
                    LecturerMarks.updateInternalTotal(studentId);
                });
            });
            
            document.getElementById('saveInternalMarksBtn')?.addEventListener('click', () => this.saveInternalMarks());
            document.getElementById('fillDownInternalBtn')?.addEventListener('click', () => this.fillDownInternal());
            
        } catch (error) {
            console.error('Error loading marks:', error);
            container.innerHTML = `<div class="alert alert-danger">Error: ${error.message}</div>`;
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
        const grade = window.LecturerUtils?.calculateGrade(total) || '-';
        const status = total >= 60 ? 'PASS' : (total > 0 ? 'FAIL' : 'PENDING');
        const color = status === 'PASS' ? '#10b981' : (status === 'FAIL' ? '#ef4444' : '#f59e0b');
        
        const totalSpan = document.getElementById(`lecTotal_${studentId}`);
        const gradeSpan = document.getElementById(`lecGrade_${studentId}`);
        const statusSpan = document.getElementById(`lecStatus_${studentId}`);
        
        if (totalSpan) { totalSpan.innerHTML = total || '-'; totalSpan.style.color = color; }
        if (gradeSpan) gradeSpan.innerHTML = grade;
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
        
        if (window.LecturerUI) {
            window.LecturerUI.showNotification('Values filled down!', 'success');
        }
    },
    
    async saveInternalMarks() {
        const block = document.getElementById('lecBlockSelect').value;
        const subject = document.getElementById('lecSubjectSelect').value;
        
        if (!block || !subject) {
            if (window.LecturerUI) {
                window.LecturerUI.showNotification('Select block and subject', 'error');
            }
            return;
        }
        
        const inputs = document.querySelectorAll('.internal-cat1');
        if (!inputs.length) {
            if (window.LecturerUI) {
                window.LecturerUI.showNotification('No data to save', 'error');
            }
            return;
        }
        
        if (window.LecturerUI) {
            window.LecturerUI.showLoading('Saving marks...');
        }
        let saved = 0;
        
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
            const grade = window.LecturerUtils?.calculateGrade(finalTotal) || '-';
            
            try {
                // ✅ Use lecturerDB
                const result = await window.lecturerDB.saveMarks({
                    admission_number: sId,
                    student_name: studentName,
                    block: block,
                    subject_name: subject,
                    cat1_score: cat1 || null,
                    cat2_score: cat2 || null,
                    exam_score: exam || null,
                    final_score: finalTotal || null,
                    grade: grade || null,
                    graded_by: window.lecturerDB?.getCurrentUserProfile()?.full_name || 'Lecturer',
                    updated_at: new Date().toISOString()
                });
                
                if (result.success) saved++;
            } catch (err) {
                console.error('Error saving for', sId, ':', err);
            }
        }
        
        if (window.LecturerUI) {
            window.LecturerUI.hideLoading();
            window.LecturerUI.showNotification(`Saved ${saved} marks!`, 'success');
        }
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
            
            // ✅ Use lecturerDB
            const existing = await window.lecturerDB.getNCKMarks(block, sheet);
            
            const marksMap = {};
            existing?.forEach(m => { marksMap[m.admission_number] = m; });
            
            let html = `<table class="data-table" style="width:100%;border-collapse:collapse;">
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
                const score = m.final_score !== undefined ? m.final_score : '';
                const grade = score !== '' ? window.LecturerUtils?.calculateGrade(parseFloat(score)) || '-' : '-';
                const status = score !== '' ? (parseFloat(score) >= 60 ? 'PASS' : (parseFloat(score) > 0 ? 'FAIL' : 'PENDING')) : 'PENDING';
                const color = status === 'PASS' ? '#10b981' : (status === 'FAIL' ? '#ef4444' : '#f59e0b');
                
                html += `<tr>
                    <td>${i + 1}</td>
                    <td><strong>${window.LecturerUtils?.escapeHtml(s.full_name) || s.full_name || 'N/A'}</strong></td>
                    <td>${window.LecturerUtils?.escapeHtml(s.student_id) || s.student_id || 'N/A'}</td>
                    <td><input type="number" class="nck-score" data-index="${i}" value="${score}" min="0" max="100" step="0.5" style="width:80px;padding:5px;"></td>
                    <td id="nckGrade_${i}" style="color:${color};">${grade}</td>
                    <td id="nckStatus_${i}" style="color:${color};">${status}</td>
                    <td><input type="text" class="nck-graded" data-index="${i}" value="${m.graded_by || ''}" placeholder="Lecturer" style="width:120px;padding:5px;"></td>
                    <td><button class="btn btn-action btn-small save-nck" data-index="${i}" data-student="${s.student_id}" style="background:#059669;"><i class="fas fa-save"></i> Save</button></td>
                </tr>`;
            }
            
            html += `</tbody></table>
                <div style="text-align:center;margin-top:20px;">
                    <button class="btn btn-action" id="saveAllNckMarksBtn" style="background:#059669;"><i class="fas fa-save"></i> Save All NCK Marks</button>
                    <button class="btn btn-action" id="fillDownNckBtn" style="background:#3b82f6;margin-left:10px;"><i class="fas fa-arrow-down"></i> Fill Down</button>
                </div>`;
            
            container.innerHTML = html;
            
            document.querySelectorAll('.nck-score').forEach(input => {
                input.addEventListener('change', function() {
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
            container.innerHTML = `<div class="alert alert-danger">Error: ${error.message}</div>`;
        }
    },
    
    updateNCKTotal(idx) {
        const score = parseFloat(document.querySelector(`.nck-score[data-index="${idx}"]`)?.value) || 0;
        const grade = window.LecturerUtils?.calculateGrade(score) || '-';
        const status = score >= 60 ? 'PASS' : (score > 0 ? 'FAIL' : 'PENDING');
        const color = status === 'PASS' ? '#10b981' : (status === 'FAIL' ? '#ef4444' : '#f59e0b');
        
        const gradeEl = document.getElementById(`nckGrade_${idx}`);
        const statusEl = document.getElementById(`nckStatus_${idx}`);
        
        if (gradeEl) { gradeEl.innerHTML = grade; gradeEl.style.color = color; }
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
        if (window.LecturerUI) {
            window.LecturerUI.showNotification('Values filled down!', 'success');
        }
    },
    
    async saveSingleNCK(idx, studentId) {
        const block = document.getElementById('lecNckBlock').value;
        const sheet = document.getElementById('lecNckSheet').value;
        const score = parseFloat(document.querySelector(`.nck-score[data-index="${idx}"]`)?.value) || 0;
        const gradedBy = document.querySelector(`.nck-graded[data-index="${idx}"]`)?.value;
        const student = this.students.find(s => s.student_id === studentId);
        
        const grade = window.LecturerUtils?.calculateGrade(score) || '-';
        const status = score >= 60 ? 'passed' : (score > 0 ? 'failed' : 'pending');
        
        try {
            // ✅ Use lecturerDB
            const result = await window.lecturerDB.saveNCKMarks({
                admission_number: studentId,
                student_name: student?.full_name || '',
                block: block,
                subject_name: sheet,
                final_score: score,
                grade: grade,
                status: status,
                graded_by: gradedBy || window.lecturerDB?.getCurrentUserProfile()?.full_name || 'Lecturer',
                updated_at: new Date().toISOString()
            });
            
            if (!result.success) throw new Error(result.error);
            
            if (window.LecturerUI) {
                window.LecturerUI.showNotification('Saved!', 'success');
            }
            await this.loadNCKMarks();
            
        } catch (error) {
            if (window.LecturerUI) {
                window.LecturerUI.showNotification('Error: ' + error.message, 'error');
            }
        }
    },
    
    async saveAllNCK() {
        const inputs = document.querySelectorAll('.nck-score');
        if (!inputs.length) {
            if (window.LecturerUI) {
                window.LecturerUI.showNotification('No data to save', 'error');
            }
            return;
        }
        
        if (window.LecturerUI) {
            window.LecturerUI.showLoading('Saving all NCK marks...');
        }
        let saved = 0;
        
        for (let i = 0; i < inputs.length; i++) {
            const student = this.students[i];
            if (!student) continue;
            
            const score = parseFloat(document.querySelector(`.nck-score[data-index="${i}"]`)?.value) || 0;
            const gradedBy = document.querySelector(`.nck-graded[data-index="${i}"]`)?.value;
            const grade = window.LecturerUtils?.calculateGrade(score) || '-';
            const status = score >= 60 ? 'passed' : (score > 0 ? 'failed' : 'pending');
            
            try {
                // ✅ Use lecturerDB
                const result = await window.lecturerDB.saveNCKMarks({
                    admission_number: student.student_id,
                    student_name: student.full_name,
                    block: document.getElementById('lecNckBlock').value,
                    subject_name: document.getElementById('lecNckSheet').value,
                    final_score: score,
                    grade: grade,
                    status: status,
                    graded_by: gradedBy || window.lecturerDB?.getCurrentUserProfile()?.full_name || 'Lecturer',
                    updated_at: new Date().toISOString()
                });
                
                if (result.success) saved++;
            } catch (err) {
                console.error('Error saving NCK for', student.student_id, ':', err);
            }
        }
        
        if (window.LecturerUI) {
            window.LecturerUI.hideLoading();
            window.LecturerUI.showNotification(`Saved ${saved} NCK records!`, 'success');
        }
        await this.loadNCKMarks();
    },
    
    updateStats() {
        const totalMarks = this.marks.length || 0;
        const totalNck = this.nckMarks.length || 0;
        const avgScore = this.calculateAverageScore();
        
        document.getElementById('lecTotalInternal').textContent = totalMarks;
        document.getElementById('lecTotalNck').textContent = totalNck;
        document.getElementById('lecAvgScore').textContent = avgScore + '%';
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
            document.querySelectorAll('.marks-tab').forEach(t => t.style.display = 'none');
            document.querySelectorAll('.tabs-nav .tab-btn').forEach(b => b.classList.remove('active'));
            document.getElementById('lecInternalTab').style.display = 'block';
            document.getElementById('lecTabInternal').classList.add('active');
            this.loadInternalMarks();
        });
        
        document.getElementById('lecTabNck')?.addEventListener('click', () => {
            document.querySelectorAll('.marks-tab').forEach(t => t.style.display = 'none');
            document.querySelectorAll('.tabs-nav .tab-btn').forEach(b => b.classList.remove('active'));
            document.getElementById('lecNckTab').style.display = 'block';
            document.getElementById('lecTabNck').classList.add('active');
            this.loadNCKMarks();
        });
    },
    
    async refresh() {
        await this.loadMarksManagement();
        if (window.LecturerUI) {
            window.LecturerUI.showNotification('Marks refreshed!', 'success');
        }
    }
};

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => LecturerMarks.init(), 850);
});

window.LecturerMarks = LecturerMarks;
