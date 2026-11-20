/* Campus Nexus Super Admin — shared notification toasts */
(function () {
  'use strict';

  const palettes = {
    success: { bg: '#ecfdf5', fg: '#065f46', border: '#a7f3d0', icon: '✓', label: 'Success' },
    error:   { bg: '#fef2f2', fg: '#991b1b', border: '#fecaca', icon: '×', label: 'Error' },
    warning: { bg: '#fffbeb', fg: '#92400e', border: '#fde68a', icon: '!', label: 'Warning' },
    info:    { bg: '#eff6ff', fg: '#1e40af', border: '#bfdbfe', icon: 'i', label: 'Information' }
  };

  function getContainer() {
    let host = document.getElementById('cn-toast-region');
    if (!host) {
      host = document.createElement('div');
      host.id = 'cn-toast-region';
      host.setAttribute('aria-label', 'Notifications');
      host.style.cssText = [
        'position:fixed',
        'top:calc(12px + env(safe-area-inset-top, 0px))',
        'left:12px',
        'right:auto',
        'bottom:auto',
        'z-index:2147483000',
        'display:flex',
        'flex-direction:column',
        'align-items:flex-start',
        'gap:8px',
        'width:max-content',
        'max-width:calc(100vw - 24px)',
        'pointer-events:none'
      ].join(';');
      (document.body || document.documentElement).appendChild(host);
    }
    return host;
  }

  function showNotification(message, type) {
    // Preserve legacy calls that used false/true for success/error.
    const normalized = typeof type === 'boolean'
      ? (type ? 'error' : 'success')
      : String(type || 'info').toLowerCase();
    const kind = Object.prototype.hasOwnProperty.call(palettes, normalized) ? normalized : 'info';
    const palette = palettes[kind];
    const toast = document.createElement('div');

    toast.className = 'cn-toast cn-toast-' + kind;
    toast.setAttribute('role', kind === 'error' ? 'alert' : 'status');
    toast.setAttribute('aria-live', kind === 'error' ? 'assertive' : 'polite');
    toast.style.cssText = [
      'box-sizing:border-box',
      'display:flex',
      'align-items:center',
      'gap:9px',
      'width:fit-content',
      'max-width:100%',
      'padding:9px 13px',
      'border:1px solid ' + palette.border,
      'border-left:4px solid ' + palette.fg,
      'border-radius:10px',
      'background:' + palette.bg,
      'color:' + palette.fg,
      'box-shadow:0 6px 20px rgba(15,23,42,.13)',
      'font:600 13px/1.4 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
      'overflow-wrap:anywhere',
      'opacity:0',
      'transform:translateY(-7px)',
      'transition:opacity .18s ease,transform .18s ease',
      'pointer-events:auto',
      'cursor:pointer'
    ].join(';');

    const icon = document.createElement('span');
    icon.textContent = palette.icon;
    icon.setAttribute('aria-hidden', 'true');
    icon.style.cssText = [
      'flex:0 0 19px',
      'width:19px',
      'height:19px',
      'display:inline-flex',
      'align-items:center',
      'justify-content:center',
      'border-radius:50%',
      'background:' + palette.fg,
      'color:#fff',
      'font-size:13px',
      'font-weight:800'
    ].join(';');

    const text = document.createElement('span');
    text.textContent = String(message == null ? '' : message);
    text.style.cssText = 'min-width:0;';

    toast.append(icon, text);
    const host = getContainer();
    host.appendChild(toast);

    requestAnimationFrame(function () {
      toast.style.opacity = '1';
      toast.style.transform = 'translateY(0)';
    });

    let dismissed = false;
    let timer;
    function dismiss() {
      if (dismissed) return;
      dismissed = true;
      clearTimeout(timer);
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(-7px)';
      setTimeout(function () {
        toast.remove();
        if (!host.childElementCount) host.remove();
      }, 200);
    }
    toast.addEventListener('click', dismiss);
    timer = setTimeout(dismiss, kind === 'error' ? 6000 : 4000);
  }

  // One consistent notification API for every Super Admin module.
  window.showNotification = showNotification;
})();