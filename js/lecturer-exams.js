// js/lecturer-exams.js //
============================================================ // NCHSM
Lecturer Exams / CATs // Super Admin-aligned fields + Lecturer
scope/permissions //
============================================================

(function () { ‘use strict’;

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
        'Block 1', 'Block 2', 'Block 3',
        'Block 4', 'Block 5', 'Block 6',
        'Term 1', 'Term 2', 'Term 3',
        'Term 4', 'Term 5', 'Term 6',
        'Final'
    ];

    const STATIC_PROGRAMS = [
        { value: 'KRCHN', label: 'KRCHN - Nursing' },
        { value: 'DPOTT', label: 'DPOTT - Perioperative Theatre' },
        { value: 'DCH', label: 'DCH - Community Health' },
        { value: 'DHRIT', label: 'DHRIT - Health Records & IT' },
        { value: 'DSL', label: 'DSL - Science Lab' },
        { value: 'DSW', label: 'DSW - Social Work' },
        { value: 'DCJS', label: 'DCJS - Criminal Justice' },
        { value: 'DICT', label: 'DICT - ICT' },
        { value: 'DME', label: 'DME - Medical Engineering' },
        { value: 'CPOTT', label: 'CPOTT - Certificate Perioperative Theatre' },
        { value: 'CCH', label: 'CCH - Certificate Community Health' },
        { value: 'CHRIT', label: 'CHRIT - Certificate Health Records & IT' },
        { value: 'CPC', label: 'CPC - Certificate Patient Care' },
        { value: 'CSL', label: 'CSL - Certificate Science Lab' },
        { value: 'CSW', label: 'CSW - Certificate Social Work' },
        { value: 'CCJS', label: 'CCJS - Certificate Criminal Justice' },
        { value: 'CAG', label: 'CAG - Certificate Agriculture' },
        { value: 'CHSS', label: 'CHSS - Certificate Health Support Services' },
        { value: 'CICT', label: 'CICT - Certificate ICT' },
        { value: 'CCG', label: 'CCG - Certificate Caregiver' },
        { value: 'COMT', label: 'COMT - Certificate Orthopedic Trauma Medicine' },
        { value: 'ACH', label: 'ACH - Artisan Community Health' },
        { value: 'AAG', label: 'AAG - Artisan Agriculture' },
        { value: 'ASW', label: 'ASW - Artisan Social Work' },
        { value: 'CCA', label: 'CCA - Certificate Computer Applications' },
        { value: 'PTE', label: 'PTE - TVET/CDACC' }
    ];

    if (typeof window.showNotification !== 'function') {
        window.showNotification = function (msg, type) {
            const colors = {
                success: '#059669',
                error: '#dc2626',
                warning: '#d97706',
                info: '#2563eb'
            };

            const el = document.createElement('div');
            el.style.cssText =
                'position:fixed;bottom:24px;right:24px;z-index:99999;' +
                'background:' + (colors[type] || '#334155') + ';color:#fff;' +
                'padding:14px 20px;border-radius:10px;' +
                'font:600 14px Inter,system-ui,sans-serif;' +
                'box-shadow:0 10px 30px rgba(0,0,0,.25);max-width:360px;';

            el.textContent = msg;
            document.body.appendChild(el);

            setTimeout(() => el.remove(), 4200);
        };
    }

    const LecturerExams = {

        exams: [],
        filteredExams: [],
        lecturerUuid: null,
        lecturerProfile: {},
        courses: [],
        classes: [],
        selectedStudents: [],
        selectedCourse: null,
        isProcessing: false,
        _bound: false,

        $(id) {
            return document.getElementById(id);
        },

        firstEl(ids) {
            for (const id of ids) {
                const el = this.$(id);
                if (el) return el;
            }
            return null;
        },

        val(id) {
            const el = this.$(id);
            return el ? (el.value ?? '') : '';
        },

        value(ids) {
            const el = this.firstEl(ids);
            return el ? (el.value ?? '') : '';
        },

        checked(id) {
            const el = this.$(id);
            return !!el?.checked;
        },

        notify(msg, type) {
            window.showNotification(msg, type || 'info');
        },

        esc(value) {
            if (value == null) return '';
            const d = document.createElement('div');
            d.textContent = String(value);
            return d.innerHTML;
        },

        fmtDate(value) {
            if (!value) return 'N/A';
            try {
                return new Date(value).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                });
            } catch (_) {
                return value;
            }
        },

        sb() {
            return window.lecturerDB?.supabase ||
                   window.sb ||
                   window.supabase ||
                   window.supabaseClient ||
                   null;
        },

        profile() {
            return window.lecturerDB?.getCurrentUserProfile?.() ||
                   window.currentUserProfile ||
                   this.lecturerProfile ||
                   {};
        },

        tbody() {
            return this.firstEl([
                'examsTableBody',
                'exams-table-body',
                'examsTable'
            ]);
        },

        async init() {
            console.log('📝 LecturerExams init');

            await this.resolveId();
            this.populateForm();
            this.bind();

            await Promise.allSettled([
                this.loadCourses(),
                this.loadClasses()
            ]);

            await this.loadExams();

            console.log('✅ LecturerExams ready');
        },

        async resolveId() {
            const p = this.profile();

            this.lecturerProfile = p || {};

            this.lecturerUuid =
                p.user_id ||
                p.id ||
                p.auth_user_id ||
                null;

            if (!this.lecturerUuid) {
                try {
                    const s =
                        localStorage.getItem('staffSession') ||
                        sessionStorage.getItem('staffSession');

                    if (s) {
                        const d = JSON.parse(s);

                        this.lecturerUuid =
                            d.user_id ||
                            d.id ||
                            d.auth_user_id ||
                            null;
                    }
                } catch (_) {}
            }

            console.log('👤 Lecturer UUID:', this.lecturerUuid);
        },

        // --------------------------------------------------------
        // FORM POPULATION
        // --------------------------------------------------------

        populateForm() {
            const p = this.profile();
            const program = p.program || p.department || '';

            const programEl = this.firstEl([
                'exam_program',
                'examProgram'
            ]);

            if (programEl) {
                if (program) {
                    const existing = Array.from(programEl.options)
                        .find(o => o.value === program);

                    if (existing) {
                        programEl.value = program;
                    } else {
                        programEl.innerHTML =
                            '<option value="' + this.esc(program) + '">' +
                            this.esc(program) +
                            '</option>';
                        programEl.value = program;
                    }

                    programEl.disabled = true;
                } else if (programEl.options.length <= 1) {
                    programEl.innerHTML =
                        '<option value="">-- Select Program --</option>' +
                        STATIC_PROGRAMS.map(x =>
                            '<option value="' + this.esc(x.value) + '">' +
                            this.esc(x.label) +
                            '</option>'
                        ).join('');
                }
            }

            this.populateIntakeYears();
            this.populateBlocks();
            this.bindDynamicProgramEvents();
            this.updateNotificationTargetVisibility();

            const dateEl = this.firstEl(['exam_date', 'examDate']);

            if (dateEl && !dateEl.value) {
                const d = new Date();
                d.setDate(d.getDate() + 7);
                dateEl.value = d.toISOString().split('T')[0];
            }

            const duration = this.firstEl([
                'exam_duration_minutes',
                'examDurationMinutes'
            ]);

            if (duration && !duration.value) duration.value = '120';

            const outOf = this.$('exam_out_of');
            if (outOf && !outOf.value) outOf.value = '100';

            const pass = this.$('exam_pass_mark');
            if (pass && !pass.value) pass.value = '50';

            const fee = this.$('exam_min_fee');
            if (fee && !fee.value) fee.value = '0';
        },

        populateIntakeYears() {
            const el = this.firstEl([
                'exam_intake',
                'examIntake'
            ]);

            if (!el) return;

            const current = new Date().getFullYear();
            const existing = el.value;

            if (el.options.length <= 1) {
                el.innerHTML = '<option value="">-- Select --</option>';

                for (let y = current - 2; y <= current + 3; y++) {
                    el.insertAdjacentHTML(
                        'beforeend',
                        '<option value="' + y + '">' + y + '</option>'
                    );
                }
            }

            if (existing) el.value = existing;
        },

        populateBlocks() {
            const el = this.firstEl([
                'exam_block_term',
                'examBlockTerm'
            ]);

            if (!el) return;

            const existing = el.value;

            el.innerHTML =
                '<option value="">-- Select --</option>' +
                STATIC_BLOCKS.map(b =>
                    '<option value="' + this.esc(b) + '">' +
                    this.esc(b) +
                    '</option>'
                ).join('');

            if (existing) el.value = existing;
        },

        bindDynamicProgramEvents() {
            const program = this.firstEl([
                'exam_program',
                'examProgram'
            ]);

            if (!program || program.dataset.examBound === '1') return;

            program.dataset.examBound = '1';

            program.addEventListener('change', async () => {
                await this.loadClasses();
                this.renderCourses();
                this.populateBlocks();
            });
        },

        // --------------------------------------------------------
        // COURSE / UNIT SEARCH
        // --------------------------------------------------------

        async loadCourses() {
            const sb = this.sb();
            if (!sb) return;

            try {
                const { data, error } = await sb
                    .from('courses')
                    .select('*')
                    .limit(500);

                if (error) throw error;

                this.courses = data || [];
                this.bindCourseSearch();
            } catch (err) {
                console.warn('Course loading:', err.message);
                this.courses = [];
                this.bindCourseSearch();
            }
        },

        normalizeCourse(row) {
            return {
                id: row.id,
                code:
                    row.course_code ||
                    row.code ||
                    row.unit_code ||
                    row.courseCode ||
                    '',
                name:
                    row.course_name ||
                    row.name ||
                    row.unit_name ||
                    row.title ||
                    row.course ||
                    '',
                program:
                    row.program ||
                    row.program_code ||
                    row.target_program ||
                    ''
            };
        },

        bindCourseSearch() {
            const input = this.$('createCourseSearchInput');
            if (!input || input.dataset.bound === '1') return;

            input.dataset.bound = '1';

            input.addEventListener('input', () => {
                this.searchCourses(input.value);
            });

            input.addEventListener('focus', () => {
                if (!input.value.trim()) {
                    this.searchCourses('');
                }
            });

            document.addEventListener('click', e => {
                const container = this.$('createCourseSearchContainer');

                if (container && !container.contains(e.target)) {
                    const list = this.$('createCourseDropdownList');
                    if (list) list.style.display = 'none';
                }
            });
        },

        searchCourses(term) {
            const list = this.$('createCourseDropdownList');
            if (!list) return;

            const query = String(term || '').trim().toLowerCase();

            let courses = this.courses.map(c => this.normalizeCourse(c));

            const program = this.value([
                'exam_program',
                'examProgram'
            ]);

            if (program) {
                const matching = courses.filter(c =>
                    !c.program ||
                    c.program === program
                );

                if (matching.length) courses = matching;
            }

            if (query) {
                courses = courses.filter(c =>
                    String(c.code).toLowerCase().includes(query) ||
                    String(c.name).toLowerCase().includes(query) ||
                    String(c.program).toLowerCase().includes(query)
                );
            }

            courses = courses.slice(0, 50);

            if (!courses.length) {
                list.innerHTML =
                    '<div style="padding:12px;text-align:center;color:#94a3b8;font-size:13px;">' +
                    '<i class="fas fa-search"></i> No matching courses found' +
                    '</div>';

                list.style.display = 'block';
                return;
            }

            list.innerHTML = courses.map(c => {
                const title = c.name || c.code || 'Unnamed Unit';
                const code = c.code || '';

                return (
                    '<div class="dropdown-item" ' +
                    'data-course-id="' + this.esc(c.id) + '" ' +
                    'style="padding:9px 14px;cursor:pointer;border-bottom:1px solid #f1f5f9;font-size:13px;">' +

                    '<div>' +
                    '<strong style="color:#334155;">' +
                    this.esc(title) +
                    '</strong>' +

                    (code
                        ? '<span style="font-size:11px;color:#94a3b8;margin-left:8px;">' +
                          this.esc(code) +
                          '</span>'
                        : '') +

                    '</div>' +

                    (c.program
                        ? '<span style="font-size:10px;background:#ede9fe;color:#5b21b6;padding:2px 7px;border-radius:10px;">' +
                          this.esc(c.program) +
                          '</span>'
                        : '') +

                    '</div>'
                );
            }).join('');

            list.style.display = 'block';

            list.querySelectorAll('[data-course-id]').forEach(item => {
                item.addEventListener('click', () => {
                    const id = item.dataset.courseId;
                    const course = courses.find(c =>
                        String(c.id) === String(id)
                    );

                    if (course) this.selectCourse(course);
                });
            });
        },

        selectCourse(course) {
            this.selectedCourse = course;

            const hidden = this.$('exam_course_id');
            if (hidden) hidden.value = course.id || '';

            const input = this.$('createCourseSearchInput');
            if (input) {
                input.value =
                    course.name +
                    (course.code ? ' (' + course.code + ')' : '');
            }

            const display = this.$('createSelectedCourseDisplay');
            const name = this.$('createSelectedCourseName');

            if (name) {
                name.textContent =
                    course.name +
                    (course.code ? ' (' + course.code + ')' : '');
            }

            if (display) display.style.display = 'inline';

            const list = this.$('createCourseDropdownList');
            if (list) list.style.display = 'none';
        },

        clearSelectedCourse() {
            this.selectedCourse = null;

            const hidden = this.$('exam_course_id');
            if (hidden) hidden.value = '';

            const input = this.$('createCourseSearchInput');
            if (input) input.value = '';

            const display = this.$('createSelectedCourseDisplay');
            if (display) display.style.display = 'none';
        },

        // --------------------------------------------------------
        // CLASSES
        // --------------------------------------------------------

        async loadClasses() {
            const selector = this.$('exam_class_selector');
            if (!selector) return;

            const program = this.value([
                'exam_program',
                'examProgram'
            ]);

            const intake = this.value([
                'exam_intake',
                'examIntake'
            ]);

            selector.innerHTML =
                '<div style="color:#94a3b8;font-size:13px;grid-column:1/-1;text-align:center;padding:8px;">' +
                '<i class="fas fa-spinner fa-spin"></i> Loading classes...' +
                '</div>';

            const sb = this.sb();

            if (!sb) {
                this.renderClassFallback(selector);
                return;
            }

            try {
                const { data, error } = await sb
                    .from('classes')
                    .select('*')
                    .limit(500);

                if (error) throw error;

                let rows = data || [];

                rows = rows.filter(c => {
                    const cp =
                        c.program ||
                        c.program_code ||
                        c.target_program ||
                        '';

                    const cy =
                        c.intake_year ||
                        c.intake ||
                        c.year ||
                        '';

                    const programOk = !program || !cp || cp === program;
                    const intakeOk = !intake || !cy || String(cy) === String(intake);

                    return programOk && intakeOk;
                });

                this.classes = rows;

                if (!rows.length) {
                    this.renderClassFallback(selector);
                    return;
                }

                selector.innerHTML = rows.map((c, i) => {
                    const id = c.id || c.class_id || ('class_' + i);

                    const label =
                        c.class_name ||
                        c.name ||
                        c.class_code ||
                        c.code ||
                        ('Class ' + (i + 1));

                    return (
                        '<label style="display:flex;align-items:center;gap:7px;padding:8px 10px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;font-size:12px;cursor:pointer;">' +
                        '<input type="checkbox" class="exam-class-checkbox" value="' +
                        this.esc(id) +
                        '" data-class-name="' +
                        this.esc(label) +
                        '" style="accent-color:#4C1D95;">' +
                        '<span>' + this.esc(label) + '</span>' +
                        '</label>'
                    );
                });

            } catch (err) {
                console.warn('Class loading:', err.message);
                this.renderClassFallback(selector);
            }
        },

        renderClassFallback(selector) {
            const program = this.value([
                'exam_program',
                'examProgram'
            ]);

            const intake = this.value([
                'exam_intake',
                'examIntake'
            ]);

            const label =
                [program, intake].filter(Boolean).join(' - ') ||
                'Assigned Class';

            selector.innerHTML =
                '<label style="display:flex;align-items:center;gap:7px;padding:8px 10px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;font-size:12px;cursor:pointer;">' +
                '<input type="checkbox" class="exam-class-checkbox" value="" data-class-name="' +
                this.esc(label) +
                '" style="accent-color:#4C1D95;">' +
                '<span>' + this.esc(label) + '</span>' +
                '</label>';
        },

        selectedClasses() {
            return Array.from(
                document.querySelectorAll(
                    '#exam_class_selector .exam-class-checkbox:checked'
                )
            ).map(el => ({
                id: el.value,
                name: el.dataset.className || ''
            }));
        },

        // --------------------------------------------------------
        // STUDENT NOTIFICATIONS
        // --------------------------------------------------------

        updateNotificationTargetVisibility() {
            const target = this.$('exam_notify_target');
            const container = this.$('specific_students_container');

            if (!target || !container) return;

            container.style.display =
                target.value === 'specific' ? 'block' : 'none';
        },

        async searchStudentsForNotification() {
            const input = this.$('exam_student_search');
            const results = this.$('student_search_results');

            if (!input || !results) return;

            const term = input.value.trim();

            if (term.length < 2) {
                results.style.display = 'none';
                return;
            }

            const sb = this.sb();

            if (!sb) {
                this.notify('Database connection unavailable.', 'error');
                return;
            }

            results.style.display = 'block';
            results.innerHTML =
                '<div style="padding:10px;text-align:center;color:#94a3b8;">' +
                '<i class="fas fa-spinner fa-spin"></i> Searching...</div>';

            try {
                const safe = term.replace(/[%_,]/g, ' ');

                const { data, error } = await sb
                    .from('consolidated_user_profiles_table')
                    .select('user_id,full_name,email,admission_number,student_id,program,block,status')
                    .eq('role', 'student')
                    .or(
                        'full_name.ilike.%' + safe + '%,' +
                        'email.ilike.%' + safe + '%,' +
                        'admission_number.ilike.%' + safe + '%,' +
                        'student_id.ilike.%' + safe + '%'
                    )
                    .limit(25);

                if (error) throw error;

                if (!data?.length) {
                    results.innerHTML =
                        '<div style="padding:10px;text-align:center;color:#94a3b8;">No students found.</div>';
                    return;
                }

                results.innerHTML = data.map(s => {
                    const id = s.user_id || s.id || '';
                    const already = this.selectedStudents.some(x =>
                        String(x.user_id) === String(id)
                    );

                    return (
                        '<div data-student-id="' + this.esc(id) + '"' +
                        ' style="padding:8px 10px;border-bottom:1px solid #f1f5f9;cursor:pointer;' +
                        (already ? 'background:#ecfdf5;' : '') + '">' +

                        '<strong>' + this.esc(s.full_name || 'Student') + '</strong>' +

                        '<span style="font-size:11px;color:#94a3b8;margin-left:8px;">' +
                        this.esc(
                            s.admission_number ||
                            s.student_id ||
                            s.email ||
                            ''
                        ) +
                        '</span>' +

                        (already
                            ? '<span style="float:right;color:#059669;">✓ Selected</span>'
                            : '') +

                        '</div>'
                    );
                }).join('');

                results.querySelectorAll('[data-student-id]').forEach(el => {
                    el.addEventListener('click', () => {
                        const student = data.find(s =>
                            String(s.user_id || s.id) ===
                            String(el.dataset.studentId)
                        );

                        if (student) this.toggleStudent(student);
                    });
                });

            } catch (err) {
                console.error('Student search:', err);
                results.innerHTML =
                    '<div style="padding:10px;color:#dc2626;">Search failed.</div>';
            }
        },

        toggleStudent(student) {
            const id = student.user_id || student.id;

            const index = this.selectedStudents.findIndex(x =>
                String(x.user_id) === String(id)
            );

            if (index >= 0) {
                this.selectedStudents.splice(index, 1);
            } else {
                this.selectedStudents.push({
                    user_id: id,
                    full_name: student.full_name || 'Student',
                    email: student.email || '',
                    admission_number:
                        student.admission_number ||
                        student.student_id ||
                        ''
                });
            }

            this.renderSelectedStudents();
            this.updateStudentCount();
        },

        renderSelectedStudents() {
            const container = this.$('selected_students_list');
            if (!container) return;

            if (!this.selectedStudents.length) {
                container.innerHTML =
                    '<span style="font-size:12px;color:#94a3b8;">' +
                    '<i class="fas fa-info-circle"></i> No students selected' +
                    '</span>';
                return;
            }

            container.innerHTML = this.selectedStudents.map(s =>
                '<span style="display:inline-flex;align-items:center;gap:5px;background:#ede9fe;color:#5b21b6;padding:4px 8px;border-radius:14px;font-size:11px;">' +
                this.esc(s.full_name) +
                '<button type="button" data-remove-student="' +
                this.esc(s.user_id) +
                '" style="border:0;background:transparent;color:#7c3aed;cursor:pointer;padding:0;">×</button>' +
                '</span>'
            ).join('');

            container.querySelectorAll('[data-remove-student]').forEach(btn => {
                btn.addEventListener('click', () => {
                    const id = btn.dataset.removeStudent;

                    this.selectedStudents =
                        this.selectedStudents.filter(s =>
                            String(s.user_id) !== String(id)
                        );

                    this.renderSelectedStudents();
                    this.updateStudentCount();
                });
            });
        },

        updateStudentCount() {
            const el = this.$('student_notify_count');
            if (el) {
                el.innerHTML =
                    '<i class="fas fa-users"></i> ' +
                    this.selectedStudents.length +
                    ' students';
            }
        },

        // --------------------------------------------------------
        // LOAD EXAMS
        // --------------------------------------------------------

        async loadExams() {
            const sb = this.sb();
            const tbody = this.tbody();

            if (tbody) {
                tbody.innerHTML =
                    '<tr><td colspan="12" style="padding:45px;text-align:center;color:#94a3b8;">' +
                    '<div style="width:38px;height:38px;border:4px solid #e2e8f0;border-top-color:#4C1D95;border-radius:50%;animation:spin 1s linear infinite;margin:0 auto 12px;"></div>' +
                    'Loading assessments...</td></tr>';
            }

            if (!sb) {
                this.exams = [];
                this.filteredExams = [];
                this.render();
                this.updateStats();
                return;
            }

            try {
                const p = this.profile();
                const program = p.program || p.department || null;

                const fields = [
                    'id',
                    'title',
                    'exam_name',
                    'exam_type',
                    'exam_basis',
                    'exam_date',
                    'exam_start_time',
                    'exam_deadline',
                    'duration_minutes',
                    'status',
                    'approval_status',
                    'created_by',
                    'target_program',
                    'program_type',
                    'block',
                    'block_term',
                    'intake_year',
                    'intake_month',
                    'course_code',
                    'course_id',
                    'marks_out_of',
                    'total_marks',
                    'MARKS',
                    'pass_mark',
                    'min_fee_balance',
                    'online_link',
                    'exam_link',
                    'venue',
                    'class_ids',
                    'class_names',
                    'show_attendance',
                    'show_grades',
                    'show_teacher_remarks',
                    'show_principal_remarks',
                    'show_performance_metrics'
                ].join(',');

                let q = sb
                    .from('exams')
                    .select(fields)
                    .order('exam_date', { ascending: false });

                if (program) {
                    q = q.eq('target_program', program);
                }

                const { data, error } = await q;

                if (error) throw error;

                this.exams = data || [];

            } catch (err) {
                console.error('loadExams:', err);

                // Fallback for databases that do not yet contain every
                // new optional column.
                try {
                    const p = this.profile();
                    const program = p.program || p.department || null;

                    let q = sb
                        .from('exams')
                        .select('*')
                        .order('exam_date', { ascending: false });

                    if (program) {
                        q = q.eq('target_program', program);
                    }

                    const { data, error } = await q;

                    if (error) throw error;

                    this.exams = data || [];

                    this.notify(
                        'Loaded assessments using compatibility mode. Check your exams table columns if needed.',
                        'warning'
                    );

                } catch (fallbackErr) {
                    console.error('loadExams fallback:', fallbackErr);
                    this.exams = [];
                    this.notify('Unable to load assessments: ' + fallbackErr.message, 'error');
                }
            }

            this.filteredExams = [...this.exams];
            this.populateFilterPrograms();
            this.render();
            this.updateStats();
        },

        // --------------------------------------------------------
        // RENDER
        // --------------------------------------------------------

        normalizeStatus(status) {
            const raw = String(status || '').trim();

            const map = {
                scheduled: 'Upcoming',
                upcoming: 'Upcoming',
                inprogress: 'InProgress',
                'in progress': 'InProgress',
                completed: 'Completed',
                published: 'published',
                draft: 'Draft',
                cancelled: 'Cancelled',
                canceled: 'Cancelled'
            };

            return map[raw.toLowerCase()] || raw || 'Draft';
        },

        statusBadge(status) {
            const st = this.normalizeStatus(status);

            const config = {
                Upcoming: {
                    color: '#f59e0b',
                    bg: '#fef3c7',
                    icon: '📅'
                },
                InProgress: {
                    color: '#2563eb',
                    bg: '#dbeafe',
                    icon: '⏳'
                },
                Completed: {
                    color: '#059669',
                    bg: '#d1fae5',
                    icon: '✅'
                },
                published: {
                    color: '#059669',
                    bg: '#d1fae5',
                    icon: '📢'
                },
                Draft: {
                    color: '#64748b',
                    bg: '#f1f5f9',
                    icon: '📝'
                },
                Cancelled: {
                    color: '#dc2626',
                    bg: '#fee2e2',
                    icon: '❌'
                }
            };

            const c = config[st] || {
                color: '#64748b',
                bg: '#f1f5f9',
                icon: '📌'
            };

            return (
                '<span style="display:inline-flex;align-items:center;gap:5px;' +
                'background:' + c.bg + ';color:' + c.color + ';' +
                'padding:4px 10px;border-radius:14px;font-size:11px;font-weight:600;">' +
                c.icon + ' ' +
                this.esc(st) +
                '</span>'
            );
        },

        typeLabel(type) {
            const map = {
                EXAM: 'Final Exam',
                CAT: 'CAT',
                CAT_1: 'CAT 1',
                CAT_2: 'CAT 2',
                ASSIGNMENT: 'Assignment'
            };

            return map[type] || type || 'N/A';
        },

        approvalBadge(status) {
            const map = {
                pending:
                    '<span style="background:#fef3c7;color:#92400e;padding:2px 7px;border-radius:10px;font-size:9px;">Pending Approval</span>',
                approved:
                    '<span style="background:#d1fae5;color:#065f46;padding:2px 7px;border-radius:10px;font-size:9px;">Approved</span>',
                rejected:
                    '<span style="background:#fee2e2;color:#991b1b;padding:2px 7px;border-radius:10px;font-size:9px;">Rejected</span>'
            };

            return map[String(status || '').toLowerCase()] || '';
        },

        render() {
            const tbody = this.tbody();

            if (!tbody) {
                console.warn('LecturerExams: table body not found.');
                return;
            }

            const list = this.filteredExams || this.exams || [];

            if (!list.length) {
                tbody.innerHTML =
                    '<tr><td colspan="12" style="padding:50px;text-align:center;color:#94a3b8;">' +
                    '<i class="fas fa-file-alt" style="font-size:44px;display:block;margin-bottom:12px;color:#e2e8f0;"></i>' +
                    '<h3 style="color:#475569;margin:0 0 7px;">No Assessments Found</h3>' +
                    '<p style="margin:0;font-size:13px;">Create an exam or CAT using the form above.</p>' +
                    '</td></tr>';

                this.updateCountDisplay(0);
                return;
            }

            const me = this.lecturerUuid;

            tbody.innerHTML = list.map(ex => {
                const owner =
                    !me ||
                    String(ex.created_by) === String(me);

                const title =
                    ex.exam_name ||
                    ex.title ||
                    'Untitled';

                const program =
                    ex.target_program ||
                    ex.program_type ||
                    'N/A';

                const unit =
                    ex.course_code ||
                    ex.course_name ||
                    '—';

                const marks =
                    ex.marks_out_of ??
                    ex.total_marks ??
                    ex.MARKS ??
                    '100';

                const pass =
                    ex.pass_mark ??
                    '50';

                const intake =
                    [
                        ex.intake_year,
                        ex.intake_month
                    ].filter(Boolean).join(' / ') ||
                    'N/A';

                const block =
                    ex.block_term ||
                    ex.block ||
                    'N/A';

                const date =
                    ex.exam_date
                        ? this.fmtDate(ex.exam_date)
                        : 'N/A';

                const time =
                    ex.exam_start_time
                        ? ' ' + this.esc(ex.exam_start_time)
                        : '';

                const approval =
                    this.approvalBadge(ex.approval_status);

                let actions = '';

                if (owner) {
                    actions =
                        '<button type="button" ' +
                        'onclick="LecturerExams.del(\'' +
                        this.esc(ex.id) +
                        '\')" ' +
                        'style="background:#fee2e2;color:#dc2626;border:0;padding:6px 10px;border-radius:6px;cursor:pointer;font-size:11px;" ' +
                        'title="Delete">' +
                        '<i class="fas fa-trash"></i>' +
                        '</button>';
                } else {
                    actions =
                        '<span style="color:#94a3b8;font-size:10px;">Other</span>';
                }

                return (
                    '<tr style="border-bottom:1px solid #f1f5f9;">' +

                    '<td style="padding:12px 14px;">' +
                    '<span style="background:#ede9fe;color:#5b21b6;padding:4px 9px;border-radius:12px;font-size:10px;font-weight:600;">' +
                    this.esc(this.typeLabel(ex.exam_type)) +
                    '</span>' +
                    '</td>' +

                    '<td style="padding:12px 14px;color:#475569;font-size:12px;">' +
                    this.esc(program) +
                    '</td>' +

                    '<td style="padding:12px 14px;color:#475569;font-size:12px;">' +
                    this.esc(unit) +
                    '</td>' +

                    '<td style="padding:12px 14px;font-weight:600;color:#1e293b;">' +
                    this.esc(title) +
                    '<div style="margin-top:3px;">' +
                    approval +
                    '</div>' +
                    '</td>' +

                    '<td style="padding:12px 14px;text-align:center;color:#475569;">' +
                    this.esc(marks) +
                    '</td>' +

                    '<td style="padding:12px 14px;text-align:center;color:#475569;">' +
                    this.esc(pass) +
                    '</td>' +

                    '<td style="padding:12px 14px;color:#475569;">' +
                    date + time +
                    '</td>' +

                    '<td style="padding:12px 14px;text-align:center;color:#475569;">' +
                    (ex.duration_minutes
                        ? this.esc(ex.duration_minutes) + 'm'
                        : 'N/A') +
                    '</td>' +

                    '<td style="padding:12px 14px;color:#475569;">' +
                    this.esc(intake) +
                    '</td>' +

                    '<td style="padding:12px 14px;color:#475569;">' +
                    this.esc(block) +
                    '</td>' +

                    '<td style="padding:12px 14px;text-align:center;">' +
                    this.statusBadge(ex.status) +
                    '</td>' +

                    '<td style="padding:12px 14px;text-align:center;">' +
                    actions +
                    '</td>' +

                    '</tr>'
                );
            }).join('');

            this.updateCountDisplay(list.length);
        },

        updateCountDisplay(count) {
            const ids = [
                'examCountDisplay',
                'examCountBadge2'
            ];

            ids.forEach(id => {
                const el = this.$(id);
                if (el) el.textContent = count;
            });
        },

        updateStats() {
            const e = this.exams || [];

            const normalized = e.map(x => ({
                ...x,
                _status: this.normalizeStatus(x.status)
            }));

            const set = (id, value) => {
                const el = this.$(id);
                if (el) el.textContent = value;
            };

            set('totalExamsStat', normalized.length);

            set(
                'scheduledExamsStat',
                normalized.filter(x =>
                    x._status === 'Upcoming'
                ).length
            );

            set(
                'completedExamsStat',
                normalized.filter(x =>
                    x._status === 'Completed'
                ).length
            );

            set(
                'pendingExamsStat',
                normalized.filter(x =>
                    x._status === 'InProgress'
                ).length
            );

            const published =
                normalized.filter(x =>
                    x._status === 'published'
                ).length;

            const draft =
                normalized.filter(x =>
                    x._status === 'Draft'
                ).length;

            document
                .querySelectorAll('.exam-stat-value')
                .forEach((el, index) => {
                    if (index === 0) el.textContent = normalized.length;
                    if (index === 1) el.textContent = published;
                    if (index === 2) el.textContent =
                        normalized.filter(x =>
                            x._status === 'InProgress'
                        ).length;
                    if (index === 3) el.textContent = draft;
                });
        },

        // --------------------------------------------------------
        // FILTERS
        // --------------------------------------------------------

        populateFilterPrograms() {
            const select = this.firstEl([
                'examFilterProgram',
                'exam_filter_program'
            ]);

            if (!select) return;

            const current = select.value;

            const programs = [
                ...new Set(
                    this.exams
                        .map(x => x.target_program || x.program_type)
                        .filter(Boolean)
                )
            ];

            const base =
                '<option value="">All Programs</option>';

            select.innerHTML =
                base +
                programs.map(p =>
                    '<option value="' +
                    this.esc(p) +
                    '">' +
                    this.esc(p) +
                    '</option>'
                ).join('');

            if (current) select.value = current;
        },

        filter() {
            const search = (
                this.value([
                    'examSearch',
                    'exam-search'
                ]) || ''
            ).trim().toLowerCase();

            const program = this.value([
                'examFilterProgram',
                'exam_filter_program'
            ]);

            const status = this.value([
                'examFilterStatus',
                'exam_filter_status'
            ]);

            const month = this.value([
                'examFilterIntakeMonth',
                'exam_filter_intake_month'
            ]);

            this.filteredExams = this.exams.filter(ex => {
                const hay = [
                    ex.title,
                    ex.exam_name,
                    ex.exam_type,
                    ex.target_program,
                    ex.program_type,
                    ex.course_code,
                    ex.course_name,
                    ex.block,
                    ex.block_term,
                    ex.intake_year,
                    ex.intake_month
                ]
                .filter(Boolean)
                .join(' ')
                .toLowerCase();

                const matchesSearch =
                    !search || hay.includes(search);

                const exProgram =
                    ex.target_program ||
                    ex.program_type ||
                    '';

                const matchesProgram =
                    !program ||
                    exProgram === program;

                const exStatus =
                    this.normalizeStatus(ex.status);

                const matchesStatus =
                    !status ||
                    exStatus === status;

                const matchesMonth =
                    !month ||
                    String(ex.intake_month || '').toLowerCase() ===
                    month.toLowerCase();

                return (
                    matchesSearch &&
                    matchesProgram &&
                    matchesStatus &&
                    matchesMonth
                );
            });

            this.render();
        },

        // --------------------------------------------------------
        // CREATE
        // --------------------------------------------------------

        async create(e) {
            if (e) e.preventDefault();

            if (this.isProcessing) return;

            this.isProcessing = true;

            const btn =
                e?.submitter ||
                e?.target?.querySelector('button[type="submit"]');

            const original =
                btn?.innerHTML || '';

            if (btn) {
                btn.disabled = true;
                btn.innerHTML =
                    '<i class="fas fa-spinner fa-spin"></i> Creating...';
            }

            try {
                const title = this.value([
                    'exam_title',
                    'examTitle'
                ]).trim();

                const type = this.value([
                    'exam_type',
                    'examType'
                ]);

                const status = this.value([
                    'exam_status',
                    'examStatus'
                ]) || 'Draft';

                const basis =
                    this.value([
                        'exam_basis'
                    ]) || 'ordinary';

                const date = this.value([
                    'exam_date',
                    'examDate'
                ]);

                const startTime = this.value([
                    'exam_start_time',
                    'examStartTime'
                ]) || '09:00';

                const deadline = this.value([
                    'exam_deadline'
                ]) || null;

                const duration = parseInt(
                    this.value([
                        'exam_duration_minutes',
                        'examDurationMinutes'
                    ]),
                    10
                );

                const program = this.value([
                    'exam_program',
                    'examProgram'
                ]);

                const intake = this.value([
                    'exam_intake',
                    'examIntake'
                ]);

                const intakeMonth =
                    this.value([
                        'exam_intake_month'
                    ]) || null;

                const block = this.value([
                    'exam_block_term',
                    'examBlockTerm'
                ]);

                const courseId =
                    this.value([
                        'exam_course_id'
                    ]) || null;

                const courseCode =
                    this.selectedCourse?.code ||
                    this.selectedCourse?.name ||
                    null;

                const marksOutOf = Number(
                    this.value([
                        'exam_out_of'
                    ]) || 100
                );

                const passMark = Number(
                    this.value([
                        'exam_pass_mark'
                    ]) || 50
                );

                const minFeeBalance = Number(
                    this.value([
                        'exam_min_fee'
                    ]) || 0
                );

                const link =
                    this.value([
                        'exam_link',
                        'examLink'
                    ]).trim() || null;

                const venue =
                    this.value([
                        'exam_venue',
                        'examVenue'
                    ]).trim() || null;

                const selectedClasses =
                    this.selectedClasses();

                const missing = [];

                if (!title) missing.push('Exam Title');
                if (!type) missing.push('Exam Type');
                if (!date) missing.push('Exam Date');
                if (!program) missing.push('Program');
                if (!intake) missing.push('Intake Year');
                if (!block) missing.push('Block/Term');

                if (!duration || duration <= 0) {
                    missing.push('Duration');
                }

                if (marksOutOf <= 0) {
                    missing.push('Marks Out Of');
                }

                if (passMark < 0 || passMark > marksOutOf) {
                    throw new Error(
                        'Pass Mark must be between 0 and Marks Out Of.'
                    );
                }

                if (missing.length) {
                    throw new Error(
                        'Please complete: ' + missing.join(', ')
                    );
                }

                const sb = this.sb();

                if (!sb) {
                    throw new Error('No database connection.');
                }

                if (!this.lecturerUuid) {
                    throw new Error('Lecturer account could not be resolved.');
                }

                const normalizedStatus =
                    this.normalizeStatus(status);

                const row = {
                    title: title,
                    exam_name: title,

                    exam_type: type,
                    exam_basis: basis,

                    exam_date: date,
                    exam_start_time: startTime,
                    exam_deadline: deadline,
                    duration_minutes: duration,

                    target_program: program,
                    program_type: program,

                    block: block,
                    block_term: block,

                    intake_year:
                        parseInt(intake, 10) || null,

                    intake_month: intakeMonth,

                    course_id: courseId,
                    course_code: courseCode,

                    marks_out_of: marksOutOf,
                    total_marks: marksOutOf,
                    MARKS: String(marksOutOf),

                    pass_mark: passMark,
                    min_fee_balance: minFeeBalance,

                    online_link: link,
                    exam_link: link,
                    venue: venue,

                    status: normalizedStatus,

                    created_by: this.lecturerUuid,
                    approval_status: 'pending',

                    class_ids:
                        selectedClasses
                            .map(c => c.id)
                            .filter(Boolean),

                    class_names:
                        selectedClasses
                            .map(c => c.name)
                            .filter(Boolean),

                    show_attendance:
                        this.checked('exam_show_attendance'),

                    show_grades:
                        this.checked('exam_show_grades'),

                    show_teacher_remarks:
                        this.checked('exam_show_teacher_remarks'),

                    show_principal_remarks:
                        this.checked('exam_show_principal_remarks'),

                    show_performance_metrics:
                        this.checked('exam_show_performance_metrics'),

                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                };

                // Remove optional undefined/null values only where useful.
                Object.keys(row).forEach(key => {
                    if (row[key] === undefined) delete row[key];
                });

                let result = await sb
                    .from('exams')
                    .insert([row])
                    .select('id')
                    .single();

                /*
                 * Compatibility fallback:
                 * If the database is missing one of the newly added
                 * optional columns, retry using the legacy-compatible
                 * core columns instead of leaving the lecturer unable
                 * to create an assessment.
                 */
                if (result.error) {
                    console.warn(
                        'Enhanced exam insert failed:',
                        result.error.message
                    );

                    const legacyRow = {
                        title: title,
                        exam_name: title,
                        exam_type: type,
                        exam_date: date,
                        exam_start_time: startTime,
                        duration_minutes: duration,
                        target_program: program,
                        program_type: program,
                        block: block,
                        block_term: block,
                        intake_year: parseInt(intake, 10) || null,
                        course_code: courseCode,
                        marks_out_of: marksOutOf,
                        total_marks: marksOutOf,
                        MARKS: String(marksOutOf),
                        pass_mark: passMark,
                        min_fee_balance: minFeeBalance,
                        online_link: link,
                        exam_link: link,
                        description: venue
                            ? 'Venue: ' + venue
                            : null,
                        status: normalizedStatus,
                        created_by: this.lecturerUuid,
                        approval_status: 'pending',
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    };

                    result = await sb
                        .from('exams')
                        .insert([legacyRow])
                        .select('id')
                        .single();
                }

                if (result.error) {
                    throw result.error;
                }

                row.id = result.data?.id;

                // Send notification only when enabled.
                if (this.checked('exam_notify_students')) {
                    try {
                        await this.notifyByEmail(row);
                    } catch (mailError) {
                        console.warn(
                            'Notification error:',
                            mailError
                        );
                    }
                }

                this.notify(
                    '✅ Assessment created and submitted for admin approval.',
                    'success'
                );

                this.resetForm();

                await this.loadExams();

            } catch (err) {
                console.error('create:', err);

                this.notify(
                    'Failed to create assessment: ' +
                    (err.message || err),
                    'error'
                );

            } finally {
                if (btn) {
                    btn.disabled = false;
                    btn.innerHTML = original;
                }

                this.isProcessing = false;
            }
        },

        resetForm() {
            const form = this.$('addExamForm');

            if (form) {
                form.reset();
            }

            this.selectedStudents = [];
            this.selectedCourse = null;

            const courseId = this.$('exam_course_id');
            if (courseId) courseId.value = '';

            const display = this.$('createSelectedCourseDisplay');
            if (display) display.style.display = 'none';

            const courseInput =
                this.$('createCourseSearchInput');

            if (courseInput) courseInput.value = '';

            this.renderSelectedStudents();
            this.updateStudentCount();
            this.populateForm();

            const notify = this.$('exam_notify_students');
            if (notify) notify.checked = true;

            const grades = this.$('exam_show_grades');
            if (grades) grades.checked = true;

            this.updateNotificationTargetVisibility();
        },

        // --------------------------------------------------------
        // DELETE
        // --------------------------------------------------------

        async del(id) {
            const ex = this.exams.find(x =>
                String(x.id) === String(id)
            );

            if (!ex) return;

            if (
                this.lecturerUuid &&
                String(ex.created_by) !== String(this.lecturerUuid)
            ) {
                this.notify(
                    'You can only delete your own assessments.',
                    'warning'
                );
                return;
            }

            if (!confirm(
                'Delete "' +
                (ex.exam_name || ex.title || 'this assessment') +
                '"?'
            )) {
                return;
            }

            try {
                const sb = this.sb();

                if (!sb) {
                    throw new Error('No database connection.');
                }

                const { error } = await sb
                    .from('exams')
                    .delete()
                    .eq('id', id)
                    .eq('created_by', this.lecturerUuid);

                if (error) throw error;

                this.notify(
                    '✅ Assessment deleted.',
                    'success'
                );

                await this.loadExams();

            } catch (err) {
                console.error('delete:', err);

                this.notify(
                    'Failed to delete: ' +
                    err.message,
                    'error'
                );
            }
        },

        // --------------------------------------------------------
        // REFRESH
        // --------------------------------------------------------

        async refresh() {
            await this.loadExams();
            this.notify(
                'Assessments refreshed.',
                'success'
            );
        },

        // --------------------------------------------------------
        // EXPORT
        // --------------------------------------------------------

        exportExams() {
            const list = this.filteredExams?.length
                ? this.filteredExams
                : this.exams;

            if (!list.length) {
                this.notify(
                    'Nothing to export.',
                    'warning'
                );
                return;
            }

            const rows = [[
                'Type',
                'Program',
                'Course / Unit',
                'Title',
                'Marks Out Of',
                'Pass Mark',
                'Date',
                'Time',
                'Duration',
                'Intake Year',
                'Intake Month',
                'Block / Term',
                'Status'
            ]];

            list.forEach(e => {
                rows.push([
                    this.typeLabel(e.exam_type),
                    e.target_program || '',
                    e.course_code || '',
                    e.exam_name || e.title || '',
                    e.marks_out_of ??
                        e.total_marks ??
                        e.MARKS ??
                        '',
                    e.pass_mark ?? '',
                    e.exam_date || '',
                    e.exam_start_time || '',
                    e.duration_minutes || '',
                    e.intake_year || '',
                    e.intake_month || '',
                    e.block_term || e.block || '',
                    this.normalizeStatus(e.status)
                ]);
            });

            const csv = rows.map(row =>
                row.map(value =>
                    '"' +
                    String(value ?? '')
                        .replace(/"/g, '""') +
                    '"'
                ).join(',')
            ).join('\n');

            const blob = new Blob(
                [csv],
                { type: 'text/csv;charset=utf-8;' }
            );

            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');

            a.href = url;
            a.download =
                'lecturer_assessments_' +
                new Date().toISOString().split('T')[0] +
                '.csv';

            document.body.appendChild(a);
            a.click();
            a.remove();

            URL.revokeObjectURL(url);

            this.notify(
                '✅ Assessments exported.',
                'success'
            );
        },

        // --------------------------------------------------------
        // EMAIL
        // --------------------------------------------------------

        async getToken() {
            try {
                const sb = this.sb();

                const session =
                    await sb?.auth?.getSession?.();

                const token =
                    session?.data?.session?.access_token;

                if (token) return token;

            } catch (_) {}

            return FALLBACK_ANON_KEY;
        },

        async sendEmail(to, subject, html) {
            try {
                const token = await this.getToken();

                const response = await fetch(
                    EDGE_FUNCTION_URL,
                    {
                        method: 'POST',
                        headers: {
                            'Authorization':
                                'Bearer ' + token,
                            'Content-Type':
                                'application/json'
                        },
                        body: JSON.stringify({
                            to,
                            subject,
                            html,
                            from: FROM_ADDRESS
                        })
                    }
                );

                const json =
                    await response.json()
                        .catch(() => ({}));

                return {
                    success:
                        response.ok &&
                        json.success !== false,
                    data: json
                };

            } catch (err) {
                console.error(
                    'sendEmail:',
                    err
                );

                return {
                    success: false,
                    error: err.message
                };
            }
        },

        buildStudentHtml(ex) {
            const date =
                ex.exam_date
                    ? new Date(
                        ex.exam_date
                    ).toLocaleDateString(
                        'en-KE',
                        {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                        }
                    )
                    : 'TBD';

            const type =
                this.typeLabel(ex.exam_type);

            return (
                '<!doctype html>' +
                '<html><body style="font-family:Inter,Arial,sans-serif;background:#f0f4f8;padding:30px;">' +

                '<div style="max-width:600px;margin:auto;background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 10px 40px rgba(10,61,98,.15);">' +

                '<div style="background:linear-gradient(135deg,#0A3D62,#1a5276);padding:32px;color:#fff;text-align:center;">' +
                '<div style="font-size:40px;">📝</div>' +
                '<h1 style="margin:6px 0;font-size:22px;">New ' +
                this.esc(type) +
                ' Posted</h1>' +
                '<p style="margin:6px 0;opacity:.85;font-size:13px;">Nakuru College of Health Sciences and Management</p>' +
                '</div>' +

                '<div style="padding:28px 32px;">' +

                '<p>Dear Student,</p>' +

                '<p>A new assessment has been posted for your program.</p>' +

                '<table style="width:100%;border-collapse:collapse;font-size:14px;background:#f8fafc;">' +

                '<tr><td style="padding:8px 14px;color:#64748B;">Title</td>' +
                '<td style="padding:8px 14px;font-weight:600;color:#0A3D62;">' +
                this.esc(ex.title || ex.exam_name) +
                '</td></tr>' +

                '<tr><td style="padding:8px 14px;color:#64748B;">Program</td>' +
                '<td style="padding:8px 14px;font-weight:600;">' +
                this.esc(ex.target_program) +
                '</td></tr>' +

                '<tr><td style="padding:8px 14px;color:#64748B;">Unit</td>' +
                '<td style="padding:8px 14px;font-weight:600;">' +
                this.esc(ex.course_code || 'N/A') +
                '</td></tr>' +

                '<tr><td style="padding:8px 14px;color:#64748B;">Block</td>' +
                '<td style="padding:8px 14px;font-weight:600;">' +
                this.esc(ex.block_term || ex.block || 'N/A') +
                '</td></tr>' +

                '<tr><td style="padding:8px 14px;color:#64748B;">Date</td>' +
                '<td style="padding:8px 14px;font-weight:600;">' +
                date +
                '</td></tr>' +

                '<tr><td style="padding:8px 14px;color:#64748B;">Time</td>' +
                '<td style="padding:8px 14px;font-weight:600;">' +
                this.esc(ex.exam_start_time || 'TBD') +
                '</td></tr>' +

                '<tr><td style="padding:8px 14px;color:#64748B;">Duration</td>' +
                '<td style="padding:8px 14px;font-weight:600;">' +
                this.esc(ex.duration_minutes || 'N/A') +
                ' minutes</td></tr>' +

                '</table>' +

                '<p style="text-align:center;margin-top:24px;">' +
                '<a href="https://nchms.co.ke/student" style="background:#0A3D62;color:#fff;padding:12px 28px;border-radius:10px;text-decoration:none;font-weight:600;">Access Student Portal</a>' +
                '</p>' +

                '<p style="color:#94a3b8;font-size:12px;margin-top:20px;">This is an automated notification.</p>' +

                '</div></div></body></html>'
            );
        },

        buildLecturerHtml(ex, prof) {
            const date =
                ex.exam_date
                    ? new Date(
                        ex.exam_date
                    ).toLocaleDateString(
                        'en-KE',
                        {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                        }
                    )
                    : 'TBD';

            return (
                '<!doctype html>' +
                '<html><body style="font-family:Inter,Arial,sans-serif;background:#f0f4f8;padding:30px;">' +

                '<div style="max-width:600px;margin:auto;background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 10px 40px rgba(76,29,149,.15);">' +

                '<div style="background:linear-gradient(135deg,#4C1D95,#6d28d9);padding:26px;color:#fff;">' +
                '<h1 style="margin:0;font-size:20px;">✅ Assessment Submitted</h1>' +
                '<p style="margin:6px 0 0;opacity:.9;font-size:13px;">Awaiting admin approval.</p>' +
                '</div>' +

                '<div style="padding:24px 28px;">' +

                '<p>Hi ' +
                this.esc(prof.full_name || 'Lecturer') +
                ',</p>' +

                '<p>Your assessment has been created and submitted for approval.</p>' +

                '<table style="width:100%;border-collapse:collapse;font-size:14px;background:#f8fafc;">' +

                '<tr><td style="padding:8px 14px;color:#64748B;">Title</td>' +
                '<td style="padding:8px 14px;font-weight:600;">' +
                this.esc(ex.title) +
                '</td></tr>' +

                '<tr><td style="padding:8px 14px;color:#64748B;">Program</td>' +
                '<td style="padding:8px 14px;font-weight:600;">' +
                this.esc(ex.target_program) +
                '</td></tr>' +

                '<tr><td style="padding:8px 14px;color:#64748B;">Unit</td>' +
                '<td style="padding:8px 14px;font-weight:600;">' +
                this.esc(ex.course_code || 'N/A') +
                '</td></tr>' +

                '<tr><td style="padding:8px 14px;color:#64748B;">Date</td>' +
                '<td style="padding:8px 14px;font-weight:600;">' +
                date +
                '</td></tr>' +

                '<tr><td style="padding:8px 14px;color:#64748B;">Approval</td>' +
                '<td style="padding:8px 14px;font-weight:600;color:#92400e;">⏳ Pending</td></tr>' +

                '</table>' +

                '<p style="color:#94a3b8;font-size:12px;margin-top:18px;">You will be notified when the assessment is approved or rejected.</p>' +

                '</div></div></body></html>'
            );
        },

        async notifyByEmail(ex) {
            const sb = this.sb();

            if (!sb) return;

            const target =
                this.value([
                    'exam_notify_target'
                ]) || 'all';

            let students = [];

            try {
                let q = sb
                    .from('consolidated_user_profiles_table')
                    .select(
                        'user_id,full_name,email,program,block,status,admission_number,student_id'
                    )
                    .eq('role', 'student')
                    .eq('status', 'approved')
                    .limit(500);

                if (target === 'all') {
                    q = q
                        .eq('program', ex.target_program)
                        .eq(
                            'block',
                            ex.block_term || ex.block
                        );
                }

                if (target === 'program') {
                    q = q.eq(
                        'program',
                        ex.target_program
                    );
                }

                if (target === 'block') {
                    q = q.eq(
                        'block',
                        ex.block_term || ex.block
                    );
                }

                if (target === 'specific') {
                    const ids =
                        this.selectedStudents
                            .map(s => s.user_id)
                            .filter(Boolean);

                    if (!ids.length) {
                        students = [];
                    } else {
                        q = q.in(
                            'user_id',
                            ids
                        );
                    }
                }

                if (target !== 'specific' ||
                    this.selectedStudents.length) {

                    const { data, error } =
                        await q;

                    if (error) throw error;

                    students = data || [];
                }

            } catch (err) {
                console.warn(
                    'Student notification lookup:',
                    err.message
                );
            }

            const html =
                this.buildStudentHtml(ex);

            let sent = 0;

            for (const student of students) {
                if (!student.email) continue;

                const result =
                    await this.sendEmail(
                        student.email,
                        '📝 New ' +
                        this.typeLabel(ex.exam_type) +
                        ': ' +
                        (ex.title || ex.exam_name),
                        html
                    );

                if (result.success) sent++;

                await new Promise(
                    resolve =>
                        setTimeout(resolve, 120)
                );
            }

            console.log(
                '📧 Student notifications:',
                sent,
                '/',
                students.length
            );

            const prof = this.profile();

            if (prof.email) {
                const result =
                    await this.sendEmail(
                        prof.email,
                        '✅ Submitted: ' +
                        (ex.title || ex.exam_name),
                        this.buildLecturerHtml(
                            ex,
                            prof
                        )
                    );

                console.log(
                    '📧 Lecturer copy:',
                    result.success
                        ? 'sent'
                        : 'failed'
                );
            }
        },

        // --------------------------------------------------------
        // BINDINGS
        // --------------------------------------------------------

        bind() {
            if (this._bound) return;

            this._bound = true;

            const form =
                this.$('addExamForm');

            if (form) {
                form.addEventListener(
                    'submit',
                    e => this.create(e)
                );

                form.addEventListener(
                    'reset',
                    () => {
                        setTimeout(
                            () => this.resetForm(),
                            0
                        );
                    }
                );
            }

            const search =
                this.firstEl([
                    'examSearch',
                    'exam-search'
                ]);

            if (search) {
                let timer;

                search.addEventListener(
                    'input',
                    () => {
                        clearTimeout(timer);

                        timer = setTimeout(
                            () => this.filter(),
                            200
                        );
                    }
                );
            }

            [
                'examFilterProgram',
                'exam_filter_program',
                'examFilterStatus',
                'exam_filter_status',
                'examFilterIntakeMonth',
                'exam_filter_intake_month'
            ].forEach(id => {
                const el = this.$(id);

                if (el && el.dataset.examFilterBound !== '1') {
                    el.dataset.examFilterBound = '1';

                    el.addEventListener(
                        'change',
                        () => this.filter()
                    );
                }
            });

            const notifyTarget =
                this.$('exam_notify_target');

            if (notifyTarget) {
                notifyTarget.addEventListener(
                    'change',
                    () =>
                        this.updateNotificationTargetVisibility()
                );
            }

            const studentSearch =
                this.$('exam_student_search');

            if (studentSearch) {
                studentSearch.addEventListener(
                    'keydown',
                    e => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            this.searchStudentsForNotification();
                        }
                    }
                );
            }

            this.bindCourseSearch();
        }
    };

    // ------------------------------------------------------------
    // GLOBAL FUNCTIONS
    // ------------------------------------------------------------

    window.LecturerExams = LecturerExams;

    window.filterExams =
        () => LecturerExams.filter();

    window.filterExamsTable =
        () => LecturerExams.filter();

    window.loadExams =
        () => LecturerExams.loadExams();

    window.deleteExam =
        id => LecturerExams.del(id);

    window.refreshExams =
        () => LecturerExams.refresh();

    window.exportExams =
        () => LecturerExams.exportExams();

    window.handleAddExam =
        e => LecturerExams.create(e);

    window.searchStudentsForNotification =
        () => LecturerExams.searchStudentsForNotification();

    window.searchCoursesForExam =
        value => LecturerExams.searchCourses(value);

    window.showCourseDropdown =
        () => LecturerExams.searchCourses('');

    window.clearSelectedCourse =
        () => LecturerExams.clearSelectedCourse();

    // ------------------------------------------------------------
    // AUTO INIT
    // ------------------------------------------------------------

    function boot() {
        if (window.__lecturerExamsBooted) return;

        window.__lecturerExamsBooted = true;

        setTimeout(
            () => LecturerExams.init(),
            500
        );
    }

    if (document.readyState === 'loading') {
        document.addEventListener(
            'DOMContentLoaded',
            boot
        );
    } else {
        boot();
    }

    console.log(
        '✅ LecturerExams loaded — Super Admin aligned version'
    );

})();
