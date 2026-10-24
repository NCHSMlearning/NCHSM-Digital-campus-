/* Super Admin pending-rejection fix.
 * This runs after the dashboard scripts and overrides only the Reject action.
 * Rejection deletes the pending profile row; only an audit event is retained.
 */
(function () {
  'use strict';

  function getClient() {
    try {
      if (typeof window.getSb === 'function') {
        const client = window.getSb();
        if (client) return client;
      }
    } catch (_) {}
    return window.sb || window.supabaseClient || window.NCHSMLogin?.supabase || null;
  }

  function feedback(message, type) {
    if (typeof window.showFeedback === 'function') {
      window.showFeedback(message, type || 'info');
    } else if (typeof window.showToast === 'function') {
      window.showToast(message, type || 'info');
    } else {
      window.alert(message);
    }
  }

  async function rejectPendingProfile(userId, fullName, isRejection) {
    // Keep normal Delete actions owned by the existing dashboard handler.
    if (!isRejection) {
      feedback('Use the regular Delete action for non-pending users.', 'warning');
      return;
    }
    if (!userId) {
      feedback('Missing user ID. Nothing was deleted.', 'error');
      return;
    }
    if (!window.confirm('Reject ' + (fullName || 'this user') +
      '? Their pending profile will be permanently deleted. The audit event will remain.')) return;

    const client = getClient();
    if (!client || typeof client.from !== 'function') {
      feedback('Database connection is unavailable. Nothing was deleted.', 'error');
      return;
    }

    try {
      const table = 'consolidated_user_profiles_table';
      const { data: profile, error: fetchError } = await client
        .from(table)
        .select('user_id, full_name, status')
        .eq('user_id', userId)
        .eq('status', 'pending')
        .maybeSingle();

      if (fetchError) throw fetchError;
      if (!profile) {
        feedback('This profile is no longer pending or has already been deleted. Refresh the list.', 'warning');
        if (typeof window.loadPendingApprovals === 'function') await window.loadPendingApprovals();
        return;
      }

      const { data: deletedRows, error: deleteError } = await client
        .from(table)
        .delete()
        .eq('user_id', userId)
        .eq('status', 'pending')
        .select('user_id');

      if (deleteError) throw deleteError;
      if (!deletedRows || deletedRows.length === 0) {
        feedback('The pending profile was not deleted. Refresh and try again.', 'error');
        return;
      }

      // Audit the action, not the user's profile data. Do not retain the profile row.
      try {
        if (typeof window.logAudit === 'function') {
          await window.logAudit('USER_REJECT', 'Rejected pending user; profile row deleted.', userId, 'SUCCESS');
        } else if (typeof window.logAuditEvent === 'function') {
          await window.logAuditEvent('USER_REJECT', 'Rejected pending user; profile row deleted.', userId, 'SUCCESS');
        }
      } catch (auditError) {
        console.warn('Profile was deleted but audit event could not be written:', auditError);
      }

      feedback('Rejected ' + (fullName || 'user') + '. The pending profile was deleted; only the audit event is retained.', 'success');

      const refreshes = ['loadPendingApprovals', 'loadAllUsers', 'loadStudents', 'loadDashboardData'];
      await Promise.allSettled(refreshes.map(name => {
        if (typeof window[name] !== 'function') return Promise.resolve();
        if (name === 'loadAllUsers') return window[name](1, window.USERS_STATE?.filters);
        return window[name]();
      }));
    } catch (error) {
      console.error('Reject pending profile failed:', error);
      feedback('Could not reject user: ' + (error?.message || 'Unknown error'), 'error');
    }
  }

  // Wait until module scripts have initialized before overriding the global handler.
  window.addEventListener('load', function () {
    window.deleteProfile = rejectPendingProfile;
    console.info('Super Admin rejection fix loaded: pending profiles are deleted on Reject.');
  }, { once: true });
})();
