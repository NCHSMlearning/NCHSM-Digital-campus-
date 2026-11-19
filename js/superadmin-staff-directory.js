/* Super Admin Staff Directory
 * Read-only directory backed by staff_records. Sensitive payroll, banking,
 * identity-document and password fields are deliberately never selected.
 * Mutations are kept disabled until secure account provisioning replaces the
 * legacy client-side Base64 password workflow.
 */
(() => {
  'use strict';
  const state = { rows: [], initialized: false, loading: false };
  const $ = (id) => document.getElementById(id);
  const escapeText = (value) => String(value ?? '');

  function setText(id, value) {
    const node = $(id);
    if (node) node.textContent = String(value);
  }

  function render() {
    const body = $('staffDirectoryBody');
    if (!body) return;
    const search = ($('staffDirectorySearch')?.value || '').trim().toLowerCase();
    const department = $('staffDirectoryDepartment')?.value || 'all';
    const status = $('staffDirectoryStatus')?.value || 'all';
    const program = $('staffDirectoryProgram')?.value || 'all';
    const filtered = state.rows.filter((row) => {
      const haystack = [row.id, row.first_name, row.other_names, row.email, row.phone, row.department, row.designation]
        .map(escapeText).join(' ').toLowerCase();
      return (!search || haystack.includes(search))
        && (department === 'all' || row.department === department)
        && (status === 'all' || row.status === status)
        && (program === 'all' || (row.program || 'KRCHN') === program);
    });

    body.replaceChildren();
    if (!filtered.length) {
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.colSpan = 6;
      td.className = 'staff-directory-empty';
      td.textContent = state.rows.length ? 'No staff match these filters.' : 'No staff records are available.';
      tr.appendChild(td);
      body.appendChild(tr);
      setText('staffDirectoryResultCount', '0 records');
      return;
    }

    filtered.forEach((staff) => {
      const tr = document.createElement('tr');
      const values = [
        [staff.title, staff.first_name, staff.other_names].filter(Boolean).join(' ') || '—',
        staff.id || '—',
        staff.department || '—',
        staff.designation || 'Staff',
        staff.email || '—',
        staff.phone || '—'
      ];
      values.forEach((value) => {
        const td = document.createElement('td');
        td.textContent = escapeText(value);
        tr.appendChild(td);
      });
      const statusCell = document.createElement('td');
      const badge = document.createElement('span');
      badge.className = 'staff-directory-status ' + (staff.status === 'active' ? 'is-active' : 'is-inactive');
      badge.textContent = staff.status === 'active' ? 'Active' : (staff.status || 'Inactive');
      statusCell.appendChild(badge);
      tr.appendChild(statusCell);
      body.appendChild(tr);
    });
    setText('staffDirectoryResultCount', filtered.length + (filtered.length === 1 ? ' record' : ' records'));
  }

  function updateFilters() {
    const departments = [...new Set(state.rows.map((row) => row.department).filter(Boolean))].sort();
    const select = $('staffDirectoryDepartment');
    if (select) {
      const current = select.value || 'all';
      select.replaceChildren(new Option('All departments', 'all'));
      departments.forEach((department) => select.add(new Option(department, department)));
      select.value = departments.includes(current) ? current : 'all';
    }
    setText('staffDirectoryTotal', state.rows.length);
    setText('staffDirectoryActive', state.rows.filter((row) => row.status === 'active').length);
    setText('staffDirectoryAcademic', state.rows.filter((row) => ['lecturer','tutor','clinical instructor'].includes(String(row.designation || '').toLowerCase())).length);
    setText('staffDirectoryDepartments', departments.length);
    render();
  }

  async function load() {
    const body = $('staffDirectoryBody');
    if (state.loading || !body) return;
    state.loading = true;
    body.innerHTML = '<tr><td colspan="7" class="staff-directory-empty">Loading staff directory…</td></tr>';
    try {
      const client = window.sb || window.supabase;
      if (!client) throw new Error('The database client is not ready. Refresh the page and try again.');
      const { data: userData, error: authError } = await client.auth.getUser();
      if (authError || !userData?.user) throw new Error('Your session has expired. Sign in again.');
      const { data, error } = await client
        .from('staff_records')
        .select('id,title,first_name,other_names,department,designation,email,phone,gender,program,status,login_enabled,created_at')
        .order('created_at', { ascending: false });
      if (error) throw error;
      state.rows = Array.isArray(data) ? data : [];
      updateFilters();
      setText('staffDirectoryError', '');
      setText('staffDirectoryUpdated', 'Updated ' + new Date().toLocaleString());
    } catch (error) {
      console.error('[Staff Directory]', error);
      state.rows = [];
      body.replaceChildren();
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.colSpan = 7;
      td.className = 'staff-directory-empty staff-directory-error';
      td.textContent = error.message || 'Unable to load staff records. Check your permissions.';
      tr.appendChild(td);
      body.appendChild(tr);
      setText('staffDirectoryError', error.message || 'Unable to load staff directory.');
      setText('staffDirectoryTotal', '—');
      setText('staffDirectoryActive', '—');
      setText('staffDirectoryAcademic', '—');
      setText('staffDirectoryDepartments', '—');
    } finally {
      state.loading = false;
    }
  }

  function exportCsv() {
    const columns = ['id','title','first_name','other_names','department','designation','email','phone','gender','program','status','created_at'];
    const rows = [columns, ...state.rows.map((row) => columns.map((key) => row[key] ?? ''))];
    const csv = rows.map((row) => row.map((value) => '"' + String(value).replace(/"/g, '""') + '"').join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'staff-directory-' + new Date().toISOString().slice(0,10) + '.csv';
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function init() {
    if (!state.initialized) {
      ['staffDirectorySearch','staffDirectoryDepartment','staffDirectoryStatus','staffDirectoryProgram'].forEach((id) => {
        const node = $(id);
        if (node) node.addEventListener(id === 'staffDirectorySearch' ? 'input' : 'change', render);
      });
      $('staffDirectoryRefresh')?.addEventListener('click', load);
      $('staffDirectoryExport')?.addEventListener('click', exportCsv);
      state.initialized = true;
    }
    load();
  }

  window.initStaffDirectory = init;
  window.loadStaffDirectory = load;
})();
