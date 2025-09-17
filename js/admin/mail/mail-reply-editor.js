/**
 * Mail Reply Editor Module
 * Created: December 17, 2024 1:20 PM
 * Purpose: Rich text editor functionality for replies
 */

// ============================================
// REPLY BOX FUNCTIONS
// ============================================

/**
 * Show reply box
 */
function showReply() {
    const replyBox = document.getElementById('replyBox');
    if (replyBox) {
        replyBox.style.display = 'block';
        replyBox.classList.add('expanded');
        
        // Initialize the rich text editor
        initReplyEditor();
        
        // Focus the contenteditable editor
        const editor = document.getElementById('replyEditor');
        if (editor) {
            editor.focus();
        } else {
            // Fallback to textarea
            const textarea = document.getElementById('replyText');
            if (textarea) {
                textarea.focus();
            }
        }
    }
}

/**
 * Close reply box
 */
function closeReply() {
    const replyBox = document.getElementById('replyBox');
    if (replyBox) {
        replyBox.style.display = 'none';
        replyBox.classList.remove('expanded');
        
        // Clear the textarea
        const textarea = document.getElementById('replyText');
        if (textarea) {
            textarea.value = '';
            updateWordCount();
        }
        
        // Clear contenteditable if exists
        const editor = document.getElementById('replyEditor');
        if (editor) {
            editor.innerHTML = '';
        }
    }
}

/**
 * Toggle CC/BCC fields visibility
 */
function toggleCCBCC() {
    const ccBccFields = document.getElementById('ccBccFields');
    if (!ccBccFields) return;
    
    const isHidden = ccBccFields.style.display === 'none' || ccBccFields.style.display === '';
    ccBccFields.style.display = isHidden ? 'block' : 'none';
    
    if (isHidden) {
        const ccInput = ccBccFields.querySelector('.cc-input');
        if (ccInput) ccInput.focus();
    }
}

// Alias functions for compatibility
function toggleCC() { 
    toggleCCBCC(); 
}

function toggleBCC() { 
    toggleCCBCC(); 
}

/**
 * Initialize the rich text reply editor
 */
function initReplyEditor() {
    const ed = document.getElementById('replyEditor');
    if (!ed || ed.dataset._init) return;
    ed.dataset._init = '1';

    // Placeholder behavior
    const setPlaceholder = () => {
        if (ed.textContent.trim() === '') {
            ed.classList.add('is-empty');
        } else {
            ed.classList.remove('is-empty');
        }
    };
    setPlaceholder();
    
    ed.addEventListener('input', () => {
        setPlaceholder();
        updateEditorWordCount(ed);
    });

    // Paste: basic safe paste (plain text)
    ed.addEventListener('paste', (e) => {
        e.preventDefault();
        const text = (e.clipboardData || window.clipboardData).getData('text');
        document.execCommand('insertText', false, text);
    });

    // Keyboard shortcuts
    ed.addEventListener('keydown', (e) => {
        if (e.metaKey || e.ctrlKey) {
            switch (e.key.toLowerCase()) {
                case 'b':
                    e.preventDefault();
                    document.execCommand('bold', false, null);
                    break;
                case 'i':
                    e.preventDefault();
                    document.execCommand('italic', false, null);
                    break;
                case 'u':
                    e.preventDefault();
                    document.execCommand('underline', false, null);
                    break;
                case 'k':
                    e.preventDefault();
                    const href = prompt('Enter URL (https://…):');
                    if (href && /^https?:|^mailto:/i.test(href)) {
                        document.execCommand('createLink', false, href);
                        // Add rel/target safely
                        const sel = window.getSelection();
                        if (sel && sel.anchorNode) {
                            const a = sel.anchorNode.parentElement?.closest('a');
                            if (a) { 
                                a.target = '_blank'; 
                                a.rel = 'noopener noreferrer nofollow'; 
                            }
                        }
                    }
                    break;
            }
        }
    });

    // Toolbar clicks
    const toolbar = document.getElementById('replyToolbar');
    if (toolbar) {
        toolbar.addEventListener('click', (e) => {
            const btn = e.target.closest('[data-command]');
            if (!btn) return;
            
            const cmd = btn.getAttribute('data-command');
            
            if (cmd === 'createLink') {
                const href = prompt('Enter URL (https://…):');
                if (!href || !/^https?:|^mailto:/i.test(href)) return;
                document.execCommand('createLink', false, href);
                // Add rel/target safely
                const sel = window.getSelection();
                if (sel && sel.anchorNode) {
                    const a = sel.anchorNode.parentElement?.closest('a');
                    if (a) { 
                        a.target = '_blank'; 
                        a.rel = 'noopener noreferrer nofollow'; 
                    }
                }
                return;
            }
            
            document.execCommand(cmd, false, null);
            ed.focus();
            
            // Update button states
            updateToolbarStates();
        });
    }
    
    // Update toolbar button states on selection change
    ed.addEventListener('keyup', updateToolbarStates);
    ed.addEventListener('mouseup', updateToolbarStates);
    
    console.log('[Mail Reply Editor] Editor initialized');
}

/**
 * Update word count for contenteditable editor
 * @param {HTMLElement} ed - The contenteditable element
 */
function updateEditorWordCount(ed) {
    const text = ed.innerText.trim();
    const words = text ? text.split(/\s+/).length : 0;
    const wc = document.getElementById('wordCount');
    if (wc) {
        wc.textContent = `${words} ${words === 1 ? 'word' : 'words'}`;
    }
}

/**
 * Update toolbar button states based on current selection
 */
function updateToolbarStates() {
    const toolbar = document.getElementById('replyToolbar');
    if (!toolbar) return;
    
    const commands = ['bold', 'italic', 'underline', 'insertUnorderedList', 'insertOrderedList'];
    
    commands.forEach(cmd => {
        const btn = toolbar.querySelector(`[data-command="${cmd}"]`);
        if (btn) {
            try {
                const isActive = document.queryCommandState(cmd);
                btn.classList.toggle('active', isActive);
            } catch (e) {
                // Some commands don't support queryCommandState
            }
        }
    });
}

/**
 * Get HTML content from reply editor
 * @returns {string} HTML content
 */
function getReplyContent() {
    const ed = document.getElementById('replyEditor');
    if (!ed) return '';
    return ed.innerHTML;
}

/**
 * Set content in reply editor
 * @param {string} htmlContent - HTML content to set
 */
function setReplyContent(htmlContent) {
    const ed = document.getElementById('replyEditor');
    if (!ed) return;
    ed.innerHTML = htmlContent;
    updateEditorWordCount(ed);
}

console.log('[Mail Reply Editor] Module loaded');