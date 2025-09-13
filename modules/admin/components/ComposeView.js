/**
 * ComposeView.js - Compose in Content Area with FormattingToolbar
 * Path: /modules/admin/components/ComposeView.js
 * Updated: September 12, 2025 5:30 PM
 */

import ContentEditableCore from '../composers/ContentEditableCore.js';
import FormattingToolbar from '../composers/FormattingToolbar.js';

// Debug: Test if FormattingToolbar imported correctly
console.log('[ComposeView] FormattingToolbar import:', FormattingToolbar);

export default class ComposeView {
    constructor(contentArea, editorCore, signatureService) {
        this.contentArea = contentArea || document.querySelector('.mail-content');
        this.signatureService = signatureService;
        this.composeEditor = null;
        this.formattingToolbar = null;
        this.originalContent = null;
    }
    
    open() {
        // Save current content INCLUDING event listeners and data
        this.originalContent = this.contentArea.cloneNode(true);
        
        // Replace with compose interface
        this.contentArea.innerHTML = `
            <div class="compose-container">
                <div class="compose-header-bar">
                    <h2>New Message</h2>
                    <button class="btn-close" onclick="closeCompose()">✕</button>
                </div>
                
                <div class="compose-fields-section">
                    <div class="field-row">
                        <label>To:</label>
                        <input type="email" id="composeTo" class="compose-field-input" placeholder="recipient@example.com">
                    </div>
                    <div class="field-row">
                        <label>Cc:</label>
                        <input type="email" id="composeCc" class="compose-field-input">
                    </div>
                    <div class="field-row">
                        <label>Subject:</label>
                        <input type="text" id="composeSubject" class="compose-field-input" placeholder="Email subject">
                    </div>
                </div>
                
                <div class="compose-editor-area">
                    <!-- FormattingToolbar will be inserted here -->
                    <textarea id="composeBody" class="compose-editor" placeholder="Write your message..."></textarea>
                    
                    <div class="compose-attachments" id="attachmentArea" style="display: none;">
                        <label>Attachments:</label>
                        <div id="attachmentList"></div>
                    </div>
                </div>
                
                <div class="compose-actions">
                    <button class="btn-primary" onclick="sendNewEmail()">Send</button>
                    <button class="btn-secondary" onclick="saveDraftEmail()">Save Draft</button>
                    <button class="btn-secondary" onclick="closeCompose()">Discard</button>
                </div>
            </div>
        `;
        
        // Initialize editor with FormattingToolbar
        this.initializeEditor();
        
        // Focus first field
        setTimeout(() => {
            document.getElementById('composeTo')?.focus();
        }, 150);
    }
    
    initializeEditor() {
        setTimeout(() => {
            const composeTextarea = document.getElementById('composeBody');
            if (!composeTextarea) {
                console.error('[ComposeView] composeBody textarea not found');
                return;
            }
            
            try {
                // Initialize ContentEditableCore
                this.composeEditor = new ContentEditableCore();
                const initialized = this.composeEditor.init('composeBody');
                
                if (initialized) {
                    console.log('[ComposeView] ContentEditableCore initialized');
                    
                    // Try to initialize FormattingToolbar
                    try {
                        this.formattingToolbar = new FormattingToolbar(this.composeEditor);
                        this.formattingToolbar.init();
                        console.log('[ComposeView] FormattingToolbar initialized');
                        
                        // Find the toolbar and position it correctly
                        const toolbar = document.querySelector('.formatting-toolbar');
                        const editorArea = document.querySelector('.compose-editor-area');
                        const editor = document.getElementById('emailEditor');
                        
                        if (toolbar && editorArea && editor) {
                            // Insert toolbar at the beginning of editor area
                            editorArea.insertBefore(toolbar, editor);
                            
                            // Make sure toolbar is visible in compose
                            toolbar.style.display = 'flex';
                            console.log('[ComposeView] Toolbar positioned successfully');
                        } else {
                            console.warn('[ComposeView] Could not position toolbar - missing elements:', {
                                toolbar: !!toolbar,
                                editorArea: !!editorArea,
                                editor: !!editor
                            });
                        }
                    } catch (formattingError) {
                        console.error('[ComposeView] FormattingToolbar failed, creating fallback:', formattingError);
                        
                        // Create a simple toolbar as fallback
                        const editorArea = document.querySelector('.compose-editor-area');
                        const editor = document.getElementById('emailEditor');

                        if (!document.querySelector('.formatting-toolbar')) {
                            // Create basic toolbar as fallback
                            const toolbar = document.createElement('div');
                            toolbar.className = 'formatting-toolbar';
                            toolbar.style.cssText = 'display: flex; gap: 8px; padding: 8px; background: rgba(0,0,0,0.3); border-radius: 6px; margin-bottom: 12px;';
                            toolbar.innerHTML = `
                                <button onclick="document.execCommand('bold')" style="padding: 6px 10px; background: transparent; border: 1px solid rgba(255,255,255,0.1); color: #999; border-radius: 4px; cursor: pointer;">B</button>
                                <button onclick="document.execCommand('italic')" style="padding: 6px 10px; background: transparent; border: 1px solid rgba(255,255,255,0.1); color: #999; border-radius: 4px; cursor: pointer;">I</button>
                                <button onclick="document.execCommand('underline')" style="padding: 6px 10px; background: transparent; border: 1px solid rgba(255,255,255,0.1); color: #999; border-radius: 4px; cursor: pointer;">U</button>
                            `;
                            
                            if (editorArea && editor) {
                                editorArea.insertBefore(toolbar, editor);
                                console.log('[ComposeView] Fallback toolbar created');
                            }
                        }
                    }
                    
                    // Add signature if available
                    if (this.signatureService) {
                        setTimeout(() => {
                            this.signatureService.appendToEditor(this.composeEditor);
                            // Place cursor at beginning
                            this.composeEditor.focus();
                        }, 100);
                    }
                } else {
                    console.warn('[ComposeView] Failed to initialize ContentEditableCore');
                }
            } catch (error) {
                console.error('[ComposeView] Error initializing editor:', error);
            }
        }, 100);
    }
    
    close() {
        // Clean up editors first
        if (this.formattingToolbar) {
            this.formattingToolbar.destroy();
            this.formattingToolbar = null;
        }
        
        if (this.composeEditor) {
            this.composeEditor.destroy();
            this.composeEditor = null;
        }
        
        // Restore original content
        if (this.originalContent) {
            // IMPORTANT: Check if reply box already exists before restoring
            const existingReplyBox = document.getElementById('replyBox');
            
            // Clear current content
            this.contentArea.innerHTML = '';
            
            // Copy all children from saved content
            while (this.originalContent.firstChild) {
                const child = this.originalContent.firstChild;
                
                // Skip reply box if one already exists
                if (child.id === 'replyBox' && existingReplyBox) {
                    this.originalContent.removeChild(child);
                    continue;
                }
                
                this.contentArea.appendChild(child);
            }
            
            this.originalContent = null;
            
            // Reset MailView's cached elements and destroy any active editors
            if (window.mailController && window.mailController.view) {
                // Destroy any active editors first
                if (window.mailController.view.editorCore) {
                    window.mailController.view.editorCore.destroy();
                }
                if (window.mailController.view.formattingToolbar) {
                    window.mailController.view.formattingToolbar.destroy();
                }
                
                // Reset references
                window.mailController.view.elements = window.mailController.view.cacheElements();
                window.mailController.view.editorCore = null;
                window.mailController.view.formattingToolbar = null;
                console.log('[ComposeView] Reset MailView elements after close');
            }
        }
    }
    
    getData() {
        return {
            to: document.getElementById('composeTo')?.value || '',
            cc: document.getElementById('composeCc')?.value || '',
            subject: document.getElementById('composeSubject')?.value || '',
            body: this.composeEditor ? this.composeEditor.getHtml() : ''
        };
    }
}