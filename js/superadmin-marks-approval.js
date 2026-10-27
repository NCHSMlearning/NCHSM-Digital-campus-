/* NCHSM Marks Approval
 * Approval is deliberately independent from publication.
 * This module never writes published, published_at, or published_by.
 */
(function () {
  'use strict';

  let pendingMarks = [];
  let loading = false;

  function db() {
    return window.sb || window.db?.supabase || window.supabase || null;
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, ch => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[ch]));
  }

  function notify(message, type) {
    if (typeof window.showNotification === 'function') window.showNotification(message, type || 'info');
    else window.alert(message);
  }

  function currentUserId() {
    return window.currentUser?.id || window.getCurrentUser?.()?.id || null;
  }

  function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = String(value);
  }

  function populateFilter(id, values, label) {
    const el = document.getElementById(id);
    if (!el) return;
    const previous = el.value || 'all';
    el.innerHTML = '<option value="all">' + escapeHtml(label) + '</option>' +
      values.map(v => '<option value="' + escapeHtml(v) + '">' + escapeHtml(v) + '</option>').join('');
    el.value = values.includes(previous) ? previous : 'all';
  }

  function filteredMarks() {
    const search = (document.getElementById('marksApprovalSearch')?.value || '').trim().toLowerCase();
    const subject = document.getElementById('marksApprovalSubjectFilter')?.value || 'all';
    const block = document.getElementById('marksApprovalBlockFilter')?.value || 'all';
    return pendingMarks.filter(m => {
      const haystack = [m.student_name, m.admission_number, m.subject_name, m.block, m.program].join(' ').toLowerCase();
      return (!search || haystack.includes(search)) &&
        (subject === 'all' || m.subject_name === subject) &&
        (block === 'all' || m.block === block);
    });
  }

  function renderMarksApprovals() {
    const container = document.getElementById('marksApprovalTableContainer');
    if (!container) return;
    const rows = filteredMarks();
    setText('pendingMarksCount', pendingMarks.length);
    setText('pendingSubjectsCount', new Set(pendingMarks.map(m => m.subject_name).filter(Boolean)).size);
    setText('marksFilterCount', rows.length);

    if (!rows.length) {
      container.innerHTML = '<div style="text-align:center;padding:36px;color:#64748b"><strong>No pending marks found.</strong><p style="margin:8px 0 0">Approved marks remain unpublished until you explicitly publish them.</p></div>';
      return;
    }

    container.innerHTML = '<table style="width:100%;border-collapse:collapse;min-width:850px">' +
      '<thead><tr style="background:#f8fafc;text-align:left">' +
      ['Student / Admission','Unit','Block','Program','Assessment','Score','Approval','Actions'].map(h =>
        '<th style="padding:12px;border-bottom:1px solid #e2e8f0">' + h + '</th>').join('') +
      '</tr></thead><tbody>' + rows.map(m => {
        const score = m.final_score === null || m.final_score === undefined ? '—' : escapeHtml(m.final_score);
        return '<tr>' +
          '<td style="padding:12px;border-bottom:1px solid #e2e8f0"><strong>' + escapeHtml(m.student_name || 'Unknown') + '</strong><br><small>' + escapeHtml(m.admission_number || '') + '</small></td>' +
          '<td style="padding:12px;border-bottom:1px solid #e2e8f0">' + escapeHtml(m.subject_name || '—') + '</td>' +
          '<td style="padding:12px;border-bottom:1px solid #e2e8f0">' + escapeHtml(m.block || '—') + '</td>' +
          '<td style="padding:12px;border-bottom:1px solid #e2e8f0">' + escapeHtml(m.program || '—') + '</td>' +
          '<td style="padding:12px;border-bottom:1px solid #e2e8f0">' + escapeHtml(m.assessment_type || 'full') + '</td>' +
          '<td style="padding:12px;border-bottom:1px solid #e2e8f0;font-weight:700">' + score + '</td>' +
          '<td style="padding:12px;border-bottom:1px solid #e2e8f0"><span style="background:#fef3c7;color:#92400e;padding:3px 8px;border-radius:10px">Pending</span></td>' +
          '<td style="padding:12px;border-bottom:1px solid #e2e8f0;white-space:nowrap">' +
          '<button type="button" onclick="approvePendingMark(\'' + escapeHtml(m.id) + '\')" style="background:#059669;color:white;border:0;border-radius:6px;padding:7px 10px;cursor:pointer">Approve</button> ' +
          '<button type="button" onclick="rejectPendingMark(\'' + escapeHtml(m.id) + '\')" style="background:#dc2626;color:white;border:0;border-radius:6px;padding:7px 10px;cursor:pointer">Reject</button>' +
          '</td></tr>';
      }).join('') + '</tbody></table>';
  }

  async function refreshStats(client) {
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
    const month = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();
    const [approved, rejected] = await Promise.all([
      client.from('student_marks').select('id', { count: 'exact', head: true })
        .eq('approval_status', 'approved').gte('approved_at', start),
      client.from('student_marks').select('id', { count: 'exact', head: true })
        .eq('approval_status', 'rejected').gte('updated_at', month)
    ]);
    setText('approvedMarksToday', approved.error ? '—' : (approved.count || 0));
    setText('rejectedMarksCount', rejected.error ? '—' : (rejected.count || 0));
  }

  window.loadMarksApprovals = async function () {
    if (loading) return;
    const client = db();
    const container = document.getElementById('marksApprovalTableContainer');
    if (!client) {
      if (container) container.innerHTML = '<p style="padding:24px;color:#b91c1c">Database connection unavailable. Please refresh the page.</p>';
      return;
    }
    loading = true;
    if (container) container.innerHTML = '<p style="padding:28px;text-align:center;color:#64748b">Loading pending marks…</p>';
    try {
      const result = await client.from('student_marks')
        .select('id, admission_number, student_name, student_id, block, subject_name, assessment_type, final_score, grade, academic_year, program, approval_status, published, created_at, submitted_at')
        .eq('approval_status', 'pending')
        .order('submitted_at', { ascending: true });
      if (result.error) throw result.error;
      pendingMarks = result.data || [];
      populateFilter('marksApprovalSubjectFilter', [...new Set(pendingMarks.map(m => m.subject_name).filter(Boolean))].sort(), 'All Subjects');
      populateFilter('marksApprovalBlockFilter', [...new Set(pendingMarks.map(m => m.block).filter(Boolean))].sort(), 'All Blocks');
      renderMarksApprovals();
      await refreshStats(client);
    } catch (error) {
      console.error('[Marks Approval] Load failed:', error);
      if (container) container.innerHTML = '<p style="padding:24px;color:#b91c1c">Could not load pending marks: ' + escapeHtml(error.message || 'Database error') + '</p>';
      notify('Could not load pending marks. Check the database connection and permissions.', 'error');
    } finally {
      loading = false;
    }
  };

  window.filterMarksApprovals = function () { renderMarksApprovals(); };

  async function updateApproval(id, status, reason) {
    const client = db();
    if (!client) throw new Error('Database connection unavailable');
    const patch = { approval_status: status, updated_at: new Date().toISOString() };
    if (status === 'approved') {
      patch.approved_at = new Date().toISOString();
      patch.approved_by = currentUserId();
      patch.rejection_reason = null;
    } else {
      patch.approved_at = null;
      patch.approved_by = null;
      patch.rejection_reason = reason || 'Rejected by Super Admin';
    }
    // Intentionally do not include any publication field in this update.
    const result = await client.from('student_marks').update(patch)
      .eq('id', id).eq('approval_status', 'pending').select('id');
    if (result.error) throw result.error;
    if (!result.data?.length) throw new Error('This mark is no longer pending. Refresh and try again.');
  }

  window.approvePendingMark = async function (id) {
    try {
      await updateApproval(id, 'approved');
      notify('Mark approved. It remains unpublished until you publish it separately.', 'success');
      await window.loadMarksApprovals();
    } catch (error) {
      console.error('[Marks Approval] Approve failed:', error);
      notify(error.message || 'Could not approve mark.', 'error');
    }
  };

  window.rejectPendingMark = async function (id) {
    const reason = window.prompt('Reason for rejecting this mark (optional):', 'Please review and resubmit');
    if (reason === null) return;
    try {
      await updateApproval(id, 'rejected', reason.trim());
      notify('Mark rejected. Publication state was not changed.', 'success');
      await window.loadMarksApprovals();
    } catch (error) {
      console.error('[Marks Approval] Reject failed:', error);
      notify(error.message || 'Could not reject mark.', 'error');
    }
  };

  window.approveAllPendingMarks = async function () {
    const client = db();
    if (!client) return notify('Database connection unavailable.', 'error');
    const rows = filteredMarks();
    if (!rows.length) return notify('There are no pending marks in the current view.', 'info');
    if (!window.confirm('Approve ' + rows.length + ' pending marks? This will NOT publish them.')) return;
    let success = 0, failed = 0;
    for (const row of rows) {
      try { await updateApproval(row.id, 'approved'); success++; }
      catch (error) { failed++; console.error('[Marks Approval] Batch approve failed:', row.id, error); }
    }
    notify('Approved ' + success + ' marks. They remain unpublished.' + (failed ? ' ' + failed + ' failed; refresh and retry.' : ''), failed ? 'warning' : 'success');
    await window.loadMarksApprovals();
  };

  window.rejectAllPendingMarks = async function () {
    const rows = filteredMarks();
    if (!rows.length) return notify('There are no pending marks in the current view.', 'info');
    if (!window.confirm('Reject ' + rows.length + ' pending marks in the current view?')) return;
    const reason = window.prompt('Reason for rejecting these marks (optional):', 'Please review and resubmit');
    if (reason === null) return;
    let success = 0, failed = 0;
    for (const row of rows) {
      try { await updateApproval(row.id, 'rejected', reason.trim()); success++; }
      catch (error) { failed++; console.error('[Marks Approval] Batch reject failed:', row.id, error); }
    }
    notify('Rejected ' + success + ' marks.' + (failed ? ' ' + failed + ' failed; refresh and retry.' : ''), failed ? 'warning' : 'success');
    await window.loadMarksApprovals();
  };

  document.addEventListener('DOMContentLoaded', function () {
    const section = document.getElementById('marks-approval');
    if (section && (section.classList.contains('active') || section.style.display !== 'none')) {
      window.loadMarksApprovals();
    }
    document.querySelectorAll('[data-tab="marks-approval"]').forEach(link => {
      link.addEventListener('click', () => setTimeout(() => window.loadMarksApprovals(), 100));
    });
  });
})();
