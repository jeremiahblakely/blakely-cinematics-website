/**
 * Admin Mail JavaScript Functions
 * Created: September 10, 2025 12:25 PM
 * Purpose: Handle email interface interactions and text formatting
 */

// ============================================
// TEXT FORMATTING FUNCTIONS
// ============================================

/**
 * Format selected text in the reply textarea
 * @param {string} command - The formatting command (bold, italic, underline, strikethrough)
 */
function formatText(command) {
    const textarea = document.getElementById('replyText');
    if (!textarea) return;
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.substring(start, end);
    
    // If no text is selected, return
    if (start === end) {
        // Insert placeholder text with formatting
        let placeholder = '';
        let cursorOffset = 0;
        
        switch(command) {
            case 'bold':
                placeholder = '**bold text**';
                cursorOffset = 2;
                break;
            case 'italic':
                placeholder = '*italic text*';
                cursorOffset = 1;
                break;
            case 'underline':
                placeholder = '__underlined text__';
                cursorOffset = 2;
                break;
            case 'strikethrough':
            case 'strike':
                placeholder = '~~strikethrough text~~';
                cursorOffset = 2;
                break;
            default:
                return;
        }
        
        const before = textarea.value.substring(0, start);
        const after = textarea.value.substring(end);
        
        textarea.value = before + placeholder + after;
        
        // Position cursor inside the formatting marks
        textarea.selectionStart = start + cursorOffset;
        textarea.selectionEnd = start + placeholder.length - cursorOffset;
        textarea.focus();
        return;
    }
    
    // Format selected text
    let formattedText = '';
    
    switch(command) {
        case 'bold':
            formattedText = `**\${selectedText}**`;
            break;
        case 'italic':
            formattedText = `*\${selectedText}*`;
            break;
        case 'underline':
            formattedText = `__\${selectedText}__`;
            break;
        case 'strikethrough':
        case 'strike':
            formattedText = `~~\${selectedText}~~`;
            break;
        case 'quote':
            // Add quote formatting (line by line)
            formattedText = selectedText.split('\n').map(line => `> \${line}`).join('\n');
            break;
        default:
            formattedText = selectedText;
    }
    
    // Replace the selected text with formatted text
    const before = textarea.value.substring(0, start);
    const after = textarea.value.substring(end);
    
    textarea.value = before + formattedText + after;
    
    // Reselect the formatted text
    textarea.selectionStart = start;
    textarea.selectionEnd = start + formattedText.length;
    textarea.focus();
    
    // Update word count
    updateWordCount();
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Update the word count display
 */
function updateWordCount() {
    const textarea = document.getElementById('replyText');
    const wordCountEl = document.getElementById('wordCount');
    
    if (!textarea || !wordCountEl) return;
    
    const text = textarea.value.trim();
    const wordCount = text === '' ? 0 : text.split(/\s+/).length;
    
    wordCountEl.textContent = wordCount + ' word' + (wordCount !== 1 ? 's' : '');
}

// ============================================
// EXISTING FUNCTIONS (PLACEHOLDERS)
// ============================================

/**
 * Show reply box
 */
function showReply() {
    const replyBox = document.getElementById('replyBox');
    if (replyBox) {
        replyBox.style.display = 'block';
        
        // Initialize the rich text editor
        initReplyEditor();
        
        // Focus the contenteditable editor
        const editor = document.getElementById('replyEditor');
        if (editor) {
            editor.focus();
        }
        
        // Fallback to old textarea if editor not found
        const textarea = document.getElementById('replyText');
        if (!editor && textarea) {
            textarea.focus();
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
        // Clear the textarea
        const textarea = document.getElementById('replyText');
        if (textarea) {
            textarea.value = '';
            updateWordCount();
        }
    }
}

// ============================================
// EVENT LISTENERS
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    // Add event listener for word count updates
    const textarea = document.getElementById('replyText');
    if (textarea) {
        textarea.addEventListener('input', updateWordCount);
        textarea.addEventListener('keyup', updateWordCount);
        
        // Initialize word count
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

// ============================================
// PLACEHOLDER FUNCTIONS (TO BE IMPLEMENTED)
// ============================================

// These functions are called by buttons but will be implemented in next steps
function toggleCCBCC() {
    const ccBccFields = document.getElementById('ccBccFields');
    const toggleBtn = event && event.target ? event.target.closest('.cc-bcc-toggle-btn') : null;
    if (!ccBccFields) return;
    const isHidden = ccBccFields.style.display === 'none' || ccBccFields.style.display === '';
    if (isHidden) {
        ccBccFields.style.display = 'block';
        if (toggleBtn) {
            toggleBtn.classList.add('active');
            const t = toggleBtn.querySelector('.toggle-text');
            if (t) t.textContent = 'CC/BCC';
        }
        document.getElementById('ccInput')?.focus();
    } else {
        ccBccFields.style.display = 'none';
        if (toggleBtn) {
            toggleBtn.classList.remove('active');
            const t = toggleBtn.querySelector('.toggle-text');
            if (t) t.textContent = 'CC/BCC';
        }
    }
}

// Backwards compatibility shims
function toggleCC() { toggleCCBCC(); }
function toggleBCC() { toggleCCBCC(); }
function alignText(alignment) {
    const textarea = document.getElementById('replyText');
    if (!textarea) return;
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    
    let lineStart = start;
    while (lineStart > 0 && text[lineStart - 1] !== '\n') {
        lineStart--;
    }
    
    let lineEnd = end;
    while (lineEnd < text.length && text[lineEnd] !== '\n') {
        lineEnd++;
    }
    
    const selectedLines = text.substring(lineStart, lineEnd);
    let alignedText = '';
    
    switch(alignment) {
        case 'left':
            alignedText = selectedLines;
            break;
        case 'center':
            alignedText = selectedLines.split('\n').map(line => '    ' + line.trim() + '    ').join('\n');
            break;
        case 'right':
            alignedText = selectedLines.split('\n').map(line => '        ' + line.trim()).join('\n');
            break;
        default:
            alignedText = selectedLines;
    }
    
    textarea.value = text.substring(0, lineStart) + alignedText + text.substring(lineEnd);
    textarea.selectionStart = lineStart;
    textarea.selectionEnd = lineStart + alignedText.length;
    textarea.focus();
    updateWordCount();
}

function insertList(type) {
    const textarea = document.getElementById('replyText');
    if (!textarea) return;
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    
    let lineStart = start;
    while (lineStart > 0 && text[lineStart - 1] !== '\n') {
        lineStart--;
    }
    
    let lineEnd = end;
    while (lineEnd < text.length && text[lineEnd] !== '\n') {
        lineEnd++;
    }
    
    const selectedLines = text.substring(lineStart, lineEnd);
    const lines = selectedLines.split('\n');
    let listText = '';
    
    if (type === 'bullet') {
        listText = lines.map(line => {
            if (line.trim().startsWith('• ') || line.trim().startsWith('- ')) {
                return line.replace(/^(\s*)[•\-]\s*/, '$1');
            }
            if (line.trim().match(/^\d+\.\s/)) {
                return line.replace(/^(\s*)\d+\.\s*/, '$1• ');
            }
            return line.trim() ? '• ' + line.trim() : line;
        }).join('\n');
    } else if (type === 'number') {
        let number = 1;
        listText = lines.map(line => {
            if (line.trim().match(/^\d+\.\s/)) {
                return line.replace(/^(\s*)\d+\.\s*/, '$1');
            }
            if (line.trim().startsWith('• ') || line.trim().startsWith('- ')) {
                return line.replace(/^(\s*)[•\-]\s*/, '$1' + (number++) + '. ');
            }
            return line.trim() ? (number++) + '. ' + line.trim() : line;
        }).join('\n');
    }
    
    textarea.value = text.substring(0, lineStart) + listText + text.substring(lineEnd);
    textarea.selectionStart = lineStart;
    textarea.selectionEnd = lineStart + listText.length;
    textarea.focus();
    updateWordCount();
}

function toggleCC() {
    const ccInput = document.getElementById('ccInput');
    const ccBccFields = document.getElementById('ccBccFields');
    const ccButton = event.target.closest('.cc-bcc-btn');
    
    if (ccInput) {
        if (ccInput.style.display === 'none' || ccInput.style.display === '') {
            // Show CC field
            ccInput.style.display = 'block';
            ccBccFields.style.display = 'block';
            if (ccButton) ccButton.classList.add('active');
            ccInput.focus();
        } else {
            // Hide CC field
            ccInput.style.display = 'none';
            // Hide container if BCC is also hidden
            const bccInput = document.getElementById('bccInput');
            if (bccInput && (bccInput.style.display === 'none' || bccInput.style.display === '')) {
                ccBccFields.style.display = 'none';
            }
            if (ccButton) ccButton.classList.remove('active');
        }
    }
}

function toggleBCC() {
    const bccInput = document.getElementById('bccInput');
    const ccBccFields = document.getElementById('ccBccFields');
    const bccButton = event.target.closest('.cc-bcc-btn');
    
    if (bccInput) {
        if (bccInput.style.display === 'none' || bccInput.style.display === '') {
            // Show BCC field
            bccInput.style.display = 'block';
            ccBccFields.style.display = 'block';
            if (bccButton) bccButton.classList.add('active');
            bccInput.focus();
        } else {
            // Hide BCC field
            bccInput.style.display = 'none';
            // Hide container if CC is also hidden
            const ccInput = document.getElementById('ccInput');
            if (ccInput && (ccInput.style.display === 'none' || ccInput.style.display === '')) {
                ccBccFields.style.display = 'none';
            }
            if (bccButton) bccButton.classList.remove('active');
        }
    }
}

function toggleAI() {
    console.log('Toggle AI panel - To be implemented');
}

function toggleFullscreen() {
    console.log('Toggle fullscreen - To be implemented');
}

function attachFile() {
    console.log('Attach file - To be implemented');
}

function saveDraft() {
    console.log('Save draft - To be implemented');
}

function sendReply() {
    console.log('Send reply - To be implemented');
}

function showReplyAll() {
    console.log('Show reply all - To be implemented');
}

function showForward() {
    console.log('Show forward - To be implemented');
}

function toggleStar() {
    console.log('Toggle star - To be implemented');
}

function archiveEmail() {
    console.log('Archive email - To be implemented');
}

function moveToFolder() {
    console.log('Move to folder - To be implemented');
}

function snoozeEmail() {
    console.log('Snooze email - To be implemented');
}

function deleteEmail() {
    console.log('Delete email - To be implemented');
}

function openCompose() {
    console.log('Open compose - To be implemented');
}

function openSettings() {
    console.log('Open settings - To be implemented');
}

// AI Functions placeholders
function aiRewrite() {
    console.log('AI Rewrite - To be implemented');
}

function aiExpand() {
    console.log('AI Expand - To be implemented');
}

function aiSummarize() {
    console.log('AI Summarize - To be implemented');
}

function aiTone(tone) {
    console.log('AI Tone:', tone, '- To be implemented');
}

// ============================================
// CONTENTEDITABLE REPLY EDITOR
// Added: September 13, 2025
// ============================================

/**
 * Initialize the rich text reply editor
 */
function initReplyEditor() {
    const ed = document.getElementById('replyEditor');
    if (!ed || ed.dataset._init) return;
    ed.dataset._init = '1';

    // placeholder behavior
    const setPlaceholder = () => {
        if (ed.textContent.trim() === '') ed.classList.add('is-empty');
        else ed.classList.remove('is-empty');
    };
    setPlaceholder();
    
    ed.addEventListener('input', () => {
        setPlaceholder();
        updateWordCount(ed);
    });

    // paste: basic safe paste (plain text). Can upgrade to sanitizer later.
    ed.addEventListener('paste', (e) => {
        e.preventDefault();
        const text = (e.clipboardData || window.clipboardData).getData('text');
        document.execCommand('insertText', false, text);
    });

    // keyboard shortcuts
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
                        // add rel/target safely (post-fix)
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

    // toolbar clicks
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
                // add rel/target safely (post-fix)
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
    
    console.log('[Admin Mail] Reply editor initialized');
}

/**
 * Update word count for contenteditable editor
 */
function updateWordCount(ed) {
    const text = ed.innerText.trim();
    const words = text ? text.split(/\s+/).length : 0;
    const wc = document.getElementById('wordCount');
    if (wc) wc.textContent = `${words} ${words === 1 ? 'word' : 'words'}`;
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
 */
function getReplyContent() {
    const ed = document.getElementById('replyEditor');
    if (!ed) return '';
    return ed.innerHTML;
}

/**
 * Set content in reply editor
 */
function setReplyContent(htmlContent) {
    const ed = document.getElementById('replyEditor');
    if (!ed) return;
    ed.innerHTML = htmlContent;
    updateWordCount(ed);
}

// ============================================
// FOLDER COUNT STYLING
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

// Run on page load
document.addEventListener('DOMContentLoaded', updateFolderCountStyling);

// Run whenever folder counts might change (call this function when updating counts via AJAX)
// updateFolderCountStyling();
