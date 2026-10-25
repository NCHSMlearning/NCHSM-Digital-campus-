/* Reliable initialization for Super Admin Unit Registration & Approvals.
 * Loaded after dashboard scripts so the public loader is available.
 */
(function () {
  'use strict';

  let initTimer = null;
  let lastInitAt = 0;

  function isUnitRegistrationTabVisible() {
    const tab = document.getElementById('unit-management');
    return !!tab && (tab.classList.contains('active') || tab.style.display === 'block');
  }

  async function initializeUnitRegistration(force) {
    if (!isUnitRegistrationTabVisible()) return;
    if (typeof window.loadUnitDashboard !== 'function') {
      console.warn('[Unit Registration] loadUnitDashboard is not available yet.');
      return;
    }

    const now = Date.now();
    if (!force && now - lastInitAt < 700) return;
    lastInitAt = now;

    try {
      const loader = document.getElementById('unit-registration-loading');
      if (loader) loader.style.display = 'block';
      await window.loadUnitDashboard();
      console.info('[Unit Registration] Dashboard initialized/refreshed.');
    } catch (error) {
      console.error('[Unit Registration] Initialization failed:', error);
      if (typeof window.showFeedback === 'function') {
        window.showFeedback('Could not load unit registrations: ' + (error?.message || 'Unknown error'), 'error');
      }
    } finally {
      const loader = document.getElementById('unit-registration-loading');
      if (loader) loader.style.display = 'none';
    }
  }

  function scheduleInitialize(force) {
    if (initTimer) clearTimeout(initTimer);
    initTimer = setTimeout(function () {
      initializeUnitRegistration(!!force);
    }, 120);
  }

  // The delegated listener works even if navigation markup is re-rendered.
  document.addEventListener('click', function (event) {
    const link = event.target && event.target.closest
      ? event.target.closest('.nav a[data-tab="unit-management"], a[data-tab="unit-management"]')
      : null;
    if (link) scheduleInitialize(true);
  }, true);

  // Catch programmatic navigation through showTab as well.
  function wrapShowTab() {
    if (typeof window.showTab !== 'function' || window.showTab.__unitRegistrationInitWrapped) return false;
    const originalShowTab = window.showTab;
    const wrappedShowTab = function (tabId) {
      const result = originalShowTab.apply(this, arguments);
      if (tabId === 'unit-management') scheduleInitialize(true);
      return result;
    };
    wrappedShowTab.__unitRegistrationInitWrapped = true;
    window.showTab = wrappedShowTab;
    return true;
  }

  function boot() {
    wrapShowTab();
    scheduleInitialize(false);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
  document.addEventListener('appReady', boot);
  window.addEventListener('load', function () {
    wrapShowTab();
    scheduleInitialize(false);
  });
})();
