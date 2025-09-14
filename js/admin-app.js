// admin-app.js - Main application initializer for Admin Mail
// Path: /js/admin-app.js
// Created: December 17, 2024
// Updated: September 12, 2025 - Added Portal pattern for theme panel

import MailController from '../modules/admin/controllers/MailController.js';
import { mailAPI } from '../modules/admin/services/MailAPIService.js';
import mailCache from '../modules/admin/services/MailCacheService.js';

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
    // Expose cache for DevTools testing
    try { window.mailCache = mailCache; } catch {}
    
    // Initialize Mail Controller
    try {
        const mailController = new MailController();
        window.mailController = mailController;

        // Minimal error UI with smart retry
        const retryDelaysMs = [1000, 3000, 3000]; // tuneable
        let lastSyncAt = null;

        // Connection status dot helpers (tiny indicator next to MAIL)
        function setConnectionStatus(state, title) {
            const dot = document.getElementById('connStatusDot');
            if (!dot) return;
            dot.classList.remove('status-online', 'status-sync', 'status-offline');
            if (state === 'offline') dot.classList.add('status-offline');
            else if (state === 'sync') dot.classList.add('status-sync');
            else dot.classList.add('status-online');
            if (title) dot.title = title;
        }

        function formatLastSync(ts) {
            if (!ts) return 'Never';
            try {
                const d = new Date(ts);
                const now = Date.now();
                const diff = Math.max(0, now - ts);
                const mins = Math.floor(diff / 60000);
                if (mins < 1) return 'Just now';
                if (mins === 1) return '1 minute ago';
                if (mins < 60) return `${mins} minutes ago`;
                return d.toLocaleString();
            } catch { return 'Unknown'; }
        }

        // Display-only indicator: no popover or click handlers

        window.addEventListener('online', () => {
            setConnectionStatus('online', 'Online');
        });
        window.addEventListener('offline', () => {
            setConnectionStatus('offline', 'Offline');
        });

        async function tryLoadEmails(attempt = 1) {
            const list = document.getElementById('emailList');
            if (attempt === 1 && list) {
                list.innerHTML = '<div class="loading"><span class="inline-spinner"></span> Loading emails…</div>';
            }
            try {
                setConnectionStatus('sync', 'Syncing…');
                let resp = await mailController.model.fetchEmailsFromAPI(mailController.model.currentFolder, 50);
                let emails = resp.emails;
                // If server says not modified, treat as success and stop here
                if (resp.notModified) {
                    console.log('Emails up to date (304 Not Modified)');
                    // Update folder state ETag if provided
                    try {
                        const currentAccount = mailAPI?.userId || 'admin';
                        const currentFolder = mailController.model.currentFolder || 'inbox';
                        await mailCache.putFolderState(currentAccount, currentFolder, {
                            etag: resp.etag || null,
                            lastModified: resp.lastModified || null,
                            nextToken: mailController.model.nextToken || null,
                            updatedAt: Date.now()
                        });
                    } catch {}
                    try { lastSyncAt = Date.now(); localStorage.setItem('blakely_mail_last_sync', String(lastSyncAt)); } catch {}
                    setConnectionStatus('online', 'Up to date');
                    return true;
                }
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
                    // Write-through cache (IndexedDB) — non-blocking
                    try {
                        const currentAccount = mailAPI?.userId || 'admin';
                        const currentFolder = mailController.model.currentFolder || 'inbox';
                        const transformed = mailController.model.emails;
                        // Persist list items
                        mailCache.upsertEmails(currentAccount, currentFolder, transformed)
                            .then(({ written }) => console.debug(`[Cache] upsertEmails written: ${written}`))
                            .catch((e) => console.warn('[Cache] upsertEmails failed', e));
                        // Persist folder state meta
                        mailCache.putFolderState(currentAccount, currentFolder, {
                            etag: resp.etag || null,
                            lastModified: resp.lastModified || null,
                            nextToken: mailController.model.nextToken || null,
                            updatedAt: Date.now()
                        }).catch((e) => console.warn('[Cache] putFolderState failed', e));
                    } catch (cacheErr) {
                        console.warn('Write-through cache failed:', cacheErr);
                    }

                    try { lastSyncAt = Date.now(); localStorage.setItem('blakely_mail_last_sync', String(lastSyncAt)); } catch {}
                    setConnectionStatus('online', 'Online');
                    console.log('Emails loaded from API');
                    // Auto-select previously viewed email, or the first email
                    try {
                        const account = document.getElementById('accountSelector')?.value || 'all';
                        const listNow = mailController.model.getEmails(mailController.model.currentFolder, account);
                        const savedUid = localStorage.getItem('lastSelectedEmailUid');
                        let target = null;
                        if (savedUid && typeof mailController.model.getEmailByUid === 'function') {
                            target = mailController.model.getEmailByUid(savedUid);
                        }
                        if (!target && listNow && listNow.length) {
                            target = listNow[0];
                        }
                        if (target) {
                            mailController.selectEmail(target.id);
                        }
                    } catch (e) {
                        console.warn('Auto-select email failed:', e);
                    }
                    return true;
                }
                throw new Error('No emails returned');
            } catch (err) {
                console.error(`Failed to load emails (attempt ${attempt}):`, err);
                // No toasts: rely on inline list UI only
                if (attempt < retryDelaysMs.length) {
                    const nextDelay = retryDelaysMs[attempt - 1];
                    setTimeout(() => tryLoadEmails(attempt + 1), nextDelay);
                } else {
                    setConnectionStatus(navigator.onLine ? 'online' : 'offline', navigator.onLine ? 'Online' : 'Offline');
                    // Final failure: show minimal inline retry UI (no toasts)
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

        // Cache-first render: preload from IndexedDB, then kick off network fetch
        (async () => {
            try {
                const savedFolder = localStorage.getItem('lastSelectedFolder') || 'inbox';
                const savedAccount = localStorage.getItem('lastSelectedAccount') || mailAPI.userId || 'admin';
                const cached = await mailCache.getEmailsByFolder(savedAccount, savedFolder, 50);
                if (cached && cached.length) {
                    // Map cached records to API-like shape and transform
                    const toApiShape = (r) => ({
                        emailId: r.emailId,
                        from: r.from,
                        fromName: r.fromName,
                        to: r.to,
                        cc: r.cc,
                        bcc: r.bcc,
                        subject: r.subject,
                        htmlBody: r.htmlBody,
                        textBody: r.textBody,
                        timestamp: r.timestamp,
                        status: r.unread ? 'unread' : 'read',
                        starred: r.starred,
                        folder: r.folder,
                        attachments: r.attachments || []
                    });
                    const transformed = cached.map(r => mailController.model.transformAPIEmail(toApiShape(r), r.folder));
                    // Set current folder and render list from cache
                    mailController.model.setCurrentFolder(savedFolder);
                    mailController.model.emails = transformed;
                    mailController.model.updateFolderCounts();
                    mailController.loadFolders();
                    mailController.loadEmails(savedFolder, savedAccount);

                    // Auto-select last viewed or first
                    const savedUid = localStorage.getItem('lastSelectedEmailUid');
                    let target = null;
                    if (savedUid && typeof mailController.model.getEmailByUid === 'function') {
                        target = mailController.model.getEmailByUid(savedUid);
                    }
                    if (!target && transformed && transformed.length) {
                        target = transformed[0];
                    }
                    if (target) {
                        mailController.selectEmail(target.id);
                    }
                }
            } catch (e) {
                console.warn('Cache-first preload failed:', e);
            } finally {
                // Kick off network fetch shortly after preload
                setTimeout(() => { tryLoadEmails(1); }, 100);
            }
        })();
        
        if (window.initMailFunctions) {
            window.initMailFunctions(mailController);
        }
        
        console.log("Admin Mail initialized successfully");    } catch (error) {
        console.error('Failed to initialize Admin Mail:', error);
    }
    
    // Initialize Theme Management
    initializeThemeManagement();

    // Register Service Worker (scope: site root) — silent, no prompts
    try {
        if ('serviceWorker' in navigator) {
            const isLocalhost = ['localhost', '127.0.0.1'].includes(location.hostname);
            if (location.protocol === 'https:' || isLocalhost) {
                navigator.serviceWorker.register('/service-worker.js', { scope: '/' })
                    .then(reg => { console.log('Service Worker registered:', reg.scope); })
                    .catch(err => console.warn('Service Worker registration failed:', err));
            }
        }
    } catch (e) {
        console.warn('Service Worker not registered:', e);
    }
});

// Message sent animation helper (uses the header status dot)
window.showMessageSent = function() {
    try {
        const dot = document.getElementById('connStatusDot');
        const target = document.querySelector('.compose-container, .compose-btn, [data-compose]');
        if (!dot || !target) return;

        const dotRect = dot.getBoundingClientRect();
        const trgRect = target.getBoundingClientRect();
        const deltaX = (trgRect.left + trgRect.width / 2) - (dotRect.left + dotRect.width / 2);
        const deltaY = (trgRect.top + trgRect.height / 2) - (dotRect.top + dotRect.height / 2);

        // Create a flying clone of the dot at its current position
        const flyingDot = dot.cloneNode(true);
        const cs = window.getComputedStyle(dot);
        flyingDot.style.position = 'fixed';
        flyingDot.style.left = `${dotRect.left}px`;
        flyingDot.style.top = `${dotRect.top}px`;
        flyingDot.style.width = cs.width;
        flyingDot.style.height = cs.height;
        flyingDot.style.margin = '0';
        flyingDot.style.zIndex = '10000';
        flyingDot.style.pointerEvents = 'none';
        flyingDot.style.transition = 'transform 1s cubic-bezier(0.4, 0, 0.2, 1), opacity 1s linear';
        document.body.appendChild(flyingDot);

        // Trigger flight on next frame
        requestAnimationFrame(() => {
            flyingDot.style.transform = `translate(${deltaX}px, ${deltaY}px) scale(0.5)`;
            flyingDot.style.opacity = '0';
        });

        // After flight completes, glow compose and show SENT
        setTimeout(() => {
            try {
                const pos = window.getComputedStyle(target).position;
                if (pos === 'static') target.style.position = 'relative';
                target.classList.add('message-sent');
                const sent = document.createElement('span');
                sent.className = 'sent-indicator';
                sent.textContent = 'SENT';
                target.appendChild(sent);
                setTimeout(() => {
                    target.classList.remove('message-sent');
                    sent.remove();
                }, 2000);
            } finally {
                flyingDot.remove();
            }
        }, 1000);
    } catch (e) {
        console.warn('showMessageSent failed:', e);
    }
}

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
