/* Lecturer Exams dashboard access audit and revoked-session notice. */
(function () {
  'use strict';
  if (window.__NCHSM_LECTURER_EXAMS_AUDIT__) return;
  window.__NCHSM_LECTURER_EXAMS_AUDIT__ = true;
  const client = window.sb || window.supabaseClient;
  const path = window.location.pathname || '/lecturerexams.html';
  if (!client || !client.auth || typeof client.rpc !== 'function') return;
  let authenticated = false;
  let ended = false;
  let lastTab = '';

  function showUpdatedNotice() {
    if (document.getElementById('nchsm-site-updated-notice')) return;
    const overlay = document.createElement('div');
    overlay.id = 'nchsm-site-updated-notice';
    overlay.setAttribute('role', 'alertdialog');
    overlay.setAttribute('aria-live', 'assertive');
    overlay.style.cssText = 'position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;padding:24px;background:rgba(10,20,35,.94);font-family:system-ui,sans-serif;';
    const card = document.createElement('div');
    card.style.cssText = 'max-width:440px;width:100%;padding:30px 24px;border-radius:16px;background:#fff;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,.35);';
    const heading = document.createElement('h2');
    heading.textContent = 'Site updated';
    heading.style.cssText = 'margin:0 0 12px;color:#10243a;font-size:22px;';
    const body = document.createElement('p');
    body.textContent = 'The site has been updated. Please log in again to continue.';
    body.style.cssText = 'margin:0;color:#475569;font-size:15px;line-height:1.6;';
    card.append(heading, body);
    overlay.appendChild(card);
    (document.body || document.documentElement).appendChild(overlay);
  }

  async function terminateLocalSession() {
    if (ended) return;
    ended = true;
    showUpdatedNotice();
    try { await client.auth.signOut({ scope: 'local' }); } catch (_) {}
    try {
      Object.keys(localStorage).forEach(function (key) {
        if (/^sb-.*-auth-token$/i.test(key) || key === 'supabase.auth.token') localStorage.removeItem(key);
      });
    } catch (_) {}
    setTimeout(function () { window.location.replace('/login.html?updated=1'); }, 900);
  }

  async function record(eventType, tabName) {
    if (!authenticated || ended) return;
    try {
      const { error } = await client.rpc('log_lecturer_exams_page_access', {
        p_event_type: eventType,
        p_page_path: path,
        p_page_title: document.title || 'Lecturer Exams Dashboard',
        p_tab_name: tabName || null
      });
      if (error) {
        const msg = String(error.message || '');
        if (/session revoked|session invalid|sign in again/i.test(msg)) await terminateLocalSession();
        else if (/not authorized/i.test(msg)) console.warn('[Lecturer Exams Audit] Role check rejected the page event.');
        else console.error('[Lecturer Exams Audit] Event failed:', msg);
      }
    } catch (error) {
      console.error('[Lecturer Exams Audit] Unable to record event:', error);
    }
  }

  async function initialize() {
    try {
      const { data, error } = await client.auth.getUser();
      if (error) {
        if (/session revoked|session invalid|sign in again/i.test(String(error.message || ''))) await terminateLocalSession();
        return;
      }
      if (!data || !data.user) return;
      authenticated = true;
      await record('page_view', null);
    } catch (error) {
      console.error('[Lecturer Exams Audit] Authentication check failed:', error);
    }
  }

  document.addEventListener('click', function (event) {
    const link = event.target && event.target.closest ? event.target.closest('[data-tab]') : null;
    if (!link) return;
    const tab = String(link.getAttribute('data-tab') || '').trim();
    if (!tab || tab === lastTab) return;
    lastTab = tab;
    const label = (link.textContent || tab).replace(/\s+/g, ' ').trim().slice(0, 120);
    record('tab_view', label);
  }, true);

  if (client.auth.onAuthStateChange) {
    client.auth.onAuthStateChange(function (event, session) {
      if (!session && authenticated && !ended) terminateLocalSession();
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize, { once: true });
  else initialize();
})();