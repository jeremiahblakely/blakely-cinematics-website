/**
 * ContentEditableCore.js
 * Rich text editor engine for Blakely Cinematics Admin Mail
 * Created: September 12, 2025 3:06 PM
 * Updated: September 12, 2025 4:00 PM
 * 
 * ES6 Module version that integrates with existing MVC architecture
 */

export default class ContentEditableCore {
    constructor() {
        this.editor = null;
        this.originalTextarea = null;
        this.selection = null;
        this.undoStack = [];
        this.redoStack = [];
        this.maxUndoSteps = 50;
        this.initialized = false;
        
        // Keyboard shortcuts mapping
        this.shortcuts = {
            'b': 'bold',
            'i': 'italic',
            'u': 'underline',
            's': 'strikeThrough',
            'k': 'createLink',
            'z': 'undo',
            'y': 'redo',
            'shift+z': 'redo'
        };
    }
    
    /**
     * Initialize the rich text editor with a specific textarea
     * @param {string} textareaId - ID of the textarea to convert
     */
    init(textareaId = 'replyText') {
        if (this.initialized) {
            console.log('[ContentEditableCore] Already initialized');
            return true;
        }
        
        console.log('[ContentEditableCore] Initializing rich text editor...');
        
        // Check if there's already an emailEditor and clean it up
        const existingEditor = document.getElementById('emailEditor');
        if (existingEditor) {
            console.log('[ContentEditableCore] Cleaning up existing emailEditor');
            existingEditor.remove();
        }
        
        // Find the textarea to replace
        this.originalTextarea = document.getElementById(textareaId);
        if (!this.originalTextarea) {
            console.warn(`[ContentEditableCore] No textarea with id="${textareaId}" found`);
            return false;
        }
        
        // Ensure textarea is visible (might have been hidden by previous instance)
        this.originalTextarea.style.display = '';
        
        // Convert textarea to contenteditable
        this.convertToContentEditable();
        
        // Set up event listeners
        this.attachEventListeners();
        
        // Initialize undo/redo with initial state
        this.captureState();
        
        this.initialized = true;
        console.log('[ContentEditableCore] Rich text editor initialized successfully');
        return true;
    }
    
    /**
     * Convert textarea to contenteditable div
     */
    convertToContentEditable() {
        // Create the contenteditable div
        this.editor = document.createElement('div');
        this.editor.id = 'emailEditor';
        const baseClass = (this.originalTextarea.className || '').trim();
        const classList = [baseClass, 'email-editor', 'contenteditable-editor']
            .filter(Boolean)
            .join(' ')
            .trim();
        this.editor.className = classList;
        this.editor.contentEditable = true;
        this.editor.setAttribute('role', 'textbox');
        this.editor.setAttribute('aria-label', 'Email composer');
        this.editor.setAttribute('data-placeholder', this.originalTextarea.placeholder || 'Type your message here...');
        
        // Copy existing content if any
        if (this.originalTextarea.value) {
            this.editor.innerHTML = this.escapeHtml(this.originalTextarea.value);
        }
        
        // Apply styles to match the textarea
        this.editor.style.width = '100%';
        this.editor.style.minHeight = '120px';
        this.editor.style.padding = '12px';
        this.editor.style.paddingBottom = '25px'; // Room for word count
        this.editor.style.background = 'rgba(255, 255, 255, 0.03)';
        this.editor.style.border = '1px solid rgba(255, 255, 255, 0.1)';
        this.editor.style.borderRadius = '8px';
        this.editor.style.color = 'var(--text-primary, #e0e0e0)';
        this.editor.style.fontSize = '0.95rem';
        this.editor.style.lineHeight = '1.6';
        this.editor.style.fontFamily = 'inherit';
        this.editor.style.outline = 'none';
        this.editor.style.overflowY = 'auto';
        this.editor.style.resize = 'vertical';
        this.editor.style.transition = 'all 0.3s ease';
        
        // Hide original textarea but keep it for form submission
        this.originalTextarea.style.display = 'none';
        
        // Insert the editor after the textarea
        this.originalTextarea.parentNode.insertBefore(this.editor, this.originalTextarea.nextSibling);
        
        // Keep textarea in sync for form submission
        this.syncTextarea();
    }
    
    /**
     * Attach all event listeners
     */
    attachEventListeners() {
        if (!this.editor) return;
        
        // Paste event - clean up formatting
        this.editor.addEventListener('paste', (e) => this.handlePaste(e));
        
        // Keyboard shortcuts
        this.editor.addEventListener('keydown', (e) => this.handleKeydown(e));
        
        // Input event for syncing and auto-save
        this.editor.addEventListener('input', () => {
            this.syncTextarea();
            this.handleInput();
        });
        
        // Focus/blur for placeholder and expansion
        this.editor.addEventListener('focus', () => this.handleFocus());
        this.editor.addEventListener('blur', () => this.handleBlur());
        
        // Selection change for toolbar state updates
        document.addEventListener('selectionchange', () => this.handleSelectionChange());
    }
    
    /**
     * Handle paste event - strip or clean formatting
     */
    handlePaste(e) {
        e.preventDefault();
        
        let pastedContent = '';
        
        // Get clipboard data
        if (e.clipboardData && e.clipboardData.getData) {
            const text = e.clipboardData.getData('text/plain');
            
            // For now, just insert plain text
            // Later we can add HTML cleaning if needed
            if (text) {
                pastedContent = text;
            }
        }
        
        // Insert the content
        if (pastedContent) {
            document.execCommand('insertText', false, pastedContent);
            this.captureState();
        }
    }
    
    /**
     * Handle keyboard shortcuts
     */
    handleKeydown(e) {
        // Check for Cmd/Ctrl key combinations
        if (e.metaKey || e.ctrlKey) {
            const key = e.key.toLowerCase();
            const shortcut = e.shiftKey ? `shift+${key}` : key;
            
            if (this.shortcuts[shortcut]) {
                e.preventDefault();
                
                if (shortcut === 'z') {
                    this.undo();
                } else if (shortcut === 'y' || shortcut === 'shift+z') {
                    this.redo();
                } else {
                    this.executeCommand(this.shortcuts[shortcut]);
                }
                return;
            }
            
            // Cmd/Ctrl + Enter to send
            if (key === 'enter') {
                e.preventDefault();
                if (window.sendReply) {
                    window.sendReply();
                }
                return;
            }
        }
        
        // Tab key handling - insert spaces
        if (e.key === 'Tab') {
            e.preventDefault();
            document.execCommand('insertText', false, '    ');
        }
        
        // Escape to minimize reply box
        if (e.key === 'Escape') {
            const replyBox = this.editor.closest('.reply-box');
            if (replyBox && replyBox.classList.contains('expanded')) {
                replyBox.classList.remove('expanded');
            }
        }
    }
    
    /**
     * Execute formatting command
     */
    executeCommand(command, value = null) {
        // Focus the editor first
        this.editor.focus();
        
        // Execute the command
        if (command === 'createLink') {
            const url = prompt('Enter URL:');
            if (url) {
                document.execCommand(command, false, url);
            }
        } else {
            document.execCommand(command, false, value);
        }
        
        // Capture state for undo
        this.captureState();
        
        // Update toolbar state if toolbar exists
        this.updateToolbarState();
        
        // Sync with textarea
        this.syncTextarea();
    }
    
    /**
     * Handle input event
     */
    handleInput() {
        // Update word count
        this.updateWordCount();
        
        // Show draft saved indicator
        this.showDraftSaved();
        
        // Capture state for undo (throttled)
        if (this.captureTimeout) {
            clearTimeout(this.captureTimeout);
        }
        this.captureTimeout = setTimeout(() => {
            this.captureState();
        }, 500);
    }
    
    /**
     * Handle focus event
     */
    handleFocus() {
        const replyBox = this.editor.closest('.reply-box');
        if (replyBox) {
            replyBox.classList.add('expanded');
            // Don't force heights on the reply box itself
            // Only expand the editor
            this.editor.style.minHeight = '250px';
        }
        
        // Remove placeholder visual if empty
        if (!this.editor.textContent.trim()) {
            this.editor.classList.add('is-empty');
        } else {
            this.editor.classList.remove('is-empty');
        }
    }
    
    /**
     * Handle blur event
     */
    handleBlur() {
        // Add placeholder visual if empty
        if (!this.editor.textContent.trim()) {
            this.editor.classList.add('is-empty');
        } else {
            this.editor.classList.remove('is-empty');
        }
    }
    
    /**
     * Handle selection change
     */
    handleSelectionChange() {
        if (document.activeElement === this.editor) {
            this.updateToolbarState();
        }
    }
    
    /**
     * Update toolbar button states based on current selection
     */
    updateToolbarState() {
        const commands = ['bold', 'italic', 'underline', 'strikeThrough', 
                         'insertOrderedList', 'insertUnorderedList'];
        
        commands.forEach(command => {
            const button = document.querySelector(`[data-command="${command}"]`);
            if (button) {
                const isActive = document.queryCommandState(command);
                button.classList.toggle('active', isActive);
            }
        });
    }
    
    /**
     * Sync content with hidden textarea
     */
    syncTextarea() {
        if (this.originalTextarea && this.editor) {
            // Get HTML content
            const html = this.editor.innerHTML;
            
            // Store HTML in textarea for form submission
            // The backend can process HTML emails
            this.originalTextarea.value = html;
        }
    }
    
    /**
     * Update word count display
     */
    updateWordCount() {
        const wordCount = document.getElementById('wordCount');
        if (!wordCount) return;
        
        const text = this.editor.textContent || '';
        const words = text.trim().split(/\s+/).filter(word => word.length > 0).length;
        wordCount.textContent = `${words} words`;
        
        // Show word count when there's content
        if (words > 0) {
            wordCount.style.opacity = '1';
        }
    }
    
    /**
     * Show draft saved indicator
     */
    showDraftSaved() {
        const indicator = document.getElementById('draftIndicator');
        if (!indicator) return;
        
        // Clear existing timeout
        if (this.draftTimeout) {
            clearTimeout(this.draftTimeout);
        }
        
        // Show indicator
        indicator.classList.add('show');
        
        // Hide after 2 seconds
        this.draftTimeout = setTimeout(() => {
            indicator.classList.remove('show');
        }, 2000);
    }
    
    /**
     * Capture current state for undo/redo
     */
    captureState() {
        if (!this.editor) return;
        
        const state = {
            html: this.editor.innerHTML,
            selection: this.saveSelection()
        };
        
        // Don't add duplicate states
        const lastState = this.undoStack[this.undoStack.length - 1];
        if (lastState && lastState.html === state.html) {
            return;
        }
        
        // Add to undo stack
        this.undoStack.push(state);
        
        // Limit stack size
        if (this.undoStack.length > this.maxUndoSteps) {
            this.undoStack.shift();
        }
        
        // Clear redo stack on new action
        this.redoStack = [];
    }
    
    /**
     * Undo last action
     */
    undo() {
        if (this.undoStack.length > 1) {
            // Current state goes to redo stack
            const current = this.undoStack.pop();
            this.redoStack.push(current);
            
            // Restore previous state
            const previous = this.undoStack[this.undoStack.length - 1];
            this.editor.innerHTML = previous.html;
            this.restoreSelection(previous.selection);
            
            this.syncTextarea();
            this.updateWordCount();
        }
    }
    
    /**
     * Redo last undone action
     */
    redo() {
        if (this.redoStack.length > 0) {
            const state = this.redoStack.pop();
            this.undoStack.push(state);
            
            this.editor.innerHTML = state.html;
            this.restoreSelection(state.selection);
            
            this.syncTextarea();
            this.updateWordCount();
        }
    }
    
    /**
     * Save current selection
     */
    saveSelection() {
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            const preSelectionRange = range.cloneRange();
            preSelectionRange.selectNodeContents(this.editor);
            preSelectionRange.setEnd(range.startContainer, range.startOffset);
            const start = preSelectionRange.toString().length;
            
            return {
                start: start,
                end: start + range.toString().length
            };
        }
        return null;
    }
    
    /**
     * Restore saved selection
     */
    restoreSelection(savedSel) {
        if (!savedSel) return;
        
        try {
            const charIndex = 0;
            const range = document.createRange();
            range.setStart(this.editor, 0);
            range.collapse(true);
            
            const nodeStack = [this.editor];
            let node;
            let foundStart = false;
            let stop = false;
            let charCount = 0;
            
            while (!stop && (node = nodeStack.pop())) {
                if (node.nodeType === 3) {
                    const nextCharIndex = charCount + node.length;
                    if (!foundStart && savedSel.start >= charCount && savedSel.start <= nextCharIndex) {
                        range.setStart(node, savedSel.start - charCount);
                        foundStart = true;
                    }
                    if (foundStart && savedSel.end >= charCount && savedSel.end <= nextCharIndex) {
                        range.setEnd(node, savedSel.end - charCount);
                        stop = true;
                    }
                    charCount = nextCharIndex;
                } else {
                    let i = node.childNodes.length;
                    while (i--) {
                        nodeStack.push(node.childNodes[i]);
                    }
                }
            }
            
            const selection = window.getSelection();
            selection.removeAllRanges();
            selection.addRange(range);
        } catch (e) {
            // Selection restoration failed, ignore
        }
    }
    
    /**
     * Get HTML content
     */
    getHtml() {
        return this.editor ? this.editor.innerHTML : '';
    }

    // Backward-compat alias used by callers
    getHTML() {
        return this.getHtml();
    }
    
    /**
     * Get plain text content
     */
    getText() {
        return this.editor ? this.editor.textContent : '';
    }
    
    /**
     * Set HTML content (primary helper)
     */
    setHtml(html) {
        if (this.editor) {
            this.editor.innerHTML = html;
            this.syncTextarea();
            this.updateWordCount();
            this.captureState();
        }
    }

    // Backward-compat alias mixed-case callers expect
    setHTML(html) {
        return this.setHtml(html);
    }

    /**
     * Legacy helper retained for compatibility
     */
    setContent(html) {
        this.setHtml(html);
    }
    
    /**
     * Clear content
     */
    clear() {
        this.setContent('');
        this.editor.classList.add('is-empty');
    }
    
    /**
     * Focus the editor
     */
    focus() {
        if (this.editor) {
            this.editor.focus();
        }
    }

    // Convenience getter for callers expecting isActive
    get isActive() {
        return this.initialized === true;
    }
    
    /**
     * Destroy the editor and restore textarea
     */
    destroy() {
        if (this.editor && this.originalTextarea) {
            // Remove the editor
            this.editor.remove();
            
            // Show the original textarea
            this.originalTextarea.style.display = '';
            
            // Clear references
            this.editor = null;
            this.originalTextarea = null;
            this.initialized = false;
        }
    }
    
    /**
     * Escape HTML for display
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Don't auto-initialize - let MailView handle it
