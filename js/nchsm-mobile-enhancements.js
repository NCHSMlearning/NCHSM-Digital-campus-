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
    manifest.href = '/manifest.json?v=3';
    document.head.appendChild(manifest);

    const theme = document.createElement('meta');
    theme.name = 'theme-color';
    theme.content = '#073b5c';
    document.head.appendChild(theme);

    const standalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    let installPrompt = null;
    const install = document.createElement('button');
    install.type = 'button';
    install.className = 'nchsm-pwa-install';
    install.textContent = 'Install NCHSM';
    install.setAttribute('aria-label', 'Install NCHSM Digital Campus on this device');
    install.hidden = standalone;
    install.style.cssText = 'position:fixed;z-index:9998;left:max(16px,env(safe-area-inset-left));bottom:max(18px,env(safe-area-inset-bottom));padding:11px 16px;border:0;border-radius:999px;background:#073b5c;color:#fff;font:700 13px system-ui,sans-serif;box-shadow:0 6px 22px rgba(7,35,55,.2);cursor:pointer';
    document.body.appendChild(install);

    // A friendly install invitation. The browser's native install prompt is
    // only opened after the user presses the Install button (user gesture).
    const inviteStyle = document.createElement('style');
    inviteStyle.textContent = `
      .nchsm-install-invite{position:fixed;inset:0;z-index:2147482000;display:grid;place-items:center;padding:20px;background:rgba(5,25,40,.58);backdrop-filter:blur(7px);opacity:0;visibility:hidden;transition:opacity .22s ease,visibility .22s ease}
      .nchsm-install-invite.open{opacity:1;visibility:visible}
      .nchsm-install-card{position:relative;width:min(440px,100%);padding:30px 26px 24px;border:1px solid rgba(255,255,255,.7);border-radius:24px;background:#fff;color:#172a37;box-shadow:0 24px 80px rgba(0,0,0,.25);font-family:system-ui,-apple-system,Segoe UI,sans-serif;text-align:center;transform:translateY(12px);transition:transform .22s ease}
      .nchsm-install-invite.open .nchsm-install-card{transform:translateY(0)}
      .nchsm-install-logo{width:68px;height:68px;object-fit:contain;margin:0 auto 14px}
      .nchsm-install-card h2{margin:0 0 9px;color:#073b5c;font-size:22px;line-height:1.2}
      .nchsm-install-card p{margin:0 auto 18px;max-width:340px;color:#5d6e79;font-size:14px;line-height:1.6}
      .nchsm-install-benefits{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin:0 0 20px;text-align:left}
      .nchsm-install-benefits span{padding:10px;border-radius:12px;background:#f2f7fa;color:#244454;font-size:12px;font-weight:650}
      .nchsm-install-actions{display:flex;gap:10px}
      .nchsm-install-actions button{flex:1;min-height:45px;border:0;border-radius:12px;font-size:14px;font-weight:750;cursor:pointer}
      .nchsm-install-accept{background:#073b5c;color:white}
      .nchsm-install-later{background:#edf2f5;color:#38505e}
      .nchsm-install-close{position:absolute;top:10px;right:12px;width:34px;height:34px;border:0;border-radius:50%;background:#f1f4f6;color:#49616e;font-size:21px;cursor:pointer}
      @media(prefers-reduced-motion:reduce){.nchsm-install-invite,.nchsm-install-card{transition:none}}
    `;
    document.head.appendChild(inviteStyle);

    const invite = document.createElement('div');
    invite.className = 'nchsm-install-invite';
    invite.setAttribute('role', 'dialog');
    invite.setAttribute('aria-modal', 'true');
    invite.setAttribute('aria-labelledby', 'nchsmInstallTitle');
    invite.innerHTML = `
      <div class="nchsm-install-card">
        <button class="nchsm-install-close" type="button" aria-label="Close install invitation">×</button>
        <img class="nchsm-install-logo" src="/images/Logo_NCHSM.png" alt="NCHSM logo">
        <h2 id="nchsmInstallTitle">Take NCHSM Digital Campus with you</h2>
        <p>Install the campus app on this device for faster access from your desktop, Start menu or home screen.</p>
        <div class="nchsm-install-benefits">
          <span>✓ Opens like an app</span><span>✓ Quick access</span>
          <span>✓ Updates automatically</span><span>✓ No app-store search</span>
        </div>
        <div class="nchsm-install-actions">
          <button class="nchsm-install-later" type="button">Maybe later</button>
          <button class="nchsm-install-accept" type="button">Install app</button>
        </div>
      </div>`;
    document.body.appendChild(invite);

    const inviteAccept = invite.querySelector('.nchsm-install-accept');
    const closeInvite = function () {
      invite.classList.remove('open');
      try { localStorage.setItem('nchsm-install-invite-dismissed', String(Date.now())); } catch (_) {}
    };
    const showInvite = function () {
      if (standalone) return;
      let dismissedAt = 0;
      try { dismissedAt = Number(localStorage.getItem('nchsm-install-invite-dismissed') || 0); } catch (_) {}
      // Respect a dismissal for seven days; don't repeatedly interrupt users.
      if (dismissedAt && Date.now() - dismissedAt < 7 * 24 * 60 * 60 * 1000) return;
      window.setTimeout(function () { invite.classList.add('open'); }, 1100);
    };
    invite.querySelector('.nchsm-install-close').addEventListener('click', closeInvite);
    invite.querySelector('.nchsm-install-later').addEventListener('click', closeInvite);
    invite.addEventListener('click', function (event) { if (event.target === invite) closeInvite(); });

    window.addEventListener('beforeinstallprompt', function (event) {
      event.preventDefault();
      installPrompt = event;
      install.hidden = false;
      showInvite();
    });

    window.addEventListener('appinstalled', function () {
      installPrompt = null;
      install.hidden = true;
    });

    const triggerInstall = async function () {
      // Only expose this control after the browser has supplied its native
      // installation event. Calling prompt() must happen from this click.
      if (!installPrompt) return;
      const promptEvent = installPrompt;
      installPrompt = null;
      try {
        await promptEvent.prompt();
        const choice = await promptEvent.userChoice;
        if (choice && choice.outcome === 'accepted') {
          closeInvite();
          install.hidden = true;
        } else {
          // The user declined; wait for a fresh browser event before showing it again.
          install.hidden = true;
        }
      } catch (error) {
        console.warn('NCHSM native install prompt failed:', error);
        install.hidden = true;
      }
    };
    inviteAccept.addEventListener('click', triggerInstall);
    install.addEventListener('click', triggerInstall);
    // No fallback instructions: if the browser cannot provide a native prompt,
    // keep the install control and invitation hidden.

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