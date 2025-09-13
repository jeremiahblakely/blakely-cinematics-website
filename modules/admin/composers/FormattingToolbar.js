/**
 * FormattingToolbar.js
 * Rich text formatting toolbar for Blakely Cinematics Admin Mail
 * Created: September 12, 2025 4:30 PM
 * 
 * Manages the formatting toolbar for the rich text editor
 */

export default class FormattingToolbar {
    constructor(editorCore) {
        this.editorCore = editorCore;
        this.toolbar = null;
        this.buttons = new Map();
        
        // Define toolbar button groups
        this.buttonGroups = {
            textFormatting: [
                { command: 'bold', icon: 'B', tooltip: 'Bold (⌘B)', shortcut: 'b' },
                { command: 'italic', icon: 'I', tooltip: 'Italic (⌘I)', shortcut: 'i' },
                { command: 'underline', icon: 'U', tooltip: 'Underline (⌘U)', shortcut: 'u' },
                { command: 'strikeThrough', icon: 'S', tooltip: 'Strikethrough (⌘S)', shortcut: 's' },
                { type: 'separator' },
                { command: 'formatBlock', value: 'h1', icon: 'H1', tooltip: 'Heading 1' },
                { command: 'formatBlock', value: 'h2', icon: 'H2', tooltip: 'Heading 2' },
                { command: 'formatBlock', value: 'p', icon: '¶', tooltip: 'Paragraph' },
                { type: 'separator' },
                { command: 'foreColor', icon: 'A', tooltip: 'Text Color', type: 'color' },
                { command: 'hiliteColor', icon: '🖍', tooltip: 'Highlight', type: 'color' }
            ],
            structure: [
                { command: 'insertUnorderedList', icon: '•', tooltip: 'Bullet List' },
                { command: 'insertOrderedList', icon: '1.', tooltip: 'Numbered List' },
                { command: 'outdent', icon: '⇤', tooltip: 'Decrease Indent' },
                { command: 'indent', icon: '⇥', tooltip: 'Increase Indent' },
                { type: 'separator' },
                { command: 'justifyLeft', icon: '⬅', tooltip: 'Align Left' },
                { command: 'justifyCenter', icon: '⬌', tooltip: 'Center' },
                { command: 'justifyRight', icon: '➡', tooltip: 'Align Right' },
                { command: 'justifyFull', icon: '☰', tooltip: 'Justify' }
            ],
            insert: [
                { command: 'createLink', icon: '🔗', tooltip: 'Insert Link (⌘K)', shortcut: 'k' },
                { command: 'insertImage', icon: '🖼', tooltip: 'Insert Image', type: 'file' },
                { command: 'insertHorizontalRule', icon: '—', tooltip: 'Horizontal Line' },
                { command: 'insertTable', icon: '⊞', tooltip: 'Insert Table', type: 'custom' },
                { type: 'separator' },
                { command: 'attachFile', icon: '📎', tooltip: 'Attach File', type: 'file' },
                { command: 'insertEmoji', icon: '😊', tooltip: 'Insert Emoji', type: 'custom' }
            ],
            actions: [
                { command: 'removeFormat', icon: '⌫', tooltip: 'Clear Formatting' },
                { command: 'undo', icon: '↶', tooltip: 'Undo (⌘Z)', shortcut: 'z' },
                { command: 'redo', icon: '↷', tooltip: 'Redo (⌘Y)', shortcut: 'y' }
            ]
        };
    }
    
    /**
     * Initialize the toolbar
     */
    init() {
        // Find existing toolbar or create new one
        this.findOrCreateToolbar();
        
        // Build toolbar buttons
        this.buildToolbar();
        
        // Attach event listeners
        this.attachEventListeners();
        
        // Set up update mechanism
        this.setupUpdateMechanism();
        
        console.log('[FormattingToolbar] Initialized');
    }
    
    /**
     * Find existing toolbar or create new one
     */
    findOrCreateToolbar() {
        // Look for existing toolbar
        this.toolbar = document.querySelector('.reply-toolbar') || document.querySelector('.formatting-toolbar');
        
        if (!this.toolbar) {
            // Create new toolbar
            this.toolbar = document.createElement('div');
            this.toolbar.className = 'formatting-toolbar';
            
            // Check if we're in reply or compose context
            const replyBox = document.getElementById('replyBox');
            const composeArea = document.querySelector('.compose-editor-area');
            
            if (replyBox) {
                // Reply context
                this.toolbar.classList.add('reply-toolbar');
                const editor = document.getElementById('emailEditor') || document.getElementById('replyText');
                if (editor) {
                    // Insert toolbar before the editor
                    editor.parentNode.insertBefore(this.toolbar, editor);
                    console.log('[FormattingToolbar] Toolbar created in reply context');
                }
            } else if (composeArea) {
                // Compose context
                this.toolbar.classList.add('compose-toolbar');
                const editor = document.getElementById('emailEditor');
                if (editor) {
                    // Insert toolbar before the editor in compose area
                    composeArea.insertBefore(this.toolbar, editor);
                    console.log('[FormattingToolbar] Toolbar created in compose context');
                } else {
                    console.warn('[FormattingToolbar] No emailEditor found in compose context');
                }
            } else {
                console.warn('[FormattingToolbar] No suitable container found for toolbar');
            }
        }
        
        // Add styles if not already present
        this.injectStyles();
    }
    
    /**
     * Build the toolbar with all button groups
     */
    buildToolbar() {
        // Clear existing content
        this.toolbar.innerHTML = '';
        
        // Create button groups
        const groups = ['textFormatting', 'structure', 'insert', 'actions'];
        
        groups.forEach((groupName, index) => {
            const group = document.createElement('div');
            group.className = `toolbar-group ${groupName}`;
            
            this.buttonGroups[groupName].forEach(buttonDef => {
                if (buttonDef.type === 'separator') {
                    const separator = document.createElement('span');
                    separator.className = 'toolbar-separator';
                    group.appendChild(separator);
                } else {
                    const button = this.createButton(buttonDef);
                    group.appendChild(button);
                    this.buttons.set(buttonDef.command, button);
                }
            });
            
            this.toolbar.appendChild(group);
            
            // Add group separator (except after last group)
            if (index < groups.length - 1) {
                const groupSeparator = document.createElement('div');
                groupSeparator.className = 'toolbar-group-separator';
                this.toolbar.appendChild(groupSeparator);
            }
        });
    }
    
    /**
     * Create a toolbar button
     */
    createButton(buttonDef) {
        const button = document.createElement('button');
        button.className = 'toolbar-btn';
        button.setAttribute('data-command', buttonDef.command);
        button.setAttribute('title', buttonDef.tooltip);
        button.innerHTML = `<span class="btn-icon">${buttonDef.icon}</span>`;
        
        if (buttonDef.value) {
            button.setAttribute('data-value', buttonDef.value);
        }
        
        if (buttonDef.type) {
            button.setAttribute('data-type', buttonDef.type);
        }
        
        if (buttonDef.shortcut) {
            button.setAttribute('data-shortcut', buttonDef.shortcut);
        }
        
        return button;
    }
    
    /**
     * Attach event listeners to toolbar buttons
     */
    attachEventListeners() {
        // Handle button clicks
        this.toolbar.addEventListener('click', (e) => {
            const button = e.target.closest('.toolbar-btn');
            if (!button) return;
            
            e.preventDefault();
            e.stopPropagation();
            
            const command = button.getAttribute('data-command');
            const value = button.getAttribute('data-value');
            const type = button.getAttribute('data-type');
            
            this.handleCommand(command, value, type);
        });
        
        // Handle button hover for tooltips
        this.toolbar.addEventListener('mouseenter', (e) => {
            const button = e.target.closest('.toolbar-btn');
            if (button) {
                this.showTooltip(button);
            }
        }, true);
        
        this.toolbar.addEventListener('mouseleave', (e) => {
            const button = e.target.closest('.toolbar-btn');
            if (button) {
                this.hideTooltip();
            }
        }, true);
    }
    
    /**
     * Handle toolbar commands
     */
    handleCommand(command, value, type) {
        // Focus the editor first
        if (this.editorCore && this.editorCore.editor) {
            this.editorCore.editor.focus();
        }
        
        // Handle special command types
        if (type === 'color') {
            this.handleColorCommand(command);
        } else if (type === 'file') {
            this.handleFileCommand(command);
        } else if (type === 'custom') {
            this.handleCustomCommand(command);
        } else if (command === 'undo' || command === 'redo') {
            // Use editorCore's undo/redo
            if (this.editorCore) {
                if (command === 'undo') {
                    this.editorCore.undo();
                } else {
                    this.editorCore.redo();
                }
            }
        } else {
            // Execute standard commands
            document.execCommand(command, false, value || null);
            
            // Update editor state
            if (this.editorCore) {
                this.editorCore.captureState();
                this.editorCore.syncTextarea();
            }
        }
        
        // Update button states
        this.updateButtonStates();
    }
    
    /**
     * Handle color commands
     */
    handleColorCommand(command) {
        // Create color picker
        const input = document.createElement('input');
        input.type = 'color';
        input.value = command === 'foreColor' ? '#00ffff' : '#ffff00';
        
        input.addEventListener('change', () => {
            document.execCommand(command, false, input.value);
            if (this.editorCore) {
                this.editorCore.captureState();
            }
        });
        
        input.click();
    }
    
    /**
     * Handle file commands
     */
    handleFileCommand(command) {
        if (command === 'insertImage') {
            const url = prompt('Enter image URL:');
            if (url) {
                document.execCommand('insertImage', false, url);
                if (this.editorCore) {
                    this.editorCore.captureState();
                }
            }
        } else if (command === 'attachFile') {
            // Create file input
            const input = document.createElement('input');
            input.type = 'file';
            input.multiple = true;
            
            input.addEventListener('change', (e) => {
                const files = Array.from(e.target.files);
                console.log('Files to attach:', files);
                // TODO: Implement file attachment
                alert(`Attaching ${files.length} file(s) - Feature coming soon!`);
            });
            
            input.click();
        }
    }
    
    /**
     * Handle custom commands
     */
    handleCustomCommand(command) {
        if (command === 'insertTable') {
            const rows = prompt('Number of rows:', '3');
            const cols = prompt('Number of columns:', '3');
            
            if (rows && cols) {
                const table = this.createTable(parseInt(rows), parseInt(cols));
                document.execCommand('insertHTML', false, table);
                if (this.editorCore) {
                    this.editorCore.captureState();
                }
            }
        } else if (command === 'insertEmoji') {
            // Simple emoji picker
            const emojis = ['😊', '👍', '❤️', '🎉', '🚀', '✨', '🔥', '💯', '👏', '🙌'];
            const emoji = prompt('Enter emoji or choose: ' + emojis.join(' '));
            if (emoji) {
                document.execCommand('insertText', false, emoji);
            }
        }
    }
    
    /**
     * Create HTML table
     */
    createTable(rows, cols) {
        let html = '<table style="border-collapse: collapse; width: 100%;">';
        for (let r = 0; r < rows; r++) {
            html += '<tr>';
            for (let c = 0; c < cols; c++) {
                const tag = r === 0 ? 'th' : 'td';
                html += `<${tag} style="border: 1px solid #333; padding: 8px;">&nbsp;</${tag}>`;
            }
            html += '</tr>';
        }
        html += '</table>';
        return html;
    }
    
    /**
     * Set up mechanism to update button states
     */
    setupUpdateMechanism() {
        // Update on selection change
        document.addEventListener('selectionchange', () => {
            if (this.editorCore && document.activeElement === this.editorCore.editor) {
                this.updateButtonStates();
            }
        });
        
        // Update on keyup in editor
        if (this.editorCore && this.editorCore.editor) {
            this.editorCore.editor.addEventListener('keyup', () => {
                this.updateButtonStates();
            });
        }
    }
    
    /**
     * Update button active states
     */
    updateButtonStates() {
        this.buttons.forEach((button, command) => {
            try {
                const isActive = document.queryCommandState(command);
                button.classList.toggle('active', isActive);
            } catch (e) {
                // Some commands don't support queryCommandState
            }
        });
    }
    
    /**
     * Show tooltip for button
     */
    showTooltip(button) {
        // Remove any existing tooltip
        this.hideTooltip();
        
        const tooltip = document.createElement('div');
        tooltip.className = 'toolbar-tooltip';
        tooltip.textContent = button.getAttribute('title');
        
        document.body.appendChild(tooltip);
        
        // Position tooltip
        const rect = button.getBoundingClientRect();
        tooltip.style.left = rect.left + (rect.width / 2) - (tooltip.offsetWidth / 2) + 'px';
        tooltip.style.top = rect.bottom + 5 + 'px';
        
        this.currentTooltip = tooltip;
    }
    
    /**
     * Hide tooltip
     */
    hideTooltip() {
        if (this.currentTooltip) {
            this.currentTooltip.remove();
            this.currentTooltip = null;
        }
    }
    
    /**
     * Inject necessary styles
     */
    injectStyles() {
        if (document.getElementById('formatting-toolbar-styles')) return;
        
        const styles = document.createElement('style');
        styles.id = 'formatting-toolbar-styles';
        styles.textContent = `
            .formatting-toolbar {
                display: flex;
                flex-wrap: wrap;
                gap: 8px;
                padding: 8px;
                background: rgba(0, 0, 0, 0.3);
                border-radius: 6px;
                margin-bottom: 12px;
                border: 1px solid rgba(255, 255, 255, 0.1);
            }
            
            .toolbar-group {
                display: flex;
                gap: 4px;
                align-items: center;
            }
            
            .toolbar-btn {
                padding: 6px 10px;
                background: transparent;
                border: 1px solid rgba(255, 255, 255, 0.1);
                color: var(--text-secondary, #999);
                border-radius: 4px;
                cursor: pointer;
                font-size: 14px;
                font-weight: 600;
                transition: all 0.2s;
                min-width: 32px;
                height: 32px;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            .toolbar-btn:hover {
                background: rgba(0, 255, 255, 0.1);
                border-color: var(--accent-primary, #00ffff);
                color: var(--accent-primary, #00ffff);
                transform: translateY(-1px);
            }
            
            .toolbar-btn.active {
                background: var(--accent-primary, #00ffff);
                color: var(--bg-primary, #000);
                border-color: var(--accent-primary, #00ffff);
            }
            
            .toolbar-separator {
                width: 1px;
                height: 20px;
                background: rgba(255, 255, 255, 0.2);
                margin: 0 4px;
            }
            
            .toolbar-group-separator {
                width: 1px;
                height: 24px;
                background: rgba(255, 255, 255, 0.3);
                margin: 0 4px;
            }
            
            .toolbar-tooltip {
                position: fixed;
                background: rgba(0, 0, 0, 0.9);
                color: white;
                padding: 4px 8px;
                border-radius: 4px;
                font-size: 12px;
                pointer-events: none;
                z-index: 10000;
                white-space: nowrap;
                border: 1px solid rgba(255, 255, 255, 0.2);
            }
            
            /* Hide toolbar by default in reply box, show when expanded */
            .reply-box:not(.expanded) .formatting-toolbar {
                display: none;
            }
            
            .reply-box.expanded .formatting-toolbar {
                display: flex;
            }
            
            /* Always show toolbar in compose window */
            .compose-container .formatting-toolbar {
                display: flex !important;
                margin-top: 12px;
                margin-bottom: 12px;
            }
        `;
        
        document.head.appendChild(styles);
    }
    
    /**
     * Show the toolbar
     */
    show() {
        if (this.toolbar) {
            this.toolbar.style.display = 'flex';
        }
    }
    
    /**
     * Hide the toolbar
     */
    hide() {
        if (this.toolbar) {
            this.toolbar.style.display = 'none';
        }
    }
    
    /**
     * Destroy the toolbar
     */
    destroy() {
        if (this.toolbar) {
            this.toolbar.remove();
            this.toolbar = null;
        }
        this.buttons.clear();
        this.hideTooltip();
    }
}