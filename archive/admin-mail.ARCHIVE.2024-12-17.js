/**
 * Admin Mail JavaScript Functions
 * Created: September 10, 2025 12:25 PM
 * Updated: December 17, 2024 9:15 PM
 * Purpose: Handle email interface interactions, text formatting, and email pills
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
            formattedText = `**${selectedText}**`;
            break;
        case 'italic':
            formattedText = `*${selectedText}*`;
            break;
        case 'underline':
            formattedText = `__${selectedText}__`;
            break;
        case 'strikethrough':
        case 'strike':
            formattedText = `~~${selectedText}~~`;
            break;
        case 'quote':
            // Add quote formatting (line by line)
            formattedText = selectedText.split('\n').map(line => `> ${line}`).join('\n');
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
// EMAIL PILL FUNCTIONALITY
// Created: December 17, 2024
// Purpose: Gmail-style email pills with lowercase enforcement
// ============================================

/**
 * Initialize email pill functionality for compose fields
 */
function initEmailPills() {
    // Prevent running in iframes or sandboxed contexts
    if (window.location.href.includes('about:') || window !== window.parent) {
        console.log('[Pills] Skipping init in iframe/sandbox');
        return;
    }
    
    // Use more specific selectors and check existence
    const selectors = [
        '#composeTo',
        '#composeCc', 
        '#composeBcc',
        'input[type="email"][placeholder*="recipient"]',
        '.cc-input',
        '.bcc-input'
    ];
    
    selectors.forEach(selector => {
        try {
            const field = document.querySelector(selector);
            if (field && field.dataset.pillsInitialized !== 'true') {
                setupPillField(field);
            }
        } catch (error) {
            // Silently skip if selector fails
        }
    });
}

/**
 * Setup pill functionality for an email input field
 * @param {HTMLInputElement} input - The input field to enhance
 */
function setupPillField(input) {
    // Prevent duplicate initialization
    if (!input || input.dataset.pillsInitialized === 'true') {
        return;
    }
    
    // Check if already wrapped in chip container
    let container = input.closest('.chip-input-container');
    if (container && container.querySelector('.email-chips')) {
        // Already set up, just mark as initialized
        input.dataset.pillsInitialized = 'true';
        return;
    }
    
    // Mark as initialized BEFORE setting up to prevent race conditions
    input.dataset.pillsInitialized = 'true';
    
    // Create chip container structure if needed
    if (!container) {
        try {
            container = document.createElement('div');
            container.className = 'chip-input-container';
            
            const chipsDiv = document.createElement('div');
            chipsDiv.className = 'email-chips';
            
            // Replace input with container structure
            if (input.parentNode) {
                input.parentNode.replaceChild(container, input);
                container.appendChild(chipsDiv);
                container.appendChild(input);
            }
        } catch (error) {
            console.warn('[Pills] Setup error, skipping:', error);
            input.dataset.pillsInitialized = 'false';
            return;
        }
    }
    
    const chipsDiv = container.querySelector('.email-chips');
    if (!chipsDiv) {
        console.warn('[Pills] No chips container found');
        return;
    }
    
    input.classList.add('chip-input');
    
    // Force lowercase on input
    input.addEventListener('input', function(e) {
        e.target.value = e.target.value.toLowerCase();
    });
    
    // Create pill on Enter or comma
    input.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            const email = input.value.trim();
            if (email) {
                createEmailPill(email, chipsDiv, input);
            }
        }
        
        // Delete last pill on backspace if input is empty
        if (e.key === 'Backspace' && !input.value) {
            const lastChip = chipsDiv.lastElementChild;
            if (lastChip) {
                lastChip.remove();
            }
        }
    });
    
    // Create pill on blur if there's content
    input.addEventListener('blur', function() {
        const email = input.value.trim();
        if (email) {
            createEmailPill(email, chipsDiv, input);
        }
    });
    
    // Handle paste - split by common delimiters
    input.addEventListener('paste', function(e) {
        e.preventDefault();
        const pastedText = (e.clipboardData || window.clipboardData).getData('text');
        const emails = pastedText.split(/[,;\s]+/);
        
        emails.forEach(email => {
            const trimmedEmail = email.trim();
            if (trimmedEmail) {
                createEmailPill(trimmedEmail, chipsDiv, input);
            }
        });
    });
}

/**
 * Create an email pill element
 * @param {string} email - The email address
 * @param {HTMLElement} container - Container for the chips
 * @param {HTMLInputElement} input - The input field
 */
function createEmailPill(email, container, input) {
    // Normalize email
    email = email.toLowerCase().trim();
    if (!email) return;
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isValid = emailRegex.test(email);
    
    // Check for duplicates
    const existingEmails = Array.from(container.querySelectorAll('.email-chip .email-text'))
        .map(el => el.textContent);
    const isDuplicate = existingEmails.includes(email);
    
    // Don't create duplicate pills
    if (isDuplicate) {
        input.value = '';
        return;
    }
    
    // Create chip element
    const chip = document.createElement('div');
    chip.className = 'email-chip';
    
    // Add validation class
    if (!isValid) {
        chip.classList.add('invalid');
    } else {
        chip.classList.add('valid');
    }
    
    // Create chip content
    const emailText = document.createElement('span');
    emailText.className = 'email-text';
    emailText.textContent = email;
    
    const removeBtn = document.createElement('button');
    removeBtn.className = 'remove-chip';
    removeBtn.type = 'button';
    removeBtn.innerHTML = '×';
    removeBtn.title = 'Remove';
    
    // Remove chip on click
    removeBtn.onclick = function() {
        chip.remove();
        input.focus();
    };
    
    // Edit chip on text click
    emailText.onclick = function() {
        input.value = email;
        chip.remove();
        input.focus();
    };
    
    // Assemble chip
    chip.appendChild(emailText);
    chip.appendChild(removeBtn);
    
    // Add to container with animation
    container.appendChild(chip);
    
    // Clear input
    input.value = '';
    
    // Animate in
    requestAnimationFrame(() => {
        chip.style.opacity = '0';
        chip.style.transform = 'scale(0.8)';
        requestAnimationFrame(() => {
            chip.style.transition = 'all 0.2s ease';
            chip.style.opacity = '1';
            chip.style.transform = 'scale(1)';
        });
    });
}

/**
 * Get all email addresses from a pill field
 * @param {string|HTMLElement} fieldOrContainer - Field ID or container element
 * @returns {Array<string>} Array of email addresses
 */
function getEmailsFromPillField(fieldOrContainer) {
    let container;
    
    if (typeof fieldOrContainer === 'string') {
        const field = document.getElementById(fieldOrContainer);
        container = field ? field.closest('.chip-input-container') : null;
    } else {
        container = fieldOrContainer.closest('.chip-input-container') || fieldOrContainer;
    }
    
    if (!container) return [];
    
    const chips = container.querySelectorAll('.email-chip .email-text');
    return Array.from(chips).map(chip => chip.textContent);
}

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

// ============================================
// CC/BCC TOGGLE FUNCTIONS
// ============================================

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

// ============================================
// TEXT ALIGNMENT & FORMATTING
// ============================================

/**
 * Align text in the textarea
 * @param {string} alignment - left, center, or right
 */
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
            alignedText = selectedLines.split('\n')
                .map(line => '    ' + line.trim() + '    ').join('\n');
            break;
        case 'right':
            alignedText = selectedLines.split('\n')
                .map(line => '        ' + line.trim()).join('\n');
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

/**
 * Insert a list (bullet or numbered)
 * @param {string} type - 'bullet' or 'number'
 */
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

// ============================================
// EMAIL ACTION FUNCTIONS (PLACEHOLDERS)
// ============================================

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
        
    } catch (error) {
        console.error('Failed to send email:', error);
        alert('Failed to send email. Check console for details.');
    }
}

// Update the placeholder functions
function sendReply() {
    sendEmail();
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

function openSettings() {
    console.log('Open settings - To be implemented');
}

function markAsRead() {
    console.log('Mark as read - To be implemented');
}

function markAsUnread() {
    console.log('Mark as unread - To be implemented');
}

// ============================================
// AI FUNCTIONS (PLACEHOLDERS)
// ============================================

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
    
    console.log('[Admin Mail] Reply editor initialized');
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

// ============================================
// MODULE REGISTRATION
// ============================================

// Register email pills module
if (window.BlakelyApp) {
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
    
    BlakelyApp.register('folderCounts', function() {
        updateFolderCountStyling();
    });
    
    // (Removed composeHeader reflow hack; CSS rules are consolidated and deterministic)
    
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
    console.warn('[Admin Mail] App init not found, using fallback');
    document.addEventListener('DOMContentLoaded', function() {
        setTimeout(() => {
            try { initEmailPills(); } catch(e) { console.error(e); }
            try { updateFolderCountStyling(); } catch(e) { console.error(e); }
        }, 500);
    });
}

// ============================================
// GLOBAL EXPORTS
// ============================================

// Make email pill functions available globally
window.emailPills = {
    init: initEmailPills,
    getEmails: getEmailsFromPillField,
    setup: setupPillField
};

// ============================================
// EMAIL LIST MANAGEMENT
// ============================================

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
}

// ============================================
// MAIL FOLDER NAVIGATION
// Created: December 17, 2024 11:45 AM
// Purpose: Handle folder clicks and email filtering
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
    
    console.log('[Admin Mail] Folder navigation initialized');
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
}

/**
 * Show email content in the main view
 * @param {Object} email - Email data object
 */
function showEmailContent(email) {
    document.getElementById('emailSubject').textContent = email.subject;
    document.getElementById('senderName').textContent = email.from;
    document.getElementById('senderEmail').textContent = email.to;
    document.getElementById('emailDate').textContent = email.time;
    document.getElementById('senderAvatar').textContent = email.from.charAt(0).toUpperCase();
    
    document.getElementById('emailBody').innerHTML = `
        <div style="padding: 20px; line-height: 1.6;">
            ${email.preview}
            <br><br>
            [Full email content would appear here]
        </div>
    `;
    
    // Show meta and actions
    document.getElementById('emailMeta').style.display = 'flex';
    document.getElementById('emailActions').style.display = 'flex';
}

// ============================================
// INITIALIZATION ON PAGE LOAD
// ============================================

// Initialize mail folders when DOM is ready
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
            initMailFolders();
            loadSampleEmails(); // Load sample data for testing
            console.log('[Admin Mail] Mail system initialized');
        } catch (e) {
            console.error('[Admin Mail] Initialization error:', e);
        }
    }, 100);
}

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
}

/**
 * Add email to the list (for new sent emails)
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
    
    // Add to top of list
    emailList.insertBefore(emailItem, emailList.firstChild);
    
    // Update counts
    updateFolderCounts();
}

// Export for debugging
window.adminMail = {
    updateFolderCounts: updateFolderCountStyling,
    getReplyContent: getReplyContent,
    setReplyContent: setReplyContent,
    addEmailToList: addEmailToList,
    sortEmailsByDate: sortEmailsByDate,
    updateFolderCounts: updateFolderCounts
};

// ============================================
// EMAIL FOLDER PATCH FOR API INTEGRATION
// Created: December 17, 2024 12:50 PM
// Purpose: Add folder attributes to API-loaded emails
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
        console.log(`[Admin Mail] Patched ${patched} emails with folder attributes`);
        updateFolderCounts(); // Update counts after patching
    }
}

// Auto-patch when emails load
const emailObserver = new MutationObserver(() => {
    const needsPatch = document.querySelector('.mail-item:not([data-folder])');
    if (needsPatch) {
        setTimeout(patchEmailFolders, 100);
    }
});

// Start observing when DOM is ready
if (document.getElementById('emailList')) {
    emailObserver.observe(document.getElementById('emailList'), {
        childList: true,
        subtree: true
    });
    // Initial patch
    patchEmailFolders();
}

console.log('[Admin Mail] Folder patch system initialized');
