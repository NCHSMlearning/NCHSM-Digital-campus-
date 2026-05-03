<script>
// COMPLETE MODULE HANDLER - Fixes all Learning Hub modules
(function() {
    'use strict';
    
    console.log('🎯 COMPLETE MODULE HANDLER Initializing...');
    
    // Define all modules and their load functions
    const MODULES = {
        // Hub modules (inside Learning Hub)
        'hub-courses': {
            elementId: 'hub-courses',
            loadFn: () => window.coursesModule?.loadCourses ? window.coursesModule.loadCourses() : null,
            moduleName: 'My Courses'
        },
        'hub-register': {
            elementId: 'hub-register',
            loadFn: () => window.unitRegistrationModule?.loadUnits ? window.unitRegistrationModule.loadUnits() : null,
            moduleName: 'Register Units'
        },
        'hub-online-learning': {
            elementId: 'hub-online-learning',
            loadFn: () => console.log('📖 Online Learning module ready'),
            moduleName: 'Online Learning'
        },
        'hub-exam-card': {
            elementId: 'hub-exam-card',
            loadFn: () => window.examCardModule?.loadExamCard ? window.examCardModule.loadExamCard() : null,
            moduleName: 'Exam Card'
        },
        // Regular tabs (outside Learning Hub)
        'dashboard': { elementId: 'dashboard', loadFn: null, moduleName: 'Dashboard' },
        'profile': { elementId: 'profile', loadFn: null, moduleName: 'Profile' },
        'calendar': { elementId: 'calendar', loadFn: null, moduleName: 'Calendar' },
        'attendance': { elementId: 'attendance', loadFn: null, moduleName: 'Attendance' },
        'messages': { elementId: 'messages', loadFn: null, moduleName: 'Messages' },
        'support-tickets': { elementId: 'support-tickets', loadFn: null, moduleName: 'Support Tickets' },
        'cats': { elementId: 'cats', loadFn: null, moduleName: 'Exams & Grades' },
        'resources': { elementId: 'resources', loadFn: null, moduleName: 'Resources' },
        'nurseiq': { elementId: 'nurseiq', loadFn: null, moduleName: 'NurseIQ' }
    };
    
    // Helper: Show content
    function showContent(tabId) {
        console.log(`📂 Switching to: ${tabId}`);
        
        const isHubModule = tabId.startsWith('hub-');
        const learningHub = document.getElementById('learning-hub');
        
        if (isHubModule) {
            // Show Learning Hub section
            if (learningHub) learningHub.style.display = 'block';
            
            // Hide all regular tabs
            Object.keys(MODULES).forEach(id => {
                if (!id.startsWith('hub-')) {
                    const el = document.getElementById(MODULES[id].elementId);
                    if (el) el.style.display = 'none';
                }
            });
            
            // Hide all hub modules first
            Object.keys(MODULES).forEach(id => {
                if (id.startsWith('hub-')) {
                    const el = document.getElementById(MODULES[id].elementId);
                    if (el) el.style.display = 'none';
                }
            });
            
            // Show selected hub module
            const selectedModule = document.getElementById(tabId);
            if (selectedModule) {
                selectedModule.style.display = 'block';
                console.log(`✅ Showing ${MODULES[tabId]?.moduleName || tabId}`);
                
                // Load data for this module
                if (MODULES[tabId]?.loadFn) {
                    setTimeout(() => {
                        console.log(`🔄 Loading ${MODULES[tabId].moduleName} data...`);
                        MODULES[tabId].loadFn();
                    }, 150);
                }
            } else {
                console.log(`❌ Module element not found: ${tabId}`);
            }
        } else {
            // Regular tab - hide Learning Hub
            if (learningHub) learningHub.style.display = 'none';
            
            // Hide all hub modules
            Object.keys(MODULES).forEach(id => {
                if (id.startsWith('hub-')) {
                    const el = document.getElementById(MODULES[id].elementId);
                    if (el) el.style.display = 'none';
                }
            });
            
            // Hide all regular tabs
            Object.keys(MODULES).forEach(id => {
                if (!id.startsWith('hub-')) {
                    const el = document.getElementById(MODULES[id].elementId);
                    if (el) el.style.display = 'none';
                }
            });
            
            // Show selected regular tab
            const selectedTab = document.getElementById(tabId);
            if (selectedTab) {
                selectedTab.style.display = 'block';
                console.log(`✅ Showing ${MODULES[tabId]?.moduleName || tabId}`);
            }
        }
        
        // Update active states in sidebar
        document.querySelectorAll('.nav a, .dropdown-submenu a').forEach(link => {
            link.classList.remove('active');
        });
        const activeLink = document.querySelector(`a[data-tab="${tabId}"]`);
        if (activeLink) activeLink.classList.add('active');
    }
    
    // Setup dropdown toggle (My Learning Hub)
    const dropdownToggle = document.querySelector('.has-dropdown > a');
    const dropdownMenu = document.querySelector('.dropdown-submenu');
    
    if (dropdownToggle && dropdownMenu) {
        // Remove existing listeners to avoid duplicates
        const newToggle = dropdownToggle.cloneNode(true);
        dropdownToggle.parentNode.replaceChild(newToggle, dropdownToggle);
        
        newToggle.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const parent = newToggle.closest('.has-dropdown');
            const isOpen = parent.classList.contains('open');
            if (isOpen) {
                parent.classList.remove('open');
                dropdownMenu.style.display = 'none';
            } else {
                parent.classList.add('open');
                dropdownMenu.style.display = 'block';
            }
        });
    }
    
    // Setup all menu clicks (sidebar items and dropdown items)
    document.querySelectorAll('.nav a[data-tab], .dropdown-submenu a[data-tab]').forEach(item => {
        // Remove existing listeners
        const newItem = item.cloneNode(true);
        item.parentNode.replaceChild(newItem, item);
        
        newItem.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const tabId = newItem.getAttribute('data-tab');
            if (tabId && MODULES[tabId]) {
                showContent(tabId);
            } else if (tabId) {
                console.log(`⚠️ Unknown tab: ${tabId}`);
            }
        });
    });
    
    // Set default view to Dashboard
    showContent('dashboard');
    
    console.log(`✅ Module handler ready! Registered modules: ${Object.keys(MODULES).join(', ')}`);
})();
</script>
