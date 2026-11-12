/* Admin Exams dashboard access audit.
 * Records authenticated dashboard visits and section navigation through a
 * server-side RPC that validates the live session and authoritative role.
 */
(function () {
  'use strict';
  if (window.__NCHSM_ADMIN_EXAMS_AUDIT__) return;
  window.__NCHSM_ADMIN_EXAMS_AUDIT__ = true;

  const PAGE_PATH = window.location.pathname || '/adminexams.html';
  const client = window.sb || window.supabaseClient;
  if (!client || !client.auth || typeof client.rpc !== 'function') {
    console.error('[Admin Exams Audit] Supabase client unavailable; access event not recorded.');
    return;
  }

  let authenticated = false;
  let lastTab = '';
  let pending = Promise.resolve();

  async function record(eventType, tabName) {
    if (!authenticated) return;
    try {
      const { error } = await client.rpc('log_admin_exams_page_access', {
        p_event_type: eventType,
        p_page_path: PAGE_PATH,
        p_page_title: document.title || 'Admin Exams Dashboard',
        p_tab_name: tabName || null
      });
      if (error) console.error('[Admin Exams Audit] Event rejected:', error.message);
    } catch (error) {
      console.error('[Admin Exams Audit] Unable to record access event:', error);
    }
  }

  async function initialize() {
    try {
      const { data, error } = await client.auth.getUser();
      if (error || !data || !data.user) return;
      authenticated = true;
      await record('page_view', null);
    } catch (error) {
      console.error('[Admin Exams Audit] Authentication check failed:', error);
    }
  }

  document.addEventListener('click', function (event) {
    const link = event.target && event.target.closest
      ? event.target.closest('[data-tab]')
      : null;
    if (!link) return;
    const tab = String(link.getAttribute('data-tab') || '').trim();
    if (!tab || tab === lastTab) return;
    lastTab = tab;
    const label = (link.textContent || tab).replace(/\s+/g, ' ').trim().slice(0, 120);
    pending = pending.then(function () { return record('tab_view', label); });
  }, true);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize, { once: true });
  } else {
    initialize();
  }
})();