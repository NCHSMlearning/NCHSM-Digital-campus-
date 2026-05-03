// sidebar-dropdown.js - Dropdown functionality for My Learning Hub
(function() {
    'use strict';
    
    console.log('📂 Sidebar dropdown initializing...');
    
    function initSidebarDropdown() {
        const dropdownToggle = document.querySelector('.has-dropdown > a');
        const dropdownMenu = document.querySelector('.dropdown-submenu');
        
        if (!dropdownToggle || !dropdownMenu) {
            console.log('⚠️ Dropdown elements not found yet, waiting...');
            return;
        }
        
        console.log('✅ Dropdown elements found, attaching event listeners');
        
        dropdownToggle.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            const parent = this.closest('.has-dropdown');
            const isOpen = parent.classList.contains('open');
            
            // Close other dropdowns if needed
            document.querySelectorAll('.has-dropdown').forEach(item => {
                if (item !== parent) {
                    item.classList.remove('open');
                    const otherMenu = item.querySelector('.dropdown-submenu');
                    if (otherMenu) otherMenu.style.display = 'none';
                }
            });
            
            // Toggle current
            if (isOpen) {
                parent.classList.remove('open');
                dropdownMenu.style.display = 'none';
            } else {
                parent.classList.add('open');
                dropdownMenu.style.display = 'block';
            }
        });
    }
    
    // Handle submenu item clicks
    function handleSubmenuClicks() {
        const submenuItems = document.querySelectorAll('.dropdown-submenu a');
        
        if (submenuItems.length === 0) {
            console.log('⚠️ No submenu items found');
            return;
        }
        
        console.log(`✅ Found ${submenuItems.length} submenu items`);
        
        submenuItems.forEach(item => {
            item.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                const tab = this.getAttribute('data-tab');
                console.log(`📂 Submenu clicked: ${tab}`);
                
                if (tab) {
                    // Hide all hub modules
                    document.querySelectorAll('.hub-module').forEach(module => {
                        module.style.display = 'none';
                    });
                    
                    // Show selected module
                    const selectedModule = document.getElementById(tab);
                    if (selectedModule) {
                        selectedModule.style.display = 'block';
                        console.log(`✅ Showing module: ${tab}`);
                    } else {
                        console.log(`❌ Module not found: ${tab}`);
                    }
                    
                    // Update active state in sidebar
                    document.querySelectorAll('.nav a').forEach(link => {
                        link.classList.remove('active');
                    });
                    this.classList.add('active');
                }
            });
        });
    }
    
    // Also handle the main Learning Hub click to show default module
    function handleMainLearningHubClick() {
        const learningHubLink = document.querySelector('a[data-tab="learning-hub"]');
        if (learningHubLink) {
            learningHubLink.addEventListener('click', function(e) {
                // Small delay to ensure the tab is shown
                setTimeout(() => {
                    // Show default module (courses) if no submenu item is active
                    const activeSubmenu = document.querySelector('.dropdown-submenu a.active');
                    if (!activeSubmenu) {
                        const defaultModule = document.getElementById('hub-courses');
                        if (defaultModule) {
                            document.querySelectorAll('.hub-module').forEach(module => {
                                module.style.display = 'none';
                            });
                            defaultModule.style.display = 'block';
                        }
                    }
                }, 100);
            });
        }
    }
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            initSidebarDropdown();
            handleSubmenuClicks();
            handleMainLearningHubClick();
        });
    } else {
        initSidebarDropdown();
        handleSubmenuClicks();
        handleMainLearningHubClick();
    }
})();
