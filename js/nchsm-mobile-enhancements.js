/* NCHSM cross-device performance and refresh controls */
(function () {
  'use strict';
  if (window.__nchsmPerformanceReady) return;
  window.__nchsmPerformanceReady = true;

  const style = document.createElement('style');
  style.id = 'nchsm-performance-style';
  style.textContent = `
    html { scroll-behavior: smooth; -webkit-text-size-adjust: 100%; }
    body { overscroll-behavior-y: contain; -webkit-tap-highlight-color: transparent; }
    img { height: auto; }
    .nchsm-refresh-indicator {
      position: fixed; z-index: 2147483000; top: max(10px, env(safe-area-inset-top));
      left: 50%; transform: translate(-50%, -150%); opacity: 0;
      display: flex; align-items: center; gap: 9px; padding: 10px 15px;
      border: 1px solid rgba(7,59,92,.12); border-radius: 999px;
      background: rgba(255,255,255,.97); color: #073b5c;
      box-shadow: 0 8px 28px rgba(7,35,55,.16); font: 600 12px system-ui,sans-serif;
      transition: transform .18s ease, opacity .18s ease; pointer-events: none;
      backdrop-filter: blur(12px);
    }
    .nchsm-refresh-indicator.visible { transform: translate(-50%, 0); opacity: 1; }
    .nchsm-refresh-spinner {
      width: 15px; height: 15px; border: 2px solid #dce8ef;
      border-top-color: #087f8c; border-radius: 50%; animation: nchsmRefreshSpin .7s linear infinite;
    }
    @keyframes nchsmRefreshSpin { to { transform: rotate(360deg); } }
    .nchsm-refresh-button {
      position: fixed; z-index: 10000; right: max(18px, env(safe-area-inset-right));
      bottom: max(18px, env(safe-area-inset-bottom)); width: 44px; height: 44px;
      display: grid; place-items: center; border: 1px solid rgba(7,59,92,.12);
      border-radius: 50%; background: #fff; color: #073b5c;
      box-shadow: 0 5px 20px rgba(7,35,55,.15); cursor: pointer;
      font: 700 21px system-ui,sans-serif; transition: transform .15s ease, box-shadow .15s ease;
    }
    .nchsm-refresh-button:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(7,35,55,.2); }
    .nchsm-refresh-button:active { transform: scale(.94); }
    @media print { .nchsm-refresh-indicator, .nchsm-refresh-button { display:none!important; } }
    @media (prefers-reduced-motion: reduce) {
      html { scroll-behavior: auto; }
      .nchsm-refresh-indicator, .nchsm-refresh-button { transition: none; }
      .nchsm-refresh-spinner { animation-duration: 1.5s; }
    }
  `;
  (document.head || document.documentElement).appendChild(style);

  const indicator = document.createElement('div');
  indicator.className = 'nchsm-refresh-indicator';
  indicator.setAttribute('role', 'status');
  indicator.setAttribute('aria-live', 'polite');
  indicator.innerHTML = '<span class="nchsm-refresh-spinner" aria-hidden="true"></span><span>Release to refresh</span>';
  document.body.appendChild(indicator);

  const refreshButton = document.createElement('button');
  refreshButton.className = 'nchsm-refresh-button';
  refreshButton.type = 'button';
  refreshButton.title = 'Refresh this page';
  refreshButton.setAttribute('aria-label', 'Refresh this page');
  refreshButton.innerHTML = '&#8635;';
  refreshButton.addEventListener('click', function () {
    refreshButton.disabled = true;
    refreshButton.innerHTML = '<span class="nchsm-refresh-spinner" aria-hidden="true"></span>';
    window.location.reload();
  });
  document.body.appendChild(refreshButton);

  let startY = 0, startX = 0, pulling = false, armed = false;
  const threshold = 86;
  const isEditable = (node) => !!(node && node.closest && node.closest('input,textarea,select,button,[contenteditable="true"],video,audio,[role="dialog"],.modal,.modal-overlay,.sidebar,.drawer'));
  const scrollTop = () => Math.max(window.scrollY || 0, document.documentElement.scrollTop || 0, document.body.scrollTop || 0);

  document.addEventListener('touchstart', function (event) {
    if (event.touches.length !== 1 || scrollTop() > 2 || isEditable(event.target)) { pulling = false; return; }
    startY = event.touches[0].clientY;
    startX = event.touches[0].clientX;
    pulling = startY < 100;
    armed = false;
  }, { passive: true });

  document.addEventListener('touchmove', function (event) {
    if (!pulling || event.touches.length !== 1 || scrollTop() > 2) return;
    const dy = event.touches[0].clientY - startY;
    const dx = event.touches[0].clientX - startX;
    if (dy <= 0 || Math.abs(dx) > Math.abs(dy) * .8) { indicator.classList.remove('visible'); return; }
    if (dy > 12) indicator.classList.add('visible');
    armed = dy >= threshold;
    const label = indicator.querySelector('span:last-child');
    if (label) label.textContent = armed ? 'Release to refresh' : 'Pull down to refresh';
  }, { passive: true });

  document.addEventListener('touchend', function () {
    if (pulling && armed && scrollTop() <= 2) {
      const label = indicator.querySelector('span:last-child');
      if (label) label.textContent = 'Refreshing…';
      indicator.classList.add('visible');
      window.setTimeout(function () { window.location.reload(); }, 120);
    } else {
      indicator.classList.remove('visible');
    }
    pulling = false; armed = false;
  }, { passive: true });
  document.addEventListener('touchcancel', function () {
    pulling = false; armed = false; indicator.classList.remove('visible');
  }, { passive: true });

  // Defer image decoding and native lazy-loading for below-the-fold content.
  const optimizeImages = function () {
    const images = document.images;
    for (let i = 0; i < images.length; i++) {
      const img = images[i];
      if (!img.hasAttribute('loading') && img.getBoundingClientRect().top > window.innerHeight * 1.25) img.loading = 'lazy';
      if (!img.hasAttribute('decoding')) img.decoding = 'async';
    }
  };
  if ('requestIdleCallback' in window) window.requestIdleCallback(optimizeImages, { timeout: 1800 });
  else window.setTimeout(optimizeImages, 500);

  // Keep browser-native keyboard refresh and make back/forward restoration reliable.
  window.addEventListener('pageshow', function () {
    refreshButton.disabled = false;
    refreshButton.innerHTML = '&#8635;';
    indicator.classList.remove('visible');
  });

  // Progressive Web App: desktop/mobile installation and automatic web updates.
  (function initNchsmPwa() {
    if (!('serviceWorker' in navigator)) return;

    const manifest = document.createElement('link');
    manifest.rel = 'manifest';
    manifest.href = '/manifest.json?v=4';
    document.head.appendChild(manifest);

    const theme = document.createElement('meta');
    theme.name = 'theme-color';
    theme.content = '#073b5c';
    document.head.appendChild(theme);

    const standalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    const install = document.createElement('button');
    install.type = 'button';
    install.className = 'nchsm-pwa-install';
    install.textContent = 'Download Android App';
    install.setAttribute('aria-label', 'Download the NCHSM Digital Campus Android APK');
    install.hidden = standalone || !/android/i.test(navigator.userAgent);
    install.style.cssText = 'position:fixed;z-index:9998;left:max(16px,env(safe-area-inset-left));bottom:max(18px,env(safe-area-inset-bottom));padding:11px 16px;border:0;border-radius:999px;background:#073b5c;color:#fff;font:700 13px system-ui,sans-serif;box-shadow:0 6px 22px rgba(7,35,55,.2);cursor:pointer';
    document.body.appendChild(install);

    // Download the signed Android APK from the official GitHub release.
    // Android's package installer handles the final user-confirmed installation.
    install.addEventListener('click', function () {
      if (!/android/i.test(navigator.userAgent)) return;
      install.disabled = true;
      install.textContent = 'Preparing download…';
      const link = document.createElement('a');
      link.href = 'https://github.com/NCHSMlearning/NCHSM-Digital-campus-/releases/latest/download/app-release.apk';
      link.download = 'NCHSM-Digital-Campus.apk';
      link.rel = 'noopener';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(function () {
        install.disabled = false;
        install.textContent = 'Download Android App';
      }, 5000);
    });

    let refreshing = false;
    navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' }).then(function (registration) {
      registration.update().catch(function () {});
      registration.addEventListener('updatefound', function () {
        const worker = registration.installing;
        if (!worker) return;
        worker.addEventListener('statechange', function () {
          if (worker.state === 'installed' && navigator.serviceWorker.controller) {
            if (window.Swal && typeof window.Swal.fire === 'function') {
              window.Swal.fire({
                title: 'NCHSM has been updated',
                text: 'A new version is ready. Reload to use the latest improvements.',
                icon: 'success',
                confirmButtonText: 'Reload now',
                confirmButtonColor: '#073b5c',
                allowOutsideClick: false
              }).then(function (result) { if (result.isConfirmed) window.location.reload(); });
            } else if (window.confirm('A new NCHSM version is ready. Reload now?')) {
              window.location.reload();
            }
          }
        });
      });
    }).catch(function (error) {
      console.warn('NCHSM PWA registration failed:', error);
    });

    navigator.serviceWorker.addEventListener('controllerchange', function () {
      if (refreshing) return;
      refreshing = true;
    });
    window.addEventListener('focus', function () {
      if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.getRegistration('/').then(function (registration) {
          if (registration) registration.update().catch(function () {});
        }).catch(function () {});
      }
    });
  })();

})();