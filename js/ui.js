// js/ui.js
class UIModule {
    constructor() {
        this.sidebar = document.getElementById('sidebar');
        this.overlay = document.querySelector('.overlay');
        this.navLinks = document.querySelectorAll('.nav a');
        this.tabs = document.querySelectorAll('.tab-content');
    }
    
    initialize() {
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        // Navigation links
        this.navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const tabId = link.getAttribute('data-tab');
                this.showTab(tabId);
            });
        });
        
        // Overlay click to close menu
        if (this.overlay) {
            this.overlay.addEventListener('click', () => this.closeMenu());
        }
    }
    
    showTab(tabId) {
        // Highlight active link
        this.navLinks.forEach(l => l.classList.remove('active'));
        const activeLink = document.querySelector(`.nav a[data-tab="${tabId}"]`);
        if (activeLink) activeLink.classList.add('active');
        
        // Show active tab content
        this.tabs.forEach(tab => tab.classList.remove('active'));
        const activeTab = document.getElementById(tabId);
        if (activeTab) activeTab.classList.add('active');
        
        // Close mobile menu if open
        this.closeMenu();
        
        // Dispatch custom event for tab change
        window.dispatchEvent(new CustomEvent('tabChanged', { detail: { tabId } }));
    }
    
    toggleMenu() {
        if (this.sidebar.classList.contains('open')) {
            this.closeMenu();
        } else {
            this.openMenu();
        }
    }
    
    openMenu() {
        if (this.sidebar) this.sidebar.classList.add('open');
        if (this.overlay) this.overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
    
    closeMenu() {
        if (this.sidebar) this.sidebar.classList.remove('open');
        if (this.overlay) this.overlay.classList.remove('active');
        document.body.style.overflow = 'auto';
    }
    
    showSystemInfo() {
        // Implementation for system info modal
        alert('System info feature coming soon');
    }
}
