/**
 * Mail List Management Module
 * Created: December 17, 2024 1:20 PM
 * Purpose: Handle email list operations and display
 */

// ============================================
// EMAIL LIST MANAGEMENT
// ============================================

/**
 * Sort emails by date (newest first)
 */
function sortEmailsByDate() {
    const emailList = document.getElementById('emailList');
    if (!emailList) return;
    
    const emails = Array.from(emailList.querySelectorAll('.mail-item'));
    
    emails.sort((a, b) => {
        // Get timestamps (you may need to adjust based on your data structure)
        const timeA = a.querySelector('.mail-item-time')?.textContent || '';
        const timeB = b.querySelector('.mail-item-time')?.textContent || '';
        
        // If both say "Just now", maintain current order
        if (timeA === 'Just now' && timeB === 'Just now') {
            return 0;
        }
        if (timeA === 'Just now') return -1;
        if (timeB === 'Just now') return 1;
        
        // Otherwise compare timestamps
        return timeB.localeCompare(timeA);
    });
    
    // Clear and re-append in sorted order
    emailList.innerHTML = '';
    emails.forEach(email => emailList.appendChild(email));
    
    console.log('[Mail List] Emails sorted by date');
}

/**
 * Add email to the list (for new sent emails)
 * @param {Object} emailData - Email data object
 */
function addEmailToList(emailData) {
    const emailList = document.getElementById('emailList');
    if (!emailList) return;
    
    const emailItem = document.createElement('div');
    emailItem.className = 'mail-item mail-card';
    emailItem.dataset.folder = 'sent';
    
    emailItem.innerHTML = `
        <div class="mail-item-header">
            <div>
                <div class="mail-item-sender">You</div>
                <div class="mail-item-to">To: ${Array.isArray(emailData.to) ? emailData.to.join(', ') : emailData.to}</div>
            </div>
            <span class="mail-item-time">Just now</span>
        </div>
        <div class="mail-item-subject">${emailData.subject || '(No Subject)'}</div>
        <div class="mail-item-preview">${emailData.body?.substring(0, 100) || ''}</div>
    `;
    
    // Add click handler
    emailItem.addEventListener('click', function() {
        showEmailContent({
            from: 'You',
            to: emailData.to,
            subject: emailData.subject,
            preview: emailData.body,
            time: 'Just now'
        });
        
        // Mark as selected
        document.querySelectorAll('.mail-item').forEach(item => {
            item.classList.remove('selected');
        });
        this.classList.add('selected');
    });
    
    // Add to top of list
    emailList.insertBefore(emailItem, emailList.firstChild);
    
    // Update counts
    updateFolderCounts();
    
    console.log('[Mail List] Email added to list');
}

/**
 * Show email content in the main view
 * @param {Object} email - Email data object
 */
function showEmailContent(email) {
    const subjectEl = document.getElementById('emailSubject');
    const senderNameEl = document.getElementById('senderName');
    const senderEmailEl = document.getElementById('senderEmail');
    const emailDateEl = document.getElementById('emailDate');
    const senderAvatarEl = document.getElementById('senderAvatar');
    const emailBodyEl = document.getElementById('emailBody');
    const emailMetaEl = document.getElementById('emailMeta');
    const emailActionsEl = document.getElementById('emailActions');
    
    if (subjectEl) subjectEl.textContent = email.subject;
    if (senderNameEl) senderNameEl.textContent = email.from;
    if (senderEmailEl) senderEmailEl.textContent = email.to;
    if (emailDateEl) emailDateEl.textContent = email.time;
    if (senderAvatarEl) senderAvatarEl.textContent = email.from.charAt(0).toUpperCase();
    
    if (emailBodyEl) {
        emailBodyEl.innerHTML = `
            <div style="padding: 20px; line-height: 1.6;">
                ${email.preview}
                <br><br>
                [Full email content would appear here]
            </div>
        `;
    }
    
    // Show meta and actions
    if (emailMetaEl) emailMetaEl.style.display = 'flex';
    if (emailActionsEl) emailActionsEl.style.display = 'flex';
    
    console.log('[Mail List] Email content displayed');
}

/**
 * Mark emails as read
 */
function markAsRead() {
    const selectedEmails = document.querySelectorAll('.mail-item.selected');
    selectedEmails.forEach(email => {
        email.classList.add('read');
    });
    console.log('[Mail List] Marked as read - To be fully implemented');
}

/**
 * Mark emails as unread
 */
function markAsUnread() {
    const selectedEmails = document.querySelectorAll('.mail-item.selected');
    selectedEmails.forEach(email => {
        email.classList.remove('read');
    });
    console.log('[Mail List] Marked as unread - To be fully implemented');
}

console.log('[Mail List] Module loaded');