/* ================================================================
   LECTURER REPORTS — MARKS-INTEGRATED MODULE
   Version: 2026-09-fix2
   Source of marks: student_marks
   Student/class source: consolidated_user_profiles_table
   Assignment source: lecturer_subject_assignments

   Designed to work with the Lecturer Marks module:
   - full       = CAT1 + CAT2 + Exam
   - single_cat = CAT + Exam
   - exam_only  = Exam only
   - cats_only  = CAT1 + CAT2
   - cat_only   = CAT only

   Nursing:
     A 75-100 = Distinction
     B 65-74  = Credit
     C 60-64  = Pass
     D 0-59   = Fail

   TVET:
     A 80-100 = MASTERY
     B 65-79  = PROFICIENT
     C 50-64  = COMPETENT
     E 0-49   = NOT YET COMPETENT

   IMPORTANT:
   This module READS the existing marks. It does not create duplicate
   marks or alter student_marks.

   FIX NOTES (2026-09-fix2):
   - lecturer_subject_assignments.lecturer_id stores the STAFF RECORD id
     (e.g. 09b84122-...), NOT the auth UUID (9f1452e8-...).
   - Identity is resolved asynchronously with fallbacks:
       me_currentLecturer → auth user → staff_records by email → name match
   - Bootstrap listens on DOCUMENT for 'lecturerMainReady'
     (matches lecturer-main.js which uses document.dispatchEvent)
   - Also checks window.__LECTURER_MAIN_READY as a secondary trigger.
   - Identity + assignment caches are cleared on each boot so the
     newly-resolved staff ID is used.
================================================================ */

(function () {
    'use strict';

    const LecturerReports = window.LecturerReports || {};

    LecturerReports.reports = Array.isArray(LecturerReports.reports)
        ? LecturerReports.reports
        : [];

    LecturerReports.currentFilters = LecturerReports.currentFilters || {
        search: '',
        type: 'all',
        unit: 'all',
        date: 'all'
    };

    LecturerReports.currentReport = null;
    LecturerReports._cache = LecturerReports._cache || {};
    LecturerReports._initialized = false;

    /* ============================================================
       DATABASE
    ============================================================ */

    function db() {
        if (window.db?.supabase?.from) return window.db.supabase;
        if (window.supabase?.from) return window.supabase;
        if (window.sb?.from) return window.sb;
        return null;
    }

    function esc(value) {
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function currentProgram() {
        return window.CURRENT_PROGRAM || window.currentProgram || 'KRCHN';
    }

    function currentProgramType() {
        if (typeof window.getProgramType === 'function') {
            try { return window.getProgramType(); } catch (_) {}
        }
        return window.CURRENT_PROGRAM_TYPE || 'KRCHN';
    }

    /* ============================================================
       LECTURER IDENTITY RESOLUTION (FIX)
       ------------------------------------------------------------
       lecturer_subject_assignments.lecturer_id stores the STAFF
       RECORD id (09b84122-...), NOT the auth UUID (9f1452e8-...).

       We resolve identity lazily and asynchronously:
         1. window.me_currentLecturer (set by the marks module)
         2. window.currentUser (may already have staff_id)
         3. auth.getUser() + lecturerSession email
         4. staff_records lookup by email (authoritative)
         5. profile table → staff_records by name (last resort)
    ============================================================ */

    const _identityCache = {
        authUuid: null,
        staffId: null,
        email: null,
        name: null,
        resolved: false,
        promise: null
    };

    function currentLecturerEmailSync() {
        const u = window.currentUser || {};
        const lecturer = window.me_currentLecturer || {};

        const direct = (
            u.email ||
            lecturer?.staff?.email ||
            lecturer?.profile?.email ||
            ''
        );
        if (direct) return direct;

        try {
            const s = JSON.parse(
                localStorage.getItem('lecturerSession') ||
                sessionStorage.getItem('lecturerSession') ||
                '{}'
            );
            return s.email || '';
        } catch (_) {
            return '';
        }
    }

    function currentLecturerIdSync() {
        const u = window.currentUser || {};
        const lecturer = window.me_currentLecturer || {};

        /* Prefer the STAFF record id — that's the FK used by
           lecturer_subject_assignments.lecturer_id. */
        const staffId =
            lecturer?.staff?.id ||
            window.CORRECT_LECTURER_ID ||
            _identityCache.staffId ||
            '';

        if (staffId) return String(staffId);

        /* Sometimes the user object carries the staff id */
        if (u.staff_id) return String(u.staff_id);

        /* Last resort: auth uuid (may not match assignments) */
        if (u.id) return String(u.id);
        if (lecturer?.profile?.id) return String(lecturer.profile.id);

        return '';
    }

    async function resolveLecturerIdentity() {
        if (_identityCache.resolved) return _identityCache;
        if (_identityCache.promise) return _identityCache.promise;

        _identityCache.promise = (async () => {
            const supabase = db();

            /* 1. Already populated by the marks module */
            const lecturer = window.me_currentLecturer || {};
            if (lecturer?.staff?.id || lecturer?.profile?.id) {
                _identityCache.authUuid =
                    window.currentUser?.id ||
                    lecturer?.profile?.user_id ||
                    null;
                _identityCache.staffId =
                    lecturer?.staff?.id ||
                    window.CORRECT_LECTURER_ID ||
                    lecturer?.profile?.id ||
                    null;
                _identityCache.email =
                    lecturer?.staff?.email ||
                    lecturer?.profile?.email ||
                    currentLecturerEmailSync();
                _identityCache.name =
                    lecturer?.staff?.full_name ||
                    lecturer?.profile?.full_name ||
                    null;
                _identityCache.resolved = true;
                console.log('📋 [Reports] identity from me_currentLecturer:', {
                    staffId: _identityCache.staffId,
                    authUuid: _identityCache.authUuid
                });
                return _identityCache;
            }

            /* 1b. lecturer-main.js already resolved it globally */
            if (window.CORRECT_LECTURER_ID) {
                _identityCache.staffId = String(window.CORRECT_LECTURER_ID);
                _identityCache.authUuid = window.currentUser?.id || null;
                _identityCache.email = currentLecturerEmailSync();
                _identityCache.resolved = true;
                console.log('📋 [Reports] identity from CORRECT_LECTURER_ID:', {
                    staffId: _identityCache.staffId,
                    authUuid: _identityCache.authUuid
                });
                return _identityCache;
            }

            /* 2. Auth user + email */
            let authUuid = window.currentUser?.id || null;
            let email = currentLecturerEmailSync();

            if (supabase) {
                try {
                    const { data: { user } } = await supabase.auth.getUser();
                    if (user) {
                        authUuid = authUuid || user.id || null;
                        email = email || user.email || null;
                    }
                } catch (e) {
                    console.warn('[Reports] auth.getUser failed:', e?.message);
                }
            }

            _identityCache.authUuid = authUuid;
            _identityCache.email = email;

            /* 3. Look up staff record by email (authoritative) */
            if (supabase && email) {
                try {
                    const { data: staff, error: staffError } = await supabase
                        .from('staff_records')
                        .select('id, first_name, other_names, email, program, department')
                        .eq('email', email)
                        .maybeSingle();

                    if (!staffError && staff?.id) {
                        _identityCache.staffId = staff.id;
                        _identityCache.name =
                            [staff.first_name, staff.other_names]
                                .filter(Boolean).join(' ').trim() ||
                            _identityCache.name;

                        /* Cache for other modules too */
                        window.CORRECT_LECTURER_ID = staff.id;
                    }
                } catch (e) {
                    console.warn('[Reports] staff lookup failed:', e?.message);
                }
            }

            /* 4. Fallback: profile table → then by name */
            if (!_identityCache.staffId && supabase && authUuid) {
                try {
                    const { data: profile } = await supabase
                        .from('consolidated_user_profiles_table')
                        .select('full_name, program, department')
                        .eq('user_id', authUuid)
                        .maybeSingle();

                    if (profile?.full_name) {
                        _identityCache.name =
                            _identityCache.name || profile.full_name;

                        const parts = String(profile.full_name).trim().split(/\s+/);
                        const first = parts[0];
                        if (first) {
                            const { data: matches } = await supabase
                                .from('staff_records')
                                .select('id, first_name, other_names')
                                .ilike('first_name', `%${first}%`)
                                .limit(5);

                            if (matches?.length) {
                                const full = String(profile.full_name).toLowerCase();
                                const exact = matches.find(m => {
                                    const candidate = [m.first_name, m.other_names]
                                        .filter(Boolean).join(' ').toLowerCase();
                                    return candidate === full;
                                });
                                _identityCache.staffId = (exact || matches[0]).id;
                                window.CORRECT_LECTURER_ID = _identityCache.staffId;
                            }
                        }
                    }
                } catch (e) {
                    console.warn('[Reports] profile fallback failed:', e?.message);
                }
            }

            _identityCache.resolved = true;

            console.log('📋 [Reports] identity resolved:', {
                staffId: _identityCache.staffId,
                authUuid: _identityCache.authUuid,
                email: _identityCache.email
            });

            return _identityCache;
        })();

        return _identityCache.promise;
    }

    /* Kept for backwards-compat with the rest of the file */
    function currentLecturerId() {
        return currentLecturerIdSync();
    }

    function currentLecturerEmail() {
        return currentLecturerEmailSync();
    }

    function currentAcademicYear() {
        return (
            document.getElementById('me_year_select')?.value ||
            window.me_currentYear ||
            new Date().getFullYear().toString()
        );
    }

    /* ============================================================
       GRADING — SAME RULES AS MARKS MODULE
    ============================================================ */

    function grading(score, programType) {
        const n = Number(score) || 0;
        const type = programType || currentProgramType();

        if (type === 'TVET') {
            if (n >= 80) return { grade: 'A', rating: 'MASTERY', points: 4.0 };
            if (n >= 65) return { grade: 'B', rating: 'PROFICIENT', points: 3.0 };
            if (n >= 50) return { grade: 'C', rating: 'COMPETENT', points: 2.0 };
            return { grade: 'E', rating: 'NOT YET COMPETENT', points: 0.0 };
        }

        if (n >= 75) return { grade: 'A', rating: 'Distinction', points: 4.0 };
        if (n >= 65) return { grade: 'B', rating: 'Credit', points: 3.0 };
        if (n >= 60) return { grade: 'C', rating: 'Pass', points: 2.0 };
        return { grade: 'D', rating: 'Fail', points: 0.0 };
    }

    function passingThreshold(programType) {
        return (programType || currentProgramType()) === 'TVET' ? 50 : 60;
    }

    function calculateTotal(cat1, cat2, exam, type) {
        const c1 = Math.min(Number(cat1) || 0, 30);
        const c2 = Math.min(Number(cat2) || 0, 30);
        const ex = Math.min(Number(exam) || 0, 70);

        let total = 0;

        switch (type || 'full') {
            case 'single_cat':
                total = c1 + ex;
                break;
            case 'exam_only':
                total = Math.min(Number(exam) || 0, 100);
                break;
            case 'cats_only':
                total = ((c1 + c2) / 60) * 100;
                break;
            case 'cat_only':
                total = (c1 / 30) * 100;
                break;
            case 'full':
            default:
                total = (((c1 + c2) / 60) * 30) + ex;
                break;
        }

        return Math.round(total * 10) / 10;
    }

    function normalizeMark(row) {
        const assessmentType = row.assessment_type || 'full';

        const cat1 = Number(row.cat1_score) || 0;
        const cat2 = Number(row.cat2_score) || 0;
        const exam = Number(row.exam_score) || 0;

        const storedFinal = Number(row.final_score);
        const total = Number.isFinite(storedFinal)
            ? storedFinal
            : calculateTotal(cat1, cat2, exam, assessmentType);

        const gradeInfo = grading(total, currentProgramType());

        return {
            id: row.id,
            admission: row.admission_number || '',
            name: row.student_name || 'Unknown',
            block: row.block || '',
            unit: row.subject_name || '',
            academicYear: row.academic_year || '',
            assessmentType,

            cat1,
            cat2,
            exam,
            total,

            grade: row.grade || gradeInfo.grade,
            rating: gradeInfo.rating,
            points: gradeInfo.points,

            approvalStatus: row.approval_status || 'draft',
            published: row.published === true,

            retakeScore: row.retake_score != null
                ? Number(row.retake_score)
                : null,
            retakeCount: Number(row.retake_count) || 0,
            retakeStatus: row.retake_status || '',

            createdAt: row.created_at || null,
            updatedAt: row.updated_at || null
        };
    }

    /* ============================================================
       LOAD ASSIGNMENTS  (FIX: async identity resolution)
    ============================================================ */

    async function loadAssignedUnits() {
        const supabase = db();
        if (!supabase) return [];

        const identity = await resolveLecturerIdentity();
        const lecturerId = identity.staffId || currentLecturerIdSync();

        if (!lecturerId) {
            console.warn('LecturerReports: lecturer ID unavailable (no staff record matched)');
            return [];
        }

        const key = `assignments:${lecturerId}`;
        if (LecturerReports._cache[key]) {
            return LecturerReports._cache[key];
        }

        const { data, error } = await supabase
            .from('lecturer_subject_assignments')
            .select('subject_name, subject_code, block, program, academic_year')
            .eq('lecturer_id', String(lecturerId));

        if (error) {
            console.error('LecturerReports: assignment error', error);
            return [];
        }

        const rows = data || [];
        LecturerReports._cache[key] = rows;

        console.log(
            `📚 [Reports] loaded ${rows.length} assigned unit(s) for lecturer ${lecturerId}`
        );

        return rows;
    }

    function assignmentMatches(mark, assignments) {
        if (!assignments.length) return false;

        return assignments.some(a => {
            const unitMatch =
                a.subject_name === mark.unit ||
                a.subject_code === mark.unit;

            if (!unitMatch) return false;

            const blockMatch =
                !a.block ||
                !mark.block ||
                a.block === mark.block;

            const programMatch =
                !a.program ||
                a.program === currentProgram();

            const yearMatch =
                !a.academic_year ||
                String(a.academic_year) === String(mark.academicYear);

            return blockMatch && programMatch && yearMatch;
        });
    }

    /* ============================================================
       LOAD MARKS
    ============================================================ */

    async function loadMarks(options = {}) {
        const supabase = db();
        if (!supabase) throw new Error('Supabase/database connection unavailable.');

        const assignments = await loadAssignedUnits();

        if (!assignments.length) {
            return { marks: [], assignments: [], students: [] };
        }

        const year = options.year || currentAcademicYear();

        const unitNames = [
            ...new Set(
                assignments
                    .map(a => a.subject_name)
                    .filter(Boolean)
            )
        ];

        if (!unitNames.length) {
            return { marks: [], assignments, students: [] };
        }

        const { data: markRows, error: markError } = await supabase
            .from('student_marks')
            .select(`
                id,
                admission_number,
                student_name,
                block,
                subject_name,
                academic_year,
                assessment_type,
                cat1_score,
                cat2_score,
                exam_score,
                final_score,
                grade,
                approval_status,
                published,
                retake_score,
                retake_count,
                retake_status,
                created_at,
                updated_at
            `)
            .in('subject_name', unitNames)
            .eq('academic_year', year);

        if (markError) throw markError;

        let marks = (markRows || []).map(normalizeMark);

        marks = marks.filter(m => assignmentMatches(m, assignments));

        if (options.unit) {
            marks = marks.filter(m => m.unit === options.unit);
        }

        if (options.block && options.block !== 'all') {
            marks = marks.filter(m => m.block === options.block);
        }

        const admissions = [...new Set(
            marks.map(m => m.admission).filter(Boolean)
        )];

        let students = [];

        if (admissions.length) {
            const { data: studentRows, error: studentError } = await supabase
                .from('consolidated_user_profiles_table')
                .select('student_id, full_name, block, intake_year, program')
                .eq('role', 'student')
                .in('student_id', admissions);

            if (studentError) {
                console.warn(
                    'LecturerReports: student profile lookup failed',
                    studentError
                );
            }

            students = studentRows || [];
        }

        const studentMap = {};
        students.forEach(s => {
            studentMap[s.student_id] = s;
        });

        marks = marks.map(m => {
            const s = studentMap[m.admission];
            return {
                ...m,
                studentName: s?.full_name || m.name,
                intakeYear: s?.intake_year || '',
                studentProgram: s?.program || currentProgram()
            };
        });

        return { marks, assignments, students };
    }

    /* ============================================================
       STATISTICS
    ============================================================ */

    function average(values) {
        const nums = values.map(Number).filter(Number.isFinite);
        if (!nums.length) return 0;
        return nums.reduce((a, b) => a + b, 0) / nums.length;
    }

    function median(values) {
        const nums = values
            .map(Number)
            .filter(Number.isFinite)
            .sort((a, b) => a - b);

        if (!nums.length) return 0;

        const middle = Math.floor(nums.length / 2);

        return nums.length % 2
            ? nums[middle]
            : (nums[middle - 1] + nums[middle]) / 2;
    }

    function distribution(marks) {
        const out = {};
        marks.forEach(m => {
            const g = m.grade || grading(m.total).grade;
            out[g] = (out[g] || 0) + 1;
        });
        return out;
    }

    function calculateStatistics(marks) {
        const threshold = passingThreshold();

        const scored = marks.filter(m =>
            Number.isFinite(Number(m.total)) &&
            Number(m.total) > 0
        );

        const totals = scored.map(m => Number(m.total));

        const passed = scored.filter(m => m.total >= threshold);
        const failed = scored.filter(m => m.total < threshold);

        return {
            totalStudents: marks.length,
            studentsWithMarks: scored.length,
            studentsWithoutMarks: marks.length - scored.length,

            mean: average(totals),
            median: median(totals),
            highest: totals.length ? Math.max(...totals) : 0,
            lowest: totals.length ? Math.min(...totals) : 0,

            passCount: passed.length,
            failCount: failed.length,

            passRate: scored.length ? (passed.length / scored.length) * 100 : 0,
            failRate: scored.length ? (failed.length / scored.length) * 100 : 0,

            gradeDistribution: distribution(scored),

            approval: {
                draft: marks.filter(m => m.approvalStatus === 'draft').length,
                pending: marks.filter(m => m.approvalStatus === 'pending').length,
                approved: marks.filter(m => m.approvalStatus === 'approved').length,
                rejected: marks.filter(m => m.approvalStatus === 'rejected').length
            },

            retakes: marks.filter(m => m.retakeCount > 0).length,
            published: marks.filter(m => m.published).length,

            attendance: null
        };
    }

    /* ============================================================
       REPORT BUILDERS
    ============================================================ */

    function reportTitle(type) {
        const names = {
            AttendanceSummary: 'Attendance Summary',
            CourseGradeBook: 'Grade Book',
            AssessmentSummary: 'Assessment Summary',
            PerformanceAnalysis: 'Performance Analysis',
            EnrollmentList: 'Class List',
            UnitProgress: 'Unit Progress',
            AtRiskStudents: 'Students Requiring Attention',
            ExamPerformance: 'Exam Performance',
            AssignmentPerformance: 'Assignment Performance',
            ComprehensiveUnitReport: 'Comprehensive Unit Report',
            WeeklyReport: 'Weekly Lecturer Report',
            TeachingLearningReport: 'Teaching & Learning Report',
            AssessmentReport: 'Assessment / Examination Report',
            AttendanceReport: 'Attendance Report',
            ClinicalPracticalReport: 'Clinical / Practical Report',
            StudentPerformanceReport: 'Student Performance Report',
            UnitProgressReport: 'Unit Progress Report',
            EndOfSemesterReport: 'End-of-Semester Report',
            OtherReport: 'Other Report'
        };
        return names[type] || type || 'Academic Report';
    }

    function selectedFormData() {
        return {
            unit: document.getElementById('reportUnit')?.value || '',
            block: document.getElementById('reportClass')?.value || 'all',
            type: document.getElementById('reportType')?.value || 'CourseGradeBook',
            period: document.getElementById('reportPeriod')?.value || 'current',
            format: document.getElementById('reportFormat')?.value || 'PDF',
            startDate: document.getElementById('reportStartDate')?.value || '',
            endDate: document.getElementById('reportEndDate')?.value || '',
            includeAttendance: !!document.getElementById('includeAttendance')?.checked,
            includeGrades: !!document.getElementById('includeGrades')?.checked,
            includeAssessments: !!document.getElementById('includeAssessments')?.checked,
            includeExams: !!document.getElementById('includeExams')?.checked,
            includeAssignments: !!document.getElementById('includeAssignments')?.checked,
            includeComments: !!document.getElementById('includeComments')?.checked,
            includeCharts: !!document.getElementById('includeCharts')?.checked
        };
    }

    function periodLabel(form) {
        const map = {
            current: 'Current Term / Semester',
            month: 'Current Month',
            week: 'Current Week',
            all: 'All Available Data',
            custom: `${form.startDate || '—'} to ${form.endDate || '—'}`
        };
        return map[form.period] || form.period;
    }

    function buildRows(marks, type) {
        if (type === 'EnrollmentList') {
            return marks.map((m, i) => ({
                '#': i + 1,
                Admission: m.admission,
                Student: m.studentName || m.name,
                Class: m.block,
                Unit: m.unit
            }));
        }

        if (type === 'ExamPerformance') {
            return marks.map((m, i) => ({
                '#': i + 1,
                Admission: m.admission,
                Student: m.studentName || m.name,
                CAT1: m.cat1 || '',
                CAT2: m.cat2 || '',
                Exam: m.exam || '',
                Total: m.total || '',
                Grade: m.grade || '',
                Status: m.total >= passingThreshold() ? 'PASS' : 'FAIL'
            }));
        }

        if (type === 'AssignmentPerformance') {
            return marks.map((m, i) => ({
                '#': i + 1,
                Admission: m.admission,
                Student: m.studentName || m.name,
                CAT1: m.cat1 || '',
                CAT2: m.cat2 || '',
                Total: m.total || '',
                Grade: m.grade || ''
            }));
        }

        return marks.map((m, i) => ({
            '#': i + 1,
            Admission: m.admission,
            Student: m.studentName || m.name,
            CAT1: m.cat1 || '',
            CAT2: m.cat2 || '',
            Exam: m.exam || '',
            Total: m.total || '',
            Grade: m.grade || '',
            Points: m.points,
            Rating: m.rating,
            Status: m.total > 0
                ? (m.total >= passingThreshold() ? 'PASS' : 'FAIL')
                : 'N/A',
            Approval: m.approvalStatus
        }));
    }

    async function buildReport(form = selectedFormData()) {
        const result = await loadMarks({
            unit: form.unit || null,
            block: form.block || 'all',
            year: currentAcademicYear()
        });

        const marks = result.marks;
        const stats = calculateStatistics(marks);

        return {
            id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
            title: reportTitle(form.type),
            type: form.type,
            unit: form.unit || 'All Assigned Units',
            block: form.block === 'all' ? 'All Classes' : form.block,
            program: currentProgram(),
            programType: currentProgramType(),
            academicYear: currentAcademicYear(),
            period: periodLabel(form),
            generatedAt: new Date().toISOString(),

            lecturer: {
                id: currentLecturerIdSync(),
                email: currentLecturerEmailSync(),
                name:
                    window.currentUser?.full_name ||
                    window.currentUser?.name ||
                    window.me_currentLecturer?.profile?.full_name ||
                    window.me_currentLecturer?.staff?.full_name ||
                    'Lecturer'
            },

            statistics: stats,
            rows: buildRows(marks, form.type),
            marks,

            grading: {
                passingThreshold: passingThreshold(),
                system: currentProgramType() === 'TVET'
                    ? 'TVET Competency-Based Grading'
                    : 'Nursing Grading System'
            },

            options: form
        };
    }

    /* ============================================================
       FORM / SELECTS
    ============================================================ */

    async function populateReportSelectors() {
        const assignments = await loadAssignedUnits();

        const unitSelect = document.getElementById('reportUnit');
        const unitFilter = document.getElementById('reportUnitFilter');
        const classSelect = document.getElementById('reportClass');

        const units = [
            ...new Map(
                assignments.map(a => [
                    a.subject_name || a.subject_code,
                    a
                ])
            ).values()
        ];

        if (unitSelect) {
            const current = unitSelect.value;
            unitSelect.innerHTML =
                '<option value="">-- Select Assigned Unit --</option>';

            units.forEach(u => {
                const option = document.createElement('option');
                option.value = u.subject_name || u.subject_code;
                option.textContent =
                    `${u.subject_code ? u.subject_code + ' - ' : ''}${u.subject_name || u.subject_code}`;
                unitSelect.appendChild(option);
            });

            if (current) unitSelect.value = current;
        }

        if (unitFilter) {
            const current = unitFilter.value;
            unitFilter.innerHTML = '<option value="all">All My Units</option>';

            units.forEach(u => {
                const option = document.createElement('option');
                option.value = u.subject_name || u.subject_code;
                option.textContent = u.subject_name || u.subject_code;
                unitFilter.appendChild(option);
            });

            if (current) unitFilter.value = current;
        }

        if (classSelect) {
            const current = classSelect.value;
            const blocks = [
                ...new Set(
                    assignments.map(a => a.block).filter(Boolean)
                )
            ];

            classSelect.innerHTML = '<option value="all">All My Classes</option>';

            blocks.forEach(block => {
                const option = document.createElement('option');
                option.value = block;
                option.textContent = block.replace(/_/g, ' ');
                classSelect.appendChild(option);
            });

            if (current) classSelect.value = current;
        }
    }

    /* ============================================================
       GENERATE
    ============================================================ */

    LecturerReports.generateReport = async function () {
        const form = selectedFormData();

        if (!form.unit) {
            showReportNotice('Select an assigned unit first.', 'warning');
            return;
        }

        if (!form.type) {
            showReportNotice('Select a report type.', 'warning');
            return;
        }

        try {
            setReportBusy(true, 'Generating report from marks...');
            const report = await buildReport(form);
            LecturerReports.currentReport = report;

            LecturerReports.reports.unshift({
                ...report,
                generatedAt: report.generatedAt
            });

            saveLocalReports();
            renderReports(LecturerReports.reports);
            updateSummary(report.marks, report.statistics);
            updateAnalytics(LecturerReports.reports);

            if (form.format === 'PDF') {
                await LecturerReports.exportToPDF();
            } else if (form.format === 'Excel') {
                LecturerReports.exportToExcel();
            } else if (form.format === 'CSV') {
                exportCurrentCSV(report);
            } else {
                await LecturerReports.previewReport();
            }

            showReportNotice(
                `Report generated from ${report.marks.length} student mark records.`,
                'success'
            );
        } catch (error) {
            console.error('LecturerReports.generateReport:', error);
            showReportNotice(
                'Could not generate report: ' + error.message,
                'error'
            );
        } finally {
            setReportBusy(false);
        }
    };

    LecturerReports.quickReport = async function (type) {
        const typeEl = document.getElementById('reportType');
        if (typeEl) typeEl.value = type;

        const unitEl = document.getElementById('reportUnit');

        if (unitEl && !unitEl.value) {
            const assignments = await loadAssignedUnits();
            const first = assignments.find(a => a.subject_name);
            if (first) unitEl.value = first.subject_name;
        }

        await LecturerReports.generateReport();
    };

    /* ============================================================
       PREVIEW
    ============================================================ */

    LecturerReports.previewReport = async function () {
        try {
            let report = LecturerReports.currentReport;
            if (!report) {
                report = await buildReport(selectedFormData());
                LecturerReports.currentReport = report;
            }

            const modal = document.getElementById('reportPreviewModal');
            const content = document.getElementById('reportPreviewContent');
            if (!modal || !content) return;

            content.innerHTML = renderPreview(report);
            modal.style.display = 'flex';
        } catch (error) {
            console.error(error);
            showReportNotice(
                'Unable to preview report: ' + error.message,
                'error'
            );
        }
    };

    LecturerReports.closePreview = function () {
        const modal = document.getElementById('reportPreviewModal');
        if (modal) modal.style.display = 'none';
    };

    function renderPreview(report) {
        const s = report.statistics;

        const gradeHtml = Object.entries(s.gradeDistribution)
            .map(([grade, count]) =>
                `<span style="display:inline-flex;align-items:center;gap:5px;background:#f1f5f9;padding:5px 9px;border-radius:15px;margin:3px;font-size:11px;">
                    <strong>${esc(grade)}</strong> ${count}
                </span>`
            ).join('');

        const rows = report.rows || [];
        const headers = rows.length ? Object.keys(rows[0]) : [];

        const tableHead = headers.map(h =>
            `<th style="padding:9px;text-align:left;border-bottom:1px solid #e2e8f0;white-space:nowrap;">${esc(h)}</th>`
        ).join('');

        const tableBody = rows.map(row =>
            `<tr>${headers.map(h =>
                `<td style="padding:8px;border-bottom:1px solid #f1f5f9;white-space:nowrap;">${esc(row[h])}</td>`
            ).join('')}</tr>`
        ).join('');

        return `
            <div id="lecturerReportPrintable"
                 style="font-family:Arial,sans-serif;color:#1e293b;background:#fff;">
                <div style="border-bottom:3px solid #4C1D95;padding-bottom:14px;margin-bottom:16px;">
                    <h2 style="margin:0;color:#0A3D62;font-size:21px;">
                        ${esc(report.title)}
                    </h2>
                    <div style="margin-top:6px;font-size:12px;color:#64748b;">
                        ${esc(report.program)}
                        • ${esc(report.block)}
                        • Academic Year ${esc(report.academicYear)}
                    </div>
                    <div style="margin-top:4px;font-size:12px;color:#64748b;">
                        Unit: <strong>${esc(report.unit)}</strong>
                        • Period: ${esc(report.period)}
                    </div>
                    <div style="margin-top:4px;font-size:11px;color:#94a3b8;">
                        Generated ${new Date(report.generatedAt).toLocaleString()}
                    </div>
                </div>

                <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:16px;">
                    ${metricBox('Students', s.totalStudents)}
                    ${metricBox('Mean', s.mean.toFixed(1) + '%')}
                    ${metricBox('Pass Rate', s.passRate.toFixed(1) + '%')}
                    ${metricBox('Highest', s.highest.toFixed(1) + '%')}
                    ${metricBox('Lowest', s.lowest.toFixed(1) + '%')}
                    ${metricBox('Pass', s.passCount)}
                    ${metricBox('Fail', s.failCount)}
                    ${metricBox('Retakes', s.retakes)}
                </div>

                <div style="padding:12px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:9px;margin-bottom:15px;">
                    <strong style="font-size:12px;">Grade Distribution</strong>
                    <div style="margin-top:6px;">${gradeHtml || '<span style="color:#94a3b8;">No graded records</span>'}</div>
                </div>

                <div style="padding:10px 12px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:9px;margin-bottom:15px;font-size:11px;">
                    <strong>Grading:</strong>
                    ${esc(report.grading.system)}
                    • Passing threshold:
                    <strong>${report.grading.passingThreshold}%</strong>
                </div>

                <div style="overflow:auto;border:1px solid #e2e8f0;border-radius:8px;">
                    <table style="width:100%;border-collapse:collapse;font-size:10px;">
                        <thead style="background:#f8fafc;">
                            <tr>${tableHead}</tr>
                        </thead>
                        <tbody>${tableBody ||
                            `<tr><td colspan="${Math.max(headers.length,1)}" style="padding:25px;text-align:center;color:#94a3b8;">No marks found.</td></tr>`
                        }</tbody>
                    </table>
                </div>
            </div>
        `;
    }

    function metricBox(label, value) {
        return `
            <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:9px;text-align:center;">
                <div style="font-size:9px;color:#94a3b8;text-transform:uppercase;font-weight:700;">${label}</div>
                <strong style="display:block;font-size:16px;color:#0A3D62;margin-top:2px;">${value}</strong>
            </div>
        `;
    }

    /* ============================================================
       CSV / EXCEL
    ============================================================ */

    function exportCurrentCSV(report) {
        if (!report) return;
        const rows = report.rows || [];

        if (!rows.length) {
            showReportNotice('No data available to export.', 'warning');
            return;
        }

        const headers = Object.keys(rows[0]);
        const csv = [
            headers.map(csvCell).join(','),
            ...rows.map(row => headers.map(h => csvCell(row[h])).join(','))
        ].join('\n');

        downloadBlob(
            csv,
            safeFilename(`${report.title}_${report.unit}`) + '.csv',
            'text/csv;charset=utf-8;'
        );

        showReportNotice('CSV report downloaded.', 'success');
    }

    function csvCell(value) {
        return `"${String(value ?? '').replace(/"/g, '""')}"`;
    }

    LecturerReports.exportToExcel = function () {
        const report = LecturerReports.currentReport;

        if (!report) {
            showReportNotice('Generate or preview a report first.', 'warning');
            return;
        }

        if (window.XLSX) {
            const rows = report.rows || [];
            const ws = XLSX.utils.json_to_sheet(rows);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Report');
            XLSX.writeFile(
                wb,
                safeFilename(`${report.title}_${report.unit}`) + '.xlsx'
            );
        } else {
            const html = excelCompatibleHTML(report);
            downloadBlob(
                html,
                safeFilename(`${report.title}_${report.unit}`) + '.xls',
                'application/vnd.ms-excel'
            );
        }

        showReportNotice('Excel report downloaded.', 'success');
    };

    function excelCompatibleHTML(report) {
        const rows = report.rows || [];
        const headers = rows.length ? Object.keys(rows[0]) : [];

        return `
            <html>
            <head><meta charset="UTF-8"></head>
            <body>
                <h2>${esc(report.title)}</h2>
                <p>${esc(report.unit)} — ${esc(report.block)}</p>
                <table border="1">
                    <tr>${headers.map(h => `<th>${esc(h)}</th>`).join('')}</tr>
                    ${rows.map(r =>
                        `<tr>${headers.map(h => `<td>${esc(r[h])}</td>`).join('')}</tr>`
                    ).join('')}
                </table>
            </body>
            </html>
        `;
    }

    /* ============================================================
       PDF
    ============================================================ */

    LecturerReports.exportToPDF = async function () {
        let report = LecturerReports.currentReport;

        if (!report) {
            report = await buildReport(selectedFormData());
            LecturerReports.currentReport = report;
        }

        if (window.jspdf?.jsPDF) {
            const doc = new window.jspdf.jsPDF({
                orientation: 'landscape',
                unit: 'mm',
                format: 'a4'
            });

            const s = report.statistics;

            doc.setFontSize(17);
            doc.text(report.title, 14, 15);

            doc.setFontSize(9);
            doc.text(
                `${report.program} | ${report.unit} | ${report.block}`,
                14, 22
            );

            doc.text(
                `Academic Year: ${report.academicYear} | Period: ${report.period}`,
                14, 27
            );

            doc.text(
                `Students: ${s.totalStudents} | Mean: ${s.mean.toFixed(1)}% | Pass Rate: ${s.passRate.toFixed(1)}% | Highest: ${s.highest.toFixed(1)}% | Lowest: ${s.lowest.toFixed(1)}%`,
                14, 33
            );

            if (typeof doc.autoTable === 'function') {
                const rows = report.rows || [];
                const headers = rows.length ? Object.keys(rows[0]) : [];

                doc.autoTable({
                    startY: 40,
                    head: [headers],
                    body: rows.map(r => headers.map(h => r[h] ?? '')),
                    styles: { fontSize: 7 },
                    headStyles: { fillColor: [76, 29, 149] }
                });
            } else {
                doc.setFontSize(8);
                doc.text(
                    'Install/load jsPDF AutoTable for a full tabular PDF export.',
                    14, 42
                );
            }

            doc.save(
                safeFilename(`${report.title}_${report.unit}`) + '.pdf'
            );

            showReportNotice('PDF report downloaded.', 'success');
            return;
        }

        await LecturerReports.previewReport();

        showReportNotice(
            'PDF library is not loaded. Use Print → Save as PDF, or load jsPDF + AutoTable.',
            'info'
        );
    };

    LecturerReports.exportPreviewToPDF = LecturerReports.exportToPDF;

    LecturerReports.printPreview = function () {
        const report = LecturerReports.currentReport;
        if (!report) return;

        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            showReportNotice('Please allow pop-ups to print the report.', 'warning');
            return;
        }

        printWindow.document.write(`
            <!doctype html>
            <html>
            <head>
                <title>${esc(report.title)}</title>
                <style>
                    @page { size: landscape; margin: 10mm; }
                    body { font-family: Arial, sans-serif; margin: 0; }
                    table { page-break-inside: auto; }
                    tr { page-break-inside: avoid; }
                </style>
            </head>
            <body>
                ${renderPreview(report)}
                <script>
                    window.onload = function(){
                        setTimeout(function(){ window.print(); }, 300);
                    };
                <\/script>
            </body>
            </html>
        `);

        printWindow.document.close();
    };

    /* ============================================================
       REPORT LIST / LOCAL STORAGE
    ============================================================ */

    function storageKey() {
        return `lecturer_reports_${currentLecturerIdSync() || currentLecturerEmailSync() || 'unknown'}`;
    }

    function saveLocalReports() {
        try {
            const compact = LecturerReports.reports.slice(0, 50).map(r => ({
                id: r.id,
                title: r.title,
                type: r.type,
                unit: r.unit,
                block: r.block,
                program: r.program,
                academicYear: r.academicYear,
                period: r.period,
                generatedAt: r.generatedAt,
                statistics: r.statistics
            }));

            localStorage.setItem(storageKey(), JSON.stringify(compact));
        } catch (e) {
            console.warn('Could not save report history:', e);
        }
    }

    function loadLocalReports() {
        try {
            const raw = localStorage.getItem(storageKey());
            if (!raw) return [];
            const data = JSON.parse(raw);
            return Array.isArray(data) ? data : [];
        } catch (_) {
            return [];
        }
    }

    function renderReports(reports) {
        const tbody = document.getElementById('reportsTable');
        const countEl = document.getElementById('reportCountDisplay');
        const filterEl = document.getElementById('reportFilterCount');

        if (!tbody) return;

        const list = filterReports(reports || []);

        if (countEl) countEl.textContent = list.length;
        if (filterEl) {
            filterEl.textContent =
                `Showing ${list.length} of ${(reports || []).length} reports`;
        }

        if (!list.length) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" style="padding:45px;text-align:center;color:#94a3b8;">
                        <i class="fas fa-file-circle-xmark" style="font-size:32px;margin-bottom:10px;"></i>
                        <div style="font-weight:700;color:#64748b;">No reports found</div>
                        <small>Generate a report from your assigned unit and marks.</small>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = list.map((r, index) => `
            <tr style="border-bottom:1px solid #f1f5f9;">
                <td style="padding:11px 15px;">
                    <strong style="color:#334155;">${esc(r.title)}</strong>
                    <div style="font-size:10px;color:#94a3b8;">
                        ${esc(r.program || '')}
                    </div>
                </td>
                <td style="padding:11px 15px;color:#475569;">${esc(r.unit)}</td>
                <td style="padding:11px 15px;color:#475569;">${esc(r.block)}</td>
                <td style="padding:11px 15px;">
                    <span style="background:#ede9fe;color:#5b21b6;padding:4px 7px;border-radius:10px;font-size:10px;">
                        ${esc(reportTitle(r.type))}
                    </span>
                </td>
                <td style="padding:11px 15px;color:#64748b;">${esc(r.period || '')}</td>
                <td style="padding:11px 15px;color:#64748b;">
                    ${r.generatedAt ? new Date(r.generatedAt).toLocaleString() : '—'}
                </td>
                <td style="padding:11px 15px;text-align:center;">
                    <span style="font-weight:700;color:#475569;">
                        ${esc(r.options?.format || 'Report')}
                    </span>
                </td>
                <td style="padding:11px 15px;text-align:center;white-space:nowrap;">
                    <button type="button"
                        onclick="LecturerReports.openHistoryReport(${index})"
                        title="Preview"
                        style="border:0;background:#ede9fe;color:#5b21b6;padding:6px 8px;border-radius:6px;cursor:pointer;">
                        <i class="fas fa-eye"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    }

    function filterReports(reports) {
        const f = LecturerReports.currentFilters;

        return (reports || []).filter(r => {
            const search = String(f.search || '').trim().toLowerCase();

            const searchMatch = !search ||
                `${r.title} ${r.unit} ${r.block} ${r.type}`
                    .toLowerCase()
                    .includes(search);

            const typeMatch =
                !f.type || f.type === 'all' || r.type === f.type;

            const unitMatch =
                !f.unit || f.unit === 'all' || r.unit === f.unit;

            let dateMatch = true;

            if (f.date && f.date !== 'all' && r.generatedAt) {
                const d = new Date(r.generatedAt);
                const now = new Date();

                if (f.date === 'today') {
                    dateMatch = d.toDateString() === now.toDateString();
                } else if (f.date === 'week') {
                    const weekAgo = new Date(now);
                    weekAgo.setDate(now.getDate() - 7);
                    dateMatch = d >= weekAgo;
                } else if (f.date === 'month') {
                    dateMatch =
                        d.getMonth() === now.getMonth() &&
                        d.getFullYear() === now.getFullYear();
                }
            }

            return searchMatch && typeMatch && unitMatch && dateMatch;
        });
    }

    LecturerReports.openHistoryReport = async function (index) {
        const list = filterReports(LecturerReports.reports);
        const item = list[index];
        if (!item) return;

        try {
            setReportBusy(true, 'Refreshing report from current marks...');

            const report = await buildReport({
                unit: item.unit !== 'All Assigned Units' ? item.unit : '',
                block: item.block === 'All Classes' ? 'all' : item.block,
                type: item.type,
                period: 'all',
                format: 'HTML',
                includeAttendance: true,
                includeGrades: true,
                includeAssessments: true,
                includeExams: true,
                includeAssignments: true,
                includeComments: false,
                includeCharts: true
            });

            LecturerReports.currentReport = report;
            await LecturerReports.previewReport();
        } catch (error) {
            showReportNotice(
                'Could not reopen report: ' + error.message,
                'error'
            );
        } finally {
            setReportBusy(false);
        }
    };

    LecturerReports.clearFilters = function () {
        LecturerReports.currentFilters = {
            search: '',
            type: 'all',
            unit: 'all',
            date: 'all'
        };

        const ids = {
            reportSearch: '',
            reportTypeFilter: 'all',
            reportUnitFilter: 'all',
            reportDateFilter: 'all'
        };

        Object.entries(ids).forEach(([id, value]) => {
            const el = document.getElementById(id);
            if (el) el.value = value;
        });

        renderReports(LecturerReports.reports);
    };

    LecturerReports.refresh = async function () {
        try {
            setReportBusy(true, 'Refreshing marks and reports...');

            /* Clear identity + assignment cache so we re-resolve
               the lecturer id and re-query assignments. */
            _identityCache.resolved = false;
            _identityCache.promise = null;
            LecturerReports._cache = {};

            const assignments = await loadAssignedUnits();

            const units = [
                ...new Set(
                    assignments.map(a => a.subject_name).filter(Boolean)
                )
            ];

            if (LecturerReports.currentReport) {
                const old = LecturerReports.currentReport;

                LecturerReports.currentReport = await buildReport({
                    unit: old.unit !== 'All Assigned Units' ? old.unit : '',
                    block: old.block === 'All Classes' ? 'all' : old.block,
                    type: old.type,
                    period: 'all',
                    format: 'HTML',
                    includeAttendance: true,
                    includeGrades: true,
                    includeAssessments: true,
                    includeExams: true,
                    includeAssignments: true,
                    includeComments: false,
                    includeCharts: true
                });
            }

            await populateReportSelectors();

            renderReports(LecturerReports.reports);
            updateAnalytics(LecturerReports.reports);

            showReportNotice(
                `Reports refreshed. ${units.length} assigned unit(s) available.`,
                'success'
            );
        } catch (error) {
            console.error(error);
            showReportNotice('Refresh failed: ' + error.message, 'error');
        } finally {
            setReportBusy(false);
        }
    };

    /* ============================================================
       EXPORT ALL / JSON / PRINT
    ============================================================ */

    LecturerReports.exportAllReports = function () {
        if (!LecturerReports.reports.length) {
            showReportNotice('No reports available.', 'warning');
            return;
        }

        const rows = LecturerReports.reports.map(r => ({
            Report: r.title,
            Unit: r.unit,
            Class: r.block,
            Type: r.type,
            Period: r.period,
            Students: r.statistics?.totalStudents || 0,
            Mean: r.statistics?.mean?.toFixed?.(1) || '',
            PassRate: r.statistics?.passRate?.toFixed?.(1) || '',
            Generated: r.generatedAt ? new Date(r.generatedAt).toLocaleString() : ''
        }));

        const headers = Object.keys(rows[0]);
        const csv = [
            headers.map(csvCell).join(','),
            ...rows.map(row => headers.map(h => csvCell(row[h])).join(','))
        ].join('\n');

        downloadBlob(
            csv,
            `lecturer_reports_${currentAcademicYear()}.csv`,
            'text/csv;charset=utf-8;'
        );

        showReportNotice('All reports exported.', 'success');
    };

    LecturerReports.exportAllToPDF = async function () {
        if (!LecturerReports.reports.length) {
            showReportNotice('No reports available.', 'warning');
            return;
        }

        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            showReportNotice('Please allow pop-ups to export all reports.', 'warning');
            return;
        }

        const content = LecturerReports.reports.map(r =>
            renderPreview(r)
        ).join('<div style="page-break-after:always;"></div>');

        printWindow.document.write(`
            <!doctype html>
            <html>
            <head>
                <title>Lecturer Academic Reports</title>
                <style>
                    @page { size: landscape; margin: 10mm; }
                    body { font-family:Arial,sans-serif; }
                </style>
            </head>
            <body>
                ${content}
                <script>
                    window.onload = function(){
                        setTimeout(function(){ window.print(); }, 300);
                    };
                <\/script>
            </body>
            </html>
        `);

        printWindow.document.close();
    };

    LecturerReports.exportJSON = function () {
        if (!LecturerReports.reports.length) {
            showReportNotice('No reports available.', 'warning');
            return;
        }

        const json = JSON.stringify(LecturerReports.reports, null, 2);
        downloadBlob(
            json,
            `lecturer_reports_${currentAcademicYear()}.json`,
            'application/json;charset=utf-8;'
        );

        showReportNotice('JSON export downloaded.', 'success');
    };

    LecturerReports.printReportTable = function () {
        const table = document.querySelector('#reportsTable');
        if (!table) return;

        const win = window.open('', '_blank');
        if (!win) {
            showReportNotice('Please allow pop-ups to print.', 'warning');
            return;
        }

        win.document.write(`
            <!doctype html>
            <html>
            <head>
                <title>Lecturer Reports</title>
                <style>
                    body { font-family:Arial,sans-serif;padding:20px; }
                    table { width:100%;border-collapse:collapse; }
                    th,td { border:1px solid #ddd;padding:8px;font-size:11px; }
                    th { background:#f3f4f6; }
                </style>
            </head>
            <body>
                <h2>Lecturer Reports</h2>
                <table>
                    ${table.closest('table')?.querySelector('thead')?.outerHTML || ''}
                    <tbody>${table.innerHTML}</tbody>
                </table>
                <script>
                    window.onload = function(){
                        setTimeout(function(){ window.print(); }, 250);
                    };
                <\/script>
            </body>
            </html>
        `);

        win.document.close();
    };

    LecturerReports.downloadAllReports = LecturerReports.exportAllReports;

    /* ============================================================
       ANALYTICS
    ============================================================ */

    function updateSummary(marks, stats) {
        const set = (id, value) => {
            const el = document.getElementById(id);
            if (el) el.textContent = value;
        };

        set('totalReportsCount', LecturerReports.reports.length);
        set('unitReportsCount', new Set(marks.map(m => m.unit)).size);
        set('studentReportsCount', new Set(marks.map(m => m.admission)).size);
        set(
            'performanceReportsCount',
            LecturerReports.reports.filter(
                r => r.type === 'PerformanceAnalysis'
            ).length
        );
        set(
            'reportEngagementRate',
            marks.length
                ? `${((marks.filter(m => m.total > 0).length / marks.length) * 100).toFixed(1)}%`
                : '—'
        );
        set(
            'reportPassRate',
            stats ? `${stats.passRate.toFixed(1)}%` : '—'
        );
    }

    function updateAnalytics(reports) {
        const set = (id, value) => {
            const el = document.getElementById(id);
            if (el) el.textContent = value;
        };

        if (!reports.length) {
            set('mostGeneratedType', '—');
            set('mostActiveUnit', '—');
            set('reportPopularFormat', '—');
            set('reportAvgGenerationTime', '—');
            return;
        }

        const typeCounts = {};
        const unitCounts = {};
        const formatCounts = {};

        reports.forEach(r => {
            typeCounts[r.type] = (typeCounts[r.type] || 0) + 1;
            unitCounts[r.unit] = (unitCounts[r.unit] || 0) + 1;
            const format = r.options?.format || 'Report';
            formatCounts[format] = (formatCounts[format] || 0) + 1;
        });

        set(
            'mostGeneratedType',
            reportTitle(
                Object.keys(typeCounts)
                    .sort((a, b) => typeCounts[b] - typeCounts[a])[0]
            )
        );

        set(
            'mostActiveUnit',
            Object.keys(unitCounts)
                .sort((a, b) => unitCounts[b] - unitCounts[a])[0] || '—'
        );

        const popularFormat =
            Object.keys(formatCounts)
                .sort((a, b) => formatCounts[b] - formatCounts[a])[0];

        set('reportPopularFormat', popularFormat || '—');

        const meta = document.getElementById('reportPopularFormatMeta');
        if (meta) {
            meta.textContent = popularFormat
                ? `${formatCounts[popularFormat]} generated`
                : 'Based on loaded reports';
        }

        set('reportAvgGenerationTime', '—');
    }

    /* ============================================================
       UI HELPERS
    ============================================================ */

    function setReportBusy(busy, message) {
        const buttons = document.querySelectorAll(
            '#reportGenerationForm button'
        );

        buttons.forEach(btn => {
            if (btn.dataset.originalDisabled === undefined) {
                btn.dataset.originalDisabled =
                    btn.disabled ? '1' : '0';
            }
            btn.disabled = busy;
            btn.style.opacity = busy ? '.65' : '1';
        });

        if (message) {
            const title = document.querySelector('#reportGenerationForm h4');
            if (title && busy) {
                title.dataset.originalText ||= title.textContent;
                title.textContent = message;
            } else if (title && !busy && title.dataset.originalText) {
                title.textContent = title.dataset.originalText;
            }
        }
    }

    function showReportNotice(message, type) {
        if (typeof window.showNotification === 'function') {
            try {
                window.showNotification(message, type || 'info');
                return;
            } catch (_) {}
        }

        if (window.LecturerUI?.showNotification) {
            try {
                window.LecturerUI.showNotification(message, type || 'info');
                return;
            } catch (_) {}
        }

        console.log(`[LecturerReports:${type || 'info'}] ${message}`);
    }

    function downloadBlob(content, filename, type) {
        const blob = new Blob([content], { type });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');

        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();

        setTimeout(() => URL.revokeObjectURL(url), 500);
    }

    function safeFilename(value) {
        return String(value || 'report')
            .replace(/[<>:"/\\|?*\x00-\x1F]/g, '_')
            .replace(/\s+/g, '_')
            .slice(0, 150);
    }

    /* ============================================================
       REPORT SUBMISSION / WEEKLY REPORT WORKFLOW
    ============================================================ */

    const REPORT_SUBMISSION_TABLE = 'lecturer_report_submissions';
    const REPORT_STORAGE_BUCKET = 'lecturer-reports';

    const TEACHING_DOCUMENTS = [
        ['course_outline', 'Course Outline'],
        ['scheme_of_work', 'Scheme of Work'],
        ['course_objectives', 'Course Objectives'],
        ['records_of_work', 'Records of Work'],
        ['lesson_plan', 'Lesson Plan'],
        ['teaching_schedule', 'Teaching Schedule'],
        ['learning_resources', 'Learning Resources / Materials'],
        ['other_teaching_document', 'Other Teaching Document']
    ];

    const SUBMISSION_DOCUMENTS = {
        TeachingLearningReport: TEACHING_DOCUMENTS,
        AssessmentReport: [
            ['assessment_plan', 'Assessment Plan'],
            ['cat_report', 'CAT Report'],
            ['exam_report', 'Examination Report'],
            ['mark_sheet', 'Mark Sheet'],
            ['moderation_report', 'Moderation Report']
        ],
        AttendanceReport: [
            ['weekly_attendance', 'Weekly Attendance'],
            ['monthly_attendance', 'Monthly Attendance'],
            ['attendance_exception', 'Attendance Exception Report']
        ],
        ClinicalPracticalReport: [
            ['clinical_plan', 'Clinical Plan'],
            ['rotation_report', 'Clinical Rotation Report'],
            ['practical_assessment', 'Practical Assessment Report'],
            ['clinical_attendance', 'Clinical Attendance Report']
        ],
        StudentPerformanceReport: [
            ['performance_report', 'Student Performance Report'],
            ['at_risk_report', 'At-Risk Student Report'],
            ['progress_report', 'Student Progress Report']
        ],
        UnitProgressReport: [
            ['unit_progress', 'Unit Progress Report'],
            ['content_coverage', 'Content Coverage Report'],
            ['pending_topics', 'Pending Topics / Coverage Report']
        ],
        WeeklyReport: [
            ['weekly_teaching', 'Weekly Teaching Report'],
            ['weekly_clinical', 'Weekly Clinical Report'],
            ['weekly_activity', 'Weekly Activity Report']
        ],
        EndOfSemesterReport: [
            ['course_completion', 'Course Completion Report'],
            ['unit_report', 'End-of-Semester Unit Report'],
            ['assessment_summary', 'Semester Assessment Summary'],
            ['semester_report', 'End-of-Semester Report']
        ],
        OtherReport: [
            ['other', 'Other Report / Document']
        ]
    };

    function submissionEl(id) {
        return document.getElementById(id);
    }

    function submissionValue(id) {
        return submissionEl(id)?.value?.trim() || '';
    }

    function setSubmissionMessage(message, type = 'info') {
        const el = submissionEl('reportSubmissionMessage');
        if (!el) {
            showReportNotice(message, type);
            return;
        }

        const styles = {
            success: ['#ecfdf5', '#047857', '#a7f3d0'],
            error: ['#fef2f2', '#b91c1c', '#fecaca'],
            warning: ['#fffbeb', '#b45309', '#fde68a'],
            info: ['#eff6ff', '#1d4ed8', '#bfdbfe']
        };
        const s = styles[type] || styles.info;
        el.style.display = 'block';
        el.style.background = s[0];
        el.style.color = s[1];
        el.style.border = `1px solid ${s[2]}`;
        el.textContent = message;
    }

    function submissionCategoryLabel(type) {
        const map = {
            WeeklyReport: 'Weekly Lecturer Report',
            TeachingLearningReport: 'Teaching & Learning',
            AssessmentReport: 'Assessment / Examination',
            AttendanceReport: 'Attendance',
            ClinicalPracticalReport: 'Clinical / Practical',
            StudentPerformanceReport: 'Student Performance',
            UnitProgressReport: 'Unit Progress',
            EndOfSemesterReport: 'End-of-Semester',
            OtherReport: 'Other'
        };
        return map[type] || type || 'Report';
    }

    function populateSubmissionSelect(select, rows, placeholder, valueKey, labelFn) {
        if (!select) return;
        const current = select.value;
        select.innerHTML = `<option value="">${esc(placeholder)}</option>`;

        rows.forEach(row => {
            const value = typeof valueKey === 'function'
                ? valueKey(row)
                : row[valueKey];
            if (!value) return;

            const option = document.createElement('option');
            option.value = value;
            option.textContent = labelFn ? labelFn(row) : value;
            select.appendChild(option);
        });

        if (current && [...select.options].some(o => o.value === current)) {
            select.value = current;
        }
    }

    async function populateSubmissionSelectors() {
        const assignments = await loadAssignedUnits();

        const units = [
            ...new Map(
                assignments.map(a => [
                    `${a.subject_code || ''}|${a.subject_name || ''}`,
                    a
                ])
            ).values()
        ];

        const unitSelect = submissionEl('submissionReportUnit');
        populateSubmissionSelect(
            unitSelect,
            units,
            '-- Select Assigned Unit --',
            a => a.subject_name || a.subject_code,
            a => `${a.subject_code ? a.subject_code + ' - ' : ''}${a.subject_name || a.subject_code}`
        );

        const unitFilter = submissionEl('reportUnitFilter');
        if (unitFilter) {
            const existing = [...unitFilter.options].map(o => o.value);
            units.forEach(u => {
                const value = u.subject_name || u.subject_code;
                if (!value || existing.includes(value)) return;
                const option = document.createElement('option');
                option.value = value;
                option.textContent = u.subject_name || u.subject_code;
                unitFilter.appendChild(option);
            });
        }

        const classSelect = submissionEl('submissionReportClass');
        const blocks = [...new Set(assignments.map(a => a.block).filter(Boolean))];
        populateSubmissionSelect(
            classSelect,
            blocks.map(block => ({ block })),
            'All Assigned Classes',
            'block',
            row => String(row.block).replace(/_/g, ' ')
        );

        const weeklyUnit = submissionEl('weeklyReportUnit');
        populateSubmissionSelect(
            weeklyUnit,
            units,
            '-- Select Unit --',
            a => a.subject_name || a.subject_code,
            a => `${a.subject_code ? a.subject_code + ' - ' : ''}${a.subject_name || a.subject_code}`
        );

        const weeklyClass = submissionEl('weeklyReportClass');
        populateSubmissionSelect(
            weeklyClass,
            blocks.map(block => ({ block })),
            'All Assigned Classes',
            'block',
            row => String(row.block).replace(/_/g, ' ')
        );
    }

    LecturerReports.handleSubmissionTypeChange = function (type) {
        const documentField = submissionEl('submissionDocumentTypeField');
        const documentSelect = submissionEl('submissionDocumentType');
        const guide = submissionEl('submissionCategoryGuide');
        const guideText = submissionEl('submissionCategoryGuideText');

        const options = SUBMISSION_DOCUMENTS[type] || [];

        if (documentField) {
            documentField.style.display = options.length ? '' : 'none';
        }

        if (documentSelect) {
            documentSelect.innerHTML =
                '<option value="">-- Select Document --</option>';

            options.forEach(([value, label]) => {
                const option = document.createElement('option');
                option.value = value;
                option.textContent = label;
                documentSelect.appendChild(option);
            });

            documentSelect.required = type === 'TeachingLearningReport';
        }

        const guides = {
            TeachingLearningReport:
                'Select the exact teaching document being submitted. The assigned-unit list is loaded from lecturer_subject_assignments.',
            WeeklyReport:
                'Complete the week number, period, topics, activities, challenges and action points. You may include live attendance and marks in the generated report.',
            AssessmentReport:
                'Select the assessment document and attach the supporting report or mark sheet where applicable.',
            ClinicalPracticalReport:
                'Select the clinical/practical document and attach supporting evidence where applicable.',
            AttendanceReport:
                'Select the attendance report type and use the selected assigned unit/class.',
            StudentPerformanceReport:
                'Use the live marks data for the selected assigned unit/class where applicable.',
            UnitProgressReport:
                'Document content covered, pending topics and progress for the selected assigned unit.',
            EndOfSemesterReport:
                'Select the semester document and attach the completed report where applicable.'
        };

        if (guide && guideText && guides[type]) {
            guide.style.display = 'block';
            guideText.textContent = guides[type];
        } else if (guide) {
            guide.style.display = 'none';
        }
    };

   async function submissionPayloadFromForm(status = 'draft') {
    const type = submissionValue('submissionReportType');
    const unit = submissionValue('submissionReportUnit');
    const block = submissionValue('submissionReportClass') || 'all';
    const recipient = submissionValue('submissionRecipient');

    /* Pull subject_code from the selected unit <option data-code="..."> */
    let subjectCode = null;
    try {
        const opt = document.querySelector(
            `#submissionReportUnit option[value="${CSS.escape(unit)}"]`
        );
        subjectCode = opt?.dataset?.code || null;
    } catch (_) {}

    /* Resolve the auth UUID — this is what the RLS policy checks */
    let authUuid =
        window.currentUser?.id ||
        window.me_currentLecturer?.profile?.user_id ||
        null;

    if (!authUuid) {
        const supabase = db();
        if (supabase) {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                authUuid = user?.id || null;
            } catch (_) {}
        }
    }

    if (!authUuid) {
        console.error('[Reports] No auth UUID — insert will fail RLS');
    }

    console.log('[Reports] payload identity:',
        { authUuid, staffId: currentLecturerIdSync() });

    const title = submissionValue('submissionTitle');

    return {
        /* identity — RLS needs lecturer_user_id = auth.uid() */
        lecturer_user_id: authUuid,
        lecturer_id: currentLecturerIdSync(),
        lecturer_email: currentLecturerEmailSync(),
        lecturer_name:
            window.currentUser?.full_name ||
            window.currentUser?.name ||
            window.me_currentLecturer?.profile?.full_name ||
            window.me_currentLecturer?.staff?.full_name ||
            'Lecturer',

        /* classification */
        report_type: type,
        report_category: submissionCategoryLabel(type),
        document_type: submissionValue('submissionDocumentType') || null,

        /* DB has "title" — send BOTH so the admin view also sees it */
        title: title,
        document_title: title,

        summary: submissionValue('submissionSummary'),

        /* academic context */
        unit_name: unit,
        subject_code: subjectCode,
        program: currentProgram(),

        /* DB has "block" — send BOTH */
        block: block,
        class_block: block,

        academic_year: submissionValue('submissionAcademicYear') || currentAcademicYear(),
        week_number: Number(submissionValue('submissionWeekNumber')) || null,
        period_start: submissionValue('submissionPeriodStart') || null,
        period_end: submissionValue('submissionPeriodEnd') || null,

        /* recipient + options */
        recipient_role: recipient,
        include_attendance: !!submissionEl('submissionIncludeAttendance')?.checked,
        include_grades: !!submissionEl('submissionIncludeGrades')?.checked,
        include_activities: !!submissionEl('submissionIncludeActivities')?.checked,
        include_challenges: !!submissionEl('submissionIncludeChallenges')?.checked,

        /* lifecycle */
        status,
        submitted_at: status === 'submitted' ? new Date().toISOString() : null,
        updated_at: new Date().toISOString()
    };
}

    function validateSubmissionPayload(payload) {
        if (!payload.lecturer_id) return 'Lecturer session is not ready.';
        if (!payload.report_type) return 'Select a report category.';
        if (!payload.unit_name) return 'Select an assigned unit.';
        if (!payload.document_title) return 'Enter a report title.';
        if (!payload.recipient_role) return 'Select who should review the report.';
        if (!payload.period_start || !payload.period_end) {
            return 'Select the reporting period.';
        }

        if (
            payload.period_start &&
            payload.period_end &&
            payload.period_end < payload.period_start
        ) {
            return 'The reporting period end date cannot be before the start date.';
        }

        if (
            payload.report_type === 'TeachingLearningReport' &&
            !payload.document_type
        ) {
            return 'Select the teaching document you are submitting.';
        }

        return '';
    }

    async function uploadSubmissionAttachment(file, lecturerId, submissionId) {
        if (!file) return null;

        const supabase = db();
        if (!supabase) throw new Error('Supabase/database connection unavailable.');

        const safeName = String(file.name || 'document')
            .replace(/[^\w.\-]+/g, '_')
            .slice(-160);

        const path =
            `${lecturerId}/${new Date().getFullYear()}/${submissionId}/${Date.now()}_${safeName}`;

        const { error } = await supabase.storage
            .from(REPORT_STORAGE_BUCKET)
            .upload(path, file, {
                upsert: false,
                contentType: file.type || 'application/octet-stream'
            });

        if (error) throw error;

        return {
            path,
            name: file.name,
            type: file.type || '',
            size: file.size || 0
        };
    }

    async function createOrUpdateSubmission(status = 'draft') {
        const supabase = db();
        if (!supabase) throw new Error('Supabase/database connection unavailable.');

        const payload = submissionPayloadFromForm(status);
        const validation = validateSubmissionPayload(payload);

        if (validation) {
            setSubmissionMessage(validation, 'warning');
            return null;
        }

        const file = submissionEl('submissionAttachment')?.files?.[0] || null;

        let submissionId =
            submissionEl('lecturerReportSubmissionForm')?.dataset.submissionId || null;

        let row;

        if (submissionId) {
            const { data, error } = await supabase
                .from(REPORT_SUBMISSION_TABLE)
                .update(payload)
                .eq('id', submissionId)
                .eq('lecturer_id', payload.lecturer_id)
                .select()
                .single();

            if (error) throw error;
            row = data;
        } else {
            const { data, error } = await supabase
                .from(REPORT_SUBMISSION_TABLE)
                .insert(payload)
                .select()
                .single();

            if (error) throw error;
            row = data;
            submissionId = row.id;

            const form = submissionEl('lecturerReportSubmissionForm');
            if (form) form.dataset.submissionId = submissionId;
        }

        if (file) {
            const attachment = await uploadSubmissionAttachment(
                file,
                payload.lecturer_id,
                submissionId
            );

            const { data: updated, error } = await supabase
                .from(REPORT_SUBMISSION_TABLE)
                .update({
                    attachment_path: attachment.path,
                    attachment_name: attachment.name,
                    attachment_type: attachment.type,
                    attachment_size: attachment.size,
                    updated_at: new Date().toISOString()
                })
                .eq('id', submissionId)
                .eq('lecturer_id', payload.lecturer_id)
                .select()
                .single();

            if (error) throw error;
            row = updated;
        }

        return row;
    }

    LecturerReports.saveReportDraft = async function () {
        try {
            setSubmissionMessage('Saving report draft...', 'info');
            const row = await createOrUpdateSubmission('draft');

            if (!row) return;

            setSubmissionMessage(
                'Draft saved successfully. You can continue editing before submitting.',
                'success'
            );

            await LecturerReports.refreshSubmittedReports();
        } catch (error) {
            console.error('LecturerReports.saveReportDraft:', error);
            setSubmissionMessage(
                'Could not save draft: ' + (error.message || error),
                'error'
            );
        }
    };

    LecturerReports.submitReportForReview = async function () {
        try {
            setSubmissionMessage('Submitting report for administrator review...', 'info');

            const row = await createOrUpdateSubmission('submitted');
            if (!row) return;

            setSubmissionMessage(
                'Report submitted successfully and is now awaiting administrator review.',
                'success'
            );

            await LecturerReports.refreshSubmittedReports();
        } catch (error) {
            console.error('LecturerReports.submitReportForReview:', error);
            setSubmissionMessage(
                'Could not submit report: ' + (error.message || error),
                'error'
            );
        }
    };

    LecturerReports.previewSubmission = function () {
        const payload = submissionPayloadFromForm('draft');
        const validation = validateSubmissionPayload(payload);

        if (validation) {
            setSubmissionMessage(validation, 'warning');
            return;
        }

        const docLabel =
            SUBMISSION_DOCUMENTS[payload.report_type]
                ?.find(([value]) => value === payload.document_type)?.[1] ||
            payload.document_type ||
            'General Report';

        const attachment = submissionEl('submissionAttachment')?.files?.[0];

        const html = `
            <div style="font-family:Arial,sans-serif;color:#1e293b;">
                <h2 style="margin-top:0;color:#0A3D62;">${esc(payload.document_title)}</h2>
                <p>
                    <strong>Category:</strong> ${esc(payload.report_category)}
                    ${docLabel ? ` • <strong>Document:</strong> ${esc(docLabel)}` : ''}
                </p>
                <p><strong>Unit:</strong> ${esc(payload.unit_name)}
                   • <strong>Class:</strong> ${esc(payload.class_block)}
                   • <strong>Academic Year:</strong> ${esc(payload.academic_year)}</p>
                <p><strong>Period:</strong> ${esc(payload.period_start)} to ${esc(payload.period_end)}</p>
                <p><strong>Submit To:</strong> ${esc(payload.recipient_role)}</p>
                ${payload.week_number ? `<p><strong>Week:</strong> ${payload.week_number}</p>` : ''}
                <div style="margin-top:14px;padding:12px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:9px;">
                    ${esc(payload.summary || 'No summary/remarks entered.')}
                </div>
                ${attachment
                    ? `<p style="margin-top:12px;"><strong>Attachment:</strong> ${esc(attachment.name)}</p>`
                    : '<p style="margin-top:12px;color:#94a3b8;">No supporting document attached.</p>'}
            </div>
        `;

        const modal = submissionPreviewModal();
        if (modal) {
            modal.querySelector('[data-preview-body]').innerHTML = html;
            modal.style.display = 'flex';
        } else {
            setSubmissionMessage('Submission details are ready for review.', 'info');
        }
    };

    function submissionPreviewModal() {
        let modal = document.getElementById('lecturerReportSubmissionPreviewModal');
        if (modal) return modal;

        modal = document.createElement('div');
        modal.id = 'lecturerReportSubmissionPreviewModal';
        modal.style.cssText =
            'display:none;position:fixed;inset:0;background:rgba(15,23,42,.65);z-index:10050;align-items:center;justify-content:center;padding:15px;';

        modal.innerHTML = `
            <div style="width:min(850px,96vw);max-height:90vh;background:#fff;border-radius:15px;overflow:hidden;display:flex;flex-direction:column;">
                <div style="padding:14px 18px;background:#f8fafc;border-bottom:1px solid #e5e7eb;display:flex;justify-content:space-between;align-items:center;">
                    <strong style="color:#0A3D62;">Review Report Submission</strong>
                    <button type="button" data-close style="border:0;background:transparent;font-size:24px;cursor:pointer;">&times;</button>
                </div>
                <div data-preview-body style="padding:20px;overflow:auto;"></div>
                <div style="padding:12px 18px;background:#f8fafc;border-top:1px solid #e5e7eb;display:flex;justify-content:flex-end;gap:8px;">
                    <button type="button" data-close class="lr-btn lr-btn-light">Close</button>
                    <button type="button" data-submit class="lr-btn lr-btn-green">
                        <i class="fas fa-paper-plane"></i> Submit for Review
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        modal.querySelectorAll('[data-close]').forEach(btn => {
            btn.addEventListener('click', () => {
                modal.style.display = 'none';
            });
        });

        modal.querySelector('[data-submit]')?.addEventListener('click', async () => {
            modal.style.display = 'none';
            await LecturerReports.submitReportForReview();
        });

        return modal;
    }

    LecturerReports.resetSubmissionForm = function () {
        const form = submissionEl('lecturerReportSubmissionForm');
        if (form) {
            form.reset();
            delete form.dataset.submissionId;
        }

        const documentField = submissionEl('submissionDocumentTypeField');
        if (documentField) documentField.style.display = 'none';

        const guide = submissionEl('submissionCategoryGuide');
        if (guide) guide.style.display = 'none';

        setSubmissionMessage('', 'info');
        const message = submissionEl('reportSubmissionMessage');
        if (message) message.style.display = 'none';
    };

    LecturerReports.prepareWeeklyReport = async function () {
        const unit = submissionValue('weeklyReportUnit');
        const block = submissionValue('weeklyReportClass') || 'all';
        const week = submissionValue('weeklyReportWeek');
        const topic = submissionValue('weeklyReportTopic');
        const activities = submissionValue('weeklyReportActivities');
        const challenges = submissionValue('weeklyReportChallenges');
        const actions = submissionValue('weeklyReportActions');
        const remarks = submissionValue('weeklyReportRemarks');

        if (!unit) {
            showReportNotice('Select an assigned unit for the weekly report.', 'warning');
            return;
        }

        const title = `Week ${week || '—'} ${unit} Lecturer Report`;

        const summary = [
            topic ? `Topics covered: ${topic}` : '',
            activities ? `Activities completed: ${activities}` : '',
            challenges ? `Challenges: ${challenges}` : '',
            actions ? `Action points: ${actions}` : '',
            remarks ? `Lecturer remarks: ${remarks}` : ''
        ].filter(Boolean).join('\n\n');

        const typeEl = submissionEl('submissionReportType');
        const unitEl = submissionEl('submissionReportUnit');
        const classEl = submissionEl('submissionReportClass');
        const weekEl = submissionEl('submissionWeekNumber');
        const titleEl = submissionEl('submissionTitle');
        const summaryEl = submissionEl('submissionSummary');

        if (typeEl) {
            typeEl.value = 'WeeklyReport';
            LecturerReports.handleSubmissionTypeChange('WeeklyReport');
        }
        if (unitEl) unitEl.value = unit;
        if (classEl) classEl.value = block;
        if (weekEl) weekEl.value = week;
        if (titleEl) titleEl.value = title;
        if (summaryEl) summaryEl.value = summary;

        submissionEl('lecturerReportSubmissionSection')?.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });

        setSubmissionMessage(
            'Weekly report prepared. Complete the period and recipient, then save or submit it.',
            'success'
        );
    };

    LecturerReports.copyWeeklyToSubmission = LecturerReports.prepareWeeklyReport;

    LecturerReports.refreshSubmittedReports = async function () {
        const supabase = db();
        const tbody = submissionEl('submittedReportsTable');

        if (!tbody) return [];

        if (!supabase) {
            setSubmittedReportsEmpty('Supabase/database connection unavailable.');
            return [];
        }

        const lecturerId = currentLecturerIdSync();
        if (!lecturerId) {
            setSubmittedReportsEmpty('Lecturer session is not ready.');
            return [];
        }

        try {
            const { data, error } = await supabase
                .from(REPORT_SUBMISSION_TABLE)
                .select('*')
                .eq('lecturer_id', lecturerId)
                .order('created_at', { ascending: false });

            if (error) throw error;

            renderSubmittedReports(data || []);
            return data || [];
        } catch (error) {
            console.error('LecturerReports.refreshSubmittedReports:', error);
            setSubmittedReportsEmpty(
                'Submitted reports could not be loaded: ' + (error.message || error)
            );
            return [];
        }
    };

    function setSubmittedReportsEmpty(message) {
        const tbody = submissionEl('submittedReportsTable');
        if (!tbody) return;

        tbody.innerHTML = `
            <tr>
                <td colspan="9" class="lr-empty">
                    <i class="fas fa-inbox"></i>
                    <strong>No report submissions loaded</strong>
                    ${esc(message)}
                </td>
            </tr>
        `;

        ['submittedReportsCount', 'submittedUnderReviewCount',
         'submittedReturnedCount', 'submittedApprovedCount']
            .forEach(id => {
                const el = submissionEl(id);
                if (el) el.textContent = '0';
            });
    }

    function statusBadge(status) {
        const map = {
            draft: ['Draft', '#f1f5f9', '#475569'],
            submitted: ['Submitted', '#dbeafe', '#1d4ed8'],
            under_review: ['Under Review', '#fef3c7', '#b45309'],
            returned: ['Returned for Correction', '#fee2e2', '#b91c1c'],
            resubmitted: ['Resubmitted', '#ede9fe', '#6d28d9'],
            approved: ['Approved', '#d1fae5', '#047857'],
            rejected: ['Rejected', '#fee2e2', '#b91c1c']
        };

        const [label, bg, color] = map[status] || [status || 'Unknown', '#f1f5f9', '#475569'];

        return `<span style="display:inline-flex;padding:5px 8px;border-radius:999px;background:${bg};color:${color};font-size:10px;font-weight:800;">${esc(label)}</span>`;
    }

    function renderSubmittedReports(rows) {
        const tbody = submissionEl('submittedReportsTable');
        if (!tbody) return;

        const list = Array.isArray(rows) ? rows : [];

        const count = submissionEl('submittedReportsCount');
        const under = submissionEl('submittedUnderReviewCount');
        const returned = submissionEl('submittedReturnedCount');
        const approved = submissionEl('submittedApprovedCount');

        if (count) count.textContent = list.length;
        if (under) under.textContent =
            list.filter(r => ['submitted', 'under_review', 'resubmitted'].includes(r.status)).length;
        if (returned) returned.textContent =
            list.filter(r => r.status === 'returned').length;
        if (approved) approved.textContent =
            list.filter(r => r.status === 'approved').length;

        if (!list.length) {
            setSubmittedReportsEmpty('Submit a report to see its review status here.');
            return;
        }

        tbody.innerHTML = list.map(r => `
            <tr>
                <td>
                    <strong>${esc(r.document_title || 'Untitled Report')}</strong>
                    <div style="font-size:10px;color:#94a3b8;">
                        ${esc(r.report_category || r.report_type || '')}
                        ${r.document_type ? ` • ${esc(r.document_type)}` : ''}
                    </div>
                </td>
                <td>${esc(r.report_type || '—')}</td>
                <td>
                    ${esc(r.unit_name || '—')}
                    <div style="font-size:10px;color:#94a3b8;">${esc(r.class_block || 'All Classes')}</div>
                </td>
                <td>${esc(r.period_start || '—')} → ${esc(r.period_end || '—')}</td>
                <td>${esc(r.recipient_role || '—')}</td>
                <td>${r.submitted_at ? new Date(r.submitted_at).toLocaleString() : '—'}</td>
                <td>${statusBadge(r.status)}</td>
                <td>${esc(r.reviewer_comments || r.review_comments || '—')}</td>
                <td style="white-space:nowrap;">
                    ${r.attachment_path
                        ? `<button type="button" class="lr-btn lr-btn-ghost" style="padding:6px 8px;" onclick="LecturerReports.openSubmissionAttachment('${esc(r.attachment_path)}')"><i class="fas fa-paperclip"></i></button>`
                        : ''}
                    ${r.status === 'returned'
                        ? `<button type="button" class="lr-btn lr-btn-light" style="padding:6px 8px;" onclick="LecturerReports.editReturnedReport('${esc(r.id)}')"><i class="fas fa-edit"></i> Correct</button>`
                        : ''}
                </td>
            </tr>
        `).join('');
    }

    LecturerReports.openSubmissionAttachment = async function (path) {
        const supabase = db();
        if (!supabase || !path) return;

        try {
            const { data, error } = await supabase.storage
                .from(REPORT_STORAGE_BUCKET)
                .createSignedUrl(path, 900);

            if (error) throw error;
            if (data?.signedUrl) window.open(data.signedUrl, '_blank', 'noopener');
        } catch (error) {
            showReportNotice(
                'Could not open attachment: ' + (error.message || error),
                'error'
            );
        }
    };

    LecturerReports.editReturnedReport = async function (id) {
        const supabase = db();
        if (!supabase || !id) return;

        try {
            const { data, error } = await supabase
                .from(REPORT_SUBMISSION_TABLE)
                .select('*')
                .eq('id', id)
                .eq('lecturer_id', currentLecturerIdSync())
                .single();

            if (error) throw error;
            if (!data) return;

            const form = submissionEl('lecturerReportSubmissionForm');
            if (form) form.dataset.submissionId = data.id;

            const set = (id2, value) => {
                const el = submissionEl(id2);
                if (el) el.value = value ?? '';
            };

            set('submissionReportType', data.report_type);
            LecturerReports.handleSubmissionTypeChange(data.report_type);
            set('submissionDocumentType', data.document_type);
            set('submissionReportUnit', data.unit_name);
            set('submissionReportClass', data.class_block === 'all' ? '' : data.class_block);
            set('submissionAcademicYear', data.academic_year);
            set('submissionWeekNumber', data.week_number);
            set('submissionPeriodStart', data.period_start);
            set('submissionPeriodEnd', data.period_end);
            set('submissionRecipient', data.recipient_role);
            set('submissionTitle', data.document_title);
            set('submissionSummary', data.summary);

            submissionEl('lecturerReportSubmissionSection')?.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });

            setSubmissionMessage(
                'Returned report loaded for correction. Save the correction, then submit it again.',
                'warning'
            );
        } catch (error) {
            showReportNotice(
                'Could not load returned report: ' + (error.message || error),
                'error'
            );
        }
    };

    /* ============================================================
       SCHEDULE
    ============================================================ */

    LecturerReports.scheduleReport = function () {
        if (typeof window.openReportScheduleModal === 'function') {
            window.openReportScheduleModal();
            return;
        }

        showReportNotice(
            'Report scheduling UI is not connected yet. The report itself is ready for scheduled generation.',
            'info'
        );
    };

    /* ============================================================
       INITIALIZATION
    ============================================================ */

    LecturerReports.init = async function () {
        if (LecturerReports._initialized) {
            /* Still re-resolve identity + reload assignments in case
               the marks module has only just populated it. */
            _identityCache.resolved = false;
            _identityCache.promise = null;

            await populateReportSelectors();
            await populateSubmissionSelectors();
            renderReports(LecturerReports.reports);
            await LecturerReports.refreshSubmittedReports().catch(() => {});
            return;
        }

        LecturerReports._initialized = true;

        LecturerReports.reports = loadLocalReports();

        await populateReportSelectors();
        await populateSubmissionSelectors();

        renderReports(LecturerReports.reports);
        updateAnalytics(LecturerReports.reports);

        if (submissionEl('submissionReportType')) {
            LecturerReports.handleSubmissionTypeChange(
                submissionEl('submissionReportType').value
            );
        }

        LecturerReports.refreshSubmittedReports().catch(error => {
            console.warn('LecturerReports: submitted reports load skipped:', error);
        });

        const period = document.getElementById('reportPeriod');

        if (period) {
            period.addEventListener('change', () => {
                const box = document.getElementById('reportCustomDateRange');
                if (box) {
                    box.style.display =
                        period.value === 'custom' ? 'grid' : 'none';
                }
            });
        }

        console.log('✅ LecturerReports initialized — marks-integrated');
    };

    /* ============================================================
       GLOBAL EXPOSURE
    ============================================================ */

    window.LecturerReports = LecturerReports;

    window.calculateLecturerReportTotal = calculateTotal;
    window.getLecturerReportGrade = grading;
    window.loadLecturerReportMarks = loadMarks;
    window.buildLecturerReport = buildReport;
    window.initLecturerReports = LecturerReports.init;

    /* Expose identity resolver in case other modules need it */
    window.resolveLecturerIdentity = resolveLecturerIdentity;

    /* ============================================================
       BOOTSTRAP
       ------------------------------------------------------------
       lecturer-main.js:
         - dispatches 'lecturerMainReady' on DOCUMENT (no bubbles)
         - sets window.__LECTURER_MAIN_READY = true
         - sets window.CORRECT_LECTURER_ID (staff_records.id)
         - populates window.me_currentLecturer from marks module

       Strategy:
         1. If main is already ready → boot now.
         2. Else listen on DOCUMENT for lecturerMainReady → boot.
         3. Safety timeout 2.5s so we never hang forever.
       On each boot, clear identity + assignment caches so the
       newly-resolved staff ID is used.
    ============================================================ */

    function startReports() {
        LecturerReports._initialized = false;
        _identityCache.resolved = false;
        _identityCache.promise = null;
        LecturerReports._cache = {};

        LecturerReports.init().catch(error => {
            console.error('LecturerReports initialization failed:', error);
        });
    }

    let _booted = false;

    function bootReports() {
        if (_booted) return;
        _booted = true;
        setTimeout(startReports, 200);
    }

    /* Primary trigger: the main portal tells us it's ready */
    document.addEventListener('lecturerMainReady', () => {
        window.lecturerMainReady_fired = true;
        bootReports();
    }, { once: true });

    /* Secondary trigger: main was ready before we loaded */
    if (window.__LECTURER_MAIN_READY) {
        window.lecturerMainReady_fired = true;
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', bootReports, { once: true });
        } else {
            bootReports();
        }
    } else {
        /* Safety net */
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(() => {
                if (!_booted) bootReports();
            }, 2500);
        }, { once: true });
    }

})();
