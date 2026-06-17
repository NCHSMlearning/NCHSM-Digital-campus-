// ============================================
// COMPLETE CLEANUP SOLUTION
// ============================================

class SpinnerManager {
    constructor() {
        this.activeSpinners = [];
    }

    showSpinner(container, message = 'Loading...') {
        const spinner = document.createElement('div');
        spinner.className = 'loading-spinner';
        spinner.innerHTML = `
            <div class="spinner-icon"></div>
            <span class="spinner-message">${message}</span>
        `;
        
        if (container) {
            container.prepend(spinner);
        } else {
            document.body.prepend(spinner);
        }

        const cleanup = () => {
            if (spinner.parentElement) {
                spinner.remove();
            }
            const index = this.activeSpinners.indexOf(spinner);
            if (index > -1) {
                this.activeSpinners.splice(index, 1);
            }
        };

        this.activeSpinners.push(spinner);
        
        // Auto-cleanup after 30 seconds
        setTimeout(cleanup, 30000);
        
        return cleanup;
    }

    cleanupAll() {
        this.activeSpinners.forEach(spinner => {
            if (spinner.parentElement) {
                spinner.remove();
            }
        });
        this.activeSpinners = [];
    }
}

window.spinnerManager = new SpinnerManager();

// Enhanced tab switching
function showTab(tabId) {
    // Clean up spinners
    if (window.spinnerManager) {
        window.spinnerManager.cleanupAll();
    }

    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
        tab.hidden = true;
        
        // Pause animations
        tab.querySelectorAll('*').forEach(el => {
            const style = window.getComputedStyle(el);
            if (style.animationName && style.animationName !== 'none') {
                el.style.animationPlayState = 'paused';
            }
        });
    });

    // Show selected tab
    const target = document.getElementById(tabId);
    if (target) {
        target.classList.add('active');
        target.hidden = false;
        
        // Resume animations
        target.querySelectorAll('*').forEach(el => {
            const style = window.getComputedStyle(el);
            if (style.animationName && style.animationName !== 'none') {
                el.style.animationPlayState = 'running';
            }
        });
    }
}

window.showTab = showTab;

// Page unload cleanup
window.addEventListener('beforeunload', function() {
    if (window.spinnerManager) {
        window.spinnerManager.cleanupAll();
    }
});

console.log('✅ Cleanup module loaded');
