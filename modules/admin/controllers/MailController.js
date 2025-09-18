// MailController.js - Updated with Core Email Actions
// Path: /modules/admin/controllers/MailController.js
// Updated: December 17, 2024

import MailModel from '../models/MailModel.js';
import MailView from '../views/MailView.js';
import { mailAPI } from '../services/MailAPIService.js';
import mailCache from '../services/MailCacheService.js';
import TemplateService from '../services/TemplateService.js';
import ComposeView from '../components/ComposeView.js';
import ThemeSwitcher from '../components/ThemeSwitcher.js';

export default class MailController {
    constructor() {
        this.model = new MailModel();
        this.view = new MailView();
        // Initialize view after creation
        this.view.initialize();
        this.undoStack = []; // Store undo functions
        this.templateService = new TemplateService();
        this.composeView = new ComposeView(null, null, this.view.signatureService);
        this.searchTimeout = null;
        
        // Add global error handler for unhandled promise rejections
        this.setupGlobalErrorHandlers();
        
        this.initializeEventListeners();
        void this.initialize();
        
        // Initialize theme switcher after DOM is ready
        setTimeout(() => {
            this.themeSwitcher = new ThemeSwitcher();
        }, 100);
    }

    setupGlobalErrorHandlers() {
        // Handle unhandled promise rejections
        if (typeof window !== 'undefined' && !window._mailErrorHandlerInstalled) {
            window.addEventListener('unhandledrejection', (event) => {
                console.error('[Mail] Unhandled promise rejection:', event.reason);
                // Prevent default browser error
                event.preventDefault();
                // Show user-friendly message
                if (this.view && this.view.showNotification) {
                    this.view.showNotification('An error occurred. Please refresh if issues persist.', 'error');
                }
            });
            
            // Handle general JavaScript errors
            window.addEventListener('error', (event) => {
                console.error('[Mail] JavaScript error:', event.error);
                if (this.view && this.view.showNotification) {
                    this.view.showNotification('An error occurred. Please refresh if issues persist.', 'error');
                }
            });

            window.addEventListener('beforeunload', () => {
                if (this.searchTimeout) {
                    clearTimeout(this.searchTimeout);
                    this.searchTimeout = null;
                }
            });
            
            window._mailErrorHandlerInstalled = true;
        }
    }
    
    async initialize() {
        try {
            // Set inbox as default to match UI
            this.model.setCurrentFolder('inbox');

            // Load folders first with placeholder counts
            try {
                this.loadFolders();
            } catch (folderError) {
                console.error('[Mail] Failed to load initial folders:', folderError);
            }

            // CRITICAL: Wait for emails to load from API
            try {
                await this.model.loadEmailsFromAPI();
            } catch (emailError) {
                console.error('[Mail] Failed to load emails from API:', emailError);
                this.view.showNotification('Failed to load emails. Check connection.', 'error');
            }

            // IMPORTANT: Fetch real folder counts from API
            try {
                await this.model.fetchRealFolderCounts();
                // Re-render folders with real counts
                this.loadFolders();
            } catch (countError) {
                console.error('[Mail] Failed to fetch folder counts:', countError);
                // Continue with placeholder counts
            }

            // Now render with real data (not placeholders)
            try {
                this.loadEmails('inbox');
            } catch (loadError) {
                console.error('[Mail] Failed to render emails:', loadError);
                this.view.showNotification('Failed to display emails', 'error');
            }

            // Load other components (non-critical)
            try {
                this.loadCalendar();
                this.loadAccounts();
            } catch (componentError) {
                console.warn('[Mail] Failed to load calendar/accounts:', componentError);
            }
        } catch (error) {
            console.error('[Mail] Critical initialization failure:', error);
            this.view.showNotification('Mail system failed to initialize', 'error');
        }
    }
    
    initializeEventListeners() {
        // Email list click handler (event delegation)
        this.view.elements.emailList.addEventListener('click', (e) => {
            // If compose window is open, close it before navigating to an email
            try {
                if (document.querySelector('.compose-container')) {
                    if (this.composeView && typeof this.composeView.close === 'function') {
                        this.composeView.close();
                    } else if (typeof window.closeCompose === 'function') {
                        window.closeCompose();
                    }
                }
            } catch {}
            // No inline delete button
            // Check for checkbox click
            const checkbox = e.target.closest('.email-checkbox');
            if (checkbox) {
                const emailId = Number(checkbox.dataset.emailId);
                this.toggleEmailSelection(emailId);
                return;
            }
            
            // Check for star click
            const star = e.target.closest('.email-star');
            if (star) {
                e.stopPropagation();
                const emailId = Number(star.dataset.emailId);
                this.toggleStar(emailId);
                return;
            }
            
            // Regular email click
            const emailItem = e.target.closest('.mail-item');
            if (emailItem) {
                // Prefer validated numeric id; if not present or stale, try uid fallback
                const rawId = emailItem.dataset.emailId;
                let emailId = Number(rawId);
                if (Number.isFinite(emailId)) {
                    const byId = this.model.getEmailById(emailId);
                    if (byId) {
                        console.debug('[Mail] item click -> select by id', emailId);
                        this.selectEmail(emailId);
                        return;
                    }
                }
                // Fallback: use uid to find the email when ids changed after refresh
                const uid = emailItem.dataset.emailUid;
                if (uid && typeof this.model.getEmailByUid === 'function') {
                    const found = this.model.getEmailByUid(uid);
                    if (found) {
                        console.debug('[Mail] item click -> select by uid', uid);
                        this.selectEmail(found.id);
                        return;
                    }
                }
                console.warn('[Mail] Clicked email not found', emailItem.dataset);
            }
        });

        // Bind global card delete for other triggers if needed
        window.trashEmail = (id) => this.trashEmail(id);
        
        // Folder click handler
        document.querySelector('.mail-folders').addEventListener('click', (e) => {
            const folderItem = e.target.closest('.mail-folder-item');
            if (folderItem) {
                const folderId = folderItem.dataset.folder;
                this.selectFolder(folderId);
            }
        });
        
        // Search input
        this.view.elements.searchInput.addEventListener('input', (e) => {
            const query = e.target.value;
            const emailList = this.view.elements.emailList || document.getElementById('emailList');

            if (emailList) {
                emailList.style.opacity = '0.6';
            }

            if (this.searchTimeout) {
                clearTimeout(this.searchTimeout);
                this.searchTimeout = null;
            }

            this.searchTimeout = window.setTimeout(() => {
                try {
                    this.searchEmails(query);
                } finally {
                    const refreshedList = this.view.elements.emailList || document.getElementById('emailList');
                    if (refreshedList) {
                        refreshedList.style.opacity = '1';
                    }
                    this.searchTimeout = null;
                }
            }, 300);
        });
        
        // Account selector
        this.view.elements.accountSelector.addEventListener('change', (e) => {
            this.filterByAccount(e.target.value);
        });
        
        // Calendar day click
        this.view.elements.calendar.addEventListener('click', (e) => {
            const dayEl = e.target.closest('.calendar-day[data-day]');
            if (dayEl) {
                const day = parseInt(dayEl.dataset.day);
                this.showDayEvents(day);
            }
        });
        
       // Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // IMPORTANT: Don't trigger shortcuts if user is typing in any input/textarea/contenteditable
    const activeElement = document.activeElement;
    const isTyping = activeElement && (
        activeElement.tagName === 'INPUT' ||
        activeElement.tagName === 'TEXTAREA' ||
        activeElement.contentEditable === 'true' ||
        activeElement.contentEditable === true ||
        activeElement.id === 'emailEditor' ||
        activeElement.closest('[contenteditable="true"]')
    );
    
    // If user is typing, don't process shortcuts
    if (isTyping) {
        return;
    }
    
    // Delete key (including Mac backspace) moves to trash
    if ((e.key === 'Delete' || e.key === 'Backspace') && !e.metaKey && !e.ctrlKey && this.model.selectedEmail) {
        e.preventDefault();
        this.deleteSelectedEmail();
    }
    
    // A for archive
    if (e.key === 'a' && !e.metaKey && !e.ctrlKey && this.model.selectedEmail) {
        e.preventDefault();
        this.archiveSelectedEmail();
    }
    
    // S for star
    if (e.key === 's' && !e.ctrlKey && !e.metaKey && this.model.selectedEmail) {
        e.preventDefault();
        this.toggleStar(this.model.selectedEmail.id);
    }
});
        
        // Global function bindings for inline onclick handlers
        window.showReply = () => this.showReply();
        window.showReplyAll = () => this.showReplyAll();
        window.showForward = () => this.showForward();
        window.closeReply = () => this.closeReply();
        window.sendReply = () => this.sendReply();
        window.markAsRead = () => this.markSelectedAsRead();
        window.markAsUnread = () => this.markSelectedAsUnread();
        window.deleteEmail = () => this.deleteSelectedEmail();
        window.archiveEmail = () => this.archiveSelectedEmail();
        window.toggleStar = (emailId) => this.toggleStar(emailId || this.model.selectedEmail?.id);
        window.moveToFolder = () => this.showMoveToFolder();
        window.snoozeEmail = () => this.showSnoozeOptions();
        window.saveDraft = () => this.saveDraft();
        
        window.openCompose = () => {
            if (this.composeView) {
                this.composeView.open();
                setTimeout(() => {
                    if (this.themeSwitcher) {
                        this.themeSwitcher.loadSavedTheme();
                    }
                }, 100);
            } else {
                console.error('ComposeView not initialized');
                // Fallback notification
                this.view.showNotification('Compose feature loading...', 'info');
            }
        };
        
        window.closeCompose = () => {
            if (this.composeView) {
                this.composeView.close();
            }
        };
        
        window.sendNewEmail = async () => {
            if (!this.composeView) {
                console.error('ComposeView not initialized');
                return;
            }
            const data = this.composeView.getData();
            console.log('Sending email:', data);
            // Normalize recipients to arrays
            const to = Array.isArray(data.to) ? data.to : (typeof data.to === 'string' ? data.to.split(',').map(s => s.trim()).filter(Boolean) : []);
            const cc = Array.isArray(data.cc) ? data.cc : (data.cc ? data.cc.split(',').map(s => s.trim()).filter(Boolean) : []);
            const payload = {
                to,
                cc,
                bcc: [],
                subject: data.subject || '(No Subject)',
                body: data.body || '',
                htmlBody: data.body || '',
                from: data.from || undefined
            };
            try {
                const result = await this.model.sendEmail(payload);
                if (result && result.success) {
                    this.view.showNotification('Email sent successfully', 'success');
                    this.composeView.close();
                    try { if (window.showMessageSent) window.showMessageSent(); } catch {}
                } else {
                    this.view.showNotification(`Failed to send email${result?.error ? ': ' + result.error : ''}`, 'error');
                }
            } catch (err) {
                console.error('Compose send failed:', err);
                this.view.showNotification(`Failed to send email${err?.message ? ': ' + err.message : ''}`, 'error');
            }
        };
        
        window.saveDraftEmail = async () => {
            if (!this.composeView) return;

            const draftData = this.composeView.getData();
            try {
                const result = await this.model.saveDraft(draftData);
                if (result?.success) {
                    this.view.showNotification('Draft saved', 'success');
                    try {
                        if (typeof this.composeView.close === 'function') {
                            this.composeView.close();
                        }
                    } catch (closeError) {
                        console.warn('[Mail] Failed to close compose after saving draft:', closeError);
                    }
                    await this.handleDraftSaveSuccess(result, draftData);
                } else {
                    const errorMsg = result?.error || 'Failed to save draft';
                    this.view.showNotification(errorMsg, 'error');
                }
            } catch (error) {
                console.error('[Mail] Compose draft save failed:', error);
                const message = error?.message ? `Failed to save draft: ${error.message}` : 'Failed to save draft';
                this.view.showNotification(message, 'error');
            }
        };
        
        window.formatCompose = (command) => {
            if (this.composeView && this.composeView.composeEditor) {
                this.composeView.composeEditor.formatText(command);
            }
        };
        
        window.openSettings = () => this.openSettings();
        window.hideEvents = () => this.view.hideEvents();
        window.undo = () => this.undo();
        window.selectAllEmails = () => this.selectAllEmails();
        window.testErrorBoundaries = () => this.testErrorBoundaries();
        window.testPagination = () => this.testPagination();
        window.showPaginationTest = () => this.showPaginationTest();
        
        window.showTemplates = () => {
            if (!this.templateService || !this.view.editorCore) {
                console.log('Template service not ready');
                return;
            }
            
            // Simple template menu
            const templates = this.templateService.getAllTemplates();
            const selected = prompt('Select template:\n' + 
                templates.map((t, i) => `${i+1}. ${t.name}`).join('\n') + 
                '\n\nEnter number:');
            
            if (selected && templates[parseInt(selected) - 1]) {
                const template = templates[parseInt(selected) - 1];
                const vars = {
                    clientName: prompt('Client name:') || 'Client',
                    date: new Date().toLocaleDateString(),
                    location: 'TBD'
                };
                this.templateService.insertIntoEditor(template.id, this.view.editorCore, vars);
            }
        };

        // Rich text helpers
        window.formatText = (command) => {
            console.log('Format:', command);
            
            // First check if we have ContentEditableCore instance
            if (this.view.editorCore && this.view.editorCore.initialized) {
                // Use ContentEditableCore for formatting
                this.view.editorCore.executeCommand(command);
                console.log('Formatted with ContentEditableCore:', command);
                return;
            }
            
            // Fallback when editorCore is not available
            const editorElement = document.getElementById('emailEditor');
            if (editorElement && (editorElement.contentEditable === 'true' || editorElement.contentEditable === true)) {
                document.execCommand(command, false, null);
                return;
            }

            const textarea = document.getElementById('replyText');
            if (!textarea) return;
            
            // Original textarea markdown logic (keep as fallback)
            const start = textarea.selectionStart ?? 0;
            const end = textarea.selectionEnd ?? 0;
            const selection = textarea.value.substring(start, end);
            if (!selection) return;
            
            let formatted = selection;
            if (command === 'bold') formatted = `**${selection}**`;
            if (command === 'italic') formatted = `*${selection}*`;
            if (command === 'underline') formatted = `__${selection}__`;
            
            textarea.value = textarea.value.substring(0, start) + formatted + textarea.value.substring(end);
        };

        window.attachFile = () => {
            console.log('Attach file clicked');
            // TODO: integrate file picker
        };

        window.insertLink = () => {
            const url = prompt('Enter URL:');
            if (!url) return;
            const editorElement = document.getElementById('emailEditor');
            if (editorElement && (editorElement.contentEditable === 'true' || editorElement.contentEditable === true)) {
                document.execCommand('createLink', false, url);
                return;
            }

            const textarea = document.getElementById('replyText');
            if (!textarea) return;
            const linkText = `[link](${url})`;
            textarea.value += (textarea.value.endsWith(' ') || textarea.value.length === 0 ? '' : ' ') + linkText + ' ';
        };
    }
    
    // Email Operations
    loadEmails(folder = null, account = null) {
        const currentFolder = folder || this.model.currentFolder;
        const currentAccount = account || this.view.elements.accountSelector.value;
        
        const emails = this.model.getEmails(currentFolder, currentAccount);
        console.log("Loading emails for folder:", currentFolder, "count:", emails.length);
        this.view.renderEmailList(emails);
        // Render Load more if pagination token exists
        if (typeof this.renderLoadMoreControl === 'function') {
            this.renderLoadMoreControl();
        }
    }
    
    async selectEmail(emailId) {
        try {
            // Auto-close compose window safely
            try {
                if (document.querySelector('.compose-container')) {
                    if (this.composeView?.close) {
                        this.composeView.close();
                    } else if (typeof window.closeCompose === 'function') {
                        window.closeCompose();
                    }
                }
            } catch (composeError) {
                console.warn('[Mail] Failed to close compose:', composeError);
            }

            const email = this.model.getEmailById(emailId);
            if (!email) {
                console.warn('[Mail] selectEmail: email not found for id', emailId);
                this.view.showNotification('Email not found', 'error');
                return;
            }

            console.debug('[Mail] selectEmail ->', emailId, email.subject);
            
            try {
                this.model.selectedEmail = email;
                this.model.markAsRead(emailId);
                this.view.displayEmail(email);
            } catch (displayError) {
                console.error('[Mail] Failed to display email:', displayError);
                this.view.showNotification('Failed to display email', 'error');
                return;
            }

            // Persist last selected email UID for next visit (non-critical)
            try {
                if (email.emailId) {
                    localStorage.setItem('lastSelectedEmailUid', email.emailId);
                }
                localStorage.setItem('lastSelectedFolder', this.model.currentFolder || 'all');
                const acct = this.view?.elements?.accountSelector?.value || 'all';
                localStorage.setItem('lastSelectedAccount', acct);
            } catch (storageError) {
                console.warn('[Mail] Failed to persist selection state:', storageError);
            }

            // Hydrate body from cache and update flags (non-blocking)
            (async () => {
                try {
                    const userId = mailAPI?.userId || 'admin';
                    // If no body, try cached record
                    if (!email.body && email.emailId) {
                        const rec = await mailCache.getEmail(userId, email.emailId);
                        if (rec && (rec.htmlBody || rec.textBody)) {
                            email.body = rec.htmlBody || (rec.textBody ? `<pre style=\"white-space:pre-wrap;\">${rec.textBody}</pre>` : '');
                            this.view.displayEmail(email);
                        }
                    }
                    // Persist read flag to cache
                    if (email.emailId) {
                        await mailCache.updateFlags(userId, email.emailId, { unread: false });
                    }
                    // Upsert this email to capture latest content/flags
                    await mailCache.upsertEmails(userId, this.model.currentFolder || email.folder || 'inbox', [email]);
                } catch (cacheError) {
                    console.warn('[Mail] Cache operation failed:', cacheError);
                }
            })();
        } catch (error) {
            console.error('[Mail] Failed to select email:', error);
            this.view.showNotification('Failed to load email', 'error');
        }
    }
    
    searchEmails(query) {
        this.view.currentPage = 1; // Reset pagination for search
        const emails = this.model.searchEmails(query);
        this.view.renderEmailList(emails);
    }
    
    async filterByAccount(account) {
        this.view.currentPage = 1; // Reset pagination for account filter
        try {
            // Switch API user context and refetch for selected account
            if (account && account !== 'all') {
                if (typeof mailAPI?.setUserId === 'function') {
                    mailAPI.setUserId(account);
                }
            }
            const resp = await this.model.fetchEmailsFromAPI(this.model.currentFolder, 50);
            const emails = resp.emails;
            if (emails && emails.length) {
                this.model.emails = emails.map(e => this.model.transformAPIEmail(e, this.model.currentFolder));
                this.model.nextToken = resp.nextToken || null;
                this.loadFolders();

                const currentAccount = (mailAPI && mailAPI.userId) ? mailAPI.userId : (account && account !== 'all' ? account : 'admin');
                const currentFolder = this.model.currentFolder || 'inbox';

                try {
                    await mailCache.upsertEmails(currentAccount, currentFolder, this.model.emails);
                } catch (cacheError) {
                    console.warn('[Mail] Failed to cache emails after account switch:', cacheError);
                }

                try {
                    const hasMetadata = Boolean(resp && (resp.etag || resp.lastModified || resp.nextToken));
                    if (hasMetadata) {
                        await mailCache.putFolderState(currentAccount, currentFolder, {
                            etag: resp.etag || null,
                            lastModified: resp.lastModified || null,
                            nextToken: this.model.nextToken || null,
                            updatedAt: Date.now()
                        });
                    } else {
                        await mailCache.putFolderState(currentAccount, currentFolder, null);
                    }
                } catch (stateError) {
                    console.warn('[Mail] Failed to persist folder metadata after account switch:', stateError);
                }
            }
        } catch (error) {
            console.error('[Mail] Account filter fetch failed:', error);
            this.view.showNotification('Failed to switch account. Using cached data.', 'warning');
            // Continue with cached data
        }
        
        try {
            this.loadEmails(this.model.currentFolder, account);
        } catch (loadError) {
            console.error('[Mail] Failed to load emails after account switch:', loadError);
            this.view.showNotification('Failed to load emails', 'error');
        }
    }

    // Render a Load More button if more pages exist
    renderLoadMoreControl() {
        const list = document.getElementById('emailList');
        if (!list) return;
        // Remove existing control
        const existing = document.getElementById('loadMoreEmails');
        if (existing) existing.remove();
        if (this.model.nextToken) {
            const btn = document.createElement('button');
            btn.id = 'loadMoreEmails';
            btn.textContent = 'Load more';
            btn.className = 'load-more-btn';
            btn.style.display = 'block';
            btn.style.margin = '12px auto';
            btn.addEventListener('click', () => this.loadMoreEmails());
            list.appendChild(btn);
        }
    }

    async loadMoreEmails() {
        // Show a small inline loader in the button
        const btn = document.getElementById('loadMoreEmails');
        if (btn) {
            btn.disabled = true;
            btn.textContent = 'Loading…';
            btn.classList.add('loading');
        }
        try {
            const { appended } = await this.model.loadMoreEmails(50);
            // Re-render list and control
            this.view.renderEmailList(this.model.getEmails(this.model.currentFolder));
            this.renderLoadMoreControl();
            if (!appended) {
                this.view.showNotification('No more emails to load', 'info');
            }
        } catch (e) {
            console.error('Load more failed:', e);
            this.view.showNotification('Failed to load more emails', 'error');
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.textContent = 'Load more';
                btn.classList.remove('loading');
            }
        }
    }
    
    // Folder Operations
    loadFolders() {
        const folders = this.model.getFolders();
        this.view.renderFolders(folders, this.model.currentFolder);
    }
    
    selectFolder(folderId) {
        this.model.setCurrentFolder(folderId);
        this.view.updateActiveFolder(folderId);
        this.loadEmails(folderId);
        this.view.clearEmailContent();
    }
    
    updateFolderCounts() {
        this.model.updateFolderCounts();
        this.loadFolders();
    }
    
    // Star/Unstar
    toggleStar(emailId) {
        if (!emailId) return;
        
        const isStarred = this.model.toggleStar(emailId);
        this.view.updateEmailStar(emailId, isStarred);
        this.updateFolderCounts();
        this.view.showNotification(
            isStarred ? 'Email starred' : 'Star removed',
            'success'
        );
        // Write star flag to cache (best-effort)
        try {
            const email = this.model.getEmailById(emailId);
            if (email?.emailId) {
                const userId = mailAPI?.userId || 'admin';
                mailCache.updateFlags(userId, email.emailId, { starred: isStarred });
                mailCache.upsertEmails(userId, this.model.currentFolder || email.folder || 'inbox', [email]);
            }
        } catch {}
    }
    
    // Read/Unread Actions
    markSelectedAsRead() {
        if (this.model.selectedEmails.size > 0) {
            this.model.bulkMarkAsRead();
            this.loadEmails();
        } else if (this.model.selectedEmail) {
            this.model.markAsRead(this.model.selectedEmail.id);
            this.view.updateEmailReadStatus(this.model.selectedEmail.id, false);
            // Cache update for single selection
            try {
                const email = this.model.selectedEmail;
                if (email?.emailId) {
                    const userId = mailAPI?.userId || 'admin';
                    mailCache.updateFlags(userId, email.emailId, { unread: false });
                    mailCache.upsertEmails(userId, this.model.currentFolder || email.folder || 'inbox', [email]);
                }
            } catch {}
        }
        this.updateFolderCounts();
        this.view.showNotification('Marked as read', 'success');
    }
    
    markSelectedAsUnread() {
        if (this.model.selectedEmails.size > 0) {
            this.model.bulkMarkAsUnread();
            this.loadEmails();
        } else if (this.model.selectedEmail) {
            this.model.markAsUnread(this.model.selectedEmail.id);
            this.view.updateEmailReadStatus(this.model.selectedEmail.id, true);
            // Cache update for single selection
            try {
                const email = this.model.selectedEmail;
                if (email?.emailId) {
                    const userId = mailAPI?.userId || 'admin';
                    mailCache.updateFlags(userId, email.emailId, { unread: true });
                    mailCache.upsertEmails(userId, this.model.currentFolder || email.folder || 'inbox', [email]);
                }
            } catch {}
        }
        this.updateFolderCounts();
        this.view.showNotification('Marked as unread', 'success');
    }
    
    // Delete Operations
    deleteSelectedEmail() {
        let undoFunction;

        // Determine next selection index based on current view ordering
        const currentFolder = this.model.currentFolder;
        const currentAccount = this.view?.elements?.accountSelector?.value;
        const listBefore = this.model.getEmails(currentFolder, currentAccount);

        const selectNextAfterIndex = (idx) => {
            const listAfter = this.model.getEmails(currentFolder, currentAccount);
            if (!listAfter.length) { this.view.clearEmailContent(); return; }
            const nextIdx = Math.min(idx, listAfter.length - 1);
            const nextEmail = listAfter[nextIdx];
            if (nextEmail) this.selectEmail(nextEmail.id); else this.view.clearEmailContent();
        };

        if (this.model.selectedEmails.size > 0) {
            let minIndex = Infinity;
            this.model.selectedEmails.forEach((id) => {
                const i = listBefore.findIndex(e => e.id === id);
                if (i >= 0) minIndex = Math.min(minIndex, i);
            });
            undoFunction = this.model.bulkDelete();
            this.view.showNotification(
                `${this.model.selectedEmails.size} emails moved to trash`,
                'success',
                true
            );
            this.loadEmails();
            this.loadFolders();
            if (minIndex !== Infinity) selectNextAfterIndex(minIndex);
        } else if (this.model.selectedEmail) {
            const emailId = this.model.selectedEmail.id;
            const indexBefore = listBefore.findIndex(e => e.id === emailId);
            undoFunction = this.model.deleteEmail(emailId);
            this.view.showNotification('Email moved to trash', 'success', true);
            this.loadEmails();
            this.loadFolders();
            if (indexBefore >= 0) selectNextAfterIndex(indexBefore);
        }

        if (undoFunction) {
            this.undoStack.push(undoFunction);
        }
    }
    
    // Archive Operations
    archiveSelectedEmail() {
        let undoFunction;
        
        if (this.model.selectedEmails.size > 0) {
            undoFunction = this.model.bulkArchive();
            this.view.showNotification(
                `${this.model.selectedEmails.size} emails archived`,
                'success',
                true
            );
        } else if (this.model.selectedEmail) {
            const emailId = this.model.selectedEmail.id;
            undoFunction = this.model.archiveEmail(emailId);
            this.view.showNotification('Email archived', 'success', true);
        }
        
        if (undoFunction) {
            this.undoStack.push(undoFunction);
        }
        
        this.loadEmails();
        this.view.clearEmailContent();
    }
    
    // Move to Folder
    showMoveToFolder() {
        if (!this.model.selectedEmail) return;
        
        const folders = this.model.getFolders()
            .filter(f => !['starred', 'all'].includes(f.id));
        
        this.view.showFolderPicker(folders, (targetFolder) => {
            const undoFunction = this.model.moveToFolder(
                this.model.selectedEmail.id,
                targetFolder
            );
            
            if (undoFunction) {
                this.undoStack.push(undoFunction);
            }
            
            this.loadEmails();
            this.view.clearEmailContent();
            this.view.showNotification(`Moved to ${targetFolder}`, 'success', true);
        });
    }

    // Trash a single email (move to 'trash' with small slide/fade animation)
    trashEmail(emailId) {
        const selectorId = emailId;
        const itemEl = document.querySelector(`[data-email-id="${selectorId}"]`);
        if (itemEl) {
            itemEl.classList.add('leaving');
        }

        const numericCandidate = Number(emailId);
        let lookupId = Number.isFinite(numericCandidate) ? numericCandidate : null;
        let resolvedEmail = Number.isFinite(lookupId) ? this.model.getEmailById(lookupId) : null;

        if (!Number.isFinite(lookupId)) {
            try {
                if (typeof this.model.getEmailByUid === 'function') {
                    resolvedEmail = this.model.getEmailByUid(emailId);
                    if (!resolvedEmail && itemEl?.dataset?.emailUid) {
                        resolvedEmail = this.model.getEmailByUid(itemEl.dataset.emailUid);
                    }
                }
            } catch {}

            if (resolvedEmail && Number.isFinite(Number(resolvedEmail.id))) {
                lookupId = Number(resolvedEmail.id);
            } else if (
                this.model.selectedEmail &&
                (
                    String(this.model.selectedEmail.emailId) === String(emailId) ||
                    String(this.model.selectedEmail.id) === String(emailId)
                ) &&
                Number.isFinite(Number(this.model.selectedEmail.id))
            ) {
                lookupId = Number(this.model.selectedEmail.id);
                resolvedEmail = this.model.selectedEmail;
            }
        }

        if (!Number.isFinite(lookupId)) {
            if (itemEl) {
                itemEl.classList.remove('leaving');
            }
            console.warn('[Mail] trashEmail: Unable to resolve numeric id for', emailId);
            return;
        }

        if (!resolvedEmail) {
            resolvedEmail = this.model.getEmailById(lookupId) || null;
        }

        let undoFn = null;
        if (typeof this.model.moveToFolder === 'function') {
            undoFn = this.model.moveToFolder(lookupId, 'trash');
        } else if (resolvedEmail) {
            const prevFolder = resolvedEmail.folder;
            resolvedEmail.folder = 'trash';
            undoFn = () => { resolvedEmail.folder = prevFolder; };
        }

        if (!undoFn) {
            if (itemEl) {
                itemEl.classList.remove('leaving');
            }
            console.warn('[Mail] trashEmail: moveToFolder returned no undo function', { lookupId, emailId });
            return;
        }

        this.undoStack.push(undoFn);

        try {
            const userId = mailAPI?.userId || 'admin';
            const latestEmail = this.model.getEmailById(lookupId) || resolvedEmail || null;
            let cacheEntry = latestEmail ? { ...latestEmail } : null;

            if (!cacheEntry) {
                cacheEntry = {
                    id: lookupId,
                    emailId: typeof emailId === 'string' ? emailId : null,
                    folder: 'trash',
                    account: userId,
                    subject: '(Unknown email)',
                    preview: '',
                    unread: false,
                    starred: false,
                    archived: false,
                    timestamp: Date.now()
                };
            } else {
                cacheEntry.folder = 'trash';
                cacheEntry.account = cacheEntry.account || userId;
            }

            if (typeof mailCache?.upsertEmails === 'function') {
                void mailCache.upsertEmails(userId, 'trash', [cacheEntry]);
            }
        } catch (cacheError) {
            console.warn('[Mail] Failed to sync cache after trashing email:', cacheError);
        }

        setTimeout(() => {
            this.loadEmails();
            this.loadFolders();
            this.view.showNotification('Moved to trash', 'success');
        }, 220);
    }
    
    // Snooze
    showSnoozeOptions() {
        if (!this.model.selectedEmail) return;
        
        const snoozeOptions = [
            { label: 'Later today', hours: 3 },
            { label: 'Tomorrow', hours: 24 },
            { label: 'This weekend', hours: 72 },
            { label: 'Next week', hours: 168 }
        ];
        
        this.view.showSnoozePicker(snoozeOptions, (hours) => {
            const snoozeUntil = new Date();
            snoozeUntil.setHours(snoozeUntil.getHours() + hours);
            
            const undoFunction = this.model.snoozeEmail(
                this.model.selectedEmail.id,
                snoozeUntil
            );
            
            if (undoFunction) {
                this.undoStack.push(undoFunction);
            }
            
            this.loadEmails();
            this.view.clearEmailContent();
            this.view.showNotification(`Snoozed until ${snoozeUntil.toLocaleString()}`, 'success', true);
        });
    }
    
    // Undo
    undo() {
        if (this.undoStack.length > 0) {
            const undoFunction = this.undoStack.pop();
            undoFunction();
            this.loadEmails();
            this.updateFolderCounts();
            this.view.showNotification('Action undone', 'info');
        }
    }
    
    // Selection
    toggleEmailSelection(emailId) {
        this.model.toggleEmailSelection(emailId);
        this.view.updateEmailSelection(emailId, this.model.selectedEmails.has(emailId));
        this.view.updateBulkActionButtons(this.model.selectedEmails.size);
    }
    
    selectAllEmails() {
        const currentEmails = this.model.getEmails(this.model.currentFolder);
        const emailIds = currentEmails.map(e => e.id);
        this.model.selectAllEmails(emailIds);
        this.view.selectAllEmails(emailIds);
        this.view.updateBulkActionButtons(emailIds.length);
    }
    
    // Reply Operations
    showReply() {
        if (!this.model.selectedEmail) return;
        
        const replyData = this.model.prepareReply(this.model.selectedEmail.id);
        if (replyData) {
            this.view.showReplyBox(replyData);
        }
    }
    
    showReplyAll() {
        if (!this.model.selectedEmail) return;
        
        const replyData = this.model.prepareReplyAll(this.model.selectedEmail.id);
        if (replyData) {
            this.view.showReplyBox(replyData);
        }
    }
    
    showForward() {
        if (!this.model.selectedEmail) return;
        
        const forwardData = this.model.prepareForward(this.model.selectedEmail.id);
        if (forwardData) {
            this.view.showReplyBox(forwardData);
        }
    }
    
    closeReply() {
        this.view.hideReplyBox();
    }
    
    async sendReply() {
        try {
            const replyData = this.view.getReplyData();
            if (!replyData || !replyData.body) {
                this.view.showNotification('Please enter a message before sending', 'warning');
                return;
            }

            const result = await this.model.sendEmail(replyData);
            if (result && result.success) {
                this.view.hideReplyBox();
                this.view.showNotification('Email sent successfully', 'success');
                try { 
                    if (window.showMessageSent) window.showMessageSent(); 
                } catch (callbackError) {
                    console.warn('[Mail] Message sent callback failed:', callbackError);
                }
            } else {
                const errorMsg = result?.error || 'Failed to send email';
                this.view.showNotification(errorMsg, 'error');
            }
        } catch (error) {
            console.error('[Mail] Failed to send reply:', error);
            this.view.showNotification('Failed to send reply. Please try again.', 'error');
        }
    }
    
    async handleDraftSaveSuccess(result, fallbackData = null) {
        this.updateFolderCounts();

        const currentFolder = this.model?.currentFolder || 'inbox';
        const currentAccount = this.view?.elements?.accountSelector?.value || 'all';

        let savedDraft = result?.draft || null;
        if (!savedDraft && result?.emailId && typeof this.model?.getEmailByUid === 'function') {
            savedDraft = this.model.getEmailByUid(result.emailId) || null;
        }
        if (!savedDraft && fallbackData) {
            savedDraft = {
                ...fallbackData,
                emailId: result?.emailId || fallbackData.emailId || null,
                folder: fallbackData.folder || 'drafts',
                account: fallbackData.account || fallbackData.from || currentAccount || 'admin'
            };
        }

        let shouldRefreshList = false;
        try {
            const visibleEmails = this.model.getEmails(currentFolder, currentAccount);
            if (savedDraft) {
                const draftId = savedDraft.id;
                const draftEmailId = savedDraft.emailId;
                shouldRefreshList = visibleEmails.some(email => {
                    if (draftEmailId && email.emailId === draftEmailId) return true;
                    if (draftId && email.id === draftId) return true;
                    return false;
                });
            } else if (currentFolder === 'drafts' || currentFolder === 'all') {
                shouldRefreshList = true;
            }
        } catch (visibilityError) {
            console.warn('[Mail] Unable to determine if draft is visible in current folder:', visibilityError);
        }

        if (shouldRefreshList) {
            this.loadEmails(currentFolder, currentAccount);
        }

        if (savedDraft) {
            try {
                const userId = mailAPI?.userId || 'admin';
                await mailCache.upsertEmails(userId, savedDraft.folder || currentFolder || 'drafts', [savedDraft]);
            } catch (cacheError) {
                console.warn('[Mail] Failed to sync draft with cache:', cacheError);
            }
        }
    }

    async saveDraft() {
        try {
            const replyData = this.view.getReplyData();
            if (!replyData || (!replyData.body && !replyData.textBody)) {
                this.view.showNotification('Nothing to save', 'warning');
                return;
            }

            const result = await this.model.saveDraft(replyData);
            if (result?.success) {
                this.view.showNotification('Draft saved', 'success');
                await this.handleDraftSaveSuccess(result, replyData);
            } else {
                const errorMsg = result?.error || 'Failed to save draft';
                this.view.showNotification(errorMsg, 'error');
            }
        } catch (error) {
            console.error('[Mail] Reply draft save failed:', error);
            const message = error?.message ? `Failed to save draft: ${error.message}` : 'Failed to save draft';
            this.view.showNotification(message, 'error');
        }
    }
    
    // Calendar Operations
    loadCalendar() {
        const events = this.model.events;
        this.view.renderCalendar(events);
    }
    
    showDayEvents(day) {
        const events = this.model.getEventsForDay(day);
        this.view.displayEvents(day, events);
    }
    
    // Account Operations
    loadAccounts() {
        const accounts = this.model.getAccounts();
        this.view.renderAccounts(accounts);
    }
    
    // Compose & Settings
    openCompose() {
        // TODO: Implement compose modal
        this.view.showComposeModal();
    }
    
    openSettings() {
        // TODO: Implement settings modal
        this.view.showNotification('Settings coming soon', 'info');
    }
    
    // Test method to verify error boundaries
    async testErrorBoundaries() {
        console.log('🧪 Testing error boundaries...');
        
        // Test 1: Simulate API error
        try {
            throw new Error('Test API error');
        } catch (error) {
            console.log('✅ API error caught and handled');
            this.view.showNotification('Test: API error handled', 'error');
        }
        
        // Test 2: Test email selection with invalid ID
        try {
            await this.selectEmail(999999);
            console.log('✅ Invalid email selection handled');
        } catch (error) {
            console.log('❌ Invalid email selection not handled:', error);
        }
        
        // Test 3: Test display error
        try {
            this.view.displayEmail(null);
            console.log('✅ Null email display handled');
        } catch (error) {
            console.log('❌ Null email display not handled:', error);
        }
        
        console.log('🎯 Error boundary testing complete!');
    }
    
    // Test method to verify pagination works
    testPagination() {
        console.log('🧪 Testing pagination system...');
        
        // Test 1: Check pagination state
        console.log(`Current page: ${this.view.currentPage}`);
        console.log(`Items per page: ${this.view.itemsPerPage}`);
        console.log(`Total emails: ${this.view.totalEmails}`);
        
        // Test 2: Generate test emails if needed
        if (this.model.emails.length < 100) {
            const testEmails = [];
            for (let i = 0; i < 150; i++) {
                testEmails.push({
                    id: 1000 + i,
                    subject: `Test Email ${i + 1}`,
                    sender: `Test Sender ${i + 1}`,
                    email: `test${i}@example.com`,
                    preview: `This is test email number ${i + 1} for pagination testing`,
                    time: '1m',
                    date: new Date(),
                    unread: Math.random() > 0.5,
                    starred: Math.random() > 0.8,
                    folder: 'inbox',
                    tags: [],
                    hasAttachments: false,
                    body: `Test email content ${i + 1}`
                });
            }
            this.model.emails = [...this.model.emails, ...testEmails];
            console.log(`✅ Added ${testEmails.length} test emails`);
        }
        
        // Test 3: Re-render with pagination
        this.loadEmails('inbox');
        
        console.log('🎯 Pagination testing complete! Check the UI for pagination controls.');
    }
    
    // Simple method to force pagination visibility for testing
    showPaginationTest() {
        console.log('🧪 Forcing pagination visibility for testing...');
        
        // Set lower items per page to make pagination visible even with few emails
        this.view.itemsPerPage = 5;
        this.view.currentPage = 1;
        
        // Enable force pagination flag
        window.FORCE_PAGINATION = true;
        
        // Re-render current view
        this.loadEmails(this.model.currentFolder);
        
        console.log('✅ Pagination should now be visible with 5 emails per page!');
        console.log('💡 To disable: window.FORCE_PAGINATION = false; then reload emails');
    }
}
// Make functions globally available for onclick handlers
if (typeof window !== 'undefined') {
    window.initMailFunctions = (controller) => {
        window.showReply = () => controller.showReply();
        window.showReplyAll = () => controller.showReplyAll();
        window.showForward = () => controller.showForward();
        window.closeReply = () => controller.closeReply();
        window.sendReply = () => controller.sendReply();
        window.markAsRead = () => controller.markSelectedAsRead();
        window.markAsUnread = () => controller.markSelectedAsUnread();
        window.deleteEmail = () => controller.deleteSelectedEmail();
        window.archiveEmail = () => controller.archiveSelectedEmail();
        window.toggleStar = (emailId) => controller.toggleStar(emailId || controller.model.selectedEmail?.id);
        window.moveToFolder = () => controller.showMoveToFolder();
        window.snoozeEmail = () => controller.showSnoozeOptions();
        window.saveDraft = () => controller.saveDraft();
        window.openSettings = () => controller.openSettings();
        window.hideEvents = () => controller.view.hideEvents();
        window.undo = () => controller.undo();
        window.selectAllEmails = () => controller.selectAllEmails();
    };
}
