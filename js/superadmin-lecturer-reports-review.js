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
            state.filteredRows = [...state.rows];

            populateFilters();
            updateCounters();
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

    function populateFilters() {
        const typeSelect = getElement('lrrReportTypeFilter');
        const programSelect = getElement('lrrProgramFilter');
        const blockSelect = getElement('lrrBlockFilter');
        const yearSelect = getElement('lrrYearFilter');
        const statusSelect = getElement('lrrStatusFilter');

        const preserve = {
            type: typeSelect?.value || '',
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

        if (programSelect) {
            const values = unique('program');

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
        const program = getFilterValue('lrrProgramFilter');
        const block = getFilterValue('lrrBlockFilter');
        const year = getFilterValue('lrrYearFilter');
        const status = getFilterValue('lrrStatusFilter');

        state.filteredRows = state.rows.filter(row => {
            if (reportType && row.report_type !== reportType) return false;
            if (program && row.program !== program) return false;
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

    function updateCounters() {
        const counts = {
            submitted: 0,
            under_review: 0,
            returned: 0,
            approved: 0
        };

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

        setCounter([
            'lrrTotalCount',
            'lecturerReportsTotalCount'
        ], state.rows.length);
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
                    <i class="fas fa-external-link-alt"></i> Open
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
        const file = state.selectedAttachments.find(item => String(item.id) === String(id));

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

            window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
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

            showModuleToast(
                messages[options.status] || 'Review action completed.',
                options.status === 'approved' ? 'success' : 'info'
            );

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
        close: closeModal,
        setUnderReview,
        returnForCorrection,
        approve,
        reject,
        getState: () => ({ ...state })
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

    console.log(`✅ ${MODULE} module loaded.`);
})();
