/* NCHSM TEMPORARY LOGIN MAINTENANCE — audit every submitted attempt.
 * Records the attempt before the client-side gate prevents authentication.
 */
(function () {
  'use strict';
  const message = 'System is temporarily disabled. Please try again later.';
  function recordAttempt(form, attemptType) {
    const field = form.querySelector('input[type="email"], input[name="email"], input[name="identifier"], input#email, input#username, input[name="username"], input[name="staff_id"]');
    const identifier = String(field && field.value || '').trim();
    const client = window.NCHSMLogin && window.NCHSMLogin.supabase;
    if (!identifier || !client || !client.functions) return;
    client.functions.invoke('record-failed-login', {
      body: {
        identifier: identifier,
        attempt_type: attemptType,
        page_path: window.location.pathname,
        details: { gate: 'login_maintenance', blocked_before_authentication: true }
      }
    }).then(function (result) {
      if (result.error) console.warn('Login-attempt audit could not be recorded:', result.error.message);
    }).catch(function (error) { console.warn('Login-attempt audit request failed:', error); });
  }
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
        recordAttempt(form, 'maintenance_blocked');
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
    if (new URLSearchParams(window.location.search).get('maintenance') === '1') {
      forms.forEach(function (form) {
        let notice = form.querySelector('[data-nchsm-maintenance-notice]');
        if (!notice) {
          notice = document.createElement('div');
          notice.dataset.nchsmMaintenanceNotice = '1';
          notice.setAttribute('role', 'alert');
          notice.style.cssText = 'margin:12px 0;padding:12px 14px;border:1px solid #f0c36d;border-radius:10px;background:#fff8e7;color:#704b00;font:600 13px/1.45 system-ui,sans-serif;';
          form.prepend(notice);
        }
        notice.textContent = message;
      });
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install);
  else install();
  window.addEventListener('load', blockSupabasePasswordLogin);
})();