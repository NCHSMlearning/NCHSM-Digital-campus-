// js/lecturer-exams.js
// ============================================================
// NCHSM Lecturer Exams / CATs module
// - Create CAT/Exam records
// - List, search, export, delete own exams
// - Notify students + lecturer by email on create
// - Static Block/Unit lists (no dependency on lecturer_subject_assignments)
// ============================================================

(function () {
'use strict';

// ------------------------------------------------------------
// TOAST FALLBACK (in case window.showNotification isn't defined)
// ------------------------------------------------------------
if (typeof window.showNotification !== 'function') {
    window.showNotification = function (msg, type) {
        const colors = {
            success: '#059669',
            error:   '#dc2626',
            warning: '#d97706',
            info:    '#2563eb'
        };
        const el = document.createElement('div');
        el.style.cssText =
            'position:fixed;bottom:24px;right:24px;z-index:99999;' +
            'background:' + (colors[type] || '#334155') + ';color:#fff;' +
            'padding:14px 20px;border-radius:10px;' +
            'font:600 14px Inter,system-ui,sans-serif;' +
            'box-shadow:0 10px 30px rgba(0,0,0,.25);max-width:360px;' +
            'transition:opacity .25s ease;opacity:0;';
        el.textContent = msg;
        document.body.appendChild(el);
        requestAnimationFrame(() => { el.style.opacity = '1'; });
        setTimeout(() => {
            el.style.opacity = '0';
            setTimeout(() => el.remove(), 300);
        }, 4000);
    };
}

// ------------------------------------------------------------
// CONSTANTS
// ------------------------------------------------------------
const EDGE_FUNCTION_URL =
    'https://lwhtjozfsmbyihenfunw.supabase.co/functions/v1/send-email';

const FALLBACK_ANON_KEY =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' +
    'eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx3aHRqb3pmc21ieWloZW5mdW53Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk2NTgxMjcsImV4cCI6MjA3NTIzNDEyN30.' +
    '7Z8AYvPQwTAEEEhODlW6Xk-IR1FK3Uj5ivZS7P17Wpk';

const FROM_ADDRESS =
    'NCHSM Exam Office <noreply@nakurucollegeofhealthelearning.site>';

const STATIC_BLOCKS = [
    'Introductory',
    'Block 1', 'Block 2', 'Block 3', 'Block 4', 'Block 5', 'Block 6',
    'Term 1', 'Term 2', 'Term 3', 'Term 4', 'Term 5', 'Term 6',
    'Final'
];

const STATIC_UNITS = [
    'Anatomy', 'Physiology', 'Pharmacology', 'Microbiology', 'Nutrition',
    'Community Health', 'Mental Health', 'Medical Surgical',
    'Maternal & Child Health', 'Nursing Ethics', 'Research Methods',
    'Clinical Practicum', 'Fundamentals of Nursing', 'Reproductive Health'
];

const STATIC_PROGRAMS = [
    { value: 'KRCHN', label: 'KRCHN - Nursing' },
    { value: 'DPOTT', label: 'DPOTT - Perioperative Theatre' },
    { value: 'DCH',   label: 'DCH - Community Health' },
    { value: 'DHRIT', label: 'DHRIT - Health Records & IT' },
    { value: 'DSL',   label: 'DSL - Science Lab' },
    { value: 'DSW',   label: 'DSW - Social Work' },
    { value: 'DCJS',  label: 'DCJS - Criminal Justice' },
    { value: 'DICT',  label: 'DICT - ICT' }
];

// ------------------------------------------------------------
// MODULE
// ------------------------------------------------------------
const LecturerExams = {

    exams: [],
    filteredExams: [],
    lecturerUuid: null,
    isProcessing: false,
    _bound: false,

    // ---------- tiny DOM helpers ----------
    $(id) { return document.getElementById(id); },

    val(id) {
        const el = this.$(id);
        return el ? (el.value ?? '') : '';
    },

    notify(msg, type) {
        window.showNotification(msg, type || 'info');
    },

    esc(t) {
        if (t == null) return '';
        const d = document.createElement('div');
        d.textContent = String(t);
        return d.innerHTML;
    },

    fmtDate(d) {
        if (!d) return 'N/A';
        try {
            return new Date(d).toLocaleDateString('en-GB', {
                day: 'numeric', month: 'short', year: 'numeric'
            });
        } catch (_) { return d; }
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
        console.log('📝 LecturerExams init');
        await this.resolveId();
        this.populateForm();
        this.bind();
        await this.loadExams();
        console.log('✅ LecturerExams ready');
    },

    async resolveId() {
        const p = window.lecturerDB?.getCurrentUserProfile?.() ||
                  window.currentUserProfile || {};
        this.lecturerUuid = p.user_id || p.id || null;

        if (!this.lecturerUuid) {
            try {
                const s = localStorage.getItem('staffSession') ||
                          sessionStorage.getItem('staffSession');
                if (s) {
                    const d = JSON.parse(s);
                    this.lecturerUuid = d.user_id || d.id || null;
                }
            } catch (_) {}
        }
        console.log('👤 Lecturer UUID:', this.lecturerUuid);
    },

    // ---------- load / render ----------
    async loadExams() {
        const sb = this.sb();
        const tbody = this.$('examsTable');
        if (!sb) { this.render(); return; }

        if (tbody) {
            tbody.innerHTML =
                '<tr><td colspan="8" style="padding:50px;text-align:center;color:#94a3b8;">' +
                '<div style="width:40px;height:40px;border:4px solid #e2e8f0;' +
                'border-top-color:#4C1D95;border-radius:50%;' +
                'animation:spin 1s linear infinite;margin:0 auto 15px;"></div>' +
                'Loading exams…</td></tr>';
        }

        const p = window.lecturerDB?.getCurrentUserProfile?.() || {};
        const program = p.program || p.department || null;

        let q = sb.from('exams')
            .select(
                'id,title,exam_name,exam_type,exam_date,exam_start_time,' +
                'duration_minutes,status,approval_status,created_by,' +
                'target_program,block,course_code'
            )
            .order('exam_date', { ascending: false });

        if (program) q = q.eq('target_program', program);

        const { data, error } = await q;
        if (error) {
            console.error('loadExams:', error);
            this.exams = [];
        } else {
            this.exams = data || [];
        }

        this.filteredExams = this.exams;
        this.render();
        this.updateStats();
        console.log('✅ Loaded ' + this.exams.length + ' exams');
    },

    render() {
        const tbody = this.$('examsTable');
        if (!tbody) return;
        const list = this.filteredExams || this.exams;

        if (!list.length) {
            tbody.innerHTML =
                '<tr><td colspan="8" style="padding:50px;text-align:center;color:#94a3b8;">' +
                '<i class="fas fa-file-alt" style="font-size:48px;display:block;' +
                'margin-bottom:15px;color:#e2e8f0;"></i>' +
                '<h3 style="color:#475569;margin:0 0 8px;">No Exams Yet</h3>' +
                '<p style="margin:0;font-size:14px;">Create your first CAT using the form above.</p>' +
                '</td></tr>';
            return;
        }

        const me = this.lecturerUuid;

        const stColor = {
            Scheduled: '#f59e0b', Upcoming: '#f59e0b',
            InProgress: '#3b82f6', Completed: '#10b981',
            Cancelled: '#ef4444'
        };
        const stIcon = {
            Scheduled: '📅', Upcoming: '📅', InProgress: '🔄',
            Completed: '✅', Cancelled: '❌'
        };
        const apprBadge = {
            pending:  '<span style="background:#fef3c7;color:#92400e;padding:2px 10px;border-radius:12px;font-size:10px;">⏳ Pending</span>',
            approved: '<span style="background:#d1fae5;color:#065f46;padding:2px 10px;border-radius:12px;font-size:10px;">✅ Approved</span>',
            rejected: '<span style="background:#fee2e2;color:#991b1b;padding:2px 10px;border-radius:12px;font-size:10px;">❌ Rejected</span>'
        };

        tbody.innerHTML = list.map(ex => {
            const owner = ex.created_by === me;
            const unit  = ex.course_code || '—';
            const dt = ex.exam_date
                ? this.fmtDate(ex.exam_date) +
                  (ex.exam_start_time ? ' ' + ex.exam_start_time : '')
                : 'N/A';
            const st = ex.status || 'Scheduled';
            const sc = stColor[st] || '#6b7280';
            const si = stIcon[st] || '📌';
            const badge = apprBadge[ex.approval_status] || '';

            let actions = '';
            if (owner) {
                actions =
                    '<button onclick="LecturerExams.del(\'' + ex.id + '\')" ' +
                    'style="background:#fee2e2;color:#dc2626;border:0;' +
                    'padding:6px 12px;border-radius:6px;cursor:pointer;font-size:12px;">' +
                    '<i class="fas fa-trash"></i></button>';
            } else {
                actions = '<span style="color:#94a3b8;font-size:11px;">👤 Other</span>';
            }

            return (
                '<tr style="border-bottom:1px solid #f1f5f9;' + (owner ? '' : 'opacity:.75;') + '">' +
                '<td style="padding:14px 18px;">' +
                    '<span style="background:#ede9fe;padding:2px 10px;border-radius:12px;font-size:12px;color:#5b21b6;">' +
                    this.esc(ex.exam_type || 'N/A') + '</span>' +
                '</td>' +
                '<td style="padding:14px 18px;font-weight:600;color:#1e293b;">' +
                    this.esc(ex.exam_name || ex.title || 'Untitled') +
                    '<div style="font-size:10px;margin-top:2px;">' + badge + '</div>' +
                '</td>' +
                '<td style="padding:14px 18px;color:#475569;">' + this.esc(unit) + '</td>' +
                '<td style="padding:14px 18px;color:#475569;">' +
                    this.esc((ex.target_program || 'N/A') + ' / ' + (ex.block || 'N/A')) +
                '</td>' +
                '<td style="padding:14px 18px;color:#475569;font-size:13px;">' + dt + '</td>' +
                '<td style="padding:14px 18px;color:#475569;">' +
                    (ex.duration_minutes ? ex.duration_minutes + 'm' : 'N/A') +
                '</td>' +
                '<td style="padding:14px 18px;">' +
                    '<span style="background:' + sc + '20;color:' + sc + ';' +
                    'padding:4px 12px;border-radius:12px;font-size:12px;font-weight:500;">' +
                    si + ' ' + st + '</span>' +
                '</td>' +
                '<td style="padding:14px 18px;text-align:center;">' + actions + '</td>' +
                '</tr>'
            );
        }).join('');

        const c = this.$('examCountDisplay');
        if (c) c.textContent = this.exams.length;
        const b = this.$('examCountBadge2');
        if (b) b.textContent = this.exams.length;
    },

    updateStats() {
        const e = this.exams;
        const set = (id, v) => { const el = this.$(id); if (el) el.textContent = v; };
        set('totalExamsStat',     e.length);
        set('scheduledExamsStat', e.filter(x => x.status === 'Scheduled' || x.status === 'Upcoming').length);
        set('completedExamsStat', e.filter(x => x.status === 'Completed').length);
        set('pendingExamsStat',   e.filter(x => x.status === 'InProgress').length);
    },

    // ---------- form ----------
    populateForm() {
        const p = window.lecturerDB?.getCurrentUserProfile?.() || {};
        const program = p.program || p.department || '';

        // Program
        const ps = this.$('examProgram');
        if (ps && ps.options.length <= 1) {
            if (program) {
                ps.innerHTML = '<option value="' + this.esc(program) + '">' +
                               this.esc(program) + '</option>';
            } else {
                ps.innerHTML = '<option value="">-- Select Program --</option>' +
                    STATIC_PROGRAMS.map(x =>
                        '<option value="' + x.value + '">' + x.label + '</option>'
                    ).join('');
            }
        }

        // Block / Term
        const bs = this.$('examBlockTerm');
        if (bs) {
            bs.innerHTML = '<option value="">-- Select Block/Term --</option>' +
                STATIC_BLOCKS.map(b => '<option value="' + b + '">' + b + '</option>').join('');
        }

        // Unit
        const us = this.$('examUnit');
        if (us && us.tagName === 'SELECT') {
            us.innerHTML = '<option value="">-- Select Unit (Optional) --</option>' +
                STATIC_UNITS.map(u => '<option value="' + u + '">' + u + '</option>').join('');
        }

        // Default date: one week out
        const di = this.$('examDate');
        if (di && !di.value) {
            const t = new Date();
            t.setDate(t.getDate() + 7);
            di.value = t.toISOString().split('T')[0];
        }
    },

    bind() {
        if (this._bound) return;
        this._bound = true;

        const form = this.$('addExamForm');
        if (form) form.addEventListener('submit', e => this.create(e));

        const s = this.$('examSearch');
        if (s) {
            let t;
            s.addEventListener('input', () => {
                clearTimeout(t);
                t = setTimeout(() => this.filter(), 300);
            });
        }
    },

    filter() {
        const s = (this.val('examSearch') || '').toLowerCase();
        this.filteredExams = this.exams.filter(e => {
            const hay = (e.exam_name || '') + ' ' + (e.title || '') + ' ' +
                        (e.exam_type || '') + ' ' + (e.course_code || '');
            return !s || hay.toLowerCase().includes(s);
        });
        this.render();
        const c = this.$('examCountDisplay');
        if (c) c.textContent = this.filteredExams.length;
    },

    // ---------- create ----------
    async create(e) {
        if (e) e.preventDefault();
        if (this.isProcessing) return;
        this.isProcessing = true;

        const btn = e?.submitter ||
                    e?.target?.querySelector('button[type="submit"]');
        const original = btn ? btn.innerHTML : '';
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating…';
        }

        const fd = {
            title:     (this.val('examTitle') || '').trim(),
            date:       this.val('examDate'),
            type:       this.val('examType'),
            program:    this.val('examProgram'),
            intake:     this.val('examIntake'),
            block:      this.val('examBlockTerm'),
            unit:       this.val('examUnit') || null,
            startTime:  this.val('examStartTime') || '09:00',
            duration:   parseInt(this.val('examDurationMinutes'), 10),
            status:     this.val('examStatus') || 'Scheduled',
            link:       (this.val('examLink') || '').trim() || null,
            venue:      (this.val('examVenue') || '').trim() || null
        };

        const missing = ['title', 'date', 'type', 'program', 'intake', 'block']
            .filter(k => !fd[k]);
        if (missing.length || isNaN(fd.duration)) {
            this.notify('Missing required: ' + missing.join(', '), 'error');
            if (btn) { btn.disabled = false; btn.innerHTML = original; }
            this.isProcessing = false;
            return;
        }

        try {
            const sb = this.sb();
            if (!sb) throw new Error('No database connection');
            if (!this.lecturerUuid) throw new Error('No lecturer UUID resolved');

            const row = {
                title:            fd.title,
                exam_name:        fd.title,
                exam_type:        fd.type,
                exam_date:        fd.date,
                exam_start_time:  fd.startTime,
                duration_minutes: fd.duration,
                target_program:   fd.program,
                program_type:     fd.program,
                block:            fd.block,
                block_term:       fd.block,
                intake_year:      parseInt(fd.intake, 10),
                course_code:      fd.unit,
                marks_out_of:     100,
                total_marks:      100,
                MARKS:            '100',
                pass_mark:        50,
                min_fee_balance:  0,
                online_link:      fd.link,
                exam_link:        fd.link,
                description:      fd.venue ? 'Venue: ' + fd.venue : null,
                status:           fd.status.toLowerCase(),
                created_by:       this.lecturerUuid,
                approval_status:  'pending',
                created_at:       new Date().toISOString(),
                updated_at:       new Date().toISOString()
            };

            const { data, error } = await sb
                .from('exams')
                .insert([row])
                .select('id')
                .single();
            if (error) throw error;
            row.id = data.id;

            // Fire-and-forget email notification
            try { await this.notifyByEmail(row); }
            catch (mailErr) { console.warn('email notify:', mailErr); }

            this.notify('✅ CAT created! Awaiting admin approval.', 'success');
            if (e?.target?.reset) e.target.reset();
            this.populateForm();
            await this.loadExams();

        } catch (err) {
            console.error('create:', err);
            this.notify('Failed to create CAT: ' + err.message, 'error');
        } finally {
            if (btn) { btn.disabled = false; btn.innerHTML = original; }
            this.isProcessing = false;
        }
    },

    // ---------- delete ----------
    async del(id) {
        const ex = this.exams.find(x => String(x.id) === String(id));
        if (!ex) return;
        if (ex.created_by !== this.lecturerUuid) {
            this.notify('You can only delete your own exams.', 'warning');
            return;
        }
        if (!confirm('Delete "' + (ex.exam_name || ex.title) + '"?')) return;

        try {
            const { error } = await this.sb().from('exams')
                .delete().eq('id', id).eq('created_by', this.lecturerUuid);
            if (error) throw error;
            this.notify('✅ Deleted!', 'success');
            await this.loadExams();
        } catch (err) {
            this.notify('Failed: ' + err.message, 'error');
        }
    },

    // ---------- refresh ----------
    async refresh() {
        await this.loadExams();
        this.notify('Exams refreshed!', 'success');
    },

    // ---------- export ----------
    exportExams() {
        if (!this.exams.length) {
            this.notify('Nothing to export', 'warning');
            return;
        }
        const rows = [['Type', 'Title', 'Unit', 'Program', 'Block', 'Date', 'Duration', 'Status']]
            .concat(this.exams.map(e => [
                e.exam_type || '',
                e.exam_name || e.title || '',
                e.course_code || '',
                e.target_program || '',
                e.block || '',
                e.exam_date || '',
                e.duration_minutes || '',
                e.status || ''
            ]));
        const csv = rows.map(r =>
            r.map(x => '"' + String(x).replace(/"/g, '""') + '"').join(',')
        ).join('\n');

        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
        a.download = 'exams_' + new Date().toISOString().split('T')[0] + '.csv';
        a.click();
        URL.revokeObjectURL(a.href);
        this.notify('✅ Exported!', 'success');
    },

    // ============================================================
    // EMAIL NOTIFICATIONS
    // ============================================================
    async getToken() {
        try {
            const sb = this.sb();
            const s = await sb?.auth?.getSession?.();
            const tok = s?.data?.session?.access_token;
            if (tok) return tok;
        } catch (_) {}
        return FALLBACK_ANON_KEY;
    },

    async sendEmail(to, subject, html) {
        try {
            const token = await this.getToken();
            const res = await fetch(EDGE_FUNCTION_URL, {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer ' + token,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    to: to,
                    subject: subject,
                    html: html,
                    from: FROM_ADDRESS
                })
            });
            const json = await res.json().catch(() => ({}));
            const ok = res.ok && json.success !== false;
            return { success: ok, data: json };
        } catch (e) {
            console.error('sendEmail:', e);
            return { success: false, error: e.message };
        }
    },

    buildStudentHtml(ex) {
        const d = ex.exam_date
            ? new Date(ex.exam_date).toLocaleDateString('en-KE', {
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
              })
            : 'TBD';
        const typeLabel = ex.exam_type || 'Exam';

        return (
'<!doctype html><html><body style="font-family:Inter,Arial,sans-serif;background:#f0f4f8;padding:30px;">' +
'<div style="max-width:600px;margin:auto;background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 10px 40px rgba(10,61,98,.15);">' +
'<div style="background:linear-gradient(135deg,#0A3D62,#1a5276);padding:32px;color:#fff;text-align:center;">' +
'<div style="font-size:40px;">📝</div>' +
'<h1 style="margin:6px 0 0;font-size:22px;">New ' + this.esc(typeLabel) + ' Posted</h1>' +
'<p style="margin:6px 0 0;opacity:.85;font-size:13px;">Nakuru College of Health Sciences and Management</p>' +
'</div>' +
'<div style="padding:28px 32px;">' +
'<p>Dear Student,</p>' +
'<p>A new assessment has been posted for your program. Please review the details below.</p>' +
'<table style="width:100%;border-collapse:collapse;font-size:14px;background:#f8fafc;border-radius:12px;overflow:hidden;">' +
'<tr><td style="padding:8px 14px;color:#64748B;">Title</td><td style="padding:8px 14px;font-weight:600;color:#0A3D62;">' + this.esc(ex.title) + '</td></tr>' +
'<tr><td style="padding:8px 14px;color:#64748B;">Program</td><td style="padding:8px 14px;font-weight:600;">' + this.esc(ex.target_program) + '</td></tr>' +
'<tr><td style="padding:8px 14px;color:#64748B;">Block</td><td style="padding:8px 14px;font-weight:600;">' + this.esc(ex.block) + '</td></tr>' +
'<tr><td style="padding:8px 14px;color:#64748B;">Date</td><td style="padding:8px 14px;font-weight:600;">' + d + '</td></tr>' +
'<tr><td style="padding:8px 14px;color:#64748B;">Time</td><td style="padding:8px 14px;font-weight:600;">' + this.esc(ex.exam_start_time || 'TBD') + '</td></tr>' +
'<tr><td style="padding:8px 14px;color:#64748B;">Duration</td><td style="padding:8px 14px;font-weight:600;">' + ex.duration_minutes + ' minutes</td></tr>' +
'</table>' +
'<p style="text-align:center;margin-top:24px;">' +
'<a href="https://nchms.co.ke/student" style="background:#0A3D62;color:#fff;padding:12px 28px;border-radius:10px;text-decoration:none;font-weight:600;">Access Student Portal</a>' +
'</p>' +
'<p style="color:#94a3b8;font-size:12px;margin-top:20px;">This is an automated notification. Please do not reply.</p>' +
'</div></div></body></html>'
        );
    },

    buildLecturerHtml(ex, prof) {
        const d = ex.exam_date
            ? new Date(ex.exam_date).toLocaleDateString('en-KE', {
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
              })
            : 'TBD';

        return (
'<!doctype html><html><body style="font-family:Inter,Arial,sans-serif;background:#f0f4f8;padding:30px;">' +
'<div style="max-width:600px;margin:auto;background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 10px 40px rgba(10,61,98,.15);">' +
'<div style="background:linear-gradient(135deg,#4C1D95,#6d28d9);padding:26px;color:#fff;">' +
'<h1 style="margin:0;font-size:20px;">✅ Exam Submitted for Approval</h1>' +
'<p style="margin:6px 0 0;opacity:.9;font-size:13px;">A copy of your submission is below.</p>' +
'</div>' +
'<div style="padding:24px 28px;">' +
'<p>Hi ' + this.esc(prof.full_name || 'Lecturer') + ',</p>' +
'<p>Your exam has been created and is now awaiting admin approval.</p>' +
'<table style="width:100%;border-collapse:collapse;font-size:14px;background:#f8fafc;border-radius:12px;overflow:hidden;">' +
'<tr><td style="padding:8px 14px;color:#64748B;">Title</td><td style="padding:8px 14px;font-weight:600;">' + this.esc(ex.title) + '</td></tr>' +
'<tr><td style="padding:8px 14px;color:#64748B;">Program</td><td style="padding:8px 14px;font-weight:600;">' + this.esc(ex.target_program) + '</td></tr>' +
'<tr><td style="padding:8px 14px;color:#64748B;">Block</td><td style="padding:8px 14px;font-weight:600;">' + this.esc(ex.block) + '</td></tr>' +
'<tr><td style="padding:8px 14px;color:#64748B;">Date</td><td style="padding:8px 14px;font-weight:600;">' + d + '</td></tr>' +
'<tr><td style="padding:8px 14px;color:#64748B;">Approval</td><td style="padding:8px 14px;font-weight:600;color:#92400e;">⏳ Pending</td></tr>' +
'</table>' +
'<p style="color:#94a3b8;font-size:12px;margin-top:18px;">You will be notified when the admin approves or rejects it.</p>' +
'</div></div></body></html>'
        );
    },

    async notifyByEmail(ex) {
        const sb = this.sb();
        if (!sb) return;

        // 1. Students in the same program + block
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
        } catch (e) {
            console.warn('student fetch:', e);
        }

        const studentHtml = this.buildStudentHtml(ex);
        let sent = 0, failed = 0;
        for (const s of students) {
            if (!s.email) { failed++; continue; }
            const r = await this.sendEmail(
                s.email,
                '📝 New ' + (ex.exam_type || 'Exam') + ': ' + ex.title,
                studentHtml
            );
            r.success ? sent++ : failed++;
            await new Promise(r => setTimeout(r, 150));
        }
        console.log('📧 Students: ' + sent + ' sent / ' + failed + ' failed / ' + students.length + ' total');

        // 2. Confirmation to the lecturer
        const prof = window.lecturerDB?.getCurrentUserProfile?.() || {};
        if (prof.email) {
            const lecturerHtml = this.buildLecturerHtml(ex, prof);
            const r = await this.sendEmail(
                prof.email,
                '✅ Submitted: ' + ex.title,
                lecturerHtml
            );
            console.log('📧 Lecturer copy:', r.success ? 'sent' : 'failed');
        }
    }
};

// ------------------------------------------------------------
// GLOBAL EXPOSURE — every function the HTML calls
// ------------------------------------------------------------
window.LecturerExams = LecturerExams;
window.filterExams   = () => LecturerExams.filter();
window.loadExams     = () => LecturerExams.loadExams();
window.deleteExam    = id => LecturerExams.del(id);
window.refreshExams  = () => LecturerExams.refresh();
window.exportExams   = () => LecturerExams.exportExams();
window.handleAddExam = e  => LecturerExams.create(e);

// ------------------------------------------------------------
// AUTO-INIT
// ------------------------------------------------------------
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () =>
        setTimeout(() => LecturerExams.init(), 800));
} else {
    setTimeout(() => LecturerExams.init(), 800);
}

console.log('✅ LecturerExams loaded — full version with email notifications');
})();
