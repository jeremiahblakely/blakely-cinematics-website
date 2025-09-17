/**
 * Admin Mail Module Loader
 * Created: December 17, 2024 1:05 PM
 * Purpose: Load all mail modules in correct dependency order
 */

// Define the base path for modules
const MAIL_MODULE_PATH = 'js/admin/mail/';

// Define modules in dependency order
const mailModules = [
    'mail-formatting.js',     // Text formatting utilities
    'mail-pills.js',          // Email pill functionality
    'mail-folders.js',        // Folder count management
    'mail-list.js',          // Email list management  
    'mail-navigation.js',     // Folder navigation (depends on folders & list)
    'mail-reply-editor.js',   // Rich text editor
    'mail-compose.js',        // Compose functions (depends on pills)
    'mail-actions.js',        // Email actions
    'mail-patch.js',          // API integration patch
    'mail-bootstrap.js'       // Module registration (must be last)
];

// Load modules sequentially
console.log('[Mail Loader] Starting module load sequence...');

mailModules.forEach((module, index) => {
    const script = document.createElement('script');
    script.src = MAIL_MODULE_PATH + module;
    script.async = false; // Ensure sequential loading
    
    script.onload = () => {
        console.log(`[Mail Loader] Loaded ${index + 1}/${mailModules.length}: ${module}`);
    };
    
    script.onerror = (error) => {
        console.error(`[Mail Loader] Failed to load ${module}:`, error);
    };
    
    document.head.appendChild(script);
});

console.log('[Mail Loader] Module load sequence initiated');