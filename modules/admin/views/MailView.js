// MailView.js - Complete View layer for Admin Mail with Memory Leak Fixes
// Path: /modules/admin/views/MailView.js
// Updated: September 17, 2025

import ContentEditableCore from '../composers/ContentEditableCore.js';
import FormattingToolbar from '../composers/FormattingToolbar.js';
import SignatureService from '../services/SignatureService.js';

export default class MailView {
    constructor() {
        this.elements = {};
        this.signatureService = new SignatureService();
        this.listeners = [];
        this.timeouts = [];
        this.editorCore = null;
        this.formattingToolbar = null;
        this.wordCountTimeout = null;
        
        // Store bound methods for cleanup
        this.boundCheckClickOutside = null;
        this.boundHandleBeforeUnload = null;
        
        // Pagination state
        this.currentPage = 1;
        this.itemsPerPage = 50;
        this.totalEmails = 0;
    }
    
    // Parse strings like: "Name" <email@domain.com> into { name, address }
    parseAddressDisplay(raw) {
        if (!raw) return { name: '', address: '' };
        if (typeof raw === 'object' && (raw.address || raw.email || raw.name)) {
            return {
                name: (raw.name || '').toString().replace(/^"|"$/g, '').trim(),
                address: (raw.address || raw.email || '').toString().trim()
            };
        }
        const str = String(raw).trim();
        const m = str.match(/^\s*"?([^"<]+?)"?\s*<\s*([^>\s]+)\s*>\s*$/);
        if (m) return { name: m[1].trim(), address: m[2].trim() };
        const emailMatch = str.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
        return { name: str.replace(/<[^>]*>/g, '').replace(/"/g, '').trim(), address: emailMatch ? emailMatch[0] : '' };
    }
    
    initialize() {
        this.elements = this.cacheElements();
        this.initializeNotificationSystem();
        
        // Add cleanup on page unload
        this.boundHandleBeforeUnload = () => this.destroy();
        window.addEventListener('beforeunload', this.boundHandleBeforeUnload);
        this.addTrackedListener(window, 'beforeunload', this.boundHandleBeforeUnload);
    }
    
    // Helper to track listeners for cleanup
    addTrackedListener(element, event, handler, useCapture = false) {
        element.addEventListener(event, handler, useCapture);
        this.listeners.push({ element, event, handler, useCapture });
    }
    
    // Helper to track timeouts for cleanup
    addTrackedTimeout(callback, delay) {
        const timeoutId = setTimeout(callback, delay);
        this.timeouts.push(timeoutId);
        return timeoutId;
    }
    
    cacheElements() {
        return {
            emailList: document.getElementById('emailList'),
            searchInput: document.getElementById('searchInput'),
            accountSelector: document.getElementById('accountSelector'),
            emailSubject: document.getElementById('emailSubject'),
            emailBody: document.getElementById('emailBody'),
            senderAvatar: document.getElementById('senderAvatar'),
            senderName: document.getElementById('senderName'),
            senderEmail: document.getElementById('senderEmail'),
            emailDate: document.getElementById('emailDate'),
            emailMeta: document.getElementById('emailMeta'),
            emailActions: document.getElementById('emailActions'),
            replyBox: document.getElementById('replyBox'),
            replyTo: document.getElementById('replyTo'),
            replyEditor: document.getElementById('emailEditor'),
            folderItems: document.querySelectorAll('.mail-folder-item'),
            calendar: document.getElementById('calendar'),
            eventsWidget: document.getElementById('eventsWidget'),
            eventsList: document.getElementById('eventsList'),
            selectedDate: document.getElementById('selectedDate')
        };
    }
    
    // Initialize notification system
    initializeNotificationSystem() {
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
    
    // Email List Rendering with Pagination
    renderEmailList(emails) {
        if (!this.elements.emailList) {
            this.elements = this.cacheElements();
        }
        
        const emailList = this.elements.emailList;
        if (!emailList) {
            console.error('Email list element not found');
            return;
        }
        
        this.totalEmails = emails ? emails.length : 0;
        
        if (!emails || emails.length === 0) {
            emailList.innerHTML = '<div class="no-emails">No emails in this folder</div>';
            return;
        }
        
        // Calculate pagination
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        const emailsToRender = emails.slice(startIndex, endIndex);
        const totalPages = Math.ceil(emails.length / this.itemsPerPage);
        
        // Clear and render emails
        emailList.innerHTML = '';
        
        // Add pagination controls at top if more than one page (or if testing)
        const shouldShowPagination = totalPages > 1 || (window.FORCE_PAGINATION && emails.length > 0);
        if (shouldShowPagination) {
            const topPagination = this.createPaginationControls(Math.max(totalPages, 1));
            emailList.appendChild(topPagination);
        }
        
        // Render emails
        emailsToRender.forEach(email => {
            const emailItem = this.createEmailItem(email);
            emailList.appendChild(emailItem);
        });
        
        // Add pagination controls at bottom if more than one page (or if testing)
        if (shouldShowPagination) {
            const bottomPagination = this.createPaginationControls(Math.max(totalPages, 1));
            emailList.appendChild(bottomPagination);
        }
        
        // Scroll to top of list
        emailList.scrollTop = 0;
        
        console.log(`Page ${this.currentPage}/${totalPages}: Showing ${emailsToRender.length} of ${emails.length} emails`);
    }

    // Create pagination controls
    createPaginationControls(totalPages) {
        const container = document.createElement('div');
        container.className = 'pagination-controls';
        container.style.cssText = `
            display: flex;
            justify-content: center;
            align-items: center;
            gap: 10px;
            padding: 15px;
            background: rgba(0, 0, 0, 0.2);
            border-radius: 8px;
            margin: 10px 0;
        `;
        
        // Previous button
        const prevBtn = document.createElement('button');
        prevBtn.textContent = '← Previous';
        prevBtn.disabled = this.currentPage === 1;
        prevBtn.style.cssText = `
            padding: 8px 16px;
            background: ${this.currentPage === 1 ? 'rgba(255,255,255,0.1)' : 'var(--accent-primary)'};
            color: ${this.currentPage === 1 ? 'rgba(255,255,255,0.3)' : 'var(--bg-primary)'};
            border: none;
            border-radius: 6px;
            cursor: ${this.currentPage === 1 ? 'not-allowed' : 'pointer'};
            font-weight: 500;
            transition: all 0.2s;
        `;
        prevBtn.onclick = () => this.changePage(this.currentPage - 1);
        
        // Page number buttons (show 5 at most)
        const pageButtons = document.createElement('div');
        pageButtons.style.cssText = 'display: flex; gap: 5px;';
        
        let startPage = Math.max(1, this.currentPage - 2);
        let endPage = Math.min(totalPages, startPage + 4);
        if (endPage - startPage < 4) {
            startPage = Math.max(1, endPage - 4);
        }
        
        for (let i = startPage; i <= endPage; i++) {
            const pageBtn = document.createElement('button');
            pageBtn.textContent = i;
            pageBtn.style.cssText = `
                width: 36px;
                height: 36px;
                background: ${i === this.currentPage ? 'var(--accent-primary)' : 'rgba(255,255,255,0.1)'};
                color: ${i === this.currentPage ? 'var(--bg-primary)' : 'var(--text-primary)'};
                border: 1px solid ${i === this.currentPage ? 'var(--accent-primary)' : 'rgba(255,255,255,0.2)'};
                border-radius: 6px;
                cursor: pointer;
                font-weight: ${i === this.currentPage ? '600' : '400'};
                transition: all 0.2s;
            `;
            pageBtn.onclick = () => this.changePage(i);
            pageButtons.appendChild(pageBtn);
        }
        
        // Next button
        const nextBtn = document.createElement('button');
        nextBtn.textContent = 'Next →';
        nextBtn.disabled = this.currentPage === totalPages;
        nextBtn.style.cssText = `
            padding: 8px 16px;
            background: ${this.currentPage === totalPages ? 'rgba(255,255,255,0.1)' : 'var(--accent-primary)'};
            color: ${this.currentPage === totalPages ? 'rgba(255,255,255,0.3)' : 'var(--bg-primary)'};
            border: none;
            border-radius: 6px;
            cursor: ${this.currentPage === totalPages ? 'not-allowed' : 'pointer'};
            font-weight: 500;
            transition: all 0.2s;
        `;
        nextBtn.onclick = () => this.changePage(this.currentPage + 1);
        
        // Page info
        const pageInfo = document.createElement('span');
        pageInfo.style.cssText = 'color: var(--text-primary); font-size: 0.95rem; min-width: 120px; text-align: center;';
        pageInfo.textContent = `Page ${this.currentPage} of ${totalPages}`;
        
        // Items per page selector
        const perPageSelect = document.createElement('select');
        perPageSelect.style.cssText = `
            padding: 6px 10px;
            background: rgba(255,255,255,0.1);
            color: var(--text-primary);
            border: 1px solid rgba(255,255,255,0.2);
            border-radius: 6px;
            cursor: pointer;
            margin-left: 20px;
        `;
        [25, 50, 100].forEach(num => {
            const option = document.createElement('option');
            option.value = num;
            option.textContent = `${num} per page`;
            option.selected = num === this.itemsPerPage;
            perPageSelect.appendChild(option);
        });
        perPageSelect.onchange = (e) => {
            this.itemsPerPage = parseInt(e.target.value);
            this.currentPage = 1;
            this.refreshCurrentView();
        };
        
        // Assemble controls
        container.appendChild(prevBtn);
        container.appendChild(pageButtons);
        container.appendChild(nextBtn);
        container.appendChild(pageInfo);
        container.appendChild(perPageSelect);
        
        return container;
    }
    
    createEmailItem(email) {
        const div = document.createElement('div');
        div.className = `mail-item mail-card ${email.unread ? 'unread' : ''} ${email.starred ? 'starred' : ''}`;
        div.dataset.emailId = email.id;
        if (email.emailId) {
            div.dataset.emailUid = email.emailId;
        }

        const senderName = this.parseAddressDisplay(email.sender).name || email.sender || '';
        const toRecipient = (email.recipients && Array.isArray(email.recipients.to) && email.recipients.to.length)
            ? (this.parseAddressDisplay(email.recipients.to[0]).name || this.parseAddressDisplay(email.recipients.to[0]).address || email.recipients.to[0])
            : 'Unknown Recipient';

        div.innerHTML = `
            <div class="mail-item-header">
                <span class="mail-item-sender">${this.escapeHtml(senderName)}</span>
                <div class="mail-item-actions">
                    <span class="mail-item-time">${email.time}</span>
                    <span class="email-star" data-email-id="${email.id}" title="Star" style="cursor: pointer; font-size: 1rem;">
                        ${email.starred ? '⭐' : '☆'}
                    </span>
                </div>
            </div>
            <div class="mail-item-subject">${this.escapeHtml(email.subject)}</div>
            <div class="mail-item-to">To: ${this.escapeHtml(toRecipient)}</div>
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
        try {
            if (!email) {
                this.clearEmailContent();
                return;
            }
            
            console.debug('[Mail] displayEmail render', {
                id: email.id,
                emailId: email.emailId,
                subject: email.subject,
                hasHtml: !!email.htmlBody || !!email.body,
                hasText: !!email.textBody
            });
            
            if (!this.elements.emailSubject) {
                console.error('[MailView] emailSubject element not found');
                return;
            }
            
            this.elements.emailSubject.textContent = email.subject || '(No Subject)';
        
        let html = email.body || email.htmlBody || '';
        try {
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
                const doc = iframe.contentDocument || iframe.contentWindow?.document;
                if (doc && doc.body) {
                    const height = Math.max(
                        doc.body.scrollHeight,
                        doc.body.offsetHeight,
                        doc.documentElement.clientHeight,
                        doc.documentElement.scrollHeight,
                        doc.documentElement.offsetHeight
                    ) + 20;
                    iframe.style.height = height + 'px';
                }
            } catch (e) {
                iframe.style.height = '400px';
            }
        };
        container.appendChild(iframe);
        
        const parsedFrom = this.parseAddressDisplay(email.sender || email.email);
        const initials = (parsedFrom.name || '??').split(' ').map(n => n[0]).filter(Boolean).join('').slice(0, 2).toUpperCase();
        this.elements.senderAvatar.textContent = initials || '⟂';
        this.elements.senderName.textContent = parsedFrom.name || email.sender || 'Unknown Sender';
        this.elements.senderEmail.textContent = parsedFrom.address || email.email || '';
        this.elements.emailDate.textContent = email.time;
        
        this.elements.replyTo.textContent = parsedFrom.name || email.sender || '';
        
        const starButton = document.querySelector('.mail-content-actions button[onclick="toggleStar()"] span');
        if (starButton) {
            starButton.textContent = email.starred ? '⭐' : '☆';
        }
        
            this.elements.emailMeta.style.display = 'flex';
            this.elements.emailActions.style.display = 'flex';
            
            this.updateActiveEmailItem(email.id);
        } catch (error) {
            console.error('[MailView] Failed to display email:', error);
            this.clearEmailContent();
            this.showNotification('Failed to display email content', 'error');
        }
    }
    
    clearEmailContent() {
        this.elements.emailSubject.textContent = 'Select an email to read';
        this.elements.emailBody.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">No email selected</p>';
        this.elements.emailMeta.style.display = 'none';
        this.elements.emailActions.style.display = 'none';
    }

    // Pagination methods
    changePage(newPage) {
        const totalPages = Math.ceil(this.totalEmails / this.itemsPerPage);
        if (newPage < 1 || newPage > totalPages) return;
        
        this.currentPage = newPage;
        this.refreshCurrentView();
    }

    refreshCurrentView() {
        // Get current emails from controller
        if (window.mailController) {
            const folder = window.mailController.model.currentFolder;
            const account = this.elements.accountSelector?.value;
            const emails = window.mailController.model.getEmails(folder, account);
            this.renderEmailList(emails);
        }
    }
    
    updateActiveEmailItem(emailId) {
        document.querySelectorAll('.mail-item').forEach(item => {
            item.classList.remove('active');
        });
        
        const selectedItem = document.querySelector(`[data-email-id="${emailId}"]`);
        if (selectedItem) {
            selectedItem.classList.add('active');
            selectedItem.classList.remove('unread');
        }
    }
    
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
        const checkboxes = document.querySelectorAll('.mail-item-checkbox');
        checkboxes.forEach(cb => {
            cb.style.display = selectedCount > 0 ? 'block' : 'none';
        });
    }
    
    renderFolders(folders, activeFolder) {
        const sidebar = document.querySelector('.mail-folders');
        if (!sidebar) return;
        
        sidebar.innerHTML = '';
        
        folders.forEach((folder, index) => {
            if (folder.id === 'bookings' || folder.id === 'trash' || folder.id === 'archived') {
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
        this.currentPage = 1; // Reset to first page when changing folders
        document.querySelectorAll('.mail-folder-item').forEach(item => {
            item.classList.remove('active');
            if (item.dataset.folder === folderId) {
                item.classList.add('active');
            }
        });
    }
    
    showReplyBox(replyData) {
        if (this.elements.replyBox) {
            if (this.elements.replyTo && replyData && replyData.to) {
                this.elements.replyTo.textContent = replyData.to.join(', ');
            }
            
            if (!this.editorCore || !this.editorCore.initialized) {
                try {
                    this.editorCore = new ContentEditableCore();
                    const initialized = this.editorCore.init('replyText');
                    
                    if (initialized) {
                        console.log('[MailView] ContentEditableCore initialized successfully');
                        
                        this.formattingToolbar = new FormattingToolbar(this.editorCore);
                        this.formattingToolbar.init();
                        
                        const tbEl = document.querySelector('.formatting-toolbar');
                        if (tbEl) {
                            tbEl.id = 'replyToolbar';
                            
                            const editorWrapper = this.elements.replyBox.querySelector('.editor-wrapper');
                            if (editorWrapper && tbEl.parentElement !== this.elements.replyBox) {
                                this.elements.replyBox.insertBefore(tbEl, editorWrapper);
                            }
                        }
                        
                        if (this.signatureService) {
                            this.addTrackedTimeout(() => {
                                this.signatureService.appendToEditor(this.editorCore);
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
                }
            }
            
            if (!this.replyAdaptiveBound) {
                this.initializeAdaptiveReply();
                this.replyAdaptiveBound = true;
            }
            
            this.elements.replyBox.style.display = 'block';
            this.elements.replyBox.scrollIntoView({ behavior: 'smooth' });
            
            if (this.editorCore && this.editorCore.initialized) {
                this.editorCore.focus();
            } else {
                const editor = document.getElementById('emailEditor');
                if (editor) editor.focus();
            }
        }
    }

    initializeAdaptiveReply() {
        const replyBox = this.elements.replyBox;
        const wordCount = document.getElementById('wordCount');
        const draftIndicator = document.getElementById('draftIndicator');
        
        if (!replyBox) return;
        
        const focusHandler = (e) => {
            const targetId = e.target.id;
            if (targetId === 'emailEditor') {
                console.log('Reply editor focused - adding expanded class');
                replyBox.classList.add('expanded');
            }
        };
        this.addTrackedListener(replyBox, 'focus', focusHandler, true);

        this.boundCheckClickOutside = (e) => {
            if (!replyBox.contains(e.target) && 
                !e.target.closest('.action-btn') && 
                replyBox.classList.contains('expanded')) {
                
                const currentEditor = document.getElementById('emailEditor');
                if (!currentEditor) return;

                let hasContent = false;
                if (currentEditor.contentEditable === 'true' || currentEditor.contentEditable === true) {
                    const textContent = (currentEditor.textContent || currentEditor.innerText || '').trim();
                    hasContent = textContent.length > 0;
                } else {
                    hasContent = (currentEditor.value || '').trim().length > 0;
                }
                
                if (!hasContent) {
                    console.log('Clicked outside with empty editor - minimizing');
                    replyBox.classList.remove('expanded');
                }
            }
        };
        
        this.addTrackedListener(document, 'click', this.boundCheckClickOutside, true);
        
        const scheduleWordCountUpdate = (options = {}) => {
            const { suppressDraftFlag = false } = options;
            if (this.wordCountTimeout) {
                clearTimeout(this.wordCountTimeout);
                const idx = this.timeouts.indexOf(this.wordCountTimeout);
                if (idx > -1) this.timeouts.splice(idx, 1);
            }

            const timeoutId = this.addTrackedTimeout(() => {
                const editorEl = document.getElementById('emailEditor');
                let text = '';
                if (editorEl) {
                    if (editorEl.contentEditable === 'true' || editorEl.contentEditable === true) {
                        text = editorEl.textContent || editorEl.innerText || '';
                    } else {
                        text = editorEl.value || '';
                    }
                }

                const words = text.trim ? text.trim().split(/\s+/).filter(word => word.length > 0).length : 0;
                if (wordCount) {
                    wordCount.textContent = `${words} words`;
                }

                if (!suppressDraftFlag) {
                    this.showDraftSaved();
                }

                const timeoutIndex = this.timeouts.indexOf(timeoutId);
                if (timeoutIndex > -1) this.timeouts.splice(timeoutIndex, 1);
                if (this.wordCountTimeout === timeoutId) {
                    this.wordCountTimeout = null;
                }
            }, 500);

            this.wordCountTimeout = timeoutId;
        };

        const inputHandler = (e) => {
            if (e.target.id === 'emailEditor') {
                scheduleWordCountUpdate();
            }
        };
        this.addTrackedListener(replyBox, 'input', inputHandler);
        scheduleWordCountUpdate({ suppressDraftFlag: true });
        
        const keydownHandler = (e) => {
            const target = e.target;
            if (target.id === 'emailEditor') {
                if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                    e.preventDefault();
                    window.sendReply();
                }

                if (e.key === 'Escape') {
                    console.log('Escape pressed - removing expanded class');
                    replyBox.classList.remove('expanded');
                }
            }
        };
        this.addTrackedListener(replyBox, 'keydown', keydownHandler);
    }

    showDraftSaved() {
        const indicator = document.getElementById('draftIndicator');
        if (!indicator) return;
        
        if (this.draftTimeout) {
            clearTimeout(this.draftTimeout);
            const idx = this.timeouts.indexOf(this.draftTimeout);
            if (idx > -1) this.timeouts.splice(idx, 1);
        }
        
        indicator.classList.add('show');
        
        this.draftTimeout = this.addTrackedTimeout(() => {
            indicator.classList.remove('show');
        }, 2000);
    }
    
    hideReplyBox() {
        if (this.elements.replyBox) {
            this.elements.replyBox.style.display = 'none';
            
            if (this.editorCore && this.editorCore.initialized) {
                this.editorCore.clear();
            } else {
                const emailEditor = document.getElementById('emailEditor');
                if (emailEditor) {
                    emailEditor.innerHTML = '';
                }
            }
        }
    }
    
    getReplyText() {
        if (this.editorCore && this.editorCore.initialized) {
            return this.editorCore.getText();
        }
        const emailEditor = document.getElementById('emailEditor');
        return emailEditor ? (emailEditor.textContent || '') : '';
    }
    
    getReplyData() {
        if (this.editorCore && this.editorCore.initialized) {
            const body = this.editorCore.getHTML();
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
        
        const emailEditor = document.getElementById('emailEditor');
        if (!emailEditor) return null;
        
        const body = emailEditor.contentEditable === 'true' ? (emailEditor.innerHTML || '') : (emailEditor.value || '');
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
        
        this.addTrackedTimeout(() => {
            if (notification.parentElement) {
                notification.style.animation = 'slideOutRight 0.3s ease-out';
                this.addTrackedTimeout(() => notification.remove(), 300);
            }
        }, 5000);
    }
    
    showFolderPicker(folders, callback) {
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
    
    showComposeModal() {
        this.showNotification('Compose modal coming soon!', 'info');
    }
    
    renderCalendar(events) {
        if (!this.elements.calendar) return;
        
        this.elements.calendar.innerHTML = '';
        
        const days = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
        
        days.forEach(day => {
            const dayHeader = document.createElement('div');
            dayHeader.className = 'calendar-day';
            dayHeader.style.fontWeight = '600';
            dayHeader.style.color = 'var(--accent-primary)';
            dayHeader.textContent = day;
            this.elements.calendar.appendChild(dayHeader);
        });
        
        for (let i = 1; i <= 31; i++) {
            const dayEl = document.createElement('div');
            dayEl.className = 'calendar-day';
            dayEl.dataset.day = i;
            
            if (i === 17) dayEl.classList.add('today');
            
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
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    // Cleanup method
    destroy() {
        // Clear all timeouts
        this.timeouts.forEach(timeoutId => clearTimeout(timeoutId));
        this.timeouts = [];
        
        // Remove all tracked event listeners
        this.listeners.forEach(({ element, event, handler, useCapture }) => {
            try {
                element.removeEventListener(event, handler, useCapture);
            } catch (e) {
                console.warn('Failed to remove listener:', e);
            }
        });
        this.listeners = [];
        
        // Destroy editors
        if (this.editorCore) {
            try {
                this.editorCore.destroy();
            } catch (e) {
                console.warn('Failed to destroy editorCore:', e);
            }
            this.editorCore = null;
        }
        
        if (this.formattingToolbar) {
            try {
                this.formattingToolbar.destroy();
            } catch (e) {
                console.warn('Failed to destroy formattingToolbar:', e);
            }
            this.formattingToolbar = null;
        }
        
        // Clear references
        this.elements = {};
        this.boundCheckClickOutside = null;
        this.boundHandleBeforeUnload = null;
        this.wordCountTimeout = null;
        
        console.log('[MailView] Destroyed and cleaned up');
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
