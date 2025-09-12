/**
 * EmailComposer.js - Enterprise-grade ContentEditable Email Composer
 * Created: January 10, 2025 6:45 AM
 * 
 * Features:
 * - Rich text editing with ContentEditable
 * - Undo/Redo stack management
 * - Smart paste handling
 * - Auto-save functionality
 * - Template variable support
 * - Keyboard shortcuts
 * - Selection/Range management
 */

export class EmailComposer {
    constructor() {
        this.editor = null;
        this.toolbar = null;
        this.isComposing = false;
        this.currentMode = 'new'; // 'new', 'reply', 'forward'
        
        // Undo/Redo management
        this.undoStack = [];
        this.redoStack = [];
        this.maxUndoLevels = 50;
        
        // Auto-save
        this.autoSaveTimer = null;
        this.autoSaveInterval = 10000; // 10 seconds
        this.lastSavedContent = '';
        
        // Selection management
        this.savedSelection = null;
        
        // Template variables
        this.templateVars = {
            clientName: '',
            galleryLink: '',
            bookingDate: '',
            projectName: ''
        };
        
        // Keyboard shortcuts map
        this.shortcuts = new Map([
            ['cmd+b', () => this.execCommand('bold')],
            ['cmd+i', () => this.execCommand('italic')],
            ['cmd+u', () => this.execCommand('underline')],
            ['cmd+k', () => this.insertLink()],
            ['cmd+z', () => this.undo()],
            ['cmd+shift+z', () => this.redo()],
            ['cmd+y', () => this.redo()],
            ['cmd+enter', () => this.send()],
            ['cmd+s', () => this.saveDraft()],
            ['cmd+shift+7', () => this.execCommand('insertOrderedList')],
            ['cmd+shift+8', () => this.execCommand('insertUnorderedList')]
        ]);
        
        // Email templates
        this.templates = {
            inquiry_response: {
                name: 'Inquiry Response',
                subject: 'Re: Your Photography Inquiry',
                body: `Hi {{clientName}},

Thank you for reaching out about your upcoming project. I'd love to learn more about your vision and how Blakely Cinematics can help bring it to life.

Could you share:
- Your preferred date(s)
- Location or venue
- Approximate number of people
- Your vision for the shoot

Looking forward to creating something beautiful together!

Best regards,
Jeremiah Blakely
Blakely Cinematics`
            },
            booking_confirmation: {
                name: 'Booking Confirmation',
                subject: 'Booking Confirmed - {{projectName}}',
                body: `Hi {{clientName}},

Great news! Your booking for {{bookingDate}} is confirmed.

Next steps:
1. Your deposit invoice will arrive shortly
2. We'll schedule a pre-shoot consultation
3. Gallery will be ready 2-3 weeks after the shoot

Your gallery link will be: {{galleryLink}}

Excited to work with you!

Best,
Jeremiah Blakely`
            },
            gallery_ready: {
                name: 'Gallery Ready',
                subject: 'Your Gallery is Ready! - {{projectName}}',
                body: `Hi {{clientName}},

Your photos are ready for viewing!

Gallery Link: {{galleryLink}}
Access Code: [Will be provided separately]

The gallery includes:
- All edited images from your session
- Download options in multiple resolutions
- Sharing capabilities for friends and family

Please make your selections within 14 days.

Let me know if you have any questions!

Best,
Jeremiah Blakely`
            }
        };
    }
    
    /**
     * Initialize the composer with DOM elements
     */
    init() {
        this.editor = document.getElementById('emailEditor');
        this.toolbar = document.getElementById('formattingToolbar');
        
        if (!this.editor) {
            console.error('EmailComposer: Editor element not found');
            return;
        }
        
        this.setupEventListeners();
        this.setupToolbar();
        this.initAutoSave();
        
        // Set initial focus
        this.editor.focus();
        
        console.log('EmailComposer initialized successfully');
    }
    
    /**
     * Setup event listeners for the editor
     */
    setupEventListeners() {
        // Editor events
        this.editor.addEventListener('input', () => this.handleInput());
        this.editor.addEventListener('paste', (e) => this.handlePaste(e));
        this.editor.addEventListener('keydown', (e) => this.handleKeydown(e));
        this.editor.addEventListener('mouseup', () => this.handleSelection());
        this.editor.addEventListener('keyup', () => this.handleSelection());
        
        // Track focus for toolbar
        this.editor.addEventListener('focus', () => {
            this.isComposing = true;
        });
        
        this.editor.addEventListener('blur', () => {
            // Keep toolbar visible briefly for button clicks
            setTimeout(() => {
                if (!this.isToolbarActive()) {
                    this.hideToolbar();
                }
            }, 200);
        });
        
        // Compose button
        const composeBtn = document.getElementById('composeNew');
        if (composeBtn) {
            composeBtn.addEventListener('click', () => this.openComposer('new'));
        }
        
        // Send button
        const sendBtn = document.getElementById('sendEmail');
        if (sendBtn) {
            sendBtn.addEventListener('click', () => this.send());
        }
        
        // Save draft button
        const saveDraftBtn = document.getElementById('saveDraft');
        if (saveDraftBtn) {
            saveDraftBtn.addEventListener('click', () => this.saveDraft());
        }
        
        // CC/BCC toggle
        const ccBccBtn = document.getElementById('showCcBcc');
        if (ccBccBtn) {
            ccBccBtn.addEventListener('click', () => this.toggleCcBcc());
        }
        
        // Template button
        const templateBtn = document.querySelector('[data-command="insertTemplate"]');
        if (templateBtn) {
            templateBtn.addEventListener('click', () => this.showTemplates());
        }
        
        // Close composer
        const closeBtn = document.querySelector('.composer-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.closeComposer());
        }
        
        // Minimize composer
        const minimizeBtn = document.querySelector('.composer-minimize');
        if (minimizeBtn) {
            minimizeBtn.addEventListener('click', () => this.minimizeComposer());
        }
        
        // Expand composer
        const expandBtn = document.querySelector('.composer-expand');
        if (expandBtn) {
            expandBtn.addEventListener('click', () => this.expandComposer());
        }
    }
    
    /**
     * Setup toolbar buttons
     */
    setupToolbar() {
        // Format buttons
        document.querySelectorAll('.format-btn').forEach(btn => {
            const command = btn.dataset.command;
            if (command && command !== 'insertTemplate' && command !== 'insertImage' && command !== 'createLink') {
                btn.addEventListener('click', () => {
                    this.execCommand(command);
                    this.editor.focus();
                });
            }
        });
        
        // Heading selector
        const headingSelect = document.getElementById('headingSelect');
        if (headingSelect) {
            headingSelect.addEventListener('change', (e) => {
                this.formatHeading(e.target.value);
                e.target.value = ''; // Reset selection
                this.editor.focus();
            });
        }
        
        // Color pickers
        const textColor = document.getElementById('textColor');
        if (textColor) {
            textColor.addEventListener('change', (e) => {
                this.execCommand('foreColor', e.target.value);
                this.editor.focus();
            });
        }
        
        const bgColor = document.getElementById('bgColor');
        if (bgColor) {
            bgColor.addEventListener('change', (e) => {
                this.execCommand('hiliteColor', e.target.value);
                this.editor.focus();
            });
        }
        
        // Link button
        const linkBtn = document.querySelector('[data-command="createLink"]');
        if (linkBtn) {
            linkBtn.addEventListener('click', () => this.insertLink());
        }
        
        // Image button
        const imageBtn = document.querySelector('[data-command="insertImage"]');
        if (imageBtn) {
            imageBtn.addEventListener('click', () => this.insertImage());
        }
    }
    
    /**
     * Handle input events for auto-save and undo stack
     */
    handleInput() {
        // Update character count
        this.updateCharCount();
        
        // Add to undo stack (debounced)
        clearTimeout(this.undoTimer);
        this.undoTimer = setTimeout(() => {
            this.addToUndoStack();
        }, 500);
        
        // Trigger auto-save
        this.triggerAutoSave();
    }
    
    /**
     * Handle paste events for smart paste
     */
    handlePaste(e) {
        e.preventDefault();
        
        const clipboardData = e.clipboardData || window.clipboardData;
        let pastedText = clipboardData.getData('text/html');
        
        if (!pastedText) {
            pastedText = clipboardData.getData('text/plain');
            // Convert plain text to HTML preserving line breaks
            pastedText = pastedText.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>');
            pastedText = '<p>' + pastedText + '</p>';
        }
        
        // Sanitize pasted HTML
        const cleanHtml = this.sanitizeHtml(pastedText);
        
        // Insert at cursor position
        this.insertHtmlAtCursor(cleanHtml);
        
        // Add to undo stack
        this.addToUndoStack();
    }
    
    /**
     * Handle keyboard shortcuts
     */
    handleKeydown(e) {
        const key = this.getShortcutKey(e);
        
        if (this.shortcuts.has(key)) {
            e.preventDefault();
            this.shortcuts.get(key)();
        }
    }
    
    /**
     * Handle text selection for toolbar positioning
     */
    handleSelection() {
        const selection = window.getSelection();
        
        if (selection.toString().length > 0) {
            this.showToolbar();
            this.positionToolbar(selection);
            this.updateToolbarState();
        } else {
            this.hideToolbar();
        }
    }
    
    /**
     * Execute formatting command
     */
    execCommand(command, value = null) {
        // Save selection before executing command
        this.saveSelection();
        
        // Execute the command
        document.execCommand(command, false, value);
        
        // Restore selection
        this.restoreSelection();
        
        // Update toolbar state
        this.updateToolbarState();
        
        // Add to undo stack
        this.addToUndoStack();
    }
    
    /**
     * Format text as heading
     */
    formatHeading(level) {
        if (!level) {
            this.execCommand('formatBlock', 'p');
            return;
        }
        
        this.execCommand('formatBlock', level);
    }
    
    /**
     * Insert link at cursor
     */
    insertLink() {
        const url = prompt('Enter URL:');
        if (url) {
            this.execCommand('createLink', url);
        }
    }
    
    /**
     * Insert image at cursor
     */
    insertImage() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (file) {
                // In production, upload to S3 first
                // For now, use local data URL
                const reader = new FileReader();
                reader.onload = (e) => {
                    const img = `<img src="${e.target.result}" style="max-width: 100%; height: auto;">`;
                    this.insertHtmlAtCursor(img);
                };
                reader.readAsDataURL(file);
            }
        };
        
        input.click();
    }
    
    /**
     * Show email templates
     */
    showTemplates() {
        const modal = document.getElementById('templateModal');
        const list = document.getElementById('templateList');
        
        if (!modal || !list) return;
        
        // Clear and populate template list
        list.innerHTML = '';
        
        Object.entries(this.templates).forEach(([key, template]) => {
            const item = document.createElement('div');
            item.className = 'template-item';
            item.style.cssText = 'padding: 1rem; border: 1px solid #e1e4e8; border-radius: 6px; margin-bottom: 0.5rem; cursor: pointer;';
            item.innerHTML = `
                <h4 style="margin: 0 0 0.5rem 0;">${template.name}</h4>
                <p style="margin: 0; color: #586069; font-size: 0.9rem;">${template.subject}</p>
            `;
            
            item.addEventListener('click', () => {
                this.insertTemplate(template);
                modal.style.display = 'none';
            });
            
            list.appendChild(item);
        });
        
        // Show modal
        modal.style.display = 'flex';
        
        // Close button
        const closeBtn = modal.querySelector('.modal-close');
        if (closeBtn) {
            closeBtn.onclick = () => modal.style.display = 'none';
        }
    }
    
    /**
     * Insert email template
     */
    insertTemplate(template) {
        // Set subject
        const subjectInput = document.getElementById('emailSubject');
        if (subjectInput) {
            subjectInput.value = this.replaceTemplateVars(template.subject);
        }
        
        // Set body
        const body = this.replaceTemplateVars(template.body);
        this.editor.innerHTML = body.replace(/\n/g, '<br>');
        
        // Add to undo stack
        this.addToUndoStack();
    }
    
    /**
     * Replace template variables
     */
    replaceTemplateVars(text) {
        Object.entries(this.templateVars).forEach(([key, value]) => {
            const regex = new RegExp(`{{${key}}}`, 'g');
            text = text.replace(regex, value || `[${key}]`);
        });
        return text;
    }
    
    /**
     * Add current state to undo stack
     */
    addToUndoStack() {
        const content = this.editor.innerHTML;
        
        // Don't add if content hasn't changed
        if (this.undoStack.length > 0 && this.undoStack[this.undoStack.length - 1] === content) {
            return;
        }
        
        this.undoStack.push(content);
        
        // Limit stack size
        if (this.undoStack.length > this.maxUndoLevels) {
            this.undoStack.shift();
        }
        
        // Clear redo stack when new action is performed
        this.redoStack = [];
    }
    
    /**
     * Undo last action
     */
    undo() {
        if (this.undoStack.length > 1) {
            const current = this.undoStack.pop();
            this.redoStack.push(current);
            
            const previous = this.undoStack[this.undoStack.length - 1];
            this.editor.innerHTML = previous;
        }
    }
    
    /**
     * Redo last undone action
     */
    redo() {
        if (this.redoStack.length > 0) {
            const content = this.redoStack.pop();
            this.undoStack.push(content);
            this.editor.innerHTML = content;
        }
    }
    
    /**
     * Initialize auto-save
     */
    initAutoSave() {
        // Load saved draft if exists
        const savedDraft = localStorage.getItem('emailDraft');
        if (savedDraft) {
            const draft = JSON.parse(savedDraft);
            if (draft.content && !this.editor.innerHTML) {
                this.editor.innerHTML = draft.content;
                
                if (draft.subject) {
                    const subjectInput = document.getElementById('emailSubject');
                    if (subjectInput) subjectInput.value = draft.subject;
                }
                
                if (draft.to) {
                    const toInput = document.getElementById('recipientTo');
                    if (toInput) toInput.value = draft.to;
                }
            }
        }
    }
    
    /**
     * Trigger auto-save
     */
    triggerAutoSave() {
        clearTimeout(this.autoSaveTimer);
        
        this.autoSaveTimer = setTimeout(() => {
            this.autoSave();
        }, this.autoSaveInterval);
    }
    
    /**
     * Auto-save draft
     */
    autoSave() {
        const content = this.editor.innerHTML;
        
        // Don't save if content hasn't changed
        if (content === this.lastSavedContent) {
            return;
        }
        
        const draft = {
            content: content,
            subject: document.getElementById('emailSubject')?.value || '',
            to: document.getElementById('recipientTo')?.value || '',
            timestamp: new Date().toISOString()
        };
        
        localStorage.setItem('emailDraft', JSON.stringify(draft));
        this.lastSavedContent = content;
        
        // Update status
        this.updateAutoSaveStatus('saved');
    }
    
    /**
     * Save draft manually
     */
    saveDraft() {
        this.autoSave();
        
        // Show notification
        alert('Draft saved successfully!');
    }
    
    /**
     * Send email
     */
    async send() {
        const to = document.getElementById('recipientTo')?.value;
        const cc = document.getElementById('recipientCc')?.value;
        const bcc = document.getElementById('recipientBcc')?.value;
        const subject = document.getElementById('emailSubject')?.value;
        const body = this.editor.innerHTML;
        
        // Validate
        if (!to) {
            alert('Please enter a recipient');
            return;
        }
        
        if (!subject) {
            if (!confirm('Send without subject?')) {
                return;
            }
        }
        
        // In production, send via API
        console.log('Sending email:', {
            to,
            cc,
            bcc,
            subject,
            body
        });
        
        // Clear draft
        localStorage.removeItem('emailDraft');
        
        // Close composer
        this.closeComposer();
        
        // Show success message
        alert('Email sent successfully!');
    }
    
    /**
     * Open composer
     */
    openComposer(mode = 'new', data = {}) {
        this.currentMode = mode;
        
        const composer = document.getElementById('emailComposer');
        const welcome = document.getElementById('mailWelcome');
        const thread = document.getElementById('emailThread');
        
        if (composer) {
            composer.style.display = 'flex';
        }
        
        if (welcome) {
            welcome.style.display = 'none';
        }
        
        if (thread) {
            thread.style.display = 'none';
        }
        
        // Set mode title
        const modeTitle = document.getElementById('composerMode');
        if (modeTitle) {
            modeTitle.textContent = mode === 'reply' ? 'Reply' : 
                                   mode === 'forward' ? 'Forward' : 
                                   'New Message';
        }
        
        // Pre-fill data if provided
        if (data.to) {
            const toInput = document.getElementById('recipientTo');
            if (toInput) toInput.value = data.to;
        }
        
        if (data.subject) {
            const subjectInput = document.getElementById('emailSubject');
            if (subjectInput) subjectInput.value = data.subject;
        }
        
        if (data.body) {
            this.editor.innerHTML = data.body;
        }
        
        // Focus editor
        setTimeout(() => this.editor.focus(), 100);
        
        // Initialize undo stack
        this.addToUndoStack();
    }
    
    /**
     * Close composer
     */
    closeComposer() {
        const composer = document.getElementById('emailComposer');
        const welcome = document.getElementById('mailWelcome');
        
        if (composer) {
            composer.style.display = 'none';
        }
        
        if (welcome) {
            welcome.style.display = 'flex';
        }
        
        // Clear composer
        this.editor.innerHTML = '';
        document.getElementById('emailSubject').value = '';
        document.getElementById('recipientTo').value = '';
        document.getElementById('recipientCc').value = '';
        document.getElementById('recipientBcc').value = '';
    }
    
    /**
     * Minimize composer
     */
    minimizeComposer() {
        const composer = document.getElementById('emailComposer');
        if (composer) {
            composer.classList.add('minimized');
        }
    }
    
    /**
     * Expand composer
     */
    expandComposer() {
        const composer = document.getElementById('emailComposer');
        if (composer) {
            composer.classList.toggle('expanded');
        }
    }
    
    /**
     * Toggle CC/BCC fields
     */
    toggleCcBcc() {
        const ccField = document.getElementById('ccField');
        const bccField = document.getElementById('bccField');
        
        if (ccField && bccField) {
            const isHidden = ccField.style.display === 'none';
            ccField.style.display = isHidden ? 'flex' : 'none';
            bccField.style.display = isHidden ? 'flex' : 'none';
        }
    }
    
    /**
     * Show toolbar
     */
    showToolbar() {
        if (this.toolbar) {
            this.toolbar.style.display = 'flex';
        }
    }
    
    /**
     * Hide toolbar
     */
    hideToolbar() {
        if (this.toolbar) {
            this.toolbar.style.display = 'none';
        }
    }
    
    /**
     * Position toolbar near selection
     */
    positionToolbar(selection) {
        if (!this.toolbar || !selection.rangeCount) return;
        
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        
        // Position above selection
        this.toolbar.style.top = (rect.top - 50) + 'px';
        this.toolbar.style.left = rect.left + 'px';
    }
    
    /**
     * Update toolbar button states
     */
    updateToolbarState() {
        const commands = ['bold', 'italic', 'underline', 'strikethrough'];
        
        commands.forEach(command => {
            const btn = document.querySelector(`[data-command="${command}"]`);
            if (btn) {
                if (document.queryCommandState(command)) {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            }
        });
    }
    
    /**
     * Check if toolbar is active
     */
    isToolbarActive() {
        return this.toolbar && this.toolbar.contains(document.activeElement);
    }
    
    /**
     * Save current selection
     */
    saveSelection() {
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
            this.savedSelection = selection.getRangeAt(0);
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
     * Insert HTML at cursor position
     */
    insertHtmlAtCursor(html) {
        const selection = window.getSelection();
        
        if (selection.rangeCount) {
            const range = selection.getRangeAt(0);
            range.deleteContents();
            
            const div = document.createElement('div');
            div.innerHTML = html;
            
            const fragment = document.createDocumentFragment();
            let node, lastNode;
            
            while ((node = div.firstChild)) {
                lastNode = fragment.appendChild(node);
            }
            
            range.insertNode(fragment);
            
            // Move cursor after inserted content
            if (lastNode) {
                range = range.cloneRange();
                range.setStartAfter(lastNode);
                range.collapse(true);
                selection.removeAllRanges();
                selection.addRange(range);
            }
        }
    }
    
    /**
     * Sanitize HTML content
     */
    sanitizeHtml(html) {
        // Create temporary element
        const temp = document.createElement('div');
        temp.innerHTML = html;
        
        // Remove script tags
        const scripts = temp.querySelectorAll('script');
        scripts.forEach(script => script.remove());
        
        // Remove event handlers
        const allElements = temp.querySelectorAll('*');
        allElements.forEach(element => {
            // Remove all event attributes
            Array.from(element.attributes).forEach(attr => {
                if (attr.name.startsWith('on')) {
                    element.removeAttribute(attr.name);
                }
            });
        });
        
        return temp.innerHTML;
    }
    
    /**
     * Get shortcut key string from event
     */
    getShortcutKey(e) {
        const keys = [];
        
        if (e.metaKey || e.ctrlKey) keys.push('cmd');
        if (e.shiftKey) keys.push('shift');
        if (e.altKey) keys.push('alt');
        
        // Get the actual key
        let key = e.key.toLowerCase();
        
        // Map special keys
        if (key === 'enter') key = 'enter';
        else if (key === ' ') key = 'space';
        else if (key.length === 1) key = key;
        else return null;
        
        keys.push(key);
        
        return keys.join('+');
    }
    
    /**
     * Update character count
     */
    updateCharCount() {
        const charCount = document.getElementById('charCount');
        if (charCount) {
            const text = this.editor.innerText || '';
            charCount.textContent = `${text.length} characters`;
        }
    }
    
    /**
     * Update auto-save status
     */
    updateAutoSaveStatus(status) {
        const statusEl = document.getElementById('autoSaveStatus');
        if (statusEl) {
            if (status === 'saving') {
                statusEl.textContent = 'Saving...';
                statusEl.classList.add('saving');
            } else {
                statusEl.textContent = 'Draft saved';
                statusEl.classList.remove('saving');
            }
        }
    }
}

// Date/Time stamp: Created January 10, 2025 6:45 AM