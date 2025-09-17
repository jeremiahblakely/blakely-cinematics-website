/**
 * Mail Bootstrap Module
 * Created: December 17, 2024 1:10 PM
 * Purpose: Register modules and handle initialization
 */

// ============================================
// MODULE REGISTRATION
// ============================================

// Register modules with BlakelyApp if available
if (window.BlakelyApp) {
    // Email Pills Module
    BlakelyApp.register('emailPills', function() {
        // Only init if compose elements exist
        if (!document.querySelector('.compose-container, input[placeholder*="recipient@example.com"]')) {
            throw new Error('Compose elements not found');
        }
        initEmailPills();
        
        // Reinitialize pills when compose button is clicked
        document.addEventListener('click', function(e) {
            if (e.target.closest('.compose-btn, [onclick*="openCompose"]')) {
                setTimeout(initEmailPills, 200);
            }
        });
    });
    
    // Folder Counts Module
    BlakelyApp.register('folderCounts', function() {
        updateFolderCountStyling();
    });
    
    // Text Formatting Module
    BlakelyApp.register('textFormatting', function() {
        // Initialize word count for textarea
        const textarea = document.getElementById('replyText');
        if (textarea) {
            textarea.addEventListener('input', updateWordCount);
            textarea.addEventListener('keyup', updateWordCount);
            updateWordCount();
        }
        
        // Add keyboard shortcuts for formatting
        document.addEventListener('keydown', function(e) {
            // Check if we're in the reply textarea
            if (document.activeElement?.id !== 'replyText') return;
            
            // Check for Cmd/Ctrl key combinations
            if (e.metaKey || e.ctrlKey) {
                switch(e.key.toLowerCase()) {
                    case 'b':
                        e.preventDefault();
                        formatText('bold');
                        break;
                    case 'i':
                        e.preventDefault();
                        formatText('italic');
                        break;
                    case 'u':
                        e.preventDefault();
                        formatText('underline');
                        break;
                }
            }
        });
    });
} else {
    // Fallback if app-init.js didn't load
    console.warn('[Mail Bootstrap] App init not found, using fallback');
    document.addEventListener('DOMContentLoaded', function() {
        setTimeout(() => {
            try { initEmailPills(); } catch(e) { console.error(e); }
            try { updateFolderCountStyling(); } catch(e) { console.error(e); }
        }, 500);
    });
}

// ============================================
// INITIALIZATION
// ============================================

// Initialize mail system when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeMailSystem);
} else {
    initializeMailSystem();
}

/**
 * Initialize the complete mail system
 */
function initializeMailSystem() {
    setTimeout(() => {
        try {
            // Initialize folder navigation
            if (typeof initMailFolders === 'function') {
                initMailFolders();
            }
            
            // Load sample emails only in development
            if (window.location.hostname === 'localhost' || window.DEBUG_MODE) {
                if (typeof loadSampleEmails === 'function') {
                    loadSampleEmails();
                }
            }
            
            // Initialize email folder patch
            if (typeof patchEmailFolders === 'function') {
                patchEmailFolders();
            }
            
            // Start email observer
            if (typeof startEmailObserver === 'function') {
                startEmailObserver();
            }
            
            console.log('[Mail Bootstrap] Mail system initialized successfully');
        } catch (e) {
            console.error('[Mail Bootstrap] Initialization error:', e);
        }
    }, 100);
}

// ============================================
// GLOBAL EXPORTS
// ============================================

// Export debugging utilities
window.adminMail = {
    // From folders module
    updateFolderCounts: typeof updateFolderCountStyling !== 'undefined' ? updateFolderCountStyling : null,
    
    // From reply editor module
    getReplyContent: typeof getReplyContent !== 'undefined' ? getReplyContent : null,
    setReplyContent: typeof setReplyContent !== 'undefined' ? setReplyContent : null,
    
    // From list module
    addEmailToList: typeof addEmailToList !== 'undefined' ? addEmailToList : null,
    sortEmailsByDate: typeof sortEmailsByDate !== 'undefined' ? sortEmailsByDate : null,
    updateFolderCounts: typeof updateFolderCounts !== 'undefined' ? updateFolderCounts : null,
    
    // Module status
    modules: {
        formatting: typeof formatText !== 'undefined',
        pills: typeof initEmailPills !== 'undefined',
        compose: typeof openCompose !== 'undefined',
        folders: typeof updateFolderCountStyling !== 'undefined',
        navigation: typeof initMailFolders !== 'undefined',
        list: typeof addEmailToList !== 'undefined',
        patch: typeof patchEmailFolders !== 'undefined'
    }
};

console.log('[Mail Bootstrap] Module loaded and initialized');
console.log('[Mail Bootstrap] Module status:', window.adminMail.modules);