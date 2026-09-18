// js/lecturer-exams.js
// Verified against the actual lecturer #cats-content HTML.
// Schema-aligned with the real `exams` table.

(function () {
'use strict';

const LecturerExams = {

    exams: [],
    filteredExams: [],
    lecturerUuid: null,
    assignedUnits: [],
    isProcessing: false,
    _bound: false,

    // ---------- tiny helpers ----------
    $(id) { return document.getElementById(id); },
    val(id) { const el = this.$(id); return el ? (el.value ?? '') : ''; },
    check(id) { const el = this.$(id); return el ? !!el.checked : false; },
    notify(msg, type = 'info') {
        const fn = window.showNotification ||
                   window.LecturerUI?.showNotification;
        if (typeof fn === 'function') { try { fn(msg, type); return; } catch (_) {} }
        console[type === 'error' ? 'error' : 'log'](msg);
    },
    escapeHtml(t) {
        if (t == null) return '';
        const d = document.createElement('div');
        d.textContent = String(t);
        return d.innerHTML;
    },
    fmtDate(d) {
        if (!d) return 'N/A';
        try { return new Date(d).toLocaleDateString('en-GB',
            { day: 'numeric', month: 'short', year: 'numeric' }); }
        catch { return d; }
    },
    sb() {
        return window.lecturerDB?.supabase ||
               window.sb ||
               window.supabase ||
               window.supabaseClient ||
               null;
    },

    // ---------- lifecycle ----------
    async init() {
        console.log('📝 LecturerExams.init');
        try { await this.resolveLecturerId(); } catch (e) { console.warn(e); }
        try { await this.loadAssignedUnits(); } catch (e) { console.warn(e); }
        try { this.populateExamForm(); } catch (e) { console.warn(e); }
        try { this.bindForm(); } catch (e) { console.warn(e); }
        try { await this.loadExams(); } catch (e) { console.warn(e); }
        console.log('✅ LecturerExams ready');
    },

    async resolveLecturerId() {
        const p = window.lecturerDB?.getCurrentUserProfile?.() ||
                  window.currentUserProfile || null;
        this.lecturerUuid = p?.user_id || p?.id || null;
        if (!this.lecturerUuid) {
            try {
                const s = localStorage.getItem('staffSession') ||
                          sessionStorage.getItem('staffSession');
                if (s) { const d = JSON.parse(s); this.lecturerUuid = d.user_id || d.id; }
            } catch (_) {}
        }
        console.log('👤 Lecturer UUID:', this.lecturerUuid);
    },

    async loadAssignedUnits() {
        const sb = this.sb();
        const p = window.lecturerDB?.getCurrentUserProfile?.();
        if (!sb || !p?.full_name) { this.assignedUnits = []; return; }
        const { data, error } = await sb
            .from('lecturer_subject_assignments')
            .select('subject_name, subject_code, block, program, academic_year, lecturer_id')
            .ilike('lecturer_name', `%${p.full_name}%`);
        if (error) { this.assignedUnits = []; return; }
        const krchn = (data || []).filter(u => u.program === 'KRCHN');
        this.assignedUnits = krchn.length ? krchn : (data || []);
    },

    // ---------- load / render ----------
    async loadExams() {
        const sb = this.sb();
        const tbody = this.$('examsTable');
        if (!sb) { this.renderExams(); return; }
        if (tbody) tbody.innerHTML =
            `<tr><td colspan="8" style="padding:50px;text-align:center;color:#94a3b8;">
                <div style="width:40px;height:40px;border:4px solid #e2e8f0;border-top-color:#4C1D95;border-radius:50%;animation:spin 1s linear infinite;margin:0 auto 15px;"></div>
                Loading exams…
             </td></tr>`;

        const p = window.lecturerDB?.getCurrentUserProfile?.() || {};
        const program = p.program || p.department || null;

        let q = sb.from('exams').select(
            'id,title,exam_name,exam_type,exam_date,exam_start_time,duration_minutes,' +
            'status,approval_status,created_by,target_program,program_type,' +
            'block,block_term,intake_year,intake_month,course_id,course_code,' +
            'marks_out_of,total_marks,pass_mark,min_fee_balance,online_link,' +
            'exam_link,marks_entry_deadline,exam_basis,assigned_classes,description'
        ).order('exam_date', { ascending: false });

        if (program) q = q.eq('target_program', program);

        const { data, error } = await q;
        if (error) { console.error('loadExams:', error); this.exams = []; }
        else { this.exams = data || []; }
        this.filteredExams = this.exams;
        this.renderExams();
        this.updateStats();
    },

    renderExams() {
        const tbody = this.$('examsTable');
        if (!tbody) return;
        const list = this.filteredExams || this.exams;

        if (!list.length) {
            tbody.innerHTML = `
                <tr><td colspan="8" style="padding:50px;text-align:center;color:#94a3b8;">
                    <i class="fas fa-file-alt" style="font-size:48px;display:block;margin-bottom:15px;color:#e2e8f0;"></i>
                    <h3 style="color:#475569;margin:0 0 8px;">No Exams Created</h3>
                    <p style="margin:0;font-size:14px;">Create your first exam or CAT using the form above.</p>
                </td></tr>`;
            return;
        }

        const me = this.lecturerUuid;
        const stColor = { Scheduled:'#f59e0b', Upcoming:'#f59e0b', InProgress:'#3b82f6',
                          Completed:'#10b981', published:'#10b981', Cancelled:'#ef4444' };
        const stIcon  = { Scheduled:'📅', Upcoming:'📅', InProgress:'🔄',
                          Completed:'✅', published:'✅', Cancelled:'❌' };
        const appr = {
            pending :'<span style="background:#fef3c7;color:#92400e;padding:2px 10px;border-radius:12px;font-size:10px;">⏳ Pending</span>',
            approved:'<span style="background:#d1fae5;color:#065f46;padding:2px 10px;border-radius:12px;font-size:10px;">✅ Approved</span>',
            rejected:'<span style="background:#fee2e2;color:#991b1b;padding:2px 10px;border-radius:12px;font-size:10px;">❌ Rejected</span>',
            draft   :'<span style="background:#e5e7eb;color:#6b7280;padding:2px 10px;border-radius:12px;font-size:10px;">📝 Draft</span>'
        };

        tbody.innerHTML = list.map(ex => {
            const owner = ex.created_by === me;
            const unit  = ex.course_code || (ex.course_id ? String(ex.course_id).slice(0,8)+'…' : '—');
            const dt    = ex.exam_date
                ? this.fmtDate(ex.exam_date) + (ex.exam_start_time ? ' ' + ex.exam_start_time : '')
                : 'N/A';
            const st    = ex.status || 'Scheduled';
            const sc    = stColor[st] || '#6b7280';
            const si    = stIcon[st] || '📌';
            const as    = ex.approval_status || 'draft';
            const badge = appr[as] || appr.draft;

            let actions = '';
            if (owner && (as === 'draft' || as === 'pending')) {
                actions += `<button onclick="LecturerExams.editExam('${ex.id}')" style="background:#4C1D95;color:#fff;border:0;padding:6px 12px;border-radius:6px;cursor:pointer;font-size:12px;"><i class="fas fa-edit"></i></button>`;
                actions += `<button onclick="LecturerExams.deleteExam('${ex.id}')" style="background:#fee2e2;color:#dc2626;border:0;padding:6px 12px;border-radius:6px;cursor:pointer;font-size:12px;"><i class="fas fa-trash"></i></button>`;
            }
            if (owner && (as === 'approved' || st === 'published' || st === 'Completed')) {
                actions += `<button onclick="LecturerExams.gradeExam('${ex.id}')" style="background:#10b981;color:#fff;border:0;padding:6px 12px;border-radius:6px;cursor:pointer;font-size:12px;"><i class="fas fa-check-circle"></i> Grade</button>`;
            }
            if (!owner) actions = `<span style="color:#94a3b8;font-size:11px;">👤 Another Lecturer</span>`;

            return `<tr style="border-bottom:1px solid #f1f5f9;${!owner?'opacity:.75;':''}">
                <td style="padding:14px 18px;"><span style="background:#ede9fe;padding:2px 10px;border-radius:12px;font-size:12px;color:#5b21b6;">${this.escapeHtml(ex.exam_type||'N/A')}</span></td>
                <td style="padding:14px 18px;font-weight:600;color:#1e293b;">${this.escapeHtml(ex.exam_name||ex.title||'Untitled')}<div style="font-size:10px;margin-top:2px;">${badge}</div></td>
                <td style="padding:14px 18px;color:#475569;">${this.escapeHtml(unit)}</td>
                <td style="padding:14px 18px;color:#475569;">${this.escapeHtml((ex.target_program||ex.program_type||'N/A')+' / '+(ex.block||ex.block_term||'N/A'))}</td>
                <td style="padding:14px 18px;color:#475569;font-size:13px;">${dt}</td>
                <td style="padding:14px 18px;color:#475569;">${ex.duration_minutes?ex.duration_minutes+' mins':'N/A'}</td>
                <td style="padding:14px 18px;"><span style="background:${sc}20;color:${sc};padding:4px 12px;border-radius:12px;font-size:12px;font-weight:500;">${si} ${st}</span></td>
                <td style="padding:14px 18px;text-align:center;"><div style="display:flex;gap:6px;justify-content:center;flex-wrap:wrap;">${actions||'<span style="color:#94a3b8;font-size:12px;">—</span>'}</div></td>
            </tr>`;
        }).join('');

        const c = this.$('examCountDisplay'); if (c) c.textContent = this.exams.length;
        const b = this.$('examCountBadge2');  if (b) b.textContent = this.exams.length;
    },

    updateStats() {
        const e = this.exams;
        const set = (id, v) => { const el = this.$(id); if (el) el.textContent = v; };
        set('totalExamsStat',     e.length);
        set('scheduledExamsStat', e.filter(x => x.status === 'Scheduled' || x.status === 'Upcoming').length);
        set('completedExamsStat', e.filter(x => x.status === 'Completed' || x.status === 'published').length);
        set('pendingExamsStat',   e.filter(x => x.status === 'InProgress').length);
    },

    // ---------- form ----------
    populateExamForm() {
        const p = window.lecturerDB?.getCurrentUserProfile?.() || {};
        const program = p.program || p.department || '';
        const ps = this.$('examProgram');
        if (ps && program && ps.options.length <= 1) {
            ps.innerHTML = `<option value="${this.escapeHtml(program)}">${this.escapeHtml(program)}</option>`;
        }
        const blocks = [...new Set(this.assignedUnits.map(u => u.block).filter(Boolean))];
        const bs = this.$('examBlockTerm');
        if (bs) {
            bs.innerHTML = blocks.length
                ? '<option value="">-- Select Block/Term --</option>' +
                  blocks.map(b => `<option value="${this.escapeHtml(b)}">${this.escapeHtml(b)}</option>`).join('')
                : '<option value="">-- No blocks assigned --</option>';
        }
        const us = this.$('examUnit');
        if (us) {
            us.innerHTML = this.assignedUnits.length
                ? '<option value="">-- Select Unit (Optional) --</option>' +
                  this.assignedUnits.map(u => `<option value="${this.escapeHtml(u.subject_code||u.subject_name)}">${this.escapeHtml((u.subject_code?u.subject_code+' - ':'')+u.subject_name)}${u.block?' ('+this.escapeHtml(u.block)+')':''}</option>`).join('')
                : '<option value="">-- No units assigned --</option>';
        }
        const di = this.$('examDate');
        if (di && !di.value) {
            const t = new Date(); t.setDate(t.getDate() + 7);
            di.value = t.toISOString().split('T')[0];
        }
    },

    bindForm() {
        if (this._bound) return;
        this._bound = true;

        const form = this.$('addExamForm');
        if (form) form.addEventListener('submit', e => this.handleAddExam(e));

        const s = this.$('examSearch');
        if (s) {
            let t;
            s.addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => this.filterExams(), 300); });
        }
    },

    filterExams() {
        const s = (this.val('examSearch') || '').toLowerCase();
        this.filteredExams = this.exams.filter(e => {
            const hay = `${e.exam_name||''} ${e.title||''} ${e.exam_type||''} ${e.block||''} ${e.course_code||''}`.toLowerCase();
            return !s || hay.includes(s);
        });
        this.renderExams();
        const c = this.$('examCountDisplay'); if (c) c.textContent = this.filteredExams.length;
    },

    // ---------- create ----------
    async handleAddExam(e) {
        if (e) e.preventDefault();
        if (this.isProcessing) return;
        this.isProcessing = true;

        const btn = e?.submitter || e?.target?.querySelector('button[type="submit"]');
        const original = btn ? btn.innerHTML : '';
        if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating…'; }

        const fd = {
            title:    (this.val('examTitle') || '').trim(),
            date:      this.val('examDate'),
            type:      this.val('examType'),
            program:   this.val('examProgram'),
            intake:    this.val('examIntake'),
            block:     this.val('examBlockTerm'),
            unit:      this.val('examUnit') || null,
            startTime: this.val('examStartTime') || '09:00',
            duration:  parseInt(this.val('examDurationMinutes'), 10),
            status:    this.val('examStatus') || 'Scheduled',
            link:      (this.val('examLink') || '').trim() || null,
            venue:     (this.val('examVenue') || '').trim() || null
        };

        const missing = ['title','date','type','program','intake','block'].filter(k => !fd[k]);
        if (missing.length || isNaN(fd.duration)) {
            this.notify('Missing required: ' + missing.join(', '), 'error');
            if (btn) { btn.disabled = false; btn.innerHTML = original; }
            this.isProcessing = false;
            return;
        }

        try {
            const sb = this.sb();
            if (!sb) throw new Error('Database not available');
            const me = this.lecturerUuid;
            if (!me) throw new Error('No lecturer UUID resolved');

            // venue → description (there is no venue column)
            const description = fd.venue ? 'Venue: ' + fd.venue : null;

            const row = {
                title:                fd.title,
                exam_name:            fd.title,
                exam_type:            fd.type,
                exam_date:            fd.date,
                exam_start_time:      fd.startTime,
                duration_minutes:     fd.duration,
                target_program:       fd.program,
                program_type:         fd.program,
                block:                fd.block,
                block_term:           fd.block,
                intake_year:          parseInt(fd.intake, 10),
                course_code:          fd.unit,
                marks_out_of:         100,
                total_marks:          100,
                MARKS:                '100',
                pass_mark:            50,
                min_fee_balance:      0,
                online_link:          fd.link,
                exam_link:            fd.link,
                description:          description,
                status:               fd.status.toLowerCase(),
                created_by:           me,
                approval_status:      'pending',
                created_at:           new Date().toISOString(),
                updated_at:           new Date().toISOString()
            };

            const { data, error } = await sb
                .from('exams').insert([row]).select('id').single();
            if (error) throw error;
            row.id = data.id;

            // Emails: students in program+block, plus the lecturer
            try { await this.notifyByEmail(row); } catch (err) { console.warn('notify:', err); }

            this.notify('✅ Exam created! Waiting for admin approval.', 'success');
            if (e?.target?.reset) e.target.reset();
            this.populateExamForm();
            await this.loadExams();

        } catch (err) {
            console.error('handleAddExam:', err);
            this.notify('Failed to create exam: ' + err.message, 'error');
        } finally {
            if (btn) { btn.disabled = false; btn.innerHTML = original; }
            this.isProcessing = false;
        }
    },

    // ---------- email ----------
    async sendEmail(to, subject, html) {
        try {
            const sb = this.sb();
            let token = '';
            try { const s = await sb?.auth?.getSession?.();
                  token = s?.data?.session?.access_token || ''; } catch (_) {}
            if (!token) {
                token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx3aHRqb3pmc21ieWloZW5mdW53Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk2NTgxMjcsImV4cCI6MjA3NTIzNDEyN30.7Z8AYvPQwTAEEEhODlW6Xk-IR1FK3Uj5ivZS7P17Wpk';
            }
            const r = await fetch('https://lwhtjozfsmbyihenfunw.supabase.co/functions/v1/send-email', {
                method: 'POST',
                headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    to, subject, html,
                    from: 'NCHSM Exam Office <noreply@nakurucollegeofhealthelearning.site>'
                })
            });
            const j = await r.json().catch(() => ({}));
            return { success: r.ok && j.success !== false, data: j };
        } catch (e) { console.error('sendEmail:', e); return { success: false, error: e.message }; }
    },

    htmlStudent(ex) {
        const d = ex.exam_date ? new Date(ex.exam_date).toLocaleDateString('en-KE',
            { weekday:'long', year:'numeric', month:'long', day:'numeric' }) : 'TBD';
        return `<!doctype html><html><body style="font-family:Inter,Arial,sans-serif;background:#f0f4f8;padding:30px;">
          <div style="max-width:600px;margin:auto;background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 10px 40px rgba(10,61,98,.15);">
            <div style="background:linear-gradient(135deg,#0A3D62,#1a5276);padding:32px;color:#fff;text-align:center;">
              <div style="font-size:40px;">📝</div>
              <h1 style="margin:6px 0 0;font-size:22px;">New ${this.escapeHtml(ex.exam_type||'Exam')} Posted</h1>
              <p style="margin:6px 0 0;opacity:.85;font-size:13px;">Nakuru College of Health Sciences and Management</p>
            </div>
            <div style="padding:28px 32px;">
              <p>Dear Student,</p>
              <p>A new assessment has been posted for your program.</p>
              <table style="width:100%;border-collapse:collapse;font-size:14px;background:#f8fafc;border-radius:12px;overflow:hidden;">
                <tr><td style="padding:8px 14px;color:#64748B;">Title</td><td style="padding:8px 14px;font-weight:600;color:#0A3D62;">${this.escapeHtml(ex.title)}</td></tr>
                <tr><td style="padding:8px 14px;color:#64748B;">Program</td><td style="padding:8px 14px;font-weight:600;">${this.escapeHtml(ex.target_program)}</td></tr>
                <tr><td style="padding:8px 14px;color:#64748B;">Block</td><td style="padding:8px 14px;font-weight:600;">${this.escapeHtml(ex.block)}</td></tr>
                <tr><td style="padding:8px 14px;color:#64748B;">Date</td><td style="padding:8px 14px;font-weight:600;">${d}</td></tr>
                <tr><td style="padding:8px 14px;color:#64748B;">Time</td><td style="padding:8px 14px;font-weight:600;">${this.escapeHtml(ex.exam_start_time||'TBD')}</td></tr>
                <tr><td style="padding:8px 14px;color:#64748B;">Duration</td><td style="padding:8px 14px;font-weight:600;">${ex.duration_minutes} minutes</td></tr>
              </table>
              <p style="text-align:center;margin-top:24px;">
                <a href="https://nchms.co.ke/student" style="background:#0A3D62;color:#fff;padding:12px 28px;border-radius:10px;text-decoration:none;font-weight:600;">Access Student Portal</a>
              </p>
              <p style="color:#94a3b8;font-size:12px;margin-top:20px;">Automated notification — do not reply.</p>
            </div>
          </div></body></html>`;
    },

    htmlLecturer(ex, prof) {
        const d = ex.exam_date ? new Date(ex.exam_date).toLocaleDateString('en-KE',
            { weekday:'long', year:'numeric', month:'long', day:'numeric' }) : 'TBD';
        return `<!doctype html><html><body style="font-family:Inter,Arial,sans-serif;background:#f0f4f8;padding:30px;">
          <div style="max-width:600px;margin:auto;background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 10px 40px rgba(10,61,98,.15);">
            <div style="background:linear-gradient(135deg,#4C1D95,#6d28d9);padding:26px;color:#fff;">
              <h1 style="margin:0;font-size:20px;">✅ Exam Submitted for Approval</h1>
            </div>
            <div style="padding:24px 28px;">
              <p>Hi ${this.escapeHtml(prof.full_name||'Lecturer')},</p>
              <p>Your exam has been created and is awaiting admin approval.</p>
              <table style="width:100%;border-collapse:collapse;font-size:14px;background:#f8fafc;border-radius:12px;">
                <tr><td style="padding:8px 14px;color:#64748B;">Title</td><td style="padding:8px 14px;font-weight:600;">${this.escapeHtml(ex.title)}</td></tr>
                <tr><td style="padding:8px 14px;color:#64748B;">Program</td><td style="padding:8px 14px;font-weight:600;">${this.escapeHtml(ex.target_program)}</td></tr>
                <tr><td style="padding:8px 14px;color:#64748B;">Block</td><td style="padding:8px 14px;font-weight:600;">${this.escapeHtml(ex.block)}</td></tr>
                <tr><td style="padding:8px 14px;color:#64748B;">Date</td><td style="padding:8px 14px;font-weight:600;">${d}</td></tr>
                <tr><td style="padding:8px 14px;color:#64748B;">Approval</td><td style="padding:8px 14px;font-weight:600;color:#92400e;">⏳ Pending</td></tr>
              </table>
            </div>
          </div></body></html>`;
    },

    async notifyByEmail(ex) {
        const sb = this.sb();
        if (!sb) return;
        let students = [];
        try {
            const { data } = await sb
                .from('consolidated_user_profiles_table')
                .select('user_id, full_name, email, program, block')
                .eq('role', 'student')
                .eq('status', 'approved')
                .eq('program', ex.target_program)
                .eq('block', ex.block)
                .limit(500);
            students = data || [];
        } catch (e) { console.warn('student fetch:', e); }

        const studentHtml = this.htmlStudent(ex);
        let sent = 0, failed = 0;
        for (const s of students) {
            if (!s.email) { failed++; continue; }
            const r = await this.sendEmail(s.email, `📝 New ${ex.exam_type||'Exam'}: ${ex.title}`, studentHtml);
            r.success ? sent++ : failed++;
            await new Promise(r => setTimeout(r, 150));
        }
        console.log(`📧 Students: ${sent}/${students.length} sent`);

        const prof = window.lecturerDB?.getCurrentUserProfile?.();
        if (prof?.email) {
            const r = await this.sendEmail(prof.email, `✅ Submitted: ${ex.title}`, this.htmlLecturer(ex, prof));
            console.log('📧 Lecturer copy:', r.success ? 'sent' : 'failed');
        }
    },

    // ---------- edit / delete / grade ----------
    async editExam(id) {
        const ex = this.exams.find(x => String(x.id) === String(id));
        if (!ex) return;
        if (ex.created_by !== this.lecturerUuid) {
            this.notify('❌ You can only edit exams you created.', 'warning'); return;
        }
        const t = prompt('Edit Exam Title:', ex.exam_name || ex.title || '');
        if (!t || t === (ex.exam_name || ex.title)) return;
        try {
            const { error } = await this.sb().from('exams')
                .update({ exam_name: t, title: t, updated_at: new Date().toISOString() })
                .eq('id', id).eq('created_by', this.lecturerUuid);
            if (error) throw error;
            this.notify('✅ Exam updated!', 'success');
            await this.loadExams();
        } catch (e) { this.notify('Failed: ' + e.message, 'error'); }
    },

    async deleteExam(id) {
        const ex = this.exams.find(x => String(x.id) === String(id));
        if (!ex) return;
        if (ex.created_by !== this.lecturerUuid) {
            this.notify('❌ You can only delete exams you created.', 'warning'); return;
        }
        if (!confirm(`Delete "${ex.exam_name || ex.title}"?`)) return;
        try {
            const { error } = await this.sb().from('exams')
                .delete().eq('id', id).eq('created_by', this.lecturerUuid);
            if (error) throw error;
            this.notify('✅ Exam deleted!', 'success');
            await this.loadExams();
        } catch (e) { this.notify('Failed: ' + e.message, 'error'); }
    },

    async gradeExam(id) {
        const ex = this.exams.find(x => String(x.id) === String(id));
        if (!ex) return;
        if (ex.created_by !== this.lecturerUuid) {
            this.notify('❌ You can only grade exams you created.', 'warning'); return;
        }
        this.notify(`📝 Grading ${ex.exam_name || ex.title} — modal not wired.`, 'info');
    },

    async refresh() {
        await this.init();
        this.notify('Exams refreshed!', 'success');
    }
};

window.LecturerExams = LecturerExams;
window.deleteExam    = id => LecturerExams.deleteExam(id);
window.editExam      = id => LecturerExams.editExam(id);
window.gradeExam     = id => LecturerExams.gradeExam(id);
window.loadExams     = () => LecturerExams.loadExams();
window.refreshExams  = () => LecturerExams.refresh();
window.filterExams   = () => LecturerExams.filterExams();
window.exportExams   = () => LecturerExams.exportExams?.() || LecturerExams.exportExamsCSV?.();

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(() => LecturerExams.init(), 800));
} else {
    setTimeout(() => LecturerExams.init(), 800);
}
console.log('✅ LecturerExams loaded (HTML-verified)');
})();
