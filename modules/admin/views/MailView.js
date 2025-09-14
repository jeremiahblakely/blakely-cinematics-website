// MailView.js - Complete View layer for Admin Mail
// Path: /modules/admin/views/MailView.js
// Updated: December 17, 2024

import ContentEditableCore from '../composers/ContentEditableCore.js';
import FormattingToolbar from '../composers/FormattingToolbar.js';
import SignatureService from '../services/SignatureService.js';

export default class MailView {
    constructor() {
        this.elements = {};
    }
    
    initialize() {
        this.elements = this.cacheElements();
        this.initializeNotificationSystem();
    }
    
    cacheElements() {
        return {
            // Email list
            emailList: document.getElementById('emailList'),
            searchInput: document.getElementById('searchInput'),
            accountSelector: document.getElementById('accountSelector'),
            
            // Email content
            emailSubject: document.getElementById('emailSubject'),
            emailBody: document.getElementById('emailBody'),
            senderAvatar: document.getElementById('senderAvatar'),
            senderName: document.getElementById('senderName'),
            senderEmail: document.getElementById('senderEmail'),
            emailDate: document.getElementById('emailDate'),
            emailMeta: document.getElementById('emailMeta'),
            emailActions: document.getElementById('emailActions'),
            
            // Reply box
            replyBox: document.getElementById('replyBox'),
            replyTo: document.getElementById('replyTo'),
            replyText: document.getElementById('replyText'),
            
            // Folders
            folderItems: document.querySelectorAll('.mail-folder-item'),
            
            // Calendar
            calendar: document.getElementById('calendar'),
            eventsWidget: document.getElementById('eventsWidget'),
            eventsList: document.getElementById('eventsList'),
            selectedDate: document.getElementById('selectedDate')
        };
    }
    
    bindEvents() {
        // Delegate events will be bound by controller
    }
    
    // Initialize notification system
    initializeNotificationSystem() {
        // Create notification container if it doesn't exist
        if (!document.getElementById('notificationContainer')) {
            const container = document.createElement('div');
            container.id = 'notificationContainer';
            container.style.cssText = `
                position: fixed;
                bottom: 20px;
                right: 20px;
                z-index: 9999;
                display: flex;
                flex-direction: column;
                gap: 10px;
            `;
            document.body.appendChild(container);
        }
    }
    
    // Email List Rendering
    renderEmailList(emails) {
        // Ensure elements are cached
        if (!this.elements || !this.elements.emailList) {
            this.elements = this.cacheElements();
        }
                // Ensure elements are cached if not already done
        if (!this.elements || !this.elements.emailList) {
            this.elements = this.cacheElements();
        }
        
        const emailList = this.elements.emailList;
        if (!emailList) {
            console.error('Email list element not found');
            return;
        }
        
        emailList.innerHTML = '';        
        if (!emails || emails.length === 0) {
            emailList.innerHTML = '<div class="no-emails">No emails in this folder</div>';
            return;
        }
        
        emails.forEach(email => {
            const emailItem = this.createEmailItem(email);
            emailList.appendChild(emailItem);
        });
        
        console.log(`Rendered ${emails.length} emails`);
    }
    
    createEmailItem(email) {
        const div = document.createElement('div');
        div.className = `mail-item mail-card ${email.unread ? 'unread' : ''} ${email.starred ? 'starred' : ''}`;
        div.dataset.emailId = email.id;
        if (email.emailId) {
            div.dataset.emailUid = email.emailId;
        }

        div.innerHTML = `
            <div class="mail-item-header">
                <span class="mail-item-sender">${this.escapeHtml(email.sender)}</span>
                <div class="mail-item-actions">
                    <span class="mail-item-time">${email.time}</span>
                    <span class="email-star" data-email-id="${email.id}" title="Star" style="cursor: pointer; font-size: 1rem;">
                        ${email.starred ? '⭐' : '☆'}
                    </span>
                </div>
            </div>
            <div class="mail-item-subject">${this.escapeHtml(email.subject)}</div>
            <div class="mail-item-preview">${this.escapeHtml(email.preview)}</div>
            <div class="mail-item-tags">
                ${email.tags.map(tag => `<span class="mail-tag ${tag}">${tag}</span>`).join('')}
                ${email.hasAttachments ? '<span class="mail-tag attachment">📎</span>' : ''}
            </div>
        `;

        return div;
    }
    
    // Email Content Display
    displayEmail(email) {
        if (!email) {
            this.clearEmailContent();
            return;
        }
        
        // Update content
        console.debug('[Mail] displayEmail render', {
            id: email.id,
            emailId: email.emailId,
            subject: email.subject,
            hasHtml: !!email.htmlBody || !!email.body,
            hasText: !!email.textBody
        });
        this.elements.emailSubject.textContent = email.subject || '(No Subject)';
        // Prefer provided HTML body; fallback to textBody; final fallback message
        let html = email.body || email.htmlBody || '';
        // Sanitize to avoid script execution warnings in sandboxed iframe
        try {
            // Remove <script> tags and inline event handlers to reduce console noise and improve safety
            html = (html || '').replace(/<script\b[\s\S]*?<\/script>/gi, '');
            html = html.replace(/ on[a-z]+\s*=\s*"[^"]*"/gi, '');
            html = html.replace(/ on[a-z]+\s*=\s*'[^']*'/gi, '');
            html = html.replace(/javascript:\s*/gi, '');
        } catch {}
        if (!html && email.textBody) {
            const esc = (s) => (s || '').replace(/[&<>]/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
            html = `<pre style="white-space:pre-wrap;">${esc(email.textBody)}</pre>`;
        }
        if (!html) {
            html = '<p style="color: var(--text-secondary);">(No content)</p>';
        }
        // Isolate email content inside a sandboxed iframe to prevent style leakage
        const container = this.elements.emailBody;
        while (container.firstChild) container.removeChild(container.firstChild);
        const iframe = document.createElement('iframe');
        iframe.className = 'email-iframe';
        iframe.setAttribute('sandbox', 'allow-same-origin');
        const docHtml = `<!doctype html><html><head><meta charset="utf-8"><style>
            html,body{margin:0;padding:0;background:transparent;color:#E0F2FE;font:14px/1.6 -apple-system, Inter, Segoe UI, Roboto, Arial, sans-serif;}
            img,video,canvas,svg{max-width:100%;height:auto}
            table{max-width:100%;border-collapse:collapse}
            a{color:#7dd3fc}
            blockquote{border-left:3px solid #555;padding-left:8px;margin-left:0}
            pre{white-space:pre-wrap}
        </style></head><body>` + html + `</body></html>`;
        iframe.srcdoc = docHtml;
        iframe.onload = () => {
            try {
                const b = iframe.contentDocument && iframe.contentDocument.body;
                if (b) iframe.style.height = Math.max(b.scrollHeight, b.offsetHeight, b.clientHeight) + 'px';
            } catch {}
        };
        container.appendChild(iframe);
        
        // Update sender info
        const initials = email.sender.split(' ').map(n => n[0]).join('');
        this.elements.senderAvatar.textContent = initials;
        this.elements.senderName.textContent = email.sender;
        this.elements.senderEmail.textContent = email.email;
        this.elements.emailDate.textContent = email.time;
        
        // Update reply box
        this.elements.replyTo.textContent = email.sender;
        
        // Update star button
        const starButton = document.querySelector('.mail-content-actions button[onclick="toggleStar()"] span');
        if (starButton) {
            starButton.textContent = email.starred ? '⭐' : '☆';
        }
        
        // Show meta and actions
        this.elements.emailMeta.style.display = 'flex';
        this.elements.emailActions.style.display = 'flex';
        
        // Update active state in list
        this.updateActiveEmailItem(email.id);
    }
    
    clearEmailContent() {
        this.elements.emailSubject.textContent = 'Select an email to read';
        this.elements.emailBody.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">No email selected</p>';
        this.elements.emailMeta.style.display = 'none';
        this.elements.emailActions.style.display = 'none';
    }
    
    updateActiveEmailItem(emailId) {
        // Remove previous active state
        document.querySelectorAll('.mail-item').forEach(item => {
            item.classList.remove('active');
        });
        
        // Add active state to selected email
        const selectedItem = document.querySelector(`[data-email-id="${emailId}"]`);
        if (selectedItem) {
            selectedItem.classList.add('active');
            selectedItem.classList.remove('unread');
        }
    }
    
    // Update email visual states
    updateEmailStar(emailId, isStarred) {
        const emailItem = document.querySelector(`[data-email-id="${emailId}"]`);
        if (emailItem) {
            const star = emailItem.querySelector('.email-star');
            if (star) {
                star.textContent = isStarred ? '⭐' : '☆';
                star.style.color = isStarred ? 'var(--warning)' : 'var(--text-muted)';
            }
            
            if (isStarred) {
                emailItem.classList.add('starred');
            } else {
                emailItem.classList.remove('starred');
            }
        }
        
        // Update star button in content area if this is the selected email
        const starButton = document.querySelector('.mail-content-actions button[onclick="toggleStar()"] span');
        if (starButton) {
            starButton.textContent = isStarred ? '⭐' : '☆';
        }
    }
    
    updateEmailReadStatus(emailId, isUnread) {
        const emailItem = document.querySelector(`[data-email-id="${emailId}"]`);
        if (emailItem) {
            if (isUnread) {
                emailItem.classList.add('unread');
            } else {
                emailItem.classList.remove('unread');
            }
        }
    }
    
    updateEmailSelection(emailId, isSelected) {
        const emailItem = document.querySelector(`[data-email-id="${emailId}"]`);
        if (emailItem) {
            const checkbox = emailItem.querySelector('.email-checkbox');
            if (checkbox) {
                checkbox.checked = isSelected;
            }
            
            if (isSelected) {
                emailItem.classList.add('selected');
            } else {
                emailItem.classList.remove('selected');
            }
        }
    }
    
    selectAllEmails(emailIds) {
        emailIds.forEach(id => {
            this.updateEmailSelection(id, true);
        });
    }
    
    updateBulkActionButtons(selectedCount) {
        // Show/hide checkboxes when selection mode is active
        const checkboxes = document.querySelectorAll('.mail-item-checkbox');
        checkboxes.forEach(cb => {
            cb.style.display = selectedCount > 0 ? 'block' : 'none';
        });
    }
    
    // Folder Rendering
    renderFolders(folders, activeFolder) {
        const sidebar = document.querySelector('.mail-folders');
        if (!sidebar) return;
        
        sidebar.innerHTML = '';
        
        folders.forEach((folder, index) => {
            // Add separator before bookings folder
            if (folder.id === 'bookings') {
                const separator = document.createElement('div');
                separator.className = 'folder-separator';
                sidebar.appendChild(separator);
            }
            
            // Add separator before trash
            if (folder.id === 'trash' || folder.id === 'archived') {
                const separator = document.createElement('div');
                separator.className = 'folder-separator';
                sidebar.appendChild(separator);
            }
            
            const folderItem = this.createFolderItem(folder, folder.id === activeFolder);
            sidebar.appendChild(folderItem);
        });
    }
    
    createFolderItem(folder, isActive) {
        const li = document.createElement('li');
        li.className = `mail-folder-item ${isActive ? 'active' : ''} folder-${folder.id}`;
        li.dataset.folder = folder.id;

        const count = Number.isFinite(folder.count) ? folder.count : (parseInt(folder.count) || 0);
        const countClass = count > 0 ? 'mail-folder-count has-unread' : 'mail-folder-count no-messages';

        li.innerHTML = `
            <div class="mail-folder-name">
                <span>${folder.icon}</span>
                <span>${folder.name}</span>
            </div>
            <span class="${countClass}">${count}</span>
        `;

        return li;
    }
    
    updateActiveFolder(folderId) {
        document.querySelectorAll('.mail-folder-item').forEach(item => {
            item.classList.remove('active');
            if (item.dataset.folder === folderId) {
                item.classList.add('active');
            }
        });
    }
    
    showReplyBox(replyData) {
        // Idempotent init: never destroy editor/toolbar here. Initialize once and reuse.
        if (this.elements.replyBox) {
            // Update reply metadata
            if (this.elements.replyTo && replyData && replyData.to) {
                this.elements.replyTo.textContent = replyData.to.join(', ');
            }
            
            // Initialize ContentEditableCore for reply box (same as ComposeView)
            if (!this.editorCore || !this.editorCore.initialized) {
                try {
                    this.editorCore = new ContentEditableCore();
                    const initialized = this.editorCore.init('replyText');
                    
                    if (initialized) {
                        console.log('[MailView] ContentEditableCore initialized successfully');
                        
                        // Initialize FormattingToolbar with the editor core
                        this.formattingToolbar = new FormattingToolbar(this.editorCore);
                        this.formattingToolbar.init();
                        
                        // Ensure toolbar has correct CSS class and ID for styling
                        const tbEl = document.querySelector('.formatting-toolbar');
                        if (tbEl) {
                            tbEl.id = 'replyToolbar';
                            
                            // Move toolbar into the reply box if not already there
                            const editorWrapper = this.elements.replyBox.querySelector('.editor-wrapper');
                            if (editorWrapper && tbEl.parentElement !== this.elements.replyBox) {
                                this.elements.replyBox.insertBefore(tbEl, editorWrapper);
                            }
                        }
                        
                        // Auto-append signature after initialization if available
                        if (this.signatureService) {
                            setTimeout(() => {
                                this.signatureService.appendToEditor(this.editorCore);
                                // Place cursor at the beginning
                                const editor = this.editorCore.editor;
                                if (editor) {
                                    editor.focus();
                                    const range = document.createRange();
                                    const selection = window.getSelection();
                                    range.selectNodeContents(editor);
                                    range.collapse(true);
                                    selection.removeAllRanges();
                                    selection.addRange(range);
                                }
                            }, 100);
                        }
                        
                        console.log('[MailView] Reply box now using ContentEditableCore like ComposeView');
                    } else {
                        console.warn('[MailView] Failed to initialize ContentEditableCore');
                    }
                } catch (error) {
                    console.error('[MailView] Error initializing ContentEditableCore:', error);
                    // Fallback to regular textarea behavior
                }
            }
            
            // Initialize adaptive behavior for the reply box (bind once)
            if (!this.replyAdaptiveBound) {
                this.initializeAdaptiveReply();
                this.replyAdaptiveBound = true;
            }
            
            // Show the reply box
            this.elements.replyBox.style.display = 'block';
            this.elements.replyBox.scrollIntoView({ behavior: 'smooth' });
            
            // Focus the editor
            if (this.editorCore && this.editorCore.initialized) {
                this.editorCore.focus();
            } else {
                // Fallback to textarea focus
                const replyText = document.getElementById('replyText');
                if (replyText) replyText.focus();
            }
        }
    }

    // Toolbar functionality is now handled by FormattingToolbar class

    // ADD this new method right after initializeToolbarButtons:
    initializeAdaptiveReply() {
        const replyBox = this.elements.replyBox;
        const wordCount = document.getElementById('wordCount');
        const draftIndicator = document.getElementById('draftIndicator');
        
        if (!replyBox) return;
        
        // Use event delegation for focus to handle dynamic element replacement
        replyBox.addEventListener('focus', (e) => {
            const targetId = e.target.id;
            if (targetId === 'replyText' || targetId === 'emailEditor' || e.target.classList.contains('contenteditable-editor')) {
                console.log('Reply editor focused - adding expanded class');
                replyBox.classList.add('expanded');
            }
        }, true);
        
        // Smart click-outside behavior - only minimize if truly empty
        const checkClickOutside = (e) => {
            if (!replyBox.contains(e.target) && 
                !e.target.closest('.action-btn') && 
                replyBox.classList.contains('expanded')) {
                
                // Get the actual editor element (ContentEditableCore creates 'emailEditor')
                const currentEditor = document.getElementById('emailEditor') || document.getElementById('replyText') || replyBox.querySelector('.contenteditable-editor');
                if (!currentEditor) return;
                
                // Check if editor has any meaningful content
                let hasContent = false;
                if (currentEditor.contentEditable === 'true' || currentEditor.contentEditable === true) {
                    // For contenteditable, check innerHTML after stripping tags
                    const textContent = (currentEditor.textContent || currentEditor.innerText || '').trim();
                    hasContent = textContent.length > 0;
                } else {
                    // Fallback for textarea
                    hasContent = (currentEditor.value || '').trim().length > 0;
                }
                
                // Only minimize if truly empty
                if (!hasContent) {
                    console.log('Clicked outside with empty editor - minimizing');
                    replyBox.classList.remove('expanded');
                }
                // If has content, do nothing - stay expanded
            }
        };

        // Use capturing phase to ensure we check after any other handlers
        if (!this._replyClickOutsideBound) {
            document.addEventListener('click', checkClickOutside, true);
            this._replyClickOutsideBound = true;
        }
        
        // Update word count using event delegation
        replyBox.addEventListener('input', (e) => {
            const target = e.target;
            if (target.id === 'replyText' || target.id === 'emailEditor' || target.classList.contains('contenteditable-editor')) {
                // Get text content based on element type
                let text = '';
                const isContentEditable = target.contentEditable === 'true' || target.contentEditable === true;
                if (isContentEditable) {
                    text = target.textContent || target.innerText || '';
                } else {
                    text = target.value || '';
                }
                
                // FIX: Add null check for trim
                const words = text.trim ? text.trim().split(/\s+/).filter(word => word.length > 0).length : 0;
                if (wordCount) {
                    wordCount.textContent = `${words} words`;
                }
                
                // Show draft saved indicator (simulated)
                this.showDraftSaved();
            }
        });
        
        // Add keyboard shortcuts using event delegation
        replyBox.addEventListener('keydown', (e) => {
            const target = e.target;
            if (target.id === 'replyText' || target.id === 'emailEditor' || target.classList.contains('contenteditable-editor')) {
                // Cmd/Ctrl + Enter to send
                if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                    e.preventDefault();
                    window.sendReply();
                }
                
                // Escape to minimize (not close)
                if (e.key === 'Escape') {
                    console.log('Escape pressed - removing expanded class');
                    replyBox.classList.remove('expanded');
                }
            }
        });
    }

    // ADD this helper method after initializeAdaptiveReply:
    showDraftSaved() {
        const indicator = document.getElementById('draftIndicator');
        if (!indicator) return;
        
        // Clear existing timeout
        if (this.draftTimeout) {
            clearTimeout(this.draftTimeout);
        }
        
        // Show indicator
        indicator.classList.add('show');
        
        // Hide after 2 seconds
        this.draftTimeout = setTimeout(() => {
            indicator.classList.remove('show');
        }, 2000);
    }
    
    hideReplyBox() {
        if (this.elements.replyBox) {
            this.elements.replyBox.style.display = 'none';
            
            // Clear editor content but keep the editor initialized
            if (this.editorCore && this.editorCore.initialized) {
                this.editorCore.clearContent();
            } else {
                // Fallback cleanup for textarea
                const replyText = document.getElementById('replyText');
                if (replyText) {
                    replyText.value = '';
                }
                
                // Remove any orphaned emailEditor
                const emailEditor = document.getElementById('emailEditor');
                if (emailEditor) {
                    emailEditor.innerHTML = '';
                }
            }
        }
    }
    
    getReplyText() {
        return this.elements.replyText ? this.elements.replyText.value : '';
    }
    
    getReplyData() {
        // Check if ContentEditableCore is active
        if (this.editorCore && this.editorCore.initialized) {
            const body = this.editorCore.getHTML();  // Get rich HTML from ContentEditableCore
            const to = this.elements.replyTo ? this.elements.replyTo.textContent.split(',').map(e => e.trim()) : [];
            
            return {
                to,
                cc: [],
                bcc: [],
                subject: this.model?.selectedEmail?.subject || '',
                body,
                threadId: this.model?.selectedEmail?.threadId || null
            };
        }
        
        // Fallback to textarea
        const replyText = document.getElementById('replyText');
        if (!replyText) return null;
        
        const body = replyText.value || '';
        const to = this.elements.replyTo ? this.elements.replyTo.textContent.split(',').map(e => e.trim()) : [];
        
        return {
            to,
            cc: [],
            bcc: [],
            subject: this.model?.selectedEmail?.subject || '',
            body,
            threadId: this.model?.selectedEmail?.threadId || null
        };
    }
    
    // Notification System
    showNotification(message, type = 'info', showUndo = false) {
        const container = document.getElementById('notificationContainer');
        if (!container) return;
        
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.style.cssText = `
            background: ${type === 'success' ? 'var(--success)' : type === 'error' ? 'var(--error)' : 'var(--info)'};
            color: var(--bg-primary);
            padding: 12px 20px;
            border-radius: 8px;
            display: flex;
            align-items: center;
            gap: 12px;
            animation: slideInRight 0.3s ease-out;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        `;
        
        notification.innerHTML = `
            <span>${message}</span>
            ${showUndo ? '<button onclick="undo()" style="background: rgba(255,255,255,0.2); border: none; padding: 4px 12px; border-radius: 4px; cursor: pointer;">Undo</button>' : ''}
            <button onclick="this.parentElement.remove()" style="background: none; border: none; color: inherit; cursor: pointer; margin-left: auto;">✕</button>
        `;
        
        container.appendChild(notification);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (notification.parentElement) {
                notification.style.animation = 'slideOutRight 0.3s ease-out';
                setTimeout(() => notification.remove(), 300);
            }
        }, 5000);
    }
    
    // Folder Picker Modal
    showFolderPicker(folders, callback) {
        // Create modal
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.style.cssText = `
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
        `;
        
        const modalContent = document.createElement('div');
        modalContent.className = 'modal-content';
        modalContent.style.cssText = `
            background: var(--bg-secondary);
            border: 1px solid var(--border-default);
            border-radius: 12px;
            padding: 24px;
            max-width: 400px;
            width: 90%;
        `;
        
        modalContent.innerHTML = `
            <h3 style="margin-bottom: 20px; color: var(--accent-primary);">Move to folder</h3>
            <div style="display: flex; flex-direction: column; gap: 8px;">
                ${folders.map(f => `
                    <button class="folder-option" data-folder="${f.id}" style="
                        background: var(--surface);
                        border: 1px solid var(--border-default);
                        padding: 12px;
                        border-radius: 6px;
                        color: var(--text-primary);
                        cursor: pointer;
                        text-align: left;
                        transition: all 0.2s;
                    ">
                        ${f.icon} ${f.name}
                    </button>
                `).join('')}
            </div>
            <button onclick="this.closest('.modal-overlay').remove()" style="
                margin-top: 16px;
                padding: 8px 16px;
                background: transparent;
                border: 1px solid var(--border-default);
                border-radius: 6px;
                color: var(--text-secondary);
                cursor: pointer;
            ">Cancel</button>
        `;
        
        modal.appendChild(modalContent);
        document.body.appendChild(modal);
        
        // Add event listeners
        modalContent.querySelectorAll('.folder-option').forEach(btn => {
            btn.addEventListener('click', () => {
                const folderId = btn.dataset.folder;
                modal.remove();
                callback(folderId);
            });
            
            btn.addEventListener('mouseenter', (e) => {
                e.target.style.background = 'var(--surface-hover)';
                e.target.style.borderColor = 'var(--accent-primary)';
            });
            
            btn.addEventListener('mouseleave', (e) => {
                e.target.style.background = 'var(--surface)';
                e.target.style.borderColor = 'var(--border-default)';
            });
        });
    }
    
    // Snooze Picker Modal
    showSnoozePicker(options, callback) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.style.cssText = `
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
        `;
        
        const modalContent = document.createElement('div');
        modalContent.className = 'modal-content';
        modalContent.style.cssText = `
            background: var(--bg-secondary);
            border: 1px solid var(--border-default);
            border-radius: 12px;
            padding: 24px;
            max-width: 400px;
            width: 90%;
        `;
        
        modalContent.innerHTML = `
            <h3 style="margin-bottom: 20px; color: var(--accent-primary);">Snooze until...</h3>
            <div style="display: flex; flex-direction: column; gap: 8px;">
                ${options.map(opt => `
                    <button class="snooze-option" data-hours="${opt.hours}" style="
                        background: var(--surface);
                        border: 1px solid var(--border-default);
                        padding: 12px;
                        border-radius: 6px;
                        color: var(--text-primary);
                        cursor: pointer;
                        text-align: left;
                        transition: all 0.2s;
                    ">
                        ⏰ ${opt.label}
                    </button>
                `).join('')}
            </div>
            <button onclick="this.closest('.modal-overlay').remove()" style="
                margin-top: 16px;
                padding: 8px 16px;
                background: transparent;
                border: 1px solid var(--border-default);
                border-radius: 6px;
                color: var(--text-secondary);
                cursor: pointer;
            ">Cancel</button>
        `;
        
        modal.appendChild(modalContent);
        document.body.appendChild(modal);
        
        // Add event listeners
        modalContent.querySelectorAll('.snooze-option').forEach(btn => {
            btn.addEventListener('click', () => {
                const hours = parseInt(btn.dataset.hours);
                modal.remove();
                callback(hours);
            });
            
            btn.addEventListener('mouseenter', (e) => {
                e.target.style.background = 'var(--surface-hover)';
                e.target.style.borderColor = 'var(--accent-primary)';
            });
            
            btn.addEventListener('mouseleave', (e) => {
                e.target.style.background = 'var(--surface)';
                e.target.style.borderColor = 'var(--border-default)';
            });
        });
    }
    
    // Compose Modal
    showComposeModal() {
        // TODO: Implement full compose modal
        this.showNotification('Compose modal coming soon!', 'info');
    }
    
    // Calendar Rendering
    renderCalendar(events) {
        if (!this.elements.calendar) return;
        
        this.elements.calendar.innerHTML = '';
        
        const days = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
        
        // Add day headers
        days.forEach(day => {
            const dayHeader = document.createElement('div');
            dayHeader.className = 'calendar-day';
            dayHeader.style.fontWeight = '600';
            dayHeader.style.color = 'var(--accent-primary)';
            dayHeader.textContent = day;
            this.elements.calendar.appendChild(dayHeader);
        });
        
        // Add days
        for (let i = 1; i <= 31; i++) {
            const dayEl = document.createElement('div');
            dayEl.className = 'calendar-day';
            dayEl.dataset.day = i;
            
            // Highlight today (17th for current date)
            if (i === 17) dayEl.classList.add('today');
            
            // Mark days with events
            if (events[i.toString()]) {
                dayEl.classList.add('has-event');
            }
            
            dayEl.textContent = i;
            this.elements.calendar.appendChild(dayEl);
        }
    }
    
    displayEvents(day, events) {
        if (!this.elements.eventsWidget) return;
        
        this.elements.selectedDate.textContent = `December ${day}`;
        this.elements.eventsList.innerHTML = '';
        
        if (events && events.length > 0) {
            events.forEach(event => {
                const eventItem = document.createElement('div');
                eventItem.className = 'event-item';
                eventItem.innerHTML = `
                    <div style="display: flex; justify-content: space-between;">
                        <div>
                            <div style="font-size: 0.9rem;">${event.title}</div>
                            <div style="font-size: 0.75rem; color: var(--text-secondary);">${event.time}</div>
                        </div>
                        <div style="width: 8px; height: 8px; background: var(--accent-primary); border-radius: 50%; align-self: center;"></div>
                    </div>
                `;
                this.elements.eventsList.appendChild(eventItem);
            });
        } else {
            this.elements.eventsList.innerHTML = '<div style="padding: 12px; text-align: center; color: var(--text-secondary);">No events scheduled</div>';
        }
        
        this.elements.eventsWidget.style.display = 'block';
    }
    
    hideEvents() {
        if (this.elements.eventsWidget) {
            this.elements.eventsWidget.style.display = 'none';
        }
    }
    
    // Account Selector
    renderAccounts(accounts) {
        if (!this.elements.accountSelector) return;
        
        this.elements.accountSelector.innerHTML = '';
        accounts.forEach(account => {
            const option = document.createElement('option');
            option.value = account.value;
            option.textContent = account.label;
            this.elements.accountSelector.appendChild(option);
        });
    }
    
    // Utility Methods
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Add notification animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
    
    .mail-item-checkbox {
        padding-right: 8px;
    }
    
    .mail-item-star {
        padding-right: 8px;
    }
    
    .mail-item-content {
        flex: 1;
    }
    
    .mail-item {
        display: flex;
        align-items: flex-start;
    }
    
    .mail-item.selected {
        background: rgba(0, 255, 255, 0.1) !important;
    }
`;
document.head.appendChild(style);
