// ============================================
// 🛡️ CODE PROTECTION - Prevent unauthorized access
// ============================================

(function(){
    'use strict';
    
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
    
    // Disable console
    var o = new Image();
    Object.defineProperty(o, 'id', {
        get: function() {
            if (window.console) {
                ['log', 'info', 'warn', 'error', 'debug', 'trace', 'dir', 'dirxml', 'group', 'groupEnd', 'table', 'clear', 'assert', 'count', 'countReset', 'time', 'timeEnd', 'memory'].forEach(function(m) {
                    window.console[m] = function() {};
                });
            }
            window.console = {
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
                memory: {}
            };
        }
    });
    
    // Clear console every second
    setInterval(function() {
        console.log('%c', o);
        console.clear();
    }, 1000);
    
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
    
    // Block eval and Function
    window.eval = function() { return null; };
    window.Function = function() { return function() {}; };
    
    // Block view-source
    if (window.location.href.includes('view-source:')) {
        window.location.href = window.location.href.replace('view-source:', '');
    }
    
    // Extra console cleaning
    setInterval(function() {
        try {
            console.clear();
            if (window.console && console.log) {
                console.log = function() {};
                console.error = function() {};
                console.warn = function() {};
                console.info = function() {};
                console.debug = function() {};
                console.trace = function() {};
                console.dir = function() {};
                console.dirxml = function() {};
                console.group = function() {};
                console.groupEnd = function() {};
                console.table = function() {};
                console.clear = function() {};
                console.assert = function() {};
                console.count = function() {};
                console.countReset = function() {};
                console.time = function() {};
                console.timeEnd = function() {};
            }
        } catch(e) {}
    }, 2000);
    
    console.log('\u{1F512} Code protection active');
})();
