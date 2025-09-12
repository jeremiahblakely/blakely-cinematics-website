/**
 * ContentEditableCore.js - Core ContentEditable Engine
 * Path: /modules/admin/composers/ContentEditableCore.js
 * Created: September 12, 2025 7:08 AM
 * 
 * This is the foundation for rich text editing.
 * Handles basic formatting, selection management, and clean HTML output.
 */

export default class ContentEditableCore {
    constructor(config = {}) {
        this.editor = null;
        this.toolbar = null;
        this.isActive = false;
        
        // Configuration
        this.config = {
            placeholder: 'Compose your message...',
            minHeight: '120px',
            maxHeight: '50vh',
            autoFocus: false,
            ...config
        };
        
        // Track current state
        this.savedSelection = null;
        this.lastContent = '';
        
        // Bind methods
        this.handlePaste = this.handlePaste.bind(this);
        this.handleKeydown = this.handleKeydown.bind(this);
        this.handleInput = this.handleInput.bind(this);
        this.saveSelection = this.saveSelection.bind(this);
    }
    
    /**
     * Initialize the editor on a target element
     */
    init(targetElement) {
        if (!targetElement) {
            console.error('ContentEditableCore: No target element provided');
            return false;
        }
        
        // Convert textarea to contenteditable div if needed
        if (targetElement.tagName === 'TEXTAREA') {
            this.editor = this.convertTextareaToDiv(targetElement);
        } else {
            this.editor = targetElement;
            this.setupEditor();
        }
        
        this.attachEventListeners();
        this.isActive = true;
        
        console.log('ContentEditableCore initialized successfully');
        return true;
    }
    
    /**
     * Convert textarea to contenteditable div
     */
    convertTextareaToDiv(textarea) {
        const div = document.createElement('div');
        
        // Copy attributes
        div.id = textarea.id || 'emailEditor';
        div.className = textarea.className + ' contenteditable-editor';
        
        // Set contenteditable
        div.contentEditable = true;
        div.spellcheck = true;
        
        // Set placeholder
        div.setAttribute('data-placeholder', this.config.placeholder);
        
        // Copy content (escape HTML)
        div.textContent = textarea.value;
        
        // Style
        div.style.minHeight = this.config.minHeight;
        div.style.maxHeight = this.config.maxHeight;
        div.style.overflowY = 'auto';
        div.style.outline = 'none';
        div.style.padding = '12px';
        
        // Replace textarea
        textarea.parentNode.replaceChild(div, textarea);
        
        return div;
    }
    
    /**
     * Setup editor properties
     */
    setupEditor() {
        this.editor.contentEditable = true;
        this.editor.spellcheck = true;
        this.editor.setAttribute('data-placeholder', this.config.placeholder);
        this.editor.style.minHeight = this.config.minHeight;
        this.editor.style.maxHeight = this.config.maxHeight;
        this.editor.style.overflowY = 'auto';
    }
    
    /**
     * Attach event listeners
     */
    attachEventListeners() {
        // Content events
        this.editor.addEventListener('paste', this.handlePaste);
        this.editor.addEventListener('keydown', this.handleKeydown);
        this.editor.addEventListener('input', this.handleInput);
        this.editor.addEventListener('mouseup', this.saveSelection);
        this.editor.addEventListener('keyup', this.saveSelection);
        
        // Focus events
        this.editor.addEventListener('focus', () => {
            this.editor.classList.add('focused');
        });
        
        this.editor.addEventListener('blur', () => {
            this.editor.classList.remove('focused');
            this.saveSelection();
        });
    }
    
    /**
     * Execute formatting command
     */
    execCommand(command, value = null) {
        // Restore selection if needed
        if (this.savedSelection) {
            this.restoreSelection();
        }
        
        // Focus editor
        this.editor.focus();
        
        // Execute command
        document.execCommand(command, false, value);
        
        // Save new selection
        this.saveSelection();
        
        // Trigger input event for any listeners
        this.editor.dispatchEvent(new Event('input', { bubbles: true }));
        
        return true;
    }
    
    /**
     * Format text with specific command
     */
    formatText(command) {
        switch(command) {
            case 'bold':
                this.execCommand('bold');
                break;
            case 'italic':
                this.execCommand('italic');
                break;
            case 'underline':
                this.execCommand('underline');
                break;
            case 'strikethrough':
                this.execCommand('strikeThrough');
                break;
            case 'orderedList':
                this.execCommand('insertOrderedList');
                break;
            case 'unorderedList':
                this.execCommand('insertUnorderedList');
                break;
            case 'quote':
                this.execCommand('formatBlock', 'blockquote');
                break;
            case 'code':
                this.execCommand('formatBlock', 'pre');
                break;
            case 'removeFormat':
                this.execCommand('removeFormat');
                break;
            default:
                console.warn('Unknown format command:', command);
        }
    }
    
    /**
     * Handle paste event - clean HTML
     */
    handlePaste(e) {
        e.preventDefault();
        
        // Get paste data
        const clipboardData = e.clipboardData || window.clipboardData;
        let pastedData = clipboardData.getData('text/html');
        
        // If no HTML, get plain text
        if (!pastedData) {
            pastedData = clipboardData.getData('text/plain');
            // Convert plain text to HTML (preserve line breaks)
            pastedData = pastedData.replace(/\n/g, '<br>');
        } else {
            // Clean HTML
            pastedData = this.cleanHTML(pastedData);
        }
        
        // Insert cleaned content
        this.execCommand('insertHTML', pastedData);
    }
    
    /**
     * Clean HTML content
     */
    cleanHTML(html) {
        // Create temporary element
        const temp = document.createElement('div');
        temp.innerHTML = html;
        
        // Remove script tags
        const scripts = temp.querySelectorAll('script');
        scripts.forEach(script => script.remove());
        
        // Remove style tags
        const styles = temp.querySelectorAll('style');
        styles.forEach(style => style.remove());
        
        // Remove on* attributes
        const allElements = temp.querySelectorAll('*');
        allElements.forEach(el => {
            // Remove event handlers
            for (let attr of el.attributes) {
                if (attr.name.startsWith('on')) {
                    el.removeAttribute(attr.name);
                }
            }
            
            // Remove style attribute (optional - you might want to keep some)
            el.removeAttribute('style');
            
            // Clean class attribute (keep only safe classes)
            if (el.className) {
                el.className = '';
            }
        });
        
        return temp.innerHTML;
    }
    
    /**
     * Handle keyboard shortcuts
     */
    handleKeydown(e) {
        const key = e.key.toLowerCase();
        const cmd = e.metaKey || e.ctrlKey;
        const shift = e.shiftKey;
        
        // Cmd+B - Bold
        if (cmd && key === 'b') {
            e.preventDefault();
            this.formatText('bold');
        }
        
        // Cmd+I - Italic
        if (cmd && key === 'i') {
            e.preventDefault();
            this.formatText('italic');
        }
        
        // Cmd+U - Underline
        if (cmd && key === 'u') {
            e.preventDefault();
            this.formatText('underline');
        }
        
        // Cmd+Shift+7 - Ordered List
        if (cmd && shift && key === '7') {
            e.preventDefault();
            this.formatText('orderedList');
        }
        
        // Cmd+Shift+8 - Unordered List
        if (cmd && shift && key === '8') {
            e.preventDefault();
            this.formatText('unorderedList');
        }
        
        // Tab - Indent
        if (key === 'tab') {
            e.preventDefault();
            if (shift) {
                this.execCommand('outdent');
            } else {
                this.execCommand('indent');
            }
        }
    }
    
    /**
     * Handle input event
     */
    handleInput() {
        // Update placeholder visibility
        if (this.editor.textContent.trim() === '') {
            this.editor.classList.add('empty');
        } else {
            this.editor.classList.remove('empty');
        }
        
        // Save content
        this.lastContent = this.getHTML();
    }
    
    /**
     * Save current selection
     */
    saveSelection() {
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
            this.savedSelection = selection.getRangeAt(0).cloneRange();
        }
    }
    
    /**
     * Restore saved selection
     */
    restoreSelection() {
        if (this.savedSelection) {
            const selection = window.getSelection();
            selection.removeAllRanges();
            selection.addRange(this.savedSelection);
        }
    }
    
    /**
     * Get clean HTML content
     */
    getHTML() {
        return this.editor.innerHTML;
    }
    
    /**
     * Get plain text content
     */
    getText() {
        return this.editor.textContent || this.editor.innerText;
    }
    
    /**
     * Set HTML content
     */
    setHTML(html) {
        this.editor.innerHTML = html;
        this.handleInput();
    }
    
    /**
     * Clear content
     */
    clear() {
        this.editor.innerHTML = '';
        this.handleInput();
    }
    
    /**
     * Focus the editor
     */
    focus() {
        if (!this.editor) return;
        
        this.editor.focus();
        
        // Only set cursor position if editor has content
        try {
            const selection = window.getSelection();
            const range = document.createRange();
            
            // Check if editor has child nodes
            if (this.editor.childNodes.length > 0) {
                // Place cursor at end of existing content
                range.selectNodeContents(this.editor);
                range.collapse(false);
            } else {
                // Empty editor - just set cursor at beginning
                range.setStart(this.editor, 0);
                range.collapse(true);
            }
            
            selection.removeAllRanges();
            selection.addRange(range);
        } catch (e) {
            // Fallback - just focus without setting cursor position
            console.log('Could not set cursor position:', e.message);
        }
    }
    
    /**
     * Destroy the editor
     */
    destroy() {
        if (this.editor) {
            this.editor.removeEventListener('paste', this.handlePaste);
            this.editor.removeEventListener('keydown', this.handleKeydown);
            this.editor.removeEventListener('input', this.handleInput);
            this.editor.removeEventListener('mouseup', this.saveSelection);
            this.editor.removeEventListener('keyup', this.saveSelection);
        }
        
        this.isActive = false;
    }
}

// CSS needed for placeholder (add to admin-mail.css)
const placeholderCSS = `
.contenteditable-editor[data-placeholder]:empty:before {
    content: attr(data-placeholder);
    color: var(--text-muted, #999);
    pointer-events: none;
    position: absolute;
}

.contenteditable-editor.focused {
    border-color: var(--accent-primary);
    box-shadow: 0 0 20px rgba(0, 255, 255, 0.1);
}
`;

console.log('ContentEditableCore loaded. Add this CSS to admin-mail.css:', placeholderCSS);