<script>
// Sidebar Dropdown for My Learning Hub
(function() {
    'use strict';
    
    console.log('📂 Sidebar dropdown initializing...');
    
    // Function to show regular tabs
    function showRegularTab(tabName) {
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.style.display = 'none';
            tab.classList.remove('active');
        });
        const selectedTab = document.getElementById(tabName);
        if (selectedTab) {
            selectedTab.style.display = 'block';
            selectedTab.classList.add('active');
        }
        document.querySelectorAll('.nav a').forEach(link => link.classList.remove('active'));
        const activeLink = document.querySelector(`a[data-tab="${tabName}"]`);
        if (activeLink) activeLink.classList.add('active');
    }
    
    // Function to show hub modules
    function showHubModule(moduleId) {
        // Show learning hub tab first
        const learningHubTab = document.getElementById('learning-hub');
        if (learningHubTab && learningHubTab.style.display === 'none') {
            document.querySelectorAll('.tab-content').forEach(tab => tab.style.display = 'none');
            learningHubTab.style.display = 'block';
        }
        // Hide all hub modules
        const modules = ['hub-courses', 'hub-register', 'hub-online-learning', 'hub-exam-card'];
        modules.forEach(id => {
            const module = document.getElementById(id);
            if (module) module.style.display = 'none';
        });
        // Show selected module
        const selected = document.getElementById(moduleId);
        if (selected) selected.style.display = 'block';
        console.log('Showing:', moduleId);
    }
    
    // Setup dropdown toggle
    const dropdownToggle = document.querySelector('.has-dropdown > a');
    const dropdownMenu = document.querySelector('.dropdown-submenu');
    if (dropdownToggle && dropdownMenu) {
        dropdownToggle.addEventListener('click', function(e) {
            e.preventDefault();
            const parent = this.closest('.has-dropdown');
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
    
    // Setup submenu items
    document.querySelectorAll('.dropdown-submenu a').forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            const tab = this.getAttribute('data-tab');
            if (tab) {
                if (tab.startsWith('hub-')) {
                    showHubModule(tab);
                } else {
                    showRegularTab(tab);
                }
                document.querySelectorAll('.dropdown-submenu a').forEach(a => a.classList.remove('active'));
                this.classList.add('active');
            }
        });
    });
    
    console.log('✅ Sidebar dropdown initialized');
})();
</script>
