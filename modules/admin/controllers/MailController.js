// MailController.js - Updated with Core Email Actions
// Path: /modules/admin/controllers/MailController.js
// Updated: December 17, 2024

import MailModel from '../models/MailModel.js';
import MailView from '../views/MailView.js';
import TemplateService from '../services/TemplateService.js';
import ComposeView from '../components/ComposeView.js';
import ThemeSwitcher from '../components/ThemeSwitcher.js';

export default class MailController {
    constructor() {
        this.model = new MailModel();
        this.view = new MailView();
        this.undoStack = []; // Store undo functions
        this.templateService = new TemplateService();
        this.composeView = new ComposeView(null, null, this.view.signatureService);
        
        this.initializeEventListeners();
        this.initialize();
        
        // Initialize theme switcher after DOM is ready
        setTimeout(() => {
            this.themeSwitcher = new ThemeSwitcher();
        }, 100);
    }
    
    initialize() {
        // Load initial data
        this.loadFolders();
        this.loadEmails();
        this.loadCalendar();
        this.loadAccounts();
    }
    
    initializeEventListeners() {
        // Email list click handler
        this.view.elements.emailList.addEventListener('click', (e) => {
            // Check for checkbox click
            const checkbox = e.target.closest('.email-checkbox');
            if (checkbox) {
                const emailId = parseInt(checkbox.dataset.emailId);
                this.toggleEmailSelection(emailId);
                return;
            }
            
            // Check for star click
            const star = e.target.closest('.email-star');
            if (star) {
                e.stopPropagation();
                const emailId = parseInt(star.dataset.emailId);
                this.toggleStar(emailId);
                return;
            }
            
            // Regular email click
            const emailItem = e.target.closest('.mail-item');
            if (emailItem) {
                const emailId = parseInt(emailItem.dataset.emailId);
                this.selectEmail(emailId);
            }
        });
        
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
            this.searchEmails(e.target.value);
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
        activeElement.classList.contains('contenteditable-editor') ||
        activeElement.id === 'replyText' ||
        activeElement.closest('[contenteditable="true"]')
    );
    
    // If user is typing, don't process shortcuts
    if (isTyping) {
        return;
    }
    
    // Delete key for delete email
    if (e.key === 'Delete' && this.model.selectedEmail) {
        e.preventDefault();
        this.deleteSelectedEmail();
    }
    
    // Backspace for archive
    if (e.key === 'Backspace' && !e.metaKey && !e.ctrlKey && this.model.selectedEmail) {
        e.preventDefault();
        this.archiveSelectedEmail();
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
        
        window.sendNewEmail = () => {
            if (this.composeView) {
                const data = this.composeView.getData();
                console.log('Sending email:', data);
                // TODO: Implement actual send via API
                this.view.showNotification('Email sent successfully', 'success');
                this.composeView.close();
            }
        };
        
        window.saveDraftEmail = () => {
            if (this.composeView) {
                const data = this.composeView.getData();
                console.log('Saving draft:', data);
                this.view.showNotification('Draft saved', 'success');
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
            if (this.view.editorCore && this.view.editorCore.isActive) {
                // Use ContentEditableCore for formatting
                this.view.editorCore.formatText(command);
                console.log('Formatted with ContentEditableCore:', command);
                return;
            }
            
            // Fallback to textarea markdown formatting (existing code)
            const textarea = document.getElementById('replyText');
            if (!textarea) return;
            
            // Check if it's a contenteditable div without editorCore
            if (textarea.contentEditable === 'true' || textarea.contentEditable === true) {
                // Direct execCommand for contenteditable
                document.execCommand(command, false, null);
                return;
            }
            
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
        this.view.renderEmailList(emails);
    }
    
    selectEmail(emailId) {
        const email = this.model.getEmailById(emailId);
        if (email) {
            this.model.selectedEmail = email;
            this.model.markAsRead(emailId);
            this.view.displayEmail(email);
            this.updateFolderCounts();
        }
    }
    
    searchEmails(query) {
        const emails = this.model.searchEmails(query);
        this.view.renderEmailList(emails);
    }
    
    filterByAccount(account) {
        this.loadEmails(this.model.currentFolder, account);
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
    }
    
    // Read/Unread Actions
    markSelectedAsRead() {
        if (this.model.selectedEmails.size > 0) {
            this.model.bulkMarkAsRead();
            this.loadEmails();
        } else if (this.model.selectedEmail) {
            this.model.markAsRead(this.model.selectedEmail.id);
            this.view.updateEmailReadStatus(this.model.selectedEmail.id, false);
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
        }
        this.updateFolderCounts();
        this.view.showNotification('Marked as unread', 'success');
    }
    
    // Delete Operations
    deleteSelectedEmail() {
        let undoFunction;
        
        if (this.model.selectedEmails.size > 0) {
            undoFunction = this.model.bulkDelete();
            this.view.showNotification(
                `${this.model.selectedEmails.size} emails moved to trash`,
                'success',
                true // Show undo button
            );
        } else if (this.model.selectedEmail) {
            const emailId = this.model.selectedEmail.id;
            undoFunction = this.model.deleteEmail(emailId);
            this.view.showNotification('Email moved to trash', 'success', true);
        }
        
        if (undoFunction) {
            this.undoStack.push(undoFunction);
        }
        
        this.loadEmails();
        this.view.clearEmailContent();
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
        const replyData = this.view.getReplyData();
        if (replyData && replyData.body) {
            const result = await this.model.sendEmail(replyData);
            if (result.success) {
                this.view.hideReplyBox();
                this.view.showNotification('Email sent successfully', 'success');
            } else {
                this.view.showNotification('Failed to send email', 'error');
            }
        }
    }
    
    saveDraft() {
        const replyData = this.view.getReplyData();
        if (replyData && replyData.body) {
            // TODO: Implement draft saving
            this.view.showNotification('Draft saved', 'success');
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

