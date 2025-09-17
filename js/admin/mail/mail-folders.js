/**
 * Mail Folders Module
 * Created: December 17, 2024 1:15 PM
 * Purpose: Handle folder count styling and updates
 */

// ============================================
// FOLDER COUNT MANAGEMENT
// ============================================

/**
 * Apply conditional styling to folder counts based on their values
 * Adds 'has-unread' class to parent folder items when count > 0
 */
function updateFolderCountStyling() {
    document.querySelectorAll('.mail-folder-count').forEach(count => {
        const value = parseInt(count.textContent) || 0;
        const parentFolder = count.closest('.mail-folder-item');
        
        if (value > 0) {
            // Add class to the parent folder item
            if (parentFolder) {
                parentFolder.classList.add('has-unread');
            }
            // Also add class directly to the count
            count.classList.add('unread');
        } else {
            // Remove classes when count is 0
            if (parentFolder) {
                parentFolder.classList.remove('has-unread');
            }
            count.classList.remove('unread');
        }
    });
}

/**
 * Update folder counts in the sidebar
 */
function updateFolderCounts() {
    // Count emails by folder
    const emailList = document.getElementById('emailList');
    if (!emailList) return;
    
    const emails = emailList.querySelectorAll('.mail-item');
    const counts = {
        inbox: 0,
        sent: 0,
        drafts: 0,
        starred: 0
    };
    
    emails.forEach(email => {
        const folder = email.dataset.folder || 'inbox';
        if (counts[folder] !== undefined) {
            counts[folder]++;
        }
    });
    
    // Update folder count displays
    Object.keys(counts).forEach(folder => {
        const folderItem = document.querySelector(`.mail-folder-item[data-folder="${folder}"] .mail-folder-count`);
        if (folderItem) {
            folderItem.textContent = counts[folder] || '';
            // Update styling
            const parentFolder = folderItem.closest('.mail-folder-item');
            if (counts[folder] > 0) {
                parentFolder?.classList.add('has-unread');
                folderItem.classList.add('unread');
            } else {
                parentFolder?.classList.remove('has-unread');
                folderItem.classList.remove('unread');
            }
        }
    });
    
    console.log('[Mail Folders] Counts updated:', counts);
}

console.log('[Mail Folders] Module loaded');