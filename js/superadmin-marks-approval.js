/* NCHSM Digital Campus — Separate Marks Approval Centre
 * Approval never publishes marks. Publishing remains a separate workflow.
 * Requires the existing Supabase client to be exposed as window.supabaseClient
 * or window.supabase and RLS to enforce Super Admin permissions.
 */
(() => {
  'use strict';

  const $ = (selector) => document.querySelector(selector);
  const state = { rows: [], busy: false };
  const client = () => window.supabaseClient || window.supabase || null;
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[ch]);

  function notice(message, kind = 'info') {
    const el = $('#approvalNotice');
    if (!el) return;
    el.textContent = message;
    el.dataset.kind = kind;
    el.hidden = false;
  }

  function formatDate(value) {
    if (!value) return '—';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? esc(value) : date.toLocaleString();
  }

  function render() {
    const body = $('#approvalRows');
    if (!body) return;
    const term = ($('#approvalSearch')?.value || '').trim().toLowerCase();
    const status = $('#approvalStatus')?.value || 'pending';
    const rows = state.rows.filter((row) => {
      const haystack = [row.student_name, row.student_id, row.admission_number,
        row.subject_name, row.unit_name, row.program, row.block, row.semester]
        .filter(Boolean).join(' ').toLowerCase();
      return (!term || haystack.includes(term)) &&
        (status === 'all' || String(row.approval_status || 'pending').toLowerCase() === status);
    });

    body.innerHTML = rows.map((row) => {
      const id = esc(row.id);
      const student = row.student_name || row.student_id || row.admission_number || 'Student record';
      const unit = row.subject_name || row.unit_name || row.unit_code || '—';
      const score = row.marks ?? row.score ?? row.total_marks ?? row.final_score ?? '—';
      const approved = String(row.approval_status || '').toLowerCase() === 'approved';
      const published = row.published === true;
      return '<tr>' +
        '<td>' + esc(student) + '</td>' +
        '<td>' + esc(row.program || '—') + '</td>' +
        '<td>' + esc(row.block || row.semester || '—') + '</td>' +
        '<td>' + esc(unit) + '</td>' +
        '<td>' + esc(score) + '</td>' +
        '<td><span class="approval-pill">' + (approved ? 'Approved' : esc(row.approval_status || 'Pending')) + '</span></td>' +
        '<td>' + (published ? 'Published' : 'Not published') + '</td>' +
        '<td>' + (approved ? '—' : '<button type="button" class="approval-action" data-approve="' + id + '">Approve</button>') + '</td>' +
      '</tr>';
    }).join('');
    $('#approvalEmpty').hidden = rows.length !== 0;
    $('#approvalCount').textContent = String(rows.length);
    $('#approvalPendingCount').textContent = String(state.rows.filter(r => String(r.approval_status || 'pending').toLowerCase() === 'pending').length);
    $('#approvalApprovedCount').textContent = String(state.rows.filter(r => String(r.approval_status || '').toLowerCase() === 'approved').length);
  }

  async function loadMarks() {
    const db = client();
    if (!db || !db.from) {
      notice('Supabase client was not found. Connect this page to the existing application client before use.', 'error');
      return;
    }
    $('#approvalLoading').hidden = false;
    $('#approvalRows').innerHTML = '';
    try {
      const { data, error } = await db.from('student_marks').select('*').order('created_at', { ascending: false }).limit(1000);
      if (error) throw error;
      state.rows = Array.isArray(data) ? data : [];
      render();
      notice('Loaded ' + state.rows.length + ' mark records. Approval does not publish marks.', 'success');
    } catch (error) {
      notice('Could not load marks: ' + (error?.message || 'Unknown database error') + '. Check table access and Row Level Security.', 'error');
    } finally {
      $('#approvalLoading').hidden = true;
    }
  }

  async function approveIds(ids) {
    const db = client();
    if (!db || state.busy || !ids.length) return;
    if (!window.confirm('Approve ' + ids.length + ' pending mark record(s)? This will NOT publish them.')) return;
    state.busy = true;
    const btns = document.querySelectorAll('[data-approve], #approvePendingBatch');
    btns.forEach((button) => { button.disabled = true; });
    try {
      // Explicitly preserve the separate publication state; do not change marks/scores.
      const now = new Date().toISOString();
      const { data, error } = await db.from('student_marks')
        .update({
          approval_status: 'approved',
          published: false,
          published_at: null,
          approved_at: now,
          approved_by: window.currentUser?.id || null
        })
        .in('id', ids)
        .eq('approval_status', 'pending')
        .select('id');
      if (error) throw error;
      const updated = new Set((data || []).map((row) => String(row.id)));
      state.rows = state.rows.map((row) => updated.has(String(row.id))
        ? { ...row, approval_status: 'approved', published: false, published_at: null, approved_at: now }
        : row);
      render();
      notice('Approved ' + updated.size + ' record(s). They remain unpublished; use the separate publication workflow when authorized.', 'success');
    } catch (error) {
      notice('Approval failed: ' + (error?.message || 'Unknown database error') + '. No marks or scores were intentionally changed.', 'error');
    } finally {
      state.busy = false;
      btns.forEach((button) => { button.disabled = false; });
    }
  }

  document.addEventListener('click', (event) => {
    const button = event.target.closest('[data-approve]');
    if (button) approveIds([button.dataset.approve]);
  });
  $('#approvalSearch')?.addEventListener('input', render);
  $('#approvalStatus')?.addEventListener('change', render);
  $('#refreshApproval')?.addEventListener('click', loadMarks);
  $('#approvePendingBatch')?.addEventListener('click', () => {
    const ids = state.rows
      .filter((row) => String(row.approval_status || 'pending').toLowerCase() === 'pending')
      .map((row) => row.id).filter((id) => id !== undefined && id !== null);
    approveIds(ids);
  });

  document.addEventListener('DOMContentLoaded', loadMarks);
  if (document.readyState !== 'loading') loadMarks();
})();
