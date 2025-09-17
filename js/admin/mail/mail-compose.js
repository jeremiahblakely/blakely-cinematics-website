/**
 * Mail Compose Module
 * Created: December 17, 2024 1:00 PM
 * Purpose: Handle compose modal and email sending
 */

// ============================================
// COMPOSE FUNCTIONS
// ============================================

/**
 * Open compose modal
 */
function openCompose() {
    // Show compose modal
    const composeModal = document.querySelector('#composeModal');
    if (composeModal) {
        composeModal.style.display = 'flex';
        // Initialize pills after compose opens
        setTimeout(initEmailPills, 100);
        // Focus on the To field
        setTimeout(() => {
            const toField = document.querySelector('#composeTo');
            if (toField) toField.focus();
        }, 150);
    }
}

/**
 * Close compose modal
 */
function closeCompose() {
    const composeModal = document.querySelector('#composeModal');
    if (composeModal) {
        composeModal.style.display = 'none';
        // Clear form
        const toContainer = document.querySelector('#composeTo')?.closest('.chip-input-container');
        if (toContainer) {
            toContainer.querySelectorAll('.email-chip').forEach(chip => chip.remove());
        }
        const toField = document.querySelector('#composeTo');
        const subjectField = document.querySelector('#composeSubject');
        const bodyField = document.querySelector('#composeBody');
        
        if (toField) toField.value = '';
        if (subjectField) subjectField.value = '';
        if (bodyField) bodyField.innerHTML = '';
    }
}

/**
 * Send email (from compose or reply)
 */
async function sendEmail() {
    try {
        // Collect emails from pill fields
        const toContainer = document.querySelector('#composeTo')?.closest('.chip-input-container');
        const toEmails = toContainer ? window.emailPills.getEmails(toContainer) : [];
        
        // Get other fields
        const fromSelect = document.querySelector('.compose-from-select');
        const subject = document.querySelector('#composeSubject, input[placeholder*="Subject"]');
        const body = document.querySelector('#composeBody, #emailEditor, .compose-editor');
        
        if (!toEmails.length) {
            alert('Please add at least one recipient');
            return;
        }
        
        const emailData = {
            to: toEmails,
            from: fromSelect?.value || 'jd@jeremiahblakely.com',
            subject: subject?.value || subject?.textContent || '',
            body: body?.innerHTML || body?.textContent || '',
            cc: [],
            bcc: []
        };
        
        console.log('Sending email:', emailData);
        
        // Use API config for endpoint
        const response = await fetch(window.API_CONFIG.MAIL.SEND, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(emailData)
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('Email sent successfully:', result);
        alert('Email sent successfully!');
        
        // Add email to the list and update UI
        addEmailToList(emailData);
        sortEmailsByDate();
        
        // Clear compose form
        if (toContainer) {
            toContainer.querySelectorAll('.email-chip').forEach(chip => chip.remove());
        }
        if (subject) subject.value = '';
        if (body) body.innerHTML = '';
        
        // Close compose modal
        closeCompose();
        
    } catch (error) {
        console.error('Failed to send email:', error);
        alert('Failed to send email. Check console for details.');
    }
}

/**
 * Send reply
 */
function sendReply() {
    sendEmail();
}

/**
 * Save draft
 */
function saveDraft() {
    console.log('Save draft - To be implemented');
    // TODO: Implement draft saving
}

/**
 * Attach file
 */
function attachFile() {
    console.log('Attach file - To be implemented');
    // TODO: Implement file attachment
}

console.log('[Mail Compose] Module loaded');