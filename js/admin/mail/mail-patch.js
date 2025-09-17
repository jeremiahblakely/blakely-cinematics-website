/**
 * Mail API Integration Patch Module
 * Created: December 17, 2024 1:25 PM
 * Purpose: Add folder attributes to API-loaded emails
 */

// ============================================
// EMAIL FOLDER PATCH FOR API INTEGRATION
// ============================================

/**
 * Patch email elements to have folder attributes
 */
function patchEmailFolders() {
    const emails = document.querySelectorAll('.mail-item');
    let patched = 0;
    
    emails.forEach((email) => {
        // Skip if already has folder
        if (email.dataset.folder) return;
        
        // Determine folder based on content
        const senderEl = email.querySelector('.mail-item-sender');
        const sender = senderEl?.textContent || '';
        
        // Assign folder
        if (sender === 'You' || sender.includes('@')) {
            email.dataset.folder = 'sent';
        } else {
            email.dataset.folder = 'inbox';
        }
        
        // Check for star
        const hasStarIcon = email.querySelector('[class*="star"], .starred');
        email.dataset.starred = hasStarIcon ? 'true' : 'false';
        
        patched++;
    });
    
    if (patched > 0) {
        console.log(`[Mail Patch] Patched ${patched} emails with folder attributes`);
        if (typeof updateFolderCounts === 'function') {
            updateFolderCounts(); // Update counts after patching
        }
    }
}

/**
 * Start observing for new emails that need patching
 */
function startEmailObserver() {
    const emailList = document.getElementById('emailList');
    if (!emailList) {
        console.warn('[Mail Patch] Email list not found, observer not started');
        return;
    }
    
    // Create observer for new emails
    const emailObserver = new MutationObserver(() => {
        const needsPatch = document.querySelector('.mail-item:not([data-folder])');
        if (needsPatch) {
            setTimeout(patchEmailFolders, 100);
        }
    });
    
    // Start observing
    emailObserver.observe(emailList, {
        childList: true,
        subtree: true
    });
    
    // Initial patch for existing emails
    patchEmailFolders();
    
    console.log('[Mail Patch] Email observer started');
}

/**
 * Enhanced patch for complex email structures
 * Can be called manually for debugging
 */
function patchEmailsAdvanced() {
    const emails = document.querySelectorAll('.mail-item');
    let patchedCount = 0;
    
    emails.forEach((email) => {
        // Skip if already has complete attributes
        if (email.dataset.folder && email.dataset.starred !== undefined) return;
        
        // Get email content
        const sender = email.querySelector('.mail-item-sender')?.textContent || '';
        const subject = email.querySelector('.mail-item-subject')?.textContent || '';
        const preview = email.querySelector('.mail-item-preview')?.textContent || '';
        
        // Determine folder
        if (!email.dataset.folder) {
            if (sender === 'You' || sender.toLowerCase().includes('sent')) {
                email.dataset.folder = 'sent';
            } else if (subject.toLowerCase().includes('draft') || preview.toLowerCase().includes('draft')) {
                email.dataset.folder = 'drafts';
            } else if (email.classList.contains('trash')) {
                email.dataset.folder = 'trash';
            } else {
                email.dataset.folder = 'inbox';
            }
        }
        
        // Determine starred status
        if (email.dataset.starred === undefined) {
            const hasStarIcon = email.querySelector('[class*="star"], .starred, .fa-star');
            const hasStarInSubject = subject.includes('⭐');
            email.dataset.starred = (hasStarIcon || hasStarInSubject) ? 'true' : 'false';
        }
        
        // Determine category based on content
        if (!email.dataset.category) {
            const content = (sender + subject + preview).toLowerCase();
            if (content.includes('booking') || content.includes('appointment')) {
                email.dataset.category = 'bookings';
            } else if (content.includes('client') || content.includes('customer')) {
                email.dataset.category = 'clients';
            } else if (content.includes('payment') || content.includes('invoice') || content.includes('$')) {
                email.dataset.category = 'finance';
            } else if (content.includes('gallery') || content.includes('photo')) {
                email.dataset.category = 'galleries';
            } else {
                email.dataset.category = 'general';
            }
        }
        
        patchedCount++;
    });
    
    if (patchedCount > 0) {
        console.log(`[Mail Patch] Advanced patch applied to ${patchedCount} emails`);
        if (typeof updateFolderCounts === 'function') {
            updateFolderCounts();
        }
    }
}

// Export for debugging
window.mailPatch = {
    patch: patchEmailFolders,
    patchAdvanced: patchEmailsAdvanced,
    startObserver: startEmailObserver
};

console.log('[Mail Patch] Module loaded');