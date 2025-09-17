/**
 * App Initialization Manager
 * Created: December 17, 2024
 * Purpose: Manage script loading order and prevent initialization errors
 */

window.BlakelyApp = {
    modules: {},
    initialized: {},
    
    /**
     * Register a module for initialization
     */
    register: function(name, initFunction, dependencies = []) {
        this.modules[name] = {
            init: initFunction,
            dependencies: dependencies,
            attempts: 0,
            maxAttempts: 10
        };
    },
    
    /**
     * Initialize a specific module
     */
    initModule: function(name) {
        const module = this.modules[name];
        if (!module || this.initialized[name]) return true;
        
        // Check dependencies first
        for (let dep of module.dependencies) {
            if (!this.initialized[dep]) {
                if (!this.initModule(dep)) {
                    return false;
                }
            }
        }
        
        // Check if DOM elements required exist
        module.attempts++;
        
        try {
            module.init();
            this.initialized[name] = true;
            console.log(`[App] Module initialized: ${name}`);
            return true;
        } catch (error) {
            console.error(`[App] Failed to init ${name}:`, error);
            
            // Retry if under max attempts
            if (module.attempts < module.maxAttempts) {
                setTimeout(() => this.initModule(name), 200 * module.attempts);
            }
            return false;
        }
    },
    
    /**
     * Initialize all registered modules
     */
    init: function() {
        console.log('[App] Starting initialization...');
        
        // Wait for DOM if not ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
            return;
        }
        
        // Initialize all modules
        Object.keys(this.modules).forEach(name => {
            this.initModule(name);
        });
    },
    
    /**
     * Check if element exists with retry
     */
    waitForElement: function(selector, callback, maxWait = 5000) {
        const startTime = Date.now();
        
        const check = () => {
            const element = document.querySelector(selector);
            
            if (element) {
                callback(element);
                return;
            }
            
            if (Date.now() - startTime < maxWait) {
                setTimeout(check, 100);
            } else {
                console.warn(`[App] Element not found after ${maxWait}ms: ${selector}`);
            }
        };
        
        check();
    }
};

// Auto-init when ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => BlakelyApp.init());
} else {
    // Small delay to ensure all scripts loaded
    setTimeout(() => BlakelyApp.init(), 100);
}