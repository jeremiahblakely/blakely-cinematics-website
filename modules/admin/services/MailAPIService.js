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
        // Optionally add API key if provided via window.CONFIG.API_KEY
        try {
            if (typeof window !== 'undefined' && window.CONFIG && window.CONFIG.API_KEY) {
                this.headers['x-api-key'] = window.CONFIG.API_KEY;
            }
        } catch {}
        
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
            let data = null;
            try {
                data = await response.clone().json();
            } catch {
                try { data = await response.text(); } catch { data = null; }
            }
            if (!response.ok) {
                const msg = (data && data.error) ? data.error : (typeof data === 'string' && data ? data : `HTTP ${response.status}`);
                const err = new Error(msg || 'API error');
                err.status = response.status;
                err.payload = data;
                throw err;
            }
            return data || {};
        } catch (error) {
            console.error('API call failed:', error);
            throw error;
        }
    }
    
    // Send email
    async sendEmail(emailData) {
        // Basic client-side validation to avoid 500s from missing fields
        const toList = Array.isArray(emailData.to) ? emailData.to : (emailData.to ? [emailData.to] : []);
        if (!toList.length) {
            return { success: false, error: 'Missing recipient (To)' };
        }
        const payload = {
            userId: this.userId,
            from: emailData.from || (this.userId && this.userId.includes('@') ? this.userId : 'jeremiah.blakely@gmail.com'), // prefer selected account if email-like
            to: toList,
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
            return { success: false, error: error.message || 'Failed to send email' };
        }
    }
    
    // Fetch emails with optional conditional headers (ETag/Last-Modified)
    async fetchEmails(folder = 'inbox', limit = 50, nextToken = null, options = {}) {
        try {
            const params = new URLSearchParams({ userId: this.userId, folder: folder, limit: limit });
            if (nextToken) params.set('nextToken', nextToken);
            const url = `/mail/inbox?${params}`;
            console.debug('[MailAPI] fetchEmails', {
                userId: this.userId,
                folder,
                limit,
                nextTokenPresent: !!nextToken,
                url,
                etag: options?.etag || null,
                lastModified: options?.lastModified || null
            });

            // Build headers including conditional ones
            const headers = { ...this.headers };
            if (options?.etag) headers['If-None-Match'] = options.etag;
            if (options?.lastModified) headers['If-Modified-Since'] = options.lastModified;

            // Use fetch directly to access headers and status codes
            const resp = await fetch(`${this.baseURL}${url}`, { method: 'GET', headers, mode: 'cors' });

            const etag = resp.headers?.get('ETag') || null;
            const lastModified = resp.headers?.get('Last-Modified') || null;
            const status = resp.status;

            if (status === 304) {
                // Not modified: no body expected
                return { success: true, emails: [], count: 0, nextToken: null, etag, lastModified, status, notModified: true };
            }

            const data = await resp.json();
            if (!resp.ok) {
                throw new Error(data?.error || `HTTP error! status: ${status}`);
            }

            return {
                success: data.success,
                emails: data.emails || [],
                count: data.count || 0,
                nextToken: data.nextToken || null,
                etag,
                lastModified,
                status,
                notModified: false
            };
        } catch (error) {
            console.error('Failed to fetch emails:', error);
            return { success: false, emails: [], error: error.message, nextToken: null, etag: null, lastModified: null, status: 0, notModified: false };
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
