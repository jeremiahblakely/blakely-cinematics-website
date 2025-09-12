/**
 * ComposeModal.js - New Email Compose Modal
 * Path: /modules/admin/components/ComposeModal.js
 * Created: September 12, 2025 9:00 AM
 */

export default class ComposeModal {
    constructor(editorCore, signatureService) {
        this.editorCore = null;
        this.signatureService = signatureService;
        this.modal = null;
        this.composeEditor = null;
        
        this.createModal();
        this.attachEventListeners();
    }
    
    createModal() {
        this.modal = document.createElement('div');
        this.modal.className = 'compose-modal';
        this.modal.style.display = 'none';
        this.modal.innerHTML = `
            <div class="compose-modal-content">
                <div class="compose-header">
                    <h2>Compose New Email</h2>
                    <button class="close-btn" onclick="closeCompose()">×</button>
                </div>
                
                <div class="compose-fields">
                    <input type="email" id="composeTo" placeholder="To:" class="compose-input">
                    <input type="email" id="composeCc" placeholder="Cc:" class="compose-input">
                    <input type="email" id="composeBcc" placeholder="Bcc:" class="compose-input">
                    <input type="text" id="composeSubject" placeholder="Subject:" class="compose-input">
                </div>
                
                <div class="compose-toolbar">
                    <button onclick="formatCompose('bold')"><b>B</b></button>
                    <button onclick="formatCompose('italic')"><i>I</i></button>
                    <button onclick="formatCompose('underline')"><u>U</u></button>
                </div>
                
                <div id="composeBody" class="compose-body" contenteditable="true"></div>
                
                <div class="compose-footer">
                    <button class="btn-send" onclick="sendNewEmail()">Send</button>
                    <button class="btn-draft" onclick="saveDraftEmail()">Save Draft</button>
                    <button class="btn-cancel" onclick="closeCompose()">Cancel</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(this.modal);
    }
    
    attachEventListeners() {
        // Click outside to close
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.close();
            }
        });
    }
    
    open() {
        this.modal.style.display = 'flex';
        
        // Initialize editor on the compose body
        const composeBody = document.getElementById('composeBody');
        if (composeBody && this.signatureService) {
            // Import ContentEditableCore dynamically
            import('../composers/ContentEditableCore.js').then(module => {
                const ContentEditableCore = module.default;
                this.composeEditor = new ContentEditableCore({
                    placeholder: 'Write your message...'
                });
                this.composeEditor.init(composeBody);
                
                // Add signature
                setTimeout(() => {
                    this.signatureService.appendToEditor(this.composeEditor);
                }, 100);
            });
        }
        
        // Focus on To field
        document.getElementById('composeTo')?.focus();
    }
    
    close() {
        this.modal.style.display = 'none';
        
        // Clear fields
        document.getElementById('composeTo').value = '';
        document.getElementById('composeCc').value = '';
        document.getElementById('composeBcc').value = '';
        document.getElementById('composeSubject').value = '';
        document.getElementById('composeBody').innerHTML = '';
        
        if (this.composeEditor) {
            this.composeEditor.destroy();
            this.composeEditor = null;
        }
    }
    
    getData() {
        return {
            to: document.getElementById('composeTo').value,
            cc: document.getElementById('composeCc').value,
            bcc: document.getElementById('composeBcc').value,
            subject: document.getElementById('composeSubject').value,
            body: this.composeEditor ? this.composeEditor.getHTML() : ''
        };
    }
}
