/* NCHSM DASHBOARD MAINTENANCE GATE
 * Temporarily closes all non-Super-Admin dashboards and locally signs out
 * any existing browser session before returning the user to the login page.
 * Super Admin dashboard is deliberately excluded.
 */
(function () {
  'use strict';

  var message = 'System is temporarily disabled. Please try again later.';
  var path = (window.location.pathname || '').split('/').pop().toLowerCase();

  var loginRoutes = {
    'admin.html': 'adminlogin.html',
    'adminexams.html': 'adminlogin.html',
    'director.html': 'director-login.html',
    'drms_dashboard.html': 'drms_login.html',
    'exam_dashboard.html': 'exam_login.html',
    'finance.html': 'financelogin.html',
    'lecturer.html': 'login.html',
    'lecturerexams.html': 'login.html',
    'markmanagement.html': 'adminlogin.html',
    'marks-management.html': 'adminlogin.html',
    'marks.html': 'adminlogin.html',
    'nchsmaccounts.html': 'adminlogin.html',
    'nurseiqadmin.html': 'nurseiq-admin-login.html',
    'parents.html': 'login.html',
    'reports.html': 'adminlogin.html',
    'student.html': 'login.html'
  };

  if (!Object.prototype.hasOwnProperty.call(loginRoutes, path)) return;

  function showBlockingScreen() {
    if (!document.body || document.getElementById('nchsm-dashboard-maintenance')) return;
    var overlay = document.createElement('div');
    overlay.id = 'nchsm-dashboard-maintenance';
    overlay.setAttribute('role', 'alert');
    overlay.setAttribute('aria-live', 'assertive');
    overlay.style.cssText = 'position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;padding:24px;background:#f4f7fb;color:#102a43;font:600 15px/1.5 system-ui,sans-serif;text-align:center;';
    var panel = document.createElement('div');
    panel.style.cssText = 'max-width:440px;padding:30px 26px;background:#fff;border:1px solid #dbe4ee;border-radius:16px;box-shadow:0 18px 50px rgba(16,42,67,.12);';
    var heading = document.createElement('div');
    heading.textContent = 'System temporarily unavailable';
    heading.style.cssText = 'font-size:20px;font-weight:800;margin-bottom:10px;';
    var copy = document.createElement('div');
    copy.textContent = message;
    copy.style.cssText = 'font-weight:500;color:#526579;';
    panel.appendChild(heading);
    panel.appendChild(copy);
    overlay.appendChild(panel);
    document.body.appendChild(overlay);
  }

  function getClients() {
    var keys = ['supabaseClient', 'sb', 'supabase'];
    var clients = [];
    keys.forEach(function (key) {
      var client = window[key];
      if (client && client.auth && clients.indexOf(client) === -1) clients.push(client);
    });
    return clients;
  }

  async function signOutAndRedirect() {
    showBlockingScreen();
    var clients = getClients();

    // Wait briefly for the page's Supabase client to initialize.
    if (!clients.length) {
      await new Promise(function (resolve) {
        var started = Date.now();
        var timer = window.setInterval(function () {
          clients = getClients();
          if (clients.length || Date.now() - started >= 5000) {
            window.clearInterval(timer);
            resolve();
          }
        }, 100);
      });
    }

    await Promise.all(clients.map(async function (client) {
      try {
        await client.auth.signOut({ scope: 'local' });
      } catch (error) {
        console.warn('[NCHSM maintenance] Local sign-out could not complete:', error && error.message);
      }
    }));

    // Remove only Supabase auth tokens for this browser origin as a fallback.
    try {
      Object.keys(localStorage).forEach(function (key) {
        if (/^sb-[^-]+-auth-token$/i.test(key)) localStorage.removeItem(key);
      });
    } catch (_) {}

    var destination = loginRoutes[path] || 'login.html';
    window.location.replace(destination + '?maintenance=1');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', signOutAndRedirect, { once: true });
  } else {
    signOutAndRedirect();
  }
})();
