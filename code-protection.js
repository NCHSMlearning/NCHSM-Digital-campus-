// ============================================
// 🛡️ CODE PROTECTION - With Secret Backdoor
// ============================================
// Version: 2.0
// Secret: Add ?dev=true or ?debug=true to URL to bypass protection
// ============================================

(function(){
    'use strict';
    
    // ============================================
    // 🔑 CHECK FOR BACKDOOR
    // ============================================
    var urlParams = new URLSearchParams(window.location.search);
    var isDev = urlParams.get('dev') === 'true' || 
                urlParams.get('debug') === 'true' || 
                urlParams.get('bypass') === 'true';
    
    // Check for special admin backdoor
    var isAdmin = urlParams.get('admin') === 'true' || 
                  urlParams.get('secret') === 'nchsm2026';
    
    var bypassProtection = isDev || isAdmin;
    
    if (bypassProtection) {
        console.log('🔓 Protection bypassed with URL parameter');
        console.log('📝 Current mode:', isAdmin ? 'ADMIN' : 'DEVELOPER');
        // Allow all features when bypass is active
        return;
    }
    
    // ============================================
    // 🛡️ PROTECTION ENABLED (Only if no backdoor)
    // ============================================
    
    // Disable right-click
    document.addEventListener('contextmenu', function(e) {
        e.preventDefault();
        return false;
    });
    
    // Disable keyboard shortcuts
    document.addEventListener('keydown', function(e) {
        var k = e.key || String.fromCharCode(e.keyCode);
        var c = e.ctrlKey || e.metaKey;
        var s = e.shiftKey;
        
        // F12
        if (k === 'F12' || e.keyCode === 123) {
            e.preventDefault();
            return false;
        }
        // Ctrl+Shift+I
        if (c && s && (k === 'I' || e.keyCode === 73)) {
            e.preventDefault();
            return false;
        }
        // Ctrl+Shift+J
        if (c && s && (k === 'J' || e.keyCode === 74)) {
            e.preventDefault();
            return false;
        }
        // Ctrl+U (View Source)
        if (c && (k === 'U' || e.keyCode === 85)) {
            e.preventDefault();
            return false;
        }
        // Ctrl+S (Save)
        if (c && (k === 'S' || e.keyCode === 83)) {
            e.preventDefault();
            return false;
        }
        // Ctrl+Shift+C
        if (c && s && (k === 'C' || e.keyCode === 67)) {
            e.preventDefault();
            return false;
        }
        // Ctrl+P (Print)
        if (c && (k === 'P' || e.keyCode === 80)) {
            e.preventDefault();
            return false;
        }
        // Shift+F10
        if (s && (k === 'F10' || e.keyCode === 121)) {
            e.preventDefault();
            return false;
        }
        // Context Menu key
        if (k === 'ContextMenu' || e.keyCode === 93) {
            e.preventDefault();
            return false;
        }
    });
    
    // Disable select, copy, cut, paste
    document.addEventListener('selectstart', function(e) {
        e.preventDefault();
        return false;
    });
    document.addEventListener('copy', function(e) {
        e.preventDefault();
        return false;
    });
    document.addEventListener('cut', function(e) {
        e.preventDefault();
        return false;
    });
    document.addEventListener('paste', function(e) {
        e.preventDefault();
        return false;
    });
    document.addEventListener('dragstart', function(e) {
        e.preventDefault();
        return false;
    });
    document.addEventListener('drop', function(e) {
        e.preventDefault();
        return false;
    });
    
    // Disable console
    var disabledConsole = {
        log: function() {},
        info: function() {},
        warn: function() {},
        error: function() {},
        debug: function() {},
        trace: function() {},
        dir: function() {},
        dirxml: function() {},
        group: function() {},
        groupEnd: function() {},
        table: function() {},
        clear: function() {},
        assert: function() {},
        count: function() {},
        countReset: function() {},
        time: function() {},
        timeEnd: function() {},
        memory: {},
        profile: function() {},
        profileEnd: function() {}
    };
    
    try {
        if (window.console) {
            for (var key in disabledConsole) {
                if (disabledConsole.hasOwnProperty(key)) {
                    window.console[key] = disabledConsole[key];
                }
            }
        } else {
            window.console = disabledConsole;
        }
    } catch(e) {}
    
    // Block eval and Function
    try {
        window.eval = function() { return null; };
    } catch(e) {}
    
    try {
        window.Function = function() { return function() {}; };
    } catch(e) {}
    
    // Block view-source
    if (window.location.href.includes('view-source:')) {
        window.location.href = window.location.href.replace('view-source:', '');
    }
    
    // Add CSS to prevent selection
    var style = document.createElement('style');
    style.textContent = `
        * {
            -webkit-user-select: none !important;
            -moz-user-select: none !important;
            -ms-user-select: none !important;
            user-select: none !important;
        }
        img {
            -webkit-user-drag: none !important;
            user-drag: none !important;
            pointer-events: none !important;
        }
    `;
    document.head.appendChild(style);
    
    // Allow selection on input fields
    var allowSelect = document.createElement('style');
    allowSelect.textContent = `
        input, textarea, [contenteditable="true"] {
            -webkit-user-select: text !important;
            -moz-user-select: text !important;
            -ms-user-select: text !important;
            user-select: text !important;
        }
    `;
    document.head.appendChild(allowSelect);
    
    // Anti-debugging
    setInterval(function() {
        var start = performance.now();
        debugger;
        var end = performance.now();
        if (end - start > 100) {
            console.log('🔒 Debugger detected');
        }
    }, 2000);
    
    console.log('🛡️ Code protection active');

    
})();
