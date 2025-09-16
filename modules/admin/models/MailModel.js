// MailModel.js - Updated with API Integration
// Path: /modules/admin/models/MailModel.js
// Updated: September 12, 2025 - Integrated with AWS Lambda Email API

import { mailAPI } from '../services/MailAPIService.js';
import mailCache from '../services/MailCacheService.js';

export default class MailModel {
    constructor() {
        this.emails = [];
        this.folders = [];
        this.currentFolder = 'inbox';
        this.selectedEmail = null;
        this.selectedEmails = new Set();
        this.starredEmails = new Set();
        this.snoozedEmails = new Map();
        this._idSeq = 1; // simple in-memory id generator for stable selection
        this.accounts = [
            { value: 'all', label: 'All Accounts' },
            { value: 'admin', label: 'admin' },
            { value: 'jd@blakelycinematics.com', label: 'jd@blakelycinematics.com' },
            { value: 'jd@jeremiahblakely.com', label: 'jd@jeremiahblakely.com' }
        ];
        this.events = {};
        this.isLoading = false;
        
        // Initialize with folder structure (keep UI responsive)
        this.initializeFolders();
        
        // Load real emails from API
        this.loadEmailsFromAPI();
    }
    
    initializeFolders() {
        this.folders = [
            { id: 'all', name: 'All Mail', icon: '📨', count: 0 },
            { id: 'inbox', name: 'Inbox', icon: '📥', count: 0 },
            { id: 'unread', name: 'Unread', icon: '✉️', count: 0 },
            { id: 'starred', name: 'Starred', icon: '⭐', count: 0 },
            { id: 'sent', name: 'Sent', icon: '📤', count: 0 },
            { id: 'drafts', name: 'Drafts', icon: '📝', count: 0 },
            { id: 'bookings', name: 'Bookings', icon: '📅', count: 0 },
            { id: 'clients', name: 'Clients', icon: '👤', count: 0 },
            { id: 'finance', name: 'Finance', icon: '💰', count: 0 },
            { id: 'galleries', name: 'Galleries', icon: '🎨', count: 0 },
            { id: 'archived', name: 'Archived', icon: '📦', count: 0 },
            { id: 'trash', name: 'Trash', icon: '🗑️', count: 0 }
        ];
        
        // Calendar events (keep mock for now)
        this.events = {
            '11': [
                { time: '10:00 AM', title: 'Portfolio Review', type: 'meeting' },
                { time: '2:00 PM', title: 'Client Consultation', type: 'booking' }
            ],
            '14': [
                { time: '9:00 AM', title: 'Wedding Shoot - Johnson', type: 'shoot' },
                { time: '3:00 PM', title: 'Edit Session', type: 'work' }
            ],
            '21': [
                { time: '11:00 AM', title: 'Gallery Delivery', type: 'delivery' },
                { time: '4:00 PM', title: 'Team Meeting', type: 'meeting' }
            ]
        };
    }
    
    // Fetch emails from API (via service)
    async fetchEmailsFromAPI(folder = this.currentFolder, limit = 50, nextToken = null) {
        try {
            // Pull conditional headers from cache
            let etag = null, lastModified = null;
            try {
                const state = await mailCache.getFolderState(mailAPI.userId, folder);
                etag = state?.etag || null;
                lastModified = state?.lastModified || null;
            } catch {}

            const result = await mailAPI.fetchEmails(folder, limit, nextToken, { etag, lastModified });
            if (result && result.success) {
                return {
                    emails: result.emails || [],
                    nextToken: result.nextToken || null,
                    etag: result.etag || null,
                    lastModified: result.lastModified || null,
                    notModified: !!result.notModified
                };
            }
            return { emails: [], nextToken: null, etag: null, lastModified: null, notModified: false };
        } catch (error) {
            console.error('Failed to fetch emails:', error);
            return { emails: [], nextToken: null, etag: null, lastModified: null, notModified: false };
        }
    }

    // Load emails from API
    async loadEmailsFromAPI() {
        this.isLoading = true;
        try {
            let { emails, nextToken } = await this.fetchEmailsFromAPI('inbox', 50);
            // Fallback: some stages may not have the folder GSI; query all by userId
            if (!emails || emails.length === 0) {
                const fallback = await this.fetchEmailsFromAPI('all', 50);
                emails = fallback.emails;
                nextToken = fallback.nextToken;
            }
            if (emails && emails.length > 0) {
                // Transform API emails to match our UI format if needed
                const folder = (emails[0] && emails[0].folder) || 'inbox';
                this.emails = emails.map(email => this.transformAPIEmail(email, folder));
                this.nextToken = nextToken || null;
                
                // Update starred emails set
                this.emails.forEach(email => {
                    if (email.starred) {
                        this.starredEmails.add(email.id);
                    }
                });
                
                this.updateFolderCounts();
            } else {
                // Fall back to empty array if no emails
                this.loadMockEmails();
                this.nextToken = null;
            }
            
        } catch (error) {
            console.error('Failed to load emails from API:', error);
            // Fall back to some mock data for demo purposes
            this.loadMockEmails();
        } finally {
            this.isLoading = false;
        }
    }

    // Append more emails using pagination token
    async loadMoreEmails(limit = 50) {
        if (!this.nextToken) return { appended: 0, nextToken: null };
        const { emails, nextToken } = await this.fetchEmailsFromAPI(this.currentFolder, limit, this.nextToken);
        if (emails && emails.length) {
            const folder = (emails[0] && emails[0].folder) || this.currentFolder;
            const transformed = emails.map(e => this.transformAPIEmail(e, folder));
            this.emails = this.emails.concat(transformed);
            this.updateFolderCounts();
        }
        this.nextToken = nextToken || null;
        return { appended: emails?.length || 0, nextToken: this.nextToken };
    }
    
    // Transform API email to match our UI format
    transformAPIEmail(apiEmail, folder) {
        // Helper to parse strings like: "Name" <email@domain.com>
        const parseAddress = (raw) => {
            if (!raw) return { name: '', address: '' };
            if (typeof raw === 'object' && (raw.address || raw.email || raw.name)) {
                return {
                    name: (raw.name || '').toString().replace(/^"|"$/g, '').trim(),
                    address: (raw.address || raw.email || '').toString().trim()
                };
            }
            const str = String(raw).trim();
            const m = str.match(/^\s*"?([^"<]+?)"?\s*<\s*([^>\s]+)\s*>\s*$/);
            if (m) {
                return { name: m[1].trim(), address: m[2].trim() };
            }
            // Try to pull out an email if present, else treat as name only
            const emailMatch = str.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
            return {
                name: str.replace(/<[^>]*>/g, '').replace(/"/g, '').trim(),
                address: emailMatch ? emailMatch[0] : ''
            };
        };
        // Generate a numeric ID for UI (sequential to avoid collisions)
        const numericId = this._idSeq++;
        // Normalize folder: treat 'unread' items as part of the Inbox
        const effectiveFolder = apiEmail.folder === 'unread'
            ? 'inbox'
            : (apiEmail.folder || folder);
        
        return {
            id: numericId,
            emailId: apiEmail.emailId, // Keep original for API calls
            threadId: apiEmail.inReplyTo || `THREAD#${numericId}`,
            // Normalize From into name + address
            ...(() => {
                const fromRaw = apiEmail.fromName || apiEmail.from || '';
                const parsed = parseAddress(fromRaw);
                return {
                    sender: parsed.name || 'Unknown Sender',
                    email: parsed.address || 'no-reply@example.com'
                };
            })(),
            recipients: {
                // Preserve original recipient formatting to retain display names
                to: (Array.isArray(apiEmail.to) ? apiEmail.to : [apiEmail.to].filter(Boolean)),
                cc: apiEmail.cc || [],
                bcc: apiEmail.bcc || []
            },
            subject: apiEmail.subject || '(No Subject)',
            preview: this.extractPreview(apiEmail.textBody || apiEmail.htmlBody || ''),
            time: this.formatTime(apiEmail.timestamp),
            date: new Date(apiEmail.timestamp || Date.now()),
            unread: apiEmail.status !== 'read',
            starred: apiEmail.starred || false,
            folder: effectiveFolder,
            account: (() => {
                const tos = Array.isArray(apiEmail.to) ? apiEmail.to : [apiEmail.to].filter(Boolean);
                const addr = tos.length ? parseAddress(tos[0]).address : '';
                return addr || 'jd@blakelycinematics.com';
            })(),
            tags: this.extractTags(apiEmail),
            bookingId: apiEmail.bookingId || null,
            clientEmail: (() => {
                const parsed = parseAddress(apiEmail.from || '');
                return parsed.address || apiEmail.from || null;
            })(),
            hasAttachments: apiEmail.attachments?.length > 0,
            archived: effectiveFolder === 'archived',
            body: apiEmail.htmlBody || `<p>${apiEmail.textBody || ''}</p>`
        };
    }
    
    // Load mock emails as fallback
    loadMockEmails() {
        this.emails = [];
        
        this.updateFolderCounts();
    }
    
    // Helper methods
    extractPreview(text) {
        const plainText = text.replace(/<[^>]*>/g, '').trim();
        return plainText.length > 100 ? plainText.substring(0, 100) + '...' : plainText;
    }
    
    formatTime(timestamp) {
        if (!timestamp) return 'Unknown';
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;
        
        if (diff < 3600000) { // Less than 1 hour
            const mins = Math.floor(diff / 60000);
            return mins === 0 ? 'Just now' : `${mins}m`;
        } else if (diff < 86400000) { // Less than 1 day
            return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
        } else if (diff < 172800000) { // Less than 2 days
            return 'Yesterday';
        } else {
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        }
    }
    
    extractTags(email) {
        const tags = [];
        if (email.folder === 'bookings') tags.push('booking');
        if (email.from?.includes('stripe')) tags.push('finance');
        if (email.subject?.toLowerCase().includes('inquiry')) tags.push('inquiry');
        if (email.subject?.toLowerCase().includes('gallery')) tags.push('gallery');
        return tags;
    }
    
    // Email methods (keep existing interface)
    getEmails(folder = null, account = null, searchQuery = null) {
        let filtered = [...this.emails];
        
        // Filter out snoozed emails
        const now = new Date();
        filtered = filtered.filter(e => {
            const snoozeUntil = this.snoozedEmails.get(e.id);
            return !snoozeUntil || snoozeUntil <= now;
        });
        
        // Handle special folders
        if (folder === 'starred') {
            filtered = filtered.filter(e => this.starredEmails.has(e.id));
        } else if (folder === 'unread') {
            filtered = filtered.filter(e => e.unread && e.folder !== 'trash' && !e.archived);
        } else if (folder === 'archived') {
            filtered = filtered.filter(e => e.archived === true);
        } else if (folder && folder !== 'all') {
            filtered = filtered.filter(e => e.folder === folder && !e.archived);
        } else if (folder === 'all') {
            // Exclude trash and archived from All Mail view
            filtered = filtered.filter(e => e.folder !== 'trash' && !e.archived);
        }
        
        if (account && account !== 'all') {
            filtered = filtered.filter(e => e.account === account);
        }
        
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(e => 
                e.subject.toLowerCase().includes(query) ||
                e.sender.toLowerCase().includes(query) ||
                e.preview.toLowerCase().includes(query)
            );
        }
        
        return filtered;
    }
    
    getEmailById(id) {
        return this.emails.find(e => e.id === id);
    }

    getEmailByUid(uid) {
        return this.emails.find(e => e.emailId === uid);
    }
    
    // API-integrated send email
    async sendEmail(emailData) {
        try {
            const result = await mailAPI.sendEmail(emailData);
            if (result.success) {
                // Add to sent folder locally
                const sentEmail = {
                    id: Date.now(),
                    emailId: result.emailId,
                    threadId: emailData.threadId || `THREAD#${Date.now()}`,
                    sender: 'You',
                    email: emailData.from || 'jeremiah.blakely@gmail.com',
                    recipients: {
                        to: Array.isArray(emailData.to) ? emailData.to : [emailData.to],
                        cc: emailData.cc || [],
                        bcc: emailData.bcc || []
                    },
                    subject: emailData.subject,
                    preview: this.extractPreview(emailData.body || emailData.textBody),
                    time: 'Just now',
                    date: new Date(),
                    unread: false,
                    starred: false,
                    folder: 'sent',
                    account: emailData.from || 'jeremiah.blakely@gmail.com',
                    tags: [],
                    bookingId: null,
                    clientEmail: emailData.to?.[0],
                    hasAttachments: false,
                    archived: false,
                    body: emailData.htmlBody || emailData.body
                };
                
                this.emails.push(sentEmail);
                this.updateFolderCounts();
                
                return { success: true, messageId: result.messageId };
            }
            return result;
        } catch (error) {
            console.error('Failed to send email:', error);
            return { success: false, error: error.message };
        }
    }
    
    // API-integrated save draft
    async saveDraft(draftData) {
        try {
            const result = await mailAPI.saveDraft(draftData);
            if (result.success) {
                // Add to drafts folder locally
                const draft = {
                    id: Date.now(),
                    emailId: result.emailId,
                    threadId: `DRAFT#${Date.now()}`,
                    sender: 'Draft',
                    email: draftData.from || 'jeremiah.blakely@gmail.com',
                    recipients: {
                        to: draftData.to ? (Array.isArray(draftData.to) ? draftData.to : [draftData.to]) : [],
                        cc: draftData.cc || [],
                        bcc: draftData.bcc || []
                    },
                    subject: draftData.subject || '(No Subject)',
                    preview: this.extractPreview(draftData.body || draftData.textBody || ''),
                    time: 'Just now',
                    date: new Date(),
                    unread: false,
                    starred: false,
                    folder: 'drafts',
                    account: draftData.from || 'jeremiah.blakely@gmail.com',
                    tags: ['draft'],
                    bookingId: null,
                    clientEmail: null,
                    hasAttachments: false,
                    archived: false,
                    body: draftData.htmlBody || draftData.body || ''
                };
                
                this.emails.push(draft);
                this.updateFolderCounts();
                
                return { success: true, emailId: result.emailId };
            }
            return result;
        } catch (error) {
            console.error('Failed to save draft:', error);
            return { success: false, error: error.message };
        }
    }
    
    // Delete with API (move to trash instead of hard delete)
    async deleteEmail(emailId) {
        const email = this.emails.find(e => e.id === emailId);
        if (email) {
            const previousFolder = email.folder;
            // Move to trash in-memory
            email.folder = 'trash';
            email.archived = false;

            // Inform backend best-effort
            if (email.emailId && !email.emailId.startsWith('mock')) {
                try { await mailAPI.deleteEmail(email.emailId); } catch (e) { console.warn('Delete API failed (non-fatal)', e?.message || e); }
            }

            this.updateFolderCounts();
            
            // Return undo function
            return () => {
                email.folder = previousFolder;
                this.updateFolderCounts();
            };
        }
        return null;
    }
    
    // Keep all other existing methods unchanged
    toggleStar(emailId) {
        const email = this.getEmailById(emailId);
        if (email) {
            if (this.starredEmails.has(emailId)) {
                this.starredEmails.delete(emailId);
                email.starred = false;
            } else {
                this.starredEmails.add(emailId);
                email.starred = true;
            }
            this.updateFolderCounts();
            return email.starred;
        }
        return false;
    }
    
    markAsRead(emailId) {
        const email = this.emails.find(e => e.id === emailId);
        if (email) {
            email.unread = false;
            // Update via API if real email
            if (email.emailId && !email.emailId.startsWith('mock')) {
                mailAPI.markAsRead(email.emailId);
            }
            this.updateFolderCounts();
        }
    }
    
    markAsUnread(emailId) {
        const email = this.emails.find(e => e.id === emailId);
        if (email) {
            email.unread = true;
            this.updateFolderCounts();
        }
    }
    
    archiveEmail(emailId) {
        const email = this.emails.find(e => e.id === emailId);
        if (email) {
            email.archived = true;
            // Move to archived folder via API if real email
            if (email.emailId && !email.emailId.startsWith('mock')) {
                mailAPI.moveToFolder(email.emailId, 'archived');
            }
            this.updateFolderCounts();
            
            return () => {
                email.archived = false;
                this.updateFolderCounts();
            };
        }
        return null;
    }
    
    moveToFolder(emailId, targetFolder) {
        const email = this.emails.find(e => e.id === emailId);
        if (email) {
            const previousFolder = email.folder;
            email.folder = targetFolder;
            email.archived = false;
            
            // Update via API if real email
            if (email.emailId && !email.emailId.startsWith('mock')) {
                mailAPI.moveToFolder(email.emailId, targetFolder);
            }
            
            this.updateFolderCounts();
            
            return () => {
                email.folder = previousFolder;
                this.updateFolderCounts();
            };
        }
        return null;
    }
    
    // Keep all other methods from original (snooze, bulk operations, etc.)
    snoozeEmail(emailId, snoozeUntil) {
        const email = this.emails.find(e => e.id === emailId);
        if (email) {
            this.snoozedEmails.set(emailId, snoozeUntil);
            return () => {
                this.snoozedEmails.delete(emailId);
            };
        }
        return null;
    }
    
    toggleEmailSelection(emailId) {
        if (this.selectedEmails.has(emailId)) {
            this.selectedEmails.delete(emailId);
        } else {
            this.selectedEmails.add(emailId);
        }
    }
    
    selectAllEmails(emailIds) {
        emailIds.forEach(id => this.selectedEmails.add(id));
    }
    
    clearSelection() {
        this.selectedEmails.clear();
    }
    
    bulkDelete() {
        const undoFunctions = [];
        this.selectedEmails.forEach(emailId => {
            const undo = this.deleteEmail(emailId);
            if (undo) undoFunctions.push(undo);
        });
        this.clearSelection();
        
        return () => {
            undoFunctions.forEach(undo => undo());
        };
    }
    
    bulkArchive() {
        const undoFunctions = [];
        this.selectedEmails.forEach(emailId => {
            const undo = this.archiveEmail(emailId);
            if (undo) undoFunctions.push(undo);
        });
        this.clearSelection();
        
        return () => {
            undoFunctions.forEach(undo => undo());
        };
    }
    
    bulkMarkAsRead() {
        this.selectedEmails.forEach(emailId => {
            this.markAsRead(emailId);
        });
        this.clearSelection();
    }
    
    bulkMarkAsUnread() {
        this.selectedEmails.forEach(emailId => {
            this.markAsUnread(emailId);
        });
        this.clearSelection();
    }
    
    getFolders() {
        return this.folders;
    }
    
    setCurrentFolder(folderId) {
        this.currentFolder = folderId;
    }
    
    updateFolderCounts() {
        const allF = this.folders.find(f => f.id === 'all');
        if (allF) {
            allF.count = this.emails.filter(e => 
                !e.archived &&
                e.folder !== 'trash' &&
                !this.snoozedEmails.has(e.id)
            ).length;
        }
        const inbox = this.folders.find(f => f.id === 'inbox');
        if (inbox) {
            inbox.count = this.emails.filter(e => 
                e.folder === 'inbox' && 
                e.unread && 
                !e.archived &&
                !this.snoozedEmails.has(e.id)
            ).length;
        }

        const unreadF = this.folders.find(f => f.id === 'unread');
        if (unreadF) {
            unreadF.count = this.emails.filter(e => e.unread && e.folder !== 'trash' && !e.archived).length;
        }
        
        const starred = this.folders.find(f => f.id === 'starred');
        if (starred) {
            starred.count = this.starredEmails.size;
        }
        
        const archived = this.folders.find(f => f.id === 'archived');
        if (archived) {
            archived.count = this.emails.filter(e => e.archived).length;
        }
        
        const trash = this.folders.find(f => f.id === 'trash');
        if (trash) {
            trash.count = this.emails.filter(e => e.folder === 'trash').length;
        }
        
        const drafts = this.folders.find(f => f.id === 'drafts');
        if (drafts) {
            drafts.count = this.emails.filter(e => e.folder === 'drafts').length;
        }
    }
    
    prepareReply(emailId) {
        const email = this.getEmailById(emailId);
        if (!email) return null;
        
        return {
            to: [email.email],
            cc: [],
            bcc: [],
            subject: email.subject.startsWith('Re:') ? email.subject : `Re: ${email.subject}`,
            threadId: email.threadId,
            quotedBody: this.formatQuotedText(email)
        };
    }
    
    prepareReplyAll(emailId) {
        const email = this.getEmailById(emailId);
        if (!email) return null;
        
        const myAccounts = this.accounts.map(a => a.value).filter(a => a !== 'all');
        const to = [email.email];
        const cc = [...email.recipients.to, ...email.recipients.cc]
            .filter(addr => !myAccounts.includes(addr) && addr !== email.email);
        
        return {
            to,
            cc,
            bcc: [],
            subject: email.subject.startsWith('Re:') ? email.subject : `Re: ${email.subject}`,
            threadId: email.threadId,
            quotedBody: this.formatQuotedText(email)
        };
    }
    
    prepareForward(emailId) {
        const email = this.getEmailById(emailId);
        if (!email) return null;
        
        return {
            to: [],
            cc: [],
            bcc: [],
            subject: email.subject.startsWith('Fwd:') ? email.subject : `Fwd: ${email.subject}`,
            threadId: null,
            quotedBody: this.formatForwardedText(email),
            attachments: email.hasAttachments ? ['[Original attachments]'] : []
        };
    }
    
    formatQuotedText(email) {
        const date = new Date(email.date).toLocaleString();
        return `<br><br><div style="border-left: 2px solid #ccc; padding-left: 10px; margin-left: 10px;">
            On ${date}, ${email.sender} &lt;${email.email}&gt; wrote:<br>
            ${email.body}
        </div>`;
    }
    
    formatForwardedText(email) {
        const date = new Date(email.date).toLocaleString();
        return `<br><br>---------- Forwarded message ----------<br>
            From: ${email.sender} &lt;${email.email}&gt;<br>
            Date: ${date}<br>
            Subject: ${email.subject}<br>
            To: ${email.recipients.to.join(', ')}<br><br>
            ${email.body}`;
    }
    
    getAccounts() {
        return this.accounts;
    }
    
    getEventsForDay(day) {
        return this.events[day.toString()] || [];
    }
    
    searchEmails(query) {
        return this.getEmails(this.currentFolder, null, query);
    }

    // Transform API email format to UI format
}
