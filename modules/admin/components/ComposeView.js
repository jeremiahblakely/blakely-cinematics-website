/**
 * ComposeView.js - Compose in Content Area
 * Path: /modules/admin/components/ComposeView.js
 * Created: September 12, 2025 10:00 AM
 */

export default class ComposeView {
    constructor(contentArea, editorCore, signatureService) {
        this.contentArea = contentArea || document.querySelector('.mail-content');
        this.signatureService = signatureService;
        this.composeEditor = null;
        this.originalContent = null;
    }
    
    open() {
        // Save current content
        this.originalContent = this.contentArea.innerHTML;
        
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
                    <div class="compose-formatting-bar">
                        <button onclick="formatCompose('bold')"><b>B</b></button>
                        <button onclick="formatCompose('italic')"><i>I</i></button>
                        <button onclick="formatCompose('underline')"><u>U</u></button>
                        <span class="divider"></span>
                        <button onclick="insertTemplate()">📄 Template</button>
                        <button onclick="attachFile()">📎 Attach</button>
                    </div>
                    
                    <div id="composeBody" class="compose-editor" contenteditable="true" data-placeholder="Write your message..."></div>
                    
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
        
        // Initialize editor
        this.initializeEditor();
        
        // Focus first field
        document.getElementById('composeTo')?.focus();
    }
    
    initializeEditor() {
        const composeBody = document.getElementById('composeBody');
        if (composeBody) {
            import('../composers/ContentEditableCore.js').then(module => {
                const ContentEditableCore = module.default;
                this.composeEditor = new ContentEditableCore({
                    placeholder: 'Write your message...',
                    minHeight: '300px'
                });
                this.composeEditor.init(composeBody);
                
                // Add signature
                if (this.signatureService) {
                    setTimeout(() => {
                        this.signatureService.appendToEditor(this.composeEditor);
                    }, 100);
                }
            });
        }
    }
    
    close() {
        // Restore original content
        if (this.originalContent) {
            this.contentArea.innerHTML = this.originalContent;
        }
        
        if (this.composeEditor) {
            this.composeEditor.destroy();
            this.composeEditor = null;
        }
    }
    
    getData() {
        return {
            to: document.getElementById('composeTo')?.value || '',
            cc: document.getElementById('composeCc')?.value || '',
            subject: document.getElementById('composeSubject')?.value || '',
            body: this.composeEditor ? this.composeEditor.getHTML() : ''
        };
    }
}
