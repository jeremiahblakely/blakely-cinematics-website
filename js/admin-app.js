// admin-app.js - Main application initializer for Admin Mail
// Path: /js/admin-app.js
// Created: December 17, 2024
// Updated: September 12, 2025 - Added Portal pattern for theme panel

import MailController from '../modules/admin/controllers/MailController.js';
import { mailAPI } from '../modules/admin/services/MailAPIService.js';

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
        window.mailController = mailController;

        // Minimal error UI with smart retry
        const retryDelaysMs = [1000, 3000, 3000]; // tuneable

        async function tryLoadEmails(attempt = 1) {
            const list = document.getElementById('emailList');
            if (attempt === 1 && list) {
                list.innerHTML = '<div class="loading"><span class="inline-spinner"></span> Loading emails…</div>';
            }
            try {
                let resp = await mailController.model.fetchEmailsFromAPI(mailController.model.currentFolder, 50);
                let emails = resp.emails;
                // Fallback: if inbox is empty, try 'all' and normalize to inbox (unread->inbox)
                if ((!emails || emails.length === 0) && mailController.model.currentFolder !== 'all') {
                    resp = await mailController.model.fetchEmailsFromAPI('all', 50);
                    emails = resp.emails;
                }
                // Additional fallback: if still empty, auto-switch to userId 'admin' and retry once
                if ((!emails || emails.length === 0) && mailAPI && mailAPI.userId !== 'admin') {
                    console.warn('[Admin Mail] No emails found; switching userId to "admin" and retrying');
                    if (typeof mailAPI.setUserId === 'function') {
                        mailAPI.setUserId('admin');
                    } else {
                        mailAPI.userId = 'admin';
                        try { localStorage.setItem('adminUserId', 'admin'); } catch {}
                    }
                    const selector = document.getElementById('accountSelector');
                    if (selector) selector.value = 'admin';
                    resp = await mailController.model.fetchEmailsFromAPI('all', 50);
                    emails = resp.emails;
                }
                if (emails && emails.length) {
                    // Transform and set
                    mailController.model.emails = emails.map(e => mailController.model.transformAPIEmail(e, mailController.model.currentFolder));
                    mailController.model.nextToken = resp.nextToken || null;
                    mailController.model.updateFolderCounts();
                    mailController.loadEmails();
                    // Refresh sidebar counts now that emails are loaded
                    if (typeof mailController.updateFolderCounts === 'function') {
                        mailController.updateFolderCounts();
                    }
                    // Show Load more if available
                    if (typeof mailController.renderLoadMoreControl === 'function') {
                        mailController.renderLoadMoreControl();
                    }
                    console.log('Emails loaded from API');
                    mailController.view && mailController.view.showNotification('Emails loaded from API', 'success');
                    return true;
                }
                throw new Error('No emails returned');
            } catch (err) {
                console.error(`Failed to load emails (attempt ${attempt}):`, err);
                // If some emails already exist, show a light notice
                if (mailController.model.emails && mailController.model.emails.length > 0) {
                    mailController.view && mailController.view.showNotification('Trouble refreshing emails. Will retry…', 'info');
                }
                if (attempt < retryDelaysMs.length) {
                    const nextDelay = retryDelaysMs[attempt - 1];
                    setTimeout(() => tryLoadEmails(attempt + 1), nextDelay);
                } else {
                    // Final failure: show minimal inline retry UI
                    mailController.view && mailController.view.showNotification('Unable to load emails. Check connection or retry.', 'error');
                    if (list) {
                        list.innerHTML = '<div class="no-emails">Unable to load emails. <button id="retryEmailBtn" class="retry-btn" style="margin-left:8px;">Retry</button></div>';
                        const btn = document.getElementById('retryEmailBtn');
                        if (btn) btn.addEventListener('click', () => tryLoadEmails(1));
                    }
                    return false;
                }
            }
        }

        // Expose manual retry
        window.retryEmailLoad = () => tryLoadEmails(1);

        // Kick off initial load shortly after init
        setTimeout(() => { tryLoadEmails(1); }, 100);
        
        if (window.initMailFunctions) {
            window.initMailFunctions(mailController);
        }
        
        console.log("Admin Mail initialized successfully");    } catch (error) {
        console.error('Failed to initialize Admin Mail:', error);
    }
    
    // Initialize Theme Management
    initializeThemeManagement();
});

// Updated: September 12, 2025 - Enhanced theme application
// Override the applyTheme function to sync reply box with compose theme
window.applyTheme = function(themeName) {
    // Apply to compose container
    const composer = document.querySelector(".compose-container");
    if (composer) {
        // Remove all theme classes
        composer.classList.remove("compose-default", "compose-metallic", "compose-glass", "compose-solid", "compose-holo");
        // Add selected theme class
        composer.classList.add("compose-" + themeName);
    }
    
    // Apply to reply box as well
    const replyBox = document.querySelector(".reply-box");
    if (replyBox) {
        // Remove all theme classes
        replyBox.classList.remove("compose-default", "compose-metallic", "compose-glass", "compose-solid", "compose-holo");
        // Add selected theme class
        replyBox.classList.add("compose-" + themeName);
    }
    
    // Also apply to any future reply boxes that might be created
    const replyBoxId = document.getElementById("replyBox");
    if (replyBoxId) {
        replyBoxId.classList.remove("compose-default", "compose-metallic", "compose-glass", "compose-solid", "compose-holo");
        replyBoxId.classList.add("compose-" + themeName);
    }
    
    // Save preference
    localStorage.setItem("composeTheme", themeName);
}

// Apply saved theme on page load to reply box
document.addEventListener("DOMContentLoaded", function() {
    const savedTheme = localStorage.getItem("composeTheme") || "default";
    const replyBox = document.querySelector(".reply-box");
    if (replyBox) {
        replyBox.classList.add("compose-" + savedTheme);
    }
    const replyBoxId = document.getElementById("replyBox");
    if (replyBoxId) {
        replyBoxId.classList.add("compose-" + savedTheme);
    }
});


// Fix for reply box theme synchronization
// Added: September 12, 2025
document.addEventListener('DOMContentLoaded', function() {
    // Apply theme when reply box is shown
    const originalShowReply = window.showReply;
    if (typeof originalShowReply === 'function') {
        window.showReply = function() {
            // Call original function
            if (originalShowReply) originalShowReply.apply(this, arguments);
            
            // Apply current theme to reply box
            setTimeout(() => {
                const savedTheme = localStorage.getItem('composeTheme') || 'default';
                const replyBox = document.getElementById('replyBox');
                if (replyBox) {
                    // Remove all theme classes
                    replyBox.classList.remove('compose-default', 'compose-metallic', 'compose-glass', 'compose-solid', 'compose-holo');
                    // Add current theme
                    replyBox.classList.add('compose-' + savedTheme);
                    console.log('Applied theme to reply box:', savedTheme);
                }
            }, 100);
        };
    }
    
    // Also hook into any reply box visibility changes
    const replyBox = document.getElementById('replyBox');
    if (replyBox) {
        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                    const isVisible = replyBox.style.display !== 'none';
                    if (isVisible) {
                        const savedTheme = localStorage.getItem('composeTheme') || 'default';
                        replyBox.classList.remove('compose-default', 'compose-metallic', 'compose-glass', 'compose-solid', 'compose-holo');
                        replyBox.classList.add('compose-' + savedTheme);
                    }
                }
            });
        });
        
        observer.observe(replyBox, { attributes: true, attributeFilter: ['style'] });
    }
});

// Fix for compose/reply switching bug
// Added: September 12, 2025
(function() {
    // Override openCompose to cleanup reply box
    const originalOpenCompose = window.openCompose;
    if (typeof originalOpenCompose === 'function') {
        window.openCompose = function() {
            // Clean up reply box first
            const replyBox = document.getElementById('replyBox');
            if (replyBox) {
                // Remove all formatting toolbars from reply box
                const toolbars = replyBox.querySelectorAll('.formatting-toolbar');
                toolbars.forEach(tb => tb.remove());
                
                // Hide reply box
                replyBox.style.display = 'none';
            }
            
            // Call original function
            if (originalOpenCompose) {
                return originalOpenCompose.apply(this, arguments);
            }
        };
    }
    
    // Clean up on reply close
    const originalCloseReply = window.closeReply;
    if (typeof originalCloseReply === 'function') {
        window.closeReply = function() {
            // Clean up toolbars
            const replyBox = document.getElementById('replyBox');
            if (replyBox) {
                const toolbars = replyBox.querySelectorAll('.formatting-toolbar');
                if (toolbars.length > 1) {
                    // Keep only first toolbar, remove duplicates
                    for (let i = 1; i < toolbars.length; i++) {
                        toolbars[i].remove();
                    }
                }
            }
            
            // Call original
            if (originalCloseReply) {
                return originalCloseReply.apply(this, arguments);
            }
        };
    }
})();
