// MailModel.js - Updated with Core Email Actions
// Path: /modules/admin/models/MailModel.js
// Updated: December 17, 2024

export default class MailModel {
    constructor() {
        this.emails = [];
        this.folders = [];
        this.currentFolder = 'inbox';
        this.selectedEmail = null;
        this.selectedEmails = new Set(); // For bulk actions
        this.starredEmails = new Set();
        this.snoozedEmails = new Map(); // emailId -> snoozeUntil date
        this.accounts = [
            { value: 'all', label: 'All Accounts' },
            { value: 'jd@jeremiahblakely.com', label: 'jd@jeremiahblakely.com' },
            { value: 'jd@blakelycinematics.com', label: 'jd@blakelycinematics.com' }
        ];
        this.events = {};
        
        // Initialize with mock data
        this.initializeMockData();
    }
    
    initializeMockData() {
        this.emails = [
            {
                id: 1,
                threadId: 'THREAD#001',
                sender: 'Sarah Johnson',
                email: 'sarah.johnson@example.com',
                recipients: {
                    to: ['jd@blakelycinematics.com'],
                    cc: [],
                    bcc: []
                },
                subject: 'Inquiry about Portrait Session Availability',
                preview: 'Hi Jeremiah, I wanted to check if you have availability for a portrait session next Friday...',
                time: '2:34 PM',
                date: new Date('2024-12-17T14:34:00'),
                unread: true,
                starred: false,
                folder: 'inbox',
                account: 'jd@blakelycinematics.com',
                tags: ['inquiry', 'booking'],
                bookingId: null,
                clientEmail: 'sarah.johnson@example.com',
                hasAttachments: false,
                archived: false,
                body: `<p>Hi Jeremiah,</p>
                <p>I wanted to check if you have availability for a portrait session next Friday afternoon (December 20th). I'm looking for a professional headshot session with a few different looks.</p>
                <p>Could you please let us know if you're available for that date? We'd also love to schedule a consultation to discuss our vision.</p>
                <p>Looking forward to hearing from you!</p>
                <p>Best regards,<br>Sarah Johnson<br>(415) 555-0123</p>`
            },
            {
                id: 2,
                threadId: 'THREAD#002',
                sender: 'Michael Chen',
                email: 'mchen@techstartup.com',
                recipients: {
                    to: ['jd@jeremiahblakely.com'],
                    cc: ['team@techstartup.com'],
                    bcc: []
                },
                subject: 'Re: Gallery Access Code Request',
                preview: 'Thank you for sending the access code. I was able to view the photos and they look amazing...',
                time: '9:15 AM',
                date: new Date('2024-12-17T09:15:00'),
                unread: true,
                starred: false,
                folder: 'inbox',
                account: 'jd@jeremiahblakely.com',
                tags: ['client'],
                bookingId: 'BOOKING#2024-045',
                clientEmail: 'mchen@techstartup.com',
                hasAttachments: false,
                archived: false,
                body: `<p>Thank you for sending the access code!</p>
                <p>I was able to view the photos and they look amazing. My team especially loved the candid shots from the product launch event.</p>
                <p>We'd like to download the high-resolution versions for our marketing materials. Also, would it be possible to get a few additional edits on photos #47 and #92?</p>
                <p>Thanks,<br>Michael</p>`
            },
            {
                id: 3,
                threadId: 'THREAD#003',
                sender: 'Stripe',
                email: 'notifications@stripe.com',
                recipients: {
                    to: ['jd@blakelycinematics.com'],
                    cc: [],
                    bcc: []
                },
                subject: 'Payment Received - Invoice #2024-1847',
                preview: 'You\'ve received a payment of $2,500.00 from Emily Roberts...',
                time: 'Yesterday',
                date: new Date('2024-12-16T15:30:00'),
                unread: false,
                starred: true,
                folder: 'inbox',
                account: 'jd@blakelycinematics.com',
                tags: ['finance'],
                bookingId: 'BOOKING#2024-048',
                clientEmail: 'emily.roberts@email.com',
                hasAttachments: true,
                archived: false,
                body: `<p>Payment Received Successfully</p>
                <p>Amount: $2,500.00<br>
                Client: Emily Roberts<br>
                Invoice: #2024-1847<br>
                Service: Portrait Session Package</p>
                <p>The funds will be available in your account within 2 business days.</p>`
            }
        ];
        
        // Initialize starred emails
        this.emails.forEach(email => {
            if (email.starred) {
                this.starredEmails.add(email.id);
            }
        });
        
        // Mock folders with counts
        this.folders = [
            { id: 'inbox', name: 'Inbox', icon: '📥', count: 12 },
            { id: 'starred', name: 'Starred', icon: '⭐', count: 1 },
            { id: 'sent', name: 'Sent', icon: '📤', count: null },
            { id: 'drafts', name: 'Drafts', icon: '📝', count: 2 },
            { id: 'bookings', name: 'Bookings', icon: '📅', count: 8 },
            { id: 'clients', name: 'Clients', icon: '👤', count: null },
            { id: 'finance', name: 'Finance', icon: '💰', count: null },
            { id: 'galleries', name: 'Galleries', icon: '🎨', count: null },
            { id: 'archived', name: 'Archived', icon: '📦', count: 0 },
            { id: 'trash', name: 'Trash', icon: '🗑️', count: null }
        ];
        
        // Calendar events
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
    
    // Email methods
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
        } else if (folder === 'archived') {
            filtered = filtered.filter(e => e.archived === true);
        } else if (folder && folder !== 'all') {
            filtered = filtered.filter(e => e.folder === folder && !e.archived);
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
    
    // Star/Unstar
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
    
    // Read/Unread
    markAsRead(emailId) {
        const email = this.emails.find(e => e.id === emailId);
        if (email) {
            email.unread = false;
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
    
    // Delete (move to trash)
    deleteEmail(emailId) {
        const email = this.emails.find(e => e.id === emailId);
        if (email) {
            const previousFolder = email.folder;
            email.folder = 'trash';
            this.updateFolderCounts();
            
            // Return undo function
            return () => {
                email.folder = previousFolder;
                this.updateFolderCounts();
            };
        }
        return null;
    }
    
    // Permanent delete
    permanentlyDelete(emailId) {
        const index = this.emails.findIndex(e => e.id === emailId);
        if (index !== -1) {
            this.emails.splice(index, 1);
            this.starredEmails.delete(emailId);
            this.snoozedEmails.delete(emailId);
            this.selectedEmails.delete(emailId);
            this.updateFolderCounts();
        }
    }
    
    // Archive
    archiveEmail(emailId) {
        const email = this.emails.find(e => e.id === emailId);
        if (email) {
            email.archived = true;
            this.updateFolderCounts();
            
            // Return undo function
            return () => {
                email.archived = false;
                this.updateFolderCounts();
            };
        }
        return null;
    }
    
    // Move to folder
    moveToFolder(emailId, targetFolder) {
        const email = this.emails.find(e => e.id === emailId);
        if (email) {
            const previousFolder = email.folder;
            email.folder = targetFolder;
            email.archived = false; // Unarchive when moving to a folder
            this.updateFolderCounts();
            
            // Return undo function
            return () => {
                email.folder = previousFolder;
                this.updateFolderCounts();
            };
        }
        return null;
    }
    
    // Snooze
    snoozeEmail(emailId, snoozeUntil) {
        const email = this.emails.find(e => e.id === emailId);
        if (email) {
            this.snoozedEmails.set(emailId, snoozeUntil);
            
            // Return undo function
            return () => {
                this.snoozedEmails.delete(emailId);
            };
        }
        return null;
    }
    
    // Bulk selection
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
    
    // Bulk actions
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
    
    // Folder methods
    getFolders() {
        return this.folders;
    }
    
    setCurrentFolder(folderId) {
        this.currentFolder = folderId;
    }
    
    updateFolderCounts() {
        // Update inbox count
        const inbox = this.folders.find(f => f.id === 'inbox');
        if (inbox) {
            inbox.count = this.emails.filter(e => 
                e.folder === 'inbox' && 
                e.unread && 
                !e.archived &&
                !this.snoozedEmails.has(e.id)
            ).length;
        }
        
        // Update starred count
        const starred = this.folders.find(f => f.id === 'starred');
        if (starred) {
            starred.count = this.starredEmails.size;
        }
        
        // Update archived count
        const archived = this.folders.find(f => f.id === 'archived');
        if (archived) {
            archived.count = this.emails.filter(e => e.archived).length;
        }
        
        // Update trash count
        const trash = this.folders.find(f => f.id === 'trash');
        if (trash) {
            trash.count = this.emails.filter(e => e.folder === 'trash').length;
        }
    }
    
    // Reply/Forward helpers
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
        
        // Include all original recipients except ourselves
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
            threadId: null, // New thread for forwards
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
    
    // Account methods
    getAccounts() {
        return this.accounts;
    }
    
    // Calendar methods
    getEventsForDay(day) {
        return this.events[day.toString()] || [];
    }
    
    // Search functionality
    searchEmails(query) {
        return this.getEmails(this.currentFolder, null, query);
    }
    
    // Future: API integration methods
    async fetchEmailsFromAPI() {
        // TODO: Integrate with AWS WorkMail/SES
        return this.emails;
    }
    
    async sendEmail(emailData) {
        // TODO: Integrate with SES for sending
        console.log('Sending email:', emailData);
        return { success: true, messageId: 'MOCK-001' };
    }
}