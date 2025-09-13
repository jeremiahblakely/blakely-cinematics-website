/**
 * SignatureService.js - Email Signature Management
 * Path: /modules/admin/services/SignatureService.js
 * Created: September 12, 2025 8:15 AM
 * 
 * TODO: UPDATE THE SIGNATURE INFO BELOW WITH YOUR ACTUAL CONTACT DETAILS
 */

export default class SignatureService {
    constructor() {
        this.signatures = {
            default: {
                name: 'Default',
                html: `
                    <br><br>
                    <div class="email-signature" style="border-top: 2px solid #00FFFF; padding-top: 12px; margin-top: 20px;">
                        <strong style="color: #00FFFF;">Jeremiah Blakely</strong><br>
                        <em style="color: #FF00FF;">Founder & Lead Cinematographer</em><br>
                        Blakely Cinematics<br>
                        <!-- TODO: UPDATE YOUR ACTUAL PHONE NUMBER -->
                        <a href="tel:+15555551234" style="color: #00FFFF;">📱 (555) 555-1234</a><br>
                        <!-- TODO: UPDATE YOUR ACTUAL EMAIL -->
                        <a href="mailto:contact@blakelycinematics.com" style="color: #00FFFF;">✉️ contact@blakelycinematics.com</a><br>
                        <a href="https://blakelycinematics.com" style="color: #00FFFF;">🌐 blakelycinematics.com</a>
                    </div>
                `
            },
            casual: {
                name: 'Casual',
                html: `
                    <br><br>
                    <div class="email-signature">
                        Best,<br>
                        Jeremiah<br>
                        <em style="opacity: 0.8;">Blakely Cinematics</em>
                    </div>
                `
            },
            minimal: {
                name: 'Minimal',
                html: `
                    <br><br>
                    <div class="email-signature">
                        --<br>
                        JB
                    </div>
                `
            }
        };
        
        this.currentSignature = 'default';
    }
    
    getSignature(name = null) {
        const sigName = name || this.currentSignature;
        return this.signatures[sigName] || this.signatures.default;
    }
    
    appendToEditor(editorCore) {
        if (!editorCore || !editorCore.editor) return;
        
        const signature = this.getSignature();
        const currentHTML = editorCore.editor ? editorCore.editor.innerHTML : "";
        
        // Only add if signature isn't already there
        if (!currentHTML.includes('email-signature')) {
            if (editorCore.editor) editorCore.editor.innerHTML = currentHTML + signature.html;
        }
    }
    
    setCurrentSignature(name) {
        if (this.signatures[name]) {
            this.currentSignature = name;
        }
    }
    
    getAllSignatures() {
        return Object.keys(this.signatures).map(key => ({
            id: key,
            ...this.signatures[key]
        }));
    }
}
