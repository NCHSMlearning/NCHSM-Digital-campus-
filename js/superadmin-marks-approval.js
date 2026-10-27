/* NCHSM Digital Campus — approval-only override for the existing Super Admin tab.
 * Loaded from superadmin.html after script.js. It reuses the existing UI and Supabase client.
 * Approval must NEVER publish marks; scores/grades are not updated.
 */
(function () {
  'use strict';

  const getDb = () => window.sb || window.supabase || null;
  let busy = false;

  async function approvePendingIds(ids, label) {
    const db = getDb();
    if (!db || typeof db.from !== 'function') {
      alert('Database connection is unavailable. Please refresh and try again.');
      return;
    }
    const uniqueIds = [...new Set((ids || []).filter(id => id !== undefined && id !== null).map(String))];
    if (!uniqueIds.length) {
      alert('No pending marks were found to approve.');
      return;
    }
    if (busy) return;
    if (!window.confirm('Approve ' + uniqueIds.length + ' pending mark record(s) ' + (label || '') + '?\n\nThis will NOT publish marks. Publication remains a separate action.')) return;

    busy = true;
    try {
      const now = new Date().toISOString();
      const { data, error } = await db.from('student_marks')
        .update({
          approval_status: 'approved',
          published: false,
          published_at: null,
          approved_at: now,
          approved_by: window.currentUser?.id || null
        })
        .in('id', uniqueIds)
        .eq('approval_status', 'pending')
        .select('id');

      if (error) throw error;
      const count = Array.isArray(data) ? data.length : 0;
      if (typeof window.loadMarksApprovals === 'function') {
        await window.loadMarksApprovals();
      }
      if (typeof window.updateMarksApprovalBadge === 'function') {
        await window.updateMarksApprovalBadge();
      }
      alert('Approved ' + count + ' mark record(s). They remain UNPUBLISHED. Use the separate Published Marks tab to publish when authorized.');
    } catch (error) {
      console.error('[Marks Approval] Approval failed:', error);
      alert('Approval failed: ' + (error?.message || 'Unknown database error') + '. Existing scores were not intentionally modified.');
    } finally {
      busy = false;
    }
  }

  // Replace the legacy approval actions with approval-only operations.
  window.approveMark = async function (id) {
    return approvePendingIds([id], 'for this student');
  };

  window.approveByUnit = async function (unitName) {
    const db = getDb();
    if (!db || typeof db.from !== 'function') {
      alert('Database connection is unavailable. Please refresh and try again.');
      return;
    }
    try {
      const { data, error } = await db.from('student_marks')
        .select('id')
        .eq('subject_name', unitName)
        .eq('approval_status', 'pending');
      if (error) throw error;
      return approvePendingIds((data || []).map(row => row.id), 'for unit "' + unitName + '"');
    } catch (error) {
      console.error('[Marks Approval] Could not find pending unit marks:', error);
      alert('Could not load pending marks for this unit: ' + (error?.message || 'Unknown database error'));
    }
  };

  window.approveAllPendingMarks = async function () {
    const db = getDb();
    if (!db || typeof db.from !== 'function') {
      alert('Database connection is unavailable. Please refresh and try again.');
      return;
    }
    try {
      const { data, error } = await db.from('student_marks')
        .select('id')
        .eq('approval_status', 'pending')
        .limit(5000);
      if (error) throw error;
      return approvePendingIds((data || []).map(row => row.id), 'across all pending marks');
    } catch (error) {
      console.error('[Marks Approval] Could not load pending marks:', error);
      alert('Could not load pending marks: ' + (error?.message || 'Unknown database error'));
    }
  };

  console.info('[Marks Approval] Approval-only handlers loaded. Publishing remains separate.');
})();
