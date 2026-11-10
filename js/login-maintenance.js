/* NCHSM TEMPORARY LOGIN MAINTENANCE — 2026-11-10
 * All portal login entry points are paused except superadminlogin.html.
 * This is a frontend maintenance gate; enforce the same rule server-side for full security.
 */
(function () {
  'use strict';
  const message = 'Portal logins are temporarily disabled for maintenance. Please try again later.';
  function blockSupabasePasswordLogin() {
    ['supabaseClient', 'sb', 'supabase'].forEach(function (key) {
      const client = window[key];
      if (!client || !client.auth || client.auth.__nchsmMaintenanceWrapped) return;
      const auth = client.auth;
      if (typeof auth.signInWithPassword === 'function') {
        auth.signInWithPassword = async function () { throw new Error(message); };
      }
      auth.__nchsmMaintenanceWrapped = true;
    });
  }
  function install() {
    blockSupabasePasswordLogin();
    const forms = document.querySelectorAll(
      'form#loginForm, form#login-form, form#studentLoginForm, form#financeLoginForm, form#directorLoginForm, form[data-login-mode]'
    );
    forms.forEach(function (form) {
      if (form.dataset.nchsmMaintenanceGate === '1') return;
      form.dataset.nchsmMaintenanceGate = '1';
      form.addEventListener('submit', function (event) {
        event.preventDefault();
        event.stopImmediatePropagation();
        let notice = form.querySelector('[data-nchsm-maintenance-notice]');
        if (!notice) {
          notice = document.createElement('div');
          notice.dataset.nchsmMaintenanceNotice = '1';
          notice.setAttribute('role', 'alert');
          notice.style.cssText = 'margin:12px 0;padding:12px 14px;border:1px solid #f0c36d;border-radius:10px;background:#fff8e7;color:#704b00;font:600 13px/1.45 system-ui,sans-serif;';
          form.prepend(notice);
        }
        notice.textContent = message;
      }, true);
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install);
  else install();
  window.addEventListener('load', blockSupabasePasswordLogin);
})();