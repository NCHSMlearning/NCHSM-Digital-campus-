// ============================================================
// DROPDOWN FIX - Complete Solution (CSS + JavaScript)
// ============================================================

// ============================================================
// 1. INJECT CSS STYLES
// ============================================================
(function injectStyles() {
    const styles = `
        /* Override the !important display:none */
        .nav-dropdown .dropdown-menu {
            display: none !important;
            list-style: none !important;
            background: rgba(30, 27, 75, 0.95) !important;
            backdrop-filter: blur(10px) !important;
            border-radius: 12px !important;
            padding: 8px 0 !important;
            margin: 4px 0 4px 20px !important;
            box-shadow: 0 8px 32px rgba(0,0,0,0.4) !important;
            border: 1px solid rgba(255,255,255,0.1) !important;
            min-width: 200px !important;
            transition: all 0.3s ease !important;
        }

        /* When open - show the dropdown */
        .nav-dropdown.open .dropdown-menu,
        .nav-dropdown .dropdown-menu.open {
            display: block !important;
        }

        /* Style dropdown items */
        .nav-dropdown .dropdown-menu li {
            margin: 0 !important;
            padding: 0 !important;
        }

        .nav-dropdown .dropdown-menu li a {
            padding: 8px 16px 8px 35px !important;
            font-size: 13px !important;
            display: flex !important;
            align-items: center !important;
            gap: 10px !important;
            color: rgba(255,255,255,0.9) !important;
            text-decoration: none !important;
            border-radius: 6px !important;
            margin: 2px 6px !important;
            transition: all 0.2s ease !important;
        }

        .nav-dropdown .dropdown-menu li a:hover {
            background: rgba(255,255,255,0.15) !important;
            color: white !important;
            transform: translateX(4px) !important;
        }

        .nav-dropdown .dropdown-menu li a i {
            width: 18px !important;
            text-align: center !important;
            font-size: 12px !important;
        }

        /* Chevron rotation */
        .nav-dropdown .fa-chevron-down {
            transition: transform 0.3s ease !important;
        }

        .nav-dropdown.open .fa-chevron-down {
            transform: rotate(180deg) !important;
        }

        /* Darker gradient dropdown background - Alternative */
        .nav-dropdown .dropdown-menu.dark-gradient {
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%) !important;
            backdrop-filter: blur(12px) !important;
            border: 1px solid rgba(255,255,255,0.08) !important;
            box-shadow: 0 10px 40px rgba(0,0,0,0.6) !important;
        }

        .nav-dropdown .dropdown-menu.dark-gradient li a {
            color: #e2e8f0 !important;
        }

        .nav-dropdown .dropdown-menu.dark-gradient li a:hover {
            background: rgba(102, 126, 234, 0.3) !important;
            border-left: 3px solid #667eea !important;
            color: white !important;
        }
    `;

    const styleTag = document.createElement('style');
    styleTag.id = 'dropdown-fix-styles';
    styleTag.textContent = styles;
    document.head.appendChild(styleTag);
    console.log('✅ Dropdown CSS styles injected');
})();

// ============================================================
// 2. JAVASCRIPT DROPDOWN LOGIC
// ============================================================
(function initDropdowns() {
    'use strict';
    
    function init() {
        console.log('🔧 Initializing dropdown fixes...');
        
        // Get all dropdown toggles
        const dropdownToggles = document.querySelectorAll('.nav-dropdown .dropdown-toggle');
        
        if (dropdownToggles.length === 0) {
            console.warn('⚠️ No dropdown toggles found. Make sure .nav-dropdown .dropdown-toggle exists.');
            return;
        }
        
        dropdownToggles.forEach(function(toggle) {
            // Remove existing click listeners by cloning
            const newToggle = toggle.cloneNode(true);
            toggle.parentNode.replaceChild(newToggle, toggle);
            
            // Add click handler
            newToggle.addEventListener('click', function(e) {
                // CRITICAL: Prevent page navigation
                e.preventDefault();
                e.stopPropagation();
                
                const parentLi = this.closest('.nav-dropdown');
                if (!parentLi) {
                    console.warn('⚠️ No parent .nav-dropdown found');
                    return;
                }
                
                const menu = parentLi.querySelector('.dropdown-menu');
                if (!menu) {
                    console.warn('⚠️ No .dropdown-menu found inside .nav-dropdown');
                    return;
                }
                
                // Check if this dropdown is already open
                const isOpen = parentLi.classList.contains('open');
                
                // Close ALL dropdowns
                document.querySelectorAll('.nav-dropdown').forEach(function(dropdown) {
                    dropdown.classList.remove('open');
                });
                
                // Toggle this one
                if (!isOpen) {
                    parentLi.classList.add('open');
                    console.log('📂 Opened:', this.textContent.trim());
                } else {
                    console.log('📂 Closed:', this.textContent.trim());
                }
            });
        });
        
        // Close dropdowns when clicking outside
        document.addEventListener('click', function(e) {
            if (!e.target.closest('.nav-dropdown')) {
                document.querySelectorAll('.nav-dropdown').forEach(function(dropdown) {
                    dropdown.classList.remove('open');
                });
            }
        });
        
        console.log('✅ Dropdown fixes applied!');
        console.log('📊 Found and fixed:', dropdownToggles.length, 'dropdown(s)');
    }
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();

// ============================================================
// 3. OPTIONAL: TOGGLE DARK GRADIENT MODE
// ============================================================
(function enableDarkGradient() {
    setTimeout(function() {
        document.querySelectorAll('.nav-dropdown .dropdown-menu').forEach(function(menu) {
            menu.classList.add('dark-gradient');
        });
        console.log('✅ Dark gradient mode enabled');
    }, 500);
})();
