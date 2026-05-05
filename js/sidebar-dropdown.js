<script>
// Sidebar Dropdown for My Learning Hub - WITH MOBILE CLOSE FIX
(function() {
    'use strict';
    
    console.log('📂 Sidebar dropdown initializing with mobile close...');
    
    // Function to close sidebar on mobile
    function closeMobileSidebar() {
        // Check if on mobile (screen width <= 768px)
        if (window.innerWidth <= 768) {
            const sidebar = document.getElementById('sidebar');
            const overlay = document.getElementById('overlay');
            
            if (sidebar) {
                sidebar.classList.remove('active', 'open');
                // Force remove inline styles if any
                sidebar.style.transform = '';
                sidebar.style.left = '';
            }
            if (overlay) {
                overlay.classList.remove('active');
                overlay.style.display = 'none';
            }
            if (document.body) {
                document.body.style.overflow = '';
                document.body.classList.remove('menu-open');
            }
            console.log('📱 Mobile sidebar closed');
        }
    }
    
    // Function to show regular tabs
    function showRegularTab(tabName) {
        // Close sidebar first on mobile
        closeMobileSidebar();
        
        // Hide all tabs
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.style.display = 'none';
            tab.classList.remove('active');
        });
        
        // Show selected tab
        const selectedTab = document.getElementById(tabName);
        if (selectedTab) {
            selectedTab.style.display = 'block';
            selectedTab.classList.add('active');
        }
        
        // Update active state on nav links
        document.querySelectorAll('.nav a').forEach(link => link.classList.remove('active'));
        const activeLink = document.querySelector(`a[data-tab="${tabName}"]`);
        if (activeLink) activeLink.classList.add('active');
        
        // Save to localStorage
        localStorage.setItem('nchsm_current_tab', tabName);
        
        console.log('📂 Showed tab:', tabName);
    }
    
    // Function to show hub modules
    function showHubModule(moduleId) {
        // Close sidebar first on mobile
        closeMobileSidebar();
        
        // Show learning hub tab
        const learningHubTab = document.getElementById('learning-hub');
        if (learningHubTab) {
            document.querySelectorAll('.tab-content').forEach(tab => tab.style.display = 'none');
            learningHubTab.style.display = 'block';
            learningHubTab.classList.add('active');
        }
        
        // Hide all hub modules
        const modules = ['hub-courses', 'hub-register', 'hub-online-learning', 'hub-exam-card'];
        modules.forEach(id => {
            const module = document.getElementById(id);
            if (module) module.style.display = 'none';
        });
        
        // Show selected module
        const selected = document.getElementById(moduleId);
        if (selected) {
            selected.style.display = 'block';
        }
        
        // Update active states
        document.querySelectorAll('.nav a').forEach(link => link.classList.remove('active'));
        const hubLink = document.querySelector('.nav a[data-tab="learning-hub"]');
        if (hubLink) hubLink.classList.add('active');
        
        document.querySelectorAll('.dropdown-submenu a').forEach(a => a.classList.remove('active'));
        const activeItem = document.querySelector(`.dropdown-submenu a[data-tab="${moduleId}"]`);
        if (activeItem) activeItem.classList.add('active');
        
        // Save to localStorage
        localStorage.setItem('nchsm_current_tab', 'learning-hub');
        localStorage.setItem('nchsm_current_module', moduleId);
        
        console.log('📂 Showed hub module:', moduleId);
    }
    
    // Setup dropdown toggle - FIXED to work with both click and arrow
    const dropdownParent = document.querySelector('.has-dropdown');
    const dropdownToggle = document.querySelector('.has-dropdown > a');
    const dropdownMenu = document.querySelector('.dropdown-submenu');
    
    if (dropdownToggle && dropdownMenu) {
        // Remove existing listeners by cloning
        const newToggle = dropdownToggle.cloneNode(true);
        dropdownToggle.parentNode.replaceChild(newToggle, dropdownToggle);
        
        newToggle.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            const parent = this.closest('.has-dropdown');
            const isOpen = parent.classList.contains('open');
            
            if (isOpen) {
                parent.classList.remove('open');
                dropdownMenu.style.display = 'none';
                console.log('📂 Dropdown closed');
            } else {
                // Close any other open dropdowns
                document.querySelectorAll('.has-dropdown.open').forEach(drop => {
                    drop.classList.remove('open');
                    const menu = drop.querySelector('.dropdown-submenu');
                    if (menu) menu.style.display = 'none';
                });
                parent.classList.add('open');
                dropdownMenu.style.display = 'block';
                console.log('📂 Dropdown opened');
            }
        });
        console.log('✅ Dropdown toggle setup complete');
    }
    
    // Setup submenu items - FIXED with mobile close
    const dropdownItems = document.querySelectorAll('.dropdown-submenu a');
    console.log(`Found ${dropdownItems.length} dropdown items`);
    
    dropdownItems.forEach(item => {
        // Remove existing listeners by cloning
        const newItem = item.cloneNode(true);
        item.parentNode.replaceChild(newItem, item);
        
        newItem.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            const tab = this.getAttribute('data-tab');
            console.log(`🖱️ Dropdown item clicked: ${tab}`);
            
            // Close the dropdown menu
            if (dropdownParent) {
                dropdownParent.classList.remove('open');
                if (dropdownMenu) dropdownMenu.style.display = 'none';
            }
            
            // Navigate to the appropriate content
            if (tab) {
                if (tab.startsWith('hub-')) {
                    showHubModule(tab);
                } else {
                    showRegularTab(tab);
                }
            }
            
            // Update active class
            dropdownItems.forEach(a => a.classList.remove('active'));
            this.classList.add('active');
        });
    });
    
    // Also fix the main sidebar "My Learning Hub" link
    const mainHubLink = document.querySelector('.nav a[data-tab="learning-hub"]');
    if (mainHubLink) {
        const newHubLink = mainHubLink.cloneNode(true);
        mainHubLink.parentNode.replaceChild(newHubLink, mainHubLink);
        
        newHubLink.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            console.log('🖱️ Main Learning Hub link clicked');
            
            // On mobile, go directly to courses and close sidebar
            if (window.innerWidth <= 768) {
                closeMobileSidebar();
                showHubModule('hub-courses');
            } else {
                // On desktop, just toggle the dropdown
                if (dropdownParent) {
                    const isOpen = dropdownParent.classList.contains('open');
                    if (isOpen) {
                        dropdownParent.classList.remove('open');
                        if (dropdownMenu) dropdownMenu.style.display = 'none';
                    } else {
                        dropdownParent.classList.add('open');
                        if (dropdownMenu) dropdownMenu.style.display = 'block';
                    }
                }
            }
        });
    }
    
    // Close dropdown when clicking outside
    document.addEventListener('click', function(e) {
        if (dropdownParent && !dropdownParent.contains(e.target)) {
            if (dropdownParent.classList.contains('open')) {
                dropdownParent.classList.remove('open');
                if (dropdownMenu) dropdownMenu.style.display = 'none';
            }
        }
    });
    
    // Also close sidebar when overlay is clicked
    const overlay = document.getElementById('overlay');
    if (overlay) {
        overlay.addEventListener('click', closeMobileSidebar);
    }
    
    // Close sidebar on escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && window.innerWidth <= 768) {
            closeMobileSidebar();
        }
    });
    
    // Restore last viewed module on page load
    const lastModule = localStorage.getItem('nchsm_current_module');
    if (lastModule && lastModule.startsWith('hub-')) {
        console.log(`Restoring last module: ${lastModule}`);
        setTimeout(() => showHubModule(lastModule), 500);
    } else if (localStorage.getItem('nchsm_current_tab') === 'learning-hub') {
        setTimeout(() => showHubModule('hub-courses'), 500);
    }
    
    console.log('✅ Sidebar dropdown fully initialized with mobile close!');
    console.log('💡 On mobile, clicking any dropdown item will now close the sidebar.');
    
})();
</script>
