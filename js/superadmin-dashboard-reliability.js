/* Super Admin dashboard reliability patch.
 * Uses real database counts where available and never fabricates server metrics.
 */
(function () {
  'use strict';

  let refreshTimer = null;
  let refreshInProgress = false;

  function client() {
    return window.sb || window.supabase || null;
  }

  function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value == null ? '—' : String(value);
  }

  function setTimestamp() {
    setText('liveTimestamp', new Date().toLocaleTimeString([], {
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    }));
  }

  function setMetricUnavailable() {
    // Browser JavaScript cannot accurately report server load or database storage.
    setText('headerServerLoad', 'N/A');
    setText('headerMemory', 'N/A');
    setText('headerStorage', 'N/A');
    ['headerServerLoad', 'headerMemory', 'headerStorage'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.title = 'Live server metrics are not exposed by the current dashboard connection.';
    });
  }

  async function countRows(table, configure) {
    const sb = client();
    if (!sb || typeof sb.from !== 'function') throw new Error('Database client unavailable');
    let query = sb.from(table).select('*', { count: 'exact', head: true });
    if (configure) query = configure(query);
    const result = await query;
    if (result.error) throw result.error;
    return Number(result.count || 0);
  }

  async function refreshDashboard() {
    if (refreshInProgress) return;
    refreshInProgress = true;
    const button = document.querySelector('[onclick="refreshDashboard()"]');
    const original = button ? button.innerHTML : '';
    if (button) {
      button.disabled = true;
      button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Refreshing…';
    }

    setTimestamp();
    setMetricUnavailable();

    try {
      const sb = client();
      if (!sb) throw new Error('Database connection is not ready');

      const jobs = [
        ['totalUsers', () => countRows('consolidated_user_profiles_table')],
        ['totalStudents', () => countRows('consolidated_user_profiles_table', q => q.eq('role', 'student'))],
        ['pendingApprovals', () => countRows('consolidated_user_profiles_table', q => q.eq('status', 'pending'))],
        ['totalCourses', () => countRows('courses')],
        ['totalResources', () => countRows('resources')],
        ['dashboardTotalPrograms', () => countRows('programs')],
        ['dashboardTotalUnits', () => countRows('units')],
        ['totalStaffCountDisplay', () => countRows('staff_records')],
        ['dashboardLecturersCount', () => countRows('staff_records', q => q.eq('designation', 'lecturer').eq('status', 'active'))],
        ['dashboardPendingMarks', () => countRows('student_marks', q => q.eq('status', 'pending'))],
        ['dashboardPublishedMarks', () => countRows('released_exam_results')]
      ];

      const results = await Promise.allSettled(jobs.map(async ([id, run]) => {
        const value = await run();
        setText(id, value.toLocaleString());
        return { id, value };
      }));

      const failed = results.filter(r => r.status === 'rejected');
      if (failed.length) {
        console.warn('[Super Admin dashboard] Some summary counts could not be refreshed:', failed.map(x => x.reason?.message || String(x.reason)));
      }

      // Keep the last refresh outcome visible without claiming all systems are healthy.
      const status = document.querySelector('#dashboard .dashboard-refresh-status');
      if (status) status.textContent = failed.length
        ? 'Some figures could not be updated. Check permissions or table names.'
        : 'Dashboard figures updated from the database.';
    } catch (error) {
      console.error('[Super Admin dashboard] Refresh failed:', error);
      const status = document.querySelector('#dashboard .dashboard-refresh-status');
      if (status) status.textContent = 'Could not refresh dashboard figures. Check your connection and permissions.';
    } finally {
      refreshInProgress = false;
      if (button) {
        button.disabled = false;
        button.innerHTML = original || '<i class="fas fa-sync-alt"></i> Refresh';
      }
    }
  }

  function setRefreshInterval(seconds) {
    if (refreshTimer) {
      clearInterval(refreshTimer);
      refreshTimer = null;
    }
    const interval = Number(seconds);
    if (Number.isFinite(interval) && interval > 0) {
      refreshTimer = setInterval(refreshDashboard, Math.max(15, interval) * 1000);
    }
  }

  // Expose the controls used by the dashboard markup.
  window.refreshDashboard = refreshDashboard;
  window.setRefreshInterval = setRefreshInterval;

  document.addEventListener('DOMContentLoaded', function () {
    setTimestamp();
    setMetricUnavailable();
    window.setInterval(setTimestamp, 1000);

    const dashboard = document.getElementById('dashboard');
    if (dashboard && !dashboard.querySelector('.dashboard-refresh-status')) {
      const status = document.createElement('p');
      status.className = 'dashboard-refresh-status';
      status.setAttribute('role', 'status');
      status.style.cssText = 'font-size:12px;color:#64748b;margin:0 0 14px;padding:0 4px;';
      status.textContent = 'Connecting to dashboard data…';
      const banner = dashboard.firstElementChild;
      if (banner && banner.nextSibling) dashboard.insertBefore(status, banner.nextSibling);
      else dashboard.prepend(status);
    }

    // Wait briefly for the Supabase client to be initialized by the existing app scripts.
    let attempts = 0;
    const wait = setInterval(function () {
      attempts++;
      if (client()) {
        clearInterval(wait);
        refreshDashboard();
      } else if (attempts >= 20) {
        clearInterval(wait);
        const status = document.querySelector('#dashboard .dashboard-refresh-status');
        if (status) status.textContent = 'Database client unavailable. Refresh after signing in again.';
      }
    }, 500);

    const intervalSelect = document.getElementById('refreshInterval');
    if (intervalSelect) setRefreshInterval(intervalSelect.value);
  });
})();