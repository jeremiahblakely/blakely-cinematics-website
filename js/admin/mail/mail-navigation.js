/**
 * Mail Navigation Module
 * Created: December 17, 2024 1:15 PM
 * Purpose: Handle folder clicks and email filtering
 */

// ============================================
// MAIL FOLDER NAVIGATION
// ============================================

/**
 * Initialize mail folder navigation
 */
function initMailFolders() {
    const folders = document.querySelectorAll('.mail-folder-item');
    
    folders.forEach(folder => {
        folder.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Remove active class from all folders
            folders.forEach(f => f.classList.remove('active'));
            
            // Add active class to clicked folder
            this.classList.add('active');
            
            // Get folder type
            const folderType = this.dataset.folder;
            
            // Filter emails
            filterEmailsByFolder(folderType);
            
            // Update header if needed
            updateMailHeader(folderType);
        });
    });
    
    console.log('[Mail Navigation] Folder navigation initialized');
}

/**
 * Filter emails by folder type
 * @param {string} folderType - The folder to filter by
 */
function filterEmailsByFolder(folderType) {
    const emailList = document.getElementById('emailList');
    if (!emailList) return;
    
    // Show loading state
    emailList.style.opacity = '0.5';
    
    setTimeout(() => {
        const emails = emailList.querySelectorAll('.mail-item');
        let visibleCount = 0;
        
        emails.forEach(email => {
            const emailFolder = email.dataset.folder || 'inbox';
            const isStarred = email.dataset.starred === 'true';
            
            let shouldShow = false;
            
            switch(folderType) {
                case 'inbox':
                    shouldShow = emailFolder === 'inbox';
                    break;
                case 'sent':
                    shouldShow = emailFolder === 'sent';
                    break;
                case 'drafts':
                    shouldShow = emailFolder === 'drafts';
                    break;
                case 'starred':
                    shouldShow = isStarred;
                    break;
                case 'trash':
                    shouldShow = emailFolder === 'trash';
                    break;
                case 'bookings':
                    shouldShow = email.dataset.category === 'bookings' || 
                                email.textContent.toLowerCase().includes('booking');
                    break;
                case 'clients':
                    shouldShow = email.dataset.category === 'clients' || 
                                email.textContent.toLowerCase().includes('client');
                    break;
                case 'finance':
                    shouldShow = email.dataset.category === 'finance' || 
                                email.textContent.toLowerCase().includes('payment') ||
                                email.textContent.toLowerCase().includes('invoice');
                    break;
                case 'galleries':
                    shouldShow = email.dataset.category === 'galleries' || 
                                email.textContent.toLowerCase().includes('gallery') ||
                                email.textContent.toLowerCase().includes('photo');
                    break;
                default:
                    shouldShow = true; // Show all for unknown folders
            }
            
            if (shouldShow) {
                email.style.display = 'block';
                visibleCount++;
            } else {
                email.style.display = 'none';
            }
        });
        
        // Show empty state if no emails
        if (visibleCount === 0) {
            if (!document.getElementById('emptyState')) {
                const emptyState = document.createElement('div');
                emptyState.id = 'emptyState';
                emptyState.className = 'empty-state';
                emptyState.innerHTML = `
                    <div style="text-align: center; padding: 40px; color: var(--text-secondary);">
                        <div style="font-size: 48px; opacity: 0.3; margin-bottom: 16px;">📭</div>
                        <div>No emails in ${folderType}</div>
                    </div>
                `;
                emailList.appendChild(emptyState);
            }
        } else {
            // Remove empty state if it exists
            const emptyState = document.getElementById('emptyState');
            if (emptyState) emptyState.remove();
        }
        
        // Restore opacity
        emailList.style.opacity = '1';
        
        console.log(`[Mail Navigation] Showing ${visibleCount} emails in ${folderType}`);
        
    }, 100);
}

/**
 * Update mail header based on selected folder
 * @param {string} folderType - The selected folder
 */
function updateMailHeader(folderType) {
    // Optional: Update search placeholder
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.placeholder = `Search in ${folderType}...`;
    }
}

/**
 * Load sample emails for testing
 */
function loadSampleEmails() {
    const emailList = document.getElementById('emailList');
    if (!emailList) return;
    
    // Sample email data
    const sampleEmails = [
        {
            folder: 'inbox',
            from: 'Sarah Johnson',
            to: 'jd@blakelycinematics.com',
            subject: 'Wedding Photography Inquiry',
            preview: 'Hi, I am interested in your wedding photography services for June 2025...',
            time: '10:30 AM',
            starred: false,
            category: 'bookings'
        },
        {
            folder: 'inbox',
            from: 'Mike Chen',
            to: 'jd@blakelycinematics.com',
            subject: 'Gallery Access Request',
            preview: 'Could you please provide access to our event gallery from last weekend?',
            time: '9:15 AM',
            starred: true,
            category: 'galleries'
        },
        {
            folder: 'sent',
            from: 'You',
            to: 'client@example.com',
            subject: 'Invoice #2024-001',
            preview: 'Please find attached the invoice for the recent photoshoot...',
            time: 'Yesterday',
            starred: false,
            category: 'finance'
        },
        {
            folder: 'inbox',
            from: 'Payment System',
            to: 'jd@blakelycinematics.com',
            subject: 'Payment Received - $2,500',
            preview: 'Payment has been successfully processed for Invoice #2024-001',
            time: 'Yesterday',
            starred: true,
            category: 'finance'
        },
        {
            folder: 'drafts',
            from: 'You',
            to: 'team@blakelycinematics.com',
            subject: 'Team Meeting Notes',
            preview: 'Draft: Discussion points for upcoming team meeting...',
            time: '2 days ago',
            starred: false,
            category: 'general'
        }
    ];
    
    // Clear existing emails
    emailList.innerHTML = '';
    
    // Add sample emails
    sampleEmails.forEach((email, index) => {
        const emailItem = document.createElement('div');
        emailItem.className = 'mail-item mail-card';
        emailItem.dataset.folder = email.folder;
        emailItem.dataset.starred = email.starred;
        emailItem.dataset.category = email.category;
        emailItem.dataset.id = `email-${index}`;
        
        emailItem.innerHTML = `
            <div class="mail-item-header">
                <div>
                    <div class="mail-item-sender">${email.from}</div>
                    <div class="mail-item-to" style="font-size: 0.85rem; opacity: 0.7;">To: ${email.to}</div>
                </div>
                <span class="mail-item-time">${email.time}</span>
            </div>
            <div class="mail-item-subject">
                ${email.starred ? '<span style="color: gold;">⭐</span> ' : ''}
                ${email.subject}
            </div>
            <div class="mail-item-preview">${email.preview}</div>
        `;
        
        // Add click handler to show email
        emailItem.addEventListener('click', function() {
            showEmailContent(email);
            // Mark as selected
            document.querySelectorAll('.mail-item').forEach(item => {
                item.classList.remove('selected');
            });
            this.classList.add('selected');
        });
        
        emailList.appendChild(emailItem);
    });
    
    // Update folder counts
    updateFolderCounts();
    
    console.log('[Mail Navigation] Sample emails loaded');
}

console.log('[Mail Navigation] Module loaded');