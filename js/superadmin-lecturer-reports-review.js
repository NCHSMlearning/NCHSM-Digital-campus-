/*
 * NCHSM SUPER ADMIN
 * Lecturer Reports Review Module
 *
 * File:
 *   js/superadmin-lecturer-reports-review.js
 *
 * Database tables:
 *   lecturer_report_submissions
 *   lecturer_report_reviews
 *   lecturer_report_attachments
 *
 * Storage bucket:
 *   lecturer-reports
 *
 * Roles supported:
 *   super_admin
 *   superadmin
 *
 * IMPORTANT:
 * - This module does NOT create duplicate marks.
 * - It reviews lecturer report submissions already stored in
 *   lecturer_report_submissions.
 * - Marks/grades remain in student_marks and are only referenced
 *   when a submitted report includes assessment information.
 */

(function () {
    'use strict';

    const MODULE = 'LecturerReportsReview';

    const TABLE_SUBMISSIONS = 'lecturer_report_submissions';
    const TABLE_REVIEWS = 'lecturer_report_reviews';
    const TABLE_ATTACHMENTS = 'lecturer_report_attachments';
    const STORAGE_BUCKET = 'lecturer-reports';
    const TABLE_DEADLINES = 'lecturer_report_deadlines';
    let deadlineRows = [];
    let activeSchool = '';
    let quickStatus = '';


    const ADMIN_ROLES = ['super_admin', 'superadmin'];

    let state = {
        rows: [],
        filteredRows: [],
        selectedSubmission: null,
        selectedAttachments: [],
        selectedReviews: [],
        loading: false,
        initialized: false,
        filtersBound: false,
        currentUser: null,
        supabase: null
    };

    const escapeHtml = (value) => {
        if (value === null || value === undefined) return '';
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    };

    const escapeAttr = escapeHtml;

    function getSupabaseClient() {
        if (state.supabase) return state.supabase;

        /*
         * The Super Admin dashboard already initializes Supabase.
         * Support the most common globals used by the portal.
         */
        const candidates = [
            window.supabaseClient,
            window.supabase,
            window._supabase,
            window.client
        ];

        for (const candidate of candidates) {
            if (candidate && typeof candidate.from === 'function') {
                state.supabase = candidate;
                return candidate;
            }
        }

        return null;
    }

    async function getCurrentUser() {
        if (state.currentUser) return state.currentUser;

        const client = getSupabaseClient();

        try {
            if (client?.auth?.getUser) {
                const result = await client.auth.getUser();
                if (result?.data?.user) {
                    state.currentUser = result.data.user;
                    return state.currentUser;
                }
            }
        } catch (error) {
            console.warn(`[${MODULE}] Supabase auth lookup failed`, error);
        }

        try {
            if (typeof window.getCurrentUser === 'function') {
                const user = await window.getCurrentUser();
                if (user) {
                    state.currentUser = user;
                    return user;
                }
            }
        } catch (error) {
            console.warn(`[${MODULE}] getCurrentUser() failed`, error);
        }

        return null;
    }

    async function getCurrentProfile(user) {
        const client = getSupabaseClient();
        if (!client || !user?.id) return null;

        try {
            const { data, error } = await client
                .from('consolidated_user_profiles_table')
                .select('id,user_id,full_name,email,role,staff_id,program,department')
                .eq('user_id', user.id)
                .maybeSingle();

            if (error) throw error;
            return data || null;
        } catch (error) {
            console.warn(`[${MODULE}] Profile lookup failed`, error);
            return null;
        }
    }

    async function assertAdmin() {
        const user = await getCurrentUser();

        if (!user) {
            showModuleToast('Your session could not be verified.', 'error');
            return false;
        }

        const profile = await getCurrentProfile(user);
        const role =
            profile?.role ||
            user?.user_metadata?.role ||
            user?.app_metadata?.role ||
            '';

        if (!ADMIN_ROLES.includes(String(role).toLowerCase())) {
            console.warn(`[${MODULE}] Unauthorized role:`, role);
            showModuleToast('You are not authorized to review lecturer reports.', 'error');
            return false;
        }

        state.currentUser = user;
        return true;
    }

    function showModuleToast(message, type = 'info') {
        if (typeof window.showToast === 'function') {
            window.showToast(message, type);
            return;
        }

        if (typeof window.showNotification === 'function') {
            window.showNotification(message, type);
            return;
        }

        let toast = document.getElementById('lecturerReportsReviewToast');

        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'lecturerReportsReviewToast';
            toast.style.cssText = `
                position:fixed;
                right:24px;
                bottom:24px;
                z-index:999999;
                max-width:420px;
                padding:14px 18px;
                border-radius:12px;
                color:#fff;
                font-size:14px;
                font-weight:600;
                box-shadow:0 10px 30px rgba(0,0,0,.2);
                transition:opacity .25s ease, transform .25s ease;
            `;
            document.body.appendChild(toast);
        }

        const backgrounds = {
            success: '#059669',
            error: '#dc2626',
            warning: '#d97706',
            info: '#2563eb'
        };

        toast.style.background = backgrounds[type] || backgrounds.info;
        toast.textContent = message;
        toast.style.opacity = '1';
        toast.style.transform = 'translateY(0)';

        clearTimeout(toast._timer);
        toast._timer = setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(8px)';
        }, 3500);
    }

    function formatDate(value, includeTime = true) {
        if (!value) return '—';

        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return escapeHtml(value);

        return new Intl.DateTimeFormat('en-KE', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            ...(includeTime
                ? { hour: '2-digit', minute: '2-digit' }
                : {})
        }).format(date);
    }

    function statusLabel(status) {
        const labels = {
            draft: 'Draft',
            submitted: 'Submitted',
            under_review: 'Under Review',
            returned: 'Returned',
            resubmitted: 'Resubmitted',
            approved: 'Approved',
            rejected: 'Rejected'
        };

        return labels[status] || String(status || 'Unknown').replace(/_/g, ' ');
    }

    function statusColor(status) {
        const colors = {
            draft: '#64748b',
            submitted: '#2563eb',
            under_review: '#7c3aed',
            returned: '#d97706',
            resubmitted: '#0891b2',
            approved: '#059669',
            rejected: '#dc2626'
        };

        return colors[status] || '#64748b';
    }

    function statusBadge(status) {
        const color = statusColor(status);

        return `
            <span style="
                display:inline-flex;
                align-items:center;
                gap:6px;
                padding:5px 9px;
                border-radius:999px;
                background:${color}15;
                color:${color};
                font-size:11px;
                font-weight:700;
                white-space:nowrap;
            ">
                <span style="
                    width:6px;
                    height:6px;
                    border-radius:50%;
                    background:${color};
                "></span>
                ${escapeHtml(statusLabel(status))}
            </span>
        `;
    }

    function getElement(id) {
        return document.getElementById(id);
    }

    function setText(id, value) {
        const el = getElement(id);
        if (el) el.textContent = value ?? '';
    }

    function setLoading(loading) {
        state.loading = loading;

        const container = getElement('lecturerReportsReviewTable');
        if (!container) return;

        if (loading) {
            container.innerHTML = `
                <div style="padding:50px 20px;text-align:center;color:#64748b;">
                    <div style="
                        width:34px;
                        height:34px;
                        border:3px solid #e2e8f0;
                        border-top-color:#4C1D95;
                        border-radius:50%;
                        animation:lrrSpin .8s linear infinite;
                        margin:0 auto 12px;
                    "></div>
                    <div style="font-weight:600;">Loading lecturer reports...</div>
                </div>
            `;
        }
    }

    async function loadReports() {
        if (!(await assertAdmin())) return;

        const client = getSupabaseClient();

        if (!client) {
            showModuleToast(
                'Supabase client was not found. Check the main Super Admin initialization.',
                'error'
            );
            return;
        }

        setLoading(true);

        try {
            const { data, error } = await client
                .from(TABLE_SUBMISSIONS)
                .select(`
                    id,
                    lecturer_user_id,
                    lecturer_id,
                    lecturer_name,
                    lecturer_email,
                    report_type,
                    report_category,
                    document_type,
                    title,
                    summary,
                    unit_name,
                    subject_code,
                    program,
                    block,
                    academic_year,
                    week_number,
                    period_start,
                    period_end,
                    recipient_role,
                    include_attendance,
                    include_grades,
                    include_activities,
                    include_challenges,
                    status,
                    reviewer_user_id,
                    reviewer_name,
                    reviewer_comments,
                    submitted_at,
                    reviewed_at,
                    approved_at,
                    attachment_count,
                    created_at,
                    updated_at
                `)
                .order('updated_at', { ascending: false });

            if (error) throw error;

            state.rows = Array.isArray(data) ? data : [];

            // Always present newest submissions first, even if updated_at changed
            // during a later review action.
            state.rows.sort((a, b) =>
                new Date(b.submitted_at || b.created_at || b.updated_at || 0) -
                new Date(a.submitted_at || a.created_at || a.updated_at || 0)
            );

            // Older submissions may have stored lecturer_user_id but left
            // lecturer_name/email blank. Resolve names from the same profile
            // table used by the Super Admin authorization check.
            const missingNameRows = state.rows.filter(row =>
                (!String(row.lecturer_name || '').trim() ||
                 /^(lecturer|unnamed lecturer|name unavailable)$/i.test(String(row.lecturer_name || '').trim())) &&
                row.lecturer_user_id
            );
            const userIds = [...new Set(missingNameRows.map(row => String(row.lecturer_user_id)))];

            if (userIds.length) {
                try {
                    const { data: profiles, error: profileError } = await client
                        .from('consolidated_user_profiles_table')
                        .select('user_id,full_name,email,staff_id,program,department')
                        .in('user_id', userIds);

                    if (profileError) throw profileError;

                    const profileByUserId = new Map(
                        (profiles || []).map(profile => [String(profile.user_id), profile])
                    );

                    state.rows = state.rows.map(row => {
                        const profile = profileByUserId.get(String(row.lecturer_user_id));
                        if (!profile) return row;
                        return {
                            ...row,
                            lecturer_name: (
                                !String(row.lecturer_name || '').trim() ||
                                /^(lecturer|unnamed lecturer|name unavailable)$/i.test(String(row.lecturer_name || '').trim())
                            ) ? String(profile.full_name || row.lecturer_name || '').trim() :
                                String(row.lecturer_name).trim(),
                            lecturer_email: String(row.lecturer_email || profile.email || '').trim(),
                            lecturer_id: String(row.lecturer_id || profile.staff_id || '').trim(),
                            program: String(row.program || profile.program || profile.department || '').trim()
                        };
                    });
                } catch (profileError) {
                    console.warn(`[${MODULE}] Could not resolve missing lecturer names from profiles`, profileError);
                }
            }

            // Keep the catalogue readable if a legacy row still has no profile.
            state.rows = state.rows.map(row => ({
                ...row,
                lecturer_name: String(row.lecturer_name || '').trim() || 'Name unavailable',
                lecturer_email: String(row.lecturer_email || '').trim()
            }));
            state.filteredRows = [...state.rows];

            await loadDeadlines();
            populateFilters();
            updateCounters();
            renderManagementDashboard();
            updateInstitutionalDashboard();
            applyFilters();

            state.initialized = true;

            console.log(`✅ [${MODULE}] Loaded ${state.rows.length} report submissions.`);
        } catch (error) {
            console.error(`[${MODULE}] Failed to load reports`, error);

            state.rows = [];
            state.filteredRows = [];

            renderEmptyState(
                'Unable to load lecturer reports. Check RLS, table names, and the Supabase session.'
            );

            showModuleToast(
                error?.message || 'Failed to load lecturer reports.',
                'error'
            );
        } finally {
            state.loading = false;
        }
    }

    function normalizeProgram(value) {
        const normalized = String(value || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
        if (!normalized) return '';
        if (normalized.includes('krchn') || normalized.includes('registerednursing') || normalized.includes('nursing')) return 'KRCHN';
        if (normalized === 'tvet' || normalized.includes('technicalvocational') || normalized.includes('vocationaltraining')) return 'TVET';
        return String(value || '').trim();
    }

    function populateFilters() {
        const typeSelect = getElement('lrrReportTypeFilter');
        const documentTypeSelect = getElement('lrrDocumentTypeFilter');
        const programSelect = getElement('lrrProgramFilter');
        const blockSelect = getElement('lrrBlockFilter');
        const yearSelect = getElement('lrrYearFilter');
        const statusSelect = getElement('lrrStatusFilter');

        const preserve = {
            type: typeSelect?.value || '',
            documentType: documentTypeSelect?.value || '',
            program: programSelect?.value || '',
            block: blockSelect?.value || '',
            year: yearSelect?.value || '',
            status: statusSelect?.value || ''
        };

        const unique = (field) =>
            [...new Set(
                state.rows
                    .map(row => row?.[field])
                    .filter(value => value !== null && value !== undefined && String(value).trim() !== '')
                    .map(value => String(value))
            )].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

        if (typeSelect) {
            const values = unique('report_type');

            typeSelect.innerHTML = `
                <option value="">All Report Types</option>
                ${values.map(value => `
                    <option value="${escapeAttr(value)}">${escapeHtml(humanize(value))}</option>
                `).join('')}
            `;

            typeSelect.value = preserve.type;
        }

        if (documentTypeSelect) {
            const common = [
                ['scheme_of_work', 'Scheme of Work'],
                ['lesson_plan', 'Lesson Plans'],
                ['record_of_work', 'Teaching Log / Record of Work'],
                ['instructional_materials', 'Teaching & Learning Materials'],
                ['clinical_supervision_report', 'Clinical Supervision'],
                ['course_evaluation_report', 'Course / Unit Evaluation'],
                ['lecturer_self_evaluation', 'Lecturer Reflection / Self-Evaluation'],
                ['course_outline', 'Course Outline'],
                ['course_objectives', 'Course Objectives'],
                ['records_of_work', 'Legacy Records of Work'],
                ['teaching_schedule', 'Teaching Schedule'],
                ['learning_resources', 'Learning Resources / Materials'],
                ['other_teaching_document', 'Other Teaching Document']
            ];
            const labels = new Map(common);
            const values = [...new Set([...common.map(([value]) => value), ...unique('document_type')])];
            documentTypeSelect.innerHTML = `
                <option value="">All Document Types</option>
                ${values.map(value => `
                    <option value="${escapeAttr(value)}">${escapeHtml(labels.get(value) || humanize(value))}</option>
                `).join('')}
            `;
            documentTypeSelect.value = preserve.documentType;
        }

        if (programSelect) {
            const values = [...new Set([
                'KRCHN',
                'TVET',
                ...unique('program')
            ])].filter(Boolean);

            programSelect.innerHTML = `
                <option value="">All Programs</option>
                ${values.map(value => `
                    <option value="${escapeAttr(value)}">${escapeHtml(value)}</option>
                `).join('')}
            `;

            programSelect.value = preserve.program;
        }

        if (blockSelect) {
            const values = unique('block');

            blockSelect.innerHTML = `
                <option value="">All Blocks</option>
                ${values.map(value => `
                    <option value="${escapeAttr(value)}">${escapeHtml(value)}</option>
                `).join('')}
            `;

            blockSelect.value = preserve.block;
        }

        if (yearSelect) {
            const values = unique('academic_year');

            yearSelect.innerHTML = `
                <option value="">All Years</option>
                ${values.map(value => `
                    <option value="${escapeAttr(value)}">${escapeHtml(value)}</option>
                `).join('')}
            `;

            yearSelect.value = preserve.year;
        }

        if (statusSelect) {
            const statuses = [
                'submitted',
                'under_review',
                'resubmitted',
                'returned',
                'approved',
                'rejected',
                'draft'
            ];

            statusSelect.innerHTML = `
                <option value="">All Statuses</option>
                ${statuses.map(value => `
                    <option value="${value}">${escapeHtml(statusLabel(value))}</option>
                `).join('')}
            `;

            statusSelect.value = preserve.status;
        }
    }

    function humanize(value) {
        return String(value || '')
            .replace(/([a-z])([A-Z])/g, '$1 $2')
            .replace(/[_-]+/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .replace(/\b\w/g, letter => letter.toUpperCase());
    }

    function getSearchTerm() {
        return String(
            getElement('lrrSearch')?.value ||
            getElement('lecturerReportsReviewSearch')?.value ||
            ''
        ).trim().toLowerCase();
    }

    function getFilterValue(primaryId) {
        return String(getElement(primaryId)?.value || '').trim();
    }

    function applyFilters() {
        const search = getSearchTerm();
        const reportType = getFilterValue('lrrReportTypeFilter');
        const documentType = getFilterValue('lrrDocumentTypeFilter');
        const program = getFilterValue('lrrProgramFilter');
        const block = getFilterValue('lrrBlockFilter');
        const year = getFilterValue('lrrYearFilter');
        const status = getFilterValue('lrrStatusFilter');

        state.filteredRows = state.rows.filter(row => {
            if (activeSchool && schoolOf(row)!==activeSchool) return false;
            if (quickStatus==='pending' && !['draft','submitted'].includes(row.status)) return false;
            if (quickStatus==='under_review' && row.status!=='under_review') return false;
            if (quickStatus==='awaiting' && !['submitted','resubmitted'].includes(row.status)) return false;
            if (quickStatus==='approved' && row.status!=='approved') return false;
            if (quickStatus==='due') {
                const overdue = deadlineRows.some(d => d.school===schoolOf(row) && (!d.document_type || d.document_type===row.document_type) && (!d.unit_code || d.unit_code===row.subject_code) && new Date(d.due_at).getTime()<Date.now() && !['approved','rejected'].includes(row.status));
                if (!overdue) return false;
            }
            if (reportType && String(row.report_type || '') !== reportType) return false;
            if (documentType && String(row.document_type || '') !== documentType) return false;
            if (program) {
                const selectedProgram = normalizeProgram(program);
                const rowProgram = normalizeProgram(row.program || row.department || '');
                if (selectedProgram ? rowProgram !== selectedProgram :
                    String(row.program || '').trim().toLowerCase() !== program.trim().toLowerCase()) return false;
            }
            if (block && row.block !== block) return false;
            if (year && String(row.academic_year || '') !== year) return false;
            if (status && row.status !== status) return false;

            if (search) {
                const haystack = [
                    row.lecturer_name,
                    row.lecturer_email,
                    row.lecturer_id,
                    row.title,
                    row.report_type,
                    row.report_category,
                    row.document_type,
                    row.unit_name,
                    row.subject_code,
                    row.program,
                    row.block,
                    row.academic_year,
                    row.summary
                ]
                    .filter(Boolean)
                    .join(' ')
                    .toLowerCase();

                if (!haystack.includes(search)) return false;
            }

            return true;
        });

        renderReports();
        updateVisibleCount();
    }


    function schoolOf(row) {
        const raw = [row.program, row.department].filter(Boolean).join(' ').toLowerCase().replace(/[^a-z0-9]/g, '');
        return raw.includes('tvet') || raw.includes('technicalvocational') || raw.includes('vocationaltraining') ? 'TVET' : 'Nursing';
    }

    async function loadDeadlines() {
        const client = getSupabaseClient();
        if (!client) return;
        try {
            const { data, error } = await client.from(TABLE_DEADLINES)
                .select('id,school,program,term,document_type,unit_code,unit_name,academic_year,block,due_at,created_at')
                .order('due_at', { ascending: true });
            if (error) throw error;
            deadlineRows = data || [];
        } catch (error) {
            deadlineRows = [];
            console.warn('[LecturerReportsReview] Deadline calendar unavailable. Apply the supplied SQL migration.', error);
        }
    }

    function injectManagementDashboard() {
        const section = getElement('lecturer-reports-review');
        if (!section || getElement('lrrManagementDashboard')) return;
        const panel = document.createElement('div');
        panel.id = 'lrrManagementDashboard';
        panel.innerHTML = `
          <style>
            #lrrManagementDashboard{margin:0 0 18px;color:#172033}
            #lrrManagementDashboard .lrr-hero{position:relative;overflow:hidden;background:linear-gradient(118deg,#092744 0%,#124b66 62%,#087f78 100%);color:white;border-radius:18px;padding:22px;margin-bottom:14px;display:flex;justify-content:space-between;gap:18px;align-items:center;flex-wrap:wrap;box-shadow:0 12px 28px rgba(9,39,68,.16)}
            #lrrManagementDashboard .lrr-hero:after{content:"";position:absolute;width:230px;height:230px;border:1px solid rgba(255,255,255,.12);border-radius:50%;right:18%;top:-150px;box-shadow:0 0 0 24px rgba(255,255,255,.035),0 0 0 50px rgba(255,255,255,.025);pointer-events:none}
            #lrrManagementDashboard .lrr-brand{display:flex;align-items:center;gap:15px;position:relative;z-index:1;min-width:0}
            #lrrManagementDashboard .lrr-brand-copy{min-width:0}
            #lrrManagementDashboard .lrr-eyebrow{display:block;font-size:9px;letter-spacing:.12em;font-weight:850;color:#c7e8e9;margin-bottom:7px}
            #lrrManagementDashboard .lrr-hero h3{margin:0;font-size:23px;letter-spacing:-.03em;font-weight:850}
            #lrrManagementDashboard .lrr-hero p{margin:6px 0 0;color:#dbeafe;font-size:12px}
            #lrrManagementDashboard .lrr-hero-actions{display:flex;gap:10px;align-items:center;position:relative;z-index:1;flex-wrap:wrap}
            #lrrManagementDashboard .lrr-live{font-size:10px;color:#d8f5ec;display:flex;gap:7px;align-items:center}
            #lrrManagementDashboard .lrr-live i{width:7px;height:7px;background:#7ce4b4;border-radius:50%;box-shadow:0 0 0 4px rgba(124,228,180,.13)}
            #lrrManagementDashboard .lrr-primary{height:40px;border:1px solid rgba(255,255,255,.18);border-radius:9px;padding:0 14px;background:#fff;color:#0b4057;font-weight:850;box-shadow:0 4px 12px rgba(0,0,0,.1)}
            #lrrManagementDashboard .lrr-primary i{margin-right:5px}
            #lrrManagementDashboard .lrr-school-grid,#lrrManagementDashboard .lrr-stat-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin-bottom:13px}
            #lrrManagementDashboard .lrr-school,#lrrManagementDashboard .lrr-stat{background:#fff;border:1px solid #e2e8f0;border-radius:13px;padding:14px;text-align:left}
            #lrrManagementDashboard button{cursor:pointer}#lrrManagementDashboard .lrr-school{display:flex;gap:12px;align-items:center;color:#172033}
            #lrrManagementDashboard .lrr-school.active{border:2px solid #0f766e;background:#f0fdfa}
            #lrrManagementDashboard .lrr-school .ico{width:40px;height:40px;border-radius:12px;display:grid;place-items:center;background:#e0f2fe;color:#0369a1;font-size:19px}
            #lrrManagementDashboard .lrr-school strong{display:block;font-size:22px}#lrrManagementDashboard .lrr-school small{color:#64748b}
            #lrrManagementDashboard .lrr-stat span{font-size:10px;color:#64748b;font-weight:800;text-transform:uppercase;letter-spacing:.06em}
            #lrrManagementDashboard .lrr-stat strong{display:block;font-size:25px;margin-top:5px}
            #lrrManagementDashboard .lrr-toolbar{display:flex;gap:8px;flex-wrap:wrap;align-items:center;background:#fff;border:1px solid #e2e8f0;border-radius:13px;padding:12px;margin-bottom:13px}
            #lrrManagementDashboard .lrr-chip{border:1px solid #dbe3ec;background:#fff;color:#334155;border-radius:30px;padding:8px 13px;font-weight:750;font-size:12px}
            #lrrManagementDashboard .lrr-chip.active{background:#102f50;color:white;border-color:#102f50}
            #lrrManagementDashboard .lrr-deadline{display:grid;grid-template-columns:1.3fr 1fr 1fr 1fr auto;gap:8px;align-items:end}
            #lrrManagementDashboard input,#lrrManagementDashboard select{min-width:0;width:100%;height:40px;border:1px solid #cbd5e1;border-radius:8px;padding:0 10px;background:#fff}
            #lrrManagementDashboard .lrr-primary{height:40px;border:0;border-radius:8px;padding:0 14px;background:#0f766e;color:#fff;font-weight:800}
            #lrrManagementDashboard .lrr-folder-note{font-size:12px;color:#64748b;margin:0 0 10px}
            #lrrManagementDashboard .lrr-subnav{position:sticky;top:0;z-index:5;display:flex;gap:6px;overflow-x:auto;white-space:nowrap;padding:8px;background:#fff;border:1px solid #e2e8f0;border-radius:12px;margin-bottom:13px;scrollbar-width:none}
            #lrrManagementDashboard .lrr-subtab{flex:0 0 auto;border:0;background:#f1f5f9;color:#475569;border-radius:8px;padding:8px 11px;font-size:11px;font-weight:800}
            #lrrManagementDashboard .lrr-subtab.active{background:#0f766e;color:white}
            #lrrManagementDashboard .lrr-folder-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin:8px 0 16px}
            #lrrManagementDashboard .lrr-folder-grid .lrr-school{min-height:76px;box-shadow:0 2px 8px rgba(15,23,42,.035)}
            #lrrManagementDashboard .lrr-analytics{background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:15px;margin:0 0 14px}
            #lrrManagementDashboard .lrr-analytics-head{display:flex;justify-content:space-between;gap:10px;align-items:center;margin-bottom:12px}
            #lrrManagementDashboard .lrr-analytics-head strong{display:block;font-size:14px}
            #lrrManagementDashboard .lrr-analytics-head small{display:block;color:#64748b;margin-top:3px}
            #lrrManagementDashboard .lrr-analytics-head span{font-size:11px;color:#64748b}
            #lrrManagementDashboard .lrr-chart-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
            #lrrManagementDashboard .lrr-chart-card{border:1px solid #edf1f5;border-radius:11px;padding:12px;min-width:0}
            #lrrManagementDashboard .lrr-chart-card>strong{font-size:12px}
            #lrrManagementDashboard .lrr-bars{display:grid;gap:9px;margin-top:12px}
            #lrrManagementDashboard .lrr-bar-row{display:grid;grid-template-columns:92px minmax(0,1fr) 26px;gap:7px;align-items:center;font-size:10px;color:#64748b}
            #lrrManagementDashboard .lrr-bar-track{height:9px;background:#eef2f7;border-radius:20px;overflow:hidden}
            #lrrManagementDashboard .lrr-bar-fill{height:100%;border-radius:20px;background:linear-gradient(90deg,#0f766e,#38bdf8);min-width:0}
            #lrrManagementDashboard .lrr-bar-value{font-weight:800;text-align:right;color:#172033}
            #lrrManagementDashboard [id$="Area"],#lrrManagementDashboard #lrrSchoolOverview{scroll-margin-top:70px}
            #lecturer-reports-review #lrrTotalCount,#lecturer-reports-review #lrrSubmittedCount,#lecturer-reports-review #lrrUnderReviewCount,#lecturer-reports-review #lrrReturnedCount,#lecturer-reports-review #lrrApprovedCount{display:none!important}
            #lecturer-reports-review .lrr-legacy-stat-card{display:none!important}

            #lrrManagementDashboard,#lrrManagementDashboard *{box-sizing:border-box;min-width:0}
            #lrrManagementDashboard{width:100%;max-width:100%;overflow:hidden}
            #lrrManagementDashboard .lrr-school-grid,#lrrManagementDashboard .lrr-stat-grid{grid-template-columns:repeat(3,minmax(0,1fr))}
            #lrrManagementDashboard .lrr-deadline label{display:block;min-width:0}
            #lrrManagementDashboard .lrr-deadline select,#lrrManagementDashboard .lrr-deadline input{display:block;margin-top:5px}
            #lrrManagementDashboard .lrr-school{width:100%;min-width:0}
            #lrrManagementDashboard .lrr-school span:last-child{min-width:0;overflow-wrap:anywhere}
            #lrrManagementDashboard .lrr-school small{display:block;overflow-wrap:anywhere}
            @media(max-width:700px){
              #lrrManagementDashboard .lrr-hero{padding:16px;border-radius:13px;align-items:flex-start}
              #lrrManagementDashboard .lrr-eyebrow{font-size:8px;line-height:1.4}
              #lrrManagementDashboard .lrr-hero h3{font-size:18px}
              #lrrManagementDashboard .lrr-hero-actions{width:100%;justify-content:space-between}
              #lrrManagementDashboard .lrr-live{font-size:9px}
              #lrrManagementDashboard .lrr-school-grid{grid-template-columns:repeat(2,minmax(0,1fr))}
              #lrrManagementDashboard .lrr-folder-grid{grid-template-columns:repeat(2,minmax(0,1fr))}
              #lrrManagementDashboard .lrr-chart-grid{grid-template-columns:1fr}
              #lrrManagementDashboard .lrr-bar-row{grid-template-columns:82px minmax(0,1fr) 24px}
              #lrrManagementDashboard .lrr-school-grid [data-school=""]{grid-column:1/-1}
              #lrrManagementDashboard .lrr-stat-grid{grid-template-columns:repeat(2,minmax(0,1fr))}
              #lrrManagementDashboard .lrr-stat{padding:12px}
              #lrrManagementDashboard .lrr-stat strong{font-size:23px}
              #lrrManagementDashboard .lrr-deadline{grid-template-columns:minmax(0,1fr)}
              #lrrManagementDashboard .lrr-deadline button{grid-column:auto;width:100%}
              #lrrManagementDashboard .lrr-toolbar{gap:7px;padding:10px}
              #lrrManagementDashboard .lrr-toolbar strong{width:100%}
              #lrrManagementDashboard .lrr-chip{padding:8px 11px}
              #lrrManagementDashboard .lrr-school{padding:10px;gap:8px}
              #lrrManagementDashboard .lrr-school .ico{width:34px;height:34px;flex:0 0 34px}
              #lrrManagementDashboard .lrr-folder-note{line-height:1.5}
            }
            @media(max-width:360px){
              #lrrManagementDashboard .lrr-school-grid,#lrrManagementDashboard .lrr-stat-grid,#lrrManagementDashboard .lrr-folder-grid{grid-template-columns:minmax(0,1fr)}
              #lrrManagementDashboard .lrr-school-grid [data-school=""]{grid-column:auto}
            }
          </style>
          <div class="lrr-hero">
            <div class="lrr-brand">
              <div class="lrr-brand-copy"><span class="lrr-eyebrow">NAKURU COLLEGE OF HEALTH SCIENCES &amp; MANAGEMENT</span><h3>Teaching &amp; Learning</h3><p>Academic quality · lecturer portfolios · school compliance</p></div>
            </div>
            <div class="lrr-hero-actions"><span class="lrr-live"><i></i> Academic workspace</span><button class="lrr-primary" id="lrrRefreshAll" type="button"><i class="fas fa-sync-alt"></i> Refresh data</button></div>
          </div>
          <nav class="lrr-subnav" aria-label="Teaching workspace sections">
            <button type="button" class="lrr-subtab active" data-jump="lrrSchoolOverview">Overview</button>
            <button type="button" class="lrr-subtab" data-jump="lrrFolderArea">School folders</button>
            <button type="button" class="lrr-subtab" data-jump="lrrDeadlineArea">Deadlines</button>
            <button type="button" class="lrr-subtab" data-jump="lrrSubmissionArea">Submissions</button>
            <button type="button" class="lrr-subtab" data-jump="lrrAnalyticsArea">Analytics</button>
          </nav>
          <div id="lrrSchoolOverview"></div>
          <div class="lrr-school-grid">
            <button type="button" class="lrr-school active" data-school=""><span class="ico">▦</span><span><strong id="lrrAllSchoolCount">0</strong><small>All schools · submissions</small></span></button>
            <button type="button" class="lrr-school" data-school="Nursing"><span class="ico">✚</span><span><strong id="lrrNursingCount">0</strong><small>Nursing School</small></span></button>
            <button type="button" class="lrr-school" data-school="TVET"><span class="ico">⚙</span><span><strong id="lrrTVETCount">0</strong><small>TVET School</small></span></button>
          </div>
          <div class="lrr-stat-grid" id="lrrPrimaryStats">
            <div class="lrr-stat"><span>Pending</span><strong id="lrrPendingMetric">0</strong></div>
            <div class="lrr-stat"><span>Due / Overdue</span><strong id="lrrDueMetric">0</strong></div>
            <div class="lrr-stat"><span>In Progress</span><strong id="lrrProgressMetric">0</strong></div>
            <div class="lrr-stat"><span>Awaiting Review</span><strong id="lrrAwaitingMetric">0</strong></div>
            <div class="lrr-stat"><span>Approved</span><strong id="lrrApprovedMetric">0</strong></div>
          </div>
          <div id="lrrAnalyticsArea" class="lrr-analytics">
            <div class="lrr-analytics-head"><div><strong>Submission analytics</strong><small>Live distribution for the selected school</small></div><span id="lrrAnalyticsTotal">0 records</span></div>
            <div class="lrr-chart-grid">
              <div class="lrr-chart-card"><strong>Workflow status</strong><div id="lrrStatusChart" class="lrr-bars"></div></div>
              <div class="lrr-chart-card"><strong>School comparison</strong><div id="lrrSchoolChart" class="lrr-bars"></div></div>
            </div>
          </div>
          <div class="lrr-toolbar" aria-label="Quick submission filters">
            <strong style="font-size:12px;margin-right:5px">Quick filters</strong>
            <button type="button" class="lrr-chip active" data-quick="">All submissions</button>
            <button type="button" class="lrr-chip" data-quick="pending">Pending</button>
            <button type="button" class="lrr-chip" data-quick="due">Due / Overdue</button>
            <button type="button" class="lrr-chip" data-quick="under_review">In progress</button>
            <button type="button" class="lrr-chip" data-quick="awaiting">Awaiting review</button>
            <button type="button" class="lrr-chip" data-quick="approved">Approved</button>
          </div>
          <div id="lrrDeadlineArea"></div>
          <div class="lrr-stat" style="margin-bottom:13px">
            <div style="display:flex;justify-content:space-between;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:12px"><div><strong style="font-size:15px">Set submission deadlines</strong><div style="font-size:12px;color:#64748b;margin-top:4px">Create school, document and unit-specific due dates for lecturer submissions.</div></div><span id="lrrDeadlineCount" style="font-size:12px;color:#64748b">0 active deadlines</span></div>
            <form id="lrrDeadlineForm" class="lrr-deadline">
              <label style="font-size:11px;color:#64748b">School<select id="lrrDeadlineSchool"><option value="Nursing">Nursing</option><option value="TVET">TVET</option></select></label>
              <label id="lrrDeadlineProgramWrap" style="font-size:11px;color:#64748b;display:none">TVET programme<select id="lrrDeadlineProgram" disabled><option value="">Select programme first</option></select></label>
              <label id="lrrDeadlineBlockWrap" style="font-size:11px;color:#64748b">Nursing block<select id="lrrDeadlineBlock"><option value="">Select block</option><option value="Block 1">Block 1</option><option value="Block 2">Block 2</option><option value="Block 3">Block 3</option><option value="Block 4">Block 4</option><option value="Block 5">Block 5</option><option value="Block 6">Block 6</option></select></label>
              <label id="lrrDeadlineTermWrap" style="font-size:11px;color:#64748b;display:none">TVET term<select id="lrrDeadlineTerm"><option value="">Select term</option><option value="Term 1">Term 1</option><option value="Term 2">Term 2</option><option value="Term 3">Term 3</option></select></label>
              <label style="font-size:11px;color:#64748b">Document type<select id="lrrDeadlineType"><option value="">All document types</option><option value="scheme_of_work">Scheme of Work</option><option value="lesson_plan">Lesson Plan</option><option value="record_of_work">Record of Work</option><option value="instructional_materials">Teaching Materials</option><option value="course_outline">Course Outline</option><option value="examination_question_paper">Examination Paper</option><option value="marking_scheme">Marking Scheme</option><option value="cat_1">CAT 1</option><option value="cat_2">CAT 2</option><option value="practical_exam_1">Practical Exam</option></select></label>
              <label style="font-size:11px;color:#64748b">Unit code (optional)<input id="lrrDeadlineUnit" placeholder="e.g. NCK 101"></label>
              <label style="font-size:11px;color:#64748b">Due date &amp; time<input id="lrrDeadlineDate" type="datetime-local" required></label>
              <button class="lrr-primary" type="submit">＋ Set deadline</button>
            </form>
            <div id="lrrDeadlineList" style="margin-top:12px;font-size:12px;color:#64748b">Loading deadlines…</div>
          </div>
          <div id="lrrFolderArea"></div><p class="lrr-folder-note">Browse by school, then open a unit folder to see its document collections.</p><div id="lrrFolderGrid" class="lrr-folder-grid" style="margin-top:8px"></div>
        `;
        const heading = section.querySelector('h2')?.parentElement?.parentElement;
        if (heading?.nextSibling) section.insertBefore(panel, heading.nextSibling); else section.insertBefore(panel, section.firstChild);
        panel.querySelector('#lrrRefreshAll')?.addEventListener('click', async()=>{await loadReports();});
        panel.querySelectorAll('[data-school]').forEach(btn=>btn.addEventListener('click',()=>{
            activeSchool=btn.dataset.school||'';
            panel.querySelectorAll('[data-school]').forEach(x=>x.classList.toggle('active',x===btn));
            applyFilters();
            renderManagementDashboard();
        }));
        panel.querySelectorAll('[data-quick]').forEach(btn=>btn.addEventListener('click',()=>{
            quickStatus=btn.dataset.quick||'';
            panel.querySelectorAll('[data-quick]').forEach(x=>x.classList.toggle('active',x===btn));
            applyFilters();
        }));
        panel.querySelector('#lrrDeadlineForm')?.addEventListener('submit',saveDeadline);
        panel.querySelector('#lrrDeadlineSchool')?.addEventListener('change',updateDeadlineScope);
        populateDeadlinePrograms();
        updateDeadlineScope();
        panel.querySelectorAll('[data-jump]').forEach(btn=>btn.addEventListener('click',()=>{
            panel.querySelectorAll('[data-jump]').forEach(x=>x.classList.toggle('active',x===btn));
            const target=getElement(btn.dataset.jump);if(target)target.scrollIntoView({behavior:'smooth',block:'start'});
        }));
        renderManagementDashboard();
    }


    function updateInstitutionalDashboard() {
        const all = state.rows || [];
        const now = Date.now();
        const schoolRows = school => all.filter(row => schoolOf(row) === school);
        const matchingSubmission = deadline => all.some(row =>
            schoolOf(row) === deadline.school &&
            (!deadline.program || normalizeProgram(row.program || row.department) === normalizeProgram(deadline.program)) &&
            (!deadline.block || String(row.block || '').toLowerCase() === String(deadline.block).toLowerCase()) &&
            (!deadline.term || String(row.term || '').toLowerCase() === String(deadline.term).toLowerCase()) &&
            (!deadline.document_type || row.document_type === deadline.document_type) &&
            (!deadline.unit_code || String(row.subject_code || '').toLowerCase() === String(deadline.unit_code).toLowerCase()) &&
            ['submitted','resubmitted','under_review','approved'].includes(row.status)
        );
        const overdue = deadlineRows.filter(d => new Date(d.due_at).getTime() < now && !matchingSubmission(d));
        const dueSoon = deadlineRows.filter(d => {
            const due = new Date(d.due_at).getTime();
            return due >= now && due <= now + 7 * 24 * 60 * 60 * 1000 && !matchingSubmission(d);
        });
        const count = (rows, predicate) => rows.filter(predicate).length;
        const set = (id, value) => { const node = getElement(id); if (node) node.textContent = String(value); };
        const stats = rows => ({
            total: rows.length,
            pending: count(rows, r => ['draft','returned'].includes(r.status)),
            awaiting: count(rows, r => ['submitted','resubmitted'].includes(r.status)),
            review: count(rows, r => r.status === 'under_review'),
            approved: count(rows, r => r.status === 'approved')
        });
        const nursing = stats(schoolRows('Nursing'));
        const tvet = stats(schoolRows('TVET'));
        const total = stats(all);
        set('npoTotal', total.total); set('npoAwaiting', total.awaiting);
        set('npoInReview', total.review); set('npoApproved', total.approved);
        set('npoOverdue', overdue.length);
        set('npoNursingTotal', nursing.total); set('npoNursingPending', nursing.pending);
        set('npoNursingReview', nursing.review); set('npoNursingApproved', nursing.approved);
        set('npoNursingOverdue', overdue.filter(d => d.school === 'Nursing').length);
        set('npoNursingDue', dueSoon.filter(d => d.school === 'Nursing').length);
        set('npoNursingAwaiting', nursing.awaiting);
        set('npoTVETTotal', tvet.total); set('npoTVETPending', tvet.pending);
        set('npoTVETReview', tvet.review); set('npoTVETApproved', tvet.approved);
        set('npoTVETOverdue', overdue.filter(d => d.school === 'TVET').length);
        set('npoTVETDue', dueSoon.filter(d => d.school === 'TVET').length);
        set('npoTVETAwaiting', tvet.awaiting);
        set('npoLastUpdated', 'Updated ' + new Date().toLocaleTimeString());
        const renderBars = (targetId, entries) => {
            const target = getElement(targetId); if (!target) return;
            const max = Math.max(1, ...entries.map(entry => entry.value));
            target.innerHTML = entries.map(entry =>
                '<div class="npo-bar-row"><span>' + escapeHtml(entry.label) +
                '</span><div class="npo-track"><div class="npo-fill" style="width:' +
                Math.round(entry.value / max * 100) + '%"></div></div><b>' +
                entry.value + '</b></div>'
            ).join('');
        };
        renderBars('npoStatusChart', [
            {label:'Pending',value:total.pending},{label:'Awaiting',value:total.awaiting},
            {label:'In review',value:total.review},{label:'Approved',value:total.approved},
            {label:'Rejected',value:count(all,r=>r.status==='rejected')}
        ]);
        renderBars('npoSchoolChart', [
            {label:'Nursing',value:nursing.total},{label:'TVET',value:tvet.total}
        ]);
    }

    function renderManagementDashboard() {
        const panel=getElement('lrrManagementDashboard'); if(!panel)return;
        const rows=activeSchool?state.rows.filter(r=>schoolOf(r)===activeSchool):state.rows;
        const now=Date.now();
        const dueDeadlines=deadlineRows.filter(d=>{
            if(new Date(d.due_at).getTime()>=now)return false;
            return !state.rows.some(r=>schoolOf(r)===d.school &&
                (!d.document_type || r.document_type===d.document_type) &&
                (!d.unit_code || String(r.subject_code||'').toLowerCase()===String(d.unit_code).toLowerCase()) &&
                ['submitted','resubmitted','under_review','approved'].includes(r.status));
        });
        const count=(fn)=>rows.filter(fn).length;
        setText('lrrAllSchoolCount',state.rows.length);
        setText('lrrNursingCount',state.rows.filter(r=>schoolOf(r)==='Nursing').length);
        setText('lrrTVETCount',state.rows.filter(r=>schoolOf(r)==='TVET').length);
        setText('lrrPendingMetric',count(r=>['draft','returned'].includes(r.status)));
        setText('lrrDueMetric',dueDeadlines.filter(d=>!activeSchool||d.school===activeSchool).length);
        setText('lrrProgressMetric',count(r=>r.status==='under_review'));
        setText('lrrAwaitingMetric',count(r=>['submitted','resubmitted'].includes(r.status)));
        setText('lrrApprovedMetric',count(r=>r.status==='approved'));
        setText('lrrDeadlineCount',deadlineRows.length+' active deadlines');
        const statusRows=[
          ['Pending',count(r=>['draft','returned'].includes(r.status))],
          ['Awaiting',count(r=>['submitted','resubmitted'].includes(r.status))],
          ['In review',count(r=>r.status==='under_review')],
          ['Approved',count(r=>r.status==='approved')],
          ['Rejected',count(r=>r.status==='rejected')]
        ];
        const maxStatus=Math.max(1,...statusRows.map(x=>x[1]));
        const statusChart=getElement('lrrStatusChart');
        if(statusChart)statusChart.innerHTML=statusRows.map(([label,value])=>'<div class="lrr-bar-row"><span>'+label+'</span><div class="lrr-bar-track"><div class="lrr-bar-fill" style="width:'+Math.round(value/maxStatus*100)+'%"></div></div><b class="lrr-bar-value">'+value+'</b></div>').join('');
        const schoolRows=[['Nursing',state.rows.filter(r=>schoolOf(r)==='Nursing').length],['TVET',state.rows.filter(r=>schoolOf(r)==='TVET').length]];
        const maxSchool=Math.max(1,...schoolRows.map(x=>x[1]));
        const schoolChart=getElement('lrrSchoolChart');
        if(schoolChart)schoolChart.innerHTML=schoolRows.map(([label,value])=>'<div class="lrr-bar-row"><span>'+label+'</span><div class="lrr-bar-track"><div class="lrr-bar-fill" style="width:'+Math.round(value/maxSchool*100)+'%"></div></div><b class="lrr-bar-value">'+value+'</b></div>').join('');
        setText('lrrAnalyticsTotal',rows.length+' records');
        const folders=getElement('lrrFolderGrid');
        if(folders){
            const grouped=new Map();
            rows.forEach(row=>{
                const school=schoolOf(row)||'Other';
                const unit=String(row.unit_name||row.subject_code||'Unassigned unit').trim();
                const code=String(row.subject_code||'').trim();
                const key=[school,code||unit].join('|');
                const item=grouped.get(key)||{school,unit,code,rows:[]};
                item.rows.push(row);grouped.set(key,item);
            });
            const schoolOrder=['Nursing','TVET','Other'];
            const groups=[...grouped.values()].sort((a,b)=>
                (schoolOrder.indexOf(a.school)-schoolOrder.indexOf(b.school))||
                a.unit.localeCompare(b.unit,undefined,{numeric:true})
            );
            const bySchool=['Nursing','TVET','Other'].map(school=>({
                school,items:groups.filter(item=>item.school===school)
            })).filter(group=>group.items.length);
            folders.innerHTML=bySchool.length?bySchool.map(group=>`
                <section class="lrr-drive-school">
                    <header class="lrr-drive-school-head">
                        <span class="lrr-drive-school-icon">${group.school==='Nursing'?'✚':group.school==='TVET'?'⚙':'▦'}</span>
                        <div><strong>${escapeHtml(group.school==='Other'?'Other submissions':group.school+' School')}</strong><small>${group.items.length} unit folders · ${group.items.reduce((n,item)=>n+item.rows.length,0)} documents</small></div>
                        <span class="lrr-drive-school-count">${group.items.length}</span>
                    </header>
                    <div class="lrr-drive-grid">${group.items.map(item=>`
                        <button type="button" class="lrr-drive-folder" data-folder-key="${escapeAttr(item.school+'|'+(item.code||item.unit))}">
                            <span class="lrr-drive-folder-icon">📁</span>
                            <span class="lrr-drive-folder-copy"><strong>${escapeHtml(item.unit)}</strong><small>${item.code?escapeHtml(item.code)+' · ':''}${item.rows.length} document${item.rows.length===1?'':'s'}</small></span>
                            <span class="lrr-drive-chevron">›</span>
                        </button>`).join('')}</div>
                </section>`).join(''):'<div class="lrr-drive-empty">No unit folders yet. Folders appear automatically as lecturers submit documents.</div>';
            folders.querySelectorAll('[data-folder-key]').forEach(btn=>btn.addEventListener('click',()=>{
                const item=grouped.get(btn.dataset.folderKey);
                if(!item)return;
                const area=getElement('lrrFolderArea');
                if(!area)return;
                area.innerHTML=`
                    <section class="lrr-drive-open">
                        <div class="lrr-drive-open-head">
                            <div><button type="button" class="lrr-drive-back" data-folder-back>← All folders</button><h3>📁 ${escapeHtml(item.unit)}</h3><p>${escapeHtml(item.school)} · ${item.rows.length} documents</p></div>
                            <span class="lrr-drive-pill">${item.rows.length} files</span>
                        </div>
                        <div class="lrr-drive-files">${item.rows.slice().sort((a,b)=>new Date(b.submitted_at||b.created_at||0)-new Date(a.submitted_at||a.created_at||0)).map(row=>`
                            <button type="button" class="lrr-drive-file" data-open-submission="${escapeAttr(row.id)}">
                                <span class="lrr-drive-file-icon">${/pdf/i.test(row.document_type||'')?'📕':'📄'}</span>
                                <span><strong>${escapeHtml(row.title||humanize(row.document_type||row.report_type||'Teaching document'))}</strong><small>${escapeHtml(row.lecturer_name||'Lecturer')} · ${escapeHtml(humanize(row.document_type||row.report_type||'Document'))} · ${escapeHtml(formatDate(row.submitted_at||row.created_at,false))}</small></span>
                                <span class="lrr-drive-file-status">${statusBadge(row.status)}</span>
                            </button>`).join('')}</div>
                    </section>`;
                area.querySelector('[data-folder-back]')?.addEventListener('click',()=>{area.innerHTML='';});
                area.querySelectorAll('[data-open-submission]').forEach(file=>file.addEventListener('click',()=>openSubmission(file.dataset.openSubmission)));
                area.scrollIntoView({behavior:'smooth',block:'start'});
            }));
        }
        const list=getElement('lrrDeadlineList');
        if(list) list.innerHTML=deadlineRows.length?deadlineRows.map(d=>'<div style="display:flex;justify-content:space-between;gap:10px;padding:9px 2px;border-top:1px solid #e2e8f0"><span><b>'+escapeHtml(d.school)+'</b> · '+escapeHtml(humanize(d.document_type||'All document types'))+(d.program?' · '+escapeHtml(d.program):'')+(d.block?' · '+escapeHtml(d.block):'')+(d.term?' · '+escapeHtml(d.term):'')+(d.unit_code?' · '+escapeHtml(d.unit_code):'')+'</span><span>'+escapeHtml(formatDate(d.due_at))+'</span></div>').join(''):'No deadlines have been configured yet.';
    }

    function populateDeadlinePrograms() {
        const select = getElement('lrrDeadlineProgram');
        if (!select) return;
        const programs = [...new Set((state.rows || [])
            .filter(row => schoolOf(row) === 'TVET')
            .map(row => String(row.program || row.department || '').trim())
            .filter(value => value && !/^(tvet|technical vocational education and training)$/i.test(value))) ]
            .sort((a,b)=>a.localeCompare(b));
        select.innerHTML = '<option value="">Select TVET programme</option>' +
            programs.map(value => '<option value="'+escapeAttr(value)+'">'+escapeHtml(value)+'</option>').join('');
        select.disabled = programs.length === 0;
        if (!programs.length) select.innerHTML = '<option value="">No TVET programmes found in lecturer records</option>';
    }

    function updateDeadlineScope() {
        const school = getElement('lrrDeadlineSchool')?.value || 'Nursing';
        const nursing = school === 'Nursing';
        const programWrap = getElement('lrrDeadlineProgramWrap');
        const blockWrap = getElement('lrrDeadlineBlockWrap');
        const termWrap = getElement('lrrDeadlineTermWrap');
        if (programWrap) programWrap.style.display = nursing ? 'none' : '';
        if (blockWrap) blockWrap.style.display = nursing ? '' : 'none';
        if (termWrap) termWrap.style.display = nursing ? 'none' : '';
        const program = getElement('lrrDeadlineProgram');
        const block = getElement('lrrDeadlineBlock');
        const term = getElement('lrrDeadlineTerm');
        if (program) program.required = !nursing;
        if (block) block.required = nursing;
        if (term) term.required = !nursing;
    }

    async function saveDeadline(event) {
        event.preventDefault();
        if(!(await assertAdmin()))return;
        const client=getSupabaseClient();
        const due=getElement('lrrDeadlineDate')?.value;
        if(!due)return;
        const school=getElement('lrrDeadlineSchool').value;
        const program=school==='TVET'?(getElement('lrrDeadlineProgram')?.value||''):null;
        const block=school==='Nursing'?(getElement('lrrDeadlineBlock')?.value||''):null;
        const term=school==='TVET'?(getElement('lrrDeadlineTerm')?.value||''):null;
        if(school==='TVET'&&(!program||!term)){showModuleToast('Select the TVET programme and term.','error');return;}
        if(school==='Nursing'&&!block){showModuleToast('Select the Nursing block.','error');return;}
        const payload={school,program,block,term,document_type:getElement('lrrDeadlineType').value||null,unit_code:getElement('lrrDeadlineUnit').value.trim()||null,due_at:new Date(due).toISOString(),created_by:state.currentUser.id};
        try{
            const {error}=await client.from(TABLE_DEADLINES).insert(payload);
            if(error)throw error;
            getElement('lrrDeadlineForm').reset();
            updateDeadlineScope();
            await loadDeadlines();populateDeadlinePrograms();renderManagementDashboard();updateInstitutionalDashboard();
            showModuleToast('Submission deadline saved.','success');
        }catch(error){showModuleToast(error.message||'Could not save deadline. Apply the deadline-table SQL migration and check its RLS policies.','error');}
    }

    function updateCounters() {
        const counts = { submitted: 0, under_review: 0, returned: 0, approved: 0 };

        state.rows.forEach(row => {
            if (row.status === 'submitted') counts.submitted++;
            if (row.status === 'under_review') counts.under_review++;
            if (row.status === 'returned' || row.status === 'resubmitted') counts.returned++;
            if (row.status === 'approved') counts.approved++;
        });

        setCounter([
            'lrrSubmittedCount',
            'lecturerReportsSubmittedCount'
        ], counts.submitted);

        setCounter([
            'lrrUnderReviewCount',
            'lecturerReportsUnderReviewCount'
        ], counts.under_review);

        setCounter([
            'lrrReturnedCount',
            'lecturerReportsReturnedCount'
        ], counts.returned);

        setCounter([
            'lrrApprovedCount',
            'lecturerReportsApprovedCount'
        ], counts.approved);

        ['lrrTotalCount','lrrSubmittedCount','lrrUnderReviewCount','lrrReturnedCount','lrrApprovedCount'].forEach(id=>{
            const el=getElement(id);
            const card=el?.parentElement?.parentElement;
            if(card)card.style.display='none';
        });
        ['lecturerReportsTotalCount','lecturerReportsSubmittedCount','lecturerReportsUnderReviewCount','lecturerReportsReturnedCount','lecturerReportsApprovedCount'].forEach(id=>{
            const el=getElement(id);if(el){const card=el.parentElement?.parentElement;if(card)card.style.display='none';}
        });
    }

    function setCounter(ids, value) {
        ids.forEach(id => {
            const el = getElement(id);
            if (el) el.textContent = String(value);
        });
    }

    function updateVisibleCount() {
        setCounter(
            ['lrrVisibleCount', 'lecturerReportsVisibleCount'],
            state.filteredRows.length
        );
    }

    function renderReports() {
        const container = getElement('lecturerReportsReviewTable');

        if (!container) {
            console.warn(
                `[${MODULE}] Expected table container #lecturerReportsReviewTable was not found.`
            );
            return;
        }

        if (!state.filteredRows.length) {
            renderEmptyState('No lecturer reports match the selected filters.');
            return;
        }

        container.innerHTML = `
            <div style="overflow-x:auto;">
                <table style="
                    width:100%;
                    border-collapse:collapse;
                    min-width:1050px;
                ">
                    <thead>
                        <tr style="background:#f8fafc;">
                            <th style="${thStyle()}">Lecturer</th>
                            <th style="${thStyle()}">Report</th>
                            <th style="${thStyle()}">Unit</th>
                            <th style="${thStyle()}">Class</th>
                            <th style="${thStyle()}">Period</th>
                            <th style="${thStyle()}">Status</th>
                            <th style="${thStyle('right')}">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${state.filteredRows.map(renderReportRow).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    function thStyle(align = 'left') {
        return `
            padding:12px 14px;
            text-align:${align};
            font-size:11px;
            text-transform:uppercase;
            letter-spacing:.04em;
            color:#64748b;
            font-weight:800;
            border-bottom:1px solid #e2e8f0;
        `;
    }

    function tdStyle() {
        return `
            padding:13px 14px;
            border-bottom:1px solid #eef2f7;
            vertical-align:top;
            font-size:13px;
            color:#334155;
        `;
    }

    function renderReportRow(row) {
        const period =
            row.period_start || row.period_end
                ? `${formatDate(row.period_start, false)}${row.period_end ? ` – ${formatDate(row.period_end, false)}` : ''}`
                : row.week_number
                    ? `Week ${escapeHtml(row.week_number)}`
                    : '—';

        const title = row.title || humanize(row.document_type || row.report_type);

        return `
            <tr
                data-submission-row="${escapeAttr(row.id)}"
                style="background:white;"
                onmouseover="this.style.background='#fafaff'"
                onmouseout="this.style.background='white'"
            >
                <td style="${tdStyle()}">
                    <div style="font-weight:800;color:#0f172a;">
                        ${escapeHtml(row.lecturer_name || 'Unnamed Lecturer')}
                    </div>
                    <div style="font-size:11px;color:#94a3b8;margin-top:3px;">
                        ${escapeHtml(row.lecturer_id || row.lecturer_email || '—')}
                    </div>
                </td>

                <td style="${tdStyle()}">
                    <div style="font-weight:700;color:#1e293b;">
                        ${escapeHtml(title)}
                    </div>
                    <div style="font-size:11px;color:#64748b;margin-top:4px;">
                        ${escapeHtml(humanize(row.report_type || 'Report'))}
                        ${row.document_type ? ` · ${escapeHtml(humanize(row.document_type))}` : ''}
                    </div>
                </td>

                <td style="${tdStyle()}">
                    <div style="font-weight:600;">
                        ${escapeHtml(row.unit_name || '—')}
                    </div>
                    ${row.subject_code ? `
                        <div style="font-size:11px;color:#94a3b8;">
                            ${escapeHtml(row.subject_code)}
                        </div>
                    ` : ''}
                </td>

                <td style="${tdStyle()}">
                    <div>${escapeHtml(row.program || '—')}</div>
                    <div style="font-size:11px;color:#94a3b8;">
                        ${escapeHtml(row.block || '—')} · ${escapeHtml(row.academic_year || '—')}
                    </div>
                </td>

                <td style="${tdStyle()}">
                    ${period}
                    ${row.submitted_at ? `
                        <div style="font-size:11px;color:#94a3b8;margin-top:4px;">
                            Submitted ${escapeHtml(formatDate(row.submitted_at))}
                        </div>
                    ` : ''}
                </td>

                <td style="${tdStyle()}">
                    ${statusBadge(row.status)}
                </td>

                <td style="${tdStyle()}text-align:right;">
                    <button
                        type="button"
                        onclick="window.LecturerReportsReview.open('${escapeAttr(row.id)}')"
                        style="
                            border:0;
                            background:#4C1D95;
                            color:white;
                            padding:8px 12px;
                            border-radius:8px;
                            cursor:pointer;
                            font-size:12px;
                            font-weight:700;
                        "
                    >
                        <i class="fas fa-eye"></i> Review
                    </button>
                </td>
            </tr>
        `;
    }

    function renderEmptyState(message) {
        const container = getElement('lecturerReportsReviewTable');
        if (!container) return;

        container.innerHTML = `
            <div style="
                padding:55px 20px;
                text-align:center;
                color:#64748b;
            ">
                <div style="
                    width:58px;
                    height:58px;
                    margin:0 auto 14px;
                    border-radius:16px;
                    background:#f1f5f9;
                    display:flex;
                    align-items:center;
                    justify-content:center;
                    color:#94a3b8;
                    font-size:24px;
                ">
                    <i class="fas fa-file-alt"></i>
                </div>
                <div style="font-weight:800;color:#334155;margin-bottom:5px;">
                    No Reports Found
                </div>
                <div style="font-size:13px;">
                    ${escapeHtml(message)}
                </div>
            </div>
        `;
    }

    async function openSubmission(id) {
        const row = state.rows.find(item => String(item.id) === String(id));

        if (!row) {
            showModuleToast('The selected report could not be found.', 'error');
            return;
        }

        state.selectedSubmission = row;

        await Promise.all([
            loadAttachments(id),
            loadReviewHistory(id)
        ]);

        renderReviewModal();
    }

    async function loadAttachments(submissionId) {
        const client = getSupabaseClient();

        if (!client) {
            state.selectedAttachments = [];
            return;
        }

        try {
            const { data, error } = await client
                .from(TABLE_ATTACHMENTS)
                .select(`
                    id,
                    submission_id,
                    uploaded_by,
                    file_name,
                    storage_path,
                    mime_type,
                    file_size,
                    created_at
                `)
                .eq('submission_id', submissionId)
                .order('created_at', { ascending: true });

            if (error) throw error;

            state.selectedAttachments = data || [];

            // Lecturer portal uploads files directly to Storage under
            // {lecturer_id}/{year}/{submission_id}/{timestamp}_{filename}.
            // Older uploads may not have a lecturer_report_attachments row,
            // so discover them in Storage when the metadata query is empty.
            if (!state.selectedAttachments.length && client.storage?.from && state.selectedSubmission) {
                const row = state.selectedSubmission;
                const lecturerId = String(row.lecturer_id || '').trim();
                const years = [...new Set([
                    new Date(row.created_at || row.submitted_at || Date.now()).getFullYear(),
                    new Date().getFullYear()
                ])];
                const discovered = [];

                if (lecturerId) {
                    for (const year of years) {
                        const prefix = `${lecturerId}/${year}/${submissionId}`;
                        try {
                            const { data: files, error: storageError } = await client.storage
                                .from(STORAGE_BUCKET)
                                .list(prefix, { limit: 100, sortBy: { column: 'name', order: 'desc' } });
                            if (storageError) throw storageError;
                            (files || []).filter(file => file.name && !file.name.startsWith('.')).forEach(file => {
                                discovered.push({
                                    id: `${prefix}/${file.name}`,
                                    submission_id: submissionId,
                                    uploaded_by: row.lecturer_user_id || null,
                                    file_name: file.name.replace(/^\d+_/, ''),
                                    storage_path: `${prefix}/${file.name}`,
                                    mime_type: file.metadata?.mimetype || '',
                                    file_size: file.metadata?.size || 0,
                                    created_at: file.created_at || row.created_at || row.submitted_at
                                });
                            });
                        } catch (storageError) {
                            console.warn(`[${MODULE}] Storage fallback listing failed for ${prefix}`, storageError);
                        }
                    }
                }
                state.selectedAttachments = [...new Map(discovered.map(file => [file.storage_path, file])).values()];
            }
        } catch (error) {
            console.error(`[${MODULE}] Attachment lookup failed`, error);
            state.selectedAttachments = [];
        }
    }

    async function loadReviewHistory(submissionId) {
        const client = getSupabaseClient();

        if (!client) {
            state.selectedReviews = [];
            return;
        }

        try {
            const { data, error } = await client
                .from(TABLE_REVIEWS)
                .select(`
                    id,
                    submission_id,
                    reviewer_user_id,
                    reviewer_name,
                    action,
                    comments,
                    created_at
                `)
                .eq('submission_id', submissionId)
                .order('created_at', { ascending: false });

            if (error) throw error;

            state.selectedReviews = data || [];
        } catch (error) {
            console.error(`[${MODULE}] Review history lookup failed`, error);
            state.selectedReviews = [];
        }
    }

    function ensureModal() {
        let modal = getElement('lecturerReportsReviewModal');

        if (modal) return modal;

        modal = document.createElement('div');
        modal.id = 'lecturerReportsReviewModal';

        modal.innerHTML = `
            <div id="lrrModalBackdrop" style="
                position:absolute;
                inset:0;
                background:rgba(15,23,42,.62);
                backdrop-filter:blur(3px);
            "></div>

            <div style="
                position:relative;
                width:min(1100px,94vw);
                max-height:92vh;
                overflow:auto;
                background:white;
                border-radius:18px;
                box-shadow:0 30px 80px rgba(0,0,0,.3);
            ">
                <div id="lrrModalContent"></div>
            </div>
        `;

        modal.style.cssText = `
            display:none;
            position:fixed;
            inset:0;
            z-index:999990;
            align-items:center;
            justify-content:center;
            padding:20px;
        `;

        document.body.appendChild(modal);

        modal.addEventListener('click', function (event) {
            if (event.target.id === 'lrrModalBackdrop') {
                closeModal();
            }
        });

        return modal;
    }

    function renderReviewModal() {
        const row = state.selectedSubmission;
        if (!row) return;

        const modal = ensureModal();
        const content = getElement('lrrModalContent');

        if (!content) return;

        const canReview = ['submitted', 'under_review', 'resubmitted', 'returned'].includes(row.status);

        content.innerHTML = `
            <div style="
                padding:22px 24px;
                border-bottom:1px solid #e2e8f0;
                background:linear-gradient(135deg,#4C1D95,#6d28d9);
                color:white;
                display:flex;
                justify-content:space-between;
                gap:15px;
                align-items:flex-start;
            ">
                <div>
                    <div style="
                        font-size:11px;
                        text-transform:uppercase;
                        letter-spacing:.08em;
                        opacity:.8;
                        margin-bottom:5px;
                    ">
                        Lecturer Report Review
                    </div>

                    <h2 style="margin:0;font-size:21px;">
                        ${escapeHtml(row.title || humanize(row.document_type || row.report_type))}
                    </h2>

                    <div style="margin-top:7px;font-size:13px;opacity:.9;">
                        ${escapeHtml(row.lecturer_name || 'Unnamed Lecturer')}
                        ${row.lecturer_email ? ` · ${escapeHtml(row.lecturer_email)}` : ''}
                    </div>
                </div>

                <div style="display:flex;align-items:center;gap:10px;">
                    <div style="background:rgba(255,255,255,.14);padding:7px 10px;border-radius:8px;">
                        ${statusBadgeOnDark(row.status)}
                    </div>

                    <button
                        type="button"
                        onclick="window.LecturerReportsReview.close()"
                        aria-label="Close"
                        style="
                            width:36px;
                            height:36px;
                            border:0;
                            border-radius:10px;
                            background:rgba(255,255,255,.12);
                            color:white;
                            cursor:pointer;
                            font-size:17px;
                        "
                    >
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>

            <div style="padding:22px 24px;">
                ${renderDetails(row)}

                <div style="
                    display:grid;
                    grid-template-columns:minmax(0,1.25fr) minmax(280px,.75fr);
                    gap:20px;
                    margin-top:20px;
                ">
                    <div>
                        ${renderReportContent(row)}
                        ${renderAttachments()}
                    </div>

                    <div>
                        ${renderReviewActions(canReview)}
                        ${renderReviewHistory()}
                    </div>
                </div>
            </div>
        `;

        modal.style.display = 'flex';

        setTimeout(() => {
            const comment = getElement('lrrReviewComment');
            if (comment) comment.focus();
        }, 100);
    }

    function statusBadgeOnDark(status) {
        return `
            <span style="
                display:inline-flex;
                align-items:center;
                gap:6px;
                color:white;
                font-size:11px;
                font-weight:800;
            ">
                <span style="
                    width:7px;
                    height:7px;
                    border-radius:50%;
                    background:white;
                "></span>
                ${escapeHtml(statusLabel(status))}
            </span>
        `;
    }

    function renderDetails(row) {
        const items = [
            ['Lecturer ID', row.lecturer_id],
            ['Report Type', humanize(row.report_type)],
            ['Document Type', humanize(row.document_type)],
            ['Unit', row.unit_name],
            ['Subject Code', row.subject_code],
            ['Program', row.program],
            ['Block / Class', row.block],
            ['Academic Year', row.academic_year],
            ['Week', row.week_number ? `Week ${row.week_number}` : null],
            ['Period', row.period_start || row.period_end
                ? `${formatDate(row.period_start, false)}${row.period_end ? ` – ${formatDate(row.period_end, false)}` : ''}`
                : null],
            ['Recipient', row.recipient_role]
        ];

        return `
            <div style="
                display:grid;
                grid-template-columns:repeat(auto-fit,minmax(170px,1fr));
                gap:10px;
            ">
                ${items.map(([label, value]) => `
                    <div style="
                        padding:12px;
                        border:1px solid #e2e8f0;
                        border-radius:10px;
                        background:#f8fafc;
                    ">
                        <div style="
                            color:#94a3b8;
                            font-size:10px;
                            text-transform:uppercase;
                            font-weight:800;
                            letter-spacing:.04em;
                        ">
                            ${escapeHtml(label)}
                        </div>
                        <div style="
                            color:#1e293b;
                            font-size:13px;
                            font-weight:700;
                            margin-top:5px;
                            word-break:break-word;
                        ">
                            ${escapeHtml(value || '—')}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    function renderReportContent(row) {
        const flags = [
            ['Attendance', row.include_attendance],
            ['Grades / Marks', row.include_grades],
            ['Activities', row.include_activities],
            ['Challenges', row.include_challenges]
        ];

        return `
            <div style="
                border:1px solid #e2e8f0;
                border-radius:14px;
                overflow:hidden;
                margin-bottom:18px;
            ">
                <div style="
                    padding:13px 15px;
                    background:#f8fafc;
                    border-bottom:1px solid #e2e8f0;
                    font-weight:800;
                    color:#334155;
                ">
                    <i class="fas fa-file-alt" style="color:#4C1D95;"></i>
                    Report Content
                </div>

                <div style="padding:16px;">
                    <div style="
                        display:flex;
                        flex-wrap:wrap;
                        gap:7px;
                        margin-bottom:15px;
                    ">
                        ${flags.map(([label, enabled]) => `
                            <span style="
                                padding:6px 9px;
                                border-radius:8px;
                                background:${enabled ? '#ecfdf5' : '#f8fafc'};
                                color:${enabled ? '#047857' : '#94a3b8'};
                                border:1px solid ${enabled ? '#a7f3d0' : '#e2e8f0'};
                                font-size:11px;
                                font-weight:700;
                            ">
                                <i class="fas ${enabled ? 'fa-check' : 'fa-minus'}"></i>
                                ${escapeHtml(label)}
                            </span>
                        `).join('')}
                    </div>

                    <div>
                        <div style="
                            font-size:11px;
                            text-transform:uppercase;
                            font-weight:800;
                            color:#64748b;
                            margin-bottom:6px;
                        ">
                            Summary
                        </div>

                        <div style="
                            background:#f8fafc;
                            border-radius:10px;
                            padding:13px;
                            color:#334155;
                            font-size:13px;
                            line-height:1.6;
                            white-space:pre-wrap;
                            min-height:70px;
                        ">
                            ${escapeHtml(row.summary || 'No summary was provided.')}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    function renderAttachments() {
        return `
            <div style="
                border:1px solid #e2e8f0;
                border-radius:14px;
                overflow:hidden;
            ">
                <div style="
                    padding:13px 15px;
                    background:#f8fafc;
                    border-bottom:1px solid #e2e8f0;
                    display:flex;
                    justify-content:space-between;
                    gap:10px;
                ">
                    <div style="font-weight:800;color:#334155;">
                        <i class="fas fa-paperclip" style="color:#4C1D95;"></i>
                        Attachments
                    </div>
                    <span style="font-size:11px;color:#94a3b8;">
                        ${state.selectedAttachments.length} file(s)
                    </span>
                </div>

                <div style="padding:12px;">
                    ${
                        state.selectedAttachments.length
                            ? state.selectedAttachments.map(renderAttachment).join('')
                            : `
                                <div style="padding:18px;text-align:center;color:#94a3b8;font-size:12px;">
                                    No attachments were uploaded with this report.
                                </div>
                            `
                    }
                </div>
                <div id="lrrInlinePreview" style="display:none;margin:0 12px 12px;border:1px solid #cbd5e1;border-radius:10px;overflow:hidden;background:#f8fafc;">
                    <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:10px 12px;background:#ede9fe;color:#4C1D95;font-size:12px;font-weight:800;">
                        <span id="lrrInlinePreviewTitle">Document Preview</span>
                        <button type="button" onclick="window.LecturerReportsReview.closeInlinePreview()" style="border:0;background:white;color:#4C1D95;border-radius:6px;padding:5px 8px;cursor:pointer;">Close preview</button>
                    </div>
                    <div id="lrrInlinePreviewBody" style="min-height:260px;max-height:65vh;display:flex;align-items:center;justify-content:center;overflow:auto;"></div>
                </div>
            </div>
        `;
    }

    function renderAttachment(file) {
        const icon = getFileIcon(file.mime_type, file.file_name);

        return `
            <div style="
                display:flex;
                align-items:center;
                gap:11px;
                padding:11px;
                border:1px solid #e2e8f0;
                border-radius:10px;
                margin-bottom:8px;
                background:white;
            ">
                <div style="
                    width:38px;
                    height:38px;
                    border-radius:9px;
                    background:#f3e8ff;
                    color:#6d28d9;
                    display:flex;
                    align-items:center;
                    justify-content:center;
                    flex:none;
                ">
                    <i class="${icon}"></i>
                </div>

                <div style="min-width:0;flex:1;">
                    <div style="
                        font-size:12px;
                        font-weight:800;
                        color:#334155;
                        overflow:hidden;
                        text-overflow:ellipsis;
                        white-space:nowrap;
                    ">
                        ${escapeHtml(file.file_name || 'Attachment')}
                    </div>

                    <div style="font-size:10px;color:#94a3b8;margin-top:3px;">
                        ${escapeHtml(formatFileSize(file.file_size))}
                        · ${escapeHtml(formatDate(file.created_at))}
                    </div>
                </div>

                <button
                    type="button"
                    onclick="window.LecturerReportsReview.openAttachment('${escapeAttr(file.id)}')"
                    style="
                        border:1px solid #ddd6fe;
                        background:#faf5ff;
                        color:#6d28d9;
                        padding:7px 9px;
                        border-radius:8px;
                        cursor:pointer;
                        font-size:11px;
                        font-weight:800;
                        white-space:nowrap;
                    "
                >
                    <i class="fas fa-eye"></i> Preview
                </button>
            </div>
        `;
    }

    function getFileIcon(mime, name) {
        const value = `${mime || ''} ${name || ''}`.toLowerCase();

        if (value.includes('pdf')) return 'fas fa-file-pdf';
        if (value.includes('word') || value.includes('.doc')) return 'fas fa-file-word';
        if (value.includes('excel') || value.includes('spreadsheet') || value.includes('.xls')) {
            return 'fas fa-file-excel';
        }
        if (value.includes('powerpoint') || value.includes('.ppt')) return 'fas fa-file-powerpoint';
        if (value.includes('image') || /\.(png|jpe?g|gif|webp)$/i.test(name || '')) {
            return 'fas fa-file-image';
        }

        return 'fas fa-file';
    }

    function formatFileSize(bytes) {
        const size = Number(bytes);
        if (!Number.isFinite(size) || size <= 0) return 'Size unavailable';

        const units = ['B', 'KB', 'MB', 'GB'];
        let value = size;
        let unit = 0;

        while (value >= 1024 && unit < units.length - 1) {
            value /= 1024;
            unit++;
        }

        return `${value.toFixed(unit === 0 ? 0 : 1)} ${units[unit]}`;
    }

    function renderReviewActions(canReview) {
        if (!canReview) {
            return `
                <div style="
                    border:1px solid #e2e8f0;
                    border-radius:14px;
                    padding:16px;
                    background:#f8fafc;
                    margin-bottom:18px;
                ">
                    <div style="font-weight:800;color:#334155;margin-bottom:5px;">
                        Review Actions
                    </div>
                    <div style="font-size:12px;color:#64748b;line-height:1.5;">
                        This report is currently <strong>${escapeHtml(statusLabel(state.selectedSubmission.status))}</strong>
                        and does not require an active review action.
                    </div>
                </div>
            `;
        }

        return `
            <div style="
                border:1px solid #e2e8f0;
                border-radius:14px;
                padding:16px;
                background:white;
                margin-bottom:18px;
            ">
                <div style="
                    font-weight:800;
                    color:#334155;
                    margin-bottom:4px;
                ">
                    <i class="fas fa-gavel" style="color:#4C1D95;"></i>
                    Review Actions
                </div>

                <div style="
                    font-size:11px;
                    color:#94a3b8;
                    margin-bottom:12px;
                ">
                    Add a comment when returning or rejecting a report.
                </div>

                <textarea
                    id="lrrReviewComment"
                    placeholder="Enter review comments..."
                    style="
                        width:100%;
                        min-height:110px;
                        resize:vertical;
                        box-sizing:border-box;
                        border:1px solid #cbd5e1;
                        border-radius:10px;
                        padding:11px;
                        font:inherit;
                        font-size:12px;
                        outline:none;
                    "
                ></textarea>

                <div style="
                    display:grid;
                    grid-template-columns:1fr 1fr;
                    gap:8px;
                    margin-top:10px;
                ">
                    <button
                        type="button"
                        onclick="window.LecturerReportsReview.setUnderReview()"
                        style="
                            border:1px solid #ddd6fe;
                            background:#faf5ff;
                            color:#6d28d9;
                            padding:10px;
                            border-radius:9px;
                            cursor:pointer;
                            font-size:11px;
                            font-weight:800;
                        "
                    >
                        <i class="fas fa-search"></i> Under Review
                    </button>

                    <button
                        type="button"
                        onclick="window.LecturerReportsReview.returnForCorrection()"
                        style="
                            border:1px solid #fed7aa;
                            background:#fff7ed;
                            color:#c2410c;
                            padding:10px;
                            border-radius:9px;
                            cursor:pointer;
                            font-size:11px;
                            font-weight:800;
                        "
                    >
                        <i class="fas fa-undo"></i> Return
                    </button>

                    <button
                        type="button"
                        onclick="window.LecturerReportsReview.reject()"
                        style="
                            border:1px solid #fecaca;
                            background:#fef2f2;
                            color:#b91c1c;
                            padding:10px;
                            border-radius:9px;
                            cursor:pointer;
                            font-size:11px;
                            font-weight:800;
                        "
                    >
                        <i class="fas fa-times-circle"></i> Reject
                    </button>

                    <button
                        type="button"
                        onclick="window.LecturerReportsReview.approve()"
                        style="
                            border:0;
                            background:#059669;
                            color:white;
                            padding:10px;
                            border-radius:9px;
                            cursor:pointer;
                            font-size:11px;
                            font-weight:800;
                        "
                    >
                        <i class="fas fa-check-circle"></i> Approve
                    </button>
                </div>
            </div>
        `;
    }

    function renderReviewHistory() {
        return `
            <div style="
                border:1px solid #e2e8f0;
                border-radius:14px;
                overflow:hidden;
            ">
                <div style="
                    padding:13px 15px;
                    background:#f8fafc;
                    border-bottom:1px solid #e2e8f0;
                    font-weight:800;
                    color:#334155;
                ">
                    <i class="fas fa-history" style="color:#4C1D95;"></i>
                    Review History
                </div>

                <div style="padding:12px;">
                    ${
                        state.selectedReviews.length
                            ? state.selectedReviews.map(review => `
                                <div style="
                                    position:relative;
                                    padding:10px 0 10px 18px;
                                    border-left:2px solid #ddd6fe;
                                    margin-left:5px;
                                    margin-bottom:7px;
                                ">
                                    <div style="
                                        font-size:11px;
                                        font-weight:800;
                                        color:${statusColor(review.action)};
                                    ">
                                        ${escapeHtml(humanize(review.action))}
                                    </div>

                                    <div style="
                                        font-size:11px;
                                        color:#334155;
                                        margin-top:4px;
                                        white-space:pre-wrap;
                                    ">
                                        ${escapeHtml(review.comments || 'No comment provided.')}
                                    </div>

                                    <div style="
                                        font-size:10px;
                                        color:#94a3b8;
                                        margin-top:4px;
                                    ">
                                        ${escapeHtml(review.reviewer_name || 'Administrator')}
                                        · ${escapeHtml(formatDate(review.created_at))}
                                    </div>
                                </div>
                            `).join('')
                            : `
                                <div style="padding:18px;text-align:center;color:#94a3b8;font-size:12px;">
                                    No review history yet.
                                </div>
                            `
                    }
                </div>
            </div>
        `;
    }

    async function openAttachment(id) {
        const file = state.selectedAttachments.find(item => String(item.id) === String(id) || String(item.storage_path) === String(id));

        if (!file) {
            showModuleToast('Attachment not found.', 'error');
            return;
        }

        const client = getSupabaseClient();

        if (!client?.storage?.from) {
            showModuleToast('Supabase Storage is not available.', 'error');
            return;
        }

        try {
            const { data, error } = await client
                .storage
                .from(STORAGE_BUCKET)
                .createSignedUrl(file.storage_path, 60 * 10);

            if (error) throw error;

            if (!data?.signedUrl) {
                throw new Error('A signed URL could not be generated.');
            }

            const preview = getElement('lrrInlinePreview');
            const previewBody = getElement('lrrInlinePreviewBody');
            const previewTitle = getElement('lrrInlinePreviewTitle');
            if (!preview || !previewBody) { window.open(data.signedUrl, '_blank', 'noopener,noreferrer'); return; }
            const mime = String(file.mime_type || '').toLowerCase();
            const name = String(file.file_name || '').toLowerCase();
            if (previewTitle) previewTitle.textContent = file.file_name || 'Document Preview';
            const safeUrl = escapeAttr(data.signedUrl);
            if (mime.includes('pdf') || name.endsWith('.pdf')) {
                previewBody.innerHTML = `<iframe title="Lecturer document preview" src="${safeUrl}#toolbar=1&navpanes=0" style="width:100%;height:60vh;min-height:320px;border:0;background:white;"></iframe>`;
            } else if (mime.startsWith('image/') || /\.(png|jpe?g|gif|webp|bmp)$/i.test(name)) {
                previewBody.innerHTML = `<img alt="${escapeAttr(file.file_name || 'Uploaded image')}" src="${safeUrl}" style="display:block;max-width:100%;max-height:60vh;object-fit:contain;margin:auto;">`;
            } else if (mime.startsWith('text/') || /\.(txt|csv)$/i.test(name)) {
                previewBody.innerHTML = `<iframe title="Text document preview" src="${safeUrl}" style="width:100%;height:50vh;border:0;background:white;"></iframe>`;
            } else {
                previewBody.innerHTML = `<div style="padding:24px;text-align:center;color:#475569;"><i class="fas fa-file-word" style="font-size:36px;color:#6d28d9;"></i><p>Inline preview is not supported for this file type.</p><a href="${safeUrl}" target="_blank" rel="noopener noreferrer" style="color:#6d28d9;font-weight:700;">Open or download document</a></div>`;
            }
            preview.style.display = 'block';
            preview.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        } catch (error) {
            console.error(`[${MODULE}] Attachment open failed`, error);
            showModuleToast(
                error?.message || 'Unable to open attachment.',
                'error'
            );
        }
    }

    function getReviewComment() {
        return String(getElement('lrrReviewComment')?.value || '').trim();
    }


    async function sendLecturerApprovalEmail(row) {
        const client=getSupabaseClient();
        const recipient=String(row?.lecturer_email||'').trim();
        if(!client?.auth?.getSession||!recipient)return {success:false,error:'Lecturer email address or authenticated session is unavailable.'};
        const {data,error:sessionError}=await client.auth.getSession();
        const token=data?.session?.access_token;
        if(sessionError||!token)return {success:false,error:'Administrator session is unavailable.'};
        const subject='Teaching portfolio submission approved - NCHSM';
        const html='<div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;padding:24px;color:#172033"><h2 style="color:#0f766e">Submission approved</h2><p>Dear '+escapeHtml(row.lecturer_name||'Lecturer')+',</p><p>Your teaching portfolio submission has been approved by the School administration.</p><p><b>Document:</b> '+escapeHtml(row.title||humanize(row.document_type))+'<br><b>Unit:</b> '+escapeHtml(row.unit_name||'—')+'</p><p>Log in to NCHSM Digital Campus to view the review record.</p><p>Nakuru College of Health Sciences &amp; Management</p></div>';
        const response=await fetch('https://lwhtjozfsmbyihenfunw.supabase.co/functions/v1/send-email',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({to:recipient,subject,html,from:'NCHSM Academic Office <noreply@nchsm.co.ke>'})});
        const result=await response.json().catch(()=>({}));
        return response.ok&&result.success?{success:true}:{success:false,error:result.error||'Email service rejected the request.'};
    }

    async function performReview(action, options = {}) {
        const row = state.selectedSubmission;

        if (!row) {
            showModuleToast('No report is currently selected.', 'error');
            return;
        }

        if (options.requireComment && !getReviewComment()) {
            showModuleToast(
                options.commentMessage || 'Please enter review comments first.',
                'warning'
            );
            getElement('lrrReviewComment')?.focus();
            return;
        }

        if (!(await assertAdmin())) return;

        const client = getSupabaseClient();
        if (!client) {
            showModuleToast('Supabase client is unavailable.', 'error');
            return;
        }

        const user = state.currentUser;
        const profile = await getCurrentProfile(user);

        const reviewerName =
            profile?.full_name ||
            user?.user_metadata?.full_name ||
            user?.email ||
            'Administrator';

        const comments = getReviewComment();

        setActionButtonsDisabled(true);

        try {
            /*
             * First create the review-history row.
             */
            const { error: reviewError } = await client
                .from(TABLE_REVIEWS)
                .insert({
                    submission_id: row.id,
                    reviewer_user_id: user.id,
                    reviewer_name: reviewerName,
                    action,
                    comments: comments || null
                });

            if (reviewError) throw reviewError;

            /*
             * Then update the current submission state.
             *
             * reviewer_user_id/name are deliberately stored on the
             * submission as the latest/current reviewer.
             */
            const updatePayload = {
                status: options.status,
                reviewer_user_id: user.id,
                reviewer_name: reviewerName,
                reviewer_comments: comments || null,
                reviewed_at: new Date().toISOString()
            };

            if (options.status === 'approved') {
                updatePayload.approved_at = new Date().toISOString();
            }

            const { data: updated, error: updateError } = await client
                .from(TABLE_SUBMISSIONS)
                .update(updatePayload)
                .eq('id', row.id)
                .select()
                .single();

            if (updateError) throw updateError;

            state.selectedSubmission = updated || {
                ...row,
                ...updatePayload
            };

            const index = state.rows.findIndex(
                item => String(item.id) === String(row.id)
            );

            if (index >= 0) {
                state.rows[index] = state.selectedSubmission;
            }

            await loadReviewHistory(row.id);
            updateCounters();
            applyFilters();
            renderReviewModal();

            const messages = {
                under_review: 'Report moved to Under Review.',
                returned: 'Report returned to the lecturer for correction.',
                approved: 'Report approved successfully.',
                rejected: 'Report rejected.'
            };

            let emailNotice = '';
            if (options.status === 'approved') {
                const mailResult = await sendLecturerApprovalEmail(state.selectedSubmission || updated || row);
                emailNotice = mailResult.success ? ' Lecturer email sent.' : ' Approval saved; email could not be sent: ' + mailResult.error;
            }

            showModuleToast(
                messages[options.status] || 'Review action completed.',
                options.status === 'approved' ? 'success' : 'info'
            );
            if (emailNotice) showModuleToast(emailNotice, emailNotice.includes('sent') ? 'success' : 'warning');

            if (typeof window.refreshLecturerReportsReview === 'function') {
                window.refreshLecturerReportsReview();
            }
        } catch (error) {
            console.error(`[${MODULE}] Review action failed`, error);

            showModuleToast(
                error?.message || 'The review action could not be completed.',
                'error'
            );
        } finally {
            setActionButtonsDisabled(false);
        }
    }

    function setActionButtonsDisabled(disabled) {
        const modal = getElement('lecturerReportsReviewModal');
        if (!modal) return;

        modal.querySelectorAll('button').forEach(button => {
            if (button.id === 'lrrCloseButton') return;

            button.disabled = disabled;

            if (disabled) {
                button.style.opacity = '0.55';
                button.style.cursor = 'wait';
            } else {
                button.style.opacity = '';
                button.style.cursor = '';
            }
        });
    }

    function setUnderReview() {
        performReview('under_review', {
            status: 'under_review',
            requireComment: false
        });
    }

    function returnForCorrection() {
        performReview('returned', {
            status: 'returned',
            requireComment: true,
            commentMessage: 'Please explain what needs to be corrected before returning the report.'
        });
    }

    function approve() {
        performReview('approved', {
            status: 'approved',
            requireComment: false
        });
    }

    function reject() {
        performReview('rejected', {
            status: 'rejected',
            requireComment: true,
            commentMessage: 'Please provide a reason before rejecting the report.'
        });
    }

    function closeModal() {
        const modal = getElement('lecturerReportsReviewModal');
        if (modal) modal.style.display = 'none';

        state.selectedSubmission = null;
        state.selectedAttachments = [];
        state.selectedReviews = [];
    }

    function bindFilters() {
        if (state.filtersBound) return;

        const ids = [
            'lrrReportTypeFilter',
            'lrrDocumentTypeFilter',
            'lrrProgramFilter',
            'lrrBlockFilter',
            'lrrYearFilter',
            'lrrStatusFilter'
        ];

        ids.forEach(id => {
            const el = getElement(id);
            if (el) {
                el.addEventListener('change', applyFilters);
            }
        });

        const search =
            getElement('lrrSearch') ||
            getElement('lecturerReportsReviewSearch');

        if (search) {
            let timer;

            search.addEventListener('input', () => {
                clearTimeout(timer);
                timer = setTimeout(applyFilters, 150);
            });
        }

        state.filtersBound = true;
    }

    function bindGlobalRefresh() {
        window.refreshLecturerReportsReview = loadReports;
        window.loadLecturerReportsReview = loadReports;
        window.filterLecturerReportsReview = applyFilters;
    }

    function initialize() {
        injectStyles();
        injectManagementDashboard();
        bindFilters();
        bindGlobalRefresh();

        /*
         * The section may be hidden when the dashboard first loads.
         * Loading here is still safe because RLS protects the query.
         */
        setTimeout(() => {
            if (getElement('lecturerReportsReviewTable')) {
                loadReports();
            }
        }, 900);
    }

    function injectStyles() {
        if (getElement('lecturerReportsReviewStyles')) return;

        const style = document.createElement('style');
        style.id = 'lecturerReportsReviewStyles';

        style.textContent = `
            @keyframes lrrSpin {
                to { transform: rotate(360deg); }
            }

            @media (max-width: 850px) {
                #lecturerReportsReviewModal > div:last-child {
                    width:96vw !important;
                }

                #lrrModalContent > div:last-child {
                    grid-template-columns:1fr !important;
                }
            }

            #lecturerReportsReviewModal button:hover {
                filter:brightness(.97);
            }

            #lecturerReportsReviewModal textarea:focus,
            #lecturerReportsReviewModal input:focus,
            #lecturerReportsReviewModal select:focus {
                border-color:#8b5cf6 !important;
                box-shadow:0 0 0 3px rgba(139,92,246,.10);
            }
        `;


        style.textContent += `
            /* NCHSM Teaching & Learning workspace refresh */
            #lrrManagementDashboard{font-family:Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;color:#14263b}
            #lrrManagementDashboard .lrr-hero{min-height:174px;padding:28px 30px;border-radius:22px;background:radial-gradient(circle at 85% 10%,rgba(48,193,178,.30),transparent 34%),linear-gradient(120deg,#082a49 0%,#0b4962 58%,#087f78 100%);box-shadow:0 18px 42px rgba(8,42,73,.18)}
            #lrrManagementDashboard .lrr-hero h3{font-size:clamp(23px,3vw,30px);letter-spacing:-.045em}
            #lrrManagementDashboard .lrr-subnav{padding:7px;border-radius:14px;box-shadow:0 5px 18px rgba(16,42,67,.045)}
            #lrrManagementDashboard .lrr-subtab{padding:10px 15px;border-radius:10px;transition:background .18s,transform .18s}
            #lrrManagementDashboard .lrr-subtab:hover{transform:translateY(-1px)}
            #lrrManagementDashboard .lrr-school-grid{gap:13px;margin:15px 0}
            #lrrManagementDashboard .lrr-school{border-radius:17px;padding:17px;min-height:92px;box-shadow:0 5px 18px rgba(16,42,67,.045);transition:transform .18s,box-shadow .18s,border-color .18s}
            #lrrManagementDashboard .lrr-school:hover,#lrrManagementDashboard .lrr-stat:hover{transform:translateY(-2px);box-shadow:0 12px 26px rgba(16,42,67,.09)}
            #lrrManagementDashboard .lrr-school.active{border:1.5px solid #0f8b82;background:linear-gradient(135deg,#effcf9,#fff)}
            #lrrManagementDashboard .lrr-school .ico{width:46px;height:46px;border-radius:14px;background:#e5f4f7;color:#0d687c}
            #lrrManagementDashboard .lrr-school strong{font-size:25px;letter-spacing:-.04em}
            #lrrManagementDashboard .lrr-stat-grid{gap:12px;margin:14px 0}
            #lrrManagementDashboard .lrr-stat{border-radius:16px;padding:17px;box-shadow:0 4px 16px rgba(16,42,67,.035);transition:transform .18s,box-shadow .18s}
            #lrrManagementDashboard .lrr-stat span{font-size:10px;letter-spacing:.09em}
            #lrrManagementDashboard .lrr-stat strong{font-size:29px;letter-spacing:-.04em;color:#102f50}
            #lrrManagementDashboard .lrr-analytics{padding:19px;border-radius:17px;box-shadow:0 5px 20px rgba(16,42,67,.04)}
            #lrrManagementDashboard .lrr-chart-card{padding:15px;border-radius:14px;background:linear-gradient(180deg,#fff,#fbfdff)}
            #lrrManagementDashboard .lrr-toolbar{padding:14px;border-radius:15px;box-shadow:0 4px 16px rgba(16,42,67,.035)}
            #lrrManagementDashboard .lrr-chip{padding:9px 15px;transition:all .18s}
            #lrrManagementDashboard .lrr-chip.active{background:#0b3856;border-color:#0b3856;box-shadow:0 4px 10px rgba(11,56,86,.16)}
            #lrrManagementDashboard .lrr-deadline{grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;padding:18px;background:#f8fbfd;border:1px solid #e8eef3;border-radius:15px}
            #lrrManagementDashboard .lrr-deadline label{font-size:11px!important;font-weight:750;color:#526579!important}
            #lrrManagementDashboard .lrr-deadline select,#lrrManagementDashboard .lrr-deadline input{height:46px;margin-top:7px;border:1px solid #d6e0e8;border-radius:11px;background:#fff;padding:0 12px;font-size:13px}
            #lrrManagementDashboard .lrr-deadline select:focus,#lrrManagementDashboard .lrr-deadline input:focus,#lrrManagementDashboard input:focus,#lrrManagementDashboard select:focus{outline:0;border-color:#0f8b82;box-shadow:0 0 0 3px rgba(15,139,130,.12)}
            #lrrManagementDashboard .lrr-deadline .lrr-primary{height:46px;align-self:end;border-radius:11px;background:linear-gradient(120deg,#0b6d70,#0e9487);box-shadow:0 6px 14px rgba(15,118,110,.18)}
            #lrrManagementDashboard .lrr-folder-note{font-size:13px;margin:8px 0 13px}
            #lrrManagementDashboard .lrr-folder-grid{display:block;margin:10px 0 18px}
            #lrrManagementDashboard .lrr-drive-school{margin:14px 0 18px;padding:17px;border:1px solid #e4ebf1;border-radius:17px;background:#fff;box-shadow:0 5px 18px rgba(16,42,67,.035)}
            #lrrManagementDashboard .lrr-drive-school-head{display:flex;align-items:center;gap:12px;padding-bottom:14px;border-bottom:1px solid #edf1f5}
            #lrrManagementDashboard .lrr-drive-school-icon{display:grid;place-items:center;width:42px;height:42px;border-radius:13px;background:#e8f5f7;color:#0b7180;font-size:19px}
            #lrrManagementDashboard .lrr-drive-school-head strong{display:block;font-size:15px;color:#142d43}
            #lrrManagementDashboard .lrr-drive-school-head small{display:block;margin-top:3px;color:#718096;font-size:11px}
            #lrrManagementDashboard .lrr-drive-school-count{margin-left:auto;padding:5px 10px;border-radius:20px;background:#eef6f7;color:#176d78;font-size:11px;font-weight:800}
            #lrrManagementDashboard .lrr-drive-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;padding-top:14px}
            #lrrManagementDashboard .lrr-drive-folder{display:flex;align-items:center;gap:11px;width:100%;min-width:0;padding:13px;border:1px solid #e8edf2;border-radius:13px;background:#fbfdff;text-align:left;transition:all .18s}
            #lrrManagementDashboard .lrr-drive-folder:hover{border-color:#83c9c3;background:#f2fbfa;transform:translateY(-2px);box-shadow:0 8px 18px rgba(16,42,67,.07)}
            #lrrManagementDashboard .lrr-drive-folder-icon{display:grid;place-items:center;flex:0 0 38px;height:38px;border-radius:11px;background:#eaf3ff;font-size:20px}
            #lrrManagementDashboard .lrr-drive-folder-copy{min-width:0;flex:1}
            #lrrManagementDashboard .lrr-drive-folder-copy strong{display:block;color:#20364a;font-size:12px;line-height:1.4;overflow-wrap:anywhere}
            #lrrManagementDashboard .lrr-drive-folder-copy small{display:block;margin-top:4px;color:#718096;font-size:10px}
            #lrrManagementDashboard .lrr-drive-chevron{color:#91a2b1;font-size:23px}
            #lrrManagementDashboard .lrr-drive-open{margin:12px 0 17px;padding:18px;border:1px solid #dce8ee;border-radius:17px;background:#fff;box-shadow:0 10px 26px rgba(16,42,67,.07)}
            #lrrManagementDashboard .lrr-drive-open-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;padding-bottom:14px;border-bottom:1px solid #edf1f5}
            #lrrManagementDashboard .lrr-drive-back{border:0;background:transparent;color:#0e817c;font-size:11px;font-weight:800;padding:0 0 10px}
            #lrrManagementDashboard .lrr-drive-open h3{margin:0;color:#17334b;font-size:19px}
            #lrrManagementDashboard .lrr-drive-open p{margin:5px 0 0;color:#718096;font-size:12px}
            #lrrManagementDashboard .lrr-drive-pill{padding:6px 10px;border-radius:20px;background:#eef8f6;color:#0e817c;font-size:11px;font-weight:800}
            #lrrManagementDashboard .lrr-drive-files{display:grid;gap:7px;padding-top:12px}
            #lrrManagementDashboard .lrr-drive-file{display:flex;align-items:center;gap:12px;width:100%;padding:12px;border:1px solid #edf1f5;border-radius:12px;background:#fff;text-align:left}
            #lrrManagementDashboard .lrr-drive-file:hover{background:#f7fbfd;border-color:#cbdde4}
            #lrrManagementDashboard .lrr-drive-file-icon{font-size:20px}
            #lrrManagementDashboard .lrr-drive-file>span:nth-child(2){flex:1;min-width:0}
            #lrrManagementDashboard .lrr-drive-file strong{display:block;color:#20364a;font-size:12px}
            #lrrManagementDashboard .lrr-drive-file small{display:block;margin-top:4px;color:#718096;font-size:10px;overflow-wrap:anywhere}
            #lrrManagementDashboard .lrr-drive-file-status{font-size:10px}
            #lrrManagementDashboard .lrr-drive-empty{padding:28px;text-align:center;border:1px dashed #cbd8e1;border-radius:15px;color:#718096;background:#fbfdff}
            #lrrManagementDashboard #lecturerReportsReviewTable{border:1px solid #e5ebf0;border-radius:15px;background:#fff;overflow:hidden}
            #lrrManagementDashboard #lecturerReportsReviewTable table{min-width:900px}
            @media(max-width:850px){
              #lrrManagementDashboard .lrr-drive-grid{grid-template-columns:repeat(2,minmax(0,1fr))}
              #lrrManagementDashboard .lrr-deadline{grid-template-columns:repeat(2,minmax(0,1fr))}
              #lrrManagementDashboard .lrr-deadline label:first-child{grid-column:1/-1}
              #lrrManagementDashboard .lrr-deadline button{grid-column:1/-1}
            }
            @media(max-width:600px){
              #lrrManagementDashboard .lrr-hero{padding:20px;border-radius:17px}
              #lrrManagementDashboard .lrr-hero-actions{justify-content:space-between}
              #lrrManagementDashboard .lrr-school-grid{grid-template-columns:repeat(2,minmax(0,1fr))}
              #lrrManagementDashboard .lrr-school-grid [data-school=""]{grid-column:1/-1}
              #lrrManagementDashboard .lrr-stat-grid{grid-template-columns:repeat(2,minmax(0,1fr))}
              #lrrManagementDashboard .lrr-stat:last-child{grid-column:1/-1}
              #lrrManagementDashboard .lrr-deadline{grid-template-columns:1fr;padding:13px}
              #lrrManagementDashboard .lrr-deadline label:first-child,#lrrManagementDashboard .lrr-deadline button{grid-column:auto}
              #lrrManagementDashboard .lrr-drive-grid{grid-template-columns:1fr}
              #lrrManagementDashboard .lrr-drive-school{padding:13px}
              #lrrManagementDashboard .lrr-drive-file{align-items:flex-start}
              #lrrManagementDashboard .lrr-drive-file-status{display:none}
              #lrrManagementDashboard .lrr-subnav{position:relative}
              #lrrManagementDashboard .lrr-toolbar{align-items:stretch}
              #lrrManagementDashboard .lrr-chip{flex:1 1 auto}
              #lrrManagementDashboard .lrr-analytics{padding:13px}
            }
        `;
        document.head.appendChild(style);
    }

    /*
     * Expose a small public API for the Super Admin HTML.
     */
    window.LecturerReportsReview = {
        init: initialize,
        load: loadReports,
        refresh: loadReports,
        filter: applyFilters,
        open: openSubmission,
        openAttachment,
        closeInlinePreview: function () {
            const preview = getElement('lrrInlinePreview');
            const body = getElement('lrrInlinePreviewBody');
            if (body) body.innerHTML = '';
            if (preview) preview.style.display = 'none';
        },
        close: closeModal,
        setUnderReview,
        returnForCorrection,
        approve,
        reject,
        getState: () => ({ ...state })
    };


    window.openNchsmReports = function (school) {
        activeSchool = school === 'Nursing' || school === 'TVET' ? school : '';
        quickStatus = '';
        const tabLink = document.querySelector('[data-tab="lecturer-reports-review"]');
        if (tabLink) tabLink.click();
        setTimeout(() => {
            renderManagementDashboard();
            applyFilters();
            const panel = getElement('lrrManagementDashboard');
            if (panel) panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 180);
    };

    /*
     * The existing Super Admin dashboard loads multiple modules through
     * separate script tags. Initialize after DOM is available.
     */
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }

    /*
     * Also listen for the dashboard tab changing to lecturer-reports-review.
     * This allows lazy refresh when the administrator actually opens it.
     */
    document.addEventListener('click', function (event) {
        const link = event.target.closest?.('[data-tab="lecturer-reports-review"]');
        if (!link) return;

        setTimeout(() => {
            loadReports();
        }, 100);
    });

    document.addEventListener('click', function (event) {
        const link = event.target.closest?.('[data-lrr-focus="deadlines"]');
        if (!link) return;
        setTimeout(() => getElement('lrrDeadlineForm')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 350);
    });

    console.log(`✅ ${MODULE} module loaded.`);
})();
