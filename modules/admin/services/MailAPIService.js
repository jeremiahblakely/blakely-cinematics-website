// MailAPIService.js - API Integration for Email System
// Path: /modules/admin/services/MailAPIService.js
// Created: September 12, 2025, 7:45 PM
// Purpose: Connect to AWS Lambda email endpoints via API Gateway

export default class MailAPIService {
    constructor() {
        // API Gateway base URL (configurable via window.CONFIG.API_BASE_URL)
        this.baseURL = (typeof window !== 'undefined' && window.CONFIG && window.CONFIG.API_BASE_URL)
            ? window.CONFIG.API_BASE_URL
            : 'https://qtgzo3psyb.execute-api.us-east-1.amazonaws.com/prod';
        
        // Default headers
        this.headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };
        
        // Current user (will be set from auth or account selector)
        // Fallback chain: localStorage -> window.ADMIN_MAIL_DEFAULT_USER -> 'admin'
        let storedId = null;
        try { storedId = localStorage.getItem('adminUserId'); } catch {}
        const configuredId = (typeof window !== 'undefined' && window.ADMIN_MAIL_DEFAULT_USER) || null;
        this.userId = storedId || configuredId || 'admin';
    }

    // Allow controller to switch account context
    setUserId(userId) {
        if (userId && typeof userId === 'string') {
            this.userId = userId;
            try { localStorage.setItem('adminUserId', userId); } catch {}
        }
    }
    
    // Helper method for API calls
    async apiCall(endpoint, method = 'GET', body = null) {
        try {
            const options = {
                method,
                headers: this.headers,
                mode: 'cors'
            };
            
            if (body && method !== 'GET') {
                options.body = JSON.stringify(body);
            }
            
            const response = await fetch(`${this.baseURL}${endpoint}`, options);
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || `HTTP error! status: ${response.status}`);
            }
            
            return data;
        } catch (error) {
            console.error('API call failed:', error);
            throw error;
        }
    }
    
    // Send email
    async sendEmail(emailData) {
        const payload = {
            userId: this.userId,
            from: emailData.from || 'jeremiah.blakely@gmail.com', // Use verified email
            to: emailData.to,
            cc: emailData.cc || [],
            bcc: emailData.bcc || [],
            subject: emailData.subject,
            textBody: emailData.textBody || emailData.body,
            htmlBody: emailData.htmlBody || `<div>${emailData.body || emailData.textBody}</div>`,
            replyTo: emailData.replyTo,
            inReplyTo: emailData.threadId
        };
        
        try {
            const result = await this.apiCall('/mail/send', 'POST', payload);
            return {
                success: result.success,
                emailId: result.emailId,
                messageId: result.messageId
            };
        } catch (error) {
            console.error('Failed to send email:', error);
            return { success: false, error: error.message };
        }
    }
    
    // Fetch emails from inbox
    async fetchEmails(folder = 'inbox', limit = 50, nextToken = null) {
        try {
            const params = new URLSearchParams({ userId: this.userId, folder: folder, limit: limit });
            if (nextToken) params.set('nextToken', nextToken);
            const url = `/mail/inbox?${params}`;
            console.debug('[MailAPI] fetchEmails', {
                userId: this.userId,
                folder,
                limit,
                nextTokenPresent: !!nextToken,
                url
            });
            
            const result = await this.apiCall(url, 'GET');
            return {
                success: result.success,
                emails: result.emails || [],
                count: result.count || 0,
                nextToken: result.nextToken || null
            };
        } catch (error) {
            console.error('Failed to fetch emails:', error);
            return { success: false, emails: [], error: error.message, nextToken: null };
        }
    }
    
    // Save draft
    async saveDraft(draftData) {
        const payload = {
            userId: this.userId,
            from: draftData.from || 'jeremiah.blakely@gmail.com',
            to: draftData.to || '',
            cc: draftData.cc || [],
            bcc: draftData.bcc || [],
            subject: draftData.subject || '(No Subject)',
            textBody: draftData.textBody || draftData.body || '',
            htmlBody: draftData.htmlBody || `<div>${draftData.body || ''}</div>`
        };
        
        try {
            const result = await this.apiCall('/mail/draft', 'POST', payload);
            return {
                success: result.success,
                emailId: result.emailId
            };
        } catch (error) {
            console.error('Failed to save draft:', error);
            return { success: false, error: error.message };
        }
    }
    
    // Move email to folder
    async moveToFolder(emailId, targetFolder) {
        const payload = {
            action: 'move-folder',
            userId: this.userId,
            emailId: emailId,
            targetFolder: targetFolder
        };
        
        try {
            const result = await this.apiCall('/mail/manage', 'POST', payload);
            return { success: result.success };
        } catch (error) {
            console.error('Failed to move email:', error);
            return { success: false, error: error.message };
        }
    }
    
    // Mark email as read
    async markAsRead(emailId) {
        const payload = {
            action: 'mark-read',
            userId: this.userId,
            emailId: emailId
        };
        
        try {
            const result = await this.apiCall('/mail/manage', 'POST', payload);
            return { success: result.success };
        } catch (error) {
            console.error('Failed to mark as read:', error);
            return { success: false, error: error.message };
        }
    }
    
    // Delete email
    async deleteEmail(emailId) {
        try {
            const params = new URLSearchParams({
                userId: this.userId
            });
            
            const result = await this.apiCall(`/mail/${emailId}?${params}`, 'DELETE');
            return { success: result.success };
        } catch (error) {
            console.error('Failed to delete email:', error);
            return { success: false, error: error.message };
        }
    }
    
    // Search emails (client-side for now, can be enhanced with server-side search)
    async searchEmails(query, folder = null) {
        const result = await this.fetchEmails(folder || 'inbox', 100);
        if (result.success && query) {
            const searchTerm = query.toLowerCase();
            result.emails = result.emails.filter(email => 
                (email.subject && email.subject.toLowerCase().includes(searchTerm)) ||
                (email.from && email.from.toLowerCase().includes(searchTerm)) ||
                (email.textBody && email.textBody.toLowerCase().includes(searchTerm))
            );
            result.count = result.emails.length;
        }
        return result;
    }
    
    // Fetch all folders with counts
    async fetchFolderCounts() {
        const folders = ['inbox', 'sent', 'drafts', 'trash'];
        const counts = {};
        
        for (const folder of folders) {
            try {
                const result = await this.fetchEmails(folder, 1);
                counts[folder] = result.count || 0;
            } catch (error) {
                counts[folder] = 0;
            }
        }
        
        return counts;
    }
}

// Export singleton instance
export const mailAPI = new MailAPIService();
