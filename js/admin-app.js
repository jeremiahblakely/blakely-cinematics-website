// admin-app.js - Main application initializer for Admin Mail
// Path: /js/admin-app.js
// Created: December 17, 2024
// Updated: September 12, 2025 - Added Portal pattern for theme panel

import MailController from '../modules/admin/controllers/MailController.js';

// Portal utility for rendering outside header hierarchy
class Portal {
    constructor() {
        this.portalRoot = null;
        this.activePanel = null;
    }

    mount(element) {
        if (!this.portalRoot) {
            this.portalRoot = document.getElementById('portal-root');
            if (!this.portalRoot) {
                // Create portal root if it doesn't exist
                this.portalRoot = document.createElement('div');
                this.portalRoot.id = 'portal-root';
                document.body.appendChild(this.portalRoot);
            }
        }
        
        // Clear any existing panel
        this.unmount();
        
        // Mount new panel
        this.activePanel = element;
        this.portalRoot.appendChild(element);
    }

    unmount() {
        if (this.activePanel && this.portalRoot) {
            this.portalRoot.removeChild(this.activePanel);
            this.activePanel = null;
        }
    }

    isActive() {
        return this.activePanel !== null;
    }
}

// Global portal instance
const portal = new Portal();

// Position panel relative to trigger button
function positionPanel(triggerElement, panelElement) {
    const rect = triggerElement.getBoundingClientRect();
    const panelHeight = panelElement.offsetHeight;
    const panelWidth = panelElement.offsetWidth;
    
    // Calculate position
    let top = rect.bottom + 8; // 8px gap below button
    let left = rect.right - panelWidth; // Align right edges
    
    // Adjust if panel would go off-screen
    if (top + panelHeight > window.innerHeight) {
        top = rect.top - panelHeight - 8; // Show above button
    }
    
    if (left < 0) {
        left = 8; // Minimum 8px from left edge
    }
    
    // Apply position
    panelElement.style.position = 'fixed';
    panelElement.style.top = `${top}px`;
    panelElement.style.left = `${left}px`;
    panelElement.style.zIndex = '1200';
}

// Theme Panel Management with Portal
function toggleThemePanel() {
    const button = document.querySelector('.theme-toggle-btn');
    let panel = document.getElementById('themePanel');
    
    if (!button || !panel) return;
    
    if (portal.isActive()) {
        // Close panel
        portal.unmount();
        panel.style.display = 'none';
        
        // Return panel to original position in DOM for next use
        button.parentElement.appendChild(panel);
    } else {
        // Open panel via portal
        panel.style.display = 'block';
        portal.mount(panel);
        positionPanel(button, panel);
        
        // Focus first input for accessibility
        const firstInput = panel.querySelector('input[type="radio"]');
        if (firstInput) firstInput.focus();
    }
}

// Make toggleThemePanel globally available
window.toggleThemePanel = toggleThemePanel;

// Close panel when clicking outside
function handleClickOutside(event) {
    const panel = document.getElementById('themePanel');
    const button = document.querySelector('.theme-toggle-btn');
    
    if (!portal.isActive()) return;
    
    // Check if click is outside both button and panel
    if (!button.contains(event.target) && !panel.contains(event.target)) {
        toggleThemePanel(); // Close panel
    }
}

// Close panel on Escape key
function handleEscapeKey(event) {
    if (event.key === 'Escape' && portal.isActive()) {
        toggleThemePanel();
        // Return focus to button
        const button = document.querySelector('.theme-toggle-btn');
        if (button) button.focus();
    }
}

// Apply selected theme to compose container
function applyTheme(themeName) {
    const composer = document.querySelector('.compose-container');
    if (composer) {
        // Remove all theme classes
        composer.classList.remove('compose-default', 'compose-metallic', 'compose-glass', 'compose-solid');
        // Add selected theme class
        composer.classList.add('compose-' + themeName);
        // Save preference
        localStorage.setItem('composeTheme', themeName);
    }
}

// Initialize theme management
function initializeThemeManagement() {
    const themePanel = document.getElementById('themePanel');
    if (!themePanel) return;
    
    // Initially hide the panel
    themePanel.style.display = 'none';
    
    // Add ARIA attributes for accessibility
    themePanel.setAttribute('role', 'menu');
    themePanel.setAttribute('aria-labelledby', 'theme-toggle-btn');
    
    // Set up event listeners
    document.addEventListener('click', handleClickOutside);
    document.addEventListener('keydown', handleEscapeKey);
    
    // Handle theme selection
    const themeOptions = document.querySelectorAll('input[name="composeTheme"]');
    themeOptions.forEach(option => {
        option.addEventListener('change', function() {
            applyTheme(this.value);
            toggleThemePanel(); // Close panel after selection
        });
    });
    
    // Load and apply saved theme on page load
    const savedTheme = localStorage.getItem('composeTheme') || 'default';
    const savedOption = document.querySelector(`input[name="composeTheme"][value="${savedTheme}"]`);
    if (savedOption) {
        savedOption.checked = true;
    }
    applyTheme(savedTheme);
    
    // Handle window resize to reposition panel if open
    window.addEventListener('resize', () => {
        if (portal.isActive()) {
            const button = document.querySelector('.theme-toggle-btn');
            const panel = document.getElementById('themePanel');
            if (button && panel) {
                positionPanel(button, panel);
            }
        }
    });
}

// Main initialization
document.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing Blakely Admin Mail...');
    
    // Initialize Mail Controller
    try {
        const mailController = new MailController();
        
        // Bind global functions
        if (window.initMailFunctions) {
            window.initMailFunctions(mailController);
        }
        
        window.mailController = mailController;
        
        console.log('Admin Mail initialized successfully');
    } catch (error) {
        console.error('Failed to initialize Admin Mail:', error);
    }
    
    // Initialize Theme Management
    initializeThemeManagement();
});